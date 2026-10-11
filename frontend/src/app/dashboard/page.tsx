"use client";

import { useEffect, useState } from "react";
import AuthGuard from "../../components/auth/AuthGuard";
import AdminDashboardView from "../../components/dashboard/AdminDashboardView";
import AccountantDashboardView from "../../components/dashboard/AccountantDashboardView";
import ClientDashboardView from "../../components/dashboard/ClientDashboardView";
import { useDashboardSession } from "@/hooks/useDashboardSession";
import { useCompanies } from "@/hooks/useCompanies";
import { useFinancialUploads } from "@/hooks/useFinancialUploads";
import { useDashboardAnalytics } from "@/hooks/useDashboardAnalytics";
import { getErrorMessage } from "@/lib/errors";
import type { Company } from "@/types/companyTypes";

export default function DashboardPage() {
  const {
    session,
    userProfile,
    isAdmin,
    loading: sessionLoading,
    error: sessionError,
    logout,
  } = useDashboardSession();

  const {
    selectedCompanyForUpload,
    setSelectedCompanyForUpload,
    validationResult,
    setValidationResult,
    isUploading,
    uploadError,
    refreshHistory,
    processFile: handleProcessFile,
    clearSelection,
    refresh: refreshUploads,
  } = useFinancialUploads();

  const {
    companiesList,
    addCompany,
    resetCompany,
  } = useCompanies(userProfile, refreshHistory);

  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  useEffect(() => {
    if (companiesList.length > 0 && !selectedCompany) {
      setSelectedCompany(companiesList[0]);
    }
  }, [companiesList, selectedCompany]);

  const {
    trendsData,
    typesData,
    taxData,
    customerData,
    supplierData,
    availableYears,
    selectedYear,
    setSelectedYear,
    loading: analyticsLoading,
    error: analyticsError,
  } = useDashboardAnalytics(Boolean(session), refreshHistory, selectedCompany?.id);

  const loading = sessionLoading || (Boolean(session) && analyticsLoading);
  const error = sessionError || analyticsError;

  const handleAddCompany = async (name: string, nit: string) => {
    try {
      await addCompany(name, nit);
    } catch (caught: unknown) {
      alert(getErrorMessage(caught, "No se pudo registrar la empresa."));
      throw caught;
    }
  };

  const handleResetCompany = async (company: Company) => {
    const accepted = confirm(
      `¿Está seguro de eliminar todos los datos de "${company.name}"? Esta acción no se puede deshacer.`,
    );
    if (!accepted) return;
    try {
      await resetCompany(company);
      clearSelection();
      refreshUploads();
    } catch (caught: unknown) {
      alert(getErrorMessage(caught, "No se pudieron reiniciar los datos."));
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (caught: unknown) {
      console.error("Error al cerrar sesión:", caught);
    }
  };

  if (loading && !userProfile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 transition-colors duration-500">
        <div className="relative w-24 h-24 mb-8">
          <div className="absolute inset-0 border-4 border-emerald-500/10 rounded-full" />
          <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <div className="absolute inset-4 border-2 border-blue-500 border-b-transparent rounded-full animate-spin [animation-duration:1.5s]" />
        </div>
        <div className="text-center">
          <p className="text-white font-black tracking-[0.5em] uppercase text-xs mb-3 animate-pulse">
            Sincronizando Ecosistema
          </p>
          <p className="text-emerald-500/50 text-[10px] font-bold uppercase tracking-widest">
            Integrum Premium v3.0
          </p>
        </div>
      </div>
    );
  }

  if (error && !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center p-8 bg-red-500/10 rounded-2xl border border-red-500/20 max-w-md">
          <p className="text-red-500 font-bold mb-2">Error de Sincronización</p>
          <p className="text-red-400/80 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const role = userProfile?.role || (isAdmin ? "administrador" : "cliente");

  return (
    <AuthGuard>
      {/* ── 1. ROL ADMINISTRADOR GLOBAL ── */}
      {role === "administrador" && (
        <AdminDashboardView
          userProfile={userProfile}
          onLogout={handleLogout}
        />
      )}

      {/* ── 2. ROL CONTADOR ── */}
      {role === "contador" && (
        <AccountantDashboardView
          userProfile={userProfile}
          companies={companiesList}
          selectedCompany={selectedCompany}
          onSelectCompany={(c) => {
            setSelectedCompany(c);
            setSelectedCompanyForUpload(c);
          }}
          onAddCompany={handleAddCompany}
          onResetCompany={handleResetCompany}
          validationResult={validationResult}
          setValidationResult={setValidationResult}
          isUploading={isUploading}
          uploadError={uploadError}
          onProcessFile={handleProcessFile}
          onClearSelection={clearSelection}
          refreshUploads={refreshUploads}
          trendsData={trendsData}
          typesData={typesData}
          taxData={taxData}
          customerData={customerData}
          supplierData={supplierData}
          availableYears={availableYears}
          selectedYear={selectedYear}
          onSelectYear={setSelectedYear}
          loading={loading}
          onLogout={handleLogout}
        />
      )}

      {/* ── 3. ROL CLIENTE (O CUALQUIER OTRO ROL DE CONSULTA) ── */}
      {role !== "administrador" && role !== "contador" && (
        <ClientDashboardView
          userProfile={userProfile}
          companies={companiesList}
          selectedCompany={selectedCompany}
          onSelectCompany={setSelectedCompany}
          trendsData={trendsData}
          typesData={typesData}
          taxData={taxData}
          customerData={customerData}
          supplierData={supplierData}
          availableYears={availableYears}
          selectedYear={selectedYear}
          onSelectYear={setSelectedYear}
          loading={loading}
          onLogout={handleLogout}
        />
      )}
    </AuthGuard>
  );
}
