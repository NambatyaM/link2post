-- Referral system tables

-- Referral codes: one per user
create table if not exists referral_codes (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid not null references auth.users(id) on delete cascade unique,
  code        text not null unique,
  created_at  timestamptz default now() not null
);

create index if not exists idx_referral_codes_code
  on referral_codes (code);

alter table referral_codes enable row level security;

create policy "Users can insert own referral codes"
  on referral_codes for insert
  with check (auth.uid() = user_id);

create policy "Users can read own referral codes"
  on referral_codes for select
  using (auth.uid() = user_id);

-- Referrals: tracks who invited whom
create table if not exists referrals (
  id              uuid default gen_random_uuid() primary key,
  referrer_id     uuid not null references auth.users(id) on delete cascade,
  referred_id     uuid references auth.users(id) on delete set null,
  referred_email  text,
  status          text not null default 'pending' check (status in ('pending', 'confirmed')),
  created_at      timestamptz default now() not null,
  unique(referrer_id, referred_id)
);

create index if not exists idx_referrals_referrer
  on referrals (referrer_id);

create index if not exists idx_referrals_code
  on referrals (referred_email);

alter table referrals enable row level security;

create policy "Users can insert own referrals"
  on referrals for insert
  with check (auth.uid() = referrer_id);

create policy "Users can read own referrals"
  on referrals for select
  using (auth.uid() = referrer_id);

-- User credits: bonus generations from referrals
create table if not exists user_credits (
  id       uuid default gen_random_uuid() primary key,
  user_id  uuid not null references auth.users(id) on delete cascade unique,
  bonus    integer default 0 not null
);

alter table user_credits enable row level security;

create policy "Users can read own credits"
  on user_credits for select
  using (auth.uid() = user_id);

create policy "Users can insert own credits"
  on user_credits for insert
  with check (auth.uid() = user_id);

create policy "Users can update own credits"
  on user_credits for update
  using (auth.uid() = user_id);
