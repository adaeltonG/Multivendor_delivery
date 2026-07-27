import bcrypt from 'bcryptjs'
import jwt, { type SignOptions } from 'jsonwebtoken'
import { env } from '../config/env.js'
import type { AuthUser, UserRole } from '../graphql/context.js'

type JwtPayload = {
  sub: string
  role: UserRole
  restaurantId?: string
  riderId?: string
}

export const hashPassword = (password: string) => bcrypt.hash(password, 12)
export const comparePassword = (password: string, hash: string) =>
  bcrypt.compare(password, hash)

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
    issuer: 'enatega-delivery-api',
    audience: 'enatega-clients'
  })
}

export function verifyToken(token: string): AuthUser {
  const payload = jwt.verify(token, env.JWT_SECRET, {
    issuer: 'enatega-delivery-api',
    audience: 'enatega-clients'
  }) as JwtPayload

  return {
    id: payload.sub,
    role: payload.role,
    restaurantId: payload.restaurantId,
    riderId: payload.riderId
  }
}

export function bearerToken(value?: string | string[]): string | undefined {
  if (!value || Array.isArray(value)) return undefined
  const [scheme, token] = value.trim().split(/\s+/)
  return scheme?.toLowerCase() === 'bearer' ? token : undefined
}
