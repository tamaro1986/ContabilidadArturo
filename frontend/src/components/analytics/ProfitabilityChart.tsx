"use client";

import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

export default function ProfitabilityChart({ data }: { data: any[] }) {
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
                    cursor={{ fill: '#1e293b', opacity: 0.4 }}
                    formatter={(value: any) => [typeof value === 'number' ? `$${value.toFixed(2)}` : value, "Rentabilidad Neta"]}
                />
                <ReferenceLine y={0} stroke="#475569" strokeWidth={2} />
                <Bar dataKey="rentabilidad" name="Rentabilidad">
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.rentabilidad >= 0 ? '#10b981' : '#ef4444'} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}
