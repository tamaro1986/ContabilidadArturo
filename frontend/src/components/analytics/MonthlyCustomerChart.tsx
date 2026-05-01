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
  Cell,
  Legend
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
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-2xl max-w-xs backdrop-blur-md">
        <p className="font-bold text-slate-200 text-sm mb-1">{data.customer_name || data.client_id}</p>
        <p className="text-2xl font-bold text-emerald-400 mb-2">
          ${data.monto_mes.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </p>
        <div className="border-t border-slate-800 my-2 pt-2">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }} />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{data.etiqueta}</span>
          </div>
          <p className="text-[11px] text-slate-500 italic leading-relaxed">
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
    displayName: item.customer_name.length > 20 
      ? item.customer_name.substring(0, 17) + '...' 
      : item.customer_name
  }));

  // Extraer leyendas únicas
  const uniqueSegments = Array.from(new Set(data.map(item => JSON.stringify({
    name: item.etiqueta,
    color: item.color
  })))).map(s => JSON.parse(s));

  return (
    <div className="col-span-1 md:col-span-2 bg-slate-900/40 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-slate-800/50">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-200">Ventas por Cliente</h2>
          <p className="text-sm text-slate-500 mt-1">Top 20 clientes con mayor volumen en {periodo}</p>
        </div>
        <div className="text-[10px] font-bold px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 uppercase tracking-[0.2em] w-fit">
          Mes Actual
        </div>
      </div>
      
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} strokeOpacity={0.05} />
            <XAxis type="number" hide />
            <YAxis 
              dataKey="displayName" 
              type="category" 
              tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
              width={120}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="monto_mes" radius={[0, 4, 4, 0]} barSize={20}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 mt-8 pt-6 border-t border-slate-800/50">
        {uniqueSegments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {seg.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
