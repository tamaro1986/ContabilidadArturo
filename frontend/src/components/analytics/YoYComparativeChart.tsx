"use client";

import React, { useMemo } from "react";
import { YoYData } from "@/types/analytics";

/**
 * YoYComparativeChart
 * Native SVG replacement for Recharts BarChart (Grouped).
 * Rules: Zero external deps, Tailwind v4, Dumb UI.
 */
export default function YoYComparativeChart({ data }: { data: YoYData[] }) {
  // Dimensiones
  const w = 800;
  const h = 300;
  const margin = 40;
  const innerW = w - margin * 2;
  const innerH = h - margin * 2;

  const { bars, yTicks } = useMemo(() => {
    if (!data || data.length === 0) {
      return { bars: [], yTicks: [] };
    }

    const vals = data.flatMap(d => [d.ventas_actual || 0, d.ventas_anterior || 0]);
    const max = Math.max(...vals, 1) * 1.1;
    
    const xStep = innerW / (data.length || 1);
    const groupW = xStep * 0.8;
    const barW = groupW / 2.5;

    const getX = (i: number) => margin + i * xStep + (xStep - groupW) / 2;
    const getY = (val: number) => h - margin - (val / max) * innerH;

    const processedBars = data.map((d, i) => {
      const startX = getX(i);
      return {
        actual: {
          x: startX,
          y: getY(d.ventas_actual || 0),
          h: (d.ventas_actual / max) * innerH,
          val: d.ventas_actual
        },
        anterior: {
          x: startX + barW + 4,
          y: getY(d.ventas_anterior || 0),
          h: (d.ventas_anterior / max) * innerH,
          val: d.ventas_anterior
        },
        mes: d.mes,
        centerX: startX + groupW / 2
      };
    });

    const ticks = [0, 0.5, 1].map(p => ({
      label: `$${((max * p) / 1000).toFixed(0)}k`,
      y: h - margin - p * innerH
    }));

    return { bars: processedBars, yTicks: ticks };
  }, [data, innerW, innerH, h]);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-surface-container-lowest rounded-xl border border-outline-variant/30">
        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest opacity-40">
          Procesando Comparativa...
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4 h-full">
      {/* Legend */}
      <div className="flex justify-end gap-6 px-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-primary" />
          <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest opacity-60">Actual</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-secondary" />
          <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest opacity-60">Anterior</span>
        </div>
      </div>

      <div className="relative flex-1 bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-4 overflow-hidden">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full overflow-visible select-none">
          {/* Grid lines */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line 
                x1={margin} y1={tick.y} x2={w - margin} y2={tick.y} 
                className="stroke-outline-variant stroke-[0.5] opacity-20" 
                strokeDasharray="4,4"
              />
              <text 
                x={margin - 10} y={tick.y} 
                textAnchor="end" alignmentBaseline="middle" 
                className="fill-on-surface-variant text-[10px] font-bold opacity-30"
              >
                {tick.label}
              </text>
            </g>
          ))}

          {/* Bars */}
          {bars.map((group, i) => (
            <g key={i} className="group/bar">
              {/* Actual */}
              <rect 
                x={group.actual.x} y={group.actual.y} width={18} height={group.actual.h} 
                rx="3" className="fill-primary opacity-80 group-hover/bar:opacity-100 transition-all duration-300"
              />
              {/* Anterior */}
              <rect 
                x={group.anterior.x} y={group.anterior.y} width={18} height={group.anterior.h} 
                rx="3" className="fill-secondary opacity-60 group-hover/bar:opacity-80 transition-all duration-300"
              />
              
              {/* X Label */}
              <text 
                x={group.centerX} y={h - margin + 20} 
                textAnchor="middle" 
                className="fill-on-surface-variant text-[9px] font-bold uppercase tracking-tighter opacity-50"
              >
                {group.mes}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
