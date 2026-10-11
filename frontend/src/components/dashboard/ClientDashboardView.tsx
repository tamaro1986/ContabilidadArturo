"use client";

import React, { useState } from "react";
import FinancialTrendsChart from "../analytics/FinancialTrendsChart";
import ProfitabilityChart from "../analytics/ProfitabilityChart";
import TypesBreakdownChart from "../analytics/TypesBreakdownChart";
import CustomerRevenueTreemap from "../analytics/CustomerRevenueTreemap";
import CustomerAnalysisTable from "../analytics/CustomerAnalysisTable";
import CustomerDetailSlideOver from "../analytics/CustomerDetailSlideOver";
import SupplierExpenseTreemap from "../analytics/SupplierExpenseTreemap";
import SupplierAnalysisTable from "../analytics/SupplierAnalysisTable";
import SupplierDetailSlideOver from "../analytics/SupplierDetailSlideOver";
import AiChatWidget from "../ai/AiChatWidget";
import type { Company } from "@/types/companyTypes";
import type { CustomerRecord } from "@/types/customerAnalysis";
import type { SupplierRecord } from "@/types/supplierAnalysis";
import type { TrendData, BreakdownData, TaxData } from "@/types/analytics";

interface ClientDashboardViewProps {
  userProfile: { full_name?: string; email?: string; role?: string } | null;
  companies: Company[];
  selectedCompany: Company | null;
  onSelectCompany: (company: Company) => void;
  trendsData: TrendData[];
  typesData: { ventas: BreakdownData[]; gastos: BreakdownData[] } | null;
  taxData: TaxData | null;
  customerData: CustomerRecord[];
  supplierData: SupplierRecord[];
  availableYears: number[];
  selectedYear: number | null;
  onSelectYear: (year: number) => void;
  loading: boolean;
  onLogout: () => void;
}

const formatMoney = (value: number) =>
  value.toLocaleString("es-SV", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });

const getTrendLabel = (current: number, previous?: number) => {
  if (!previous) return "Sin base";
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
};

const getTrendClass = (trend: string) => {
  if (trend.startsWith("+")) return "bg-emerald-100 text-emerald-700";
  if (trend.startsWith("-")) return "bg-red-100 text-red-700";
  return "bg-zinc-100 text-zinc-600";
};

