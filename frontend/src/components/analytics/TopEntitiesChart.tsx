"use client";

import React, { useMemo } from 'react';

import { EntityData } from '@/types/analytics';

/**
 * TopEntitiesChart
 * Native SVG replacement for Recharts BarChart (Vertical).
 * Rules: Zero external deps, Tailwind v4, Dumb UI.
 */
export default function TopEntitiesChart({ title, data, color }: { title: string, data: EntityData[], color: string }) {
  // Dimensiones
  const rowHeight = 36;
  const labelWidth = 100;
  const paddingRight = 40;
  const chartWidth = 500;
  const barMaxW = chartWidth - labelWidth - paddingRight;

  const { bars, chartHeight } = useMemo(() => {
    if (!data || data.length === 0) {
      return { bars: [], chartHeight: 20 };
    }

    const maxVal = Math.max(...data.map(d => d.total_amount || 0), 1);
    const chartHeight = data.length * rowHeight + 20;

    const processedBars = data.map((d, i) => {
      const width = ((d.total_amount || 0) / maxVal) * barMaxW;
      const displayLabel = d.nit_dui ? (d.nit_dui.length > 12 ? d.nit_dui.substring(0, 10) + "..." : d.nit_dui) : "N/A";
      return {
        ...d,
        y: i * rowHeight + 10,
        width: Math.max(width, 2),
        displayLabel
      };
    });

    return { bars: processedBars, chartHeight };
  }, [data, barMaxW]);

  if (!data || data.length === 0) {
    return (
      <div className="bg-surface-container-lowest rounded-lg p-6 shadow-sm border border-outline-variant h-full flex items-center justify-center">
        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest opacity-40">
          Sin datos en este período
        </span>
      </div>
    );
  }


  return (
    <div className="bg-surface-container-lowest rounded-lg p-6 shadow-sm border border-outline-variant h-full flex flex-col transition-all hover:border-secondary/30">
      <h2 className="text-[10px] font-black mb-6 text-primary uppercase tracking-[0.2em]">{title}</h2>
      
      <div className="flex-1 w-full overflow-hidden">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible select-none">
          {bars.map((bar, i) => (
            <g key={i} className="group/entity">
              {/* Row Highlight */}
              <rect 
                x={0} y={bar.y - 4} width={chartWidth} height={rowHeight - 4} 
                className="fill-transparent group-hover/entity:fill-surface-container-low/40 transition-colors"
                rx="4"
              />

              {/* Label (NIT/DUI) */}
              <text 
                x={labelWidth - 10} 
                y={bar.y + 18} 
                textAnchor="end" 
                className="fill-on-surface-variant text-[10px] font-bold opacity-60 group-hover/entity:opacity-100 transition-opacity"
              >
                {bar.displayLabel}
              </text>

              {/* Bar */}
              <rect 
                x={labelWidth} 
                y={bar.y + 4} 
                width={bar.width} 
                height={16} 
                rx="3"
                style={{ fill: color }}
                className="opacity-70 group-hover/entity:opacity-100 transition-all duration-300"
              />

              {/* Value */}
              <text 
                x={labelWidth + bar.width + 8} 
                y={bar.y + 18} 
                className="fill-on-surface-variant text-[9px] font-black tabular-nums opacity-0 group-hover/entity:opacity-100 transition-opacity"
              >
                ${(bar.total_amount || 0).toLocaleString('es-SV', { maximumFractionDigits: 0 })}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
