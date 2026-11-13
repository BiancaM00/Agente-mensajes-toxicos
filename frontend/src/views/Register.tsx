import { motion } from 'motion/react';
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-90" style={{ background: 'radial-gradient(circle at 18% 12%, rgba(36,68,216,0.14), transparent 25%), radial-gradient(circle at 85% 15%, rgba(61,90,254,0.10), transparent 22%), radial-gradient(circle at 78% 88%, rgba(36,68,216,0.08), transparent 20%)' }} />
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl h-[720px] flex overflow-hidden card-hero relative z-10"
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
            <div className="text-accent font-serif italic text-6xl mb-8">
              {type === 'student' ? 'E.' : 'D.'}
            </div>
            <h1 className="text-5xl font-serif leading-tight mb-6">
              Únete a la<br />
              {type === 'student' ? 'Comunidad.' : 'Facultad.'}
            </h1>
            <p className="text-md max-w-xs leading-relaxed opacity-60 font-light">
              Contribuye a un entorno académico más seguro y respetuoso para todos los miembros de la red.
            </p>
          </motion.div>
        </div>

        {/* Right Side: Form */}
        <div className="w-full lg:w-1/2 p-12 md:p-16 flex flex-col justify-center bg-white/90 backdrop-blur-sm overflow-y-auto">
          <button 
            onClick={() => onNavigate('login')}
            className="self-start mono-label mb-8 btn-outline-accent flex items-center gap-2 hover:shadow-md"
          >
            <ArrowLeft size={12} /> Volver al Inicio Sesión
          </button>
          
          <div className="mb-8">
            <h2 className="text-4xl font-serif mb-2 italic">Registro de {type === 'student' ? 'Estudiante' : 'Docente'}</h2>
            <p className="mono-label !text-[9px] opacity-40">Completa el formulario para crear tu cuenta institucional.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="border-b border-ink/10 pb-2 transition-all focus-within:border-accent">
              <label className="mono-label !text-[9px] mb-1 block">Nombre Completo</label>
              <input 
                required
                name="fullName"
                type="text" 
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Ej. Juan Pérez"
                className="w-full bg-transparent p-0 text-ink font-serif text-lg outline-none placeholder:opacity-20"
              />
            </div>

            <div className="border-b border-ink/10 pb-2 transition-all focus-within:border-accent">
              <label className="mono-label !text-[9px] mb-1 block">
                {type === 'student' ? 'Correo Electrónico' : 'Correo Electrónico Institucional'}
              </label>
              <input 
                required
                name="email"
                type="email" 
                value={formData.email}
                onChange={handleChange}
                placeholder="example@rau.com"
                className="w-full bg-transparent p-0 text-ink font-serif text-lg outline-none placeholder:opacity-20"
              />
            </div>

            {type === 'teacher' && (
              <div className="border-b border-ink/10 pb-2 transition-all focus-within:border-accent">
                <label className="mono-label !text-[9px] mb-1 block">Código de Docente</label>
                <input 
                  required
                  name="teacherCode"
                  type="text" 
                  value={formData.teacherCode}
                  onChange={handleChange}
                  placeholder="ID-XXXX-2026"
                  className="w-full bg-transparent p-0 text-ink font-serif text-lg outline-none placeholder:opacity-20"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              <div className="border-b border-ink/10 pb-2 transition-all focus-within:border-accent">
                <label className="mono-label !text-[9px] mb-1 block">Contraseña</label>
                <div className="relative">
                  <input 
                    required
                    name="password"
                    min={8}
                    type={showPassword ? "text" : "password"} 
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full bg-transparent p-0 text-ink font-serif text-lg outline-none placeholder:opacity-20 pr-8"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 text-ink/30 hover:text-accent"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="border-b border-ink/10 pb-2 transition-all focus-within:border-accent">
                <label className="mono-label !text-[9px] mb-1 block">Confirmar</label>
                <input 
                  required
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"} 
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full bg-transparent p-0 text-ink font-serif text-lg outline-none placeholder:opacity-20"
                />
              </div>
            </div>

            <p className="text-[9px] mono-label opacity-40 leading-normal">
              Al registrarte, aceptas nuestros lineamientos de convivencia digital y ética académica.
            </p>

            <button 
              disabled={isLoading}
              type="submit"
              className="w-full btn-cta mono-label !text-xs flex items-center justify-center gap-3 overflow-hidden group"
            >
              {isLoading ? <Loader2 className="animate-spin" size={14} /> : (
                <>
                  Crear Cuenta RAU
                  <motion.span animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>→</motion.span>
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
