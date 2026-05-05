"use client";

import { useRouter } from "next/navigation";
// ── Inline SVG Icons ───────────────────────────────────────────────────────────
const ShieldCheck = ({ size = 32, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
);
const UserCircle2 = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/></svg>
);
const Building2 = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>
);
const Landmark = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>
);
const ArrowRight = ({ size = 18, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
);

export default function Home() {
  const router = useRouter();

  const handleSimulateLogin = (tenantId: string) => {
    localStorage.setItem("X-Mock-Tenant-ID", tenantId);
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface relative overflow-hidden font-sans">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary opacity-[0.03] blur-[100px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary opacity-[0.03] blur-[100px]"></div>

      <div className="max-w-xl w-full mx-4 relative z-10">
        {/* Logo / Brand Section */}
        <div className="flex flex-col items-center mb-12">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20 mb-4 transform rotate-3 transition-transform duration-500">
            <ShieldCheck className="text-on-primary" size={32} />
          </div>
          <h1 className="text-4xl font-black text-primary tracking-tighter uppercase">Arturo</h1>
          <p className="text-on-surface-variant text-[11px] font-bold uppercase tracking-[0.4em] mt-2 opacity-70">
            Sistemas Contables Legales • Auditoría Inteligente
          </p>
        </div>

        <div className="bg-surface-container-lowest backdrop-blur-sm rounded-xl p-10 shadow-2xl border border-outline-variant">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-primary mb-3">
              Simulador de Acceso Multi-Tenant
            </h2>
            <p className="text-on-surface-variant text-sm font-medium leading-relaxed max-w-sm mx-auto">
              Seleccione un perfil de auditoría para verificar el aislamiento de datos y las políticas de integridad fiscal.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={() => handleSimulateLogin("tenant_A")}
              className="group flex items-center gap-5 p-5 bg-surface-container-low hover:bg-primary border border-outline-variant rounded-2xl transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
            >
              <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center text-on-primary transition-colors group-hover:bg-on-primary group-hover:text-primary shadow-md">
                <Building2 size={24} />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-black text-primary uppercase tracking-wider text-xs group-hover:text-on-primary">
                  Tenant de Referencia A
                </h3>
                <p className="text-on-surface-variant text-[11px] font-bold opacity-60 group-hover:text-on-primary group-hover:opacity-80">
                  Infraestructura Principal • Datos Consolidados
                </p>
              </div>
              <ArrowRight size={18} className="text-primary opacity-40 group-hover:text-on-primary group-hover:opacity-100 transition-all group-hover:translate-x-1" />
            </button>
            
            <button
              onClick={() => handleSimulateLogin("tenant_B")}
              className="group flex items-center gap-5 p-5 bg-surface-container-low hover:bg-secondary border border-outline-variant rounded-2xl transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
            >
              <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center text-on-secondary transition-colors group-hover:bg-on-secondary group-hover:text-secondary shadow-md">
                <UserCircle2 size={24} />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-black text-secondary uppercase tracking-wider text-xs group-hover:text-on-secondary">
                  Tenant de Auditoría B
                </h3>
                <p className="text-on-surface-variant text-[11px] font-bold opacity-60 group-hover:text-on-secondary group-hover:opacity-80">
                  Entorno de Pruebas • Segmentos RFM
                </p>
              </div>
              <ArrowRight size={18} className="text-secondary opacity-40 group-hover:text-on-secondary group-hover:opacity-100 transition-all group-hover:translate-x-1" />
            </button>
            
            <button
              onClick={() => handleSimulateLogin("tenant_C")}
              className="group flex items-center gap-5 p-5 bg-surface-container-low hover:bg-tertiary border border-outline-variant rounded-2xl transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
            >
              <div className="w-14 h-14 rounded-xl bg-tertiary flex items-center justify-center text-on-tertiary transition-colors group-hover:bg-on-tertiary group-hover:text-tertiary shadow-md">
                <Landmark size={24} />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-black text-on-surface uppercase tracking-wider text-xs group-hover:text-on-tertiary">
                  Tenant de Stress Test C
                </h3>
                <p className="text-on-surface-variant text-[11px] font-bold opacity-60 group-hover:text-on-tertiary group-hover:opacity-80">
                  Volumen Elevado • Carga Sintética
                </p>
              </div>
              <ArrowRight size={18} className="text-on-surface opacity-40 group-hover:text-on-tertiary group-hover:opacity-100 transition-all group-hover:translate-x-1" />
            </button>
          </div>

          <div className="mt-12 pt-8 border-t border-outline-variant text-center">
            <button 
              onClick={() => router.push('/login')}
              className="text-primary font-black uppercase tracking-widest text-[10px] hover:underline flex items-center justify-center gap-2 mx-auto"
            >
              Regresar al Portal de Autenticación Oficial
            </button>
          </div>
        </div>
        
        <p className="text-center mt-10 text-on-surface-variant text-[9px] font-bold uppercase tracking-[0.3em] opacity-40">
          Uso Restringido • Terminal de Simulación v2026.05
        </p>
      </div>
    </div>
  );
}
