# FixFlow SaaS

Base MVP para un sistema SaaS multiusuario orientado a talleres de reparacion de celulares y laptops.

## Stack

- Frontend: Next.js
- Backend: Node.js + Express
- Base de datos: PostgreSQL + Prisma
- Autenticacion: JWT + bcrypt
- Arquitectura: multitenant preparada para sucursales y branding por cliente

## Estructura

```text
fixflow-saas/
  apps/
    api/    -> API REST, autenticacion, Prisma y logica de negocio MVP
    web/    -> Panel web en Next.js
  docs/     -> Arquitectura, flujos, wireframes, API y despliegue
```

## Inicio rapido

1. Copia los archivos de entorno:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
```

2. Levanta PostgreSQL con Docker:

```bash
docker compose up -d
```

3. Instala dependencias:

```bash
npm install
```

4. Genera Prisma y aplica migraciones:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

5. Inicia el entorno:

```bash
npm run dev
```

## Credenciales MVP

- Admin: `admin@demo.fixflow.app` / `Admin2026!`
- Tecnico: `tecnico@demo.fixflow.app` / `Tecnico2026!`
- Cajero: `caja@demo.fixflow.app` / `Caja2026!`

## Estado actual del MVP

- Login con JWT
- Dashboard con metricas y pipeline de ordenes
- Alta y consulta de clientes
- Alta de ordenes de servicio con cliente y dispositivo
- Cambio rapido de estado en ordenes
- Ticket termico imprimible desde ordenes
- Alta y consulta de inventario
- Alta de usuarios con roles
- POS basico con partidas y metodo de pago
- Caja, reportes, proveedores y garantias en base MVP
- Branding por tenant
- Sucursales base
- Compras con impacto a inventario
- Reportes por estado y metodo de cobro
- Suscripcion con vigencia, invoices y bloqueo por impago
- Pago manual por SPEI con reporte de transferencia y validacion
- Backoffice interno de facturacion en `/billing-admin`

## Variables de cobro manual

Configura en `apps/api/.env` los datos bancarios del cobro SaaS:

- `BILLING_TRANSFER_BANK_NAME`
- `BILLING_TRANSFER_ACCOUNT_HOLDER`
- `BILLING_TRANSFER_CLABE`
- `BILLING_TRANSFER_ACCOUNT_NUMBER`
- `BILLING_TRANSFER_REFERENCE_LABEL`
- `BILLING_TRANSFER_NOTE`
- `BILLING_SUPPORT_EMAIL`
- `BILLING_SUPPORT_WHATSAPP`
- `BILLING_OPERATOR_SECRET`

## Documentacion incluida

- `docs/architecture.md`
- `docs/database.md`
- `docs/wireframes.md`
- `docs/screen-flow.md`
- `docs/api-rest.md`
- `docs/openapi.yaml`
- `docs/deployment.md`
