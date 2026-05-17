"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
  DollarSign,
  Plus,
  Trash2,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Textarea } from "@/components/ui/textarea";

interface JobDetails {
  id: string;
  jobNumber: string;
  jobType?: "WORKSHOP_REPAIR" | "CALLOUT_REPAIR";
  isCallout?: boolean;
  isWarrantyReturn?: boolean;
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
  calloutAddress?: string | null;
  preferredCalloutDate?: string | null;
  calloutAccessInstructions?: string | null;
  calloutParkingNotes?: string | null;
  calloutApplianceLocation?: string | null;
  laborHours: number;
  diagnosticFeeAmount: number;
  diagnosticFeePaid: boolean;
  diagnosticFeePaidAt?: string | null;
  diagnosticFeePaymentMethod?: string | null;
  diagnosticFeeAppliedToInvoice?: boolean;
  repairApproved?: boolean;
  diagnosticResults?: string;
  technicianNotes?: string;
  customerNotes?: string;
  beforePhotos: string[];
  afterPhotos: string[];
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
    balanceAmount?: number;
    status: string;
  };
  quotes?: Array<{
    id: string;
    quoteNumber: string;
    status: string;
    issueDate: string;
    validUntil: string;
    reminderCount: number;
    lastReminderSent?: string | null;
  }>;
  warrantyParentJob?: {
    id: string;
    jobNumber: string;
    status: string;
  } | null;
  warrantyFollowUpJobs?: Array<{
    id: string;
    jobNumber: string;
    status: string;
    createdAt: string;
  }>;
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
  const [diagnosticFeeAmount, setDiagnosticFeeAmount] = useState("");
  const [diagnosticFeePaid, setDiagnosticFeePaid] = useState(false);
  const [diagnosticFeePaidAt, setDiagnosticFeePaidAt] = useState("");
  const [diagnosticFeePaymentMethod, setDiagnosticFeePaymentMethod] = useState("CASH");
  const [savingDiagnosticFee, setSavingDiagnosticFee] = useState(false);

  // Quote state
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [quoteItems, setQuoteItems] = useState<Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>>([{ description: "", quantity: 1, unitPrice: 0 }]);
  const [quoteNotes, setQuoteNotes] = useState("");
  const [taxRate, setTaxRate] = useState(15); // Default 15% GST
  const [sendingQuote, setSendingQuote] = useState(false);
  const [warrantyDialogOpen, setWarrantyDialogOpen] = useState(false);
  const [warrantyAction, setWarrantyAction] = useState<"REOPEN" | "CREATE_LINKED">("CREATE_LINKED");
  const [warrantyIssueDescription, setWarrantyIssueDescription] = useState("");
  const [warrantyNotes, setWarrantyNotes] = useState("");
  const [processingWarranty, setProcessingWarranty] = useState(false);

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
      setDiagnosticFeeAmount(
        typeof data.diagnosticFeeAmount === "number" ? data.diagnosticFeeAmount.toString() : "0"
      );
      setDiagnosticFeePaid(Boolean(data.diagnosticFeePaid));
      setDiagnosticFeePaidAt(
        data.diagnosticFeePaidAt ? new Date(data.diagnosticFeePaidAt).toISOString().slice(0, 10) : ""
      );
      setDiagnosticFeePaymentMethod(data.diagnosticFeePaymentMethod || "CASH");
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
      if (
        newStatus === "READY_FOR_PICKUP" &&
        job &&
        job.diagnosticFeeAmount > 0 &&
        !job.diagnosticFeePaid
      ) {
        const proceed = confirm(
          "Diagnostic fee is not marked as paid for this job. Please record the payment before generating the invoice. Do you want to continue anyway?"
        );
        if (!proceed) {
          setUpdatingStatus(false);
          return;
        }
      }

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

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update status");
      }

      toast({
        title: "Success",
        description: "Job status updated successfully",
      });

      setStatusDialogOpen(false);
      setStatusNotes("");
      await fetchJob();

      if (newStatus === "READY_FOR_PICKUP") {
        if (result.invoice?.id) {
          router.push(`/invoices/${result.invoice.id}`);
        } else {
          router.push(`/invoices/new?jobId=${params.id}`);
        }
      }
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

  const handleDiagnosticFeeSave = async () => {
    if (!job) return;
    setSavingDiagnosticFee(true);
    try {
      const paidAtValue =
        diagnosticFeePaid
          ? diagnosticFeePaidAt || new Date().toISOString().slice(0, 10)
          : "";

      const response = await fetch(`/api/jobs/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diagnosticFeeAmount: Number(diagnosticFeeAmount || 0),
          diagnosticFeePaid,
          diagnosticFeePaidAt: diagnosticFeePaid ? new Date(paidAtValue).toISOString() : null,
          diagnosticFeePaymentMethod: diagnosticFeePaid ? diagnosticFeePaymentMethod : null,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to update diagnostic fee");
      }

      toast({
        title: "Success",
        description: "Diagnostic fee updated",
      });

      await fetchJob();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingDiagnosticFee(false);
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

  // Quote handlers
  const addQuoteItem = () => {
    setQuoteItems([...quoteItems, { description: "", quantity: 1, unitPrice: 0 }]);
  };

  const removeQuoteItem = (index: number) => {
    if (quoteItems.length > 1) {
      setQuoteItems(quoteItems.filter((_, i) => i !== index));
    }
  };

  const updateQuoteItem = (index: number, field: string, value: any) => {
    const updatedItems = [...quoteItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setQuoteItems(updatedItems);
  };

  const calculateQuoteTotals = () => {
    const subtotal = quoteItems.reduce((sum, item) => {
      return sum + (item.quantity * item.unitPrice);
    }, 0);
    const taxAmount = subtotal * (taxRate / 100);
    const totalAmount = subtotal + taxAmount;
    return { subtotal, taxAmount, totalAmount };
  };

  const handleSendQuote = async () => {
    // Validate quote items
    const invalidItems = quoteItems.filter(item => !item.description || item.quantity <= 0 || item.unitPrice < 0);
    if (invalidItems.length > 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all quote items with valid values",
        variant: "destructive",
      });
      return;
    }

    setSendingQuote(true);
    try {
      const { subtotal, taxAmount, totalAmount } = calculateQuoteTotals();

      const quoteData = {
        quoteItems: quoteItems.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
        })),
        subtotal,
        taxRate,
        taxAmount,
        totalAmount,
        notes: quoteNotes,
        validDays: 30,
      };

      const response = await fetch(`/api/jobs/${params.id}/send-quote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(quoteData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send quote");
      }

      const result = await response.json();

      toast({
        title: "Success",
        description: `Quote ${result.quoteNumber} sent successfully`,
      });

      setQuoteDialogOpen(false);
      setQuoteItems([{ description: "", quantity: 1, unitPrice: 0 }]);
      setQuoteNotes("");
      fetchJob();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSendingQuote(false);
    }
  };

  const handleWarrantyReturn = async () => {
    if (!warrantyIssueDescription.trim()) {
      toast({
        title: "Validation Error",
        description: "Please describe the warranty issue before continuing",
        variant: "destructive",
      });
      return;
    }

    setProcessingWarranty(true);
    try {
      const response = await fetch(`/api/jobs/${params.id}/warranty-return`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: warrantyAction,
          issueDescription: warrantyIssueDescription.trim(),
          notes: warrantyNotes.trim() || undefined,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to process warranty return");
      }

      toast({
        title: "Success",
        description: result.message,
      });

      setWarrantyDialogOpen(false);
      setWarrantyNotes("");
      setWarrantyIssueDescription("");

      if (result.action === "CREATE_LINKED" && result.job?.id) {
        router.push(`/jobs/${result.job.id}`);
        return;
      }

      await fetchJob();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process warranty return",
        variant: "destructive",
      });
    } finally {
      setProcessingWarranty(false);
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" => {
    const statusMap: Record<string, "default" | "secondary" | "destructive"> = {
      OPEN: "default",
      IN_PROGRESS: "default",
      AWAITING_CUSTOMER_APPROVAL: "secondary",
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
    if (status === "AWAITING_CUSTOMER_APPROVAL") {
      return "Awaiting Customer Approval";
    }
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
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button variant="ghost" size="sm" onClick={() => router.push("/jobs")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{job.jobNumber}</h1>
            <p className="text-gray-600 mt-1">
              {job.applianceType} - {job.applianceBrand}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {(job.status === "CLOSED" || job.invoice?.status === "PAID") && (
            <Button variant="outline" onClick={() => {
              setWarrantyIssueDescription(`Warranty return for ${job.jobNumber}: `);
              setWarrantyAction("CREATE_LINKED");
              setWarrantyDialogOpen(true);
            }}>
              <AlertCircle className="h-4 w-4 mr-2" />
              Warranty Return
            </Button>
          )}
          <Button variant="outline" onClick={() => setStatusDialogOpen(true)}>
            Update Status
          </Button>
          <Button variant="outline" onClick={() => router.push(`/jobs/${job.id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          {!job.invoice && job.status !== "CLOSED" && job.status !== "CANCELLED" && (
            <Button variant="outline" onClick={() => setQuoteDialogOpen(true)}>
              <DollarSign className="h-4 w-4 mr-2" />
              Send Quote
            </Button>
          )}
          {job.invoice ? (
            <Button onClick={() => router.push(`/invoices/${job.invoice?.id}`)}>
              <FileText className="h-4 w-4 mr-2" />
              View Invoice
            </Button>
          ) : (
            <Button onClick={() => router.push(`/invoices/new?jobId=${job.id}`)}>
              <FileText className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          )}
        </div>
      </div>

      {/* Status and Priority Badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="text-base px-3 py-1">
          {job.jobType === "CALLOUT_REPAIR" || job.isCallout ? "Callout Repair" : "Workshop Repair"}
        </Badge>
        <Badge variant={getStatusBadgeVariant(job.status)} className="text-base px-3 py-1">
          {formatStatus(job.status)}
        </Badge>
        <Badge variant={getPriorityBadgeVariant(job.priority)} className="text-base px-3 py-1">
          {job.priority}
        </Badge>
        {job.status === "AWAITING_CUSTOMER_APPROVAL" && job.quotes?.[0] && (
          <Badge variant="secondary" className="text-base px-3 py-1">
            {job.quotes[0].reminderCount} Reminder{job.quotes[0].reminderCount === 1 ? "" : "s"} Sent
          </Badge>
        )}
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                {job.warrantyParentJob && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Warranty Parent Job</p>
                    <Link
                      href={`/jobs/${job.warrantyParentJob.id}`}
                      className="mt-1 inline-block text-sm text-blue-600 hover:underline"
                    >
                      {job.warrantyParentJob.jobNumber} ({formatStatus(job.warrantyParentJob.status)})
                    </Link>
                  </div>
                )}
                {job.serviceLocation && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Service Location</p>
                    <p className="text-sm mt-1">{job.serviceLocation}</p>
                  </div>
                )}
                {(job.jobType === "CALLOUT_REPAIR" || job.isCallout) && job.calloutAddress && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Full Address</p>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{job.calloutAddress}</p>
                  </div>
                )}
                {(job.jobType === "CALLOUT_REPAIR" || job.isCallout) && job.preferredCalloutDate && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Preferred Date/Time</p>
                    <p className="text-sm mt-1">{new Date(job.preferredCalloutDate).toLocaleString()}</p>
                  </div>
                )}
                {(job.jobType === "CALLOUT_REPAIR" || job.isCallout) && job.calloutApplianceLocation && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Appliance Location</p>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{job.calloutApplianceLocation}</p>
                  </div>
                )}
                {(job.jobType === "CALLOUT_REPAIR" || job.isCallout) && job.calloutAccessInstructions && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Access Instructions</p>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{job.calloutAccessInstructions}</p>
                  </div>
                )}
                {(job.jobType === "CALLOUT_REPAIR" || job.isCallout) && job.calloutParkingNotes && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Parking Notes</p>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{job.calloutParkingNotes}</p>
                  </div>
                )}
                {job.status === "AWAITING_CUSTOMER_APPROVAL" && job.quotes?.[0] && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Quote Reminder Progress</p>
                    <p className="text-sm mt-1">
                      {job.quotes[0].reminderCount} of 5 reminders sent
                      {job.quotes[0].lastReminderSent
                        ? ` • last sent ${new Date(job.quotes[0].lastReminderSent).toLocaleDateString()}`
                        : " • no reminders sent yet"}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {job.warrantyFollowUpJobs && job.warrantyFollowUpJobs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Warranty Follow-up Jobs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {job.warrantyFollowUpJobs.map((followUpJob) => (
                  <Link
                    key={followUpJob.id}
                    href={`/jobs/${followUpJob.id}`}
                    className="flex w-full items-center justify-between rounded-md border p-3 text-left hover:bg-gray-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{followUpJob.jobNumber}</p>
                      <p className="text-xs text-gray-500">
                        {formatStatus(followUpJob.status)} • {new Date(followUpJob.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <ArrowLeft className="h-4 w-4 rotate-180 text-gray-400" />
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Diagnostic Fee</CardTitle>
              <CardDescription>Record diagnostic fee payment and apply credit to invoices</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="diagnosticFeeAmount">Diagnostic Fee Amount</Label>
                  <Input
                    id="diagnosticFeeAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={diagnosticFeeAmount}
                    onChange={(event) => setDiagnosticFeeAmount(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Diagnostic Fee Paid</Label>
                  <Select
                    value={diagnosticFeePaid ? "yes" : "no"}
                    onValueChange={(value) => {
                      const isPaid = value === "yes";
                      setDiagnosticFeePaid(isPaid);
                      if (isPaid && !diagnosticFeePaidAt) {
                        setDiagnosticFeePaidAt(new Date().toISOString().slice(0, 10));
                      }
                      if (!isPaid) {
                        setDiagnosticFeePaidAt("");
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="diagnosticFeePaidAt">Paid Date</Label>
                  <Input
                    id="diagnosticFeePaidAt"
                    type="date"
                    value={diagnosticFeePaidAt}
                    onChange={(event) => setDiagnosticFeePaidAt(event.target.value)}
                    disabled={!diagnosticFeePaid}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select
                    value={diagnosticFeePaymentMethod}
                    onValueChange={setDiagnosticFeePaymentMethod}
                    disabled={!diagnosticFeePaid}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                      <SelectItem value="DEBIT_CARD">Debit Card</SelectItem>
                      <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                      <SelectItem value="CHECK">Check</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {job.diagnosticFeeAppliedToInvoice && (
                <p className="text-xs text-green-600">
                  Diagnostic fee credit has already been applied to an invoice.
                </p>
              )}

              <div>
                <Button onClick={handleDiagnosticFeeSave} disabled={savingDiagnosticFee}>
                  {savingDiagnosticFee ? "Saving..." : "Save Diagnostic Fee"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Device Photos */}
          {(job.beforePhotos.length > 0 || job.afterPhotos.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>Device Photos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {job.beforePhotos.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-3">Before Photos</p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                      {job.beforePhotos.map((photo, index) => (
                        <div key={index} className="border rounded-lg overflow-hidden">
                          <a href={photo} target="_blank" rel="noopener noreferrer">
                            <img
                              src={photo}
                              alt={`Before photo ${index + 1}`}
                              className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                            />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {job.afterPhotos.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-3">After Photos</p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                      {job.afterPhotos.map((photo, index) => (
                        <div key={index} className="border rounded-lg overflow-hidden">
                          <a href={photo} target="_blank" rel="noopener noreferrer">
                            <img
                              src={photo}
                              alt={`After photo ${index + 1}`}
                              className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                            />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

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
                  asChild
                >
                  <a href={`tel:${job.customer.phone}`}>
                    <Phone className="h-3 w-3 mr-1" />
                    Call
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  asChild
                >
                  <a href={`mailto:${job.customer.email}`} target="_blank" rel="noopener noreferrer">
                    <Mail className="h-3 w-3 mr-1" />
                    Email
                  </a>
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
                  <SelectItem value="AWAITING_CUSTOMER_APPROVAL">Awaiting Customer Approval</SelectItem>
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

      {/* Send Quote Dialog */}
      <Dialog open={quoteDialogOpen} onOpenChange={setQuoteDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Send Quote to Customer</DialogTitle>
            <DialogDescription>
              Create a quote for {job.customer.firstName} {job.customer.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Quote Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Quote Items</Label>
                <Button type="button" size="sm" variant="outline" onClick={addQuoteItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-3">
                {quoteItems.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 gap-3 rounded-md border p-4 md:grid-cols-12"
                  >
                    <div className="md:col-span-5">
                      <Label className="mb-1 block text-sm">Description</Label>
                      <Input
                        placeholder="Service or part description"
                        value={item.description}
                        onChange={(e) => updateQuoteItem(index, "description", e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="mb-1 block text-sm">Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateQuoteItem(index, "quantity", parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="mb-1 block text-sm">Unit Price</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={item.unitPrice}
                        onChange={(e) => updateQuoteItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="mb-1 block text-sm">Total Price</Label>
                      <Input
                        value={(item.quantity * item.unitPrice).toFixed(2)}
                        readOnly
                        className="font-medium"
                      />
                    </div>
                    <div className="md:col-span-1 flex items-end justify-end md:justify-center">
                      {quoteItems.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeQuoteItem(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* GST Rate */}
            <div className="space-y-2">
              <Label>GST Rate (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                className="max-w-[200px]"
              />
            </div>

            {/* Totals */}
            <div className="border-t pt-4">
              <div className="flex flex-col gap-2 max-w-sm ml-auto">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span className="font-medium">${calculateQuoteTotals().subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>GST ({taxRate}%):</span>
                  <span className="font-medium">${calculateQuoteTotals().taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>${calculateQuoteTotals().totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={quoteNotes}
                onChange={(e) => setQuoteNotes(e.target.value)}
                placeholder="Add any additional notes or terms for the customer..."
                className="min-h-[100px]"
              />
            </div>

            {/* Quote Info */}
            <div className="bg-blue-50 p-4 rounded-md space-y-1">
              <p className="text-sm font-medium text-blue-900">Quote Details:</p>
              <p className="text-xs text-blue-700">
                • Quote will be valid for 30 days from today
              </p>
              <p className="text-xs text-blue-700">
                • PDF will be automatically generated and sent to {job.customer.email}
              </p>
              <p className="text-xs text-blue-700">
                • Job status will be updated to &ldquo;Awaiting Customer Approval&rdquo;
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setQuoteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendQuote}
              disabled={sendingQuote || calculateQuoteTotals().totalAmount === 0}
            >
              {sendingQuote ? "Sending..." : "Send Quote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={warrantyDialogOpen} onOpenChange={setWarrantyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Warranty Return</DialogTitle>
            <DialogDescription>
              Choose whether to reopen this job or create a linked warranty follow-up job. Manual refund payouts can be tracked from the invoice.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Warranty Handling</Label>
              <Select
                value={warrantyAction}
                onValueChange={(value: "REOPEN" | "CREATE_LINKED") => setWarrantyAction(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CREATE_LINKED">Create linked warranty job</SelectItem>
                  <SelectItem value="REOPEN">Reopen this existing job</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Use linked jobs for cleaner history. Reopen the existing job only if you want everything on one record.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="warrantyIssueDescription">Reported Issue</Label>
              <Textarea
                id="warrantyIssueDescription"
                value={warrantyIssueDescription}
                onChange={(event) => setWarrantyIssueDescription(event.target.value)}
                placeholder="Describe what failed or what the customer reported during the warranty period"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="warrantyNotes">Internal Notes</Label>
              <Textarea
                id="warrantyNotes"
                value={warrantyNotes}
                onChange={(event) => setWarrantyNotes(event.target.value)}
                placeholder="Optional internal notes. Manual refund payouts can be tracked from the invoice."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setWarrantyDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleWarrantyReturn} disabled={processingWarranty}>
              {processingWarranty ? "Processing..." : "Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
