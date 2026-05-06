import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import dotenv from "dotenv";
import fs from "fs";
import bcrypt from "bcryptjs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3070;

  // Listen immediately so we can respond to health checks while DB is initializing
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] Ready on http://0.0.0.0:${PORT}`);
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("[SERVER ERROR]", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  });

  // Database setup
  let connectionString = process.env.PRIVATE_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.warn("DATABASE_URL is not set. Please provide it via environment variables.");
  }

  if (connectionString) {
    try {
      const url = new URL(connectionString.startsWith('postgres') ? connectionString : `postgres://${connectionString}`);
      const maskedPwd = url.password ? url.password.substring(0, 3) + "..." : "none";
      console.log(`[DB] Attempting connection to ${url.hostname}:${url.port} as user "${url.username}" with password starting with "${maskedPwd}"`);
    } catch (e) {
      console.error("[DB] Invalid connection string format");
    }
  }

  const pool = new Pool({
    connectionString,
    ssl: connectionString?.includes('sslmode=require') ? { rejectUnauthorized: false } : false
  });

  // Initialize database (non-blocking)
  (async () => {
    try {
      // Test connection
      const client = await pool.connect();
      console.log("Successfully connected to PostgreSQL");
      client.release();

      const schema = fs.readFileSync(path.join(process.cwd(), 'schema.sql'), 'utf8');
      await pool.query(schema);
      
      // Ensure password column exists (migration)
      try {
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT");
        
        // Products migrations
        await pool.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS buying_price_per_carton NUMERIC DEFAULT 0");
        await pool.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS margin NUMERIC DEFAULT 0");
        await pool.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS wholesale_margin NUMERIC DEFAULT 0");
        await pool.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS num_cartons INTEGER DEFAULT 0");
        await pool.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_level INTEGER DEFAULT 10");
        await pool.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS image TEXT");
        await pool.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS discount TEXT");
        await pool.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS expiry_date TEXT");
        await pool.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS batch_number TEXT");
        await pool.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT");
        await pool.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS alcohol_level TEXT");
        
        // Orders migrations
        await pool.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS transport_cost NUMERIC DEFAULT 0");
        await pool.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0");
        await pool.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_type TEXT");
        await pool.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS vehicle TEXT");
        
        // Vendors migrations
        await pool.query("ALTER TABLE vendors ADD COLUMN IF NOT EXISTS city_state TEXT");
        await pool.query("ALTER TABLE vendors ADD COLUMN IF NOT EXISTS postal_code TEXT");
        
        // Handle min_stock_level to reorder_level migration if needed
        try {
          await pool.query("UPDATE products SET reorder_level = min_stock_level WHERE reorder_level = 10 AND min_stock_level IS NOT NULL");
        } catch (e) { /* ignore if min_stock_level doesn't exist */ }

        // Handle image_url to image migration if needed
        try {
          await pool.query("UPDATE products SET image = image_url WHERE image IS NULL AND image_url IS NOT NULL");
        } catch (e) { /* ignore if image_url doesn't exist */ }

        // Add featured boolean flag
        await pool.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE");

      } catch (e) {
        console.error("Migration error:", e);
      }
      
      console.log("Database initialized successfully");
    } catch (err: any) {
      console.error("CRITICAL: Database initialization failed!");
      console.error(`Error details: ${err.message}`);
    }
  })();

  // Log all API requests
  app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
      console.log(`[API] ${req.method} ${req.url}`);
    }
    next();
  });

  // DB error handler
  pool.on('error', (err) => {
    console.error('Unexpected error on idle database client', err);
  });

  // Auth Endpoint
  app.post("/api/login", async (req, res) => {
    const { email, phone, password } = req.body;
    console.log(`[AUTH] Received login request: email=${email}, phone=${phone}, password=${password ? '***' : 'missing'}`);
    try {
      const identifier = phone || email;
      const result = await pool.query("SELECT * FROM users WHERE email = $1 OR phone = $1", [identifier]);
      const user = result.rows[0];
      
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      
      if (user.password) {
        // Try bcrypt
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return res.status(401).json({ error: "Invalid password" });
        }
      }
      
      res.json(user);
    } catch (err: any) {
      console.error("Login error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Helper for generic CRUD
  const toCamel = (str: string) => str.replace(/([-_][a-z])/g, group => group.toUpperCase().replace('-', '').replace('_', ''));

  const mapKeys = (obj: any): any => {
    if (Array.isArray(obj)) return obj.map(mapKeys);
    if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
      return Object.keys(obj).reduce((acc, key) => {
        acc[toCamel(key)] = mapKeys(obj[key]);
        return acc;
      }, {} as any);
    }
    return obj;
  };

  const handleQuery = async (res: express.Response, query: string, params: any[] = []) => {
    try {
      const result = await pool.query(query, params);
      res.json(mapKeys(result.rows));
    } catch (err: any) {
      console.error("DB Error:", err);
      let message = err.message;
      if (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN') {
        message = `Database connection failed: Could not resolve hostname "${err.hostname || 'unknown'}". Please check your DATABASE_URL in Settings.`;
      } else if (err.code === 'ECONNREFUSED') {
        message = `Database connection refused. Please check if your database is running and accessible.`;
      }
      res.status(500).json({ error: message, code: err.code });
    }
  };

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", database: !!connectionString });
  });

  // SSE Clients
  const clients = new Set<express.Response>();

  const broadcastUpdate = (entity?: string) => {
    console.log(`[SSE] Broadcasting update for ${entity || 'unknown entity'}`);
    const deadClients = new Set<express.Response>();
    clients.forEach(client => {
      try {
        client.write(`data: ${JSON.stringify({ type: 'update', entity })}\n\n`);
      } catch (err) {
        deadClients.add(client);
      }
    });
    deadClients.forEach(c => clients.delete(c));
  };

  app.get('/api/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    clients.add(res);

    req.on('close', () => {
      clients.delete(res);
    });
  });

  // Database Inspection Endpoint
  app.get("/api/inspect-users", async (req, res) => {
    try {
      const result = await pool.query("SELECT uid, email, phone, role FROM users");
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/inspect-tables", async (req, res) => {
    try {
      const result = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Generic CRUD Endpoints
  const entities = [
    'users', 'products', 'customers', 'vendors', 
    'expenses', 'orders', 'sales', 'purchase_orders', 'inventory_adjustments'
  ];

  entities.forEach(entity => {
    const table = entity;
    
    // List
    app.get(`/api/${entity}`, async (req, res) => {
      const companyId = req.query.companyId;
      if (entity === 'users') {
        const uid = req.query.uid;
        if (uid) return handleQuery(res, `SELECT * FROM ${table} WHERE uid = $1`, [uid]);
        return handleQuery(res, `SELECT * FROM ${table}`);
      }
      
      const queryParams = { ...req.query };
      delete queryParams.companyId;
      
      let sql = `SELECT * FROM ${table}`;
      const values: string[] = [];
      let whereAdded = false;

      if (companyId) {
        sql += ` WHERE company_id = $1`;
        values.push(companyId as string);
        whereAdded = true;
      }
      
      Object.entries(queryParams).forEach(([key, val], index) => {
        const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        if (!whereAdded && index === 0) {
           sql += ` WHERE ${dbKey} = $1`;
           whereAdded = true;
        } else {
           sql += ` AND ${dbKey} = $${values.length + 1}`;
        }
        values.push(val as string);
      });
      
      // Order by created_at descending if it exists (assuming it doesn't break, else just id or none)
      // For now, keep it simple
      handleQuery(res, sql, values);
    });

    // Get One
    app.get(`/api/${entity}/:id`, async (req, res) => {
      const idField = entity === 'users' ? 'uid' : 'id';
      handleQuery(res, `SELECT * FROM ${table} WHERE ${idField} = $1`, [req.params.id]);
    });

    // Create/Update (Upsert)
    app.post(`/api/${entity}`, async (req, res) => {
      const data = { ...req.body };
      
      // Hash password for users
      if (entity === 'users' && data.password) {
        // Only hash if it's not already a hash (basic check)
        if (!data.password.startsWith('$2a$') && !data.password.startsWith('$2b$')) {
          data.password = await bcrypt.hash(data.password, 10);
        }
      }

      const cleanData: any = {};
      for (const key in data) {
        const snakeKey = key.includes('_') ? key : key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        cleanData[snakeKey] = data[key];
      }

      const keys = Object.keys(cleanData);
      const values = Object.values(cleanData).map(val => 
        (typeof val === 'object' && val !== null) ? JSON.stringify(val) : val
      );
      const idField = entity === 'users' ? 'uid' : 'id';
      
      const columns = keys.join(', ');
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const updates = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');

      const query = `
        INSERT INTO ${table} (${columns}) 
        VALUES (${placeholders}) 
        ON CONFLICT (${idField}) 
        DO UPDATE SET ${updates}
        RETURNING *
      `;
      
      try {
        const result = await pool.query(query, values);
        res.json(mapKeys(result.rows[0]));
        broadcastUpdate(entity);
      } catch (err: any) {
        console.error(`Error upserting ${entity}:`, err);
        let message = err.message;
        if (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN') {
          message = `Database connection failed: Could not resolve hostname "${err.hostname || 'unknown'}". Please check your DATABASE_URL in Settings.`;
        }
        res.status(500).json({ error: message, code: err.code });
      }
    });

    // Delete
    app.delete(`/api/${entity}/:id`, async (req, res) => {
      const idField = entity === 'users' ? 'uid' : 'id';
      try {
        const result = await pool.query(`DELETE FROM ${table} WHERE ${idField} = $1 RETURNING *`, [req.params.id]);
        res.json(mapKeys(result.rows));
        broadcastUpdate(entity);
      } catch (err: any) {
        console.error("DB Error:", err);
        res.status(500).json({ error: err.message, code: err.code });
      }
    });
  });

  // Catch-all for undefined API routes to return JSON instead of HTML
  app.all('/api/*', (req, res) => {
    console.warn(`[API] Unhandled route: ${req.method} ${req.url}`);
    res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
  });

  // Vite middleware for development
  // Always serve public directory for static assets (ads, images, etc.)
  const publicPath = path.join(process.cwd(), 'public');
  app.use(express.static(publicPath));

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

startServer();
