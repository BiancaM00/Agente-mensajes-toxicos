import { motion } from 'motion/react';
import { Shield, MessageSquare, Sparkles, ChevronRight, Menu, X, ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { HeroIllustration } from '../components/ui';

interface LandingProps {
  onNavigate: (view: 'login' | 'dashboard' | 'landing' | 'register-student' | 'register-teacher') => void;
}

export default function Landing({ onNavigate }: LandingProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const features = [
    {
      title: "IA Avanzada",
      description: "Moderación en tiempo real utilizando algoritmos de vanguardia para un entorno libre de acoso.",
      icon: Sparkles,
      color: "bg-violet-50 text-violet-600",
    },
    {
      title: "Gestión de Foros",
      description: "Organiza tus cursos y debates con una interfaz intuitiva centrada en el aprendizaje.",
      icon: MessageSquare,
      color: "bg-teal-50 text-teal-600",
    },
    {
      title: "Moderación",
      description: "Herramientas de control total para docentes y administradores de la red académica.",
      icon: Shield,
      color: "bg-amber-50 text-amber-600",
    }
  ];

  const steps = [
    { id: 1, title: "Publicación", desc: "Crea contenido en el foro de tu curso." },
    { id: 2, title: "Análisis IA", desc: "Escaneo inmediato de contenido sensible." },
    { id: 3, title: "Clasificación", desc: "Niveles de toxicidad detectados por el sistema." },
    { id: 4, title: "Aprobación", desc: "El docente valida la publicación final." }
  ];

  const navItems = ['Learn', 'Grow', 'Play', 'Explore'];

  return (
    <div className="min-h-screen bg-[#F3F5FB] text-slate-900 selection:bg-accent selection:text-white">
      {/* Navegación */}
      <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-[#2444D8] text-white flex items-center justify-center shadow-md shadow-accent/30"><ShieldCheck size={18} /></div>
              <span className="font-display text-[20px] font-bold tracking-tight">STUDIO RAU</span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              {navItems.map(item => (
                <button key={item} className="text-[14px] font-medium text-slate-500 hover:text-slate-900 transition-colors">
                  {item}
                </button>
              ))}
              <button
                onClick={() => onNavigate('login')}
                className="rounded-xl bg-[#2444D8] text-white text-[14px] font-semibold px-5 py-2 shadow-md shadow-accent/25 hover:brightness-110 transition"
              >
                Acceder
              </button>
            </div>

            <div className="md:hidden">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-slate-600">
                {isMenuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>
        </div>

        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden bg-white border-b border-slate-100 p-4 flex flex-col gap-3 text-center"
          >
            {navItems.map(item => <a key={item} href="#" className="text-slate-600 py-1">{item}</a>)}
            <button
              onClick={() => onNavigate('login')}
              className="rounded-xl bg-[#2444D8] text-white text-[14px] font-semibold px-5 py-2.5"
            >
              Acceder
            </button>
          </motion.div>
        )}
      </nav>

      {/* Hero */}
      <header className="pt-28 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <motion.span
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 rounded-full bg-[#EEF2FF] text-[#2444D8] text-[12px] font-semibold px-3 py-1"
            >
              <Sparkles size={14} /> Seguridad Académica 2026
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-6 font-display text-5xl md:text-[64px] font-bold leading-[1.05] tracking-tight"
            >
              Esencia <span className="text-[#2444D8]">Académica.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-5 max-w-xl text-[17px] leading-relaxed text-slate-600"
            >
              Creamos experiencias académicas seguras. Elegancia, precisión y un enfoque radical en el comportamiento digital.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <button
                onClick={() => onNavigate('login')}
                className="inline-flex items-center gap-2 rounded-xl bg-[#2444D8] text-white text-[14px] font-semibold px-6 py-3 shadow-lg shadow-accent/25 hover:-translate-y-0.5 transition-transform"
              >
                Iniciar sesión <ChevronRight size={16} />
              </button>
              <button
                onClick={() => onNavigate('register-student')}
                className="rounded-xl bg-white text-slate-700 text-[14px] font-semibold px-6 py-3 border border-slate-200 hover:border-accent/40 hover:text-accent transition-colors"
              >
                Soy estudiante
              </button>
              <button
                onClick={() => onNavigate('register-teacher')}
                className="rounded-xl bg-white text-slate-700 text-[14px] font-semibold px-6 py-3 border border-slate-200 hover:border-accent/40 hover:text-accent transition-colors"
              >
                Soy docente
              </button>
            </motion.div>
          </div>

          {/* Tarjeta visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="relative"
          >
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2444D8] via-[#3552E6] to-[#4D6BFE] h-[340px] shadow-[0_24px_48px_rgba(36,68,216,0.28)]">
              <div className="absolute inset-0 p-8"><HeroIllustration /></div>
            </div>
            <div className="absolute -left-4 top-10 rounded-2xl bg-white px-4 py-3 shadow-xl flex items-center gap-3">
              <span className="h-9 w-9 rounded-xl bg-green-50 text-green-600 flex items-center justify-center"><CheckCircle2 size={18} /></span>
              <div>
                <div className="text-[13px] font-semibold">Mensaje publicado</div>
                <div className="text-[11px] text-slate-400">Tono respetuoso</div>
              </div>
            </div>
            <div className="absolute -right-3 bottom-8 rounded-2xl bg-white px-4 py-3 shadow-xl flex items-center gap-3">
              <span className="h-9 w-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center"><AlertTriangle size={18} /></span>
              <div>
                <div className="text-[13px] font-semibold">Enviado a revisión</div>
                <div className="text-[11px] text-slate-400">Posible lenguaje ofensivo</div>
              </div>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Herramientas */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="text-[13px] font-semibold text-[#2444D8]">Filosofía</span>
            <h2 className="mt-1 font-display text-3xl md:text-4xl font-bold tracking-tight">Nuestras herramientas</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="rounded-2xl bg-white p-7 shadow-[0_4px_16px_rgba(15,23,42,0.04)] hover:-translate-y-1 hover:shadow-[0_16px_32px_rgba(36,68,216,0.10)] transition-all"
              >
                <div className={`w-12 h-12 mb-5 flex items-center justify-center rounded-xl ${feature.color}`}>
                  <feature.icon size={24} strokeWidth={1.8} />
                </div>
                <h3 className="font-display text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-[14px] text-slate-500 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Metodología */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-white p-8 md:p-12 shadow-[0_4px_16px_rgba(15,23,42,0.04)] grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <span className="text-[13px] font-semibold text-[#2444D8]">Metodología</span>
              <h2 className="mt-1 font-display text-3xl md:text-4xl font-bold tracking-tight">Diseñamos el futuro de la comunicación académica.</h2>
              <p className="mt-4 text-[16px] text-slate-500 leading-relaxed">Buscamos la verdad en la interacción y el equilibrio en el espacio educativo digital.</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {steps.map((step) => (
                <div key={step.id} className="rounded-2xl bg-[#F6F8FD] p-5">
                  <div className="h-9 w-9 rounded-full bg-[#2444D8] text-white flex items-center justify-center text-[14px] font-bold">{step.id}</div>
                  <h4 className="mt-3 font-display text-[16px] font-semibold">{step.title}</h4>
                  <p className="mt-1 text-[13px] text-slate-500">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pie */}
      <footer className="py-10 border-t border-slate-200/70 text-center">
        <div className="text-[13px] text-slate-500">© 2026 RAU — Cartagena — Global</div>
        <p className="text-[11px] text-slate-400 mt-2">Scroll not required — Gemini powered</p>
      </footer>
    </div>
  );
}
