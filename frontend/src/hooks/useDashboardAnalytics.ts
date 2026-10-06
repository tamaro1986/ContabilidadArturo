"use client";

import { useEffect, useState } from "react";

import type { TrendData, BreakdownData, TaxData } from "@/types/analytics";
import type { CustomerRecord } from "@/types/customerAnalysis";
import type { SupplierRecord } from "@/types/supplierAnalysis";
import { fetchWithAuth } from "@/lib/api";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function fetchData<T>(endpoint: string): Promise<T> {
  const response = await fetchWithAuth(endpoint);
  const payload: unknown = await response.json();
  if (!isRecord(payload) || !("data" in payload)) {
    throw new Error("Respuesta de API inválida.");
  }
  return payload.data as T;
}

export function useDashboardAnalytics(
  enabled: boolean,
  refreshTrigger: number,
) {
  const [trendsData, setTrendsData] = useState<TrendData[]>([]);
  const [typesData, setTypesData] = useState<{
    ventas: BreakdownData[];
    gastos: BreakdownData[];
  } | null>(null);
  const [taxData, setTaxData] = useState<TaxData | null>(null);
  const [customerData, setCustomerData] = useState<CustomerRecord[]>([]);
  const [supplierData, setSupplierData] = useState<SupplierRecord[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let cancelled = false;

    async function loadAnalytics(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        let year = selectedYear;
        const years = await fetchData<number[]>("/analytics/years");
        if (cancelled) {
          return;
        }
        setAvailableYears(years);
        if (!year && years.length > 0) {
          year = years[0];
          setSelectedYear(year);
        }
        const query = year ? `?year=${year}` : "";
        const [
          trends,
          breakdown,
          liquidation,
          topEntities,
          health,
          customers,
          suppliers,
        ] = await Promise.all([
          fetchData<TrendData[]>(`/analytics/financial-trends${query}`),
          fetchData<{ ventas: BreakdownData[]; gastos: BreakdownData[] }>(
            `/analytics/types-breakdown${query}`,
          ),
          fetchData<TaxData["liquidation"]>(
            `/analytics/tax-summary/iva-liquidation${query}`,
          ),
          fetchData<TaxData["topEntities"]>(
            `/analytics/tax-summary/top-entities${query}`,
          ),
          fetchData<TaxData["health"]>(
            `/analytics/tax-summary/document-health${query}`,
          ),
          fetchData<CustomerRecord[]>(`/analytics/rfm${query}`),
          fetchData<SupplierRecord[]>(`/analytics/supplier-rfm${query}`),
        ]);
        if (cancelled) {
          return;
        }
        setTrendsData(trends ?? []);
        setTypesData(breakdown ?? { ventas: [], gastos: [] });
        setTaxData({ liquidation, topEntities, health });
        setCustomerData(customers ?? []);
        setSupplierData(suppliers ?? []);
      } catch {
        if (!cancelled) {
          setError("Error al cargar los datos del ecosistema.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAnalytics();
    return () => {
      cancelled = true;
    };
  }, [enabled, refreshTrigger, selectedYear]);

  return {
    trendsData,
    typesData,
    taxData,
    customerData,
    supplierData,
    availableYears,
    selectedYear,
    setSelectedYear,
    loading,
    error,
  };
}
