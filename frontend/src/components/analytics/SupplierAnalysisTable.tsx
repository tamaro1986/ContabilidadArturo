"use client";

import React from 'react';
import { SupplierRecord, SupplierCategory } from '@/types/supplierAnalysis';

interface SupplierAnalysisTableProps {
    data: SupplierRecord[];
    onSelectSupplier: (supplier: SupplierRecord) => void;
}

const CategoryBadge = ({ category }: { category: SupplierCategory }) => {
    const styles: Record<SupplierCategory, string> = {
        'Socio Estratégico': 'bg-indigo-100 text-indigo-700 border-indigo-200',
        'Gasto Recurrente': 'bg-amber-100 text-amber-700 border-amber-200',
        'Eventual': 'bg-teal-100 text-teal-700 border-teal-200',
        'zinc': 'bg-zinc-100 text-zinc-500 border-zinc-200',
    };

    return (
        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${styles[category]}`}>
            {category}
        </span>
    );
};

const MiniTrendChart = ({ values }: { values: number[] }) => {
    return (
        <div className="flex items-end gap-1 h-8 w-24">
            {values.map((v, i) => (
                <div 
                    key={i} 
                    className="w-1 bg-indigo-500/20 rounded-t-sm transition-all group-hover:bg-indigo-500/40"
                    style={{ height: `${Math.max(v, 5)}%` }}
                />
            ))}
        </div>
    );
};

export default function SupplierAnalysisTable({ data, onSelectSupplier }: SupplierAnalysisTableProps) {
    return (
        <div className="bg-white border border-zinc-200 rounded-[2rem] overflow-hidden shadow-sm">
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-200">
                            <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Proveedor</th>
                            <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Categoría</th>
                            <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] text-right">Gasto Histórico</th>
                            <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] text-center">Actividad (12m)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                        {data.map((supplier) => (
                            <tr 
                                key={supplier.id} 
                                onClick={() => onSelectSupplier(supplier)}
                                className="group hover:bg-zinc-50 transition-all cursor-pointer"
                            >
                                <td className="px-8 py-6">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-zinc-900 group-hover:text-indigo-600 transition-colors">
                                            {supplier.nombre}
                                        </span>
                                        <span className="text-xs text-zinc-400 font-medium mt-0.5">
                                            {supplier.giro}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <CategoryBadge category={supplier.categoria} />
                                </td>
                                <td className="px-8 py-6 text-right">
                                    <span className="text-sm font-black text-zinc-900 font-tnum">
                                        ${supplier.gastoHistorico.toLocaleString('es-SV', { minimumFractionDigits: 2 })}
                                    </span>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex justify-center">
                                        <MiniTrendChart values={supplier.tendenciaAnual} />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="px-8 py-4 bg-zinc-50/50 border-t border-zinc-200 flex justify-between items-center">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                    Analizando {data.length} proveedores operativos
                </p>
                <div className="flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                    <div className="w-2 h-2 rounded-full bg-zinc-200" />
                    <div className="w-2 h-2 rounded-full bg-zinc-200" />
                </div>
            </div>
        </div>
    );
}
