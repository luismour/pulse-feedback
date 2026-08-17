// =============================================================================
// Tipos compartilhados — espelham o schema em database/schema.sql
// =============================================================================

export type ActivityStatus = 'scheduled' | 'ongoing' | 'feedback_open' | 'closed';
export type FormStatus = 'draft' | 'published';

export type QuestionType =
  | 'rating_scale'
  | 'nps'
  | 'single_choice'
  | 'multiple_choice'
  | 'short_text'
  | 'long_text';

export interface EventRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  location: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface EventInput {
  name: string;
  description?: string | null;
  location?: string | null;
  start_date: string;
  end_date: string;
}

export interface EventInvite {
  id: string;
  event_id: string;
  token: string;
  label: string | null;
  max_uses: number | null;
  use_count: number;
  is_revoked: boolean;
  expires_at: string | null;
  created_at: string;
}

export interface Activity {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  speaker_name: string | null;
  activity_type: string | null;
  location: string | null;
  start_time: string; // ISO
  end_time: string; // ISO
  status: ActivityStatus;
  order_index: number;
}

export interface ActivityInput {
  event_id: string;
  title: string;
  description?: string | null;
  speaker_name?: string | null;
  activity_type?: string | null;
  location?: string | null;
  start_time: string; // ISO
  end_time: string; // ISO
}

export interface QuestionOption {
  id: string;
  question_id: string;
  option_text: string;
  order_index: number;
}

export interface Question {
  id: string;
  form_id: string;
  question_text: string;
  question_type: QuestionType;
  is_required: boolean;
  order_index: number;
  ai_generated: boolean;
  ai_edited: boolean;
  helper_text: string | null;
  options?: QuestionOption[]; // hidratado no client para single/multiple_choice
}

export interface FeedbackForm {
  id: string;
  activity_id: string;
  title: string;
  ai_generated: boolean;
  ai_source_theme: string | null;
  status: FormStatus;
  questions: Question[];
}

/** Estrutura mínima que a IA deve devolver ao sugerir perguntas (antes de ganhar IDs do banco) */
export interface AIQuestionSuggestion {
  question_text: string;
  question_type: QuestionType;
  is_required: boolean;
  options?: string[]; // apenas para single_choice / multiple_choice
  helper_text?: string;
}

/** Estado local do editor de perguntas no admin — inclui um id temporário do client */
export interface EditableQuestion extends AIQuestionSuggestion {
  client_id: string; // uuid gerado no client, usado como React key antes de persistir
  ai_generated: boolean;
  ai_edited: boolean;
}

export interface AnswerPayload {
  question_id: string;
  answer_text?: string;
  answer_number?: number;
  selected_option_ids?: string[];
}

export interface AIInsightReport {
  id: string;
  scope: 'activity' | 'event';
  summary_text: string;
  key_insights: string[];
  criticisms: string[];
  suggestions: string[];
  sentiment_score: number | null;
  responses_analyzed: number;
  generated_at: string;
}
