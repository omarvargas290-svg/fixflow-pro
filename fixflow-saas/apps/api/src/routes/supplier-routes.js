import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../services/prisma.js";
import { asyncHandler } from "../utils/async-handler.js";
import { serialize } from "../utils/serialize.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const suppliers = await prisma.supplier.findMany({
      where: { tenantId: req.auth.tenantId },
      orderBy: { name: "asc" }
    });

    res.json(serialize(suppliers));
  })
);

router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      name: z.string().min(2),
      contactName: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional().or(z.literal("")),
      address: z.string().optional(),
      notes: z.string().optional()
    });

    const payload = schema.parse(req.body);
    const supplier = await prisma.supplier.create({
      data: {
        tenantId: req.auth.tenantId,
        name: payload.name,
        contactName: payload.contactName || null,
        phone: payload.phone || null,
        email: payload.email || null,
        address: payload.address || null,
        notes: payload.notes || null
      }
    });

    res.status(201).json(serialize(supplier));
  })
);

export default router;
