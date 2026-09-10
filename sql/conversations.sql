-- The conversation spine: every business conversation across every engine,
-- both sides ([ai] -> [human] -> [ai] -> [human]), text and voice-as-transcript.
-- This is the atomic unit of the platform and the training substrate for the
-- judgment/experiment engine. Consent is granted at signup (see the fine print).
-- Apply in the Supabase SQL editor.

-- One header row per conversation (the analyzable panel — matches the target row:
-- conversation_id · person_id · module · dynamics · intervention · outcome · real_outcome).
create table if not exists conversations (
  conversation_id text primary key,
  person_id uuid not null,
  module text,
  cohort text,
  intervention text,     -- the A/B variant applied (also joinable via experiment_assignments)
  outcome numeric,       -- conversation-level score (e.g. framework/decision grade)
  real_outcome numeric,  -- objective ground truth where known (sealed-truth sims)
  dynamics jsonb,        -- computed conversation dynamics (depth, movement, calibration…)
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists conversations_person on conversations (person_id);
create index if not exists conversations_module on conversations (module);

-- One row per turn — the raw evidence.
create table if not exists conversation_turns (
  conversation_id text not null,
  person_id uuid not null,
  module text,
  turn_index int not null,
  speaker text not null,          -- 'ai' | 'human'
  text text,
  modality text not null default 'text',  -- 'text' | 'voice'
  created_at timestamptz not null default now(),
  primary key (conversation_id, turn_index)
);
create index if not exists conversation_turns_conv on conversation_turns (conversation_id);
