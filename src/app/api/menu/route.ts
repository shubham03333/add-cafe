import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { cache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const availableOnly = searchParams.get('availableOnly') === 'true';

    // Generate cache key based on parameters
    let cacheKey = CACHE_KEYS.MENU_ITEMS;
    if (category) {
      cacheKey = CACHE_KEYS.MENU_ITEMS_BY_CATEGORY(category);
    }
    if (availableOnly) {
      cacheKey += '_available';
    }

    // Try to get from cache first
    let menuItems = cache.get(cacheKey);
    if (!menuItems) {
      // Build query based on parameters
      let query = 'SELECT * FROM menu_items WHERE 1=1';
      const params: any[] = [];

      if (category) {
        query += ' AND category = ?';
        params.push(category);
      }

      if (availableOnly) {
        query += ' AND is_available = 1';
      }

      query += ' ORDER BY position ASC';

      // Execute query and cache result
      menuItems = await executeQuery(query, params);
      cache.set(cacheKey, menuItems, CACHE_TTL.MENU_ITEMS * 1000); // Convert to milliseconds
    }

    return NextResponse.json(menuItems);
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

    // Validate required fields
    if (!name || !name.trim() || price == null || price <= 0 || !category || !category.trim()) {
      return NextResponse.json(
        { error: 'Name, price (must be greater than 0), and category are required' },
        { status: 400 }
      );
    }

    // Get the next position
    const positionQuery = 'SELECT COALESCE(MAX(position), 0) + 1 as next_position FROM menu_items';
    const positionResult = await executeQuery(positionQuery) as any[];
    const nextPosition = positionResult[0].next_position;

    // Insert new menu item
    const insertQuery = `
      INSERT INTO menu_items (name, price, category, is_available, position, created_at)
      VALUES (?, ?, ?, ?, ?, NOW())
    `;
    const insertParams = [name, price, category, is_available, nextPosition];

    const result = await executeQuery(insertQuery, insertParams) as any;

    // Clear cache after adding new item
    cache.clear();

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
