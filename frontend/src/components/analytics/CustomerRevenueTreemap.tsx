'use client';

import React from 'react';
import { CustomerRecord } from '../../types/customerAnalysis';

interface CustomerRevenueTreemapProps {
    data: CustomerRecord[];
    topCount?: number;
    onSelectCustomer?: (customer: CustomerRecord) => void;
}

/**
 * CustomerRevenueTreemap
 * Visualiza la concentración de ingresos mediante bloques proporcionales.
 * Utiliza un layout de Flexbox puro para evitar dependencias externas.
 */
interface TreemapNode {
    id: string | number;
    nombre: string;
    valor: number;
    pct: number;
    estado: string;
    raw: CustomerRecord | null;
}

const CustomerRevenueTreemap: React.FC<CustomerRevenueTreemapProps> = ({ 
    data, 
    topCount = 5,
    onSelectCustomer 
}) => {
    // 1. Preparar datos: Ordenar por ganancia de mayor a menor
    const sortedData = [...data].sort((a, b) => b.gananciaHistorica - a.gananciaHistorica);
    
    // 2. Separar Top Clientes y "Otros"
    const topClients = sortedData.slice(0, topCount);
    const otherClients = sortedData.slice(topCount);
    const othersRevenue = otherClients.reduce((acc, curr) => acc + curr.gananciaHistorica, 0);
    const totalRevenue = sortedData.reduce((acc, curr) => acc + curr.gananciaHistorica, 0);

    // 3. Crear nodos para el treemap
    const nodes: TreemapNode[] = topClients.map(c => ({
        id: c.id,
        nombre: c.nombre,
        valor: c.gananciaHistorica,
        pct: (c.gananciaHistorica / totalRevenue) * 100,
        estado: c.estado,
        raw: c
    }));

    if (othersRevenue > 0) {
        nodes.push({
            id: 'others',
            nombre: 'Otros Clientes',
            valor: othersRevenue,
            pct: (othersRevenue / totalRevenue) * 100,
            estado: 'zinc', // Bloque consolidado "Otros"
            raw: null
        });
    }

    // 4. Agrupar en filas (Heurística simple para mantener bloques legibles)
    // Fila 1: Los dos más grandes (o el más grande si es > 50%)
    // Fila 2: El resto
    const firstRowNodes = nodes.slice(0, nodes[0].pct > 50 ? 1 : 2);
    const secondRowNodes = nodes.slice(firstRowNodes.length);

    const firstRowPct = firstRowNodes.reduce((acc, n) => acc + n.pct, 0);
    const secondRowPct = 100 - firstRowPct;

    const getBgColor = (estado: string) => {
        switch (estado) {
            case 'Campeones': return 'bg-emerald-600 hover:bg-emerald-500';
            case 'Leales': return 'bg-blue-600 hover:bg-blue-500';
            case 'En Riesgo': return 'bg-amber-600 hover:bg-amber-500';
            case 'zinc': return 'bg-zinc-400 hover:bg-zinc-500';
            default: return 'bg-zinc-600';
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(val);
    };

    return (
        <div className="w-full h-96 flex flex-col gap-1 overflow-hidden rounded-2xl group/treemap">
            {/* Fila Superior */}
            <div 
                className="flex gap-1 transition-all duration-500" 
                style={{ height: `${firstRowPct}%` }}
            >
                {firstRowNodes.map((node) => (
                    <div
                        key={node.id}
                        onClick={() => node.raw && onSelectCustomer?.(node.raw)}
                        className={`
                            relative p-4 flex flex-col justify-between 
                            transition-all duration-300 cursor-pointer 
                            ${getBgColor(node.estado)}
                            group/node overflow-hidden
                        `}
                        style={{ width: `${(node.pct / firstRowPct) * 100}%` }}
                        title={`${node.nombre}: ${formatCurrency(node.valor)} (${node.pct.toFixed(1)}%)`}
                    >
                        <div className="z-10">
                            <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">
                                {node.estado === 'zinc' ? 'Consolidado' : node.estado}
                            </p>
                            <h4 className="text-sm font-black text-white truncate leading-tight">
                                {node.nombre}
                            </h4>
                        </div>
                        <div className="z-10 mt-auto">
                            <p className="text-xl font-black text-white font-tnum">
                                {formatCurrency(node.valor)}
                            </p>
                            <p className="text-[10px] font-bold text-white/50">
                                {node.pct.toFixed(1)}% del total
                            </p>
                        </div>
                        
                        {/* Decoración de fondo */}
                        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover/node:scale-150 transition-transform duration-700" />
                    </div>
                ))}
            </div>

            {/* Fila Inferior */}
            {secondRowNodes.length > 0 && (
                <div 
                    className="flex gap-1 transition-all duration-500" 
                    style={{ height: `${secondRowPct}%` }}
                >
                    {secondRowNodes.map((node) => (
                        <div
                            key={node.id}
                            onClick={() => node.raw && onSelectCustomer?.(node.raw)}
                            className={`
                                relative p-3 flex flex-col justify-between 
                                transition-all duration-300 
                                ${node.raw ? 'cursor-pointer' : 'cursor-default'}
                                ${getBgColor(node.estado)}
                                group/node overflow-hidden
                            `}
                            style={{ width: `${(node.pct / secondRowPct) * 100}%` }}
                            title={`${node.nombre}: ${formatCurrency(node.valor)} (${node.pct.toFixed(1)}%)`}
                        >
                            <div className="z-10">
                                <h4 className="text-xs font-black text-white truncate leading-tight">
                                    {node.nombre}
                                </h4>
                            </div>
                            <div className="z-10">
                                <p className="text-sm font-black text-white font-tnum">
                                    {formatCurrency(node.valor)}
                                </p>
                                {node.pct > 3 && (
                                    <p className="text-[9px] font-bold text-white/50">
                                        {node.pct.toFixed(1)}%
                                    </p>
                                )}
                            </div>

                            {/* Decoración de fondo simple para bloques pequeños */}
                            <div className="absolute -right-2 -bottom-2 w-12 h-12 bg-white/5 rounded-full blur-xl group-hover/node:scale-125 transition-transform duration-500" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CustomerRevenueTreemap;
