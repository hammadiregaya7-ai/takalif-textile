/* ==================== UI & NAVIGATION ==================== */

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');

  if (id === 'dashboard' && typeof renderDashboard === 'function') renderDashboard();
  if (id === 'reports' && typeof renderReports === 'function') renderReports();
  if (id === 'salesList' && typeof renderSalesList === 'function') renderSalesList();
  if (id === 'products' && typeof renderProducts === 'function') renderProducts();
  if (id === 'customers' && typeof renderCustomers === 'function') renderCustomers();
  if (id === 'suppliers' && typeof renderSuppliers === 'function') renderSuppliers();
  if (id === 'cash' && typeof refreshCashList === 'function') refreshCashList();
}

/* ==================== DASHBOARD ==================== */
function renderDashboard() {
  const today = new Date().toISOString().slice(0,10);
  let sales = 0, profit = 0;

  const stmt = db.prepare("SELECT SUM(total) as s, SUM(profit) as p FROM invoices WHERE date=?");
  stmt.bind([today]);
  if (stmt.step()) {
    const r = stmt.getAsObject();
    sales = r.s || 0;
    profit = r.p || 0;
  }
  stmt.free();

  const todaySalesEl = document.getElementById('today-sales');
  const todayProfitEl = document.getElementById('today-profit');
  if (todaySalesEl) todaySalesEl.textContent = sales.toFixed(0) + ' ريال';
  if (todayProfitEl) todayProfitEl.textContent = profit.toFixed(0) + ' ريال';

  const container = document.getElementById('low-stock-list');
  if (!container) return;
  container.innerHTML = '';

  const low = db.prepare("SELECT * FROM products WHERE stock <= minStock ORDER BY stock LIMIT 6");
  let found = false;
  while (low.step()) {
    found = true;
    const p = low.getAsObject();
    const div = document.createElement('div');
    div.className = "flex justify-between bg-orange-50 p-4 rounded-2xl";
    div.innerHTML = `<span class="font-medium">${p.name}</span><span class="font-bold text-orange-600">${p.stock} ${p.unit}</span>`;
    container.appendChild(div);
  }
  low.free();

  if (!found) {
    container.innerHTML = `<p class="text-center text-green-600 py-6">✅ جميع الأصناف آمنة</p>`;
  }
}

/* ==================== PRODUCTS ==================== */
function renderProducts() {
  const container = document.getElementById('products-list');
  if (!container) return;
  container.innerHTML = '';

  const stmt = db.prepare("SELECT * FROM products ORDER BY name");
  while (stmt.step()) {
    const p = stmt.getAsObject();
    const categoryName = getCategoryName(p.category_id);
    const div = document.createElement('div');
    div.className = "bg-white p-5 rounded-3xl shadow flex justify-between items-center";
    div.innerHTML = `
      <div>
        <div class="font-bold">${p.name}</div>
        <div class="text-sm text-gray-600">${categoryName}</div>
        <div class="text-sm">تكلفة: ${p.cost} | بيع: ${p.price} | مخزون: ${p.stock} ${p.unit}</div>
      </div>
      <button onclick="editProduct(${p.id})" class="text-teal-600">تعديل</button>`;
    container.appendChild(div);
  }
  stmt.free();
}

