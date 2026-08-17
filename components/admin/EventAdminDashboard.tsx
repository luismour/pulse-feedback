'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import FeedbackToggle from '@/components/admin/FeedbackToggle';
import ActivityForm from '@/components/admin/ActivityForm';
import EventInvites from '@/components/admin/EventInvites';
import type { Activity, EventRecord } from '@/types/database';

interface EventAdminDashboardProps {
  event: EventRecord;
  initialActivities: Activity[];
}

export default function EventAdminDashboard({ event, initialActivities }: EventAdminDashboardProps) {
  const [activities, setActivities] = useState<Activity[]>(initialActivities);

  return (
    <main className="min-h-screen pb-16">
      <header className="px-6 pt-8 pb-6 max-w-2xl mx-auto">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm font-semibold text-slate-400 hover:text-fuchsia-600 mb-4 transition-colors"
        >
          <ChevronLeft size={16} /> Todos os eventos
        </Link>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white shadow-card text-xs font-bold text-fuchsia-600 mb-3">
          <Sparkles size={12} />
          Painel do organizador
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">{event.name}</h1>
        <p className="text-sm text-slate-500 mt-1">Libere a avaliação de cada atividade assim que ela terminar.</p>
      </header>

      <div className="max-w-2xl mx-auto px-6 flex flex-col gap-6">
        <EventInvites eventId={event.id} />

        <div className="flex flex-col gap-3">
          {activities.map((activity) => (
            <div key={activity.id} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <FeedbackToggle
                    activity={activity}
                    onToggled={(updated) =>
                      setActivities((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
                    }
                  />
                </div>
                <ActivityForm
                  eventId={event.id}
                  activity={activity}
                  trigger="icon"
                  onSaved={(updated) => setActivities((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))}
                  onDeleted={(id) => setActivities((prev) => prev.filter((a) => a.id !== id))}
                />
              </div>
              <Link
                href={`/admin/eventos/${event.id}/atividades/${activity.id}`}
                className="self-end mr-1 flex items-center gap-0.5 text-xs font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
              >
                Perguntas & insights
                <ChevronRight size={13} className="text-fuchsia-500" />
              </Link>
            </div>
          ))}

          {activities.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-10">Nenhuma atividade cadastrada ainda.</p>
          )}

          <ActivityForm eventId={event.id} onSaved={(created) => setActivities((prev) => [...prev, created])} />
        </div>
      </div>
    </main>
  );
}
