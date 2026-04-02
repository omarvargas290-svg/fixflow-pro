"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { DataTableCard } from "@/components/data-table-card";
import { EmptyState } from "@/components/empty-state";
import { apiFetch, dateText } from "@/lib/api";

type Warranty = {
  id: string;
  status: string;
  startsAt: string;
  endsAt: string;
  device: { brand: string; model: string };
  serviceOrder: { folio: string };
};

export default function WarrantiesPage() {
  const [warranties, setWarranties] = useState<Warranty[]>([]);

  useEffect(() => {
    apiFetch<Warranty[]>("/warranties").then(setWarranties).catch(console.error);
  }, []);

  return (
    <DashboardShell
      title="Garantias"
      description="Consulta de equipos cubiertos, vigencia y referencia de orden."
    >
      <DataTableCard title="Garantias activas" description="Preparado para reclamaciones y seguimiento.">
        {warranties.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Orden</th>
                  <th>Equipo</th>
                  <th>Estado</th>
                  <th>Inicio</th>
                  <th>Vence</th>
                </tr>
              </thead>
              <tbody>
                {warranties.map((warranty) => (
                  <tr key={warranty.id}>
                    <td>{warranty.serviceOrder.folio}</td>
                    <td>
                      {warranty.device.brand} {warranty.device.model}
                    </td>
                    <td>
                      <span className="badge success">{warranty.status}</span>
                    </td>
                    <td>{dateText(warranty.startsAt)}</td>
                    <td>{dateText(warranty.endsAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Sin garantias registradas"
            description="Se habilitan al cerrar el flujo completo de entrega del equipo."
          />
        )}
      </DataTableCard>
    </DashboardShell>
  );
}
