import React, { useState, useEffect, useMemo } from 'react';
import { Usuario, UserRole, AuditoriaIngreso, UserSession } from '../types';
import { 
  getAuditoriaIngresos, 
  saveAuditoriaIngresos 
} from '../utils/storage';
import { 
  UserCog, 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  User, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  CheckCircle2,
  Clock,
  Calendar,
  Download,
  Smartphone,
  Monitor,
  ClipboardList
} from 'lucide-react';

interface UsuariosTabProps {
  usuarios: Usuario[];
  onSaveUsuarios: (usuarios: Usuario[]) => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  session?: UserSession | null;
}

export const UsuariosTab: React.FC<UsuariosTabProps> = ({
  usuarios,
  onSaveUsuarios,
  onToast,
  session
}) => {
  // Navigation between Users list and Login history
  const [activeSubTab, setActiveSubTab] = useState<'usuarios' | 'historial'>('usuarios');

  // Form states for new user
  const [newUser, setNewUser] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newNombre, setNewNombre] = useState('');
  const [newRol, setNewRol] = useState<UserRole>('Supervisor');

  const [search, setSearch] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Editing state for user
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [editPass, setEditPass] = useState('');
  const [editRol, setEditRol] = useState<UserRole>('Supervisor');
  const [editNombre, setEditNombre] = useState('');

  // Login audit logs
  const [auditorias, setAuditorias] = useState<AuditoriaIngreso[]>(() => getAuditoriaIngresos());
  const [auditFilterDate, setAuditFilterDate] = useState<string>('hoy');
  const [auditFilterRole, setAuditFilterRole] = useState<string>('todos');
  const [auditSearch, setAuditSearch] = useState<string>('');

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Fetch audit records from server
  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/auditoria-ingresos');
      if (res.ok) {
        const json = await res.json();
        if (json && json.status === 'ok' && Array.isArray(json.auditoria)) {
          setAuditorias(json.auditoria);
          saveAuditoriaIngresos(json.auditoria);
        }
      }
    } catch {
      // Offline fallback: keep local storage
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const [resUsers, resAudit] = await Promise.all([
        fetch('/api/usuarios'),
        fetch('/api/auditoria-ingresos')
      ]);

      if (resUsers.ok) {
        const jsonU = await resUsers.json();
        if (jsonU && jsonU.status === 'ok' && Array.isArray(jsonU.usuarios)) {
          onSaveUsuarios(jsonU.usuarios);
        }
      }

      if (resAudit.ok) {
        const jsonA = await resAudit.json();
        if (jsonA && jsonA.status === 'ok' && Array.isArray(jsonA.auditoria)) {
          setAuditorias(jsonA.auditoria);
          saveAuditoriaIngresos(jsonA.auditoria);
        }
      }

      onToast('🟢 Cuentas y horarios de login sincronizados con el servidor', 'success');
    } catch {
      onToast('⚠️ No se pudo conectar con el servidor', 'warning');
    } finally {
      setTimeout(() => setSyncing(false), 500);
    }
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    const u = newUser.trim();
    const p = newPass.trim();
    const n = newNombre.trim() || u;

    if (!u || !p) {
      onToast('⚠️ Ingresa usuario y contraseña', 'warning');
      return;
    }

    if (usuarios.some((x) => x.user.toLowerCase() === u.toLowerCase())) {
      onToast('⚠️ Ya existe un usuario con este identificador', 'error');
      return;
    }

    const nuevo: Usuario = {
      user: u,
      pass: p,
      nombre: n,
      rol: newRol,
      creado: new Date().toISOString().slice(0, 10)
    };

    const updated = [...usuarios, nuevo];
    onSaveUsuarios(updated);
    onToast(`✅ Usuario "${u}" creado con éxito`, 'success');
    setNewUser('');
    setNewPass('');
    setNewNombre('');
    setNewRol('Supervisor');
  };

  const handleOpenEdit = (u: Usuario) => {
    setEditingUser(u);
    setEditNombre(u.nombre || u.user);
    setEditPass(u.pass);
    setEditRol(u.rol);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const updated = usuarios.map((u) => {
      if (u.user === editingUser.user) {
        return {
          ...u,
          nombre: editNombre.trim() || u.nombre,
          pass: editPass.trim() || u.pass,
          rol: editRol
        };
      }
      return u;
    });

    onSaveUsuarios(updated);
    onToast(`✅ Usuario "${editingUser.user}" actualizado`, 'success');
    setEditingUser(null);
  };

  const handleDeleteUser = (user: string) => {
    if (user === 'admin') {
      onToast('⚠️ No se puede eliminar la cuenta principal de admin', 'error');
      return;
    }
    if (!window.confirm(`¿Estás seguro de eliminar el usuario "${user}"? Se eliminará de todos los dispositivos.`)) return;

    const filtered = usuarios.filter((u) => u.user !== user);
    onSaveUsuarios(filtered);
    onToast(`🗑️ Usuario "${user}" eliminado`, 'info');
  };

  // Export login audit logs to CSV
  const handleExportAuditCSV = () => {
    if (filteredAuditorias.length === 0) {
      onToast('⚠️ No hay registros de login para exportar', 'warning');
      return;
    }

    const headers = [
      'Fecha',
      'Hora de Login',
      'Usuario',
      'Nombre Completo',
      'Rol',
      'Dispositivo'
    ];

    const rows = filteredAuditorias.map((a) => {
      return [
        `"${a.fecha}"`,
        `"${a.horaIngreso || ''}"`,
        `"${a.user}"`,
        `"${(a.nombre || '').replace(/"/g, '""')}"`,
        `"${a.rol}"`,
        `"${a.dispositivo || 'PC'}"`
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `horarios_login_usuarios_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onToast('📥 Reporte de horarios de login exportado a Excel / CSV', 'success');
  };

  // Filtered Users
  const filteredUsuarios = useMemo(() => {
    if (!search) return usuarios;
    const term = search.toLowerCase();
    return usuarios.filter((u) => (
      u.user.toLowerCase().includes(term) ||
      u.nombre.toLowerCase().includes(term) ||
      u.rol.toLowerCase().includes(term)
    ));
  }, [usuarios, search]);

  // Filtered Audit Logs
  const filteredAuditorias = useMemo(() => {
    return auditorias.filter((a) => {
      if (auditFilterDate === 'hoy' && a.fecha !== todayStr) return false;
      if (auditFilterDate !== 'hoy' && auditFilterDate !== 'todos' && a.fecha !== auditFilterDate) return false;
      if (auditFilterRole !== 'todos' && a.rol !== auditFilterRole) return false;

      if (auditSearch) {
        const term = auditSearch.toLowerCase();
        const match = a.user.toLowerCase().includes(term) || a.nombre.toLowerCase().includes(term);
        if (!match) return false;
      }
      return true;
    });
  }, [auditorias, auditFilterDate, auditFilterRole, auditSearch, todayStr]);

  // Quick stats
  const stats = useMemo(() => {
    const todayLogs = auditorias.filter((a) => a.fecha === todayStr);
    const celulares = todayLogs.filter((a) => a.dispositivo === 'Celular').length;
    const pcs = todayLogs.filter((a) => a.dispositivo !== 'Celular').length;
    return {
      totalHoy: todayLogs.length,
      celulares,
      pcs,
      totalHistorico: auditorias.length
    };
  }, [auditorias, todayStr]);

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e0e0e0] p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#f0f0f0] mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-[#e8f5e9] text-[#1b5e20] rounded-xl border border-[#c8e6c9]">
              <UserCog className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#1b5e20] flex items-center gap-2">
                <span>Gestión de Usuarios y Horarios de Login</span>
              </h2>
              <p className="text-xs text-[#757575]">
                Registro automático de la fecha y hora de acceso (login) de cada usuario al sistema
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleManualSync}
              disabled={syncing}
              className="flex items-center gap-1.5 bg-[#e8f5e9] hover:bg-[#c8e6c9] text-[#1b5e20] font-bold text-xs px-3 py-2 rounded-xl border border-[#a5d6a7] transition-all cursor-pointer shadow-sm active:scale-95"
              title="Sincronizar usuarios y horarios de login"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>Sincronizar</span>
            </button>

            <span className="bg-[#2e7d32] text-white font-bold text-xs px-3 py-2 rounded-xl shadow-sm flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span>{usuarios.length} Usuarios</span>
            </span>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex border-b border-[#e0e0e0] mb-4">
          <button
            onClick={() => setActiveSubTab('usuarios')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeSubTab === 'usuarios'
                ? 'border-[#2e7d32] text-[#1b5e20] bg-emerald-50/50 rounded-t-lg'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <UserCog className="w-4 h-4" />
            <span>Usuarios Registrados</span>
            <span className="bg-emerald-100 text-emerald-800 text-[11px] px-2 py-0.2 rounded-full font-bold">
              {usuarios.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('historial')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeSubTab === 'historial'
                ? 'border-[#2e7d32] text-[#1b5e20] bg-emerald-50/50 rounded-t-lg'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Horarios de Login (Auditoría)</span>
            {stats.totalHoy > 0 && (
              <span className="bg-amber-100 text-amber-800 text-[11px] px-2 py-0.2 rounded-full font-bold">
                {stats.totalHoy} hoy
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: USERS LIST */}
        {activeSubTab === 'usuarios' && (
          <div className="space-y-4">
            {/* Create User Form */}
            <form onSubmit={handleAddUser} className="bg-[#f9fbe7]/60 border border-[#dcedc8] p-4 sm:p-5 rounded-xl">
              <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-[#e6ee9c]">
                <h3 className="text-xs sm:text-sm font-bold text-[#1b5e20] flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#2e7d32]" />
                  <span>➕ Crear Nuevo Usuario</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-semibold text-[#40493d] mb-1">
                    Usuario Login *
                  </label>
                  <input
                    type="text"
                    placeholder="ej: supervisor1"
                    value={newUser}
                    onChange={(e) => setNewUser(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-[#bfcaba] bg-white focus:outline-none focus:border-[#2e7d32]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#40493d] mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    placeholder="ej: Juan Pérez"
                    value={newNombre}
                    onChange={(e) => setNewNombre(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-[#bfcaba] bg-white focus:outline-none focus:border-[#2e7d32]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#40493d] mb-1">
                    Contraseña *
                  </label>
                  <input
                    type="text"
                    placeholder="Contraseña"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-[#bfcaba] bg-white focus:outline-none focus:border-[#2e7d32]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#40493d] mb-1">
                    Rol *
                  </label>
                  <select
                    value={newRol}
                    onChange={(e) => setNewRol(e.target.value as UserRole)}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-[#bfcaba] bg-white focus:outline-none focus:border-[#2e7d32]"
                  >
                    <option value="Supervisor">Supervisor</option>
                    <option value="Administrador">Administrador</option>
                    <option value="Trabajador">Trabajador</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="bg-[#2e7d32] hover:bg-[#1b5e20] active:scale-[0.98] text-white px-5 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Guardar Usuario</span>
              </button>
            </form>

            {/* Search Bar */}
            <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar usuario o nombre..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-[#bfcaba] rounded-lg focus:outline-none focus:border-[#2e7d32]"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="flex items-center gap-1.5 text-xs text-[#555] hover:text-[#1b5e20] bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium"
                >
                  {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPasswords ? 'Ocultar Contraseñas' : 'Ver Contraseñas'}</span>
                </button>
                <span className="text-xs text-[#757575] font-semibold">
                  {filteredUsuarios.length} de {usuarios.length} cuentas
                </span>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto rounded-xl border border-[#e0e0e0] shadow-xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#2e7d32] text-white">
                  <tr>
                    <th className="py-2.5 px-3">Usuario</th>
                    <th className="py-2.5 px-3">Nombre</th>
                    <th className="py-2.5 px-3">Contraseña</th>
                    <th className="py-2.5 px-3">Rol</th>
                    <th className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Último Horario de Login</span>
                      </div>
                    </th>
                    <th className="py-2.5 px-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e0e0]">
                  {filteredUsuarios.map((u, idx) => {
                    const horaLogin = u.ultimaHoraLogin || u.ultimaHoraAcceso;
                    const fechaLogin = u.ultimaFechaLogin || u.ultimaFechaAcceso;
                    const isToday = fechaLogin === todayStr;

                    return (
                      <tr
                        key={u.user}
                        className={`hover:bg-[#f1f8e9] transition-colors ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-[#fcfdf9]'
                        }`}
                      >
                        <td className="py-2.5 px-3 font-bold text-[#1b5e20]">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-[#2e7d32]" />
                            <span>{u.user}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-gray-800">
                          {u.nombre || '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-gray-700">
                          {showPasswords ? u.pass : '••••••••'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              u.rol === 'Administrador'
                                ? 'bg-[#ffe082] text-[#e65100] border border-[#ffd54f]'
                                : u.rol === 'Supervisor'
                                ? 'bg-[#c8e6c9] text-[#1b5e20] border border-[#a5d6a7]'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {u.rol}
                          </span>
                        </td>

                        {/* Last Login Time */}
                        <td className="py-2.5 px-3">
                          {horaLogin ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-[#1b5e20] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                                {horaLogin}
                              </span>
                              <span className="text-[11px] text-gray-500">
                                {isToday ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    <span>Hoy</span>
                                  </span>
                                ) : (
                                  fechaLogin
                                )}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic text-[11px]">Sin logins registrados</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(u)}
                              className="p-1.5 text-[#2e7d32] hover:bg-[#e8f5e9] rounded-lg transition-all cursor-pointer"
                              title="Editar usuario"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            {u.user !== 'admin' && (
                              <button
                                onClick={() => handleDeleteUser(u.user)}
                                className="p-1.5 text-[#d32f2f] hover:bg-[#ffebee] rounded-lg transition-all cursor-pointer"
                                title="Eliminar usuario"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: LOGIN HISTORY (AUDITORIA DE HORARIOS DE LOGIN) */}
        {activeSubTab === 'historial' && (
          <div className="space-y-4">
            {/* Quick summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex flex-col">
                <span className="text-[11px] text-emerald-800 font-semibold">Logins Hoy</span>
                <span className="text-xl sm:text-2xl font-black text-emerald-950">{stats.totalHoy}</span>
                <span className="text-[10px] text-emerald-700">Sesiones iniciadas hoy</span>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex flex-col">
                <span className="text-[11px] text-blue-800 font-semibold">Desde PC</span>
                <span className="text-xl sm:text-2xl font-black text-blue-950">{stats.pcs}</span>
                <span className="text-[10px] text-blue-700">Navegador escritorio</span>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex flex-col">
                <span className="text-[11px] text-purple-800 font-semibold">Desde Celular</span>
                <span className="text-xl sm:text-2xl font-black text-purple-950">{stats.celulares}</span>
                <span className="text-[10px] text-purple-700">Dispositivos móviles</span>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex flex-col">
                <span className="text-[11px] text-gray-700 font-semibold">Total Histórico</span>
                <span className="text-xl sm:text-2xl font-black text-gray-900">{stats.totalHistorico}</span>
                <span className="text-[10px] text-gray-500">Registros acumulados</span>
              </div>
            </div>

            {/* Filter and Export Bar */}
            <div className="bg-white border border-[#e0e0e0] rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 flex-wrap flex-1">
                {/* Search */}
                <div className="relative min-w-[180px] flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filtrar por usuario o nombre..."
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-[#2e7d32]"
                  />
                </div>

                {/* Date Filter */}
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-500" />
                  <select
                    value={auditFilterDate}
                    onChange={(e) => setAuditFilterDate(e.target.value)}
                    className="text-xs px-2 py-1.5 border border-gray-300 rounded-lg bg-white font-medium"
                  >
                    <option value="hoy">Hoy ({todayStr})</option>
                    <option value="todos">Todo el Historial</option>
                  </select>
                </div>

                {/* Role Filter */}
                <select
                  value={auditFilterRole}
                  onChange={(e) => setAuditFilterRole(e.target.value)}
                  className="text-xs px-2 py-1.5 border border-gray-300 rounded-lg bg-white font-medium"
                >
                  <option value="todos">Todos los Roles</option>
                  <option value="Supervisor">Supervisores</option>
                  <option value="Administrador">Administradores</option>
                  <option value="Trabajador">Trabajadores</option>
                </select>
              </div>

              {/* Export Button */}
              <button
                type="button"
                onClick={handleExportAuditCSV}
                className="bg-[#1b5e20] hover:bg-[#0d3311] text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                title="Exportar registros de login a archivo Excel / CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar a Excel (CSV)</span>
              </button>
            </div>

            {/* Login History Table */}
            <div className="overflow-x-auto rounded-xl border border-[#e0e0e0] shadow-xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#1b5e20] text-white">
                  <tr>
                    <th className="py-2.5 px-3">Fecha</th>
                    <th className="py-2.5 px-3">Hora de Login</th>
                    <th className="py-2.5 px-3">Usuario</th>
                    <th className="py-2.5 px-3">Nombre Completo</th>
                    <th className="py-2.5 px-3">Rol</th>
                    <th className="py-2.5 px-3">Dispositivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e0e0]">
                  {filteredAuditorias.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500 italic bg-white">
                        No hay registros de login para los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredAuditorias.map((a, idx) => (
                      <tr
                        key={a.id || idx}
                        className={`hover:bg-[#f1f8e9] transition-colors ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-[#fcfdf9]'
                        }`}
                      >
                        <td className="py-2.5 px-3 font-medium text-gray-700 whitespace-nowrap">
                          {a.fecha}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-[#1b5e20] whitespace-nowrap">
                          {a.horaIngreso || '—'}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-gray-800">
                          {a.user}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-gray-800">
                          {a.nombre}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              a.rol === 'Administrador'
                                ? 'bg-[#ffe082] text-[#e65100]'
                                : a.rol === 'Supervisor'
                                ? 'bg-[#c8e6c9] text-[#1b5e20]'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            {a.rol}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1 text-[11px] text-gray-600">
                            {a.dispositivo === 'Celular' ? (
                              <Smartphone className="w-3.5 h-3.5 text-emerald-700" />
                            ) : (
                              <Monitor className="w-3.5 h-3.5 text-blue-700" />
                            )}
                            <span>{a.dispositivo || 'PC'}</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Full Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-white/20 animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-[#e0e0e0] mb-4">
              <h3 className="font-bold text-sm text-[#1b5e20] flex items-center gap-2">
                <UserCog className="w-4 h-4" />
                <span>Editar Usuario: {editingUser.user}</span>
              </h3>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#40493d] mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#bfcaba] bg-white focus:outline-none focus:border-[#2e7d32]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#40493d] mb-1">
                  Nueva Contraseña
                </label>
                <input
                  type="text"
                  value={editPass}
                  onChange={(e) => setEditPass(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#bfcaba] bg-white focus:outline-none focus:border-[#2e7d32]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#40493d] mb-1">
                  Rol
                </label>
                <select
                  value={editRol}
                  onChange={(e) => setEditRol(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#bfcaba] bg-white focus:outline-none focus:border-[#2e7d32]"
                >
                  <option value="Administrador">Administrador</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="Trabajador">Trabajador</option>
                </select>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#2e7d32] hover:bg-[#1b5e20] text-white py-2 rounded-lg text-xs font-bold shadow-md cursor-pointer"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
