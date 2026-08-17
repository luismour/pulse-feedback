-- =============================================================================
-- PULSE FEEDBACK — Modelagem de Banco de Dados (Supabase / PostgreSQL)
-- =============================================================================
-- Convenções:
--   - UUID como PK em todas as tabelas (gen_random_uuid(), extensão pgcrypto)
--   - Timestamps em UTC (timestamptz)
--   - Enums para estados finitos (evita strings soltas / erros de digitação)
--   - RLS (Row Level Security) habilitada em todas as tabelas
--   - View flat (vw_feedback_export) pronta para Power Query / Power BI
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- ENUMS
-- -----------------------------------------------------------------------------

create type activity_status as enum (
  'scheduled',       -- ainda não começou
  'ongoing',         -- em andamento (avaliação ainda bloqueada)
  'feedback_open',   -- liberada para avaliação pelo admin
  'closed'           -- avaliação encerrada
);

create type form_status as enum (
  'draft',      -- IA gerou / admin está editando, ainda não publicado
  'published'   -- pronto para ser exibido ao participante quando a atividade abrir
);

create type question_type as enum (
  'rating_scale',   -- 1 a 5 (estrelas / emojis)
  'nps',            -- 0 a 10
  'single_choice',  -- escolha única (botões grandes)
  'multiple_choice',-- múltipla escolha
  'short_text',     -- resposta curta
  'long_text'       -- resposta longa / comentário aberto
);

create type insight_report_scope as enum ('activity', 'event');

