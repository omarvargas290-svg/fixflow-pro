import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getDashboardSummary } from "../services/dashboard-service.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

router.get(
  "/summary",
  requireAuth,
  asyncHandler(async (req, res) => {
    const summary = await getDashboardSummary({
      tenantId: req.auth.tenantId,
      branchId: req.auth.branchId
    });

    res.json(summary);
  })
);

export default router;
