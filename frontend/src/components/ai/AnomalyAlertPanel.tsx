"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

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
    badge: "bg-error/10 text-error border border-error/20",
    dot: "bg-error",
    ring: "ring-error/20",
    label: "Riesgo Alto",
  },
  MEDIO: {
    badge: "bg-warning-container text-on-warning-container border border-warning/20",
    dot: "bg-warning",
    ring: "ring-warning/20",
    label: "Riesgo Medio",
  },
  BAJO: {
    badge: "bg-surface-container text-primary border border-outline-variant",
    dot: "bg-primary",
    ring: "ring-primary/10",
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
    <div className="flex flex-col gap-0.5 p-4 bg-surface-container-lowest rounded-lg border border-outline-variant shadow-sm transition-all hover:border-secondary/30">
      <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{label}</span>
      <span className="text-2xl font-black text-primary tracking-tight font-tnum">{value}</span>
      {sub && <span className="text-[10px] text-outline font-medium">{sub}</span>}
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
      className={`rounded-lg border bg-surface-container-lowest transition-all duration-200 overflow-hidden
        ${expanded ? `ring-2 ${cfg.ring} ring-offset-1` : "border-surface-container-high"} hover:border-primary/30 shadow-sm`}
    >
      {/* Card Header — always visible */}
      <button
        onClick={onToggle}
        className="w-full text-left flex items-start gap-4 px-5 py-4 hover:bg-surface-container-low transition-colors"
      >
        {/* Risk indicator bar */}
        <div className={`mt-1.5 w-1 h-8 rounded-full shrink-0 ${cfg.dot}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-1">
            <span className="font-bold text-sm text-on-surface tracking-tight truncate">
              {record.customer_name || record.client_id}
            </span>
            <div className="flex items-center gap-3">
              <RiskBadge level={record.risk_level} />
              <span className="font-black text-sm text-primary tabular-nums font-tnum">
                {fmt(record.amount)}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-on-surface-variant leading-relaxed line-clamp-1 font-medium">
            {record.anomaly_reason}
          </p>
        </div>

        <div className={`transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}>
           <ChevronRightIcon />
        </div>
      </button>

      {/* Expanded Detail */}
      {expanded && (
        <div className="border-t border-outline-variant px-4 py-4 bg-surface-container-low">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-xs">
            <DetailRow label="NIT/DUI" value={record.nit_dui} />
            <DetailRow label="Tipo Doc." value={record.document_type} />
            <DetailRow label="Transacción" value={record.transaction_type} />
            <DetailRow label="Fecha" value={record.transaction_date} />
            <DetailRow label="IVA Declarado" value={fmt(record.iva_amount)} mono />
            <DetailRow label="Retención" value={`${fmt(record.retention_amount)} (${record.retention_percentage}%)`} mono />
            <DetailRow label="Estado" value={record.status} />
          </div>

          {/* XAI Insight Box */}
          <div className="mt-5 p-4 rounded-lg bg-warning-container border border-warning/20 flex gap-3">
            <div className="shrink-0 text-warning mt-0.5">
              <AlertTriangleIcon />
            </div>
            <div>
              <p className="text-[10px] font-bold text-on-warning-container mb-1 uppercase tracking-wider">Insight del Motor IA</p>
              <p className="text-xs text-on-warning-container/80 leading-relaxed font-medium">{record.anomaly_reason}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-outline text-[10px] font-bold uppercase tracking-wider">{label}</span>
      <span className={`text-on-surface text-xs font-semibold ${mono ? "font-tnum tabular-nums" : ""}`}>{value}</span>
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

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" }), [token]);

  const fetchData = useCallback(async (isMounted = true) => {
    if (isMounted) {
      setLoading(true);
      setError(null);
    }
    try {
      const [listRes, summaryRes] = await Promise.all([
        fetch(`${API_BASE}/ai/anomalies?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`, { headers }),
        fetch(`${API_BASE}/ai/anomalies/summary`, { headers }),
      ]);

      if (!listRes.ok) throw new Error(`HTTP ${listRes.status}`);
      if (!summaryRes.ok) throw new Error(`HTTP ${summaryRes.status}`);

      const listData = await listRes.json();
      const summaryData = await summaryRes.json();

      if (isMounted) {
        setRecords(listData.data || []);
        setSummary(summaryData.data || null);
      }
    } catch (e: unknown) {
      if (isMounted) {
        setError(e instanceof Error ? e.message : "Error desconocido");
      }
    } finally {
      if (isMounted) setLoading(false);
    }
  }, [headers, page]);

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

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      fetchData(isMounted);
    }, 0);
    return () => { 
      isMounted = false; 
      clearTimeout(timer);
    };
  }, [fetchData]);

  const filtered = filter === "ALL" ? records : records.filter((r) => r.risk_level === filter);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* Panel Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-warning-container text-warning border border-warning/20">
            <AlertTriangleIcon />
          </div>
          <div>
            <h2 className="text-xs font-black text-primary uppercase tracking-widest leading-none">
              Alertas de IA — Anomalías Tributarias
            </h2>
            <p className="text-[10px] text-on-surface-variant font-bold mt-1 uppercase tracking-tighter opacity-70">
              Motor de detección basado en Isolation Forest · F07 / F14
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="flex items-center gap-2 px-5 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg
            bg-primary text-on-primary hover:bg-primary-container disabled:opacity-50
            transition-all shadow-sm border border-primary/10"
        >
          <RefreshIcon spinning={refreshing} />
          {refreshing ? "Analizando..." : "Re-escanear Base"}
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
      <div className="flex gap-2 border-b border-surface-container-high pb-3">
        {(["ALL", "ALTO", "MEDIO", "BAJO"] as const).map((lvl) => {
          const count =
            lvl === "ALL"
              ? records.length
              : records.filter((r) => r.risk_level === lvl).length;
          return (
            <button
              key={lvl}
              onClick={() => setFilter(lvl)}
              className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all
                ${filter === lvl
                  ? "bg-primary text-on-primary shadow-md"
                  : "text-on-surface-variant hover:bg-surface-container hover:text-primary"
                }`}
            >
              {lvl === "ALL" ? "Todos" : lvl} ({count})
            </button>
          );
        })}
        <span className="ml-auto flex items-center gap-1 text-[10px] font-bold text-outline uppercase tracking-widest">
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
        <div className="flex items-center justify-between text-xs text-on-surface-variant pt-4 border-t border-outline-variant">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-4 py-2 rounded-lg border border-outline-variant hover:bg-surface-container-low disabled:opacity-40 font-bold uppercase text-[10px] tracking-widest transition-all"
          >
            ← Anterior
          </button>
          <span className="font-mono font-bold">Página {page + 1}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={(page + 1) * PAGE_SIZE >= (summary?.total_anomalous ?? 0)}
            className="px-4 py-2 rounded-lg border border-outline-variant hover:bg-surface-container-low disabled:opacity-40 font-bold uppercase text-[10px] tracking-widest transition-all"
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
        <div key={i} className="h-16 bg-surface-container rounded-lg" />
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <div className="p-3 rounded-full bg-error/10 text-error border border-error/20">
        <AlertTriangleIcon />
      </div>
      <p className="text-sm font-bold text-primary uppercase tracking-wider">Error al cargar anomalías</p>
      <p className="text-xs text-on-surface-variant font-medium">{message}</p>
      <button
        onClick={onRetry}
        className="mt-2 px-6 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg bg-primary text-on-primary hover:bg-primary-container transition-all"
      >
        Reintentar
      </button>
    </div>
  );
}

function EmptyState({ filter }: { filter: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <div className="p-4 rounded-full bg-surface-container text-secondary border border-outline-variant shadow-inner">
        <ShieldIcon />
      </div>
      <div>
        <p className="text-sm font-black text-primary uppercase tracking-widest">
          {filter === "ALL" ? "Sin anomalías detectadas" : `Sin anomalías de riesgo ${filter}`}
        </p>
        <p className="text-xs text-on-surface-variant font-medium mt-2 max-w-xs mx-auto leading-relaxed">
          El motor IA no encontró irregularidades en los registros tributarios analizados.
        </p>
      </div>
    </div>
  );
}
