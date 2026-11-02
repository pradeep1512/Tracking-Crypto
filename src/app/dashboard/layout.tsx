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
    <div className="flex h-screen bg-[#070709] cyber-grunge-bg overflow-hidden relative selection:bg-yellow-400 selection:text-black">
      {/* Ambient Cyber Grunge Yellow Accent Glows matching reference art */}
      <div className="absolute top-0 right-0 w-[500px] h-[350px] bg-yellow-400/5 blur-[120px] pointer-events-none -z-0" />
      <div className="absolute bottom-0 left-60 w-[400px] h-[300px] bg-amber-500/5 blur-[100px] pointer-events-none -z-0" />

      <SessionWatcher />
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
