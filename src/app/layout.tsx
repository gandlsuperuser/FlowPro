import type { Metadata } from 'next';
import './globals.css';
import { AbortErrorSuppressor } from '../components/AbortErrorSuppressor';

export const metadata: Metadata = {
  title: 'HydroElevation AI - Elevation Analysis & Water Pump Optimization',
  description:
    'AI-Powered Elevation Analysis & Water Pump Optimization Platform for engineers, water utilities, and irrigation design.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full">
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100 antialiased selection:bg-cyan-500 selection:text-white">
        <AbortErrorSuppressor />
        {children}
      </body>
    </html>
  );
}
