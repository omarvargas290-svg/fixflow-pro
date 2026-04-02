import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { prisma } from "../services/prisma.js";
import { syncTenantSubscription } from "../services/subscription-service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { serialize } from "../utils/serialize.js";

const router = Router();

router.get(
  "/profile",
  requireAuth,
  asyncHandler(async (req, res) => {
    await syncTenantSubscription(req.auth.tenantId);
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.auth.tenantId },
      include: {
        brandProfile: true,
        subscriptionInvoices: {
          orderBy: { createdAt: "desc" },
          take: 5
        },
        branches: {
          where: { isActive: true },
          orderBy: { createdAt: "asc" }
        }
      }
    });

    res.json(serialize(tenant));
  })
);

router.put(
  "/profile",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      name: z.string().min(3),
      plan: z.string().optional(),
      companyName: z.string().optional(),
      billingEmail: z.string().email().optional().or(z.literal("")),
      primaryColor: z.string().optional(),
      secondaryColor: z.string().optional(),
      accentColor: z.string().optional(),
      ticketHeader: z.string().optional(),
      supportEmail: z.string().email().optional().or(z.literal("")),
      customDomain: z.string().optional()
    });

    const payload = schema.parse(req.body);

    const tenant = await prisma.tenant.update({
      where: { id: req.auth.tenantId },
      data: {
        name: payload.name,
        plan: payload.plan || undefined,
        billingEmail: payload.billingEmail || null,
        brandProfile: {
          upsert: {
            update: {
              companyName: payload.companyName || null,
              primaryColor: payload.primaryColor || undefined,
              secondaryColor: payload.secondaryColor || undefined,
              accentColor: payload.accentColor || undefined,
              ticketHeader: payload.ticketHeader || null,
              supportEmail: payload.supportEmail || null,
              customDomain: payload.customDomain || null
            },
            create: {
              companyName: payload.companyName || null,
              primaryColor: payload.primaryColor || undefined,
              secondaryColor: payload.secondaryColor || undefined,
              accentColor: payload.accentColor || undefined,
              ticketHeader: payload.ticketHeader || null,
              supportEmail: payload.supportEmail || null,
              customDomain: payload.customDomain || null
            }
          }
        }
      },
      include: {
        brandProfile: true,
        subscriptionInvoices: {
          orderBy: { createdAt: "desc" },
          take: 5
        },
        branches: {
          where: { isActive: true },
          orderBy: { createdAt: "asc" }
        }
      }
    });

    res.json(serialize(tenant));
  })
);

export default router;
