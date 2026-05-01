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
import LegalAnnexesTab from "../../components/analytics/LegalAnnexesTab";
import { AnomalyAlertPanel } from "../../components/ai/AnomalyAlertPanel";
import { BarChart3, Receipt, Users2, LayoutDashboard, Table, ShieldAlert } from "lucide-react";

export default function DashboardPage() {
    const [activeTab, setActiveTab] = useState<'segments' | 'tax' | 'ai'>('segments');
    const [authToken, setAuthToken] = useState<string>("");
    const [taxSubTab, setTaxSubTab] = useState<'summary' | 'annexes'>('summary');
    const [segmentData, setSegmentData] = useState<{ summary: any[]; data: any[] } | null>(null);
                {/* Contenido del Tab */}
                {activeTab === 'segments' ? (
                    [...segments content...]
                ) : (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {/* Sub-Tabs para Gestión Tributaria */}
                        <div className="flex gap-4 border-b border-slate-800/50 pb-4">
                            <button 
                                onClick={() => setTaxSubTab('summary')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${taxSubTab === 'summary' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-400/5' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <LayoutDashboard size={16} />
                                Resumen Ejecutivo
                            </button>
                            <button 
                                onClick={() => setTaxSubTab('annexes')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${taxSubTab === 'annexes' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-400/5' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <Table size={16} />
                                Anexos Detallados (F07)
                            </button>
                        </div>

                        {taxSubTab === 'summary' ? (
                            <>
                                {/* Fila 1: Liquidación y Salud */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="lg:col-span-2">
                                        <TaxLiquidationCard data={taxData?.liquidation} />
                                    </div>
                                    <div className="lg:col-span-1">
                                        <DocumentHealthBadge data={taxData?.health} />
                                    </div>
                                </div>

                                {/* Fila 2: Composición de Operaciones */}
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
                            </>
                        ) : (
                            <LegalAnnexesTab />
                        )}
                    </div>
                )}

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                let headers: HeadersInit = {};
                const mockTenantId = localStorage.getItem("X-Mock-Tenant-ID");
                
                if (mockTenantId) {
                    headers = { "X-Mock-Tenant-ID": mockTenantId };
                    setAuthToken(mockTenantId); // used by AnomalyAlertPanel (mock path)
                } else {
                    const { data: sessionData } = await supabase.auth.getSession();
                    const token = sessionData?.session?.access_token;
                    
                    if (!token) {
                        setError("No estás autenticado. Por favor inicia sesión.");
                        setLoading(false);
                        return;
                    }
                    headers = { "Authorization": `Bearer ${token}` };
                    setAuthToken(token);
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
        <div className="min-h-screen bg-surface text-on-surface p-4 md:p-8 font-sans selection:bg-secondary/30">
            <div className="max-w-7xl mx-auto space-y-8">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
                    <div>
                        <h1 className="text-4xl font-black text-primary tracking-tighter">
                            Fiscal Integrity <span className="text-secondary">Dashboard</span>
                        </h1>
                        <p className="text-on-surface-variant mt-2 font-medium tracking-wide">Inteligencia de Cumplimiento y Gestión Financiera</p>
                    </div>
                    <div className="text-[10px] font-bold text-on-surface-variant bg-surface-dim px-4 py-2 rounded-md border border-outline-variant tracking-[0.2em] uppercase">
                        Estado: Operativo • Hoy
                    </div>
                </header>

                {/* Tabs Modernas */}
                <div className="flex space-x-1 bg-surface-container p-1 rounded-lg border border-outline-variant w-fit">
                    <button 
                        onClick={() => setActiveTab('segments')}
                        className={`flex items-center gap-2 px-8 py-3 rounded-md font-bold transition-all text-[11px] uppercase tracking-widest ${activeTab === 'segments' ? 'bg-primary text-white shadow-md' : 'text-on-surface-variant hover:text-primary hover:bg-surface-dim'}`}
                    >
                        <Users2 size={16} />
                        Análisis de Clientes
                    </button>
                    <button 
                        onClick={() => setActiveTab('tax')}
                        className={`flex items-center gap-2 px-8 py-3 rounded-md font-bold transition-all text-[11px] uppercase tracking-widest ${activeTab === 'tax' ? 'bg-primary text-white shadow-md' : 'text-on-surface-variant hover:text-primary hover:bg-surface-dim'}`}
                    >
                        <Receipt size={16} />
                        Gestión Tributaria
                    </button>
                    <button 
                        onClick={() => setActiveTab('ai')}
                        className={`flex items-center gap-2 px-8 py-3 rounded-md font-bold transition-all text-[11px] uppercase tracking-widest ${
                            activeTab === 'ai'
                                ? 'bg-amber-600 text-white shadow-md'
                                : 'text-on-surface-variant hover:text-amber-700 hover:bg-amber-50'
                        }`}
                    >
                        <ShieldAlert size={16} />
                        Alertas IA
                    </button>
                </div>

                {/* Contenido del Tab */}
                {activeTab === 'segments' ? (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {/* Fila 1: Tendencias y Rentabilidad */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 bg-white rounded-lg p-8 border border-outline-variant shadow-sm">
                                <h2 className="text-sm font-bold mb-8 text-primary uppercase tracking-widest flex items-center gap-3">
                                    <BarChart3 className="text-secondary" size={18} />
                                    Salud Financiera (Mensual)
                                </h2>
                                <div className="h-80 w-full">
                                    <FinancialTrendsChart data={trendsData} />
                                </div>
                            </div>
                            <div className="lg:col-span-1 bg-white rounded-lg p-8 border border-outline-variant shadow-sm">
                                <h2 className="text-sm font-bold mb-8 text-primary uppercase tracking-widest">Rentabilidad</h2>
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
                            <div className="lg:col-span-1 bg-white rounded-lg p-8 border border-outline-variant shadow-sm transition-all hover:border-secondary/50">
                                <h2 className="text-sm font-bold mb-8 text-primary uppercase tracking-widest">Composición de Cartera</h2>
                                <div className="h-72 w-full">
                                    <CustomerSegmentChart data={segmentData?.summary || []} />
                                </div>
                            </div>
                            <div className="lg:col-span-2 bg-white rounded-lg p-8 border border-outline-variant shadow-sm overflow-hidden">
                                <h2 className="text-sm font-bold mb-8 text-primary uppercase tracking-widest">Base de Clientes Clasificada</h2>
                                <CustomerSegmentTable data={segmentData?.data || []} />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {/* Sub-Tabs para Gestión Tributaria */}
                        <div className="flex gap-2 bg-surface-container-low p-1 rounded-lg border border-outline-variant w-fit">
                            <button 
                                onClick={() => setTaxSubTab('summary')}
                                className={`flex items-center gap-2 px-6 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${taxSubTab === 'summary' ? 'bg-white text-primary shadow-sm border border-outline-variant' : 'text-on-surface-variant hover:text-primary hover:bg-surface-dim'}`}
                            >
                                <LayoutDashboard size={14} />
                                Resumen Ejecutivo
                            </button>
                            <button 
                                onClick={() => setTaxSubTab('annexes')}
                                className={`flex items-center gap-2 px-6 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${taxSubTab === 'annexes' ? 'bg-white text-primary shadow-sm border border-outline-variant' : 'text-on-surface-variant hover:text-primary hover:bg-surface-dim'}`}
                            >
                                <Table size={14} />
                                Anexos Detallados
                            </button>
                        </div>

                        {taxSubTab === 'summary' ? (
                            <>
                                {/* Fila 1: Liquidación y Salud */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="lg:col-span-2">
                                        <TaxLiquidationCard data={taxData?.liquidation} />
                                    </div>
                                    <div className="lg:col-span-1">
                                        <DocumentHealthBadge data={taxData?.health} />
                                    </div>
                                </div>

                                {/* Fila 2: Composición de Operaciones */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="bg-white rounded-lg p-8 border border-outline-variant shadow-sm transition-all hover:border-secondary/30">
                                        <h2 className="text-xs font-bold mb-8 text-primary uppercase tracking-[0.15em] flex items-center gap-3">
                                            <BarChart3 className="text-secondary" size={16} />
                                            Desglose de Ventas por Tipo
                                        </h2>
                                        <div className="h-72 w-full">
                                            <TypesBreakdownChart data={typesData?.ventas || []} type="ventas" />
                                        </div>
                                    </div>
                                    <div className="bg-white rounded-lg p-8 border border-outline-variant shadow-sm transition-all hover:border-secondary/30">
                                        <h2 className="text-xs font-bold mb-8 text-primary uppercase tracking-[0.15em] flex items-center gap-3">
                                            <BarChart3 className="text-secondary" size={16} />
                                            Estructura de Gastos y Compras
                                        </h2>
                                        <div className="h-72 w-full">
                                            <TypesBreakdownChart data={typesData?.gastos || []} type="gastos" />
                                        </div>
                                    </div>
                                </div>

                                {/* Fila 3: Top Entidades */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="lg:col-span-1">
                                        <TopEntitiesChart title="Top 5 Clientes" data={taxData?.topEntities?.top_clients || []} color="var(--color-secondary)" />
                                    </div>
                                    <div className="lg:col-span-2">
                                        <TopEntitiesChart title="Top 5 Proveedores" data={taxData?.topEntities?.top_suppliers || []} color="var(--color-primary)" />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <LegalAnnexesTab />
                        )}
                    </div>
                ) : activeTab === 'ai' ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="bg-white rounded-lg p-6 border border-[#dce9ff] shadow-sm">
                            <AnomalyAlertPanel token={authToken} />
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
