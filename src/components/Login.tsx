import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Loader2 } from 'lucide-react';
import { signInWithGoogle, signInGuest } from '../firebase';

export default function Login() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Google login error:', err);
      const code = err?.code || '';
      if (code === 'auth/popup-blocked') {
        setError('Popup was blocked. Please allow popups for this app.');
      } else if (code === 'auth/popup-closed-by-user') {
        setError('Login cancelled.');
      } else if (code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized in Firebase. Trying guest login...');
        // Auto-fallback to guest
        try {
          await signInGuest();
        } catch (guestErr: any) {
          setError('Both Google and Guest login failed: ' + (guestErr?.message || String(guestErr)));
        }
      } else {
        setError(err?.message || 'Google sign-in failed. Try "Continue as Guest".');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInGuest();
    } catch (err: any) {
      console.error('Guest login error:', err);
      const code = err?.code || '';
      if (code === 'auth/admin-restricted-operation') {
        setError('Anonymous sign-in is not enabled in Firebase. Please enable it in Firebase Console > Authentication > Sign-in method > Anonymous.');
      } else {
        setError(err?.message || 'Guest sign-in failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark/80 backdrop-blur-md flex flex-col items-center justify-center p-4 text-zinc-100">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-brand-mid/60 border border-brand-light/20 backdrop-blur-md rounded-3xl p-8 shadow-2xl text-center"
      >
        <div className="w-16 h-16 bg-gradient-to-br from-brand-light to-brand-mid shadow-lg shadow-brand-light/20 text-teal-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <MapPin size={32} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Convoy</h1>
        <p className="text-zinc-400 mb-8">
          Live location sharing, route planning, and chat for your multi-vehicle road trips.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-red-300 text-sm text-left">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-gradient-to-r from-brand-light to-brand-mid hover:from-[#09836a] hover:to-brand-light text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 mb-3 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          )}
          Continue with Google
        </button>
        <button
          onClick={handleGuestLogin}
          disabled={loading}
          className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 size={20} className="animate-spin" /> : null}
          Continue as Guest
        </button>
      </motion.div>
    </div>
  );
}
