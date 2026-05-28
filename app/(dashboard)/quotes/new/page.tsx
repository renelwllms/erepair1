"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Plus, Trash2, FileText, Send } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Job {
  id: string;
  jobNumber: string;
  applianceType: string;
  applianceBrand: string;
  modelNumber: string | null;
  issueDescription: string;
  diagnosticResults: string | null;
  status: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
}

interface QuoteItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export default function NewQuotePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([
    { description: "", quantity: 1, unitPrice: 0, totalPrice: 0 },
  ]);
  const [taxRate, setTaxRate] = useState(15); // Default 15% GST
  const [notes, setNotes] = useState("");
  const [validDays, setValidDays] = useState(30);

  useEffect(() => {
    loadDefaultSettings();
  }, []);

  const loadDefaultSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const settings = await response.json();
        if (settings.defaultTaxRate) {
          setTaxRate(settings.defaultTaxRate);
        }
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const searchJobs = async () => {
    if (!searchTerm.trim()) {
      toast({
        title: "Search required",
        description: "Please enter a job number or customer name to search",
        variant: "destructive",
      });
      return;
    }

    setLoadingJobs(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`);
      if (!response.ok) throw new Error("Failed to search jobs");

      const data = await response.json();
      setJobs(data.jobs || []);

      if (data.jobs && data.jobs.length === 0) {
        toast({
          title: "No results",
          description: "No jobs found matching your search",
        });
      }
    } catch (error) {
      console.error("Error searching jobs:", error);
      toast({
        title: "Error",
        description: "Failed to search jobs",
        variant: "destructive",
      });
    } finally {
      setLoadingJobs(false);
    }
  };

  const handleJobSelect = (job: Job) => {
    setSelectedJob(job);
    setJobs([]);
    setSearchTerm("");
  };

  const handleItemChange = (index: number, field: keyof QuoteItem, value: string | number) => {
    const updatedItems = [...quoteItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    if (field === "quantity" || field === "unitPrice") {
      updatedItems[index].totalPrice =
        Number(updatedItems[index].quantity) * Number(updatedItems[index].unitPrice);
    }

    setQuoteItems(updatedItems);
  };

  const addItem = () => {
    setQuoteItems([...quoteItems, { description: "", quantity: 1, unitPrice: 0, totalPrice: 0 }]);
  };

  const removeItem = (index: number) => {
    if (quoteItems.length > 1) {
      setQuoteItems(quoteItems.filter((_, i) => i !== index));
    }
  };

  const calculateTotals = () => {
    const subtotal = quoteItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxAmount = (subtotal * taxRate) / 100;
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedJob) {
      toast({
        title: "Job required",
        description: "Please select a job for this quote",
        variant: "destructive",
      });
      return;
    }

    if (quoteItems.some((item) => !item.description || item.quantity <= 0)) {
      toast({
        title: "Invalid items",
        description: "All items must have a description and valid quantity",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { subtotal, taxAmount, total } = calculateTotals();

      const response = await fetch(`/api/jobs/${selectedJob.id}/send-quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteItems,
          subtotal,
          taxRate,
          taxAmount,
          totalAmount: total,
          notes,
          validDays,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create quote");
      }

      toast({
        title: "Success",
        description: "Quote created and sent successfully",
      });

      router.push("/quotes");
    } catch (error: any) {
      console.error("Error creating quote:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create quote",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, taxAmount, total } = calculateTotals();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create Quote</h1>
        <p className="text-gray-600">Create a new quote for a job</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Job Selection */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Job</h2>

          {!selectedJob ? (
            <>
              <div className="flex gap-2 mb-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Search Job
                  </label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), searchJobs())}
                    placeholder="Search by job number, customer name, or email..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={searchJobs}
                  disabled={loadingJobs}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
                >
                  <Search className="h-4 w-4" />
                  Search
                </button>
              </div>

              {jobs.length > 0 && (
                <div className="border rounded-md divide-y max-h-96 overflow-y-auto">
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      onClick={() => handleJobSelect(job)}
                      className="p-4 hover:bg-gray-50 cursor-pointer"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">{job.jobNumber}</p>
                          <p className="text-sm text-gray-600">
                            {job.applianceBrand} {job.applianceType}
                          </p>
                          <p className="text-sm text-gray-600">
                            {job.customer.firstName} {job.customer.lastName} - {job.customer.email}
                          </p>
                        </div>
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          {job.status.replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="border rounded-md p-4 bg-gray-50">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-gray-900">
                    Job:{" "}
                    <Link href={`/jobs/${selectedJob.id}`} className="text-blue-700 hover:underline">
                      {selectedJob.jobNumber}
                    </Link>
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedJob.applianceBrand} {selectedJob.applianceType}
                    {selectedJob.modelNumber && ` (${selectedJob.modelNumber})`}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    Customer: {selectedJob.customer.firstName} {selectedJob.customer.lastName}
                  </p>
                  <p className="text-sm text-gray-600">{selectedJob.customer.email}</p>
                  <p className="text-sm text-gray-600">{selectedJob.customer.phone}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedJob(null)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Change
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quote Items */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Quote Items</h2>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
            >
              <Plus className="h-4 w-4" />
              Add Item
            </button>
          </div>

          <div className="space-y-4">
            {quoteItems.map((item, index) => (
              <div key={index} className="grid grid-cols-1 gap-3 rounded-md border p-4 md:grid-cols-12">
                <div className="md:col-span-5">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleItemChange(index, "description", e.target.value)}
                    placeholder="Description"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, "quantity", Number(e.target.value))}
                    placeholder="Qty"
                    min="1"
                    step="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Price
                  </label>
                  <input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(index, "unitPrice", Number(e.target.value))}
                    placeholder="Unit Price"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Price
                  </label>
                  <input
                    type="number"
                    value={item.totalPrice.toFixed(2)}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>
                <div className="md:col-span-1 flex items-end justify-end md:justify-center">
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={quoteItems.length === 1}
                    className="text-red-600 hover:text-red-800 disabled:text-gray-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-6 pt-6 border-t">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm items-center gap-2">
                  <span className="text-gray-600">Tax:</span>
                  <div className="flex items-center gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Tax Rate %
                      </label>
                      <input
                        type="number"
                        value={taxRate}
                        onChange={(e) => setTaxRate(Number(e.target.value))}
                        min="0"
                        max="100"
                        step="0.01"
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-right"
                      />
                    </div>
                    <span>%</span>
                    <span className="font-medium">${taxAmount.toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Details</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valid for (days)
              </label>
              <input
                type="number"
                value={validDays}
                onChange={(e) => setValidDays(Number(e.target.value))}
                min="1"
                className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Additional notes or terms..."
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !selectedJob}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Creating...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Create & Send Quote
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
