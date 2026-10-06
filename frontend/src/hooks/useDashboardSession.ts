"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabaseClient";

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
    await supabase.auth.signOut();
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
