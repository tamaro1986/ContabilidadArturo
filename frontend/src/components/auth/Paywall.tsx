"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface PaywallProps {
  tenantId: string;
  onSuccess: () => void;
}

export default function Paywall({ tenantId, onSuccess }: PaywallProps) {
  const [promoCode, setPromoCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // 1. Validate promo code
      const { data: codeData, error: codeError } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', promoCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (codeError || !codeData) {
        throw new Error('Código inválido o expirado.');
      }

      if (codeData.tenant_id && codeData.tenant_id !== tenantId) {
        throw new Error('Este código no pertenece a esta empresa.');
      }

      // 2. Update tenant trial_ends_at
      const { error: updateError } = await supabase
        .from('tenants')
        .update({ 
          trial_ends_at: new Date(Date.now() + codeData.days_granted * 24 * 60 * 60 * 1000).toISOString() 
        })
        .eq('id', tenantId);

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Error al aplicar el código.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-125 h-125 bg-emerald-500/10 rounded-full blur-[120px] -mr-48 -mt-48" />
      <div className="absolute bottom-0 left-0 w-100 h-100 bg-blue-600/10 rounded-full blur-[100px] -ml-32 -mb-32" />

      <div className="max-w-xl w-full bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-10 lg:p-16 shadow-2xl relative z-10 text-center animate-in fade-in zoom-in-95 duration-700">
        <div className="w-20 h-20 bg-linear-to-br from-emerald-400 to-emerald-600 rounded-3xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 mx-auto mb-8 rotate-3">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>

        <h1 className="text-4xl font-black text-white tracking-tight mb-4 uppercase">Periodo de Prueba Finalizado</h1>
        <p className="text-zinc-400 text-lg font-medium mb-12">
          Su acceso a <span className="text-emerald-400 font-bold">Integrum Premium</span> ha expirado. 
          Suscríbase hoy para continuar transformando su gestión fiscal.
        </p>

        <div className="grid grid-cols-1 gap-6 mb-12">
            <button className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 transition-all scale-105 active:scale-100">
                Ver Planes de Suscripción
            </button>
            <div className="h-px bg-white/10 w-full" />
        </div>

        <form onSubmit={handleApplyPromo} className="space-y-4">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-4">¿Tiene un código de activación?</p>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="INGRESE SU CÓDIGO"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold tracking-widest focus:border-emerald-500 outline-none transition-all uppercase placeholder:text-zinc-700"
              required
            />
            <button 
              type="submit"
              disabled={isLoading || !promoCode}
              className={`px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all ${
                isLoading || !promoCode ? 'bg-zinc-800 text-zinc-500' : 'bg-white text-zinc-900 hover:bg-emerald-500 hover:text-white'
              }`}
            >
              {isLoading ? '...' : 'Aplicar'}
            </button>
          </div>
          {error && <p className="text-red-500 text-[10px] font-bold uppercase mt-2 animate-bounce">{error}</p>}
          {success && (
            <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em]">
                ¡Código Aplicado! Reiniciando Acceso...
            </div>
          )}
        </form>

        <div className="mt-16 pt-8 border-t border-white/5">
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">¿Necesita ayuda? Contacte a soporte</p>
            <p className="text-zinc-500 font-bold mt-2">garcia.integrum1@gmail.com</p>
        </div>
      </div>
    </div>
  );
}
