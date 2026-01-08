import { Pool } from 'pg';

let pool: Pool | undefined;
let dbConnected = false;

export async function initializeDatabase(): Promise<void> {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    await pool.query('SELECT NOW()');
    dbConnected = true;
    console.log('✅ Database connected');

    await createTables();
  } catch (error) {
    dbConnected = false;
    pool = undefined;
    const errMsg = (error as any)?.message ?? String(error);
    console.warn('⚠️ Database connection failed (continuing without DB):', errMsg);
    // Do not throw — allow the server to start without a database for local/dev testing.
  }
}

async function createTables(): Promise<void> {
  const createPollsTable = `
    CREATE TABLE IF NOT EXISTS polls (
      id VARCHAR(255) PRIMARY KEY,
      question TEXT NOT NULL,
      options JSONB NOT NULL,
      start_time BIGINT NOT NULL,
      duration INTEGER NOT NULL,
      is_active BOOLEAN DEFAULT true,
      total_votes INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  const createVotesTable = `
    CREATE TABLE IF NOT EXISTS votes (
      id SERIAL PRIMARY KEY,
      poll_id VARCHAR(255) NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
      student_id VARCHAR(255) NOT NULL,
      selected_option VARCHAR(255) NOT NULL,
      timestamp BIGINT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(poll_id, student_id)
    );
  `;

  const createIndexes = `
    CREATE INDEX IF NOT EXISTS idx_polls_active ON polls(is_active);
    CREATE INDEX IF NOT EXISTS idx_votes_poll_student ON votes(poll_id, student_id);
  `;

  try {
    if (!pool) {
      console.warn('⚠️ Skipping table creation because database pool is not available');
      return;
    }

    await pool.query(createPollsTable);
    await pool.query(createVotesTable);
    await pool.query(createIndexes);
    console.log('✅ Database tables created/verified');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  }
}

export function getDB(): Pool {
  if (pool) return pool;

  // Return a pool-like object whose `query` method rejects so service code handles errors gracefully.
  return {
    query: async () => {
      return Promise.reject(new Error('Database not connected'));
    }
  } as unknown as Pool;
}

export function isDbConnected(): boolean {
  return dbConnected;
}