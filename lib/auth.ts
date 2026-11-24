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
  created_at: string
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

// Sessão: token opaco em memória do banco (tabela simples via cookie assinado por HMAC)
import { createHmac } from 'crypto'
const SECRET = process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || 'block-screen-dev-secret'

export function signSession(userId: number): string {
  const payload = `${userId}.${Date.now()}`
  const mac = createHmac('sha256', SECRET).update(payload).digest('hex')
  return `${payload}.${mac}`
}

export function parseSession(token: string | undefined): number | null {
  if (!token) return null
  const [id, ts, mac] = token.split('.')
  if (!id || !ts || !mac) return null
  const expected = createHmac('sha256', SECRET).update(`${id}.${ts}`).digest('hex')
  if (mac !== expected) return null
  // 30 dias
  if (Date.now() - Number(ts) > 30 * 24 * 60 * 60 * 1000) return null
  return Number(id)
}
