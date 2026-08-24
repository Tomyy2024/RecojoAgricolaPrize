import React, { useState } from 'react';
import { Usuario, UserRole } from '../types';
import { UserCog, Plus, Search, Pencil, Trash2, Shield, User, KeyRound, Check, X } from 'lucide-react';

interface UsuariosTabProps {
  usuarios: Usuario[];
  onSaveUsuarios: (usuarios: Usuario[]) => void;
  onToast: (msg: string) => void;
}

export const UsuariosTab: React.FC<UsuariosTabProps> = ({
  usuarios,
  onSaveUsuarios,
  onToast
}) => {
  const [newUser, setNewUser] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newNombre, setNewNombre] = useState('');
  const [newRol, setNewRol] = useState<UserRole>('Supervisor');
  const [search, setSearch] = useState('');

  // Editing state
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [editPass, setEditPass] = useState('');
  const [editRol, setEditRol] = useState<UserRole>('Supervisor');

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    const u = newUser.trim();
    const p = newPass.trim();
    const n = newNombre.trim() || u;

    if (!u || !p) {
      onToast('⚠️ Ingresa usuario y contraseña');
      return;
    }

    if (usuarios.some((x) => x.user.toLowerCase() === u.toLowerCase())) {
      onToast('⚠️ Ya existe un usuario con este nombre');
      return;
    }

    const nuevo: Usuario = {
      user: u,
      pass: p,
      nombre: n,
      rol: newRol,
      creado: new Date().toISOString().slice(0, 10)
    };

    onSaveUsuarios([...usuarios, nuevo]);
    onToast(`✅ Usuario "${u}" creado con rol ${newRol}`);
    setNewUser('');
    setNewPass('');
    setNewNombre('');
    setNewRol('Supervisor');
  };

  const handleOpenEdit = (u: Usuario) => {
    setEditingUser(u);
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
          pass: editPass.trim() || u.pass,
          rol: editRol
        };
      }
      return u;
    });

    onSaveUsuarios(updated);
    onToast(`✅ Usuario "${editingUser.user}" actualizado`);
    setEditingUser(null);
  };

  const handleDeleteUser = (user: string) => {
    if (user === 'admin') {
      onToast('⚠️ No se puede eliminar la cuenta principal de admin');
      return;
    }
    if (!window.confirm(`¿Estás seguro de eliminar el usuario "${user}"?`)) return;

    const filtered = usuarios.filter((u) => u.user !== user);
    onSaveUsuarios(filtered);
    onToast(`🗑️ Usuario "${user}" eliminado`);
  };

  const filteredUsuarios = usuarios.filter((u) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      u.user.toLowerCase().includes(term) ||
      u.nombre.toLowerCase().includes(term) ||
      u.rol.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-4">
      {/* Main Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e0e0e0] p-4 sm:p-6">
        <div className="flex items-center justify-between pb-3 border-b border-[#f0f0f0] mb-4">
          <div className="flex items-center gap-2">
            <UserCog className="w-5 h-5 text-[#2e7d32]" />
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#1b5e20]">
                Gestión y Control de Usuarios
              </h2>
              <p className="text-xs text-[#757575]">
                Administra credenciales y roles para supervisores y personal
              </p>
            </div>
          </div>
          <span className="bg-[#e8f5e9] text-[#1b5e20] font-bold text-xs px-2.5 py-1 rounded-full border border-[#a5d6a7]">
            {usuarios.length} Cuentas
          </span>
        </div>

        {/* Add User Form */}
        <form onSubmit={handleAddUser} className="bg-[#f9fbe7]/60 border border-[#dcedc8] p-4 rounded-xl mb-6">
          <h3 className="text-xs sm:text-sm font-bold text-[#1b5e20] mb-3 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-[#2e7d32]" />
            <span>➕ Agregar Nuevo Usuario</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-semibold text-[#40493d] mb-1">
                Nombre o Identificador
              </label>
              <input
                type="text"
                placeholder="Ej: Carlos Mendoza"
                value={newNombre}
                onChange={(e) => setNewNombre(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-[#bfcaba] bg-white focus:outline-none focus:border-[#2e7d32]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#40493d] mb-1">
                Usuario (Login) *
              </label>
              <input
                type="text"
                placeholder="Ej: supervisor_campo"
                value={newUser}
                onChange={(e) => setNewUser(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-[#bfcaba] bg-white focus:outline-none focus:border-[#2e7d32]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-semibold text-[#40493d] mb-1">
                Contraseña *
              </label>
              <input
                type="text"
                placeholder="Contraseña de acceso"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-[#bfcaba] bg-white focus:outline-none focus:border-[#2e7d32]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#40493d] mb-1">
                Rol del Sistema *
              </label>
              <select
                value={newRol}
                onChange={(e) => setNewRol(e.target.value as UserRole)}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-[#bfcaba] bg-white focus:outline-none focus:border-[#2e7d32]"
              >
                <option value="Administrador">Administrador (Acceso total)</option>
                <option value="Supervisor">Supervisor (Programación y tareo)</option>
                <option value="Trabajador">Trabajador (Consulta)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="bg-[#2e7d32] hover:bg-[#1b5e20] text-white px-5 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>💾 Guardar Usuario</span>
          </button>
        </form>

        {/* Search */}
        <div className="flex justify-between items-center gap-2 mb-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por usuario o rol..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-[#bfcaba] rounded-lg focus:outline-none focus:border-[#2e7d32]"
            />
          </div>
          <span className="text-xs text-[#757575]">
            Mostrando {filteredUsuarios.length} de {usuarios.length}
          </span>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto rounded-xl border border-[#e0e0e0]">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#2e7d32] text-white">
              <tr>
                <th className="py-2.5 px-3">Usuario</th>
                <th className="py-2.5 px-3">Nombre</th>
                <th className="py-2.5 px-3">Rol</th>
                <th className="py-2.5 px-3">Fecha Creación</th>
                <th className="py-2.5 px-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e0e0]">
              {filteredUsuarios.map((u, idx) => (
                <tr
                  key={u.user}
                  className={`hover:bg-[#f1f8e9] transition-colors ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-[#fcfdf9]'
                  }`}
                >
                  <td className="py-2.5 px-3 font-bold text-[#1b5e20]">{u.user}</td>
                  <td className="py-2.5 px-3 font-medium">{u.nombre}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.rol === 'Administrador'
                          ? 'bg-[#ffe082] text-[#e65100]'
                          : u.rol === 'Supervisor'
                          ? 'bg-[#c8e6c9] text-[#1b5e20]'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {u.rol}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-gray-500">{u.creado || '—'}</td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="p-1 text-[#2e7d32] hover:bg-[#e8f5e9] rounded transition-all cursor-pointer"
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {u.user !== 'admin' && (
                        <button
                          onClick={() => handleDeleteUser(u.user)}
                          className="p-1 text-[#d32f2f] hover:bg-[#ffebee] rounded transition-all cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-white/20 animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-[#e0e0e0] mb-4">
              <h3 className="font-bold text-sm text-[#1b5e20]">
                Editar Usuario: {editingUser.user}
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
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
                  Actualizar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