function addNewProduct() {
  const name = prompt("اسم الصنف:");
  if (!name) return;

  // Get categories for selection
  const categories = getAllCategories();
  let categoryId = null;

  if (categories.length > 0) {
    let msg = "اختر فئة:\n\n";
    categories.forEach((cat, index) => {
      msg += `${index + 1}. ${cat.name}\n`;
    });
    msg += `${categories.length + 1}. فئة جديدة\n`;
    msg += `0. بدون فئة`;

    const choice = parseInt(prompt(msg));

    if (choice === categories.length + 1) {
      addCategory();
      return addNewProduct(); // recursive to refresh
    } else if (choice > 0 && choice <= categories.length) {
      categoryId = categories[choice - 1].id;
    }
  } else {
    if (confirm("هل تريد إضافة فئة جديدة؟")) {
      addCategory();
      return addNewProduct();
    }
  }

  const cost = parseFloat(prompt("سعر التكلفة:", "80"));
  const price = parseFloat(prompt("سعر البيع:", "120"));
  const stock = parseFloat(prompt("المخزون الأولي:", "50"));
  const minStock = parseFloat(prompt("حد التنبيه:", "10"));
  const unit = prompt("الوحدة:", "متر");

  db.run("INSERT INTO products (name, cost, price, stock, minStock, unit, category_id) VALUES (?,?,?,?,?,?,?)", [name, cost, price, stock, minStock, unit, categoryId]);
  saveDB();
  renderProducts();
  renderDashboard();
  alert("✅ تم إضافة الصنف بنجاح");
}

function editProduct(id) {
  const stmt = db.prepare("SELECT * FROM products WHERE id = ?");
  stmt.bind([id]);
  if (!stmt.step()) {
    stmt.free();
    return alert("الصنف غير موجود");
  }
  const p = stmt.getAsObject();
  stmt.free();

  const name = prompt("اسم الصنف:", p.name);
  if (name === null) return;

  const categories = getAllCategories();
  let categoryId = p.category_id;

  if (categories.length > 0) {
    let msg = "اختر فئة (الحالية: " + getCategoryName(p.category_id) + "):\n\n";
    categories.forEach((cat, index) => {
      msg += `${index + 1}. ${cat.name}\n`;
    });
    msg += `${categories.length + 1}. فئة جديدة\n`;
    msg += `0. بدون فئة`;

    const choice = parseInt(prompt(msg));
    if (choice === categories.length + 1) {
      addCategory();
      return editProduct(id); // retry
    } else if (choice > 0 && choice <= categories.length) {
      categoryId = categories[choice - 1].id;
    } else if (choice === 0) {
      categoryId = null;
    }
  }

  const cost = parseFloat(prompt("سعر التكلفة:", p.cost));
  const price = parseFloat(prompt("سعر البيع:", p.price));
  const stock = parseFloat(prompt("المخزون:", p.stock));
  const minStock = parseFloat(prompt("حد التنبيه:", p.minStock));
  const unit = prompt("الوحدة:", p.unit);

  if (isNaN(cost) || isNaN(price) || isNaN(stock) || isNaN(minStock)) {
    return alert("الرجاء إدخال أرقام صحيحة");
  }

  db.run("UPDATE products SET name=?, cost=?, price=?, stock=?, minStock=?, unit=?, category_id=? WHERE id=?", 
    [name, cost, price, stock, minStock, unit, categoryId, id]);

  saveDB();
  renderProducts();
  renderDashboard();
  alert("✅ تم تعديل الصنف بنجاح");
}

/* ==================== CATEGORIES ==================== */

function getAllCategories() {
  const categories = [];
  const stmt = db.prepare("SELECT * FROM categories ORDER BY name");
  while (stmt.step()) {
    categories.push(stmt.getAsObject());
  }
  stmt.free();
  return categories;
}

function addCategory() {
  const name = prompt("اسم الفئة الجديدة:");
  if (!name) return;

  try {
    db.run("INSERT INTO categories (name) VALUES (?)", [name]);
    saveDB();
    alert("✅ تمت إضافة الفئة بنجاح");
  } catch (e) {
    alert("هذه الفئة موجودة بالفعل");
  }
}

function getCategoryName(categoryId) {
  if (!categoryId) return "بدون فئة";
  const stmt = db.prepare("SELECT name FROM categories WHERE id = ?");
  stmt.bind([categoryId]);
  if (stmt.step()) {
    const result = stmt.getAsObject();
    stmt.free();
    return result.name;
  }
  stmt.free();
  return "بدون فئة";
}

