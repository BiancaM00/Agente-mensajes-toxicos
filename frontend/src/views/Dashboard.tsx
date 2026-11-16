import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart3, Users, AlertTriangle, ShieldCheck, 
  Search, Bell, LogOut, MessageSquare, 
  ArrowUpRight, ArrowDownRight, MoreVertical,
  Sparkles, CheckCircle2, ChevronRight, Plus, FolderOpen, Send, Trash2
} from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../services/api';
import { UserRole } from '../App';
import { ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { getStoredSession } from '../services/auth';
import { BookOpen, Code2, Calculator, Scale, Database, BrainCircuit, CalendarDays, Eye, Minus } from 'lucide-react';
import { Card, KpiCard, RiskBadge, StatusBadge, ScoreBar, Avatar, ActivityArea, RiskDonut, CourseBars, Gauge, ScoreLine, RISK_COLOR, HeroIllustration, WeekStrip } from '../components/ui';

interface DashboardProps {
  userRole: UserRole | null;
  onLogout: () => void;
}

interface Forum {
  id: number;
  title: string;
  threads: number;
  lastPost: string;
}

interface Course {
  id: number;
  name: string;
  incidents?: number;
  health?: number;
  faculty?: string;
  teacher?: string;
  forums?: Forum[];
  enrolled?: boolean;
}

interface Hilo {
  id: number;
  titulo: string;
}

interface PublicacionItem {
  id: number;
  contenido: string;
  autor_id: number;
  estado: string;
  creado_en?: string;
}

interface EnrollmentItem {
  id: number;
  curso_id: number;
  curso_nombre: string;
  usuario_id: number;
  usuario_nombre: string;
  usuario_email: string;
  rol_en_curso: string;
  activo: boolean;
}

interface AdminUserItem {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
}

export default function Dashboard({ userRole, onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'messages' | 'courses' | 'settings'>(() => {
    return userRole === 'estudiante' ? 'courses' : 'overview';
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [activeForum, setActiveForum] = useState<Forum | null>(null);
  const [showNewForumModal, setShowNewForumModal] = useState(false);
  const [newForumTitle, setNewForumTitle] = useState('');
  const [forumThreads, setForumThreads] = useState<Hilo[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
  const [forumPosts, setForumPosts] = useState<PublicacionItem[]>([]);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [postWarning, setPostWarning] = useState('');
  const [showWarning, setShowWarning] = useState(true);
  const [loadingForumData, setLoadingForumData] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [showCreateCourseModal, setShowCreateCourseModal] = useState(false);
  const [newCourse, setNewCourse] = useState({ nombre: '', codigo: '', periodo: '2026-1', institucion_id: 1 });
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [newEnrollment, setNewEnrollment] = useState({ usuario_email: '', nombre: '', rol_en_curso: 'ESTUDIANTE', crear_si_no_existe: false });

  const [coursesList, setCoursesList] = useState<Course[]>([]);
  const [recentIncidents, setRecentIncidents] = useState<any[]>([]);
  const [courseEnrollments, setCourseEnrollments] = useState<EnrollmentItem[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUserItem[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingIncidents, setLoadingIncidents] = useState(false);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [messagesMode, setMessagesMode] = useState<'pendientes'|'historial'>('pendientes');
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [teacherEvaluationsCount, setTeacherEvaluationsCount] = useState<number>(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [globalMetrics, setGlobalMetrics] = useState<{
    total_evaluadas: number;
    incidentes_por_curso: number;
    riesgo_promedio: string;
    avg_score: number;
    tendencia: string;
    detalles_incidentes: Array<{curso: string; incidentes: number}>;
  } | null>(null);

  const studentMessagesSent = recentIncidents.length;
  const studentReports = recentIncidents.filter(i => {
    const status = String(i.status || '').toUpperCase();
    return status === 'PENDIENTE_REVISION' || status === 'PENDIENTE_ANALISIS' || status === 'RECHAZADO';
  }).length;
  const studentSafetyIndex = studentMessagesSent > 0
    ? Math.max(0, 100 - (studentReports / studentMessagesSent) * 100)
    : 100;

  const potentialIncidents = recentIncidents.filter((i) => i.status === 'pending' || i.status === 'PENDIENTE_REVISION').length;
  
  const stats = [
    { title: 'Publicaciones Evaluadas', value: String(globalMetrics?.total_evaluadas || 0), change: 'Total registradas', trend: 'up' },
    { title: 'Incidentes por Curso', value: String(globalMetrics?.incidentes_por_curso || '0'), change: 'Promedio actual', trend: (globalMetrics?.incidentes_por_curso || 0) > 2 ? 'down' : 'up' },
    { title: 'Tendencia de Periodo', value: globalMetrics?.tendencia || '+0', change: 'vs. semestre anterior', trend: (globalMetrics?.tendencia?.startsWith('-') ? 'down' : 'up') },
    { title: 'Riesgo Promedio', value: globalMetrics?.riesgo_promedio || 'BAJO', change: `Score promedio: ${((globalMetrics?.avg_score || 0) * 100).toFixed(1)}%`, trend: globalMetrics?.riesgo_promedio === 'BAJO' ? 'up' : 'down' }
  ];

  // ─── Datos derivados para los gráficos ───
  const riskData = (['ALTO', 'MEDIO', 'BAJO'] as const).map(level => ({
    name: level === 'ALTO' ? 'Alto' : level === 'MEDIO' ? 'Medio' : 'Bajo',
    value: recentIncidents.filter(i => String(i.riesgo || 'BAJO').toUpperCase() === level).length,
    color: RISK_COLOR[level],
  }));

  const activityData = Array.from({ length: 14 }, (_, k) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (13 - k));
    const key = d.toDateString();
    return {
      day: d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }),
      total: recentIncidents.filter(i => i.date && new Date(i.date).toDateString() === key).length,
    };
  });

  const studentScoreSeries = [...recentIncidents]
    .filter(i => i.date)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(i => ({
      label: new Date(i.date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }),
      score: Math.round((i.score || 0) * 100),
    }));

  // ─── Datos de presentación (no cambian la lógica) ───
  const sesion = getStoredSession();
  const nombreUsuario = (() => {
    const base = (sesion?.email || '').split('@')[0].split(/[._-]/)[0];
    return base ? base.charAt(0).toUpperCase() + base.slice(1) : (userRole === 'docente' ? 'Docente' : userRole === 'admin' ? 'Admin' : 'Estudiante');
  })();
  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';
  const iconoCurso = (nombre: string) => {
    const n = (nombre || '').toLowerCase();
    if (n.includes('inteligencia')) return BrainCircuit;
    if (n.includes('software') || n.includes('program')) return Code2;
    if (n.includes('cálculo') || n.includes('calculo') || n.includes('matem')) return Calculator;
    if (n.includes('ética') || n.includes('etica')) return Scale;
    if (n.includes('datos')) return Database;
    return BookOpen;
  };
  const coloresCurso = ['bg-[#EEF2FF] text-[#2444D8]', 'bg-orange-50 text-orange-600', 'bg-pink-50 text-pink-600', 'bg-sky-50 text-sky-600', 'bg-violet-50 text-violet-600', 'bg-emerald-50 text-emerald-600'];
  const tendenciaNum = parseInt(String(globalMetrics?.tendencia || '0').replace('+', ''), 10) || 0;
  const pendientes = recentIncidents.filter(i => ['PENDIENTE_REVISION', 'PENDIENTE_ANALISIS', 'pending'].includes(String(i.status)));
  const maxScoreId = recentIncidents.length ? [...recentIncidents].sort((a, b) => (b.score || 0) - (a.score || 0))[0].id : null;

  const tabTitles: Record<string, [string, string]> = {
    overview: ['Resumen institucional', 'Así está la convivencia en tus foros hoy'],
    messages: ['Moderación', 'Mensajes que el agente retuvo para tu decisión'],
    courses: ['Cursos y foros', 'Entra a un curso para participar en sus foros'],
    status: ['Mi convivencia', 'Cómo ha evaluado el agente tus mensajes'],
    settings: ['Gestión de la red', 'Usuarios, cursos y matrículas'],
    profile: ['Mi perfil', 'Datos de tu cuenta'],
  };

  const formatDate = (value?: string) => {
    if (!value) return 'Sin fecha';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const loadCourseEnrollments = async (courseId: number) => {
    setLoadingEnrollments(true);
    try {
      const res = await api.getCursoMatriculas(courseId);
      setCourseEnrollments((res?.data || []) as EnrollmentItem[]);
    } catch (e) {
      console.error('Error loading enrollments', e);
      setCourseEnrollments([]);
    } finally {
      setLoadingEnrollments(false);
    }
  };

  const loadUnreadNotifications = async () => {
    if (userRole !== 'docente' && userRole !== 'admin') {
      setUnreadNotifications(0);
      return;
    }

    try {
      const res = await api.getUnreadNotificationCount();
      setUnreadNotifications(Number(res?.unread_count || 0));
    } catch (e) {
      console.error('Error loading notification count', e);
    }
  };

  const loadNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const res = await api.getMyNotifications(50, 0, false);
      setNotificationsList(res?.data || []);
    } catch (e) {
      console.error('Error loading notifications', e);
      setNotificationsList([]);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleToggleNotifications = async () => {
    const willOpen = !showNotificationsPanel;
    setShowNotificationsPanel(willOpen);
    if (willOpen) {
      // close other modals to avoid overlap
      setShowNewForumModal(false);
      setShowCreateCourseModal(false);
      setShowEnrollmentModal(false);
      await loadNotifications();
    }
  };

  const handleNotificationClick = async (notif: any) => {
    try {
      await api.markNotificationRead(notif.id);
    } catch (e) {
      console.error('Error marking notification read', e);
    }
    // refresh counts and list, navigate to messages for review
    await loadUnreadNotifications();
    setNotificationsList(prev => prev.filter(n => n.id !== notif.id));
    setShowNotificationsPanel(false);
    setActiveTab('messages');
    await refreshIncidents();
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotificationsList([]);
      setUnreadNotifications(0);
      setShowNotificationsPanel(false);
      await loadUnreadNotifications();
    } catch (e) {
      console.error('Error marking all notifications read', e);
      toast.error('No se pudieron marcar todas como leídas');
    }
  };

  const refreshCourses = async () => {
    const isAdmin = userRole === 'admin';
    const res = !isAdmin ? await Promise.all([api.getAllCursos(), api.getCursosForUser()]) : [await api.getAllCursos(), null];
    const allCoursesRes = Array.isArray(res) ? res[0] : res;
    const enrolledRes = Array.isArray(res) ? res[1] : null;
    const allData = allCoursesRes?.data || allCoursesRes || [];
    const enrolledIds = new Set<number>((enrolledRes?.data || enrolledRes || []).map((c: any) => c.id));
    
    let mapped = (allData || [])
      .filter((c: any) => c.activo !== false)
      .map((c: any) => ({
        id: c.id,
        name: c.nombre || c.name,
        teacher: c.profesor || undefined,
        forums: [],
        enrolled: isAdmin ? true : enrolledIds.has(c.id),
      }));

    if (!isAdmin) {
      mapped = mapped.filter((c: any) => c.enrolled);
    }
    
    setCoursesList(mapped);
  };

  const handleEnterCourse = async (course: Course & { enrolled?: boolean }) => {
    if (userRole === 'estudiante' && !course.enrolled) {
      setSelectedCourse(course);
      setActiveForum(null);
      setForumThreads([]);
      setForumPosts([]);
      setSelectedThreadId(null);
      return;
    }

    if (!course.forums || course.forums.length === 0) {
      try {
        const res = await api.getForosByCurso(course.id);
        const foros = res?.data || [];
        const mapped = foros.map((f: any) => ({ id: f.id, title: f.titulo || f.title, threads: f.hilos_count || 0, lastPost: f.ultima_actividad || '' }));
        const updated = { ...course, forums: mapped };
        setSelectedCourse(updated);
        setCoursesList(prev => prev.map(c => c.id === course.id ? updated : c));
      } catch (e) {
        console.error('Error loading forums', e);
        setSelectedCourse(course);
      }
    } else {
      setSelectedCourse(course);
    }
    setActiveForum(null);
    setForumThreads([]);
    setForumPosts([]);
    setSelectedThreadId(null);

    if (userRole === 'admin' || userRole === 'docente') {
      await loadCourseEnrollments(course.id);
    } else {
      setCourseEnrollments([]);
    }
  };

  const loadPosts = async (threadId: number) => {
    setLoadingPosts(true);
    try {
      const res = await api.getPublicacionesByHilo(threadId);
      setForumPosts(res?.data || []);
    } catch (e) {
      console.error('Error loading posts', e);
      setForumPosts([]);
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleOpenForum = async (forum: Forum) => {
    setActiveForum(forum);
    setLoadingForumData(true);
    setForumPosts([]);
    setForumThreads([]);
    setSelectedThreadId(null);
    try {
      const res = await api.getHilosByForo(forum.id);
      const threads = (res?.data || []).map((h: any) => ({ id: h.id, titulo: h.titulo || `Hilo ${h.id}` }));
      setForumThreads(threads);
      if (threads.length > 0) {
        setSelectedThreadId(threads[0].id);
        await loadPosts(threads[0].id);
      }
    } catch (e) {
      console.error('Error loading threads', e);
    } finally {
      setLoadingForumData(false);
    }
  };

  const submitEnrollment = async () => {
    if (!selectedCourse) return;

    try {
      await api.upsertCursoMatricula(selectedCourse.id, {
        usuario_email: newEnrollment.usuario_email.trim() || undefined,
        rol_en_curso: newEnrollment.rol_en_curso,
        crear_si_no_existe: newEnrollment.crear_si_no_existe,
        nombre: newEnrollment.nombre.trim() || undefined,
      });
      await loadCourseEnrollments(selectedCourse.id);
      setShowEnrollmentModal(false);
      setNewEnrollment({ usuario_email: '', nombre: '', rol_en_curso: 'ESTUDIANTE', crear_si_no_existe: false });
    } catch (e) {
      console.error('Error creating enrollment', e);
      toast.error('No se pudo crear la matrícula');
    }
  };

  const removeEnrollment = async (usuarioId: number) => {
    if (!selectedCourse) return;

    try {
      await api.deleteCourseEnrollment(selectedCourse.id, usuarioId);
      await loadCourseEnrollments(selectedCourse.id);
    } catch (e) {
      console.error('Error removing enrollment', e);
      toast.error('No se pudo eliminar la matrícula');
    }
  };

  const selfEnroll = async () => {
    if (!selectedCourse) return;

    try {
      await api.selfEnrollInCourse(selectedCourse.id, { rol_en_curso: 'ESTUDIANTE' });
      await refreshCourses();
      const updatedCourse = { ...selectedCourse, enrolled: true };
      setSelectedCourse(updatedCourse);
      await handleEnterCourse(updatedCourse);
    } catch (e) {
      console.error('Error self enrolling', e);
      toast.error('No se pudo inscribir al curso');
    }
  };

  const removeCourse = async (courseId: number) => {
    try {
      await api.deleteCurso(courseId);
      await refreshCourses();
      if (selectedCourse?.id === courseId) {
        setSelectedCourse(null);
      }
    } catch (e) {
      console.error('Error deleting course', e);
      toast.error('No se pudo desactivar el curso');
    }
  };

  const removeUser = async (userId: number) => {
    try {
      await api.deleteDashboardUser(userId);
      const res = await api.getDashboardUsers();
      setAdminUsers((res?.data || []) as AdminUserItem[]);
    } catch (e) {
      console.error('Error deleting user', e);
      toast.error('No se pudo desactivar el usuario');
    }
  };

  const menuItems = [
    { id: 'overview', icon: BarChart3, label: 'Resumen', roles: ['admin', 'docente'] },
    { id: 'messages', icon: MessageSquare, label: 'Moderación', roles: ['admin', 'docente'] },
    { id: 'courses', icon: FolderOpen, label: 'Cursos', roles: ['admin', 'docente', 'estudiante'] },
    { id: 'status', icon: AlertTriangle, label: 'Mi convivencia', roles: ['estudiante'] },
    { id: 'settings', icon: ShieldCheck, label: 'Gestión de Red', roles: ['admin'] }
  ].filter(item => userRole ? item.roles.includes(userRole) : false);

  const displayCourses = coursesList;
  const displayIncidents = recentIncidents;
  // Filtrar mensajes rechazados para TODOS los usuarios (estudiantes, docentes, admins)
  const visibleForumPosts = forumPosts.filter(
    (post) => String(post.estado || '').toUpperCase() !== 'RECHAZADO'
  );

  useEffect(() => {
    if (userRole === 'estudiante' && activeTab === 'overview') {
      setActiveTab('courses');
    }
  }, [userRole, activeTab]);

  // Auto-collapse sidebar on small screens for responsive UX
  useEffect(() => {
    const handleResize = () => {
      try {
        const isSmall = window.innerWidth < 768; // md breakpoint
        setSidebarCollapsed(isSmall);
      } catch (e) {
        // ignore during SSR or tests
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // refreshIncidents defined below; call it to populate metrics

    async function loadUsers() {
      if (userRole !== 'admin') {
        setAdminUsers([]);
        return;
      }

      setLoadingUsers(true);
      try {
        const res = await api.getDashboardUsers();
        setAdminUsers((res?.data || []) as AdminUserItem[]);
      } catch (e) {
        console.error('Error loading users', e);
      } finally {
        setLoadingUsers(false);
      }
    }

    if (userRole) {
      setLoadingCourses(true);
      refreshCourses().finally(() => setLoadingCourses(false));
      refreshIncidents();
      if (userRole !== 'estudiante') {
        api.getMetricasGlobales().then(res => {
          if (res?.success) setGlobalMetrics(res.data);
        }).catch(e => console.error('Error loading global metrics', e));
      }
      loadUsers();
      loadUnreadNotifications();
    }
  }, [userRole]);

  useEffect(() => {
    if (userRole !== 'docente' && userRole !== 'admin') return;

    loadUnreadNotifications();
    const notifIntervalId = window.setInterval(loadUnreadNotifications, 10000);
    const incidentsIntervalId = window.setInterval(() => {
      refreshIncidents();
      if (userRole !== 'estudiante') {
        api.getMetricasGlobales().then(res => {
          if (res?.success) setGlobalMetrics(res.data);
        }).catch(e => console.error('Error loading global metrics', e));
      }
    }, 12000);
    return () => {
      window.clearInterval(notifIntervalId);
      window.clearInterval(incidentsIntervalId);
    };
  }, [userRole]);

  async function refreshIncidents() {
    setLoadingIncidents(true);
    try {
      if (userRole === 'docente' || userRole === 'admin') {
        const res = await api.getPendingModeration();
        const items = res?.data || [];
        const mapped = items
          .filter((p: any) => String(p.estado || 'PENDIENTE_REVISION').toUpperCase() !== 'RECHAZADO')
          .map((p: any) => ({
            id: p.id,
            user: p.autor?.nombre || 'Usuario',
            message: p.contenido || '',
            score: p.evaluacion_toxicidad?.score || p.evaluacion?.score || 0,
            riesgo: p.evaluacion_toxicidad?.riesgo || 'BAJO',
            course: p.hilo?.foro?.curso?.nombre || 'Curso',
            status: p.estado || 'PENDIENTE_REVISION',
            date: p.creado_en
          }));
        setRecentIncidents(mapped);
      } else if (userRole === 'estudiante') {
        const res = await api.getMyPublications();
        const items = res?.data || [];
        const mapped = items.map((p: any) => ({
          id: p.id,
          user: p.autor?.nombre || 'Yo',
          message: p.contenido || '',
          score: p.evaluacion_toxicidad?.score || p.evaluacion?.score || 0,
          course: p.hilo?.foro?.curso?.nombre || 'Curso',
          status: p.estado || 'unknown',
          date: p.creado_en
        }));
        setRecentIncidents(mapped);
      }
    } catch (e) {
      console.error('Error refreshing incidents', e);
    } finally {
      setLoadingIncidents(false);
    }
  }

  async function loadHistory() {
    setLoadingHistory(true);
    try {
      const res = await api.getModerationHistory();
      const items = res?.data || [];
      const total = res?.pagination?.total ?? items.length;
      setTeacherEvaluationsCount(total as number);
      const mapped = items.map((c: any) => ({
        id: c.id,
        user: c.publicacion?.autor?.nombre || 'Usuario',
        message: c.publicacion?.contenido || '',
        course: c.publicacion?.hilo?.foro?.curso?.nombre || 'Curso',
        status: c.estado || c.publicacion?.estado || 'unknown',
        date: c.resuelto_en || c.abierto_en,
        observation: c.observacion
      }));
      setHistoryItems(mapped);
    } catch (e) {
      console.error('Error loading history', e);
      setHistoryItems([]);
    } finally {
      setLoadingHistory(false);
    }
  }

  return (
    <div className="min-h-screen text-ink flex selection:bg-accent selection:text-white relative overflow-hidden bg-[#F3F5FB]">
      {/* Sidebar */}
      <aside className={`bg-white border-r border-slate-200/70 flex flex-col fixed inset-y-0 z-20 transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="px-6 pt-7 pb-10 flex justify-between items-center">
          {!sidebarCollapsed && (
            <>
              <div>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-[#2444D8] text-white flex items-center justify-center shadow-md shadow-accent/30"><ShieldCheck size={18} /></div>
                  <div className="font-display text-[22px] font-bold text-slate-900 tracking-tight">RAU</div>
                </div>
              </div>
            </>
          )}
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="text-ink/40 hover:text-accent transition-colors"
            title={sidebarCollapsed ? "Expandir panel" : "Contraer panel"}
          >
            <ChevronLeft size={20} className={`transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <nav className="flex-1 pl-4 space-y-1">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as any);
                setSelectedCourse(null);
                setActiveForum(null);
              }}
              className={`relative w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} px-4 py-3 rounded-l-xl transition-all group ${
                activeTab === item.id 
                  ? 'bg-[#EEF2FF] text-accent font-semibold' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
              title={sidebarCollapsed ? item.label : ''}
            >
              <div className={`flex items-center ${sidebarCollapsed ? '' : 'gap-4'}`}>
                <item.icon size={18} strokeWidth={activeTab === item.id ? 2.5 : 1.5} />
                <span className={`text-[14px] font-medium inline-block transform transition-all duration-300 overflow-hidden whitespace-nowrap ${sidebarCollapsed ? 'opacity-0 max-w-0 -translate-x-2' : 'opacity-100 max-w-[160px] translate-x-0'}`}>{item.label}</span>
              </div>
              {activeTab === item.id && <span className="absolute right-0 top-1.5 bottom-1.5 w-1 rounded-l-full bg-accent" />}
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto flex items-center">
          {sidebarCollapsed ? (
            <button onClick={onLogout} title="Cerrar sesión" className="bg-accent text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg shadow-accent/20">
              <LogOut size={16} />
            </button>
          ) : (
            <button 
              onClick={onLogout}
              className="w-full flex items-center gap-4 rounded-xl px-4 py-3 text-[14px] font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut size={18} strokeWidth={1.5} /> Cerrar sesión
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-64'} p-4 sm:p-6 lg:p-8 overflow-y-auto relative z-10`}>
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 relative z-50">
          <div>
            <h1 className="font-display text-[24px] font-semibold tracking-tight text-slate-900 not-italic">
              {!selectedCourse ? (tabTitles[activeTab] || ['RAU'])[0] : selectedCourse.name}
            </h1>
            <p className="text-[13px] text-slate-500 mt-0.5">
              {!selectedCourse ? (tabTitles[activeTab] || ['', ''])[1] : 'Foros y discusiones del curso'}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {(userRole === 'docente' || userRole === 'admin') && (
              <div className="relative">
                <button onClick={handleToggleNotifications} className="relative h-10 w-10 rounded-full bg-white flex items-center justify-center text-slate-500 hover:text-accent shadow-sm transition-colors" title="Ver notificaciones">
                  <Bell size={18} />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white ring-2 ring-white">
                      {unreadNotifications}
                    </span>
                  )}
                </button>

                {showNotificationsPanel && (
                  <div className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-1.5rem)] bg-white border border-ink/10 shadow-2xl z-[200] rounded-lg overflow-hidden">
                    <div className="p-3 border-b border-ink/5 flex items-center justify-between">
                      <div className="mono-label !text-[10px] font-bold">Notificaciones</div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleMarkAllNotificationsRead}
                          disabled={notificationsList.length === 0}
                          className="mono-label text-[10px] text-accent hover:underline disabled:opacity-30 disabled:hover:no-underline"
                        >
                          Marcar todos como leídos
                        </button>
                        <button onClick={() => setShowNotificationsPanel(false)} className="mono-label text-ink/40 hover:text-accent">Cerrar</button>
                      </div>
                    </div>
                    <div className="max-h-[70vh] overflow-y-auto">
                      {loadingNotifications ? (
                        <div className="p-4 mono-label opacity-50">Cargando...</div>
                      ) : notificationsList.length === 0 ? (
                        <div className="p-4 mono-label opacity-40">No hay notificaciones sin leer</div>
                      ) : (
                        notificationsList.map((n) => (
                          <div key={n.id} className="w-full text-left p-3 border-b border-ink/5 hover:bg-paper">
                            <div className="mono-label !text-[10px] opacity-60">{n.tipo}</div>
                            <div className="mt-1 font-display text-sm">{n.mensaje}</div>
                            <div className="mt-3 flex gap-2">
                              {n.publicacion_id && (
                                <button onClick={async () => {
                                  try {
                                    setShowNotificationsPanel(false);
                                    setMessagesMode('pendientes');
                                    setActiveTab('messages');
                                    await refreshIncidents();
                                  } catch (e) { console.error(e); }
                                }} className="mono-label text-[10px] px-3 py-1 border border-ink/10 hover:border-accent">Ir al caso</button>
                              )}



                              <button onClick={async () => {
                                try {
                                  await api.markNotificationRead(n.id);
                                  setNotificationsList(prev => prev.filter(x => x.id !== n.id));
                                  await loadUnreadNotifications();
                                } catch (e) { console.error('Error marking read', e); }
                              }} className="mono-label text-[10px] px-3 py-1 border border-ink/10 hover:border-accent">Marcar leído</button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            <button onClick={() => setActiveTab('profile' as any)} className="flex items-center gap-3 pl-2 hover:opacity-80 transition-opacity" title="Mi perfil">
              <div className="text-right hidden sm:block">
                <div className="text-[13px] font-semibold text-slate-900">{nombreUsuario}</div>
                <div className="text-[11px] text-slate-400">{userRole === 'admin' ? 'Administración' : userRole === 'docente' ? 'Docente' : 'Estudiante'} · Ver perfil</div>
              </div>
              <Avatar name={nombreUsuario} size={40} />
            </button>
          </div>
        </header>

        {/* View Selection */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[minmax(0,1fr)_340px] gap-6">
              {/* ── Columna principal ── */}
              <div className="space-y-6 min-w-0">
                {/* Banner de saludo */}
                <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#2444D8] via-[#3552E6] to-[#4D6BFE] text-white px-8 py-7 shadow-[0_20px_40px_rgba(36,68,216,0.25)]">
                  <div className="relative z-10 max-w-[58%]">
                    <h2 className="font-display text-[28px] font-bold leading-tight">{saludo}, {nombreUsuario}</h2>
                    <p className="mt-2 text-[14px] text-white/85 leading-relaxed">
                      El agente analizó <b className="text-white">{globalMetrics?.total_evaluadas ?? 0}</b> publicaciones.
                      {' '}Tienes <b className="text-white">{potentialIncidents}</b> {potentialIncidents === 1 ? 'mensaje esperando' : 'mensajes esperando'} tu revisión.
                    </p>
                    <button onClick={() => setActiveTab('messages')} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white text-[#2444D8] px-4 py-2 text-[13px] font-semibold shadow-md hover:-translate-y-0.5 transition-transform">
                      Revisar ahora <ChevronRight size={15} />
                    </button>
                  </div>
                  <div className="absolute right-4 bottom-0 top-2 w-[40%] max-w-[320px]"><HeroIllustration /></div>
                </section>

                {/* Indicadores compactos */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { l: 'Evaluadas', v: String(globalMetrics?.total_evaluadas ?? 0), c: 'text-[#2444D8] bg-[#EEF2FF]', i: <MessageSquare size={16} /> },
                    { l: 'Pendientes', v: String(potentialIncidents), c: 'text-amber-600 bg-amber-50', i: <AlertTriangle size={16} /> },
                    { l: 'Tendencia', v: tendenciaNum === 0 ? '0' : (globalMetrics?.tendencia || '0'), c: tendenciaNum < 0 ? 'text-green-700 bg-green-50' : tendenciaNum > 0 ? 'text-red-600 bg-red-50' : 'text-slate-500 bg-slate-100', i: tendenciaNum < 0 ? <ArrowDownRight size={16} /> : tendenciaNum > 0 ? <ArrowUpRight size={16} /> : <Minus size={16} /> },
                    { l: 'Riesgo promedio', v: (globalMetrics?.riesgo_promedio || 'BAJO').charAt(0) + (globalMetrics?.riesgo_promedio || 'BAJO').slice(1).toLowerCase(), c: 'text-green-700 bg-green-50', i: <ShieldCheck size={16} /> },
                  ].map(k => (
                    <div key={k.l} className="rounded-2xl bg-white p-4 flex items-center gap-3 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
                      <span className={`h-10 w-10 rounded-xl flex items-center justify-center ${k.c}`}>{k.i}</span>
                      <div>
                        <div className="font-display text-[20px] font-semibold text-slate-900 leading-none">{k.v}</div>
                        <div className="text-[12px] text-slate-500 mt-1">{k.l}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cursos */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display text-[17px] font-semibold text-slate-900">Tus cursos</h3>
                    <button onClick={() => setActiveTab('courses')} className="rounded-lg bg-[#2444D8] text-white text-[12px] font-semibold px-3 py-1.5 hover:brightness-110">Ver todos</button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                    {displayCourses.slice(0, 5).map((course, idx) => {
                      const Icono = iconoCurso(course.name);
                      const inc = (globalMetrics?.detalles_incidentes || []).find((d: any) => d.curso === course.name)?.incidentes ?? 0;
                      return (
                        <button key={course.id} onClick={() => { setActiveTab('courses'); handleEnterCourse(course); }} className="rounded-2xl bg-white p-4 text-center shadow-[0_4px_16px_rgba(15,23,42,0.04)] hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(36,68,216,0.12)] transition-all">
                          <span className={`mx-auto h-11 w-11 rounded-xl flex items-center justify-center ${coloresCurso[idx % coloresCurso.length]}`}><Icono size={20} /></span>
                          <div className="mt-3 text-[13px] font-semibold text-slate-900 leading-snug line-clamp-2">{course.name}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{inc} {inc === 1 ? 'incidente' : 'incidentes'}</div>
                        </button>
                      );
                    })}
                    {displayCourses.length === 0 && <div className="col-span-full rounded-2xl bg-white p-6 text-center text-sm text-slate-400">No tienes cursos asignados.</div>}
                  </div>
                </section>

                {/* Tabla de evaluaciones */}
                <section className="rounded-2xl bg-white shadow-[0_4px_16px_rgba(15,23,42,0.04)] overflow-hidden">
                  <div className="flex items-center justify-between px-6 pt-5 pb-3">
                    <h3 className="font-display text-[17px] font-semibold text-slate-900">Evaluaciones recientes</h3>
                    <button onClick={() => setActiveTab('messages')} className="rounded-lg bg-[#2444D8] text-white text-[12px] font-semibold px-3 py-1.5 hover:brightness-110">Ver todas</button>
                  </div>
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="text-left text-slate-400 border-y border-slate-100">
                        <th className="font-medium px-6 py-2.5">Estudiante</th>
                        <th className="font-medium px-3 py-2.5 hidden md:table-cell">Curso</th>
                        <th className="font-medium px-3 py-2.5">Riesgo</th>
                        <th className="font-medium px-6 py-2.5 w-48">Toxicidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentIncidents.slice(0, 6).map(incident => {
                        const destacado = incident.id === maxScoreId;
                        const lvl = String(incident.riesgo || 'BAJO').toUpperCase();
                        return (
                          <tr key={incident.id} className={destacado ? 'bg-red-50/70 text-slate-800 shadow-[inset_4px_0_0_#DC2626]' : 'border-b border-slate-50 text-slate-700 hover:bg-slate-50'}>
                            <td className="px-6 py-3">
                              <div className="flex items-center gap-3">
                                <Avatar name={incident.user} size={30} />
                                <div className="min-w-0">
                                  <div className="font-semibold truncate flex items-center gap-2">{incident.user}{destacado && <span className="rounded-full bg-red-100 text-red-700 text-[10px] font-semibold px-2 py-0.5">Más tóxico</span>}</div>
                                  <div className="text-[11px] truncate max-w-[260px] text-slate-400">“{incident.message}”</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 hidden md:table-cell text-slate-500">{incident.course}</td>
                            <td className="px-3 py-3">
                              <span className="inline-flex items-center gap-2 font-medium">
                                <span className="h-2 w-2 rounded-full" style={{ background: RISK_COLOR[lvl] || RISK_COLOR.BAJO }} />
                                {lvl.charAt(0) + lvl.slice(1).toLowerCase()}
                              </span>
                            </td>
                            <td className="px-6 py-3"><ScoreBar score={incident.score} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {recentIncidents.length === 0 && <div className="text-sm text-slate-400 text-center py-10">No hay evaluaciones recientes.</div>}
                </section>

                {/* Gráficos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card title="Actividad de casos" subtitle="Mensajes retenidos en los últimos 14 días">
                    <ActivityArea data={activityData} />
                  </Card>
                  <Card title="Incidentes por curso" subtitle="Casos de moderación acumulados">
                    {(globalMetrics?.detalles_incidentes || []).length > 0
                      ? <CourseBars data={globalMetrics?.detalles_incidentes || []} />
                      : <div className="text-sm text-slate-400 text-center py-16">Aún no hay incidentes registrados.</div>}
                  </Card>
                </div>
              </div>

              {/* ── Panel derecho ── */}
              <aside className="rounded-3xl bg-white p-6 shadow-[0_4px_16px_rgba(15,23,42,0.04)] space-y-7 h-fit">
                <div>
                  <h3 className="font-display text-[15px] font-semibold text-slate-900 mb-3 flex items-center gap-2"><CalendarDays size={16} className="text-accent" /> Calendario</h3>
                  <WeekStrip />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display text-[15px] font-semibold text-slate-900">Pendientes de revisión</h3>
                    <button onClick={() => setActiveTab('messages')} className="text-[11px] font-semibold text-accent bg-accent/10 rounded-full px-2.5 py-0.5">Ver todos</button>
                  </div>
                  <ul className="space-y-3">
                    {pendientes.slice(0, 5).map(p => {
                      const lvl = String(p.riesgo || 'BAJO').toUpperCase();
                      return (
                        <li key={p.id} className="flex items-center gap-3">
                          <Avatar name={p.user} size={36} />
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-semibold text-slate-900 truncate">{p.user}</div>
                            <div className="text-[11px] text-slate-400 truncate">en <span style={{ color: RISK_COLOR[lvl] }}>{p.course}</span></div>
                          </div>
                          <button onClick={() => { setMessagesMode('pendientes'); setActiveTab('messages'); }} title="Revisar" className="h-8 w-8 rounded-full bg-accent/10 text-accent flex items-center justify-center hover:bg-accent hover:text-white transition-colors"><Eye size={15} /></button>
                        </li>
                      );
                    })}
                    {pendientes.length === 0 && <li className="text-[13px] text-slate-400">Todo al día. No hay mensajes pendientes.</li>}
                  </ul>
                </div>

                <div>
                  <h3 className="font-display text-[15px] font-semibold text-slate-900 mb-3">Nivel de riesgo</h3>
                  <RiskDonut data={riskData} />
                </div>

                <div>
                  <h3 className="font-display text-[15px] font-semibold text-slate-900 mb-1">Toxicidad promedio</h3>
                  <Gauge value={(globalMetrics?.avg_score || 0) * 100} label="score medio" />
                </div>
              </aside>
            </motion.div>
          )}

          {activeTab === 'messages' && (
            <motion.div key="messages" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-accent/10 text-accent px-3 py-1 text-[12px] font-semibold"><Sparkles size={14} /> Decisión humana sobre lo que retuvo el agente</span>
                  <span className="text-[12px] text-slate-500">{userRole === 'admin' ? 'Toda la institución' : 'Tus cursos asignados'}</span>
                </div>
                <div className="inline-flex rounded-xl bg-slate-100 p-1">
                  <button onClick={() => setMessagesMode('pendientes')} className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${messagesMode === 'pendientes' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}>
                    Pendientes <span className="ml-1 rounded-full bg-accent text-white px-1.5 text-[11px]">{recentIncidents.filter(i => ['pending','PENDIENTE_REVISION','PENDIENTE_ANALISIS'].includes(String(i.status).toUpperCase())).length}</span>
                  </button>
                  <button onClick={async () => { setMessagesMode('historial'); await loadHistory(); }} className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${messagesMode === 'historial' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}>Historial</button>
                </div>
              </div>

              {messagesMode === 'pendientes' && (
                <div className="grid grid-cols-3 gap-4">
                  {riskData.map(r => (
                    <div key={r.name} className="rounded-2xl bg-white border border-slate-200/70 p-4 flex items-center gap-3">
                      <span className="h-10 w-1.5 rounded-full" style={{ background: r.color }} />
                      <div>
                        <div className="font-display text-2xl font-semibold text-slate-900 leading-none">{r.value}</div>
                        <div className="text-[12px] text-slate-500 mt-1">Riesgo {r.name.toLowerCase()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid gap-4 relative z-30">
                {messagesMode === 'pendientes' ? (
                  displayIncidents.filter(i =>
                    i.status === 'PENDIENTE_REVISION' ||
                    i.status === 'PENDIENTE_ANALISIS' ||
                    (userRole === 'admin' && (i.status === 'APROBADO' || i.status === 'reviewed'))
                  ).map(incident => {
                    const lvl = String(incident.riesgo || 'BAJO').toUpperCase();
                    return (
                    <motion.div layout key={incident.id} className="rounded-2xl bg-white border border-slate-200/70 shadow-[0_8px_24px_rgba(36,68,216,0.06)] overflow-hidden flex">
                      <div className="w-1.5 shrink-0" style={{ background: RISK_COLOR[lvl] || RISK_COLOR.BAJO }} />
                      <div className="flex-1 p-6">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={incident.user} size={40} />
                            <div>
                              <div className="text-[14px] font-semibold text-slate-900">{incident.user}</div>
                              <div className="text-[12px] text-slate-500">{incident.course} · {formatDate(incident.date)}</div>
                            </div>
                          </div>
                          <RiskBadge level={lvl} />
                        </div>

                        <blockquote className="rounded-xl bg-slate-50 border border-slate-100 px-5 py-4 text-[16px] leading-relaxed text-slate-800">
                          “{incident.message}”
                        </blockquote>

                        <div className="mt-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="flex items-center gap-3 lg:w-80">
                            <span className="text-[12px] font-medium text-slate-500 whitespace-nowrap">Toxicidad estimada</span>
                            <div className="flex-1"><ScoreBar score={incident.score} /></div>
                          </div>
                          <div className="flex gap-3">
                            <button onClick={async () => {
                              try {
                                await api.aprobarPublicacion(incident.id, 'Aprobado por moderador');
                                toast.success('Publicación aprobada', { description: 'El mensaje ya es visible en el foro.' });
                                await refreshIncidents();
                              } catch (e) { console.error(e); toast.error('No se pudo aprobar la publicación'); }
                            }} className="inline-flex items-center gap-2 rounded-xl border border-green-600/30 bg-green-50 px-4 py-2 text-[13px] font-semibold text-green-700 hover:bg-green-600 hover:text-white transition-colors">
                              <CheckCircle2 size={16} /> Aprobar
                            </button>
                            <button onClick={async () => {
                              try {
                                await api.rechazarPublicacion(incident.id, 'Contenido inapropiado');
                                toast.success('Publicación rechazada', { description: 'Se notificó al autor.' });
                                await refreshIncidents();
                              } catch (e) { console.error(e); toast.error('No se pudo rechazar la publicación'); }
                            }} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-red-700 shadow-sm shadow-red-600/20 transition-colors">
                              <Trash2 size={16} /> Rechazar
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ); })
                ) : (
                  loadingHistory ? (
                    <Card><div className="text-sm text-slate-500">Cargando historial…</div></Card>
                  ) : (
                    <Card title="Historial de decisiones" subtitle={`${historyItems.length} casos resueltos`}>
                      <div className="divide-y divide-slate-100">
                        {historyItems.map((h) => (
                          <div key={h.id} className="flex flex-col md:flex-row md:items-center gap-3 py-3.5 first:pt-0 last:pb-0">
                            <div className="w-28 shrink-0"><StatusBadge status={h.status} /></div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[14px] text-slate-800 truncate">“{h.message}”</p>
                              <p className="text-[12px] text-slate-500">{h.user} · {h.course} · {h.observation || 'Sin observación'}</p>
                            </div>
                            <div className="text-[12px] text-slate-400 shrink-0">{formatDate(h.date)}</div>
                          </div>
                        ))}
                        {historyItems.length === 0 && <div className="text-sm text-slate-400 text-center py-10">Aún no hay decisiones registradas.</div>}
                      </div>
                    </Card>
                  )
                )}
                {messagesMode === 'pendientes' && recentIncidents.length === 0 && (
                  <Card><div className="text-center py-10"><CheckCircle2 className="mx-auto text-green-600 mb-3" size={32} /><p className="font-display text-lg font-semibold text-slate-900">Todo en orden</p><p className="text-sm text-slate-500">No hay mensajes pendientes de revisión.</p></div></Card>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'courses' && (
            <motion.div key="courses" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {!selectedCourse ? (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {displayCourses.map((course, idx) => {
                    const grads = ['from-[#2444D8] to-[#4DB7E5]', 'from-[#3D5AFE] to-[#7C3AED]', 'from-[#0EA5E9] to-[#2444D8]', 'from-[#1A34A8] to-[#3D5AFE]', 'from-[#4DB7E5] to-[#16A34A]'];
                    const inc = (globalMetrics?.detalles_incidentes || []).find((d: any) => d.curso === course.name)?.incidentes;
                    return (
                    <motion.div whileHover={{ y: -4 }} key={course.id} onClick={() => handleEnterCourse(course)} className="rounded-2xl bg-white border border-slate-200/70 shadow-[0_8px_24px_rgba(36,68,216,0.06)] hover:shadow-[0_16px_40px_rgba(36,68,216,0.14)] transition-shadow cursor-pointer overflow-hidden group">
                      <div className={`h-24 bg-gradient-to-br ${grads[idx % grads.length]} relative`}>
                        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, white 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
                        <div className="absolute -bottom-6 left-6 h-12 w-12 rounded-xl bg-white shadow-md flex items-center justify-center text-accent"><FolderOpen size={22} /></div>
                      </div>
                      <div className="p-6 pt-9">
                        <h3 className="font-display text-[19px] font-semibold text-slate-900 group-hover:text-accent transition-colors leading-snug">{course.name}</h3>
                        {userRole === 'admin' && <p className="text-[12px] text-slate-500 mt-1">Profesor: {course.teacher || 'Sin asignar'}</p>}
                        <div className="mt-5 flex items-center justify-between">
                          {userRole !== 'estudiante' && inc !== undefined
                            ? <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${inc > 5 ? 'bg-red-50 text-red-700 ring-red-600/20' : inc > 2 ? 'bg-amber-50 text-amber-700 ring-amber-600/25' : 'bg-green-50 text-green-700 ring-green-600/20'}`}>{inc} incidentes</span>
                            : <span className="inline-flex items-center gap-1.5 text-[12px] text-slate-500"><MessageSquare size={14} /> Foros del curso</span>}
                          <span className="text-[13px] font-semibold text-accent flex items-center gap-1 opacity-70 group-hover:opacity-100">Entrar <ChevronRight size={15} className="group-hover:translate-x-1 transition-transform" /></span>
                        </div>
                        {userRole === 'estudiante' && !course.enrolled && (
                          <button
                            onClick={async (event) => {
                              event.stopPropagation();
                              try {
                                await api.selfEnrollInCourse(course.id, { rol_en_curso: 'ESTUDIANTE' });
                                await refreshCourses();
                                await handleEnterCourse({ ...course, enrolled: true });
                              } catch (e) {
                                console.error('Error self enrolling from card', e);
                                toast.error('No se pudo inscribir al curso');
                              }
                            }}
                            className="mt-4 w-full rounded-xl bg-accent text-white py-2 text-[13px] font-semibold hover:brightness-95"
                          >
                            Inscribirme
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ); })}
                  {userRole === 'admin' && (
                    <button onClick={() => setShowCreateCourseModal(true)} className="rounded-2xl border-2 border-dashed border-slate-300 bg-white/50 min-h-[220px] flex flex-col items-center justify-center text-slate-400 hover:text-accent hover:border-accent/50 transition-colors">
                      <Plus size={28} className="mb-2" />
                      <span className="text-[14px] font-semibold">Crear nuevo curso</span>
                    </button>
                  )}
                  {displayCourses.length === 0 && userRole !== 'admin' && (
                    <div className="col-span-full text-center py-16 text-slate-400 text-sm">No tienes cursos asignados todavía.</div>
                  )}
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="flex justify-between items-baseline border-b border-ink/5 pb-4">
                    <h3 className="text-3xl font-display">Foros de Discusión</h3>
                    {(userRole === 'docente' || userRole === 'admin') && (
                      <div className="flex gap-3">
                        <button onClick={() => setShowEnrollmentModal(true)} className="mono-label text-[10px] bg-ink !text-white flex items-center gap-2 hover:bg-accent hover:!text-white px-4 py-2 border transition-all">
                          + MATRICULAR USUARIO
                        </button>
                        {userRole === 'docente' && (
                          <button onClick={() => setShowNewForumModal(true)} className="mono-label text-[10px] !text-accent flex items-center gap-2 hover:bg-accent hover:!text-white px-4 py-1 border border-accent transition-all">
                            + CREAR FORO EN ESTE CURSO
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {userRole === 'estudiante' && selectedCourse && !selectedCourse.enrolled && (
                    <div className="bg-white border border-accent/30 p-10 flex items-center justify-between gap-6">
                      <div>
                        <span className="mono-label text-accent block mb-2">INSCRIPCIÓN PENDIENTE</span>
                        <p className="font-display text-2xl">Este curso no está en tu matrícula activa.</p>
                        <p className="mono-label text-[10px] opacity-40 mt-2">Debes inscribirte para ver foros, hilos y publicaciones.</p>
                      </div>
                      <button onClick={selfEnroll} className="btn-cta mono-label !text-[10px] uppercase tracking-widest">
                        INSCRIBIRME AHORA
                      </button>
                    </div>
                  )}

                  {(userRole === 'docente' || userRole === 'admin') && (
                    <div className="card-hero p-10">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <span className="mono-label text-accent block mb-2">MATRÍCULAS ACTIVAS</span>
                          <p className="text-xs font-display opacity-50">Usuarios asociados a este curso</p>
                        </div>
                        <button onClick={() => setShowEnrollmentModal(true)} className="mono-label text-[10px] bg-accent !text-white px-4 py-2 hover:brightness-90 transition-all">
                          + AÑADIR MATRÍCULA
                        </button>
                      </div>
                      {loadingEnrollments ? (
                        <div className="mono-label opacity-50">Cargando matrículas...</div>
                      ) : courseEnrollments.length === 0 ? (
                        <div className="mono-label opacity-40">No hay usuarios matriculados todavía.</div>
                      ) : (
                        <div className="space-y-3">
                          {courseEnrollments.map((enrollment) => (
                            <div key={enrollment.id} className="flex items-center justify-between border border-ink/5 p-4 bg-paper/60">
                              <div>
                                <div className="font-display text-lg leading-tight">{enrollment.usuario_nombre}</div>
                                <div className="mono-label !text-[9px] opacity-40">{enrollment.usuario_email} · {enrollment.rol_en_curso}</div>
                              </div>
                              <button
                                onClick={() => removeEnrollment(enrollment.usuario_id)}
                                className="mono-label !text-[9px] border border-accent !text-accent px-4 py-2 hover:bg-accent hover:!text-white transition-all"
                              >
                                QUITAR
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid gap-8">
                    {(selectedCourse.forums || []).map(forum => (
                      <div key={forum.id} onClick={() => handleOpenForum(forum)} className="card-hero p-6 flex justify-between items-center cursor-pointer transition-all group hover:shadow-xl hover:-translate-y-0.5">
                        <div className="flex items-center gap-5">
                          <div className="h-14 w-14 rounded-2xl bg-accent/10 text-accent flex items-center justify-center"><MessageSquare size={24} /></div>
                          <div>
                            <h4 className="font-display text-xl font-semibold text-slate-900 mb-1 group-hover:text-accent transition-colors">{forum.title}</h4>
                            <p className="mono-label opacity-40">Última actividad: {forum.lastPost || 'Sin actividad'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                           <span className="mono-label !text-[9px] opacity-0 group-hover:opacity-40 transition-opacity">ENTRAR AL FORO</span>
                           <ChevronRight size={20} className="opacity-20 group-hover:opacity-100 group-hover:text-accent transition-all transform translate-x-0 group-hover:translate-x-2" />
                        </div>
                      </div>
                    ))}
                    {(selectedCourse.forums?.length || 0) === 0 && (
                      <div className="py-20 text-center border-2 border-dashed border-ink/5 mono-label opacity-20 bg-white/50 italic">
                        SIN FOROS ACTIVOS EN ESTE CURSO. DOCENTE DEBE INICIAR LA CÁTEDRA.
                      </div>
                    )}
                  </div>

                  <button onClick={() => setSelectedCourse(null)} className="mono-label !text-[10px] opacity-40 hover:opacity-100 flex items-center gap-2 border-b border-transparent hover:border-ink/20 pb-1 transition-all">
                    <ArrowLeft size={10} /> VOLVER AL CATÁLOGO DE AULAS
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'status' && (
            <motion.div key="status" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card title="Índice de convivencia" subtitle="Porcentaje de tus mensajes publicados sin problemas">
                  <Gauge value={studentSafetyIndex} label="mensajes sin alertas" color={studentSafetyIndex >= 80 ? '#16A34A' : studentSafetyIndex >= 50 ? '#F59E0B' : '#DC2626'} />
                </Card>
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5 content-start">
                  <KpiCard icon={<Send size={18} />} label="Mensajes enviados" value={String(studentMessagesSent)} hint="En todos tus cursos" />
                  <KpiCard icon={<AlertTriangle size={18} />} tone={studentReports > 0 ? 'warn' : 'good'} label="Alertas generadas" value={String(studentReports)} hint="Mensajes en revisión o rechazados" />
                  <Card className="sm:col-span-2" title="Tono de tus mensajes" subtitle="Toxicidad estimada por el agente en cada mensaje (0–100)">
                    {studentScoreSeries.length > 0
                      ? <ScoreLine data={studentScoreSeries} />
                      : <div className="text-sm text-slate-400 text-center py-10">Aún no has publicado mensajes.</div>}
                  </Card>
                </div>
              </div>

              <Card title="Historial de evaluaciones" subtitle="Cada mensaje que publicaste y cómo lo evaluó el agente">
                <div className="divide-y divide-slate-100">
                  {recentIncidents.map((report, idx) => (
                    <div key={report.id || idx} className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6 py-3.5 first:pt-0 last:pb-0">
                      <div className="w-28 shrink-0"><StatusBadge status={report.status} /></div>
                      <div className="flex-1 min-w-0">
                        {userRole === 'estudiante' && report.status !== 'APROBADO' ? (
                          <p className="text-[14px] text-amber-800">Tu mensaje en {report.course} quedó en revisión del docente.</p>
                        ) : (
                          <p className="text-[14px] text-slate-800 truncate">“{report.message}”</p>
                        )}
                        <p className="text-[12px] text-slate-500">{report.course} · {formatDate(report.date)}</p>
                      </div>
                      <div className="w-40 shrink-0"><ScoreBar score={report.score} /></div>
                    </div>
                  ))}
                  {recentIncidents.length === 0 && <div className="text-sm text-slate-400 text-center py-10">Todavía no hay mensajes evaluados.</div>}
                </div>
              </Card>
            </motion.div>
          )}

          {activeTab === 'settings' && (
             <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {userRole === 'admin' && (
                  <div className="grid lg:grid-cols-2 gap-8">
                    <div className="card-hero p-10">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <span className="mono-label text-accent block mb-2">USUARIOS DEL SISTEMA</span>
                          <p className="text-xs font-display opacity-50">Desactiva usuarios y sus matrículas</p>
                        </div>
                        {loadingUsers && <span className="mono-label !text-[9px] opacity-40">CARGANDO...</span>}
                      </div>
                      <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-2">
                        {adminUsers.map((user) => (
                          <div key={user.id} className="flex items-center justify-between border border-ink/5 p-4 bg-paper/60">
                            <div>
                              <div className="font-display text-lg leading-tight">{user.nombre}</div>
                              <div className="mono-label !text-[9px] opacity-40">{user.email} · {user.rol} · {user.activo ? 'ACTIVO' : 'INACTIVO'}</div>
                            </div>
                            <button
                              onClick={() => removeUser(user.id)}
                              disabled={!user.activo}
                              className="mono-label !text-[9px] border border-accent !text-accent px-4 py-2 hover:bg-accent hover:!text-white transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:!text-accent"
                            >
                              DESACTIVAR
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="card-hero p-10">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <span className="mono-label text-accent block mb-2">CURSOS ACTIVOS</span>
                          <p className="text-xs font-display opacity-50">Elimina cursos de forma lógica</p>
                        </div>
                        <button onClick={async () => { await refreshCourses(); }} className="mono-label !text-[9px] border border-ink/10 px-4 py-2 hover:bg-paper transition-all">
                          REFRESCAR
                        </button>
                      </div>
                      <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-2">
                        {coursesList.map((course) => (
                          <div key={course.id} className="flex items-center justify-between border border-ink/5 p-4 bg-paper/60">
                            <div>
                              <div className="font-display text-lg leading-tight">{course.name}</div>
                              <div className="mono-label !text-[9px] opacity-40">ID {course.id} · {course.teacher || 'Sin docente'}</div>
                            </div>
                            {userRole === 'admin' && (
                              <button
                                onClick={() => removeCourse(course.id)}
                                className="mono-label !text-[9px] border border-accent !text-accent px-4 py-2 hover:bg-accent hover:!text-white transition-all"
                              >
                                DESACTIVAR
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
             </motion.div>
          )}

          {activeTab === 'profile' && (
             <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="bg-white border border-ink/10 p-20 text-center">
                   <div className="w-32 h-32 mx-auto mb-8 border border-ink/10 p-2">
                     <div className="w-full h-full flex items-center justify-center"><Avatar name={userRole || "U"} size={80} /></div>
                   </div>
                   <h2 className="text-3xl font-display mb-2 capitalize">Perfil de {userRole}</h2>
                   <p className="mono-label opacity-40 mb-12">Modifica tu información personal y preferencias</p>
                   
                   <div className="max-w-md mx-auto text-left space-y-6">
                      <div>
                        <label className="mono-label !text-[9px] block mb-2 opacity-50">NOMBRE COMPLETO</label>
                        <input type="text" placeholder="Tu nombre..." className="w-full p-4 bg-paper border border-ink/10 font-display outline-none" />
                      </div>
                      <div>
                        <label className="mono-label !text-[9px] block mb-2 opacity-50">NUEVA CONTRASEÑA</label>
                        <input type="password" placeholder="••••••••" className="w-full p-4 bg-paper border border-ink/10 font-display outline-none" />
                      </div>
                      <button className="w-full mt-8 bg-accent !text-white py-4 mono-label hover:brightness-90 transition-all uppercase tracking-widest shadow-xl shadow-accent/20">
                        Guardar Cambios
                      </button>
                   </div>
                </div>
             </motion.div>
          )}
        </AnimatePresence>

        {/* Forum Participation Overlay */}
        <AnimatePresence>
          {activeForum && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`fixed inset-0 z-50 flex items-center justify-center p-12 bg-ink/60 backdrop-blur-sm ${sidebarCollapsed ? 'left-20' : 'left-64'}`}>
                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-paper w-full h-full flex flex-col shadow-2xl relative overflow-hidden ring-1 ring-white/20">
                   <div className="bg-white border-b border-ink/10 p-8 flex justify-between items-center">
                      <div>
                        <span className="mono-label text-accent mb-2 block">FORO INTERACTIVO</span>
                        <h2 className="text-4xl font-display leading-none">{activeForum.title}</h2>
                      </div>
                      <button onClick={() => setActiveForum(null)} className="mono-label hover:text-accent transition-colors underline">SALIR DEL HILO</button>
                   </div>
                   
                   <div className="flex-1 overflow-y-auto p-12 space-y-12">
                      <div className="sticky top-0 bg-white p-6 border border-ink/5 z-40">
                        <div className="flex flex-wrap gap-3 mb-4">
                          {forumThreads.map((hilo) => (
                            <button
                              key={hilo.id}
                              onClick={async () => {
                                setSelectedThreadId(hilo.id);
                                await loadPosts(hilo.id);
                              }}
                              className={`px-3 py-2 mono-label !text-[9px] border ${selectedThreadId === hilo.id ? 'border-accent text-accent' : 'border-ink/10 text-ink/50'}`}
                            >
                              {hilo.titulo}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-3">
                          <input
                            value={newThreadTitle}
                            onChange={(e) => setNewThreadTitle(e.target.value)}
                            placeholder="Título de nuevo hilo"
                            className="flex-1 bg-paper border border-ink/10 p-3 font-display text-sm outline-none"
                          />
                          <button
                            onClick={async () => {
                              if (!selectedCourse || !newThreadTitle.trim()) return;
                              try {
                                await api.createHilo(selectedCourse.id, { titulo: newThreadTitle.trim() });
                                const res = await api.getHilosByForo(activeForum.id);
                                const threads = (res?.data || []).map((h: any) => ({ id: h.id, titulo: h.titulo || `Hilo ${h.id}` }));
                                setForumThreads(threads);
                                setNewThreadTitle('');
                              } catch (e) {
                                console.error('Error creating thread', e);
                                toast.error('No se pudo crear el hilo');
                              }
                            }}
                            className="px-4 py-2 mono-label !text-[9px] border border-accent !text-accent hover:bg-accent hover:!text-white transition-colors"
                          >
                            CREAR HILO
                          </button>
                        </div>
                      </div>

                      <AnimatePresence>
                        {loadingForumData || loadingPosts ? (
                          <div className="bg-white p-8 border border-ink/10 mono-label opacity-50">Cargando datos del foro...</div>
                        ) : (
                          visibleForumPosts.map((post) => {
                            const isPending = post.estado === 'PENDIENTE_REVISION' || post.estado === 'PENDIENTE_ANALISIS';
                            return (
                              <div key={post.id} className={`p-6 border ${isPending ? 'bg-orange-50 border-orange-200' : 'bg-white/40 border-ink/5'}`}>
                                <div className="flex justify-between mb-3 mono-label opacity-40">
                                  <span>AUTOR: {post.autor?.nombre || 'Anónimo'}</span>
                                  <span>{formatDate(post.creado_en)}</span>
                                </div>
                                {isPending && userRole === 'estudiante' ? (
                                  <div className="p-6 border bg-orange-50 text-orange-800 font-display">Mensaje en revisión</div>
                                ) : (
                                  <p className="text-lg font-display">{post.contenido}</p>
                                )}
                                {isPending && userRole !== 'estudiante' && (
                                  <div className="mt-4 p-3 bg-orange-100/50 border border-orange-200 text-orange-800 mono-label !text-[10px] leading-relaxed">
                                    Este mensaje está pendiente de revisión por posible lenguaje inadecuado.
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                        {!loadingPosts && visibleForumPosts.length === 0 && (
                          <div className="bg-white p-8 border border-ink/10 mono-label opacity-50">Este hilo no tiene publicaciones todavía.</div>
                        )}
                      </AnimatePresence>
                   </div>

                   <div className="p-8 bg-white border-t border-ink/10">
                      <AnimatePresence>
                        {postWarning && showWarning && (
                          <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="mb-6 rounded-2xl border border-amber-300/70 bg-amber-50 px-5 py-4 text-amber-900 shadow-sm"
                          >
                            <div className="flex items-start gap-3">
                              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
                              <div className="flex-1">
                                <p className="font-display text-lg leading-tight">Mensaje no publicado</p>
                                <p className="mt-1 text-sm leading-relaxed opacity-90">{postWarning}</p>
                              </div>
                              <button
                                onClick={() => setShowWarning(false)}
                                className="shrink-0 text-amber-600 hover:text-amber-800 transition-colors ml-2 mt-0.5"
                                title="Cerrar advertencia"
                              >
                                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="18" y1="6" x2="6" y2="18" />
                                  <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <div className="flex gap-6 items-end">
                         <div className="flex-1">
                            <textarea
                              value={newPostContent}
                              onChange={(e) => setNewPostContent(e.target.value)}
                              placeholder="COMPARTA SU APORTE ACADÉMICO..."
                              className="w-full bg-paper border border-ink/5 p-6 font-display text-lg outline-none focus:ring-1 focus:ring-accent/20 transition-all resize-none h-32"
                            />
                         </div>
                         <button
                           onClick={async () => {
                             const contenido = newPostContent.trim();
                             if (!selectedThreadId || !contenido) {
                               toast.error('Selecciona un hilo y escribe contenido');
                               return;
                             }
                             if (contenido.length < 5) {
                               toast.error('El contenido debe tener al menos 5 caracteres');
                               return;
                             }
                             try {
                               await api.createPublicacion(selectedThreadId, { contenido });
                               setNewPostContent('');
                               setPostWarning('');
                               setShowWarning(true);
                               await loadPosts(selectedThreadId);
                               // Refresh incidents so metrics update in real time
                               await refreshIncidents();
                            } catch (e) {
                               console.error('Error creating post', e);
                               const detail = Array.isArray((e as any)?.detail) ? (e as any).detail[0]?.msg : (e as any)?.detail || (e as any)?.message;
                               setPostWarning(detail ? String(detail) : 'No se pudo crear la publicación. Revisa el tono del mensaje e inténtalo de nuevo.');
                               setShowWarning(true);
                             }
                           }}
                           disabled={newPostContent.trim().length < 5}
                           className="btn-cta mono-label !text-xs flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
                         >
                           PUBLICAR <Send size={14} />
                         </button>
                      </div>
                      <p className="mt-4 text-[9px] mono-label opacity-30 text-center uppercase tracking-[0.3em]">Sus mensajes son procesados en tiempo real por el motor de IA RAU-Gen-3</p>
                   </div>
                </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* New Forum Modal */}
        <AnimatePresence>
          {showNewForumModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
                <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white max-w-md w-full p-12 shadow-2xl">
                   <h3 className="text-3xl font-serif mb-8 italic">Nueva Cátedra Digital</h3>
                   <div className="space-y-8">
                      <div>
                        <label className="mono-label block mb-2">TITULO DEL FORO</label>
                        <input value={newForumTitle} onChange={e => setNewForumTitle(e.target.value)} type="text" placeholder="EJ. CONCEPTOS BÁSICOS" className="w-full bg-paper border border-ink/5 p-4 font-display text-lg outline-none" />
                      </div>
                      <div className="flex gap-4 pt-4">
                        <button onClick={() => setShowNewForumModal(false)} className="flex-1 py-4 mono-label !text-[10px] border border-ink/10">CANCELAR</button>
                        <button onClick={async () => {
                          if (!newForumTitle.trim() || !selectedCourse) return toast.error('Ingrese un título y asegurese de tener un curso seleccionado');
                          try {
                            const res = await api.createForo(selectedCourse.id, { titulo: newForumTitle.trim() });
                            const foro = res?.data || res;
                            const mapped = { id: foro.id, title: foro.titulo || foro.title, threads: 0, lastPost: '' };
                            const updatedCourse = { ...(selectedCourse as Course), forums: [ ...(selectedCourse?.forums || []), mapped ] };
                            setSelectedCourse(updatedCourse);
                            setCoursesList(prev => prev.map(c => c.id === updatedCourse.id ? updatedCourse : c));
                            setNewForumTitle('');
                            setShowNewForumModal(false);
                          } catch (e) { console.error('Error creando foro', e); toast.error('No se pudo crear el foro'); }
                        }} className="flex-1 py-4 mono-label !text-[10px] bg-accent !text-white shadow-lg shadow-accent/20">ESTABLECER FORO</button>
                      </div>
                   </div>
                </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Create Course Modal */}
        <AnimatePresence>
          {showCreateCourseModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white max-w-md w-full p-12 shadow-2xl">
                 <h3 className="text-3xl font-serif mb-8 italic">Crear Nuevo Curso</h3>
                 <div className="space-y-6">
                   <div>
                     <label className="mono-label block mb-2">Código</label>
                     <input value={newCourse.codigo} onChange={e => setNewCourse({...newCourse, codigo: e.target.value})} className="w-full bg-paper border border-ink/5 p-3" />
                   </div>
                   <div>
                     <label className="mono-label block mb-2">Nombre</label>
                     <input value={newCourse.nombre} onChange={e => setNewCourse({...newCourse, nombre: e.target.value})} className="w-full bg-paper border border-ink/5 p-3" />
                   </div>
                   <div>
                     <label className="mono-label block mb-2">Periodo</label>
                     <input value={newCourse.periodo} onChange={e => setNewCourse({...newCourse, periodo: e.target.value})} className="w-full bg-paper border border-ink/5 p-3" />
                   </div>
                   <div className="flex gap-4 pt-4">
                     <button onClick={() => setShowCreateCourseModal(false)} className="flex-1 py-4 mono-label !text-[10px] border border-ink/10">CANCELAR</button>
                     <button onClick={async () => {
                       if (!newCourse.codigo.trim() || !newCourse.nombre.trim()) return toast.error('Completa código y nombre');
                       try {
                         const res = await api.createCurso(newCourse);
                         const created = res?.data || res;
                         // reload courses
                         const listRes = await api.getAllCursos();
                         const data = listRes?.data || listRes;
                         const mapped = (data || []).map((c: any) => ({ id: c.id, name: c.nombre || c.name, teacher: c.profesor || undefined, forums: [] }));
                         setCoursesList(mapped);
                         setShowCreateCourseModal(false);
                         setNewCourse({ nombre: '', codigo: '', periodo: '2026-1', institucion_id: 1 });
                       } catch (e) { console.error('Error creating course', e); toast.error('No se pudo crear el curso'); }
                     }} className="flex-1 py-4 mono-label !text-[10px] bg-accent !text-white">CREAR CURSO</button>
                   </div>
                 </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enrollment Modal */}
        <AnimatePresence>
          {showEnrollmentModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white max-w-xl w-full p-12 shadow-2xl">
                 <h3 className="text-3xl font-serif mb-8 italic">Matricular Usuario</h3>
                 <div className="space-y-6">
                   <div>
                     <label className="mono-label block mb-2">Email del usuario</label>
                     <input value={newEnrollment.usuario_email} onChange={e => setNewEnrollment({...newEnrollment, usuario_email: e.target.value})} className="w-full bg-paper border border-ink/5 p-3" placeholder="usuario@universidad.edu" />
                   </div>
                   <div>
                     <label className="mono-label block mb-2">Nombre (si se crea automáticamente)</label>
                     <input value={newEnrollment.nombre} onChange={e => setNewEnrollment({...newEnrollment, nombre: e.target.value})} className="w-full bg-paper border border-ink/5 p-3" placeholder="Nombre completo" />
                   </div>
                   <div>
                     <label className="mono-label block mb-2">Rol en el curso</label>
                     {userRole === 'admin' ? (
                       <select value={newEnrollment.rol_en_curso} onChange={e => setNewEnrollment({...newEnrollment, rol_en_curso: e.target.value})} className="w-full bg-paper border border-ink/5 p-3">
                         <option value="ESTUDIANTE">ESTUDIANTE</option>
                         <option value="DOCENTE">DOCENTE</option>
                       </select>
                     ) : (
                       <select value={newEnrollment.rol_en_curso} disabled className="w-full bg-paper border border-ink/5 p-3 opacity-50 cursor-not-allowed">
                         <option value="ESTUDIANTE">ESTUDIANTE</option>
                       </select>
                     )}
                   </div>
                   <label className="flex items-center gap-3 mono-label !text-[10px]">
                     <input type="checkbox" checked={newEnrollment.crear_si_no_existe} onChange={e => setNewEnrollment({...newEnrollment, crear_si_no_existe: e.target.checked})} />
                     Crear usuario automáticamente si no existe
                   </label>
                   <div className="flex gap-4 pt-4">
                     <button onClick={() => setShowEnrollmentModal(false)} className="flex-1 py-4 mono-label !text-[10px] border border-ink/10">CANCELAR</button>
                     <button onClick={submitEnrollment} className="flex-1 py-4 mono-label !text-[10px] bg-accent !text-white">MATRICULAR</button>
                   </div>
                 </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

const ArrowLeft = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
);

