"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Plus, Trash2, Save, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { normalizePaymentTerms } from "@/lib/payment-terms";

interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  itemType: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  notes: string | null;
  paymentTerms: string | null;
  invoiceItems: InvoiceItem[];
  job: {
    id: string;
    jobNumber: string;
  };
  customer: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export default function EditInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [taxRate, setTaxRate] = useState(15);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [notes, setNotes] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [focusedAmountField, setFocusedAmountField] = useState<string | null>(null);
  const [amountDrafts, setAmountDrafts] = useState<Record<string, string>>({});
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
    fetchInvoice();
  }, []);

  const fetchInvoice = async () => {
    try {
      const response = await fetch(`/api/invoices/${params.id}`);
      if (!response.ok) throw new Error("Failed to fetch invoice");

      const data = await response.json();

      if (data.status !== "DRAFT") {
        toast({
          title: "Cannot edit",
          description: "Only draft invoices can be edited",
          variant: "destructive",
        });
        router.push(`/invoices/${params.id}`);
        return;
      }

      setInvoice(data);
      setItems(data.invoiceItems || [{ description: "", quantity: 1, unitPrice: 0, totalPrice: 0, itemType: "SERVICE_FEE" }]);
      setTaxRate(data.taxRate);
      setDiscountAmount(data.discountAmount);
      setNotes(data.notes || "");
      setPaymentTerms(
        normalizePaymentTerms(data.paymentTerms) ||
          "Payment due upon collection of the device"
      );
      setDueDate(data.dueDate ? new Date(data.dueDate).toISOString().split("T")[0] : "");
    } catch (error) {
      console.error("Error fetching invoice:", error);
      toast({
        title: "Error",
        description: "Failed to load invoice",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    if (field === "quantity" || field === "unitPrice") {
      updatedItems[index].totalPrice =
        Number(updatedItems[index].quantity) * Number(updatedItems[index].unitPrice);
    }

    setItems(updatedItems);
  };

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unitPrice: 0, totalPrice: 0, itemType: "SERVICE_FEE" }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxAmount = (subtotal * taxRate) / 100;
    const total = subtotal + taxAmount - discountAmount;
    const balanceAmount = total;
    return { subtotal, taxAmount, total, balanceAmount };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      items.some(
        (item) =>
          !item.description ||
          item.quantity <= 0 ||
          (item.itemType === "DISCOUNT" ? item.unitPrice > 0 : item.unitPrice < 0)
      )
    ) {
      toast({
        title: "Invalid items",
        description: "All items must have a description and valid amounts",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { subtotal, taxAmount, total, balanceAmount } = calculateTotals();

      const response = await fetch(`/api/invoices/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          subtotal,
          taxRate,
          taxAmount,
          discountAmount,
          totalAmount: total,
          balanceAmount,
          notes,
          paymentTerms,
          dueDate,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update invoice");
      }

      toast({
        title: "Success",
        description: "Invoice updated successfully",
      });

      router.push(`/invoices/${params.id}`);
    } catch (error: any) {
      console.error("Error updating invoice:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update invoice",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-6">
        <p>Invoice not found</p>
      </div>
    );
  }

  const { subtotal, taxAmount, total, balanceAmount } = calculateTotals();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Invoice</h1>
        <p className="text-gray-600">
          {invoice.invoiceNumber} - {invoice.customer.firstName} {invoice.customer.lastName} (Job:{" "}
          <Link href={`/jobs/${invoice.job.id}`} className="text-blue-700 hover:underline">
            {invoice.job.jobNumber}
          </Link>
          )
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Invoice Items */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Invoice Items</h2>
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
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-1 gap-3 rounded-md border p-4 md:grid-cols-12">
                <div className="md:col-span-4">
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
                    Item Type
                  </label>
                  <select
                    value={item.itemType}
                    onChange={(e) => handleItemChange(index, "itemType", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PART">Part</option>
                    <option value="LABOR">Labor</option>
                    <option value="SERVICE_FEE">Service Fee</option>
                    <option value="DISCOUNT">Discount</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, "quantity", parseNumberInput(e.target.value, 0))}
                    placeholder="Qty"
                    min="0.01"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Price
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={getAmountInputValue(`item-${index}`, item.unitPrice)}
                    onFocus={() => focusAmountInput(`item-${index}`, item.unitPrice)}
                    onBlur={() => blurAmountInput(`item-${index}`)}
                    onChange={(e) => {
                      const sanitizedValue = sanitizeAmountInput(e.target.value, item.itemType === "DISCOUNT");
                      setAmountDrafts((drafts) => ({ ...drafts, [`item-${index}`]: sanitizedValue }));
                      handleItemChange(index, "unitPrice", parseNumberInput(sanitizedValue, 0));
                    }}
                    placeholder="Price"
                    min={item.itemType === "DISCOUNT" ? undefined : "0"}
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total
                  </label>
                  <input
                    type="number"
                    value={item.totalPrice.toFixed(2)}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-right"
                  />
                </div>
                <div className="md:col-span-1 flex items-end justify-end md:justify-center">
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
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
              <div className="w-80 space-y-3">
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
                        onChange={(e) => setTaxRate(parseNumberInput(e.target.value, 0))}
                        min="0"
                        max="100"
                        step="0.01"
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-right"
                      />
                    </div>
                    <span>%</span>
                    <span className="font-medium w-20 text-right">${taxAmount.toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex justify-between text-sm items-center gap-2">
                  <span className="text-gray-600">Discount:</span>
                  <div className="flex items-center gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Discount Amount
                      </label>
                      <input
                        type="number"
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(parseNumberInput(e.target.value, 0))}
                        min="0"
                        step="0.01"
                        className="w-32 px-2 py-1 border border-gray-300 rounded text-right"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-3">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-orange-600">
                  <span>Balance Due:</span>
                  <span className="font-semibold">${balanceAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
              <input
                type="text"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Payment due upon collection of the device"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Additional notes..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push(`/invoices/${params.id}`)}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
