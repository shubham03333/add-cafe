import { NextResponse } from 'next/server';
import { getMemoryHealth, memoryMonitor } from '@/lib/memory-monitor';
import { testConnection } from '@/lib/db';
import { cache } from '@/lib/cache';

export async function GET() {
  try {
    // Get memory health status
    const memoryHealth = getMemoryHealth();

    // Test database connection
    const dbHealth = await testConnection();

    // Get cache stats
    const cacheStats = cache.getStats();

    // Determine overall health status
    const isHealthy = memoryHealth.status !== 'critical' && dbHealth.success;
    const statusCode = isHealthy ? 200 : 503; // 503 Service Unavailable

    const healthData = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        ...memoryHealth.stats,
        status: memoryHealth.status,
        message: memoryHealth.message
      },
      database: {
        connected: dbHealth.success,
        error: dbHealth.error || null
      },
      cache: {
        size: cacheStats.size,
        utilization: cacheStats.utilization
      },
      alerts: memoryMonitor.getAlerts().slice(-5) // Last 5 alerts
    };

    return NextResponse.json(healthData, { status: statusCode });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      },
      { status: 500 }
    );
  }
}
