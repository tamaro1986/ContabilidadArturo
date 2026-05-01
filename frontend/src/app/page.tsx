"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const handleSimulateLogin = (tenantId: string) => {
    localStorage.setItem("X-Mock-Tenant-ID", tenantId);
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/30">
      <div className="max-w-md w-full bg-slate-900/50 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-slate-800/50 text-center">
        <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-linear-to-r from-emerald-400 to-cyan-400 tracking-tight mb-2">
          Simulador de Acceso
        </h1>
        <p className="text-slate-400 mb-8 font-medium">
          Selecciona un perfil de prueba para ingresar al sistema y verificar el aislamiento multi-tenant.
        </p>

        <div className="flex flex-col gap-4">
          <button
            onClick={() => handleSimulateLogin("tenant_A")}
            className="w-full bg-slate-800 hover:bg-emerald-600/20 hover:border-emerald-500/50 border border-slate-700 transition-all text-slate-200 font-bold py-4 rounded-2xl flex items-center justify-center gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">A</div>
            Entrar como Cliente A
          </button>
          
          <button
            onClick={() => handleSimulateLogin("tenant_B")}
            className="w-full bg-slate-800 hover:bg-cyan-600/20 hover:border-cyan-500/50 border border-slate-700 transition-all text-slate-200 font-bold py-4 rounded-2xl flex items-center justify-center gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center">B</div>
            Entrar como Cliente B
          </button>
          
          <button
            onClick={() => handleSimulateLogin("tenant_C")}
            className="w-full bg-slate-800 hover:bg-purple-600/20 hover:border-purple-500/50 border border-slate-700 transition-all text-slate-200 font-bold py-4 rounded-2xl flex items-center justify-center gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center">C</div>
            Entrar como Cliente C
          </button>
        </div>
      </div>
    </div>
  );
}
