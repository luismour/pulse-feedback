'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, Check, X, Star, PartyPopper } from 'lucide-react';
import { supabase, getDeviceToken } from '@/lib/supabaseClient';
import type { Activity, FeedbackForm as FeedbackFormType, Question, AnswerPayload } from '@/types/database';

interface FeedbackFormProps {
  activity: Activity;
  form: FeedbackFormType;
  eventId: string;
  onClose: () => void;
  onSubmitted?: () => void;
}

type AnswerState = Record<string, AnswerPayload>;

/**
 * Formulário "uma pergunta por vez": reduz carga cognitiva no celular,
 * evita rolagem longa e deixa claro o progresso (barra + contador).
 */
export default function FeedbackForm({ activity, form, eventId, onClose, onSubmitted }: FeedbackFormProps) {
  const questions = form.questions;
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [status, setStatus] = useState<'answering' | 'submitting' | 'done' | 'error'>('answering');
  const [animKey, setAnimKey] = useState(0);

  const currentQuestion = questions[stepIndex];
  const progressPct = Math.round(((stepIndex + (status === 'done' ? 1 : 0)) / questions.length) * 100);
  const isLastQuestion = stepIndex === questions.length - 1;

  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const canAdvance = useMemo(() => {
    if (!currentQuestion) return false;
    if (!currentQuestion.is_required) return true;
    if (!currentAnswer) return false;
    return (
      !!currentAnswer.answer_text?.trim() ||
      currentAnswer.answer_number !== undefined ||
      (currentAnswer.selected_option_ids && currentAnswer.selected_option_ids.length > 0)
    );
  }, [currentAnswer, currentQuestion]);

  function updateAnswer(questionId: string, payload: Partial<AnswerPayload>) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], ...payload, question_id: questionId },
    }));
  }

  function goNext() {
    if (!canAdvance) return;
    if (isLastQuestion) {
      void handleSubmit();
      return;
    }
    setAnimKey((k) => k + 1);
    setStepIndex((i) => i + 1);
  }

  function goBack() {
    if (stepIndex === 0) return onClose();
    setAnimKey((k) => k + 1);
    setStepIndex((i) => i - 1);
  }

  async function handleSubmit() {
    setStatus('submitting');
    try {
      const deviceToken = getDeviceToken();

      const { data: participant, error: participantError } = await supabase
        .from('participants')
        .upsert({ event_id: eventId, device_token: deviceToken }, { onConflict: 'event_id,device_token' })
        .select('id')
        .single();
      if (participantError) throw participantError;

      const { data: submission, error: submissionError } = await supabase
        .from('feedback_submissions')
        .insert({ activity_id: activity.id, form_id: form.id, participant_id: participant.id })
        .select('id')
        .single();
      if (submissionError) throw submissionError;

      const rows = Object.values(answers).map((a) => ({ ...a, submission_id: submission.id }));
      const { error: answersError } = await supabase.from('feedback_answers').insert(rows);
      if (answersError) throw answersError;

      setStatus('done');
      onSubmitted?.();
    } catch (err) {
      console.error('[FeedbackForm] submit failed', err);
      setStatus('error');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header fixo: progresso + fechar */}
      <header className="shrink-0 px-5 pt-5 pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={goBack}
            className="p-2 -ml-2 rounded-full text-slate-400 hover:text-slate-600 active:bg-slate-100 transition-colors"
            aria-label="Voltar"
          >
            <ChevronLeft size={22} />
          </button>
          <p className="text-sm font-semibold text-slate-400">
            {status === 'done' ? questions.length : stepIndex + 1} de {questions.length}
          </p>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-full text-slate-400 hover:text-slate-600 active:bg-slate-100 transition-colors"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-brand-gradient transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="mt-3 text-xs font-bold uppercase tracking-wide text-fuchsia-500 truncate">
          {activity.title}
        </p>
      </header>

      {/* Corpo: pergunta atual ou tela de sucesso */}
      <main className="flex-1 overflow-y-auto px-6 py-8">
        {status === 'done' ? (
          <SuccessState onClose={onClose} />
        ) : status === 'error' ? (
          <ErrorState onRetry={handleSubmit} />
        ) : (
          currentQuestion && (
            <div key={animKey} className="animate-fade-slide-in">
              <h2 className="text-2xl font-extrabold text-slate-900 leading-snug">
                {currentQuestion.question_text}
              </h2>
              {currentQuestion.helper_text && (
                <p className="mt-2 text-sm text-slate-500">{currentQuestion.helper_text}</p>
              )}

              <div className="mt-8">
                <QuestionInput
                  question={currentQuestion}
                  answer={currentAnswer}
                  onChange={(payload) => updateAnswer(currentQuestion.id, payload)}
                  onAutoAdvance={goNext}
                />
              </div>
            </div>
          )
        )}
      </main>

      {/* Rodapé fixo: CTA grande, fácil de tocar com o polegar */}
      {status === 'answering' && (
        <footer className="shrink-0 px-6 py-5 border-t border-slate-100">
          <button
            onClick={goNext}
            disabled={!canAdvance}
            className={[
              'w-full h-14 rounded-2xl text-base font-bold transition-all duration-200',
              canAdvance
                ? 'bg-brand-gradient text-white shadow-glow active:scale-[0.98]'
                : 'bg-slate-100 text-slate-300 cursor-not-allowed',
            ].join(' ')}
          >
            {isLastQuestion ? 'Enviar avaliação' : 'Continuar'}
          </button>
          {!currentQuestion?.is_required && (
            <button
              onClick={goNext}
              className="w-full mt-2 h-10 text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors"
            >
              Pular
            </button>
          )}
        </footer>
      )}

      {status === 'submitting' && (
        <footer className="shrink-0 px-6 py-5 border-t border-slate-100">
          <div className="w-full h-14 rounded-2xl bg-slate-50 flex items-center justify-center gap-2 text-slate-400 text-sm font-medium">
            <span className="h-4 w-4 rounded-full border-2 border-slate-300 border-t-fuchsia-500 animate-spin" />
            Enviando...
          </div>
        </footer>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Renderizador por tipo de pergunta
// -----------------------------------------------------------------------------
function QuestionInput({
  question,
  answer,
  onChange,
  onAutoAdvance,
}: {
  question: Question;
  answer?: AnswerPayload;
  onChange: (payload: Partial<AnswerPayload>) => void;
  onAutoAdvance: () => void;
}) {
  switch (question.question_type) {
    case 'rating_scale':
      return (
        <div className="flex justify-between gap-2">
          {[1, 2, 3, 4, 5].map((value) => {
            const selected = answer?.answer_number === value;
            return (
              <button
                key={value}
                onClick={() => {
                  onChange({ answer_number: value });
                  setTimeout(onAutoAdvance, 200);
                }}
                className={[
                  'flex-1 aspect-square rounded-2xl flex items-center justify-center transition-all duration-150 active:scale-95',
                  selected
                    ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-glow-orange'
                    : 'bg-slate-50 hover:bg-slate-100',
                ].join(' ')}
                aria-label={`${value} estrela${value > 1 ? 's' : ''}`}
              >
                <Star size={22} className={selected ? 'text-white fill-white' : 'text-slate-300'} />
              </button>
            );
          })}
        </div>
      );

    case 'nps':
      return (
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-11">
          {Array.from({ length: 11 }, (_, i) => i).map((value) => {
            const selected = answer?.answer_number === value;
            return (
              <button
                key={value}
                onClick={() => onChange({ answer_number: value })}
                className={[
                  'aspect-square rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-150 active:scale-95',
                  selected ? 'bg-brand-gradient text-white shadow-glow' : 'bg-slate-50 text-slate-500 hover:bg-slate-100',
                ].join(' ')}
              >
                {value}
              </button>
            );
          })}
        </div>
      );

    case 'single_choice':
      return (
        <div className="flex flex-col gap-3">
          {question.options?.map((opt) => {
            const selected = answer?.selected_option_ids?.[0] === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => {
                  onChange({ selected_option_ids: [opt.id] });
                  setTimeout(onAutoAdvance, 200);
                }}
                className={[
                  'w-full text-left px-5 py-4 rounded-2xl border-2 text-base font-semibold transition-all duration-150 active:scale-[0.98] flex items-center justify-between',
                  selected
                    ? 'border-fuchsia-400 bg-gradient-to-r from-violet-50 to-fuchsia-50 text-fuchsia-700 shadow-card'
                    : 'border-slate-200 text-slate-700 hover:border-violet-200',
                ].join(' ')}
              >
                {opt.option_text}
                {selected && (
                  <span className="h-6 w-6 rounded-full bg-brand-gradient flex items-center justify-center shrink-0">
                    <Check size={14} className="text-white" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      );

    case 'multiple_choice':
      return (
        <div className="flex flex-col gap-3">
          {question.options?.map((opt) => {
            const current = answer?.selected_option_ids ?? [];
            const selected = current.includes(opt.id);
            return (
              <button
                key={opt.id}
                onClick={() => {
                  const next = selected ? current.filter((id) => id !== opt.id) : [...current, opt.id];
                  onChange({ selected_option_ids: next });
                }}
                className={[
                  'w-full text-left px-5 py-4 rounded-2xl border-2 text-base font-semibold transition-all duration-150 active:scale-[0.98] flex items-center justify-between',
                  selected
                    ? 'border-fuchsia-400 bg-gradient-to-r from-violet-50 to-fuchsia-50 text-fuchsia-700 shadow-card'
                    : 'border-slate-200 text-slate-700 hover:border-violet-200',
                ].join(' ')}
              >
                {opt.option_text}
                <span
                  className={[
                    'h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0',
                    selected ? 'bg-brand-gradient border-transparent' : 'border-slate-300',
                  ].join(' ')}
                >
                  {selected && <Check size={13} className="text-white" strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>
      );

    case 'short_text':
      return (
        <input
          autoFocus
          type="text"
          value={answer?.answer_text ?? ''}
          onChange={(e) => onChange({ answer_text: e.target.value })}
          placeholder="Digite sua resposta"
          className="w-full text-lg px-1 py-3 border-b-2 border-slate-200 focus:border-fuchsia-400 outline-none transition-colors placeholder:text-slate-300"
        />
      );

    case 'long_text':
      return (
        <textarea
          autoFocus
          rows={5}
          value={answer?.answer_text ?? ''}
          onChange={(e) => onChange({ answer_text: e.target.value })}
          placeholder="Conte com detalhes..."
          className="w-full text-base p-4 rounded-2xl border-2 border-slate-200 focus:border-fuchsia-400 outline-none resize-none transition-colors placeholder:text-slate-300"
        />
      );

    default:
      return null;
  }
}

function SuccessState({ onClose }: { onClose: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center animate-fade-slide-in">
      <div className="h-20 w-20 rounded-full bg-brand-gradient flex items-center justify-center mb-5 shadow-glow">
        <PartyPopper size={30} className="text-white" />
      </div>
      <h2 className="text-xl font-extrabold text-slate-900">Obrigado pela sua avaliação!</h2>
      <p className="mt-2 text-sm text-slate-500 max-w-xs">
        Sua opinião ajuda a organização a melhorar as próximas atividades em tempo real.
      </p>
      <button
        onClick={onClose}
        className="mt-8 h-12 px-6 rounded-2xl bg-slate-900 text-white text-sm font-bold active:scale-[0.98] transition-transform"
      >
        Voltar para a programação
      </button>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center">
      <h2 className="text-lg font-bold text-slate-900">Não foi possível enviar</h2>
      <p className="mt-2 text-sm text-slate-500 max-w-xs">
        Verifique sua conexão e tente novamente.
      </p>
      <button
        onClick={onRetry}
        className="mt-6 h-12 px-6 rounded-2xl bg-brand-gradient text-white text-sm font-bold shadow-glow active:scale-[0.98] transition-transform"
      >
        Tentar novamente
      </button>
    </div>
  );
}
