"use client";

import { useMemo } from "react";

import { BreakdownData } from "@/types/analytics";

/**
 * CustomerSegmentChart
 * Rules: Zero external deps, Native SVG/Tailwind, Corporate Modern Design.
 */
export default function CustomerSegmentChart({ data }: { data: BreakdownData[] }) {
    const total = useMemo(() => data.reduce((acc, curr) => acc + curr.value, 0), [data]);

    const segments = useMemo(() => {
        let currentTotal = 0;
        const result = [];
        for (const segment of data) {
            const percent = segment.value / total;
            const startPercent = currentTotal / total;
            currentTotal += segment.value;
            const endPercent = currentTotal / total;

            // Coordenadas para el arco SVG
            const x1 = Math.cos(2 * Math.PI * startPercent);
            const y1 = Math.sin(2 * Math.PI * startPercent);
            const x2 = Math.cos(2 * Math.PI * endPercent);
            const y2 = Math.sin(2 * Math.PI * endPercent);

            const largeArcFlag = percent > 0.5 ? 1 : 0;

            const pathData = [
                `M ${x1} ${y1}`, // Ir al inicio
                `A 1 1 0 ${largeArcFlag} 1 ${x2} ${y2}`, // Arco exterior
                `L 0 0`, // Cerrar en el centro
                "Z",
            ].join(" ");

            result.push({
                ...segment,
                pathData,
                percent: (percent * 100).toFixed(1),
            });
        }
        return result;
    }, [data, total]);

    if (!data || data.length === 0 || total === 0) {
        return (
            <div className="flex items-center justify-center h-full bg-surface-container-lowest rounded-xl border border-outline-variant/30">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest animate-pulse">
                    Analizando Cartera...
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center h-full w-full space-y-8">
            <div className="relative w-48 h-48">
                <svg viewBox="-1.1 -1.1 2.2 2.2" className="w-full h-full transform -rotate-90 drop-shadow-xl">
                    {segments.map((segment, i) => (
                        <path
                            key={i}
                            d={segment.pathData}
                            fill={segment.color}
                            className="transition-all duration-500 hover:opacity-80 cursor-pointer"
                            stroke="var(--color-surface-container-lowest)"
                            strokeWidth="0.02"
                        />
                    ))}
                    {/* Inner Circle for Donut effect */}
                    <circle cx="0" cy="0" r="0.7" className="fill-surface-container-lowest" />
                    
                    {/* Central Text */}
                    <g transform="rotate(90)">
                        <text
                            x="0"
                            y="-5%"
                            textAnchor="middle"
                            className="fill-primary text-[0.25px] font-black uppercase tracking-tighter"
                        >
                            {total}
                        </text>
                        <text
                            x="0"
                            y="15%"
                            textAnchor="middle"
                            className="fill-on-surface-variant text-[0.12px] font-bold uppercase tracking-[0.2em] opacity-60"
                        >
                            Clientes
                        </text>
                    </g>
                </svg>
            </div>

            {/* Custom Legend */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 w-full px-2">
                {segments.map((segment, i) => (
                    <div key={i} className="flex items-center gap-3 group">
                        <div 
                            className="w-2.5 h-2.5 rounded-sm shrink-0 shadow-sm" 
                            style={{ backgroundColor: segment.color }}
                        />
                        <div className="flex flex-col min-w-0">
                            <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-wider truncate group-hover:text-primary transition-colors">
                                {segment.name}
                            </span>
                            <span className="text-[10px] font-bold text-primary tabular-nums">
                                {segment.percent}%
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

