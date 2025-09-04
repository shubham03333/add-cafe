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
    connectionLimit: 10,
    queueLimit: 0
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

// Helper function to safely execute queries
export async function executeQuery(query: string, params?: any[]) {
  if (!db) {
    throw new Error('Database not configured. Please check environment variables.');
  }

  try {
    // Always pass params if provided, even if empty array
    const [rows] = params !== undefined ? await db.execute(query, params) : await db.execute(query);
    return rows;
  } catch (error) {
    console.error('Database query error:', error);
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
