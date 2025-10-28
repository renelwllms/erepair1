"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Package, Clock, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";

interface JobStatus {
  jobNumber: string;
  applianceType: string;
  applianceBrand: string;
  status: string;
  priority: string;
  createdAt: string;
  estimatedCompletion?: string;
  customer: {
    firstName: string;
    lastName: string;
  };
  statusHistory: Array<{
    status: string;
    notes?: string;
    createdAt: string;
  }>;
}

export default function TrackJobPage() {
  const searchParams = useSearchParams();
  const [jobNumber, setJobNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [job, setJob] = useState<JobStatus | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const prefilledJobNumber = searchParams.get("jobNumber");
    if (prefilledJobNumber) {
      setJobNumber(prefilledJobNumber);
      handleSearch(prefilledJobNumber);
    }
  }, [searchParams]);

  const handleSearch = async (searchJobNumber?: string) => {
    const numberToSearch = searchJobNumber || jobNumber;

    if (!numberToSearch.trim()) {
      setError("Please enter a job number");
      return;
    }

    setLoading(true);
    setError("");
    setJob(null);

    try {
      const response = await fetch(
        `/api/public/track-job?jobNumber=${encodeURIComponent(numberToSearch.trim())}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Job not found. Please check your job number and try again.");
        }
        throw new Error("Failed to fetch job status");
      }

      const data = await response.json();
      setJob(data);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" => {
    const statusMap: Record<string, "default" | "secondary" | "destructive"> = {
      OPEN: "default",
      IN_PROGRESS: "default",
      AWAITING_PARTS: "secondary",
      READY_FOR_PICKUP: "secondary",
      CLOSED: "secondary",
      CANCELLED: "destructive",
    };
    return statusMap[status] || "default";
  };

  const getStatusIcon = (status: string) => {
    if (status === "CLOSED") return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (status === "CANCELLED") return <AlertCircle className="h-5 w-5 text-red-600" />;
    if (status === "READY_FOR_PICKUP") return <Package className="h-5 w-5 text-blue-600" />;
    return <Clock className="h-5 w-5 text-gray-600" />;
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, " ");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">Track Your Repair</h1>
          <p className="text-lg text-gray-600">
            Enter your job number to check the status of your repair
          </p>
        </div>

        {/* Search Card */}
        <Card>
          <CardHeader>
            <CardTitle>Job Number</CardTitle>
            <CardDescription>
              Your job number was provided when you submitted your repair request
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Enter job number (e.g., JOB-00001)"
                  value={jobNumber}
                  onChange={(e) => {
                    setJobNumber(e.target.value);
                    setError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearch();
                    }
                  }}
                  className="text-lg"
                />
              </div>
              <Button onClick={() => handleSearch()} disabled={loading} size="lg">
                <Search className="h-4 w-4 mr-2" />
                {loading ? "Searching..." : "Track"}
              </Button>
            </div>
            {error && (
              <p className="text-sm text-red-500 mt-2">{error}</p>
            )}
          </CardContent>
        </Card>

        {/* Job Status Card */}
        {job && (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{job.jobNumber}</CardTitle>
                  <CardDescription className="text-base mt-1">
                    {job.applianceType} - {job.applianceBrand}
                  </CardDescription>
                </div>
                {getStatusIcon(job.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Status */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <p className="text-sm text-gray-600 mb-2">Current Status</p>
                <div className="flex items-center gap-3">
                  <Badge variant={getStatusBadgeVariant(job.status)} className="text-lg px-4 py-2">
                    {formatStatus(job.status)}
                  </Badge>
                  {job.status === "READY_FOR_PICKUP" && (
                    <p className="text-sm text-blue-600 font-medium">
                      Your appliance is ready! Please come pick it up.
                    </p>
                  )}
                  {job.status === "CLOSED" && (
                    <p className="text-sm text-green-600 font-medium">
                      This job has been completed.
                    </p>
                  )}
                </div>
              </div>

              {/* Job Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Customer</p>
                  <p className="text-sm mt-1">
                    {job.customer.firstName} {job.customer.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Submitted</p>
                  <p className="text-sm mt-1">
                    {new Date(job.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                {job.estimatedCompletion && (
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-gray-600">Estimated Completion</p>
                    <p className="text-sm mt-1">
                      {new Date(job.estimatedCompletion).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                )}
              </div>

              {/* Status Timeline */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Status History</h3>
                <div className="space-y-4">
                  {job.statusHistory.map((entry, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            index === 0 ? "bg-blue-500" : "bg-gray-300"
                          }`}
                        />
                        {index < job.statusHistory.length - 1 && (
                          <div className="w-0.5 h-full bg-gray-200 my-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center gap-2">
                          <Badge variant={getStatusBadgeVariant(entry.status)}>
                            {formatStatus(entry.status)}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(entry.createdAt).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {entry.notes && entry.notes !== "Job created" && (
                          <p className="text-sm text-gray-600 mt-1">{entry.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="border-t pt-6 space-y-3">
                <p className="text-sm text-gray-600 text-center">
                  Need help? Contact us at support@erepair.com or call (555) 123-4567
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setJob(null);
                    setJobNumber("");
                    setError("");
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Track Another Job
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Help Section */}
        {!job && !loading && (
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-lg">Need Help?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="font-medium text-gray-800">Can't find your job number?</p>
                <p className="text-gray-600">
                  Check your email for the confirmation message we sent when you submitted your repair request.
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-800">Job number format</p>
                <p className="text-gray-600">
                  Job numbers are in the format JOB-00001 (letters "JOB" followed by a dash and 5 digits).
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-800">Need to submit a repair?</p>
                <Button
                  variant="link"
                  className="p-0 h-auto text-blue-600"
                  onClick={() => (window.location.href = "/submit-job")}
                >
                  Click here to submit a new repair request
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
