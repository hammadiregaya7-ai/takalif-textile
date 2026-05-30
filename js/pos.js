/* ==================== POS & CART ==================== */

function populateCustomerSelect() {
  const select = document.getElementById('pos-customer');
  if (!select) return;

  select.innerHTML = '<option value="عميل عام">عميل عام</option>';

  const stmt = db.prepare("SELECT name FROM customers ORDER BY name");
  while (stmt.step()) {
    const opt = document.createElement('option');
    opt.value = stmt.getAsObject().name;
    opt.textContent = stmt.getAsObject().name;
    select.appendChild(opt);
  }
  stmt.free();
}

function searchAndAddToCart() {
  const input = document.getElementById('product-search-input');
  if (!input) return;

  const query = (input.value || "").toLowerCase().trim();
  const stmt = db.prepare("SELECT * FROM products WHERE LOWER(name) LIKE ? AND stock > 0");
  stmt.bind(['%' + query + '%']);

  const products = [];
  while (stmt.step()) products.push(stmt.getAsObject());
  stmt.free();

  if (products.length === 0) return alert("❌ لا يوجد صنف بهذا الاسم");

  if (products.length === 1) {
    addToCart(products[0]);
  } else {
    let txt = products.map((p, i) => `${i + 1}. ${p.name} (${p.stock} ${p.unit})`).join('\n');
    const choice = prompt(`اختر رقم الصنف:\n${txt}`, "1");
    const idx = parseInt(choice) - 1;
    if (idx >= 0 && idx < products.length) addToCart(products[idx]);
  }
}

function addToCart(product) {
  const qty = parseFloat(prompt(`كمية ${product.name} (متوفر: ${product.stock})`, "1"));
  if (!qty || qty > product.stock) return alert("كمية غير متوفرة!");

  currentCart.push({
    id: product.id,
    name: product.name,
    qty: qty,
    price: product.price,
    cost: product.cost,
    subtotal: qty * product.price
  });

  renderCart();
  const input = document.getElementById('product-search-input');
  if (input) input.value = '';
}

function renderCart() {
  const container = document.getElementById('cart-items');
  if (!container) return;

  container.innerHTML = currentCart.map((item, i) => `
    <div class="flex justify-between items-center bg-gray-50 p-4 rounded-2xl">
      <div>${item.name} × ${item.qty}</div>
      <div class="flex items-center gap-3">
        <span class="font-bold">${item.subtotal} ريال</span>
        <i onclick="removeFromCart(${i})" class="fas fa-trash text-red-500 cursor-pointer"></i>
      </div>
    </div>`).join('');

  const total = currentCart.reduce((a, b) => a + b.subtotal, 0);
  const totalEl = document.getElementById('cart-total');
  if (totalEl) totalEl.textContent = total + ' ريال';
}

function removeFromCart(i) {
  if (confirm('حذف هذا الصنف من السلة؟')) {
    currentCart.splice(i, 1);
    renderCart();
  }
}

function saveSale() {
  if (currentCart.length === 0) return alert("السلة فارغة");

  const customerSelect = document.getElementById('pos-customer');
  const dateInput = document.getElementById('pos-date');

  const customer = customerSelect ? customerSelect.value || "عميل عام" : "عميل عام";
  const date = dateInput ? dateInput.value || new Date().toISOString().slice(0,10) : new Date().toISOString().slice(0,10);

  const total = currentCart.reduce((a, b) => a + b.subtotal, 0);
  const profit = currentCart.reduce((a, b) => a + (b.qty * (b.price - b.cost)), 0);

  db.run("INSERT INTO invoices (date, customer, total, profit) VALUES (?,?,?,?)", [date, customer, total, profit]);
  const invoiceId = db.exec("SELECT last_insert_rowid()")[0].values[0][0];

  const stmt = db.prepare("INSERT INTO invoice_items (invoice_id, product_id, name, qty, price, cost) VALUES (?,?,?,?,?,?)");
  currentCart.forEach(item => {
    stmt.run([invoiceId, item.id, item.name, item.qty, item.price, item.cost]);
    db.run("UPDATE products SET stock = stock - ? WHERE id = ?", [item.qty, item.id]);
  });
  stmt.free();

  if (customer !== "عميل عام") {
    db.run("UPDATE customers SET balance = balance + ? WHERE name = ?", [total, customer]);
  }

  saveDB();
  alert(`✅ تم حفظ الفاتورة رقم #${invoiceId} بنجاح!`);

  currentCart = [];
  renderCart();
  showScreen('dashboard');
  renderDashboard();
  renderSalesList();
}

function printCurrentSale() {
  if (currentCart.length === 0) return alert("السلة فارغة");

  let html = currentCart.map(i => 
    `<div style="display:flex;justify-content:space-between;margin:10px 0;">
      <span>${i.name} × ${i.qty}</span>
      <span>${i.subtotal} ريال</span>
    </div>`
  ).join('');

  const total = currentCart.reduce((a, b) => a + b.subtotal, 0);
  const customerSelect = document.getElementById('pos-customer');
  const dateInput = document.getElementById('pos-date');

  const printContent = `
    <div style="padding:40px;font-family:Arial;direction:rtl;text-align:right;max-width:600px;margin:auto;border:3px solid #0f766e;border-radius:15px;">
      <h1 style="text-align:center;color:#0f766e;font-size:28px;">تكاليف سوفت - النسيج Pro v2</h1>
      <p><strong>العميل:</strong> ${customerSelect ? customerSelect.value || "عميل عام" : "عميل عام"}</p>
      <p><strong>التاريخ:</strong> ${dateInput ? dateInput.value : ''}</p>
      <hr style="margin:20px 0;">
      ${html}
      <hr style="margin:20px 0;">
      <div style="font-size:24px;font-weight:bold;text-align:right;">الإجمالي: ${total} ريال</div>
    </div>`;

  const area = document.getElementById('print-area');
  if (area) {
    area.innerHTML = printContent;
    area.classList.remove('hidden');
    window.print();
    area.classList.add('hidden');
  }
}
