import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import SOSBroadcast from './pages/SOSBroadcast';
import AdminDashboard from './pages/AdminDashboard';
import History from './pages/History';

function App() {
  const { user } = useAuthStore();

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" />} />
      <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
      <Route path="/sos/:sosId" element={user ? <SOSBroadcast /> : <Navigate to="/login" />} />
      <Route path="/history" element={user ? <History /> : <Navigate to="/login" />} />
      <Route path="/admin" element={user?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/dashboard" />} />
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

export default App;
