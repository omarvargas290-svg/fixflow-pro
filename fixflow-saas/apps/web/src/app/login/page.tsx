"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";
import { saveSession } from "@/lib/session";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@demo.fixflow.app");
  const [password, setPassword] = useState("Admin2026!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "No fue posible iniciar sesion.");
      }

      saveSession(payload);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <div className="login-grid">
        <section className="hero-card">
          <div>
            <span className="eyebrow">FixFlow SaaS</span>
            <h1>Operacion, servicio y caja en un solo panel.</h1>
            <p>
              Diseñado para talleres de celulares y laptops que necesitan control
              profesional de ordenes, anticipos, inventario, POS, garantias y
              permisos por rol.
            </p>
          </div>

          <div className="hero-grid">
            <div className="hero-chip">
              <strong>Ordenes y folios</strong>
              <span>Busqueda por nombre, IMEI, telefono o folio.</span>
            </div>
            <div className="hero-chip">
              <strong>Inventario y piezas</strong>
              <span>Control de stock, costo, margen y piezas utilizadas.</span>
            </div>
            <div className="hero-chip">
              <strong>POS y caja</strong>
              <span>Cobros, ventas de mostrador y cortes operativos.</span>
            </div>
            <div className="hero-chip">
              <strong>SaaS escalable</strong>
              <span>Tenant, branding y base lista para multisucursal.</span>
            </div>
          </div>
        </section>

        <section className="login-card">
          <span className="eyebrow">Acceso seguro</span>
          <h2>Inicia sesion</h2>
          <p>Usa el ambiente demo del MVP para validar flujos y pantallas.</p>

          <form className="form-stack" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">Correo</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="password">Contrasena</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            {error ? <div className="danger-text">{error}</div> : null}

            <button className="primary-button" disabled={loading} type="submit">
              {loading ? "Entrando..." : "Entrar al panel"}
            </button>

            <Link className="secondary-button" href="/billing-admin">
              Backoffice de facturacion
            </Link>
          </form>
        </section>
      </div>
    </main>
  );
}
