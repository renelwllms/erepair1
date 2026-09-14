"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

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
  jobType: z.enum(["WORKSHOP_REPAIR", "CALLOUT_REPAIR"]).optional(),
  applianceBrand: z.string().min(1, "Appliance brand is required"),
  applianceType: z.string().min(1, "Appliance type is required"),
  modelNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  issueDescription: z.string().min(1, "Issue description is required"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  assignedTechnicianId: z.string().optional(),
  warrantyStatus: z.string().optional(),
  serviceLocation: z.string().optional(),
  estimatedCompletion: z.string().optional(),
  laborHours: z.number().optional(),
  diagnosticFeeAmount: z.number().min(0).optional(),
  diagnosticResults: z.string().optional(),
  technicianNotes: z.string().optional(),
  customerNotes: z.string().optional(),
  calloutAddress: z.string().optional(),
  calloutLatitude: z.number().optional(),
  calloutLongitude: z.number().optional(),
  distanceFromOfficeKm: z.number().optional(),
  estimatedTravelTime: z.string().optional(),
  preferredCalloutDate: z.string().optional(),
  calloutAccessInstructions: z.string().optional(),
  calloutParkingNotes: z.string().optional(),
  calloutApplianceLocation: z.string().optional(),
  calloutFee: z.number().min(0).optional(),
});

type JobFormData = z.infer<typeof jobSchema>;

