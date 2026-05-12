// frontend/src/components/analytics/CompanyManager.tsx
import React, { useState } from 'react';
import { Company } from '@/types/companyTypes';

interface CompanyManagerProps {
  companies: Company[];
  onSelectCompany: (company: Company) => void;
  onAddCompany: (name: string, nit: string) => void;
  isLoading?: boolean;
  error?: string | null;
}

const Icons = {
  Plus: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
  ),
  Building: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
  ),
  AlertCircle: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
  ),
  CheckCircle: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
  )
};

export default function CompanyManager({ 
  companies, 
  onSelectCompany, 
  onAddCompany,
  isLoading = false,
  error = null
}: CompanyManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNit, setNewNit] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validación NIT: Aceptamos entre 9 y 14 dígitos (DUI/NIT personas naturales y jurídicas)
  const nitDigits = newNit.replace(/\D/g, '');
  const isNitValid = nitDigits.length >= 9 && nitDigits.length <= 14;
  const isFormValid = newName.length >= 3 && isNitValid;

  const handleAddSubmit = async () => {
    if (isFormValid && !isSubmitting) {
      setIsSubmitting(true);
      try {
        await onAddCompany(newName, newNit);
        setIsModalOpen(false);
        setNewName('');
        setNewNit('');
      } catch (err) {
        // El error ya se maneja en el padre usualmente, pero aquí evitamos cerrar el modal
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Portafolio de Empresas</h2>
          <p className="text-zinc-500 text-sm font-medium">Gestione y procese los anexos fiscales de sus clientes.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-zinc-900 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-3 shadow-lg shadow-zinc-900/20 hover:bg-emerald-600 transition-all"
        >
          <Icons.Plus />
          Registrar Empresa
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-black uppercase tracking-widest flex items-center gap-3">
          <Icons.AlertCircle />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="bg-white border border-zinc-200 rounded-3xl p-6 animate-pulse">
              <div className="w-12 h-12 bg-zinc-100 rounded-2xl mb-4" />
              <div className="h-6 bg-zinc-100 rounded w-3/4 mb-2" />
              <div className="h-4 bg-zinc-100 rounded w-1/2 mb-6" />
              <div className="space-y-3 mb-8">
                <div className="h-4 bg-zinc-50 rounded" />
                <div className="h-4 bg-zinc-50 rounded" />
              </div>
              <div className="h-12 bg-zinc-50 rounded-xl" />
            </div>
          ))
        ) : companies.length === 0 ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center bg-zinc-50 rounded-[2.5rem] border-2 border-dashed border-zinc-200">
            <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400 mb-4">
              <Icons.Building />
            </div>
            <h3 className="text-lg font-black text-zinc-900">No hay empresas registradas</h3>
            <p className="text-zinc-500 text-sm font-medium mb-8">Comience por registrar su primera entidad fiscal.</p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-8 py-3 bg-white border border-zinc-200 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-900 hover:text-white transition-all shadow-sm"
            >
              Registrar Ahora
            </button>
          </div>
        ) : (
          companies.map((company) => (
            <div key={company.id} className="bg-white border border-zinc-200 rounded-3xl p-6 hover:shadow-xl hover:shadow-zinc-200/50 transition-all duration-300 group flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                    <Icons.Building />
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                    company.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                    company.status === 'error' ? 'bg-red-50 text-red-700 border-red-100' :
                    'bg-zinc-50 text-zinc-600 border-zinc-100'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      company.status === 'active' ? 'bg-emerald-500 animate-pulse' :
                      company.status === 'error' ? 'bg-red-500' :
                      'bg-zinc-400'
                    }`}/>
                    {company.status === 'active' ? 'Activo' : company.status === 'error' ? 'Error' : 'Pendiente'}
                  </div>
                </div>
                <h3 className="text-lg font-black text-zinc-900 leading-tight mb-1">{company.name}</h3>
                <p className="text-sm text-zinc-500 font-medium mb-6">NIT: {company.nit}</p>
                
                <div className="space-y-3 mb-8">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-500 font-medium">Último Procesamiento:</span>
                    <span className="text-zinc-900 font-bold uppercase text-[10px] tracking-wider">
                      {company.lastProcessedMonth || 'Sin Datos'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-500 font-medium">Registros totales:</span>
                    <span className="text-zinc-900 font-bold">{company.totalRecords || 0}</span>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => onSelectCompany(company)}
                className="w-full py-3 rounded-xl bg-zinc-50 text-zinc-600 text-xs font-black uppercase tracking-widest hover:bg-zinc-900 hover:text-white transition-all"
              >
                Gestionar Anexos
              </button>
            </div>
          ))
        )}
      </div>

      {/* Modal Add Company */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-300">
            <h3 className="text-xl font-black text-zinc-900 mb-6 tracking-tight italic">Registrar Nueva Entidad</h3>
            
            <div className="space-y-5">
              <div>
                <label className="block text-[11px] font-black text-zinc-500 uppercase tracking-widest mb-2">Razón Social</label>
                <input 
                  type="text" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej. Distribuciones García S.A. de C.V."
                  className="w-full px-4 py-3 rounded-xl border border-zinc-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all text-sm font-medium"
                  disabled={isSubmitting}
                />
              </div>
              
              <div>
                <label className="block text-[11px] font-black text-zinc-500 uppercase tracking-widest mb-2">NIT / Identificación</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={newNit}
                    onChange={(e) => setNewNit(e.target.value)}
                    placeholder="Formato: 0000-000000-000-0"
                    className={`w-full px-4 py-3 rounded-xl border outline-none transition-all text-sm font-medium ${
                      newNit.length > 0 ? (isNitValid ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-200' : 'border-amber-500 focus:ring-2 focus:ring-amber-200') : 'border-zinc-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200'
                    }`}
                    disabled={isSubmitting}
                  />
                  {newNit.length > 0 && (
                    <div className={`absolute right-3 top-3 ${isNitValid ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {isNitValid ? <Icons.CheckCircle /> : <Icons.AlertCircle />}
                    </div>
                  )}
                </div>
                {newNit.length > 0 && !isNitValid && (
                  <p className="text-amber-600 text-[10px] font-bold mt-2">Formato inválido: el NIT debe contener entre 9 y 14 dígitos numéricos.</p>
                )}
                <p className="text-zinc-400 text-[10px] font-medium mt-1">Aceptamos NIT jurídico (14 dígitos) o identificación natural (9 dígitos).</p>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-4 py-3 rounded-xl bg-zinc-100 text-zinc-600 text-xs font-black uppercase tracking-widest hover:bg-zinc-200 transition-colors"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button 
                onClick={handleAddSubmit}
                disabled={!isFormValid || isSubmitting}
                className={`flex-1 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  isFormValid && !isSubmitting ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-900/20 hover:bg-emerald-600' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Procesando...
                  </div>
                ) : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
