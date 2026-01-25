"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Phone,
  Mail,
  FileText,
  Download,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { CustomerDialog } from "@/components/customers/customer-dialog";

interface Customer {
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
  totalJobs: number;
  totalRevenue: number;
  openJobs: number;
}

export default function CustomersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const columnKeys = ["name", "contact", "type", "jobs", "revenue", "customerSince"] as const;
  type ColumnKey = (typeof columnKeys)[number];
  const defaultColumnOrder: ColumnKey[] = ["name", "contact", "type", "jobs", "revenue", "customerSince"];
  const defaultColumnVisibility: Record<ColumnKey, boolean> = {
    name: true,
    contact: true,
    type: true,
    jobs: true,
    revenue: true,
    customerSince: true,
  };
  const columnStorageKey = "customersTableColumns";

  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(defaultColumnOrder);
  const [columnVisibility, setColumnVisibility] = useState<Record<ColumnKey, boolean>>(
    defaultColumnVisibility
  );

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(columnStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        order?: ColumnKey[];
        visibility?: Record<ColumnKey, boolean>;
      };

      if (parsed.order && Array.isArray(parsed.order)) {
        const cleaned = parsed.order.filter((key) => columnKeys.includes(key));
        const missing = defaultColumnOrder.filter((key) => !cleaned.includes(key));
        setColumnOrder([...cleaned, ...missing]);
      }

      if (parsed.visibility) {
        setColumnVisibility({
          ...defaultColumnVisibility,
          ...parsed.visibility,
        });
      }
    } catch {
      // Ignore malformed localStorage
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      columnStorageKey,
      JSON.stringify({ order: columnOrder, visibility: columnVisibility })
    );
  }, [columnOrder, columnVisibility]);

  const visibleColumns = useMemo(
    () => columnOrder.filter((key) => columnVisibility[key]),
    [columnOrder, columnVisibility]
  );

  const toggleColumnVisibility = (key: ColumnKey, visible: boolean) => {
    const visibleCount = Object.values(columnVisibility).filter(Boolean).length;
    if (!visible && visibleCount === 1) {
      toast({
        title: "At least one column required",
        description: "You must keep at least one column visible.",
        variant: "destructive",
      });
      return;
    }
    setColumnVisibility((prev) => ({ ...prev, [key]: visible }));
  };

  const moveColumn = (key: ColumnKey, direction: "up" | "down") => {
    setColumnOrder((prev) => {
      const index = prev.indexOf(key);
      if (index === -1) return prev;
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      return next;
    });
  };

  const columnDefinitions: Record<
    ColumnKey,
    {
      label: string;
      render: (customer: Customer) => React.ReactNode;
      csv: (customer: Customer) => string | number;
    }
  > = {
    name: {
      label: "Name",
      render: (customer) => (
        <span className="font-medium">
          {customer.firstName} {customer.lastName}
        </span>
      ),
      csv: (customer) => `${customer.firstName} ${customer.lastName}`,
    },
    contact: {
      label: "Contact",
      render: (customer) => (
        <div className="text-sm">
          <div>{customer.email}</div>
          <div className="text-gray-500">{customer.phone}</div>
        </div>
      ),
      csv: (customer) => `${customer.email} / ${customer.phone}`,
    },
    type: {
      label: "Type",
      render: (customer) => (
        <Badge variant={customer.customerType === "COMMERCIAL" ? "default" : "secondary"}>
          {customer.customerType}
        </Badge>
      ),
      csv: (customer) => customer.customerType,
    },
    jobs: {
      label: "Jobs",
      render: (customer) => (
        <div className="text-sm">
          <div>{customer.totalJobs} total</div>
          {customer.openJobs > 0 && <div className="text-orange-600">{customer.openJobs} open</div>}
        </div>
      ),
      csv: (customer) => `${customer.totalJobs} total${customer.openJobs > 0 ? ` (${customer.openJobs} open)` : ""}`,
    },
    revenue: {
      label: "Revenue",
      render: (customer) => `$${customer.totalRevenue.toFixed(2)}`,
      csv: (customer) => customer.totalRevenue.toFixed(2),
    },
    customerSince: {
      label: "Customer Since",
      render: (customer) => new Date(customer.customerSince).toLocaleDateString(),
      csv: (customer) => new Date(customer.customerSince).toLocaleDateString(),
    },
  };

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        ...(searchQuery && { search: searchQuery }),
        ...(customerTypeFilter !== "all" && { customerType: customerTypeFilter }),
      });

      const response = await fetch(`/api/customers?${params}`);
      if (!response.ok) throw new Error("Failed to fetch customers");

      const data = await response.json();
      setCustomers(data.customers);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load customers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, searchQuery, customerTypeFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this customer?")) return;

    try {
      const response = await fetch(`/api/customers/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete customer");
      }

      toast({
        title: "Success",
        description: "Customer deleted successfully",
      });
      fetchCustomers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const exportToCSV = () => {
    const headers = visibleColumns.map((key) => columnDefinitions[key].label);
    const rows = customers.map((customer) =>
      visibleColumns.map((key) => columnDefinitions[key].csv(customer))
    );

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600 mt-1">Manage customer relationships and data</p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Show/Hide</DropdownMenuLabel>
              {columnOrder.map((key) => (
                <DropdownMenuCheckboxItem
                  key={key}
                  checked={columnVisibility[key]}
                  onCheckedChange={(checked) => toggleColumnVisibility(key, Boolean(checked))}
                  onSelect={(event) => event.preventDefault()}
                  className="flex items-center gap-2"
                >
                  <span className="flex-1">{columnDefinitions[key].label}</span>
                  <div className="ml-auto flex items-center gap-1">
                    <button
                      type="button"
                      className="rounded p-1 hover:bg-muted"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        moveColumn(key, "up");
                      }}
                      aria-label={`Move ${columnDefinitions[key].label} up`}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="rounded p-1 hover:bg-muted"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        moveColumn(key, "down");
                      }}
                      aria-label={`Move ${columnDefinitions[key].label} down`}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  setColumnOrder(defaultColumnOrder);
                  setColumnVisibility(defaultColumnVisibility);
                }}
              >
                Reset to default
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => {
            setEditingCustomer(null);
            setDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            New Customer
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Customer List</CardTitle>
              <CardDescription>View and manage all customers</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select value={customerTypeFilter} onValueChange={(value) => {
              setCustomerTypeFilter(value);
              setPage(1);
            }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Customer Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="RESIDENTIAL">Residential</SelectItem>
                <SelectItem value="COMMERCIAL">Commercial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : customers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No customers found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    {visibleColumns.map((key) => (
                      <TableHead key={key}>{columnDefinitions[key].label}</TableHead>
                    ))}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id}>
                      {visibleColumns.map((key) => (
                        <TableCell key={key}>{columnDefinitions[key].render(customer)}</TableCell>
                      ))}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => router.push(`/customers/${customer.id}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setEditingCustomer(customer);
                              setDialogOpen(true);
                            }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => window.location.href = `tel:${customer.phone}`}>
                              <Phone className="h-4 w-4 mr-2" />
                              Call
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.location.href = `mailto:${customer.email}`}>
                              <Mail className="h-4 w-4 mr-2" />
                              Email
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/jobs/new?customerId=${customer.id}`)}>
                              <FileText className="h-4 w-4 mr-2" />
                              Create Job
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDelete(customer.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
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

      <CustomerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        customer={editingCustomer}
        onSuccess={() => {
          fetchCustomers();
          setDialogOpen(false);
          setEditingCustomer(null);
        }}
      />
    </div>
  );
}
