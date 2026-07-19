create table if not exists waitlist (
  id uuid default gen_random_uuid() primary key,
  email text not null,
  user_id uuid references auth.users(id) on delete set null,
  source text not null default 'pricing_page',
  created_at timestamptz default now()
);

-- Prevent duplicate signups per email
create unique index if not exists waitlist_email_idx on waitlist (email);

-- Allow public inserts (for anonymous signups)
alter table waitlist enable row level security;

create policy "Anyone can insert into waitlist"
  on waitlist for insert
  with check (true);

create policy "Users can read own waitlist entry"
  on waitlist for select
  using (auth.uid() = user_id or user_id is null);
