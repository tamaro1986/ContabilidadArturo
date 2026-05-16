'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { forgotPassword } from '@/lib/api'

// ── Inline SVG Icons ───────────────────────────────────────────────────────────
const ShieldCheck = ({ size = 32, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
);
const Mail = ({ size = 20, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
);
const Loader2 = ({ size = 20, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);
const ArrowLeft = ({ size = 18, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
);

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      await forgotPassword(email)
      setSuccess(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary opacity-[0.03] blur-[100px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary opacity-[0.03] blur-[100px]"></div>
      
      <div className="max-w-md w-full mx-4 relative z-10">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20 mb-4 transform rotate-3 hover:rotate-0 transition-transform duration-500">
            <ShieldCheck className="text-on-primary" size={32} />
          </div>
          <h1 className="text-3xl font-black text-primary tracking-tighter uppercase">Arturo</h1>
          <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-[0.3em] mt-1 opacity-60">Sistemas Contables Legales</p>
        </div>

        {/* Card */}
        <div className="bg-surface-container-lowest p-10 rounded-2xl border border-outline-variant shadow-2xl backdrop-blur-sm bg-opacity-80">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-2">Recuperar Clave</h2>
            <p className="text-on-surface-variant text-sm font-medium">Le enviaremos un enlace seguro para restablecer su código de acceso.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-error-container border border-error border-opacity-20 rounded-md text-on-error-container text-xs font-bold flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-error"></div>
              {error}
            </div>
          )}

          {success ? (
            <div className="space-y-6">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800 text-sm font-medium">
                ¡Enlace enviado! Revise su bandeja de entrada (y la carpeta de spam) para continuar.
              </div>
              <button
                onClick={() => router.push('/login')}
                className="w-full bg-primary text-on-primary py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 group"
              >
                <ArrowLeft size={18} />
                <span className="text-sm font-black uppercase tracking-[0.2em]">Volver al Ingreso</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1">Correo Electrónico</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="usuario@firma.com"
                    className="w-full bg-surface-container-low border border-outline-variant rounded-xl py-3.5 pl-12 pr-4 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-10 focus:border-primary transition-all font-medium"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-container text-on-primary py-4 rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3 group disabled:opacity-70"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <span className="text-sm font-black uppercase tracking-[0.2em]">Enviar Enlace</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => router.push('/login')}
                className="w-full py-2 text-on-surface-variant text-xs font-bold uppercase tracking-widest hover:text-primary transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft size={14} />
                Volver
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
