import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

declare global {
  var prisma: PrismaClient | undefined
}

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in environment variables')
}

// Create a connection pool
const pool = new Pool({ 
  connectionString,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Create adapter
const adapter = new PrismaPg(pool)

export const db = globalThis.prisma || new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error']
    : ['error']
})

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = db
}

// Optional: Handle pool cleanup
process.on('beforeExit', async () => {
  await pool.end()
  await db.$disconnect()
})