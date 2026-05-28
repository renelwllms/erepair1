"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useToast } from "@/components/ui/use-toast";

declare global {
  interface Window {
    google?: any;
    initCustomerPlaces?: () => void;
  }
}

const customerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  customerType: z.enum(["RESIDENTIAL", "COMMERCIAL"]),
  notes: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

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
}

interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
  onSuccess: () => void;
}

export function CustomerDialog({
  open,
  onOpenChange,
  customer,
  onSuccess,
}: CustomerDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [mapsApiKey, setMapsApiKey] = useState<string | null>(null);
  const [placesReady, setPlacesReady] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      customerType: "RESIDENTIAL",
    },
  });

  const customerType = watch("customerType");

  const applyAddressComponents = useCallback((place: any) => {
    const components = place.address_components || [];
    const findComponent = (type: string, useShortName = false) => {
      const component = components.find((item: any) => item.types.includes(type));
      return component ? (useShortName ? component.short_name : component.long_name) : "";
    };

    setValue("address", place.formatted_address || "", { shouldValidate: true });
    setValue(
      "city",
      findComponent("locality") || findComponent("postal_town") || findComponent("administrative_area_level_2"),
      { shouldValidate: true }
    );
    setValue("state", findComponent("administrative_area_level_1", true), { shouldValidate: true });
    setValue("zipCode", findComponent("postal_code"), { shouldValidate: true });
  }, [setValue]);

  useEffect(() => {
    if (open) {
      if (customer) {
        // Editing mode
        reset({
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phone,
          address: customer.address || "",
          city: customer.city || "",
          state: customer.state || "",
          zipCode: customer.zipCode || "",
          customerType: customer.customerType,
          notes: customer.notes || "",
        });
      } else {
        // Creating mode
        reset({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          address: "",
          city: "",
          state: "",
          zipCode: "",
          customerType: "RESIDENTIAL",
          notes: "",
        });
      }
    }
  }, [open, customer, reset]);

  useEffect(() => {
    if (!open || mapsApiKey !== null) {
      return;
    }

    fetch("/api/settings")
      .then((response) => (response.ok ? response.json() : null))
      .then((settings) => setMapsApiKey(settings?.geocodingApiKey || ""))
      .catch(() => setMapsApiKey(""));
  }, [open, mapsApiKey]);

  useEffect(() => {
    if (!open || !mapsApiKey) {
      return;
    }

    if (window.google?.maps?.places) {
      setPlacesReady(true);
      return;
    }

    window.initCustomerPlaces = () => setPlacesReady(true);
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src*="maps.googleapis.com/maps/api/js"]'
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => setPlacesReady(true), { once: true });
      return () => {
        delete window.initCustomerPlaces;
      };
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${mapsApiKey}&libraries=places&callback=initCustomerPlaces`;
    script.async = true;
    document.head.appendChild(script);

    return () => {
      delete window.initCustomerPlaces;
    };
  }, [open, mapsApiKey]);

  useEffect(() => {
    if (!open || (!placesReady && !window.google?.maps?.places)) {
      return;
    }

    const input = document.getElementById("customerAddress") as HTMLInputElement | null;
    if (!input) {
      return;
    }

    const autocomplete = new window.google.maps.places.Autocomplete(input, {
      fields: ["formatted_address", "address_components"],
      componentRestrictions: { country: "nz" },
    });

    const listener = autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place?.formatted_address) {
        return;
      }
      applyAddressComponents(place);
    });

    return () => listener.remove();
  }, [open, mapsApiKey, placesReady, setValue, applyAddressComponents]);

  const onSubmit = async (data: CustomerFormData) => {
    setLoading(true);
    try {
      const url = customer
        ? `/api/customers/${customer.id}`
        : "/api/customers";
      const method = customer ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save customer");
      }

      toast({
        title: "Success",
        description: customer
          ? "Customer updated successfully"
          : "Customer created successfully",
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {customer ? "Edit Customer" : "New Customer"}
          </DialogTitle>
          <DialogDescription>
            {customer
              ? "Update customer information below."
              : "Fill in the details to create a new customer."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">
                First Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="firstName"
                {...register("firstName")}
                placeholder="John"
              />
              {errors.firstName && (
                <p className="text-sm text-red-500">{errors.firstName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">
                Last Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="lastName"
                {...register("lastName")}
                placeholder="Doe"
              />
              {errors.lastName && (
                <p className="text-sm text-red-500">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="john.doe@example.com"
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">
                Phone <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                {...register("phone")}
                placeholder="(555) 123-4567"
              />
              {errors.phone && (
                <p className="text-sm text-red-500">{errors.phone.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerType">
              Customer Type <span className="text-red-500">*</span>
            </Label>
            <Select
              value={customerType}
              onValueChange={(value) => setValue("customerType", value as "RESIDENTIAL" | "COMMERCIAL")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RESIDENTIAL">Residential</SelectItem>
                <SelectItem value="COMMERCIAL">Commercial</SelectItem>
              </SelectContent>
            </Select>
            {errors.customerType && (
              <p className="text-sm text-red-500">{errors.customerType.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerAddress">Address</Label>
            <Input
              id="customerAddress"
              {...register("address")}
              placeholder={mapsApiKey ? "Start typing and select a Google address" : "123 Main St"}
            />
            {mapsApiKey === "" && (
              <p className="text-xs text-amber-700">Add a Google Maps API key in settings to enable address lookup.</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                {...register("city")}
                placeholder="New York"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                {...register("state")}
                placeholder="NY"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zipCode">Zip Code</Label>
              <Input
                id="zipCode"
                {...register("zipCode")}
                placeholder="10001"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              {...register("notes")}
              className="w-full min-h-[100px] px-3 py-2 text-sm border rounded-md"
              placeholder="Any additional notes about the customer..."
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : customer ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
