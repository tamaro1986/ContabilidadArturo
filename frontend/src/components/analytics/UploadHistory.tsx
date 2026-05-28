'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { fetchWithAuth } from "@/lib/api";

interface UploadRecord {
  id: string;
  filename: string;
  document_type: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  records_processed: number;
  error_message?: string;
  created_at: string;
  companies?: { name: string };
  user_profiles?: { full_name: string };
}

interface UploadHistoryProps {
  companyId?: string;
  refreshTrigger?: number;
  onUploadSuccess?: () => void;
}

export default function UploadHistory({ 
  companyId, 
  refreshTrigger, 
  onUploadSuccess 
}: UploadHistoryProps) {
  const [history, setHistory] = useState<UploadRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);

  const fetchHistory = useCallback(async (isAutoRefresh = false) => {
    if (!isAutoRefresh) setIsLoading(true);
    try {
      let endpoint = '/uploads/history';
      const params = new URLSearchParams();
      if (companyId) params.append('company_id', companyId);
      
      const queryString = params.toString();
      if (queryString) endpoint += `?${queryString}`;

      const res = await fetchWithAuth(endpoint);
      const data = await res.json();
      if (data.status === 'success') {
        const newHistory = data.data;
        
        setHistory(prevHistory => {
          // Detect transitions to success for feedback
          const wasProcessing = prevHistory.some(r => r.status === 'processing');
          const nowDone = !newHistory.some((r: UploadRecord) => r.status === 'processing');
          
          if (wasProcessing && nowDone && onUploadSuccess) {
            onUploadSuccess();
          }
          return newHistory;
        });
        
        // Maintain polling if something is still cooking
        const hasActiveTasks = newHistory.some((r: UploadRecord) => 
          r.status === 'processing' || r.status === 'pending'
        );
        setIsPolling(hasActiveTasks);
      }
    } catch (error) {
      console.error('Error fetching upload history:', error);
    } finally {
      if (!isAutoRefresh) setIsLoading(false);
    }
  }, [companyId, onUploadSuccess]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchHistory();
    }, 0);
    return () => clearTimeout(timer);
  }, [companyId, refreshTrigger, fetchHistory]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isPolling) {
      intervalId = setInterval(() => {
        fetchHistory(true);
      }, 4000); // Polling every 4s for premium feel
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isPolling, fetchHistory]);

  const getStatusBadge = (record: UploadRecord) => {
    switch (record.status) {
      case 'success':
        return (
          <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100/50">
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Verificado</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-2 bg-rose-50 px-3 py-1 rounded-full border border-rose-100/50 group relative cursor-help">
            <span className="flex h-1.5 w-1.5 rounded-full bg-rose-500" />
            <span className="text-[9px] font-black text-rose-700 uppercase tracking-widest">Fallo</span>
            {record.error_message && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-56 p-3 bg-zinc-900 text-white text-[10px] rounded-xl shadow-2xl z-50 animate-in fade-in zoom-in duration-200">
                <p className="font-bold text-rose-400 mb-1 uppercase tracking-tighter">Detalle del Error:</p>
                {record.error_message}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-zinc-900" />
              </div>
            )}
          </div>
        );
      case 'processing':
        return (
          <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full border border-blue-100/50">
            <div className="h-2 w-2 border-[1.5px] border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Procesando</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 bg-amber-50 px-3 py-1 rounded-full border border-amber-100/50">
            <span className="flex h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">En Cola</span>
          </div>
        );
    }
  };

  if (isLoading && history.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-white rounded-4xl animate-pulse border border-zinc-100 shadow-sm" />
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-zinc-50/50 rounded-[3.5rem] border-2 border-dashed border-zinc-200 transition-all hover:bg-zinc-50 group">
        <div className="w-24 h-24 bg-white shadow-xl shadow-zinc-200/50 border border-zinc-100 text-zinc-300 rounded-[2.5rem] flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500">
           <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        </div>
        <h4 className="text-zinc-900 text-xl font-black uppercase tracking-tight">Sin Trazabilidad Activa</h4>
        <p className="text-sm text-zinc-500 font-medium mt-3 max-w-xs mx-auto leading-relaxed">
          Cargue sus archivos de Hacienda para iniciar el proceso de auditoría y validación automática.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between mb-8 px-6">
        <div className="space-y-1">
          <h3 className="text-sm font-black text-zinc-900 uppercase tracking-[0.2em] flex items-center gap-3">
            <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
            Trazabilidad de Cargas
          </h3>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Control y Auditoría de Procesamiento</p>
        </div>
        {isPolling && (
          <div className="flex items-center gap-3 px-4 py-2 bg-zinc-900 rounded-2xl shadow-xl shadow-zinc-900/20">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </div>
            <span className="text-[9px] font-black text-white uppercase tracking-[0.2em]">Auditoría en Tiempo Real</span>
          </div>
        )}
      </div>

      <div className="overflow-hidden bg-white/70 backdrop-blur-sm rounded-[3rem] border border-zinc-200/60 shadow-2xl shadow-zinc-200/30">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100">
                <th className="px-10 py-6 text-[9px] font-black text-zinc-400 uppercase tracking-[0.3em]">Archivo & Origen</th>
                {!companyId && <th className="px-10 py-6 text-[9px] font-black text-zinc-400 uppercase tracking-[0.3em]">Entidad</th>}
                <th className="px-10 py-6 text-[9px] font-black text-zinc-400 uppercase tracking-[0.3em]">Responsable</th>
                <th className="px-10 py-6 text-[9px] font-black text-zinc-400 uppercase tracking-[0.3em]">Volumen</th>
                <th className="px-10 py-6 text-[9px] font-black text-zinc-400 uppercase tracking-[0.3em]">Estado</th>
                <th className="px-4 py-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {history.map((record) => (
                <tr key={record.id} className="hover:bg-zinc-50/80 transition-all duration-300 group">
                  <td className="px-10 py-7">
                    <div className="flex items-center gap-5">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm border transition-all duration-500 group-hover:scale-110 ${
                        record.status === 'error' ? 'bg-rose-50 border-rose-100 text-rose-500' : 
                        record.status === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                        'bg-white border-zinc-100 text-zinc-400 group-hover:border-emerald-200 group-hover:text-emerald-500'
                      }`}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                      </div>
                      <div>
                        <div className="font-black text-zinc-900 text-[13px] tracking-tight uppercase group-hover:text-emerald-600 transition-colors">{record.filename}</div>
                        <div className="text-[10px] font-bold text-zinc-400 uppercase mt-1 flex items-center gap-2">
                          {new Date(record.created_at).toLocaleDateString('es-SV', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          <span className="w-1 h-1 rounded-full bg-zinc-200" />
                          <span className="text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md">{(record.document_type ?? '').replace(/_/g, ' ')}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  {!companyId && (
                    <td className="px-10 py-7">
                      <div className="text-[10px] font-black text-zinc-700 uppercase tracking-widest bg-zinc-100/80 px-4 py-2 rounded-xl border border-zinc-200/50">
                        {record.companies?.name || '---'}
                      </div>
                    </td>
                  )}
                  <td className="px-10 py-7">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      </div>
                      <span className="text-[11px] font-bold text-zinc-600 truncate max-w-30">{record.user_profiles?.full_name || 'Desconocido'}</span>
                    </div>
                  </td>
                  <td className="px-10 py-7">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-zinc-900">{(record.records_processed ?? 0).toLocaleString()}</span>
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">Registros</span>
                    </div>
                  </td>
                  <td className="px-10 py-7">
                    {getStatusBadge(record)}
                  </td>
                  <td className="px-4 py-7">
                    <button
                      onClick={async () => {
                        if (!confirm('¿Eliminar esta carga del historial?')) return;
                        try {
                          await fetchWithAuth(`/financial/uploads/${record.id}`, { method: 'DELETE' });
                          fetchHistory();
                        } catch (e: any) {
                          alert('Error al eliminar: ' + e.message);
                        }
                      }}
                      className="text-zinc-300 hover:text-red-500 transition-colors p-1"
                      title="Eliminar del historial"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
