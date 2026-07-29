"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Edit, ImagePlus, Package, Plus, Search, ShoppingCart, Trash2, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COMMON_APPLIANCES, COMMON_BRANDS } from "@/lib/device-options";

type ShopProductStatus = "DRAFT" | "PUBLISHED" | "RESERVED" | "SOLD" | "ARCHIVED";

type ShopProduct = {
  id: string;
  title: string;
  slug: string;
  brand?: string | null;
  deviceType?: string | null;
  modelNumber?: string | null;
  capacityKg?: number | null;
  condition?: string | null;
  price: number;
  description: string;
  warrantyNotes?: string | null;
  status: ShopProductStatus;
  featured: boolean;
  images: string[];
  internalNotes?: string | null;
  updatedAt: string;
};

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

type ProductForm = {
  title: string;
  slug: string;
  brand: string;
  deviceType: string;
  modelNumber: string;
  capacityKg: string;
  condition: string;
  price: string;
  description: string;
  warrantyNotes: string;
  status: ShopProductStatus;
  featured: boolean;
  images: string[];
  internalNotes: string;
};

const emptyForm: ProductForm = {
  title: "",
  slug: "",
  brand: "",
  deviceType: "",
  modelNumber: "",
  capacityKg: "",
  condition: "",
  price: "",
  description: "",
  warrantyNotes: "",
  status: "DRAFT",
  featured: false,
  images: [],
  internalNotes: "",
};

const statusOptions: ShopProductStatus[] = ["DRAFT", "PUBLISHED", "RESERVED", "SOLD", "ARCHIVED"];

const statusLabels: Record<ShopProductStatus, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  RESERVED: "Reserved",
  SOLD: "Sold",
  ARCHIVED: "Archived",
};

const statusClasses: Record<ShopProductStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  PUBLISHED: "bg-green-100 text-green-800",
  RESERVED: "bg-yellow-100 text-yellow-800",
  SOLD: "bg-blue-100 text-blue-800",
  ARCHIVED: "bg-slate-100 text-slate-700",
};

