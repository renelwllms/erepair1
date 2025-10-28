# Phase 7 Implementation Guide

## Overview
This guide provides implementation instructions for Phase 7: Parts Inventory Management and Dashboard Analytics.

## Status
- ✅ Deployment scripts created (Ubuntu)
- ⏳ Parts Inventory Management - Ready to implement
- ⏳ Dashboard Analytics - Ready to implement

---

## Parts Inventory Management

### Database Schema
The Part model is already defined in `prisma/schema.prisma`:
- partNumber (unique)
- partName
- description
- supplier
- costPrice
- sellingPrice
- quantityInStock
- reorderLevel
- reorderQuantity

### Implementation Steps

#### 1. Create Parts API (`app/api/parts/route.ts`)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const lowStock = searchParams.get('lowStock') === 'true';

  const where = {
    AND: [
      search ? {
        OR: [
          { partNumber: { contains: search, mode: 'insensitive' } },
          { partName: { contains: search, mode: 'insensitive' } },
        ]
      } : {},
      lowStock ? {
        quantityInStock: { lte: prisma.raw('reorderLevel') }
      } : {}
    ]
  };

  const parts = await prisma.part.findMany({
    where,
    orderBy: { partName: 'asc' },
  });

  return NextResponse.json(parts);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await request.json();
  const part = await prisma.part.create({
    data: {
      partNumber: data.partNumber,
      partName: data.partName,
      description: data.description,
      supplier: data.supplier,
      costPrice: parseFloat(data.costPrice),
      sellingPrice: parseFloat(data.sellingPrice),
      quantityInStock: parseInt(data.quantityInStock),
      reorderLevel: parseInt(data.reorderLevel),
      reorderQuantity: parseInt(data.reorderQuantity),
    },
  });

  return NextResponse.json(part);
}
```

#### 2. Create Parts List Page (`app/parts/page.tsx`)
```typescript
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, AlertTriangle } from 'lucide-react';

export default function PartsPage() {
  const [parts, setParts] = useState([]);
  const [search, setSearch] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);

  useEffect(() => {
    fetchParts();
  }, [search, showLowStock]);

  const fetchParts = async () => {
    const query = new URLSearchParams({
      search,
      lowStock: showLowStock.toString(),
    });
    const res = await fetch(`/api/parts?${query}`);
    const data = await res.json();
    setParts(data);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between mb-6">
        <h1 className="text-3xl font-bold">Parts Inventory</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Part
        </Button>
      </div>

      <div className="flex gap-4 mb-4">
        <Input
          placeholder="Search parts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button
          variant={showLowStock ? 'default' : 'outline'}
          onClick={() => setShowLowStock(!showLowStock)}
        >
          <AlertTriangle className="mr-2 h-4 w-4" />
          Low Stock Only
        </Button>
      </div>

      {/* Parts table here */}
    </div>
  );
}
```

#### 3. Add Low Stock Alerts
Create a component that shows parts below reorder level on the dashboard.

---

## Dashboard Analytics

### Implementation Steps

#### 1. Create Analytics API (`app/api/analytics/route.ts`)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || '30'; // days

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(period));

  // Revenue data
  const revenueData = await prisma.invoice.groupBy({
    by: ['createdAt'],
    where: {
      createdAt: { gte: startDate },
      status: { in: ['PAID', 'PARTIALLY_PAID'] }
    },
    _sum: {
      paidAmount: true
    },
    orderBy: { createdAt: 'asc' }
  });

  // Job statistics
  const jobStats = await prisma.job.groupBy({
    by: ['status'],
    _count: true
  });

  // Technician performance
  const techPerformance = await prisma.job.groupBy({
    by: ['assignedTechnicianId'],
    where: {
      assignedTechnicianId: { not: null },
      createdAt: { gte: startDate }
    },
    _count: true
  });

  return NextResponse.json({
    revenue: revenueData,
    jobStats,
    techPerformance
  });
}
```

#### 2. Create Dashboard Charts
Use Recharts (already installed) to create:
- Revenue line chart
- Job status pie chart
- Technician performance bar chart

#### 3. Update Dashboard Page
Add the analytics components to the existing dashboard.

---

## Next Steps

1. **Parts Inventory** (Priority 1)
   - Implement Parts API endpoints
   - Create Parts list page
   - Add Parts form (create/edit)
   - Implement low stock alerts
   - Add parts usage tracking on jobs

2. **Dashboard Analytics** (Priority 2)
   - Create analytics API
   - Build revenue charts
   - Add job statistics
   - Implement technician performance metrics
   - Create activity feed

3. **Testing**
   - Test all CRUD operations
   - Verify calculations
   - Test permissions
   - Mobile responsiveness

4. **Documentation**
   - Update PROJECT_STATUS.md
   - Create PHASE_7_COMPLETE.md
   - Update Task.md

---

## Deployment

### Ubuntu
```bash
wget https://raw.githubusercontent.com/YOUR_REPO/main/deploy-ubuntu.sh
chmod +x deploy-ubuntu.sh
sudo ./deploy-ubuntu.sh
```

### Windows
See `deploy-windows.ps1` for Windows Server deployment.

---

## Configuration

Before deployment, update:
1. `deploy-ubuntu.sh` - Set GIT_REPO and DOMAIN
2. `deploy-windows.ps1` - Set GIT_REPO and DOMAIN
3. `.env` - Configure SMTP for email notifications

---

## Support

For implementation questions, refer to:
- Existing phases (PHASE_2_COMPLETE.md, PHASE_3_COMPLETE.md, etc.)
- Prisma schema (`prisma/schema.prisma`)
- API examples in `app/api/` folder
- UI components in existing pages

---

**Last Updated:** October 29, 2025
