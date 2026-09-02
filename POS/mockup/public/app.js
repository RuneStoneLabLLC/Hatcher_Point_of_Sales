const content = document.querySelector("#content");
const title = document.querySelector("#view-title");
const subtitle = document.querySelector("#view-subtitle");
const statusNode = document.querySelector("#db-status");
const refreshButton = document.querySelector("#refresh");
const logoutButton = document.querySelector("#logout");
let currentView = "dashboard";
let orderProducts = [];
const orderCart = new Map();
let currentUser = null;
let lastTenderApproval = null;

const viewMeta = {
  dashboard: ["Dashboard", "Live summary from the simulated PostgreSQL data set."],
  "new-order": ["New Order", "Build a mock checkout order from live inventory and place it into PostgreSQL."],
  products: ["Products", "Catalog records with SKU, barcode, pricing, cost, and tax flags."],
  inventory: ["Inventory", "Current stock balances, reorder points, inventory value, and low-stock status."],
  sales: ["Sales", "Recent completed sales with customer, cashier, tender, tax, and total."],
  customers: ["Customers", "Customer records with price tier, tax exemption, loyalty, and account balance."],
  "house-accounts": ["House Accounts", "Charge-account balances, credit limits, available credit, and terms."],
  loyalty: ["Loyalty", "Simulated points-per-dollar loyalty accounts."],
  payments: ["Payments", "Setup for the future semi-integrated TSYS terminal flow."],
  reports: ["Reports", "Daily sales rollup for reconciliation and export-style reporting."]
};

const endpoints = {
  "new-order": "/api/order-products",
  products: "/api/products",
  inventory: "/api/inventory",
  sales: "/api/sales",
  customers: "/api/customers",
  "house-accounts": "/api/house-accounts",
  loyalty: "/api/loyalty",
  payments: "/api/payment-config",
  reports: "/api/reports/daily-sales"
};

const mockTaxRate = 0.06;

