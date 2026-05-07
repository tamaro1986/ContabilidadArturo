"use client";

import React from 'react';
import { CustomerRecord, CustomerStatus } from '@/types/customerAnalysis';

interface CustomerAnalysisTableProps {
    data: CustomerRecord[];
    onSelectCustomer: (customer: CustomerRecord) => void;
}

const StatusBadge = ({ status }: { status: CustomerStatus }) => {
    const styles = {
        'Campeones': 'bg-emerald-100 text-emerald-700 border-emerald-200',
        'Leales': 'bg-blue-100 text-blue-700 border-blue-200',
        'En Riesgo': 'bg-amber-100 text-amber-700 border-amber-200',
    };

    return (
        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${styles[status]}`}>
            {status}
        </span>
    );
};

const MiniTrendChart = ({ values }: { values: number[] }) => {
    return (
        <div className="flex items-end gap-1 h-8 w-24">
            {values.map((v, i) => (
                <div 
                    key={i} 
                    className="w-1 bg-primary/20 rounded-t-sm transition-all group-hover:bg-primary/40"
                    style={{ height: `${Math.max(v, 5)}%` }}
                />
            ))}
        </div>
    );
};

export default function CustomerAnalysisTable({ data, onSelectCustomer }: CustomerAnalysisTableProps) {
    return (
        <div className="bg-white border border-zinc-200 rounded-[2rem] overflow-hidden shadow-sm">
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-200">
                            <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Cliente</th>
                            <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Estado</th>
                            <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] text-right">Ganancia Histórica</th>
                            <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] text-center">Tendencia Anual</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                        {data.map((customer) => (
                            <tr 
                                key={customer.id} 
                                onClick={() => onSelectCustomer(customer)}
                                className="group hover:bg-zinc-50 transition-all cursor-pointer"
                            >
                                <td className="px-8 py-6">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-zinc-900 group-hover:text-primary transition-colors">
                                            {customer.nombre}
                                        </span>
                                        <span className="text-xs text-zinc-400 font-medium mt-0.5">
                                            {customer.giro}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <StatusBadge status={customer.estado} />
                                </td>
                                <td className="px-8 py-6 text-right">
                                    <span className="text-sm font-black text-zinc-900 font-tnum">
                                        ${customer.gananciaHistorica.toLocaleString('es-SV', { minimumFractionDigits: 2 })}
                                    </span>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex justify-center">
                                        <MiniTrendChart values={customer.tendenciaAnual} />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="px-8 py-4 bg-zinc-50/50 border-t border-zinc-200 flex justify-between items-center">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                    Mostrando {data.length} clientes clave
                </p>
                <div className="flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <div className="w-2 h-2 rounded-full bg-zinc-200" />
                    <div className="w-2 h-2 rounded-full bg-zinc-200" />
                </div>
            </div>
        </div>
    );
}
