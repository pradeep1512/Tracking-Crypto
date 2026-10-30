import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { SessionWatcher } from '@/components/auth/SessionWatcher';

export const metadata: Metadata = {
  title: 'Dashboard | TrackingCrypt',
  description: 'TrackingCrypt multi-asset real-time trading dashboard',
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Defense-in-depth: Strict server-side session verification directly in layout
  const session = await auth();

  if (!session?.user) {
    redirect('/signin?authRequired=true&callbackUrl=%2Fdashboard');
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <SessionWatcher />
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
