"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Users, CheckCircle2, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

// Define types
interface DashboardData {
  metrics: {
    totalJobs: number;
    openJobs: number;
    completedJobs: number;
    currentMonthJobs: number;
    previousMonthJobs: number;
    growthPercentage: number;
  };
  charts: {
    jobsOverTime: Array<{ date: string; jobs: number }>;
    applianceTypes: Array<{ name: string; value: number }>;
    topBrands: Array<{ name: string; value: number }>;
    statusDistribution: Array<{ status: string; count: number }>;
  };
}

// Modern color palette
const COLORS = [
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#06b6d4", // cyan
  "#f97316", // orange
  "#84cc16", // lime
  "#6366f1", // indigo
  "#14b8a6", // teal
];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [animationClass, setAnimationClass] = useState("");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    // Trigger entrance animation
    setTimeout(() => setAnimationClass("animate-in"), 50);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch("/api/analytics/dashboard?period=30");
      if (!response.ok) throw new Error("Failed to fetch dashboard data");
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 animate-pulse">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-600">Failed to load dashboard data</p>
      </div>
    );
  }

  const stats = [
    {
      title: "Total Jobs",
      value: data.metrics.totalJobs,
      icon: Briefcase,
      color: "from-blue-500 to-blue-600",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      title: "Open Jobs",
      value: data.metrics.openJobs,
      icon: Activity,
      color: "from-purple-500 to-purple-600",
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
    },
    {
      title: "Completed",
      value: data.metrics.completedJobs,
      icon: CheckCircle2,
      color: "from-emerald-500 to-emerald-600",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
    },
    {
      title: "This Month",
      value: data.metrics.currentMonthJobs,
      change: data.metrics.growthPercentage,
      icon: data.metrics.growthPercentage >= 0 ? TrendingUp : TrendingDown,
      color: "from-amber-500 to-amber-600",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className={`${animationClass} opacity-0 transition-all duration-700 ease-out transform -translate-y-4`}>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-gray-600 mt-2">
          Overview of your repair shop performance
        </p>
      </div>

      {/* Stats Grid with Stagger Animation */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className={`${animationClass} opacity-0 transition-all duration-700 ease-out transform -translate-y-4`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <Card className="relative overflow-hidden hover:shadow-lg transition-shadow duration-300">
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-10 rounded-full -mr-16 -mt-16`}></div>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </CardTitle>
                  <div className={`${stat.iconBg} p-2 rounded-lg`}>
                    <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent">
                    {stat.value.toLocaleString()}
                  </div>
                  {stat.change !== undefined && (
                    <p className={`text-xs mt-1 flex items-center gap-1 ${stat.change >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      <Icon className="h-3 w-3" />
                      {stat.change >= 0 ? "+" : ""}{stat.change.toFixed(1)}% from last month
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Line Chart - Jobs Over Time */}
        <div
          className={`${animationClass} opacity-0 transition-all duration-700 ease-out transform -translate-y-4`}
          style={{ transitionDelay: "400ms" }}
        >
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse"></div>
                Jobs Over Time
              </CardTitle>
              <CardDescription>Last 30 days job creation trend</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.charts.jobsOverTime}>
                  <defs>
                    <linearGradient id="colorJobs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    stroke="#6b7280"
                    style={{ fontSize: "12px" }}
                  />
                  <YAxis
                    stroke="#6b7280"
                    style={{ fontSize: "12px" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="jobs"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    fill="url(#colorJobs)"
                    dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: "#2563eb" }}
                    animationDuration={1500}
                    animationEasing="ease-in-out"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Pie Chart - Appliance Types */}
        <div
          className={`${animationClass} opacity-0 transition-all duration-700 ease-out transform -translate-y-4`}
          style={{ transitionDelay: "500ms" }}
        >
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-2 w-2 bg-purple-600 rounded-full animate-pulse"></div>
                Top Appliance Types
              </CardTitle>
              <CardDescription>Most repaired appliances (last 30 days)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.charts.applianceTypes}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    animationBegin={400}
                    animationDuration={1500}
                  >
                    {data.charts.applianceTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Pie Chart - Top Brands */}
        <div
          className={`${animationClass} opacity-0 transition-all duration-700 ease-out transform -translate-y-4`}
          style={{ transitionDelay: "600ms" }}
        >
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-2 w-2 bg-emerald-600 rounded-full animate-pulse"></div>
                Top Brands Repaired
              </CardTitle>
              <CardDescription>Most serviced brands (last 30 days)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.charts.topBrands}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    animationBegin={600}
                    animationDuration={1500}
                  >
                    {data.charts.topBrands.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Status Distribution */}
        <div
          className={`${animationClass} opacity-0 transition-all duration-700 ease-out transform -translate-y-4`}
          style={{ transitionDelay: "700ms" }}
        >
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-2 w-2 bg-amber-600 rounded-full animate-pulse"></div>
                Job Status Overview
              </CardTitle>
              <CardDescription>Current status distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.charts.statusDistribution.map((item, index) => {
                  const total = data.charts.statusDistribution.reduce((sum, s) => sum + s.count, 0);
                  const percentage = ((item.count / total) * 100).toFixed(1);

                  return (
                    <div
                      key={item.status}
                      className="space-y-2"
                      style={{
                        animation: `slideIn 0.5s ease-out ${index * 100}ms both`
                      }}
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700">
                          {item.status.replace(/_/g, " ")}
                        </span>
                        <span className="text-gray-600">
                          {item.count} ({percentage}%)
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${COLORS[index % COLORS.length] === "#3b82f6" ? "from-blue-500 to-blue-600" : "from-purple-500 to-purple-600"}`}
                          style={{
                            width: `${percentage}%`,
                            animation: `expandWidth 1s ease-out ${index * 100 + 800}ms both`
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CSS for animations */}
      <style jsx>{`
        .animate-in {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes expandWidth {
          from {
            width: 0;
          }
        }
      `}</style>
    </div>
  );
}
