"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface UserInvitationFormProps {
    token: string;
}

export default function UserInvitationForm({ token }: UserInvitationFormProps) {
    const [email, setEmail] = useState("");
    const [fullName, setFullName] = useState("");
    const [role, setRole] = useState("cliente");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
            const response = await fetch(`${API_URL}/auth/invite`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    email,
                    full_name: fullName,
                    role
                })
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.detail || "Error al enviar la invitación");

            setMessage({ type: 'success', text: "Invitación enviada exitosamente. El usuario recibirá un correo para configurar su contraseña." });
            setEmail("");
            setFullName("");
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto bg-white border border-zinc-200 rounded-4xl p-10 shadow-xl">
            <div className="mb-8">
                <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Expandir Ecosistema</h2>
                <p className="text-zinc-500 text-sm font-medium mt-1">
                    Invite a sus clientes a la plataforma. Tendrán acceso restringido y solo podrán ver los datos de sus empresas vinculadas.
                </p>
            </div>

            <form onSubmit={handleInvite} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Nombre Completo</label>
                        <input 
                            type="text" 
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Ej: Roberto Jimenez"
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold text-zinc-900"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Correo Electrónico</label>
                        <input 
                            type="email" 
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="cliente@ejemplo.com"
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold text-zinc-900"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Rol de Acceso</label>
                    <select 
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold text-zinc-900"
                    >
                        <option value="cliente">Cliente (Solo Lectura / Reportes)</option>
                        <option value="contador">Contador (Gestión Total del Tenant)</option>
                    </select>
                </div>

                {message && (
                    <div className={`p-4 rounded-xl text-xs font-bold ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        {message.text}
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
                        <>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg>
                            Enviar Invitación de Acceso
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
