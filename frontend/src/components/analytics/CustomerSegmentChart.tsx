"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface SegmentData {
    name: string;
    value: number;
    color: string;
}

export default function CustomerSegmentChart({ data }: { data: SegmentData[] }) {
    if (!data || data.length === 0) {
        return <div className="text-slate-500 text-sm font-medium flex items-center justify-center h-full animate-pulse">Analizando base de clientes...</div>;
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={8}
                >
                    {data.map((entry, index) => (
                        <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color} 
                            style={{ filter: `drop-shadow(0px 4px 6px ${entry.color}33)` }}
                        />
                    ))}
                </Pie>
                <Tooltip 
                    contentStyle={{ 
                        backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                        backdropFilter: 'blur(12px)',
                        borderColor: '#334155', 
                        borderRadius: '1rem', 
                        color: '#f8fafc',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}
                    itemStyle={{ color: '#f8fafc', fontWeight: 600, fontSize: '12px' }}
                    cursor={{ fill: 'none' }}
                />
                <Legend 
                    verticalAlign="bottom" 
                    height={40}
                    iconType="circle"
                    formatter={(value) => (
                        <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest ml-1">
                            {value}
                        </span>
                    )}
                />
            </PieChart>
        </ResponsiveContainer>
    );
}
