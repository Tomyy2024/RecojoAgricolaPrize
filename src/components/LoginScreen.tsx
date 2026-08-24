import React, { useState } from 'react';
import { UserSession } from '../types';
import { getUsuarios } from '../utils/storage';
import { Sprout, Lock, User, KeyRound, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginScreenProps {
  onLogin: (session: UserSession) => void;
  onToast: (msg: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onToast }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const userTrim = username.trim();
    const passTrim = password.trim();

    if (!userTrim || !passTrim) {
      setError('Por favor ingresa usuario y contraseña');
      return;
    }

    const usuarios = getUsuarios();
    const found = usuarios.find(
      u => u.user.toLowerCase() === userTrim.toLowerCase() && u.pass === passTrim
    );

    if (!found) {
      setError('Usuario o contraseña incorrectos');
      return;
    }

    setError(null);
    onToast(`✅ Bienvenido, ${found.nombre}`);
    onLogin({
      user: found.user,
      nombre: found.nombre,
      rol: found.rol
    });
  };

  const handleQuickLogin = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#1b5e20] via-[#2e7d32] to-[#388e3c] p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white w-full max-w-[390px] rounded-2xl shadow-2xl p-6 sm:p-8 text-center border border-white/20"
      >
        {/* Brand Logo & Title */}
        <div className="w-20 h-20 bg-[#e8f5e9] rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-[#c8e6c9] shadow-inner">
          <Sprout className="w-10 h-10 text-[#2e7d32]" />
        </div>

        <h1 className="text-2xl font-bold text-[#1b5e20] leading-tight mb-1">
          Recojo de Fruta
        </h1>
        <p className="text-sm text-[#5f6368] mb-3">
          Aqu anqa Prize S.A.C. · AgroField
        </p>

        <div className="mb-6">
          <span className="inline-block bg-[#ff8f00] text-white text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider shadow-sm">
            Versión 23 · Multi-Fundo
          </span>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-semibold text-[#40493d] mb-1.5">
              Usuario
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#757575]">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ingresa tu usuario"
                autoComplete="username"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#bfcaba] focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20 outline-none text-sm transition-all bg-[#fcf9f8]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#40493d] mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#757575]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu contraseña"
                autoComplete="current-password"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#bfcaba] focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20 outline-none text-sm transition-all bg-[#fcf9f8]"
              />
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-[#ffebee] border border-[#ffcdd2] text-[#c62828] text-xs font-semibold text-center animate-shake">
              ❌ {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-[#2e7d32] hover:bg-[#1b5e20] active:scale-[0.98] text-white py-3 rounded-xl font-bold text-sm transition-all shadow-lg hover:shadow-xl mt-4 flex items-center justify-center gap-2 cursor-pointer"
          >
            <KeyRound className="w-4 h-4" />
            <span>Iniciar Sesión</span>
          </button>
        </form>

        {/* Quick Demo Access Accords */}
        <div className="mt-6 pt-5 border-t border-[#e0e0e0] text-left">
          <p className="text-[11px] font-bold text-[#5f6368] uppercase tracking-wider mb-2 text-center">
            Accesos de prueba rápidos por rol:
          </p>
          <div className="grid grid-cols-3 gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin', 'admin123')}
              className="p-1.5 rounded-lg bg-[#f5f5f5] hover:bg-[#e8f5e9] hover:border-[#2e7d32] border border-[#e0e0e0] text-center transition-all cursor-pointer"
            >
              <div className="font-bold text-[#1b5e20] text-xs">Admin</div>
              <div className="text-[9px] text-[#757575] truncate">admin123</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('supervisor1', 'super123')}
              className="p-1.5 rounded-lg bg-[#f5f5f5] hover:bg-[#e8f5e9] hover:border-[#2e7d32] border border-[#e0e0e0] text-center transition-all cursor-pointer"
            >
              <div className="font-bold text-[#1b5e20] text-xs">Supervisor</div>
              <div className="text-[9px] text-[#757575] truncate">super123</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('trabajador1', 'campo123')}
              className="p-1.5 rounded-lg bg-[#f5f5f5] hover:bg-[#e8f5e9] hover:border-[#2e7d32] border border-[#e0e0e0] text-center transition-all cursor-pointer"
            >
              <div className="font-bold text-[#1b5e20] text-xs">Trabajador</div>
              <div className="text-[9px] text-[#757575] truncate">campo123</div>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