-- -----------------------------------------------------------------------------
-- EVENTOS
-- -----------------------------------------------------------------------------
create table events (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,                     -- "Encontro Regional de Jovens Líderes de PE"
  slug          text unique not null,               -- usado na URL pública /e/[slug]
  description   text,
  location      text,
  start_date    date not null,
  end_date      date not null,
  is_active     boolean not null default true,      -- controla se está "ao vivo"
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- ATIVIDADES (palestras, dinâmicas, oficinas...)
-- -----------------------------------------------------------------------------
create table activities (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references events(id) on delete cascade,
  title           text not null,                    -- "Liderança Servidora na Prática"
  description     text,
  speaker_name    text,
  activity_type   text,                              -- "Palestra" | "Dinâmica" | "Painel" ...
  location        text,                              -- "Auditório Principal"
  start_time      timestamptz not null,
  end_time        timestamptz not null,
  status          activity_status not null default 'scheduled',
  feedback_opened_at  timestamptz,                    -- setado quando admin faz o toggle
  feedback_closed_at  timestamptz,
  order_index     int not null default 0,             -- ordenação na grade
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_activities_event on activities(event_id);
create index idx_activities_status on activities(status);

-- -----------------------------------------------------------------------------
-- FORMULÁRIOS (1 formulário dinâmico por atividade)
-- -----------------------------------------------------------------------------
create table forms (
  id                uuid primary key default gen_random_uuid(),
  activity_id       uuid not null unique references activities(id) on delete cascade,
  title             text not null default 'Avalie esta atividade',
  ai_generated      boolean not null default false,
  ai_source_theme   text,          -- tema/prompt que o admin digitou para a IA
  ai_model_used     text,          -- ex: "gemini-3.6-flash"
  status            form_status not null default 'draft',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- PERGUNTAS (geradas por IA e/ou editadas manualmente pelo admin)
-- -----------------------------------------------------------------------------
create table questions (
  id             uuid primary key default gen_random_uuid(),
  form_id        uuid not null references forms(id) on delete cascade,
  question_text  text not null,
  question_type  question_type not null,
  is_required    boolean not null default true,
  order_index    int not null default 0,
  ai_generated   boolean not null default false,   -- true = veio da IA; false = admin adicionou manualmente
  ai_edited      boolean not null default false,    -- true = admin editou o texto sugerido pela IA
  helper_text    text,                               -- texto de apoio abaixo da pergunta (opcional)
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index idx_questions_form on questions(form_id, order_index);

-- Opções para single_choice / multiple_choice
create table question_options (
  id            uuid primary key default gen_random_uuid(),
  question_id   uuid not null references questions(id) on delete cascade,
  option_text   text not null,
  order_index   int not null default 0
);

create index idx_options_question on question_options(question_id, order_index);

-- -----------------------------------------------------------------------------
-- PARTICIPANTES (identificação leve — sem exigir login/cadastro)
-- -----------------------------------------------------------------------------
create table participants (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references events(id) on delete cascade,
  device_token   text not null,        -- gerado no client (localStorage) para evitar respostas duplicadas
  name           text,                  -- opcional
  email          text,                  -- opcional
  created_at     timestamptz not null default now(),
  unique (event_id, device_token)
);

-- -----------------------------------------------------------------------------
-- SUBMISSÕES (1 envio de formulário = 1 submissão)
-- -----------------------------------------------------------------------------
create table feedback_submissions (
  id              uuid primary key default gen_random_uuid(),
  activity_id     uuid not null references activities(id) on delete cascade,
  form_id         uuid not null references forms(id) on delete cascade,
  participant_id  uuid not null references participants(id) on delete cascade,
  submitted_at    timestamptz not null default now(),
  unique (activity_id, participant_id)  -- 1 avaliação por participante por atividade
);

create index idx_submissions_activity on feedback_submissions(activity_id);

-- -----------------------------------------------------------------------------
-- RESPOSTAS individuais (uma linha por pergunta respondida)
-- -----------------------------------------------------------------------------
create table feedback_answers (
  id                    uuid primary key default gen_random_uuid(),
  submission_id         uuid not null references feedback_submissions(id) on delete cascade,
  question_id           uuid not null references questions(id) on delete cascade,
  answer_text           text,           -- short_text / long_text
  answer_number          numeric,        -- rating_scale / nps
  selected_option_ids   uuid[],         -- single_choice (1 item) / multiple_choice (N itens)
  created_at            timestamptz not null default now()
);

create index idx_answers_submission on feedback_answers(submission_id);
create index idx_answers_question on feedback_answers(question_id);

-- -----------------------------------------------------------------------------
-- RELATÓRIOS DE IA (resumo executivo / insights automáticos)
-- -----------------------------------------------------------------------------
create table ai_insight_reports (
  id                uuid primary key default gen_random_uuid(),
  scope             insight_report_scope not null,   -- 'activity' ou 'event'
  event_id          uuid not null references events(id) on delete cascade,
  activity_id       uuid references activities(id) on delete cascade, -- null quando scope = 'event'
  summary_text      text not null,           -- resumo executivo em linguagem natural
  key_insights      jsonb not null default '[]',   -- ["Participantes elogiaram a dinâmica em grupo", ...]
  criticisms        jsonb not null default '[]',   -- pontos de crítica extraídos pela IA
  suggestions       jsonb not null default '[]',   -- sugestões de melhoria extraídas pela IA
  sentiment_score   numeric,                 -- -1.0 a 1.0
  responses_analyzed int not null default 0,
  ai_model_used     text,
  generated_at      timestamptz not null default now(),
  generated_by      uuid references auth.users(id)
);

create index idx_reports_event on ai_insight_reports(event_id);

-- -----------------------------------------------------------------------------
-- PERFIS DE ADMINISTRADOR (a autenticação em si fica no Supabase Auth)
-- -----------------------------------------------------------------------------
create table admin_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        text not null default 'organizer',  -- 'organizer' | 'super_admin'
  event_ids   uuid[] default '{}',                  -- eventos que este admin gerencia
  created_at  timestamptz not null default now()
);

-- =============================================================================
-- TRIGGERS — updated_at automático
-- =============================================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_events_updated before update on events
  for each row execute function set_updated_at();
create trigger trg_activities_updated before update on activities
  for each row execute function set_updated_at();
create trigger trg_forms_updated before update on forms
  for each row execute function set_updated_at();
create trigger trg_questions_updated before update on questions
  for each row execute function set_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
alter table events enable row level security;
alter table activities enable row level security;
alter table forms enable row level security;
alter table questions enable row level security;
alter table question_options enable row level security;
alter table participants enable row level security;
alter table feedback_submissions enable row level security;
alter table feedback_answers enable row level security;
alter table ai_insight_reports enable row level security;
alter table admin_profiles enable row level security;

-- Leitura pública: qualquer pessoa pode ver eventos/atividades/formulários publicados
create policy "public_read_events" on events for select using (is_active = true);
create policy "public_read_activities" on activities for select using (true);
create policy "public_read_published_forms" on forms for select using (status = 'published');
create policy "public_read_questions" on questions for select using (
  exists (select 1 from forms f where f.id = questions.form_id and f.status = 'published')
);
create policy "public_read_options" on question_options for select using (true);

-- Participantes podem criar seu próprio registro e enviar respostas (anon key)
create policy "anyone_can_register_participant" on participants for insert with check (true);
-- upsert() no client gera INSERT ... ON CONFLICT DO UPDATE, então também precisa de política de UPDATE
create policy "anyone_can_update_own_participant" on participants for update using (true) with check (true);
-- .select() após o upsert/insert pede o Postgres devolver a linha via RETURNING, o que também exige SELECT
create policy "anyone_can_read_own_participant" on participants for select using (true);
create policy "anyone_can_submit_feedback" on feedback_submissions for insert with check (true);
create policy "anyone_can_read_own_submission" on feedback_submissions for select using (true);
create policy "anyone_can_answer" on feedback_answers for insert with check (true);

-- Escrita/gestão: somente admins autenticados donos do evento
create policy "admin_manage_events" on events for all using (
  auth.uid() in (select id from admin_profiles) 
) with check (auth.uid() in (select id from admin_profiles));

create policy "admin_manage_activities" on activities for all using (
  event_id in (select unnest(event_ids) from admin_profiles where id = auth.uid())
  or auth.uid() in (select id from admin_profiles where role = 'super_admin')
);

create policy "admin_manage_forms" on forms for all using (
  activity_id in (
    select a.id from activities a
    join admin_profiles p on a.event_id = any(p.event_ids) or p.role = 'super_admin'
    where p.id = auth.uid()
  )
);

create policy "admin_manage_questions" on questions for all using (
  form_id in (
    select f.id from forms f
    join activities a on a.id = f.activity_id
    join admin_profiles p on a.event_id = any(p.event_ids) or p.role = 'super_admin'
    where p.id = auth.uid()
  )
);

create policy "admin_read_reports" on ai_insight_reports for select using (
  event_id in (select unnest(event_ids) from admin_profiles where id = auth.uid())
  or auth.uid() in (select id from admin_profiles where role = 'super_admin')
);

-- =============================================================================
-- VIEW — Export "achatado" para Power Query / Power BI
-- =============================================================================
create or replace view vw_feedback_export as
select
  e.name                as event_name,
  a.title                as activity_title,
  a.activity_type,
  a.speaker_name,
  a.start_time,
  fs.submitted_at,
  q.question_text,
  q.question_type,
  fa.answer_text,
  fa.answer_number,
  (
    select string_agg(qo.option_text, '; ')
    from question_options qo
    where qo.id = any(fa.selected_option_ids)
  )                      as selected_options,
  fs.id                  as submission_id,
  p.id                   as participant_id
from feedback_answers fa
join feedback_submissions fs on fs.id = fa.submission_id
join questions q on q.id = fa.question_id
join activities a on a.id = fs.activity_id
join events e on e.id = a.event_id
join participants p on p.id = fs.participant_id;

comment on view vw_feedback_export is
  'View plana pronta para conexão direta via Power Query (Get Data > Postgres/Supabase) e modelagem no Power BI.';
