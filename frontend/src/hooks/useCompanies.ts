"use client";

import { useCallback, useEffect, useState } from "react";

import type { Company } from "@/types/companyTypes";
import type { DashboardUserProfile } from "@/hooks/useDashboardSession";
import { fetchWithAuth } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { supabase } from "@/lib/supabaseClient";

interface CompanyRow {
  id: unknown;
  tenant_id: unknown;
  user_id: unknown;
  name: unknown;
  nit: unknown;
  created_at: unknown;
  updated_at: unknown;
  status?: unknown;
  total_records?: unknown;
  last_processed_month?: unknown;
}

function mapCompany(row: CompanyRow): Company {
  const status =
    row.status === "pending" || row.status === "error"
      ? row.status
      : "active";
  return {
    id: String(row.id),
    tenant_id: String(row.tenant_id),
    user_id: String(row.user_id),
    name: String(row.name),
    nit: String(row.nit),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    status,
    totalRecords:
      typeof row.total_records === "number" ? row.total_records : 0,
    lastProcessedMonth:
      typeof row.last_processed_month === "string"
        ? row.last_processed_month
        : undefined,
  };
}

export function useCompanies(
  profile: DashboardUserProfile | null,
  refreshTrigger: number,
) {
  const [companiesList, setCompaniesList] = useState<Company[]>([]);

  const loadCompanies = useCallback(async (): Promise<void> => {
    if (!profile) {
      return;
    }
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .order("name");
    if (error) {
      throw error;
    }
    setCompaniesList((data ?? []).map((row) => mapCompany(row as CompanyRow)));
  }, [profile]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => void loadCompanies().catch(() => undefined),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [loadCompanies, refreshTrigger]);

  async function addCompany(name: string, nit: string): Promise<void> {
    if (!profile?.tenant_id || !profile.id) {
      throw new Error("No se pudo identificar el perfil o tenant.");
    }
    try {
      const { data, error } = await supabase
        .from("companies")
        .insert([
          {
            tenant_id: profile.tenant_id,
            user_id: profile.id,
            name,
            nit,
          },
        ])
        .select()
        .single();
      if (error) {
        throw error;
      }
      if (data) {
        setCompaniesList((current) => [
          mapCompany(data as CompanyRow),
          ...current,
        ]);
      }
    } catch (error: unknown) {
      throw new Error(
        getErrorMessage(error, "No se pudo registrar la empresa."),
      );
    }
  }

  async function resetCompany(company: Company): Promise<void> {
    await fetchWithAuth(`/financial/company/${company.id}/records`, {
      method: "DELETE",
    });
    setCompaniesList((current) =>
      current.map((item) =>
        item.id === company.id
          ? { ...item, totalRecords: 0, lastProcessedMonth: undefined }
          : item,
      ),
    );
  }

  return {
    companiesList,
    addCompany,
    resetCompany,
  };
}
