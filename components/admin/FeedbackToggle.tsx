'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { Activity, ActivityStatus } from '@/types/database';

interface FeedbackToggleProps {
  activity: Activity;
  onToggled?: (updated: Activity) => void;
}

/**
 * Botão de toggle que controla, em tempo real, se os participantes já podem
 * avaliar uma atividade. Ignora deliberadamente o horário programado: o
 * organizador tem controle manual total (ex: palestra terminou mais cedo).
 *
 * Cor mantida em verde/cinza (semântica de "ligado/desligado") mesmo na
 * paleta vibrante — sinalização de estado não deve competir com a marca.
 */
export default function FeedbackToggle({ activity, onToggled }: FeedbackToggleProps) {
  const [status, setStatus] = useState<ActivityStatus>(activity.status);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOpen = status === 'feedback_open';

  async function handleToggle() {
    setLoading(true);
    setError(null);
    const nextOpen = !isOpen;

    try {
      const res = await fetch('/api/admin/toggle-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityId: activity.id, open: nextOpen }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Não foi possível atualizar o status.');

      setStatus(data.activity.status);
      onToggled?.(data.activity);
    } catch (err: any) {
      setError(err.message ?? 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  }

  const statusLabel = isOpen
    ? 'Avaliação liberada — participantes já podem responder'
    : status === 'closed'
      ? 'Avaliação encerrada'
      : 'Avaliação bloqueada';

  return (
    <div
      className={[
        'flex items-center justify-between gap-4 rounded-3xl bg-white px-5 py-4 transition-shadow',
        isOpen ? 'shadow-card ring-1 ring-emerald-100' : 'shadow-card',
      ].join(' ')}
    >
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-900 truncate">{activity.title}</p>
        <p className={['text-xs mt-0.5 font-semibold', isOpen ? 'text-emerald-600' : 'text-slate-400'].join(' ')}>
          {statusLabel}
        </p>
        {error && <p className="text-xs mt-0.5 font-medium text-rose-500">{error}</p>}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={isOpen}
        aria-label={isOpen ? 'Encerrar avaliação' : 'Liberar avaliação'}
        disabled={loading}
        onClick={handleToggle}
        className={[
          'relative h-8 w-14 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-60',
          isOpen ? 'bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]' : 'bg-slate-200',
        ].join(' ')}
      >
        {loading ? (
          <Loader2
            size={14}
            className={[
              'absolute top-1/2 -translate-y-1/2 animate-spin transition-all duration-200',
              isOpen ? 'right-1.5 text-white' : 'left-1.5 text-slate-500',
            ].join(' ')}
          />
        ) : (
          <span
            className={[
              'absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200',
              isOpen ? 'translate-x-7' : 'translate-x-1',
            ].join(' ')}
          />
        )}
      </button>
    </div>
  );
}
