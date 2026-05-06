"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";
import TaxLiquidationCard from "../../components/analytics/TaxLiquidationCard";

import DocumentHealthBadge from "../../components/analytics/DocumentHealthBadge";
import FinancialTrendsChart from "../../components/analytics/FinancialTrendsChart";
import ProfitabilityChart from "../../components/analytics/ProfitabilityChart";
import TypesBreakdownChart from "../../components/analytics/TypesBreakdownChart";
import LegalAnnexesTab from "../../components/analytics/LegalAnnexesTab";
import { AnomalyAlertPanel } from "../../components/ai/AnomalyAlertPanel";
import { 
    TrendData, 
    BreakdownData, 
    TaxData 
} from "@/types/analytics";

// ── Icons (SVG Inline - Zero Dependencies - Premium Executive Set) ──────────────────────
const Icons = {
    Dashboard: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
    ),
    Sales: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>
    ),
    Expenses: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>
    ),
    Tax: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>
    ),
    AI: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M3 5h4"/><path d="M21 17v4"/><path d="M19 19h4"/></svg>
    ),
    Settings: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
    ),
    Search: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
    ),
    Bell: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
    ),
    Logout: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
    ),
    User: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    ),
    Calendar: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
    ),
    ChevronRight: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
    ),
    Plus: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    )
};

