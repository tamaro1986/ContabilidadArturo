"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface SegmentData {
    name: string;
    value: number;
    color: string;
}

export default function CustomerSegmentChart({ data }: { data: SegmentData[] }) {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest animate-pulse">
                    Analizando Cartera...
                </p>
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="#ffffff"
                    strokeWidth={2}
                    cornerRadius={4}
                >
                    {data.map((entry, index) => (
                        <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color} 
                        />
                    ))}
                </Pie>
                <Tooltip 
                    contentStyle={{ 
                        backgroundColor: '#ffffff', 
                        borderColor: 'var(--color-outline-variant)', 
                        borderRadius: 'var(--radius-lg)', 
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                        fontSize: '12px',
                        padding: '12px'
                    }}
                    itemStyle={{ fontWeight: 700, color: 'var(--color-primary)' }}
                    cursor={{ fill: 'none' }}
                />
                <Legend 
                    verticalAlign="bottom" 
                    align="center"
                    iconType="rect"
                    iconSize={10}
                    formatter={(value) => (
                        <span className="text-on-surface-variant font-bold text-[9px] uppercase tracking-wider ml-1">
                            {value}
                        </span>
                    )}
                />
            </PieChart>
        </ResponsiveContainer>
    );
}

