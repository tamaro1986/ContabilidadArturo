import { Info, BarChart3, TrendingUp, Zap, Star, Target, ShieldAlert, Rocket, ChevronRight } from "lucide-react";

export default function SegmentInsightPanel() {
    return (
        <div className="bg-white rounded-lg p-8 border border-outline-variant shadow-sm h-full flex flex-col justify-center">
            <h3 className="text-sm font-bold text-primary mb-6 flex items-center gap-2 uppercase tracking-widest">
                <BarChart3 size={18} className="text-secondary" />
                Inteligencia de Clientes
            </h3>
            <p className="text-on-surface-variant text-sm mb-8 leading-relaxed">
                Análisis heurístico de la base de datos para identificar patrones de consumo y optimizar el cumplimiento tributario.
            </p>
            
            <div className="space-y-6 mb-10">
                <div className="flex items-start gap-4 group">
                    <div className="bg-surface-dim p-2.5 rounded-md text-primary border border-outline-variant transition-colors group-hover:bg-primary group-hover:text-white">
                        <Star size={16} />
                    </div>
                    <div>
                        <h4 className="font-bold text-primary text-xs uppercase tracking-wider">Clientes de Alto Valor</h4>
                        <p className="text-on-surface-variant text-[11px] mt-1 leading-relaxed">Entidades con flujo constante y alta solvencia. Base de la estabilidad fiscal.</p>
                    </div>
                </div>
                <div className="flex items-start gap-4 group">
                    <div className="bg-surface-dim p-2.5 rounded-md text-secondary border border-outline-variant transition-colors group-hover:bg-secondary group-hover:text-white">
                        <Rocket size={16} />
                    </div>
                    <div>
                        <h4 className="font-bold text-primary text-xs uppercase tracking-wider">Potencial de Crecimiento</h4>
                        <p className="text-on-surface-variant text-[11px] mt-1 leading-relaxed">Nuevas incorporaciones con tendencia positiva en volumen de operaciones.</p>
                    </div>
                </div>
                <div className="flex items-start gap-4 group">
                    <div className="bg-surface-dim p-2.5 rounded-md text-red-700 border border-outline-variant transition-colors group-hover:bg-red-700 group-hover:text-white">
                        <ShieldAlert size={16} />
                    </div>
                    <div>
                        <h4 className="font-bold text-primary text-xs uppercase tracking-wider">Riesgo de Inactividad</h4>
                        <p className="text-on-surface-variant text-[11px] mt-1 leading-relaxed">Contribuyentes con decremento en frecuencia. Requieren validación de estatus.</p>
                    </div>
                </div>
            </div>

            <div className="pt-8 border-t border-outline-variant">
                <div className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em] mb-4">
                    <Zap size={12} className="text-secondary fill-secondary" />
                    Directriz Estratégica
                </div>
                <div className="text-on-surface-variant text-[11px] leading-relaxed italic bg-surface-container p-4 rounded-md border border-outline-variant border-l-4 border-l-secondary">
                    "Priorizar la regularización de saldos en el segmento <span className="text-primary font-bold">En Riesgo</span> para optimizar la declaración del próximo período fiscal."
                </div>
                <button className="w-full mt-6 py-2.5 bg-primary text-white rounded-md text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
                    Ver Reporte Detallado <ChevronRight size={14} />
                </button>
            </div>
        </div>
    );
}
