"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Compass,
  MapPin,
  Navigation,
  Phone,
  Plus,
  Route,
  Search,
  Send,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { FIELD_PHOTO_CATEGORIES, FIELD_SERVICE_STATUSES, FIELD_NOTE_TYPES, formatFieldStatus } from "@/lib/field-service";

declare global {
  interface Window {
    google?: any;
    initFieldServiceMap?: () => void;
  }
}

interface Technician {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  role: string;
}

interface FieldJob {
  id: string;
  jobNumber: string;
  jobType: string;
  applianceBrand: string;
  applianceType: string;
  issueDescription: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  scheduledAt?: string | null;
  scheduledTime?: string | null;
  preferredCalloutDate?: string | null;
  assignedTechnicianId?: string | null;
  assignedAt?: string | null;
  assignmentNotes?: string | null;
  calloutAddress?: string | null;
  calloutLatitude?: number | null;
  calloutLongitude?: number | null;
  googlePlaceId?: string | null;
  distanceFromOfficeKm?: number | null;
  estimatedTravelTime?: string | null;
  travelEstimateSource?: string | null;
  calloutAccessInstructions?: string | null;
  calloutParkingNotes?: string | null;
  calloutApplianceLocation?: string | null;
  calloutFee?: number | null;
  runningLate: boolean;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  assignedTechnician?: Technician | null;
  statusHistory: Array<{
    id: string;
    status: string;
    previousStatus?: string | null;
    newStatus?: string | null;
    notes?: string | null;
    createdAt: string;
    changedAt?: string | null;
  }>;
  fieldNotes: Array<{
    id: string;
    noteType: string;
    noteText: string;
    visibility: string;
    createdAt: string;
    technician?: { firstName: string; lastName: string } | null;
  }>;
  fieldPhotos: Array<{
    id: string;
    photoCategory: string;
    fileUrl: string;
    caption?: string | null;
    createdAt: string;
  }>;
  customerNotifications: Array<{
    id: string;
    notificationType: string;
    recipient: string;
    status: string;
    message: string;
    sentAt?: string | null;
    queuedUntil?: string | null;
    createdAt: string;
  }>;
}

interface DashboardResponse {
  counts: Record<string, number>;
  jobs: FieldJob[];
  technicians: Technician[];
  map: {
    googleApiKey?: string | null;
    officeAddress?: string | null;
    officeLatitude?: number | null;
    officeLongitude?: number | null;
  };
  generatedAt: string;
}

const statusTone: Record<string, string> = {
  NEW_CALLOUT: "bg-slate-100 text-slate-700 border-slate-200",
  SCHEDULED: "bg-blue-50 text-blue-700 border-blue-200",
  TECHNICIAN_ASSIGNED: "bg-cyan-50 text-cyan-700 border-cyan-200",
  TECHNICIAN_ON_THE_WAY: "bg-amber-50 text-amber-800 border-amber-200",
  ARRIVED_ON_SITE: "bg-indigo-50 text-indigo-700 border-indigo-200",
  WORK_IN_PROGRESS: "bg-sky-50 text-sky-700 border-sky-200",
  WAITING_FOR_PARTS: "bg-violet-50 text-violet-700 border-violet-200",
  WAITING_FOR_CUSTOMER: "bg-orange-50 text-orange-700 border-orange-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
};

const priorityTone: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-700",
  MEDIUM: "bg-blue-50 text-blue-700",
  HIGH: "bg-orange-50 text-orange-700",
  URGENT: "bg-rose-100 text-rose-700",
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "Not scheduled";
  return new Date(value).toLocaleString("en-NZ", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDistance = (value?: number | null) =>
  typeof value === "number" ? `${value.toFixed(1)} km` : "Not calculated";

const calculateGoogleTravel = async (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
) =>
  new Promise<{ distanceFromOfficeKm: number; estimatedTravelTime: string } | null>((resolve) => {
    if (!window.google?.maps?.DistanceMatrixService) {
      resolve(null);
      return;
    }

    const service = new window.google.maps.DistanceMatrixService();
    service.getDistanceMatrix(
      {
        origins: [origin],
        destinations: [destination],
        travelMode: window.google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(Date.now() + 5 * 60 * 1000),
          trafficModel: "bestguess",
        },
      },
      (result: any, status: string) => {
        if (status !== "OK") {
          resolve(null);
          return;
        }

        const element = result?.rows?.[0]?.elements?.[0];
        if (element?.status !== "OK") {
          resolve(null);
          return;
        }

        resolve({
          distanceFromOfficeKm: element.distance.value / 1000,
          estimatedTravelTime: element.duration_in_traffic?.text || element.duration?.text,
        });
      }
    );
  });

