"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabaseClient";
import { fetchWithAuth } from "@/lib/api";

export interface DashboardTenant {
  name?: string;
  trial_ends_at: string;
}

export interface DashboardUserProfile {
  id: string;
  tenant_id: string;
  role: string;
  full_name?: string;
  tenants?: DashboardTenant;
}

export function useDashboardSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] =
    useState<DashboardUserProfile | null>(null);
  const [isTrialExpired, setIsTrialExpired] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSession(): Promise<void> {
      try {
        // 1. Intentar cargar sesión vía /auth/me en el backend nativo del VPS
        let meData: { id: string; email: string; full_name?: string; role?: string; tenant_id?: string; trial_ends_at?: string } | null = null;
        try {
          const res = await fetchWithAuth('/auth/me');
          if (res.ok) {
            meData = await res.json();
          }
        } catch {
          // Fallback silencioso a supabase si no respondió
        }

        if (meData && !cancelled) {
          const isMasterAdmin =
            meData.email?.toLowerCase() === "garcia.integrum1@gmail.com";
          const localToken = typeof window !== "undefined" ? window.localStorage.getItem("access_token") : "";
          const mockSession = {
            access_token: localToken || "",
            token_type: "bearer",
            user: { id: meData.id, email: meData.email } as unknown,
          } as Session;

          setSession(mockSession);
          setIsAdmin(isMasterAdmin || meData.role === "administrador");
          setUserProfile({
            id: String(meData.id),
            tenant_id: String(meData.tenant_id),
            role: meData.role || "cliente",
            full_name: meData.full_name || "Usuario",
            tenants: {
              name: "Integrum Firma Contable",
              trial_ends_at: meData.trial_ends_at || new Date(Date.now() + 86400000 * 365).toISOString(),
            },
          });
          setLoading(false);
          return;
        }

        const {
          data: { session: currentSession },
          error: sessionError,
        } = await supabase.auth.getSession();
        if (sessionError || !currentSession) {
          if (typeof window !== "undefined") {
            window.location.assign("/login");
          }
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("user_profiles")
          .select("id, tenant_id, role, full_name, tenants(name, trial_ends_at)")
          .eq("id", currentSession.user.id)
          .single();
        if (cancelled) {
          return;
        }

        const isMasterAdmin =
          currentSession.user.email?.toLowerCase() ===
          "garcia.integrum1@gmail.com";
        setSession(currentSession);
        setIsAdmin(isMasterAdmin || profile?.role === "administrador");

        if (profileError || !profile) {
          if (!isMasterAdmin) {
            setError(
              "Su perfil no ha sido inicializado correctamente. Contacte a soporte.",
            );
          }
          return;
        }

        const tenant = Array.isArray(profile.tenants)
          ? profile.tenants[0]
          : profile.tenants;
        const normalizedProfile: DashboardUserProfile = {
          id: String(profile.id),
          tenant_id: String(profile.tenant_id),
          role: String(profile.role),
          full_name:
            typeof profile.full_name === "string"
              ? profile.full_name
              : undefined,
          tenants:
            tenant && typeof tenant.trial_ends_at === "string"
              ? {
                  name:
                    typeof tenant.name === "string" ? tenant.name : undefined,
                  trial_ends_at: tenant.trial_ends_at,
                }
              : undefined,
        };
        setUserProfile(normalizedProfile);
        if (normalizedProfile.tenants?.trial_ends_at) {
          setIsTrialExpired(
            new Date(normalizedProfile.tenants.trial_ends_at) < new Date(),
          );
        }
      } catch {
        if (!cancelled) {
          setError("No se pudo cargar la sesión.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSession();
    return () => {
      cancelled = true;
    };
  }, []);

  async function logout(): Promise<void> {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("access_token");
    }
    try {
      await supabase.auth.signOut();
    } catch {}
    if (typeof window !== "undefined") {
      window.location.assign("/login");
    }
  }

  return {
    session,
    userProfile,
    isTrialExpired,
    isAdmin,
    loading,
    error,
    logout,
  };
}
