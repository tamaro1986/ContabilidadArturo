"use client";

import React, { useState, useEffect } from "react";
import { fetchWithAuth } from "@/lib/api";
import UserManagementPanel from "../admin/UserManagementPanel";
import AdminPanel from "../admin/AdminPanel";

interface AdminStats {
  total_users: number;
  total_contadores: number;
  total_clientes: number;
  total_admins: number;
  total_companies: number;
  total_uploads: number;
  total_records: number;
}

interface AdminCompany {
  id: string;
  name: string;
  nit: string;
  tenant_id: string;
  tenant_name?: string;
  user_email?: string;
  total_records: number;
  created_at: string;
}

interface AdminUpload {
  id: string;
  company_name?: string;
  document_type: string;
  filename: string;
  status: string;
  records_processed: number;
  error_message?: string;
  created_at: string;
}

interface AdminDashboardViewProps {
  userProfile: { full_name?: string; email?: string; role?: string } | null;
  onLogout: () => void;
}

export default function AdminDashboardView({ userProfile, onLogout }: AdminDashboardViewProps) {
  const [activeTab, setActiveTab] = useState<"users" | "companies" | "audit" | "membership">("users");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [uploads, setUploads] = useState<AdminUpload[]>([]);
  const [companySearch, setCompanySearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, companiesRes, uploadsRes] = await Promise.all([
        fetchWithAuth("/admin/stats"),
        fetchWithAuth("/admin/companies"),
        fetchWithAuth("/admin/uploads"),
      ]);

      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
      if (companiesRes.ok) {
        setCompanies(await companiesRes.json());
      }
      if (uploadsRes.ok) {
        setUploads(await uploadsRes.json());
      }
    } catch (err) {
      console.error("Error al cargar datos administrativos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAdminData();
  }, []);

  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(companySearch.toLowerCase()) ||
    c.nit.toLowerCase().includes(companySearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] text-zinc-900 flex flex-col">
      {/* ── HEADER DE ADMINISTRACIÓN ────────────────────────────────────────────── */}
      <header className="bg-zinc-950 text-white border-b border-white/10 px-8 py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sticky top-0 z-40 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-linear-to-br from-indigo-500 to-blue-700 rounded-2xl flex items-center justify-center font-serif text-white font-black text-2xl shadow-lg shadow-indigo-500/30 border border-white/10">
            G
          </div>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold tracking-tight text-white">Garcia Integrum</span>
              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                Centro de Administración Global
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-medium">Gestión integral de usuarios, catálogo de empresas y verificación de trazabilidad.</p>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-white">{userProfile?.full_name || "Administrador Integrum"}</p>
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-wider">{userProfile?.email || "admin@integrum.sv"}</p>
          </div>
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* ── CONTENIDO PRINCIPAL ──────────────────────────────────────────────────── */}
      <main className="flex-1 p-6 md:p-10 max-w-7xl w-full mx-auto space-y-8">
        {/* KPI CARDS GLOBALES DE PLATAFORMA */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mb-2">Usuarios Totales</p>
            <p className="text-3xl font-black text-zinc-900 tracking-tight">{stats?.total_users ?? 0}</p>
            <div className="mt-3 flex items-center gap-2 text-xs font-bold text-zinc-500">
              <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{stats?.total_contadores ?? 0} Contadores</span>
              <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">{stats?.total_clientes ?? 0} Clientes</span>
            </div>
          </div>

          <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mb-2">Empresas en Plataforma</p>
            <p className="text-3xl font-black text-zinc-900 tracking-tight">{stats?.total_companies ?? companies.length}</p>
            <p className="mt-3 text-xs text-zinc-500 font-medium">Catálogo activo gestionado por contadores</p>
          </div>

          <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mb-2">Cargas Procesadas</p>
            <p className="text-3xl font-black text-blue-600 tracking-tight">{stats?.total_uploads ?? uploads.length}</p>
            <p className="mt-3 text-xs text-zinc-500 font-medium">Archivos CSV de Hacienda procesados</p>
          </div>

          <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mb-2">Registros Contables</p>
            <p className="text-3xl font-black text-emerald-600 tracking-tight">{stats?.total_records?.toLocaleString() ?? 0}</p>
            <p className="mt-3 text-xs text-emerald-700 bg-emerald-50 inline-block px-2 py-0.5 rounded-md font-bold">Base de Datos PostgreSQL Nativa</p>
          </div>
        </div>

        {/* NAVEGACIÓN POR TABS DE ADMINISTRADOR */}
        <div className="flex border-b border-zinc-200 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("users")}
            className={`px-6 py-3.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "users"
                ? "border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-xl"
                : "border-transparent text-zinc-500 hover:text-zinc-900"
            }`}
          >
            Gestión de Usuarios & Roles
          </button>
          <button
            onClick={() => setActiveTab("companies")}
            className={`px-6 py-3.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "companies"
                ? "border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-xl"
                : "border-transparent text-zinc-500 hover:text-zinc-900"
            }`}
          >
            Directorio de Empresas ({companies.length})
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`px-6 py-3.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "audit"
                ? "border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-xl"
                : "border-transparent text-zinc-500 hover:text-zinc-900"
            }`}
          >
            Auditoría de Cargas ({uploads.length})
          </button>
          <button
            onClick={() => setActiveTab("membership")}
            className={`px-6 py-3.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "membership"
                ? "border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-xl"
                : "border-transparent text-zinc-500 hover:text-zinc-900"
            }`}
          >
            Bóveda & Membresías
          </button>
        </div>

        {/* CONTENIDO DE CADA TAB */}
        <div className="animate-in fade-in duration-300">
          {activeTab === "users" && (
            <div>
              <UserManagementPanel />
            </div>
          )}

          {activeTab === "companies" && (
            <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-lg font-black text-zinc-900 tracking-tight">Directorio Completo de Empresas</h3>
                  <p className="text-xs text-zinc-500 font-medium">Audite todas las razones sociales registradas en la plataforma y sus volúmenes contables.</p>
                </div>
                <div className="w-full sm:w-72">
                  <input
                    type="text"
                    placeholder="Buscar por nombre o NIT..."
                    value={companySearch}
                    onChange={(e) => setCompanySearch(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="overflow-x-auto border border-zinc-100 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 text-zinc-400 font-black uppercase tracking-widest text-[10px] border-b border-zinc-100">
                    <tr>
                      <th className="px-6 py-4">Empresa / Razón Social</th>
                      <th className="px-6 py-4">NIT</th>
                      <th className="px-6 py-4">Despacho / Tenant</th>
                      <th className="px-6 py-4">Contador Asignado</th>
                      <th className="px-6 py-4 text-center">Registros Contables</th>
                      <th className="px-6 py-4">Fecha Creación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-medium text-zinc-700">
                    {filteredCompanies.map((c) => (
                      <tr key={c.id} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="px-6 py-4 font-bold text-zinc-900 flex items-center gap-3">
                          <span className="w-7 h-7 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-xs shrink-0">
                            {c.name.charAt(0).toUpperCase()}
                          </span>
                          {c.name}
                        </td>
                        <td className="px-6 py-4 font-mono text-zinc-600">{c.nit}</td>
                        <td className="px-6 py-4 text-zinc-600">{c.tenant_name || c.tenant_id}</td>
                        <td className="px-6 py-4 text-zinc-500">{c.user_email || "No asignado"}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            c.total_records > 0 ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"
                          }`}>
                            {c.total_records.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-zinc-400 text-[11px]">
                          {c.created_at ? new Date(c.created_at).toLocaleDateString("es-SV") : "—"}
                        </td>
                      </tr>
                    ))}
                    {filteredCompanies.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-zinc-400">
                          {loading ? "Cargando directorio de empresas..." : "No se encontraron empresas registradas."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "audit" && (
            <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-black text-zinc-900 tracking-tight">Trazabilidad Global de Cargas CSV</h3>
                <p className="text-xs text-zinc-500 font-medium">Historial consolidado de procesamiento tributario ejecutado en el sistema.</p>
              </div>

              <div className="overflow-x-auto border border-zinc-100 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 text-zinc-400 font-black uppercase tracking-widest text-[10px] border-b border-zinc-100">
                    <tr>
                      <th className="px-6 py-4">Empresa</th>
                      <th className="px-6 py-4">Tipo Documento</th>
                      <th className="px-6 py-4">Nombre Archivo</th>
                      <th className="px-6 py-4 text-center">Registros</th>
                      <th className="px-6 py-4 text-center">Estado</th>
                      <th className="px-6 py-4">Fecha y Hora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-medium text-zinc-700">
                    {uploads.map((u) => (
                      <tr key={u.id} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="px-6 py-4 font-bold text-zinc-900">{u.company_name || "Empresa"}</td>
                        <td className="px-6 py-4">
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md text-[10px] font-bold">
                            {u.document_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-zinc-600 text-[11px] max-w-xs truncate">{u.filename}</td>
                        <td className="px-6 py-4 text-center font-bold">{u.records_processed}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            u.status === "success"
                              ? "bg-emerald-100 text-emerald-800"
                              : u.status === "processing"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-red-100 text-red-800"
                          }`}>
                            {u.status === "success" ? "Exitoso" : u.status === "processing" ? "Procesando" : "Error"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-zinc-400 text-[11px]">
                          {u.created_at ? new Date(u.created_at).toLocaleString("es-SV") : "—"}
                        </td>
                      </tr>
                    ))}
                    {uploads.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-zinc-400">
                          {loading ? "Cargando auditoría de cargas..." : "No hay cargas registradas en la plataforma."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "membership" && (
            <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm">
              <AdminPanel />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
