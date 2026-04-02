import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

const envFiles = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../../.env")
];

for (const filePath of envFiles) {
  if (fs.existsSync(filePath)) {
    dotenv.config({ path: filePath });
  }
}

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(12),
  PORT: z.coerce.number().default(4000),
  APP_ORIGIN: z.string().default("http://localhost:3000"),
  APP_ORIGINS: z.string().optional(),
  BILLING_TRANSFER_BANK_NAME: z.string().default("Banco destino"),
  BILLING_TRANSFER_ACCOUNT_HOLDER: z.string().default("Titular pendiente"),
  BILLING_TRANSFER_CLABE: z.string().default(""),
  BILLING_TRANSFER_ACCOUNT_NUMBER: z.string().default(""),
  BILLING_TRANSFER_REFERENCE_LABEL: z.string().default("Referencia de pago"),
  BILLING_TRANSFER_NOTE: z
    .string()
    .default("Realiza tu pago por SPEI y reportalo para validacion manual."),
  BILLING_SUPPORT_EMAIL: z.string().default(""),
  BILLING_SUPPORT_WHATSAPP: z.string().default(""),
  BILLING_OPERATOR_SECRET: z.string().default("")
});

export const env = schema.parse(process.env);
