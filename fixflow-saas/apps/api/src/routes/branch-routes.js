import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { prisma } from "../services/prisma.js";
import { asyncHandler } from "../utils/async-handler.js";
import { serialize } from "../utils/serialize.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const branches = await prisma.branch.findMany({
      where: { tenantId: req.auth.tenantId },
      orderBy: { createdAt: "asc" }
    });

    res.json(serialize(branches));
  })
);

router.post(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      name: z.string().min(3),
      code: z.string().min(2),
      address: z.string().optional(),
      phone: z.string().optional()
    });

    const payload = schema.parse(req.body);
    const branch = await prisma.branch.create({
      data: {
        tenantId: req.auth.tenantId,
        name: payload.name,
        code: payload.code.toUpperCase(),
        address: payload.address || null,
        phone: payload.phone || null
      }
    });

    res.status(201).json(serialize(branch));
  })
);

export default router;
