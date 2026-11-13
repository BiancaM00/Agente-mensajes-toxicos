import { motion } from 'motion/react';
import { Layout, Eye, EyeOff, Loader2 } from 'lucide-react';
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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-90" style={{ background: 'radial-gradient(circle at 18% 12%, rgba(36,68,216,0.14), transparent 25%), radial-gradient(circle at 85% 15%, rgba(61,90,254,0.10), transparent 22%), radial-gradient(circle at 78% 88%, rgba(36,68,216,0.08), transparent 20%)' }} />
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl h-[640px] flex overflow-hidden card-hero relative z-10"
      >
        {/* Left Side: Branding */}
        <div className="hidden lg:flex w-1/2 relative p-12 flex-col items-start justify-end text-paper" style={{ background: 'linear-gradient(160deg, #2444D8 0%, #3D5AFE 100%)' }}>
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
          
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="relative z-10"
          >
            <div className="text-accent font-serif italic text-6xl mb-8">R.</div>
            <h1 className="text-5xl font-serif leading-tight mb-6">Análisis<br />Inteligente.</h1>
            <p className="text-md max-w-xs leading-relaxed opacity-60 font-light">
              Garantizando un ambiente de aprendizaje saludable a través de la precisión tecnológica.
            </p>
          </motion.div>
        </div>

        {/* Right Side: Form */}
        <div className="w-full lg:w-1/2 p-12 md:p-20 flex flex-col justify-center bg-white/90 backdrop-blur-sm">
          <button 
            onClick={() => onNavigate('landing')}
            className="self-end mono-label mb-12 btn-outline-accent hover:shadow-md"
          >
            ← Volver
          </button>
          
          <div className="mb-12">
            <h2 className="text-4xl font-serif mb-3 italic">Bienvenido</h2>
            <p className="mono-label !text-xs opacity-40">Por favor, ingrese sus datos de acceso.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="border-b border-ink/10 pb-2 transition-all focus-within:border-accent">
              <label className="mono-label !text-[9px] mb-1 block">Correo Electrónico</label>
              <input 
                required
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@rau.com"
                className="w-full bg-transparent p-0 text-ink font-serif text-lg outline-none placeholder:opacity-20"
              />
            </div>

            <div className="border-b border-ink/10 pb-2 transition-all focus-within:border-accent">
              <div className="flex justify-between items-end mb-1">
                <label className="mono-label !text-[9px]">Contraseña</label>
                <button type="button" className="text-[9px] mono-label hover:text-accent underline">Olvidé mi clave</button>
              </div>
              <div className="relative">
                <input 
                  required
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-transparent p-0 text-ink font-serif text-lg outline-none placeholder:opacity-20 pr-12"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-ink/30 hover:text-accent"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="remember" className="w-3 h-3 accent-accent" />
              <label htmlFor="remember" className="text-[10px] mono-label opacity-60">Recordar sesión</label>
            </div>

            {errorMessage && (
              <p className="text-[11px] text-red-600 mono-label">{errorMessage}</p>
            )}

            <button 
              disabled={isLoading}
              className="w-full btn-cta mono-label !text-xs flex items-center justify-center gap-3 overflow-hidden group"
            >
              {isLoading ? <Loader2 className="animate-spin" size={14} /> : (
                <>
                  Entrar
                  <motion.span animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>→</motion.span>
                </>
              )}
            </button>
          </form>

          <footer className="mt-12 text-center">
            <p className="mono-label !text-[9px] opacity-40 mb-4 tracking-normal">¿No tienes una cuenta aún?</p>
            <div className="flex flex-col gap-2 font-bold text-accent">
              <button 
                onClick={() => onNavigate('register-student')}
                className="mono-label !text-[10px] hover:underline"
              >
                Registro Estudiante
              </button>
              <button 
                onClick={() => onNavigate('register-teacher')}
                className="mono-label !text-[10px] hover:underline"
              >
                Registro Docente
              </button>
            </div>
          </footer>
        </div>
      </motion.div>
    </div>
  );
}
