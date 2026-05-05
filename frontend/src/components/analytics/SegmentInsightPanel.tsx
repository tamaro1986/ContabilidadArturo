"use client";

// ── Inline SVG Icons (zero external deps) ──────────────────────────────────────

const BarChart3Icon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M7 16h.01"/>
    <path d="M7 11v5"/><path d="M11 8v8"/><path d="M15 12v4"/><path d="M19 5v11"/>
  </svg>
);

const StarIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

const RocketIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
  </svg>
);

const ShieldAlertIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <path d="M12 8v4"/><path d="M12 16h.01"/>
  </svg>
);

const ZapIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor"
    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>
  </svg>
);

const ChevronRightIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6"/>
  </svg>
);

// ── Component ──────────────────────────────────────────────────────────────────

export default function SegmentInsightPanel() {
    return (
        <div className="bg-surface-container-lowest rounded-lg p-8 border border-outline-variant shadow-sm h-full flex flex-col justify-center">
            <h3 className="text-sm font-bold text-primary mb-6 flex items-center gap-2 uppercase tracking-widest">
                <span className="text-secondary"><BarChart3Icon size={18} /></span>
                Inteligencia de Clientes
            </h3>
            <p className="text-on-surface-variant text-sm mb-8 leading-relaxed">
                Análisis heurístico de la base de datos para identificar patrones de consumo y optimizar el cumplimiento tributario.
            </p>
            
            <div className="space-y-6 mb-10">
                <div className="flex items-start gap-4 group">
                    <div className="bg-surface-dim p-2.5 rounded-md text-primary border border-outline-variant transition-colors group-hover:bg-primary group-hover:text-on-primary">
                        <StarIcon size={16} />
                    </div>
                    <div>
                        <h4 className="font-bold text-primary text-xs uppercase tracking-wider">Clientes de Alto Valor</h4>
                        <p className="text-on-surface-variant text-[11px] mt-1 leading-relaxed">Entidades con flujo constante y alta solvencia. Base de la estabilidad fiscal.</p>
                    </div>
                </div>
                <div className="flex items-start gap-4 group">
                    <div className="bg-surface-dim p-2.5 rounded-md text-secondary border border-outline-variant transition-colors group-hover:bg-secondary group-hover:text-on-secondary">
                        <RocketIcon size={16} />
                    </div>
                    <div>
                        <h4 className="font-bold text-primary text-xs uppercase tracking-wider">Potencial de Crecimiento</h4>
                        <p className="text-on-surface-variant text-[11px] mt-1 leading-relaxed">Nuevas incorporaciones con tendencia positiva en volumen de operaciones.</p>
                    </div>
                </div>
                <div className="flex items-start gap-4 group">
                    <div className="bg-surface-dim p-2.5 rounded-md text-error border border-outline-variant transition-colors group-hover:bg-error group-hover:text-on-error">
                        <ShieldAlertIcon size={16} />
                    </div>
                    <div>
                        <h4 className="font-bold text-primary text-xs uppercase tracking-wider">Riesgo de Inactividad</h4>
                        <p className="text-on-surface-variant text-[11px] mt-1 leading-relaxed">Contribuyentes con decremento en frecuencia. Requieren validación de estatus.</p>
                    </div>
                </div>
            </div>

            <div className="pt-8 border-t border-outline-variant">
                <div className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em] mb-4">
                    <span className="text-secondary"><ZapIcon size={12} /></span>
                    Directriz Estratégica
                </div>
                <div className="text-on-surface-variant text-[11px] leading-relaxed italic bg-surface-container p-4 rounded-md border border-outline-variant border-l-4 border-l-secondary">
                    &quot;Priorizar la regularización de saldos en el segmento <span className="text-primary font-bold">En Riesgo</span> para optimizar la declaración del próximo período fiscal.&quot;
                </div>
                <button className="w-full mt-6 py-2.5 bg-primary text-on-primary rounded-md text-[10px] font-bold uppercase tracking-[0.2em] hover:opacity-90 transition-all flex items-center justify-center gap-2">
                    Ver Reporte Detallado <ChevronRightIcon size={14} />
                </button>
            </div>
        </div>
    );
}
