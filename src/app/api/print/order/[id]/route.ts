import { NextRequest } from 'next/server';
import { executeQuery } from '@/lib/db';
import fs from 'fs';
import path from 'path';

type PrintCommand = {
  type: number;       // 0 = text
  content: string;
  bold?: number;
  align?: number;     // 0 = left, 1 = center, 2 = right
  format?: number;   // 0 normal, 1 double height, 2 double height+width
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;

  // 1️⃣ Fetch order from DB
  const rows = await executeQuery(
    'SELECT o.order_number, o.order_time, o.total, o.items, o.order_type, t.table_code, t.table_name FROM orders o LEFT JOIN tables_master t ON o.table_id = t.id WHERE o.id = ?',
    [orderId]
  ) as any[];

  if (!rows || rows.length === 0) {
    return new Response(
      JSON.stringify({
        "0": { type: 0, content: 'Order not found', align: 1 }
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  const order = rows[0];

  // 2️⃣ Parse items safely
  let items: any[] = [];
  try {
    items = typeof order.items === 'string'
      ? JSON.parse(order.items)
      : order.items;
  } catch {
    items = [];
  }

  // 3️⃣ Prepare date + time (single line)
  const now = new Date();
  const date = now.toLocaleDateString('en-GB');
  const time = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const commands: PrintCommand[] = [];

  /* ================= LOGO ================= */

  try {
    const logoPath = path.join(process.cwd(), 'public', 'addbilllogo.png');
    const logoBuffer = fs.readFileSync(logoPath);
    const logoBase64 = logoBuffer.toString('base64');

    commands.push({
      type: 1, // Assuming type 1 is for image
      content: logoBase64,
      align: 1 // Center align
    });
  } catch (error) {
    console.error('Error loading logo:', error);
    // Continue without logo if error
  }

  /* ================= HEADER ================= */

  commands.push({
    type: 0,
    content: 'ADDA CAFE',
    bold: 1,
    align: 1,
    format: 2
  });

  commands.push({
    type: 0,
    content: '* Pure Veg * Fresh * Tasty *',
    align: 1
  });

  /* ===== ADDRESS (MOVED HERE) ===== */

  commands.push({
    type: 0,
    content: '--------------------------------',
    align: 0
  });

  commands.push({
    type: 0,
    content: 'Jagdale Complex, Tuljapur',
    align: 1
  });


  commands.push({
    type: 0,
    content: 'Ph: +91-7558379410',
    align: 1
  });

  commands.push({
    type: 0,
    content: '--------------------------------',
    align: 0
  });

  /* ================= ORDER INFO ================= */

  commands.push({
    type: 0,
    content: `Order # ${order.order_number}`,
    align: 1
  });

  commands.push({
    type: 0,
    content: `Date : ${date} : ${time}`,
    align: 1
  });

  // Add table info or order type
  if (order.order_type === 'DINE_IN' && order.table_code) {
    commands.push({
      type: 0,
      content: `Table   : ${order.table_code}`,
      align: 1
    });
  } else if (order.order_type && order.order_type !== 'DINE_IN') {
    commands.push({
      type: 0,
      content: `Type    : ${order.order_type.replace('_', ' ')}`,
      align: 1
    });
  }

  commands.push({
    type: 0,
    content: '--------------------------------',
    align: 0
  });

  /* ================= TABLE HEADER ================= */

  const header =
    'Item'.padEnd(20) +
    'Qty'.padStart(5) +
    'Amt'.padStart(7);

  commands.push({
    type: 0,
    content: header,
    bold: 1,
    align: 0
  });

  commands.push({
    type: 0,
    content: '--------------------------------',
    align: 0
  });

  /* ================= ITEMS ================= */

  items.forEach((item) => {
    const name = item.name.length > 20
      ? item.name.substring(0, 17) + '...'
      : item.name;

    const qty = String(item.quantity).padStart(5);
    const amt = (item.price * item.quantity).toFixed(2).padStart(7);

    commands.push({
      type: 0,
      content: name.padEnd(20) + qty + amt,
      align: 0
    });
  });

  /* ================= TOTAL ================= */

  commands.push({
    type: 0,
    content: '--------------------------------',
    align: 0
  });

  commands.push({
    type: 0,
    content: `TOTAL  Rs.${Number(order.total).toFixed(2)}`,
    bold: 1,
    align: 2,
    format: 2
  });

  commands.push({
    type: 0,
    content: '--------------------------------',
    align: 0
  });

  /* ================= FOOTER ================= */

  commands.push({
    type: 0,
    content: 'Thank you! Visit again :)',
    align: 1
  });

  /* ================= ARRAY → OBJECT ================= */

  const printerJson: Record<string, PrintCommand> = {};
  commands.forEach((cmd, index) => {
    printerJson[index.toString()] = cmd;
  });

  /* ================= RESPONSE ================= */

  return new Response(JSON.stringify(printerJson), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  });
}
