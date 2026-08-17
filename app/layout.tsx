import type { Metadata, Viewport } from 'next';
import BackgroundBlobs from '@/components/ui/BackgroundBlobs';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pulse Feedback',
  description: 'Coleta de feedback em tempo real para eventos, com IA.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased text-slate-900 font-sans">
        <BackgroundBlobs />
        {children}
      </body>
    </html>
  );
}
