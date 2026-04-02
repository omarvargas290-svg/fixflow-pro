import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env.js";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../services/prisma.js";
import { asyncHandler } from "../utils/async-handler.js";
import { serialize } from "../utils/serialize.js";

const router = Router();

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(6)
    });

    const { email, password } = schema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        memberships: {
          where: { status: "ACTIVE" },
          include: { tenant: true, branch: true }
        }
      }
    });

    if (!user) {
      return res.status(401).json({ message: "Credenciales invalidas." });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    const membership = user.memberships[0];

    if (!valid || !membership) {
      return res.status(401).json({ message: "Credenciales invalidas." });
    }

    const token = jwt.sign(
      {
        sub: user.id,
        tenantId: membership.tenantId,
        branchId: membership.branchId,
        role: membership.role,
        membershipId: membership.id
      },
      env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    return res.json(
      serialize({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: membership.role,
          tenant: membership.tenant.name,
          branch: membership.branch?.name ?? "Sin sucursal"
        }
      })
    );
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.auth.sub },
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    return res.json(
      serialize({
        user,
        session: {
          role: req.auth.role,
          tenantId: req.auth.tenantId,
          branchId: req.auth.branchId
        }
      })
    );
  })
);

export default router;