/* ==================== CUSTOMERS ==================== */
function renderCustomers() {
  const container = document.getElementById('customers-list');
  if (!container) return;
  container.innerHTML = '';

  const stmt = db.prepare("SELECT * FROM customers ORDER BY name");
  while (stmt.step()) {
    const c = stmt.getAsObject();
    const div = document.createElement('div');
    div.className = "bg-white p-5 rounded-3xl shadow flex justify-between items-center";
    div.innerHTML = `<div><div class="font-bold">${c.name}</div><div class="text-sm">${c.phone || ''}</div><div class="text-teal-600">رصيد: ${c.balance} ريال</div></div>
                     <button onclick="editCustomer(${c.id})" class="text-teal-600">تعديل</button>`;
    container.appendChild(div);
  }
  stmt.free();
}

function addCustomer() {
  const name = prompt("اسم العميل:");
  if (!name) return;
  const phone = prompt("رقم الجوال:", "");
  db.run("INSERT INTO customers (name, phone) VALUES (?, ?)", [name, phone]);
  saveDB();
  renderCustomers();
}

function editCustomer(id) {
  const balance = prompt("الرصيد الجديد:", "0");
  if (balance === null) return;
  db.run("UPDATE customers SET balance = ? WHERE id = ?", [parseFloat(balance), id]);
  saveDB();
  renderCustomers();
}

/* ==================== SUPPLIERS ==================== */
function renderSuppliers() {
  const container = document.getElementById('suppliers-list');
  if (!container) return;
  container.innerHTML = '';

  const stmt = db.prepare("SELECT * FROM suppliers ORDER BY name");
  while (stmt.step()) {
    const s = stmt.getAsObject();
    const div = document.createElement('div');
    div.className = "bg-white p-5 rounded-3xl shadow flex justify-between items-center";
    div.innerHTML = `<div><div class="font-bold">${s.name}</div><div class="text-sm">${s.phone || ''}</div></div>
                     <button onclick="editSupplier(${s.id})" class="text-teal-600">تعديل</button>`;
    container.appendChild(div);
  }
  stmt.free();
}

function addSupplier() {
  const name = prompt("اسم المورد:");
  if (!name) return;
  const phone = prompt("رقم الجوال:", "");
  db.run("INSERT INTO suppliers (name, phone) VALUES (?, ?)", [name, phone]);
  saveDB();
  renderSuppliers();
}

function editSupplier(id) {
  const balance = prompt("الرصيد:", "0");
  if (balance === null) return;
  db.run("UPDATE suppliers SET balance = ? WHERE id = ?", [parseFloat(balance), id]);
  saveDB();
  renderSuppliers();
}

/* ==================== CASH ==================== */
function refreshCashList() {
  const tbody = document.getElementById('cash-table');
  if (!tbody) return;
  tbody.innerHTML = '';

  const stmt = db.prepare("SELECT * FROM cash ORDER BY id DESC");
  while (stmt.step()) {
    const r = stmt.getAsObject();
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="p-3">${r.type}</td><td class="p-3">${r.description}</td><td class="p-3 font-bold">${r.amount}</td><td class="p-3">${r.date}</td><td class="p-3">${r.voucher}</td>`;
    tbody.appendChild(tr);
  }
  stmt.free();
}

function addCashTransaction() {
  const type = confirm("قبض أم صرف؟ (OK = قبض)") ? "قبض" : "صرف";
  const desc = prompt("البيان:", "");
  const amount = parseFloat(prompt("المبلغ:", "1000"));
  if (!amount) return;

  const date = new Date().toLocaleDateString('ar-SA');
  const voucher = Math.floor(1000 + Math.random() * 9000);

  db.run("INSERT INTO cash (type, description, amount, date, voucher) VALUES (?, ?, ?, ?, ?)", [type, desc, amount, date, voucher]);
  saveDB();
  refreshCashList();
}
