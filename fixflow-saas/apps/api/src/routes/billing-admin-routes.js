import { Router } from "express";
import { z } from "zod";
import { requireBillingOperator } from "../middleware/billing-operator.js";
import { prisma } from "../services/prisma.js";
import { serialize } from "../utils/serialize.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

router.use(requireBillingOperator);

router.get(
  "/tenants",
  asyncHandler(async (req, res) => {
    const querySchema = z.object({
      search: z.string().optional()
    });

    const { search } = querySchema.parse(req.query);
    const searchValue = search?.trim();

    const tenants = await prisma.tenant.findMany({
      where: searchValue
        ? {
            OR: [
              { name: { contains: searchValue, mode: "insensitive" } },
              { slug: { contains: searchValue, mode: "insensitive" } },
              { billingEmail: { contains: searchValue, mode: "insensitive" } },
              {
                brandProfile: {
                  is: {
                    companyName: { contains: searchValue, mode: "insensitive" }
                  }
                }
              }
            ]
          }
        : undefined,
      orderBy: { createdAt: "asc" },
      take: 100,
      include: {
        brandProfile: {
          select: {
            companyName: true
          }
        },
        branches: {
          where: { isActive: true },
          select: {
            id: true
          }
        }
      }
    });

    res.json(serialize(tenants));
  })
);

router.get(
  "/invoices",
  asyncHandler(async (req, res) => {
    const querySchema = z.object({
      status: z
        .enum(["DRAFT", "PENDING", "REPORTED", "PAID", "OVERDUE", "VOID"])
        .optional(),
      search: z.string().optional()
    });

    const { status, search } = querySchema.parse(req.query);
    const searchValue = search?.trim();

    const invoices = await prisma.subscriptionInvoice.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(searchValue
          ? {
              OR: [
                { planName: { contains: searchValue, mode: "insensitive" } },
                { paymentReference: { contains: searchValue, mode: "insensitive" } },
                { paymentReporterName: { contains: searchValue, mode: "insensitive" } },
                {
                  tenant: {
                    is: {
                      OR: [
                        { name: { contains: searchValue, mode: "insensitive" } },
                        { slug: { contains: searchValue, mode: "insensitive" } },
                        {
                          billingEmail: {
                            contains: searchValue,
                            mode: "insensitive"
                          }
                        }
                      ]
                    }
                  }
                }
              ]
            }
          : {})
      },
      orderBy: [{ createdAt: "desc" }],
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
            billingEmail: true,
            subscriptionStatus: true,
            currentPeriodEndsAt: true,
            brandProfile: {
              select: {
                companyName: true
              }
            }
          }
        }
      },
      take: 200
    });

    res.json(serialize(invoices));
  })
);

router.post(
  "/invoices",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      tenantId: z.string().min(1),
      amount: z.number().min(0),
      planName: z.string().min(2),
      periodStart: z.string().datetime(),
      periodEnd: z.string().datetime(),
      dueDate: z.string().datetime(),
      notes: z.string().optional()
    });

    const payload = schema.parse(req.body);

    const tenant = await prisma.tenant.findUnique({
      where: { id: payload.tenantId }
    });

    if (!tenant) {
      return res.status(404).json({ message: "Tenant no encontrado." });
    }

    const invoice = await prisma.subscriptionInvoice.create({
      data: {
        tenantId: tenant.id,
        amount: payload.amount,
        planName: payload.planName,
        status: "PENDING",
        periodStart: new Date(payload.periodStart),
        periodEnd: new Date(payload.periodEnd),
        dueDate: new Date(payload.dueDate),
        notes: payload.notes || null
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            billingEmail: true
          }
        }
      }
    });

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        subscriptionStatus: "PAST_DUE"
      }
    });

    res.status(201).json(serialize(invoice));
  })
);

router.post(
  "/invoices/:id/mark-paid",
  asyncHandler(async (req, res) => {
    const existing = await prisma.subscriptionInvoice.findUnique({
      where: { id: req.params.id }
    });

    if (!existing) {
      return res.status(404).json({ message: "Factura no encontrada." });
    }

    const invoice = await prisma.subscriptionInvoice.update({
      where: { id: existing.id },
      data: {
        status: "PAID",
        paidAt: existing.paidAt || new Date()
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            plan: true
          }
        }
      }
    });

    await prisma.tenant.update({
      where: { id: existing.tenantId },
      data: {
        plan: invoice.planName,
        subscriptionStatus: "ACTIVE",
        currentPeriodStartsAt: invoice.periodStart,
        currentPeriodEndsAt: invoice.periodEnd
      }
    });

    res.json(serialize(invoice));
  })
);

router.post(
  "/invoices/:id/mark-overdue",
  asyncHandler(async (req, res) => {
    const existing = await prisma.subscriptionInvoice.findUnique({
      where: { id: req.params.id }
    });

    if (!existing) {
      return res.status(404).json({ message: "Factura no encontrada." });
    }

    const invoice = await prisma.subscriptionInvoice.update({
      where: { id: existing.id },
      data: {
        status: "OVERDUE"
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            plan: true
          }
        }
      }
    });

    await prisma.tenant.update({
      where: { id: existing.tenantId },
      data: {
        subscriptionStatus: "PAST_DUE"
      }
    });

    res.json(serialize(invoice));
  })
);

export default router;
