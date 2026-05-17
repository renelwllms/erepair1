"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, Calculator } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Job {
  id: string;
  jobNumber: string;
  customerId: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
  };
  applianceBrand: string;
  applianceType: string;
  status: string;
  laborHours: number;
  diagnosticFeeAmount: number;
  diagnosticFeePaid: boolean;
  diagnosticFeeAppliedToInvoice: boolean;
  invoice?: {
    id: string;
    invoiceNumber: string;
    status: string;
  } | null;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  itemType: "PART" | "LABOR" | "SERVICE_FEE" | "TAX" | "DISCOUNT";
}

export default function NewInvoicePage() {
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  // Job selection
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [loadingJobs, setLoadingJobs] = useState(true);

  // Invoice form
  const [dueDate, setDueDate] = useState("");
  const [taxRate, setTaxRate] = useState("15");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [paymentTerms, setPaymentTerms] = useState("Payment due upon collection of the device");
  const [notes, setNotes] = useState("");

  // Line items
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [newItem, setNewItem] = useState<InvoiceItem>({
    id: crypto.randomUUID(),
    description: "",
    quantity: 1,
    unitPrice: 0,
    itemType: "PART",
  });
  const [focusedAmountField, setFocusedAmountField] = useState<string | null>(null);
  const [amountDrafts, setAmountDrafts] = useState<Record<string, string>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const invoiceableStatuses = ["READY_FOR_PICKUP", "COMPLETED", "CLOSED"];
  const parseNumberInput = (value: string, fallback = 0) => {
    if (value.trim() === "") return fallback;
    const nextValue = Number(value);
    return Number.isFinite(nextValue) ? nextValue : fallback;
  };
  const sanitizeAmountInput = (value: string, allowNegative = false) => {
    const isNegative = allowNegative && value.trim().startsWith("-");
    const unsignedValue = value.replace(/-/g, "");
    const [rawInteger = "", ...decimalParts] = unsignedValue.replace(/[^\d.]/g, "").split(".");
    const integerPart = rawInteger.replace(/^0+(?=\d)/, "") || (rawInteger ? "0" : "");
    const decimalPart = decimalParts.length > 0 ? `.${decimalParts.join("").slice(0, 2)}` : "";
    return `${isNegative ? "-" : ""}${integerPart}${decimalPart}`;
  };
  const getAmountInputValue = (key: string, value: number) => {
    if (focusedAmountField === key && amountDrafts[key] !== undefined) {
      return amountDrafts[key];
    }
    return value === 0 ? "" : String(value);
  };
  const focusAmountInput = (key: string, value: number) => {
    setFocusedAmountField(key);
    setAmountDrafts((drafts) => ({
      ...drafts,
      [key]: value === 0 ? "" : String(value),
    }));
  };
  const blurAmountInput = (key: string) => {
    setFocusedAmountField(null);
    setAmountDrafts((drafts) => {
      const { [key]: _removed, ...nextDrafts } = drafts;
      return nextDrafts;
    });
  };

  useEffect(() => {
    fetchJobs();
    loadDefaultSettings();
  }, []);

  const fetchJobs = async () => {
    setLoadingJobs(true);
    try {
      // Fetch jobs that don't have invoices yet
      const response = await fetch("/api/jobs?limit=500");
      if (!response.ok) throw new Error("Failed to fetch jobs");

      const data = await response.json();

      // Check if there's a jobId in the URL params
      const jobIdParam = searchParams.get("jobId");

      // If jobId is provided, fetch that specific job and include it
      if (jobIdParam) {
        const jobResponse = await fetch(`/api/jobs/${jobIdParam}`);
        if (jobResponse.ok) {
          const specificJob = await jobResponse.json();
          const eligibleJobs = data.jobs.filter(
            (job: Job) => invoiceableStatuses.includes(job.status) && !job.invoice
          );

          // Add the specific job if it's not already in the list
          const jobExists = eligibleJobs.find((job: Job) => job.id === jobIdParam);
          const nextJobs = jobExists ? eligibleJobs : [specificJob, ...eligibleJobs];
          setJobs(nextJobs);

          // Auto-select the job from URL param using the fetched object directly
          setSelectedJobId(jobIdParam);
          setSelectedJob(specificJob);
        } else {
          // If can't fetch specific job, just show eligible jobs
          const eligibleJobs = data.jobs.filter(
            (job: Job) => invoiceableStatuses.includes(job.status) && !job.invoice
          );
          setJobs(eligibleJobs);
        }
      } else {
        // No jobId param, just show eligible jobs
        const eligibleJobs = data.jobs.filter(
          (job: Job) => invoiceableStatuses.includes(job.status) && !job.invoice
        );
        setJobs(eligibleJobs);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load jobs",
        variant: "destructive",
      });
    } finally {
      setLoadingJobs(false);
    }
  };

  const loadDefaultSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const settings = await response.json();
        setTaxRate(settings.taxRate?.toString() || "0");

        // Set default due date to 30 days from now
        const defaultDueDate = new Date();
        defaultDueDate.setDate(defaultDueDate.getDate() + 30);
        setDueDate(defaultDueDate.toISOString().split("T")[0]);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
      // Set default due date anyway
      const defaultDueDate = new Date();
      defaultDueDate.setDate(defaultDueDate.getDate() + 30);
      setDueDate(defaultDueDate.toISOString().split("T")[0]);
    }
  };

  const handleJobSelect = (jobId: string) => {
    setSelectedJobId(jobId);
    const job = jobs.find(j => j.id === jobId);
    setSelectedJob(job || null);

    const nextItems: InvoiceItem[] = [];

    // Auto-populate labor if job has labor hours
    if (job && job.laborHours > 0) {
      nextItems.push({
        id: crypto.randomUUID(),
        description: `Labor - ${job.applianceBrand} ${job.applianceType} Repair`,
        quantity: job.laborHours,
        unitPrice: 50, // This should come from settings
        itemType: "LABOR",
      });
    }

    if (
      job &&
      job.diagnosticFeeAmount > 0 &&
      job.diagnosticFeePaid &&
      !job.diagnosticFeeAppliedToInvoice
    ) {
      nextItems.push({
        id: crypto.randomUUID(),
        description: "Diagnostic Fee (credited)",
        quantity: 1,
        unitPrice: -Math.abs(job.diagnosticFeeAmount),
        itemType: "DISCOUNT",
      });
    }

    setItems(nextItems);
  };

  const addItem = () => {
    if (
      !newItem.description ||
      newItem.quantity <= 0 ||
      (newItem.itemType === "DISCOUNT" ? newItem.unitPrice > 0 : newItem.unitPrice < 0)
    ) {
      toast({
        title: "Invalid Item",
        description: "Please fill in all required fields with valid amounts",
        variant: "destructive",
      });
      return;
    }

    setItems([...items, { ...newItem }]);
    setNewItem({
      id: crypto.randomUUID(),
      description: "",
      quantity: 1,
      unitPrice: 0,
      itemType: "PART",
    });
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const calculateTax = () => {
    return (calculateSubtotal() * parseFloat(taxRate || "0")) / 100;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax() - parseFloat(discountAmount || "0");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const handleSubmit = async () => {
    if (!selectedJobId) {
      toast({
        title: "No Job Selected",
        description: "Please select a job to create an invoice for",
        variant: "destructive",
      });
      return;
    }

    if (!selectedJob) {
      toast({
        title: "Job Not Ready",
        description: "Please reselect the job and try again",
        variant: "destructive",
      });
      return;
    }

    if (selectedJob && selectedJob.diagnosticFeeAmount > 0 && !selectedJob.diagnosticFeePaid) {
      const proceed = confirm(
        "Diagnostic fee is not marked as paid for this job. Please record the payment before generating the invoice. Do you want to continue anyway?"
      );
      if (!proceed) {
        return;
      }
    }

    if (items.length === 0) {
      toast({
        title: "No Items",
        description: "Please add at least one line item",
        variant: "destructive",
      });
      return;
    }

    if (!dueDate) {
      toast({
        title: "No Due Date",
        description: "Please set a due date for the invoice",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: selectedJobId,
          dueDate: new Date(dueDate).toISOString(),
          items: items.map(({ id, ...item }) => item),
          taxRate: parseFloat(taxRate || "0"),
          discountAmount: parseFloat(discountAmount || "0"),
          notes: notes || undefined,
          paymentTerms: paymentTerms || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        const detailMessage = Array.isArray(error.details)
          ? error.details
              .map((detail: { path?: Array<string | number>; message?: string }) => {
                const path = Array.isArray(detail.path) && detail.path.length > 0
                  ? `${detail.path.join(".")}: `
                  : "";
                return `${path}${detail.message || "Invalid value"}`;
              })
              .join(" | ")
          : "";
        throw new Error(detailMessage || error.error || "Failed to create invoice");
      }

      const invoice = await response.json();

      toast({
        title: "Success",
        description: `Invoice ${invoice.invoiceNumber} created successfully`,
      });

      router.push(`/invoices/${invoice.id}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/invoices")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Invoice</h1>
          <p className="text-gray-600 mt-1">Generate an invoice from a ready, completed, or closed job</p>
        </div>
      </div>

      {/* Job Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Job</CardTitle>
          <CardDescription>Choose a job to create an invoice for</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="job">Job *</Label>
            {loadingJobs ? (
              <p className="text-sm text-gray-500">Loading jobs...</p>
            ) : (
              <Select value={selectedJobId} onValueChange={handleJobSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a job" />
                </SelectTrigger>
                <SelectContent>
                  {jobs.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                      No eligible jobs found. Jobs must be ready, completed, or closed and must not already have an invoice.
                    </div>
                  ) : (
                    jobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.jobNumber} - {job.customer.firstName} {job.customer.lastName} - {job.applianceBrand} {job.applianceType}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {selectedJob && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Job:</span>
                <Link href={`/jobs/${selectedJob.id}`} className="font-medium text-blue-700 hover:underline">
                  {selectedJob.jobNumber}
                </Link>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Customer:</span>
                <span className="font-medium">
                  {selectedJob.customer.firstName} {selectedJob.customer.lastName}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Email:</span>
                <span className="font-medium">{selectedJob.customer.email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Appliance:</span>
                <span className="font-medium">
                  {selectedJob.applianceBrand} {selectedJob.applianceType}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Status:</span>
                <Badge variant="outline">{selectedJob.status}</Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
          <CardDescription>Add items, labor, and fees</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing Items */}
          {items.length > 0 && (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="grid grid-cols-1 gap-3 rounded-md border p-4 md:grid-cols-12">
                  <div className="md:col-span-4">
                    <Label className="mb-1 block">Description</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(item.id, "description", e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="mb-1 block">Item Type</Label>
                    <Select
                      value={item.itemType}
                      onValueChange={(value) => updateItem(item.id, "itemType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PART">Part</SelectItem>
                        <SelectItem value="LABOR">Labor</SelectItem>
                        <SelectItem value="SERVICE_FEE">Service Fee</SelectItem>
                        <SelectItem value="DISCOUNT">Discount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="mb-1 block">Quantity</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, "quantity", parseNumberInput(e.target.value, 0))}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="mb-1 block">Unit Price</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      step="0.01"
                      min={item.itemType === "DISCOUNT" ? undefined : "0"}
                      placeholder="Price"
                      value={getAmountInputValue(`item-${item.id}`, item.unitPrice)}
                      onFocus={() => focusAmountInput(`item-${item.id}`, item.unitPrice)}
                      onBlur={() => blurAmountInput(`item-${item.id}`)}
                      onChange={(e) => {
                        const sanitizedValue = sanitizeAmountInput(e.target.value, item.itemType === "DISCOUNT");
                        setAmountDrafts((drafts) => ({ ...drafts, [`item-${item.id}`]: sanitizedValue }));
                        updateItem(item.id, "unitPrice", parseNumberInput(sanitizedValue, 0));
                      }}
                    />
                  </div>
                  <div className="md:col-span-1">
                    <Label className="mb-1 block">Total</Label>
                    <Input
                      value={(item.quantity * item.unitPrice).toFixed(2)}
                      readOnly
                      className="font-medium"
                    />
                  </div>
                  <div className="md:col-span-1 flex items-end justify-end md:justify-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add New Item */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">Add New Item</h4>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <div className="md:col-span-4">
                <Label className="mb-1 block">Description</Label>
                <Input
                  placeholder="Description"
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <Label className="mb-1 block">Item Type</Label>
                <Select
                  value={newItem.itemType}
                  onValueChange={(value: any) => setNewItem({ ...newItem, itemType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PART">Part</SelectItem>
                    <SelectItem value="LABOR">Labor</SelectItem>
                    <SelectItem value="SERVICE_FEE">Service Fee</SelectItem>
                    <SelectItem value="DISCOUNT">Discount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label className="mb-1 block">Quantity</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="Qty"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: parseNumberInput(e.target.value, 0) })}
                />
              </div>
              <div className="md:col-span-2">
                <Label className="mb-1 block">Unit Price</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  step="0.01"
                  min={newItem.itemType === "DISCOUNT" ? undefined : "0"}
                  placeholder="Price"
                  value={getAmountInputValue("new-item", newItem.unitPrice)}
                  onFocus={() => focusAmountInput("new-item", newItem.unitPrice)}
                  onBlur={() => blurAmountInput("new-item")}
                  onChange={(e) => {
                    const sanitizedValue = sanitizeAmountInput(e.target.value, newItem.itemType === "DISCOUNT");
                    setAmountDrafts((drafts) => ({ ...drafts, "new-item": sanitizedValue }));
                    setNewItem({ ...newItem, unitPrice: parseNumberInput(sanitizedValue, 0) });
                  }}
                />
              </div>
              <div className="md:col-span-2 flex items-end">
                <Button onClick={addItem} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-80 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">{formatCurrency(calculateSubtotal())}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">GST Rate (%):</span>
                <div>
                  <Label className="mb-1 block text-xs">GST Rate %</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="w-24 h-8 text-right"
                  />
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">GST Amount:</span>
                <span className="font-medium">{formatCurrency(calculateTax())}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Discount:</span>
                <div>
                  <Label className="mb-1 block text-xs">Discount Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    className="w-24 h-8 text-right"
                  />
                </div>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>{formatCurrency(calculateTotal())}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Details */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date *</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="paymentTerms">Payment Terms</Label>
            <Input
              id="paymentTerms"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              placeholder="e.g., Payment due upon collection of the device"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes or terms..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => router.push("/invoices")}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting || !selectedJobId || items.length === 0}>
          {isSubmitting ? "Creating..." : "Create Invoice"}
        </Button>
      </div>
    </div>
  );
}
