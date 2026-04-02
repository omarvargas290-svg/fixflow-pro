import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { requireBillingOperator } from "../middleware/billing-operator.js";
import { prisma } from "../services/prisma.js";
import { syncTenantSubscription } from "../services/subscription-service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { serialize } from "../utils/serialize.js";

const router = Router();

function getManualTransferInstructions(fallbackEmail) {
  return {
    method: "TRANSFER",
    bankName: env.BILLING_TRANSFER_BANK_NAME,
    accountHolder: env.BILLING_TRANSFER_ACCOUNT_HOLDER,
    clabe: env.BILLING_TRANSFER_CLABE || null,
    accountNumber: env.BILLING_TRANSFER_ACCOUNT_NUMBER || null,
    referenceLabel: env.BILLING_TRANSFER_REFERENCE_LABEL,
    note: env.BILLING_TRANSFER_NOTE,
    supportEmail: env.BILLING_SUPPORT_EMAIL || fallbackEmail || null,
    supportWhatsApp: env.BILLING_SUPPORT_WHATSAPP || null
  };
}

router.get(
  "/current",
  requireAuth,
  asyncHandler(async (req, res) => {
    await syncTenantSubscription(req.auth.tenantId);
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.auth.tenantId },
      include: {
        subscriptionInvoices: {
          orderBy: { createdAt: "desc" },
          take: 12
        }
      }
    });

    res.json(
      serialize({
        ...tenant,
        paymentInstructions: getManualTransferInstructions(tenant?.billingEmail)
      })
    );
  })
);

router.get(
  "/invoices",
  requireAuth,
  asyncHandler(async (req, res) => {
    const invoices = await prisma.subscriptionInvoice.findMany({
      where: { tenantId: req.auth.tenantId },
      orderBy: { createdAt: "desc" }
    });

    res.json(serialize(invoices));
  })
);

router.post(
  "/invoices",
  requireAuth,
  requireBillingOperator,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      amount: z.number().min(0),
      planName: z.string().min(2),
      periodStart: z.string().datetime(),
      periodEnd: z.string().datetime(),
      dueDate: z.string().datetime(),
      notes: z.string().optional()
    });

    const payload = schema.parse(req.body);
    const invoice = await prisma.subscriptionInvoice.create({
      data: {
        tenantId: req.auth.tenantId,
        amount: payload.amount,
        planName: payload.planName,
        status: "PENDING",
        periodStart: new Date(payload.periodStart),
        periodEnd: new Date(payload.periodEnd),
        dueDate: new Date(payload.dueDate),
        notes: payload.notes || null
      }
    });

    await prisma.tenant.update({
      where: { id: req.auth.tenantId },
      data: {
        subscriptionStatus: "PAST_DUE"
      }
    });

    res.status(201).json(serialize(invoice));
  })
);

router.post(
  "/invoices/:id/report-payment",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      reporterName: z.string().min(3),
      reporterEmail: z.string().email().optional().or(z.literal("")),
      paymentReference: z.string().min(4),
      paidAt: z.string().datetime(),
      notes: z.string().optional()
    });

    const payload = schema.parse(req.body);
    const existing = await prisma.subscriptionInvoice.findFirst({
      where: { id: req.params.id, tenantId: req.auth.tenantId }
    });

    if (!existing) {
      return res.status(404).json({ message: "Factura no encontrada." });
    }

    if (existing.status === "PAID" || existing.status === "VOID") {
      return res
        .status(400)
        .json({ message: "La factura ya no permite reporte manual de pago." });
    }

    const invoice = await prisma.subscriptionInvoice.update({
      where: { id: existing.id },
      data: {
        status: "REPORTED",
        paymentReportedAt: new Date(),
        paymentReference: payload.paymentReference,
        paymentReporterName: payload.reporterName,
        paymentReporterEmail: payload.reporterEmail || null,
        paymentNotes: payload.notes || null,
        externalRef: payload.paymentReference,
        notes: existing.notes,
        paidAt: new Date(payload.paidAt)
      }
    });

    res.json(serialize(invoice));
  })
);

router.post(
  "/invoices/:id/mark-paid",
  requireAuth,
  requireBillingOperator,
  asyncHandler(async (req, res) => {
    const existing = await prisma.subscriptionInvoice.findFirst({
      where: { id: req.params.id, tenantId: req.auth.tenantId }
    });

    if (!existing) {
      return res.status(404).json({ message: "Factura no encontrada." });
    }

    const invoice = await prisma.subscriptionInvoice.update({
      where: { id: existing.id },
      data: {
        status: "PAID",
        paidAt: existing.paidAt || new Date()
      }
    });

    await prisma.tenant.update({
      where: { id: req.auth.tenantId },
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
  requireAuth,
  requireBillingOperator,
  asyncHandler(async (req, res) => {
    const existing = await prisma.subscriptionInvoice.findFirst({
      where: { id: req.params.id, tenantId: req.auth.tenantId }
    });

    if (!existing) {
      return res.status(404).json({ message: "Factura no encontrada." });
    }

    const invoice = await prisma.subscriptionInvoice.update({
      where: { id: existing.id },
      data: {
        status: "OVERDUE"
      }
    });

    await prisma.tenant.update({
      where: { id: req.auth.tenantId },
      data: {
        subscriptionStatus: "PAST_DUE"
      }
    });

    res.json(serialize(invoice));
  })
);

export default router;
