import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
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
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  // Guardian Mode
  getGuardians: () => api.get('/auth/guardians'),
  addGuardian: (email) => api.post('/auth/guardians', { email }),
  removeGuardian: (guardianId) => api.delete(`/auth/guardians/${guardianId}`),
  getWards: () => api.get('/auth/wards')
};

export const sosAPI = {
  create: (data) => api.post('/sos', data),
  getActive: () => api.get('/sos/active'),
  getPending: () => api.get('/sos/pending'),
  getHistory: () => api.get('/sos/history'),
  getById: (sosId) => api.get(`/sos/${sosId}`),
  resolve: (sosId) => api.put(`/sos/${sosId}/resolve`),
  rate: (sosId, responderId, data) => api.post(`/sos/${sosId}/rate/${responderId}`, data),
  flag: (sosId) => api.post(`/sos/${sosId}/flag`),
  // Welfare Check
  getWelfareChecks: () => api.get('/sos/welfare-checks'),
  respondToWelfareCheck: (sosId, response) => api.post(`/sos/${sosId}/welfare-check`, { response })
};

export const resourceAPI = {
  add: (data) => api.post('/resources', data),
  getNearby: (longitude, latitude, radius) => 
    api.get('/resources/nearby', { params: { longitude, latitude, radius } }),
  getAll: () => api.get('/resources'),
  seed: (longitude, latitude) => api.post('/resources/seed', { longitude, latitude })
};

export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getAllSOS: (params) => api.get('/admin/sos', { params }),
  getLocalityAnalytics: () => api.get('/admin/locality-analytics'),
  getUsers: () => api.get('/admin/users'),
  suspendUser: (userId) => api.put(`/admin/users/${userId}/suspend`),
  unsuspendUser: (userId) => api.put(`/admin/users/${userId}/unsuspend`)
};

export const chatbotAPI = {
  chat: (data) => api.post('/ai/chat', data)
};

export default api;
