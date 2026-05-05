'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
// ── Inline SVG Icons ───────────────────────────────────────────────────────────
const ShieldCheck = ({ size = 32, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
);
const Mail = ({ size = 20, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
);
const Lock = ({ size = 20, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
);
const Loader2 = ({ size = 20, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);
const ArrowRight = ({ size = 18, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
);
const Building2 = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>
);
const User = ({ size = 20, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [tenantName, setTenantName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('http://localhost:8000/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          tenant_name: tenantName
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Error en el registro')
      }

      // Automatically redirect to login after successful registration
      router.push('/login')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error en el registro')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface relative overflow-hidden py-12">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary opacity-[0.03] blur-[100px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary opacity-[0.03] blur-[100px]"></div>
      
      <div className="max-w-md w-full mx-4 relative z-10">
        {/* Logo / Brand Section */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20 mb-4 transform -rotate-3 hover:rotate-0 transition-transform duration-500">
            <ShieldCheck className="text-on-primary" size={32} />
          </div>
          <h1 className="text-3xl font-black text-primary tracking-tighter uppercase">Arturo</h1>
          <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-[0.3em] mt-1 opacity-60">Sistemas Contables Legales</p>
        </div>

        {/* Register Card */}
        <div className="bg-surface-container-lowest p-10 rounded-2xl border border-outline-variant shadow-2xl backdrop-blur-sm bg-opacity-80">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-primary mb-2">Crear Cuenta</h2>
            <p className="text-on-surface-variant text-sm font-medium">Inicie su infraestructura de gestión fiscal hoy mismo.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-error-container border border-error border-opacity-20 rounded-md text-on-error-container text-xs font-bold flex items-center gap-3 animate-shake">
              <div className="w-1.5 h-1.5 rounded-full bg-error"></div>
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1">Nombre de la Firma / Empresa</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                  <Building2 size={18} />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Firma Contable S.A. de C.V."
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl py-3 pl-12 pr-4 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-10 focus:border-primary transition-all font-medium"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1">Representante Legal / Usuario</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Juan Pérez"
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl py-3 pl-12 pr-4 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-10 focus:border-primary transition-all font-medium"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1">Correo Electrónico</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  placeholder="director@firma.com"
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl py-3 pl-12 pr-4 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-10 focus:border-primary transition-all font-medium"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1">Contraseña del Sistema</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl py-3 pl-12 pr-4 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-10 focus:border-primary transition-all font-medium"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-container text-on-primary py-4 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 group disabled:opacity-70 mt-4"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <span className="text-sm font-black uppercase tracking-[0.2em]">Registrar Terminal</span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-outline-variant text-center">
            <p className="text-on-surface-variant text-xs font-medium">
              ¿Ya tiene una cuenta activa? {' '}
              <button 
                onClick={() => router.push('/login')}
                className="text-secondary font-black uppercase tracking-wider hover:underline ml-1"
              >
                Acceder
              </button>
            </p>
          </div>
        </div>

        {/* Legal Footer */}
        <p className="text-center mt-8 text-on-surface-variant text-[9px] font-bold uppercase tracking-[0.2em] opacity-40">
          Uso Restringido • Registro de Nueva Entidad • v2026
        </p>
      </div>
    </div>
  )
}
