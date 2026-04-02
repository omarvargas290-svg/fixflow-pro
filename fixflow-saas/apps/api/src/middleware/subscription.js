import { syncTenantSubscription } from "../services/subscription-service.js";

const blockedStatuses = new Set(["PAST_DUE", "CANCELED"]);

export function requireOperationalSubscription(req, res, next) {
  if (!req.auth?.tenantId) {
    return res.status(401).json({ message: "Token requerido." });
  }

  Promise.resolve(syncTenantSubscription(req.auth.tenantId))
    .then((tenant) => {
      if (!tenant) {
        return res.status(404).json({ message: "Tenant no encontrado." });
      }

      req.tenant = tenant;

      if (blockedStatuses.has(tenant.subscriptionStatus)) {
        return res.status(402).json({
          message: "La suscripcion del tenant requiere regularizacion para operar.",
          subscription: tenant
        });
      }

      return next();
    })
    .catch(next);
}
