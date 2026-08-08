'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import OjassEasterEgg, { useOjassEasterEgg } from '@/components/OjassEasterEgg';
import { GuestGuard } from '@/components/AuthGuard';

function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { handleLogoClick, showVideo, setShowVideo } = useOjassEasterEgg();
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await authAPI.login(formData);
      const { user } = response.data.data;
      setAuth(user);
      router.push('/dashboard');
    } catch (err) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(axiosError.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-white">
      <OjassEasterEgg show={showVideo} onClose={() => setShowVideo(false)} />
      {/* Left Decoration - Desktop Only */}
      <div className="hidden lg:flex w-1/2 bg-gray-50 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(220,38,38,0.08),transparent)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(59,130,246,0.08),transparent)]"></div>

        <div className="relative z-10 max-w-lg">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-20 h-20 drop-shadow-lg flex-shrink-0 cursor-pointer" onClick={handleLogoClick}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="NearHelp Logo" className="w-full h-full object-contain select-none" draggable="false" />
            </div>
            <div className="h-10 w-px bg-gray-300 hidden sm:block"></div>
            <p className="text-3xl text-red-600 h-full flex items-center" style={{ fontFamily: "'Dancing Script', cursive" }}>
              Every second counts
            </p>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-6 tracking-tight">
            Community-Powered <br /> Emergency Response.
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed">
            Join a network of local heroes ready to assist in critical moments.
            Rapid, reliable, and secure help when you need it most.
          </p>
        </div>
      </div>

      {/* Right Form Side */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-8"
        >
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">Welcome back</h2>
            <p className="mt-2 text-gray-500">Sign in to access your dashboard</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-red-50 text-red-700 p-4 rounded-xl text-sm font-medium border border-red-100 flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                {error}
              </motion.div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                <input
                  className="input-field"
                  name="email"
                  placeholder="rahul.kumar@example.com"
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <input
                  className="input-field"
                  name="password"
                  placeholder="••••••••"
                  type="password"
                  required
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            <button
              className="w-full btn-primary h-12 text-sm uppercase tracking-wider"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="animate-spin w-5 h-5 text-white" />
              ) : (
                <span className="flex items-center gap-2">Sign In <ArrowRight size={16} /></span>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-semibold text-red-600 hover:text-red-500 transition-colors">
              Create one now
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <GuestGuard>
      <Login />
    </GuestGuard>
  );
}
