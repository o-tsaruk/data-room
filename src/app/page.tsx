'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/spinner';

export default function HomePage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    } else if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  return (
    <main className='flex flex-col items-center justify-center h-screen bg-gray-50 text-center'>
      <img src='/logo.png' alt='Logo' className='w-24 h-24 mb-4' />
      <h1 className='text-3xl font-semibold text-gray-800'>Data Room</h1>
      <div className='flex items-center justify-center gap-2 mt-3 text-gray-500'>
        <p>Loading your workspace</p>
        <Spinner />
      </div>
    </main>
  );
}
