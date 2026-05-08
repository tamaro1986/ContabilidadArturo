"use client";

import React, { useEffect, useState } from 'react';
import { SupplierRecord } from '@/types/supplierAnalysis';

interface SupplierDetailSlideOverProps {
    supplier: SupplierRecord | null;
    isOpen: boolean;
    onClose: () => void;
}

const SparklesIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
        <path d="M5 3v4"/><path d="M3 5h4"/><path d="M21 17v4"/><path d="M19 19h4"/>
    </svg>
);

const CloseIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
);

export default function SupplierDetailSlideOver({ supplier, isOpen, onClose }: SupplierDetailSlideOverProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setMounted(true);
            document.body.style.overflow = 'hidden';
        } else {
            const timer = setTimeout(() => setMounted(false), 500);
            document.body.style.overflow = 'unset';
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!mounted && !isOpen) return null;

    return (
        <div className={`fixed inset-0 z-200 flex justify-end transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Panel */}
            <div className={`relative w-full max-w-lg bg-white h-full shadow-2xl transition-transform duration-500 ease-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                {/* Header */}
                <div className="p-8 border-b border-zinc-100 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-1">Detalle del Proveedor</p>
                        <h2 className="text-xl font-black text-zinc-900 tracking-tight">{supplier?.nombre}</h2>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-zinc-100 rounded-xl transition-colors text-zinc-400 hover:text-zinc-900"
                    >
                        <CloseIcon />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-10">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6">
                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2">Gasto Histórico</p>
                            <p className="text-2xl font-black text-zinc-900 font-tnum">
                                ${supplier?.gastoHistorico.toLocaleString('es-SV', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6">
                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2">Orden Promedio</p>
                            <p className="text-2xl font-black text-zinc-900 font-tnum">
                                ${supplier?.ordenPromedio.toLocaleString('es-SV', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>

                    {/* AI Insight */}
                    <div className="relative">
                        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-indigo-500/10 transition-colors" />
                            
                            <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4 relative z-10">
                                <SparklesIcon />
                                Recomendación de IA
                            </div>
                            
                            <p className="text-zinc-700 text-sm font-medium leading-relaxed italic relative z-10">
                                &quot;{supplier?.insightIA}&quot;
                            </p>
                        </div>
                    </div>

                    {/* Order History */}
                    <div>
                        <h3 className="text-[11px] font-black text-zinc-900 uppercase tracking-widest mb-6">Historial de Órdenes / Gastos</h3>
                        <div className="space-y-3">
                            {supplier?.historialOrdenes.map((order, i) => (
                                <div key={i} className="flex items-center justify-between p-4 border border-zinc-100 rounded-xl hover:border-zinc-200 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-2 h-2 rounded-full ${
                                            order.estado === 'Pagada' ? 'bg-emerald-500' : 
                                            order.estado === 'Pendiente' ? 'bg-amber-500' : 'bg-red-500'
                                        }`} />
                                        <div>
                                            <p className="text-xs font-bold text-zinc-900">{order.concepto}</p>
                                            <p className="text-[10px] font-medium text-zinc-400 mt-0.5">{order.fecha}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-black text-zinc-900 font-tnum">${order.monto.toLocaleString('es-SV', { minimumFractionDigits: 2 })}</p>
                                        <p className={`text-[9px] font-black uppercase tracking-tighter mt-0.5 ${
                                            order.estado === 'Pagada' ? 'text-emerald-600' : 
                                            order.estado === 'Pendiente' ? 'text-amber-600' : 'text-red-600'
                                        }`}>{order.estado}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-zinc-100 bg-zinc-50/30">
                    <button className="w-full py-4 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-indigo-600/20">
                        Ver Estado de Cuenta
                    </button>
                </div>
            </div>
        </div>
    );
}
