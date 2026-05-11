"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function SetPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Supabase Auth usually sends an access_token in the URL fragment (#) 
    // when clicking an invitation link. The Supabase client handles this automatically
    // when it initializes and detects the fragment.

    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Las contraseñas no coinciden.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            // Password updated successfully, redirect to dashboard
            router.push("/dashboard");
        } catch (err: any) {
            setError(err.message || "Error al actualizar la contraseña");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6">
            <div className="max-w-md w-full space-y-8 bg-zinc-900 border border-white/10 p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-blue-500 to-indigo-600" />
                
                <div className="text-center">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-blue-600/20">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Activar Cuenta</h1>
                    <p className="text-zinc-400 text-sm mt-2 font-medium">Establezca su contraseña para acceder al portal.</p>
                </div>

                <form onSubmit={handleSetPassword} className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Nueva Contraseña</label>
                            <input 
                                type="password" 
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold"
                                placeholder="••••••••"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Confirmar Contraseña</label>
                            <input 
                                type="password" 
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold">
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white font-black uppercase tracking-widest py-4 rounded-xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            "Completar Registro"
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function SetPasswordPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <SetPasswordContent />
        </Suspense>
    );
}
