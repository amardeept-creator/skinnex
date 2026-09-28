import postgres from 'postgres';
import { readFileSync } from 'fs';
const url = process.env.DATABASE_URL; if (!url) { console.error('DATABASE_URL missing'); process.exit(1); }
const local = /localhost|127\.0\.0\.1/.test(url);
const sql = postgres(url, { max: 1, ssl: local ? false : 'require', prepare: false, onnotice: () => {} });
await sql.unsafe(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
console.log('[skinify] schema applied'); await sql.end();
