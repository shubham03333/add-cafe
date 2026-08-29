import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { cache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const availableOnly = searchParams.get('availableOnly') === 'true';

    let cacheKey = CACHE_KEYS.MENU_ITEMS;
    if (category) {
      cacheKey = CACHE_KEYS.MENU_ITEMS_BY_CATEGORY(category);
    }
    if (availableOnly) {
      cacheKey += '_available';
    }

    let menuItems = cache.get(cacheKey);
    if (!menuItems) {
      let query = `SELECT id, name, price, is_available, category, position, stock_quantity, unit_type
                   FROM menu_items WHERE 1=1`;
      const params: any[] = [];

      if (category) {
        query += ' AND category = ?';
        params.push(category);
      }

      if (availableOnly) {
        query += ' AND is_available = 1';
      }

      query += ' ORDER BY position ASC';

      menuItems = await executeQuery(query, params);
      cache.set(cacheKey, menuItems, CACHE_TTL.MENU_ITEMS);
    }

    return NextResponse.json(menuItems, {
      headers: {
        'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('Error fetching menu items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch menu items' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, price, category, is_available = true } = body;

    if (!name || !name.trim() || price == null || price <= 0 || !category || !category.trim()) {
      return NextResponse.json(
        { error: 'Name, price (must be greater than 0), and category are required' },
        { status: 400 }
      );
    }

    const positionQuery = 'SELECT COALESCE(MAX(position), 0) + 1 as next_position FROM menu_items';
    const positionResult = await executeQuery(positionQuery) as any[];
    const nextPosition = positionResult[0].next_position;

    const insertQuery = `
      INSERT INTO menu_items (name, price, category, is_available, position, created_at)
      VALUES (?, ?, ?, ?, ?, NOW())
    `;
    const result = await executeQuery(insertQuery, [name, price, category, is_available, nextPosition]) as any;

    cache.deleteByPrefix('menu_items');

    return NextResponse.json(
      {
        id: result.insertId,
        name,
        price,
        category,
        is_available,
        position: nextPosition,
        message: 'Menu item created successfully'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating menu item:', error);
    return NextResponse.json(
      { error: 'Failed to create menu item' },
      { status: 500 }
    );
  }
}
