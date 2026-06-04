"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { fetchWithAuth } from '@/lib/api';

export default function MembershipPanel({ trialEndsAt, tenantId, onRefresh }: { trialEndsAt: string, tenantId: string, onRefresh: () => void }) {
    const [couponCode, setCouponCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const isExpired = new Date(trialEndsAt) < new Date();

    const handleApplyCoupon = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccessMsg(null);

        try {
            const res = await fetchWithAuth('/tenant/apply-coupon', {
                method: 'POST',
                body: JSON.stringify({ code: couponCode }),
            });
            const data = await res.json();
            
            setSuccessMsg(data.message || 'Cupón aplicado exitosamente.');
            setCouponCode('');
            
            // Refrescar el estado global
            setTimeout(() => {
                onRefresh();
            }, 2000);
            
        } catch (err: any) {
            setError(err.message || 'Error al aplicar el cupón.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white border border-zinc-200 rounded-[2.5rem] p-10 shadow-xl max-w-2xl mx-auto">
            <h3 className="text-xl font-black text-zinc-900 mb-8 tracking-tight flex items-center gap-3 uppercase">
                <div className={`w-1.5 h-6 rounded-full ${isExpired ? 'bg-red-500' : 'bg-emerald-500'}`} />
                Estado de Membresía
            </h3>

            <div className={`p-6 rounded-2xl mb-8 flex items-center justify-between border ${isExpired ? 'bg-red-50/50 border-red-100' : 'bg-emerald-50/50 border-emerald-100'}`}>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Vencimiento</p>
                    <p className={`text-2xl font-black ${isExpired ? 'text-red-600' : 'text-emerald-600'}`}>
                        {new Date(trialEndsAt).toLocaleDateString()}
                    </p>
                </div>
                <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${isExpired ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                    {isExpired ? 'Expirada' : 'Activa'}
                </div>
            </div>

            <form onSubmit={handleApplyCoupon} className="space-y-4">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-4">¿Tiene un código de renovación?</p>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="EJ. INTEGRUM2026"
                        className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 font-bold tracking-widest focus:border-emerald-500 outline-none transition-all uppercase placeholder:text-zinc-400"
                        required
                    />
                    <button 
                        type="submit"
                        disabled={isLoading || !couponCode}
                        className={`px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all ${
                            isLoading || !couponCode ? 'bg-zinc-200 text-zinc-400' : 'bg-zinc-900 text-white hover:bg-emerald-500 shadow-lg shadow-zinc-900/10 hover:shadow-emerald-500/20'
                        }`}
                    >
                        {isLoading ? '...' : 'Aplicar'}
                    </button>
                </div>
                {error && <p className="text-red-500 text-[10px] font-bold uppercase mt-2">{error}</p>}
                {successMsg && <p className="text-emerald-600 text-[10px] font-bold uppercase mt-2">{successMsg}</p>}
            </form>
        </div>
    );
}
