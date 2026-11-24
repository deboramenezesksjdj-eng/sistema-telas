import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { supabase } from '@/lib/db'

export const USERS_TABLE = 'users'

export type UserRow = {
  id: number
  email: string
  password_hash: string
  name: string | null
  role: 'admin' | 'user'
  blocked: boolean
  session_key?: string | null
  expires_at?: string | null
  created_at: string
}

// Conta expirada? (admin nunca expira)
export function isExpired(u: { role: string; expires_at?: string | null }): boolean {
  if (u.role === 'admin' || !u.expires_at) return false
  return new Date(u.expires_at).getTime() < Date.now()
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const { data } = await supabase
    .from(USERS_TABLE)
    .select('*')
    .ilike('email', email.trim())
    .maybeSingle()
  return data || null
}

export function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString('hex')
  return `${salt}:${scryptSync(pw, salt, 32).toString('hex')}`
}

export function verifyPassword(pw: string, stored: string): boolean {
  const parts = stored.split(':')
  if (parts.length !== 2) return false
  const [salt, hash] = parts
  try {
    const calc = scryptSync(pw, salt, 32)
    const target = Buffer.from(hash, 'hex')
    return calc.length === target.length && timingSafeEqual(calc, target)
  } catch {
    return false
  }
}

// Sessão: cookie assinado por HMAC com session_key (invalidação de sessões antigas)
import { createHmac } from 'crypto'
const SECRET = process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || 'block-screen-dev-secret'

// Admin: pode ter várias sessões ao mesmo tempo (key fixa "all").
// Usuário comum: só 1 sessão ativa — novo login gera key nova e derruba a anterior.
function sessionKeyOf(role: string | undefined, stored: string | null): string {
  return role === 'admin' ? 'all' : (stored || 'none')
}

export function signSession(userId: number, role: string | undefined, sessionKey: string | null): string {
  const payload = `${userId}.${sessionKeyOf(role, sessionKey)}.${Date.now()}`
  const mac = createHmac('sha256', SECRET).update(payload).digest('hex')
  return `${payload}.${mac}`
}

export async function parseSession(token: string | undefined): Promise<number | null> {
  if (!token) return null
  const [id, key, ts, mac] = token.split('.')
  if (!id || !key || !ts || !mac) return null
  const expected = createHmac('sha256', SECRET).update(`${id}.${key}.${ts}`).digest('hex')
  if (mac !== expected) return null
  // 30 dias
  if (Date.now() - Number(ts) > 30 * 24 * 60 * 60 * 1000) return null
  // valida contra o banco: a key precisa bater (sessão única p/ não-admin)
  const { data } = await supabase
    .from(USERS_TABLE)
    .select('role, session_key, blocked, expires_at')
    .eq('id', Number(id))
    .maybeSingle()
  if (!data || data.blocked || isExpired(data)) return null
  if (data.role !== 'admin' && data.session_key !== key) return null
  return Number(id)
}

// Gera (ou retorna) a session_key para um novo login.
// Admin: mantém 'all' (sessões múltiplas). Usuário: key nova → invalida a anterior.
export function newSessionKey(role: string, current: string | null): string {
  return role === 'admin' ? 'all' : randomBytes(16).toString('hex')
}
