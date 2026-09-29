import postgres from 'postgres';

// Push-notification storage on Postgres (Neon via Vercel Storage). Tables are prefixed and created on demand.
let sql;
let ready;

export function hasStore() {
  return !!(process.env.DATABASE_URL || process.env.POSTGRES_URL);
}

async function db() {
  if (!hasStore()) return null;
  sql ??= postgres(process.env.DATABASE_URL || process.env.POSTGRES_URL, { max: 1, idle_timeout: 20, prepare: false, onnotice: () => {} });
  ready ??= sql`
    create table if not exists dw_subs (
      id text primary key,
      subscription jsonb not null,
      state jsonb not null,
      last_notif_at bigint not null default 0,
      stage_seen jsonb,
      updated_at timestamptz not null default now()
    );
    create table if not exists dw_inbox (
      seq bigserial primary key,
      sub_id text not null,
      msg jsonb not null
    );
    create index if not exists dw_inbox_sub on dw_inbox (sub_id);
    create table if not exists dw_rate (
      key text primary key,
      n int not null,
      expires_at timestamptz not null
    );
  `.simple().catch((e) => {
    ready = undefined;
    throw e;
  });
  await ready;
  return sql;
}

// Client-owned fields (subscription, state) are upserted; delivery bookkeeping stays with the cron.
export async function saveSub(id, subscription, state) {
  const s = await db();
  await s`
    insert into dw_subs (id, subscription, state, last_notif_at)
    values (${id}, ${s.json(subscription)}, ${s.json(state)}, ${Date.now()})
    on conflict (id) do update set subscription = excluded.subscription, state = excluded.state, updated_at = now()`;
}

export async function deleteSub(id) {
  const s = await db();
  await s`delete from dw_inbox where sub_id = ${id}`;
  await s`delete from dw_subs where id = ${id}`;
}

export async function listSubs() {
  const s = await db();
  return s`select id, subscription, state, last_notif_at, stage_seen from dw_subs`;
}

export async function saveMeta(id, lastNotifAt, stageSeen) {
  const s = await db();
  await s`update dw_subs set last_notif_at = ${lastNotifAt}, stage_seen = ${stageSeen ? s.json(stageSeen) : null} where id = ${id}`;
}

export async function addInbox(id, msg) {
  const s = await db();
  await s`insert into dw_inbox (sub_id, msg) values (${id}, ${s.json(msg)})`;
  await s`delete from dw_inbox where sub_id = ${id} and seq not in (select seq from dw_inbox where sub_id = ${id} order by seq desc limit 20)`;
}

export async function takeInbox(id) {
  const s = await db();
  const rows = await s`delete from dw_inbox where sub_id = ${id} returning msg, seq`;
  return rows.sort((a, b) => Number(b.seq) - Number(a.seq)).map((r) => r.msg);
}

// Fixed-window limiter; allows everything when no database is configured or it is unreachable.
export async function allow(key, max, windowSec) {
  let s;
  try {
    s = await db();
  } catch (e) {
    console.error('rate limit store unavailable', e.message);
    return true;
  }
  if (!s) return true;
  const [row] = await s`
    insert into dw_rate (key, n, expires_at) values (${key}, 1, now() + make_interval(secs => ${windowSec}))
    on conflict (key) do update set
      n = case when dw_rate.expires_at < now() then 1 else dw_rate.n + 1 end,
      expires_at = case when dw_rate.expires_at < now() then excluded.expires_at else dw_rate.expires_at end
    returning n`;
  if (Math.random() < 0.02) await s`delete from dw_rate where expires_at < now()`;
  return row.n <= max;
}
