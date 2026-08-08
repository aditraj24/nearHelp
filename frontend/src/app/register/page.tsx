'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import OjassEasterEgg, { useOjassEasterEgg } from '@/components/OjassEasterEgg';
import { GuestGuard } from '@/components/AuthGuard';

function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: ''
  });
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
      const response = await authAPI.register(formData);
      const { user } = response.data.data;
      setAuth(user);
      router.push('/dashboard');
    } catch (err) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(axiosError.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-white">
      <OjassEasterEgg show={showVideo} onClose={() => setShowVideo(false)} />
      {/* Left Decoration - Desktop Only */}
      <div className="hidden lg:flex w-1/2 bg-gray-900 relative overflow-hidden items-center justify-center p-12 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(220,38,38,0.2),transparent)]"></div>
        <div className="absolute inset-0 bg-grid-white/[0.05]"></div>

        <div className="relative z-10 max-w-lg">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-20 h-20 drop-shadow-xl flex-shrink-0 cursor-pointer" onClick={handleLogoClick}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="NearHelp Logo" className="w-full h-full object-contain select-none" draggable="false" />
            </div>
            <div className="h-10 w-px bg-gray-700 hidden sm:block"></div>
            <p className="text-3xl text-white h-full flex items-center" style={{ fontFamily: "'Dancing Script', cursive" }}>
              Every second counts
            </p>
          </div>
          <h1 className="text-5xl font-bold mb-6 tracking-tight">
            Become a <br />Local Hero.
          </h1>
          <p className="text-lg text-gray-400 leading-relaxed">
            Sign up to receive emergency alerts and help your neighbors.
            Every second counts, and your presence makes a difference.
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
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">Create Account</h2>
            <p className="mt-2 text-gray-500">Join the NearHelp community</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm font-medium border border-red-100">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <input
                  className="input-field"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Rahul Kumar"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                <input
                  className="input-field"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="rahul.kumar@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                <input
                  className="input-field"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <input
                  className="input-field"
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Create a strong password"
                />
              </div>
            </div>

            <button
              className="w-full btn-primary h-12 text-sm uppercase tracking-wider mt-2"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="animate-spin w-5 h-5 text-white" />
              ) : (
                <span className="flex items-center gap-2">Get Started <ArrowRight size={16} /></span>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-red-600 hover:text-red-500 transition-colors">
              Sign in instead
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <GuestGuard>
      <Register />
    </GuestGuard>
  );
}
