"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { fetchWithAuth } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';

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
  const [autoPassword, setAutoPassword] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'administrador' | 'contador' | 'cliente'>('contador');
  const [newTenantId, setNewTenantId] = useState('');
  const [showAdvancedTenant, setShowAdvancedTenant] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdSuccess, setCreatedSuccess] = useState<{
    full_name: string;
    email: string;
    role: string;
    temp_password: string;
    login_url: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Confirmation modal for deletion
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load users and tenants
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, tenantsRes] = await Promise.all([
        fetchWithAuth('/admin/users'),
        fetchWithAuth('/admin/tenants'),
      ]);

      if (!usersRes.ok) {
        throw new Error('Error al cargar la lista de usuarios.');
      }

      const usersData: AdminUser[] = await usersRes.json();
      let tenantList: Array<{ id: string; name: string }> = [];
      if (tenantsRes.ok) {
        tenantList = await tenantsRes.json();
      }
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

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCreatedSuccess(null);
    setCreateError(null);
    setNewFullName('');
    setNewEmail('');
    setNewPassword('');
    setAutoPassword(true);
    setNewRole('contador');
    setShowAdvancedTenant(false);
  };

  const handleCopyWhatsApp = () => {
    if (!createdSuccess) return;
    const msg = `Hola ${createdSuccess.full_name}, te comparto tus credenciales de acceso a la plataforma Garcia Integrum:

🔗 Enlace de acceso: ${createdSuccess.login_url}
👤 Usuario: ${createdSuccess.email}
🔑 Contraseña temporal: ${createdSuccess.temp_password}

(Por favor ingresa y actualiza tu contraseña en tu primer acceso).`;

    void navigator.clipboard.writeText(msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // Create User Handler
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newFullName) return;
    if (!autoPassword && (!newPassword || newPassword.length < 6)) {
      setCreateError('La contraseña manual debe contener al menos 6 caracteres.');
      return;
    }

    setIsSubmitting(true);
    setCreateError(null);
    try {
      const effectiveTenantId = newTenantId || (tenants.length > 0 ? tenants[0].id : undefined);

      const res = await fetchWithAuth('/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          email: newEmail.trim(),
          password: autoPassword ? undefined : newPassword.trim(),
          full_name: newFullName.trim(),
          role: newRole,
          tenant_id: effectiveTenantId
        })
      });

      const data = await res.json();
      if (!res.ok) {
        const detailMsg = typeof data.detail === 'string'
          ? data.detail
          : (Array.isArray(data.detail) && data.detail[0]?.msg
            ? String(data.detail[0].msg)
            : (data.message || 'Error al procesar la creación del usuario.'));
        throw new Error(detailMsg);
      }

      const currentOrigin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : '';
      const loginUrl = currentOrigin
        ? `${currentOrigin}/login`
        : (data.login_url && !data.login_url.includes('localhost')
          ? data.login_url
          : 'https://contabilidad.51-161-114-131.sslip.io/login');

      setCreatedSuccess({
        full_name: data.full_name || newFullName,
        email: data.email || newEmail,
        role: data.role || newRole,
        temp_password: data.temp_password || (autoPassword ? 'Integrum#2026' : newPassword),
        login_url: loginUrl,
      });

      showSuccessBanner(`Usuario "${newFullName}" creado exitosamente.`);
      void loadData();
    } catch (err: unknown) {
      setCreateError(getErrorMessage(err, 'No fue posible registrar al usuario.'));
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
                <div className={`w-2.5 h-6 rounded-full ${createdSuccess ? 'bg-emerald-500' : 'bg-blue-600'}`} />
                <h3 className="text-xl font-black text-zinc-900 tracking-tight uppercase">
                  {createdSuccess ? 'Acceso Generado' : 'Registrar Nuevo Usuario'}
                </h3>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-zinc-400 hover:text-zinc-700 text-lg font-black cursor-pointer"
              >
                ✕
              </button>
            </div>

            {createdSuccess ? (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-3xl space-y-4">
                  <div className="flex items-center gap-3 text-emerald-800">
                    <span className="flex h-3 w-3 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <h4 className="font-black text-sm uppercase tracking-wider">¡Usuario Creado Exitosamente!</h4>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-emerald-100 space-y-3 text-xs">
                    <div className="flex justify-between items-center py-1 border-b border-zinc-100">
                      <span className="text-zinc-400 font-bold uppercase">Nombre:</span>
                      <span className="font-black text-zinc-800">{createdSuccess.full_name}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-zinc-100">
                      <span className="text-zinc-400 font-bold uppercase">Correo / Usuario:</span>
                      <span className="font-mono font-bold text-zinc-800">{createdSuccess.email}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-zinc-100">
                      <span className="text-zinc-400 font-bold uppercase">Rol Asignado:</span>
                      <span className="font-black text-emerald-600 uppercase">{createdSuccess.role}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 bg-emerald-50/50 p-2 rounded-lg">
                      <span className="text-emerald-700 font-black uppercase">Clave Temporal:</span>
                      <span className="font-mono font-black text-emerald-800 text-sm">{createdSuccess.temp_password}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={handleCopyWhatsApp}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
                      {copied ? "¡Mensaje Copiado al Portapapeles!" : "Copiar mensaje para WhatsApp"}
                    </button>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCreatedSuccess(null);
                          setNewFullName('');
                          setNewEmail('');
                          setNewPassword('');
                        }}
                        className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer text-center"
                      >
                        Registrar otro
                      </button>
                      <button
                        type="button"
                        onClick={handleCloseModal}
                        className="bg-zinc-200 hover:bg-zinc-300 text-zinc-800 font-bold text-xs py-2.5 px-5 rounded-xl transition-all cursor-pointer"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
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
                    Rol en la Plataforma
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as 'administrador' | 'contador' | 'cliente')}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-xs font-black uppercase text-zinc-800 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="contador">Contador (Gestión total contable)</option>
                    <option value="cliente">Cliente (Solo consulta y reportes)</option>
                    <option value="administrador">Administrador (Acceso global)</option>
                  </select>
                </div>

                {/* Contraseña Temporal Automática */}
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
                    <span className="text-[10px] font-mono text-zinc-400 uppercase">Ej: Integrum#9778</span>
                  </div>

                  {!autoPassword && (
                    <div className="space-y-1 pt-1 animate-in fade-in duration-150">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">
                        Contraseña Personalizada (Mínimo 6 caracteres)
                      </label>
                      <input
                        type="text"
                        required={!autoPassword}
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Escribe una contraseña temporal..."
                        className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-mono font-bold text-zinc-900"
                      />
                    </div>
                  )}
                </div>

                {/* Firma / Tenant transparente */}
                <div className="pt-1">
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 bg-zinc-100/70 px-3.5 py-2 rounded-xl border border-zinc-200/60">
                    <span className="flex items-center gap-1.5 font-bold text-zinc-600">
                      🏢 Firma: <span className="text-blue-700 font-black">{tenants.find(t => t.id === newTenantId)?.name || 'Integrum Firma Contable'}</span>
                    </span>
                    {tenants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setShowAdvancedTenant(!showAdvancedTenant)}
                        className="text-[10px] text-zinc-400 hover:text-zinc-700 underline font-bold cursor-pointer"
                      >
                        {showAdvancedTenant ? 'Ocultar' : 'Cambiar'}
                      </button>
                    )}
                  </div>

                  {showAdvancedTenant && tenants.length > 1 && (
                    <div className="mt-2 pt-2 border-t border-zinc-100 animate-in fade-in duration-150">
                      <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">
                        Seleccionar Firma / Tenant
                      </label>
                      <select
                        value={newTenantId}
                        onChange={(e) => setNewTenantId(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-800 outline-none"
                      >
                        {tenants.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {createError && (
                  <div className="p-3 rounded-xl text-xs font-bold bg-red-50 text-red-700 border border-red-200 animate-in fade-in duration-150">
                    {createError}
                  </div>
                )}

                <div className="pt-3 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider text-zinc-500 hover:bg-zinc-100 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest px-6 py-3 rounded-xl shadow-lg shadow-blue-600/20 transition-all cursor-pointer flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Generando...</span>
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg>
                        <span>Crear y Generar Acceso</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
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
