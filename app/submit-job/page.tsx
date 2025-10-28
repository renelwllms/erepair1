"use client";

import { useState } from "react";
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
import { CheckCircle, Wrench } from "lucide-react";

const jobSubmissionSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone is required"),
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

  const preferredContactMethod = watch("preferredContactMethod");

  const onSubmit = async (data: JobSubmissionFormData) => {
    setLoading(true);
    try {
      const response = await fetch("/api/public/submit-job", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Wrench className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Submit a Repair Request</CardTitle>
          <CardDescription className="text-base">
            Fill out the form below and we'll get back to you shortly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Customer Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Your Information</h3>

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

            {/* Appliance Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Appliance Details</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="applianceType">
                    Appliance Type <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="applianceType"
                    {...register("applianceType")}
                    placeholder="e.g., Refrigerator, Washing Machine"
                  />
                  {errors.applianceType && (
                    <p className="text-sm text-red-500">{errors.applianceType.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="applianceBrand">
                    Brand <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="applianceBrand"
                    {...register("applianceBrand")}
                    placeholder="e.g., Samsung, LG, Whirlpool"
                  />
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
                  What's wrong with your appliance? <span className="text-red-500">*</span>
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
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading}
            >
              {loading ? "Submitting..." : "Submit Repair Request"}
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
