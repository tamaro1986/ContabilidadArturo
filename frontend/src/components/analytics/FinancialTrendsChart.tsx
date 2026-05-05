"use client";

import { useMemo } from "react";
import { TrendData } from "@/types/analytics";

/**
 * FinancialTrendsChart
 * Rules: Zero external deps, Native SVG/Tailwind, Corporate Modern Design, Updated syntax (--color-xxx).
 * UI Tonta: Lógica mínima, renderizado directo, corrección de Hooks.
 */
export default function FinancialTrendsChart({ data }: { data: TrendData[] }) {
  // Dimensiones fijas
  const w = 800;
  const h = 300;
  const margin = 40;
  const innerW = w - margin * 2;
  const innerH = h - margin * 2;

  const { ventasPath, gastosPath, ventasArea, gastosArea, xLabels, yTicks, points } = useMemo(() => {
    if (!data || data.length === 0) {
      return { ventasPath: "", gastosPath: "", ventasArea: "", gastosArea: "", xLabels: [], yTicks: [], points: [] };
    }

    const vals = data.flatMap(d => [d.ventas_actual || 0, d.gastos_actual || 0]);
    const max = Math.max(...vals, 1) * 1.2;
    const xStep = innerW / (data.length - 1 || 1);

    const getX = (i: number) => margin + i * xStep;
    const getY = (val: number) => h - margin - (val / max) * innerH;

    const vPoints = data.map((d, i) => ({ x: getX(i), y: getY(d.ventas_actual || 0), val: d.ventas_actual }));
    const gPoints = data.map((d, i) => ({ x: getX(i), y: getY(d.gastos_actual || 0), val: d.gastos_actual }));

    const vPathStr = vPoints.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(" ");
    const gPathStr = gPoints.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(" ");

    // Area paths (close the loop at the bottom)
    const vAreaStr = `${vPathStr} L ${getX(data.length - 1)},${h - margin} L ${getX(0)},${h - margin} Z`;
    const gAreaStr = `${gPathStr} L ${getX(data.length - 1)},${h - margin} L ${getX(0)},${h - margin} Z`;

    return {
      ventasPath: vPathStr,
      gastosPath: gPathStr,
      ventasArea: vAreaStr,
      gastosArea: gAreaStr,
      xLabels: data.map((d, i) => ({ text: d.mes, x: getX(i) })),
      yTicks: [0, 0.5, 1].map(p => ({
        label: `$${((max * p) / 1000).toFixed(1)}k`,
        y: h - margin - p * innerH
      })),
      points: data.map((d, i) => ({
        x: getX(i),
        vY: getY(d.ventas_actual || 0),
        gY: getY(d.gastos_actual || 0),
        ventas: d.ventas_actual,
        gastos: d.gastos_actual,
        mes: d.mes
      }))
    };
  }, [data, innerW, innerH, h]);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-surface-container-lowest rounded-lg border border-outline-variant/30">
        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest animate-pulse">
          No hay datos de tendencias disponibles
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between px-2">
        <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">Tendencias de Ingresos vs Gastos</h4>
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-secondary" />
            <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Ventas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Gastos</span>
          </div>
        </div>
      </div>

      <div className="relative border border-outline-variant/20 rounded-xl bg-surface-container-lowest p-4 overflow-hidden shadow-sm">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto overflow-visible select-none">
          <defs>
            <linearGradient id="ventasGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-secondary)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="var(--color-secondary)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="gastosGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
            </linearGradient>
          </defs>

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
                className="fill-on-surface-variant text-[10px] font-bold opacity-40"
              >
                {tick.label}
              </text>
            </g>
          ))}

          {/* Areas */}
          <path d={ventasArea} fill="url(#ventasGradient)" className="opacity-50" />
          <path d={gastosArea} fill="url(#gastosGradient)" className="opacity-50" />

          {/* Paths */}
          <path d={ventasPath} fill="none" className="stroke-secondary stroke-[2.5]" strokeLinecap="round" strokeLinejoin="round" />
          <path d={gastosPath} fill="none" className="stroke-primary stroke-[2.5]" strokeLinecap="round" strokeLinejoin="round" />

          {/* Interactive Points */}
          {points.map((p, i) => (
            <g key={i} className="group/point">
              {/* Vertical hover line placeholder */}
              <line 
                x1={p.x} y1={margin} x2={p.x} y2={h - margin} 
                className="stroke-outline-variant stroke-1 opacity-0 group-hover/point:opacity-40 transition-opacity"
                strokeDasharray="2,2"
              />
              
              {/* Ventas Dot */}
              <circle 
                cx={p.x} cy={p.vY} r="4" 
                className="fill-secondary stroke-surface-container-lowest stroke-2 shadow-sm cursor-help"
              >
                <title>{`${p.mes} - Ventas: $${p.ventas.toLocaleString()}`}</title>
              </circle>

              {/* Gastos Dot */}
              <circle 
                cx={p.x} cy={p.gY} r="4" 
                className="fill-primary stroke-surface-container-lowest stroke-2 shadow-sm cursor-help"
              >
                <title>{`${p.mes} - Gastos: $${p.gastos.toLocaleString()}`}</title>
              </circle>
            </g>
          ))}

          {/* X Axis */}
          {xLabels.map((l, i) => (
            <text 
              key={i} x={l.x} y={h - margin + 20} 
              textAnchor="middle" 
              className="fill-on-surface-variant text-[9px] font-bold uppercase tracking-tighter opacity-50"
            >
              {l.text}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
