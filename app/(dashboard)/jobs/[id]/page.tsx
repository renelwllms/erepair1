"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Edit,
  Phone,
  Mail,
  User,
  Calendar,
  Clock,
  Package,
  MessageSquare,
  FileText,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface JobDetails {
  id: string;
  jobNumber: string;
  applianceBrand: string;
  applianceType: string;
  modelNumber?: string;
  serialNumber?: string;
  issueDescription: string;
  priority: string;
  status: string;
  estimatedCompletion?: string;
  actualCompletion?: string;
  warrantyStatus?: string;
  serviceLocation?: string;
  laborHours: number;
  diagnosticResults?: string;
  technicianNotes?: string;
  customerNotes?: string;
  createdAt: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address?: string;
    city?: string;
    state?: string;
  };
  assignedTechnician?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  createdBy: {
    firstName: string;
    lastName: string;
  };
  statusHistory: Array<{
    id: string;
    status: string;
    notes?: string;
    createdAt: string;
  }>;
  communications: Array<{
    id: string;
    direction: string;
    channel: string;
    subject?: string;
    message: string;
    createdAt: string;
  }>;
  invoice?: {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    paidAmount: number;
    status: string;
  };
}

export default function JobDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [job, setJob] = useState<JobDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [commDialogOpen, setCommDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [statusNotes, setStatusNotes] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [commData, setCommData] = useState({
    direction: "OUTBOUND",
    channel: "PHONE",
    subject: "",
    message: "",
  });
  const [addingComm, setAddingComm] = useState(false);

  const fetchJob = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/jobs/${params.id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Job not found");
        }
        throw new Error("Failed to fetch job");
      }

      const data = await response.json();
      setJob(data);
      setNewStatus(data.status);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      router.push("/jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJob();
  }, [params.id]);

  const handleStatusUpdate = async () => {
    if (newStatus === job?.status) {
      setStatusDialogOpen(false);
      return;
    }

    setUpdatingStatus(true);
    try {
      const response = await fetch(`/api/jobs/${params.id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
          notes: statusNotes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update status");
      }

      toast({
        title: "Success",
        description: "Job status updated successfully",
      });

      setStatusDialogOpen(false);
      setStatusNotes("");
      fetchJob();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddCommunication = async () => {
    setAddingComm(true);
    try {
      const response = await fetch(`/api/jobs/${params.id}/communications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(commData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add communication");
      }

      toast({
        title: "Success",
        description: "Communication log added successfully",
      });

      setCommDialogOpen(false);
      setCommData({
        direction: "OUTBOUND",
        channel: "PHONE",
        subject: "",
        message: "",
      });
      fetchJob();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAddingComm(false);
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" => {
    const statusMap: Record<string, "default" | "secondary" | "destructive"> = {
      OPEN: "default",
      IN_PROGRESS: "default",
      AWAITING_PARTS: "secondary",
      READY_FOR_PICKUP: "secondary",
      CLOSED: "secondary",
      CANCELLED: "destructive",
    };
    return statusMap[status] || "default";
  };

  const getPriorityBadgeVariant = (priority: string): "default" | "secondary" | "destructive" => {
    const priorityMap: Record<string, "default" | "secondary" | "destructive"> = {
      LOW: "secondary",
      MEDIUM: "default",
      HIGH: "default",
      URGENT: "destructive",
    };
    return priorityMap[priority] || "default";
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, " ");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/jobs")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{job.jobNumber}</h1>
            <p className="text-gray-600 mt-1">
              {job.applianceType} - {job.applianceBrand}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStatusDialogOpen(true)}>
            Update Status
          </Button>
          <Button variant="outline" onClick={() => router.push(`/jobs/${job.id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          {!job.invoice && (
            <Button onClick={() => router.push(`/invoices/new?jobId=${job.id}`)}>
              <FileText className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          )}
        </div>
      </div>

      {/* Status and Priority Badges */}
      <div className="flex gap-2">
        <Badge variant={getStatusBadgeVariant(job.status)} className="text-base px-3 py-1">
          {formatStatus(job.status)}
        </Badge>
        <Badge variant={getPriorityBadgeVariant(job.priority)} className="text-base px-3 py-1">
          {job.priority}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job Details */}
          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Issue Description</p>
                <p className="text-sm mt-1">{job.issueDescription}</p>
              </div>
              {job.diagnosticResults && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Diagnostic Results</p>
                  <p className="text-sm mt-1">{job.diagnosticResults}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                {job.modelNumber && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Model Number</p>
                    <p className="text-sm mt-1">{job.modelNumber}</p>
                  </div>
                )}
                {job.serialNumber && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Serial Number</p>
                    <p className="text-sm mt-1">{job.serialNumber}</p>
                  </div>
                )}
                {job.warrantyStatus && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Warranty Status</p>
                    <p className="text-sm mt-1">{job.warrantyStatus}</p>
                  </div>
                )}
                {job.serviceLocation && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Service Location</p>
                    <p className="text-sm mt-1">{job.serviceLocation}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Technician Notes */}
          {job.technicianNotes && (
            <Card>
              <CardHeader>
                <CardTitle>Technician Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{job.technicianNotes}</p>
              </CardContent>
            </Card>
          )}

          {/* Status Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Status Timeline</CardTitle>
              <CardDescription>History of status changes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {job.statusHistory.map((entry, index) => (
                  <div key={entry.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-blue-500' : 'bg-gray-300'}`} />
                      {index < job.statusHistory.length - 1 && (
                        <div className="w-0.5 h-full bg-gray-200 my-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusBadgeVariant(entry.status)}>
                          {formatStatus(entry.status)}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(entry.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {entry.notes && (
                        <p className="text-sm text-gray-600 mt-1">{entry.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Communication Log */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Communication Log</CardTitle>
                  <CardDescription>Customer interactions and notes</CardDescription>
                </div>
                <Button size="sm" onClick={() => setCommDialogOpen(true)}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Add Log
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {job.communications.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No communication logs yet
                </p>
              ) : (
                <div className="space-y-4">
                  {job.communications.map((comm) => (
                    <div key={comm.id} className="border-l-2 border-gray-200 pl-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs">
                          {comm.direction}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {comm.channel}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(comm.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {comm.subject && (
                        <p className="text-sm font-medium">{comm.subject}</p>
                      )}
                      <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                        {comm.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-600">Name</p>
                <p className="text-sm">
                  {job.customer.firstName} {job.customer.lastName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => window.location.href = `tel:${job.customer.phone}`}
                >
                  <Phone className="h-3 w-3 mr-1" />
                  Call
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => window.location.href = `mailto:${job.customer.email}`}
                >
                  <Mail className="h-3 w-3 mr-1" />
                  Email
                </Button>
              </div>
              <div>
                <p className="text-sm text-gray-600">{job.customer.phone}</p>
                <p className="text-sm text-gray-600">{job.customer.email}</p>
              </div>
              {job.customer.address && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Address</p>
                  <p className="text-sm">
                    {job.customer.address}
                    {job.customer.city && job.customer.state && (
                      <><br />{job.customer.city}, {job.customer.state}</>
                    )}
                  </p>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => router.push(`/customers/${job.customer.id}`)}
              >
                View Customer Profile
              </Button>
            </CardContent>
          </Card>

          {/* Technician Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assigned Technician</CardTitle>
            </CardHeader>
            <CardContent>
              {job.assignedTechnician ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">
                      {job.assignedTechnician.firstName} {job.assignedTechnician.lastName}
                    </p>
                    <p className="text-sm text-gray-600">{job.assignedTechnician.email}</p>
                    <p className="text-sm text-gray-600">{job.assignedTechnician.phone}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Not assigned</p>
              )}
            </CardContent>
          </Card>

          {/* Job Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Job Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-600">Created</p>
                  <p>{new Date(job.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              {job.estimatedCompletion && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-600">Est. Completion</p>
                    <p>{new Date(job.estimatedCompletion).toLocaleDateString()}</p>
                  </div>
                </div>
              )}
              {job.actualCompletion && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-xs text-gray-600">Completed</p>
                    <p>{new Date(job.actualCompletion).toLocaleDateString()}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-600">Created By</p>
                  <p>
                    {job.createdBy.firstName} {job.createdBy.lastName}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Info */}
          {job.invoice && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Invoice</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm font-medium">{job.invoice.invoiceNumber}</p>
                  <p className="text-sm">Total: ${job.invoice.totalAmount.toFixed(2)}</p>
                  <p className="text-sm">Paid: ${job.invoice.paidAmount.toFixed(2)}</p>
                  <Badge variant={job.invoice.status === "PAID" ? "secondary" : "default"}>
                    {job.invoice.status}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => router.push(`/invoices/${job.invoice?.id}`)}
                  >
                    View Invoice
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Status Update Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Job Status</DialogTitle>
            <DialogDescription>Change the status of this job</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="AWAITING_PARTS">Awaiting Parts</SelectItem>
                  <SelectItem value="READY_FOR_PICKUP">Ready for Pickup</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <textarea
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                className="w-full min-h-[100px] px-3 py-2 text-sm border rounded-md"
                placeholder="Add notes about this status change..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStatusUpdate} disabled={updatingStatus}>
              {updatingStatus ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Communication Dialog */}
      <Dialog open={commDialogOpen} onOpenChange={setCommDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Communication Log</DialogTitle>
            <DialogDescription>Record customer interaction</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Direction</Label>
                <Select
                  value={commData.direction}
                  onValueChange={(value) => setCommData({ ...commData, direction: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INBOUND">Inbound</SelectItem>
                    <SelectItem value="OUTBOUND">Outbound</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Channel</Label>
                <Select
                  value={commData.channel}
                  onValueChange={(value) => setCommData({ ...commData, channel: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMAIL">Email</SelectItem>
                    <SelectItem value="SMS">SMS</SelectItem>
                    <SelectItem value="PHONE">Phone</SelectItem>
                    <SelectItem value="IN_PERSON">In Person</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Subject (optional)</Label>
              <Input
                value={commData.subject}
                onChange={(e) => setCommData({ ...commData, subject: e.target.value })}
                placeholder="Subject or title"
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <textarea
                value={commData.message}
                onChange={(e) => setCommData({ ...commData, message: e.target.value })}
                className="w-full min-h-[120px] px-3 py-2 text-sm border rounded-md"
                placeholder="Describe the communication..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCommDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCommunication} disabled={addingComm || !commData.message}>
              {addingComm ? "Adding..." : "Add Log"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
