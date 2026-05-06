"use client";

import React from 'react';
import { DocumentHealth } from '@/types/analytics';

// ── Inline SVG Icons (zero external deps) ──────────────────────────────────────

const ShieldCheckIcon = ({ size = 32 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <path d="m9 12 2 2 4-4"/>
  </svg>
);

const AlertTriangleIcon = ({ size = 32 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
    <path d="M12 9v4"/><path d="M12 17h.01"/>
  </svg>
);

const XOctagonIcon = ({ size = 32 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/>
    <path d="m15 9-6 6"/><path d="m9 9 6 6"/>
  </svg>
);

// ── Component ──────────────────────────────────────────────────────────────────

export default function DocumentHealthBadge({ data }: { data: DocumentHealth | undefined }) {
    if (!data) return (
        <div className="flex items-center justify-center h-full bg-surface-container-lowest rounded-lg border border-outline-variant p-6">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest animate-pulse">
                Cargando Salud Documental...
            </p>
        </div>
    );

    const score = data.health_score || 0;

    let IconComponent = ShieldCheckIcon;
    let colorClass = "text-secondary";
    let bgClass = "bg-secondary/5 border-secondary/20";
    let label = "Salud Óptima";

    if (score < 90) {
        IconComponent = XOctagonIcon;
        colorClass = "text-error";
        bgClass = "bg-error/5 border-error/20";
        label = "Atención Requerida";
    } else if (score < 98) {
        IconComponent = AlertTriangleIcon;
        colorClass = "text-warning";
        bgClass = "bg-warning-container/20 border-warning/20";
        label = "Salud Estable";
    }

    return (
        <div className="bg-surface-container-lowest rounded-lg p-6 border border-outline-variant shadow-sm h-full flex flex-col transition-all hover:border-secondary/30">
            <h2 className="text-xs font-bold mb-6 text-primary uppercase tracking-widest flex items-center justify-between">
                Estado de Cumplimiento
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded tracking-normal ${colorClass} ${bgClass} border`}>
                    {label}
                </span>
            </h2>
            <div className={`p-6 rounded-lg border ${bgClass} flex items-center gap-6 flex-1`}>
                <div className={`p-4 rounded-xl bg-surface-container-lowest shadow-sm border border-outline-variant ${colorClass}`}>
                    <IconComponent size={32} />
                </div>
                <div>
                    <div className="flex items-baseline gap-1">
                        <span className={`text-4xl font-black tracking-tighter font-tnum ${colorClass}`}>{score.toFixed(1)}%</span>
                        <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wide">Validación</span>
                    </div>
                    <p className="text-on-surface-variant text-[11px] font-medium mt-1">Nivel de integridad documental del período.</p>
                </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
                <StatusPill label="Anulados" value={data.anulado} />
                <StatusPill label="Extraviados" value={data.extraviado} />
                <StatusPill label="Invalidado (DTE)" value={data.invalidado} />
            </div>
        </div>
    );
}

function StatusPill({ label, value }: { label: string, value: number }) {
    return (
        <span className="bg-surface-container-low px-3 py-1.5 rounded border border-outline-variant text-[10px] font-bold text-on-surface-variant flex items-center gap-2">
            <span className="text-primary font-black">{value}</span>
            <span className="opacity-70 uppercase tracking-tighter">{label}</span>
        </span>
    );
}
