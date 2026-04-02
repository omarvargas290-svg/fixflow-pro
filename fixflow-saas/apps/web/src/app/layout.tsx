import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FixFlow SaaS",
  description: "Plataforma SaaS para talleres de reparacion."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
