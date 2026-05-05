"use client";

import { useMemo } from "react";
import { TrendData } from "@/types/analytics";

/**
 * ProfitabilityChart
 * Rules: Zero external deps, Native SVG/Tailwind, Corporate Modern Design.
 */
export default function ProfitabilityChart({ data }: { data: TrendData[] }) {
    const processedData = useMemo(() => {
        return data.map(d => ({
            mes: d.mes,
            rentabilidad: d.rentabilidad ?? ((d.ventas_actual || 0) - (d.gastos_actual || 0))
        }));
    }, [data]);

    const { bars, yLabels, xLabels, svgWidth, svgHeight, zeroY } = useMemo(() => {
        const svgWidth = 400;
        const svgHeight = 320;
        const padding = { top: 20, right: 10, bottom: 40, left: 50 };
        const innerWidth = svgWidth - padding.left - padding.right;
        const innerHeight = svgHeight - padding.top - padding.bottom;

        const values = processedData.map(d => d.rentabilidad);
        const absMax = Math.max(...values.map(Math.abs), 1000) * 1.2;
        
        const yScale = (val: number) => {
            // Escala centrada en 0 si hay valores negativos
            const zeroY = padding.top + (innerHeight / 2);
            // Si todo es positivo, podemos optimizar, pero mejor mantener el 0 visible
            return zeroY - (val / absMax) * (innerHeight / 2);
        };

        const zeroYVal = yScale(0);
        const xStep = innerWidth / (processedData.length || 1);
        const barWidth = xStep * 0.6;

        const renderedBars = processedData.map((d, i) => {
            const y = yScale(Math.max(0, d.rentabilidad));
            const h = Math.abs(d.rentabilidad / absMax) * (innerHeight / 2);
            const x = padding.left + i * xStep + (xStep - barWidth) / 2;
            
            return {
                x,
                y: d.rentabilidad >= 0 ? y : zeroYVal,
                width: barWidth,
                height: h,
                isPositive: d.rentabilidad >= 0,
                value: d.rentabilidad
            };
        });

        const yTicks = [-1, -0.5, 0, 0.5, 1].map(p => ({
            val: `${(absMax * p / 1000).toFixed(0)}k`,
            y: yScale(absMax * p)
        }));

        return { 
            bars: renderedBars, 
            yLabels: yTicks,
            xLabels: processedData.map((d, i) => ({ 
                label: d.mes.substring(0, 3), 
                x: padding.left + i * xStep + xStep / 2 
            })),
            svgWidth,
            svgHeight,
            zeroY: zeroYVal
        };
    }, [processedData]);

    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-full bg-surface-container-lowest rounded-xl border border-outline-variant/30">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest animate-pulse">
                    Calculando Margen...
                </p>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full select-none overflow-visible">
                {/* Y Axis Grid & Labels */}
                {yLabels.map((tick, i) => (
                    <g key={i} className="group/grid">
                        <line 
                            x1={50} y1={tick.y} x2={390} y2={tick.y} 
                            className="stroke-outline-variant opacity-20 stroke-[0.5]" 
                            strokeDasharray="4 4"
                        />
                        <text 
                            x={40} y={tick.y} 
                            textAnchor="end" 
                            alignmentBaseline="middle" 
                            className="fill-on-surface-variant text-[10px] font-bold tabular-nums opacity-40 group-hover/grid:opacity-100 transition-opacity"
                        >
                            {tick.val}
                        </text>
                    </g>
                ))}

                {/* Zero Line */}
                <line x1={50} y1={zeroY} x2={390} y2={zeroY} className="stroke-outline stroke-1" />

                {/* Bars */}
                {bars.map((bar, i) => (
                    <rect
                        key={i}
                        x={bar.x}
                        y={bar.y}
                        width={bar.width}
                        height={bar.height}
                        rx="2"
                        className={`${bar.isPositive ? 'fill-secondary' : 'fill-error'} transition-all duration-300 hover:opacity-80 cursor-help`}
                    >
                        <title>{`Rentabilidad: $${bar.value.toLocaleString()}`}</title>
                    </rect>
                ))}

                {/* X Axis Labels */}
                {xLabels.map((tick, i) => (
                    <text 
                        key={i} 
                        x={tick.x} 
                        y={300} 
                        textAnchor="middle" 
                        className="fill-on-surface-variant text-[9px] font-black uppercase tracking-wider opacity-60"
                    >
                        {tick.label}
                    </text>
                ))}
            </svg>
        </div>
    );
}
