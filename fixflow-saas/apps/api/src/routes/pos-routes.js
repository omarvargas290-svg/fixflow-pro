import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../services/prisma.js";
import { asyncHandler } from "../utils/async-handler.js";
import { buildFolio } from "../utils/folio.js";
import { serialize } from "../utils/serialize.js";

const router = Router();

router.get(
  "/sales",
  requireAuth,
  asyncHandler(async (req, res) => {
    const sales = await prisma.posSale.findMany({
      where: {
        tenantId: req.auth.tenantId,
        ...(req.auth.branchId ? { branchId: req.auth.branchId } : {})
      },
      include: {
        customer: true,
        items: true,
        payments: true
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    res.json(serialize(sales));
  })
);

router.post(
  "/sales",
  requireAuth,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      customerId: z.string().optional(),
      items: z
        .array(
          z.object({
            inventoryItemId: z.string().optional(),
            description: z.string().min(2),
            quantity: z.number().int().min(1),
            unitPrice: z.number().min(0)
          })
        )
        .min(1),
      paymentMethod: z.enum(["CASH", "CARD", "TRANSFER", "MIXED", "CREDIT"]).default("CASH")
    });

    const payload = schema.parse(req.body);
    const salesCount = await prisma.posSale.count({ where: { tenantId: req.auth.tenantId } });
    const subtotal = payload.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    const sale = await prisma.posSale.create({
      data: {
        tenantId: req.auth.tenantId,
        branchId: req.auth.branchId ?? null,
        customerId: payload.customerId || null,
        folio: buildFolio("PV", salesCount),
        subtotal,
        total: subtotal,
        items: {
          create: payload.items.map((item) => ({
            inventoryItemId: item.inventoryItemId || null,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice
          }))
        },
        payments: {
          create: {
            tenantId: req.auth.tenantId,
            branchId: req.auth.branchId ?? null,
            amount: subtotal,
            method: payload.paymentMethod
          }
        }
      },
      include: { items: true, payments: true }
    });

    res.status(201).json(serialize(sale));
  })
);

export default router;
