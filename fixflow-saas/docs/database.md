# Modelo relacional

## Entidades principales

- `tenants`: cliente SaaS
- `brand_profiles`: branding por cliente
- `branches`: sucursales
- `users`: usuarios globales
- `memberships`: pertenencia del usuario dentro del tenant y sucursal
- `customers`: clientes finales
- `devices`: equipos recibidos
- `service_orders`: ordenes de servicio
- `service_order_notes`: bitacora tecnica
- `service_order_parts`: piezas utilizadas
- `inventory_items`: inventario y refacciones
- `inventory_movements`: entradas y salidas
- `suppliers`: proveedores
- `purchase_orders`: compras
- `purchase_order_items`: detalle de compra
- `payments`: anticipos, pagos y cobros
- `cash_sessions`: cortes de caja
- `cash_movements`: movimientos de caja
- `pos_sales`: ventas mostrador
- `pos_sale_items`: partidas de venta
- `warranties`: garantias
- `audit_logs`: trazabilidad

## Relaciones clave

- Un `tenant` tiene muchas `branches`
- Un `user` se conecta al negocio mediante `memberships`
- Un `customer` puede tener varios `devices`
- Un `device` puede tener varias `service_orders`
- Una `service_order` puede usar multiples piezas de inventario
- Los `payments` pueden vincularse a ordenes o ventas POS
- Las `warranties` nacen de una orden entregada

## Tenancy

Todas las entidades operativas incluyen `tenantId`. Las entidades que pueden dividirse por sucursal tambien incluyen `branchId`.

## Roles MVP

- `ADMIN`: configuracion, usuarios, finanzas, reportes, inventario
- `TECH`: diagnostico, avance tecnico, uso de piezas
- `CASHIER`: POS, cobros, caja y entrega
