"use client";

import { useState } from "react";
import { fetchWithAuth } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

interface InviteResult {
    email: string;
    full_name: string;
    role: string;
    temp_password: string;
    login_url: string;
}

export default function UserInvitationForm() {
    const [email, setEmail] = useState("");
    const [fullName, setFullName] = useState("");
    const [role, setRole] = useState("cliente");
    const [tempPassword, setTempPassword] = useState("");
    const [autoPassword, setAutoPassword] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successData, setSuccessData] = useState<InviteResult | null>(null);
    const [copied, setCopied] = useState(false);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await fetchWithAuth("/auth/invite", {
                method: "POST",
                body: JSON.stringify({
                    email,
                    full_name: fullName,
                    role,
                    temp_password: autoPassword ? undefined : tempPassword,
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.detail || "Error al procesar la invitación");
            }

            const currentOrigin = typeof window !== "undefined" && window.location.origin ? window.location.origin : "";
            const computedLoginUrl = currentOrigin
                ? `${currentOrigin}/login`
                : (data.login_url && !data.login_url.includes("localhost")
                    ? data.login_url
                    : "https://contabilidad.51-161-114-131.sslip.io/login");

            setSuccessData({
                email: data.email,
                full_name: data.full_name,
                role: data.role,
                temp_password: data.temp_password,
                login_url: computedLoginUrl,
            });

            setEmail("");
            setFullName("");
            setTempPassword("");
        } catch (err: unknown) {
            setError(getErrorMessage(err, "No fue posible conectar con el servidor."));
        } finally {
            setLoading(false);
        }
    };

    const handleCopyWhatsApp = () => {
        if (!successData) return;
        const msg = `Hola ${successData.full_name}, te comparto tus credenciales de acceso a la plataforma Garcia Integrum:

🔗 Enlace de acceso: ${successData.login_url}
👤 Usuario: ${successData.email}
🔑 Contraseña temporal: ${successData.temp_password}

(Por favor ingresa y actualiza tu contraseña en tu primer acceso).`;

        navigator.clipboard.writeText(msg);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
    };

    return (
        <div className="max-w-2xl mx-auto bg-white border border-zinc-200 rounded-4xl p-8 sm:p-10 shadow-xl">
            <div className="mb-8">
                <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Expandir Ecosistema</h2>
                <p className="text-zinc-500 text-sm font-medium mt-1">
                    Brinde acceso a sus clientes o contadores. Se generará una clave temporal que podrá compartirles directamente por WhatsApp o correo.
                </p>
            </div>

            {successData ? (
                <div className="space-y-6 animate-fadeIn">
                    <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-3xl space-y-4">
                        <div className="flex items-center gap-3 text-emerald-800">
                            <span className="flex h-3 w-3 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                            </span>
                            <h3 className="font-black text-sm uppercase tracking-wider">¡Acceso Creado Exitosamente!</h3>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-emerald-100 space-y-3 text-xs">
                            <div className="flex justify-between items-center py-1 border-b border-zinc-100">
                                <span className="text-zinc-400 font-bold uppercase">Nombre:</span>
                                <span className="font-black text-zinc-800">{successData.full_name}</span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-zinc-100">
                                <span className="text-zinc-400 font-bold uppercase">Correo / Usuario:</span>
                                <span className="font-mono font-bold text-zinc-800">{successData.email}</span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-zinc-100">
                                <span className="text-zinc-400 font-bold uppercase">Rol Asignado:</span>
                                <span className="font-black text-emerald-600 uppercase">{successData.role}</span>
                            </div>
                            <div className="flex justify-between items-center py-1 bg-emerald-50/50 p-2 rounded-lg">
                                <span className="text-emerald-700 font-black uppercase">Clave Temporal:</span>
                                <span className="font-mono font-black text-emerald-800 text-sm">{successData.temp_password}</span>
                            </div>
                        </div>

                        <div className="pt-2 flex flex-col sm:flex-row gap-3">
                            <button
                                type="button"
                                onClick={handleCopyWhatsApp}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
                                {copied ? "¡Mensaje Copiado!" : "Copiar mensaje para WhatsApp"}
                            </button>
                            <button
                                type="button"
                                onClick={() => setSuccessData(null)}
                                className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs py-3.5 px-5 rounded-xl transition-all"
                            >
                                Invitar a otro usuario
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleInvite} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Nombre Completo</label>
                            <input 
                                type="text" 
                                required
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Ej: Roberto Jiménez"
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
                            <option value="cliente">Cliente (Solo Lectura / Reportes y Declaraciones)</option>
                            <option value="contador">Contador (Gestión Total del Tenant)</option>
                        </select>
                    </div>

                    <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-zinc-700 cursor-pointer flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={autoPassword}
                                    onChange={(e) => setAutoPassword(e.target.checked)}
                                    className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                                />
                                Generar contraseña temporal automáticamente
                            </label>
                            <span className="text-[10px] font-mono text-zinc-400 uppercase">Ej: Integrum#8472</span>
                        </div>

                        {!autoPassword && (
                            <div className="space-y-1 pt-2">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Contraseña Personalizada (Mínimo 6 caracteres)</label>
                                <input
                                    type="text"
                                    required={!autoPassword}
                                    minLength={6}
                                    value={tempPassword}
                                    onChange={(e) => setTempPassword(e.target.value)}
                                    placeholder="Escribe una contraseña temporal..."
                                    className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-mono font-bold text-zinc-900"
                                />
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="p-4 rounded-xl text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white font-black uppercase tracking-widest py-4 rounded-xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-3 cursor-pointer"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg>
                                Generar Acceso con Clave Temporal
                            </>
                        )}
                    </button>
                </form>
            )}
        </div>
    );
}