const compressImage = async (file: File) => {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return file;
  context.drawImage(bitmap, 0, 0, width, height);

  let quality = 0.82;
  let blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  while (blob && blob.size > 500 * 1024 && quality > 0.45) {
    quality -= 0.08;
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  }

  return blob ? new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }) : file;
};

export default function FieldServiceDashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [technicianId, setTechnicianId] = useState("all");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [suburb, setSuburb] = useState("");
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [runningLateOnly, setRunningLateOnly] = useState(false);
  const [selectedJob, setSelectedJob] = useState<FieldJob | null>(null);
  const [assignmentNotes, setAssignmentNotes] = useState("");
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState("Site Visit");
  const [noteVisibility, setNoteVisibility] = useState("Internal");
  const [savingNote, setSavingNote] = useState(false);
  const [noteSavedMessage, setNoteSavedMessage] = useState("");
  const [photoCategory, setPhotoCategory] = useState("Before Repair");
  const [photoCaption, setPhotoCaption] = useState("");
  const [pendingNotification, setPendingNotification] = useState<{ job: FieldJob; timer: number } | null>(null);
  const [calloutAddressValue, setCalloutAddressValue] = useState("");
  const [pendingDialogSection, setPendingDialogSection] = useState<"notes" | "photos" | null>(null);
  const [dashboardTab, setDashboardTab] = useState<"jobs" | "map">("jobs");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [mapLoadError, setMapLoadError] = useState("");
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const addressInputRef = useRef<HTMLInputElement | null>(null);
  const notesSectionRef = useRef<HTMLDivElement | null>(null);
  const photosSectionRef = useRef<HTMLDivElement | null>(null);
  const noteTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const selectedPlaceRef = useRef<any>(null);

  const fetchDashboard = async () => {
    const params = new URLSearchParams({
      card: "all",
      date,
      technicianId,
      status,
      priority,
      search,
      suburb,
      unassignedOnly: String(unassignedOnly),
      runningLateOnly: String(runningLateOnly),
    });

    try {
      const response = await fetch(`/api/field-service?${params}`);
      if (!response.ok) throw new Error("Failed to load field service dashboard");
      const result = await response.json();
      setData(result);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load field service dashboard",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = window.setInterval(fetchDashboard, 15000);
    return () => window.clearInterval(interval);
  }, [date, technicianId, status, priority, search, suburb, unassignedOnly, runningLateOnly]);

  useEffect(() => {
    if (!data?.map.googleApiKey || window.google?.maps) return;

    window.initFieldServiceMap = () => {
      setMapLoadError("");
      renderMap();
    };
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${data.map.googleApiKey}&libraries=places&callback=initFieldServiceMap`;
    script.async = true;
    script.onerror = () => {
      setMapLoadError("Google Maps could not load. Check the API key browser restrictions, Maps JavaScript API access, and billing status in Google Cloud.");
    };
    document.head.appendChild(script);
    return () => {
      delete window.initFieldServiceMap;
    };
  }, [data?.map.googleApiKey]);

  useEffect(() => {
    renderMap();
  }, [dashboardTab, data?.jobs, data?.map.officeLatitude, data?.map.officeLongitude]);

  useEffect(() => {
    setCalloutAddressValue(selectedJob?.calloutAddress || "");
    selectedPlaceRef.current = null;
  }, [selectedJob?.id]);

  useEffect(() => {
    if (!selectedJob || !pendingDialogSection) return;

    window.setTimeout(() => {
      const target = pendingDialogSection === "notes" ? notesSectionRef.current : photosSectionRef.current;
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (pendingDialogSection === "notes") {
        noteTextareaRef.current?.focus();
      }
      setPendingDialogSection(null);
    }, 100);
  }, [selectedJob, pendingDialogSection]);

  useEffect(() => {
    if (!window.google?.maps?.places || !addressInputRef.current || !selectedJob) return;

    const autocomplete = new window.google.maps.places.Autocomplete(addressInputRef.current, {
      fields: ["formatted_address", "geometry", "place_id"],
      componentRestrictions: { country: "nz" },
    });

    const listener = autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      selectedPlaceRef.current = place;
      if (place?.formatted_address) {
        setCalloutAddressValue(place.formatted_address);
        if (addressInputRef.current) {
          addressInputRef.current.value = place.formatted_address;
        }
      }
    });

    return () => listener.remove();
  }, [selectedJob, data?.map.googleApiKey]);

  const renderMap = () => {
    if (dashboardTab !== "map" || !window.google?.maps || !mapRef.current || !data) return;

    const office = {
      lat: data.map.officeLatitude || -36.8485,
      lng: data.map.officeLongitude || 174.7633,
    };

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: office,
        zoom: 10,
        mapTypeControl: false,
        streetViewControl: false,
      });
    } else {
      mapInstanceRef.current.setCenter(office);
    }

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const officeMarker = new window.google.maps.Marker({
      position: office,
      map: mapInstanceRef.current,
      title: "Office",
      icon: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
    });
    markersRef.current.push(officeMarker);

    data.jobs
      .filter((job) => job.calloutLatitude && job.calloutLongitude)
      .forEach((job) => {
        const marker = new window.google.maps.Marker({
          position: { lat: job.calloutLatitude, lng: job.calloutLongitude },
          map: mapInstanceRef.current,
          title: job.jobNumber,
          icon: job.runningLate
            ? "https://maps.google.com/mapfiles/ms/icons/red-dot.png"
            : job.status === "COMPLETED"
              ? "https://maps.google.com/mapfiles/ms/icons/green-dot.png"
              : "https://maps.google.com/mapfiles/ms/icons/orange-dot.png",
        });
        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="min-width:220px">
              <strong>${job.jobNumber}</strong><br/>
              ${job.customer.firstName} ${job.customer.lastName}<br/>
              ${job.calloutAddress || ""}<br/>
              <strong>Status:</strong> ${formatFieldStatus(job.status)}<br/>
              <strong>Technician:</strong> ${job.assignedTechnician ? `${job.assignedTechnician.firstName} ${job.assignedTechnician.lastName}` : "Unassigned"}<br/>
              <strong>Scheduled:</strong> ${formatDateTime(job.scheduledAt)}<br/>
              <strong>Distance:</strong> ${formatDistance(job.distanceFromOfficeKm)}
            </div>
          `,
        });
        marker.addListener("click", () => {
          infoWindow.open(mapInstanceRef.current, marker);
          setSelectedJob(job);
        });
        markersRef.current.push(marker);
      });
  };

  const openJobDialog = (job: FieldJob, section?: "notes" | "photos") => {
    setSelectedJob(job);
    setPendingDialogSection(section || null);
  };

  const refreshSelectedJob = (jobs: FieldJob[]) => {
    if (!selectedJob) return;
    const fresh = jobs.find((job) => job.id === selectedJob.id);
    if (fresh) setSelectedJob(fresh);
  };

  const mutateJob = async (jobId: string, payload: Record<string, unknown>, method: "PATCH" | "POST" = "PATCH") => {
    const response = await fetch(`/api/field-service/jobs/${jobId}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Field service action failed");
    await fetchDashboard();
    return result;
  };

  const assignTechnician = async (jobId: string, nextTechnicianId: string) => {
    try {
      await mutateJob(jobId, {
        action: "assign",
        assignedTechnicianId: nextTechnicianId === "unassigned" ? null : nextTechnicianId,
        assignmentNotes,
      });
      setAssignmentNotes("");
      toast({ title: "Technician updated", description: "Assignment saved." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const updateStatus = async (job: FieldJob, nextStatus: string) => {
    try {
      await mutateJob(job.id, { action: "status", status: nextStatus });
      toast({ title: "Status updated", description: `${job.jobNumber} is now ${formatFieldStatus(nextStatus)}.` });
      if (nextStatus === "TECHNICIAN_ON_THE_WAY") {
        prepareOnTheWayNotification(job);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const prepareOnTheWayNotification = (job: FieldJob) => {
    if (pendingNotification?.timer) {
      window.clearTimeout(pendingNotification.timer);
    }
    const timer = window.setTimeout(async () => {
      try {
        const notification = await mutateJob(job.id, {
          action: "notifyCustomer",
          notificationType: "TECHNICIAN_ON_THE_WAY",
          message: `Hi ${job.customer.firstName}, your eRepair technician is now on the way for Job #${job.jobNumber}.`,
        }, "POST");
        toast({
          title: notification.status === "QUEUED" ? "Customer notification queued" : "Customer notification sent",
          description: notification.status === "QUEUED" && notification.queuedUntil
            ? `Quiet hours are active. It will send at ${formatDateTime(notification.queuedUntil)}.`
            : "The on-the-way message was emailed to the customer.",
        });
      } catch (error: any) {
        toast({ title: "Notification error", description: error.message, variant: "destructive" });
      } finally {
        setPendingNotification(null);
      }
    }, 2000);
    setPendingNotification({ job, timer });
  };

  const undoNotification = () => {
    if (pendingNotification?.timer) {
      window.clearTimeout(pendingNotification.timer);
    }
    setPendingNotification(null);
  };

  const sendQueuedNotificationNow = async (job: FieldJob, notification: FieldJob["customerNotifications"][number]) => {
    try {
      const updated = await mutateJob(job.id, {
        action: "notifyCustomer",
        notificationId: notification.id,
        notificationType: notification.notificationType,
        message: notification.message,
        overrideQuietHours: true,
      }, "POST");
      toast({
        title: updated.status === "SENT" ? "Customer notification sent" : "Customer notification updated",
        description: updated.status === "SENT" ? "The queued message was emailed now." : `Status: ${updated.status}`,
      });
    } catch (error: any) {
      toast({ title: "Notification error", description: error.message, variant: "destructive" });
    }
  };

  const addNote = async () => {
    if (!selectedJob || !noteText.trim()) return;
    setSavingNote(true);
    setNoteSavedMessage("");
    try {
      await mutateJob(selectedJob.id, {
        action: "note",
        noteType,
        noteText,
        visibility: noteVisibility,
      }, "POST");
      setNoteText("");
      setNoteSavedMessage(`Saved at ${new Date().toLocaleTimeString("en-NZ", { hour: "2-digit", minute: "2-digit" })}`);
      toast({ title: "Note added", description: "Technician note saved." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSavingNote(false);
    }
  };

  const uploadPhoto = async (file?: File | null) => {
    if (!selectedJob || !file) return;
    try {
      const compressed = await compressImage(file);
      const formData = new FormData();
      formData.append("file", compressed);
      formData.append("photoCategory", photoCategory);
      formData.append("caption", photoCaption);

      const response = await fetch(`/api/field-service/jobs/${selectedJob.id}/photos`, {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Photo upload failed");
      setPhotoCaption("");
      await fetchDashboard();
      toast({ title: "Photo uploaded", description: "Compressed photo saved to the job." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const saveCalloutDetails = async () => {
    if (!selectedJob) return;
    const place = selectedPlaceRef.current;
    const addressValue = calloutAddressValue.trim();
    const payload: Record<string, unknown> = {
      action: "schedule",
      scheduledTime: (document.getElementById("scheduledTime") as HTMLInputElement | null)?.value || undefined,
      calloutAccessInstructions: (document.getElementById("accessInstructions") as HTMLTextAreaElement | null)?.value || undefined,
      calloutParkingNotes: (document.getElementById("parkingInstructions") as HTMLTextAreaElement | null)?.value || undefined,
      calloutApplianceLocation: (document.getElementById("applianceLocation") as HTMLInputElement | null)?.value || undefined,
      calloutFee: Number((document.getElementById("calloutFee") as HTMLInputElement | null)?.value || selectedJob.calloutFee || 0),
    };

    if (addressValue && addressValue !== selectedJob.calloutAddress) {
      if (!place?.geometry?.location || !place.place_id) {
        toast({
          title: "Select an address",
          description: "Choose a Google Places suggestion before saving the callout address.",
          variant: "destructive",
        });
        return;
      }

      payload.calloutAddress = place.formatted_address;
      payload.calloutLatitude = place.geometry.location.lat();
      payload.calloutLongitude = place.geometry.location.lng();
      payload.googlePlaceId = place.place_id;

    }

    const destination =
      typeof payload.calloutLatitude === "number" && typeof payload.calloutLongitude === "number"
        ? { lat: payload.calloutLatitude, lng: payload.calloutLongitude }
        : typeof selectedJob.calloutLatitude === "number" && typeof selectedJob.calloutLongitude === "number"
          ? { lat: selectedJob.calloutLatitude, lng: selectedJob.calloutLongitude }
          : null;

    if (
      destination &&
      data?.map.officeLatitude &&
      data?.map.officeLongitude &&
      (!selectedJob.distanceFromOfficeKm || !selectedJob.estimatedTravelTime || payload.calloutAddress)
    ) {
      const travel = await calculateGoogleTravel(
        { lat: data.map.officeLatitude, lng: data.map.officeLongitude },
        destination
      );

      if (travel) {
        payload.distanceFromOfficeKm = travel.distanceFromOfficeKm;
        payload.estimatedTravelTime = travel.estimatedTravelTime;
      }
    }

    try {
      await mutateJob(selectedJob.id, payload);
      selectedPlaceRef.current = null;
      toast({ title: "Callout updated", description: "Schedule and address details saved." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const jobs = data?.jobs || [];
  const activeFilterCount = [
    search,
    date,
    technicianId !== "all",
    status !== "all",
    priority !== "all",
    suburb,
    unassignedOnly,
    runningLateOnly,
  ].filter(Boolean).length;

  useEffect(() => {
    refreshSelectedJob(jobs);
  }, [jobs]);

  if (loading) {
    return <div className="p-6 text-sm text-gray-600">Loading field service dashboard...</div>;
  }

  return (
    <div className="space-y-5 overflow-x-hidden">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Field Service Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">Callout repair operations, scheduling, dispatch, and technician work.</p>
        </div>
        <Button onClick={() => router.push("/jobs/new")} className="w-full lg:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          New Callout
        </Button>
      </div>

      {pendingNotification && (
        <div className="mb-4 flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 md:flex-row md:items-center md:justify-between">
          <span>Sending customer notification for {pendingNotification.job.jobNumber} in 2 seconds.</span>
          <Button variant="outline" size="sm" onClick={undoNotification}>
            <X className="mr-2 h-4 w-4" />
            Undo
          </Button>
        </div>
      )}

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Callout Job List</CardTitle>
          <CardDescription>View and manage field service callout jobs</CardDescription>
        </CardHeader>
        <CardContent className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-2 sm:hidden">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => setShowMobileFilters((open) => !open)}
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Search & Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2 px-1.5 py-0 text-[10px]">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
            <span className="text-xs text-slate-500">{jobs.length} jobs</span>
          </div>

          <div className={`${showMobileFilters ? "grid" : "hidden"} mb-6 gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-[minmax(220px,1fr)_180px_180px_180px_150px_180px_180px] 2xl:items-center`}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                id="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-11 pl-10 lg:h-10"
                placeholder="Search jobs..."
              />
            </div>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="h-11 lg:h-10"
            />
            <Select value={technicianId} onValueChange={setTechnicianId}>
              <SelectTrigger className="h-11 w-full lg:h-10">
                <SelectValue placeholder="Technician" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Technicians</SelectItem>
                {data?.technicians.map((tech) => (
                  <SelectItem key={tech.id} value={tech.id}>{tech.firstName} {tech.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-11 w-full lg:h-10">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {FIELD_SERVICE_STATUSES.map((item) => (
                  <SelectItem key={item} value={item}>{formatFieldStatus(item)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="h-11 w-full lg:h-10">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
              </SelectContent>
            </Select>
            <Input
              id="suburb"
              value={suburb}
              onChange={(event) => setSuburb(event.target.value)}
              className="h-11 lg:h-10"
              placeholder="Address contains"
            />
            <Select
              value={unassignedOnly ? "unassigned" : runningLateOnly ? "late" : "all"}
              onValueChange={(value) => {
                setUnassignedOnly(value === "unassigned");
                setRunningLateOnly(value === "late");
              }}
            >
              <SelectTrigger className="h-11 w-full lg:h-10">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Callouts</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                <SelectItem value="late">Running Late</SelectItem>
              </SelectContent>
            </Select>
          </div>

      <Tabs value={dashboardTab} onValueChange={(value) => setDashboardTab(value as "jobs" | "map")} className="min-w-0 space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 p-1 sm:w-[360px]">
          <TabsTrigger value="jobs" className="h-10">Callout Jobs</TabsTrigger>
          <TabsTrigger value="map" className="h-10">Map View</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="mt-0" forceMount hidden={dashboardTab !== "jobs"}>
          <div className="mb-4 text-sm text-slate-500">{jobs.length} callout jobs shown</div>
          <div className="space-y-3 md:hidden">
            {jobs.map((job) => (
              <div key={job.id} className={`rounded-2xl border p-4 shadow-sm ${job.runningLate ? "border-rose-200 bg-rose-50" : !job.assignedTechnicianId ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/jobs/${job.id}`} className="font-semibold text-blue-700 hover:underline">
                      {job.jobNumber}
                    </Link>
                    <p className="mt-1 truncate text-sm text-slate-700">{job.customer.firstName} {job.customer.lastName}</p>
                    <a className="mt-1 block text-sm text-blue-700" href={`tel:${job.customer.phone}`}>{job.customer.phone}</a>
                  </div>
                  <Badge className={priorityTone[job.priority] || priorityTone.MEDIUM}>{job.priority === "MEDIUM" ? "NORMAL" : job.priority}</Badge>
                </div>
                <p className="mt-3 text-sm text-slate-600">{job.applianceType} · {job.calloutAddress || "Address not selected"}</p>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-white/70 p-3">
                    <p className="text-xs text-slate-500">Scheduled</p>
                    <p className="font-medium">{formatDateTime(job.scheduledAt)}</p>
                  </div>
                  <div className="rounded-lg bg-white/70 p-3">
                    <p className="text-xs text-slate-500">Travel</p>
                    <p className="font-medium">{formatDistance(job.distanceFromOfficeKm)} / {job.estimatedTravelTime || "Pending"}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <Badge className={statusTone[job.status] || "bg-slate-100 text-slate-700"}>{formatFieldStatus(job.status)}</Badge>
                  <Button className="h-11" onClick={() => openJobDialog(job)}>Open</Button>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden min-w-0 rounded-md border border-slate-200 md:block">
            <Table className="min-w-[1080px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Job ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Appliance</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Technician</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id} className={job.runningLate ? "bg-rose-50" : !job.assignedTechnicianId ? "bg-amber-50/50" : ""}>
                    <TableCell className="font-medium">
                      <Link href={`/jobs/${job.id}`} className="text-blue-700 hover:underline">
                        {job.jobNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{job.customer.firstName} {job.customer.lastName}</div>
                      <a className="text-sm text-blue-700 hover:underline" href={`tel:${job.customer.phone}`}>{job.customer.phone}</a>
                    </TableCell>
                    <TableCell>
                      <div>{job.applianceType}</div>
                      <div className="text-sm text-slate-500">{job.applianceBrand}</div>
                    </TableCell>
                    <TableCell className="min-w-[240px] text-sm">{job.calloutAddress || "Address not selected"}</TableCell>
                    <TableCell>{formatDateTime(job.scheduledAt)}</TableCell>
                    <TableCell>{job.assignedTechnician ? `${job.assignedTechnician.firstName} ${job.assignedTechnician.lastName}` : "Unassigned"}</TableCell>
                    <TableCell>
                      <Select value={job.status} onValueChange={(value) => updateStatus(job, value)}>
                        <SelectTrigger
                          className={`h-9 w-[190px] max-w-full rounded-md border px-3 text-left text-xs font-medium shadow-none [&>span]:truncate ${statusTone[job.status] || "bg-slate-100 text-slate-700"}`}
                        >
                          <SelectValue>
                            <span className="block w-full truncate">{formatFieldStatus(job.status)}</span>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {FIELD_SERVICE_STATUSES.map((item) => (
                            <SelectItem key={item} value={item}>
                              {formatFieldStatus(item)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell><Badge className={priorityTone[job.priority] || priorityTone.MEDIUM}>{job.priority === "MEDIUM" ? "NORMAL" : job.priority}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => openJobDialog(job)}>Open</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="map" className="mt-0" forceMount hidden={dashboardTab !== "map"}>
          <div className="space-y-5">
          <div className="h-[420px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm sm:h-[520px] xl:h-[calc(100vh-260px)] xl:min-h-[560px]">
            {mapLoadError ? (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center text-sm text-slate-600">
                <MapPin className="mb-3 h-8 w-8 text-slate-400" />
                <p className="max-w-md">{mapLoadError}</p>
              </div>
            ) : data?.map.googleApiKey ? (
              <div ref={mapRef} className="h-full w-full" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center text-sm text-slate-600">
                <MapPin className="mb-3 h-8 w-8 text-slate-400" />
                Add a Google Maps API key in settings to enable map markers and Places address selection.
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:hidden">
            <h2 className="font-semibold text-slate-950">Technician Mobile View</h2>
            <p className="text-sm text-slate-500">My Jobs Today</p>
            <div className="mt-3 space-y-3">
              {jobs.slice(0, 4).map((job) => (
                <div key={job.id} className="rounded-md border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <Link href={`/jobs/${job.id}`} className="font-medium text-blue-700 hover:underline">
                        {job.jobNumber}
                      </Link>
                      <p className="text-sm text-slate-600">{job.customer.firstName} {job.customer.lastName}</p>
                    </div>
                    <Badge className={statusTone[job.status] || "bg-slate-100 text-slate-700"}>{formatFieldStatus(job.status)}</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button size="lg" variant="outline" asChild><a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.calloutAddress || "")}`}><Compass className="mr-2 h-4 w-4" />Maps</a></Button>
                    <Button size="lg" variant="outline" asChild><a href={`tel:${job.customer.phone}`}><Phone className="mr-2 h-4 w-4" />Call</a></Button>
                    <Button size="lg" onClick={() => updateStatus(job, "TECHNICIAN_ON_THE_WAY")}>Start Travel</Button>
                    <Button size="lg" onClick={() => updateStatus(job, "ARRIVED_ON_SITE")}>Arrived</Button>
                    <Button size="lg" variant="outline" onClick={() => openJobDialog(job, "notes")}>Add Note</Button>
                    <Button size="lg" variant="outline" onClick={() => openJobDialog(job, "photos")}>Upload Photos</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </div>
        </TabsContent>
      </Tabs>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedJob)} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <DialogContent
          className="max-h-[92vh] max-w-5xl overflow-y-auto"
          onInteractOutside={(event) => {
            const target = event.target as HTMLElement | null;
            if (target?.closest(".pac-container")) {
              event.preventDefault();
            }
          }}
        >
          {selectedJob && (
            <>
              <DialogHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <DialogTitle className="flex flex-wrap items-center gap-2">
                    <Link href={`/jobs/${selectedJob.id}`} className="text-blue-700 hover:underline">
                      {selectedJob.jobNumber}
                    </Link>
                    <Badge className={statusTone[selectedJob.status] || "bg-slate-100 text-slate-700"}>{formatFieldStatus(selectedJob.status)}</Badge>
                    {selectedJob.runningLate && <Badge className="bg-rose-100 text-rose-700">Running Late</Badge>}
                  </DialogTitle>
                  <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => setSelectedJob(null)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                  </Button>
                </div>
              </DialogHeader>

              <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
                <div className="space-y-5">
                  <Card>
                    <CardHeader><CardTitle className="text-base">Customer and Appliance</CardTitle></CardHeader>
                    <CardContent className="grid gap-3 text-sm md:grid-cols-2">
                      <div><span className="text-slate-500">Customer</span><p className="font-medium">{selectedJob.customer.firstName} {selectedJob.customer.lastName}</p></div>
                      <div><span className="text-slate-500">Phone</span><p><a className="text-blue-700" href={`tel:${selectedJob.customer.phone}`}>{selectedJob.customer.phone}</a></p></div>
                      <div><span className="text-slate-500">Appliance</span><p>{selectedJob.applianceBrand} {selectedJob.applianceType}</p></div>
                      <div><span className="text-slate-500">Priority</span><p>{selectedJob.priority === "MEDIUM" ? "Normal" : selectedJob.priority}</p></div>
                      <div className="md:col-span-2"><span className="text-slate-500">Issue</span><p>{selectedJob.issueDescription}</p></div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle className="text-base">Callout Details</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-3 md:grid-cols-2">
	                        <div className="md:col-span-2">
	                          <Label htmlFor="calloutAddress">Google Places Address</Label>
	                          <Input
	                            ref={addressInputRef}
	                            id="calloutAddress"
	                            value={calloutAddressValue}
	                            onChange={(event) => {
	                              setCalloutAddressValue(event.target.value);
	                              selectedPlaceRef.current = null;
	                            }}
	                            placeholder="Select a Google Places result"
	                          />
	                          <p className="mt-1 text-xs text-slate-500">
	                            Select a Google suggestion before saving if you change the address.
	                          </p>
	                        </div>
                        <div>
                          <Label htmlFor="scheduledTime">Scheduled Time</Label>
                          <Input id="scheduledTime" type="datetime-local" defaultValue={(selectedJob.scheduledAt || "").slice(0, 16)} />
                        </div>
                        <div>
                          <Label htmlFor="applianceLocation">Appliance Location</Label>
                          <Input id="applianceLocation" defaultValue={selectedJob.calloutApplianceLocation || ""} />
                        </div>
                        <div>
                          <Label htmlFor="calloutFee">Callout Fee</Label>
                          <Input id="calloutFee" type="number" step="0.01" defaultValue={selectedJob.calloutFee || 0} />
                        </div>
                        <div>
                          <Label>Distance</Label>
                          <div className="mt-2 text-sm">
                            {formatDistance(selectedJob.distanceFromOfficeKm)} / {selectedJob.estimatedTravelTime || "No travel time"}
                            {selectedJob.travelEstimateSource === "STRAIGHT_LINE_ESTIMATE" && <span className="ml-1 text-xs text-slate-500">(estimated)</span>}
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="accessInstructions">Access Instructions</Label>
                          <Textarea id="accessInstructions" defaultValue={selectedJob.calloutAccessInstructions || ""} />
                        </div>
                        <div>
                          <Label htmlFor="parkingInstructions">Parking Instructions</Label>
                          <Textarea id="parkingInstructions" defaultValue={selectedJob.calloutParkingNotes || ""} />
                        </div>
                      </div>
                      <Button onClick={saveCalloutDetails}><Route className="mr-2 h-4 w-4" />Save Schedule and Route</Button>
                    </CardContent>
                  </Card>

                  <Card ref={notesSectionRef}>
                    <CardHeader>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <CardTitle className="text-base">Technician Notes</CardTitle>
                        <Button variant="outline" size="sm" onClick={() => setSelectedJob(null)}>Back to Dashboard</Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        <Select value={noteType} onValueChange={setNoteType}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{FIELD_NOTE_TYPES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={noteVisibility} onValueChange={setNoteVisibility}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Internal">Internal</SelectItem>
                            <SelectItem value="Customer Visible">Customer Visible</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Textarea
                        ref={noteTextareaRef}
                        value={noteText}
                        onChange={(event) => {
                          setNoteText(event.target.value);
                          setNoteSavedMessage("");
                        }}
                        placeholder="Add technician note"
                        className="min-h-32"
                      />
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-h-5 text-sm">
                          {noteSavedMessage ? (
                            <span className="inline-flex items-center text-emerald-700">
                              <CheckCircle2 className="mr-1 h-4 w-4" />
                              Note saved. {noteSavedMessage}
                            </span>
                          ) : (
                            <span className="text-slate-500">Type a note, then tap Save Note.</span>
                          )}
                        </div>
                        <Button className="h-11 sm:min-w-32" onClick={addNote} disabled={!noteText.trim() || savingNote}>
                          {savingNote ? "Saving..." : "Save Note"}
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {selectedJob.fieldNotes.map((note) => (
                          <div key={note.id} className="rounded-md border border-slate-200 p-3 text-sm">
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-medium">{note.noteType}</span>
                              <span className="text-xs text-slate-500">{formatDateTime(note.createdAt)}</span>
                            </div>
                            <p className="mt-1 whitespace-pre-wrap text-slate-700">{note.noteText}</p>
                            <p className="mt-1 text-xs text-slate-500">{note.visibility}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card ref={photosSectionRef}>
                    <CardHeader><CardTitle className="text-base">Photos</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid gap-3 md:grid-cols-3">
                        <Select value={photoCategory} onValueChange={setPhotoCategory}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{FIELD_PHOTO_CATEGORIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                        </Select>
                        <Input value={photoCaption} onChange={(event) => setPhotoCaption(event.target.value)} placeholder="Caption" />
                        <Label className="flex cursor-pointer items-center justify-center rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
                          <Camera className="mr-2 h-4 w-4" />
                          Upload Photo
                          <Input type="file" accept="image/*" className="hidden" onChange={(event) => uploadPhoto(event.target.files?.[0])} />
                        </Label>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {selectedJob.fieldPhotos.map((photo) => (
                          <div key={photo.id} className="overflow-hidden rounded-md border border-slate-200">
                            <img src={photo.fileUrl} alt={photo.caption || photo.photoCategory} className="h-32 w-full object-cover" />
                            <div className="p-2 text-xs">
                              <p className="font-medium">{photo.photoCategory}</p>
                              {photo.caption && <p className="text-slate-500">{photo.caption}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <Card>
                    <CardHeader><CardTitle className="text-base">Dispatch</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label>Assigned Technician</Label>
                        <Select value={selectedJob.assignedTechnicianId || "unassigned"} onValueChange={(value) => assignTechnician(selectedJob.id, value)}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {data?.technicians.map((tech) => (
                              <SelectItem key={tech.id} value={tech.id}>{tech.firstName} {tech.lastName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Textarea value={assignmentNotes} onChange={(event) => setAssignmentNotes(event.target.value)} placeholder="Assignment notes" />
                      <div>
                        <Label>Status</Label>
                        <Select value={selectedJob.status} onValueChange={(value) => updateStatus(selectedJob, value)}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>{FIELD_SERVICE_STATUSES.map((item) => <SelectItem key={item} value={item}>{formatFieldStatus(item)}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" asChild><a href={`tel:${selectedJob.customer.phone}`}><Phone className="mr-2 h-4 w-4" />Call</a></Button>
                        <Button variant="outline" asChild><a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedJob.calloutAddress || "")}`} target="_blank" rel="noreferrer"><Navigation className="mr-2 h-4 w-4" />Maps</a></Button>
                      </div>
                      <Button className="w-full" onClick={() => updateStatus(selectedJob, "TECHNICIAN_ON_THE_WAY")}><Send className="mr-2 h-4 w-4" />Technician On The Way</Button>
                      <Button variant="outline" className="w-full" onClick={() => setSelectedJob(null)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle className="text-base">Status History</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {selectedJob.statusHistory.map((entry) => (
                        <div key={entry.id} className="rounded-md border border-slate-200 p-2 text-sm">
                          <p className="font-medium">{formatFieldStatus(entry.newStatus || entry.status)}</p>
                          {entry.notes && <p className="text-slate-600">{entry.notes}</p>}
                          <p className="text-xs text-slate-500">{formatDateTime(entry.changedAt || entry.createdAt)}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle className="text-base">Customer Notifications</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {selectedJob.customerNotifications.length === 0 && <p className="text-sm text-slate-500">No customer notifications yet.</p>}
                      {selectedJob.customerNotifications.map((notification) => (
                        <div key={notification.id} className="rounded-md border border-slate-200 p-2 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{notification.notificationType}</span>
                            <Badge variant="secondary">{notification.status}</Badge>
                          </div>
                          <p className="mt-1 text-slate-600">{notification.message}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {notification.sentAt ? `Sent ${formatDateTime(notification.sentAt)}` : notification.queuedUntil ? `Queued until ${formatDateTime(notification.queuedUntil)}` : formatDateTime(notification.createdAt)}
                          </p>
                          {notification.status === "QUEUED" && (
                            <Button
                              className="mt-2 h-9 w-full"
                              size="sm"
                              variant="outline"
                              onClick={() => sendQueuedNotificationNow(selectedJob, notification)}
                            >
                              Send Now
                            </Button>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
