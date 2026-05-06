-- ============================================================
-- CIERRE DE CAJA — Esquema inicial
-- ============================================================

-- Tabla de perfiles (complementa auth.users)
create table if not exists perfiles (
  id      uuid primary key references auth.users(id) on delete cascade,
  rol     text not null check (rol in ('owner', 'empleado')),
  nombre  text
);

alter table perfiles enable row level security;

create policy "perfil_propio" on perfiles
  for all using (id = auth.uid());

create policy "owner_lee_todos_perfiles" on perfiles
  for select using (
    exists (select 1 from perfiles p where p.id = auth.uid() and p.rol = 'owner')
  );

-- Tabla principal de registros de turno
create table if not exists turnos_registros (
  id               uuid primary key default gen_random_uuid(),
  turno            text not null check (turno in ('manana', 'tarde')),
  fecha            date not null,
  empleado_id      uuid not null references auth.users(id),
  empleado_nombre  text,

  -- APERTURA
  apertura_fondo_heredado   numeric(10,2),          -- NULL en el primer registro histórico
  apertura_fondo_editable   boolean not null default false, -- true solo si fondo_heredado es NULL
  apertura_desglose         jsonb,                  -- {b500:0, b200:1, ..., c001:3}
  apertura_total_contado    numeric(10,2),
  apertura_diferencia       numeric(10,2),
  apertura_confirmada_at    timestamptz,

  -- CIERRE
  cierre_desglose           jsonb,
  cierre_total_caja         numeric(10,2),
  cierre_fondo_definido     numeric(10,2),
  cierre_efectivo_neto      numeric(10,2),          -- cajón - fondo
  cierre_tpv_efectivo       numeric(10,2),
  cierre_tpv_tarjeta        numeric(10,2),
  cierre_tpv_voids          numeric(10,2),          -- obligatorio al cerrar
  cierre_num_tickets        integer,
  cierre_dif_efectivo       numeric(10,2),
  cierre_dif_tarjeta        numeric(10,2),
  cierre_semaforo           text check (cierre_semaforo in ('verde', 'naranja', 'rojo')),
  cierre_confirmado_at      timestamptz,

  estado  text not null default 'pendiente'
    check (estado in ('pendiente', 'apertura_ok', 'cerrado', 'reabierto')),

  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),

  constraint unique_turno_fecha unique (turno, fecha)
);

alter table turnos_registros enable row level security;

-- Empleado solo ve sus filas; owner ve todas
create policy "acceso_por_rol" on turnos_registros
  for select using (
    empleado_id = auth.uid()
    or exists (select 1 from perfiles where id = auth.uid() and rol = 'owner')
  );

-- Empleado solo puede insertar sus propias filas
create policy "empleado_insert" on turnos_registros
  for insert with check (empleado_id = auth.uid());

-- Update: empleado solo sus filas no cerradas; owner puede actualizar cualquiera
create policy "update_con_rol" on turnos_registros
  for update using (
    (empleado_id = auth.uid() and estado not in ('cerrado'))
    or exists (select 1 from perfiles where id = auth.uid() and rol = 'owner')
  );

-- Trigger: updated_at automático
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger turnos_updated_at
  before update on turnos_registros
  for each row execute function set_updated_at();

-- Tabla de datáfonos por cierre
create table if not exists datafonos_cierre (
  id           uuid primary key default gen_random_uuid(),
  registro_id  uuid not null references turnos_registros(id) on delete cascade,
  nombre       text not null,
  importe      numeric(10,2) not null,
  orden        smallint
);

alter table datafonos_cierre enable row level security;

create policy "datafonos_acceso" on datafonos_cierre
  for all using (
    exists (
      select 1 from turnos_registros tr
      where tr.id = registro_id
        and (
          tr.empleado_id = auth.uid()
          or exists (select 1 from perfiles where id = auth.uid() and rol = 'owner')
        )
    )
  );

-- Tabla de log de reaperturas (solo owner)
create table if not exists reaperturas_log (
  id           uuid primary key default gen_random_uuid(),
  registro_id  uuid not null references turnos_registros(id),
  owner_id     uuid not null references auth.users(id),
  motivo       text,
  created_at   timestamptz default now()
);

alter table reaperturas_log enable row level security;

create policy "reaperturas_solo_owner" on reaperturas_log
  for all using (
    exists (select 1 from perfiles where id = auth.uid() and rol = 'owner')
  );
