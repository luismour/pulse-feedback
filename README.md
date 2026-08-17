# Pulse Feedback — Encontro Regional de Jovens Líderes de PE

Aplicação mobile-first de coleta de feedback em tempo real durante eventos, com IA (Google Gemini)
para gerar formulários e relatórios executivos automaticamente.

Projeto **rodável** (Next.js 14 App Router + TypeScript + Tailwind + Supabase + Gemini).
Testado com `npm install`, `npx tsc --noEmit` e `npx next build` antes da entrega.

---

## Novidades desta versão

- **Múltiplos eventos.** `/admin` agora lista todos os eventos e permite criar novos. Cada evento
  tem seu próprio painel em `/admin/eventos/[eventId]`.
- **Gestão de atividades/dinâmicas.** Dentro do painel de um evento, dá para criar, editar e
  excluir atividades (título, tipo, local, palestrante, horário) — sem precisar mexer no banco.
- **Editar o formulário depois de publicado.** A tela "Perguntas" de cada atividade agora carrega
  o formulário já salvo (se existir) direto no modo de edição — o admin pode alterar, remover,
  adicionar perguntas manualmente ou pedir mais sugestões à IA a qualquer momento, sem perder o
  que já estava publicado.

---

## 1. O que está incluído

```
database/schema.sql                                        → modelagem relacional (Supabase/Postgres)
database/seed.sql                                           → dados de exemplo

lib/supabaseClient.ts / lib/supabaseServer.ts                → clients Supabase (browser / service role)
lib/slug.ts                                                   → geração de slugs únicos para eventos

app/page.tsx                                                  → landing (Participante / Admin)
app/e/[slug]/page.tsx                                         → grade de programação pública (Participante)

app/admin/page.tsx                                            → NOVO: lista de eventos + criar evento
app/admin/eventos/[eventId]/page.tsx                          → NOVO: dashboard do evento — toggle + atividades
app/admin/eventos/[eventId]/atividades/[activityId]/page.tsx  → perguntas (IA) + insights de uma atividade

components/participant/*                                      → card, grade e formulário do participante
components/admin/FeedbackToggle.tsx                           → toggle de liberação em tempo real
components/admin/EventForm.tsx                                → NOVO: modal de criação de evento
components/admin/ActivityForm.tsx                             → NOVO: modal de criar/editar/excluir atividade
components/admin/AIQuestionEditor.tsx                          → ATUALIZADO: agora carrega e edita formulário já publicado
components/admin/AIInsightsPanel.tsx                          → tela de Relatório Inteligente (AI Insights)

app/api/admin/events/route.ts                                 → NOVO: criar evento (slug automático)
app/api/admin/activities/route.ts                             → NOVO: criar / editar / excluir atividade
app/api/admin/publish-form/route.ts                            → ATUALIZADO: GET carrega form existente, POST publica/salva
app/api/admin/toggle-feedback/route.ts                        → liga/desliga avaliação de uma atividade
app/api/ai/generate-questions/route.ts                        → chama o Gemini para sugerir perguntas
app/api/ai/generate-insights/route.ts                         → chama o Gemini para gerar o resumo executivo
```

---

## 2. Passo a passo para rodar do zero

