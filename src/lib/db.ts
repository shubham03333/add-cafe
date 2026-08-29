import mysql from 'mysql2/promise';

const getDbConfig = (): mysql.PoolOptions | null => {
  const config: mysql.PoolOptions = {
    host: process.env.DB_HOST || process.env.MYSQL_HOST,
    user: process.env.DB_USERNAME || process.env.MYSQL_USER,
    password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD,
    database: process.env.DB_NAME || process.env.MYSQL_DATABASE,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
    ssl: process.env.DB_SSL === 'true' || (process.env.DB_HOST || process.env.MYSQL_HOST || '').includes('tidbcloud.com')
      ? { minVersion: 'TLSv1.2' }
      : undefined,
    waitForConnections: true,
    // TiDB Cloud + serverless: keep pools small to avoid connection storms
    connectionLimit: process.env.VERCEL ? 5 : 10,
    queueLimit: 50,
    maxIdle: process.env.VERCEL ? 2 : 5,
    idleTimeout: 60000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    connectTimeout: 10000,
    charset: 'utf8mb4',
    decimalNumbers: true,
    compress: true,
    supportBigNumbers: true,
  };

  if (process.env.NODE_ENV === 'development') {
    console.log('DB Environment variables:', {
      DB_HOST: config.host ? '***' : 'MISSING',
      DB_USERNAME: config.user ? '***' : 'MISSING',
      DB_NAME: config.database ? '***' : 'MISSING',
      hasPassword: !!config.password,
      hasAllRequired: !!config.host && !!config.user && !!config.database
    });
  }

  if (!config.host || !config.user || !config.database) {
    const errorMessage = '❌ Missing required database environment variables';
    console.error(errorMessage);
    console.error('Required: DB_HOST, DB_USERNAME, DB_NAME');

    if (process.env.NODE_ENV === 'production') {
      console.warn('Continuing without database connection in production mode');
      return null;
    }

    throw new Error(errorMessage);
  }

  return config;
};

const dbConfig = getDbConfig();

export const db = dbConfig ? mysql.createPool(dbConfig) : null;

/**
 * Run a parameterized query over the text protocol (one round-trip).
 * Prefer this over mysql2 execute()/prepared statements on TiDB Cloud:
 * PREPARE + EXECUTE adds extra WAN round-trips per query.
 */
export async function executeQuery(query: string, params?: any[], retryCount = 0) {
  if (!db) {
    throw new Error('Database not configured. Please check environment variables.');
  }

  const maxRetries = 3;
  const baseDelay = 100;

  try {
    const [rows] = params !== undefined
      ? await db.query(query, params)
      : await db.query(query);
    return rows;
  } catch (error: any) {
    console.error('Database query error:', error);

    const retryable = error.code === 'ER_CON_COUNT_ERROR'
      || error.code === 'ECONNRESET'
      || error.code === 'PROTOCOL_CONNECTION_LOST'
      || error.code === 'ETIMEDOUT';

    if (retryable && retryCount < maxRetries) {
      const delay = baseDelay * Math.pow(2, retryCount);
      await new Promise(resolve => setTimeout(resolve, delay));
      return executeQuery(query, params, retryCount + 1);
    }

    throw new Error(`Database error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function testConnection() {
  if (!db) {
    return { success: false, error: 'Database not configured' };
  }

  try {
    const [result] = await db.query('SELECT 1 as test');
    return { success: true, result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown database error'
    };
  }
}
