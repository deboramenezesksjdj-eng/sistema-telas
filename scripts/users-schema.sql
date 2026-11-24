-- Tabela de usuários do painel + seed do admin master
create table if not exists public.users (
  id bigint generated always as identity primary key,
  email text unique not null,
  password_hash text not null,
  name text,
  role text not null default 'user',   -- 'admin' | 'user'
  blocked boolean not null default false,
  session_key text,                      -- sessão única p/ não-admins (admin usa 'all')
  expires_at timestamptz,                -- data de validade da conta (null = sem validade)
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;
drop policy if exists "leitura publica users" on public.users;
create policy "leitura publica users" on public.users for select to anon using (true);

-- admin master inicial (senha: Admin01 — trocar no admin depois)
insert into public.users (email, password_hash, name, role)
values ('admin@blockscreen.app', 'seed:replace-on-first-login', 'Administrador', 'admin')
on conflict (email) do nothing;
