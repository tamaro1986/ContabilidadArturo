import { Info, BarChart3, TrendingUp, Zap, Star, Target, ShieldAlert, Rocket } from "lucide-react";

export default function SegmentInsightPanel() {
    return (
        <div className="bg-slate-900/40 rounded-2xl p-6 border border-slate-800/50 shadow-inner h-full flex flex-col justify-center backdrop-blur-sm">
            <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                <BarChart3 size={20} className="text-emerald-400" />
                Inteligencia de Clientes
            </h3>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                Analizamos el comportamiento de compra de su base de datos para identificar oportunidades de crecimiento y riesgos de abandono.
            </p>
            
            <div className="space-y-5 mb-8">
                <div className="flex items-start gap-4">
                    <div className="bg-emerald-500/10 p-2.5 rounded-xl text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
                        <Star size={18} />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-200 text-sm">Nuestros Clientes Estrella</h4>
                        <p className="text-slate-400 text-xs mt-1">Clientes de alto valor y frecuencia constante. Son la base de su estabilidad financiera.</p>
                    </div>
                </div>
                <div className="flex items-start gap-4">
                    <div className="bg-amber-500/10 p-2.5 rounded-xl text-amber-400 border border-amber-500/20 shadow-lg shadow-amber-500/5">
                        <Rocket size={18} />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-200 text-sm">Nuevos Prometedores</h4>
                        <p className="text-slate-400 text-xs mt-1">Clientes que han iniciado compras recientemente. Tienen alto potencial de convertirse en Estrellas.</p>
                    </div>
                </div>
                <div className="flex items-start gap-4">
                    <div className="bg-red-500/10 p-2.5 rounded-xl text-red-400 border border-red-500/20 shadow-lg shadow-red-500/5">
                        <ShieldAlert size={18} />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-200 text-sm">Fidelidad en Riesgo</h4>
                        <p className="text-slate-400 text-xs mt-1">Clientes que solían comprar pero no han tenido actividad reciente. Requieren atención inmediata.</p>
                    </div>
                </div>
            </div>

            <div className="pt-6 border-t border-slate-800/50">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">
                    <Zap size={12} className="text-amber-400 fill-amber-400" />
                    Estrategia Recomendada
                </div>
                <p className="text-slate-300 text-xs leading-relaxed italic bg-slate-950/50 p-4 rounded-xl border border-slate-800/30">
                    "Enfoque sus esfuerzos de marketing en los segmentos <span className="text-amber-400 font-semibold">En Desarrollo</span> y <span className="text-amber-400 font-semibold">Nuevos</span> para maximizar el retorno de inversión este trimestre."
                </p>
            </div>
        </div>
    );
}
