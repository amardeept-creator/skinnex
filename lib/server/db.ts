import 'server-only';
import postgres from 'postgres';

type Sql = ReturnType<typeof postgres>;
declare global {
  // eslint-disable-next-line no-var
  var __skinifySql: Sql | undefined;
}

function create(): Sql {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not configured. See .env.example.');
  const local = /localhost|127\.0\.0\.1/.test(url);
  return postgres(url, {
    max: local ? 1 : Number(process.env.DB_POOL_MAX || 5),
    ssl: local ? false : 'require',
    prepare: false, // required for PgBouncer / Neon pooled connections
    idle_timeout: 20,
    connect_timeout: 15,
    transform: { undefined: null },
  });
}
function get(): Sql { return (globalThis.__skinifySql ??= create()); }

/** Lazily-connected client: importing this module never opens a connection (safe at build time). */
export const sql: Sql = new Proxy(function () {} as unknown as Sql, {
  apply: (_t, _this, args: unknown[]) => (get() as unknown as (...a: unknown[]) => unknown)(...args),
  get: (_t, p) => { const s = get() as unknown as Record<string | symbol, unknown>; const v = s[p]; return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(s) : v; },
});
