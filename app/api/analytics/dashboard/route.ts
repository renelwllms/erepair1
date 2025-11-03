import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/analytics/dashboard - Get dashboard analytics data
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = parseInt(searchParams.get("period") || "30");

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    // Get jobs created in the last 30 days
    const jobsInPeriod = await db.job.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        createdAt: true,
        status: true,
        applianceType: true,
        applianceBrand: true,
      },
    });

    // Get current month data
    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);

    const currentMonthJobs = await db.job.findMany({
      where: {
        createdAt: {
          gte: currentMonthStart,
        },
      },
      select: {
        id: true,
        createdAt: true,
        status: true,
        applianceType: true,
        applianceBrand: true,
      },
    });

    // Get previous month data for comparison
    const previousMonthStart = new Date(currentMonthStart);
    previousMonthStart.setMonth(previousMonthStart.getMonth() - 1);
    const previousMonthEnd = new Date(currentMonthStart);
    previousMonthEnd.setDate(previousMonthEnd.getDate() - 1);

    const previousMonthJobs = await db.job.findMany({
      where: {
        createdAt: {
          gte: previousMonthStart,
          lte: previousMonthEnd,
        },
      },
      select: {
        id: true,
      },
    });

    // Group jobs by date for line chart
    const jobsByDate = jobsInPeriod.reduce((acc: any, job) => {
      const date = new Date(job.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date]++;
      return acc;
    }, {});

    const jobsOverTime = Object.entries(jobsByDate).map(([date, count]) => ({
      date,
      jobs: count,
    }));

    // Group by appliance type for pie chart
    const applianceTypeCounts = jobsInPeriod.reduce((acc: any, job) => {
      const type = job.applianceType || "Unknown";
      if (!acc[type]) {
        acc[type] = 0;
      }
      acc[type]++;
      return acc;
    }, {});

    const applianceTypes = Object.entries(applianceTypeCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a: any, b: any) => b.value - a.value)
      .slice(0, 10); // Top 10

    // Group by brand for pie chart
    const brandCounts = jobsInPeriod.reduce((acc: any, job) => {
      const brand = job.applianceBrand || "Unknown";
      if (!acc[brand]) {
        acc[brand] = 0;
      }
      acc[brand]++;
      return acc;
    }, {});

    const topBrands = Object.entries(brandCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a: any, b: any) => b.value - a.value)
      .slice(0, 10); // Top 10

    // Calculate metrics
    const totalJobs = await db.job.count();
    const openJobs = await db.job.count({
      where: { status: { in: ["OPEN", "IN_PROGRESS", "AWAITING_PARTS", "AWAITING_CUSTOMER_APPROVAL"] } },
    });
    const completedJobs = await db.job.count({
      where: { status: "CLOSED" },
    });

    // Calculate growth
    const currentMonthCount = currentMonthJobs.length;
    const previousMonthCount = previousMonthJobs.length;
    const growthPercentage =
      previousMonthCount > 0
        ? ((currentMonthCount - previousMonthCount) / previousMonthCount) * 100
        : currentMonthCount > 0
        ? 100
        : 0;

    // Status distribution
    const statusCounts = await db.job.groupBy({
      by: ["status"],
      _count: true,
    });

    const statusDistribution = statusCounts.map((item) => ({
      status: item.status,
      count: item._count,
    }));

    return NextResponse.json({
      metrics: {
        totalJobs,
        openJobs,
        completedJobs,
        currentMonthJobs: currentMonthCount,
        previousMonthJobs: previousMonthCount,
        growthPercentage: Math.round(growthPercentage * 10) / 10,
      },
      charts: {
        jobsOverTime,
        applianceTypes,
        topBrands,
        statusDistribution,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard analytics" },
      { status: 500 }
    );
  }
}
