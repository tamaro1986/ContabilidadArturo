"use client";

import { Activity, Star, AlertCircle, Users } from "lucide-react";

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
        <div className="overflow-x-auto overflow-y-auto max-h-125 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-900/90 backdrop-blur-md z-10">
                    <tr className="border-b border-slate-700/50 text-slate-400 text-sm">
                        <th className="pb-3 font-semibold whitespace-nowrap">Cliente</th>
                        <th className="pb-3 font-semibold whitespace-nowrap">Identificación</th>
                        <th className="pb-3 font-semibold whitespace-nowrap text-right">Última Operación</th>
                        <th className="pb-3 font-semibold whitespace-nowrap text-right">Monto Total</th>
                        <th className="pb-3 font-semibold whitespace-nowrap text-center">Clasificación</th>
                        <th className="pb-3 font-semibold whitespace-nowrap pl-4">Recomendación</th>
                    </tr>
                </thead>
                <tbody className="text-sm text-slate-300">
                    {data.length === 0 && (
                        <tr>
                            <td colSpan={6} className="py-12 text-center text-slate-500 font-medium">
                                No se encontraron datos suficientes para el análisis.
                            </td>
                        </tr>
                    )}
                    {data.map((row, i) => {
                        return (
                            <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors group">
                                <td className="py-4 font-medium text-slate-200">
                                    {row.customer_name || 'Consumidor Final'}
                                </td>
                                <td className="py-4 text-slate-500 text-xs font-mono">
                                    {row.client_id}
                                </td>
                                <td className="py-4 text-right text-slate-400">
                                    {row.last_purchase}
                                </td>
                                <td className="py-4 text-right font-medium text-emerald-400/90 group-hover:text-emerald-400 transition-colors">
                                    ${Number(row.monetary).toLocaleString('es-SV', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="py-4 text-center">
                                    <span 
                                        className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm border border-current/10"
                                        style={{ backgroundColor: `${row.color}15`, color: row.color }}
                                    >
                                        {row.etiqueta}
                                    </span>
                                </td>
                                <td className="py-4 pl-4 text-slate-400 italic text-xs max-w-xs truncate" title={row.narrativa}>
                                    {row.narrativa}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
