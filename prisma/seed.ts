import { PrismaClient, UserRole, CustomerType, JobStatus, JobPriority } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create Settings
  console.log('Creating default settings...');
  const settings = await prisma.settings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      companyName: 'E-Repair Shop',
      companyEmail: 'contact@erepairshop.com',
      companyPhone: '+1 (555) 123-4567',
      companyAddress: '123 Main Street, Suite 100, City, ST 12345',
      taxRate: 0.08, // 8% tax
      currency: 'USD',
      laborHourlyRate: 75,
      jobNumberPrefix: 'JOB-',
      invoiceNumberPrefix: 'INV-',
      reminderDays: 7,
    },
  });
  console.log('✅ Settings created');

  // Create Admin User
  console.log('Creating admin user...');
  const hashedPassword = await bcrypt.hash('Admin@123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@erepairshop.com' },
    update: {},
    create: {
      email: 'admin@erepairshop.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      phone: '+1 (555) 123-4567',
      isActive: true,
    },
  });
  console.log('✅ Admin user created (email: admin@erepairshop.com, password: Admin@123)');

  // Create Technician User
  console.log('Creating technician user...');
  const techPassword = await bcrypt.hash('Tech@123', 10);
  const techUser = await prisma.user.upsert({
    where: { email: 'tech@erepairshop.com' },
    update: {},
    create: {
      email: 'tech@erepairshop.com',
      password: techPassword,
      firstName: 'John',
      lastName: 'Technician',
      role: UserRole.TECHNICIAN,
      phone: '+1 (555) 234-5678',
      isActive: true,
    },
  });
  console.log('✅ Technician user created (email: tech@erepairshop.com, password: Tech@123)');

  // Create Sample Customers
  console.log('Creating sample customers...');
  const customer1 = await prisma.customer.upsert({
    where: { email: 'john.doe@example.com' },
    update: {},
    create: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1 (555) 111-2222',
      address: '456 Oak Avenue',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62701',
      customerType: CustomerType.RESIDENTIAL,
      notes: 'Regular customer, prefers email communication',
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: { email: 'jane.smith@business.com' },
    update: {},
    create: {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@business.com',
      phone: '+1 (555) 333-4444',
      address: '789 Business Blvd',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62702',
      customerType: CustomerType.COMMERCIAL,
      notes: 'Restaurant owner, multiple appliances',
    },
  });
  console.log('✅ Sample customers created');

  // Create Sample Parts
  console.log('Creating sample parts inventory...');
  const parts = await Promise.all([
    prisma.part.upsert({
      where: { partNumber: 'REF-COMP-001' },
      update: {},
      create: {
        partNumber: 'REF-COMP-001',
        partName: 'Refrigerator Compressor',
        description: 'Universal compressor for most refrigerator models',
        supplier: 'Parts Supplier Inc.',
        costPrice: 125.00,
        sellingPrice: 250.00,
        quantityInStock: 15,
        reorderLevel: 5,
        reorderQuantity: 10,
      },
    }),
    prisma.part.upsert({
      where: { partNumber: 'WM-PUMP-001' },
      update: {},
      create: {
        partNumber: 'WM-PUMP-001',
        partName: 'Washing Machine Water Pump',
        description: 'Replacement water pump for washing machines',
        supplier: 'Parts Supplier Inc.',
        costPrice: 35.00,
        sellingPrice: 75.00,
        quantityInStock: 25,
        reorderLevel: 8,
        reorderQuantity: 20,
      },
    }),
    prisma.part.upsert({
      where: { partNumber: 'DW-HEAT-001' },
      update: {},
      create: {
        partNumber: 'DW-HEAT-001',
        partName: 'Dishwasher Heating Element',
        description: 'Replacement heating element for dishwashers',
        supplier: 'Parts Supplier Inc.',
        costPrice: 45.00,
        sellingPrice: 95.00,
        quantityInStock: 12,
        reorderLevel: 5,
        reorderQuantity: 15,
      },
    }),
  ]);
  console.log('✅ Sample parts created');

  // Create Sample Jobs
  console.log('Creating sample jobs...');
  const job1 = await prisma.job.create({
    data: {
      jobNumber: 'JOB-2024-001',
      customerId: customer1.id,
      applianceBrand: 'Whirlpool',
      applianceType: 'Refrigerator',
      modelNumber: 'WRS325SDHZ',
      serialNumber: 'SN123456789',
      issueDescription: 'Refrigerator not cooling properly. Compressor making unusual noise.',
      priority: JobPriority.HIGH,
      status: JobStatus.IN_PROGRESS,
      estimatedCompletion: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      assignedTechnicianId: techUser.id,
      createdById: adminUser.id,
      serviceLocation: customer1.address + ', ' + customer1.city,
      laborHours: 2.5,
      technicianNotes: 'Diagnosed compressor issue. Ordered replacement part.',
    },
  });

  // Add status history for job1
  await prisma.jobStatusHistory.createMany({
    data: [
      {
        jobId: job1.id,
        status: JobStatus.OPEN,
        notes: 'Job created from customer call',
        changedBy: adminUser.id,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      },
      {
        jobId: job1.id,
        status: JobStatus.IN_PROGRESS,
        notes: 'Assigned to technician and diagnosis started',
        changedBy: adminUser.id,
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
      },
    ],
  });

  const job2 = await prisma.job.create({
    data: {
      jobNumber: 'JOB-2024-002',
      customerId: customer2.id,
      applianceBrand: 'Samsung',
      applianceType: 'Dishwasher',
      modelNumber: 'DW80R9950US',
      issueDescription: 'Dishwasher not heating water during wash cycle',
      priority: JobPriority.MEDIUM,
      status: JobStatus.OPEN,
      estimatedCompletion: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      createdById: adminUser.id,
      serviceLocation: customer2.address + ', ' + customer2.city,
    },
  });

  await prisma.jobStatusHistory.create({
    data: {
      jobId: job2.id,
      status: JobStatus.OPEN,
      notes: 'Job submitted via customer portal',
      changedBy: adminUser.id,
    },
  });

  console.log('✅ Sample jobs created');

  console.log('');
  console.log('='.repeat(50));
  console.log('🎉 Database seeding completed successfully!');
  console.log('='.repeat(50));
  console.log('');
  console.log('Login Credentials:');
  console.log('-------------------');
  console.log('Admin:');
  console.log('  Email: admin@erepairshop.com');
  console.log('  Password: Admin@123');
  console.log('');
  console.log('Technician:');
  console.log('  Email: tech@erepairshop.com');
  console.log('  Password: Tech@123');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
