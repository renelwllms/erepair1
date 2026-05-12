"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CheckCircle,
  MapPin,
  Calendar,
  Loader2,
  User,
  DollarSign,
  AlertCircle,
  FileText
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const calloutBookingSchema = z.object({
  phone: z.string().min(1, "Phone is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  address: z.string().min(5, "Please enter a complete address"),
  city: z.string().min(1, "City is required"),
  postcode: z.string().min(4, "Valid postcode required"),
  serviceDescription: z.string().min(10, "Please provide more details (at least 10 characters)"),
  preferredDate: z.string().min(1, "Preferred date is required"),
  acceptTerms: z.boolean().refine(val => val === true, "You must accept the callout terms"),
  preferredContactMethod: z.enum(["EMAIL", "PHONE"]),
});

type CalloutBookingFormData = z.infer<typeof calloutBookingSchema>;

export default function BookCalloutPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [jobNumber, setJobNumber] = useState("");
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [customerFound, setCustomerFound] = useState(false);
  const [detectedLocation, setDetectedLocation] = useState<string | null>(null);
  const [calloutFee, setCalloutFee] = useState<number | null>(null);
  const [calloutTerms, setCalloutTerms] = useState<string>("");
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CalloutBookingFormData>({
    resolver: zodResolver(calloutBookingSchema),
    defaultValues: {
      preferredContactMethod: "EMAIL",
      acceptTerms: false,
    },
  });

  const phone = watch("phone");
  const address = watch("address");
  const city = watch("city");
  const postcode = watch("postcode");
  const preferredContactMethod = watch("preferredContactMethod");
  const acceptTerms = watch("acceptTerms");

  // Fetch company settings and callout terms on mount
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
        if (data.calloutTerms) {
          setCalloutTerms(data.calloutTerms);
        }
      }
    } catch (error) {
      console.error("Error fetching company settings:", error);
    }
  };

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

    const timeoutId = setTimeout(() => {
      searchCustomer(value);
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  // Detect location and fee based on address
  const detectLocation = async () => {
    if (!address || !city || !postcode) {
      return;
    }

    setDetectingLocation(true);
    setLocationError(null);

    try {
      const fullAddress = `${address}, ${city}, ${postcode}`;
      const response = await fetch(`/api/public/geocode?address=${encodeURIComponent(fullAddress)}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to verify address");
      }

      if (result.calloutLocation && result.calloutFee !== undefined) {
        setDetectedLocation(result.calloutLocation);
        setCalloutFee(result.calloutFee);
        setLocationError(null);
      } else {
        setDetectedLocation(null);
        setCalloutFee(null);
        setLocationError("Address is outside our service area");
      }
    } catch (error: any) {
      console.error("Error detecting location:", error);
      setDetectedLocation(null);
      setCalloutFee(null);
      setLocationError(error.message || "Unable to verify address");
    } finally {
      setDetectingLocation(false);
    }
  };

  // Detect location when address changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (address && city && postcode) {
        detectLocation();
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [address, city, postcode]);

  const onSubmit = async (data: CalloutBookingFormData) => {
    // Verify location is detected
    if (!detectedLocation || calloutFee === null) {
      alert("Please enter a valid address within our service area");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/public/book-callout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to book callout");
      }

      setJobNumber(result.jobNumber);
      setSubmitted(true);
    } catch (error: any) {
      alert(error.message || "Failed to book callout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-green-900">
              Callout Booking Confirmed!
            </CardTitle>
            <CardDescription className="text-lg">
              Your booking number is: <span className="font-bold text-blue-600">{jobNumber}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription>
                <p className="font-semibold text-blue-900 mb-2">What happens next:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                  <li>Our team will review your booking within 2 business hours</li>
                  <li>We&apos;ll contact you to confirm the exact time slot</li>
                  <li>A technician will arrive on your preferred date</li>
                  <li>After diagnosis, we&apos;ll provide a quote for any repairs needed</li>
                </ol>
              </AlertDescription>
            </Alert>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-amber-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-amber-900">Callout Fee: ${calloutFee?.toFixed(2)}</h3>
                  <p className="text-sm text-amber-800 mt-1">
                    Location: {detectedLocation}
                  </p>
                  <p className="text-xs text-amber-700 mt-2">
                    This fee covers travel and diagnostic assessment. Any parts or additional labor will be quoted separately.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                A confirmation email has been sent to your email address with all the details.
              </p>
              <p className="text-sm text-gray-600">
                You can track your booking status anytime using your booking number.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                className="flex-1"
                onClick={() => window.location.href = `/track-job?jobNumber=${jobNumber}`}
              >
                Track Booking
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.location.href = "/"}
              >
                Return Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          {companyLogo && (
            <img
              src={companyLogo}
              alt={companyName}
              className="h-16 mx-auto mb-4"
            />
          )}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Book a Callout Service
          </h1>
          <p className="text-gray-600">
            Get expert service at your location with transparent pricing
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Your Information
              </CardTitle>
              <CardDescription>
                We&apos;ll use this to contact you and confirm your booking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="021 234 5678"
                  {...register("phone")}
                  onChange={handlePhoneChange}
                />
                {searchingCustomer && (
                  <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Searching...
                  </p>
                )}
                {customerFound && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Welcome back! We&apos;ve pre-filled your details.
                  </p>
                )}
                {errors.phone && (
                  <p className="text-xs text-red-600 mt-1">{errors.phone.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    {...register("firstName")}
                    placeholder="John"
                  />
                  {errors.firstName && (
                    <p className="text-xs text-red-600 mt-1">{errors.firstName.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    {...register("lastName")}
                    placeholder="Smith"
                  />
                  {errors.lastName && (
                    <p className="text-xs text-red-600 mt-1">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="john.smith@example.com"
                />
                {errors.email && (
                  <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <Label>Preferred Contact Method *</Label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="EMAIL"
                      {...register("preferredContactMethod")}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Email</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="PHONE"
                      {...register("preferredContactMethod")}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Phone</span>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Visit Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Visit Address
              </CardTitle>
              <CardDescription>
                Where should our technician visit?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="address">Street Address *</Label>
                <Input
                  id="address"
                  {...register("address")}
                  placeholder="123 Main Street"
                />
                {errors.address && (
                  <p className="text-xs text-red-600 mt-1">{errors.address.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City / Suburb *</Label>
                  <Input
                    id="city"
                    {...register("city")}
                    placeholder="Auckland"
                  />
                  {errors.city && (
                    <p className="text-xs text-red-600 mt-1">{errors.city.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="postcode">Postcode *</Label>
                  <Input
                    id="postcode"
                    {...register("postcode")}
                    placeholder="1010"
                  />
                  {errors.postcode && (
                    <p className="text-xs text-red-600 mt-1">{errors.postcode.message}</p>
                  )}
                </div>
              </div>

              {/* Location Detection Status */}
              {detectingLocation && (
                <Alert className="bg-blue-50 border-blue-200">
                  <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                  <AlertDescription className="text-blue-800">
                    Verifying address and calculating callout fee...
                  </AlertDescription>
                </Alert>
              )}

              {locationError && (
                <Alert className="bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    {locationError}
                  </AlertDescription>
                </Alert>
              )}

              {detectedLocation && calloutFee !== null && !detectingLocation && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    <div className="text-green-900">
                      <p className="font-semibold">Location verified: {detectedLocation}</p>
                      <p className="text-lg font-bold mt-1">Callout Fee: ${calloutFee.toFixed(2)}</p>
                      <p className="text-xs mt-1 text-green-700">
                        This fee covers travel and diagnostic assessment (up to 1 hour)
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Service Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Service Details
              </CardTitle>
              <CardDescription>
                Tell us what you need help with
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="serviceDescription">What service do you need? *</Label>
                <textarea
                  id="serviceDescription"
                  {...register("serviceDescription")}
                  className="w-full min-h-[120px] px-3 py-2 text-sm border rounded-md resize-y"
                  placeholder="Please describe the appliance issue or service you need. For example: 'Washing machine not spinning' or 'Refrigerator making loud noise'"
                />
                {errors.serviceDescription && (
                  <p className="text-xs text-red-600 mt-1">{errors.serviceDescription.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="preferredDate">Preferred Date *</Label>
                <Input
                  id="preferredDate"
                  type="date"
                  {...register("preferredDate")}
                  min={new Date().toISOString().split('T')[0]}
                />
                <p className="text-xs text-gray-500 mt-1">
                  We&apos;ll contact you to confirm the exact time slot
                </p>
                {errors.preferredDate && (
                  <p className="text-xs text-red-600 mt-1">{errors.preferredDate.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Terms and Conditions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="acceptTerms"
                  checked={acceptTerms}
                  onCheckedChange={(checked) => setValue("acceptTerms", checked as boolean)}
                />
                <div className="flex-1">
                  <Label htmlFor="acceptTerms" className="cursor-pointer">
                    I accept the callout terms and conditions *
                  </Label>
                  {calloutTerms && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="link" className="p-0 h-auto text-xs text-blue-600">
                          Read terms and conditions
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Callout Terms & Conditions</DialogTitle>
                          <DialogDescription>
                            Please review these terms before booking
                          </DialogDescription>
                        </DialogHeader>
                        <div className="whitespace-pre-wrap text-sm">
                          {calloutTerms}
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                  {errors.acceptTerms && (
                    <p className="text-xs text-red-600 mt-1">{errors.acceptTerms.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardContent className="pt-6">
              <Button
                type="submit"
                disabled={loading || !detectedLocation || calloutFee === null}
                className="w-full h-12 text-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Booking...
                  </>
                ) : (
                  <>
                    <Calendar className="mr-2 h-5 w-5" />
                    Confirm Booking
                  </>
                )}
              </Button>
              {(!detectedLocation || calloutFee === null) && (
                <p className="text-xs text-center text-gray-500 mt-2">
                  Please enter a valid address to continue
                </p>
              )}
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
