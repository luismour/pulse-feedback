'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, CalendarDays, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import EventForm from '@/components/admin/EventForm';
import type { EventRecord } from '@/types/database';

const CARD_GRADIENTS = [
  'from-violet-500 to-fuchsia-500',
  'from-orange-400 to-rose-500',
  'from-sky-500 to-indigo-500',
  'from-emerald-400 to-teal-500',
];

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventRecord[] | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    const { data } = await supabase.from('events').select('*').order('start_date', { ascending: false });
    setEvents(data ?? []);
  }

  return (
    <main className="min-h-screen pb-16">
      <header className="px-6 pt-10 pb-6 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white shadow-card text-xs font-bold text-fuchsia-600 mb-3">
          <Sparkles size={12} />
          Painel do organizador
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">Seus eventos</h1>
        <p className="text-sm text-slate-500 mt-1">
          Escolha um evento para gerenciar atividades e avaliações, ou crie um novo.
        </p>
      </header>

      <div className="max-w-2xl mx-auto px-6 flex flex-col gap-3">
        {events === null && <p className="text-sm text-slate-400 text-center py-10">Carregando...</p>}

        {events?.map((event, i) => (
          <Link
            key={event.id}
            href={`/admin/eventos/${event.id}`}
            className="flex items-center justify-between gap-4 rounded-3xl bg-white shadow-card px-5 py-4 hover:shadow-card-hover hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <span
                className={[
                  'h-11 w-11 rounded-2xl bg-gradient-to-br flex items-center justify-center shrink-0 text-white shadow-sm',
                  CARD_GRADIENTS[i % CARD_GRADIENTS.length],
                ].join(' ')}
              >
                <CalendarDays size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{event.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {formatDateRange(event.start_date, event.end_date)}
                  {event.location ? ` · ${event.location}` : ''}
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-300 shrink-0" />
          </Link>
        ))}

        {events?.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-10">Nenhum evento cadastrado ainda.</p>
        )}

        <EventForm onCreated={(event) => setEvents((prev) => [event, ...(prev ?? [])])} />
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
