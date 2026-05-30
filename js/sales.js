/* ==================== SALES LIST ==================== */

function renderSalesList() {
  const container = document.getElementById('sales-list-container');
  if (!container) return;
  container.innerHTML = '';

  const stmt = db.prepare("SELECT * FROM invoices ORDER BY id DESC LIMIT 50");
  while (stmt.step()) {
    const inv = stmt.getAsObject();
    const div = document.createElement('div');
    div.className = "bg-white p-5 rounded-3xl shadow flex justify-between items-center cursor-pointer";
    div.innerHTML = `<div><div class="font-bold">#${inv.id} - ${inv.customer}</div><div class="text-sm">${inv.date} • ${inv.total} ريال</div></div>`;
    div.onclick = () => viewInvoiceDetails(inv.id);
    container.appendChild(div);
  }
  stmt.free();
}

function viewInvoiceDetails(id) {
  // TODO: يمكن تحسين هذه الدالة لعرض تفاصيل الفاتورة كاملة
  alert(`تفاصيل الفاتورة رقم #${id}\n\n(يمكن توسيع هذه الميزة لعرض الأصناف في التحديث القادم)`);
}
