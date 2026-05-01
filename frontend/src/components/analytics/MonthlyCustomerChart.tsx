'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface MonthlyCustomer {
  client_id: string;
  customer_name: string;
  monto_mes: number;
  etiqueta: string;
  color: string;
  narrativa: string;
}

interface MonthlyCustomerChartProps {
  data: MonthlyCustomer[];
  periodo: string;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as MonthlyCustomer;
    return (
      <div className="bg-white border border-outline-variant p-4 rounded-lg shadow-lg max-w-xs">
        <p className="font-bold text-primary text-sm mb-1">{data.customer_name || data.client_id}</p>
        <p className="text-2xl font-bold text-secondary font-tnum mb-2">
          ${data.monto_mes.toLocaleString('es-SV', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <div className="border-t border-outline-variant my-2 pt-2">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{data.etiqueta}</span>
          </div>
          <p className="text-[11px] text-on-surface-variant/80 italic leading-relaxed">
            "{data.narrativa}"
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export function MonthlyCustomerChart({ data, periodo }: MonthlyCustomerChartProps) {
  // Truncar nombres largos para el eje Y
  const chartData = data.map(item => ({
    ...item,
    displayName: item.customer_name.length > 25 
      ? item.customer_name.substring(0, 22) + '...' 
      : item.customer_name
  }));

  // Extraer leyendas únicas
  const uniqueSegments = Array.from(new Set(data.map(item => JSON.stringify({
    name: item.etiqueta,
    color: item.color
  })))).map(s => JSON.parse(s));

  return (
    <div className="bg-white rounded-lg p-8 border border-outline-variant shadow-sm transition-all hover:border-secondary/30">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
            Ventas por Cliente
          </h2>
          <p className="text-xs text-on-surface-variant mt-1">Top clientes con mayor volumen de transacciones en {periodo}</p>
        </div>
        <div className="text-[10px] font-bold px-3 py-1 bg-secondary/10 text-secondary rounded-md border border-secondary/20 uppercase tracking-[0.2em] w-fit">
          Período Actual
        </div>
      </div>
      
      <div className="h-[450px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
            <XAxis type="number" hide />
            <YAxis 
              dataKey="displayName" 
              type="category" 
              tick={{ fontSize: 10, fill: 'var(--color-on-surface-variant)', fontWeight: 600 }}
              width={150}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-surface-container-low)', opacity: 0.5 }} />
            <Bar dataKey="monto_mes" radius={[0, 4, 4, 0]} barSize={24}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="flex flex-wrap justify-center gap-x-10 gap-y-3 mt-8 pt-6 border-t border-outline-variant">
        {uniqueSegments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-sm shadow-sm" style={{ backgroundColor: seg.color }} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              {seg.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

