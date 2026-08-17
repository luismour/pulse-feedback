import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { CalendarDays, MapPin, ShieldAlert } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import ActivitiesGrid from '@/components/participant/ActivitiesGrid';
import { accessCookieName, verifyAccessCookieValue } from '@/lib/accessToken';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EventPage({ params }: { params: { slug: string } }) {
  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .maybeSingle();

  if (!event) notFound();

  // Controle de acesso: só entra quem tiver o cookie gravado pelo redeem de um
  // convite válido (/convite/[token]). Sem isso, ninguém enxerga a programação,
  // mesmo sabendo a URL/slug do evento.
  const cookieValue = cookies().get(accessCookieName(event.id))?.value;
  const isAuthorized = verifyAccessCookieValue(event.id, cookieValue);

  if (!isAuthorized) {
    return <RestrictedAccess />;
  }

  const { data: activities } = await supabase
    .from('activities')
    .select('*')
    .eq('event_id', event.id)
    .order('order_index', { ascending: true });

  return (
    <main className="min-h-screen pb-16">
      <header className="px-6 pt-10 pb-8">
        <div className="max-w-lg mx-auto">
          <span className="inline-block text-xs font-bold uppercase tracking-wide text-white bg-brand-gradient px-3 py-1 rounded-full shadow-glow mb-3">
            {formatDateRange(event.start_date, event.end_date)}
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 leading-snug">{event.name}</h1>
          {event.location && (
            <p className="text-sm text-slate-500 mt-1.5 flex items-center gap-1.5">
              <MapPin size={14} className="text-fuchsia-500" />
              {event.location}
            </p>
          )}
        </div>
      </header>

      <div className="px-6 max-w-lg mx-auto">
        {activities && activities.length > 0 ? (
          <ActivitiesGrid eventId={event.id} activities={activities} />
        ) : (
          <div className="rounded-3xl bg-white shadow-card p-10 text-center">
            <CalendarDays size={28} className="mx-auto text-violet-300 mb-3" />
            <p className="text-sm text-slate-400">A programação ainda não foi publicada.</p>
          </div>
        )}
      </div>
    </main>
  );
}

function RestrictedAccess() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center rounded-3xl bg-white shadow-card p-8">
        <div className="h-14 w-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert size={24} className="text-amber-500" />
        </div>
        <h1 className="text-lg font-extrabold text-slate-900">Acesso restrito</h1>
        <p className="text-sm text-slate-500 mt-2">
          Você precisa de um link de convite do organizador para acessar a programação deste evento.
        </p>
      </div>
    </main>
  );
}

function formatDateRange(start: string, end: string) {
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
  const s = new Date(start).toLocaleDateString('pt-BR', opts);
  const e = new Date(end).toLocaleDateString('pt-BR', opts);
  return s === e ? s : `${s} – ${e}`;
}
