/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import Landing from './views/Landing';
import Login from './views/Login';
import Dashboard from './views/Dashboard';
import Register from './views/Register';
import { clearSession, getStoredSession } from './services/auth';

export type UserRole = 'admin' | 'docente' | 'estudiante';
type ViewState = 'landing' | 'login' | 'dashboard' | 'register-student' | 'register-teacher';

export default function App() {
  const [view, setView] = useState<ViewState>('landing');
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    const session = getStoredSession();
    if (session?.role) {
      setUserRole(session.role);
      setView('dashboard');
    }
  }, []);

  const handleNavigate = (newView: ViewState) => {
    setView(newView);
  };

  const handleLogin = (role: UserRole) => {
    setUserRole(role);
    setView('dashboard');
  };

  const handleLogout = () => {
    clearSession();
    setUserRole(null);
    setView('landing');
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      <AnimatePresence mode="wait">
        {view === 'landing' && (
          <motion.div
            key="landing"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <Landing onNavigate={handleNavigate} />
          </motion.div>
        )}

        {view === 'login' && (
          <motion.div
            key="login"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
          >
            <Login onNavigate={handleNavigate} onLogin={handleLogin} />
          </motion.div>
        )}

        {(view === 'register-student' || view === 'register-teacher') && (
          <motion.div
            key="register"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.3 }}
          >
            <Register 
              type={view === 'register-student' ? 'student' : 'teacher'} 
              onNavigate={handleNavigate} 
              onRegister={() => handleLogin(view === 'register-student' ? 'estudiante' : 'docente')} 
            />
          </motion.div>
        )}

        {view === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Dashboard userRole={userRole} onLogout={handleLogout} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
