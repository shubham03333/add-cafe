import { db } from './db';
import { cache } from './cache';

export async function adjustMenuStock(
  adjustments: Array<{ id: number; quantity: number; action: 'add' | 'subtract' }>
) {
  if (!db) {
    throw new Error('Database connection not initialized');
  }
  if (!Array.isArray(adjustments) || adjustments.length === 0) {
    return;
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    for (const adjustment of adjustments) {
      const { id, quantity, action } = adjustment;
      if (!id || !quantity || !action) {
        throw new Error('Each adjustment must have id, quantity, and action');
      }
      if (action !== 'add' && action !== 'subtract') {
        throw new Error('Action must be either "add" or "subtract"');
      }

      const adjustmentValue = action === 'add' ? quantity : -quantity;
      await connection.query(
        'UPDATE menu_items SET stock_quantity = GREATEST(0, stock_quantity + ?), last_restocked = NOW() WHERE id = ?',
        [adjustmentValue, id]
      );
    }

    await connection.commit();
    cache.delete('inventory_full_data');
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
