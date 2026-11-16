import { motion } from 'motion/react';
import { Eye, EyeOff, Loader2, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { HeroIllustration } from '../components/ui';
import React, { useState } from 'react';

import { UserRole } from '../App';
import { loginWithBackend } from '../services/auth';

interface LoginProps {
  onNavigate: (view: 'login' | 'dashboard' | 'landing' | 'register-student' | 'register-teacher') => void;
  onLogin: (role: UserRole) => void;
}

export default function Login({ onNavigate, onLogin }: LoginProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const session = await loginWithBackend(email, password);
      onLogin(session.role as UserRole);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo iniciar sesión';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F5FB] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl min-h-[620px] flex overflow-hidden rounded-3xl bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]"
      >
        {/* Panel izquierdo */}
        <div className="hidden lg:flex w-1/2 relative flex-col justify-between p-10 text-white bg-gradient-to-br from-[#2444D8] via-[#3552E6] to-[#4D6BFE] overflow-hidden">
          <div className="flex items-center gap-3 relative z-10">
            <div className="h-9 w-9 rounded-full bg-white text-[#2444D8] flex items-center justify-center"><ShieldCheck size={18} /></div>
            <span className="font-display text-[20px] font-bold tracking-tight">RAU</span>
          </div>
          <div className="relative z-10 h-56 -mx-4"><HeroIllustration /></div>
          <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }} className="relative z-10">
            <h1 className="font-display text-4xl font-bold leading-tight">Análisis<br />Inteligente.</h1>
            <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-white/80">
              Garantizando un ambiente de aprendizaje saludable a través de la precisión tecnológica.
            </p>
          </motion.div>
        </div>

        {/* Formulario */}
        <div className="w-full lg:w-1/2 p-8 md:p-14 flex flex-col justify-center">
          <button
            onClick={() => onNavigate('landing')}
            className="self-start inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-accent transition-colors mb-10"
          >
            <ArrowLeft size={15} /> Volver
          </button>

          <div className="mb-8">
            <h2 className="font-display text-3xl font-bold text-slate-900">Bienvenido</h2>
            <p className="mt-1 text-[14px] text-slate-500">Por favor, ingrese sus datos de acceso.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Correo electrónico</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@rau.com"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-[15px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-accent focus:bg-white focus:ring-4 focus:ring-accent/10 transition"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[13px] font-medium text-slate-700">Contraseña</label>
                <button type="button" className="text-[12px] font-medium text-accent hover:underline">Olvidé mi clave</button>
              </div>
              <div className="relative">
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 pr-12 text-[15px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-accent focus:bg-white focus:ring-4 focus:ring-accent/10 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-accent"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <label htmlFor="remember" className="flex items-center gap-2 text-[13px] text-slate-600 cursor-pointer">
              <input type="checkbox" id="remember" className="h-4 w-4 rounded accent-accent" />
              Recordar sesión
            </label>

            {errorMessage && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-[13px] text-red-700">{errorMessage}</div>
            )}

            <button
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#2444D8] py-3 text-[15px] font-semibold text-white shadow-lg shadow-accent/25 hover:brightness-110 disabled:opacity-60 transition"
            >
              {isLoading ? <Loader2 className="animate-spin" size={18} /> : (<>Entrar <ArrowRight size={17} /></>)}
            </button>
          </form>

          <footer className="mt-8 text-center text-[13px] text-slate-500">
            ¿No tienes una cuenta aún?
            <div className="mt-2 flex justify-center gap-4 font-semibold">
              <button onClick={() => onNavigate('register-student')} className="text-accent hover:underline">Registro estudiante</button>
              <span className="text-slate-300">|</span>
              <button onClick={() => onNavigate('register-teacher')} className="text-accent hover:underline">Registro docente</button>
            </div>
          </footer>
        </div>
      </motion.div>
    </div>
  );
}
