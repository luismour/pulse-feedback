import Link from 'next/link';
import { Sparkles, LayoutDashboard, Ticket } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white shadow-card text-xs font-semibold text-fuchsia-600 mb-6">
          <Sparkles size={13} />
          Potencializado por IA
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight bg-brand-gradient bg-clip-text text-transparent leading-tight">
          Pulse Feedback
        </h1>
        <p className="text-sm text-slate-500 mt-3 mb-3 leading-relaxed">
          Coleta de feedback em tempo real para eventos — formulários e relatórios gerados
          automaticamente por IA.
        </p>

        {/* Participante NÃO tem link genérico aqui de propósito — o acesso a cada
            evento só acontece pelo link/QR Code de convite gerado pelo admin. */}
        <p className="text-xs text-slate-400 mb-10 flex items-center justify-center gap-1.5">
          <Ticket size={13} className="text-violet-400 shrink-0" />
          Participante: acesse pelo link de convite enviado pelo organizador do seu evento.
        </p>

        <Link
          href="/admin"
          className="h-14 rounded-2xl bg-white text-slate-700 text-sm font-semibold flex items-center justify-center gap-2 shadow-card hover:shadow-card-hover active:scale-[0.98] transition-all"
        >
          <LayoutDashboard size={16} className="text-violet-500" />
          Painel do organizador (Admin)
        </Link>
      </div>
    </main>
  );
}
