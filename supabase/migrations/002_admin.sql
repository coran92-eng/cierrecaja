-- ============================================================
-- ADMIN: el owner puede anular (eliminar) turnos, con registro en admin_log
-- Ejecutar una vez en Supabase > SQL Editor.
-- ============================================================

-- Evita recursión de RLS al consultar perfiles desde otras políticas
create or replace function es_owner()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from perfiles where id = auth.uid() and rol = 'owner')
$$;

-- Solo el owner puede borrar turnos
drop policy if exists "owner_delete_turnos" on turnos_registros;
create policy "owner_delete_turnos" on turnos_registros
  for delete using (es_owner());

-- Al borrar un turno se borra también su historial de reaperturas
alter table reaperturas_log drop constraint if exists reaperturas_log_registro_id_fkey;
alter table reaperturas_log
  add constraint reaperturas_log_registro_id_fkey
  foreign key (registro_id) references turnos_registros(id) on delete cascade;

-- Registro de acciones de administración (guarda una copia del turno anulado)
create table if not exists admin_log (
  id          uuid primary key default gen_random_uuid(),
  accion      text not null,
  registro_id uuid,
  owner_id    uuid not null references auth.users(id),
  motivo      text,
  snapshot    jsonb,
  created_at  timestamptz default now()
);

alter table admin_log enable row level security;

drop policy if exists "admin_log_solo_owner" on admin_log;
create policy "admin_log_solo_owner" on admin_log
  for all using (es_owner()) with check (es_owner());
