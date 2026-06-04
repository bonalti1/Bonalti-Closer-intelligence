-- Bonalti Closer CRM additions
-- Run in the same Supabase project as the Data Entry App.

create extension if not exists "pgcrypto";

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.closer_pipeline (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  closer_name text not null default '',
  pipeline_stage text not null default 'reunion_agendada_celular',
  closer_status text not null default 'pending',
  follow_up_date date,
  closed_date date,
  deal_value numeric(12, 2),
  lost_reason text not null default '',
  closer_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (meeting_id),
  constraint closer_pipeline_stage_check check (
    pipeline_stage in (
      'reunion_agendada_oficina',
      'reunion_agendada_celular',
      'reunion_para_showing',
      'no_show',
      'contactado_con_tarea',
      'en_proceso_aprobacion',
      'lead_potencial',
      'closed',
      'not_interested',
      'did_not_approve_mortgage_loan',
      'new',
      'contacted',
      'follow_up',
      'proposal',
      'lost'
    )
  ),
  constraint closer_pipeline_status_check check (
    closer_status in ('pending', 'closed', 'lost')
  )
);

create table if not exists public.meeting_notes (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  note_text text not null,
  note_type text not null default 'closer',
  created_by_name text not null default '',
  created_at timestamptz not null default now(),
  constraint meeting_notes_type_check check (
    note_type in ('setter', 'closer', 'follow_up', 'status')
  )
);

alter table public.meetings
  add column if not exists status_source text not null default 'setter',
  add column if not exists status_updated_at timestamptz not null default now(),
  add column if not exists ghl_contact_id text not null default '',
  add column if not exists ghl_opportunity_id text not null default '',
  add column if not exists ghl_appointment_id text not null default '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'meetings_status_source_check'
      and conrelid = 'public.meetings'::regclass
  ) then
    alter table public.meetings
      add constraint meetings_status_source_check check (
        status_source in ('setter', 'closer_dashboard', 'ghl', 'system', 'manual_import')
      );
  end if;
end;
$$;

create table if not exists public.ghl_lead_snapshots (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  ghl_contact_id text not null default '',
  ghl_opportunity_id text not null default '',
  ghl_pipeline_id text not null default '',
  ghl_pipeline_stage_id text not null default '',
  pipeline_stage text not null default 'contacted',
  pipeline_stage_name text not null default '',
  meeting_status text not null default '',
  opportunity_status text not null default 'open',
  opportunity_value numeric(12, 2),
  assigned_to_name text not null default '',
  follow_up_date date,
  last_activity_at timestamptz,
  last_note text not null default '',
  raw_payload jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (meeting_id),
  constraint ghl_lead_snapshots_stage_check check (
    pipeline_stage in (
      'reunion_agendada_oficina',
      'reunion_agendada_celular',
      'reunion_para_showing',
      'no_show',
      'contactado_con_tarea',
      'en_proceso_aprobacion',
      'lead_potencial',
      'closed',
      'not_interested',
      'did_not_approve_mortgage_loan',
      'new',
      'contacted',
      'follow_up',
      'proposal',
      'lost'
    )
  ),
  constraint ghl_lead_snapshots_meeting_status_check check (
    meeting_status in ('', 'agendada', 'atendida', 'no_show', 'reagendo', 'descalificado', 'cerrado')
  ),
  constraint ghl_lead_snapshots_status_check check (
    opportunity_status in ('open', 'won', 'lost', 'abandoned')
  )
);

alter table public.ghl_lead_snapshots
  add column if not exists ghl_pipeline_id text not null default '',
  add column if not exists ghl_pipeline_stage_id text not null default '',
  add column if not exists meeting_status text not null default '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ghl_lead_snapshots_meeting_status_check'
      and conrelid = 'public.ghl_lead_snapshots'::regclass
  ) then
    alter table public.ghl_lead_snapshots
      add constraint ghl_lead_snapshots_meeting_status_check check (
        meeting_status in ('', 'agendada', 'atendida', 'no_show', 'reagendo', 'descalificado', 'cerrado')
      );
  end if;
end;
$$;

create table if not exists public.ghl_sync_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'ghl_api',
  status text not null default 'completed',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  records_seen integer not null default 0,
  records_matched integer not null default 0,
  error_message text not null default '',
  created_at timestamptz not null default now(),
  constraint ghl_sync_runs_status_check check (
    status in ('completed', 'failed', 'missing_config', 'pending_mapping')
  )
);

create index if not exists closer_pipeline_meeting_idx on public.closer_pipeline (meeting_id);
create index if not exists closer_pipeline_company_idx on public.closer_pipeline (company_id);
create index if not exists closer_pipeline_closer_idx on public.closer_pipeline (closer_name);
create index if not exists closer_pipeline_status_idx on public.closer_pipeline (closer_status);
create index if not exists meeting_notes_meeting_idx on public.meeting_notes (meeting_id, created_at desc);
create index if not exists meeting_notes_company_idx on public.meeting_notes (company_id);
create index if not exists meetings_status_updated_idx on public.meetings (status_updated_at desc);
create index if not exists meetings_ghl_contact_idx on public.meetings (ghl_contact_id);
create index if not exists meetings_ghl_opportunity_idx on public.meetings (ghl_opportunity_id);
create index if not exists ghl_lead_snapshots_meeting_idx on public.ghl_lead_snapshots (meeting_id);
create index if not exists ghl_lead_snapshots_company_idx on public.ghl_lead_snapshots (company_id);
create index if not exists ghl_lead_snapshots_stage_idx on public.ghl_lead_snapshots (pipeline_stage);
create index if not exists ghl_lead_snapshots_pipeline_idx on public.ghl_lead_snapshots (ghl_pipeline_id);
create index if not exists ghl_lead_snapshots_pipeline_stage_idx on public.ghl_lead_snapshots (ghl_pipeline_stage_id);
create index if not exists ghl_lead_snapshots_synced_idx on public.ghl_lead_snapshots (synced_at desc);
create index if not exists ghl_sync_runs_started_idx on public.ghl_sync_runs (started_at desc);

drop trigger if exists closer_pipeline_touch_updated_at on public.closer_pipeline;
create trigger closer_pipeline_touch_updated_at
before update on public.closer_pipeline
for each row execute function public.touch_updated_at();

drop trigger if exists ghl_lead_snapshots_touch_updated_at on public.ghl_lead_snapshots;
create trigger ghl_lead_snapshots_touch_updated_at
before update on public.ghl_lead_snapshots
for each row execute function public.touch_updated_at();

alter table public.closer_pipeline enable row level security;
alter table public.meeting_notes enable row level security;
alter table public.ghl_lead_snapshots enable row level security;
alter table public.ghl_sync_runs enable row level security;
