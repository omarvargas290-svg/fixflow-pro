# Arquitectura MVP

## Objetivo

Construir una plataforma SaaS multitenant para talleres de reparacion con foco en:

- Operacion diaria del mostrador y taller
- Control financiero y de refacciones
- Roles y permisos
- Escalabilidad a multiples sucursales
- Branding por cliente y licenciamiento por suscripcion

## Arquitectura propuesta

### Frontend

- Next.js App Router
- UI responsive con un shell administrativo unico
- Sesion basada en JWT almacenada en navegador
- Consumo de API REST versionada

### Backend

- Node.js + Express
- Capa REST `/api/v1`
- Middleware de autenticacion y control de roles
- Prisma ORM sobre PostgreSQL
- Modelo multitenant con `tenantId` en entidades clave

### Base de datos

- PostgreSQL
- Prisma para migraciones, seed y modelo relacional
- Tenant aislado por `tenantId`
- Preparado para `branchId` por sucursal

## Capas

1. Presentacion
   - Login
   - Dashboard
   - Modulos operativos
2. API
   - Auth
   - Dashboard
   - Clientes
   - Ordenes
   - Inventario
   - Usuarios
   - Proveedores
   - POS
   - Caja
   - Reportes
3. Dominio
   - Reglas de negocio
   - Folios
   - Pagos y anticipos
   - Uso de piezas
   - Garantias
4. Persistencia
   - Prisma
   - PostgreSQL

## MVP incluido

- Login y sesion
- Dashboard con metricas
- Clientes
- Equipos recibidos e historial base
- Ordenes de servicio
- Estados de reparacion
- Inventario y refacciones
- Usuarios y permisos
- POS base
- Caja base
- Reportes base
- Proveedores y compras base
- Garantias base

## Fase 2 ya montada sobre el MVP

- Branding por tenant
- Sucursales base para evolucion multi-branch
- Compras con actualizacion de inventario
- Panel administrativo con gestion de identidad del negocio
- Reportes enriquecidos por estado y metodo de cobro
- Suscripcion con invoices manuales y bloqueo por impago
- Backoffice interno para facturacion manual y validacion de transferencias

## Mejoras avanzadas sugeridas

- Multisucursal operativa real por inventario separado
- Planes SaaS y facturacion recurrente
- Branding dinamico por tenant
- Notificaciones WhatsApp / email
- Firma digital de recepcion
- OCR de IMEI / serie
- Portal de seguimiento para cliente final
