import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../services/prisma.js";
import { asyncHandler } from "../utils/async-handler.js";
import { serialize } from "../utils/serialize.js";

const router = Router();

router.get(
  "/sessions/current",
  requireAuth,
  asyncHandler(async (req, res) => {
    const session = await prisma.cashSession.findFirst({
      where: {
        tenantId: req.auth.tenantId,
        ...(req.auth.branchId ? { branchId: req.auth.branchId } : {}),
        status: "open"
      },
      include: { movements: true },
      orderBy: { createdAt: "desc" }
    });

    res.json(serialize(session));
  })
);

router.post(
  "/sessions/open",
  requireAuth,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      openingAmount: z.number().min(0)
    });

    const payload = schema.parse(req.body);
    const session = await prisma.cashSession.create({
      data: {
        tenantId: req.auth.tenantId,
        branchId: req.auth.branchId ?? null,
        openedByUserId: req.auth.sub,
        openingAmount: payload.openingAmount,
        movements: {
          create: {
            type: "OPEN",
            amount: payload.openingAmount,
            note: "Apertura de caja"
          }
        }
      },
      include: { movements: true }
    });

    res.status(201).json(serialize(session));
  })
);

router.post(
  "/sessions/:id/close",
  requireAuth,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      closingAmount: z.number().min(0)
    });

    const payload = schema.parse(req.body);
    const session = await prisma.cashSession.update({
      where: { id: req.params.id },
      data: {
        closedByUserId: req.auth.sub,
        closingAmount: payload.closingAmount,
        status: "closed",
        movements: {
          create: {
            type: "CLOSE",
            amount: payload.closingAmount,
            note: "Cierre de caja"
          }
        }
      },
      include: { movements: true }
    });

    res.json(serialize(session));
  })
);

export default router;
