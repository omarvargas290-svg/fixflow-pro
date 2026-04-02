import { env } from "../config/env.js";

export function requireBillingOperator(req, res, next) {
  if (!env.BILLING_OPERATOR_SECRET) {
    return res.status(503).json({
      message: "El operador de facturacion no esta configurado en el servidor."
    });
  }

  const providedSecret = req.headers["x-billing-secret"];
  if (providedSecret !== env.BILLING_OPERATOR_SECRET) {
    return res.status(403).json({
      message: "No tienes permisos para acceder al backoffice de facturacion."
    });
  }

  next();
}
