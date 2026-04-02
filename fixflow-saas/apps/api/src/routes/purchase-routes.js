import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { prisma } from "../services/prisma.js";
import { asyncHandler } from "../utils/async-handler.js";
import { buildFolio } from "../utils/folio.js";
import { serialize } from "../utils/serialize.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: {
        tenantId: req.auth.tenantId,
        ...(req.auth.branchId ? { branchId: req.auth.branchId } : {})
      },
      include: {
        supplier: true,
        items: true
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    res.json(serialize(purchaseOrders));
  })
);

router.post(
  "/",
  requireAuth,
  requireRole("ADMIN", "CASHIER"),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      supplierId: z.string(),
      items: z.array(
        z.object({
          inventoryItemId: z.string().optional(),
          description: z.string().min(2),
          quantity: z.number().int().min(1),
          unitCost: z.number().min(0)
        })
      ).min(1)
    });

    const payload = schema.parse(req.body);
    const count = await prisma.purchaseOrder.count({
      where: { tenantId: req.auth.tenantId }
    });

    const subtotal = payload.items.reduce(
      (sum, item) => sum + item.quantity * item.unitCost,
      0
    );

    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        tenantId: req.auth.tenantId,
        branchId: req.auth.branchId ?? null,
        supplierId: payload.supplierId,
        folio: buildFolio("OC", count),
        status: "received",
        subtotal,
        total: subtotal,
        items: {
          create: payload.items.map((item) => ({
            inventoryItemId: item.inventoryItemId || null,
            description: item.description,
            quantity: item.quantity,
            unitCost: item.unitCost,
            total: item.quantity * item.unitCost
          }))
        }
      },
      include: {
        supplier: true,
        items: true
      }
    });

    for (const item of payload.items) {
      if (!item.inventoryItemId) continue;

      await prisma.inventoryItem.update({
        where: { id: item.inventoryItemId },
        data: {
          stock: {
            increment: item.quantity
          }
        }
      });

      await prisma.inventoryMovement.create({
        data: {
          inventoryItemId: item.inventoryItemId,
          branchId: req.auth.branchId ?? null,
          type: "PURCHASE",
          quantity: item.quantity,
          reference: purchaseOrder.folio
        }
      });
    }

    res.status(201).json(serialize(purchaseOrder));
  })
);

export default router;
