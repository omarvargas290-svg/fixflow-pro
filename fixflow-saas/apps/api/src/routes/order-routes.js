import { Router } from "express";
import { ServiceOrderStatus } from "@prisma/client";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../services/prisma.js";
import { asyncHandler } from "../utils/async-handler.js";
import { buildFolio } from "../utils/folio.js";
import { serialize } from "../utils/serialize.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const search = req.query.search?.toString().trim();
    const status = req.query.status?.toString();
    const technicianId = req.query.technicianId?.toString();

    const orders = await prisma.serviceOrder.findMany({
      where: {
        tenantId: req.auth.tenantId,
        ...(req.auth.branchId ? { branchId: req.auth.branchId } : {}),
        ...(status ? { status } : {}),
        ...(technicianId ? { assignedUserId: technicianId } : {}),
        ...(search
          ? {
              OR: [
                { folio: { contains: search, mode: "insensitive" } },
                { customer: { fullName: { contains: search, mode: "insensitive" } } },
                { customer: { phone: { contains: search, mode: "insensitive" } } },
                { device: { imei: { contains: search, mode: "insensitive" } } },
                { device: { serialNumber: { contains: search, mode: "insensitive" } } }
              ]
            }
          : {})
      },
      include: {
        customer: true,
        device: true,
        assignedUser: { select: { id: true, name: true, email: true } },
        partsUsed: { include: { inventoryItem: true } },
        payments: true
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    res.json(serialize(orders));
  })
);

router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      customerId: z.string().optional(),
      customer: z
        .object({
          fullName: z.string().min(3),
          phone: z.string().min(7),
          email: z.string().email().optional(),
          notes: z.string().optional()
        })
        .optional(),
      device: z.object({
        category: z.string().min(2),
        brand: z.string().min(2),
        model: z.string().min(2),
        serialNumber: z.string().optional(),
        imei: z.string().optional(),
        accessories: z.string().optional(),
        issueSummary: z.string().min(3)
      }),
      failureReport: z.string().min(3),
      priority: z.string().optional(),
      promisedAt: z.string().datetime().optional(),
      estimateAmount: z.number().optional(),
      paidAmount: z.number().optional(),
      assignedUserId: z.string().optional()
    });

    const payload = schema.parse(req.body);

    const ordersCount = await prisma.serviceOrder.count({
      where: { tenantId: req.auth.tenantId }
    });

    const customer =
      payload.customerId
        ? await prisma.customer.findFirst({
            where: { id: payload.customerId, tenantId: req.auth.tenantId }
          })
        : await prisma.customer.create({
            data: {
              tenantId: req.auth.tenantId,
              fullName: payload.customer.fullName,
              phone: payload.customer.phone,
              email: payload.customer.email || null,
              notes: payload.customer.notes || null
            }
          });

    if (!customer) {
      return res.status(400).json({ message: "Cliente no encontrado." });
    }

    const device = await prisma.device.create({
      data: {
        tenantId: req.auth.tenantId,
        branchId: req.auth.branchId ?? null,
        customerId: customer.id,
        category: payload.device.category,
        brand: payload.device.brand,
        model: payload.device.model,
        serialNumber: payload.device.serialNumber || null,
        imei: payload.device.imei || null,
        accessories: payload.device.accessories || null,
        issueSummary: payload.device.issueSummary
      }
    });

    const estimate = payload.estimateAmount ?? 0;
    const paid = payload.paidAmount ?? 0;
    const order = await prisma.serviceOrder.create({
      data: {
        tenantId: req.auth.tenantId,
        branchId: req.auth.branchId ?? null,
        customerId: customer.id,
        deviceId: device.id,
        assignedUserId: payload.assignedUserId || null,
        folio: buildFolio("OS", ordersCount),
        failureReport: payload.failureReport,
        priority: payload.priority || "normal",
        promisedAt: payload.promisedAt ? new Date(payload.promisedAt) : null,
        estimateAmount: estimate,
        paidAmount: paid,
        balanceAmount: estimate - paid
      },
      include: {
        customer: true,
        device: true
      }
    });

    if (paid > 0) {
      await prisma.payment.create({
        data: {
          tenantId: req.auth.tenantId,
          branchId: req.auth.branchId ?? null,
          serviceOrderId: order.id,
          amount: paid,
          method: "CASH",
          note: "Anticipo inicial"
        }
      });
    }

    res.status(201).json(serialize(order));
  })
);

router.patch(
  "/:id/status",
  requireAuth,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      status: z.nativeEnum(ServiceOrderStatus),
      diagnosis: z.string().optional()
    });

    const payload = schema.parse(req.body);
    const order = await prisma.serviceOrder.update({
      where: { id: req.params.id },
      data: {
        status: payload.status,
        diagnosis: payload.diagnosis
      }
    });

    res.json(serialize(order));
  })
);

export default router;
