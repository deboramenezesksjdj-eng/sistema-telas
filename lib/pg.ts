import { Pool } from 'pg'

// Conexão direta Postgres (Supabase) — usada pelo setup e APIs server-side
const url =
  process.env.DATABASE_URL ||
  `postgresql://postgres:${encodeURIComponent(process.env.SUPABASE_DB_PASSWORD || '')}@db.${process.env.SUPABASE_PROJECT_REF || 'srcyncstaxiteikajcqc'}.supabase.co:5432/postgres`

let pool: import('pg').Pool | null = null

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
      max: 5,
    })
  }
  return pool
}
