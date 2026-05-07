"use client";

import { useRouter } from "next/navigation";

// ── Inline SVG Icons ─────────────────────────────────────────────────────────
const ShieldCheck = ({ size = 32, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
);
const ArrowRight = ({ size = 18, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
);
const Upload = ({ size = 28, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
);
const Cpu = ({ size = 28, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/></svg>
);
const EyeIcon = ({ size = 28, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
);
const BarChart3 = ({ size = 28, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
);
const MessageSquare = ({ size = 28, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
);
const Check = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="20 6 9 17 4 12"/></svg>
);
const Star = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
);
const Lock = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
);
const Zap = ({ size = 20, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
);

// ── Data ──────────────────────────────────────────────────────────────────────
const steps = [
  { num: "01", title: "Sube los archivos CSV", desc: "Carga los F07, F14 o cualquier anexo del Ministerio de Hacienda directamente en la plataforma.", icon: Upload, color: "bg-secondary text-on-secondary shadow-secondary/30" },
  { num: "02", title: "La IA procesa y audita", desc: "Nuestro motor Isolation Forest detecta anomalías, valida retenciones y cruza datos automáticamente.", icon: Cpu, color: "bg-primary text-on-primary shadow-primary/30" },
  { num: "03", title: "Tu cliente accede a su vista", desc: "Cada empresa obtiene un dashboard financiero aislado, seguro y listo para la toma de decisiones.", icon: EyeIcon, color: "bg-secondary text-on-secondary shadow-secondary/30" },
];

const features = [
  { title: "Auditoría Fiscal IA", desc: "Motor Isolation Forest que detecta anomalías tributarias, errores en retenciones IVA y patrones irregulares en tiempo real. Explica cada alerta para que valides con confianza.", icon: ShieldCheck, accent: "from-primary/10 to-primary/5", iconBg: "bg-primary text-on-primary shadow-primary/30" },
  { title: "Dashboards de Segmentación RFM", desc: "Visualiza la concentración de ingresos y gastos con treemaps interactivos. Identifica clientes campeones, proveedores estratégicos y riesgos de cartera.", icon: BarChart3, accent: "from-secondary/10 to-secondary/5", iconBg: "bg-secondary text-on-secondary shadow-secondary/30" },
  { title: "Asistente RAG Text-to-SQL", desc: "Consulta tus datos financieros en lenguaje natural. Pregunta '¿Cuánto facturé en enero?' y obtén la respuesta exacta con transparencia SQL completa.", icon: MessageSquare, accent: "from-primary/10 to-secondary/5", iconBg: "bg-primary text-on-primary shadow-primary/30" },
];

const plans = [
  { name: "Freemium", price: "$0", period: "/mes", desc: "Ideal para probar la herramienta", badge: null, features: ["1 Empresa", "14 días de prueba completa", "Dashboard financiero básico", "Reportes IA limitados", "Soporte comunidad"], cta: "Probar Gratis", ctaStyle: "bg-surface-container-low text-primary border-2 border-outline-variant hover:border-primary hover:bg-primary/5", popular: false },
  { name: "Contador", price: "$29", period: "/mes", desc: "Para contadores independientes", badge: "Más Popular", features: ["Hasta 10 Empresas", "Usuarios de solo lectura para clientes", "Auditoría IA completa", "Reportes estándar ilimitados", "Soporte email prioritario"], cta: "Comenzar Ahora", ctaStyle: "bg-primary text-on-primary shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30", popular: true },
  { name: "Despacho", price: "$79", period: "/mes", desc: "Para firmas contables establecidas", badge: null, features: ["Hasta 50 Empresas", "Usuarios ilimitados", "Reportes IA ilimitados", "Marca blanca disponible", "Soporte dedicado"], cta: "Contactar Ventas", ctaStyle: "bg-surface-container-low text-primary border-2 border-outline-variant hover:border-secondary hover:bg-secondary/5", popular: false },
];

const metrics = [
  { value: "500+", label: "Declaraciones Procesadas" },
  { value: "99.9%", label: "Precisión en Auditorías" },
  { value: "50+", label: "Firmas Contables" },
];

// ── Main Component ───────────────────────────────────────────────────────────
export default function Home() {
  const router = useRouter();

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans overflow-x-hidden">

      {/* ══════════════════════════ 1. NAVBAR ══════════════════════════════════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-xl border-b border-outline-variant/30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => scrollTo("hero")} className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-md shadow-primary/20 group-hover:rotate-3 transition-transform">
              <ShieldCheck className="text-on-primary" size={20} />
            </div>
            <span className="text-xl font-black text-primary tracking-tighter uppercase">Arturo</span>
          </button>

          <div className="hidden md:flex items-center gap-8">
            {[["Beneficios","features"],["Cómo Funciona","how"],["Precios","pricing"]].map(([label, id]) => (
              <button key={id} onClick={() => scrollTo(id)} className="text-xs font-bold text-on-surface-variant uppercase tracking-wider hover:text-primary transition-colors">{label}</button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/login")} className="text-xs font-black text-primary uppercase tracking-wider hover:text-secondary transition-colors hidden sm:block">Iniciar Sesión</button>
            <button onClick={() => router.push("/register")} className="bg-primary text-on-primary text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all active:scale-95 flex items-center gap-2">
              Crear Cuenta <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </nav>

      {/* ══════════════════════════ 2. HERO ════════════════════════════════════ */}
      <section id="hero" className="relative pt-32 pb-20 md:pt-44 md:pb-32 px-6">
        {/* Decorative glows */}
        <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full bg-primary animate-pulse-glow blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-secondary animate-pulse-glow blur-[120px] pointer-events-none" style={{ animationDelay: "2s" }} />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-secondary/10 text-secondary px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-8 border border-secondary/20">
            <Zap size={12} /> Hecho para Contadores de El Salvador 🇸🇻
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-primary tracking-tighter leading-[0.95] mb-6">
            Revoluciona tu Despacho Contable con{" "}
            <span className="bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">Inteligencia Artificial</span>
          </h1>

          <p className="text-on-surface-variant text-base md:text-lg font-medium max-w-2xl mx-auto mb-10 leading-relaxed">
            Procesa los anexos F07 y F14 del Ministerio de Hacienda en segundos.
            Entrega a cada cliente un dashboard financiero interactivo, aislado y seguro.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => router.push("/register")} className="group bg-primary text-on-primary px-8 py-4 rounded-2xl shadow-xl shadow-primary/20 text-sm font-black uppercase tracking-widest hover:shadow-2xl hover:shadow-primary/30 transition-all active:scale-95 flex items-center gap-3">
              Crear Cuenta Gratis <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button onClick={() => scrollTo("how")} className="text-primary border-2 border-outline-variant px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest hover:border-primary hover:bg-primary/5 transition-all active:scale-95">
              Ver Cómo Funciona
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════ 3. SOCIAL PROOF ═══════════════════════════ */}
      <section className="border-y border-outline-variant/40 bg-surface-container-low/50">
        <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          {metrics.map((m) => (
            <div key={m.label}>
              <p className="text-3xl md:text-4xl font-black text-primary tracking-tighter">{m.value}</p>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">{m.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════ 4. CÓMO FUNCIONA ══════════════════════════ */}
      <section id="how" className="py-20 md:py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[10px] font-black text-secondary uppercase tracking-[0.3em]">Proceso Simple</span>
            <h2 className="text-3xl md:text-4xl font-black text-primary tracking-tighter mt-2">Cómo Funciona</h2>
            <p className="text-on-surface-variant text-sm font-medium mt-3 max-w-lg mx-auto">Tres pasos para transformar la forma en que gestionas la contabilidad de tus clientes.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connector line - desktop only */}
            <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-secondary/20 via-primary/20 to-secondary/20" />

            {steps.map((step, i) => (
              <div key={i} className="relative flex flex-col items-center text-center group">
                <div className={`w-16 h-16 rounded-2xl ${step.color} flex items-center justify-center shadow-lg mb-6 group-hover:scale-110 transition-transform z-10`}>
                  <step.icon size={28} />
                </div>
                <span className="text-[10px] font-black text-outline uppercase tracking-widest mb-2">Paso {step.num}</span>
                <h3 className="text-lg font-black text-primary tracking-tight mb-2">{step.title}</h3>
                <p className="text-on-surface-variant text-sm font-medium leading-relaxed max-w-xs">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════ 5. FEATURES ═══════════════════════════════ */}
      <section id="features" className="py-20 md:py-28 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-surface via-surface-container-low/30 to-surface pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <span className="text-[10px] font-black text-secondary uppercase tracking-[0.3em]">Capacidades</span>
            <h2 className="text-3xl md:text-4xl font-black text-primary tracking-tighter mt-2">Todo lo que Necesitas</h2>
            <p className="text-on-surface-variant text-sm font-medium mt-3 max-w-lg mx-auto">Herramientas de inteligencia artificial diseñadas específicamente para el cumplimiento fiscal salvadoreño.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <div key={i} className="group relative bg-white/60 backdrop-blur-xl border border-outline-variant/30 rounded-3xl p-8 shadow-xl shadow-zinc-200/30 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                {/* Gradient accent */}
                <div className={`absolute inset-0 bg-gradient-to-br ${f.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl`} />

                <div className="relative z-10">
                  <div className={`w-14 h-14 rounded-2xl ${f.iconBg} flex items-center justify-center shadow-lg mb-6`}>
                    <f.icon size={26} />
                  </div>
                  <h3 className="text-xl font-black text-primary tracking-tight mb-3">{f.title}</h3>
                  <p className="text-on-surface-variant text-sm font-medium leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════ 6. PRICING ════════════════════════════════ */}
      <section id="pricing" className="py-20 md:py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[10px] font-black text-secondary uppercase tracking-[0.3em]">Membresías</span>
            <h2 className="text-3xl md:text-4xl font-black text-primary tracking-tighter mt-2">Elige tu Plan</h2>
            <p className="text-on-surface-variant text-sm font-medium mt-3 max-w-lg mx-auto">Comienza gratis y escala a medida que crece tu cartera de clientes.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            {plans.map((plan, i) => (
              <div key={i} className={`relative bg-white/60 backdrop-blur-xl border rounded-3xl p-8 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${plan.popular ? "border-primary ring-2 ring-primary/20 md:scale-105" : "border-outline-variant/30"}`}>
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-on-primary text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-md flex items-center gap-1.5">
                    <Star size={10} /> {plan.badge}
                  </div>
                )}

                <div className="text-center mb-8 pt-2">
                  <h3 className="text-lg font-black text-primary uppercase tracking-wider">{plan.name}</h3>
                  <p className="text-on-surface-variant text-xs font-medium mt-1">{plan.desc}</p>
                  <div className="mt-4 flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-black text-primary tracking-tighter">{plan.price}</span>
                    <span className="text-on-surface-variant text-sm font-bold">{plan.period}</span>
                  </div>
                </div>

                <div className="border-t border-outline-variant/30 pt-6 mb-8 space-y-3.5">
                  {plan.features.map((feat, j) => (
                    <div key={j} className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${plan.popular ? "bg-secondary/15 text-secondary" : "bg-primary/10 text-primary"}`}>
                        <Check size={11} />
                      </div>
                      <span className="text-sm text-on-surface font-medium">{feat}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => router.push(i === 2 ? "/register" : "/register")}
                  className={`w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 ${plan.ctaStyle}`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════ 7. CTA FINAL ══════════════════════════════ */}
      <section className="py-20 md:py-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-container" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-secondary/10 rounded-full blur-[120px] animate-pulse-glow pointer-events-none" />

        <div className="max-w-2xl mx-auto text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-black text-on-primary tracking-tighter mb-4">Empieza tu Prueba Gratuita Hoy</h2>
          <p className="text-on-primary/70 text-sm font-medium mb-8 max-w-lg mx-auto">Sin tarjeta de crédito. Sin compromisos. Configura tu primera empresa en menos de 2 minutos.</p>
          <button onClick={() => router.push("/register")} className="group bg-white text-primary px-8 py-4 rounded-2xl shadow-xl text-sm font-black uppercase tracking-widest hover:shadow-2xl transition-all active:scale-95 flex items-center gap-3 mx-auto">
            Crear Mi Cuenta Gratis <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
          <div className="flex items-center justify-center gap-2 mt-6 text-on-primary/50">
            <Lock size={12} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Datos cifrados • Aislamiento multi-tenant • ISO 27001</span>
          </div>
        </div>
      </section>

      {/* ══════════════════════════ 8. FOOTER ═════════════════════════════════ */}
      <footer className="border-t border-outline-variant/30 bg-surface-container-low/30">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-md shadow-primary/20">
                <ShieldCheck className="text-on-primary" size={18} />
              </div>
              <div>
                <span className="text-lg font-black text-primary tracking-tighter uppercase">Arturo</span>
                <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest opacity-60">Inteligencia Contable con IA</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {["Términos", "Privacidad", "Soporte"].map((link) => (
                <button key={link} className="text-xs font-bold text-on-surface-variant uppercase tracking-wider hover:text-primary transition-colors">{link}</button>
              ))}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-outline-variant/20 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest opacity-40">
              © 2026 Arturo. Todos los derechos reservados.
            </p>
            <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest opacity-40">
              v2026.05 • Hecho en El Salvador 🇸🇻
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
