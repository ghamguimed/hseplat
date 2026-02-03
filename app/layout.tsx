import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Logistics & Customs Simulator",
  description: "Simulate Gulf logistics and customs routes"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
