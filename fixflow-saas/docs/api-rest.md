# API REST MVP

Base URL:

```text
/api/v1
```

## Auth

- `POST /auth/login`
- `GET /auth/me`

## Dashboard

- `GET /dashboard/summary`

## Tenant y branding

- `GET /tenant/profile`
- `PUT /tenant/profile`

## Sucursales

- `GET /branches`
- `POST /branches`

## Suscripcion

- `GET /subscriptions/current`
- `GET /subscriptions/invoices`
- `POST /subscriptions/invoices` (`x-billing-secret`, uso interno)
- `POST /subscriptions/invoices/:id/report-payment`
- `POST /subscriptions/invoices/:id/mark-paid` (`x-billing-secret`, uso interno)
- `POST /subscriptions/invoices/:id/mark-overdue` (`x-billing-secret`, uso interno)

## Backoffice de facturacion

- `GET /billing-admin/tenants` (`x-billing-secret`)
- `GET /billing-admin/invoices` (`x-billing-secret`)
- `POST /billing-admin/invoices` (`x-billing-secret`)
- `POST /billing-admin/invoices/:id/mark-paid` (`x-billing-secret`)
- `POST /billing-admin/invoices/:id/mark-overdue` (`x-billing-secret`)

## Clientes

- `GET /customers?search=`
- `POST /customers`

## Ordenes de servicio

- `GET /service-orders?search=&status=&technicianId=`
- `POST /service-orders`
- `PATCH /service-orders/:id/status`

## Inventario

- `GET /inventory/items?search=&lowStock=true`
- `POST /inventory/items`
- `PATCH /inventory/items/:id`

## Usuarios

- `GET /users`
- `POST /users`

## Proveedores

- `GET /suppliers`
- `POST /suppliers`

## Compras

- `GET /purchase-orders`
- `POST /purchase-orders`

## POS

- `GET /pos/sales`
- `POST /pos/sales`

## Caja

- `GET /cash/sessions/current`
- `POST /cash/sessions/open`
- `POST /cash/sessions/:id/close`

## Reportes

- `GET /reports/overview`

## Garantias

- `GET /warranties`

## Headers

```text
Authorization: Bearer <token>
Content-Type: application/json
```
