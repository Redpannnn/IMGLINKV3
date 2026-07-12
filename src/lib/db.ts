import { PrismaClient } from '@prisma/client'
import { createClient } from '@libsql/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

function createPrismaClient() {
  const dbUrl = process.env.DATABASE_URL || 'file:./db/custom.db'

  if (dbUrl.startsWith('libsql://')) {
    const libsql = createClient({ url: dbUrl })
    const adapter = new PrismaLibSQL(libsql)
    return new PrismaClient({ adapter })
  }

  return new PrismaClient()
}

let _db: PrismaClient | null = null

export const db = new Proxy({} as PrismaClient, {
  get(_, prop) {
    if (!_db) _db = createPrismaClient()
    return (_db as any)[prop]
  },
})