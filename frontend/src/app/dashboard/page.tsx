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
import { 
    TrendData, 
    MonthlyCustomer, 
    BreakdownData, 
    SegmentData, 
    TaxData 
} from "@/types/analytics";
// ── Inline SVG Icons (zero external deps) ──────────────────────────────────────
const Users2 = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M14 19a6 6 0 0 0-12 0"/><circle cx="8" cy="9" r="4"/><path d="M22 19a6 6 0 0 0-6-6 4 4 0 1 0 0-8"/></svg>
);
const Receipt = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/></svg>
);
const ShieldAlert = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
);
const BarChart3 = ({ size = 18, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M7 16h.01"/><path d="M7 11v5"/><path d="M11 8v8"/><path d="M15 12v4"/><path d="M19 5v11"/></svg>
);
const LayoutDashboard = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
);
const TableIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>
);



export default function DashboardPage() {
    const [activeTab, setActiveTab] = useState<'segments' | 'tax' | 'ai'>('segments');
    const [authToken, setAuthToken] = useState<string>("");
    const [taxSubTab, setTaxSubTab] = useState<'summary' | 'annexes'>('summary');
    const [trendsView, setTrendsView] = useState<'monthly' | 'yoy'>('monthly');
    
    const [segmentData, setSegmentData] = useState<SegmentData | null>(null);
    const [monthlyCustomers, setMonthlyCustomers] = useState<MonthlyCustomer[]>([]);
    const [trendsData, setTrendsData] = useState<TrendData[]>([]);
    const [typesData, setTypesData] = useState<{ ventas: BreakdownData[]; gastos: BreakdownData[] } | null>(null);
    const [taxData, setTaxData] = useState<TaxData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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

            } catch (err: unknown) {
                if (err instanceof Error) {
                    setError(err.message);
                } else {
                    setError("Ocurrió un error inesperado");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-surface text-on-surface">
                <div className="w-12 h-12 border-4 border-secondary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-primary font-bold tracking-widest uppercase text-xs">Cargando Inteligencia Comercial...</p>
            </div>
        );
    }
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-surface text-error font-sans">
                <div className="bg-error-container p-8 rounded-xl border border-error/20 backdrop-blur-md max-w-md text-center shadow-lg">
                    <h3 className="text-xl font-bold mb-4 text-on-error-container">Error de Conexión</h3>
                    <p className="text-on-error-container opacity-80 leading-relaxed text-sm">{error}</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="mt-6 px-8 py-2.5 bg-error text-on-error rounded-md text-xs font-black tracking-widest uppercase hover:opacity-90 transition-all shadow-md"
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
                        className={`flex items-center gap-2 px-8 py-3 rounded-md font-bold transition-all text-[11px] uppercase tracking-widest ${activeTab === 'segments' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-primary hover:bg-surface-dim'}`}
                    >
                        <Users2 size={16} />
                        Análisis de Clientes
                    </button>
                    <button 
                        onClick={() => setActiveTab('tax')}
                        className={`flex items-center gap-2 px-8 py-3 rounded-md font-bold transition-all text-[11px] uppercase tracking-widest ${activeTab === 'tax' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-primary hover:bg-surface-dim'}`}
                    >
                        <Receipt size={16} />
                        Gestión Tributaria
                    </button>
                    <button 
                        onClick={() => setActiveTab('ai')}
                        className={`flex items-center gap-2 px-8 py-3 rounded-md font-bold transition-all text-[11px] uppercase tracking-widest ${
                            activeTab === 'ai'
                                ? 'bg-warning text-on-warning shadow-md'
                                : 'text-on-surface-variant hover:text-warning hover:bg-warning-container/20'
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
                            <div className="lg:col-span-2 bg-surface-container-lowest rounded-lg p-8 border border-outline-variant shadow-sm">
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-3">
                                        <BarChart3 className="text-secondary" size={18} />
                                        {trendsView === 'monthly' ? 'Salud Financiera (Mensual)' : 'Comparativa Interanual (YoY)'}
                                    </h2>
                                    <div className="flex bg-surface-container p-1 rounded-md border border-outline-variant">
                                        <button 
                                            onClick={() => setTrendsView('monthly')}
                                            className={`px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest transition-all ${trendsView === 'monthly' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-primary'}`}
                                        >
                                            Mensual
                                        </button>
                                        <button 
                                            onClick={() => setTrendsView('yoy')}
                                            className={`px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest transition-all ${trendsView === 'yoy' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-primary'}`}
                                        >
                                            YoY
                                        </button>
                                    </div>
                                </div>
                                <div className="h-80 w-full">
                                    {trendsView === 'monthly' ? (
                                        <FinancialTrendsChart data={trendsData} />
                                    ) : (
                                        <YoYComparativeChart data={trendsData.map(d => ({
                                            mes: d.mes,
                                            ventas_actual: d.ventas_actual,
                                            ventas_anterior: d.ventas_anterior || 0
                                        }))} />
                                    )}
                                </div>
                            </div>
                            <div className="lg:col-span-1 bg-surface-container-lowest rounded-lg p-8 border border-outline-variant shadow-sm">
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
                            <div className="lg:col-span-1 bg-surface-container-lowest rounded-lg p-8 border border-outline-variant shadow-sm transition-all hover:border-secondary/50">
                                <h2 className="text-sm font-bold mb-8 text-primary uppercase tracking-widest">Composición de Cartera</h2>
                                <div className="h-72 w-full">
                                    <CustomerSegmentChart data={segmentData?.summary || []} />
                                </div>
                            </div>
                            <div className="lg:col-span-2 bg-surface-container-lowest rounded-lg p-8 border border-outline-variant shadow-sm overflow-hidden">
                                <h2 className="text-sm font-bold mb-8 text-primary uppercase tracking-widest">Base de Clientes Clasificada</h2>
                                <CustomerSegmentTable data={segmentData?.data || []} />
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'tax' ? (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {/* Sub-Tabs para Gestión Tributaria */}
                        <div className="flex gap-2 bg-surface-container-low p-1 rounded-lg border border-outline-variant w-fit">
                            <button 
                                onClick={() => setTaxSubTab('summary')}
                                className={`flex items-center gap-2 px-6 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${taxSubTab === 'summary' ? 'bg-surface-container-lowest text-primary shadow-sm border border-outline-variant' : 'text-on-surface-variant hover:text-primary hover:bg-surface-dim'}`}
                            >
                                <LayoutDashboard size={14} />
                                Resumen Ejecutivo
                            </button>
                            <button 
                                onClick={() => setTaxSubTab('annexes')}
                                className={`flex items-center gap-2 px-6 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${taxSubTab === 'annexes' ? 'bg-surface-container-lowest text-primary shadow-sm border border-outline-variant' : 'text-on-surface-variant hover:text-primary hover:bg-surface-dim'}`}
                            >
                                <TableIcon size={14} />
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
                                    <div className="bg-surface-container-lowest rounded-lg p-8 border border-outline-variant shadow-sm transition-all hover:border-secondary/30">
                                        <h2 className="text-xs font-bold mb-8 text-primary uppercase tracking-[0.15em] flex items-center gap-3">
                                            <BarChart3 className="text-secondary" size={16} />
                                            Desglose de Ventas por Tipo
                                        </h2>
                                        <div className="h-72 w-full">
                                            <TypesBreakdownChart data={typesData?.ventas || []} type="ventas" />
                                        </div>
                                    </div>
                                    <div className="bg-surface-container-lowest rounded-lg p-8 border border-outline-variant shadow-sm transition-all hover:border-secondary/30">
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
                        <div className="bg-surface-container-lowest rounded-lg p-6 border border-outline-variant shadow-sm">
                            <AnomalyAlertPanel token={authToken} />
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
