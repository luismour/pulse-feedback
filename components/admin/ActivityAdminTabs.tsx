'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import AIQuestionEditor from '@/components/admin/AIQuestionEditor';
import AIInsightsPanel from '@/components/admin/AIInsightsPanel';
import type { Activity } from '@/types/database';

interface ActivityAdminTabsProps {
  eventId: string;
  activity: Activity;
}

export default function ActivityAdminTabs({ eventId, activity }: ActivityAdminTabsProps) {
  const [tab, setTab] = useState<'form' | 'insights'>('form');

  return (
    <main className="min-h-screen pb-16">
      <header className="px-6 pt-8 pb-4 max-w-2xl mx-auto">
        <Link
          href={`/admin/eventos/${eventId}`}
          className="inline-flex items-center gap-1 text-sm font-semibold text-slate-400 hover:text-fuchsia-600 mb-4 transition-colors"
        >
          <ChevronLeft size={16} /> Voltar
        </Link>
        <h1 className="text-xl font-extrabold text-slate-900">{activity.title}</h1>

        <div className="mt-5 inline-flex rounded-2xl bg-white shadow-card p-1.5">
          <button onClick={() => setTab('form')} className={tabClass(tab === 'form')}>
            Perguntas
          </button>
          <button onClick={() => setTab('insights')} className={tabClass(tab === 'insights')}>
            Insights
          </button>
        </div>
      </header>

      <div className="px-6">
        {tab === 'form' ? (
          <AIQuestionEditor
            activityId={activity.id}
            activityTitle={activity.title}
            activityType={activity.activity_type ?? undefined}
            speakerName={activity.speaker_name ?? undefined}
          />
        ) : (
          <AIInsightsPanel activityId={activity.id} activityTitle={activity.title} />
        )}
      </div>
    </main>
  );
}

function tabClass(active: boolean) {
  return [
    'px-4 py-2 rounded-xl text-sm font-bold transition-all',
    active ? 'bg-brand-gradient text-white shadow-glow' : 'text-slate-500 hover:text-slate-700',
  ].join(' ');
}
