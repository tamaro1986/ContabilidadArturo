import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function TopEntitiesChart({ title, data, color }: { title: string, data: any[], color: string }) {
    return (
        <div className="bg-slate-900/50 backdrop-blur-md rounded-3xl p-6 shadow-2xl border border-slate-800/50 h-full flex flex-col">
            <h2 className="text-xl font-bold mb-6 text-slate-200">{title}</h2>
            <div className="flex-1 w-full min-h-62.5">
                {data && data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                            <XAxis type="number" hide />
                            <YAxis 
                                dataKey="nit_dui" 
                                type="category" 
                                stroke="#94a3b8" 
                                fontSize={12} 
                                width={120} 
                                tickLine={false} 
                                axisLine={false}
                                tickFormatter={(value) => value ? value.substring(0, 14) + (value.length > 14 ? '...' : '') : 'N/A'}
                            />
                            <Tooltip 
                                cursor={{ fill: '#334155', opacity: 0.4 }} 
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '0.75rem' }} 
                                formatter={(value: any) => [typeof value === 'number' ? `$${value.toFixed(2)}` : value, 'Monto']}
                            />
                            <Bar dataKey="total_amount" fill={color} radius={[0, 4, 4, 0]} barSize={24} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-500 font-medium">Sin datos en este período</div>
                )}
            </div>
        </div>
    );
}
