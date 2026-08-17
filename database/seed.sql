-- =============================================================================
-- SEED — dados de exemplo para rodar a aplicação localmente sem cadastro manual
-- Rode DEPOIS de database/schema.sql
-- =============================================================================

insert into events (id, name, slug, description, location, start_date, end_date, is_active)
values (
  '11111111-1111-1111-1111-111111111111',
  'Encontro Regional de Jovens Líderes de Pernambuco',
  'encontro-lideres-pe',
  'Dois dias de imersão em liderança jovem, com palestras e dinâmicas em grupo.',
  'Recife, PE',
  current_date,
  current_date + interval '1 day',
  true
);

-- 3 atividades em estados diferentes, para já demonstrar os 3 estados visuais do card:
--  1) feedback_open -> liberada para avaliação agora
--  2) ongoing        -> em andamento, bloqueada
--  3) scheduled       -> futura, bloqueada
insert into activities
  (id, event_id, title, description, speaker_name, activity_type, location, start_time, end_time, status, order_index)
values
  ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111',
   'Liderança Servidora na Prática', 'Como liderar com propósito em equipes jovens.',
   'Ana Beatriz Souza', 'Palestra', 'Auditório Principal',
   now() - interval '2 hour', now() - interval '1 hour', 'feedback_open', 1),

  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
   'Dinâmica: Construindo Confiança em Equipe', 'Atividade prática em grupos de 6 pessoas.',
   'Equipe de Facilitação', 'Dinâmica', 'Salão B',
   now() - interval '30 minute', now() + interval '30 minute', 'ongoing', 2),

  ('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111111',
   'Painel: Jovens na Política Local', 'Bate-papo com vereadores e lideranças comunitárias.',
   'Painel de Convidados', 'Painel', 'Auditório Principal',
   now() + interval '2 hour', now() + interval '3 hour', 'scheduled', 3);

-- Formulário já publicado na atividade 1, para testar o app do Participante de cara
insert into forms (id, activity_id, title, ai_generated, ai_source_theme, ai_model_used, status)
values (
  '33333333-3333-3333-3333-333333333331', '22222222-2222-2222-2222-222222222221',
  'Avalie esta atividade', true, 'Palestra sobre liderança servidora', 'gemini-3.6-flash', 'published'
);

insert into questions (id, form_id, question_text, question_type, is_required, order_index, ai_generated)
values
  ('44444444-4444-4444-4444-444444444441', '33333333-3333-3333-3333-333333333331',
   'Como você avalia esta palestra de forma geral?', 'rating_scale', true, 0, true),
  ('44444444-4444-4444-4444-444444444442', '33333333-3333-3333-3333-333333333331',
   'O conteúdo foi aplicável ao seu dia a dia?', 'single_choice', true, 1, true),
  ('44444444-4444-4444-4444-444444444443', '33333333-3333-3333-3333-333333333331',
   'O que podemos melhorar para as próximas palestras?', 'long_text', false, 2, true);

insert into question_options (question_id, option_text, order_index)
values
  ('44444444-4444-4444-4444-444444444442', 'Muito aplicável', 0),
  ('44444444-4444-4444-4444-444444444442', 'Parcialmente aplicável', 1),
  ('44444444-4444-4444-4444-444444444442', 'Pouco aplicável', 2);

-- 3 participantes + respostas de exemplo, para já testar o Relatório Inteligente (AI Insights)
insert into participants (id, event_id, device_token)
values
  ('55555555-5555-5555-5555-555555555551', '11111111-1111-1111-1111-111111111111', 'seed-device-1'),
  ('55555555-5555-5555-5555-555555555552', '11111111-1111-1111-1111-111111111111', 'seed-device-2'),
  ('55555555-5555-5555-5555-555555555553', '11111111-1111-1111-1111-111111111111', 'seed-device-3');

insert into feedback_submissions (id, activity_id, form_id, participant_id)
values
  ('66666666-6666-6666-6666-666666666661', '22222222-2222-2222-2222-222222222221',
   '33333333-3333-3333-3333-333333333331', '55555555-5555-5555-5555-555555555551'),
  ('66666666-6666-6666-6666-666666666662', '22222222-2222-2222-2222-222222222221',
   '33333333-3333-3333-3333-333333333331', '55555555-5555-5555-5555-555555555552'),
  ('66666666-6666-6666-6666-666666666663', '22222222-2222-2222-2222-222222222221',
   '33333333-3333-3333-3333-333333333331', '55555555-5555-5555-5555-555555555553');

-- Notas (rating_scale)
insert into feedback_answers (submission_id, question_id, answer_number)
values
  ('66666666-6666-6666-6666-666666666661', '44444444-4444-4444-4444-444444444441', 5),
  ('66666666-6666-6666-6666-666666666662', '44444444-4444-4444-4444-444444444441', 4),
  ('66666666-6666-6666-6666-666666666663', '44444444-4444-4444-4444-444444444441', 3);

-- Escolhas (single_choice)
insert into feedback_answers (submission_id, question_id, selected_option_ids)
select '66666666-6666-6666-6666-666666666661', '44444444-4444-4444-4444-444444444442',
       array[(select id from question_options where question_id = '44444444-4444-4444-4444-444444444442' and option_text = 'Muito aplicável')];

insert into feedback_answers (submission_id, question_id, selected_option_ids)
select '66666666-6666-6666-6666-666666666662', '44444444-4444-4444-4444-444444444442',
       array[(select id from question_options where question_id = '44444444-4444-4444-4444-444444444442' and option_text = 'Parcialmente aplicável')];

insert into feedback_answers (submission_id, question_id, selected_option_ids)
select '66666666-6666-6666-6666-666666666663', '44444444-4444-4444-4444-444444444442',
       array[(select id from question_options where question_id = '44444444-4444-4444-4444-444444444442' and option_text = 'Pouco aplicável')];

-- Comentários abertos (long_text) — é isso que a IA vai resumir no relatório
insert into feedback_answers (submission_id, question_id, answer_text)
values
  ('66666666-6666-6666-6666-666666666661', '44444444-4444-4444-4444-444444444443',
   'Achei excelente, gostaria de mais exemplos práticos do dia a dia de uma ONG.'),
  ('66666666-6666-6666-6666-666666666662', '44444444-4444-4444-4444-444444444443',
   'A sala estava com o ar-condicionado muito frio e o som falhou duas vezes.'),
  ('66666666-6666-6666-6666-666666666663', '44444444-4444-4444-4444-444444444443',
   'Poderia ter mais tempo para perguntas no final.');
