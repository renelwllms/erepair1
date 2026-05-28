"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft, Check, Plus, Search, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { TermsSummary } from "@/components/legal/terms-summary";
import { getDiagnosticFeeForAppliance, parseDiagnosticFees } from "@/lib/diagnostic-fees";

declare global {
  interface Window {
    google?: any;
    initNewJobPlaces?: () => void;
  }
}

// Common appliances and brands
const COMMON_APPLIANCES = [
  "Refrigerator",
  "Washing Machine",
  "Dryer",
  "Dishwasher",
  "Oven",
  "Microwave",
  "Air Conditioner",
  "Water Heater",
  "Freezer",
  "Range Hood",
  "Garbage Disposal",
  "Ice Maker",
  "Cooktop",
  "Wall Oven",
  "Trash Compactor",
  // Audio Equipment
  "TV / Television",
  "Home Theater System",
  "Soundbar",
  "Amplifier",
  "Receiver",
  "Speakers",
  "Subwoofer",
  "Turntable",
  "CD Player",
  "DVD/Blu-ray Player",
  "Projector",
  "Other",
];

const COMMON_BRANDS = [
  // Appliance Brands
  "Samsung",
  "LG",
  "Whirlpool",
  "GE",
  "Maytag",
  "Bosch",
  "KitchenAid",
  "Frigidaire",
  "Electrolux",
  "Haier",
  "Kenmore",
  "Amana",
  "Hotpoint",
  "Fisher & Paykel",
  "Miele",
  "Sub-Zero",
  "Viking",
  "Thermador",
  // Audio/Video Brands
  "Sony",
  "Bose",
  "JBL",
  "Yamaha",
  "Denon",
  "Harman Kardon",
  "Klipsch",
  "Polk Audio",
  "Pioneer",
  "Onkyo",
  "Marantz",
  "Bang & Olufsen",
  "Sonos",
  "Panasonic",
  "Vizio",
  "TCL",
  "Other",
];

const jobSchema = z.object({
  jobType: z.enum(["WORKSHOP_REPAIR", "CALLOUT_REPAIR"]),
  customerId: z.string().min(1, "Customer is required"),
  applianceBrand: z.string().min(1, "Appliance brand is required"),
  applianceType: z.string().min(1, "Appliance type is required"),
  modelNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  issueDescription: z.string().min(1, "Issue description is required"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  assignedTechnicianId: z.string().optional(),
  warrantyStatus: z.string().optional(),
  serviceLocation: z.string().optional(),
  estimatedCompletion: z.string().optional(),
  diagnosticFeeAmount: z.number().min(0).optional(),
  calloutAddress: z.string().optional(),
  calloutLatitude: z.number().optional(),
  calloutLongitude: z.number().optional(),
  googlePlaceId: z.string().optional(),
  distanceFromOfficeKm: z.number().optional(),
  estimatedTravelTime: z.string().optional(),
  preferredCalloutDate: z.string().optional(),
  calloutAccessInstructions: z.string().optional(),
  calloutParkingNotes: z.string().optional(),
  calloutApplianceLocation: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.applianceType === "Other" && (data.diagnosticFeeAmount === undefined || Number.isNaN(data.diagnosticFeeAmount))) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["diagnosticFeeAmount"],
      message: "Diagnostic fee is required when appliance type is Other",
    });
  }

  if (data.jobType === "CALLOUT_REPAIR") {
    const requiredFields: Array<[("calloutAddress" | "preferredCalloutDate" | "calloutAccessInstructions" | "calloutParkingNotes" | "calloutApplianceLocation"), string]> = [
      ["calloutAddress", "Full address is required for callout repairs"],
      ["preferredCalloutDate", "Preferred date/time is required for callout repairs"],
      ["calloutAccessInstructions", "Access instructions are required for callout repairs"],
      ["calloutParkingNotes", "Parking notes are required for callout repairs"],
      ["calloutApplianceLocation", "Appliance location is required for callout repairs"],
    ];

    for (const [field, message] of requiredFields) {
      if (!data[field]?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message,
        });
      }
    }

    if (!data.calloutLatitude || !data.calloutLongitude || !data.googlePlaceId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["calloutAddress"],
        message: "Select a Google Places address from the suggestions",
      });
    }
  }
});

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
});

