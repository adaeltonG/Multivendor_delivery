import { OAuth2Client } from 'google-auth-library'
import { googleOAuthClientIds } from '../config/env.js'

export type VerifiedGoogleIdentity = {
  subject: string
  email: string
  name: string
  picture?: string
}

const googleClient = new OAuth2Client()

export async function verifyGoogleIdToken(
  idToken: string
): Promise<VerifiedGoogleIdentity> {
  if (googleOAuthClientIds.length === 0) {
    throw new Error('Google authentication is not configured')
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: googleOAuthClientIds
  })
  const payload = ticket.getPayload()

  if (
    !payload?.sub ||
    !payload.email ||
    payload.email_verified !== true
  ) {
    throw new Error('Google account does not provide a verified email')
  }

  return {
    subject: payload.sub,
    email: payload.email.trim().toLowerCase(),
    name: payload.name?.trim() || 'Customer',
    picture: payload.picture
  }
}
