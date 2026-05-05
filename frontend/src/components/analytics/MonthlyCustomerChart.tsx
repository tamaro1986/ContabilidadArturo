"use client";

import React, { useMemo } from 'react';

import { MonthlyCustomer } from "@/types/analytics";

interface MonthlyCustomerChartProps {
  data: MonthlyCustomer[];
  periodo: string;
}

/**
 * MonthlyCustomerChart
 * Native SVG replacement for Recharts BarChart (Vertical).
 * Rules: Zero external deps, Tailwind v4, Dumb UI.
 */
export function MonthlyCustomerChart({ data, periodo }: MonthlyCustomerChartProps) {
  // Dimensiones del gráfico
  const rowHeight = 40;
  const chartWidth = 800;
  const labelWidth = 180;
  const paddingRight = 40;
  const barMaxW = chartWidth - labelWidth - paddingRight;

  const { bars, chartHeight, uniqueSegments } = useMemo(() => {
    if (!data || data.length === 0) {
      return { bars: [], chartHeight: 40, uniqueSegments: [] };
    }

    const maxMonto = Math.max(...data.map(d => d.monto_mes), 1);
    const chartHeight = data.length * rowHeight + 40;

    const processedBars = data.map((d, i) => {
      const width = (d.monto_mes / maxMonto) * barMaxW;
      const displayName = d.customer_name.length > 22 
        ? d.customer_name.substring(0, 20) + "..." 
        : d.customer_name;
      
      return {
        ...d,
        y: i * rowHeight + 20,
        width: Math.max(width, 2), // Mínimo 2px para visibilidad
        displayName
      };
    });

    const seen = new Set();
    const segments = data.filter(d => {
      if (seen.has(d.etiqueta)) return false;
      seen.add(d.etiqueta);
      return true;
    }).map(d => ({ name: d.etiqueta, color: d.color }));

    return { bars: processedBars, chartHeight, uniqueSegments: segments };
  }, [data, barMaxW]);

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center border border-dashed border-outline-variant rounded-xl">
        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest opacity-40">
          Sin datos de facturación para este período
        </span>
      </div>
    );
  }


  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
            Volumen por Cliente
          </h2>
          <p className="text-[9px] text-on-surface-variant font-bold uppercase opacity-50 tracking-wider">
            Distribución en {periodo}
          </p>
        </div>
        <div className="text-[9px] font-black px-2.5 py-1 bg-secondary/10 text-secondary rounded border border-secondary/20 uppercase tracking-widest">
          Top Clientes
        </div>
      </div>

      <div className="relative group/chart border border-outline-variant/20 rounded-xl bg-surface-container-lowest p-6 overflow-hidden">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible select-none">
          {/* Vertical Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
            <line 
              key={i}
              x1={labelWidth + p * barMaxW} 
              y1={0} 
              x2={labelWidth + p * barMaxW} 
              y2={chartHeight - 20}
              className="stroke-outline-variant stroke-[0.5] opacity-20"
              strokeDasharray="4 4"
            />
          ))}

          {bars.map((bar) => (
            <g key={bar.client_id} className="group/row">
              {/* Row Highlight */}
              <rect 
                x={0} y={bar.y - 10} width={chartWidth} height={rowHeight} 
                className="fill-transparent group-hover/row:fill-surface-container-low/40 transition-colors"
                rx="4"
              />
              
              {/* Label */}
              <text 
                x={labelWidth - 15} 
                y={bar.y + 16} 
                textAnchor="end" 
                className="fill-on-surface-variant text-[11px] font-bold opacity-60 group-hover/row:opacity-100 transition-opacity"
              >
                {bar.displayName}
              </text>

              {/* Bar */}
              <rect 
                x={labelWidth} 
                y={bar.y + 2} 
                width={bar.width} 
                height={20} 
                rx="4"
                style={{ fill: bar.color }}
                className="opacity-80 group-hover/row:opacity-100 transition-all duration-300"
              />

              {/* Value Label */}
              <text 
                x={labelWidth + bar.width + 10} 
                y={bar.y + 16} 
                className="fill-on-surface-variant text-[10px] font-black tabular-nums opacity-0 group-hover/row:opacity-100 transition-opacity"
              >
                ${bar.monto_mes.toLocaleString('es-SV', { maximumFractionDigits: 0 })}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-6 pt-4 border-t border-outline-variant/30">
        {uniqueSegments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: seg.color }} />
            <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant opacity-70">
              {seg.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}


