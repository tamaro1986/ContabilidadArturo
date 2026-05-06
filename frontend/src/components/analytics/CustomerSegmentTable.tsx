"use client";

import React from 'react';

// ── Inline SVG Icons (zero external deps) ──────────────────────────────────────


const AlertCircleIcon = ({ size = 40 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={1} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>
  </svg>
);

const ExternalLinkIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
  </svg>
);

// ── Types ──────────────────────────────────────────────────────────────────────

import { CustomerSegmentRecord } from "@/types/analytics";

// ── Component ──────────────────────────────────────────────────────────────────

export default function CustomerSegmentTable({ data }: { data: CustomerSegmentRecord[] }) {
    return (
        <div className="bg-surface-container-lowest rounded-lg border border-outline-variant overflow-hidden shadow-sm">
            <div className="overflow-x-auto custom-scrollbar max-h-125">
                <table className="w-full text-left border-collapse table-fixed min-w-200">
                    <thead className="sticky top-0 bg-primary z-10 shadow-sm">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-bold text-on-primary uppercase tracking-widest w-1/3">
                                Entidad / Razón Social
                            </th>
                            <th className="px-6 py-4 text-[10px] font-bold text-on-primary uppercase tracking-widest w-1/6">
                                Registro Fiscal
                            </th>
                            <th className="px-6 py-4 text-[10px] font-bold text-on-primary uppercase tracking-widest text-right w-1/6">
                                Última Op.
                            </th>
                            <th className="px-6 py-4 text-[10px] font-bold text-on-primary uppercase tracking-widest text-right w-1/6">
                                Volumen Total
                            </th>
                            <th className="px-6 py-4 text-[10px] font-bold text-on-primary uppercase tracking-widest text-center w-1/6">
                                Clasificación
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant bg-surface-container-lowest">
                        {data.length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-24 text-center">
                                    <div className="flex flex-col items-center gap-4 text-on-surface-variant">
                                        <AlertCircleIcon size={40} />
                                        <p className="text-xs font-bold uppercase tracking-widest opacity-70">Sin registros disponibles</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                        {data.map((row, i) => (
                            <tr 
                                key={i} 
                                className="hover:bg-surface-container-low transition-colors group cursor-default"
                            >
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-primary truncate" title={row.customer_name}>
                                            {row.customer_name || 'Consumidor Final'}
                                        </span>
                                        <span className="text-[10px] text-on-surface-variant italic mt-1 truncate opacity-80">
                                            {row.narrativa}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-[10px] font-bold font-mono text-on-surface-variant bg-surface-dim/30 px-2 py-0.5 rounded border border-outline-variant/30">
                                        {row.client_id}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className="text-[11px] font-bold text-on-surface-variant font-tnum">
                                        {row.last_purchase}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className="text-sm font-black text-primary font-tnum">
                                        ${Number(row.monetary).toLocaleString('es-SV', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex justify-center">
                                        <span 
                                            className="inline-flex items-center px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border"
                                            style={{ 
                                                backgroundColor: `color-mix(in srgb, ${row.color} 15%, transparent)`, 
                                                color: row.color,
                                                borderColor: `color-mix(in srgb, ${row.color} 35%, transparent)`
                                            }}
                                        >
                                            {row.etiqueta}
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="px-6 py-4 bg-surface-container-lowest border-t border-outline-variant flex justify-between items-center">
                <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">
                    Registros Identificados: {data.length}
                </span>
                <button className="text-[10px] font-bold text-secondary flex items-center gap-2 hover:bg-secondary/5 px-4 py-2 rounded-md transition-all uppercase tracking-widest border border-transparent hover:border-secondary/20">
                    Exportar Análisis <ExternalLinkIcon size={14} />
                </button>
            </div>
        </div>
    );
}
