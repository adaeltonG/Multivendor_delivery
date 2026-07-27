import { GraphQLError } from 'graphql'

export function badUserInput(message: string, details?: unknown): never {
  throw new GraphQLError(message, {
    extensions: { code: 'BAD_USER_INPUT', details }
  })
}

export function unauthenticated(message = 'Authentication is required'): never {
  throw new GraphQLError(message, {
    extensions: { code: 'UNAUTHENTICATED' }
  })
}

export function forbidden(message = 'You are not allowed to perform this action'): never {
  throw new GraphQLError(message, {
    extensions: { code: 'FORBIDDEN' }
  })
}

export function notFound(resource: string): never {
  throw new GraphQLError(`${resource} was not found`, {
    extensions: { code: 'NOT_FOUND' }
  })
}
