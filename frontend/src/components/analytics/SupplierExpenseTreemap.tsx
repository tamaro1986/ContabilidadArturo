'use client';

import React from 'react';
import { SupplierRecord } from '../../types/supplierAnalysis';

interface SupplierExpenseTreemapProps {
    data: SupplierRecord[];
    topCount?: number;
    onSelectSupplier?: (supplier: SupplierRecord) => void;
}

/**
 * SupplierExpenseTreemap
 * Visualiza la concentración de gastos operativos mediante bloques proporcionales.
 * Utiliza un layout de Flexbox puro para máxima compatibilidad y rendimiento.
 */
const SupplierExpenseTreemap: React.FC<SupplierExpenseTreemapProps> = ({ 
    data, 
    topCount = 5,
    onSelectSupplier 
}) => {
    // 1. Preparar datos: Ordenar por gasto de mayor a menor
    const sortedData = [...data].sort((a, b) => b.gastoHistorico - a.gastoHistorico);
    
    // 2. Separar Top Proveedores y "Otros"
    const topSuppliers = sortedData.slice(0, topCount);
    const otherSuppliers = sortedData.slice(topCount);
    const othersExpense = otherSuppliers.reduce((acc, curr) => acc + curr.gastoHistorico, 0);
    const totalExpense = sortedData.reduce((acc, curr) => acc + curr.gastoHistorico, 0);

    // 3. Crear nodos para el treemap
    const nodes = topSuppliers.map(s => ({
        id: s.id,
        nombre: s.nombre,
        valor: s.gastoHistorico,
        pct: (s.gastoHistorico / totalExpense) * 100,
        categoria: s.categoria,
        raw: s
    }));

    if (othersExpense > 0) {
        nodes.push({
            id: 'others',
            nombre: 'Otros Proveedores',
            valor: othersExpense,
            pct: (othersExpense / totalExpense) * 100,
            categoria: 'zinc', // Bloque consolidado "Otros"
            raw: null as any
        });
    }

    // 4. Agrupar en filas (Heurística simple para mantener bloques legibles)
    // Fila 1: Los dos más grandes (o el más grande si es > 50%)
    // Fila 2: El resto
    const firstRowNodes = nodes.slice(0, nodes[0].pct > 50 ? 1 : 2);
    const secondRowNodes = nodes.slice(firstRowNodes.length);

    const firstRowPct = firstRowNodes.reduce((acc, n) => acc + n.pct, 0);
    const secondRowPct = 100 - firstRowPct;

    const getBgColor = (categoria: string) => {
        switch (categoria) {
            case 'Socio Estratégico': return 'bg-indigo-600 hover:bg-indigo-500';
            case 'Gasto Recurrente': return 'bg-amber-600 hover:bg-amber-500';
            case 'Eventual': return 'bg-teal-600 hover:bg-teal-500';
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
        <div className="w-full h-96 flex flex-col gap-1 overflow-hidden rounded-2xl group/treemap shadow-inner bg-zinc-50">
            {/* Fila Superior */}
            <div 
                className="flex gap-1 transition-all duration-500" 
                style={{ height: `${firstRowPct}%` }}
            >
                {firstRowNodes.map((node) => (
                    <div
                        key={node.id}
                        onClick={() => node.raw && onSelectSupplier?.(node.raw)}
                        className={`
                            relative p-5 flex flex-col justify-between 
                            transition-all duration-300 
                            ${node.raw ? 'cursor-pointer' : 'cursor-default'}
                            ${getBgColor(node.categoria)}
                            group/node overflow-hidden
                        `}
                        style={{ width: `${(node.pct / firstRowPct) * 100}%` }}
                        title={`${node.nombre}: ${formatCurrency(node.valor)} (${node.pct.toFixed(1)}%)`}
                    >
                        <div className="z-10">
                            <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">
                                {node.categoria === 'zinc' ? 'Consolidado' : node.categoria}
                            </p>
                            <h4 className="text-sm font-black text-white truncate leading-tight">
                                {node.nombre}
                            </h4>
                        </div>
                        <div className="z-10 mt-auto">
                            <p className="text-2xl font-black text-white font-tnum">
                                {formatCurrency(node.valor)}
                            </p>
                            <p className="text-[10px] font-bold text-white/50">
                                {node.pct.toFixed(1)}% del gasto total
                            </p>
                        </div>
                        
                        {/* Decoración de fondo */}
                        <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover/node:scale-150 transition-transform duration-700" />
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
                            onClick={() => node.raw && onSelectSupplier?.(node.raw)}
                            className={`
                                relative p-4 flex flex-col justify-between 
                                transition-all duration-300 
                                ${node.raw ? 'cursor-pointer' : 'cursor-default'}
                                ${getBgColor(node.categoria)}
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
                                <p className="text-base font-black text-white font-tnum">
                                    {formatCurrency(node.valor)}
                                </p>
                                {node.pct > 3 && (
                                    <p className="text-[9px] font-bold text-white/50">
                                        {node.pct.toFixed(1)}%
                                    </p>
                                )}
                            </div>

                            {/* Decoración de fondo simple para bloques pequeños */}
                            <div className="absolute -right-2 -bottom-2 w-16 h-16 bg-white/5 rounded-full blur-2xl group-hover/node:scale-125 transition-transform duration-500" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SupplierExpenseTreemap;
