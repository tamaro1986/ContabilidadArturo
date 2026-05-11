'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { User } from '@supabase/supabase-js';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        if (!user) {
          router.push('/login');
        }
      } catch (err) {
        console.error('Error checking auth:', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_OUT' || !session?.user) {
        router.push('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950">
        <div className="relative w-16 h-16 mb-6">
            <div className="absolute inset-0 border-2 border-emerald-500/20 rounded-full" />
            <div className="absolute inset-0 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-emerald-500/80 text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">Sincronizando Seguridad</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
