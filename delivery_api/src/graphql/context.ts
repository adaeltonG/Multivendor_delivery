import { bearerToken, verifyToken } from '../utils/auth.js'

export type UserRole = 'CUSTOMER' | 'VENDOR' | 'ADMIN' | 'RESTAURANT' | 'RIDER'

export type AuthUser = {
  id: string
  role: UserRole
  restaurantId?: string
  riderId?: string
}

export type GraphQLContext = {
  user: AuthUser | null
  req?: unknown
  res?: unknown
}

export function contextFromAuthorization(authorization?: string | string[]): GraphQLContext {
  const token = bearerToken(authorization)
  if (!token) return { user: null }

  try {
    return { user: verifyToken(token) }
  } catch {
    return { user: null }
  }
}

export function requireUser(context: GraphQLContext): AuthUser {
  if (!context.user) {
    throw new Error('Authentication is required')
  }
  return context.user
}
