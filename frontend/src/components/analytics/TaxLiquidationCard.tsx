import React from 'react';
import { TaxLiquidation } from '@/types/analytics';

export default function TaxLiquidationCard({ data }: { data: TaxLiquidation | undefined }) {
    if (!data) return <div className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest animate-pulse">Cargando Liquidación...</div>;

    const neto = data.neto || 0;
    const isCredit = neto < 0;

    return (
        <div className="bg-surface-container-lowest rounded-lg p-6 border border-outline-variant shadow-sm h-full flex flex-col transition-all hover:border-secondary/30">
            <h2 className="text-xs font-bold mb-6 text-primary uppercase tracking-[0.15em] flex items-center justify-between">
                Liquidación de IVA 
                <span className="text-[10px] font-medium text-on-surface-variant bg-surface-dim px-2 py-0.5 rounded tracking-normal normal-case">Período: {data.periodo || 'N/A'}</span>
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-6 flex-1">
                <div className="bg-surface-container-low rounded-md p-4 border border-outline-variant flex flex-col justify-center">
                    <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Débito Fiscal (Ventas)</p>
                    <p className="text-3xl font-black text-primary mt-2 font-tnum">${data.debito_fiscal?.toFixed(2) || '0.00'}</p>
                </div>
                <div className="bg-surface-container-low rounded-md p-4 border border-outline-variant flex flex-col justify-center">
                    <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Crédito Fiscal (Compras)</p>
                    <p className="text-3xl font-black text-secondary mt-2 font-tnum">${data.credito_fiscal?.toFixed(2) || '0.00'}</p>
                </div>
            </div>
            <div className={`rounded-md p-5 border ${isCredit ? 'bg-secondary/5 border-secondary/20' : 'bg-error/5 border-error/20'}`}>
                <p className="text-[10px] font-bold mb-2 text-on-surface-variant uppercase tracking-wider">Posición Neta</p>
                <div className="flex justify-between items-end">
                    <span className={`text-4xl font-black tracking-tight font-tnum ${isCredit ? 'text-secondary' : 'text-error'}`}>
                        ${Math.abs(neto).toFixed(2)}
                    </span>
                    <span className={`px-4 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest ${isCredit ? 'bg-secondary text-on-secondary' : 'bg-error text-on-error'}`}>
                        {isCredit ? 'Remanente a favor' : 'Impuesto por pagar'}
                    </span>
                </div>
            </div>
            
            <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="bg-surface-dim/50 rounded p-3 border border-outline-variant text-center">
                    <p className="text-[9px] text-on-surface-variant font-bold uppercase tracking-tighter">Retención 1%</p>
                    <p className="text-sm font-bold text-primary font-tnum">${data.retencion_1?.toFixed(2) || '0.00'}</p>
                </div>
                <div className="bg-surface-dim/50 rounded p-3 border border-outline-variant text-center">
                    <p className="text-[9px] text-on-surface-variant font-bold uppercase tracking-tighter">Anticipo 2%</p>
                    <p className="text-sm font-bold text-primary font-tnum">${data.anticipo_2?.toFixed(2) || '0.00'}</p>
                </div>
                <div className="bg-surface-dim/50 rounded p-3 border border-outline-variant text-center">
                    <p className="text-[9px] text-on-surface-variant font-bold uppercase tracking-tighter">Retención 13%</p>
                    <p className="text-sm font-bold text-primary font-tnum">${data.retencion_13?.toFixed(2) || '0.00'}</p>
                </div>
            </div>
        </div>
    );
}