interface Technician {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

export default function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [customApplianceType, setCustomApplianceType] = useState("");
  const [customBrand, setCustomBrand] = useState("");
  const [applianceSearchTerm, setApplianceSearchTerm] = useState("");
  const [brandSearchTerm, setBrandSearchTerm] = useState("");
  const [confirmedPreferredCalloutDate, setConfirmedPreferredCalloutDate] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
  });

  const priority = watch("priority");
  const assignedTechnicianId = watch("assignedTechnicianId");
  const applianceType = watch("applianceType");
  const applianceBrand = watch("applianceBrand");
  const jobType = watch("jobType");
  const preferredCalloutDate = watch("preferredCalloutDate");
  const preferredCalloutDateField = register("preferredCalloutDate");

  // Filtered lists for searchable dropdowns
  const filteredAppliances = COMMON_APPLIANCES.filter((appliance) =>
    appliance.toLowerCase().includes(applianceSearchTerm.toLowerCase())
  );

  const filteredBrands = COMMON_BRANDS.filter((brand) =>
    brand.toLowerCase().includes(brandSearchTerm.toLowerCase())
  );

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [jobRes, techniciansRes, settingsRes] = await Promise.all([
        fetch(`/api/jobs/${id}`),
        fetch("/api/users/technicians"),
        fetch("/api/settings"),
      ]);

      if (!jobRes.ok) {
        throw new Error("Failed to fetch job");
      }

      const job = await jobRes.json();

      // Set form values
      setValue("jobType", job.jobType || (job.isCallout ? "CALLOUT_REPAIR" : "WORKSHOP_REPAIR"));
      setValue("applianceBrand", job.applianceBrand);
      setValue("applianceType", job.applianceType);
      setValue("modelNumber", job.modelNumber || "");
      setValue("serialNumber", job.serialNumber || "");
      setValue("issueDescription", job.issueDescription);
      setValue("priority", job.priority);
      setValue("assignedTechnicianId", job.assignedTechnicianId || undefined);
      setValue("warrantyStatus", job.warrantyStatus || "");
      setValue("laborHours", job.laborHours || 0);
      setValue("diagnosticFeeAmount", job.diagnosticFeeAmount || 0);
      setValue("diagnosticResults", job.diagnosticResults || "");
      setValue("technicianNotes", job.technicianNotes || "");
      setValue("customerNotes", job.customerNotes || "");
      setValue("calloutAddress", job.calloutAddress || "");
      setValue("calloutLatitude", job.calloutLatitude ?? undefined);
      setValue("calloutLongitude", job.calloutLongitude ?? undefined);
      setValue("distanceFromOfficeKm", job.distanceFromOfficeKm ?? undefined);
      setValue("estimatedTravelTime", job.estimatedTravelTime || undefined);
      setValue("calloutAccessInstructions", job.calloutAccessInstructions || "");
      setValue("calloutParkingNotes", job.calloutParkingNotes || "");
      setValue("calloutApplianceLocation", job.calloutApplianceLocation || "");
      setValue("calloutFee", job.calloutFee ?? undefined);

      if (job.estimatedCompletion) {
        const date = new Date(job.estimatedCompletion);
        setValue("estimatedCompletion", date.toISOString().split('T')[0]);
      }

      if (job.preferredCalloutDate) {
        const date = new Date(job.preferredCalloutDate);
        const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        setValue("preferredCalloutDate", localDate.toISOString().slice(0, 16));
      }

      if (techniciansRes.ok) {
        const techData = await techniciansRes.json();
        setTechnicians(techData);
      }

      if (settingsRes.ok) {
        const settings = await settingsRes.json();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load job data",
        variant: "destructive",
      });
      router.push("/jobs");
    } finally {
      setLoadingData(false);
    }
  };

  const onSubmit = async (data: JobFormData) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/jobs/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update job");
      }

      toast({
        title: "Success",
        description: "Job updated successfully",
      });

      router.push(`/jobs/${id}`);
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-lg mt-4">Loading job data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/jobs/${id}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Job Information</CardTitle>
            <CardDescription>Update the details below to modify the job</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Appliance Information */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="applianceType">
                  Appliance Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={applianceType}
                  onValueChange={(value) => {
                    if (value === "Other") {
                      setCustomApplianceType("");
                      setValue("applianceType", "");
                    } else {
                      setValue("applianceType", value);
                    }
                    setApplianceSearchTerm("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select appliance type" />
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
                {applianceType === "Other" || (!applianceType && customApplianceType !== undefined) ? (
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
                <Label htmlFor="applianceBrand">
                  Brand <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={applianceBrand}
                  onValueChange={(value) => {
                    if (value === "Other") {
                      setCustomBrand("");
                      setValue("applianceBrand", "");
                    } else {
                      setValue("applianceBrand", value);
                    }
                    setBrandSearchTerm("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select brand" />
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
                {applianceBrand === "Other" || (!applianceBrand && customBrand !== undefined) ? (
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
                  {jobType === "CALLOUT_REPAIR" ? "Urgency" : "Priority"}
                  {jobType !== "CALLOUT_REPAIR" && <span className="text-red-500"> *</span>}
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
                    Full Address
                  </Label>
                  <Input
                    id="calloutAddress"
                    {...register("calloutAddress")}
                    placeholder="Enter the full address"
                  />
                  {errors.calloutAddress && (
                    <p className="text-sm text-red-500">{errors.calloutAddress.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="preferredCalloutDate">
                      Preferred Date/Time
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
                    <Label htmlFor="calloutFee">Callout Fee</Label>
                    <Input
                      id="calloutFee"
                      type="number"
                      min="0"
                      step="0.01"
                      {...register("calloutFee", { valueAsNumber: true })}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="calloutApplianceLocation">
                      Appliance Location
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

                  <div className="space-y-2">
                    <Label>Travel Estimate</Label>
                    <div className="rounded-md border px-3 py-2 text-sm text-gray-700">
                      {watch("distanceFromOfficeKm") ? `${watch("distanceFromOfficeKm")?.toFixed(1)} km` : "Distance pending"}
                      {watch("estimatedTravelTime") ? `, ${watch("estimatedTravelTime")}` : ""}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="calloutAccessInstructions">
                      Access Instructions
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
                      Parking Notes
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

            {/* Additional Information */}
            <div className="space-y-2">
              <div className="space-y-2">
                <Label htmlFor="warrantyStatus">Warranty Status</Label>
                <Input
                  id="warrantyStatus"
                  {...register("warrantyStatus")}
                  placeholder="e.g., In Warranty, Out of Warranty"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="estimatedCompletion">Estimated Completion Date</Label>
                <Input
                  id="estimatedCompletion"
                  type="date"
                  {...register("estimatedCompletion")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="laborHours">Labor Hours</Label>
                <Input
                  id="laborHours"
                  type="number"
                  step="0.5"
                  {...register("laborHours", { valueAsNumber: true })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="diagnosticFeeAmount">Diagnostic Fee</Label>
                <Input
                  id="diagnosticFeeAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  {...register("diagnosticFeeAmount", { valueAsNumber: true })}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Diagnostic Results */}
            <div className="space-y-2">
              <Label htmlFor="diagnosticResults">Diagnostic Results</Label>
              <textarea
                id="diagnosticResults"
                {...register("diagnosticResults")}
                className="w-full min-h-[100px] px-3 py-2 text-sm border rounded-md"
                placeholder="Enter diagnostic findings..."
              />
            </div>

            {/* Technician Notes */}
            <div className="space-y-2">
              <Label htmlFor="technicianNotes">Technician Notes</Label>
              <textarea
                id="technicianNotes"
                {...register("technicianNotes")}
                className="w-full min-h-[100px] px-3 py-2 text-sm border rounded-md"
                placeholder="Internal notes for technicians..."
              />
            </div>

            {/* Customer Notes */}
            <div className="space-y-2">
              <Label htmlFor="customerNotes">Customer Notes</Label>
              <textarea
                id="customerNotes"
                {...register("customerNotes")}
                className="w-full min-h-[100px] px-3 py-2 text-sm border rounded-md"
                placeholder="Notes visible to customer..."
              />
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/jobs/${id}`)}
            disabled={loading}
            className="h-11 sm:h-10"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="h-11 sm:h-10">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Job"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