function numberValue(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function ShopProductsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [deviceSearchTerm, setDeviceSearchTerm] = useState("");
  const [brandSearchTerm, setBrandSearchTerm] = useState("");
  const [showCustomDeviceType, setShowCustomDeviceType] = useState(false);
  const [showCustomBrand, setShowCustomBrand] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingProduct, setEditingProduct] = useState<ShopProduct | null>(null);
  const [sellingProduct, setSellingProduct] = useState<ShopProduct | null>(null);
  const [saleCustomerId, setSaleCustomerId] = useState("");
  const [saleDueDate, setSaleDueDate] = useState("");
  const [saleNotes, setSaleNotes] = useState("");
  const [taxRate, setTaxRate] = useState("15");
  const [creatingSale, setCreatingSale] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);

  const filteredDeviceTypes = COMMON_APPLIANCES.filter((deviceType) =>
    deviceType.toLowerCase().includes(deviceSearchTerm.toLowerCase())
  );
  const filteredBrands = COMMON_BRANDS.filter((brand) =>
    brand.toLowerCase().includes(brandSearchTerm.toLowerCase())
  );
  const isWashingMachine = form.deviceType.toLowerCase() === "washing machine";
  const capacityLabel =
    form.capacityKg.trim() !== ""
      ? `${Number(form.capacityKg)}kg`
      : "";

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...(search && { search }),
        ...(statusFilter !== "all" && { status: statusFilter }),
      });
      const response = await fetch(`/api/shop-products?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load shop products");
      }
      setProducts(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load shop products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    loadSettings();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [statusFilter]);

  const publishedCount = useMemo(
    () => products.filter((product) => product.status === "PUBLISHED").length,
    [products]
  );
  const saleSubtotal = sellingProduct?.price || 0;
  const saleTax = (saleSubtotal * numberValue(taxRate, 0)) / 100;
  const saleTotal = saleSubtotal + saleTax;

  const resetForm = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setShowCustomDeviceType(false);
    setShowCustomBrand(false);
    setDeviceSearchTerm("");
    setBrandSearchTerm("");
  };

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

  function openSaleDialog(product: ShopProduct) {
    setSellingProduct(product);
    setSaleCustomerId("");
    setSaleNotes("");
  }

  const editProduct = (product: ShopProduct) => {
    setEditingProduct(product);
    setForm({
      title: product.title,
      slug: product.slug,
      brand: product.brand || "",
      deviceType: product.deviceType || "",
      modelNumber: product.modelNumber || "",
      capacityKg: typeof product.capacityKg === "number" ? String(product.capacityKg) : "",
      condition: product.condition || "",
      price: String(product.price),
      description: product.description,
      warrantyNotes: product.warrantyNotes || "",
      status: product.status,
      featured: product.featured,
      images: product.images || [],
      internalNotes: product.internalNotes || "",
    });
    setShowCustomDeviceType(Boolean(product.deviceType && !COMMON_APPLIANCES.includes(product.deviceType)));
    setShowCustomBrand(Boolean(product.brand && !COMMON_BRANDS.includes(product.brand)));
  };

  const updateForm = (field: keyof ProductForm, value: string | boolean | string[]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await fetch("/api/shop-products/upload-image", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to upload image");
      }
      updateForm("images", [...form.images, data.path]);
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const removeImage = (image: string) => {
    updateForm(
      "images",
      form.images.filter((item) => item !== image)
    );
  };

  const saveProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        capacityKg:
          form.deviceType.toLowerCase() === "washing machine" && form.capacityKg.trim() !== ""
            ? Number(form.capacityKg)
            : null,
      };
      const response = await fetch(
        editingProduct ? `/api/shop-products/${editingProduct.id}` : "/api/shop-products",
        {
          method: editingProduct ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save product");
      }

      toast({
        title: "Saved",
        description: `${data.title} has been saved.`,
      });
      resetForm();
      fetchProducts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save product",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (product: ShopProduct) => {
    if (!confirm(`Delete ${product.title}?`)) return;

    try {
      const response = await fetch(`/api/shop-products/${product.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete product");
      }
      toast({
        title: "Deleted",
        description: `${product.title} has been deleted.`,
      });
      fetchProducts();
      if (editingProduct?.id === product.id) {
        resetForm();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete product",
        variant: "destructive",
      });
    }
  };

  const createProductSaleInvoice = async () => {
    if (!sellingProduct) return;

    if (!saleCustomerId) {
      toast({
        title: "Customer required",
        description: "Select a customer before creating the invoice",
        variant: "destructive",
      });
      return;
    }

    setCreatingSale(true);
    try {
      const response = await fetch(`/api/shop-products/${sellingProduct.id}/sell`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: saleCustomerId,
          dueDate: new Date(saleDueDate).toISOString(),
          taxRate: numberValue(taxRate, 0),
          notes: saleNotes || undefined,
          paymentTerms: "Payment due upon collection of the product",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create invoice");
      }

      toast({
        title: "Invoice created",
        description: `${data.invoice.invoiceNumber} created for ${sellingProduct.title}`,
      });
      setSellingProduct(null);
      fetchProducts();
      router.push(`/invoices/${data.invoice.id}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive",
      });
    } finally {
      setCreatingSale(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-NZ", {
      style: "currency",
      currency: "NZD",
      maximumFractionDigits: 0,
    }).format(amount || 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button type="button" onClick={resetForm}>
          <Plus className="mr-2 h-4 w-4" />
          New Product
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
        <Card>
          <CardHeader>
            <CardTitle>Refurbished Stock</CardTitle>
            <CardDescription>{publishedCount} published product{publishedCount === 1 ? "" : "s"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") fetchProducts();
                  }}
                  placeholder="Search stock..."
                  className="pl-9"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-10 rounded-md border px-3 text-sm"
              >
                <option value="all">All statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </select>
              <Button type="button" variant="outline" onClick={fetchProducts}>
                Search
              </Button>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead className="w-[168px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-gray-500">
                        Loading products...
                      </TableCell>
                    </TableRow>
                  ) : products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-gray-500">
                        No shop products found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="relative h-14 w-16 shrink-0 overflow-hidden rounded-md bg-gray-100">
                              {product.images[0] ? (
                                <Image src={product.images[0]} alt={product.title} fill className="object-cover" sizes="64px" />
                              ) : null}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{product.title}</p>
                              <p className="text-sm text-gray-500">
                                {[
                                  product.brand,
                                  product.deviceType,
                                  typeof product.capacityKg === "number" ? `${product.capacityKg}kg` : product.modelNumber,
                                ].filter(Boolean).join(" / ") || product.slug}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusClasses[product.status]}>{statusLabels[product.status]}</Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(product.price)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => openSaleDialog(product)}
                              disabled={product.status === "SOLD" || product.status === "ARCHIVED"}
                              title="Sell product"
                            >
                              <ShoppingCart className="h-4 w-4" />
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => editProduct(product)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => deleteProduct(product)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{editingProduct ? "Edit Product" : "New Product"}</CardTitle>
            <CardDescription>Published products show on the public shop when maintenance mode is off.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveProduct} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={form.title} onChange={(event) => updateForm("title", event.target.value)} required />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="brand">Brand</Label>
                  <Select
                    value={showCustomBrand ? "Other" : form.brand}
                    onValueChange={(value) => {
                      if (value === "Other") {
                        setShowCustomBrand(true);
                        updateForm("brand", "");
                      } else {
                        setShowCustomBrand(false);
                        updateForm("brand", value);
                      }
                      setBrandSearchTerm("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select or type to search brand" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="sticky top-0 bg-popover px-2 pb-2">
                        <Input
                          placeholder="Type to search..."
                          value={brandSearchTerm}
                          onChange={(event) => setBrandSearchTerm(event.target.value)}
                          onClick={(event) => event.stopPropagation()}
                          className="h-8"
                        />
                      </div>
                      {filteredBrands.length > 0 ? (
                        filteredBrands.map((brand) => (
                          <SelectItem key={brand} value={brand}>
                            {brand}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                          No brands found
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  {showCustomBrand ? (
                    <Input
                      value={form.brand}
                      onChange={(event) => updateForm("brand", event.target.value)}
                      placeholder="Enter custom brand"
                    />
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deviceType">Device Type</Label>
                  <Select
                    value={showCustomDeviceType ? "Other" : form.deviceType}
                    onValueChange={(value) => {
                      if (value === "Other") {
                        setShowCustomDeviceType(true);
                        updateForm("deviceType", "");
                        updateForm("capacityKg", "");
                      } else {
                        setShowCustomDeviceType(false);
                        updateForm("deviceType", value);
                        if (value !== "Washing Machine") {
                          updateForm("capacityKg", "");
                        }
                      }
                      setDeviceSearchTerm("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select or type to search device type" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="sticky top-0 bg-popover px-2 pb-2">
                        <Input
                          placeholder="Type to search..."
                          value={deviceSearchTerm}
                          onChange={(event) => setDeviceSearchTerm(event.target.value)}
                          onClick={(event) => event.stopPropagation()}
                          className="h-8"
                        />
                      </div>
                      {filteredDeviceTypes.length > 0 ? (
                        filteredDeviceTypes.map((deviceType) => (
                          <SelectItem key={deviceType} value={deviceType}>
                            {deviceType}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                          No device types found
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  {showCustomDeviceType ? (
                    <Input
                      value={form.deviceType}
                      onChange={(event) => updateForm("deviceType", event.target.value)}
                      placeholder="Enter custom device type"
                    />
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="modelNumber">Model</Label>
                  <Input id="modelNumber" value={form.modelNumber} onChange={(event) => updateForm("modelNumber", event.target.value)} />
                </div>
                {isWashingMachine ? (
                  <div className="space-y-2">
                    <Label htmlFor="capacityKg">Capacity (kg)</Label>
                    <Input
                      id="capacityKg"
                      type="number"
                      min="0"
                      step="0.5"
                      value={form.capacityKg}
                      onChange={(event) => updateForm("capacityKg", event.target.value)}
                      placeholder="8"
                    />
                    <p className="text-xs text-gray-500">
                      Shown publicly as {capacityLabel || "capacity"} in the listing breadcrumbs.
                    </p>
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="condition">Condition</Label>
                  <Input id="condition" value={form.condition} onChange={(event) => updateForm("condition", event.target.value)} placeholder="Excellent, Good, Fair" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="price">Price including GST</Label>
                  <Input id="price" type="number" min="0" step="0.01" value={form.price} onChange={(event) => updateForm("price", event.target.value)} required />
                  <p className="text-xs text-gray-500">
                    This price is displayed publicly as GST inclusive.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    value={form.status}
                    onChange={(event) => updateForm("status", event.target.value as ShopProductStatus)}
                    className="h-10 w-full rounded-md border px-3 text-sm"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {statusLabels[status]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={form.description} onChange={(event) => updateForm("description", event.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="warrantyNotes">Warranty Notes</Label>
                <Textarea id="warrantyNotes" value={form.warrantyNotes} onChange={(event) => updateForm("warrantyNotes", event.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Images</Label>
                <div className="grid grid-cols-3 gap-2">
                  {form.images.map((image) => (
                    <div key={image} className="relative aspect-square overflow-hidden rounded-md border bg-gray-100">
                      <Image src={image} alt="Product" fill className="object-cover" sizes="120px" />
                      <button
                        type="button"
                        onClick={() => removeImage(image)}
                        className="absolute right-1 top-1 rounded-full bg-white p-1 text-gray-700 shadow"
                        aria-label="Remove image"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-md border border-dashed text-sm text-gray-500 hover:bg-gray-50">
                    <ImagePlus className="mb-2 h-5 w-5" />
                    {uploading ? "Uploading..." : "Add Image"}
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadImage} className="hidden" disabled={uploading} />
                  </label>
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(event) => updateForm("featured", event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Featured product
              </label>

              <div className="space-y-2">
                <Label htmlFor="internalNotes">Internal Notes</Label>
                <Textarea id="internalNotes" value={form.internalNotes} onChange={(event) => updateForm("internalNotes", event.target.value)} />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Product"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Clear
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(sellingProduct)} onOpenChange={(open) => {
        if (!open) setSellingProduct(null);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sell Product</DialogTitle>
            <DialogDescription>Create a customer invoice and mark this shop product as sold.</DialogDescription>
          </DialogHeader>

          {sellingProduct ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-md border p-3">
                <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-md bg-gray-100">
                  {sellingProduct.images[0] ? (
                    <Image src={sellingProduct.images[0]} alt={sellingProduct.title} fill className="object-cover" sizes="80px" />
                  ) : null}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{sellingProduct.title}</p>
                  <p className="text-sm text-gray-500">
                    {[
                      sellingProduct.brand,
                      sellingProduct.deviceType,
                      sellingProduct.modelNumber,
                    ].filter(Boolean).join(" / ") || sellingProduct.slug}
                  </p>
                </div>
                <div className="ml-auto text-right font-semibold">
                  {formatCurrency(sellingProduct.price)}
                </div>
              </div>

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

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea rows={4} value={saleNotes} onChange={(event) => setSaleNotes(event.target.value)} />
                </div>
                <div className="space-y-3 rounded-md border p-4">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span className="font-medium">{formatCurrency(saleSubtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <Label className="whitespace-nowrap">GST %</Label>
                    <Input
                      className="w-24 text-right"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={taxRate}
                      onChange={(event) => setTaxRate(event.target.value)}
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>GST</span>
                    <span className="font-medium">{formatCurrency(saleTax)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>{formatCurrency(saleTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSellingProduct(null)} disabled={creatingSale}>
              Cancel
            </Button>
            <Button onClick={createProductSaleInvoice} disabled={creatingSale}>
              <Package className="mr-2 h-4 w-4" />
              {creatingSale ? "Creating..." : "Create Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
