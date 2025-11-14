"use client";

import { useState, useRef, useEffect } from "react";
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
import { CheckCircle, Wrench, Camera, Loader2, User } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

const jobSubmissionSchema = z.object({
  phone: z.string().min(1, "Phone is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  applianceBrand: z.string().min(1, "Appliance brand is required"),
  applianceType: z.string().min(1, "Appliance type is required"),
  modelNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  issueDescription: z.string().min(10, "Please provide more details (at least 10 characters)"),
  preferredContactMethod: z.enum(["EMAIL", "PHONE"]),
});

type JobSubmissionFormData = z.infer<typeof jobSubmissionSchema>;

export default function SubmitJobPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [jobNumber, setJobNumber] = useState("");
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [customerFound, setCustomerFound] = useState(false);
  const [devicePhoto, setDevicePhoto] = useState<string | null>(null);
  const [capturingPhoto, setCapturingPhoto] = useState(false);
  const [customApplianceType, setCustomApplianceType] = useState("");
  const [customBrand, setCustomBrand] = useState("");
  const [applianceSearchTerm, setApplianceSearchTerm] = useState("");
  const [brandSearchTerm, setBrandSearchTerm] = useState("");
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<JobSubmissionFormData>({
    resolver: zodResolver(jobSubmissionSchema),
    defaultValues: {
      preferredContactMethod: "EMAIL",
    },
  });

  const phone = watch("phone");
  const preferredContactMethod = watch("preferredContactMethod");
  const applianceType = watch("applianceType");
  const applianceBrand = watch("applianceBrand");

  // Filtered lists for searchable dropdowns
  const filteredAppliances = COMMON_APPLIANCES.filter((appliance) =>
    appliance.toLowerCase().includes(applianceSearchTerm.toLowerCase())
  );

  const filteredBrands = COMMON_BRANDS.filter((brand) =>
    brand.toLowerCase().includes(brandSearchTerm.toLowerCase())
  );

  // Fetch company logo and name on mount
  const fetchCompanySettings = async () => {
    try {
      const response = await fetch("/api/public/settings");
      if (response.ok) {
        const data = await response.json();
        if (data.companyLogo) {
          setCompanyLogo(data.companyLogo);
        }
        if (data.companyName) {
          setCompanyName(data.companyName);
        }
      }
    } catch (error) {
      console.error("Error fetching company settings:", error);
    }
  };

  // useEffect to fetch settings on mount
  useEffect(() => {
    fetchCompanySettings();
  }, []);

  // Search for customer by phone number
  const searchCustomer = async (phoneNumber: string) => {
    if (!phoneNumber || phoneNumber.length < 3) {
      setCustomerFound(false);
      return;
    }

    setSearchingCustomer(true);
    try {
      const response = await fetch(`/api/public/search-customer?phone=${encodeURIComponent(phoneNumber)}`);
      const result = await response.json();

      if (result.found) {
        // Pre-fill customer information
        setValue("firstName", result.customer.firstName);
        setValue("lastName", result.customer.lastName);
        setValue("email", result.customer.email);
        setCustomerFound(true);
      } else {
        setCustomerFound(false);
      }
    } catch (error) {
      console.error("Error searching customer:", error);
      setCustomerFound(false);
    } finally {
      setSearchingCustomer(false);
    }
  };

  // Handle phone input change with debounce
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setValue("phone", value);

    // Debounce search
    const timeoutId = setTimeout(() => {
      searchCustomer(value);
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  // Camera photo capture
  const startCameraCapture = async () => {
    setCapturingPhoto(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" } // Use back camera on mobile
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      alert("Failed to access camera. Please ensure you have granted camera permissions.");
      setCapturingPhoto(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const photoData = canvas.toDataURL("image/jpeg", 0.8);
        setDevicePhoto(photoData);

        // Stop camera
        const stream = video.srcObject as MediaStream;
        stream?.getTracks().forEach(track => track.stop());
        setCapturingPhoto(false);
      }
    }
  };

  const cancelCapture = () => {
    if (videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
    }
    setCapturingPhoto(false);
  };

  const onSubmit = async (data: JobSubmissionFormData) => {
    setLoading(true);
    try {
      const response = await fetch("/api/public/submit-job", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          devicePhoto: devicePhoto || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit job");
      }

      setJobNumber(result.jobNumber);
      setSubmitted(true);
    } catch (error: any) {
      alert(error.message || "Failed to submit job. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Job Submitted Successfully!</CardTitle>
            <CardDescription className="text-lg">
              Your repair request has been received
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
              <p className="text-sm text-gray-600 mb-2">Your Job Number</p>
              <p className="text-3xl font-bold text-blue-600">{jobNumber}</p>
              <p className="text-sm text-gray-500 mt-2">
                Please save this number for your records
              </p>
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 font-semibold text-xs">1</span>
                </div>
                <div>
                  <p className="font-medium">Confirmation Email</p>
                  <p className="text-gray-600">
                    You will receive a confirmation email shortly with your job details.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 font-semibold text-xs">2</span>
                </div>
                <div>
                  <p className="font-medium">Initial Assessment</p>
                  <p className="text-gray-600">
                    Our team will review your submission and contact you within 24 hours.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 font-semibold text-xs">3</span>
                </div>
                <div>
                  <p className="font-medium">Track Your Repair</p>
                  <p className="text-gray-600">
                    Use your job number to check the status of your repair anytime.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t pt-6 space-y-3">
              <Button
                className="w-full"
                size="lg"
                onClick={() => window.location.href = `/track-job?jobNumber=${jobNumber}`}
              >
                Track My Job Status
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.location.reload()}
              >
                Submit Another Job
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Camera capture view
  if (capturingPhoto) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        <div className="flex-1 relative">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
          />
          <canvas ref={canvasRef} className="hidden" />
        </div>
        <div className="p-6 bg-black bg-opacity-90 space-y-4">
          <p className="text-white text-center mb-4">
            Position the device in the frame and capture
          </p>
          <div className="flex gap-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={cancelCapture}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={capturePhoto}
            >
              <Camera className="h-5 w-5 mr-2" />
              Capture Photo
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          {/* Company Logo */}
          {companyLogo && (
            <div className="mx-auto mb-6 flex items-center justify-center">
              <img
                src={companyLogo}
                alt={companyName || "Company Logo"}
                className="max-h-40 max-w-[400px] object-contain"
              />
            </div>
          )}
          {!companyLogo && (
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Wrench className="h-8 w-8 text-blue-600" />
            </div>
          )}
          <CardTitle className="text-2xl">Submit a Repair Request</CardTitle>
          <CardDescription className="text-base">
            Fill out the form below and we'll get back to you shortly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Phone Number - First Field */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Contact Information</h3>

              <Alert className="bg-blue-50 border-blue-200">
                <User className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>Tip:</strong> Enter your phone number first. We'll automatically search for your existing records and fill in your details to save you time!
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  Phone Number <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="phone"
                    {...register("phone")}
                    onChange={handlePhoneChange}
                    placeholder="(555) 123-4567"
                    className="pr-10"
                  />
                  {searchingCustomer && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                  )}
                </div>
                {errors.phone && (
                  <p className="text-sm text-red-500">{errors.phone.message}</p>
                )}
                {customerFound && !searchingCustomer && (
                  <Alert className="bg-green-50 border-green-200">
                    <User className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Welcome back! We found your information.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

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
                  <Label htmlFor="preferredContactMethod">
                    Preferred Contact Method <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={preferredContactMethod}
                    onValueChange={(value) =>
                      setValue("preferredContactMethod", value as "EMAIL" | "PHONE")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMAIL">Email</SelectItem>
                      <SelectItem value="PHONE">Phone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Appliance Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Device Details</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="applianceType">
                    Device Type <span className="text-red-500">*</span>
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
                      <SelectValue placeholder="Select or type to search device type" />
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
                      placeholder="Enter custom device type"
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="modelNumber">Model Number (Optional)</Label>
                  <Input
                    id="modelNumber"
                    {...register("modelNumber")}
                    placeholder="Model number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serialNumber">Serial Number (Optional)</Label>
                  <Input
                    id="serialNumber"
                    {...register("serialNumber")}
                    placeholder="Serial number"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="issueDescription">
                  What's wrong with your device? <span className="text-red-500">*</span>
                </Label>
                <textarea
                  id="issueDescription"
                  {...register("issueDescription")}
                  className="w-full min-h-[120px] px-3 py-2 text-sm border rounded-md"
                  placeholder="Please describe the problem in detail. The more information you provide, the better we can help you..."
                />
                {errors.issueDescription && (
                  <p className="text-sm text-red-500">{errors.issueDescription.message}</p>
                )}
              </div>

              {/* Device Photo */}
              <div className="space-y-2">
                <Label>Device Photo</Label>
                {devicePhoto ? (
                  <div className="space-y-2">
                    <img
                      src={devicePhoto}
                      alt="Device"
                      className="w-full max-w-sm rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDevicePhoto(null)}
                    >
                      Remove Photo
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={startCameraCapture}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Take Photo of Device
                  </Button>
                )}
                <p className="text-xs text-gray-500">
                  Take a photo to document the condition of your device
                </p>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Repair Request"
              )}
            </Button>

            <p className="text-xs text-center text-gray-500">
              By submitting this form, you agree to our terms of service and privacy policy.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
