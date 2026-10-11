"use client";

import React, { useState } from "react";
import CompanyManager from "../analytics/CompanyManager";
import SmartCsvUploader from "../analytics/SmartCsvUploader";
import ValidationAlerts from "../analytics/ValidationAlerts";
import UploadHistory from "../analytics/UploadHistory";
import TaxLiquidationCard from "../analytics/TaxLiquidationCard";
import LegalAnnexesTab from "../analytics/LegalAnnexesTab";
import UserInvitationForm from "../auth/UserInvitationForm";
import ClientDashboardView from "./ClientDashboardView";
import type { Company } from "@/types/companyTypes";
import type { CustomerRecord } from "@/types/customerAnalysis";
import type { SupplierRecord } from "@/types/supplierAnalysis";
import type { TrendData, BreakdownData, TaxData } from "@/types/analytics";

interface AccountantDashboardViewProps {
  userProfile: { full_name?: string; email?: string; role?: string } | null;
  companies: Company[];
  selectedCompany: Company | null;
  onSelectCompany: (company: Company) => void;
  onAddCompany: (name: string, nit: string) => Promise<void>;
  onResetCompany: (company: Company) => Promise<void>;
  validationResult: any;
  setValidationResult: (res: any) => void;
  isUploading: boolean;
  uploadError: string | null;
  onProcessFile: () => Promise<void>;
  onClearSelection: () => void;
  refreshUploads: () => void;
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

export default function AccountantDashboardView({
  userProfile,
  companies,
  selectedCompany,
  onSelectCompany,
  onAddCompany,
  onResetCompany,
  validationResult,
  setValidationResult,
  isUploading,
  uploadError,
  onProcessFile,
  onClearSelection,
  refreshUploads,
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
}: AccountantDashboardViewProps) {
  const [activeTab, setActiveTab] = useState<
    "companies" | "upload" | "history" | "tax" | "annexes" | "client_preview" | "invitations"
  >("companies");

  return (
    <div className="min-h-screen bg-[#f8fafc] text-zinc-900 flex flex-col">
      {/* ── HEADER DEL CONTADOR ─────────────────────────────────────────────────── */}
      <header className="bg-white/80 backdrop-blur-md border-b border-zinc-200 px-8 py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-linear-to-br from-blue-600 to-indigo-800 rounded-2xl flex items-center justify-center font-serif text-white font-black text-2xl shadow-lg shadow-blue-500/20 border border-white/10 shrink-0">
            G
          </div>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold tracking-tight text-zinc-950">Garcia Integrum</span>
              <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                Centro Operativo Contable
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-medium">Gestión tributaria de clientes, carga de anexos F07 y liquidación fiscal.</p>
          </div>
        </div>

        {/* SELECTOR DE EMPRESA Y PERFIL */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {companies.length > 0 && (
            <div className="relative">
              <select
                value={selectedCompany?.id || ""}
                onChange={(e) => {
                  const comp = companies.find((c) => c.id === e.target.value);
                  if (comp) onSelectCompany(comp);
                }}
                className="appearance-none bg-blue-50/80 hover:bg-blue-100/70 border border-blue-200 text-blue-950 pl-4 pr-9 py-2.5 rounded-xl text-xs font-black tracking-wider focus:outline-hidden cursor-pointer"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    Empresa Activa: {c.name} ({c.nit})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-blue-600">
                <svg className="fill-current h-4 w-4" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pl-2">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-zinc-900">{userProfile?.full_name || "Contador General"}</p>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Contador Certificado</p>
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

      {/* ── BARRA DE PESTAÑAS DE TRABAJO CONTABLE ──────────────────────────────── */}
      <div className="bg-white border-b border-zinc-200 px-8 flex gap-2 overflow-x-auto shadow-xs">
        {[
          { id: "companies", label: "Portafolio de Empresas" },
          { id: "upload", label: "Carga de Datos CSV" },
          { id: "history", label: "Historial de Cargas" },
          { id: "tax", label: "Liquidación de IVA" },
          { id: "annexes", label: "Anexos de Hacienda (F07)" },
          { id: "client_preview", label: "👁️ Vista Cliente (Executive BI)" },
          { id: "invitations", label: "Invitar Clientes" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-5 py-3.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? tab.id === "client_preview"
                  ? "border-emerald-600 text-emerald-700 bg-emerald-50/60 font-bold"
                  : "border-blue-600 text-blue-700 bg-blue-50/40"
                : "border-transparent text-zinc-500 hover:text-zinc-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── CONTENIDO PRINCIPAL SEGÚN PESTAÑA ───────────────────────────────────── */}
      <main className="flex-1 p-6 md:p-10 max-w-7xl w-full mx-auto space-y-8">
        {/* PESTAÑA 1: GESTIÓN DE EMPRESAS */}
        {activeTab === "companies" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <CompanyManager
              companies={companies}
              onSelectCompany={(c) => {
                onSelectCompany(c);
              }}
              onAddCompany={onAddCompany}
              onResetCompany={onResetCompany}
            />

            {selectedCompany && (
              <div className="bg-blue-50/70 border border-blue-200 rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-blue-900">Empresa Activa Seleccionada</p>
                  <p className="text-base font-bold text-zinc-900">{selectedCompany.name} (NIT: {selectedCompany.nit})</p>
                  <p className="text-xs text-zinc-500 font-medium mt-0.5">Total de registros contables procesados: {(selectedCompany.totalRecords || 0).toLocaleString()}</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setActiveTab("upload")}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
                  >
                    Subir CSV para esta Empresa
                  </button>
                  <button
                    onClick={() => setActiveTab("client_preview")}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
                  >
                    Ver como Cliente
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 2: CARGA CSV Y VALIDACIÓN */}
        {activeTab === "upload" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {!selectedCompany ? (
              <div className="bg-white border border-zinc-200 rounded-3xl p-10 text-center max-w-lg mx-auto space-y-4 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-xl font-bold">
                  🏢
                </div>
                <h3 className="text-base font-black text-zinc-900 uppercase tracking-wider">
                  Seleccione una Empresa Primero
                </h3>
                <p className="text-sm text-zinc-500 font-medium">
                  Para cargar anexos fiscales de Hacienda (F07), primero seleccione o cree una empresa en la pestaña de Empresas.
                </p>
                <button
                  onClick={() => setActiveTab("companies")}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Ir a Mis Empresas
                </button>
              </div>
            ) : !validationResult ? (
              <SmartCsvUploader
                company={selectedCompany}
                onValidationComplete={(res) => setValidationResult(res)}
                onBack={() => setActiveTab("companies")}
              />
            ) : (
              <ValidationAlerts
                result={validationResult}
                onDismiss={async () => {
                  await onProcessFile();
                  refreshUploads();
                  setActiveTab("history");
                }}
                onRetry={onClearSelection}
                isProcessing={isUploading}
                processingError={uploadError}
              />
            )}
          </div>
        )}

        {/* PESTAÑA 3: HISTORIAL DE CARGAS EN TIEMPO REAL */}
        {activeTab === "history" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <UploadHistory
              companyId={selectedCompany?.id}
              onUploadSuccess={() => {
                refreshUploads();
              }}
            />
          </div>
        )}

        {/* PESTAÑA 4: LIQUIDACIÓN FISCAL DE IVA */}
        {activeTab === "tax" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <TaxLiquidationCard data={taxData?.liquidation} />
          </div>
        )}

        {/* PESTAÑA 5: ANEXOS DE HACIENDA */}
        {activeTab === "annexes" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <LegalAnnexesTab />
          </div>
        )}

        {/* PESTAÑA 6: VISTA CLIENTE (PREVISUALIZACIÓN EJECUTIVA EXACTA) */}
        {activeTab === "client_preview" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-emerald-950 text-white p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-emerald-400">Modo Previsualización Ejecutiva</p>
                <p className="text-sm font-medium text-emerald-100">
                  Usted está viendo los datos exactamente como los consulta su cliente para la empresa <strong>{selectedCompany?.name || "Seleccionada"}</strong>.
                </p>
              </div>
              <button
                onClick={() => setActiveTab("companies")}
                className="px-4 py-2 bg-white/10 hover:bg-white text-white hover:text-zinc-900 rounded-xl text-xs font-bold transition-all border border-white/20 cursor-pointer"
              >
                Volver al Portafolio
              </button>
            </div>

            <div className="border border-zinc-200 rounded-3xl overflow-hidden shadow-sm">
              <ClientDashboardView
                userProfile={{
                  full_name: `Cliente de ${selectedCompany?.name || "Empresa"}`,
                  email: userProfile?.email,
                  role: "cliente",
                }}
                companies={companies}
                selectedCompany={selectedCompany}
                onSelectCompany={onSelectCompany}
                trendsData={trendsData}
                typesData={typesData}
                taxData={taxData}
                customerData={customerData}
                supplierData={supplierData}
                availableYears={availableYears}
                selectedYear={selectedYear}
                onSelectYear={onSelectYear}
                loading={loading}
                onLogout={onLogout}
              />
            </div>
          </div>
        )}

        {/* PESTAÑA 7: INVITACIÓN A CLIENTES */}
        {activeTab === "invitations" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <UserInvitationForm currentUserRole="contador" />
          </div>
        )}
      </main>
    </div>
  );
}
