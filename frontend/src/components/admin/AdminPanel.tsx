"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AdminPanel() {
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [expandedTenant, setExpandedTenant] = useState<string | null>(null);
  const [newCode, setNewCode] = useState('');
  const [newDays, setNewDays] = useState(30);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [{ data: codes }, { data: tenantList }, { data: userList }] = await Promise.all([
        supabase.from('promo_codes').select('*').order('created_at', { ascending: false }),
        supabase.from('tenants').select('*').order('created_at', { ascending: false }),
        supabase.from('user_profiles').select('*')
      ]);
      setPromoCodes(codes || []);
      setTenants(tenantList || []);
      setUsers(userList || []);
    } catch (err) {
      console.error(err);
      setError('Error al cargar datos administrativos.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('promo_codes')
        .insert([{ code: newCode.toUpperCase(), days_granted: newDays, is_active: true }]);
      
      if (error) throw error;
      
      setNewCode('');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const toggleCode = async (id: string, currentStatus: boolean) => {
    try {
      await supabase.from('promo_codes').update({ is_active: !currentStatus }).eq('id', id);
      fetchData();
    } catch (err) {
      alert('Error al actualizar código.');
    }
  };

  if (isLoading) return <div className="p-10 animate-pulse text-zinc-500 font-black uppercase tracking-widest text-xs">Cargando Bóveda Administrativa...</div>;

  return (
    <div className="space-y-12 pb-20">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
        
        {/* Promo Codes Management */}
        <div className="bg-white border border-zinc-200 rounded-[2.5rem] p-10 shadow-xl">
          <h3 className="text-xl font-black text-zinc-900 mb-8 tracking-tight flex items-center gap-3 uppercase">
            <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
            Gestión de Cupones
          </h3>

          <form onSubmit={handleCreateCode} className="flex gap-4 mb-10 bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
            <div className="flex-1">
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Código</label>
              <input 
                type="text" 
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="EJ. ARTURO2024"
                className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2.5 font-bold uppercase tracking-widest text-sm focus:border-emerald-500 outline-none"
              />
            </div>
            <div className="w-24">
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Días</label>
                <input 
                    type="number" 
                    value={newDays}
                    onChange={(e) => setNewDays(parseInt(e.target.value))}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2.5 font-bold text-sm focus:border-emerald-500 outline-none"
                />
            </div>
            <button className="self-end bg-zinc-900 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-600 transition-all shadow-lg shadow-zinc-900/10">
                Crear
            </button>
          </form>

          <div className="space-y-3">
            {promoCodes.map((code) => (
              <div key={code.id} className="flex items-center justify-between p-4 bg-white border border-zinc-100 rounded-2xl hover:border-zinc-300 transition-all group">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${code.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-400'}`}>
                    {code.days_granted}d
                  </div>
                  <div>
                    <p className="font-black text-zinc-900 tracking-widest text-sm uppercase">{code.code}</p>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase">{new Date(code.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <button 
                  onClick={() => toggleCode(code.id, code.is_active)}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    code.is_active ? 'text-zinc-400 hover:text-red-500' : 'text-emerald-500 hover:text-emerald-600'
                  }`}
                >
                  {code.is_active ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Tenants / Trials Overview */}
        <div className="bg-zinc-900 text-white rounded-[2.5rem] p-10 shadow-2xl shadow-zinc-900/20">
          <h3 className="text-xl font-black text-white mb-8 tracking-tight flex items-center gap-3 uppercase">
            <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
            Estado de Membresías
          </h3>

          <div className="space-y-4">
            {tenants.map((tenant) => {
              const endsAt = new Date(tenant.trial_ends_at);
              const isExpired = endsAt < new Date();
              const isExpanded = expandedTenant === tenant.id;
              const tenantUsers = users.filter(u => u.tenant_id === tenant.id);

              return (
                <div key={tenant.id} className="p-5 bg-white/5 border border-white/10 rounded-3xl flex flex-col gap-4 group hover:bg-white/10 transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-black text-white tracking-tight text-lg mb-1">{tenant.name}</p>
                      <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${isExpired ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                              {isExpired ? 'Prueba Vencida' : 'Prueba Activa'}
                          </span>
                          <span className="text-[10px] font-bold text-zinc-500 uppercase">Expira: {endsAt.toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setExpandedTenant(isExpanded ? null : tenant.id)}
                      className="text-[10px] font-black text-white/40 uppercase tracking-widest group-hover:text-white transition-colors">
                        {isExpanded ? 'Ocultar' : 'Gestionar'}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-2 pt-4 border-t border-white/10">
                      <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">Usuarios Activos ({tenantUsers.length})</h4>
                      {tenantUsers.length > 0 ? (
                        <div className="space-y-2">
                          {tenantUsers.map(user => (
                            <div key={user.id} className="flex justify-between items-center bg-black/20 p-3 rounded-xl">
                              <div>
                                <p className="text-sm font-bold text-white">{user.full_name}</p>
                                <p className="text-[10px] text-zinc-400">{user.email}</p>
                              </div>
                              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-white/10 text-white rounded-lg">
                                {user.role}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-500 italic">No hay usuarios registrados</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
