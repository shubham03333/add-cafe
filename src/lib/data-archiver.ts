import { executeQuery } from './db';

// Data archiving utility for production performance optimization
// Moves old data to separate tables to reduce active database size

interface ArchiveStats {
  ordersArchived: number;
  salesDataArchived: number;
  spaceSaved: string;
  duration: number;
}

class DataArchiver {
  private readonly orderArchiveThresholdDays = 180; // 6 months
  private readonly salesDataArchiveThresholdDays = 365; // 1 year

  // Archive old orders (>6 months) to separate table
  async archiveOldOrders(): Promise<{ archived: number; errors: string[] }> {
    const errors: string[] = [];
    let archived = 0;

    try {
      // Create archive table if it doesn't exist
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS orders_archive LIKE orders
      `);

      // Move old orders to archive
      const archiveDate = new Date();
      archiveDate.setDate(archiveDate.getDate() - this.orderArchiveThresholdDays);

      const result = await executeQuery(`
        INSERT INTO orders_archive
        SELECT * FROM orders
        WHERE order_time < ?
          AND status IN ('served', 'cancelled')
          AND payment_status IN ('paid', 'refunded')
      `, [archiveDate.toISOString().split('T')[0]]) as any;

      archived = result.affectedRows;

      // Delete archived orders from main table
      if (archived > 0) {
        await executeQuery(`
          DELETE FROM orders
          WHERE order_time < ?
            AND status IN ('served', 'cancelled')
            AND payment_status IN ('paid', 'refunded')
        `, [archiveDate.toISOString().split('T')[0]]);
      }

    } catch (error) {
      errors.push(`Order archiving failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { archived, errors };
  }

  // Archive old daily sales data (>1 year)
  async archiveOldSalesData(): Promise<{ archived: number; errors: string[] }> {
    const errors: string[] = [];
    let archived = 0;

    try {
      // Create archive table if it doesn't exist
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS daily_sales_archive (
          id INT PRIMARY KEY AUTO_INCREMENT,
          date DATE NOT NULL,
          total_revenue DECIMAL(10,2) DEFAULT 0,
          total_orders INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY unique_date (date)
        )
      `);

      // Move old sales data to archive
      const archiveDate = new Date();
      archiveDate.setDate(archiveDate.getDate() - this.salesDataArchiveThresholdDays);

      // First, get the data to archive
      const oldSalesData = await executeQuery(`
        SELECT
          DATE(order_time) as date,
          SUM(total) as total_revenue,
          COUNT(*) as total_orders
        FROM orders
        WHERE order_time < ?
          AND payment_status = 'paid'
        GROUP BY DATE(order_time)
      `, [archiveDate.toISOString().split('T')[0]]) as any[];

      // Insert into archive
      if (oldSalesData.length > 0) {
        const values = oldSalesData.map(row => [
          row.date,
          row.total_revenue,
          row.total_orders
        ]);

        const result = await executeQuery(`
          INSERT INTO daily_sales_archive (date, total_revenue, total_orders)
          VALUES ${values.map(() => '(?, ?, ?)').join(', ')}
          ON DUPLICATE KEY UPDATE
            total_revenue = VALUES(total_revenue),
            total_orders = VALUES(total_orders)
        `, values.flat()) as any;

        archived = result.affectedRows;
      }

    } catch (error) {
      errors.push(`Sales data archiving failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { archived, errors };
  }

  // Compress archived data (if supported by MySQL version)
  async compressArchivedData(): Promise<{ compressed: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Check if compression is supported
      const [versionResult] = await executeQuery('SELECT VERSION() as version') as any[];
      const version = versionResult[0].version;

      // MySQL 8.0+ supports compression
      if (version.includes('8.0') || version.includes('8.1') || version.includes('8.2')) {
        // Compress archive tables
        await executeQuery('OPTIMIZE TABLE orders_archive ROW_FORMAT=COMPRESSED');
        await executeQuery('OPTIMIZE TABLE daily_sales_archive ROW_FORMAT=COMPRESSED');

        return { compressed: true, errors };
      } else {
        // For older versions, just optimize
        await executeQuery('OPTIMIZE TABLE orders_archive');
        await executeQuery('OPTIMIZE TABLE daily_sales_archive');

        return { compressed: false, errors };
      }
    } catch (error) {
      errors.push(`Data compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { compressed: false, errors };
    }
  }

  // Get archive statistics
  async getArchiveStats(): Promise<{
    ordersActive: number;
    ordersArchived: number;
    salesDataActive: number;
    salesDataArchived: number;
    archiveSize: string;
  }> {
    try {
      // Get active orders count
      const [activeOrders] = await executeQuery('SELECT COUNT(*) as count FROM orders') as any[];
      const ordersActive = activeOrders[0].count;

      // Get archived orders count
      const [archivedOrders] = await executeQuery('SELECT COUNT(*) as count FROM orders_archive') as any[];
      const ordersArchived = archivedOrders[0]?.count || 0;

      // Get active sales data (last 365 days)
      const oneYearAgo = new Date();
      oneYearAgo.setDate(oneYearAgo.getDate() - 365);

      const [activeSales] = await executeQuery(`
        SELECT COUNT(DISTINCT DATE(order_time)) as count
        FROM orders
        WHERE order_time >= ?
      `, [oneYearAgo.toISOString().split('T')[0]]) as any[];
      const salesDataActive = activeSales[0].count;

      // Get archived sales data count
      const [archivedSales] = await executeQuery('SELECT COUNT(*) as count FROM daily_sales_archive') as any[];
      const salesDataArchived = archivedSales[0]?.count || 0;

      // Estimate archive size
      const [archiveSizeResult] = await executeQuery(`
        SELECT
          ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) as size_mb
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_name IN ('orders_archive', 'daily_sales_archive')
      `) as any[];
      const archiveSize = `${archiveSizeResult[0]?.size_mb || 0} MB`;

      return {
        ordersActive,
        ordersArchived,
        salesDataActive,
        salesDataArchived,
        archiveSize
      };
    } catch (error) {
      console.error('Failed to get archive stats:', error);
      return {
        ordersActive: 0,
        ordersArchived: 0,
        salesDataActive: 0,
        salesDataArchived: 0,
        archiveSize: '0 MB'
      };
    }
  }

  // Run full archiving process
  async runFullArchive(): Promise<ArchiveStats> {
    const startTime = Date.now();
    console.log('🗃️ Starting data archiving process...');

    // Archive old orders
    const orderResult = await this.archiveOldOrders();
    console.log(`📦 Archived ${orderResult.archived} old orders`);

    // Archive old sales data
    const salesResult = await this.archiveOldSalesData();
    console.log(`📊 Archived ${salesResult.archived} days of sales data`);

    // Compress archived data
    const compressionResult = await this.compressArchivedData();
    if (compressionResult.compressed) {
      console.log('🗜️ Compressed archived data');
    }

    const duration = Date.now() - startTime;
    const stats = await this.getArchiveStats();

    const result: ArchiveStats = {
      ordersArchived: orderResult.archived,
      salesDataArchived: salesResult.archived,
      spaceSaved: stats.archiveSize,
      duration
    };

    console.log(`✅ Archiving completed in ${duration}ms`);
    console.log(`📈 Space saved: ${stats.archiveSize}`);

    return result;
  }

  // Cleanup corrupted or invalid archived data
  async cleanupInvalidData(): Promise<{ cleaned: number; errors: string[] }> {
    const errors: string[] = [];
    let cleaned = 0;

    try {
      // Remove orders with invalid JSON
      const [invalidOrders] = await executeQuery(`
        DELETE FROM orders_archive
        WHERE JSON_VALID(items) = 0 OR items IS NULL
      `) as any[];
      cleaned += invalidOrders.affectedRows;

      // Remove duplicate archived sales data
      const [duplicateSales] = await executeQuery(`
        DELETE t1 FROM daily_sales_archive t1
        INNER JOIN daily_sales_archive t2
        WHERE t1.id > t2.id AND t1.date = t2.date
      `) as any[];
      cleaned += duplicateSales.affectedRows;

    } catch (error) {
      errors.push(`Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { cleaned, errors };
  }
}

// Global data archiver instance
export const dataArchiver = new DataArchiver();

// Export for scheduled execution
export async function runScheduledArchiving() {
  try {
    const result = await dataArchiver.runFullArchive();
    console.log('Scheduled archiving completed:', result);
    return result;
  } catch (error) {
    console.error('Scheduled archiving failed:', error);
    throw error;
  }
}
