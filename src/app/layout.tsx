import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'TrackingCrypt — Real-Time Crypto Price Optimization',
    template: '%s | TrackingCrypt',
  },
  description:
    'TrackingCrypt monitors cryptocurrency price gaps, reduces execution latency, and helps traders make informed decisions with real-time bid/ask analysis.',
  keywords: ['cryptocurrency', 'bitcoin', 'price tracking', 'order execution', 'crypto trading'],
  authors: [{ name: 'TrackingCrypt' }],
  robots: 'noindex,nofollow', // Private fintech tool
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-background antialiased">{children}</body>
    </html>
  );
}
