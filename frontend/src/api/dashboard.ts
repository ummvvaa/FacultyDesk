import { apiClient } from './client';
import { TodayFocus } from '../types';

export interface DeadlineInfo {
  id: number;
  title: string;
  deadlineDate: string;
  category: string | null;
}

export interface NotificationInfo {
  id: number;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string | null;
}

export interface TemplateInfo {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  updatedAt: string | null;
}

export interface TeacherDashboard {
  kkkCompletion: number;
  publicationsTotal: number;
  publicationsScopus: number;
  publicationsKokson: number;
  publicationsOther: number;
  publicationsByYear: Record<string, number>;
  generatedDocsCount: number;
  lastGeneratedDocDate: string | null;
  reportsByStatus: Record<string, number>;
  reportsByMonth: Record<string, number>;
  upcomingDeadlines: DeadlineInfo[];
  recentNotifications: NotificationInfo[];
  templateUpdates: TemplateInfo[];
}

export interface KkkTeacherInfo {
  teacherId: number;
  username: string;
  completionPercentage: number;
}

export interface RobotRunInfo {
  id: number;
  status: string;
  startedAt: string | null;
  processedCount: number;
  errorCount: number;
  generatedCount: number;
}

export interface TeacherActivityInfo {
  userId: number;
  username: string;
  activityCount: number;
}

export interface AdminDashboard {
  totalTeachers: number;
  incompleteProfiles: number;
  totalPublications: number;
  pendingPublications: number;
  totalReports: number;
  pendingReports: number;
  generatedDocsThisMonth: number;
  lastRobotRunStatus: string;
  publicationsByDatabase: Record<string, number>;
  publicationsByType: Record<string, number>;
  kkkReadinessByTeacher: KkkTeacherInfo[];
  reportsByStatus: Record<string, number>;
  generatedDocsByMonth: Record<string, number>;
  lastRobotRun: RobotRunInfo | null;
  topActiveTeachers: TeacherActivityInfo[];
}

export const dashboardApi = {
  getTeacherDashboard: () =>
    apiClient.get<TeacherDashboard>('/api/dashboard/teacher').then(r => r.data),
  getAdminDashboard: () =>
    apiClient.get<AdminDashboard>('/api/dashboard/admin').then(r => r.data),
  getTodayFocus: (locale: string = 'ru') =>
    apiClient.get<TodayFocus>(`/api/dashboard/today-focus?locale=${locale}`).then(r => r.data),
};