### 2.1. Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com)
- Chave de API do [Google AI Studio](https://aistudio.google.com/apikey) (Gemini)

### 2.2. Criar o projeto no Supabase

1. [supabase.com](https://supabase.com) → **New project** → espere provisionar.
2. **SQL Editor** → **New query** → cole `database/schema.sql` → **Run**.
3. Nova query → cole `database/seed.sql` → **Run** (cria 1 evento de exemplo com 3 atividades).

### 2.3. Variáveis de ambiente

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
GEMINI_API_KEY=sua-chave-gemini
```

As duas primeiras chaves ficam em **Project Settings → API** no Supabase. A `service_role` key
(mesma tela, botão "Reveal") só é usada nas rotas `app/api/**` — nunca em componentes `'use client'`.

### 2.4. Instalar e rodar

```bash
npm install
npm run dev
```

Abra **http://localhost:3000**.

---

## 3. Se você já tinha o banco criado (migração)

Se seu Supabase já rodava uma versão anterior deste projeto, rode este bloco no **SQL Editor**
antes de usar as novas telas — ele só adiciona o que falta, é seguro rodar mais de uma vez:

```sql
-- Necessário para o envio do formulário do participante funcionar (upsert + select do retorno)
drop policy if exists "anyone_can_update_own_participant" on participants;
drop policy if exists "anyone_can_read_own_participant" on participants;
drop policy if exists "anyone_can_read_own_submission" on feedback_submissions;

create policy "anyone_can_update_own_participant" on participants for update using (true) with check (true);
create policy "anyone_can_read_own_participant" on participants for select using (true);
create policy "anyone_can_read_own_submission" on feedback_submissions for select using (true);
```

As tabelas de eventos/atividades já existiam no schema original — criar/editar/excluir eventos e
atividades não precisa de nenhuma migração adicional, pois essas rotas usam a `service_role` key
(bypassa RLS) no servidor.

---

## 4. Testando o fluxo completo

**Múltiplos eventos:**
1. Abra `/admin` → você vê o evento do seed. Clique em "Criar novo evento" para adicionar outro.
2. Cada evento tem seu próprio painel, isolado — atividades, formulários e insights não se misturam.

**Atividades/dinâmicas:**
1. Dentro de um evento (`/admin/eventos/[id]`), clique em "Nova atividade / dinâmica".
2. Preencha título, tipo, local, palestrante e horário → "Criar atividade".
3. Use o ícone de lápis ao lado do toggle para editar, ou o botão "Excluir" dentro do modal de edição.

**Toggle de liberação:** igual antes — o switch ao lado de cada atividade libera/encerra a
avaliação em tempo real para os participantes.

**Editor de perguntas com IA (agora editável após publicar):**
1. Clique em "Perguntas & insights" numa atividade.
2. Primeira vez: descreva o tema, clique em "Gerar perguntas com IA", edite e "Publicar formulário".
3. Volte a essa tela depois: as perguntas publicadas já vêm carregadas, prontas para editar de novo.
   Use "Sugerir mais perguntas com IA" para pedir novas sugestões sem perder as existentes, ou
   "Recomeçar do zero" para descartar tudo e começar de novo.

**Relatório Inteligente (AI Insights):** igual antes — aba "Insights" → "Gerar relatório". A
atividade de exemplo do seed já tem respostas prontas para testar sem precisar responder o
formulário manualmente.

### 2.7. Deploy (opcional)

```bash
npm i -g vercel
vercel
```

Configure as 4 variáveis de ambiente também no painel do Vercel antes do deploy.

---

## 5. Decisões de arquitetura

- **Sem login para participantes**, com `device_token` anônimo em `localStorage` para impedir
  voto duplicado sem exigir cadastro.
- **Formulário "uma pergunta por vez"** para reduzir carga cognitiva no celular.
- **Rotas admin server-side com service role.** Toda escrita administrativa (`events`,
  `activities`, `forms`/`questions`, toggle) passa por `app/api/admin/**`, usando a `service_role`
  key. Isso evita depender de Supabase Auth totalmente configurado neste entregável — **antes de
  produção, adicione autenticação real** nessas rotas (a tabela `admin_profiles` já existe no
  schema para isso); hoje qualquer pessoa com a URL `/admin` consegue gerenciar os eventos.
- **Edição contínua do formulário.** `questions.ai_generated`/`ai_edited` continuam rastreando a
  origem de cada pergunta mesmo depois de reeditada, e o botão "Publicar" sempre substitui o
  conjunto de perguntas da atividade pelo estado atual do editor (create-or-replace, não um diff).
- **Slugs únicos gerados no servidor.** Ao criar um evento, o slug é derivado do nome e, em caso
  de colisão, recebe sufixo numérico (`-2`, `-3`...) antes de gravar.

## 6. Próximos passos naturais (fora deste entregável)

- Autenticação real do admin via Supabase Auth, escopando cada admin aos seus próprios eventos.
- Reordenar atividades por arrastar-e-soltar (hoje a ordem é a de criação).
- Relatório agregado em nível de **evento inteiro**, não só por atividade.
- Export em PDF/CSV do relatório de insights.
