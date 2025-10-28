import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-gray-600 mt-1">Business insights and performance metrics</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reports Dashboard</CardTitle>
          <CardDescription>
            This page is under construction. Coming in Phase 6!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">
              Reports and analytics will be implemented in Phase 6 of the project.
            </p>
            <p className="text-sm text-gray-400">
              Features will include: Financial reports, job completion reports,
              technician productivity, customer analytics, and export to PDF/Excel.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
