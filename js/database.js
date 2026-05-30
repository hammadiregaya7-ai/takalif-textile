/* ==================== DATABASE ==================== */
let db;
let currentCart = [];

function saveDB() {
  const data = db.export();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(data)));
  localStorage.setItem('takalifProV2_nesij_full', base64);
}

function loadDB(SQL) {
  const saved = localStorage.getItem('takalifProV2_nesij_full');
  if (saved) {
    const binary = Uint8Array.from(atob(saved).split('').map(c => c.charCodeAt(0)));
    db = new SQL.Database(binary);
    return;
  }
  db = new SQL.Database();
}

async function initSQLite() {
  const SQL = await initSqlJs({ locateFile: f => `https://cdn.jsdelivr.net/npm/sql.js@1.14.0/dist/${f}` });
  loadDB(SQL);

  db.run(`
    CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY, name TEXT, cost REAL DEFAULT 0, price REAL, stock REAL DEFAULT 0, minStock REAL DEFAULT 10, unit TEXT DEFAULT 'متر');
    CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY, name TEXT, phone TEXT, balance REAL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS suppliers (id INTEGER PRIMARY KEY, name TEXT, phone TEXT, balance REAL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS cash (id INTEGER PRIMARY KEY, type TEXT, description TEXT, amount REAL, date TEXT, voucher INTEGER);
    CREATE TABLE IF NOT EXISTS invoices (id INTEGER PRIMARY KEY, date TEXT, customer TEXT, total REAL, profit REAL);
    CREATE TABLE IF NOT EXISTS invoice_items (invoice_id INTEGER, product_id INTEGER, name TEXT, qty REAL, price REAL, cost REAL);
  `);

  refreshAll();
  console.log('%c✅ تكاليف سوفت Pro v2 - تم تقسيم الكود بنجاح', 'color:#0f766e;font-size:16px;font-weight:bold');
}

function refreshAll() {
  if (typeof renderDashboard === 'function') renderDashboard();
  if (typeof renderProducts === 'function') renderProducts();
  if (typeof renderCustomers === 'function') renderCustomers();
  if (typeof renderSuppliers === 'function') renderSuppliers();
  if (typeof refreshCashList === 'function') refreshCashList();
  if (typeof renderSalesList === 'function') renderSalesList();
  if (typeof populateCustomerSelect === 'function') populateCustomerSelect();
}
