import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../services/prisma.js";
import { asyncHandler } from "../utils/async-handler.js";
import { serialize } from "../utils/serialize.js";

const router = Router();

router.get(
  "/items",
  requireAuth,
  asyncHandler(async (req, res) => {
    const search = req.query.search?.toString().trim();
    const lowStock = req.query.lowStock === "true";
    const items = await prisma.inventoryItem.findMany({
      where: {
        tenantId: req.auth.tenantId,
        ...(req.auth.branchId ? { branchId: req.auth.branchId } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { sku: { contains: search, mode: "insensitive" } },
                { category: { contains: search, mode: "insensitive" } },
                { supplier: { name: { contains: search, mode: "insensitive" } } }
              ]
            }
          : {}),
        ...(lowStock ? { OR: [{ stock: 0 }, { stock: { lte: 3 } }] } : {})
      },
      include: { supplier: true },
      orderBy: { updatedAt: "desc" },
      take: 50
    });

    res.json(serialize(items));
  })
);

router.post(
  "/items",
  requireAuth,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      sku: z.string().min(2),
      name: z.string().min(2),
      category: z.string().min(2),
      description: z.string().optional(),
      stock: z.number().int().min(0),
      minStock: z.number().int().min(0),
      unitCost: z.number().min(0),
      salePrice: z.number().min(0),
      supplierId: z.string().optional()
    });

    const payload = schema.parse(req.body);
    const item = await prisma.inventoryItem.create({
      data: {
        tenantId: req.auth.tenantId,
        branchId: req.auth.branchId ?? null,
        supplierId: payload.supplierId || null,
        sku: payload.sku,
        name: payload.name,
        category: payload.category,
        description: payload.description || null,
        stock: payload.stock,
        minStock: payload.minStock,
        unitCost: payload.unitCost,
        salePrice: payload.salePrice
      }
    });

    res.status(201).json(serialize(item));
  })
);

router.patch(
  "/items/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      name: z.string().min(2).optional(),
      category: z.string().min(2).optional(),
      description: z.string().optional(),
      stock: z.number().int().min(0).optional(),
      minStock: z.number().int().min(0).optional(),
      unitCost: z.number().min(0).optional(),
      salePrice: z.number().min(0).optional()
    });

    const payload = schema.parse(req.body);
    const item = await prisma.inventoryItem.update({
      where: { id: req.params.id },
      data: payload
    });

    res.json(serialize(item));
  })
);

export default router;
