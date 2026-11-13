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

  const formatDate = (value?: string) => {
    if (!value) return 'Sin fecha';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
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
      alert('No se pudieron marcar todas como leídas');
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
      alert('No se pudo crear la matrícula');
    }
  };

  const removeEnrollment = async (usuarioId: number) => {
    if (!selectedCourse) return;

    try {
      await api.deleteCourseEnrollment(selectedCourse.id, usuarioId);
      await loadCourseEnrollments(selectedCourse.id);
    } catch (e) {
      console.error('Error removing enrollment', e);
      alert('No se pudo eliminar la matrícula');
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
      alert('No se pudo inscribir al curso');
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
      alert('No se pudo desactivar el curso');
    }
  };

  const removeUser = async (userId: number) => {
    try {
      await api.deleteDashboardUser(userId);
      const res = await api.getDashboardUsers();
      setAdminUsers((res?.data || []) as AdminUserItem[]);
    } catch (e) {
      console.error('Error deleting user', e);
      alert('No se pudo desactivar el usuario');
    }
  };

  const menuItems = [
    { id: 'overview', icon: BarChart3, label: 'Resumen', roles: ['admin', 'docente'] },
    { id: 'messages', icon: MessageSquare, label: 'Evaluaciones', roles: ['admin', 'docente'] },
    { id: 'courses', icon: FolderOpen, label: 'Cursos', roles: ['admin', 'docente', 'estudiante'] },
    { id: 'status', icon: AlertTriangle, label: 'Mis Reportes', roles: ['estudiante'] },
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
    <div className="min-h-screen text-ink flex selection:bg-accent selection:text-white relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-90" style={{ background: 'radial-gradient(circle at 10% 5%, rgba(36,68,216,0.14), transparent 22%), radial-gradient(circle at 90% 12%, rgba(61,90,254,0.10), transparent 20%), radial-gradient(circle at 85% 85%, rgba(36,68,216,0.08), transparent 18%)' }} />
      {/* Sidebar */}
      <aside className={`glass-strip flex flex-col fixed inset-y-0 z-20 transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="p-8 pb-12 flex justify-between items-start">
          {!sidebarCollapsed && (
            <>
              <div>
                <div className="text-accent font-serif italic text-3xl mb-1">R.</div>
                <span className="mono-label !text-[10px] opacity-100 capitalize">{userRole === 'admin' ? 'Coordinación' : userRole === 'docente' ? 'Facultad' : 'Estudiante'} Panel</span>
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

        <nav className="flex-1 px-4 space-y-1">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as any);
                setSelectedCourse(null);
                setActiveForum(null);
              }}
              className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} px-4 py-3 transition-all group ${
                activeTab === item.id 
                  ? 'text-accent font-bold' 
                  : 'text-ink/40 hover:text-ink'
              }`}
              title={sidebarCollapsed ? item.label : ''}
            >
              <div className={`flex items-center ${sidebarCollapsed ? '' : 'gap-4'}`}>
                <item.icon size={18} strokeWidth={activeTab === item.id ? 2.5 : 1.5} />
                <span className={`mono-label !text-[11px] tracking-widest inline-block transform transition-all duration-300 overflow-hidden whitespace-nowrap ${sidebarCollapsed ? 'opacity-0 max-w-0 -translate-x-2' : 'opacity-100 max-w-[160px] translate-x-0'}`}>{item.label}</span>
              </div>
              {!sidebarCollapsed && activeTab === item.id && <div className="w-1 h-1 rounded-full bg-accent" />}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-ink/5 mt-auto flex items-center justify-center">
          {sidebarCollapsed ? (
            <button onClick={onLogout} title="Cerrar sesión" className="bg-accent text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg shadow-accent/20">
              <LogOut size={16} />
            </button>
          ) : (
            <button 
              onClick={onLogout}
              className={`w-full bg-accent !text-white px-6 py-3 mono-label !text-[10px] hover:brightness-90 transition-all uppercase tracking-widest text-center shadow-lg shadow-accent/20`}
            >
              Cerrar Sesión
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-64'} p-4 sm:p-6 lg:p-20 overflow-y-auto relative z-10`}>
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 mb-4 text-[10px] mono-label opacity-40">
           <span>RAU</span>
           <ChevronRight size={10} />
           <span className="uppercase">{activeTab}</span>
           {selectedCourse && (
             <>
               <ChevronRight size={10} />
               <span className="text-ink">{selectedCourse.name}</span>
             </>
           )}
        </div>

        <header className="card-hero flex justify-between items-baseline mb-20 px-10 py-10 relative z-50">
          <div>
            <h1 className="text-5xl font-serif mb-2 italic">
               {!selectedCourse ? (
                  <>
                    {activeTab === 'overview' && 'Inteligencia Institucional'}
                    {activeTab === 'messages' && 'Protocolo Moderación'}
                    {activeTab === 'courses' && 'Entornos de Cátedra'}
                    {activeTab === 'status' && 'Trazabilidad de Conducta'}
                    {activeTab === 'settings' && 'Seguridad Sistémica'}
                  </>
               ) : (
                  selectedCourse.name
               )}
            </h1>
            <p className="mono-label opacity-40 italic">
              {userRole === 'admin' ? 'Observación Global de Red' : userRole === 'docente' ? 'Gestión de Interacción Académica' : 'Tu historial de convivencia digital'}
            </p>
          </div>
          
          <div className="flex items-center gap-8">
            {(userRole === 'docente' || userRole === 'admin') && (
              <div className="relative">
                <button onClick={handleToggleNotifications} className={`flex items-center gap-3 rounded-full border border-accent/20 bg-accent/10 px-4 py-2 text-accent`} title="Ver notificaciones">
                  <span className="mono-label !text-[9px] uppercase tracking-[0.25em]">Notificaciones</span>
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-2 text-[10px] font-bold text-white">
                    {unreadNotifications}
                  </span>
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
                            <div className="mt-1 font-serif italic text-sm">{n.mensaje}</div>
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
            <button onClick={() => setActiveTab('profile' as any)} className="w-12 h-12 grayscale border border-ink/10 p-1 hover:border-accent hover:grayscale-0 transition-all">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userRole === 'admin' ? 'Admin' : userRole === 'docente' ? 'Teacher' : 'Student'}`} alt="User" className="w-full h-full object-cover" />
            </button>
          </div>
        </header>

        {/* View Selection */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border border-ink/10 mb-20">
                {stats.map((stat, idx) => (
                  <div key={idx} className={`card-hero p-10 ${idx !== 3 ? 'lg:border-r' : ''} group`}>
                    <div className="flex justify-between items-start mb-8">
                      <span className="mono-label text-ink/30 border-b border-accent/20 pb-1 group-hover:text-accent group-hover:border-accent transition-colors">{stat.title}</span>
                      <span className={`text-[10px] font-bold ${stat.trend === 'up' ? 'text-green-600' : 'text-accent'}`}>{stat.change}</span>
                    </div>
                    <h3 className="text-5xl font-serif">{stat.value}</h3>
                  </div>
                ))}
              </div>
              
              <div className="grid lg:grid-cols-2 gap-20">
                <div className="lg:col-span-1">
                  <h3 className="text-3xl font-serif italic mb-10 border-b border-ink/5 pb-4">Evaluaciones más Recientes</h3>
                  <div className="space-y-6">
                    {recentIncidents.slice(0, 10).map(incident => (
                      <div key={incident.id} className="flex justify-between items-center border-b border-ink/5 pb-6 last:border-0 hover:bg-white p-2 transition-colors">
                         <div className="flex gap-4">
                           <div className="w-10 h-10 bg-paper border border-ink/5 flex items-center justify-center mono-label text-[10px] font-black italic">{incident.user.charAt(0)}</div>
                           <div>
                             <p className="font-serif italic text-lg leading-none mb-1">{incident.user}</p>
                             <p className="text-[10px] mono-label opacity-40">{incident.course}</p>
                           </div>
                         </div>
                         <div className="text-right">
                           <p className="text-accent font-serif mb-1 line-through opacity-50 text-sm italic">"{incident.message.substring(0, 20)}..."</p>
                           <span className="mono-label !text-[8px] opacity-100 text-accent font-bold">NIVEL: {incident.riesgo || 'BAJO'}</span>
                         </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-1">
                  <h3 className="text-3xl font-serif italic mb-10 border-b border-ink/5 pb-4">Distribución por Curso</h3>
                  <div className="space-y-8 bg-white/40 p-8 border border-ink/5">
                    {(globalMetrics?.detalles_incidentes || []).map((detalle: any, idx: number) => {
                       const max = Math.max(...(globalMetrics?.detalles_incidentes || []).map((d: any) => d.incidentes), 1);
                       const percentage = Math.round((detalle.incidentes / max) * 100);
                       return (
                         <div key={idx} className="group">
                           <div className="flex justify-between mb-2 mono-label text-[11px]">
                             <span className="opacity-60 group-hover:opacity-100 transition-opacity">{detalle.curso}</span>
                             <span className="font-bold text-accent">{detalle.incidentes} incidentes</span>
                           </div>
                           <div className="h-1.5 w-full bg-ink/5 overflow-hidden">
                             <div 
                               className="h-full bg-accent transition-all duration-1000 ease-out origin-left" 
                               style={{ width: `${percentage}%` }}
                             />
                           </div>
                         </div>
                       );
                    })}
                    {(!globalMetrics?.detalles_incidentes || globalMetrics.detalles_incidentes.length === 0) && (
                      <div className="text-sm opacity-50 mono-label italic text-center py-10">No hay datos de incidentes.</div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'messages' && (
            <motion.div key="messages" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex justify-between items-center mb-12">
                 <div>
                   <span className="mono-label text-accent">MÓDULO DE DECISIÓN HUMANA</span>
                   <p className="text-xs font-serif italic opacity-40 mt-1">Filtrando por: {userRole === 'admin' ? 'Toda la institución' : 'Tus cursos asignados'}</p>
                 </div>
                 <div className="flex gap-4 font-serif italic text-sm">
                   <button onClick={() => { setMessagesMode('pendientes'); }} className="underline">Pendientes ({recentIncidents.filter(i => ['pending','PENDIENTE_REVISION','PENDIENTE_ANALISIS'].includes(String(i.status).toUpperCase())).length})</button>
                   <button onClick={async () => { setMessagesMode('historial'); await loadHistory(); }} className={`opacity-40 hover:opacity-100 transition-opacity ${messagesMode === 'historial' ? 'opacity-100' : ''}`}>Historial</button>
                 </div>
              </div>

              <div className="grid gap-8 relative z-30">
                    {messagesMode === 'pendientes' ? (
                      displayIncidents.filter(i => 
                        i.status === 'PENDIENTE_REVISION' || 
                        i.status === 'PENDIENTE_ANALISIS' ||
                        (userRole === 'admin' && (i.status === 'APROBADO' || i.status === 'reviewed'))
                      ).map(incident => (
                  <div key={incident.id} className="card-hero border-l-4 border-l-accent p-12 group transition-all">
                    <div className="flex justify-between mb-8">
                      <div className="flex gap-4 items-center">
                        <div className="mono-label !text-accent font-bold">NIVEL: {incident.riesgo || 'BAJO'}</div>
                        <span className="h-1 w-1 rounded-full bg-ink/20" />
                        <div className="mono-label opacity-40 uppercase !text-[9px]">CURSO: {incident.course}</div>
                        <span className="h-1 w-1 rounded-full bg-ink/20" />
                        <div className="mono-label opacity-60 uppercase !text-[9px]">AUTOR: {incident.user}</div>
                      </div>
                      <span className="mono-label opacity-30 !text-[9px]">{incident.date}</span>
                    </div>
                    
                    <h4 className="text-4xl font-serif mb-12 leading-[1.1] italic group-hover:text-accent transition-colors">"{incident.message}"</h4>
                    
                    <div className="flex justify-between items-end border-t border-ink/5 pt-8">
                       <div className="flex items-center gap-6">
                         <div className="w-10 h-10 rounded-full border border-ink/10 grayscale overflow-hidden">
                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${incident.user}`} />
                         </div>
                         <div>
                            <div className="mono-label !text-[11px] mb-1 font-bold">{incident.user}</div>
                            <div className="mono-label !text-[8px] opacity-30">Reputación Académica: 4.8/5.0</div>
                         </div>
                       </div>

                       <div className="flex gap-4">
                         <button onClick={async () => {
                           try {
                             await api.aprobarPublicacion(incident.id, 'Aprobado por moderador');
                             await refreshIncidents();
                           } catch (e) { console.error(e); alert('Error aprobando publicación'); }
                         }} className="bg-white border border-ink/10 px-8 py-3 mono-label !text-[10px] hover:bg-gray-50 uppercase tracking-widest">APROBAR</button>
                         <button onClick={async () => {
                           try {
                             await api.rechazarPublicacion(incident.id, 'Contenido inapropiado');
                             await refreshIncidents();
                           } catch (e) { console.error(e); alert('Error rechazando publicación'); }
                         }} className="bg-white border border-accent !text-accent px-8 py-3 mono-label !text-[10px] hover:bg-accent hover:!text-white transition-all uppercase tracking-widest">RECHAZAR</button>
                       </div>
                    </div>
                  </div>
                ))) : (
                  loadingHistory ? (
                    <div className="p-8">Cargando historial...</div>
                  ) : (
                    historyItems.map((h) => (
                      <div key={h.id} className="card-hero p-8 flex justify-between items-center group">
                        <div className="max-w-xl">
                          <div className="flex gap-4 mb-3">
                            <span className={`mono-label !text-[9px] px-2 py-0.5 border ${h.status === 'APROBADO' ? 'border-green-500 text-green-500' : 'border-accent text-accent'}`}>{h.status}</span>
                            <span className="mono-label opacity-50">{h.course}</span>
                          </div>
                          <p className="font-serif italic text-lg leading-none mb-2">{h.message}</p>
                          <div className="mono-label !text-[10px] opacity-60">Observación: {h.observation || '-'}</div>
                        </div>
                        <div className="mono-label opacity-30 !text-[9px]">{formatDate(h.date)}</div>
                      </div>
                    ))
                  )
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'courses' && (
            <motion.div key="courses" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {!selectedCourse ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-0 border border-ink/10">
                  {displayCourses.map(course => (
                    <div key={course.id} onClick={() => handleEnterCourse(course)} className="bg-white p-12 border-b border-r border-ink/10 hover:bg-paper transition-all cursor-pointer group">
                       <div className="flex justify-between mb-8">
                         <span className="mono-label text-accent">{course.faculty}</span>
                         <Plus size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                       </div>
                       <h3 className="text-4xl font-serif italic mb-10 leading-tight group-hover:text-accent transition-colors">{course.name}</h3>
                       {userRole === 'admin' && <p className="mono-label !text-[8px] opacity-40 mb-6 -mt-6">PROFESOR: {course.teacher || 'Sin asignar'}</p>}
                       <div className="flex justify-between items-center text-[10px] mono-label opacity-40 border-t border-ink/5 pt-6 mt-4">
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
                               alert('No se pudo inscribir al curso');
                             }
                           }}
                           className="mt-6 mono-label !text-[10px] !text-accent border border-accent px-4 py-2 hover:bg-accent hover:!text-white transition-all"
                         >
                           INSCRIBIRME
                         </button>
                       )}
                    </div>
                  ))}
                  {userRole === 'admin' && (
                    <div className="bg-paper p-12 border-b border-r flex flex-col items-center justify-center text-ink/20 hover:text-accent transition-colors border-ink/10 cursor-pointer">
                      <div className="w-16 h-16 border-2 border-dashed border-current rounded-full flex items-center justify-center mb-4">
                        <span className="text-4xl">+</span>
                      </div>
                      <button onClick={() => setShowCreateCourseModal(true)} className="mono-label !text-[10px]">CREAR NUEVO CURSO</button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-20">
                  <div className="flex justify-between items-baseline border-b border-ink/5 pb-4">
                    <h3 className="text-3xl font-serif italic">Foros de Discusión</h3>
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
                        <p className="font-serif italic text-2xl">Este curso no está en tu matrícula activa.</p>
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
                          <p className="text-xs font-serif italic opacity-50">Usuarios asociados a este curso</p>
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
                                <div className="font-serif italic text-lg leading-tight">{enrollment.usuario_nombre}</div>
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
                      <div key={forum.id} onClick={() => handleOpenForum(forum)} className="card-hero p-10 flex justify-between items-center cursor-pointer transition-all group hover:shadow-2xl hover:-translate-y-1">
                        <div className="flex items-center gap-10">
                          <div className="text-6xl font-serif italic text-ink/5 transition-colors group-hover:text-accent/10">{forum.threads}</div>
                          <div>
                            <h4 className="font-serif text-3xl mb-2 group-hover:text-accent transition-colors">{forum.title}</h4>
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
            <motion.div key="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
               <div className="bg-white border border-ink/10 p-16 mb-12">
                  <span className="mono-label text-accent mb-6 block">RESUMEN DE CONDUCTA</span>
                  <div className="flex gap-20">
                     <div>
                       <span className="mono-label block opacity-30 mb-2">MENSAJES ENVIADOS</span>
                       <span className="text-6xl font-serif italic">{userRole === 'estudiante' ? studentMessagesSent : recentIncidents.length}</span>
                     </div>
                     <div>
                       <span className="mono-label block opacity-30 mb-2">ALERTAS GENERADAS</span>
                       <span className="text-6xl font-serif italic text-accent">{userRole === 'estudiante' ? studentReports : potentialIncidents}</span>
                     </div>
                     <div>
                       <span className="mono-label block opacity-30 mb-2">INDICE DE CONVIVENCIA</span>
                       <span className="text-6xl font-serif italic text-green-600">{userRole === 'estudiante' ? studentSafetyIndex.toFixed(1) : '100.0'}%</span>
                     </div>
                  </div>
               </div>

               <div className="space-y-6">
                 <h3 className="text-2xl font-serif italic border-b border-ink/5 pb-4">Historial de Reportes Automáticos</h3>
                 {recentIncidents.map((report, idx) => (
                   <div key={report.id || idx} className="card-hero p-8 flex justify-between items-center group">
                      <div className="max-w-xl">
                        <div className="flex gap-4 mb-3">
                          <span className={`mono-label !text-[9px] px-2 py-0.5 border ${report.status === 'APROBADO' ? 'border-green-500 text-green-500' : 'border-accent text-accent'}`}>
                            {report.status === 'PENDIENTE_REVISION'
                              ? 'EN REVISIÓN'
                              : report.status === 'PENDIENTE_ANALISIS'
                                ? 'EN ANÁLISIS'
                                : report.status}
                          </span>
                          <span className="mono-label !text-[9px] opacity-40">{formatDate(report.date)} — {report.course}</span>
                        </div>
                        {userRole === 'estudiante' && report.status !== 'APROBADO' ? (
                          <p className="text-lg font-serif italic mb-2 text-accent">
                            En el curso {report.course} en la fecha {formatDate(report.date)} tu mensaje quedó en revisión.
                          </p>
                        ) : (
                          <p className="text-lg font-serif italic mb-2">"{report.message}"</p>
                        )}
                        <p className="mono-label !text-[8px] opacity-40 leading-relaxed uppercase">Registro obtenido desde base de datos</p>
                      </div>
                      {userRole !== 'estudiante' && (
                        <button className="mono-label text-accent underline opacity-0 group-hover:opacity-100 transition-opacity">VER DETALLE</button>
                      )}
                   </div>
                 ))}
                 {recentIncidents.length === 0 && (
                   <div className="card-hero p-8 mono-label opacity-40">No hay reportes en base de datos para este usuario.</div>
                 )}
               </div>
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
                          <p className="text-xs font-serif italic opacity-50">Desactiva usuarios y sus matrículas</p>
                        </div>
                        {loadingUsers && <span className="mono-label !text-[9px] opacity-40">CARGANDO...</span>}
                      </div>
                      <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-2">
                        {adminUsers.map((user) => (
                          <div key={user.id} className="flex items-center justify-between border border-ink/5 p-4 bg-paper/60">
                            <div>
                              <div className="font-serif italic text-lg leading-tight">{user.nombre}</div>
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
                          <p className="text-xs font-serif italic opacity-50">Elimina cursos de forma lógica</p>
                        </div>
                        <button onClick={async () => { await refreshCourses(); }} className="mono-label !text-[9px] border border-ink/10 px-4 py-2 hover:bg-paper transition-all">
                          REFRESCAR
                        </button>
                      </div>
                      <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-2">
                        {coursesList.map((course) => (
                          <div key={course.id} className="flex items-center justify-between border border-ink/5 p-4 bg-paper/60">
                            <div>
                              <div className="font-serif italic text-lg leading-tight">{course.name}</div>
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
                     <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userRole === 'admin' ? 'Admin' : userRole === 'docente' ? 'Teacher' : 'Student'}`} alt="User" className="w-full h-full object-cover" />
                   </div>
                   <h2 className="text-3xl font-serif italic mb-2 capitalize">Perfil de {userRole}</h2>
                   <p className="mono-label opacity-40 mb-12">Modifica tu información personal y preferencias</p>
                   
                   <div className="max-w-md mx-auto text-left space-y-6">
                      <div>
                        <label className="mono-label !text-[9px] block mb-2 opacity-50">NOMBRE COMPLETO</label>
                        <input type="text" placeholder="Tu nombre..." className="w-full p-4 bg-paper border border-ink/10 font-serif italic outline-none" />
                      </div>
                      <div>
                        <label className="mono-label !text-[9px] block mb-2 opacity-50">NUEVA CONTRASEÑA</label>
                        <input type="password" placeholder="••••••••" className="w-full p-4 bg-paper border border-ink/10 font-serif italic outline-none" />
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
                        <h2 className="text-4xl font-serif italic leading-none">{activeForum.title}</h2>
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
                            className="flex-1 bg-paper border border-ink/10 p-3 font-serif italic text-sm outline-none"
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
                                alert('No se pudo crear el hilo');
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
                                  <div className="p-6 border bg-orange-50 text-orange-800 font-serif italic">Mensaje en revisión</div>
                                ) : (
                                  <p className="text-lg font-serif italic">{post.contenido}</p>
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
                                <p className="font-serif italic text-lg leading-tight">Mensaje no publicado</p>
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
                              className="w-full bg-paper border border-ink/5 p-6 font-serif italic text-lg outline-none focus:ring-1 focus:ring-accent/20 transition-all resize-none h-32"
                            />
                         </div>
                         <button
                           onClick={async () => {
                             const contenido = newPostContent.trim();
                             if (!selectedThreadId || !contenido) {
                               alert('Selecciona un hilo y escribe contenido');
                               return;
                             }
                             if (contenido.length < 5) {
                               alert('El contenido debe tener al menos 5 caracteres');
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
                        <input value={newForumTitle} onChange={e => setNewForumTitle(e.target.value)} type="text" placeholder="EJ. CONCEPTOS BÁSICOS" className="w-full bg-paper border border-ink/5 p-4 font-serif italic text-lg outline-none" />
                      </div>
                      <div className="flex gap-4 pt-4">
                        <button onClick={() => setShowNewForumModal(false)} className="flex-1 py-4 mono-label !text-[10px] border border-ink/10">CANCELAR</button>
                        <button onClick={async () => {
                          if (!newForumTitle.trim() || !selectedCourse) return alert('Ingrese un título y asegurese de tener un curso seleccionado');
                          try {
                            const res = await api.createForo(selectedCourse.id, { titulo: newForumTitle.trim() });
                            const foro = res?.data || res;
                            const mapped = { id: foro.id, title: foro.titulo || foro.title, threads: 0, lastPost: '' };
                            const updatedCourse = { ...(selectedCourse as Course), forums: [ ...(selectedCourse?.forums || []), mapped ] };
                            setSelectedCourse(updatedCourse);
                            setCoursesList(prev => prev.map(c => c.id === updatedCourse.id ? updatedCourse : c));
                            setNewForumTitle('');
                            setShowNewForumModal(false);
                          } catch (e) { console.error('Error creando foro', e); alert('No se pudo crear el foro'); }
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
                       if (!newCourse.codigo.trim() || !newCourse.nombre.trim()) return alert('Completa código y nombre');
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
                       } catch (e) { console.error('Error creating course', e); alert('No se pudo crear el curso'); }
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

