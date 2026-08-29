import { NextRequest, NextResponse } from 'next/server';
import { db, executeQuery } from '@/lib/db';
import { cache, CACHE_TTL } from '@/lib/cache';
import { adjustMenuStock } from '@/lib/stock';

const INVENTORY_CACHE_KEY = 'inventory_full_data';

// GET /api/inventory - Get all inventory items with stock information
export async function GET(request: NextRequest) {
  try {
    if (!db) {
      throw new Error('Database connection not initialized');
    }

    // Try to get from cache first
    const cacheKey = INVENTORY_CACHE_KEY;
    let inventoryData = cache.get(cacheKey);

    if (!inventoryData) {
      inventoryData = await executeQuery(`
        SELECT
          mi.id, mi.name, mi.price, mi.is_available, mi.category, mi.position,
          mi.stock_quantity, mi.low_stock_threshold, mi.unit_type,
          mi.ingredients, mi.supplier_info, mi.last_restocked,
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'id', drm.id,
              'dish_id', drm.dish_id,
              'raw_material_id', drm.raw_material_id,
              'quantity_required', drm.quantity_required,
              'raw_material', JSON_OBJECT(
                'id', rm.id,
                'name', rm.name,
                'unit_type', rm.unit_type,
                'current_stock', rm.current_stock,
                'min_stock_level', rm.min_stock_level
              )
            )
          ) as raw_materials
        FROM menu_items mi
        LEFT JOIN dish_raw_materials drm ON mi.id = drm.dish_id
        LEFT JOIN raw_materials rm ON drm.raw_material_id = rm.id
        GROUP BY mi.id
        ORDER BY mi.category, mi.position
      `);

      cache.set(cacheKey, inventoryData, CACHE_TTL.INVENTORY);
    }

    return NextResponse.json(inventoryData);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}

// POST /api/inventory - Update stock quantities directly
export async function POST(request: NextRequest) {
  try {
    if (!db) {
      throw new Error('Database connection not initialized');
    }

    const updates = await request.json();

    if (!Array.isArray(updates)) {
      return NextResponse.json(
        { error: 'Request body must be an array of updates' },
        { status: 400 }
      );
    }

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      for (const update of updates) {
        const { id, stock_quantity } = update;

        if (!id || stock_quantity === undefined) {
          throw new Error('Each update must have id and stock_quantity');
        }

        await connection.execute(
          'UPDATE menu_items SET stock_quantity = ?, last_restocked = NOW() WHERE id = ?',
          [Math.max(0, stock_quantity), id]
        );
      }

      await connection.commit();

      // Clear cache
      cache.delete(INVENTORY_CACHE_KEY);

      return NextResponse.json({ success: true });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating inventory:', error);
    return NextResponse.json(
      { error: 'Failed to update inventory' },
      { status: 500 }
    );
  }
}

// PATCH /api/inventory - Adjust stock quantities (add/subtract)
export async function PATCH(request: NextRequest) {
  try {
    if (!db) {
      throw new Error('Database connection not initialized');
    }

    const adjustments = await request.json();

    if (!Array.isArray(adjustments)) {
      return NextResponse.json(
        { error: 'Request body must be an array of adjustments' },
        { status: 400 }
      );
    }

    await adjustMenuStock(adjustments);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adjusting inventory:', error);
    return NextResponse.json(
      { error: 'Failed to adjust inventory' },
      { status: 500 }
    );
  }
}
