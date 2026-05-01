"use client";

import { useState, useEffect, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface AnomalyRecord {
  id: string;
  client_id: string;
  customer_name: string;
  amount: number;
  transaction_date: string;
  transaction_type: string;
  document_type: string;
  nit_dui: string;
  iva_amount: number;
  retention_amount: number;
  retention_percentage: number;
  anomaly_reason: string;
  risk_level: "ALTO" | "MEDIO" | "BAJO";
  status: string;
}

interface AnomalySummary {
  total_anomalous: number;
  total_valid_records: number;
  anomaly_rate_pct: number;
  anomalous_amount_total: number;
  by_reason: { reason: string; count: number; total_amount: number }[];
  top_anomalous_clients: {
    client_id: string;
    customer_name: string;
    anomaly_count: number;
    total_amount: number;
  }[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD" }).format(n);

const RISK_CONFIG = {
  ALTO: {
    badge: "bg-red-100 text-red-800 border border-red-200",
    dot: "bg-red-500",
    ring: "ring-red-200",
    label: "Riesgo Alto",
  },
  MEDIO: {
    badge: "bg-amber-100 text-amber-800 border border-amber-200",
    dot: "bg-amber-400",
    ring: "ring-amber-200",
    label: "Riesgo Medio",
  },
  BAJO: {
    badge: "bg-sky-100 text-sky-800 border border-sky-200",
    dot: "bg-sky-400",
    ring: "ring-sky-200",
    label: "Riesgo Bajo",
  },
} as const;

// ── Icon Components ────────────────────────────────────────────────────────────

const AlertTriangleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
    className="w-5 h-5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
    <path d="M12 9v4"/><path d="M12 17h.01"/>
  </svg>
);

const RefreshIcon = ({ spinning }: { spinning?: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
    className={`w-4 h-4 ${spinning ? "animate-spin" : ""}`}
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
    <path d="M21 3v5h-5"/>
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
    <path d="M8 16H3v5"/>
  </svg>
);

const ChevronRightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
    className="w-4 h-4" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6"/>
  </svg>
);

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
    className="w-4 h-4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

// ── Sub-components ─────────────────────────────────────────────────────────────

function RiskBadge({ level }: { level: "ALTO" | "MEDIO" | "BAJO" }) {
  const cfg = RISK_CONFIG[level];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold font-mono tracking-wide ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function SummaryKPI({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5 p-4 bg-white rounded-lg border border-[#dce9ff]">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#44474e]">{label}</span>
      <span className="text-2xl font-bold font-mono tabular-nums text-[#031636]">{value}</span>
      {sub && <span className="text-[11px] text-[#75777f]">{sub}</span>}
    </div>
  );
}

function AnomalyCard({
  record,
  expanded,
  onToggle,
}: {
  record: AnomalyRecord;
  expanded: boolean;
  onToggle: () => void;
}) {
  const cfg = RISK_CONFIG[record.risk_level];

  return (
    <div
      className={`rounded-lg border bg-white transition-all duration-200 overflow-hidden
        ring-1 ${expanded ? cfg.ring : "ring-transparent"} border-[#dce9ff] hover:border-[#8293ba]`}
    >
      {/* Card Header — always visible */}
      <button
        onClick={onToggle}
        className="w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-[#eff4ff] transition-colors"
      >
        {/* Risk dot */}
        <div className={`mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-semibold text-sm text-[#0b1c30] truncate">
              {record.customer_name || record.client_id}
            </span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <RiskBadge level={record.risk_level} />
              <span className="font-mono text-sm font-bold text-[#031636] tabular-nums">
                {fmt(record.amount)}
              </span>
            </div>
          </div>
          <p className="mt-1 text-xs text-[#44474e] leading-snug line-clamp-2">
            {record.anomaly_reason}
          </p>
        </div>

        <ChevronRightIcon />
      </button>

      {/* Expanded Detail */}
      {expanded && (
        <div className="border-t border-[#e5eeff] px-4 py-3 bg-[#f8f9ff]">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
            <DetailRow label="NIT/DUI" value={record.nit_dui} />
            <DetailRow label="Tipo Doc." value={record.document_type} />
            <DetailRow label="Transacción" value={record.transaction_type} />
            <DetailRow label="Fecha" value={record.transaction_date} />
            <DetailRow label="IVA Declarado" value={fmt(record.iva_amount)} mono />
            <DetailRow label="Retención" value={`${fmt(record.retention_amount)} (${record.retention_percentage}%)`} mono />
            <DetailRow label="Estado" value={record.status} />
          </div>

          {/* XAI Insight Box */}
          <div className="mt-3 p-3 rounded bg-amber-50 border border-amber-200 flex gap-2">
            <div className="flex-shrink-0 text-amber-600 mt-0.5">
              <AlertTriangleIcon />
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-800 mb-0.5">Insight del Motor IA</p>
              <p className="text-xs text-amber-700 leading-relaxed">{record.anomaly_reason}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div>
      <span className="text-[#75777f] font-medium">{label}: </span>
      <span className={`text-[#0b1c30] ${mono ? "font-mono tabular-nums" : ""}`}>{value}</span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

interface AnomalyAlertPanelProps {
  token: string;
}

export function AnomalyAlertPanel({ token }: AnomalyAlertPanelProps) {
  const [records, setRecords] = useState<AnomalyRecord[]>([]);
  const [summary, setSummary] = useState<AnomalySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "ALTO" | "MEDIO" | "BAJO">("ALL");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listRes, summaryRes] = await Promise.all([
        fetch(`${API_BASE}/ai/anomalies?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`, { headers }),
        fetch(`${API_BASE}/ai/anomalies/summary`, { headers }),
      ]);

      if (!listRes.ok) throw new Error(`HTTP ${listRes.status}`);
      if (!summaryRes.ok) throw new Error(`HTTP ${summaryRes.status}`);

      const listData = await listRes.json();
      const summaryData = await summaryRes.json();

      setRecords(listData.data || []);
      setSummary(summaryData.data || null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, page]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch(`${API_BASE}/ai/anomalies/refresh`, { method: "POST", headers });
      setPage(0);
      await fetchData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al refrescar");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = filter === "ALL" ? records : records.filter((r) => r.risk_level === filter);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* Panel Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-amber-100 text-amber-700">
            <AlertTriangleIcon />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#031636] leading-none">
              Alertas de IA — Anomalías Tributarias
            </h2>
            <p className="text-[11px] text-[#75777f] mt-0.5">
              Motor de detección basado en Isolation Forest · F07 / F14
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md
            bg-[#031636] text-white hover:bg-[#1a2b4c] disabled:opacity-50
            transition-colors border border-[#031636]"
        >
          <RefreshIcon spinning={refreshing} />
          {refreshing ? "Analizando..." : "Re-escanear"}
        </button>
      </div>

      {/* KPI Bar */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryKPI
            label="Anomalías detectadas"
            value={summary.total_anomalous}
            sub={`${summary.anomaly_rate_pct}% del total válido`}
          />
          <SummaryKPI
            label="Monto en revisión"
            value={fmt(summary.anomalous_amount_total)}
            sub="Suma acumulada de registros anómalos"
          />
          <SummaryKPI
            label="Registros analizados"
            value={summary.total_valid_records.toLocaleString("es-SV")}
            sub="Solo registros con status = Válido"
          />
          <SummaryKPI
            label="Reglas activas"
            value={summary.by_reason.length}
            sub="Motivos de anomalía distintos detectados"
          />
        </div>
      )}

      {/* Risk Filter Tabs */}
      <div className="flex gap-1.5 border-b border-[#dce9ff] pb-2">
        {(["ALL", "ALTO", "MEDIO", "BAJO"] as const).map((lvl) => {
          const count =
            lvl === "ALL"
              ? records.length
              : records.filter((r) => r.risk_level === lvl).length;
          return (
            <button
              key={lvl}
              onClick={() => setFilter(lvl)}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all
                ${filter === lvl
                  ? "bg-[#031636] text-white"
                  : "text-[#44474e] hover:bg-[#e5eeff]"
                }`}
            >
              {lvl === "ALL" ? "Todos" : lvl} ({count})
            </button>
          );
        })}
        <span className="ml-auto flex items-center gap-1 text-[11px] text-[#75777f]">
          <ShieldIcon />
          Modelo v1.0
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchData} />
      ) : filtered.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((record) => (
            <AnomalyCard
              key={record.id}
              record={record}
              expanded={expandedId === record.id}
              onToggle={() => setExpandedId(expandedId === record.id ? null : record.id)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && (summary?.total_anomalous ?? 0) > PAGE_SIZE && (
        <div className="flex items-center justify-between text-xs text-[#44474e] pt-2 border-t border-[#dce9ff]">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 rounded border border-[#dce9ff] hover:bg-[#eff4ff] disabled:opacity-40 font-medium"
          >
            ← Anterior
          </button>
          <span className="font-mono">Página {page + 1}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={(page + 1) * PAGE_SIZE >= (summary?.total_anomalous ?? 0)}
            className="px-3 py-1.5 rounded border border-[#dce9ff] hover:bg-[#eff4ff] disabled:opacity-40 font-medium"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}

// ── State Components ───────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-2 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-16 bg-[#e5eeff] rounded-lg" />
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <div className="p-3 rounded-full bg-[#ffdad6] text-[#93000a]">
        <AlertTriangleIcon />
      </div>
      <p className="text-sm font-semibold text-[#031636]">Error al cargar anomalías</p>
      <p className="text-xs text-[#44474e]">{message}</p>
      <button
        onClick={onRetry}
        className="mt-1 px-4 py-1.5 text-xs font-semibold rounded-md bg-[#031636] text-white hover:bg-[#1a2b4c]"
      >
        Reintentar
      </button>
    </div>
  );
}

function EmptyState({ filter }: { filter: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <div className="p-3 rounded-full bg-[#e5eeff] text-[#006b5f]">
        <ShieldIcon />
      </div>
      <p className="text-sm font-semibold text-[#031636]">
        {filter === "ALL" ? "Sin anomalías detectadas" : `Sin anomalías de riesgo ${filter}`}
      </p>
      <p className="text-xs text-[#75777f]">
        El motor IA no encontró irregularidades en los registros tributarios.
      </p>
    </div>
  );
}
