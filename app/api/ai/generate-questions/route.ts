import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import type { AIQuestionSuggestion } from '@/types/database';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = 'gemini-flash-latest';

const SYSTEM_PROMPT = `Você é um especialista em pesquisa de experiência (UX Research) para eventos presenciais de liderança jovem.
Gere de 4 a 6 perguntas de feedback objetivas para uma atividade específica.

Regras:
- Misture tipos de pergunta: no máximo 1 "rating_scale" (satisfação geral), no máximo 1 "nps",
  1 ou 2 de múltipla/única escolha sobre aspectos concretos (clareza, aplicabilidade, dinâmica),
  e exatamente 1 pergunta aberta ("long_text") pedindo sugestões de melhoria.
- Perguntas curtas, diretas, em português do Brasil, sem jargão.
- Para "single_choice" e "multiple_choice", forneça de 3 a 5 opções curtas.
- Nunca inclua perguntas de identificação pessoal (nome, email, etc).
- Responda APENAS com um array JSON válido, sem markdown, sem comentários, no formato:
[
  {
    "question_text": "string",
    "question_type": "rating_scale" | "nps" | "single_choice" | "multiple_choice" | "short_text" | "long_text",
    "is_required": boolean,
    "options": ["string", "..."]   // apenas quando aplicável, omitir caso contrário
  }
]`;

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY não está configurada no .env.local.' },
        { status: 500 }
      );
    }

    const { activityTitle, theme, speakerName, activityType } = await req.json();

    if (!theme || typeof theme !== 'string' || theme.trim().length < 3) {
      return NextResponse.json({ error: 'Informe um tema/contexto para a atividade.' }, { status: 400 });
    }

    const userPrompt = `Atividade: "${activityTitle ?? theme}"
Tipo: ${activityType ?? 'não informado'}
Palestrante/facilitador: ${speakerName ?? 'não informado'}
Tema/contexto fornecido pelo organizador: ${theme}`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: userPrompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    });

    const text = response.text ?? '';
    if (!text) throw new Error('A IA não retornou conteúdo (possível corte por limite de tokens).');
    const cleaned = text.replace(/```json|```/g, '').trim();
    const suggestions: AIQuestionSuggestion[] = JSON.parse(cleaned);

    // Validação leve para não propagar lixo ao editor do admin
    const valid = suggestions.filter(
      (q) => q.question_text?.trim() && q.question_type
    );

    return NextResponse.json({ suggestions: valid, model: MODEL_NAME });
  } catch (err: any) {
    // O SDK do Gemini lança ClientError com status/message do lado do Google —
    // logamos isso explicitamente porque o console do Next corta o stack por padrão.
    const status = err?.status ?? err?.response?.status;
    const message = err?.message ?? String(err);
    console.error('[generate-questions] error', { status, message });

    return NextResponse.json(
      {
        error:
          status === 404
            ? `Modelo "${MODEL_NAME}" não encontrado ou indisponível para sua chave de API.`
            : status === 401 || status === 403
              ? 'Chave de API do Gemini inválida ou sem permissão.'
              : status === 429
                ? 'Limite de uso da API do Gemini atingido. Tente novamente em instantes.'
                : `Não foi possível gerar as perguntas agora. (${message})`,
      },
      { status: 500 }
    );
  }
}
