import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

export default function InvalidInvitePage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center rounded-3xl bg-white shadow-card p-8">
        <div className="h-14 w-14 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert size={24} className="text-rose-500" />
        </div>
        <h1 className="text-lg font-extrabold text-slate-900">Convite inválido ou expirado</h1>
        <p className="text-sm text-slate-500 mt-2">
          Este link de acesso não é mais válido. Peça um novo link ao organizador do evento.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 px-5 items-center justify-center rounded-2xl bg-slate-900 text-white text-sm font-semibold"
        >
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
