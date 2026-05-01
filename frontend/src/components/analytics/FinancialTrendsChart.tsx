"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function FinancialTrendsChart({ data }: { data: any[] }) {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest animate-pulse">
                    Procesando Inteligencia Financiera...
                </p>
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart
                data={data}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
                <defs>
                    <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-secondary)" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="var(--color-secondary)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" vertical={false} opacity={0.4} />
                <XAxis 
                    dataKey="mes" 
                    stroke="var(--color-on-surface-variant)" 
                    fontSize={10} 
                    fontWeight={600}
                    tickLine={false} 
                    axisLine={false} 
                    dy={10}
                />
                <YAxis 
                    stroke="var(--color-on-surface-variant)" 
                    fontSize={10} 
                    fontWeight={600}
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`}
                    className="font-tnum"
                />
                <Tooltip 
                    contentStyle={{ 
                        backgroundColor: '#ffffff', 
                        borderColor: 'var(--color-outline-variant)', 
                        borderRadius: 'var(--radius-lg)', 
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                        fontSize: '12px'
                    }}
                    itemStyle={{ fontWeight: 700 }}
                    formatter={(value: any) => [`$${value.toLocaleString('es-SV', { minimumFractionDigits: 2 })}`, ""]}
                />
                <Legend 
                    verticalAlign="top" 
                    align="right" 
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}
                />
                <Area 
                    type="monotone" 
                    dataKey="ventas_actual" 
                    name="Ingresos Gravados"
                    stroke="var(--color-secondary)" 
                    fillOpacity={1} 
                    fill="url(#colorVentas)" 
                    strokeWidth={3}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                />
                <Area 
                    type="monotone" 
                    dataKey="gastos_actual" 
                    name="Compras y Gastos"
                    stroke="var(--color-primary)" 
                    fillOpacity={1} 
                    fill="url(#colorGastos)" 
                    strokeWidth={3}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}

