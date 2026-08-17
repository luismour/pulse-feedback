'use client';

import { Lock, CheckCircle2, Clock3, ArrowRight } from 'lucide-react';
import type { Activity } from '@/types/database';

interface ActivityCardProps {
  activity: Activity;
  hasSubmitted?: boolean;
  onOpen: (activity: Activity) => void;
}

const TIME_FORMAT: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };

// Paleta de gradientes por tipo de atividade — determinística (mesmo tipo = mesma cor sempre)
const TYPE_GRADIENTS = [
  'from-violet-500 to-fuchsia-500',
  'from-orange-400 to-rose-500',
  'from-sky-500 to-indigo-500',
  'from-emerald-400 to-teal-500',
  'from-fuchsia-500 to-pink-500',
];

function gradientFor(label: string) {
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  return TYPE_GRADIENTS[hash % TYPE_GRADIENTS.length];
}

export default function ActivityCard({ activity, hasSubmitted, onOpen }: ActivityCardProps) {
  const isOpen = activity.status === 'feedback_open' && !hasSubmitted;
  const isDone = hasSubmitted || activity.status === 'closed';
  const isLocked = activity.status === 'scheduled' || activity.status === 'ongoing';

  const startLabel = new Date(activity.start_time).toLocaleTimeString('pt-BR', TIME_FORMAT);
  const endLabel = new Date(activity.end_time).toLocaleTimeString('pt-BR', TIME_FORMAT);
  const typeLabel = activity.activity_type ?? 'Atividade';
  const gradient = gradientFor(typeLabel);

  return (
    <button
      type="button"
      disabled={!isOpen}
      onClick={() => isOpen && onOpen(activity)}
      className={[
        'w-full text-left rounded-3xl p-5 transition-all duration-200 active:scale-[0.98]',
        isOpen
          ? 'bg-white shadow-card hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer ring-1 ring-violet-100'
          : 'bg-white/60 shadow-none cursor-not-allowed',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span
            className={[
              'inline-block text-[11px] font-bold tracking-wide uppercase px-2.5 py-1 rounded-full text-white mb-2 bg-gradient-to-r',
              isLocked ? 'from-slate-300 to-slate-300' : gradient,
            ].join(' ')}
          >
            {typeLabel}
          </span>
          <h3
            className={[
              'text-base font-bold leading-snug truncate',
              isLocked ? 'text-slate-400' : 'text-slate-900',
            ].join(' ')}
          >
            {activity.title}
          </h3>
          {activity.speaker_name && (
            <p className={['text-sm mt-0.5', isLocked ? 'text-slate-300' : 'text-slate-500'].join(' ')}>
              {activity.speaker_name}
            </p>
          )}
        </div>

        <StatusBadge isOpen={isOpen} isDone={isDone} isLocked={isLocked} />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className={['flex items-center gap-1.5 text-xs font-medium', isLocked ? 'text-slate-300' : 'text-slate-400'].join(' ')}>
          <Clock3 size={14} strokeWidth={2} />
          <span>
            {startLabel} – {endLabel}
          </span>
        </div>

        {isOpen && (
          <span className="flex items-center gap-1 text-sm font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
            Avaliar agora
            <ArrowRight size={15} strokeWidth={2.5} className="text-fuchsia-500" />
          </span>
        )}
      </div>
    </button>
  );
}

function StatusBadge({ isOpen, isDone, isLocked }: { isOpen: boolean; isDone: boolean; isLocked: boolean }) {
  if (isOpen) {
    return (
      <span className="relative flex h-3 w-3 mt-1.5 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
      </span>
    );
  }
  if (isDone) {
    return (
      <span className="h-6 w-6 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
        <CheckCircle2 size={15} className="text-emerald-500" strokeWidth={2.5} />
      </span>
    );
  }
  if (isLocked) {
    return (
      <span className="h-6 w-6 rounded-full bg-slate-50 flex items-center justify-center shrink-0 mt-0.5">
        <Lock size={12} className="text-slate-300" strokeWidth={2.5} />
      </span>
    );
  }
  return null;
}
