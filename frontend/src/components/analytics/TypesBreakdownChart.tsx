"use client";

import React, { useMemo } from "react";
import { BreakdownData } from "@/types/analytics";

/**
 * TypesBreakdownChart
 * Native SVG replacement for Recharts PieChart (Donut).
 * Rules: Zero external deps, Tailwind v4, Dumb UI.
 */
export default function TypesBreakdownChart({ data, type }: { data: BreakdownData[], type: 'ventas' | 'gastos' }) {
  const COLORS_VENTAS = [
    'var(--color-secondary)',
    'var(--color-secondary-container)',
    'var(--color-on-secondary-container)',
    'var(--color-surface-dim)'
  ];

  const COLORS_GASTOS = [
    'var(--color-primary)',
    'var(--color-primary-container)',
    'var(--color-on-primary-container)',
    'var(--color-outline)'
  ];

  const colors = type === 'ventas' ? COLORS_VENTAS : COLORS_GASTOS;

  const { segments, total } = useMemo(() => {
    if (!data || data.length === 0) {
      return { segments: [], total: 0 };
    }

    const totalVal = data.reduce((sum, item) => sum + item.value, 0);
    let cumulativeValue = 0;

    const processedSegments = data.map((d, i) => {
      const startAngle = (cumulativeValue / totalVal) * 360;
      const arcLength = (d.value / totalVal) * 360;
      cumulativeValue += d.value;
      
      const percentage = ((d.value / totalVal) * 100).toFixed(0);

      // SVG Arc math
      const cx = 50;
      const cy = 50;
      const r = 40;
      
      const startRad = (startAngle - 90) * Math.PI / 180;
      const endRad = (startAngle + arcLength - 90) * Math.PI / 180;
      
      const x1 = cx + r * Math.cos(startRad);
      const y1 = cy + r * Math.sin(startRad);
      const x2 = cx + r * Math.cos(endRad);
      const y2 = cy + r * Math.sin(endRad);
      
      const largeArcFlag = arcLength > 180 ? 1 : 0;
      const pathData = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2}`;

      return {
        ...d,
        path: pathData,
        percentage,
        color: colors[i % colors.length]
      };
    });

    return { segments: processedSegments, total: totalVal };
  }, [data, colors]);

  if (!data || data.length === 0 || total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <div className="w-8 h-8 border-2 border-primary border-t-secondary rounded-full animate-spin"></div>
        <div className="text-primary text-[10px] font-black tracking-widest uppercase opacity-70">Analizando...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex items-center justify-between gap-6 px-4">
      {/* Donut Visualization */}
      <div className="relative w-1/2 aspect-square max-w-45">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {segments.map((seg, i) => (
            <path
              key={i}
              d={seg.path}
              fill="none"
              stroke={seg.color}
              strokeWidth="12"
              strokeLinecap="round"
              className="opacity-90 hover:opacity-100 transition-opacity cursor-pointer"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] font-black text-on-surface-variant opacity-40 uppercase tracking-tighter">Total</span>
          <span className="text-sm font-black text-primary tabular-nums">
            ${(total / 1000).toFixed(1)}k
          </span>
        </div>
      </div>

      {/* Side Legend */}
      <div className="flex-1 flex flex-col justify-center space-y-3">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center justify-between group/seg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: seg.color }} />
              <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-tighter truncate max-w-25">
                {seg.name}
              </span>
            </div>
            <span className="text-[9px] font-black text-primary font-tnum">
              {seg.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
