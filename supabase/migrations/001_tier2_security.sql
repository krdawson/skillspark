-- ─────────────────────────────────────────────────────────────────────────────
-- Tier 2 security migration
--
-- Before:  every table had a single policy `cmd=ALL, roles={public}, qual=true`
--          => anyone with the (bundled, public) anon key could read/write/delete
--          every row, and PINs were readable in plaintext via `select *`.
--
-- After:   - all access requires an authenticated session (anonymous or Google),
--            so the raw anon key alone (no session) can no longer touch data
--          - kid PINs live in a separate `profile_pins` table that has RLS on and
--            NO policy, so no client role can read or write it — only the
--            service_role (used by /api/pin) bypasses RLS
--          - profiles.has_pin tells the client whether to show "set PIN" vs
--            "enter PIN" without exposing the PIN itself
--          - settings.admin_pin is no longer client-readable (it was never a real
--            gate — admin access is Google-OAuth gated — but don't leak it either)
--
-- Run this in the Supabase SQL editor AFTER deploying the app + /api changes.
-- See README "Deploy order".
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

-- 1. Separate, client-inaccessible table for kid PIN hashes ───────────────────
create table if not exists public.profile_pins (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  pin_hash   text not null,
  updated_at timestamptz not null default now()
);
alter table public.profile_pins enable row level security;
-- No policies on purpose: authenticated/anon get nothing; service_role bypasses RLS.
grant all on public.profile_pins to service_role;

-- Migrate any existing plaintext PINs. They are stored with a `plain:` prefix so
-- the server recognises legacy values and transparently upgrades them to a salted
-- scrypt hash on the next successful verify (see api/pin.ts).
insert into public.profile_pins (profile_id, pin_hash)
select id, 'plain:' || pin
from public.profiles
where pin is not null and pin <> ''
on conflict (profile_id) do nothing;

-- 2. has_pin flag on profiles (client-readable; the PIN itself is gone) ────────
alter table public.profiles add column if not exists has_pin boolean not null default false;
update public.profiles set has_pin = true
where id in (select profile_id from public.profile_pins);

-- Drop the plaintext PIN column from profiles entirely.
alter table public.profiles drop column if exists pin;

-- 3. admin_pin: hide it from clients (write-only; never read client-side) ─────
revoke select (admin_pin) on public.settings from anon, authenticated;
-- NOTE: because of this, the app must select explicit columns from `settings`
-- (not `select *`) — see supabase.ts loadAllData.

-- 4. Replace the wide-open "public / true" policies with authenticated-only ────
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'drills', 'goals', 'daily_logs', 'drill_ratings',
    'settings', 'push_subscriptions'
  ] loop
    execute (
      select coalesce(string_agg(format('drop policy %I on public.%I;', policyname, t), ' '), '')
      from pg_policies where schemaname = 'public' and tablename = t
    );
    execute format($f$
      create policy "authenticated access" on public.%I
        for all to authenticated
        using (true) with check (true);
    $f$, t);
  end loop;
end $$;
