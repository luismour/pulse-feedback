'use client';

import { useEffect, useState } from 'react';
import { Sparkles, ThumbsUp, ThumbsDown, Lightbulb, Loader2, RefreshCw } from 'lucide-react';
import type { AIInsightReport } from '@/types/database';

interface AIInsightsPanelProps {
  activityId: string;
  activityTitle: string;
}

export default function AIInsightsPanel({ activityId, activityTitle }: AIInsightsPanelProps) {
  const [report, setReport] = useState<AIInsightReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/ai/generate-insights?activityId=${activityId}`)
      .then((res) => res.json())
      .then((data) => setReport(data.report ?? null))
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, [activityId]);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/generate-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erro ao gerar relatório.');
      setReport(data.report);
    } catch (err: any) {
      setError(err.message ?? 'Erro inesperado.');
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-violet-300">
        <Loader2 className="animate-spin" size={22} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-8 w-8 rounded-xl bg-brand-gradient flex items-center justify-center shrink-0">
              <Sparkles size={15} className="text-white" />
            </span>
            <span className="text-sm font-bold text-slate-900">Relatório inteligente</span>
          </div>
          <p className="text-sm text-slate-500 mt-2">
            Resumo gerado por IA a partir das respostas de{' '}
            <strong className="text-slate-700">{activityTitle}</strong>.
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="shrink-0 h-10 px-4 rounded-2xl bg-slate-900 text-white text-sm font-bold flex items-center gap-2 hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {generating ? (
            <Loader2 size={15} className="animate-spin" />
          ) : report ? (
            <RefreshCw size={15} />
          ) : (
            <Sparkles size={15} />
          )}
          {report ? 'Atualizar' : 'Gerar relatório'}
        </button>
      </div>

      {error && <div className="mb-4 rounded-2xl bg-rose-50 text-rose-600 text-sm px-4 py-3 font-medium">{error}</div>}

      {!report && !generating && !error && (
        <div className="rounded-3xl bg-white shadow-card py-14 text-center">
          <p className="text-sm text-slate-400">Nenhum relatório gerado ainda para esta atividade.</p>
        </div>
      )}

      {report && (
        <div className="flex flex-col gap-5 animate-fade-slide-in">
          <div className="rounded-3xl bg-brand-gradient p-5 shadow-glow text-white">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wide text-white/80">
                {report.responses_analyzed} respondentes analisados
              </span>
              <SentimentBadge score={report.sentiment_score} />
            </div>
            <p className="text-sm leading-relaxed">{report.summary_text}</p>
          </div>

          <InsightSection icon={ThumbsUp} color="emerald" title="Pontos fortes" items={report.key_insights} />
          <InsightSection icon={ThumbsDown} color="rose" title="Críticas recorrentes" items={report.criticisms} />
          <InsightSection icon={Lightbulb} color="amber" title="Sugestões de melhoria" items={report.suggestions} />
        </div>
      )}
    </div>
  );
}

function SentimentBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) return null;
  const isPositive = score > 0.2;
  const isNegative = score < -0.2;
  const label = isPositive ? 'Positivo' : isNegative ? 'Negativo' : 'Neutro';
  return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm">{label}</span>
  );
}

function InsightSection({
  icon: Icon,
  color,
  title,
  items,
}: {
  icon: React.ElementType;
  color: 'emerald' | 'rose' | 'amber';
  title: string;
  items: string[];
}) {
  if (!items?.length) return null;
  const colorMap = {
    emerald: 'text-white bg-gradient-to-br from-emerald-400 to-teal-500',
    rose: 'text-white bg-gradient-to-br from-rose-400 to-pink-500',
    amber: 'text-white bg-gradient-to-br from-amber-400 to-orange-500',
  };
  return (
    <div className="rounded-3xl bg-white shadow-card p-5">
      <div className="flex items-center gap-2.5 mb-3">
        <span className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${colorMap[color]}`}>
          <Icon size={15} />
        </span>
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      </div>
      <ul className="flex flex-col gap-2.5">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-slate-600 border-l-2 border-violet-200 ml-3.5 py-0.5 pl-3">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
