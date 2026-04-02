import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo-taller-central" },
    update: {
      billingEmail: "billing@demo.fixflow.app"
    },
    create: {
      name: "Demo Taller Central",
      slug: "demo-taller-central",
      plan: "MVP",
      billingEmail: "billing@demo.fixflow.app",
      subscriptionStatus: "ACTIVE",
      trialEndsAt: new Date("2026-04-30T00:00:00.000Z"),
      currentPeriodStartsAt: new Date("2026-04-01T00:00:00.000Z"),
      currentPeriodEndsAt: new Date("2026-04-30T23:59:59.000Z"),
      brandProfile: {
        create: {
          companyName: "Demo Taller Central",
          primaryColor: "#0f62fe",
          secondaryColor: "#101828",
          accentColor: "#22c55e",
          ticketHeader: "Gracias por confiar en Demo Taller Central"
        }
      }
    }
  });

  const branch = await prisma.branch.upsert({
    where: {
      tenantId_code: {
        tenantId: tenant.id,
        code: "MATRIZ"
      }
    },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Sucursal Matriz",
      code: "MATRIZ",
      address: "Av. Principal 100, Centro",
      phone: "5555551234"
    }
  });

  const users = [
    { name: "Administrador Demo", email: "admin@demo.fixflow.app", password: "Admin2026!", role: "ADMIN" },
    { name: "Tecnico Demo", email: "tecnico@demo.fixflow.app", password: "Tecnico2026!", role: "TECH" },
    { name: "Caja Demo", email: "caja@demo.fixflow.app", password: "Caja2026!", role: "CASHIER" }
  ];

  for (const item of users) {
    const passwordHash = await bcrypt.hash(item.password, 10);
    const user = await prisma.user.upsert({
      where: { email: item.email },
      update: { name: item.name },
      create: {
        name: item.name,
        email: item.email,
        passwordHash
      }
    });

    const existing = await prisma.membership.findFirst({
      where: {
        tenantId: tenant.id,
        userId: user.id,
        branchId: branch.id
      }
    });

    if (!existing) {
      await prisma.membership.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          branchId: branch.id,
          role: item.role
        }
      });
    }
  }

  const paidInvoice = await prisma.subscriptionInvoice.findFirst({
    where: {
      tenantId: tenant.id,
      planName: "MVP",
      periodStart: new Date("2026-04-01T00:00:00.000Z")
    }
  });

  if (!paidInvoice) {
    await prisma.subscriptionInvoice.create({
      data: {
        tenantId: tenant.id,
        planName: "MVP",
        status: "PAID",
        amount: 799,
        periodStart: new Date("2026-04-01T00:00:00.000Z"),
        periodEnd: new Date("2026-04-30T23:59:59.000Z"),
        dueDate: new Date("2026-04-01T00:00:00.000Z"),
        paidAt: new Date("2026-04-01T10:00:00.000Z"),
        notes: "Demo invoice seed"
      }
    });
  }

  let supplier = await prisma.supplier.findFirst({
    where: { tenantId: tenant.id, email: "ventas@refaccionespromx.com" }
  });

  if (!supplier) {
    supplier = await prisma.supplier.create({
      data: {
        tenantId: tenant.id,
        name: "Refacciones Pro MX",
        contactName: "Ventas Mostrador",
        phone: "5550012233",
        email: "ventas@refaccionespromx.com"
      }
    });
  }

  let customer = await prisma.customer.findFirst({
    where: { tenantId: tenant.id, phone: "5512345678" }
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        tenantId: tenant.id,
        fullName: "Carlos Ramirez",
        phone: "5512345678",
        email: "carlos@example.com"
      }
    });
  }

  let device = await prisma.device.findFirst({
    where: { tenantId: tenant.id, imei: "356789012345678" }
  });

  if (!device) {
    device = await prisma.device.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        customerId: customer.id,
        category: "Celular",
        brand: "Apple",
        model: "iPhone 13",
        imei: "356789012345678",
        accessories: "Cable USB-C",
        issueSummary: "No enciende despues de caida"
      }
    });
  }

  const techUser = await prisma.user.findUnique({
    where: { email: "tecnico@demo.fixflow.app" }
  });

  const existingOrder = await prisma.serviceOrder.findFirst({
    where: { tenantId: tenant.id, folio: "OS-20260401-0001" }
  });

  if (!existingOrder) {
    await prisma.serviceOrder.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        customerId: customer.id,
        deviceId: device.id,
        assignedUserId: techUser.id,
        folio: "OS-20260401-0001",
        status: "DIAGNOSIS",
        failureReport: "No enciende y presenta golpe en esquina inferior",
        diagnosis: "Pantalla y flex de carga afectados",
        estimateAmount: 1800,
        paidAmount: 500,
        balanceAmount: 1300,
        notes: {
          create: [
            { content: "Equipo recibido con mica quebrada.", type: "intake" },
            { content: "Pendiente autorizacion del cliente.", type: "timeline" }
          ]
        },
        payments: {
          create: {
            tenantId: tenant.id,
            branchId: branch.id,
            amount: 500,
            method: "CASH",
            note: "Anticipo inicial"
          }
        }
      }
    });
  }

  await prisma.inventoryItem.createMany({
    data: [
      {
        tenantId: tenant.id,
        branchId: branch.id,
        supplierId: supplier.id,
        sku: "IP13-PANT-OLED",
        name: "Pantalla OLED iPhone 13",
        category: "Pantallas",
        stock: 3,
        minStock: 2,
        unitCost: 1450,
        salePrice: 2400
      },
      {
        tenantId: tenant.id,
        branchId: branch.id,
        supplierId: supplier.id,
        sku: "USBC-FLEX-01",
        name: "Flex de carga USB-C",
        category: "Flex",
        stock: 1,
        minStock: 2,
        unitCost: 180,
        salePrice: 450
      }
    ],
    skipDuplicates: true
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
