"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, ExternalLink, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

interface GoogleCalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  start: string | null;
  end: string | null;
  allDay: boolean;
  status?: string;
}

export default function CalendarPage() {
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [needsReauthorization, setNeedsReauthorization] = useState(false);
  const [message, setMessage] = useState("");

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const fetchCalendarEvents = async () => {
    setLoading(true);
    setMessage("");
    setNeedsReauthorization(false);

    try {
      const params = new URLSearchParams({
        start: calendarStart.toISOString(),
        end: calendarEnd.toISOString(),
      });
      const response = await fetch(`/api/calendar/google?${params.toString()}`);
      const data = await response.json();

      setConnected(Boolean(data.connected));
      setEvents(data.events || []);
      setNeedsReauthorization(Boolean(data.needsReauthorization));

      if (!response.ok) {
        throw new Error(data.error || "Failed to load Google Calendar");
      }

      if (data.message) {
        setMessage(data.message);
      }
    } catch (error: any) {
      setMessage(error.message || "Failed to load Google Calendar");
      toast({
        title: "Calendar Error",
        description: error.message || "Failed to load Google Calendar",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarEvents();
  }, [currentMonth]);

  const authorizeGoogle = async () => {
    try {
      const response = await fetch("/api/settings/gmail-auth");
      const data = await response.json();

      if (!response.ok || !data.authUrl) {
        throw new Error(data.error || "Failed to generate Google authorization URL");
      }

      window.location.href = data.authUrl;
    } catch (error: any) {
      toast({
        title: "Authorization Error",
        description: error.message || "Failed to start Google authorization",
        variant: "destructive",
      });
    }
  };

  const eventsByDay = useMemo(() => {
    const grouped = new Map<string, GoogleCalendarEvent[]>();

    events.forEach((event) => {
      if (!event.start) return;
      const key = format(new Date(event.start), "yyyy-MM-dd");
      grouped.set(key, [...(grouped.get(key) || []), event]);
    });

    return grouped;
  }, [events]);

  const upcomingEvents = useMemo(
    () =>
      events
        .filter((event) => event.start && new Date(event.start) >= new Date())
        .slice(0, 8),
    [events]
  );

  const formatEventTime = (event: GoogleCalendarEvent) => {
    if (!event.start) return "";
    if (event.allDay) return "All day";
    return format(new Date(event.start), "h:mm a");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
          <p className="text-gray-600 mt-1">View appointments from the connected Google Workspace account</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={fetchCalendarEvents} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={authorizeGoogle}>
            <CalendarDays className="mr-2 h-4 w-4" />
            {connected ? "Reconnect Google Calendar" : "Connect Google Calendar"}
          </Button>
        </div>
      </div>

      {(message || needsReauthorization || connected === false) && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium text-gray-900">
                  {needsReauthorization ? "Calendar permission required" : "Google Calendar not connected"}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  {needsReauthorization
                    ? "Reconnect Google Workspace so the existing email account also grants Calendar read access."
                    : message || "Connect Google Workspace from the same account used for email."}
                </p>
              </div>
              <Button onClick={authorizeGoogle}>
                <CalendarDays className="mr-2 h-4 w-4" />
                Authorize Google
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>{format(currentMonth, "MMMM yyyy")}</CardTitle>
                <CardDescription>Primary Google Calendar</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
                  Today
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 border-b text-center text-xs font-medium text-gray-500">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <div key={day} className="py-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-2 pt-3 md:grid-cols-7 md:gap-0 md:pt-0">
              {calendarDays.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const dayEvents = eventsByDay.get(key) || [];

                return (
                  <div
                    key={key}
                    className={`min-h-28 border p-2 md:-ml-px md:-mt-px ${
                      isSameMonth(day, currentMonth) ? "bg-white" : "bg-gray-50 text-gray-400"
                    } ${isSameDay(day, new Date()) ? "ring-2 ring-blue-500 ring-inset" : ""}`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium">{format(day, "d")}</span>
                      {dayEvents.length > 0 && (
                        <Badge variant="secondary" className="text-[10px]">
                          {dayEvents.length}
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <a
                          key={event.id}
                          href={event.htmlLink || undefined}
                          target="_blank"
                          rel="noreferrer"
                          className="block rounded border border-blue-100 bg-blue-50 px-2 py-1 text-xs text-blue-900 hover:bg-blue-100"
                        >
                          <span className="font-medium">{formatEventTime(event)}</span>
                          <span className="ml-1">{event.title}</span>
                        </a>
                      ))}
                      {dayEvents.length > 3 && (
                        <p className="text-xs text-gray-500">+{dayEvents.length - 3} more</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {loading && <p className="mt-4 text-sm text-gray-500">Loading Google Calendar events...</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming</CardTitle>
            <CardDescription>Next events from Google Calendar</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-gray-500">
                {loading ? "Loading events..." : "No upcoming events in this date range."}
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="rounded-md border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-gray-900">{event.title}</p>
                        <p className="mt-1 text-sm text-gray-600">
                          {event.start ? format(new Date(event.start), event.allDay ? "MMM d, yyyy" : "MMM d, yyyy h:mm a") : ""}
                        </p>
                        {event.location && <p className="mt-1 text-xs text-gray-500">{event.location}</p>}
                      </div>
                      {event.htmlLink && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={event.htmlLink} target="_blank" rel="noreferrer" aria-label="Open event in Google Calendar">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
