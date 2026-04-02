"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { DataTableCard } from "@/components/data-table-card";
import { EmptyState } from "@/components/empty-state";
import { apiFetch, dateText } from "@/lib/api";

type Order = {
  id: string;
  folio: string;
  customer: { fullName: string };
  device: {
    category: string;
    brand: string;
    model: string;
    imei?: string | null;
    serialNumber?: string | null;
  };
  status: string;
  createdAt: string;
};

export default function DevicesPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    apiFetch<Order[]>("/service-orders").then(setOrders).catch(console.error);
  }, []);

  return (
    <DashboardShell
      title="Equipos recibidos"
      description="Historial operativo por dispositivo, IMEI y serie."
    >
      <DataTableCard
        title="Equipos recientes"
        description="La bitacora por equipo parte del historial de ordenes."
      >
        {orders.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Cliente</th>
                  <th>Equipo</th>
                  <th>Identificador</th>
                  <th>Estado</th>
                  <th>Recepcion</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.folio}</td>
                    <td>{order.customer.fullName}</td>
                    <td>
                      {order.device.category} · {order.device.brand} {order.device.model}
                    </td>
                    <td>{order.device.imei || order.device.serialNumber || "Sin dato"}</td>
                    <td>
                      <span className="badge info">{order.status}</span>
                    </td>
                    <td>{dateText(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Sin historial"
            description="Cuando se capturen ordenes, aqui veras la trazabilidad completa por equipo."
          />
        )}
      </DataTableCard>
    </DashboardShell>
  );
}
