'use client';

import { useEffect, useState } from 'react';
import {
  Sparkles,
  Trash2,
  Plus,
  GripVertical,
  Star,
  ListChecks,
  CheckSquare,
  MessageSquare,
  AlignLeft,
  Gauge,
  Loader2,
} from 'lucide-react';
import type { EditableQuestion, QuestionType } from '@/types/database';

interface AIQuestionEditorProps {
  activityId: string;
  activityTitle: string;
  activityType?: string;
  speakerName?: string;
  onPublished?: () => void;
}

const TYPE_META: Record<QuestionType, { label: string; icon: React.ElementType }> = {
  rating_scale: { label: 'Nota (estrelas)', icon: Star },
  nps: { label: 'Escala 0–10', icon: Gauge },
  single_choice: { label: 'Escolha única', icon: ListChecks },
  multiple_choice: { label: 'Múltipla escolha', icon: CheckSquare },
  short_text: { label: 'Resposta curta', icon: MessageSquare },
  long_text: { label: 'Resposta longa', icon: AlignLeft },
};

function newId() {
  return crypto.randomUUID();
}

export default function AIQuestionEditor({
  activityId,
  activityTitle,
  activityType,
  speakerName,
  onPublished,
}: AIQuestionEditorProps) {
  const [theme, setTheme] = useState('');
  const [questions, setQuestions] = useState<EditableQuestion[]>([]);
  const [phase, setPhase] = useState<'loading' | 'idle' | 'editing' | 'publishing' | 'published'>('loading');
  const [generatingMore, setGeneratingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasExistingForm, setHasExistingForm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadExisting() {
      try {
        const res = await fetch(`/api/admin/publish-form?activityId=${activityId}`);
        const data = await res.json();
        if (cancelled) return;

        if (data.form && data.questions?.length > 0) {
          setTheme(data.form.ai_source_theme ?? '');
          setQuestions(
            data.questions.map((q: any) => ({
              ...q,
              client_id: q.id ?? newId(),
            }))
          );
          setHasExistingForm(true);
          setPhase('editing');
        } else {
          setPhase('idle');
        }
      } catch {
        if (!cancelled) setPhase('idle');
      }
    }
    loadExisting();
    return () => {
      cancelled = true;
    };
  }, [activityId]);

  async function handleGenerate() {
    if (theme.trim().length < 3) return;
    setPhase('loading');
    setError(null);
    try {
      const res = await fetch('/api/ai/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityTitle, theme, activityType, speakerName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Falha ao gerar perguntas.');

      setQuestions(
        data.suggestions.map((s: any) => ({
          ...s,
          client_id: newId(),
          ai_generated: true,
          ai_edited: false,
        }))
      );
      setPhase('editing');
    } catch (err: any) {
      setError(err.message ?? 'Erro inesperado.');
      setPhase('idle');
    }
  }

  async function handleGenerateMore() {
    if (theme.trim().length < 3) return;
    setGeneratingMore(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityTitle, theme, activityType, speakerName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Falha ao gerar perguntas.');

      const additions: EditableQuestion[] = data.suggestions.map((s: any) => ({
        ...s,
        client_id: newId(),
        ai_generated: true,
        ai_edited: false,
      }));
      setQuestions((prev) => [...prev, ...additions]);
    } catch (err: any) {
      setError(err.message ?? 'Erro inesperado.');
    } finally {
      setGeneratingMore(false);
    }
  }

  function updateQuestion(clientId: string, patch: Partial<EditableQuestion>) {
    setQuestions((prev) =>
      prev.map((q) => (q.client_id === clientId ? { ...q, ...patch, ai_edited: true } : q))
    );
  }

  function updateOption(clientId: string, index: number, value: string) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.client_id !== clientId) return q;
        const options = [...(q.options ?? [])];
        options[index] = value;
        return { ...q, options, ai_edited: true };
      })
    );
  }

  function addOption(clientId: string) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.client_id === clientId ? { ...q, options: [...(q.options ?? []), 'Nova opção'] } : q
      )
    );
  }

  function removeOption(clientId: string, index: number) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.client_id === clientId
          ? { ...q, options: (q.options ?? []).filter((_, i) => i !== index) }
          : q
      )
    );
  }

  function removeQuestion(clientId: string) {
    setQuestions((prev) => prev.filter((q) => q.client_id !== clientId));
  }

  function addManualQuestion() {
    setQuestions((prev) => [
      ...prev,
      {
        client_id: newId(),
        question_text: '',
        question_type: 'short_text',
        is_required: true,
        ai_generated: false,
        ai_edited: false,
      },
    ]);
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    setQuestions((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function handleStartOver() {
    const confirmed = questions.length === 0 || window.confirm('Descartar as perguntas atuais e recomeçar do zero?');
    if (!confirmed) return;
    setQuestions([]);
    setTheme('');
    setHasExistingForm(false);
    setPhase('idle');
  }

  async function handlePublish() {
    setPhase('publishing');
    setError(null);
    try {
      const res = await fetch('/api/admin/publish-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityId, theme, questions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erro ao publicar formulário.');

      setHasExistingForm(true);
      setPhase('published');
      onPublished?.();
    } catch (err: any) {
      setError(err.message ?? 'Erro ao publicar formulário.');
      setPhase('editing');
    }
  }

  if (phase === 'loading') {
    return (
      <div className="flex items-center justify-center py-20 text-violet-300">
        <Loader2 className="animate-spin" size={22} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {phase === 'idle' && (
        <div className="rounded-3xl bg-white shadow-card p-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="h-8 w-8 rounded-xl bg-brand-gradient flex items-center justify-center shrink-0">
              <Sparkles size={15} className="text-white" />
            </span>
            <span className="text-sm font-bold text-slate-900">Gerador de formulário com IA</span>
          </div>
          <p className="text-sm text-slate-500 mb-4 mt-2">
            Descreva o tema da atividade <strong className="text-slate-700">{activityTitle}</strong> e a IA vai
            sugerir perguntas prontas para editar.
          </p>
          <textarea
            rows={3}
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder='Ex: "Palestra sobre liderança servidora, com foco em exemplos práticos de gestão de equipes jovens"'
            className="w-full text-sm p-4 rounded-2xl border-2 border-slate-200 focus:border-fuchsia-400 outline-none resize-none transition-colors placeholder:text-slate-400"
          />
          {error && <p className="mt-2 text-sm text-rose-500">{error}</p>}
          <button
            onClick={handleGenerate}
            disabled={theme.trim().length < 3}
            className={[
              'mt-4 w-full h-12 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all',
              theme.trim().length >= 3
                ? 'bg-brand-gradient text-white shadow-glow active:scale-[0.99]'
                : 'bg-slate-100 text-slate-300 cursor-not-allowed',
            ].join(' ')}
          >
            <Sparkles size={16} /> Gerar perguntas com IA
          </button>
          <button
            onClick={addManualQuestion}
            className="mt-3 w-full h-11 rounded-2xl border-2 border-dashed border-violet-200 text-sm font-semibold text-violet-500 hover:border-fuchsia-300 hover:text-fuchsia-600 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Ou montar o formulário manualmente
          </button>
        </div>
      )}

      {(phase === 'editing' || phase === 'publishing' || phase === 'published') && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                {hasExistingForm ? 'Edite o formulário publicado' : 'Revise as perguntas'}
              </h3>
              <p className="text-sm text-slate-500">
                {hasExistingForm
                  ? 'Altere, remova ou adicione perguntas — salve para atualizar o que os participantes veem.'
                  : 'Edite, remova ou adicione antes de publicar.'}
              </p>
            </div>
            <span className="text-xs font-bold text-white bg-gradient-to-r from-violet-500 to-fuchsia-500 px-2.5 py-1 rounded-full shrink-0 ml-3">
              {questions.length}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {questions.map((q, index) => (
              <QuestionEditorCard
                key={q.client_id}
                question={q}
                index={index}
                total={questions.length}
                onChange={(patch) => updateQuestion(q.client_id, patch)}
                onOptionChange={(i, v) => updateOption(q.client_id, i, v)}
                onAddOption={() => addOption(q.client_id)}
                onRemoveOption={(i) => removeOption(q.client_id, i)}
                onRemove={() => removeQuestion(q.client_id)}
                onMove={(dir) => moveQuestion(index, dir)}
              />
            ))}
          </div>

          {questions.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">Nenhuma pergunta ainda — adicione uma abaixo.</p>
          )}

          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <button
              onClick={addManualQuestion}
              className="flex-1 h-12 rounded-2xl border-2 border-dashed border-slate-200 text-sm font-semibold text-slate-500 hover:border-violet-300 hover:text-violet-600 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={16} /> Adicionar manualmente
            </button>
            <button
              onClick={handleGenerateMore}
              disabled={generatingMore || theme.trim().length < 3}
              className="flex-1 h-12 rounded-2xl border-2 border-dashed border-fuchsia-200 text-sm font-semibold text-fuchsia-500 hover:border-fuchsia-400 hover:text-fuchsia-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-40"
              title={theme.trim().length < 3 ? 'Preencha o tema para pedir mais sugestões' : undefined}
            >
              {generatingMore ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              Sugerir mais com IA
            </button>
          </div>

          {error && <p className="mt-3 text-sm text-rose-500">{error}</p>}

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleStartOver}
              className="h-12 px-5 rounded-2xl bg-white shadow-card text-sm font-bold text-slate-600 hover:shadow-card-hover transition-all"
            >
              Recomeçar do zero
            </button>
            <button
              onClick={handlePublish}
              disabled={questions.length === 0 || phase === 'publishing'}
              className="flex-1 h-12 rounded-2xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 active:scale-[0.99] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {phase === 'publishing' && <Loader2 size={16} className="animate-spin" />}
              {phase === 'published' ? 'Alterações salvas ✓' : hasExistingForm ? 'Salvar alterações' : 'Publicar formulário'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionEditorCard({
  question,
  index,
  total,
  onChange,
  onOptionChange,
  onAddOption,
  onRemoveOption,
  onRemove,
  onMove,
}: {
  question: EditableQuestion;
  index: number;
  total: number;
  onChange: (patch: Partial<EditableQuestion>) => void;
  onOptionChange: (index: number, value: string) => void;
  onAddOption: () => void;
  onRemoveOption: (index: number) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const needsOptions = question.question_type === 'single_choice' || question.question_type === 'multiple_choice';
  const Icon = TYPE_META[question.question_type].icon;

  return (
    <div className="rounded-3xl bg-white shadow-card p-4">
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center pt-1 shrink-0">
          <button
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className="text-slate-300 hover:text-violet-500 disabled:opacity-0 transition-colors"
            aria-label="Mover para cima"
          >
            <GripVertical size={16} />
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {question.ai_generated && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-gradient-to-r from-violet-500 to-fuchsia-500 px-2 py-0.5 rounded-full">
                <Sparkles size={11} /> IA
              </span>
            )}
            <select
              value={question.question_type}
              onChange={(e) => onChange({ question_type: e.target.value as QuestionType })}
              className="ml-auto text-xs font-semibold text-slate-500 border-2 border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-fuchsia-400"
            >
              {Object.entries(TYPE_META).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </select>
          </div>

          <textarea
            value={question.question_text}
            onChange={(e) => onChange({ question_text: e.target.value })}
            placeholder="Digite o texto da pergunta"
            rows={1}
            className="w-full text-sm font-bold text-slate-800 outline-none resize-none placeholder:text-slate-300 placeholder:font-normal"
          />

          {needsOptions && (
            <div className="mt-3 flex flex-col gap-2">
              {(question.options ?? []).map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Icon size={14} className="text-violet-300 shrink-0" />
                  <input
                    value={opt}
                    onChange={(e) => onOptionChange(i, e.target.value)}
                    className="flex-1 text-sm text-slate-600 border-b-2 border-slate-100 focus:border-fuchsia-400 outline-none py-1 transition-colors"
                  />
                  <button
                    onClick={() => onRemoveOption(i)}
                    className="text-slate-300 hover:text-rose-400 transition-colors"
                    aria-label="Remover opção"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={onAddOption}
                className="self-start text-xs font-bold text-fuchsia-500 hover:text-fuchsia-700 mt-1 flex items-center gap-1"
              >
                <Plus size={12} /> Adicionar opção
              </button>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={question.is_required}
                onChange={(e) => onChange({ is_required: e.target.checked })}
                className="rounded border-slate-300 text-fuchsia-600 focus:ring-fuchsia-400"
              />
              Obrigatória
            </label>
            <button
              onClick={onRemove}
              className="text-xs font-semibold text-slate-300 hover:text-rose-500 flex items-center gap-1 transition-colors"
            >
              <Trash2 size={13} /> Remover
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
