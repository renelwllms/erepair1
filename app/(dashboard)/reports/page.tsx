"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
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
import { FileSpreadsheet, FileText } from "lucide-react";
import jsPDF from "jspdf";

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/reports?start=${startDate}&end=${endDate}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load reports");
      }
      setReportData(data);
    } catch (error) {
      console.error("Failed to load reports:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount || 0);

  const rangeLabel = useMemo(() => {
    if (!reportData?.range) return "";
    return `${format(new Date(reportData.range.startDate), "MMM dd, yyyy")} - ${format(
      new Date(reportData.range.endDate),
      "MMM dd, yyyy"
    )}`;
  }, [reportData]);

  const exportCsv = () => {
    if (!reportData) return;

    const lines: string[] = [];
    lines.push(`Reports (${rangeLabel})`);
    lines.push("");
    lines.push("Financial Summary");
    lines.push(`Gross Revenue,${reportData.financial.grossRevenue}`);
    lines.push(`Refunds,${reportData.financial.totalRefunds}`);
    lines.push(`Net Revenue,${reportData.financial.netRevenue}`);
    lines.push(`Gross Paid,${reportData.financial.grossPaid}`);
    lines.push(`Net Paid,${reportData.financial.netPaid}`);
    lines.push(`Outstanding Balance,${reportData.financial.totalOutstanding}`);
    lines.push(`Invoice Count,${reportData.financial.invoiceCount}`);
    lines.push(`Average Invoice,${reportData.financial.avgInvoice}`);
    lines.push("");
    lines.push("Job Completion");
    lines.push(`Total Jobs,${reportData.jobs.totalJobs}`);
    lines.push(`Completed Jobs,${reportData.jobs.completedJobs}`);
    lines.push(`Completion Rate,${reportData.jobs.completionRate}`);
    lines.push(`Avg Completion Days,${reportData.jobs.avgCompletionDays}`);
    lines.push("");
    lines.push("Technician Productivity");
    lines.push("Technician,Completed Jobs,Open Jobs,Avg Completion Days");
    reportData.technicians.forEach((tech: any) => {
      lines.push(
        `${tech.name},${tech.completedJobs},${tech.openJobs},${tech.avgCompletionDays.toFixed(1)}`
      );
    });
    lines.push("");
    lines.push("Customer Analytics");
    lines.push("Customer,Email,Net Revenue,Job Count,Avg Invoice");
    reportData.customers.forEach((cust: any) => {
      lines.push(
        `${cust.name},${cust.email},${cust.totalRevenue},${cust.jobCount},${cust.avgInvoice}`
      );
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reports-${startDate}-to-${endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    if (!reportData) return;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Reports (${rangeLabel})`, 14, 18);

    doc.setFontSize(11);
    let y = 30;
    doc.text("Financial Summary", 14, y);
    y += 6;
    doc.text(`Gross Revenue: ${formatCurrency(reportData.financial.grossRevenue)}`, 14, y);
    y += 5;
    doc.text(`Refunds: ${formatCurrency(reportData.financial.totalRefunds)}`, 14, y);
    y += 5;
    doc.text(`Net Revenue: ${formatCurrency(reportData.financial.netRevenue)}`, 14, y);
    y += 5;
    doc.text(`Net Paid: ${formatCurrency(reportData.financial.netPaid)}`, 14, y);
    y += 5;
    doc.text(`Outstanding: ${formatCurrency(reportData.financial.totalOutstanding)}`, 14, y);
    y += 5;
    doc.text(`Invoices: ${reportData.financial.invoiceCount}`, 14, y);
    y += 5;
    doc.text(`Average Invoice: ${formatCurrency(reportData.financial.avgInvoice)}`, 14, y);
    y += 10;

    doc.text("Job Completion", 14, y);
    y += 6;
    doc.text(`Total Jobs: ${reportData.jobs.totalJobs}`, 14, y);
    y += 5;
    doc.text(`Completed Jobs: ${reportData.jobs.completedJobs}`, 14, y);
    y += 5;
    doc.text(`Completion Rate: ${reportData.jobs.completionRate.toFixed(1)}%`, 14, y);
    y += 5;
    doc.text(`Avg Completion Days: ${reportData.jobs.avgCompletionDays.toFixed(1)}`, 14, y);
    y += 10;

    doc.text("Technician Productivity", 14, y);
    y += 6;
    reportData.technicians.slice(0, 8).forEach((tech: any) => {
      doc.text(
        `${tech.name}: ${tech.completedJobs} completed, ${tech.openJobs} open, ${tech.avgCompletionDays.toFixed(1)} days avg`,
        14,
        y
      );
      y += 5;
    });

    y += 6;
    doc.text("Customer Analytics", 14, y);
    y += 6;
    reportData.customers.slice(0, 8).forEach((cust: any) => {
      doc.text(
        `${cust.name}: ${formatCurrency(cust.totalRevenue)} revenue, ${cust.jobCount} jobs`,
        14,
        y
      );
      y += 5;
    });

    doc.save(`reports-${startDate}-to-${endDate}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-gray-600 mt-1">Business insights and performance metrics</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reports Dashboard</CardTitle>
          <CardDescription>Financials, job completion, productivity, and customer insights.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="w-[180px]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="w-[180px]"
              />
            </div>
            <Button onClick={fetchReports} disabled={loading}>
              {loading ? "Loading..." : "Refresh Report"}
            </Button>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" onClick={exportPdf} disabled={!reportData}>
                <FileText className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button variant="outline" onClick={exportCsv} disabled={!reportData}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {reportData && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle>Net Revenue</CardTitle>
                <CardDescription>{rangeLabel}</CardDescription>
              </CardHeader>
              <CardContent className="text-2xl font-bold">
                {formatCurrency(reportData.financial.netRevenue)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Refunds</CardTitle>
                <CardDescription>Deducted from revenue</CardDescription>
              </CardHeader>
              <CardContent className="text-2xl font-bold text-red-600">
                {formatCurrency(reportData.financial.totalRefunds)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Outstanding Balance</CardTitle>
                <CardDescription>Open invoices</CardDescription>
              </CardHeader>
              <CardContent className="text-2xl font-bold text-red-600">
                {formatCurrency(reportData.financial.totalOutstanding)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Invoices Issued</CardTitle>
                <CardDescription>Gross total: {formatCurrency(reportData.financial.grossRevenue)}</CardDescription>
              </CardHeader>
              <CardContent className="text-2xl font-bold">
                {reportData.financial.invoiceCount}{" "}
                <span className="text-sm font-medium text-gray-500">
                  ({formatCurrency(reportData.financial.avgInvoice)})
                </span>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Job Completion</CardTitle>
                <CardDescription>Performance overview</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span>Total Jobs</span>
                  <span className="font-semibold">{reportData.jobs.totalJobs}</span>
                </div>
                <div className="flex justify-between">
                  <span>Completed Jobs</span>
                  <span className="font-semibold">{reportData.jobs.completedJobs}</span>
                </div>
                <div className="flex justify-between">
                  <span>Completion Rate</span>
                  <span className="font-semibold">{reportData.jobs.completionRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Average Completion Days</span>
                  <span className="font-semibold">{reportData.jobs.avgCompletionDays.toFixed(1)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Technician Productivity</CardTitle>
                <CardDescription>Closed jobs and averages</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Technician</TableHead>
                      <TableHead className="text-right">Completed</TableHead>
                      <TableHead className="text-right">Open</TableHead>
                      <TableHead className="text-right">Avg Days</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.technicians.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-gray-500">
                          No technician data in this range.
                        </TableCell>
                      </TableRow>
                    )}
                    {reportData.technicians.map((tech: any) => (
                      <TableRow key={tech.id}>
                        <TableCell>{tech.name}</TableCell>
                        <TableCell className="text-right">{tech.completedJobs}</TableCell>
                        <TableCell className="text-right">{tech.openJobs}</TableCell>
                        <TableCell className="text-right">{tech.avgCompletionDays.toFixed(1)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Customer Analytics</CardTitle>
              <CardDescription>Top customers by revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Net Revenue</TableHead>
                    <TableHead className="text-right">Jobs</TableHead>
                    <TableHead className="text-right">Avg Invoice</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.customers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500">
                        No customer data in this range.
                      </TableCell>
                    </TableRow>
                  )}
                  {reportData.customers.map((cust: any) => (
                    <TableRow key={cust.id}>
                      <TableCell>{cust.name}</TableCell>
                      <TableCell>{cust.email}</TableCell>
                      <TableCell className="text-right">{formatCurrency(cust.totalRevenue)}</TableCell>
                      <TableCell className="text-right">{cust.jobCount}</TableCell>
                      <TableCell className="text-right">{formatCurrency(cust.avgInvoice)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
