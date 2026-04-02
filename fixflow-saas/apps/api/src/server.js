import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import authRoutes from "./routes/auth-routes.js";
import billingAdminRoutes from "./routes/billing-admin-routes.js";
import branchRoutes from "./routes/branch-routes.js";
import cashRoutes from "./routes/cash-routes.js";
import customerRoutes from "./routes/customer-routes.js";
import dashboardRoutes from "./routes/dashboard-routes.js";
import inventoryRoutes from "./routes/inventory-routes.js";
import orderRoutes from "./routes/order-routes.js";
import posRoutes from "./routes/pos-routes.js";
import purchaseRoutes from "./routes/purchase-routes.js";
import reportRoutes from "./routes/report-routes.js";
import subscriptionRoutes from "./routes/subscription-routes.js";
import supplierRoutes from "./routes/supplier-routes.js";
import tenantRoutes from "./routes/tenant-routes.js";
import userRoutes from "./routes/user-routes.js";
import warrantyRoutes from "./routes/warranty-routes.js";
import { requireAuth } from "./middleware/auth.js";
import { requireOperationalSubscription } from "./middleware/subscription.js";

const app = express();
const allowedOrigins = (env.APP_ORIGINS || env.APP_ORIGIN)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origen no permitido por CORS."));
    },
    credentials: false
  })
);
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "fixflow-api", timestamp: new Date().toISOString() });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/billing-admin", billingAdminRoutes);
app.use("/api/v1/tenant", tenantRoutes);
app.use("/api/v1/branches", branchRoutes);
app.use("/api/v1/subscriptions", subscriptionRoutes);
app.use("/api/v1/dashboard", requireAuth, requireOperationalSubscription, dashboardRoutes);
app.use("/api/v1/customers", requireAuth, requireOperationalSubscription, customerRoutes);
app.use("/api/v1/service-orders", requireAuth, requireOperationalSubscription, orderRoutes);
app.use("/api/v1/inventory", requireAuth, requireOperationalSubscription, inventoryRoutes);
app.use("/api/v1/users", requireAuth, requireOperationalSubscription, userRoutes);
app.use("/api/v1/suppliers", requireAuth, requireOperationalSubscription, supplierRoutes);
app.use("/api/v1/purchase-orders", requireAuth, requireOperationalSubscription, purchaseRoutes);
app.use("/api/v1/pos", requireAuth, requireOperationalSubscription, posRoutes);
app.use("/api/v1/cash", requireAuth, requireOperationalSubscription, cashRoutes);
app.use("/api/v1/reports", requireAuth, requireOperationalSubscription, reportRoutes);
app.use("/api/v1/warranties", requireAuth, requireOperationalSubscription, warrantyRoutes);

app.use((error, _req, res, _next) => {
  console.error(error);

  if (error?.name === "ZodError") {
    return res.status(400).json({
      message: "Datos invalidos.",
      issues: error.issues
    });
  }

  return res.status(500).json({
    message: "Error interno del servidor."
  });
});

app.listen(env.PORT, () => {
  console.log(`FixFlow API listening on http://localhost:${env.PORT}`);
});
