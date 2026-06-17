import http from "node:http";
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import pg from "pg";

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "public");
const port = Number(process.env.POS_PORT || process.env.PORT || 4310);
const connectionString =
  process.env.DATABASE_URL || "postgres://postgres:postgres@127.0.0.1:55432/hatchers_pos_mock";
const adminUsername = process.env.POS_ADMIN_USERNAME || "admin";
const adminPassword = process.env.POS_ADMIN_PASSWORD || "HatcherStore%^&0";
const sessionTtlMs = Number(process.env.POS_SESSION_TTL_MS || 1000 * 60 * 60 * 8);
const sessionCookieName = "hatcher_pos_session";
const sessions = new Map();

const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
});
const mockTaxRate = Number(process.env.MOCK_MD_TAX_RATE || 0.06);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  res.end(JSON.stringify(payload));
}

function sendError(res, status, message, detail) {
  sendJson(res, status, { error: message, detail });
}

function safeEqual(actual, expected) {
  const actualBuffer = Buffer.from(String(actual));
  const expectedBuffer = Buffer.from(String(expected));
  if (actualBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function parseCookies(req) {
  return Object.fromEntries(
    String(req.headers.cookie || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return index === -1
          ? [decodeURIComponent(part), ""]
          : [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

function secureCookie(req) {
  return req.headers["x-forwarded-proto"] === "https" || process.env.NODE_ENV === "production";
}

function sessionCookie(token, req) {
  const secure = secureCookie(req) ? "; Secure" : "";
  return `${sessionCookieName}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${Math.floor(sessionTtlMs / 1000)}${secure}`;
}

function clearSessionCookie(req) {
  const secure = secureCookie(req) ? "; Secure" : "";
  return `${sessionCookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`;
}

function getSession(req) {
  const token = parseCookies(req)[sessionCookieName];
  if (!token) return null;
  const session = sessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  session.expiresAt = Date.now() + sessionTtlMs;
  return session;
}

function sendJsonWithHeaders(res, status, payload, headers = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...headers
  });
  res.end(JSON.stringify(payload));
}

async function query(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

async function readJsonBody(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 100_000) {
      throw new Error("Request body is too large");
    }
  }
  return body ? JSON.parse(body) : {};
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function yyyymmdd(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("");
}

async function dashboard() {
  const [salesToday] = await query(`
    select
      coalesce(sum(total), 0)::numeric(12,2) as total_sales,
      count(*)::int as transaction_count
    from sales
    where status = 'completed' and completed_at::date = current_date
  `);
  const [inventory] = await query(`
    select
      coalesce(sum(quantity_on_hand * unit_cost), 0)::numeric(12,2) as inventory_value,
      count(*) filter (where quantity_on_hand <= reorder_point)::int as low_stock_count
    from inventory_balances
  `);
  const [accounts] = await query(`
    select
      coalesce(sum(current_balance), 0)::numeric(12,2) as house_account_balance,
      count(*) filter (where current_balance > 0)::int as active_house_accounts
    from house_accounts
  `);
  const tenders = await query(`
    select tender_type, coalesce(sum(amount), 0)::numeric(12,2) as amount
    from tenders
    group by tender_type
    order by amount desc
  `);
  const lowStock = await query(`
    select p.sku, p.name, ib.quantity_on_hand, ib.reorder_point
    from inventory_balances ib
    join products p on p.id = ib.product_id
    where ib.quantity_on_hand <= ib.reorder_point
    order by ib.quantity_on_hand asc, p.name
    limit 8
  `);
  return { salesToday, inventory, accounts, tenders, lowStock };
}

const routes = {
  "/api/health": async () => {
    const [row] = await query("select now() as database_time");
    return { ok: true, databaseTime: row.database_time };
  },
  "/api/dashboard": dashboard,
  "/api/products": async () =>
    query(`
      select p.id, p.sku, p.barcode, p.name, c.name as category, p.unit,
        p.retail_price, p.cost, p.taxable, p.active
      from products p
      join categories c on c.id = p.category_id
      order by c.name, p.name
    `),
  "/api/order-products": async () =>
    query(`
      select p.id, p.sku, p.barcode, p.name, c.name as category, p.unit,
        p.retail_price, p.taxable, p.active,
        coalesce(ib.quantity_on_hand, 0)::numeric(12,2) as quantity_on_hand
      from products p
      join categories c on c.id = p.category_id
      left join inventory_balances ib on ib.product_id = p.id
      where p.active = true
      order by c.name, p.name
    `),
  "/api/inventory": async () =>
    query(`
      select p.sku, p.name, c.name as category, ib.quantity_on_hand, ib.reorder_point,
        ib.unit_cost, (ib.quantity_on_hand * ib.unit_cost)::numeric(12,2) as inventory_value,
        case when ib.quantity_on_hand <= ib.reorder_point then true else false end as low_stock
      from inventory_balances ib
      join products p on p.id = ib.product_id
      join categories c on c.id = p.category_id
      order by low_stock desc, c.name, p.name
    `),
  "/api/customers": async () =>
    query(`
      select c.customer_number, c.display_name, c.phone, c.email, c.price_tier,
        c.tax_exempt, coalesce(la.points_balance, 0)::int as loyalty_points,
        coalesce(ha.current_balance, 0)::numeric(12,2) as house_balance
      from customers c
      left join loyalty_accounts la on la.customer_id = c.id
      left join house_accounts ha on ha.customer_id = c.id
      order by c.display_name
    `),
  "/api/sales": async () =>
    query(`
      select s.sale_number, s.completed_at, coalesce(c.display_name, 'Walk-in') as customer,
        s.subtotal, s.tax_total, s.total, u.display_name as cashier,
        string_agg(t.tender_type || ': $' || t.amount::text, ', ' order by t.tender_type) as tenders
      from sales s
      left join customers c on c.id = s.customer_id
      join users u on u.id = s.cashier_id
      left join tenders t on t.sale_id = s.id
      group by s.id, c.display_name, u.display_name
      order by s.completed_at desc
      limit 40
    `),
  "/api/house-accounts": async () =>
    query(`
      select c.customer_number, c.display_name, ha.credit_limit, ha.current_balance,
        ha.terms_days, ha.status,
        (ha.credit_limit - ha.current_balance)::numeric(12,2) as available_credit
      from house_accounts ha
      join customers c on c.id = ha.customer_id
      order by ha.current_balance desc
    `),
  "/api/loyalty": async () =>
    query(`
      select c.customer_number, c.display_name, la.points_balance, la.lifetime_points,
        la.status, la.joined_at
      from loyalty_accounts la
      join customers c on c.id = la.customer_id
      order by la.points_balance desc
    `),
  "/api/reports/daily-sales": async () =>
    query(`
      select completed_at::date as business_day, count(*)::int as transaction_count,
        coalesce(sum(subtotal), 0)::numeric(12,2) as subtotal,
        coalesce(sum(tax_total), 0)::numeric(12,2) as tax_total,
        coalesce(sum(total), 0)::numeric(12,2) as total
      from sales
      where status = 'completed'
      group by completed_at::date
      order by business_day desc
      limit 14
    `)
};

const postRoutes = {
  "/api/orders": placeOrder,
  "/api/login": login,
  "/api/logout": logout
};

async function login(payload, req, res) {
  const username = String(payload.username || "");
  const password = String(payload.password || "");
  if (!safeEqual(username, adminUsername) || !safeEqual(password, adminPassword)) {
    const error = new Error("Invalid username or password");
    error.status = 401;
    throw error;
  }

  const token = crypto.randomBytes(32).toString("base64url");
  sessions.set(token, {
    username: adminUsername,
    expiresAt: Date.now() + sessionTtlMs
  });
  sendJsonWithHeaders(res, 200, { ok: true, user: { username: adminUsername } }, {
    "Set-Cookie": sessionCookie(token, req)
  });
}

async function logout(_payload, req, res) {
  const token = parseCookies(req)[sessionCookieName];
  if (token) sessions.delete(token);
  sendJsonWithHeaders(res, 200, { ok: true }, {
    "Set-Cookie": clearSessionCookie(req)
  });
}

async function placeOrder(payload) {
  const lines = Array.isArray(payload.lines) ? payload.lines : [];
  if (!lines.length) {
    const error = new Error("Cart is empty");
    error.status = 400;
    throw error;
  }

  const normalized = new Map();
  for (const line of lines) {
    const productId = Number(line.productId);
    const quantity = Number(line.quantity);
    if (!Number.isInteger(productId) || productId <= 0 || !Number.isInteger(quantity) || quantity <= 0) {
      const error = new Error("Each order line needs a valid product and positive whole-number quantity");
      error.status = 400;
      throw error;
    }
    normalized.set(productId, (normalized.get(productId) || 0) + quantity);
  }

  const client = await pool.connect();
  try {
    await client.query("begin");

    const productIds = [...normalized.keys()];
    const productResult = await client.query(
      `
        select p.id, p.name, p.retail_price, p.cost, p.taxable, p.active,
          coalesce(ib.quantity_on_hand, 0)::numeric(12,2) as quantity_on_hand
        from products p
        join inventory_balances ib on ib.product_id = p.id
        where p.id = any($1::int[])
        for update of ib
      `,
      [productIds]
    );

    if (productResult.rows.length !== productIds.length) {
      const error = new Error("One or more products could not be found");
      error.status = 400;
      throw error;
    }

    const saleLines = [];
    let subtotal = 0;
    let taxableSubtotal = 0;

    for (const product of productResult.rows) {
      const quantity = normalized.get(product.id);
      const available = Number(product.quantity_on_hand);
      if (!product.active) {
        const error = new Error(`${product.name} is inactive and cannot be ordered`);
        error.status = 400;
        throw error;
      }
      if (quantity > available) {
        const error = new Error(`${product.name} only has ${available} available`);
        error.status = 400;
        throw error;
      }

      const unitPrice = Number(product.retail_price);
      const unitCost = Number(product.cost);
      const lineTotal = roundMoney(unitPrice * quantity);
      subtotal = roundMoney(subtotal + lineTotal);
      if (product.taxable) {
        taxableSubtotal = roundMoney(taxableSubtotal + lineTotal);
      }
      saleLines.push({
        productId: product.id,
        quantity,
        unitPrice,
        unitCost,
        lineTotal
      });
    }

    const taxTotal = roundMoney(taxableSubtotal * mockTaxRate);
    const total = roundMoney(subtotal + taxTotal);
    const day = yyyymmdd();
    const countResult = await client.query(
      "select count(*)::int as count from sales where sale_number like $1",
      [`S-${day}-%`]
    );
    const saleNumber = `S-${day}-${String(Number(countResult.rows[0].count) + 1).padStart(3, "0")}`;

    const saleResult = await client.query(
      `
        insert into sales (sale_number, customer_id, cashier_id, status, subtotal, tax_total, total, completed_at)
        values ($1, null, 1, 'completed', $2, $3, $4, now())
        returning id, sale_number, subtotal, tax_total, total, completed_at
      `,
      [saleNumber, subtotal, taxTotal, total]
    );
    const sale = saleResult.rows[0];

    for (const line of saleLines) {
      await client.query(
        `
          insert into sale_lines (sale_id, product_id, quantity, unit_price, unit_cost, line_total)
          values ($1, $2, $3, $4, $5, $6)
        `,
        [sale.id, line.productId, line.quantity, line.unitPrice, line.unitCost, line.lineTotal]
      );
      await client.query(
        "update inventory_balances set quantity_on_hand = quantity_on_hand - $1 where product_id = $2",
        [line.quantity, line.productId]
      );
      await client.query(
        `
          insert into inventory_movements (product_id, movement_type, quantity_delta, unit_cost, reference, occurred_at)
          values ($1, 'sale', $2, $3, $4, now())
        `,
        [line.productId, -line.quantity, line.unitCost, `mock order ${sale.sale_number}`]
      );
    }

    await client.query(
      `
        insert into tenders (sale_id, tender_type, amount, provider, provider_transaction_id, status)
        values ($1, 'mock_order', $2, 'Hatcher POS mockup', $3, 'approved')
      `,
      [sale.id, total, `MOCK-ORDER-${sale.sale_number}`]
    );

    await client.query("commit");
    return {
      saleNumber: sale.sale_number,
      subtotal,
      taxTotal,
      total,
      taxRate: mockTaxRate,
      lineCount: saleLines.length,
      completedAt: sale.completed_at
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function serveStatic(req, res, basePath = "") {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = url.pathname;
  if (basePath && pathname.startsWith(basePath)) {
    pathname = pathname.slice(basePath.length) || "/";
  }
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(publicDir, safePath));

  if (!filePath.startsWith(publicDir)) {
    sendError(res, 403, "Forbidden");
    return;
  }

  try {
    const body = await readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, {
      "Content-Type": contentTypes[ext] || "application/octet-stream",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy":
        "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'"
    });
    res.end(body);
  } catch {
    sendError(res, 404, "Not found");
  }
}

export async function handlePosRequest(req, res, options = {}) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (req.method === "GET" && url.pathname === "/api/session") {
      const session = getSession(req);
      sendJson(res, 200, { authenticated: Boolean(session), user: session ? { username: session.username } : null });
      return;
    }
    if (req.method === "POST" && postRoutes[url.pathname]) {
      const payload = await readJsonBody(req);
      if (url.pathname === "/api/login" || url.pathname === "/api/logout") {
        const result = await postRoutes[url.pathname](payload, req, res);
        if (result !== undefined) sendJson(res, 200, result);
        return;
      }
      if (!getSession(req)) {
        sendError(res, 401, "Login required");
        return;
      }
      sendJson(res, 201, await postRoutes[url.pathname](payload, req, res));
      return;
    }
    if (req.method === "GET" && routes[url.pathname]) {
      if (!getSession(req)) {
        sendError(res, 401, "Login required");
        return;
      }
      sendJson(res, 200, await routes[url.pathname]());
      return;
    }
    if (req.method === "GET") {
      await serveStatic(req, res, options.basePath || "");
      return;
    }
    sendError(res, 405, "Method not allowed");
  } catch (error) {
    sendError(res, error.status || 500, error.status ? error.message : "Server error", error.status ? undefined : error.message);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = http.createServer(handlePosRequest);
  server.listen(port, () => {
    console.log(`Hatcher POS mockup running at http://localhost:${port}`);
  });
}
