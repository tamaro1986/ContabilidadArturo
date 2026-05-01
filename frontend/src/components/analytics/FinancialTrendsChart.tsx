"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function FinancialTrendsChart({ data }: { data: any[] }) {
    if (!data || data.length === 0) {
        return <div className="text-slate-500 text-sm font-medium flex items-center justify-center h-full animate-pulse">Procesando datos...</div>;
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart
                data={data}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
                <defs>
                    <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="mes" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis 
                    stroke="#64748b" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `$${value}`}
                />
                <Tooltip 
                    contentStyle={{ 
                        backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                        backdropFilter: 'blur(8px)',
                        borderColor: '#1e293b', 
                        borderRadius: '0.75rem', 
                        color: '#f8fafc',
                    }}
                    itemStyle={{ fontWeight: 600 }}
                    formatter={(value: any) => [typeof value === 'number' ? `$${value.toFixed(2)}` : value, ""]}
                />
                <Legend verticalAlign="top" height={36} />
                <Area 
                    type="monotone" 
                    dataKey="ventas_actual" 
                    name="Ventas (Ingresos)"
                    stroke="#10b981" 
                    fillOpacity={1} 
                    fill="url(#colorVentas)" 
                    strokeWidth={3}
                />
                <Area 
                    type="monotone" 
                    dataKey="gastos_actual" 
                    name="Gastos (Compras)"
                    stroke="#ef4444" 
                    fillOpacity={1} 
                    fill="url(#colorGastos)" 
                    strokeWidth={3}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}
