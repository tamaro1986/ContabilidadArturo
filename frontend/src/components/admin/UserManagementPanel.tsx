"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { fetchWithAuth } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabaseClient';

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: 'administrador' | 'contador' | 'cliente' | string;
  tenant_id: string;
  tenant_name: string | null;
  is_active: boolean;
  created_at: string | null;
}

interface TenantOption {
  id: string;
  name: string;
}

export default function UserManagementPanel() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State for New User
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'administrador' | 'contador' | 'cliente'>('contador');
  const [newTenantId, setNewTenantId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirmation modal for deletion
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load users and tenants
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, { data: tenantList }] = await Promise.all([
        fetchWithAuth('/admin/users'),
        supabase.from('tenants').select('id, name').order('name', { ascending: true })
      ]);

      if (!usersRes.ok) {
        throw new Error('Error al cargar la lista de usuarios.');
      }

      const usersData: AdminUser[] = await usersRes.json();
      setUsers(usersData);
      setTenants(tenantList || []);
      if (tenantList && tenantList.length > 0 && !newTenantId) {
        setNewTenantId(tenantList[0].id);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'No fue posible cargar los usuarios.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const showSuccessBanner = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  // Create User Handler
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword || !newFullName || !newTenantId) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetchWithAuth('/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          full_name: newFullName,
          role: newRole,
          tenant_id: newTenantId
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Error al crear el usuario.');
      }

      showSuccessBanner(`Usuario "${newFullName}" creado exitosamente.`);
      setIsModalOpen(false);
      setNewFullName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('contador');
      void loadData();
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Error al crear usuario.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Change Role Handler
  const handleChangeRole = async (userId: string, newRoleValue: string) => {
    try {
      const res = await fetchWithAuth(`/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRoleValue })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Error al cambiar rol.');
      }

      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRoleValue } : u));
      showSuccessBanner('Rol actualizado correctamente.');
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'No se pudo actualizar el rol.'));
    }
  };

  // Toggle Active / Inactive Handler
  const handleToggleStatus = async (user: AdminUser) => {
    const nextStatus = !user.is_active;
    const actionName = nextStatus ? 'activar' : 'inactivar';
    if (!confirm(`¿Está seguro de ${actionName} a ${user.full_name || user.email}?`)) {
      return;
    }

    try {
      const res = await fetchWithAuth(`/admin/users/${user.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: nextStatus })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Error al modificar estado.');
      }

      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: nextStatus } : u));
      showSuccessBanner(`Usuario ${nextStatus ? 'activado' : 'inactivado'} exitosamente.`);
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'No se pudo modificar el estado del usuario.'));
    }
  };

  // Delete User Handler (Dar de baja definitiva)
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetchWithAuth(`/admin/users/${userToDelete.id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Error al dar de baja el usuario.');
      }

      setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
      showSuccessBanner(`Usuario ${userToDelete.full_name || userToDelete.email} dado de baja definitivamente.`);
      setUserToDelete(null);
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'No se pudo dar de baja al usuario.'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchSearch =
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.tenant_name && user.tenant_name.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchRole = roleFilter === 'ALL' || user.role === roleFilter;

      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && user.is_active) ||
        (statusFilter === 'INACTIVE' && !user.is_active);

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  return (
    <div className="bg-white border border-zinc-200 rounded-[2.5rem] p-8 md:p-12 shadow-xl shadow-zinc-200/40 space-y-8 animate-in fade-in duration-500">
      {/* Header and Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-zinc-100">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-7 bg-blue-600 rounded-full" />
            <h2 className="text-2xl font-black text-zinc-900 tracking-tight uppercase">
              Administración Integral de Usuarios
            </h2>
            <span className="bg-zinc-100 text-zinc-600 text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest">
              {users.length} Registrados
            </span>
          </div>
          <p className="text-zinc-500 text-sm font-medium mt-1 pl-5">
            Cree usuarios, asigne o modifique roles, inactive accesos temporales o dé de baja cuentas definitivamente.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest px-6 py-3.5 rounded-2xl shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2 self-start md:self-auto cursor-pointer"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nuevo Usuario
        </button>
      </div>

      {/* Alert Messages */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-3 animate-in fade-in">
          <span className="w-2 h-2 bg-emerald-500 rounded-full" />
          {actionSuccess}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-xs font-bold flex items-center gap-3">
          <span className="w-2 h-2 bg-red-500 rounded-full" />
          {error}
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-zinc-50 p-4 rounded-3xl border border-zinc-100">
        <div className="md:col-span-2 relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, correo o empresa..."
            className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-xs font-black uppercase tracking-wider text-zinc-700 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">Todos los Roles</option>
            <option value="administrador">Administrador</option>
            <option value="contador">Contador</option>
            <option value="cliente">Cliente</option>
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-xs font-black uppercase tracking-wider text-zinc-700 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="ACTIVE">Solo Activos</option>
            <option value="INACTIVE">Solo Inactivos</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="p-16 text-center text-zinc-400 font-black uppercase tracking-widest text-xs animate-pulse">
          Cargando catálogo de usuarios...
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="p-16 text-center text-zinc-400 font-bold text-sm bg-zinc-50 rounded-3xl border border-zinc-100">
          No se encontraron usuarios con los filtros aplicados.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-zinc-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                <th className="py-4 px-6">Usuario</th>
                <th className="py-4 px-6">Empresa / Tenant</th>
                <th className="py-4 px-6">Rol de Acceso</th>
                <th className="py-4 px-6">Estado</th>
                <th className="py-4 px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-xs">
              {filteredUsers.map((user) => {
                const initials = (user.full_name || user.email)
                  .substring(0, 2)
                  .toUpperCase();

                return (
                  <tr key={user.id} className="hover:bg-zinc-50/70 transition-colors">
                    {/* User info */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white font-black text-xs flex items-center justify-center shrink-0">
                          {initials}
                        </div>
                        <div>
                          <p className="font-bold text-zinc-900">{user.full_name || 'Sin Nombre'}</p>
                          <p className="text-[11px] text-zinc-400 font-medium">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Tenant */}
                    <td className="py-4 px-6">
                      <span className="font-bold text-zinc-700">
                        {user.tenant_name || 'Sin Asignar'}
                      </span>
                    </td>

                    {/* Role Selector */}
                    <td className="py-4 px-6">
                      <select
                        value={user.role}
                        onChange={(e) => void handleChangeRole(user.id, e.target.value)}
                        className={`font-black text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-xl border outline-none cursor-pointer ${
                          user.role === 'administrador'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : user.role === 'contador'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-zinc-50 text-zinc-700 border-zinc-200'
                        }`}
                      >
                        <option value="administrador">Administrador</option>
                        <option value="contador">Contador</option>
                        <option value="cliente">Cliente</option>
                      </select>
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          user.is_active
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            user.is_active ? 'bg-emerald-500' : 'bg-red-500'
                          }`}
                        />
                        {user.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Toggle active / inactivate */}
                        <button
                          onClick={() => void handleToggleStatus(user)}
                          title={user.is_active ? 'Inactivar usuario' : 'Activar usuario'}
                          className={`px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
                            user.is_active
                              ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          }`}
                        >
                          {user.is_active ? 'Inactivar' : 'Activar'}
                        </button>

                        {/* Delete / Dar de baja */}
                        <button
                          onClick={() => setUserToDelete(user)}
                          title="Dar de baja definitivamente"
                          className="px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-all cursor-pointer"
                        >
                          Dar de baja
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Nuevo Usuario */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] border border-zinc-200 p-8 md:p-10 max-w-lg w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="w-2 h-6 bg-blue-600 rounded-full" />
                <h3 className="text-xl font-black text-zinc-900 tracking-tight uppercase">
                  Registrar Nuevo Usuario
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 text-lg font-black cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="Ej: Lic. Carlos Mendoza"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-bold text-zinc-900 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="usuario@empresa.com"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-bold text-zinc-900 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                  Contraseña Inicial
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-bold text-zinc-900 outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                    Rol
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as 'administrador' | 'contador' | 'cliente')}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-xs font-black uppercase text-zinc-800 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="contador">Contador</option>
                    <option value="cliente">Cliente</option>
                    <option value="administrador">Administrador</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                    Empresa / Tenant
                  </label>
                  <select
                    value={newTenantId}
                    onChange={(e) => setNewTenantId(e.target.value)}
                    required
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-xs font-black uppercase text-zinc-800 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider text-zinc-500 hover:bg-zinc-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest px-6 py-2.5 rounded-xl shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
                >
                  {isSubmitting ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmación Dar de Baja */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] border border-red-200 p-8 md:p-10 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center font-black">
                ⚠️
              </div>
              <div>
                <h3 className="text-lg font-black text-zinc-900 tracking-tight uppercase">
                  Dar de Baja Usuario
                </h3>
                <p className="text-xs text-zinc-500 font-medium">Esta acción es irreversible.</p>
              </div>
            </div>

            <p className="text-sm text-zinc-600 font-medium">
              ¿Está completamente seguro de eliminar y dar de baja al usuario{' '}
              <strong className="text-zinc-900 font-black">{userToDelete.full_name || userToDelete.email}</strong>?
              Se eliminará su cuenta de acceso, roles y sesiones activas.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setUserToDelete(null)}
                className="px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider text-zinc-500 hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => void handleDeleteUser()}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest px-6 py-2.5 rounded-xl shadow-lg shadow-red-600/20 transition-all cursor-pointer"
              >
                {isDeleting ? 'Eliminando...' : 'Sí, Dar de Baja'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
