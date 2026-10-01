const stockMoney = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 });
const stockState = { products: [] };
const stockMessage = document.querySelector('#stock-message');

if (window.lucide) window.lucide.createIcons();
function showStockMessage(text, type = 'error-message') { stockMessage.hidden = false; stockMessage.className = `message ${type}`; stockMessage.textContent = text; }
function dateLabel(value) { return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(value)); }
function renderInventory() {
  const body = document.querySelector('#inventory-body');
  if (!stockState.products.length) { body.innerHTML = '<tr><td colspan="5" class="empty-state">No products were returned by the store.</td></tr>'; return; }
  body.innerHTML = stockState.products.map((product) => {
    const low = product.stock_on_hand <= product.reorder_level;
    return `<tr class="${low ? 'low-stock-row' : ''}" data-id="${product.product_id}">
      <td><span class="product-name">${escapeStock(product.name)}</span>${low ? '<br><span class="stock-warning">Needs attention</span>' : ''}</td>
      <td><div class="price-edit"><span>₹</span><input class="price-input" type="number" min="0" step="0.01" value="${product.unit_price}"><button class="save-price" type="button">Save</button></div></td>
      <td>${product.stock_on_hand}</td><td>${product.reorder_level}</td>
      <td><button class="delete-icon delete-product" type="button" aria-label="Delete ${escapeStock(product.name)}" title="Delete product"><i class="icon" data-lucide="trash-2" aria-hidden="true"></i></button></td>
    </tr>`;
  }).join('');
  body.querySelectorAll('.save-price').forEach((button) => button.addEventListener('click', savePrice));
  body.querySelectorAll('.delete-product').forEach((button) => button.addEventListener('click', deleteProduct));
  if (window.lucide) window.lucide.createIcons();
}
function escapeStock(value) { return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]); }
async function loadInventory() {
  try { const response = await fetch('/products'); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Inventory could not be loaded.'); stockState.products = data; renderInventory(); }
  catch (error) { showStockMessage(error.message); }
}
async function savePrice(event) {
  const row = event.target.closest('tr'); const input = row.querySelector('.price-input'); const productId = row.dataset.id; const unitPrice = Number(input.value); const button = event.target;
  if (!Number.isFinite(unitPrice) || unitPrice < 0) { showStockMessage('Enter a valid non-negative price.'); return; }
  button.disabled = true;
  try { const response = await fetch(`/products/${productId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ unit_price: unitPrice }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Price could not be updated.'); stockState.products = stockState.products.map((product) => product.product_id === data.product_id ? data : product); renderInventory(); showStockMessage(`${data.name} was updated.`, 'status-message'); }
  catch (error) { showStockMessage(error.message); button.disabled = false; }
}
async function deleteProduct(event) { const button = event.currentTarget; const row = button.closest('tr'); const productId = row.dataset.id; const productName = row.querySelector('.product-name').textContent; if (!window.confirm('Delete this product?')) return; button.disabled = true; try { const response = await fetch(`/products/${productId}`, { method: 'DELETE' }); const data = response.status === 204 ? {} : await response.json(); if (!response.ok) throw new Error(data.error || 'Product could not be deleted.'); stockState.products = stockState.products.filter((product) => product.product_id !== Number(productId)); renderInventory(); showStockMessage(`${productName} was deleted.`, 'status-message'); } catch (error) { showStockMessage(error.message); button.disabled = false; } }
async function createProduct(event) { event.preventDefault(); const form = event.currentTarget; const button = form.querySelector('button[type="submit"]'); button.disabled = true; try { const response = await fetch('/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.elements.name.value, category: form.elements.category.value, unit_price: Number(form.elements.unit_price.value), unit: form.elements.unit.value, reorder_level: Number(form.elements.reorder_level.value), stock_on_hand: Number(form.elements.stock_on_hand.value || 0) }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Product could not be created.'); stockState.products.push(data); renderInventory(); form.reset(); form.hidden = true; document.querySelector('#add-product').hidden = false; showStockMessage(`${data.name} was added.`, 'status-message'); } catch (error) { showStockMessage(error.message); } finally { button.disabled = false; } }
async function loadHistory() {
  const body = document.querySelector('#history-body'); body.innerHTML = '<tr><td colspan="3"><div class="loading-bar"></div></td></tr>';
  try { const response = await fetch('/purchase-history'); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Purchase history could not be loaded.'); body.innerHTML = data.length ? data.map((purchase) => `<tr><td>${dateLabel(purchase.purchase_date)}</td><td>${escapeStock(purchase.supplier_name || 'Unassigned supplier')}</td><td>${stockMoney.format(purchase.total_amount)}</td></tr>`).join('') : '<tr><td colspan="3" class="empty-state">No purchases have been recorded yet.</td></tr>'; }
  catch (error) { showStockMessage(error.message); body.innerHTML = ''; }
}
document.querySelectorAll('.toggle-button').forEach((button) => button.addEventListener('click', () => { document.querySelectorAll('.toggle-button').forEach((item) => item.classList.toggle('active', item === button)); const inventory = button.dataset.view === 'inventory'; document.querySelector('#inventory-view').hidden = !inventory; document.querySelector('#history-view').hidden = inventory; if (!inventory) loadHistory(); }));
document.querySelector('#add-product').addEventListener('click', () => { document.querySelector('#product-form').hidden = false; document.querySelector('#add-product').hidden = true; document.querySelector('#product-form input[name="name"]').focus(); });
document.querySelector('#cancel-product').addEventListener('click', () => { document.querySelector('#product-form').reset(); document.querySelector('#product-form').hidden = true; document.querySelector('#add-product').hidden = false; });
document.querySelector('#product-form').addEventListener('submit', createProduct);
loadInventory();