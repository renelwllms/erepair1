"use client";

import { useState, useEffect } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  const [paymentTerms, setPaymentTerms] = useState("Payment due within 30 days");
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

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchJobs();
    loadDefaultSettings();
  }, []);

  const fetchJobs = async () => {
    setLoadingJobs(true);
    try {
      // Fetch jobs that don't have invoices yet and are closed or ready for pickup
      const response = await fetch("/api/jobs?limit=100");
      if (!response.ok) throw new Error("Failed to fetch jobs");

      const data = await response.json();
      // Filter jobs that are closed or ready for pickup
      const eligibleJobs = data.jobs.filter(
        (job: Job) =>
          job.status === "CLOSED" ||
          job.status === "READY_FOR_PICKUP"
      );
      setJobs(eligibleJobs);

      // Check if there's a jobId in the URL params and auto-select it
      const jobIdParam = searchParams.get("jobId");
      if (jobIdParam) {
        const matchingJob = eligibleJobs.find((job: Job) => job.id === jobIdParam);
        if (matchingJob) {
          handleJobSelect(jobIdParam);
        }
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

    // Auto-populate labor if job has labor hours
    if (job && job.laborHours > 0) {
      const laborItem: InvoiceItem = {
        id: crypto.randomUUID(),
        description: `Labor - ${job.applianceBrand} ${job.applianceType} Repair`,
        quantity: job.laborHours,
        unitPrice: 50, // This should come from settings
        itemType: "LABOR",
      };
      setItems([laborItem]);
    } else {
      setItems([]);
    }
  };

  const addItem = () => {
    if (!newItem.description || newItem.unitPrice < 0) {
      toast({
        title: "Invalid Item",
        description: "Please fill in all required fields",
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
          customerId: selectedJob!.customerId,
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
        throw new Error(error.error || "Failed to create invoice");
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
          <p className="text-gray-600 mt-1">Generate an invoice from a completed job</p>
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
                      No eligible jobs found. Jobs must be CLOSED or READY_FOR_PICKUP.
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
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="w-24">Qty</TableHead>
                    <TableHead className="w-32">Unit Price</TableHead>
                    <TableHead className="w-32">Total</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(item.id, "description", e.target.value)}
                          className="min-w-[200px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.itemType}
                          onValueChange={(value) => updateItem(item.id, "itemType", value)}
                        >
                          <SelectTrigger className="w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PART">Part</SelectItem>
                            <SelectItem value="LABOR">Labor</SelectItem>
                            <SelectItem value="SERVICE_FEE">Service Fee</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, "quantity", parseFloat(e.target.value))}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(item.id, "unitPrice", parseFloat(e.target.value))}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Add New Item */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">Add New Item</h4>
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-4">
                <Input
                  placeholder="Description"
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                />
              </div>
              <div className="col-span-2">
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
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="Qty"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 1 })}
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Price"
                  value={newItem.unitPrice}
                  onChange={(e) => setNewItem({ ...newItem, unitPrice: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="col-span-2">
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
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">GST Amount:</span>
                <span className="font-medium">{formatCurrency(calculateTax())}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Discount:</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  className="w-24 h-8 text-right"
                />
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
              placeholder="e.g., Payment due within 30 days"
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
