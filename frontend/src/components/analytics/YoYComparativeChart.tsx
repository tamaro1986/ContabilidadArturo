"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function YoYComparativeChart({ data }: { data: any[] }) {
    if (!data || data.length === 0) {
        return <div className="text-slate-500 text-sm font-medium flex items-center justify-center h-full animate-pulse">Procesando datos...</div>;
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart
                data={data}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
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
                    cursor={{ fill: '#1e293b', opacity: 0.4 }}
                />
                <Legend verticalAlign="top" height={36} />
                <Bar 
                    dataKey="ventas_actual" 
                    name="Ventas Este Año" 
                    fill="#3b82f6" 
                    radius={[4, 4, 0, 0]} 
                />
                <Bar 
                    dataKey="ventas_anterior" 
                    name="Ventas Año Anterior" 
                    fill="#94a3b8" 
                    radius={[4, 4, 0, 0]} 
                />
            </BarChart>
        </ResponsiveContainer>
    );
}
