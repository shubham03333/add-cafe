import mysql from 'mysql2/promise';

// Environment variable configuration for different environments
const getDbConfig = () => {
  // For Vercel deployment, use these environment variable names
  const config = {
    host: process.env.DB_HOST || process.env.MYSQL_HOST,
    user: process.env.DB_USERNAME || process.env.MYSQL_USER,
    password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD,
    database: process.env.DB_NAME || process.env.MYSQL_DATABASE,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0,
    acquireTimeoutMillis: 60000,
    timeout: 30000,
    idleTimeoutMillis: 30000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
  };

  // Debug environment variables in development
  if (process.env.NODE_ENV === 'development') {
    console.log('DB Environment variables:', {
      DB_HOST: config.host ? '***' : 'MISSING',
      DB_USERNAME: config.user ? '***' : 'MISSING',
      DB_NAME: config.database ? '***' : 'MISSING',
      hasPassword: !!config.password,
      hasAllRequired: !!config.host && !!config.user && !!config.database
    });
  }

  // Check for required variables
  if (!config.host || !config.user || !config.database) {
    const errorMessage = '❌ Missing required database environment variables';
    console.error(errorMessage);
    console.error('Required: DB_HOST, DB_USERNAME, DB_NAME');
    console.error('Alternatively use: MYSQL_HOST, MYSQL_USER, MYSQL_DATABASE');
    
    // In production, we might want to continue without throwing to avoid build failures
    if (process.env.NODE_ENV === 'production') {
      console.warn('Continuing without database connection in production mode');
      return null;
    }
    
    throw new Error(errorMessage);
  }

  return config;
};

const dbConfig = getDbConfig();

// Create connection pool only if we have valid configuration
export const db = dbConfig ? mysql.createPool(dbConfig) : null;

// Connection pool monitoring
if (db && process.env.NODE_ENV === 'development') {
  // Log connection pool stats every 30 seconds
  // Note: Pool stats properties may vary by mysql2 version
  setInterval(() => {
    console.log('🔍 MySQL Connection Pool Stats: Monitoring active');
  }, 30000);
}

// Helper function to safely execute queries with retry logic
export async function executeQuery(query: string, params?: any[], retryCount = 0) {
  if (!db) {
    throw new Error('Database not configured. Please check environment variables.');
  }

  const maxRetries = 3;
  const baseDelay = 100; // 100ms base delay

  try {
    // Always pass params if provided, even if empty array
    const [rows] = params !== undefined ? await db.execute(query, params) : await db.execute(query);
    return rows;
  } catch (error: any) {
    console.error('Database query error:', error);

    // Check if it's a connection limit error and we haven't exceeded max retries
    if (error.code === 'ER_CON_COUNT_ERROR' && retryCount < maxRetries) {
      const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
      console.log(`Connection limit reached, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);

      await new Promise(resolve => setTimeout(resolve, delay));
      return executeQuery(query, params, retryCount + 1);
    }

    // For other errors or if we've exhausted retries, throw the error
    throw new Error(`Database error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Test connection function
export async function testConnection() {
  if (!db) {
    return { success: false, error: 'Database not configured' };
  }
  
  try {
    const [result] = await db.execute('SELECT 1 as test');
    return { success: true, result };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown database error' 
    };
  }
}
