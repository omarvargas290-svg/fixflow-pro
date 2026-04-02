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
    const search = req.query.search?.toString().trim();
    const customers = await prisma.customer.findMany({
      where: {
        tenantId: req.auth.tenantId,
        ...(search
          ? {
              OR: [
                { fullName: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } }
              ]
            }
          : {})
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    res.json(serialize(customers));
  })
);

router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      fullName: z.string().min(3),
      phone: z.string().min(7),
      email: z.string().email().optional().or(z.literal("")),
      notes: z.string().optional()
    });

    const payload = schema.parse(req.body);
    const customer = await prisma.customer.create({
      data: {
        tenantId: req.auth.tenantId,
        fullName: payload.fullName,
        phone: payload.phone,
        email: payload.email || null,
        notes: payload.notes || null
      }
    });

    res.status(201).json(serialize(customer));
  })
);

export default router;
