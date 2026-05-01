"use client";

import { Activity, Star, AlertCircle, Users, ExternalLink } from "lucide-react";

interface CustomerSegment {
    client_id: string;
    customer_name: string;
    last_purchase: string;
    frequency: number;
    monetary: number;
    segment: string;
    etiqueta: string;
    color: string;
    narrativa: string;
}

export default function CustomerSegmentTable({ data }: { data: CustomerSegment[] }) {
    return (
        <div className="bg-white rounded-lg border border-outline-variant overflow-hidden shadow-sm">
            <div className="overflow-x-auto custom-scrollbar max-h-[500px]">
                <table className="w-full text-left border-collapse table-fixed min-w-[800px]">
                    <thead className="sticky top-0 bg-primary z-10 shadow-sm">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-bold text-white uppercase tracking-[0.15em] w-[35%]">
                                Entidad / Razón Social
                            </th>
                            <th className="px-6 py-4 text-[10px] font-bold text-white uppercase tracking-[0.15em] w-[15%]">
                                Registro Fiscal
                            </th>
                            <th className="px-6 py-4 text-[10px] font-bold text-white uppercase tracking-[0.15em] text-right w-[15%]">
                                Última Op.
                            </th>
                            <th className="px-6 py-4 text-[10px] font-bold text-white uppercase tracking-[0.15em] text-right w-[15%]">
                                Volumen Total
                            </th>
                            <th className="px-6 py-4 text-[10px] font-bold text-white uppercase tracking-[0.15em] text-center w-[20%]">
                                Clasificación
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant bg-white">
                        {data.length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-24 text-center">
                                    <div className="flex flex-col items-center gap-4 text-on-surface-variant">
                                        <AlertCircle size={40} strokeWidth={1} className="opacity-50" />
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
                                            className="inline-flex items-center px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-[0.1em] border"
                                            style={{ 
                                                backgroundColor: `${row.color}15`, 
                                                color: row.color,
                                                borderColor: `${row.color}35`
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
                <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-[0.2em]">
                    Registros Identificados: {data.length}
                </span>
                <button className="text-[10px] font-bold text-secondary flex items-center gap-2 hover:bg-secondary/5 px-4 py-2 rounded-md transition-all uppercase tracking-[0.2em] border border-transparent hover:border-secondary/20">
                    Exportar Análisis <ExternalLink size={14} />
                </button>
            </div>
        </div>
    );
}