function money(value) {
  return Number(value || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function number(value) {
  return Number(value || 0).toLocaleString("en-US");
}

function date(value) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

async function getJson(url) {
  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok) {
    if (response.status === 401) {
      currentUser = null;
      renderLogin(payload.error || "Login required");
    }
    throw new Error(payload.detail || payload.error || "Request failed");
  }
  return payload;
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json();
  if (!response.ok) {
    if (response.status === 401) {
      currentUser = null;
      renderLogin(payload.error || "Login required");
    }
    throw new Error(payload.error || payload.detail || "Request failed");
  }
  return payload;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function table(rows, columns) {
  if (!rows.length) {
    return `<div class="panel"><div class="panel-head"><h3>No records</h3></div></div>`;
  }

  return `
    <div class="panel">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>${columns.map((column) => `<th>${column.label}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `
                  <tr>
                    ${columns.map((column) => `<td>${column.render ? column.render(row[column.key], row) : row[column.key] ?? ""}</td>`).join("")}
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function setAuthenticated(user) {
  currentUser = user;
  document.body.classList.toggle("is-authenticated", Boolean(user));
  document.querySelector(".tabs").hidden = !user;
  document.querySelector(".toolbar").hidden = false;
  refreshButton.hidden = !user;
  logoutButton.hidden = !user;
  statusNode.textContent = user ? `Signed in as ${user.username}` : "Admin login required";
  statusNode.className = user ? "status ok" : "status";
}

function renderLogin(message = "") {
  setAuthenticated(null);
  title.textContent = "Admin Login";
  subtitle.textContent = "Sign in to create orders and view inventory.";
  content.innerHTML = `
    <form class="login-panel" id="login-form">
      <div>
        <label for="username">Username</label>
        <input id="username" name="username" autocomplete="username" required />
      </div>
      <div>
        <label for="password">Password</label>
        <input id="password" name="password" type="password" autocomplete="current-password" required />
      </div>
      ${message ? `<div class="error">${escapeHtml(message)}</div>` : ""}
      <button class="primary-action" type="submit">Log In</button>
    </form>
  `;
  content.querySelector("#username")?.focus();
}

async function login(username, password) {
  const response = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Login failed");
  }
  setAuthenticated(payload.user);
}

async function checkSession() {
  try {
    const session = await getJson("/api/session");
    if (!session.authenticated) {
      renderLogin();
      return false;
    }
    setAuthenticated(session.user);
    return true;
  } catch {
    renderLogin();
    return false;
  }
}

function renderDashboard(data) {
  const { salesToday, inventory, accounts, tenders, lowStock } = data;
  return `
    <div class="metric-grid">
      <article class="metric"><span>Today's Sales</span><strong>${money(salesToday.total_sales)}</strong></article>
      <article class="metric"><span>Transactions</span><strong>${number(salesToday.transaction_count)}</strong></article>
      <article class="metric"><span>Inventory Value</span><strong>${money(inventory.inventory_value)}</strong></article>
      <article class="metric"><span>House A/R</span><strong>${money(accounts.house_account_balance)}</strong></article>
    </div>
    <div class="two-col">
      <article class="panel">
        <div class="panel-head"><h3>Tender Mix</h3><span class="badge">Simulated</span></div>
        <div class="table-wrap">
          <table><thead><tr><th>Tender</th><th>Amount</th></tr></thead><tbody>
            ${tenders.map((row) => `<tr><td>${row.tender_type}</td><td>${money(row.amount)}</td></tr>`).join("")}
          </tbody></table>
        </div>
      </article>
      <article class="panel">
        <div class="panel-head"><h3>Low Stock Watch</h3><span class="badge warn">${number(inventory.low_stock_count)} items</span></div>
        <div class="table-wrap">
          <table><thead><tr><th>SKU</th><th>Product</th><th>Qty</th><th>Reorder</th></tr></thead><tbody>
            ${lowStock.map((row) => `<tr><td>${row.sku}</td><td>${row.name}</td><td>${number(row.quantity_on_hand)}</td><td>${number(row.reorder_point)}</td></tr>`).join("")}
          </tbody></table>
        </div>
      </article>
    </div>
  `;
}

function getCartTotals() {
  let subtotal = 0;
  let taxableSubtotal = 0;
  const lines = [];

  for (const product of orderProducts) {
    const quantity = orderCart.get(Number(product.id)) || 0;
    if (!quantity) continue;
    const unitPrice = Number(product.retail_price);
    const lineTotal = Math.round(unitPrice * quantity * 100) / 100;
    subtotal = Math.round((subtotal + lineTotal) * 100) / 100;
    if (product.taxable) {
      taxableSubtotal = Math.round((taxableSubtotal + lineTotal) * 100) / 100;
    }
    lines.push({ product, quantity, lineTotal });
  }

  const tax = Math.round(taxableSubtotal * mockTaxRate * 100) / 100;
  return {
    lines,
    subtotal,
    tax,
    total: Math.round((subtotal + tax) * 100) / 100
  };
}

function renderOrderMessage(message, type = "success") {
  return message ? `<div class="${type === "error" ? "error" : "success"}">${escapeHtml(message)}</div>` : "";
}

function renderTenderSummary(totals, tender) {
  const amount = tender?.amount ?? totals.total;
  const provider = tender?.provider || "TSYS mock terminal";
  const brand = tender?.cardBrand || "Visa";
  const last4 = tender?.cardLast4 || "4242";
  const status = tender?.status || "ready";
  const transactionId = tender?.providerTransactionId;
  const request = tender?.request;
  const response = tender?.terminalResponse;

  if (!totals.lines.length && !tender) return "";

  return `
    <div class="payment-summary">
      <div class="payment-summary-title">
        <strong>TSYS Semi-Integrated Terminal</strong>
        <span>${escapeHtml(response ? "Approved response" : "Ready request")}</span>
      </div>
      <div>
        <span>Payment</span>
        <strong>${escapeHtml(provider)}</strong>
      </div>
      <div>
        <span>Card</span>
        <strong>${escapeHtml(brand)} ending ${escapeHtml(last4)}</strong>
      </div>
      <div>
        <span>Amount</span>
        <strong>${money(amount)}</strong>
      </div>
      <div>
        <span>Status</span>
        <strong>${escapeHtml(status === "approved" ? "Approved" : "Ready to authorize")}</strong>
      </div>
      ${request ? `<div><span>Sent to Terminal</span><strong>${escapeHtml(request.transactionType)} ${escapeHtml(request.currency)} ${escapeHtml(request.amount)}</strong></div>` : ""}
      ${transactionId ? `<div><span>Transaction</span><strong>${escapeHtml(transactionId)}</strong></div>` : ""}
      ${response?.authCode ? `<div><span>Auth Code</span><strong>${escapeHtml(response.authCode)}</strong></div>` : ""}
      ${response?.entryMode ? `<div><span>Entry Mode</span><strong>${escapeHtml(response.entryMode)}</strong></div>` : ""}
      ${response?.terminalId ? `<div><span>Terminal</span><strong>${escapeHtml(response.terminalId)}</strong></div>` : ""}
      ${response?.batchId ? `<div><span>Batch</span><strong>${escapeHtml(response.batchId)}</strong></div>` : ""}
      <p>The POS never collects or stores full card number, CVV, PIN, track data, or raw EMV data.</p>
    </div>
  `;
}

function renderPayments(config) {
  return `
    <div class="payment-grid">
      <article class="panel">
        <div class="panel-head">
          <div>
            <h3>Current payment setup</h3>
            <p class="panel-note">These are placeholders until merchant services provides real values.</p>
          </div>
          <span class="badge">${escapeHtml(config.mode)}</span>
        </div>
        <div class="setup-list">
          <div><span>Provider</span><strong>${escapeHtml(config.provider)}</strong></div>
          <div><span>Architecture</span><strong>${escapeHtml(config.architecture)}</strong></div>
          <div><span>Merchant ID</span><strong>${escapeHtml(config.merchantId)}</strong></div>
          <div><span>Location ID</span><strong>${escapeHtml(config.locationId)}</strong></div>
          <div><span>Terminal ID</span><strong>${escapeHtml(config.terminalId)}</strong></div>
          <div><span>Register ID</span><strong>${escapeHtml(config.registerId)}</strong></div>
          <div><span>Currency</span><strong>${escapeHtml(config.currency)}</strong></div>
          <div><span>Partial Approval</span><strong>${config.allowPartialApproval ? "Allowed" : "Disabled"}</strong></div>
          <div><span>Live Ready</span><strong>${config.readyForLivePayments ? "Yes" : "No"}</strong></div>
        </div>
      </article>
      <article class="panel">
        <div class="panel-head"><h3>Needed From Merchant Services</h3></div>
        <ul class="check-list">
          ${config.pendingFromMerchantServices.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
      </article>
      <article class="panel full-width">
        <div class="panel-head"><h3>Card Data Policy</h3></div>
        <p class="safe-policy">${escapeHtml(config.cardDataPolicy)}</p>
      </article>
    </div>
  `;
}

function renderNewOrder(message = "", messageType = "success") {
  const previousScrollTop = content.querySelector(".order-products")?.scrollTop ?? 0;
  const totals = getCartTotals();
  const productCards = orderProducts
    .map((product) => {
      const productId = Number(product.id);
      const quantity = orderCart.get(productId) || 0;
      const available = Number(product.quantity_on_hand);
      return `
        <article class="order-product">
          <div>
            <span class="badge">${escapeHtml(product.category)}</span>
            <h3>${escapeHtml(product.name)}</h3>
            <p>${escapeHtml(product.sku)} &middot; ${escapeHtml(product.unit)} &middot; ${product.taxable ? "Taxable" : "Tax exempt"}</p>
            <p class="stock-line">${money(product.retail_price)} &middot; ${number(available)} on hand</p>
          </div>
          <div class="qty-control" aria-label="Quantity controls for ${escapeHtml(product.name)}">
            <button class="qty-button" data-action="decrease" data-product-id="${productId}" ${quantity <= 0 ? "disabled" : ""}>-</button>
            <strong>${number(quantity)}</strong>
            <button class="qty-button" data-action="increase" data-product-id="${productId}" ${quantity >= available ? "disabled" : ""}>+</button>
          </div>
        </article>
      `;
    })
    .join("");

  const cartRows = totals.lines.length
    ? totals.lines
        .map(
          ({ product, quantity, lineTotal }) => `
            <tr>
              <td>${escapeHtml(product.name)}<br><span class="muted">${escapeHtml(product.sku)}</span></td>
              <td>
                <div class="cart-qty-control">
                  <button class="cart-qty-button" data-action="decrease" data-product-id="${Number(product.id)}" aria-label="Remove one ${escapeHtml(product.name)}">-</button>
                  <strong>${number(quantity)}</strong>
                  <button class="cart-qty-button" data-action="increase" data-product-id="${Number(product.id)}" aria-label="Add one ${escapeHtml(product.name)}">+</button>
                </div>
              </td>
              <td>${money(lineTotal)}</td>
            </tr>
          `
        )
        .join("")
    : `<tr><td colspan="3">No items selected yet.</td></tr>`;

  content.innerHTML = `
    ${renderOrderMessage(message, messageType)}
    <div class="order-layout">
      <section class="panel order-browser">
        <div class="panel-head">
          <div>
            <h3>Inventory</h3>
            <p class="panel-note">Use + and - to build the mock order.</p>
          </div>
          <span class="badge">${number(orderProducts.length)} items</span>
        </div>
        <div class="order-products">${productCards}</div>
      </section>

      <aside class="panel cart-panel">
        <div class="panel-head">
          <h3>Order Summary</h3>
          <span class="badge">MD tax ${Math.round(mockTaxRate * 100)}%</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Item</th><th>Qty</th><th>Total</th></tr></thead>
            <tbody>${cartRows}</tbody>
          </table>
        </div>
        <div class="totals">
          <div><span>Subtotal</span><strong>${money(totals.subtotal)}</strong></div>
          <div><span>Estimated Tax</span><strong>${money(totals.tax)}</strong></div>
          <div class="grand-total"><span>Total</span><strong>${money(totals.total)}</strong></div>
        </div>
        ${renderTenderSummary(totals, lastTenderApproval)}
        <div class="cart-actions">
          <button class="secondary-action" data-action="clear-order" ${totals.lines.length ? "" : "disabled"}>Clear Order</button>
          <button class="primary-action" data-action="place-order" ${totals.lines.length ? "" : "disabled"}>Place Order</button>
        </div>
      </aside>
    </div>
  `;
  const orderProductsNode = content.querySelector(".order-products");
  if (orderProductsNode) {
    orderProductsNode.scrollTop = previousScrollTop;
  }
}

function renderRows(view, rows) {
  const configs = {
    products: [
      { key: "sku", label: "SKU" },
      { key: "barcode", label: "Barcode" },
      { key: "name", label: "Product" },
      { key: "category", label: "Category" },
      { key: "unit", label: "Unit" },
      { key: "retail_price", label: "Retail", render: money },
      { key: "cost", label: "Cost", render: money },
      { key: "taxable", label: "Tax", render: (value) => (value ? "Taxable" : "Exempt") }
    ],
    inventory: [
      { key: "sku", label: "SKU" },
      { key: "name", label: "Product" },
      { key: "category", label: "Category" },
      { key: "quantity_on_hand", label: "On Hand", render: number },
      { key: "reorder_point", label: "Reorder", render: number },
      { key: "unit_cost", label: "Unit Cost", render: money },
      { key: "inventory_value", label: "Value", render: money },
      { key: "low_stock", label: "Status", render: (value) => `<span class="badge ${value ? "warn" : ""}">${value ? "Low stock" : "OK"}</span>` }
    ],
    sales: [
      { key: "sale_number", label: "Sale" },
      { key: "completed_at", label: "Completed", render: date },
      { key: "customer", label: "Customer" },
      { key: "cashier", label: "Cashier" },
      { key: "subtotal", label: "Subtotal", render: money },
      { key: "tax_total", label: "Tax", render: money },
      { key: "total", label: "Total", render: money },
      { key: "tenders", label: "Tender" }
    ],
    customers: [
      { key: "customer_number", label: "Number" },
      { key: "display_name", label: "Customer" },
      { key: "phone", label: "Phone" },
      { key: "price_tier", label: "Tier" },
      { key: "tax_exempt", label: "Tax", render: (value) => (value ? `<span class="badge">Exempt</span>` : "Taxable") },
      { key: "loyalty_points", label: "Points", render: number },
      { key: "house_balance", label: "House Balance", render: money }
    ],
    "house-accounts": [
      { key: "customer_number", label: "Number" },
      { key: "display_name", label: "Customer" },
      { key: "credit_limit", label: "Limit", render: money },
      { key: "current_balance", label: "Balance", render: money },
      { key: "available_credit", label: "Available", render: money },
      { key: "terms_days", label: "Terms", render: (value) => `Net ${value}` },
      { key: "status", label: "Status", render: (value) => `<span class="badge">${value}</span>` }
    ],
    loyalty: [
      { key: "customer_number", label: "Number" },
      { key: "display_name", label: "Customer" },
      { key: "points_balance", label: "Points", render: number },
      { key: "lifetime_points", label: "Lifetime", render: number },
      { key: "status", label: "Status", render: (value) => `<span class="badge">${value}</span>` },
      { key: "joined_at", label: "Joined", render: (value) => new Date(value).toLocaleDateString("en-US") }
    ],
    reports: [
      { key: "business_day", label: "Business Day", render: (value) => new Date(value).toLocaleDateString("en-US") },
      { key: "transaction_count", label: "Transactions", render: number },
      { key: "subtotal", label: "Subtotal", render: money },
      { key: "tax_total", label: "Tax", render: money },
      { key: "total", label: "Total", render: money }
    ]
  };

  return table(rows, configs[view]);
}

async function loadHealth() {
  if (!currentUser) return;
  try {
    const data = await getJson("/api/health");
    statusNode.textContent = `Database online ${new Date(data.databaseTime).toLocaleTimeString("en-US")}`;
    statusNode.className = "status ok";
  } catch (error) {
    statusNode.textContent = "Database unavailable";
    statusNode.className = "status bad";
  }
}

async function loadView(view) {
  if (!currentUser) {
    renderLogin();
    return;
  }
  currentView = view;
  const [heading, subheading] = viewMeta[view];
  title.textContent = heading;
  subtitle.textContent = subheading;
  content.innerHTML = `<div class="panel"><div class="panel-head"><h3>Loading ${heading.toLowerCase()}...</h3></div></div>`;

  try {
    const data = view === "dashboard" ? await getJson("/api/dashboard") : await getJson(endpoints[view]);
    if (view === "dashboard") {
      content.innerHTML = renderDashboard(data);
      return;
    }
    if (view === "new-order") {
      orderProducts = data;
      renderNewOrder();
      return;
    }
    if (view === "payments") {
      content.innerHTML = renderPayments(data);
      return;
    }
    content.innerHTML = renderRows(view, data);
  } catch (error) {
    content.innerHTML = `<div class="error">Could not load ${heading}: ${error.message}</div>`;
  }
}

async function placeOrder() {
  const lines = [...orderCart.entries()]
    .filter(([, quantity]) => quantity > 0)
    .map(([productId, quantity]) => ({ productId, quantity }));

  if (!lines.length) {
    renderNewOrder("Add at least one item before placing an order.", "error");
    return;
  }

  content.querySelector('[data-action="place-order"]')?.setAttribute("disabled", "");

  try {
    const result = await postJson("/api/orders", { lines, tenderType: "card" });
    orderCart.clear();
    lastTenderApproval = result.tender;
    orderProducts = await getJson("/api/order-products");
    renderNewOrder(`Order ${result.saleNumber} placed successfully for ${money(result.total)}. TSYS mock card ${result.tender.terminalResponse.authCode} approved.`);
    loadHealth();
  } catch (error) {
    renderNewOrder(error.message, "error");
  }
}

content.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button || currentView !== "new-order") return;

  const action = button.dataset.action;
  if (action === "increase" || action === "decrease") {
    const productId = Number(button.dataset.productId);
    const product = orderProducts.find((item) => Number(item.id) === productId);
    if (!product) return;
    const available = Number(product.quantity_on_hand);
    const currentQuantity = orderCart.get(productId) || 0;
    const nextQuantity = action === "increase"
      ? Math.min(currentQuantity + 1, available)
      : Math.max(currentQuantity - 1, 0);

    if (nextQuantity) {
      orderCart.set(productId, nextQuantity);
    } else {
      orderCart.delete(productId);
    }
    lastTenderApproval = null;
    renderNewOrder();
  }

  if (action === "clear-order") {
    orderCart.clear();
    lastTenderApproval = null;
    renderNewOrder();
  }

  if (action === "place-order") {
    placeOrder();
  }
});

content.addEventListener("submit", async (event) => {
  if (event.target.id !== "login-form") return;
  event.preventDefault();
  const form = new FormData(event.target);
  const submit = event.target.querySelector("button[type='submit']");
  submit?.setAttribute("disabled", "");

  try {
    await login(form.get("username"), form.get("password"));
    await loadHealth();
    await loadView(currentView);
  } catch (error) {
    renderLogin(error.message);
  }
});

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
    button.classList.add("active");
    loadView(button.dataset.view);
  });
});

refreshButton.addEventListener("click", () => {
  loadHealth();
  loadView(currentView);
});

logoutButton.addEventListener("click", async () => {
  try {
    await postJson("/api/logout", {});
  } finally {
    orderCart.clear();
    orderProducts = [];
    lastTenderApproval = null;
    renderLogin();
  }
});

checkSession().then((authenticated) => {
  if (authenticated) {
    loadHealth();
    loadView(currentView);
  }
});
