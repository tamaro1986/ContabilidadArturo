export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          created_at: string
          trial_ends_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          trial_ends_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          trial_ends_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          tenant_id: string
          email: string
          full_name: string | null
          role: string
          created_at: string
        }
        Insert: {
          id: string
          tenant_id: string
          email: string
          full_name?: string | null
          role?: string
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          email?: string
          full_name?: string | null
          role?: string
          created_at?: string
        }
      }
      promo_codes: {
        Row: {
          id: string
          code: string
          tenant_id: string | null
          days_granted: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          tenant_id?: string | null
          days_granted?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          tenant_id?: string | null
          days_granted?: number
          is_active?: boolean
          created_at?: string
        }
      }
      companies: {
        Row: {
          id: string
          tenant_id: string
          user_id: string
          name: string
          nit: string
          status: string
          last_processed_month: string | null
          total_records: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id: string
          name: string
          nit: string
          status?: string
          last_processed_month?: string | null
          total_records?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string
          name?: string
          nit?: string
          status?: string
          last_processed_month?: string | null
          total_records?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
