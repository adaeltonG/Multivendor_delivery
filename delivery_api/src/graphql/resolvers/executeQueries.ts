import { Query } from 'mongoose'

type Resolver = (...args: any[]) => unknown

export function executeMongooseQueryResolver(resolver: Resolver): Resolver {
  return function executeResolver(this: unknown, ...args: any[]) {
    const result = resolver.apply(this, args)
    return result instanceof Query ? result.exec() : result
  }
}

export function executeMongooseQueries<T>(value: T): T {
  if (typeof value === 'function') {
    return executeMongooseQueryResolver(value as Resolver) as T
  }

  if (
    value &&
    typeof value === 'object' &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        executeMongooseQueries(entry)
      ])
    ) as T
  }

  return value
}
