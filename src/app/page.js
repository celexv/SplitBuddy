'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function HomePage() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (currentUser) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [currentUser, loading, router]);

  return (
    <div className="loading-screen">
      <div className="loading-spinner-lg" />
      <span>Loading SplitBuddy…</span>
    </div>
  );
}