export default function DashboardPage() {
    const [persona, setPersona] = useState<'business' | 'fiscal'>('business');
    const [activeTab, setActiveTab] = useState('overview');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    
    // Data States
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
                
                const [trends, types, iva, top, health] = await Promise.all([
                    fetch(`${API_URL}/analytics/financial-trends`, { headers }).then(r => r.json()),
                    fetch(`${API_URL}/analytics/types-breakdown`, { headers }).then(r => r.json()),
                    fetch(`${API_URL}/analytics/tax-summary/iva-liquidation`, { headers }).then(r => r.json()),
                    fetch(`${API_URL}/analytics/tax-summary/top-entities`, { headers }).then(r => r.json()),
                    fetch(`${API_URL}/analytics/tax-summary/document-health`, { headers }).then(r => r.json())
                ]);


                setTrendsData(trends.data || []);
                setTypesData(types.data || { ventas: [], gastos: [] });
                setTaxData({
                    liquidation: iva.data,
                    topEntities: top.data,
                    health: health.data
                });

            } catch (err: unknown) {
                console.error("Fetch Error:", err);
                setError(err instanceof Error ? err.message : String(err));
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 transition-colors duration-500">
            <div className="relative w-24 h-24 mb-8">
                <div className="absolute inset-0 border-4 border-emerald-500/10 rounded-full" />
                <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <div className="absolute inset-4 border-2 border-blue-500 border-b-transparent rounded-full animate-spin [animation-duration:1.5s]" />
            </div>
            <div className="text-center">
                <p className="text-white font-black tracking-[0.5em] uppercase text-xs mb-3 animate-pulse">Sincronizando Ecosistema</p>
                <p className="text-emerald-500/50 text-[10px] font-bold uppercase tracking-widest">ContabilidadArturo Premium v3.0</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950">
            <div className="text-center p-8 bg-red-500/10 rounded-2xl border border-red-500/20 max-w-md">
                <p className="text-red-500 font-bold mb-2">Error de Sincronización</p>
                <p className="text-red-400/80 text-sm">{error}</p>
            </div>
        </div>
    );

    const businessSidebar = [
        { group: "ESTRATEGIA", items: [
            { id: 'overview', label: 'Resumen Ejecutivo', icon: Icons.Dashboard },
            { id: 'expenses', label: 'Gastos y Operaciones', icon: Icons.Expenses },
        ]},
        { group: "INTELIGENCIA AI", items: [
            { id: 'ai-business', label: 'Predicción de Demanda', icon: Icons.AI },
        ]},
        { group: "SISTEMA", items: [
            { id: 'config', label: 'Configuración', icon: Icons.Settings },
        ]},
    ];

    const fiscalSidebar = [
        { group: "TRIBUTACIÓN", items: [
            { id: 'fiscal-summary', label: 'Liquidación de IVA', icon: Icons.Tax },
            { id: 'annexes', label: 'Anexos de Hacienda', icon: Icons.Tax },
        ]},
        { group: "CUMPLIMIENTO", items: [
            { id: 'document-health', label: 'Salud Documental', icon: Icons.Tax },
            { id: 'ai-fiscal', label: 'Auditoría AI', icon: Icons.AI },
        ]},
        { group: "SISTEMA", items: [
            { id: 'config', label: 'Configuración', icon: Icons.Settings },
        ]},
    ];

    const sidebarItems = persona === 'business' ? businessSidebar : fiscalSidebar;


    return (
        <div className="min-h-screen bg-[#f8fafc] flex selection:bg-emerald-500/30">
            {/* ── PERSISTENT SIDEBAR ────────────────────────────────────────────── */}
            <aside className={`bg-zinc-950 text-white transition-all duration-500 ease-in-out flex flex-col z-50 ${sidebarOpen ? 'w-72' : 'w-20'}`}>
                {/* Logo Area */}
                <div className="p-6 h-20 flex items-center gap-4 overflow-hidden border-b border-white/5">
                    <div className={`min-w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg transition-all duration-700 ${persona === 'business' ? 'bg-linear-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/20' : 'bg-linear-to-br from-blue-500 to-blue-700 shadow-blue-500/20'}`}>A</div>
                    {sidebarOpen && (
                        <div className="flex flex-col leading-none">
                            <span className="text-lg font-black tracking-tight text-white uppercase">Arturo</span>
                            <span className="text-[10px] font-bold tracking-[0.3em] text-emerald-500 uppercase opacity-80">Integrum</span>
                        </div>
                    )}
                </div>

                {/* Nav Items */}
                <div className="flex-1 py-8 px-4 space-y-8 overflow-y-auto">
                    {sidebarItems.map((section, idx) => (
                        <div key={idx} className="space-y-2">
                            {sidebarOpen && <p className="px-4 text-[10px] font-black text-zinc-500 tracking-[0.2em] uppercase mb-4">{section.group}</p>}
                            {section.items.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 group relative ${activeTab === item.id ? (persona === 'business' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-blue-600 text-white shadow-lg shadow-blue-600/20') : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                                >
                                    <div className={`transition-transform duration-300 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                                        <item.icon />
                                    </div>
                                    {sidebarOpen && <span className="text-sm font-bold tracking-tight">{item.label}</span>}
                                    {activeTab === item.id && !sidebarOpen && (
                                        <div className="absolute left-full ml-4 px-3 py-1 bg-zinc-900 text-white text-xs font-bold rounded-md whitespace-nowrap shadow-xl">
                                            {item.label}
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    ))}
                </div>

                {/* Bottom Profile/Settings */}
                <div className="p-4 border-t border-white/5 space-y-2">
                    <button 
                        onClick={() => setActiveTab('config')}
                        className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${activeTab === 'config' ? (persona === 'business' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500') : 'text-zinc-400 hover:bg-white/5'}`}
                    >
                        <Icons.Settings />
                        {sidebarOpen && <span className="text-sm font-bold">Configuración</span>}
                    </button>
                    <button className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-zinc-400 hover:bg-red-500/10 hover:text-red-500 transition-all group">
                        <Icons.Logout />
                        {sidebarOpen && <span className="text-sm font-bold">Cerrar Sesión</span>}
                    </button>
                </div>
            </aside>

            {/* ── MAIN VIEWPORT ─────────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* ── PREMIUM HEADER ────────────────────────────────────────────────── */}
                <header className="bg-white/70 backdrop-blur-md border-b border-zinc-200 h-20 px-8 flex items-center justify-between z-40 sticky top-0">
                    <div className="flex items-center gap-6">
                        <button 
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-2 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-400"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                        </button>
                        
                        {/* Persona Switcher - Premium Toggle */}
                        <div className="flex items-center gap-1 bg-zinc-100 p-1.5 rounded-2xl shadow-inner border border-zinc-200">
                            <button 
                                onClick={() => { setPersona('business'); setActiveTab('overview'); }}
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 flex items-center gap-2 ${persona === 'business' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-105' : 'text-zinc-500 hover:text-zinc-900'}`}
                            >
                                <Icons.Dashboard />
                                Perspectiva de Negocio
                            </button>
                            <button 
                                onClick={() => { setPersona('fiscal'); setActiveTab('fiscal-summary'); }}
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 flex items-center gap-2 ${persona === 'fiscal' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 scale-105' : 'text-zinc-500 hover:text-zinc-900'}`}
                            >
                                <Icons.Tax />
                                Cumplimiento Fiscal
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full border border-emerald-100">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest">En Vivo: Mayo 2024</span>
                        </div>
                        
                        <div className="h-8 w-px bg-zinc-200" />

                        <div className="flex items-center gap-4">
                            <button className="relative p-2 text-zinc-400 hover:text-zinc-900 transition-colors">
                                <Icons.Bell />
                                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                            </button>
                            <div className="flex items-center gap-3 pl-2 group cursor-pointer">
                                <div className="text-right hidden sm:block">
                                    <p className="text-sm font-bold text-zinc-900 leading-none">Arturo Garcia</p>
                                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter mt-1">Socio Principal</p>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-linear-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                                    <Icons.User />
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* ── CONTENT AREA ──────────────────────────────────────────────────── */}
                <main className="flex-1 overflow-y-auto p-8 lg:p-12 scroll-smooth">
                    {/* Page Header */}
                    <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${persona === 'business' ? 'text-emerald-500' : 'text-blue-600'}`}>
                                    {activeTab === 'overview' ? 'Inteligencia de Negocio' : 
                                     activeTab === 'sales' ? 'Análisis Comercial' : 
                                     activeTab === 'expenses' ? 'Control de Operaciones' : 
                                     activeTab === 'fiscal-summary' ? 'Liquidación de Impuestos' : 
                                     activeTab === 'annexes' ? 'Libros de IVA Hacienda' :
                                     activeTab === 'document-health' ? 'Validación de Integridad' :
                                     activeTab.startsWith('ai') ? 'Motor de Riesgos AI' : 'Configuración'}
                                </span>
                            </div>
                            <h1 className="text-4xl font-black text-zinc-900 tracking-tight">
                                {activeTab === 'overview' ? 'Resumen Ejecutivo' : 
                                 activeTab === 'sales' ? 'Rendimiento de Ventas' : 
                                 activeTab === 'expenses' ? 'Distribución de Gastos' : 
                                 activeTab === 'fiscal-summary' ? 'Estatus Tributario' : 
                                 activeTab === 'annexes' ? 'Anexos IVA v11.7' :
                                 activeTab === 'document-health' ? 'Salud Documental' :
                                 activeTab.startsWith('ai') ? 'Anomalías Detectadas' : 'Preferencias'}
                            </h1>
                            <p className="text-zinc-500 text-sm font-medium max-w-2xl">
                                {activeTab === 'overview' ? 'Visión integral del desempeño financiero y salud tributaria de la empresa.' : 
                                 activeTab === 'sales' ? 'Seguimiento detallado de ingresos, segmentación de clientes y tendencias comerciales.' : 
                                 activeTab === 'expenses' ? 'Análisis profundo de la estructura de costos y eficiencia operativa.' : 
                                 activeTab === 'fiscal-summary' ? 'Cálculo proyectado de débitos y créditos fiscales para el periodo actual.' : 
                                 activeTab === 'annexes' ? 'Consulta de registros oficiales exportables para la declaración jurada.' :
                                 activeTab === 'document-health' ? 'Diagnóstico de consistencia entre registros internos y documentos legales.' :
                                 activeTab.startsWith('ai') ? 'Análisis avanzado mediante algoritmos de inteligencia artificial.' : 'Gestión de parámetros globales y conectividad del sistema.'}
                            </p>
                        </div>
                        
                        <div className="flex gap-3">
                            <button className="bg-white border border-zinc-200 text-zinc-900 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-3 hover:bg-zinc-50 transition-all shadow-sm">
                                <Icons.Calendar />
                                Mayo 2024
                            </button>
                            <button className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-3 transition-all shadow-lg ${persona === 'business' ? 'bg-emerald-500 text-white shadow-emerald-500/20 hover:bg-emerald-600' : 'bg-blue-600 text-white shadow-blue-600/20 hover:bg-blue-700'}`}>
                                <Icons.Plus />
                                {persona === 'business' ? 'Nuevo Movimiento' : 'Nueva Factura'}
                            </button>
                        </div>
                    </div>

                    {/* View Switching Logic */}
                    <div className="transition-all duration-700 animate-in fade-in slide-in-from-bottom-6">
                        
                        {activeTab === 'overview' && (
                            <div className="space-y-12">
                                {/* Key Indicators Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                    {[
                                        { label: 'Facturación Mensual', val: trendsData[trendsData.length-1]?.ventas_actual || 0, trend: '+12.5%', color: 'text-zinc-900', bg: 'bg-white' },
                                        { label: 'Gastos Operativos', val: trendsData[trendsData.length-1]?.gastos_actual || 0, trend: '-3.2%', color: 'text-zinc-900', bg: 'bg-white' },
                                        { label: 'Margen de Utilidad', val: (trendsData[trendsData.length-1]?.ventas_actual || 0) - (trendsData[trendsData.length-1]?.gastos_actual || 0), trend: '+8.1%', color: 'text-emerald-600', bg: 'bg-emerald-50/50 border-emerald-100' },
                                        { label: persona === 'business' ? 'Ticket Promedio' : 'Provisión IVA', val: persona === 'business' ? 124.50 : (taxData?.liquidation?.debito_fiscal || 0), trend: persona === 'business' ? '+4.2%' : 'A Tiempo', color: persona === 'business' ? 'text-emerald-600' : 'text-blue-600', bg: persona === 'business' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-blue-50/50 border-blue-100' }
                                    ].map((stat, i) => (
                                        <div key={i} className={`${stat.bg} border border-zinc-200/60 rounded-4xl p-8 shadow-sm group hover:shadow-xl hover:shadow-zinc-200/50 transition-all duration-500`}>
                                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">{stat.label}</p>
                                            <div className="flex items-end justify-between">
                                                <p className={`text-3xl font-black tabular-nums ${stat.color}`}>${stat.val.toLocaleString()}</p>
                                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${stat.trend.startsWith('+') ? 'bg-emerald-100 text-emerald-700' : stat.trend.startsWith('-') ? 'bg-red-100 text-red-700' : 'bg-zinc-100 text-zinc-600'}`}>
                                                    {stat.trend}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Main Charts Grid */}
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                    {/* Financial Trend - Glassmorphism Card */}
                                    <div className="lg:col-span-8 bg-white/70 backdrop-blur-xl border border-white/40 rounded-[2.5rem] p-10 shadow-2xl shadow-zinc-200/40 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full -mr-32 -mt-32 blur-[100px] group-hover:bg-emerald-500/10 transition-colors duration-1000" />
                                        <div className="relative z-10">
                                            <div className="flex justify-between items-center mb-10">
                                                <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest flex items-center gap-3">
                                                    <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                                                    Tendencia Financiera Consolidada
                                                </h3>
                                                <div className="flex gap-4">
                                                    <span className="flex items-center gap-2 text-[10px] font-black uppercase text-emerald-600">
                                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/30" /> Ingresos
                                                    </span>
                                                    <span className="flex items-center gap-2 text-[10px] font-black uppercase text-zinc-300">
                                                        <div className="w-2.5 h-2.5 rounded-full bg-zinc-300" /> Egresos
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="h-96 w-full">
                                                <FinancialTrendsChart data={trendsData} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sidebar Analytics */}
                                    <div className="lg:col-span-4 space-y-8">
                                        <div className="bg-zinc-900 text-white rounded-[2.5rem] p-10 shadow-2xl shadow-zinc-900/20 flex flex-col h-full relative overflow-hidden">
                                            <div className="absolute bottom-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full -mb-16 -mr-16 blur-3xl" />
                                            <h3 className="text-sm font-black uppercase tracking-widest mb-10 text-emerald-400">Estado de Rentabilidad</h3>
                                            <div className="flex-1 flex items-center justify-center">
                                                <ProfitabilityChart data={trendsData} />
                                            </div>
                                            <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Resultado Neto</p>
                                                    <p className="text-xl font-black text-white">${((trendsData[trendsData.length-1]?.ventas_actual || 0) - (trendsData[trendsData.length-1]?.gastos_actual || 0)).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}



                        {activeTab === 'expenses' && (
                            <div className="space-y-12 animate-in fade-in duration-700">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="bg-white border border-zinc-200 rounded-[2.5rem] p-10 shadow-xl shadow-zinc-200/40">
                                        <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest mb-10 flex items-center gap-3">
                                            <div className="w-1.5 h-6 bg-red-500 rounded-full" />
                                            Distribución de Gastos Operativos
                                        </h3>
                                        <div className="h-96">
                                            <TypesBreakdownChart data={typesData?.gastos || []} type="gastos" />
                                        </div>
                                    </div>
                                    <div className="bg-white border border-zinc-200 rounded-[2.5rem] p-10 shadow-xl shadow-zinc-200/40">
                                        <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest mb-10 flex items-center gap-3">
                                            <div className="w-1.5 h-6 bg-zinc-900 rounded-full" />
                                            Principales Proveedores
                                        </h3>
                                        <div className="flex items-center justify-center h-64 bg-zinc-50 border border-dashed border-zinc-300 rounded-2xl">
                                            <p className="text-zinc-500 font-medium">Tabla de Egresos</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* FISCAL VIEWS */}
                        {activeTab === 'fiscal-summary' && (
                            <div className="space-y-10 animate-in fade-in duration-700">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    {[
                                        { label: 'Débito Fiscal (IVA)', val: taxData?.liquidation?.debito_fiscal, color: 'text-zinc-900', icon: Icons.Tax },
                                        { label: 'Crédito Fiscal (IVA)', val: taxData?.liquidation?.credito_fiscal, color: 'text-blue-600', icon: Icons.Tax },
                                        { label: 'Saldo Neto IVA', val: taxData?.liquidation?.neto, color: 'text-indigo-600', bg: 'bg-indigo-50/30 border-indigo-100', icon: Icons.Tax }
                                    ].map((stat, i) => {
                                        const Icon = stat.icon;
                                        return (
                                        <div key={i} className={`bg-white border border-zinc-200/60 rounded-3xl p-8 flex items-center justify-between shadow-sm group hover:-translate-y-1 transition-all duration-500 ${stat.bg || ''}`}>
                                            <div>
                                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{stat.label}</p>
                                                <p className={`text-3xl font-black tabular-nums ${stat.color}`}>${stat.val?.toLocaleString()}</p>
                                            </div>
                                            <div className={`w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:text-white transition-all duration-500 ${persona === 'fiscal' ? 'group-hover:bg-blue-600' : 'group-hover:bg-zinc-900'}`}>
                                                {Icon && <Icon />}
                                            </div>
                                        </div>
                                    )})}
                                </div>
                                <div className="bg-white border border-zinc-200 rounded-[2.5rem] shadow-xl shadow-zinc-200/40 overflow-hidden">
                                    <TaxLiquidationCard data={taxData?.liquidation} />
                                </div>
                            </div>
                        )}

                        {activeTab === 'annexes' && (
                            <div className="bg-white border border-zinc-200 rounded-[2.5rem] p-10 shadow-2xl shadow-zinc-200/50 overflow-hidden animate-in fade-in duration-700">
                                <LegalAnnexesTab />
                            </div>
                        )}

                        {activeTab === 'document-health' && (
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in fade-in duration-700">
                                <div className="lg:col-span-4">
                                    <DocumentHealthBadge data={taxData?.health} />
                                </div>
                                <div className="lg:col-span-8 bg-white border border-zinc-200 rounded-[2.5rem] p-10 shadow-xl shadow-zinc-200/40">
                                    <h4 className="text-[11px] font-black text-zinc-900 uppercase tracking-widest mb-8">Concentración de Entidades Legales</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="flex items-center justify-center h-48 bg-zinc-50 border border-dashed border-zinc-300 rounded-2xl">
                                            <p className="text-zinc-500 font-medium">Tabla de Clientes</p>
                                        </div>
                                        <div className="flex items-center justify-center h-48 bg-zinc-50 border border-dashed border-zinc-300 rounded-2xl">
                                            <p className="text-zinc-500 font-medium">Tabla de Proveedores</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab.startsWith('ai') && (
                            <div className="animate-in fade-in duration-700">
                                 <div className={`bg-white border rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden ${persona === 'business' ? 'border-emerald-100 shadow-emerald-500/5' : 'border-blue-100 shadow-blue-500/5'}`}>
                                    <div className={`absolute top-0 right-0 w-96 h-96 rounded-full -mr-48 -mt-48 blur-[120px] ${persona === 'business' ? 'bg-emerald-500/5' : 'bg-blue-500/5'}`} />
                                    <div className="flex justify-between items-center mb-12 relative z-10">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-14 h-14 text-white rounded-2xl flex items-center justify-center shadow-lg ${persona === 'business' ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-blue-600 shadow-blue-500/30'}`}>
                                                <Icons.AI />
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-black text-zinc-900 tracking-tight uppercase">{persona === 'business' ? 'Predicción de Demanda' : 'Auditoría Fiscal AI'}</h2>
                                                <p className={`text-[10px] font-black uppercase tracking-widest ${persona === 'business' ? 'text-emerald-500' : 'text-blue-600'}`}>{persona === 'business' ? 'Análisis de Tendencias Comerciales' : 'Motor de Detección de Anomalías Tributarias'}</p>
                                            </div>
                                        </div>
                                        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${persona === 'business' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                            Isolation Forest 1.2
                                        </div>
                                    </div>
                                    <AnomalyAlertPanel token={authToken} />
                                 </div>
                            </div>
                        )}

                        {activeTab === 'config' && (
                            <div className="bg-white border border-zinc-200 rounded-[2.5rem] p-12 shadow-xl shadow-zinc-200/40 animate-in fade-in duration-700">
                                <h3 className="text-xl font-black text-zinc-900 mb-10 uppercase tracking-widest flex items-center gap-4">
                                    <Icons.Settings />
                                    Configuración del Sistema
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="p-8 bg-zinc-50 border border-zinc-200 rounded-3xl group hover:border-emerald-500/50 transition-colors">
                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm mb-6 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                                            <Icons.Tax />
                                        </div>
                                        <p className="text-[11px] font-black text-zinc-900 uppercase tracking-widest mb-3">Parámetros Tributarios</p>
                                        <p className="text-sm text-zinc-500 font-medium">Configure tasas de IVA, periodos fiscales y umbrales de retención para su región.</p>
                                    </div>
                                    <div className="p-8 bg-zinc-50 border border-zinc-200 rounded-3xl group hover:border-emerald-500/50 transition-colors">
                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm mb-6 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                                            <Icons.AI />
                                        </div>
                                        <p className="text-[11px] font-black text-zinc-900 uppercase tracking-widest mb-3">Entrenamiento de IA</p>
                                        <p className="text-sm text-zinc-500 font-medium">Ajuste la sensibilidad de detección de anomalías y sincronice nuevos datasets para el modelo.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Decorative Ambient Effects */}
            <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden transition-all duration-1000">
                <div className={`absolute top-0 right-0 w-240 h-240 rounded-full blur-[150px] -mr-80 -mt-80 transition-all duration-1000 ${persona === 'business' ? 'bg-emerald-500/10' : 'bg-blue-600/10'}`} />
                <div className={`absolute bottom-0 left-0 w-200 h-200 rounded-full blur-[120px] -ml-60 -mb-60 transition-all duration-1000 ${persona === 'business' ? 'bg-zinc-200/20' : 'bg-indigo-500/10'}`} />
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7xl h-320 rounded-full blur-[180px] opacity-20 transition-all duration-1000 ${persona === 'business' ? 'bg-emerald-100/0' : 'bg-blue-400/5'}`} />
            </div>
        </div>
    );
}
