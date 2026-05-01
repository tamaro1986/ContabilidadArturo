"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const COLORS_VENTAS = ['#10b981', '#34d399', '#059669', '#10b981aa'];
const COLORS_GASTOS = ['#ef4444', '#f87171', '#dc2626', '#ef4444aa'];

export default function TypesBreakdownChart({ data, type }: { data: any[], type: 'ventas' | 'gastos' }) {
    if (!data || data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-2">
                <div className="w-8 h-8 border-2 border-slate-800 border-t-slate-500 rounded-full animate-spin"></div>
                <div className="text-slate-500 text-xs font-medium tracking-widest uppercase">Analizando Operaciones...</div>
            </div>
        );
    }

    const colors = type === 'ventas' ? COLORS_VENTAS : COLORS_GASTOS;
    
    // Calcular total para porcentajes
    const total = data.reduce((sum, item) => sum + item.value, 0);

    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
        if (percent < 0.05) return null; // No mostrar si es menor al 5%
        return null; // Ocultamos labels internos para diseño limpio, usamos leyenda
    };

    return (
        <div className="h-full flex flex-col">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="40%" // Desplazado a la izquierda para dejar espacio a la leyenda
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                        cornerRadius={6}
                        animationBegin={0}
                        animationDuration={1500}
                    >
                        {data.map((entry, index) => (
                            <Cell 
                                key={`cell-${index}`} 
                                fill={colors[index % colors.length]} 
                                className="hover:opacity-80 transition-opacity outline-none"
                                style={{ filter: `drop-shadow(0px 4px 8px ${colors[index % colors.length]}44)` }}
                            />
                        ))}
                    </Pie>
                    <Tooltip 
                        contentStyle={{ 
                            backgroundColor: 'var(--color-surface-container-lowest)', 
                            borderColor: 'var(--color-outline-variant)', 
                            borderRadius: '0.25rem', 
                            color: 'var(--color-primary)',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            fontSize: '10px',
                            fontWeight: 'bold'
                        }}
                        itemStyle={{ fontWeight: 700 }}
                        formatter={(value: any) => [`$${value.toLocaleString()}`, "Monto"]}
                    />
                    <Legend 
                        layout="vertical" 
                        verticalAlign="middle" 
                        align="right"
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{
                            paddingLeft: '20px',
                            lineHeight: '24px'
                        }}
                        formatter={(value, entry: any) => {
                            const { payload } = entry;
                            const percentage = ((payload.value / total) * 100).toFixed(0);
                            return (
                                <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-tighter inline-flex items-center gap-2">
                                    <span className="text-primary font-black font-tnum">{percentage}%</span>
                                    {value}
                                </span>
                            );
                        }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