export default function ClientDashboardView({
  userProfile,
  companies,
  selectedCompany,
  onSelectCompany,
  trendsData,
  typesData,
  taxData,
  customerData,
  supplierData,
  availableYears,
  selectedYear,
  onSelectYear,
  loading,
  onLogout,
}: ClientDashboardViewProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "trends" | "customers" | "suppliers" | "tax">("overview");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [isCustomerSlideOverOpen, setIsCustomerSlideOverOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierRecord | null>(null);
  const [isSupplierSlideOverOpen, setIsSupplierSlideOverOpen] = useState(false);
  const [breakdownType, setBreakdownType] = useState<"ventas" | "gastos">("ventas");

  const latestTrend = trendsData[trendsData.length - 1];
  const currentPeriodLabel = latestTrend
    ? `${latestTrend.mes}${latestTrend.year ? ` ${latestTrend.year}` : ""}`
    : "Sin periodo";

  const currentSales = latestTrend?.ventas_actual || 0;
  const previousSales = latestTrend?.ventas_anterior || 0;
  const currentExpenses = latestTrend?.gastos_actual || 0;
  const previousExpenses = latestTrend?.gastos_anterior || 0;
  const currentProfit = currentSales - currentExpenses;
  const previousProfit = previousSales - previousExpenses;
  const averageTicket = customerData.length
    ? customerData.reduce((sum, c) => sum + (c.ticketPromedio || 0), 0) / customerData.length
    : 0;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-zinc-900 flex flex-col selection:bg-emerald-500/20">
      {/* ── HEADER EJECUTIVO PARA CLIENTE ────────────────────────────────────────── */}
      <header className="bg-white/80 backdrop-blur-md border-b border-zinc-200 px-8 py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-linear-to-br from-[#1e2a4a] to-[#2d3e6b] rounded-2xl flex items-center justify-center font-serif text-white font-black text-2xl shadow-lg border border-white/10 shrink-0">
            G
          </div>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold tracking-tight text-zinc-950">Garcia Integrum</span>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                Portal Ejecutivo BI
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-medium">Analítica financiera profesional y salud tributaria en tiempo real.</p>
          </div>
        </div>

        {/* SELECTOR DE EMPRESA Y AÑO */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {companies.length > 0 && (
            <div className="relative">
              <select
                value={selectedCompany?.id || ""}
                onChange={(e) => {
                  const comp = companies.find((c) => c.id === e.target.value);
                  if (comp) onSelectCompany(comp);
                }}
                className="appearance-none bg-zinc-100 hover:bg-zinc-200/70 border border-zinc-200 text-zinc-900 pl-4 pr-9 py-2.5 rounded-xl text-xs font-black tracking-wider focus:outline-hidden cursor-pointer"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.nit})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-500">
                <svg className="fill-current h-4 w-4" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          )}

          {availableYears.length > 0 && (
            <div className="relative">
              <select
                value={selectedYear || ""}
                onChange={(e) => onSelectYear(Number(e.target.value))}
                className="appearance-none bg-white border border-zinc-200 text-zinc-900 pl-4 pr-8 py-2.5 rounded-xl text-xs font-black tracking-wider focus:outline-hidden cursor-pointer"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-500">
                <svg className="fill-current h-3 w-3" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pl-2">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-zinc-900">{userProfile?.full_name || "Cliente Corporativo"}</p>
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Solo Lectura</p>
            </div>
            <button
              onClick={onLogout}
              className="px-3.5 py-2 bg-zinc-100 hover:bg-red-50 text-zinc-600 hover:text-red-600 rounded-xl text-xs font-bold transition-all border border-zinc-200 cursor-pointer"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* ── BARRA DE PESTAÑAS EJECUTIVAS ────────────────────────────────────────── */}
      <div className="bg-white border-b border-zinc-200 px-8 flex gap-2 overflow-x-auto">
        {[
          { id: "overview", label: "Resumen Ejecutivo (KPIs)" },
          { id: "trends", label: "Gráficas & Rentabilidad" },
          { id: "customers", label: "Cartera de Clientes" },
          { id: "suppliers", label: "Gastos & Proveedores" },
          { id: "tax", label: "Salud Tributaria (IVA)" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-5 py-3.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? "border-emerald-500 text-emerald-700 bg-emerald-50/40"
                : "border-transparent text-zinc-500 hover:text-zinc-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── CONTENIDO PRINCIPAL ─────────────────────────────────────────────────── */}
      <main className="flex-1 p-6 md:p-10 max-w-7xl w-full mx-auto space-y-10">
        {loading ? (
          <div className="py-24 text-center">
            <div className="inline-block w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin mb-4" />
            <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Calculando indicadores financieros...</p>
          </div>
        ) : (
          <>
            {/* VISTA 1: RESUMEN EJECUTIVO (KPIS) */}
            {activeTab === "overview" && (
              <div className="space-y-10 animate-in fade-in duration-300">
                {/* 4 CARDS DE ALTA DIRECCIÓN */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white border border-zinc-200/80 rounded-3xl p-7 shadow-xs hover:shadow-lg transition-all">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Facturación Mensual</p>
                    <div className="flex items-end justify-between">
                      <p className="text-3xl font-black text-zinc-900 tabular-nums">${formatMoney(currentSales)}</p>
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${getTrendClass(getTrendLabel(currentSales, previousSales))}`}>
                        {getTrendLabel(currentSales, previousSales)}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-3 font-medium">Período analizado: {currentPeriodLabel}</p>
                  </div>

                  <div className="bg-white border border-zinc-200/80 rounded-3xl p-7 shadow-xs hover:shadow-lg transition-all">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Gastos Operativos</p>
                    <div className="flex items-end justify-between">
                      <p className="text-3xl font-black text-zinc-900 tabular-nums">${formatMoney(currentExpenses)}</p>
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${getTrendClass(getTrendLabel(currentExpenses, previousExpenses))}`}>
                        {getTrendLabel(currentExpenses, previousExpenses)}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-3 font-medium">Compras y costos de operación</p>
                  </div>

                  <div className="bg-emerald-50/60 border border-emerald-100 rounded-3xl p-7 shadow-xs hover:shadow-lg transition-all">
                    <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-3">Margen de Utilidad</p>
                    <div className="flex items-end justify-between">
                      <p className="text-3xl font-black text-emerald-600 tabular-nums">${formatMoney(currentProfit)}</p>
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${getTrendClass(getTrendLabel(currentProfit, previousProfit))}`}>
                        {getTrendLabel(currentProfit, previousProfit)}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-700/80 mt-3 font-medium">Diferencial neto del periodo</p>
                  </div>

                  <div className="bg-white border border-zinc-200/80 rounded-3xl p-7 shadow-xs hover:shadow-lg transition-all">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Ticket Promedio</p>
                    <div className="flex items-end justify-between">
                      <p className="text-3xl font-black text-zinc-900 tabular-nums">${formatMoney(averageTicket)}</p>
                      <span className="text-[10px] font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">Calculado</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-3 font-medium">Valor promedio por transacción comercial</p>
                  </div>
                </div>

                {/* GRÁFICAS PRINCIPALES */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-3xl p-8 shadow-xs">
                    <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-6">Tendencia Financiera Consolidada</h4>
                    <FinancialTrendsChart data={trendsData} />
                  </div>
                  <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-xs flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-6">Estado de Rentabilidad</h4>
                      <ProfitabilityChart data={trendsData} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VISTA 2: GRÁFICAS & RENTABILIDAD */}
            {activeTab === "trends" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-xs">
                  <h4 className="text-sm font-black uppercase tracking-widest text-zinc-900 mb-2">Comportamiento Multianual de Ingresos y Egresos</h4>
                  <p className="text-xs text-zinc-500 font-medium mb-6">Evolución mensual comparando facturación versus gastos declarados.</p>
                  <FinancialTrendsChart data={trendsData} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-black uppercase tracking-widest text-zinc-900">Desglose de Operaciones</h4>
                      <div className="flex bg-zinc-100 p-1 rounded-xl text-xs font-bold">
                        <button
                          onClick={() => setBreakdownType("ventas")}
                          className={`px-3 py-1 rounded-lg transition-all ${breakdownType === "ventas" ? "bg-white text-zinc-900 shadow-xs" : "text-zinc-500"}`}
                        >
                          Ventas
                        </button>
                        <button
                          onClick={() => setBreakdownType("gastos")}
                          className={`px-3 py-1 rounded-lg transition-all ${breakdownType === "gastos" ? "bg-white text-zinc-900 shadow-xs" : "text-zinc-500"}`}
                        >
                          Gastos
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500 font-medium mb-6">Distribución por tipo de documento tributario ({breakdownType === "ventas" ? "Facturación" : "Compras/Gastos"}).</p>
                    <TypesBreakdownChart data={typesData?.[breakdownType] || []} type={breakdownType} />
                  </div>
                  <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-xs">
                    <h4 className="text-sm font-black uppercase tracking-widest text-zinc-900 mb-2">Margen Operativo y Rentabilidad</h4>
                    <p className="text-xs text-zinc-500 font-medium mb-6">Utilidad neta mensual consolidada.</p>
                    <ProfitabilityChart data={trendsData} />
                  </div>
                </div>
              </div>
            )}

            {/* VISTA 3: CARTERA DE CLIENTES */}
            {activeTab === "customers" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-xs">
                  <h4 className="text-sm font-black uppercase tracking-widest text-zinc-900 mb-2">Mapa de Concentración de Clientes (Treemap)</h4>
                  <p className="text-xs text-zinc-500 font-medium mb-6">Visualice de forma interactiva qué clientes representan el mayor volumen de facturación.</p>
                  <CustomerRevenueTreemap
                    data={customerData}
                    topCount={5}
                    onSelectCustomer={(c) => {
                      setSelectedCustomer(c);
                      setIsCustomerSlideOverOpen(true);
                    }}
                  />
                </div>

                <CustomerAnalysisTable
                  data={customerData}
                  onSelectCustomer={(c) => {
                    setSelectedCustomer(c);
                    setIsCustomerSlideOverOpen(true);
                  }}
                />

                <CustomerDetailSlideOver
                  customer={selectedCustomer}
                  isOpen={isCustomerSlideOverOpen}
                  onClose={() => setIsCustomerSlideOverOpen(false)}
                />
              </div>
            )}

            {/* VISTA 4: GASTOS & PROVEEDORES */}
            {activeTab === "suppliers" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-xs">
                  <h4 className="text-sm font-black uppercase tracking-widest text-zinc-900 mb-2">Mapa de Gastos por Proveedor</h4>
                  <p className="text-xs text-zinc-500 font-medium mb-6">Identifique sus mayores proveedores y concentración de egresos.</p>
                  <SupplierExpenseTreemap
                    data={supplierData}
                    topCount={5}
                    onSelectSupplier={(s) => {
                      setSelectedSupplier(s);
                      setIsSupplierSlideOverOpen(true);
                    }}
                  />
                </div>

                <SupplierAnalysisTable
                  data={supplierData}
                  onSelectSupplier={(s) => {
                    setSelectedSupplier(s);
                    setIsSupplierSlideOverOpen(true);
                  }}
                />

                <SupplierDetailSlideOver
                  supplier={selectedSupplier}
                  isOpen={isSupplierSlideOverOpen}
                  onClose={() => setIsSupplierSlideOverOpen(false)}
                />
              </div>
            )}

            {/* VISTA 5: SALUD TRIBUTARIA */}
            {activeTab === "tax" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-xs max-w-2xl mx-auto">
                  <h4 className="text-sm font-black uppercase tracking-widest text-zinc-900 mb-2">Resumen Tributario de IVA</h4>
                  <p className="text-xs text-zinc-500 font-medium mb-6">Información calculada por el despacho contable para la declaración del periodo.</p>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-zinc-100">
                      <span className="text-xs font-bold text-zinc-600">Débito Fiscal (IVA de Ventas):</span>
                      <span className="text-sm font-black text-zinc-900 tabular-nums">
                        ${formatMoney(taxData?.liquidation?.debito_fiscal || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-zinc-100">
                      <span className="text-xs font-bold text-zinc-600">Crédito Fiscal (IVA de Compras):</span>
                      <span className="text-sm font-black text-zinc-900 tabular-nums">
                        ${formatMoney(taxData?.liquidation?.credito_fiscal || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-4 bg-emerald-50 px-4 rounded-2xl">
                      <span className="text-xs font-black text-emerald-900 uppercase tracking-wider">
                        {(taxData?.liquidation?.neto || 0) >= 0 ? "IVA a Pagar Estimado:" : "Remanente a Favor:"}
                      </span>
                      <span className="text-base font-black text-emerald-700 tabular-nums">
                        ${formatMoney(Math.abs(taxData?.liquidation?.neto || 0))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ASISTENTE IA EMPRESARIAL */}
      <AiChatWidget />
    </div>
  );
}
