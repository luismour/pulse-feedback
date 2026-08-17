'use client';

import { useState } from 'react';
import { Plus, Loader2, X, Pencil, Trash2, CalendarClock } from 'lucide-react';
import type { Activity } from '@/types/database';

interface ActivityFormProps {
  eventId: string;
  /** Presente = modo edição de uma atividade já existente */
  activity?: Activity;
  onSaved: (activity: Activity) => void;
  onDeleted?: (activityId: string) => void;
  /** 'button' = card tracejado "+ Nova atividade" · 'icon' = lápis pequeno (usado para editar) */
  trigger?: 'button' | 'icon';
}

/** Converte um ISO (UTC) para o formato aceito por <input type="datetime-local"> no fuso local do navegador */
function toLocalInput(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ActivityForm({ eventId, activity, onSaved, onDeleted, trigger = 'button' }: ActivityFormProps) {
  const isEdit = !!activity;
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(activity?.title ?? '');
  const [description, setDescription] = useState(activity?.description ?? '');
  const [speakerName, setSpeakerName] = useState(activity?.speaker_name ?? '');
  const [activityType, setActivityType] = useState(activity?.activity_type ?? '');
  const [location, setLocation] = useState(activity?.location ?? '');
  const [startTime, setStartTime] = useState(toLocalInput(activity?.start_time));
  const [endTime, setEndTime] = useState(toLocalInput(activity?.end_time));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = title.trim().length > 2 && !!startTime && !!endTime;

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const payload = {
        event_id: eventId,
        title,
        description: description || null,
        speaker_name: speakerName || null,
        activity_type: activityType || null,
        location: location || null,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
      };

      const res = await fetch('/api/admin/activities', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { id: activity!.id, ...payload } : payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erro ao salvar atividade.');

      onSaved(data.activity);
      setOpen(false);
      if (!isEdit) {
        setTitle('');
        setDescription('');
        setSpeakerName('');
        setActivityType('');
        setLocation('');
        setStartTime('');
        setEndTime('');
      }
    } catch (err: any) {
      setError(err.message ?? 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!activity) return;
    const confirmed = window.confirm(
      `Excluir "${activity.title}"? Isso também apaga o formulário e as respostas associadas.`
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/activities', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activity.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erro ao excluir atividade.');

      setOpen(false);
      onDeleted?.(activity.id);
    } catch (err: any) {
      setError(err.message ?? 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {trigger === 'icon' ? (
        <button
          onClick={() => setOpen(true)}
          className="h-10 w-10 shrink-0 rounded-2xl bg-white shadow-card flex items-center justify-center text-slate-400 hover:text-fuchsia-600 hover:shadow-card-hover transition-all"
          aria-label="Editar atividade"
        >
          <Pencil size={15} />
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="w-full h-14 rounded-3xl border-2 border-dashed border-violet-200 text-sm font-bold text-violet-500 hover:border-fuchsia-300 hover:text-fuchsia-600 hover:bg-white/60 transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={16} /> Nova atividade / dinâmica
        </button>
      )}

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
                <CalendarClock size={18} />
                <h3 className="text-base font-bold">{isEdit ? 'Editar atividade' : 'Nova atividade / dinâmica'}</h3>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <div className="flex flex-col gap-3.5">
                <Field label="Título">
                  <input
                    autoFocus
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Liderança Servidora na Prática"
                    className={inputClass}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Tipo">
                    <input
                      value={activityType}
                      onChange={(e) => setActivityType(e.target.value)}
                      placeholder="Palestra, Dinâmica..."
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Local">
                    <input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Auditório Principal"
                      className={inputClass}
                    />
                  </Field>
                </div>

                <Field label="Palestrante / facilitador (opcional)">
                  <input value={speakerName} onChange={(e) => setSpeakerName(e.target.value)} className={inputClass} />
                </Field>

                <Field label="Descrição (opcional)">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className={`${inputClass} resize-none`}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Início">
                    <input
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Término">
                    <input
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>

              {error && <p className="mt-3 text-sm text-rose-500">{error}</p>}

              <div className="mt-5 flex gap-2">
                {isEdit && (
                  <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="h-12 px-4 rounded-2xl border-2 border-rose-200 text-rose-500 text-sm font-bold flex items-center gap-1.5 hover:bg-rose-50 transition-colors disabled:opacity-40"
                  >
                    <Trash2 size={14} /> Excluir
                  </button>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit || loading}
                  className="flex-1 h-12 rounded-2xl bg-brand-gradient text-white text-sm font-bold flex items-center justify-center gap-2 shadow-glow active:scale-[0.98] transition-all disabled:opacity-40 disabled:shadow-none"
                >
                  {loading && <Loader2 size={15} className="animate-spin" />}
                  {isEdit ? 'Salvar alterações' : 'Criar atividade'}
                </button>
              </div>
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
