"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { fetchWithAuth } from "@/lib/api";
import AuthGuard from "../../components/auth/AuthGuard";
import TaxLiquidationCard from "../../components/analytics/TaxLiquidationCard";

import FinancialTrendsChart from "../../components/analytics/FinancialTrendsChart";
import ProfitabilityChart from "../../components/analytics/ProfitabilityChart";
import TypesBreakdownChart from "../../components/analytics/TypesBreakdownChart";
import LegalAnnexesTab from "../../components/analytics/LegalAnnexesTab";
import AiChatWidget from "../../components/ai/AiChatWidget";
import { 
    TrendData, 
    BreakdownData, 
    TaxData 
} from "@/types/analytics";
import CustomerAnalysisTable from "../../components/analytics/CustomerAnalysisTable";
import CustomerDetailSlideOver from "../../components/analytics/CustomerDetailSlideOver";
import CustomerRevenueTreemap from '@/components/analytics/CustomerRevenueTreemap';
import { CustomerRecord } from "@/types/customerAnalysis";

import SupplierExpenseTreemap from "../../components/analytics/SupplierExpenseTreemap";
import SupplierAnalysisTable from "../../components/analytics/SupplierAnalysisTable";
import SupplierDetailSlideOver from "../../components/analytics/SupplierDetailSlideOver";
import { SupplierRecord } from "@/types/supplierAnalysis";

import CompanyManager from "../../components/analytics/CompanyManager";
import SmartCsvUploader from "../../components/analytics/SmartCsvUploader";
import ValidationAlerts from "../../components/analytics/ValidationAlerts";
import UploadHistory from "../../components/analytics/UploadHistory";
import { Company, CsvValidationResult } from "@/types/companyTypes";
import Paywall from "../../components/auth/Paywall";
import AdminPanel from "../../components/admin/AdminPanel";
import UserInvitationForm from "../../components/auth/UserInvitationForm";
import MembershipPanel from "../../components/settings/MembershipPanel";

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
    ),
    Building: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
    ),
    Upload: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
    )
};

const formatMoney = (value: number) =>
    value.toLocaleString('es-SV', { minimumFractionDigits: value % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 });

