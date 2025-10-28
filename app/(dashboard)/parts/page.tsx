import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function PartsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Parts Inventory</h1>
          <p className="text-gray-600 mt-1">Manage parts stock and suppliers</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Part
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parts Management</CardTitle>
          <CardDescription>
            This page is under construction. Coming in Phase 5!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">
              Parts inventory features will be implemented in Phase 5 of the project.
            </p>
            <p className="text-sm text-gray-400">
              Features will include: Parts catalog, stock management, low stock alerts,
              supplier information, and usage tracking.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
