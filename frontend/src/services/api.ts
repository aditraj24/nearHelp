import axios, { type AxiosResponse } from 'axios';
import { useAuthStore } from '@/store/authStore';
import type {
  AdminStats,
  ApiEnvelope,
  CrisisGuidance,
  CrisisType,
  LocalityStat,
  Resource,
  ResourceType,
  SOS,
  User,
  UserSkill,
  WelfareCheck,
  WelfareResponse
} from '@/types';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api` : '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      if (typeof window !== 'undefined') {
        // A hard navigation (not router.push) is deliberate: the session is gone,
        // so we want every in-memory store, socket and timer torn down with the
        // document. This also runs outside React, where hooks are unavailable.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

type Res<T> = Promise<AxiosResponse<ApiEnvelope<T>>>;

export interface AuthPayload {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ProfileUpdateInput {
  name?: string;
  phone?: string;
  skills?: UserSkill[];
  isVulnerable?: boolean;
}

export const authAPI = {
  register: (data: RegisterInput): Res<AuthPayload> => api.post('/auth/register', data),
  login: (data: LoginInput): Res<AuthPayload> => api.post('/auth/login', data),
  logout: (): Res<Record<string, never>> => api.post('/auth/logout'),
  getProfile: (): Res<{ user: User }> => api.get('/auth/profile'),
  updateProfile: (data: ProfileUpdateInput): Res<{ user: User }> => api.put('/auth/profile', data),
  // Guardian Mode
  getGuardians: (): Res<{ guardians: User[]; isVulnerable: boolean }> => api.get('/auth/guardians'),
  addGuardian: (email: string): Res<{ user: User }> => api.post('/auth/guardians', { email }),
  removeGuardian: (guardianId: string): Res<{ user: User }> => api.delete(`/auth/guardians/${guardianId}`),
  getWards: (): Res<{ wards: User[] }> => api.get('/auth/wards')
};

export interface CreateSOSInput {
  crisisType: CrisisType;
  longitude: number;
  latitude: number;
  address?: string;
  broadcastRadius?: number;
  isAnonymous?: boolean;
}

export const sosAPI = {
  create: (data: CreateSOSInput): Res<{ sos: SOS; guidance: CrisisGuidance; nearbyResources: Resource[] }> =>
    api.post('/sos', data),
  getActive: (): Res<{ activeSOS: SOS[] }> => api.get('/sos/active'),
  getPending: (): Res<{ pendingSOS: SOS[] }> => api.get('/sos/pending'),
  getHistory: (): Res<{ broadcasted: SOS[]; responded: SOS[] }> => api.get('/sos/history'),
  getById: (sosId: string): Res<{
    sos: SOS;
    guidance?: CrisisGuidance;
    emergencySummary?: string;
    nearbyResources: Resource[];
  }> => api.get(`/sos/${sosId}`),
  resolve: (sosId: string): Res<{ sos: SOS; debrief: string }> => api.put(`/sos/${sosId}/resolve`),
  rate: (sosId: string, responderId: string, data: { rating: number; feedback?: string }): Res<null> =>
    api.post(`/sos/${sosId}/rate/${responderId}`, data),
  flag: (sosId: string): Res<null> => api.post(`/sos/${sosId}/flag`),
  // Welfare Check
  getWelfareChecks: (): Res<{ welfareChecks: WelfareCheck[] }> => api.get('/sos/welfare-checks'),
  respondToWelfareCheck: (sosId: string, response: WelfareResponse): Res<{ sos: SOS }> =>
    api.post(`/sos/${sosId}/welfare-check`, { response })
};

export interface AddResourceInput {
  name: string;
  type: ResourceType;
  longitude: number;
  latitude: number;
  address?: string;
  description?: string;
}

export const resourceAPI = {
  add: (data: AddResourceInput): Res<{ resource: Resource }> => api.post('/resources', data),
  getNearby: (longitude: number, latitude: number, radius?: number): Res<{ resources: Resource[] }> =>
    api.get('/resources/nearby', { params: { longitude, latitude, radius } }),
  getAll: (): Res<{ resources: Resource[] }> => api.get('/resources'),
  seed: (longitude: number, latitude: number): Res<{ count: number }> =>
    api.post('/resources/seed', { longitude, latitude })
};

export interface AdminSOSQuery {
  status?: string;
  page?: number;
  limit?: number;
}

export const adminAPI = {
  getStats: (): Res<AdminStats> => api.get('/admin/stats'),
  getAllSOS: (params?: AdminSOSQuery): Res<{ sosList: SOS[]; totalPages: number; currentPage: number }> =>
    api.get('/admin/sos', { params }),
  getLocalityAnalytics: (): Res<{ localityStats: LocalityStat[] }> => api.get('/admin/locality-analytics'),
  getUsers: (): Res<{ users: User[] }> => api.get('/admin/users'),
  suspendUser: (userId: string): Res<{ user: User }> => api.put(`/admin/users/${userId}/suspend`),
  unsuspendUser: (userId: string): Res<{ user: User }> => api.put(`/admin/users/${userId}/unsuspend`)
};

export interface ChatInput {
  crisisType: string;
  question: string;
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[];
}

export const chatbotAPI = {
  chat: (data: ChatInput): Res<{ answer: string }> => api.post('/ai/chat', data)
};

export default api;
