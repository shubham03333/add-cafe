import { NextRequest } from 'next/server';
import { executeQuery } from '@/lib/db';
import fs from 'fs';
import path from 'path';

type PrintCommand = {
  type: number;       // 0 = text
  content: string;
  bold?: number;
  align?: number;     // 0 left, 1 center, 2 right
  format?: number;   // optional
};

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const orderId = params.id;

  // 1️⃣ Fetch order
  const orderRows = await executeQuery(
    'SELECT order_number, order_time, total, items FROM orders WHERE id = ?',
    [orderId]
  ) as any[];

  if (!orderRows || orderRows.length === 0) {
    return new Response(
      JSON.stringify({ "0": { type: 0, content: "Order not found" } }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  const order = orderRows[0];

  // 2️⃣ Parse items safely
  let items: any[] = [];
  try {
    items = typeof order.items === 'string'
      ? JSON.parse(order.items)
      : order.items;
  } catch {
    items = [];
  }

  // 3️⃣ Build print commands dynamically
  const commands: PrintCommand[] = [];

  // Add header text (printer doesn't support images)
  commands.push({
    type: 0,
    content: 'ADDA CAFE',
    bold: 1,
    align: 1,
    format: 2
  });

  // commands.push({
  //   type: 0,
  //   content: 'Adda Cafe',
  //   bold: 1,
  //   align: 1,
  //   format: 2
  // });

  commands.push({
    type: 0,
    content: `Order #${order.order_number}`,
    align: 1
  });

  commands.push({
    type: 0,
    content: new Date().toLocaleString(),
    align: 1
  });

  commands.push({
    type: 0,
    content: '------------------------------',
    align: 0
  });

  // Define fixed width for thermal printer (typically 32 characters)
  const LINE_WIDTH = 32;

  items.forEach((item) => {
    const itemText = `${item.quantity}x ${item.name}`;
    const priceText = `₹${item.price * item.quantity}`;

    // Ensure item text doesn't exceed available space for prices
    const maxItemLength = LINE_WIDTH - priceText.length - 1; // -1 for space
    const truncatedItemText = itemText.length > maxItemLength
      ? itemText.substring(0, maxItemLength - 3) + '...'
      : itemText;

    // Create line with item text left-aligned and price right-aligned
    const spaces = LINE_WIDTH - truncatedItemText.length - priceText.length;
    const line = truncatedItemText + ' '.repeat(Math.max(1, spaces)) + priceText;

    commands.push({
      type: 0,
      content: line,
      align: 0
    });
  });

  commands.push({
    type: 0,
    content: '------------------------------',
    align: 0
  });

  commands.push({
    type: 0,
    content: `TOTAL ₹${Number(order.total).toFixed(2)}`,
    bold: 1,
    align: 2,
    format: 2
  });

  commands.push({
    type: 0,
    content: 'Thank you! Visit again',
    align: 1
  });

  // 4️⃣ Convert ARRAY → OBJECT (THIS IS THE MAGIC)
  const printerJson: Record<string, PrintCommand> = {};
  commands.forEach((cmd, index) => {
    printerJson[index.toString()] = cmd;
  });

  // 5️⃣ Return RAW JSON (no wrappers)
  return new Response(JSON.stringify(printerJson), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  });
}
