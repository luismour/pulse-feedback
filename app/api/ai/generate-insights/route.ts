import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { supabaseServer } from '@/lib/supabaseServer';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = 'gemini-2.5-flash';

const SYSTEM_PROMPT = `Você é um analista de experiência (UX Research) especializado em eventos presenciais de liderança jovem.
Você vai receber as respostas brutas de um formulário de feedback de UMA atividade específica e deve produzir um relatório executivo.

Responda APENAS com um objeto JSON válido, sem markdown e sem comentários, no formato exato:
{
  "summary_text": "resumo executivo de 3 a 5 frases, tom profissional e direto, em português do Brasil",
  "key_insights": ["ponto forte objetivo 1", "..."],
  "criticisms": ["crítica objetiva e recorrente 1", "..."],
  "suggestions": ["sugestão concreta e acionável 1", "..."],
  "sentiment_score": 0.0
}

Regras:
- Cada lista deve ter no máximo 5 itens, priorizando os pontos mais recorrentes/relevantes.
- "sentiment_score" vai de -1.0 (muito negativo) a 1.0 (muito positivo), com base no conjunto de respostas.
- Baseie-se apenas nos dados fornecidos. Se faltar comentário aberto suficiente, infira o sentimento a partir das notas numéricas.
- Nunca invente dados que não estejam nas respostas.`;

/** GET — retorna o relatório mais recente já gerado para a atividade (ou null) */
export async function GET(req: NextRequest) {
  const activityId = req.nextUrl.searchParams.get('activityId');
  if (!activityId) {
    return NextResponse.json({ error: 'activityId é obrigatório.' }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from('ai_insight_reports')
    .select('*')
    .eq('activity_id', activityId)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ report: data ?? null });
}

/** POST — gera (ou regenera) o relatório a partir das respostas atuais */
export async function POST(req: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY não está configurada no .env.local.' },
        { status: 500 }
      );
    }

    const { activityId } = await req.json();
    if (!activityId) {
      return NextResponse.json({ error: 'activityId é obrigatório.' }, { status: 400 });
    }

    const supabase = supabaseServer();

    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('id, title, event_id')
      .eq('id', activityId)
      .single();
    if (activityError || !activity) throw activityError ?? new Error('Atividade não encontrada.');

    const { data: answers, error: answersError } = await supabase
      .from('feedback_answers')
      .select(
        'submission_id, answer_text, answer_number, selected_option_ids, questions(question_text, question_type), feedback_submissions!inner(activity_id)'
      )
      .eq('feedback_submissions.activity_id', activityId);
    if (answersError) throw answersError;

    if (!answers || answers.length === 0) {
      return NextResponse.json(
        { error: 'Ainda não há respostas suficientes para gerar um relatório desta atividade.' },
        { status: 400 }
      );
    }

    // Resolve os textos das opções selecionadas (selected_option_ids guarda apenas UUIDs)
    const optionIds = Array.from(
      new Set(answers.flatMap((a) => a.selected_option_ids ?? []))
    );
    let optionMap: Record<string, string> = {};
    if (optionIds.length) {
      const { data: opts } = await supabase.from('question_options').select('id, option_text').in('id', optionIds);
      optionMap = Object.fromEntries((opts ?? []).map((o) => [o.id, o.option_text]));
    }

    // Agrupa as respostas por pergunta para montar um prompt legível
    const grouped: Record<string, { type: string; values: string[] }> = {};
    for (const a of answers as any[]) {
      const qText: string = a.questions?.question_text ?? 'Pergunta';
      const qType: string = a.questions?.question_type ?? 'short_text';
      if (!grouped[qText]) grouped[qText] = { type: qType, values: [] };

      if (a.answer_text) grouped[qText].values.push(a.answer_text);
      else if (a.answer_number !== null && a.answer_number !== undefined)
        grouped[qText].values.push(String(a.answer_number));
      else if (a.selected_option_ids?.length)
        grouped[qText].values.push(
          a.selected_option_ids.map((id: string) => optionMap[id] ?? id).join(', ')
        );
    }

    const promptData = Object.entries(grouped)
      .map(([question, { type, values }]) => `Pergunta (${type}): ${question}\nRespostas: ${values.join(' | ')}`)
      .join('\n\n');

    const responsesAnalyzed = new Set((answers as any[]).map((a) => a.submission_id)).size;

    const userPrompt = `Atividade: "${activity.title}"\nTotal de respondentes: ${responsesAnalyzed}\n\n${promptData}`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: userPrompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const text = response.text ?? '';
    if (!text) throw new Error('A IA não retornou conteúdo (possível corte por limite de tokens).');
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const { data: report, error: insertError } = await supabase
      .from('ai_insight_reports')
      .insert({
        scope: 'activity',
        event_id: activity.event_id,
        activity_id: activity.id,
        summary_text: parsed.summary_text,
        key_insights: parsed.key_insights ?? [],
        criticisms: parsed.criticisms ?? [],
        suggestions: parsed.suggestions ?? [],
        sentiment_score: parsed.sentiment_score ?? null,
        responses_analyzed: responsesAnalyzed,
        ai_model_used: MODEL_NAME,
      })
      .select()
      .single();
    if (insertError) throw insertError;

    return NextResponse.json({ report });
  } catch (err: any) {
    const status = err?.status ?? err?.response?.status;
    const message = err?.message ?? String(err);
    console.error('[generate-insights] error', { status, message });

    return NextResponse.json(
      {
        error:
          status === 404
            ? `Modelo "${MODEL_NAME}" não encontrado ou indisponível para sua chave de API.`
            : status === 401 || status === 403
              ? 'Chave de API do Gemini inválida ou sem permissão.'
              : status === 429
                ? 'Limite de uso da API do Gemini atingido. Tente novamente em instantes.'
                : `Não foi possível gerar o relatório agora. (${message})`,
      },
      { status: 500 }
    );
  }
}
