import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
        <p className="text-gray-600 mt-1">Schedule jobs and manage appointments</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Calendar & Scheduling</CardTitle>
          <CardDescription>
            This page is under construction. Coming in Phase 5!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">
              Calendar and scheduling features will be implemented in Phase 5 of the project.
            </p>
            <p className="text-sm text-gray-400">
              Features will include: Visual calendar, job appointments, technician schedules,
              drag-and-drop assignment, and time slot booking.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
