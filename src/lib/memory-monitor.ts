import { cache } from './cache';

// Memory monitoring and management for t2.micro constraints (1GB RAM)
interface MemoryStats {
  used: number;
  total: number;
  external: number;
  rss: number;
  heapUsed: number;
  heapTotal: number;
  utilization: number;
  timestamp: number;
}

class MemoryMonitor {
  private alerts: string[] = [];
  private stats: MemoryStats[] = [];
  private readonly maxHistory = 100;
  private readonly heapLimitMB = 512; // 512MB heap limit for t2.micro
  private readonly memoryThreshold = 0.8; // Alert at 80% usage

  constructor() {
    // Start monitoring
    this.startMonitoring();
  }

  private getMemoryStats(): MemoryStats {
    const memUsage = process.memoryUsage();
    const totalMemMB = memUsage.heapTotal / 1024 / 1024;
    const usedMemMB = memUsage.heapUsed / 1024 / 1024;

    return {
      used: usedMemMB,
      total: totalMemMB,
      external: memUsage.external / 1024 / 1024,
      rss: memUsage.rss / 1024 / 1024,
      heapUsed: usedMemMB,
      heapTotal: totalMemMB,
      utilization: usedMemMB / this.heapLimitMB,
      timestamp: Date.now()
    };
  }

  private checkMemoryThresholds(stats: MemoryStats): void {
    // Check heap usage against limit
    if (stats.heapUsed > this.heapLimitMB * this.memoryThreshold) {
      const alert = `HIGH MEMORY USAGE: ${stats.heapUsed.toFixed(1)}MB heap used (${(stats.utilization * 100).toFixed(1)}% of ${this.heapLimitMB}MB limit)`;
      this.alerts.push(`[${new Date().toISOString()}] ${alert}`);
      console.warn('🚨', alert);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        console.log('🗑️ Forced garbage collection');
      }

      // Clear cache if memory is critical
      if (stats.utilization > 0.9) {
        cache.clear();
        console.log('🧹 Cleared memory cache due to critical memory usage');
      }
    }

    // Keep only recent alerts
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(-50);
    }
  }

  private startMonitoring(): void {
    // Monitor every 30 seconds
    setInterval(() => {
      const stats = this.getMemoryStats();
      this.stats.push(stats);

      // Keep only recent history
      if (this.stats.length > this.maxHistory) {
        this.stats = this.stats.slice(-this.maxHistory);
      }

      this.checkMemoryThresholds(stats);
    }, 30000);

    // Log initial memory stats
    const initialStats = this.getMemoryStats();
    console.log(`📊 Memory Monitor Started - Heap Limit: ${this.heapLimitMB}MB, Current Usage: ${initialStats.heapUsed.toFixed(1)}MB`);
  }

  // Public methods for external monitoring
  getCurrentStats(): MemoryStats {
    return this.getMemoryStats();
  }

  getMemoryHistory(hours: number = 1): MemoryStats[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.stats.filter(stat => stat.timestamp > cutoff);
  }

  getAlerts(): string[] {
    return [...this.alerts];
  }

  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    message: string;
    stats: MemoryStats;
  } {
    const stats = this.getMemoryStats();
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    let message = 'Memory usage is normal';

    if (stats.utilization > 0.9) {
      status = 'critical';
      message = `Critical memory usage: ${(stats.utilization * 100).toFixed(1)}% of heap limit`;
    } else if (stats.utilization > 0.8) {
      status = 'warning';
      message = `High memory usage: ${(stats.utilization * 100).toFixed(1)}% of heap limit`;
    }

    return { status, message, stats };
  }

  // Force cleanup for large data processing
  forceCleanup(): void {
    if (global.gc) {
      global.gc();
    }
    cache.clear();
    console.log('🧹 Memory cleanup performed');
  }
}

// Global memory monitor instance
export const memoryMonitor = new MemoryMonitor();

// Export for use in API routes
export function logMemoryUsage(endpoint: string): void {
  const stats = memoryMonitor.getCurrentStats();
  console.log(`📈 ${endpoint} - Memory: ${stats.heapUsed.toFixed(1)}MB used, ${(stats.utilization * 100).toFixed(1)}% utilization`);
}

// Export for health check endpoint
export function getMemoryHealth() {
  return memoryMonitor.getHealthStatus();
}
