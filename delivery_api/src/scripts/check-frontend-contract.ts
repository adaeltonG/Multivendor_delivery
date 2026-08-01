import { parse as parseJavaScript } from '@babel/parser'
import { buildSchema, parse as parseGraphQL, validate } from 'graphql'
import { readdir, readFile } from 'node:fs/promises'
import { extname, join, relative, resolve } from 'node:path'
import { typeDefs } from '../graphql/typeDefs.js'

const repository = resolve(import.meta.dirname, '../../..')
const frontendRoots = [
  'enatega-multivendor-app',
  'enatega-multivendor-rider',
  'enatega-multivendor-restaurant',
  'enatega-multivendor-admin',
  'enatega-multivendor-web'
]

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries
      .filter(entry => entry.name !== 'node_modules' && entry.name !== 'build')
      .map(entry => {
        const path = join(directory, entry.name)
        if (entry.isDirectory()) return sourceFiles(path)
        return ['.js', '.jsx', '.ts', '.tsx'].includes(extname(entry.name)) ? [path] : []
      })
  )
  return nested.flat()
}

function templates(node: unknown, output: string[]): void {
  if (!node || typeof node !== 'object') return
  const value = node as Record<string, any>
  if (value.type === 'TemplateLiteral') {
    const text = value.quasis.map((quasi: any) => quasi.value.cooked ?? quasi.value.raw).join('\n')
    if (/\b(query|mutation|subscription|fragment)\b/.test(text)) output.push(text)
  }
  for (const [key, child] of Object.entries(value)) {
    if (['loc', 'start', 'end', 'comments', 'tokens', 'errors'].includes(key)) continue
    if (Array.isArray(child)) child.forEach(item => templates(item, output))
    else templates(child, output)
  }
}

const schema = buildSchema(typeDefs)
process.env.MONGO_URI ??= 'mongodb://127.0.0.1:27017/enatega_contract_check'
process.env.JWT_SECRET ??= 'contract-check-secret-at-least-32-characters-long'
const { resolvers } = await import('../graphql/resolvers/index.js')
const malformed: string[] = []
const incompatible: string[] = []
let checked = 0

for (const [typeName, resolverName] of [
  ['Query', 'Query'],
  ['Mutation', 'Mutation'],
  ['Subscription', 'Subscription']
] as const) {
  const fields = schema.getType(typeName)
  if (!fields || !('getFields' in fields)) continue
  for (const field of Object.keys(fields.getFields())) {
    if (!(field in resolvers[resolverName])) {
      incompatible.push(`${typeName}.${field}: root resolver is not implemented`)
    }
  }
}

for (const frontend of frontendRoots) {
  const files = await sourceFiles(join(repository, frontend, 'src'))
  for (const file of files) {
    const source = await readFile(file, 'utf8')
    let ast
    try {
      ast = parseJavaScript(source, {
        sourceType: 'unambiguous',
        plugins: ['jsx', 'typescript']
      })
    } catch (error) {
      malformed.push(`${relative(repository, file)}: JavaScript parse failed: ${String(error)}`)
      continue
    }
    const documents: string[] = []
    templates(ast, documents)
    for (const document of documents) {
      let parsed
      try {
        parsed = parseGraphQL(document)
      } catch (error) {
        malformed.push(`${relative(repository, file)}: ${String(error).split('\n')[0]}`)
        continue
      }
      checked += 1
      const errors = validate(schema, parsed).filter(
        error =>
          !error.message.startsWith('Unknown fragment') &&
          !error.message.startsWith('Fragment "') &&
          !error.message.includes('is never used')
      )
      if (errors.length) {
        incompatible.push(
          `${relative(repository, file)}:\n${errors
            .map(error => `  - ${error.message}`)
            .join('\n')}`
        )
      }
    }
  }
}

console.log(`Validated ${checked} frontend GraphQL documents.`)
if (malformed.length) {
  console.warn(`Skipped ${malformed.length} malformed/interpolated frontend templates:`)
  malformed.slice(0, 20).forEach(message => console.warn(`  ${message}`))
}
if (incompatible.length) {
  console.error(`Found ${incompatible.length} schema incompatibilities:`)
  incompatible.forEach(message => console.error(message))
  process.exitCode = 1
} else {
  console.log('All parsed frontend GraphQL documents are compatible with the API schema.')
}
