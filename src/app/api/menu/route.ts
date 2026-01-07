import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { cache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache';

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
