"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useToast } from "@/components/ui/use-toast";
import { AlertTriangle, Edit, Package, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";

type Part = {
  id: string;
  partNumber: string;
  sku?: string | null;
  partName: string;
  description?: string | null;
  supplier?: string | null;
  location?: string | null;
  costPrice: number;
  sellingPrice: number;
  quantityInStock: number;
  reorderLevel: number;
  reorderQuantity: number;
  _count?: {
    jobParts: number;
    invoiceItems: number;
  };
};

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

type PartForm = {
  partNumber: string;
  sku: string;
  partName: string;
  description: string;
  supplier: string;
  location: string;
  costPrice: string;
  sellingPrice: string;
  quantityInStock: string;
  reorderLevel: string;
  reorderQuantity: string;
};

type SaleLine = {
  partId: string;
  quantity: string;
};

const emptyForm: PartForm = {
  partNumber: "",
  sku: "",
  partName: "",
  description: "",
  supplier: "",
  location: "",
  costPrice: "0",
  sellingPrice: "0",
  quantityInStock: "0",
  reorderLevel: "5",
  reorderQuantity: "10",
};

const currency = new Intl.NumberFormat("en-NZ", {
  style: "currency",
  currency: "NZD",
});

function numberValue(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function integerValue(value: string, fallback = 0) {
  return Math.max(0, Math.trunc(numberValue(value, fallback)));
}

export default function PartsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [parts, setParts] = useState<Part[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [isPartDialogOpen, setIsPartDialogOpen] = useState(false);
  const [isSaleDialogOpen, setIsSaleDialogOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [form, setForm] = useState<PartForm>(emptyForm);
  const [savingPart, setSavingPart] = useState(false);
  const [saleCustomerId, setSaleCustomerId] = useState("");
  const [saleLines, setSaleLines] = useState<SaleLine[]>([]);
  const [saleDueDate, setSaleDueDate] = useState("");
  const [saleNotes, setSaleNotes] = useState("");
  const [taxRate, setTaxRate] = useState("15");
  const [creatingSale, setCreatingSale] = useState(false);

  useEffect(() => {
    fetchParts();
    fetchCustomers();
    loadSettings();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(fetchParts, 250);
    return () => clearTimeout(timeout);
  }, [search, stockFilter]);

  const partById = useMemo(
    () => new Map(parts.map((part) => [part.id, part])),
    [parts]
  );

  const lowStockCount = parts.filter((part) => part.quantityInStock <= part.reorderLevel).length;
  const outOfStockCount = parts.filter((part) => part.quantityInStock === 0).length;
  const stockValue = parts.reduce((sum, part) => sum + part.quantityInStock * part.costPrice, 0);
  const saleSubtotal = saleLines.reduce((sum, line) => {
    const part = partById.get(line.partId);
    return sum + (part ? integerValue(line.quantity, 1) * part.sellingPrice : 0);
  }, 0);
  const saleTax = (saleSubtotal * numberValue(taxRate, 0)) / 100;
  const saleTotal = saleSubtotal + saleTax;

  async function fetchParts() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (stockFilter !== "all") params.set("stock", stockFilter);
      const response = await fetch(`/api/parts?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load parts");
      setParts(data.parts || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load parts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function fetchCustomers() {
    try {
      const response = await fetch("/api/customers?limit=500");
      const data = await response.json();
      if (response.ok) {
        setCustomers(data.customers || []);
      }
    } catch (error) {
      console.error("Failed to load customers", error);
    }
  }

  async function loadSettings() {
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const settings = await response.json();
        setTaxRate(String(settings.taxRate ?? 15));
      }
    } catch (error) {
      console.error("Failed to load settings", error);
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
    setSaleDueDate(dueDate.toISOString().split("T")[0]);
  }

  function openNewPartDialog() {
    setEditingPart(null);
    setForm(emptyForm);
    setIsPartDialogOpen(true);
  }

  function openEditPartDialog(part: Part) {
    setEditingPart(part);
    setForm({
      partNumber: part.partNumber,
      sku: part.sku || "",
      partName: part.partName,
      description: part.description || "",
      supplier: part.supplier || "",
      location: part.location || "",
      costPrice: String(part.costPrice),
      sellingPrice: String(part.sellingPrice),
      quantityInStock: String(part.quantityInStock),
      reorderLevel: String(part.reorderLevel),
      reorderQuantity: String(part.reorderQuantity),
    });
    setIsPartDialogOpen(true);
  }

  function updateForm(field: keyof PartForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function savePart() {
    if (!form.partNumber.trim() || !form.partName.trim()) {
      toast({
        title: "Missing details",
        description: "Part number and part name are required",
        variant: "destructive",
      });
      return;
    }

    setSavingPart(true);
    try {
      const payload = {
        partNumber: form.partNumber.trim(),
        sku: form.sku.trim() || null,
        partName: form.partName.trim(),
        description: form.description.trim() || null,
        supplier: form.supplier.trim() || null,
        location: form.location.trim() || null,
        costPrice: numberValue(form.costPrice),
        sellingPrice: numberValue(form.sellingPrice),
        quantityInStock: integerValue(form.quantityInStock),
        reorderLevel: integerValue(form.reorderLevel),
        reorderQuantity: integerValue(form.reorderQuantity),
      };

      const response = await fetch(editingPart ? `/api/parts/${editingPart.id}` : "/api/parts", {
        method: editingPart ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save part");

      toast({
        title: "Saved",
        description: editingPart ? "Part updated" : "Part created",
      });
      setIsPartDialogOpen(false);
      fetchParts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save part",
        variant: "destructive",
      });
    } finally {
      setSavingPart(false);
    }
  }

  async function deletePart(part: Part) {
    if (!window.confirm(`Delete ${part.partName}?`)) return;

    try {
      const response = await fetch(`/api/parts/${part.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to delete part");
      toast({ title: "Deleted", description: "Part deleted" });
      fetchParts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete part",
        variant: "destructive",
      });
    }
  }

  function openSaleDialog(part?: Part) {
    setSaleCustomerId("");
    setSaleNotes("");
    setSaleLines(part ? [{ partId: part.id, quantity: "1" }] : [{ partId: "", quantity: "1" }]);
    setIsSaleDialogOpen(true);
  }

  function updateSaleLine(index: number, field: keyof SaleLine, value: string) {
    setSaleLines((current) =>
      current.map((line, lineIndex) => lineIndex === index ? { ...line, [field]: value } : line)
    );
  }

  function removeSaleLine(index: number) {
    setSaleLines((current) => current.filter((_, lineIndex) => lineIndex !== index));
  }

  async function createPartsSaleInvoice() {
    if (!saleCustomerId) {
      toast({
        title: "Customer required",
        description: "Select a customer before creating the invoice",
        variant: "destructive",
      });
      return;
    }

    const validLines = saleLines
      .map((line) => ({ ...line, quantityNumber: integerValue(line.quantity, 0), part: partById.get(line.partId) }))
      .filter((line) => line.part && line.quantityNumber > 0);

    if (validLines.length === 0) {
      toast({
        title: "No parts selected",
        description: "Add at least one part with a valid quantity",
        variant: "destructive",
      });
      return;
    }

    const overStockLine = validLines.find((line) => line.part && line.quantityNumber > line.part.quantityInStock);
    if (overStockLine?.part) {
      toast({
        title: "Insufficient stock",
        description: `${overStockLine.part.partName} only has ${overStockLine.part.quantityInStock} in stock`,
        variant: "destructive",
      });
      return;
    }

    setCreatingSale(true);
    try {
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: saleCustomerId,
          dueDate: new Date(saleDueDate).toISOString(),
          taxRate: numberValue(taxRate, 0),
          notes: saleNotes || undefined,
          paymentTerms: "Payment due upon collection of the parts",
          items: validLines.map((line) => ({
            partId: line.part!.id,
            description: `${line.part!.partName} (${line.part!.partNumber})`,
            quantity: line.quantityNumber,
            unitPrice: line.part!.sellingPrice,
            itemType: "PART",
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create invoice");

      toast({
        title: "Invoice created",
        description: `${data.invoiceNumber} created for parts sale`,
      });
      setIsSaleDialogOpen(false);
      router.push(`/invoices/${data.id}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive",
      });
    } finally {
      setCreatingSale(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => openSaleDialog()}>
            <ShoppingCart className="h-4 w-4 mr-2" />
            Sell Parts
          </Button>
          <Button onClick={openNewPartDialog}>
            <Plus className="h-4 w-4 mr-2" />
            New Part
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Parts</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{parts.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-orange-600">{lowStockCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-red-600">{outOfStockCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Stock Cost Value</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{currency.format(stockValue)}</CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search part number, SKU, name, supplier, or location"
            className="pl-9"
          />
        </div>
        <Select value={stockFilter} onValueChange={setStockFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stock</SelectItem>
            <SelectItem value="low">Low stock</SelectItem>
            <SelectItem value="out">Out of stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Part</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Sell</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-gray-500">
                  Loading parts...
                </TableCell>
              </TableRow>
            ) : parts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-gray-500">
                  No parts found.
                </TableCell>
              </TableRow>
            ) : (
              parts.map((part) => {
                const lowStock = part.quantityInStock <= part.reorderLevel;
                const canDelete = !part._count || (part._count.jobParts === 0 && part._count.invoiceItems === 0);
                return (
                  <TableRow key={part.id}>
                    <TableCell>
                      <div className="font-medium">{part.partName}</div>
                      <div className="text-sm text-gray-500">{part.partNumber}</div>
                    </TableCell>
                    <TableCell>{part.sku || "-"}</TableCell>
                    <TableCell>{part.supplier || "-"}</TableCell>
                    <TableCell>{part.location || "-"}</TableCell>
                    <TableCell className="text-right">{currency.format(part.costPrice)}</TableCell>
                    <TableCell className="text-right">{currency.format(part.sellingPrice)}</TableCell>
                    <TableCell className="text-right">{part.quantityInStock}</TableCell>
                    <TableCell>
                      {part.quantityInStock === 0 ? (
                        <Badge variant="destructive">Out</Badge>
                      ) : lowStock ? (
                        <Badge variant="outline" className="border-orange-300 text-orange-700">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          Low
                        </Badge>
                      ) : (
                        <Badge variant="secondary">In stock</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openSaleDialog(part)}
                          disabled={part.quantityInStock === 0}
                          title="Sell part"
                        >
                          <ShoppingCart className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditPartDialog(part)} title="Edit part">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deletePart(part)}
                          disabled={!canDelete}
                          title={canDelete ? "Delete part" : "Part has history"}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isPartDialogOpen} onOpenChange={setIsPartDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingPart ? "Edit Part" : "New Part"}</DialogTitle>
            <DialogDescription>Staff-managed internal inventory details.</DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[70vh] grid-cols-1 gap-4 overflow-y-auto pr-1 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Part Number *</Label>
              <Input value={form.partNumber} onChange={(event) => updateForm("partNumber", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>SKU / Barcode</Label>
              <Input value={form.sku} onChange={(event) => updateForm("sku", event.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Part Name *</Label>
              <Input value={form.partName} onChange={(event) => updateForm("partName", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Input value={form.supplier} onChange={(event) => updateForm("supplier", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Shelf / Bin Location</Label>
              <Input value={form.location} onChange={(event) => updateForm("location", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Cost Price</Label>
              <Input type="number" min="0" step="0.01" value={form.costPrice} onChange={(event) => updateForm("costPrice", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Selling Price</Label>
              <Input type="number" min="0" step="0.01" value={form.sellingPrice} onChange={(event) => updateForm("sellingPrice", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Quantity In Stock</Label>
              <Input type="number" min="0" step="1" value={form.quantityInStock} onChange={(event) => updateForm("quantityInStock", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Reorder Level</Label>
              <Input type="number" min="0" step="1" value={form.reorderLevel} onChange={(event) => updateForm("reorderLevel", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Reorder Quantity</Label>
              <Input type="number" min="0" step="1" value={form.reorderQuantity} onChange={(event) => updateForm("reorderQuantity", event.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Description</Label>
              <Textarea rows={3} value={form.description} onChange={(event) => updateForm("description", event.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPartDialogOpen(false)} disabled={savingPart}>
              Cancel
            </Button>
            <Button onClick={savePart} disabled={savingPart}>
              {savingPart ? "Saving..." : "Save Part"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSaleDialogOpen} onOpenChange={setIsSaleDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Sell Parts</DialogTitle>
            <DialogDescription>Create a customer invoice and reduce stock immediately.</DialogDescription>
          </DialogHeader>

          <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2 md:col-span-2">
                <Label>Customer *</Label>
                <Select value={saleCustomerId} onValueChange={setSaleCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.firstName} {customer.lastName} - {customer.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input type="date" value={saleDueDate} onChange={(event) => setSaleDueDate(event.target.value)} />
              </div>
            </div>

            <div className="space-y-3">
              {saleLines.map((line, index) => {
                const part = partById.get(line.partId);
                return (
                  <div key={index} className="grid grid-cols-1 gap-3 rounded-md border p-3 md:grid-cols-12">
                    <div className="md:col-span-7">
                      <Label className="mb-1 block">Part</Label>
                      <Select value={line.partId} onValueChange={(value) => updateSaleLine(index, "partId", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select part" />
                        </SelectTrigger>
                        <SelectContent>
                          {parts.map((partOption) => (
                            <SelectItem key={partOption.id} value={partOption.id} disabled={partOption.quantityInStock === 0}>
                              {partOption.partName} ({partOption.partNumber}) - {partOption.quantityInStock} in stock
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2">
                      <Label className="mb-1 block">Qty</Label>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={line.quantity}
                        onChange={(event) => updateSaleLine(index, "quantity", event.target.value)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="mb-1 block">Line Total</Label>
                      <Input value={currency.format(part ? integerValue(line.quantity, 1) * part.sellingPrice : 0)} readOnly />
                    </div>
                    <div className="flex items-end justify-end md:col-span-1">
                      <Button variant="ghost" size="icon" onClick={() => removeSaleLine(index)} disabled={saleLines.length === 1}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              <Button variant="outline" onClick={() => setSaleLines((current) => [...current, { partId: "", quantity: "1" }])}>
                <Plus className="mr-2 h-4 w-4" />
                Add Part
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea rows={3} value={saleNotes} onChange={(event) => setSaleNotes(event.target.value)} />
              </div>
              <div className="space-y-3 rounded-md border p-4">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span className="font-medium">{currency.format(saleSubtotal)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <Label className="whitespace-nowrap">GST %</Label>
                  <Input className="w-24 text-right" type="number" min="0" max="100" step="0.01" value={taxRate} onChange={(event) => setTaxRate(event.target.value)} />
                </div>
                <div className="flex justify-between text-sm">
                  <span>GST</span>
                  <span className="font-medium">{currency.format(saleTax)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{currency.format(saleTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaleDialogOpen(false)} disabled={creatingSale}>
              Cancel
            </Button>
            <Button onClick={createPartsSaleInvoice} disabled={creatingSale}>
              <Package className="mr-2 h-4 w-4" />
              {creatingSale ? "Creating..." : "Create Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
