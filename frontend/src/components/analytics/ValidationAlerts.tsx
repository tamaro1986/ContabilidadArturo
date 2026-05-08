// frontend/src/components/analytics/ValidationAlerts.tsx
import React from 'react';
import { CsvValidationResult } from '@/types/companyTypes';

interface ValidationAlertsProps {
  result: CsvValidationResult | null;
  onDismiss: () => void;
  onRetry: () => void;
}

const Icons = {
  AlertTriangle: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
  ),
  CheckCircle: () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
  ),
  XCircle: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
  ),
  Refresh: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
  )
};

export default function ValidationAlerts({ result, onDismiss, onRetry }: ValidationAlertsProps) {
  if (!result) return null;

  if (result.isValid) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-emerald-500/30 mb-8">
          <Icons.CheckCircle />
        </div>
        <h3 className="text-3xl font-black text-emerald-900 tracking-tight mb-2">¡Validación Exitosa!</h3>
        <p className="text-emerald-700/80 font-medium mb-8">El archivo <strong className="text-emerald-900">{result.fileName}</strong> cumple con todos los requisitos estructurales para el anexo {result.detectedType}.</p>
        
        <div className="flex gap-8 mb-10">
          <div className="text-center">
            <p className="text-[10px] font-black text-emerald-600/70 uppercase tracking-widest mb-1">Registros</p>
            <p className="text-2xl font-black text-emerald-900">{result.rowCount?.toLocaleString()}</p>
          </div>
          <div className="w-px bg-emerald-200" />
          <div className="text-center">
            <p className="text-[10px] font-black text-emerald-600/70 uppercase tracking-widest mb-1">Tamaño</p>
            <p className="text-2xl font-black text-emerald-900">{(result.fileSize / 1024).toFixed(1)} KB</p>
          </div>
        </div>

        <button 
          onClick={onDismiss}
          className="bg-emerald-600 text-white px-8 py-4 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all"
        >
          Procesar Archivo
        </button>
      </div>
    );
  }

  const criticalErrors = result.errors.filter(e => e.severity === 'critical');
  const structuralErrors = result.errors.filter(e => e.severity === 'structural');
  const rowErrors = result.errors.filter(e => e.severity === 'row-level');

  return (
    <div className="bg-white border border-red-200 rounded-[2.5rem] shadow-2xl shadow-red-500/10 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div className="bg-red-50 border-b border-red-200 p-8 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center">
            <Icons.AlertTriangle />
          </div>
          <div>
            <h3 className="text-xl font-black text-red-900 tracking-tight">Validación Fallida</h3>
            <p className="text-sm font-medium text-red-700/80">Se encontraron inconsistencias en {result.fileName}</p>
          </div>
        </div>
        <button 
          onClick={onRetry}
          className="bg-white border border-red-200 text-red-700 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-3 hover:bg-red-50 transition-colors"
        >
          <Icons.Refresh />
          Reintentar
        </button>
      </div>

      <div className="p-8 space-y-8">
        {/* Sumario de Alertas */}
        <div className="flex gap-4">
          <div className="flex-1 bg-red-50/50 border border-red-100 rounded-2xl p-4 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-red-600">Críticos</span>
            <span className="text-xl font-black text-red-900">{criticalErrors.length}</span>
          </div>
          <div className="flex-1 bg-amber-50/50 border border-amber-100 rounded-2xl p-4 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Estructurales</span>
            <span className="text-xl font-black text-amber-900">{structuralErrors.length}</span>
          </div>
          <div className="flex-1 bg-yellow-50/50 border border-yellow-100 rounded-2xl p-4 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-yellow-600">Por Fila</span>
            <span className="text-xl font-black text-yellow-900">{rowErrors.length}</span>
          </div>
        </div>

        {/* Lista de Errores */}
        <div className="space-y-4">
          {criticalErrors.map((err, i) => (
            <div key={i} className="flex gap-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800">
              <Icons.XCircle />
              <div>
                <p className="text-sm font-bold">{err.message}</p>
              </div>
            </div>
          ))}

          {structuralErrors.map((err, i) => (
            <div key={i} className="flex gap-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
              <Icons.AlertTriangle />
              <div>
                <p className="text-sm font-bold">{err.message}</p>
              </div>
            </div>
          ))}

          {rowErrors.map((err, i) => (
            <div key={i} className="flex gap-4 p-4 rounded-xl bg-yellow-50 border border-yellow-200 text-yellow-800">
              <div className="mt-0.5"><Icons.AlertTriangle /></div>
              <div>
                <p className="text-sm font-bold">{err.message}</p>
                {err.line && <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mt-1">Línea {err.line}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
