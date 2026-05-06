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

// ── Icons (SVG Inline - Zero Dependencies - Premium Set) ──────────────────────
const Icons = {
    Business: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
    ),
    Fiscal: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><circle cx="12" cy="12" r="3"/></svg>
    ),
    Search: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
    ),
    Bell: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
    ),
    Download: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
    ),
    Logout: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
    ),
    ArrowRight: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
    ),
    Calendar: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
    ),
    Settings: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
    )
};

export default function DashboardPage() {
    const [viewMode, setViewMode] = useState<'business' | 'fiscal'>('business');
    const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'config' | 'ai'>('overview');
    const [taxSubTab, setTaxSubTab] = useState<'summary' | 'annexes'>('summary');
    
    // Data States
    const [segmentData, setSegmentData] = useState<SegmentData | null>(null);
    const [monthlyCustomers, setMonthlyCustomers] = useState<MonthlyCustomer[]>([]);
    const [trendsData, setTrendsData] = useState<TrendData[]>([]);
    const [typesData, setTypesData] = useState<{ ventas: BreakdownData[]; gastos: BreakdownData[] } | null>(null);
    const [taxData, setTaxData] = useState<TaxData | null>(null);
    const [authToken, setAuthToken] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                let headers: HeadersInit = {};
                const mockTenantId = typeof window !== 'undefined' ? localStorage.getItem("X-Mock-Tenant-ID") : null;
                
                if (mockTenantId) {
                    headers = { "X-Mock-Tenant-ID": mockTenantId };
                    setAuthToken(mockTenantId);
                } else {
                    const { data: sessionData } = await supabase.auth.getSession();
                    const token = sessionData?.session?.access_token;
                    if (!token) {
                        setError("No autenticado");
                        setLoading(false);
                        return;
                    }
                    headers = { "Authorization": `Bearer ${token}` };
                    setAuthToken(token);
                }

                const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
                
                const [rfm, customers, trends, types, iva, top, health] = await Promise.all([
                    fetch(`${API_URL}/analytics/rfm`, { headers }).then(r => r.json()),
                    fetch(`${API_URL}/analytics/monthly-customers`, { headers }).then(r => r.json()),
                    fetch(`${API_URL}/analytics/financial-trends`, { headers }).then(r => r.json()),
                    fetch(`${API_URL}/analytics/types-breakdown`, { headers }).then(r => r.json()),
                    fetch(`${API_URL}/analytics/tax-summary/iva-liquidation`, { headers }).then(r => r.json()),
                    fetch(`${API_URL}/analytics/tax-summary/top-entities`, { headers }).then(r => r.json()),
                    fetch(`${API_URL}/analytics/tax-summary/document-health`, { headers }).then(r => r.json())
                ]);

                setSegmentData(rfm);
                setMonthlyCustomers(customers.data);
                setTrendsData(trends.data);
                setTypesData(types.data);
                setTaxData({
                    liquidation: iva.data,
                    topEntities: top.data,
                    health: health.data
                });

            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-surface transition-colors duration-500">
            <div className="relative w-20 h-20 mb-6">
                <div className="absolute inset-0 border-4 border-primary/10 rounded-full" />
                <div className="absolute inset-0 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="text-center">
                <p className="text-primary font-black tracking-ultra-wide uppercase text-[10px] mb-2 animate-pulse">Iniciando Ecosistema de Datos</p>
                <p className="text-on-surface-variant text-[11px] font-bold opacity-50 uppercase tracking-widest">ContabilidadArturo v2.0</p>
            </div>
        </div>
    );

    return (
        <div className={`min-h-screen flex selection:bg-secondary/30 transition-all duration-700 ${viewMode === 'fiscal' ? 'bg-surface-container-low' : 'bg-background'}`}>
            
            {/* ── SIDEBAR (Modular & Contextual) ────────────────────────────────── */}
            <aside className={`fixed left-0 top-0 h-screen w-72 border-r border-outline-variant/40 bg-surface-container-lowest flex flex-col z-50 transition-all duration-500 ${viewMode === 'fiscal' ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                
                {/* Branding Section */}
                <div className="p-8 border-b border-outline-variant/20">
                    <div className="flex items-center gap-4 mb-6">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-all duration-500 ${viewMode === 'fiscal' ? 'bg-secondary text-on-secondary rotate-3' : 'bg-primary text-on-primary -rotate-3'}`}>
                            {viewMode === 'fiscal' ? <Icons.Fiscal /> : <Icons.Business />}
                        </div>
                        <div>
                            <h1 className="text-primary font-black text-sm uppercase tracking-tighter leading-tight">Arturo <br/><span className="text-secondary opacity-80">Corporativo</span></h1>
                        </div>
                    </div>
                    
                    {/* View Switcher Tabs (In Sidebar) */}
                    <div className="bg-surface-container rounded-xl p-1.5 flex gap-1 shadow-inner">
                        <button 
                            onClick={() => setViewMode('business')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'business' ? 'bg-white text-primary shadow-md' : 'text-outline hover:text-primary opacity-60 hover:opacity-100'}`}
                        >
                            <Icons.Business />
                            Negocio
                        </button>
                        <button 
                            onClick={() => setViewMode('fiscal')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'fiscal' ? 'bg-white text-secondary shadow-md' : 'text-outline hover:text-secondary opacity-60 hover:opacity-100'}`}
                        >
                            <Icons.Fiscal />
                            Fiscal
                        </button>
                    </div>
                </div>

                {/* Navigation Contextual */}
                <nav className="flex-1 p-6 space-y-8 overflow-y-auto custom-scrollbar">
                    
                    {/* Common Navigation */}
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-ultra-wide text-outline/50 px-3 block mb-4">Módulos Principales</span>
                        <div className="space-y-1.5">
                            {[
                                { id: 'overview', label: 'Resumen Global', icon: Icons.Calendar },
                                { id: 'analytics', label: 'Centro de Analítica', icon: Icons.Business },
                                { id: 'ai', label: 'Inteligencia IA', icon: Icons.Bell, color: 'text-warning' }
                            ].map((item) => (
                                <button 
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id as any)}
                                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group ${activeTab === item.id ? 'bg-primary text-on-primary shadow-lg shadow-primary/20 translate-x-2' : 'text-on-surface-variant hover:bg-surface-container'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`transition-transform duration-300 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                                            <item.icon />
                                        </div>
                                        <span className={`text-[11px] font-black uppercase tracking-widest ${item.color || ''}`}>{item.label}</span>
                                    </div>
                                    <Icons.ArrowRight />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Fiscal Specific Sections */}
                    {viewMode === 'fiscal' && (
                        <div className="animate-in fade-in slide-in-from-bottom duration-500 delay-200">
                            <span className="text-[10px] font-black uppercase tracking-ultra-wide text-secondary px-3 block mb-4">Gestión Hacienda</span>
                            <div className="space-y-1.5">
                                <button className="w-full flex items-center gap-3 p-3 rounded-xl text-on-surface-variant hover:bg-secondary-container/20 group transition-all">
                                    <div className="w-8 h-8 bg-surface-container rounded-lg flex items-center justify-center group-hover:bg-secondary group-hover:text-white transition-all shadow-sm">F07</div>
                                    <span className="text-[11px] font-bold uppercase tracking-widest group-hover:text-secondary">Declaración IVA</span>
                                </button>
                                <button className="w-full flex items-center gap-3 p-3 rounded-xl text-on-surface-variant hover:bg-secondary-container/20 group transition-all">
                                    <div className="w-8 h-8 bg-surface-container rounded-lg flex items-center justify-center group-hover:bg-secondary group-hover:text-white transition-all shadow-sm">F14</div>
                                    <span className="text-[11px] font-bold uppercase tracking-widest group-hover:text-secondary">Retenciones</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Business Specific Sections */}
                    {viewMode === 'business' && (
                        <div className="animate-in fade-in slide-in-from-bottom duration-500 delay-200">
                            <span className="text-[10px] font-black uppercase tracking-ultra-wide text-primary px-3 block mb-4">Estrategia Comercial</span>
                            <div className="space-y-1.5">
                                <button className="w-full flex items-center gap-3 p-3 rounded-xl text-on-surface-variant hover:bg-primary-container/20 group transition-all">
                                    <Icons.Business />
                                    <span className="text-[11px] font-bold uppercase tracking-widest group-hover:text-primary">CRM Segments</span>
                                </button>
                                <button className="w-full flex items-center gap-3 p-3 rounded-xl text-on-surface-variant hover:bg-primary-container/20 group transition-all">
                                    <Icons.Search />
                                    <span className="text-[11px] font-bold uppercase tracking-widest group-hover:text-primary">Auditoría Libre</span>
                                </button>
                            </div>
                        </div>
                    )}
                </nav>

                {/* Sidebar Footer */}
                <div className="p-6 border-t border-outline-variant/20">
                    <button className="w-full flex items-center justify-between p-4 bg-error-container/10 text-error rounded-2xl hover:bg-error-container/20 transition-all group">
                        <div className="flex items-center gap-3">
                            <Icons.Logout />
                            <span className="text-[10px] font-black uppercase tracking-widest">Cerrar Sesión</span>
                        </div>
                    </button>
                </div>
            </aside>

            {/* ── MAIN CONTENT AREA ───────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col transition-all duration-500 lg:ml-72">
                
                {/* Global Header */}
                <header className="sticky top-0 z-40 h-20 bg-white/80 backdrop-blur-xl border-b border-outline-variant/30 px-10 flex items-center justify-between">
                    <div className="flex items-center gap-6 flex-1">
                        <div className="relative group flex-1 max-w-md">
                            <div className="absolute inset-y-0 left-4 flex items-center text-outline group-focus-within:text-primary transition-colors">
                                <Icons.Search />
                            </div>
                            <input 
                                type="text" 
                                placeholder="Buscar facturas, clientes o reportes..." 
                                className="w-full bg-surface-container-low border-none rounded-2xl py-3 pl-12 pr-4 text-[12px] font-bold placeholder:opacity-50 focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="p-3 text-on-surface-variant hover:bg-surface-container rounded-2xl transition-all relative">
                            <Icons.Bell />
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-error rounded-full border-2 border-white" />
                        </button>
                        <button className="p-3 text-on-surface-variant hover:bg-surface-container rounded-2xl transition-all">
                            <Icons.Settings />
                        </button>
                        <div className="h-10 w-px bg-outline-variant/30 mx-2" />
                        <div className="flex items-center gap-4 pl-2">
                            <div className="text-right hidden sm:block">
                                <p className="text-[11px] font-black uppercase tracking-widest text-primary leading-none">Arturo Admin</p>
                                <p className="text-[9px] font-bold text-on-surface-variant opacity-60 uppercase tracking-widest mt-1">Socio Principal</p>
                            </div>
                            <div className="w-11 h-11 rounded-2xl bg-linear-to-tr from-primary to-primary-container p-0.5 shadow-lg group cursor-pointer active:scale-95 transition-all">
                                <div className="w-full h-full rounded-[14px] bg-white flex items-center justify-center overflow-hidden">
                                    <span className="text-[12px] font-black text-primary">AA</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Dashboard Scrollable Body */}
                <main className="p-10 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
                    
                    {/* View Header */}
                    <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <div className={`w-2 h-6 rounded-full ${viewMode === 'fiscal' ? 'bg-secondary' : 'bg-primary'}`} />
                                <span className={`font-black text-[11px] uppercase tracking-ultra-wide ${viewMode === 'fiscal' ? 'text-secondary' : 'text-primary'}`}>
                                    {viewMode === 'fiscal' ? 'Audit Mode: Compliance & Tax' : 'Executive Mode: Strategy & KPIs'}
                                </span>
                            </div>
                            <h2 className="text-4xl font-black text-primary tracking-tightest leading-tight">
                                {viewMode === 'fiscal' ? 'Consolidación de IVA y Anexos' : 'Inteligencia de Negocio en Tiempo Real'}
                            </h2>
                            <p className="text-on-surface-variant font-bold text-sm opacity-60 max-w-2xl uppercase tracking-wider">
                                {viewMode === 'fiscal' 
                                    ? 'Validación técnica de integridad tributaria basada en las especificaciones del Ministerio de Hacienda.' 
                                    : 'Análisis predictivo de flujo de caja, rentabilidad por segmento y salud financiera del ecosistema comercial.'}
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex flex-col items-end">
                                <span className="text-[9px] font-black uppercase tracking-widest text-outline mb-2">Periodo Actual</span>
                                <button className="bg-white border border-outline-variant px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center gap-3 hover:bg-surface transition-all shadow-sm group">
                                    <Icons.Calendar />
                                    Mayo 2026
                                    <div className="rotate-90 opacity-40 group-hover:translate-x-1 transition-transform"><Icons.ArrowRight /></div>
                                </button>
                            </div>
                            <button className="bg-primary text-on-primary px-8 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center gap-3 hover:scale-[1.02] shadow-xl shadow-primary/20 transition-all self-end">
                                <Icons.Download />
                                Reporte Pro
                            </button>
                        </div>
                    </div>

                    {/* View Specific Dashboard Content */}
                    <div className="transition-all duration-500">
                        {viewMode === 'business' ? (
                            /* ── BUSINESS VIEW CONTENT ───────────────────────────── */
                            <div className="space-y-10 animate-in fade-in duration-500">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                    <div className="lg:col-span-8 bg-white border border-outline-variant/40 rounded-[2.5rem] p-10 shadow-xl shadow-surface-container/50 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-primary/10 transition-colors duration-700" />
                                        <div className="relative z-10">
                                            <div className="flex justify-between items-center mb-12">
                                                <h3 className="text-sm font-black text-primary uppercase tracking-[0.2em] flex items-center gap-3">
                                                    <div className="w-1 h-4 bg-primary rounded-full" />
                                                    Tendencias de Liquidez
                                                </h3>
                                                <div className="flex gap-3">
                                                    <span className="flex items-center gap-1.5 text-[9px] font-black uppercase text-secondary">
                                                        <div className="w-2 h-2 rounded-full bg-secondary" /> Ingresos
                                                    </span>
                                                    <span className="flex items-center gap-1.5 text-[9px] font-black uppercase text-primary opacity-40">
                                                        <div className="w-2 h-2 rounded-full bg-primary/40" /> Egresos
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="h-105 w-full">
                                                <FinancialTrendsChart data={trendsData} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="lg:col-span-4 flex flex-col gap-10">
                                        <div className="bg-white border border-outline-variant/40 rounded-[2.5rem] p-8 shadow-xl shadow-surface-container/50 flex flex-col flex-1">
                                            <h3 className="text-sm font-black text-primary uppercase tracking-[0.2em] mb-10">Rendimiento Operativo</h3>
                                            <div className="grow flex items-center justify-center">
                                                <ProfitabilityChart data={trendsData} />
                                            </div>
                                            <div className="mt-8 pt-8 border-t border-outline-variant/20">
                                                <div className="flex justify-between items-center">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-outline">Margen Neto Prom.</p>
                                                    <p className="text-xl font-black text-secondary">+12.4%</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-10">
                                    <div className="bg-white border border-outline-variant/40 rounded-[2.5rem] p-10 shadow-xl shadow-surface-container/50">
                                        <MonthlyCustomerChart data={monthlyCustomers} periodo="Mayo 2026" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
                                    <div className="lg:col-span-1">
                                        <SegmentInsightPanel />
                                    </div>
                                    <div className="lg:col-span-3 bg-white border border-outline-variant/40 rounded-[2.5rem] p-10 shadow-xl shadow-surface-container/50">
                                        <h3 className="text-sm font-black text-primary uppercase tracking-[0.2em] mb-12">Análisis RFM: Segmentación de Cartera</h3>
                                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
                                            <div className="xl:col-span-1 h-72">
                                                <CustomerSegmentChart data={segmentData?.summary || []} />
                                            </div>
                                            <div className="xl:col-span-2 overflow-hidden">
                                                <CustomerSegmentTable data={segmentData?.data || []} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* ── FISCAL VIEW CONTENT ─────────────────────────────── */
                            <div className="space-y-10 animate-in fade-in duration-500">
                                {/* Stats Highlights */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    {[
                                        { label: 'Débito Fiscal (IVA)', val: taxData?.liquidation?.debito_fiscal, color: 'text-primary', bg: 'bg-white' },
                                        { label: 'Crédito Fiscal (IVA)', val: taxData?.liquidation?.credito_fiscal, color: 'text-secondary', bg: 'bg-white' },
                                        { label: 'Saldo de Liquidación', val: taxData?.liquidation?.neto, color: 'text-primary', bg: 'bg-secondary-container/20', isHighlight: true }
                                    ].map((stat, i) => (
                                        <div key={i} className={`${stat.bg} border border-outline-variant/40 rounded-3xl p-8 flex items-center justify-between shadow-lg shadow-surface-container/30 group hover:-translate-y-1 transition-all duration-300`}>
                                            <div>
                                                <p className="text-[10px] font-black text-outline uppercase tracking-[0.2em] mb-2">{stat.label}</p>
                                                <p className={`text-3xl font-black tabular-nums ${stat.color}`}>${stat.val?.toLocaleString()}</p>
                                            </div>
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${stat.isHighlight ? 'bg-secondary text-white shadow-lg' : 'bg-surface-container text-outline opacity-40 group-hover:opacity-100 group-hover:bg-secondary group-hover:text-white'}`}>
                                                <Icons.Fiscal />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Fiscal Tab Navigation */}
                                <div className="flex gap-3 bg-surface-container p-2 rounded-2xl border border-outline-variant/30 w-fit">
                                    <button 
                                        onClick={() => setTaxSubTab('summary')}
                                        className={`px-10 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-ultra-wide transition-all duration-300 ${taxSubTab === 'summary' ? 'bg-white text-primary shadow-xl scale-[1.02]' : 'text-outline hover:text-primary'}`}
                                    >
                                        Consolidado Fiscal
                                    </button>
                                    <button 
                                        onClick={() => setTaxSubTab('annexes')}
                                        className={`px-10 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-ultra-wide transition-all duration-300 ${taxSubTab === 'annexes' ? 'bg-white text-secondary shadow-xl scale-[1.02]' : 'text-outline hover:text-secondary'}`}
                                    >
                                        Anexos de Hacienda
                                    </button>
                                </div>

                                {taxSubTab === 'summary' ? (
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                        <div className="lg:col-span-8 flex flex-col gap-10">
                                            <div className="bg-white border border-outline-variant/40 rounded-[2.5rem] shadow-xl shadow-surface-container/50 overflow-hidden">
                                                <TaxLiquidationCard data={taxData?.liquidation} />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                                <div className="bg-white border border-outline-variant/40 rounded-[2.5rem] p-10 shadow-xl shadow-surface-container/50">
                                                    <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                                                        <div className="w-1.5 h-4 bg-secondary rounded-full" />
                                                        Matriz de Ventas
                                                    </h4>
                                                    <div className="h-72">
                                                        <TypesBreakdownChart data={typesData?.ventas || []} type="ventas" />
                                                    </div>
                                                </div>
                                                <div className="bg-white border border-outline-variant/40 rounded-[2.5rem] p-10 shadow-xl shadow-surface-container/50">
                                                    <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                                                        <div className="w-1.5 h-4 bg-primary rounded-full" />
                                                        Matriz de Compras
                                                    </h4>
                                                    <div className="h-72">
                                                        <TypesBreakdownChart data={typesData?.gastos || []} type="gastos" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="lg:col-span-4 flex flex-col gap-10">
                                            <DocumentHealthBadge data={taxData?.health} />
                                            <div className="bg-white border border-outline-variant/40 rounded-[2.5rem] p-10 shadow-xl shadow-surface-container/50">
                                                <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.2em] mb-8">Participación de Entidades</h4>
                                                <TopEntitiesChart title="Concentración Clientes" data={taxData?.topEntities?.top_clients || []} color="#006b5f" />
                                                <div className="h-px bg-outline-variant/20 my-8" />
                                                <TopEntitiesChart title="Concentración Proveedores" data={taxData?.topEntities?.top_suppliers || []} color="#031636" />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white border border-outline-variant/40 rounded-[2.5rem] p-10 shadow-2xl shadow-surface-container/50 overflow-hidden">
                                        <LegalAnnexesTab />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* AI Alerts Overlay (Modal for Intelligence Mode) */}
                    {activeTab === 'ai' && (
                        <div className="fixed inset-0 z-100 bg-primary/40 backdrop-blur-md flex justify-end animate-in fade-in duration-500">
                            <div className="w-full max-w-2xl bg-white h-full shadow-2xl p-12 overflow-y-auto animate-in slide-in-from-right duration-500 flex flex-col">
                                <div className="flex justify-between items-center mb-12">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-warning-container text-on-warning-container rounded-2xl flex items-center justify-center shadow-lg">
                                            <Icons.Fiscal />
                                        </div>
                                        <div>
                                            <h2 className="text-3xl font-black text-primary tracking-tighter">Motor AI Anomaly</h2>
                                            <p className="text-[10px] font-black text-warning uppercase tracking-widest">Detección de Riesgos en Tiempo Real</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setActiveTab('overview')} 
                                        className="p-3 hover:bg-surface-container rounded-2xl transition-all hover:rotate-90"
                                    >
                                        <Icons.Logout />
                                    </button>
                                </div>
                                <div className="flex-1">
                                    <AnomalyAlertPanel token={authToken} />
                                </div>
                                <div className="mt-12 p-6 bg-surface-container rounded-3xl border border-outline-variant/30 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-black text-xs">ML</div>
                                        <div>
                                            <p className="text-[11px] font-black text-primary uppercase tracking-widest">Isolation Forest Engine</p>
                                            <p className="text-[10px] font-bold text-on-surface-variant opacity-60">Status: Active & Learning</p>
                                        </div>
                                    </div>
                                    <button className="px-6 py-2.5 bg-white border border-outline-variant rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all">Re-entrenar</button>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* Premium Decorative elements */}
            <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
                <div className={`absolute top-0 right-0 w-200 h-200 rounded-full blur-[160px] transition-all duration-1000 ${viewMode === 'fiscal' ? 'bg-secondary/5 -mr-40 -mt-40' : 'bg-primary/5 -mr-40 -mt-40'}`} />
                <div className={`absolute bottom-0 left-0 w-150 h-150 rounded-full blur-[140px] transition-all duration-1000 ${viewMode === 'fiscal' ? 'bg-primary/5 -ml-20 -mb-20' : 'bg-secondary/5 -ml-20 -mb-20'}`} />
            </div>
        </div>
    );
}
