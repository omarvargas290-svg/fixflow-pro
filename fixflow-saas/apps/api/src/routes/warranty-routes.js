import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../services/prisma.js";
import { asyncHandler } from "../utils/async-handler.js";
import { serialize } from "../utils/serialize.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const warranties = await prisma.warranty.findMany({
      where: { tenantId: req.auth.tenantId },
      include: {
        serviceOrder: true,
        device: true
      },
      orderBy: { endsAt: "desc" }
    });

    res.json(serialize(warranties));
  })
);

export default router;
