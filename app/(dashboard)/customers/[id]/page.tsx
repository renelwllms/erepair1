"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Edit,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  DollarSign,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { CustomerDialog } from "@/components/customers/customer-dialog";

interface Job {
  id: string;
  jobNumber: string;
  applianceBrand: string;
  applianceType: string;
  status: string;
  priority: string;
  createdAt: string;
  assignedTechnician?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: string;
  issueDate: string;
  job: {
    jobNumber: string;
    applianceType: string;
  };
}

interface CustomerDetails {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  customerType: "RESIDENTIAL" | "COMMERCIAL";
  notes?: string;
  customerSince: string;
  jobs: Job[];
  invoices: Invoice[];
  stats: {
    totalJobs: number;
    openJobs: number;
    completedJobs: number;
    totalRevenue: number;
    totalOwed: number;
  };
}

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [customer, setCustomer] = useState<CustomerDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchCustomer = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/customers/${params.id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Customer not found");
        }
        throw new Error("Failed to fetch customer");
      }

      const data = await response.json();
      setCustomer(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      router.push("/customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer();
  }, [params.id]);

  const getStatusBadgeVariant = (status: string) => {
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

  const getStatusIcon = (status: string) => {
    if (status === "CLOSED") return <CheckCircle className="h-4 w-4" />;
    if (status === "CANCELLED") return <XCircle className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg">Loading customer details...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/customers")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {customer.firstName} {customer.lastName}
            </h1>
            <p className="text-gray-600 mt-1">Customer Details</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.location.href = `tel:${customer.phone}`}>
            <Phone className="h-4 w-4 mr-2" />
            Call
          </Button>
          <Button variant="outline" onClick={() => window.location.href = `mailto:${customer.email}`}>
            <Mail className="h-4 w-4 mr-2" />
            Email
          </Button>
          <Button variant="outline" onClick={() => router.push(`/jobs/new?customerId=${customer.id}`)}>
            <FileText className="h-4 w-4 mr-2" />
            New Job
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customer.stats.totalJobs}</div>
            <p className="text-xs text-gray-500 mt-1">
              {customer.stats.openJobs} open, {customer.stats.completedJobs} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${customer.stats.totalRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Lifetime value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              ${customer.stats.totalOwed.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Amount owed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Customer Since</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Date(customer.customerSince).getFullYear()}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {new Date(customer.customerSince).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Customer Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-600">Email</p>
                <p className="text-sm">{customer.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-600">Phone</p>
                <p className="text-sm">{customer.phone}</p>
              </div>
            </div>
            {(customer.address || customer.city || customer.state || customer.zipCode) && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Address</p>
                  <p className="text-sm">
                    {customer.address && <>{customer.address}<br /></>}
                    {customer.city && customer.state && customer.zipCode && (
                      <>{customer.city}, {customer.state} {customer.zipCode}</>
                    )}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <Package className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-600">Customer Type</p>
                <Badge variant={customer.customerType === "COMMERCIAL" ? "default" : "secondary"}>
                  {customer.customerType}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Notes</p>
              <p className="text-sm text-gray-700">
                {customer.notes || "No notes available"}
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-600">Customer Since</p>
                <p className="text-sm">{new Date(customer.customerSince).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric"
                })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Job History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Job History</CardTitle>
              <CardDescription>All jobs for this customer</CardDescription>
            </div>
            <Button onClick={() => router.push(`/jobs/new?customerId=${customer.id}`)}>
              <Plus className="h-4 w-4 mr-2" />
              New Job
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {customer.jobs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No jobs found for this customer</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job #</TableHead>
                  <TableHead>Appliance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Technician</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">{job.jobNumber}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{job.applianceType}</div>
                        <div className="text-sm text-gray-500">{job.applianceBrand}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(job.status)}>
                        {job.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={job.priority === "URGENT" ? "destructive" : "secondary"}>
                        {job.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {job.assignedTechnician ? (
                        `${job.assignedTechnician.firstName} ${job.assignedTechnician.lastName}`
                      ) : (
                        <span className="text-gray-400">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>{new Date(job.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/jobs/${job.id}`)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invoice History */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
          <CardDescription>All invoices for this customer</CardDescription>
        </CardHeader>
        <CardContent>
          {customer.invoices.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No invoices found for this customer</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{invoice.job.jobNumber}</div>
                        <div className="text-sm text-gray-500">{invoice.job.applianceType}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={invoice.status === "PAID" ? "secondary" : "default"}>
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell>${invoice.totalAmount.toFixed(2)}</TableCell>
                    <TableCell className="text-green-600">${invoice.paidAmount.toFixed(2)}</TableCell>
                    <TableCell className={invoice.balanceAmount > 0 ? "text-orange-600" : ""}>
                      ${invoice.balanceAmount.toFixed(2)}
                    </TableCell>
                    <TableCell>{new Date(invoice.issueDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/invoices/${invoice.id}`)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CustomerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        customer={customer}
        onSuccess={() => {
          fetchCustomer();
          setDialogOpen(false);
        }}
      />
    </div>
  );
}
