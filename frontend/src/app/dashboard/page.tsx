import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dashboard } from './Dashboard';

const DashboardLoading = () => (
  <div className='flex flex-col space-y-4 px-6 py-10'>
    <div className='flex justify-between'>
      <Skeleton className='h-8 w-64' />
      <Skeleton className='h-8 w-24' />
    </div>
    <Skeleton className='h-4 w-full' />
    <Skeleton className='h-96 w-full' />
  </div>
);

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <Dashboard />
    </Suspense>
  );
}
