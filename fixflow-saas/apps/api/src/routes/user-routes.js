import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { prisma } from "../services/prisma.js";
import { asyncHandler } from "../utils/async-handler.js";
import { serialize } from "../utils/serialize.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const memberships = await prisma.membership.findMany({
      where: { tenantId: req.auth.tenantId },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        branch: true
      },
      orderBy: { createdAt: "desc" }
    });

    res.json(serialize(memberships));
  })
);

router.post(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      name: z.string().min(3),
      email: z.string().email(),
      password: z.string().min(8),
      role: z.enum(["ADMIN", "TECH", "CASHIER"]),
      phone: z.string().optional()
    });

    const payload = schema.parse(req.body);
    const passwordHash = await bcrypt.hash(payload.password, 10);

    const user = await prisma.user.upsert({
      where: { email: payload.email.toLowerCase() },
      update: {
        name: payload.name,
        phone: payload.phone || null,
        passwordHash
      },
      create: {
        name: payload.name,
        email: payload.email.toLowerCase(),
        passwordHash,
        phone: payload.phone || null
      }
    });

    const existingMembership = await prisma.membership.findFirst({
      where: {
        tenantId: req.auth.tenantId,
        branchId: req.auth.branchId ?? null,
        userId: user.id
      }
    });

    const membership = existingMembership
      ? await prisma.membership.update({
          where: { id: existingMembership.id },
          data: {
            role: payload.role,
            status: "ACTIVE"
          },
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        })
      : await prisma.membership.create({
          data: {
            tenantId: req.auth.tenantId,
            branchId: req.auth.branchId ?? null,
            userId: user.id,
            role: payload.role
          },
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        });

    res.status(201).json(serialize(membership));
  })
);

export default router;
