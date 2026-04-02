# Manual de despliegue

## Arquitectura recomendada

- Frontend web: Vercel
- API Node.js: Render Web Service
- Base de datos: PostgreSQL administrado en Render, Neon o Supabase
- Dominio sugerido:
  - `app.tu-dominio.com` para la web
  - `api.tu-dominio.com` para la API

## Estructura del monorepo

- `fixflow-saas/apps/web`: Next.js
- `fixflow-saas/apps/api`: Express + Prisma
- `fixflow-saas/docs`: documentacion operativa
- `render.yaml`: blueprint base para Render

## Variables de entorno

### API

- `DATABASE_URL`
- `JWT_SECRET`
- `PORT`
- `APP_ORIGIN`
- `APP_ORIGINS`
- `BILLING_TRANSFER_BANK_NAME`
- `BILLING_TRANSFER_ACCOUNT_HOLDER`
- `BILLING_TRANSFER_CLABE`
- `BILLING_TRANSFER_ACCOUNT_NUMBER`
- `BILLING_TRANSFER_REFERENCE_LABEL`
- `BILLING_TRANSFER_NOTE`
- `BILLING_SUPPORT_EMAIL`
- `BILLING_SUPPORT_WHATSAPP`
- `BILLING_OPERATOR_SECRET`

### Web

- `NEXT_PUBLIC_API_URL`

## Flujo recomendado de salida

1. Publicar primero la base de datos
2. Publicar la API
3. Ejecutar migraciones
4. Cargar seed solo si es un entorno demo
5. Publicar la web
6. Validar login, dashboard, ordenes y suscripcion
7. Conectar dominio

## Despliegue de la API en Render

### Servicio

- Tipo: `Web Service`
- Root Directory: `fixflow-saas/apps/api`
- Build Command: `npm install && npx prisma generate && npx prisma migrate deploy && node prisma/seed.js`
- Start Command: `npm start`

### Variables minimas

```env
DATABASE_URL=postgresql://...
JWT_SECRET=un-secreto-largo
PORT=4000
APP_ORIGIN=https://app.tu-dominio.com
APP_ORIGINS=https://app.tu-dominio.com,https://tu-panel.vercel.app
BILLING_OPERATOR_SECRET=operador-interno-seguro
```

### Variables de cobranza

```env
BILLING_TRANSFER_BANK_NAME=BBVA
BILLING_TRANSFER_ACCOUNT_HOLDER=Tu razon social
BILLING_TRANSFER_CLABE=012345678901234567
BILLING_TRANSFER_ACCOUNT_NUMBER=1234567890
BILLING_TRANSFER_REFERENCE_LABEL=Usa el folio de la factura como referencia
BILLING_TRANSFER_NOTE=Despues de transferir, reporta el pago desde el panel.
BILLING_SUPPORT_EMAIL=cobranza@tu-dominio.com
BILLING_SUPPORT_WHATSAPP=+525500000000
```

### Migraciones

En este blueprint las migraciones y el seed demo se ejecutan durante el build del servicio.

Eso resuelve una limitacion importante del plan free de Render:

- no hay shell remoto
- no hay one-off jobs

Si despues quieres produccion sin datos demo:

1. quita `&& node prisma/seed.js` del `buildCommand`
2. vuelve a desplegar

## Despliegue de la web en Vercel

### Proyecto

- Framework: Next.js
- Root Directory: `fixflow-saas/apps/web`

### Variable requerida

```env
NEXT_PUBLIC_API_URL=https://api.tu-dominio.com/api/v1
```

### Build

Vercel detecta Next.js automaticamente. No necesitas configuracion extra si el root es correcto.

## Checklist previa a produccion

- Base PostgreSQL accesible desde la API
- `DATABASE_URL` correcta
- `JWT_SECRET` distinto al de desarrollo
- `APP_ORIGIN` y `APP_ORIGINS` apuntando al frontend real
- `NEXT_PUBLIC_API_URL` apuntando a la API real
- Migraciones aplicadas
- Seed deshabilitado o controlado
- Cuenta de billing interna configurada
- `BILLING_OPERATOR_SECRET` guardado fuera del repositorio

## Checklist de validacion post-deploy

### Publico

- la pantalla de login abre
- el login devuelve al dashboard
- el menu lateral responde bien en desktop y movil

### Operacion

- crear cliente
- crear orden
- cambiar estado de orden
- crear item de inventario
- registrar venta POS
- registrar compra

### SaaS

- cargar `Suscripcion`
- ver facturas
- reportar pago manual
- entrar a `billing-admin`
- validar factura manualmente

## Rollback rapido

Si el frontend falla:

1. re-publica el deployment anterior en Vercel
2. conserva la API actual si no hubo cambio de contrato

Si la API falla:

1. revisa variables de entorno
2. revisa migraciones ejecutadas
3. vuelve al deployment anterior en Render
4. si el problema viene de schema, restaura la base antes de reabrir trafico

## Staging recomendado

Antes de publicar clientes reales, crea:

- `fixflow-api-staging`
- `fixflow-web-staging`
- una base PostgreSQL separada de staging

Asi puedes validar cambios visuales y migraciones sin tocar produccion.

## Comandos utiles

### Desarrollo local

```cmd
cd /d "C:\Users\HOGAR\Desktop\stitch_nueva_orden_de_servicio\fixflow-saas"
npm.cmd run dev
```

### Build de web

```cmd
cd /d "C:\Users\HOGAR\Desktop\stitch_nueva_orden_de_servicio\fixflow-saas"
npm.cmd run build --workspace apps/web
```

### Build de API

```cmd
cd /d "C:\Users\HOGAR\Desktop\stitch_nueva_orden_de_servicio\fixflow-saas"
npm.cmd run build --workspace apps/api
```

### Prisma

```cmd
cd /d "C:\Users\HOGAR\Desktop\stitch_nueva_orden_de_servicio\fixflow-saas"
npm.cmd run db:migrate
npm.cmd run db:seed
```
