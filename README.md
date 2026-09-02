This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Environment Setup

### Database Configuration

This application requires a PlanetScale MySQL database. You can set up your database connection using either:

1. **DATABASE_URL** (recommended):
   ```bash
   DATABASE_URL=mysql://username:password@host/database?ssl={"rejectUnauthorized":true}
   ```

2. **Individual connection parameters**:
   ```bash
   DB_HOST=your-database-host
   DB_USERNAME=your-database-username
   DB_PASSWORD=your-database-password
   DB_NAME=your-database-name
   ```

Copy `.env.example` to `.env.local` and update the values with your actual database credentials.

### Catalog integration (Phase 1)

Service-to-service API for the digital catalog. Does not change waiter, chef, or admin screens.

1. Set `INTEGRATION_API_KEY`, `INTEGRATION_WEBHOOK_SECRET`, and optionally `CATALOG_WEBHOOK_URL` in `.env.local` / Vercel.
2. Run `scripts/add-integration-columns.sql` on TiDB (manual).
3. See `INTEGRATION.md` for auth, idempotency, webhooks, and rollback.
4. Smoke test: `INTEGRATION_API_KEY=... npm run test:integration`

### Database Schema

The application requires the following tables:

#### menu_items table
```sql
CREATE TABLE menu_items (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category VARCHAR(100) NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### orders table
```sql
CREATE TABLE orders (
  id VARCHAR(36) PRIMARY KEY,
  order_number VARCHAR(50) NOT NULL,
  items JSON NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status ENUM('pending', 'preparing', 'ready', 'served') DEFAULT 'pending',
  order_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### daily_sales table
```sql
CREATE TABLE daily_sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sale_date DATE NOT NULL UNIQUE,
  total_orders INT DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Vercel Deployment

For Vercel deployment, set the environment variable in your Vercel project settings:
- `DATABASE_URL`: Your PlanetScale database connection string

The `vercel.json` file is configured to use `@database-url` which should be set up in your Vercel environment variables.


final version 23AUG 25 mysql> show tables;
+------------------------+
| Tables_in_cafe_node_db |
+------------------------+
| daily_sales            |
| menu_items             |
| orders                 |
| sales_history          |
+------------------------+
4 rows in set (0.00 sec)


mysql> desc daily_sales;
+---------------+---------------+------+-----+-------------------+-----------------------------------------------+
| Field         | Type          | Null | Key | Default           | Extra                                         |
+---------------+---------------+------+-----+-------------------+-----------------------------------------------+
| id            | int           | NO   | PRI | NULL              | auto_increment                                |
| sale_date     | date          | NO   | UNI | NULL              |                                               |
| total_orders  | int           | YES  |     | 0                 |                                               |
| total_revenue | decimal(12,2) | YES  |     | 0.00              |                                               |
| updated_at    | timestamp     | YES  |     | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |
+---------------+---------------+------+-----+-------------------+-----------------------------------------------+
5 rows in set (0.00 sec)

mysql> desc menu_items;
+--------------+--------------+------+-----+-------------------+-------------------+
| Field        | Type         | Null | Key | Default           | Extra             |
+--------------+--------------+------+-----+-------------------+-------------------+
| id           | int          | NO   | PRI | NULL              | auto_increment    |
| name         | varchar(250) | NO   |     | NULL              |                   |
| price        | decimal(8,2) | NO   |     | NULL              |                   |
| is_available | tinyint(1)   | YES  | MUL | 1                 |                   |
| category     | varchar(50)  | YES  | MUL | NULL              |                   |
| created_at   | timestamp    | YES  |     | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
+--------------+--------------+------+-----+-------------------+-------------------+
6 rows in set (0.01 sec)

mysql> desc orders;
+--------------+----------------------------------------------------------+------+-----+-------------------+-----------------------------------------------+
| Field        | Type                                                     | Null | Key | Default           | Extra                                         |
+--------------+----------------------------------------------------------+------+-----+-------------------+-----------------------------------------------+
| id           | varchar(36)                                              | NO   | PRI | NULL              |                                               |
| order_number | varchar(10)                                              | NO   |     | NULL              |                                               |
| items        | json                                                     | NO   |     | NULL              |                                               |
| total        | decimal(10,2)                                            | NO   |     | NULL              |                                               |
| status       | enum('pending','preparing','ready','served','cancelled') | YES  | MUL | pending           |                                               |
| order_time   | timestamp                                                | YES  | MUL | CURRENT_TIMESTAMP | DEFAULT_GENERATED                             |
| updated_time | timestamp                                                | YES  |     | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |
+--------------+----------------------------------------------------------+------+-----+-------------------+-----------------------------------------------+
7 rows in set (0.00 sec)

mysql> desc sales_history;
+---------------+---------------+------+-----+-------------------+-------------------+
| Field         | Type          | Null | Key | Default           | Extra             |
+---------------+---------------+------+-----+-------------------+-------------------+
| id            | int           | NO   | PRI | NULL              | auto_increment    |
| sale_date     | date          | NO   | MUL | NULL              |                   |
| total_orders  | int           | NO   |     | NULL              |                   |
| total_revenue | decimal(12,2) | NO   |     | NULL              |                   |
| archived_at   | timestamp     | YES  |     | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
+---------------+---------------+------+-----+-------------------+-------------------+
5 rows in set (0.01 sec)

mysql>


SHOW CREATE TABLE daily_sales;



set the timezone of mysql db to resolve the bug 
SET time_zone = '+05:30'; SELECT NOW();

mysql> SET GLOBAL time_zone = '+05:30';
Query OK, 0 rows affected (0.00 sec)

mysql>
mysql>
mysql> commit;
Query OK, 0 rows affected (0.00 sec)

mysql>


UPDATE daily_sales SET total_orders = 20, total_revenue = 724.00 WHERE sale_date = '2025-08-25';