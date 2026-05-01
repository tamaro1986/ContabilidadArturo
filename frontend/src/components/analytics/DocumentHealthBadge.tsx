import React from 'react';
import { ShieldCheck, AlertTriangle, XOctagon } from 'lucide-react';

export default function DocumentHealthBadge({ data }: { data: any }) {
    if (!data) return <div className="text-slate-400">Cargando Salud Documental...</div>;

    const score = data.health_score || 0;
    
    let Icon = ShieldCheck;
    let colorClass = "text-emerald-400";
    let bgClass = "bg-emerald-500/10 border-emerald-500/20";
    
    if (score < 90) {
        Icon = XOctagon;
        colorClass = "text-rose-400";
        bgClass = "bg-rose-500/10 border-rose-500/20";
    } else if (score < 98) {
        Icon = AlertTriangle;
        colorClass = "text-amber-400";
        bgClass = "bg-amber-500/10 border-amber-500/20";
    }

    return (
        <div className="bg-slate-900/50 backdrop-blur-md rounded-3xl p-6 shadow-2xl border border-slate-800/50 h-full flex flex-col">
            <h2 className="text-xl font-bold mb-4 text-slate-200">Salud Documental</h2>
            <div className={`p-6 rounded-2xl border ${bgClass} flex items-center gap-5 flex-1`}>
                <div className={`p-4 rounded-2xl bg-slate-950/50 ${colorClass}`}>
                    <Icon size={40} />
                </div>
                <div>
                    <p className={`text-3xl font-black tracking-tight ${colorClass}`}>{score.toFixed(1)}%</p>
                    <p className="text-slate-300 font-medium mt-1">Documentos Válidos</p>
                    <div className="flex gap-4 mt-3 text-sm flex-wrap">
                        <span className="bg-slate-950/50 px-3 py-1 rounded-full text-slate-400">
                            <strong className="text-white">{data.anulado}</strong> Anulados
                        </span>
                        <span className="bg-slate-950/50 px-3 py-1 rounded-full text-slate-400">
                            <strong className="text-white">{data.extraviado}</strong> Extraviados
                        </span>
                        <span className="bg-slate-950/50 px-3 py-1 rounded-full text-slate-400">
                            <strong className="text-white">{data.invalidado}</strong> Invalidados (DTE)
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
