import React from 'react';

export default function TaxLiquidationCard({ data }: { data: any }) {
    if (!data) return <div className="text-slate-400">Cargando Liquidación...</div>;

    const neto = data.neto || 0;
    const isCredit = neto < 0;

    return (
        <div className="bg-slate-900/50 backdrop-blur-md rounded-3xl p-6 shadow-2xl border border-slate-800/50 h-full flex flex-col">
            <h2 className="text-xl font-bold mb-4 text-slate-200">Liquidación de IVA <span className="text-sm font-normal text-slate-400 ml-2">Período: {data.periodo || 'N/A'}</span></h2>
            <div className="grid grid-cols-2 gap-4 mb-6 flex-1">
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 flex flex-col justify-center">
                    <p className="text-sm text-slate-400 font-medium">Débito Fiscal (Ventas)</p>
                    <p className="text-3xl font-bold text-emerald-400 mt-2">${data.debito_fiscal?.toFixed(2) || '0.00'}</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 flex flex-col justify-center">
                    <p className="text-sm text-slate-400 font-medium">Crédito Fiscal (Compras)</p>
                    <p className="text-3xl font-bold text-cyan-400 mt-2">${data.credito_fiscal?.toFixed(2) || '0.00'}</p>
                </div>
            </div>
            <div className={`rounded-xl p-5 border ${isCredit ? 'bg-emerald-950/30 border-emerald-900/50' : 'bg-rose-950/30 border-rose-900/50'}`}>
                <p className="text-sm font-medium mb-2 text-slate-300">Posición Neta</p>
                <div className="flex justify-between items-end">
                    <span className="text-4xl font-black tracking-tight text-white">
                        ${Math.abs(neto).toFixed(2)}
                    </span>
                    <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${isCredit ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                        {isCredit ? 'Remanente a favor' : 'Impuesto por pagar'}
                    </span>
                </div>
            </div>
            
            <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30 text-center">
                    <p className="text-xs text-slate-400">Retención 1%</p>
                    <p className="text-lg font-bold text-slate-200">${data.retencion_1?.toFixed(2) || '0.00'}</p>
                </div>
                <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30 text-center">
                    <p className="text-xs text-slate-400">Anticipo 2%</p>
                    <p className="text-lg font-bold text-slate-200">${data.anticipo_2?.toFixed(2) || '0.00'}</p>
                </div>
                <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30 text-center">
                    <p className="text-xs text-slate-400">Retención 13%</p>
                    <p className="text-lg font-bold text-slate-200">${data.retencion_13?.toFixed(2) || '0.00'}</p>
                </div>
            </div>
        </div>
    );
}
