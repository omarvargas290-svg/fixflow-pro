import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../services/prisma.js";
import { asyncHandler } from "../utils/async-handler.js";
import { serialize } from "../utils/serialize.js";

const router = Router();

router.get(
  "/overview",
  requireAuth,
  asyncHandler(async (req, res) => {
    const now = new Date();
    const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startWeek = new Date(startDay);
    startWeek.setDate(startWeek.getDate() - startWeek.getDay());
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const whereBase = {
      tenantId: req.auth.tenantId,
      ...(req.auth.branchId ? { branchId: req.auth.branchId } : {})
    };

    const [daily, weekly, monthly, statusSummary, paymentSummary] = await Promise.all([
      prisma.payment.aggregate({
        where: { ...whereBase, receivedAt: { gte: startDay } },
        _sum: { amount: true }
      }),
      prisma.payment.aggregate({
        where: { ...whereBase, receivedAt: { gte: startWeek } },
        _sum: { amount: true }
      }),
      prisma.payment.aggregate({
        where: { ...whereBase, receivedAt: { gte: startMonth } },
        _sum: { amount: true }
      }),
      prisma.serviceOrder.groupBy({
        by: ["status"],
        where: whereBase,
        _count: { _all: true }
      }),
      prisma.payment.groupBy({
        by: ["method"],
        where: whereBase,
        _sum: { amount: true }
      })
    ]);

    res.json(
      serialize({
        daily: Number(daily._sum.amount ?? 0),
        weekly: Number(weekly._sum.amount ?? 0),
        monthly: Number(monthly._sum.amount ?? 0),
        ordersByStatus: statusSummary.map((item) => ({
          status: item.status,
          total: item._count._all
        })),
        paymentsByMethod: paymentSummary.map((item) => ({
          method: item.method,
          total: Number(item._sum.amount ?? 0)
        }))
      })
    );
  })
);

export default router;
