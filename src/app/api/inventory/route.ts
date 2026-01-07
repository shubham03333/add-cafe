import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache } from '@/lib/cache';

// GET /api/inventory - Get all inventory items with stock information
export async function GET(request: NextRequest) {
  try {
    if (!db) {
      throw new Error('Database connection not initialized');
    }

    // Try to get from cache first
    const cacheKey = 'inventory_full_data';
    let inventoryData = cache.get(cacheKey);

    if (!inventoryData) {
      const connection = await db.getConnection();

      // Get all menu items with inventory data and raw materials
      const [items] = await connection.execute(`
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

      connection.release();

      inventoryData = items;
      // Cache for 5 minutes (inventory changes less frequently)
      cache.set(cacheKey, inventoryData, 5 * 60 * 1000);
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