const getTrendLabel = (current: number, previous?: number) => {
    if (!previous) return 'Sin base';
    const pct = ((current - previous) / Math.abs(previous)) * 100;
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct.toFixed(1)}%`;
};

const getTrendClass = (trend: string) => {
    if (trend.startsWith('+')) return 'bg-emerald-100 text-emerald-700';
    if (trend.startsWith('-')) return 'bg-red-100 text-red-700';
    return 'bg-zinc-100 text-zinc-600';
};

export default function DashboardPage() {
    const [persona, setPersona] = useState<'business' | 'fiscal'>('business');
    const [activeTab, setActiveTab] = useState('overview');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    
    // Data States
    const [trendsData, setTrendsData] = useState<TrendData[]>([]);
    const [typesData, setTypesData] = useState<{ ventas: BreakdownData[]; gastos: BreakdownData[] } | null>(null);
    const [taxData, setTaxData] = useState<TaxData | null>(null);
    const [customerData, setCustomerData] = useState<CustomerRecord[]>([]);
    const [supplierData, setSupplierData] = useState<SupplierRecord[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
    const [selectedSupplier, setSelectedSupplier] = useState<SupplierRecord | null>(null);
    const [authToken, setAuthToken] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Year selection
    const [availableYears, setAvailableYears] = useState<number[]>([]);
    const [selectedYear, setSelectedYear] = useState<number | null>(null);

    // Customer Module State
    const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);

    // Supplier Module State
    const [isSupplierSlideOverOpen, setIsSupplierSlideOverOpen] = useState(false);

    // Companies / Upload State
    const [companiesList, setCompaniesList] = useState<Company[]>([]);
    const [selectedCompanyForUpload, setSelectedCompanyForUpload] = useState<Company | null>(null);
    const [validationResult, setValidationResult] = useState<CsvValidationResult | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [refreshHistory, setRefreshHistory] = useState(0);

    // Trial / Admin State
    const [userProfile, setUserProfile] = useState<any>(null);
    const [session, setSession] = useState<any>(null);
    const [tenantData, setTenantData] = useState<any>(null);
    const [isTrialExpired, setIsTrialExpired] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    const handleAddCompany = async (name: string, nit: string) => {
        if (!userProfile?.tenant_id || !userProfile?.id) {
            alert("No se pudo identificar su perfil o Tenant. \n\nEsto puede suceder si su usuario se registró antes de activar el sistema de roles. \n\nPor favor, contacte al administrador para vincular su cuenta o intente cerrar sesión y volver a entrar.");
            return;
        }

        try {
            console.log("Registrando empresa para tenant:", userProfile.tenant_id);
            const { data, error: insertError } = await supabase
                .from('companies')
                .insert([{
                    tenant_id: userProfile.tenant_id,
                    user_id: userProfile.id,
                    name,
                    nit
                }])
                .select()
                .single();

            if (insertError) {
                console.error("Supabase error adding company:", insertError);
                throw insertError;
            }

            if (data) {
                const newCompany: Company = {
                    ...data,
                    status: 'active',
                    totalRecords: 0
                };
                setCompaniesList(prev => [newCompany, ...prev]);
                console.log("Empresa registrada exitosamente:", newCompany);
                return data;
            }
        } catch (err: any) {
            console.error("Error capturado en handleAddCompany:", err);
            alert(`Error al registrar la empresa: ${err.message || 'Error desconocido'}`);
            throw err; // Propagar para que el componente hijo (CompanyManager) detenga el loading
        }
    };

    const handleProcessFile = async () => {
        if (!validationResult?.file || !selectedCompanyForUpload) return;
        
        setIsUploading(true);
        setUploadError(null);
        
        const formData = new FormData();
        formData.append('file', validationResult.file);
        formData.append('company_id', selectedCompanyForUpload.id);
        formData.append('document_type', validationResult.detectedType || 'ventas-contribuyentes');
        
        try {
            await fetchWithAuth('/financial/upload', {
                method: 'POST',
                body: formData,
            });
            
            // Éxito: Limpiar estados
            setValidationResult(null);
            setSelectedCompanyForUpload(null);
            setRefreshHistory(prev => prev + 1);
            alert("¡Archivo procesado con éxito! El historial se actualizará en unos segundos.");
        } catch (err: any) {
            console.error("Upload error:", err);
            setUploadError(err.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleResetCompany = async (company: Company) => {
        if (!confirm(`¿Estás seguro de eliminar TODOS los datos de "${company.name}"?\n\nEsto eliminará:\n- ${company.totalRecords || 0} registros financieros\n- Historial de cargas\n- Documentos fiscales\n\nEsta acción no se puede deshacer.`)) {
            return;
        }
        try {
            await fetchWithAuth(`/financial/company/${company.id}/records`, {
                method: 'DELETE',
            });
            setCompaniesList(prev => prev.map(c => 
                c.id === company.id ? { ...c, totalRecords: 0, lastProcessedMonth: undefined } : c
            ));
            setSelectedCompanyForUpload(null);
            setRefreshHistory(prev => prev + 1);
            alert("Datos de la empresa eliminados correctamente.");
        } catch (err: any) {
            console.error("Reset error:", err);
            alert(`Error al resetear: ${err.message}`);
        }
    };

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
        } catch (err) {
            console.error("Error al cerrar sesión:", err);
        }
    };

    useEffect(() => {
    const fetchAll = async () => {
            try {
                const { data: { session: currentSession } } = await supabase.auth.getSession();
                if (!currentSession) {
                    // No hay sesión - redirigir a login en vez de mostrar error
                    if (typeof window !== 'undefined') {
                        window.location.href = '/login';
                    }
                    return;
                }
                setSession(currentSession);

                // 1. Fetch User Profile and Tenant
                const { data: profile, error: profileError } = await supabase
                    .from('user_profiles')
                    .select('*, tenants(*)')
                    .eq('id', currentSession.user.id)
                    .single();

                // Validación de Administrador Maestro (Independiente del Perfil en BD)
                const userEmail = currentSession.user.email?.toLowerCase() || "";
                const isMasterAdmin = userEmail === 'garcia.integrum1@gmail.com';
                setIsAdmin(isMasterAdmin); // Activación inmediata por correo

                if (profile) {
                    console.log("Datos de Perfil cargados:", profile);
                    setUserProfile(profile);
                    setTenantData(profile.tenants);
                    
                    // Si el perfil dice que es administrador, también lo activamos
                    if (profile.role === 'administrador') setIsAdmin(true);
                    
                    const trialEnds = new Date(profile.tenants.trial_ends_at);
                    setIsTrialExpired(trialEnds < new Date());
                } else {
                    console.warn("No se encontró perfil para el usuario actual:", currentSession.user.id);
                    if (!isMasterAdmin) {
                        setError("Su perfil no ha sido inicializado correctamente. Por favor, intente cerrar sesión y volver a entrar, o contacte a soporte.");
                    }
                }

                // 2. Fetch Companies
                const { data: companies } = await supabase
                    .from('companies')
                    .select('*')
                    .order('name');
                
                // Mapear snake_case de BD a camelCase del frontend
                const mappedCompanies = (companies || []).map(c => ({
                    ...c,
                    status: c.status || 'active',
                    totalRecords: c.total_records ?? 0,
                    lastProcessedMonth: c.last_processed_month || undefined,
                }));
                setCompaniesList(mappedCompanies as any);

                // Fetch Available Years
                let currentYearToFetch = selectedYear;
                try {
                    const resYears = await fetchWithAuth('/analytics/years');
                    const jsonYears = await resYears.json();
                    if (jsonYears.status === 'success' && Array.isArray(jsonYears.data)) {
                        setAvailableYears(jsonYears.data);
                        if (jsonYears.data.length > 0 && !selectedYear) {
                            currentYearToFetch = jsonYears.data[0];
                            setSelectedYear(currentYearToFetch);
                        }
                    }
                } catch (err) {
                    console.error("Error loading available years:", err);
                }

                // 3. Fetch Analytics from Backend
                const fetchAnalytics = async () => {
                    const queryParams = currentYearToFetch ? `?year=${currentYearToFetch}` : '';
                    const endpoints = [
                        { url: `/analytics/financial-trends${queryParams}`, setter: (d: any) => setTrendsData(d || []) },
                        { url: `/analytics/types-breakdown${queryParams}`, setter: (d: any) => setTypesData(d || { ventas: [], gastos: [] }) },
                        { url: `/analytics/tax-summary/iva-liquidation${queryParams}`, setter: (d: any) => setTaxData((prev: any) => ({ ...(prev || { liquidation: null, topEntities: [], health: null }), liquidation: d })) },
                        { url: `/analytics/tax-summary/top-entities${queryParams}`, setter: (d: any) => setTaxData((prev: any) => ({ ...(prev || { liquidation: null, topEntities: [], health: null }), topEntities: d })) },
                        { url: `/analytics/tax-summary/document-health${queryParams}`, setter: (d: any) => setTaxData((prev: any) => ({ ...(prev || { liquidation: null, topEntities: [], health: null }), health: d })) },
                        { url: `/analytics/rfm${queryParams}`, setter: (d: any) => setCustomerData(d || []) },
                        { url: `/analytics/supplier-rfm${queryParams}`, setter: (d: any) => setSupplierData(d || []) },
                    ];

                    await Promise.all(endpoints.map(async ({ url, setter }) => {
                        try {
                            const res = await fetchWithAuth(url);
                            const json = await res.json();
                            setter(json.data);
                        } catch (err) {
                            console.error(`Error loading ${url}:`, err);
                        }
                    }));
                };

                await fetchAnalytics();

            } catch (err: unknown) {
                console.error("Fetch Error:", err);
                setError("Error al cargar los datos del ecosistema.");
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, [refreshHistory, selectedYear]);

    // ── Paywall Guard (Changed to Read-Only Banner in UI) ─────────────────────────
    // if (isTrialExpired && !loading) {
    //     return <Paywall tenantId={userProfile?.tenant_id} onSuccess={() => window.location.reload()} />;
    // }

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 transition-colors duration-500">
            <div className="relative w-24 h-24 mb-8">
                <div className="absolute inset-0 border-4 border-emerald-500/10 rounded-full" />
                <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <div className="absolute inset-4 border-2 border-blue-500 border-b-transparent rounded-full animate-spin [animation-duration:1.5s]" />
            </div>
            <div className="text-center">
                <p className="text-white font-black tracking-[0.5em] uppercase text-xs mb-3 animate-pulse">Sincronizando Ecosistema</p>
                <p className="text-emerald-500/50 text-[10px] font-bold uppercase tracking-widest">Integrum Premium v3.0</p>
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

    const hasData = trendsData.length > 0 || (typesData?.ventas?.length ?? 0) > 0;
    const latestTrend = trendsData[trendsData.length - 1];
    const currentPeriodLabel = latestTrend ? `${latestTrend.mes}${latestTrend.year ? ` ${latestTrend.year}` : ''}` : 'Sin periodo';
    const currentSales = latestTrend?.ventas_actual || 0;
    const previousSales = latestTrend?.ventas_anterior || 0;
    const currentExpenses = latestTrend?.gastos_actual || 0;
    const previousExpenses = latestTrend?.gastos_anterior || 0;
    const currentProfit = currentSales - currentExpenses;
    const previousProfit = previousSales - previousExpenses;
    const averageTicket = customerData.length
        ? customerData.reduce((sum, customer) => sum + (customer.ticketPromedio || 0), 0) / customerData.length
        : 0;

    const isAccountantOrAdmin = isAdmin || userProfile?.role === 'contador';

    const businessSidebar = [
        { group: "ESTRATEGIA", items: [
            { id: 'overview', label: 'Resumen Ejecutivo', icon: Icons.Dashboard },
            { id: 'expenses', label: 'Gastos y Operaciones', icon: Icons.Expenses },
            { id: 'customers', label: 'Mis Clientes', icon: Icons.User },
        ]},
    ];

    const fiscalSidebar = [
        { group: "TRIBUTACIÓN", items: [
            { id: 'fiscal-summary', label: 'Liquidación de IVA', icon: Icons.Tax },
            { id: 'annexes', label: 'Anexos de Hacienda', icon: Icons.Tax },
            ...(isAccountantOrAdmin ? [{ id: 'companies', label: 'Carga de Datos', icon: Icons.Upload }] : []),
        ]},
    ];

    const sidebarItems = persona === 'business' ? businessSidebar : fiscalSidebar;


    return (
        <AuthGuard>
            <div className="min-h-screen bg-[#f8fafc] flex selection:bg-emerald-500/30">
                {/* ── PERSISTENT SIDEBAR ────────────────────────────────────────────── */}
                <aside className={`bg-zinc-950 text-white transition-all duration-500 ease-in-out flex flex-col z-50 ${sidebarOpen ? 'w-72' : 'w-20'}`}>
                    {/* Logo Area */}
                    <div className="p-6 h-20 flex items-center gap-4 overflow-hidden border-b border-white/5">
                        <div className="min-w-10 w-10 h-10 bg-[#1e2a4a] rounded-xl flex items-center justify-center shadow-lg shadow-[#1e2a4a]/20 border border-white/10 shrink-0">
                            <span className="text-2xl font-serif text-white font-black tracking-tighter">G</span>
                        </div>
                        {sidebarOpen && (
                            <div className="flex flex-col leading-none">
                                <span className="text-lg font-serif font-black tracking-tight text-white">Garcia</span>
                                <span className="text-[10px] font-bold tracking-[0.3em] text-[#3AA867] uppercase opacity-90 mt-0.5">INTEGRUM</span>
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
                        <button 
                            onClick={handleLogout}
                            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-zinc-400 hover:bg-red-500/10 hover:text-red-500 transition-all group"
                        >
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
                                <span className="text-[10px] font-black uppercase tracking-widest">En Vivo: {currentPeriodLabel}</span>
                            </div>
                            
                            <div className="h-8 w-px bg-zinc-200" />

                            <div className="flex items-center gap-4 relative">
                                <button 
                                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                                    className="relative p-2 text-zinc-400 hover:text-zinc-900 transition-colors"
                                >
                                    <Icons.Bell />
                                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                                </button>
                                
                                {notificationsOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
                                        <div className="absolute right-0 top-12 w-80 bg-white border border-zinc-200 rounded-3xl p-6 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="flex justify-between items-center mb-4 pb-3 border-b border-zinc-100">
                                                <h4 className="text-xs font-black uppercase tracking-widest text-zinc-900">Notificaciones</h4>
                                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">3 Nuevas</span>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="flex gap-3 text-left">
                                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                                        <Icons.Upload />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-zinc-800">Carga de Datos Exitosa</p>
                                                        <p className="text-[10px] text-zinc-500 mt-0.5 font-medium leading-tight">Se procesaron 53 registros de Ventas para mayo 2026.</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3 text-left">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                                        <Icons.Tax />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-zinc-800">Cálculo de IVA Actualizado</p>
                                                        <p className="text-[10px] text-zinc-500 mt-0.5 font-medium leading-tight">Se recalcularon los débitos y créditos del período.</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3 text-left">
                                                    <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-600 flex items-center justify-center shrink-0">
                                                        <Icons.Settings />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-zinc-800">Membresía Sincronizada</p>
                                                        <p className="text-[10px] text-zinc-500 mt-0.5 font-medium leading-tight">Acceso activo en versión Premium v3.0.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                                <div className="flex items-center gap-3 pl-2 group cursor-pointer">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-sm font-bold text-zinc-900 leading-none">
                                        {userProfile?.full_name && userProfile.full_name !== 'Admin Seed' ? userProfile.full_name : (session?.user?.user_metadata?.name || "Garcia Integrum")}
                                        </p>
                                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter mt-1">
                                            {isAdmin ? "Administrador Global" : userProfile?.role || "Consultando..."}
                                        </p>
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
                                         activeTab === 'customers' ? 'Análisis de Clientes' : 
                                         activeTab === 'companies' ? 'Gestión Documental' : 
                                         activeTab === 'fiscal-summary' ? 'Liquidación de Impuestos' : 
                                         activeTab === 'annexes' ? 'Libros de IVA Hacienda' : 
                                         activeTab === 'admin' ? 'Control de Plataforma' : 'Configuración'}
                                    </span>
                                </div>
                                <h1 className="text-4xl font-black text-zinc-900 tracking-tight">
                                    {activeTab === 'overview' ? 'Resumen Ejecutivo' : 
                                     activeTab === 'sales' ? 'Rendimiento de Ventas' : 
                                     activeTab === 'expenses' ? 'Distribución de Gastos' : 
                                     activeTab === 'customers' ? 'Gestión de Cartera' : 
                                     activeTab === 'companies' ? 'Portafolio de Empresas' : 
                                     activeTab === 'fiscal-summary' ? 'Estatus Tributario' : 
                                     activeTab === 'annexes' ? 'Anexos IVA v11.7' : 
                                     activeTab === 'admin' ? 'Bóveda de Control' : 'Preferencias'}
                                </h1>
                                <p className="text-zinc-500 text-sm font-medium max-w-2xl">
                                    {activeTab === 'overview' ? 'Visión integral del desempeño financiero y salud tributaria de la empresa.' : 
                                     activeTab === 'sales' ? 'Seguimiento detallado de ingresos, segmentación de clientes y tendencias comerciales.' : 
                                     activeTab === 'expenses' ? 'Análisis profundo de la estructura de costos y eficiencia operativa.' : 
                                     activeTab === 'customers' ? 'Seguimiento de comportamiento, rentabilidad y salud de la base de clientes.' : 
                                     activeTab === 'companies' ? 'Gestione sus clientes contables, suba y procese archivos CSV y resuelva alertas de validación antes de la declaración fiscal.' : 
                                     activeTab === 'fiscal-summary' ? 'Cálculo proyectado de débitos y créditos fiscales para el periodo actual.' : 
                                     activeTab === 'annexes' ? 'Consulta de registros oficiales exportables para la declaración jurada.' : 
                                     activeTab === 'admin' ? 'Panel exclusivo para la gestión de membresías, cupones y auditoría de la plataforma.' : 'Gestión de parámetros globales y conectividad del sistema.'}
                                </p>
                            </div>
                            
                            <div className="flex gap-3">
                                {availableYears.length > 0 && (
                                    <div className="relative">
                                        <select
                                            id="year-select-dropdown"
                                            value={selectedYear || ""}
                                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                                            className="appearance-none bg-white border border-zinc-200 text-zinc-900 pl-6 pr-10 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-50 transition-all shadow-sm focus:outline-hidden cursor-pointer"
                                        >
                                            {availableYears.map(y => (
                                                <option key={y} value={y}>{y}</option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">
                                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                        </div>
                                    </div>
                                )}
                                <button 
                                    onClick={() => {
                                        const selectDropdown = document.getElementById("year-select-dropdown");
                                        if (selectDropdown) selectDropdown.focus();
                                    }}
                                    className="bg-white border border-zinc-200 text-zinc-900 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-3 hover:bg-zinc-50 transition-all shadow-sm focus:outline-hidden"
                                    title="Haz clic para seleccionar el año fiscal en el menú adjunto"
                                >
                                    <Icons.Calendar />
                                    {currentPeriodLabel}
                                </button>
                                <button 
                                    disabled={isTrialExpired}
                                    onClick={() => {
                                        const promptMsg = persona === 'business'
                                            ? "Hola, me gustaría registrar un nuevo movimiento financiero. ¿Cómo puedo hacerlo?"
                                            : "Hola, quiero registrar una nueva factura de venta/compra en el sistema. ¿Me ayudas?";
                                        window.dispatchEvent(new CustomEvent('open-ai-chat', { detail: { message: promptMsg } }));
                                    }}
                                    className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-3 transition-all shadow-lg ${
                                        isTrialExpired 
                                        ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed shadow-none'
                                        : persona === 'business' ? 'bg-emerald-500 text-white shadow-emerald-500/20 hover:bg-emerald-600' : 'bg-blue-600 text-white shadow-blue-600/20 hover:bg-blue-700'
                                    }`}>
                                    <Icons.Plus />
                                    {persona === 'business' ? 'Nuevo Movimiento' : 'Nueva Factura'}
                                </button>
                            </div>
                        </div>

                        {/* Read-Only Banner */}
                        {isTrialExpired && (
                            <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center text-red-500">
                                        <Icons.Upload />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-red-500 uppercase tracking-widest">Membresía Expirada</p>
                                        <p className="text-xs text-red-400/80 font-bold">Su acceso es de solo lectura. No puede crear ni editar registros.</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setActiveTab('config')}
                                    className="px-4 py-2 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-colors"
                                >
                                    Renovar / Aplicar Cupón
                                </button>
                            </div>
                        )}

                        {/* View Switching Logic */}
                        <div className="transition-all duration-700 animate-in fade-in slide-in-from-bottom-6">
                            
                            {activeTab === 'overview' && (
                                <div className="space-y-12">
                                    {/* Hint for Accountants */}
                                    {userProfile?.role === 'contador' && persona === 'business' && (
                                        <div className="bg-blue-600 text-white p-6 rounded-3xl flex items-center justify-between shadow-xl shadow-blue-600/20 animate-bounce">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                                                    <Icons.Upload />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black uppercase tracking-widest">¿Buscando el módulo de carga?</p>
                                                    <p className="text-xs font-medium opacity-80">Cambie a la vista de "Cumplimiento Fiscal" en la parte superior para gestionar empresas y subir documentos.</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => { setPersona('fiscal'); setActiveTab('fiscal-summary'); }}
                                                className="bg-white text-blue-600 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-100 transition-colors"
                                            >
                                                Ir a Vista Fiscal
                                            </button>
                                        </div>
                                    )}

                                    {/* Empty State */}
                                    {!hasData && (
                                        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 text-center">
                                            <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 rounded-2xl flex items-center justify-center">
                                                <Icons.Upload />
                                            </div>
                                            <h3 className="text-lg font-black text-amber-800 mb-2">No hay datos financieros</h3>
                                            <p className="text-amber-700 text-sm max-w-md mx-auto">
                                                {isAccountantOrAdmin
                                                    ? 'Aún no se han cargado registros para este período. Cambia a la vista Cumplimiento Fiscal y sube un archivo CSV con los anexos de Hacienda (F07).'
                                                    : 'Aún no se han cargado registros para este período. Por favor, solicita a tu contador o administrador de la plataforma que realice la carga de los anexos IVA (F07).'}
                                            </p>
                                            {isAccountantOrAdmin ? (
                                                <button
                                                    onClick={() => { setPersona('fiscal'); setActiveTab('companies'); }}
                                                    className="mt-6 bg-amber-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-700 transition-all"
                                                >
                                                    Ir a Carga de Datos
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        window.dispatchEvent(new CustomEvent('open-ai-chat', {
                                                            detail: { message: "Hola, veo que no hay datos financieros cargados en mi portal. ¿Cómo puedo solicitar la carga de mis anexos IVA o qué debo indicarle a mi contador?" }
                                                        }));
                                                    }}
                                                    className="mt-6 bg-emerald-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md"
                                                >
                                                    Preguntar al Asistente IA
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* Key Indicators Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                        {[
                                            { label: 'Facturación Mensual', val: currentSales, trend: getTrendLabel(currentSales, previousSales), color: 'text-zinc-900', bg: 'bg-white' },
                                            { label: 'Gastos Operativos', val: currentExpenses, trend: getTrendLabel(currentExpenses, previousExpenses), color: 'text-zinc-900', bg: 'bg-white' },
                                            { label: 'Margen de Utilidad', val: currentProfit, trend: getTrendLabel(currentProfit, previousProfit), color: 'text-emerald-600', bg: 'bg-emerald-50/50 border-emerald-100' },
                                            { label: persona === 'business' ? 'Ticket Promedio' : 'Provisión IVA', val: persona === 'business' ? averageTicket : (taxData?.liquidation?.debito_fiscal || 0), trend: persona === 'business' ? (averageTicket > 0 ? 'Calculado' : 'Sin base') : 'A Tiempo', color: persona === 'business' ? 'text-emerald-600' : 'text-blue-600', bg: persona === 'business' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-blue-50/50 border-blue-100' }
                                        ].map((stat, i) => (
                                            <div key={i} className={`${stat.bg} border border-zinc-200/60 rounded-4xl p-8 shadow-sm group hover:shadow-xl hover:shadow-zinc-200/50 transition-all duration-500`}>
                                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">{stat.label}</p>
                                                <div className="flex items-end justify-between">
                                                    <p className={`text-3xl font-black tabular-nums ${stat.color}`}>${formatMoney(stat.val)}</p>
                                                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${getTrendClass(stat.trend)}`}>
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
                                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                        {/* Donut Chart - Categorías de Gasto */}
                                        <div className="lg:col-span-4 bg-white border border-zinc-200 rounded-[2.5rem] p-10 shadow-xl shadow-zinc-200/40">
                                            <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest mb-10 flex items-center gap-3">
                                                <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                                                Categorías de Gasto
                                            </h3>
                                            <div className="h-80">
                                                <TypesBreakdownChart data={typesData?.gastos || []} type="gastos" />
                                            </div>
                                            <div className="mt-8 space-y-3">
                                                {(typesData?.gastos ?? []).slice(0, 3).map((item, i) => (
                                                    <div key={i} className="flex justify-between items-center p-3 bg-zinc-50 rounded-xl">
                                                        <span className="text-[10px] font-black text-zinc-400 uppercase">{item.name}</span>
                                                        <span className="text-sm font-black text-zinc-900">${item.value.toLocaleString()}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Treemap - Concentración por Proveedor */}
                                        <div className="lg:col-span-8 bg-white border border-zinc-200 rounded-[2.5rem] p-10 shadow-xl shadow-zinc-200/40">
                                            <div className="flex justify-between items-end mb-10">
                                                <div>
                                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Análisis de Proveedores</p>
                                                    <h3 className="text-2xl font-black text-zinc-900 tracking-tight">Concentración del Gasto</h3>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Impacto</span>
                                                    <span className="text-xs font-bold text-zinc-600 bg-zinc-100 px-3 py-1 rounded-full">Top 5 + Otros</span>
                                                </div>
                                            </div>
                                            
                                            <SupplierExpenseTreemap 
                                                data={supplierData}
                                                onSelectSupplier={(s) => {
                                                    setSelectedSupplier(s);
                                                    setIsSupplierSlideOverOpen(true);
                                                }}
                                            />

                                            <div className="mt-8 flex flex-wrap gap-6">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-indigo-600" />
                                                    <span className="text-[10px] font-bold text-zinc-500 uppercase">Socio Estratégico</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-amber-600" />
                                                    <span className="text-[10px] font-bold text-zinc-500 uppercase">Gasto Recurrente</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-teal-600" />
                                                    <span className="text-[10px] font-bold text-zinc-500 uppercase">Eventual</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tabla de Análisis de Proveedores */}
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-[11px] font-black text-zinc-900 uppercase tracking-[0.2em]">Listado Detallado de Operaciones</h3>
                                            <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Exportar Reporte Maestro</button>
                                        </div>
                                        <SupplierAnalysisTable 
                                            data={supplierData}
                                            onSelectSupplier={(s) => {
                                                setSelectedSupplier(s);
                                                setIsSupplierSlideOverOpen(true);
                                            }}
                                        />
                                    </div>

                                    <SupplierDetailSlideOver 
                                        supplier={selectedSupplier}
                                        isOpen={isSupplierSlideOverOpen}
                                        onClose={() => setIsSupplierSlideOverOpen(false)}
                                    />
                                </div>
                            )}

                            {/* FISCAL VIEWS */}
                            {activeTab === 'companies' && (isAdmin || userProfile?.role === 'contador') && (
                                <div className="animate-in fade-in duration-700 space-y-6">
                                    <button 
                                        onClick={() => setActiveTab('config')}
                                        className="bg-white border border-zinc-200 text-zinc-600 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-50 transition-all shadow-sm flex items-center gap-2"
                                    >
                                        ← Volver a Configuración
                                    </button>
                                    {!selectedCompanyForUpload ? (
                                        <>
                                            <div className="bg-white border border-zinc-200 rounded-[2.5rem] p-10 shadow-2xl shadow-zinc-200/50">
                                                <CompanyManager 
                                                    companies={companiesList}
                                                    onSelectCompany={(company) => setSelectedCompanyForUpload(company)}
                                                    onAddCompany={handleAddCompany}
                                                    onResetCompany={handleResetCompany}
                                                />
                                            </div>
                                            <div className="mt-8">
                                                <UploadHistory refreshTrigger={refreshHistory} />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="space-y-6">
                                            {!validationResult && (
                                                <div className="flex items-center gap-4">
                                                    <button 
                                                        onClick={() => setSelectedCompanyForUpload(null)}
                                                        className="bg-white border border-zinc-200 text-zinc-600 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-50 transition-colors shadow-sm"
                                                    >
                                                        ← Volver al Gestor
                                                    </button>
                                                    <div className="flex flex-col">
                                                        <span className="text-xl font-black tracking-tight text-zinc-900">{selectedCompanyForUpload.name}</span>
                                                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">NIT: {selectedCompanyForUpload.nit}</span>
                                                    </div>
                                                </div>
                                            )}
                                            <div className={`bg-white border border-zinc-200 rounded-[2.5rem] shadow-2xl shadow-zinc-200/50 overflow-hidden ${validationResult ? 'border-none shadow-none bg-transparent' : ''}`}>
                                                {validationResult ? (
                                                    <ValidationAlerts 
                                                        result={validationResult}
                                                        onDismiss={handleProcessFile}
                                                        onRetry={() => {
                                                            setValidationResult(null);
                                                            setUploadError(null);
                                                        }}
                                                        isProcessing={isUploading}
                                                        processingError={uploadError}
                                                    />
                                                ) : (
                                                    <SmartCsvUploader 
                                                        company={selectedCompanyForUpload}
                                                        onValidationComplete={(result) => setValidationResult(result)}
                                                        onBack={() => setSelectedCompanyForUpload(null)}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

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
                                                    <p className={`text-3xl font-black tabular-nums ${stat.color}`}>${(stat.val ?? 0).toLocaleString()}</p>
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




                            {activeTab === 'customers' && (
                                <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                                    {/* Treemap de Concentración de Ingresos */}
                                    <div className="bg-white border border-zinc-200 rounded-4xl p-10 shadow-sm mb-8">
                                        <div className="flex justify-between items-end mb-8">
                                            <div>
                                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Análisis de Concentración</p>
                                                <h3 className="text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-3">
                                                    Ingresos por Cliente
                                                </h3>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Visualización</span>
                                                <span className="text-xs font-bold text-zinc-600 bg-zinc-100 px-3 py-1 rounded-full">Top 5 Clientes + Otros</span>
                                            </div>
                                        </div>

                                        <CustomerRevenueTreemap 
                                            data={customerData}
                                            topCount={5}
                                            onSelectCustomer={(c) => {
                                                setSelectedCustomer(c);
                                                setIsSlideOverOpen(true);
                                            }}
                                        />
                                        
                                        <div className="mt-6 flex items-center gap-6">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-emerald-600" />
                                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Campeones</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-blue-600" />
                                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Leales</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-amber-600" />
                                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">En Riesgo</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-zinc-400" />
                                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Otros</span>
                                            </div>
                                        </div>
                                    </div>

                                    <CustomerAnalysisTable 
                                        data={customerData} 
                                        onSelectCustomer={(c) => {
                                            setSelectedCustomer(c);
                                            setIsSlideOverOpen(true);
                                        }}
                                    />
                                    <CustomerDetailSlideOver 
                                        customer={selectedCustomer}
                                        isOpen={isSlideOverOpen}
                                        onClose={() => setIsSlideOverOpen(false)}
                                    />
                                </div>
                            )}

                            {activeTab === 'invitations' && isAdmin && (
                                <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 space-y-6">
                                    <button 
                                        onClick={() => setActiveTab('config')}
                                        className="bg-white border border-zinc-200 text-zinc-600 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-50 transition-all shadow-sm flex items-center gap-2"
                                    >
                                        ← Volver a Configuración
                                    </button>
                                    <UserInvitationForm token={authToken} />
                                </div>
                            )}

                            {activeTab === 'admin' && isAdmin && (
                                <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 space-y-6">
                                    <button 
                                        onClick={() => setActiveTab('config')}
                                        className="bg-white border border-zinc-200 text-zinc-600 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-50 transition-all shadow-sm flex items-center gap-2"
                                    >
                                        ← Volver a Configuración
                                    </button>
                                    <AdminPanel />
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

                                        {(isAdmin || userProfile?.role === 'contador') && (
                                            <button 
                                                onClick={() => setActiveTab('companies')}
                                                className="p-8 bg-zinc-50 border border-zinc-200 rounded-3xl group hover:border-blue-500/50 transition-colors text-left"
                                            >
                                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                    <Icons.Building />
                                                </div>
                                                <p className="text-[11px] font-black text-zinc-900 uppercase tracking-widest mb-3">Gestor de Empresas</p>
                                                <p className="text-sm text-zinc-500 font-medium">Administre el catálogo de empresas y gestione la carga masiva de documentos tributarios.</p>
                                            </button>
                                        )}

                                        {/* Bóveda Administrativa: Solo para el Administrador Global */}
                                        {(isAdmin && session?.user?.email === 'garcia.integrum1@gmail.com') && (
                                            <button 
                                                onClick={() => setActiveTab('admin')}
                                                className="p-8 bg-zinc-50 border border-zinc-200 rounded-3xl group hover:border-blue-500/50 transition-colors text-left"
                                            >
                                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                    <Icons.Settings />
                                                </div>
                                                <p className="text-[11px] font-black text-zinc-900 uppercase tracking-widest mb-3">Bóveda Administrativa</p>
                                                <p className="text-sm text-zinc-500 font-medium">Gestión de membresías, cupones y auditoría global de la plataforma.</p>
                                            </button>
                                        )}

                                        {/* Gestión de Invitaciones: Para Contador y Administrador */}
                                        {(isAdmin || userProfile?.role === 'contador') && (
                                            <button 
                                                onClick={() => setActiveTab('invitations')}
                                                className="p-8 bg-zinc-50 border border-zinc-200 rounded-3xl group hover:border-blue-500/50 transition-colors text-left"
                                            >
                                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                    <Icons.User />
                                                </div>
                                                <p className="text-[11px] font-black text-zinc-900 uppercase tracking-widest mb-3">Gestión de Invitaciones</p>
                                                <p className="text-sm text-zinc-500 font-medium">Envíe invitaciones a nuevos usuarios y gestione roles administrativos.</p>
                                            </button>
                                        )}

                                        {/* Estado de Membresía */}
                                        <button 
                                            onClick={() => setActiveTab('membership')}
                                            className="p-8 bg-zinc-50 border border-zinc-200 rounded-3xl group hover:border-emerald-500/50 transition-colors text-left"
                                        >
                                            <div className={`w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm mb-6 transition-all ${isTrialExpired ? 'group-hover:bg-red-500 text-red-500 group-hover:text-white' : 'group-hover:bg-emerald-500 group-hover:text-white'}`}>
                                                <Icons.Building />
                                            </div>
                                            <p className="text-[11px] font-black text-zinc-900 uppercase tracking-widest mb-3">Estado de Membresía</p>
                                            <p className="text-sm text-zinc-500 font-medium">Revise el tiempo restante de su plan y aplique cupones de renovación.</p>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'membership' && (
                                <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 space-y-6">
                                    <button 
                                        onClick={() => setActiveTab('config')}
                                        className="bg-white border border-zinc-200 text-zinc-600 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-50 transition-all shadow-sm flex items-center gap-2"
                                    >
                                        ← Volver a Configuración
                                    </button>
                                    <MembershipPanel 
                                        trialEndsAt={userProfile?.tenants?.trial_ends_at || ''} 
                                        tenantId={userProfile?.tenant_id} 
                                        onRefresh={() => setRefreshHistory(prev => prev + 1)}
                                    />
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

                {/* ── AI CHAT WIDGET ────────────────────────────────────────────────── */}
                <AiChatWidget />
            </div>
        </AuthGuard>
    );
}
