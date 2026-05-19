"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Edit, ImagePlus, Plus, Search, Trash2, X } from "lucide-react";
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

type ProductForm = {
  title: string;
  slug: string;
  brand: string;
  deviceType: string;
  modelNumber: string;
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

export default function ShopProductsPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<ShopProduct[]>([]);
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
  const [form, setForm] = useState<ProductForm>(emptyForm);

  const filteredDeviceTypes = COMMON_APPLIANCES.filter((deviceType) =>
    deviceType.toLowerCase().includes(deviceSearchTerm.toLowerCase())
  );
  const filteredBrands = COMMON_BRANDS.filter((brand) =>
    brand.toLowerCase().includes(brandSearchTerm.toLowerCase())
  );

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
    fetchProducts();
  }, [statusFilter]);

  const publishedCount = useMemo(
    () => products.filter((product) => product.status === "PUBLISHED").length,
    [products]
  );

  const resetForm = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setShowCustomDeviceType(false);
    setShowCustomBrand(false);
    setDeviceSearchTerm("");
    setBrandSearchTerm("");
  };

  const editProduct = (product: ShopProduct) => {
    setEditingProduct(product);
    setForm({
      title: product.title,
      slug: product.slug,
      brand: product.brand || "",
      deviceType: product.deviceType || "",
      modelNumber: product.modelNumber || "",
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

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-NZ", {
      style: "currency",
      currency: "NZD",
      maximumFractionDigits: 0,
    }).format(amount || 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shop Products</h1>
          <p className="mt-1 text-gray-600">Manage refurbished stock shown on the public website.</p>
        </div>
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
                    <TableHead className="w-[120px] text-right">Actions</TableHead>
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
                                {[product.brand, product.deviceType, product.modelNumber].filter(Boolean).join(" / ") || product.slug}
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
                      } else {
                        setShowCustomDeviceType(false);
                        updateForm("deviceType", value);
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
    </div>
  );
}
