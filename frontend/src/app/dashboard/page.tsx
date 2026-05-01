"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";
import CustomerSegmentChart from "../../components/analytics/CustomerSegmentChart";
import CustomerSegmentTable from "../../components/analytics/CustomerSegmentTable";
import SegmentInsightPanel from "../../components/analytics/SegmentInsightPanel";
import { MonthlyCustomerChart } from "../../components/analytics/MonthlyCustomerChart";
import TaxLiquidationCard from "../../components/analytics/TaxLiquidationCard";
import TopEntitiesChart from "../../components/analytics/TopEntitiesChart";
import DocumentHealthBadge from "../../components/analytics/DocumentHealthBadge";
import FinancialTrendsChart from "../../components/analytics/FinancialTrendsChart";
import YoYComparativeChart from "../../components/analytics/YoYComparativeChart";
import ProfitabilityChart from "../../components/analytics/ProfitabilityChart";
import TypesBreakdownChart from "../../components/analytics/TypesBreakdownChart";
import { BarChart3, Receipt, Users2 } from "lucide-react";

export default function DashboardPage() {
    const [activeTab, setActiveTab] = useState<'segments' | 'tax'>('segments');
    const [segmentData, setSegmentData] = useState<{ summary: any[]; data: any[] } | null>(null);
    const [monthlyCustomers, setMonthlyCustomers] = useState<any[]>([]);
    const [taxData, setTaxData] = useState<{ liquidation: any, topEntities: any, health: any } | null>(null);
    const [trendsData, setTrendsData] = useState<any[]>([]);
    const [typesData, setTypesData] = useState<{ ventas: any[], gastos: any[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                let headers: HeadersInit = {};
                const mockTenantId = localStorage.getItem("X-Mock-Tenant-ID");
                
                if (mockTenantId) {
                    headers = { "X-Mock-Tenant-ID": mockTenantId };
                } else {
                    const { data: sessionData } = await supabase.auth.getSession();
                    const token = sessionData?.session?.access_token;
                    
                    if (!token) {
                        setError("No estás autenticado. Por favor inicia sesión.");
                        setLoading(false);
                        return;
                    }
                    headers = { "Authorization": `Bearer ${token}` };
                }

                const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
                
                // Fetch Customer Segments
                const segmentsRes = await fetch(`${API_URL}/analytics/rfm`, { headers });
                if (segmentsRes.ok) setSegmentData(await segmentsRes.json());

                // Fetch Monthly Customers
                const monthlyRes = await fetch(`${API_URL}/analytics/monthly-customers`, { headers });
                if (monthlyRes.ok) setMonthlyCustomers((await monthlyRes.json()).data);

                // Fetch Financial Intelligence
                const trendsRes = await fetch(`${API_URL}/analytics/financial-trends`, { headers });
                if (trendsRes.ok) setTrendsData((await trendsRes.json()).data);

                const typesRes = await fetch(`${API_URL}/analytics/types-breakdown`, { headers });
                if (typesRes.ok) setTypesData((await typesRes.json()).data);

                // Fetch Tax Data
                const ivaRes = await fetch(`${API_URL}/analytics/tax-summary/iva-liquidation`, { headers });
                const topRes = await fetch(`${API_URL}/analytics/tax-summary/top-entities`, { headers });
                const healthRes = await fetch(`${API_URL}/analytics/tax-summary/document-health`, { headers });

                if (ivaRes.ok && topRes.ok && healthRes.ok) {
                    setTaxData({
                        liquidation: (await ivaRes.json()).data,
                        topEntities: (await topRes.json()).data,
                        health: (await healthRes.json()).data
                    });
                }

            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-emerald-400 font-medium tracking-widest uppercase text-xs">Cargando Inteligencia Comercial...</p>
            </div>
        );
    }
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950 text-red-500 font-sans">
                <div className="bg-red-950/20 p-8 rounded-2xl border border-red-900/30 backdrop-blur-md max-w-md text-center">
                    <h3 className="text-xl font-bold mb-4">Error de Conexión</h3>
                    <p className="text-red-400/80 leading-relaxed">{error}</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="mt-6 px-6 py-2 bg-red-900/40 text-red-400 rounded-full text-sm font-bold border border-red-900/50 hover:bg-red-900/60 transition-all"
                    >
                        Reintentar Conexión
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans selection:bg-emerald-500/30">
            <div className="max-w-7xl mx-auto space-y-8">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
                    <div>
                        <h1 className="text-4xl font-black bg-clip-text text-transparent bg-linear-to-r from-emerald-400 via-emerald-300 to-cyan-400 tracking-tighter">
                            Dashboard Inteligente
                        </h1>
                        <p className="text-slate-500 mt-2 font-medium tracking-wide">Panel de Gestión y Análisis de Negocio</p>
                    </div>
                    <div className="text-[10px] font-bold text-slate-500 bg-slate-900/50 px-4 py-2 rounded-full border border-slate-800 tracking-[0.2em] uppercase">
                        Última actualización: Hoy
                    </div>
                </header>

                {/* Tabs Modernas */}
                <div className="flex space-x-1 bg-slate-900/30 p-1 rounded-2xl border border-slate-800/50 w-fit">
                    <button 
                        onClick={() => setActiveTab('segments')}
                        className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'segments' ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'}`}
                    >
                        <Users2 size={18} />
                        Análisis de Clientes
                    </button>
                    <button 
                        onClick={() => setActiveTab('tax')}
                        className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'tax' ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'}`}
                    >
                        <Receipt size={18} />
                        Gestión Tributaria
                    </button>
                </div>

                {/* Contenido del Tab */}
                {activeTab === 'segments' ? (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {/* Fila 1: Tendencias y Rentabilidad */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-slate-800/50">
                                <h2 className="text-xl font-bold mb-8 text-slate-200 flex items-center gap-3">
                                    <BarChart3 className="text-emerald-400" size={20} />
                                    Salud Financiera (Mensual)
                                </h2>
                                <div className="h-80 w-full">
                                    <FinancialTrendsChart data={trendsData} />
                                </div>
                            </div>
                            <div className="lg:col-span-1 bg-slate-900/40 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-slate-800/50">
                                <h2 className="text-xl font-bold mb-8 text-slate-200">Rentabilidad</h2>
                                <div className="h-80 w-full">
                                    <ProfitabilityChart data={trendsData} />
                                </div>
                            </div>
                        </div>

                        {/* Fila 2: NUEVO Gráfico de Clientes del Mes */}
                        <div className="grid grid-cols-1 gap-8">
                            <MonthlyCustomerChart 
                                data={monthlyCustomers} 
                                periodo="Abril 2026" 
                            />
                        </div>

                        {/* Fila 3: Segmentación e Inteligencia */}
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                            <div className="lg:col-span-1 h-full">
                                <SegmentInsightPanel />
                            </div>
                            <div className="lg:col-span-1 bg-slate-900/40 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-slate-800/50 transition-all hover:border-emerald-500/30">
                                <h2 className="text-xl font-bold mb-8 text-slate-200">Composición de Cartera</h2>
                                <div className="h-72 w-full">
                                    <CustomerSegmentChart data={segmentData?.summary || []} />
                                </div>
                            </div>
                            <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-slate-800/50 overflow-hidden">
                                <h2 className="text-xl font-bold mb-8 text-slate-200">Base de Clientes Clasificada</h2>
                                <CustomerSegmentTable data={segmentData?.data || []} />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {/* Fila 1: Liquidación y Salud */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2">
                                <TaxLiquidationCard data={taxData?.liquidation} />
                            </div>
                            <div className="lg:col-span-1">
                                <DocumentHealthBadge data={taxData?.health} />
                            </div>
                        </div>

                        {/* Fila 2: Composición de Operaciones (NUEVO) */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-slate-900/40 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-slate-800/50">
                                <h2 className="text-xl font-bold mb-8 text-slate-200">Desglose de Ventas por Tipo</h2>
                                <div className="h-72 w-full">
                                    <TypesBreakdownChart data={typesData?.ventas || []} type="ventas" />
                                </div>
                            </div>
                            <div className="bg-slate-900/40 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-slate-800/50">
                                <h2 className="text-xl font-bold mb-8 text-slate-200">Estructura de Gastos y Compras</h2>
                                <div className="h-72 w-full">
                                    <TypesBreakdownChart data={typesData?.gastos || []} type="gastos" />
                                </div>
                            </div>
                        </div>

                        {/* Fila 3: Top Entidades */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-1">
                                <TopEntitiesChart title="Top 5 Clientes" data={taxData?.topEntities?.top_clients || []} color="#10b981" />
                            </div>
                            <div className="lg:col-span-2">
                                <TopEntitiesChart title="Top 5 Proveedores" data={taxData?.topEntities?.top_suppliers || []} color="#06b6d4" />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
