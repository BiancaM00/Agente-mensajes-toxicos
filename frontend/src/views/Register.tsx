import { motion } from 'motion/react';
import { Eye, EyeOff, Loader2, ArrowLeft, ArrowRight, ShieldCheck, GraduationCap, BookOpen } from 'lucide-react';
import { HeroIllustration } from '../components/ui';
import React, { useState } from 'react';

interface RegisterProps {
  type: 'student' | 'teacher';
  onNavigate: (view: 'login' | 'dashboard' | 'landing') => void;
  onRegister: () => void;
}

export default function Register({ type, onNavigate, onRegister }: RegisterProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    teacherCode: '',
    password: '',
    confirmPassword: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Las contraseñas no coinciden");
      return;
    }
    setIsLoading(true);
    (async () => {
      try {
        const payload: any = { 
          nombre: formData.fullName, 
          email: formData.email, 
          password: formData.password,
          institucion_id: 1 // Default institution ID
        };
        if (type === 'teacher') payload.codigo_docente = formData.teacherCode;
        // call API
        if (type === 'student') {
          await (await import('../services/api')).registerStudent(payload);
        } else {
          await (await import('../services/api')).registerTeacher(payload);
        }
        // on success, notify parent to navigate/login
        onRegister();
      } catch (err: any) {
        console.error('Registration error', err);
        alert(err?.detail || err?.message || 'Error al registrar');
      } finally {
        setIsLoading(false);
      }
    })();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-[15px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-accent focus:bg-white focus:ring-4 focus:ring-accent/10 transition";
  const labelCls = "block text-[13px] font-medium text-slate-700 mb-1.5";

  return (
    <div className="min-h-screen bg-[#F3F5FB] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl min-h-[680px] flex overflow-hidden rounded-3xl bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]"
      >
        {/* Panel izquierdo */}
        <div className="hidden lg:flex w-1/2 relative flex-col justify-between p-10 text-white bg-gradient-to-br from-[#2444D8] via-[#3552E6] to-[#4D6BFE] overflow-hidden">
          <div className="flex items-center gap-3 relative z-10">
            <div className="h-9 w-9 rounded-full bg-white text-[#2444D8] flex items-center justify-center"><ShieldCheck size={18} /></div>
            <span className="font-display text-[20px] font-bold tracking-tight">RAU</span>
          </div>
          <div className="relative z-10 h-56 -mx-4"><HeroIllustration /></div>
          <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }} className="relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[12px] font-semibold">
              {type === 'student' ? <GraduationCap size={14} /> : <BookOpen size={14} />} {type === 'student' ? 'Estudiante' : 'Docente'}
            </span>
            <h1 className="mt-3 font-display text-4xl font-bold leading-tight">
              Únete a la<br />{type === 'student' ? 'Comunidad.' : 'Facultad.'}
            </h1>
            <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-white/80">
              Contribuye a un entorno académico más seguro y respetuoso para todos los miembros de la red.
            </p>
          </motion.div>
        </div>

        {/* Formulario */}
        <div className="w-full lg:w-1/2 p-8 md:p-12 flex flex-col justify-center overflow-y-auto">
          <button
            onClick={() => onNavigate('login')}
            className="self-start inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-accent transition-colors mb-8"
          >
            <ArrowLeft size={15} /> Volver al inicio de sesión
          </button>

          <div className="mb-6">
            <h2 className="font-display text-3xl font-bold text-slate-900">Registro de {type === 'student' ? 'estudiante' : 'docente'}</h2>
            <p className="mt-1 text-[14px] text-slate-500">Completa el formulario para crear tu cuenta institucional.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelCls}>Nombre completo</label>
              <input required name="fullName" type="text" value={formData.fullName} onChange={handleChange} placeholder="Ej. Juan Pérez" className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>{type === 'student' ? 'Correo electrónico' : 'Correo electrónico institucional'}</label>
              <input required name="email" type="email" value={formData.email} onChange={handleChange} placeholder="example@rau.com" className={inputCls} />
            </div>

            {type === 'teacher' && (
              <div>
                <label className={labelCls}>Código de docente</label>
                <input required name="teacherCode" type="text" value={formData.teacherCode} onChange={handleChange} placeholder="ID-XXXX-2026" className={inputCls} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Contraseña</label>
                <div className="relative">
                  <input required name="password" min={8} type={showPassword ? "text" : "password"} value={formData.password} onChange={handleChange} placeholder="••••••••" className={inputCls + ' pr-11'} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-accent">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className={labelCls}>Confirmar</label>
                <input required name="confirmPassword" type={showPassword ? "text" : "password"} value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" className={inputCls} />
              </div>
            </div>

            <p className="text-[12px] text-slate-400 leading-normal">
              Al registrarte, aceptas nuestros lineamientos de convivencia digital y ética académica.
            </p>

            <button
              disabled={isLoading}
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#2444D8] py-3 text-[15px] font-semibold text-white shadow-lg shadow-accent/25 hover:brightness-110 disabled:opacity-60 transition"
            >
              {isLoading ? <Loader2 className="animate-spin" size={18} /> : (<>Crear cuenta RAU <ArrowRight size={17} /></>)}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
