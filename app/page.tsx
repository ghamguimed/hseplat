"use client";

import dynamic from "next/dynamic";
import { Sidebar } from "@/components/Sidebar";
import { useHydrated } from "@/lib/useHydrated";

const MapView = dynamic(() => import("@/components/MapView").then((mod) => mod.MapView), {
  ssr: false
});

export default function Home() {
  const hydrated = useHydrated();

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-slate-500">
        Loading simulator...
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold">Gulf Logistics & Customs Simulator</h1>
        <p className="text-sm text-slate-600">
          Simulez les routes terrestres et maritimes, et calculez les frais douaniers par pays.
        </p>
      </header>
      <main className="flex flex-1 overflow-hidden">
        <div className="w-[380px] overflow-y-auto">
          <Sidebar />
        </div>
        <div className="flex-1">
          <MapView />
        </div>
      </main>
    </div>
  );
}