type JobFormData = z.infer<typeof jobSchema>;
type CustomerFormData = z.infer<typeof customerSchema>;

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
}

interface Technician {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

export default function NewJobPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [showCustomApplianceType, setShowCustomApplianceType] = useState(false);
  const [showCustomBrand, setShowCustomBrand] = useState(false);
  const [customApplianceType, setCustomApplianceType] = useState("");
  const [customBrand, setCustomBrand] = useState("");
  const [applianceSearchTerm, setApplianceSearchTerm] = useState("");
  const [brandSearchTerm, setBrandSearchTerm] = useState("");
  const [diagnosticFees, setDiagnosticFees] = useState<Record<string, number>>({});
  const [diagnosticFeeDefaultOther, setDiagnosticFeeDefaultOther] = useState<number | null>(null);
  const [diagnosticFeeTouched, setDiagnosticFeeTouched] = useState(false);
  const [mapsApiKey, setMapsApiKey] = useState<string | null>(null);
  const [placesReady, setPlacesReady] = useState(false);
  const [officeLocation, setOfficeLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [confirmedPreferredCalloutDate, setConfirmedPreferredCalloutDate] = useState("");

  const preselectedCustomerId = searchParams.get("customerId");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      jobType: "WORKSHOP_REPAIR",
      priority: "MEDIUM",
      customerId: preselectedCustomerId || "",
    },
  });

  const {
    register: registerCustomer,
    handleSubmit: handleSubmitCustomer,
    formState: { errors: customerErrors },
    reset: resetCustomer,
    setValue: setCustomerValue,
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      customerType: "RESIDENTIAL",
    },
  });

  const customerId = watch("customerId");
  const jobType = watch("jobType");
  const priority = watch("priority");
  const assignedTechnicianId = watch("assignedTechnicianId");
  const applianceType = watch("applianceType");
  const applianceBrand = watch("applianceBrand");
  const diagnosticFeeAmount = watch("diagnosticFeeAmount");
  const preferredCalloutDate = watch("preferredCalloutDate");
  const preferredCalloutDateField = register("preferredCalloutDate");
  const selectedCustomer = customers.find((customer) => customer.id === customerId);
  const selectedCustomerLabel = selectedCustomer
    ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`
    : "";
  const displayedCustomerResults = customerSearchTerm.trim().length >= 2 && customerSearchTerm !== selectedCustomerLabel
    ? customers.filter((customer) => {
        const haystack = `${customer.firstName} ${customer.lastName} ${customer.email} ${customer.phone}`.toLowerCase();
        return haystack.includes(customerSearchTerm.trim().toLowerCase());
      }).slice(0, 8)
    : [];

  const mergeCustomers = (incoming: Customer[]) => {
    setCustomers((current) => {
      const byId = new Map(current.map((customer) => [customer.id, customer]));
      incoming.forEach((customer) => byId.set(customer.id, customer));
      return Array.from(byId.values());
    });
  };

  const extractAddressComponent = (place: any, type: string, useShortName = false) => {
    const component = (place.address_components || []).find((item: any) => item.types.includes(type));
    return component ? (useShortName ? component.short_name : component.long_name) : "";
  };

  const buildCustomerAddress = (customer?: Customer) => {
    if (!customer?.address) {
      return "";
    }

    const extraParts = [customer.city, customer.state, customer.zipCode]
      .filter(Boolean)
      .map((part) => String(part));
    const addressIncludesExtraParts = extraParts.some((part) =>
      customer.address?.toLowerCase().includes(part.toLowerCase())
    );

    return addressIncludesExtraParts || extraParts.length === 0
      ? customer.address
      : [customer.address, ...extraParts].join(", ");
  };

  const updateTravelEstimate = useCallback((lat: number, lng: number) => {
    if (!officeLocation || !window.google?.maps?.DistanceMatrixService) {
      return;
    }

    const service = new window.google.maps.DistanceMatrixService();
    service.getDistanceMatrix(
      {
        origins: [officeLocation],
        destinations: [{ lat, lng }],
        travelMode: window.google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(Date.now() + 5 * 60 * 1000),
          trafficModel: "bestguess",
        },
      },
      (result: any, status: string) => {
        if (status !== "OK") {
          return;
        }
        const element = result?.rows?.[0]?.elements?.[0];
        if (element?.status === "OK") {
          setValue("distanceFromOfficeKm", element.distance.value / 1000);
          setValue("estimatedTravelTime", element.duration_in_traffic?.text || element.duration?.text);
        }
      }
    );
  }, [officeLocation, setValue]);

  // Filtered lists for searchable dropdowns
  const filteredAppliances = COMMON_APPLIANCES.filter((appliance) =>
    appliance.toLowerCase().includes(applianceSearchTerm.toLowerCase())
  );

  const filteredBrands = COMMON_BRANDS.filter((brand) =>
    brand.toLowerCase().includes(brandSearchTerm.toLowerCase())
  );

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const query = customerSearchTerm.trim();

    if (query.length < 2) {
      return;
    }

    const timer = window.setTimeout(async () => {
      setSearchingCustomers(true);
      try {
        const response = await fetch(`/api/customers?search=${encodeURIComponent(query)}&limit=8`);
        if (response.ok) {
          const data = await response.json();
          mergeCustomers(data.customers || []);
        }
      } catch (error) {
        console.error("Failed to search customers:", error);
      } finally {
        setSearchingCustomers(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [customerSearchTerm]);

  useEffect(() => {
    if (!applianceType || diagnosticFeeTouched) {
      return;
    }

    const fee = getDiagnosticFeeForAppliance(applianceType, diagnosticFees, diagnosticFeeDefaultOther);
    if (typeof fee === "number") {
      setValue("diagnosticFeeAmount", fee);
    } else {
      setValue("diagnosticFeeAmount", 0);
    }
  }, [applianceType, diagnosticFees, diagnosticFeeDefaultOther, diagnosticFeeTouched, setValue]);

  useEffect(() => {
    if (!mapsApiKey || (jobType !== "CALLOUT_REPAIR" && !showCustomerDialog)) {
      return;
    }

    if (window.google?.maps?.places) {
      setPlacesReady(true);
      return;
    }

    window.initNewJobPlaces = () => setPlacesReady(true);
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src*="maps.googleapis.com/maps/api/js"]'
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => setPlacesReady(true), { once: true });
      return () => {
        delete window.initNewJobPlaces;
      };
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${mapsApiKey}&libraries=places&callback=initNewJobPlaces`;
    script.async = true;
    document.head.appendChild(script);

    return () => {
      delete window.initNewJobPlaces;
    };
  }, [jobType, mapsApiKey, showCustomerDialog]);

  useEffect(() => {
    if (jobType !== "CALLOUT_REPAIR" || (!placesReady && !window.google?.maps?.places)) {
      return;
    }

    const input = document.getElementById("calloutAddress") as HTMLInputElement | null;
    if (!input) {
      return;
    }

    const autocomplete = new window.google.maps.places.Autocomplete(input, {
      fields: ["formatted_address", "geometry", "place_id"],
      componentRestrictions: { country: "nz" },
    });

    const listener = autocomplete.addListener("place_changed", async () => {
      const place = autocomplete.getPlace();
      if (!place?.formatted_address || !place?.geometry?.location || !place.place_id) {
        return;
      }

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      setValue("calloutAddress", place.formatted_address, { shouldValidate: true });
      setValue("calloutLatitude", lat, { shouldValidate: true });
      setValue("calloutLongitude", lng, { shouldValidate: true });
      setValue("googlePlaceId", place.place_id, { shouldValidate: true });
      updateTravelEstimate(lat, lng);
    });

    return () => listener.remove();
  }, [jobType, mapsApiKey, officeLocation, placesReady, setValue, updateTravelEstimate]);

  useEffect(() => {
    if (!showCustomerDialog || (!placesReady && !window.google?.maps?.places)) {
      return;
    }

    const input = document.getElementById("newCustomerAddress") as HTMLInputElement | null;
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

      setCustomerValue("address", place.formatted_address, { shouldValidate: true });
      setCustomerValue(
        "city",
        extractAddressComponent(place, "locality") ||
          extractAddressComponent(place, "postal_town") ||
          extractAddressComponent(place, "administrative_area_level_2"),
        { shouldValidate: true }
      );
      setCustomerValue("state", extractAddressComponent(place, "administrative_area_level_1", true), { shouldValidate: true });
      setCustomerValue("zipCode", extractAddressComponent(place, "postal_code"), { shouldValidate: true });
    });

    return () => listener.remove();
  }, [showCustomerDialog, placesReady, setCustomerValue]);

  useEffect(() => {
    if (jobType !== "CALLOUT_REPAIR" || !selectedCustomer) {
      return;
    }

    const address = buildCustomerAddress(selectedCustomer);
    if (!address) {
      return;
    }

    setValue("calloutAddress", address, { shouldValidate: true });
    setValue("calloutLatitude", undefined);
    setValue("calloutLongitude", undefined);
    setValue("googlePlaceId", undefined);

    fetch(`/api/public/geocode?address=${encodeURIComponent(address)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((result) => {
        if (!result?.lat || !result?.lng) {
          return;
        }
        setValue("calloutAddress", result.formattedAddress || address, { shouldValidate: true });
        setValue("calloutLatitude", result.lat, { shouldValidate: true });
        setValue("calloutLongitude", result.lng, { shouldValidate: true });
        setValue("googlePlaceId", result.placeId, { shouldValidate: true });
        updateTravelEstimate(result.lat, result.lng);
        trigger("calloutAddress");
      })
      .catch(() => undefined);
  }, [jobType, selectedCustomer, customers, setValue, trigger, updateTravelEstimate]);

  const fetchData = async () => {
    try {
      const [customersRes, techniciansRes, settingsRes] = await Promise.all([
        fetch("/api/customers?limit=8"),
        fetch("/api/users/technicians"),
        fetch("/api/settings"),
      ]);

      if (customersRes.ok) {
        const data = await customersRes.json();
        setCustomers(data.customers);
      }

      if (preselectedCustomerId) {
        const selectedRes = await fetch(`/api/customers/${preselectedCustomerId}`);
        if (selectedRes.ok) {
          const selected = await selectedRes.json();
          mergeCustomers([selected]);
          setCustomerSearchTerm(`${selected.firstName} ${selected.lastName}`);
        }
      }

      if (techniciansRes.ok) {
        const data = await techniciansRes.json();
        setTechnicians(data);
      }

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setDiagnosticFees(parseDiagnosticFees(data.diagnosticFees));
        setDiagnosticFeeDefaultOther(
          typeof data.diagnosticFeeDefaultOther === "number" ? data.diagnosticFeeDefaultOther : null
        );
        setMapsApiKey(data.geocodingApiKey || null);
        if (typeof data.officeLatitude === "number" && typeof data.officeLongitude === "number") {
          setOfficeLocation({ lat: data.officeLatitude, lng: data.officeLongitude });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load form data",
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  const onCreateCustomer = async (data: CustomerFormData) => {
    setCreatingCustomer(true);
    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create customer");
      }

      const newCustomer = await response.json();

      toast({
        title: "Success",
        description: "Customer created successfully",
      });

      // Add new customer to list and select it
      mergeCustomers([newCustomer]);
      setValue("customerId", newCustomer.id);
      setCustomerSearchTerm(`${newCustomer.firstName} ${newCustomer.lastName}`);
      setShowCustomerDialog(false);
      resetCustomer();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreatingCustomer(false);
    }
  };

  const onSubmit = async (data: JobFormData) => {
    setLoading(true);
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create job");
      }

      const job = await response.json();

      toast({
        title: "Success",
        description: "Job created successfully",
      });

      router.push(`/jobs/${job.id}`);
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

  if (loadingData) {
    return (
      <div className="flex min-h-full items-center justify-center py-16">
        <div className="text-center">
          <p className="text-lg">Loading form...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button variant="ghost" size="sm" onClick={() => router.push("/jobs")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Create New Job</h1>
          <p className="text-gray-600 mt-1">Enter job details to create a new repair job</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Job Information</CardTitle>
            <CardDescription>Fill in the details below to create a new repair job</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Customer Selection with Create New Button */}
            <div className="space-y-2">
              <Label htmlFor="jobType">
                Job Type <span className="text-red-500">*</span>
              </Label>
              <Select value={jobType} onValueChange={(value) => setValue("jobType", value as JobFormData["jobType"])}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select job type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WORKSHOP_REPAIR">Workshop Repair</SelectItem>
                  <SelectItem value="CALLOUT_REPAIR">Callout Repair</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Customer Selection with Create New Button */}
            <div className="space-y-2">
              <Label htmlFor="customerId">
                Customer <span className="text-red-500">*</span>
              </Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      id="customerId"
                      value={customerSearchTerm}
                      onChange={(event) => {
                        const value = event.target.value;
                        setCustomerSearchTerm(value);
                        if (customerId && value !== selectedCustomerLabel) {
                          setValue("customerId", "", { shouldValidate: true });
                        }
                      }}
                      className="h-11 pl-10 pr-10"
                      placeholder="Search customer name, email, or phone"
                    />
                    {customerSearchTerm && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerSearchTerm("");
                          setValue("customerId", "", { shouldValidate: true });
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-gray-400 hover:text-gray-700"
                        aria-label="Clear customer search"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {selectedCustomer && (
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                      Selected: <span className="font-medium">{selectedCustomer.firstName} {selectedCustomer.lastName}</span>
                      <span className="text-emerald-700"> - {selectedCustomer.email}</span>
                    </div>
                  )}

                  {customerSearchTerm.trim().length > 0 && customerSearchTerm.trim().length < 2 && (
                    <p className="text-xs text-gray-500">Type at least 2 characters to search customers.</p>
                  )}

                  {searchingCustomers && (
                    <p className="text-xs text-gray-500">Searching customers...</p>
                  )}

                  {displayedCustomerResults.length > 0 && (
                    <div className="rounded-md border bg-white shadow-sm">
                      {displayedCustomerResults.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => {
                            setValue("customerId", customer.id, { shouldValidate: true });
                            setCustomerSearchTerm(`${customer.firstName} ${customer.lastName}`);
                          }}
                          className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-gray-50"
                        >
                          <span className="font-medium text-gray-900">{customer.firstName} {customer.lastName}</span>
                          <span className="text-xs text-gray-500">{customer.email} · {customer.phone}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {customerSearchTerm.trim().length >= 2 && !searchingCustomers && displayedCustomerResults.length === 0 && (
                    <p className="text-xs text-gray-500">No customers found. Create a new customer if needed.</p>
                  )}
                </div>
                <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      New Customer
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create New Customer</DialogTitle>
                      <DialogDescription>
                        Add a new customer to the system
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmitCustomer(onCreateCustomer)} className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">
                            First Name <span className="text-red-500">*</span>
                          </Label>
                          <Input id="firstName" {...registerCustomer("firstName")} />
                          {customerErrors.firstName && (
                            <p className="text-sm text-red-500">{customerErrors.firstName.message}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">
                            Last Name <span className="text-red-500">*</span>
                          </Label>
                          <Input id="lastName" {...registerCustomer("lastName")} />
                          {customerErrors.lastName && (
                            <p className="text-sm text-red-500">{customerErrors.lastName.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="email">
                            Email <span className="text-red-500">*</span>
                          </Label>
                          <Input id="email" type="email" {...registerCustomer("email")} />
                          {customerErrors.email && (
                            <p className="text-sm text-red-500">{customerErrors.email.message}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">
                            Phone <span className="text-red-500">*</span>
                          </Label>
                          <Input id="phone" {...registerCustomer("phone")} />
                          {customerErrors.phone && (
                            <p className="text-sm text-red-500">{customerErrors.phone.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="newCustomerAddress">Address</Label>
                        <Input
                          id="newCustomerAddress"
                          {...registerCustomer("address")}
                          placeholder={mapsApiKey ? "Start typing and select a Google address" : "Address"}
                        />
                        {!mapsApiKey && (
                          <p className="text-xs text-amber-700">Add a Google Maps API key in settings to enable address lookup.</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <Label htmlFor="city">City</Label>
                          <Input id="city" {...registerCustomer("city")} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state">State</Label>
                          <Input id="state" {...registerCustomer("state")} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="zipCode">ZIP Code</Label>
                          <Input id="zipCode" {...registerCustomer("zipCode")} />
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowCustomerDialog(false)}
                          disabled={creatingCustomer}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={creatingCustomer}>
                          {creatingCustomer ? "Creating..." : "Create Customer"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              {errors.customerId && (
                <p className="text-sm text-red-500">{errors.customerId.message}</p>
              )}
            </div>

            {/* Appliance Information with Dropdowns */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="applianceType">
                  Appliance Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={showCustomApplianceType ? "Other" : applianceType}
                  onValueChange={(value) => {
                    if (value === "Other") {
                      setShowCustomApplianceType(true);
                      setCustomApplianceType("");
                      setValue("applianceType", "");
                    } else {
                      setShowCustomApplianceType(false);
                      setValue("applianceType", value);
                    }
                    setApplianceSearchTerm("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select or type to search appliance type" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-2 pb-2 sticky top-0 bg-popover">
                      <Input
                        placeholder="Type to search..."
                        value={applianceSearchTerm}
                        onChange={(e) => setApplianceSearchTerm(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-8"
                      />
                    </div>
                    {filteredAppliances.length > 0 ? (
                      filteredAppliances.map((appliance) => (
                        <SelectItem key={appliance} value={appliance}>
                          {appliance}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                        No appliances found
                      </div>
                    )}
                  </SelectContent>
                </Select>
                {showCustomApplianceType ? (
                  <Input
                    placeholder="Enter custom appliance type"
                    value={customApplianceType}
                    onChange={(e) => {
                      setCustomApplianceType(e.target.value);
                      setValue("applianceType", e.target.value);
                    }}
                  />
                ) : null}
                {errors.applianceType && (
                  <p className="text-sm text-red-500">{errors.applianceType.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="diagnosticFeeAmount">
                  Diagnostic Fee <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="diagnosticFeeAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={diagnosticFeeAmount ?? ""}
                  {...register("diagnosticFeeAmount", { valueAsNumber: true })}
                  onChange={(event) => {
                    setDiagnosticFeeTouched(true);
                    setValue("diagnosticFeeAmount", Number(event.target.value));
                  }}
                  placeholder={applianceType === "Other" ? "Enter diagnostic fee" : "Auto-filled from settings"}
                />
                {applianceType === "Other" && diagnosticFeeDefaultOther === null && (
                  <p className="text-xs text-gray-500">
                    No default diagnostic fee for Other. Please enter a manual amount.
                  </p>
                )}
                {errors.diagnosticFeeAmount && (
                  <p className="text-sm text-red-500">{errors.diagnosticFeeAmount.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="applianceBrand">
                  Brand <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={showCustomBrand ? "Other" : applianceBrand}
                  onValueChange={(value) => {
                    if (value === "Other") {
                      setShowCustomBrand(true);
                      setCustomBrand("");
                      setValue("applianceBrand", "");
                    } else {
                      setShowCustomBrand(false);
                      setValue("applianceBrand", value);
                    }
                    setBrandSearchTerm("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select or type to search brand" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-2 pb-2 sticky top-0 bg-popover">
                      <Input
                        placeholder="Type to search..."
                        value={brandSearchTerm}
                        onChange={(e) => setBrandSearchTerm(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
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
                    placeholder="Enter custom brand"
                    value={customBrand}
                    onChange={(e) => {
                      setCustomBrand(e.target.value);
                      setValue("applianceBrand", e.target.value);
                    }}
                  />
                ) : null}
                {errors.applianceBrand && (
                  <p className="text-sm text-red-500">{errors.applianceBrand.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="modelNumber">Model Number</Label>
                <Input
                  id="modelNumber"
                  {...register("modelNumber")}
                  placeholder="Optional"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="serialNumber">Serial Number</Label>
                <Input
                  id="serialNumber"
                  {...register("serialNumber")}
                  placeholder="Optional"
                />
              </div>
            </div>

            {/* Issue Description */}
            <div className="space-y-2">
              <Label htmlFor="issueDescription">
                Issue Description <span className="text-red-500">*</span>
              </Label>
              <textarea
                id="issueDescription"
                {...register("issueDescription")}
                className="w-full min-h-[120px] px-3 py-2 text-sm border rounded-md"
                placeholder="Describe the issue in detail..."
              />
              {errors.issueDescription && (
                <p className="text-sm text-red-500">{errors.issueDescription.message}</p>
              )}
            </div>

            {/* Job Priority and Assignment */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="priority">
                  {jobType === "CALLOUT_REPAIR" ? "Urgency" : "Priority"} <span className="text-red-500">*</span>
                </Label>
                <Select value={priority} onValueChange={(value) => setValue("priority", value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder={jobType === "CALLOUT_REPAIR" ? "Select urgency" : "Select priority"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                {errors.priority && (
                  <p className="text-sm text-red-500">{errors.priority.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignedTechnicianId">Assign Technician</Label>
                <Select
                  value={assignedTechnicianId || "unassigned"}
                  onValueChange={(value) => setValue("assignedTechnicianId", value === "unassigned" ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {technicians.map((tech) => (
                      <SelectItem key={tech.id} value={tech.id}>
                        {tech.firstName} {tech.lastName} ({tech.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {jobType === "CALLOUT_REPAIR" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="calloutAddress">
                    Full Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="calloutAddress"
                    {...register("calloutAddress")}
                    onChange={(event) => {
                      setValue("calloutAddress", event.target.value, { shouldValidate: true });
                      setValue("calloutLatitude", undefined);
                      setValue("calloutLongitude", undefined);
                      setValue("googlePlaceId", undefined);
                    }}
                    placeholder={mapsApiKey ? "Start typing and select a Google address" : "Google Maps API key required"}
                    disabled={!mapsApiKey}
                  />
                  {!mapsApiKey && (
                    <p className="text-xs text-amber-700">Add a Google Maps API key in settings before creating callout jobs.</p>
                  )}
                  {errors.calloutAddress && (
                    <p className="text-sm text-red-500">{errors.calloutAddress.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="preferredCalloutDate">
                      Preferred Date/Time <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        id="preferredCalloutDate"
                        type="datetime-local"
                        {...preferredCalloutDateField}
                        onChange={(event) => {
                          preferredCalloutDateField.onChange(event);
                          setConfirmedPreferredCalloutDate("");
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="shrink-0"
                        disabled={!preferredCalloutDate}
                        onClick={async () => {
                          const isValid = await trigger("preferredCalloutDate");
                          if (!isValid || !preferredCalloutDate) {
                            return;
                          }
                          setConfirmedPreferredCalloutDate(preferredCalloutDate);
                          document.getElementById("preferredCalloutDate")?.blur();
                        }}
                      >
                        <Check className="mr-2 h-4 w-4" />
                        Confirm
                      </Button>
                    </div>
                    {confirmedPreferredCalloutDate === preferredCalloutDate && (
                      <p className="text-xs text-emerald-700">Date/time confirmed</p>
                    )}
                    {errors.preferredCalloutDate && (
                      <p className="text-sm text-red-500">{errors.preferredCalloutDate.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="calloutApplianceLocation">
                      Appliance Location <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="calloutApplianceLocation"
                      {...register("calloutApplianceLocation")}
                      placeholder="e.g., Kitchen, garage, upstairs laundry"
                    />
                    {errors.calloutApplianceLocation && (
                      <p className="text-sm text-red-500">{errors.calloutApplianceLocation.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="calloutAccessInstructions">
                      Access Instructions <span className="text-red-500">*</span>
                    </Label>
                    <textarea
                      id="calloutAccessInstructions"
                      {...register("calloutAccessInstructions")}
                      className="w-full min-h-[100px] px-3 py-2 text-sm border rounded-md"
                      placeholder="Gate codes, contact-on-arrival notes, entry details"
                    />
                    {errors.calloutAccessInstructions && (
                      <p className="text-sm text-red-500">{errors.calloutAccessInstructions.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="calloutParkingNotes">
                      Parking Notes <span className="text-red-500">*</span>
                    </Label>
                    <textarea
                      id="calloutParkingNotes"
                      {...register("calloutParkingNotes")}
                      className="w-full min-h-[100px] px-3 py-2 text-sm border rounded-md"
                      placeholder="Parking availability, permits, loading zone notes"
                    />
                    {errors.calloutParkingNotes && (
                      <p className="text-sm text-red-500">{errors.calloutParkingNotes.message}</p>
                    )}
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="estimatedCompletion">Estimated Completion Date</Label>
              <Input
                id="estimatedCompletion"
                type="date"
                {...register("estimatedCompletion")}
              />
            </div>
          </CardContent>
        </Card>

        <TermsSummary className="mt-6" />

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/jobs")}
            disabled={loading}
            className="h-11 sm:h-10"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="h-11 sm:h-10">
            {loading ? "Creating..." : "Create Job"}
          </Button>
        </div>
      </form>
    </div>
  );
}
