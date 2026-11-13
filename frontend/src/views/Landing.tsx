import { motion } from 'motion/react';
import { Shield, MessageSquare, Layout, Sparkles, CheckCircle2, ChevronRight, Menu, X } from 'lucide-react';
import { useState } from 'react';

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
      color: "bg-purple-100 text-purple-600",
      borderColor: "border-purple-200"
    },
    {
      title: "Gestión de Foros",
      description: "Organiza tus cursos y debates con una interfaz intuitiva centrada en el aprendizaje.",
      icon: MessageSquare,
      color: "bg-teal-100 text-teal-600",
      borderColor: "border-teal-200"
    },
    {
      title: "Moderación",
      description: "Herramientas de control total para docentes y administradores de la red académica.",
      icon: Shield,
      color: "bg-amber-100 text-amber-600",
      borderColor: "border-amber-200"
    }
  ];

  const steps = [
    { id: 1, title: "Publicación", desc: "Crea contenido en el foro de tu curso." },
    { id: 2, title: "Análisis IA", desc: "Escaneo inmediato de contenido sensible." },
    { id: 3, title: "Clasificación", desc: "Niveles de toxicidad detectados por el sistema." },
    { id: 4, title: "Aprobación", desc: "El docente valida la publicación final." }
  ];

  return (
    <div className="min-h-screen text-ink selection:bg-accent selection:text-white relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-90" style={{ background: 'radial-gradient(circle at 15% 10%, rgba(36,68,216,0.16), transparent 24%), radial-gradient(circle at 85% 15%, rgba(61,90,254,0.12), transparent 26%), radial-gradient(circle at 80% 85%, rgba(36,68,216,0.08), transparent 22%)' }} />
      {/* Navigation */}
      <nav className="fixed top-0 w-full glass-strip z-50 editorial-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-serif font-black tracking-tighter">
                STUDIO RAU
              </span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-10">
              {['Learn', 'Grow', 'Play', 'Explore'].map(item => (
                <button key={item} className="mono-label hover:opacity-100 transition-opacity">
                  {item}
                </button>
              ))}
              <button 
                onClick={() => onNavigate('login')}
                className="btn-cta mono-label !text-[10px]"
              >
                Acceder
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-gray-600">
                {isMenuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden bg-white border-b border-gray-100 p-4 flex flex-col gap-4 text-center"
          >
            <a href="#" className="text-gray-600">Learn</a>
            <a href="#" className="text-gray-600">Grow</a>
            <a href="#" className="text-gray-600">Play</a>
            <a href="#" className="text-gray-600">Explore</a>
            <button 
              onClick={() => onNavigate('login')}
              className="btn-cta mono-label !text-[10px]"
            >
              Acceder
            </button>
          </motion.div>
        )}
      </nav>

      {/* Hero Section */}
      <header className="relative pt-32 pb-24 overflow-hidden border-b border-ink/5 soft-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mono-label mb-8 block accent-underline inline-block pb-1 px-4 py-2 rounded-full bg-white/70"
          >
            Seguridad Académica 2026
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl md:text-[100px] font-serif font-light leading-[0.9] mb-12 tracking-[-0.04em] hero-gradient-text"
          >
            Esencia <br className="hidden md:block" />
            <span className="italic font-serif font-normal">Académica.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-2xl mx-auto text-xl leading-relaxed opacity-80 mb-12"
          >
            Creamos experiencias académicas seguras. Elegancia, precisión y un enfoque radical en el comportamiento digital.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap justify-center gap-6"
          >
            <button 
              onClick={() => onNavigate('login')}
              className="btn-cta mono-label !text-xs"
            >
              Iniciar Sesión
            </button>
            <button 
              onClick={() => onNavigate('register-student')}
              className="btn-outline-accent mono-label !text-xs px-10 py-4 hover:bg-white hover:shadow-lg"
            >
              Soy Estudiante
            </button>
            <button 
              onClick={() => onNavigate('register-teacher')}
              className="btn-outline-accent mono-label !text-xs px-10 py-4 hover:bg-white hover:shadow-lg"
            >
              Soy Docente
            </button>
          </motion.div>
        </div>

        {/* Decorative background grid */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </header>

      {/* Features Section */}
      <section id="features" className="py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col mb-20">
            <span className="mono-label text-accent mb-4">Filosofía</span>
            <h2 className="text-5xl md:text-6xl font-serif">Nuestras Herramientas</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="card-hero p-12 group"
              >
                <div className="w-14 h-14 mb-8 flex items-center justify-center rounded-2xl bg-primary/10 text-accent ring-1 ring-primary/10">
                  <feature.icon size={32} strokeWidth={1.5} />
                </div>
                <h3 className="text-3xl font-serif mb-6">{feature.title}</h3>
                <p className="text-ink/65 leading-relaxed font-sans font-light">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-32 border-t border-ink/5">
        <div className="max-w-7xl mx-auto px-4 lg:grid lg:grid-cols-2 lg:gap-20 items-center">
          <div>
            <span className="mono-label text-accent mb-4 block">Metodología</span>
            <h2 className="text-5xl font-serif mb-8">Diseñamos el futuro de la comunicación académica.</h2>
            <p className="text-xl text-ink/60 mb-12 font-light">Buscamos la verdad en la interacción y el equilibrio en el espacio educativo digital.</p>
          </div>

          <div className="grid sm:grid-cols-1 gap-8 border-l border-ink/10 pl-12">
            {steps.map((step) => (
              <div key={step.id} className="group card-hero p-6">
                <div className="text-4xl font-serif text-accent mb-2">{step.id.toString().padStart(2, '0')}</div>
                <div>
                  <h4 className="mono-label text-ink mb-2">{step.title}</h4>
                  <p className="text-ink/50 text-sm font-light">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-ink/10 text-center bg-paper">
        <div className="mono-label opacity-40">
          © 2026 RAU — CARTAGENA — GLOBAL
        </div>
        <p className="text-[10px] mono-label opacity-30 mt-4">
          SCROLL NOT REQUIRED — GEMINI POWERED
        </p>
      </footer>
    </div>
  );
}
