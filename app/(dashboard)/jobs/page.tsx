"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, MoreHorizontal, Eye, Edit, FileText, Clock, AlertCircle, Bell, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { differenceInDays } from "date-fns";

interface Job {
  id: string;
  jobNumber: string;
  applianceBrand: string;
  applianceType: string;
  status: string;
  diagnosticFeeAmount?: number;
  diagnosticFeePaid?: boolean;
  priority: string;
  createdAt: string;
  lastNotificationSent?: string | null;
  invoice?: {
    id: string;
    invoiceNumber: string;
    status: string;
    totalAmount: number;
  } | null;
  quotes?: Array<{
    id: string;
    status: string;
    issueDate: string;
    validUntil: string;
    reminderCount: number;
    lastReminderSent?: string | null;
  }>;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  assignedTechnician?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface Settings {
  notificationReminderDays: number;
}

export default function JobsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [attentionFilter, setAttentionFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [settings, setSettings] = useState<Settings>({ notificationReminderDays: 3 });
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const data = await response.json();
        setSettings({
          notificationReminderDays: data.notificationReminderDays || 3,
        });
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    }
  };

  const needsAttention = (job: Job): boolean => {
    // Jobs that are closed or cancelled don't need attention
    if (job.status === "CLOSED" || job.status === "CANCELLED") {
      return false;
    }

    // If no notification has been sent, it needs attention
    if (!job.lastNotificationSent) {
      return true;
    }

    // Check if notification is overdue
    const daysSinceLastNotification = differenceInDays(
      new Date(),
      new Date(job.lastNotificationSent)
    );
    return daysSinceLastNotification >= settings.notificationReminderDays;
  };

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        ...(searchQuery && { search: searchQuery }),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(priorityFilter !== "all" && { priority: priorityFilter }),
      });

      const response = await fetch(`/api/jobs?${params}`);
      if (!response.ok) throw new Error("Failed to fetch jobs");

      const data = await response.json();
      setJobs(data.jobs);
      setTotalPages(data.pagination.totalPages);
      setSelectedJobs(new Set());
      return data.jobs as Job[];
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load jobs",
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [page, searchQuery, statusFilter, priorityFilter]);

  const toggleSelectAll = (checked: boolean) => {
    if (!checked) {
      setSelectedJobs(new Set());
      return;
    }
    const next = new Set(filteredJobs.map((job) => job.id));
    setSelectedJobs(next);
  };

  const toggleSelectJob = (jobId: string, checked: boolean) => {
    const next = new Set(selectedJobs);
    if (checked) {
      next.add(jobId);
    } else {
      next.delete(jobId);
    }
    setSelectedJobs(next);
  };

  const handleBulkDelete = async () => {
    if (selectedJobs.size === 0) return;
    const confirmDelete = confirm(
      `Delete ${selectedJobs.size} selected job(s)? This action cannot be undone.`
    );
    if (!confirmDelete) return;

    try {
      const response = await fetch("/api/jobs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedJobs) }),
      });
      const data = await response.json();
      if (!response.ok) {
        const blocked = Array.isArray(data.jobs) ? ` Jobs with invoices: ${data.jobs.join(", ")}` : "";
        throw new Error((data.error || "Failed to delete jobs") + blocked);
      }

      toast({
        title: "Jobs deleted",
        description: `Deleted ${data.deleted || 0} job(s).`,
      });

      setSelectedJobs(new Set());
      fetchJobs();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete jobs",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (jobId: string, newStatus: string, job: Job) => {
    try {
      if (
        newStatus === "READY_FOR_PICKUP" &&
        job.diagnosticFeeAmount &&
        job.diagnosticFeeAmount > 0 &&
        !job.diagnosticFeePaid
      ) {
        const proceed = confirm(
          "Diagnostic fee is not marked as paid for this job. Please record the payment before generating the invoice. Do you want to continue anyway?"
        );
        if (!proceed) {
          return;
        }
      }

      const response = await fetch(`/api/jobs/${jobId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      toast({
        title: "Success",
        description: "Job status updated successfully",
      });

      // Refresh the job list
      const refreshedJobs = await fetchJobs();

      // If status changed to READY_FOR_PICKUP, redirect to invoice creation
      if (newStatus === "READY_FOR_PICKUP") {
        if (result?.invoice?.id) {
          router.push(`/invoices/${result.invoice.id}`);
        } else {
          const updatedJob = refreshedJobs.find((item) => item.id === jobId);
          if (updatedJob?.invoice?.id) {
            router.push(`/invoices/${updatedJob.invoice.id}`);
          } else {
            router.push(`/invoices/new?jobId=${jobId}`);
          }
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update job status",
        variant: "destructive",
      });
    }
  };

  const getStatusFieldClass = (status: string) => {
    const statusMap: Record<string, string> = {
      OPEN: "border-slate-300 bg-slate-50 text-slate-700",
      IN_PROGRESS: "border-blue-300 bg-blue-50 text-blue-700",
      AWAITING_CUSTOMER_APPROVAL: "border-amber-300 bg-amber-50 text-amber-700",
      AWAITING_PARTS: "border-violet-300 bg-violet-50 text-violet-700",
      READY_FOR_PICKUP: "border-emerald-300 bg-emerald-50 text-emerald-700",
      CLOSED: "border-slate-300 bg-slate-100 text-slate-700",
      CANCELLED: "border-rose-300 bg-rose-50 text-rose-700",
    };

    return statusMap[status] || "border-slate-300 bg-white text-slate-700";
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
    return status
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  // Filter jobs based on attention filter (client-side filtering)
  const filteredJobs = attentionFilter === "needs_attention"
    ? jobs.filter(job => needsAttention(job))
    : jobs;

  const attentionJobsCount = jobs.filter(job => needsAttention(job)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Jobs</h1>
          <p className="text-gray-600 mt-1">Manage repair jobs and track progress</p>
        </div>
        <Button onClick={() => router.push("/jobs/new")} className="h-11 w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          New Job
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Job List</CardTitle>
              <CardDescription>View and manage all repair jobs</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_150px_200px_auto] lg:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="h-11 pl-10 lg:h-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}>
              <SelectTrigger className="h-11 w-full lg:h-10">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="AWAITING_CUSTOMER_APPROVAL">Awaiting Customer Approval</SelectItem>
                <SelectItem value="AWAITING_PARTS">Awaiting Parts</SelectItem>
                <SelectItem value="READY_FOR_PICKUP">Ready for Pickup</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={(value) => {
              setPriorityFilter(value);
              setPage(1);
            }}>
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
            <Select value={attentionFilter} onValueChange={setAttentionFilter}>
              <SelectTrigger className="h-11 w-full lg:h-10">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jobs</SelectItem>
                <SelectItem value="needs_attention">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-yellow-600" />
                    <span>Needs Attention ({attentionJobsCount})</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {selectedJobs.size > 0 && (
              <Button variant="destructive" onClick={handleBulkDelete} className="h-11 w-full lg:h-10 lg:w-auto">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete ({selectedJobs.size})
              </Button>
            )}
          </div>

          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No jobs found</p>
              <Button onClick={() => router.push("/jobs/new")}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Job
              </Button>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No jobs match the current filters</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {filteredJobs.map((job) => (
                  <div
                    key={job.id}
                    className={`rounded-2xl border bg-white p-4 shadow-sm ${needsAttention(job) ? "border-yellow-200 bg-yellow-50" : "border-gray-200"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {needsAttention(job) && <Bell className="h-4 w-4 shrink-0 text-yellow-600" />}
                          <Link
                            href={`/jobs/${job.id}`}
                            className="font-semibold text-blue-700 hover:underline"
                          >
                            {job.jobNumber}
                          </Link>
                          <Badge variant={getPriorityBadgeVariant(job.priority)}>{job.priority}</Badge>
                        </div>
                        <p className="mt-1 truncate text-sm text-gray-700">
                          {job.customer.firstName} {job.customer.lastName} · {job.customer.phone}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">{job.applianceBrand} {job.applianceType}</p>
                      </div>
                      <Checkbox
                        checked={selectedJobs.has(job.id)}
                        onCheckedChange={(value) => toggleSelectJob(job.id, Boolean(value))}
                        aria-label={`Select job ${job.jobNumber}`}
                      />
                    </div>

                    <div className="mt-4 grid gap-3">
                      <Select
                        value={job.status}
                        onValueChange={(value) => handleStatusChange(job.id, value, job)}
                      >
                        <SelectTrigger
                          className={`h-11 w-full rounded-md border px-3 text-left text-sm font-medium shadow-none [&>span]:truncate ${getStatusFieldClass(job.status)}`}
                        >
                          <SelectValue>
                            <span className="block w-full truncate">{formatStatus(job.status)}</span>
                          </SelectValue>
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

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-lg bg-gray-50 p-3">
                          <p className="text-xs text-gray-500">Technician</p>
                          <p className="truncate font-medium">
                            {job.assignedTechnician ? `${job.assignedTechnician.firstName} ${job.assignedTechnician.lastName}` : "Unassigned"}
                          </p>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-3">
                          <p className="text-xs text-gray-500">Created</p>
                          <p className="font-medium">{new Date(job.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="default" className="h-11" onClick={() => router.push(`/jobs/${job.id}`)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Open
                        </Button>
                        <Button variant="outline" className="h-11" onClick={() => router.push(`/jobs/${job.id}/edit`)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button variant="outline" className="h-11" onClick={() => router.push(`/customers/${job.customer.id}`)}>
                          Customer
                        </Button>
                        {job.invoice ? (
                          <Button variant="outline" className="h-11" onClick={() => router.push(`/invoices/${job.invoice?.id}`)}>
                            Invoice
                          </Button>
                        ) : (
                          <Button variant="outline" className="h-11" onClick={() => router.push(`/invoices/new?jobId=${job.id}`)}>
                            Invoice
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={
                            filteredJobs.length > 0 &&
                            filteredJobs.every((job) => selectedJobs.has(job.id))
                          }
                          onCheckedChange={(value) => toggleSelectAll(Boolean(value))}
                          aria-label="Select all jobs"
                        />
                      </TableHead>
                      <TableHead>Job #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Appliance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Technician</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredJobs.map((job) => (
                      <TableRow
                        key={job.id}
                        className={needsAttention(job) ? "bg-yellow-50 hover:bg-yellow-100 cursor-pointer" : "cursor-pointer"}
                        onDoubleClick={() => router.push(`/jobs/${job.id}`)}
                      >
                      <TableCell onClick={(event) => event.stopPropagation()}>
                        <Checkbox
                          checked={selectedJobs.has(job.id)}
                          onCheckedChange={(value) => toggleSelectJob(job.id, Boolean(value))}
                          aria-label={`Select job ${job.jobNumber}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {needsAttention(job) && (
                            <Bell className="h-4 w-4 text-yellow-600" />
                          )}
                          <Link
                            href={`/jobs/${job.id}`}
                            onClick={(event) => event.stopPropagation()}
                            className="text-blue-700 hover:underline"
                          >
                            {job.jobNumber}
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {job.customer.firstName} {job.customer.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{job.customer.phone}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{job.applianceType}</div>
                          <div className="text-sm text-gray-500">{job.applianceBrand}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={job.status}
                          onValueChange={(value) => handleStatusChange(job.id, value, job)}
                        >
                          <SelectTrigger
                            className={`h-9 w-[190px] max-w-full rounded-md border px-3 text-left text-xs font-medium shadow-none [&>span]:truncate ${getStatusFieldClass(job.status)}`}
                          >
                            <SelectValue>
                              <span className="block w-full truncate">
                                {formatStatus(job.status)}
                              </span>
                            </SelectValue>
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
                        {job.status === "AWAITING_CUSTOMER_APPROVAL" && job.quotes?.[0] && (
                          <div className="mt-1 text-xs text-orange-600">
                            {job.quotes[0].reminderCount} reminder{job.quotes[0].reminderCount === 1 ? "" : "s"} sent
                            {job.quotes[0].lastReminderSent
                              ? ` • last ${new Date(job.quotes[0].lastReminderSent).toLocaleDateString()}`
                              : ""}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPriorityBadgeVariant(job.priority)}>
                          {job.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {job.assignedTechnician ? (
                          <div className="text-sm">
                            {job.assignedTechnician.firstName} {job.assignedTechnician.lastName}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3 text-gray-400" />
                          {new Date(job.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => router.push(`/jobs/${job.id}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/jobs/${job.id}/edit`)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => router.push(`/customers/${job.customer.id}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Customer
                            </DropdownMenuItem>
                            {job.invoice ? (
                              <DropdownMenuItem onClick={() => router.push(`/invoices/${job.invoice?.id}`)}>
                                <FileText className="h-4 w-4 mr-2" />
                                View Invoice
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => router.push(`/invoices/new?jobId=${job.id}`)}>
                                <FileText className="h-4 w-4 mr-2" />
                                Create Invoice
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-gray-500">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
