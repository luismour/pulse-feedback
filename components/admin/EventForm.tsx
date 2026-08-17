'use client';

import { useState } from 'react';
import { Plus, Loader2, X, CalendarDays } from 'lucide-react';
import type { EventRecord } from '@/types/database';

interface EventFormProps {
  onCreated: (event: EventRecord) => void;
}

export default function EventForm({ onCreated }: EventFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim().length > 2 && !!startDate && !!endDate;

  function reset() {
    setName('');
    setDescription('');
    setLocation('');
    setStartDate('');
    setEndDate('');
    setError(null);
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, location, start_date: startDate, end_date: endDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erro ao criar evento.');

      onCreated(data.event);
      setOpen(false);
      reset();
    } catch (err: any) {
      setError(err.message ?? 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full h-14 rounded-3xl border-2 border-dashed border-violet-200 text-sm font-bold text-violet-500 hover:border-fuchsia-300 hover:text-fuchsia-600 hover:bg-white/60 transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={16} /> Criar novo evento
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-brand-gradient rounded-t-3xl px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <CalendarDays size={18} />
                <h3 className="text-base font-bold">Novo evento</h3>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <div className="flex flex-col gap-3.5">
                <Field label="Nome do evento">
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Encontro Regional de Jovens Líderes"
                    className={inputClass}
                  />
                </Field>
                <Field label="Descrição (opcional)">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className={`${inputClass} resize-none`}
                  />
                </Field>
                <Field label="Local (opcional)">
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ex: Recife, PE"
                    className={inputClass}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Início">
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Término">
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
                  </Field>
                </div>
              </div>

              {error && <p className="mt-3 text-sm text-rose-500">{error}</p>}

              <button
                onClick={handleSubmit}
                disabled={!canSubmit || loading}
                className="mt-5 w-full h-12 rounded-2xl bg-brand-gradient text-white text-sm font-bold flex items-center justify-center gap-2 shadow-glow active:scale-[0.98] transition-all disabled:opacity-40 disabled:shadow-none"
              >
                {loading && <Loader2 size={15} className="animate-spin" />}
                Criar evento
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const inputClass =
  'w-full text-sm px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-fuchsia-400 outline-none transition-colors placeholder:text-slate-300';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      {children}
    </label>
  );
}
