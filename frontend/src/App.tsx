import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './pages/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import Profile from './pages/Profile';
import Teachers from './pages/Admin/Teachers';
import Statistics from './pages/Admin/Statistics';
import AdminDashboard from './pages/Admin/AdminDashboard';
import Categories from './pages/Admin/Categories';
import Templates from './pages/Admin/Templates';
import TemplatesLibrary from './pages/TemplatesLibrary';
import GeneratedDocuments from './pages/GeneratedDocuments';
import AllGeneratedDocuments from './pages/Admin/AllGeneratedDocuments';
import RobotRuns from './pages/Admin/RobotRuns';
import Settings from './pages/Admin/Settings';
import Publications from './pages/Publications';
import PublicationsReview from './pages/Admin/PublicationsReview';
import KkkPreparation from './pages/KkkPreparation';
import KkkSubmissions from './pages/Admin/KkkSubmissions';
import PasswordResetRequests from './pages/Admin/PasswordResetRequests';
import AdminTemplateRequests from './pages/Admin/TemplateRequests';
import Deadlines from './pages/Deadlines';
import DeadlinesManagement from './pages/Admin/DeadlinesManagement';
import ActivityLog from './pages/ActivityLog';
import Notifications from './pages/Notifications';
import Messages from './pages/Messages';
import UsersSearch from './pages/UsersSearch';
import UserProfile from './pages/UserProfile';
import FindSupervisor from './pages/FindSupervisor';
import Unauthorized from './pages/Unauthorized';
import NotFound from './pages/NotFound';
import PublicProfile from './pages/PublicProfile';
import { Toaster } from './components/Toaster';
import CommandPalette from './components/CommandPalette';
import { useAuth } from './contexts/AuthContext';
import './i18n/config';

const queryClient = new QueryClient();

function RoleBasedRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'ROLE_ADMIN') return <Navigate to="/admin/dashboard" replace />;
  if (user.role === 'ROLE_ROBOT') return <Navigate to="/admin/robot-runs" replace />;
  return <Navigate to="/dashboard" replace />;
}

interface RequireRoleProps {
  role: 'ROLE_ADMIN' | 'ROLE_TEACHER';
  children: React.ReactNode;
}

function RequireRole({ role, children }: RequireRoleProps) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role === 'ROLE_ADMIN' && user.role !== 'ROLE_ADMIN') {
    return <Navigate to="/unauthorized" replace />;
  }
  if (role === 'ROLE_TEACHER' && user.role === 'ROLE_ADMIN') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <>{children}</>;
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <Routes location={location}>
          {/* Root redirect based on role */}
          <Route path="/" element={<RoleBasedRedirect />} />

          {/* Teacher routes */}
          <Route path="/dashboard" element={<RequireRole role="ROLE_TEACHER"><Dashboard /></RequireRole>} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/generated-documents" element={<GeneratedDocuments />} />
          <Route path="/publications" element={<Publications />} />
          <Route path="/kkk" element={<KkkPreparation />} />
          <Route path="/deadlines" element={<Deadlines />} />
          <Route path="/templates-library" element={<TemplatesLibrary />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/activity" element={<ActivityLog />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/users" element={<UsersSearch />} />
          <Route path="/user/:userId" element={<UserProfile />} />
          <Route path="/find-supervisor" element={<FindSupervisor />} />

          {/* Admin routes */}
          <Route path="/admin/dashboard" element={<RequireRole role="ROLE_ADMIN"><AdminDashboard /></RequireRole>} />
          <Route path="/statistics" element={<RequireRole role="ROLE_ADMIN"><Statistics /></RequireRole>} />
          <Route path="/admin/statistics" element={<RequireRole role="ROLE_ADMIN"><Statistics /></RequireRole>} />
          <Route path="/teachers" element={<RequireRole role="ROLE_ADMIN"><Teachers /></RequireRole>} />
          <Route path="/categories" element={<RequireRole role="ROLE_ADMIN"><Categories /></RequireRole>} />
          <Route path="/templates" element={<RequireRole role="ROLE_ADMIN"><Templates /></RequireRole>} />
          <Route path="/settings" element={<RequireRole role="ROLE_ADMIN"><Settings /></RequireRole>} />
          <Route path="/admin/all-generated-documents" element={<RequireRole role="ROLE_ADMIN"><AllGeneratedDocuments /></RequireRole>} />
          <Route path="/admin/robot-runs" element={<RequireRole role="ROLE_ADMIN"><RobotRuns /></RequireRole>} />
          <Route path="/admin/publications-review" element={<RequireRole role="ROLE_ADMIN"><PublicationsReview /></RequireRole>} />
          <Route path="/admin/kkk-submissions" element={<RequireRole role="ROLE_ADMIN"><KkkSubmissions /></RequireRole>} />
          <Route path="/admin/password-resets" element={<RequireRole role="ROLE_ADMIN"><PasswordResetRequests /></RequireRole>} />
          <Route path="/admin/template-requests" element={<RequireRole role="ROLE_ADMIN"><AdminTemplateRequests /></RequireRole>} />
          <Route path="/admin/deadlines-management" element={<RequireRole role="ROLE_ADMIN"><DeadlinesManagement /></RequireRole>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <CommandPalette />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              {/* Public profile — no auth, no layout */}
              <Route path="/p/:slug" element={<PublicProfile />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <AnimatedRoutes />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
