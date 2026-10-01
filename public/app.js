const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
});

const elements = {
  todayCash: document.querySelector('#today-cash'),
  date: document.querySelector('#dashboard-date'),
  lowStock: document.querySelector('#low-stock'),
  creditOutstanding: document.querySelector('#credit-outstanding'),
  salesCount: document.querySelector('#sales-count'),
  error: document.querySelector('#dashboard-error'),
  actionMessage: document.querySelector('#action-message'),
};

if (window.lucide) window.lucide.createIcons();

function removeLoading() {
  document.querySelectorAll('.loading-block').forEach((element) => element.classList.remove('loading-block'));
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'long' }).format(new Date(`${value}T00:00:00`));
}

async function loadDashboard() {
  try {
    const response = await fetch('/dashboard');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Dashboard data is temporarily unavailable.');

    elements.todayCash.textContent = currency.format(data.today_cash);
    elements.date.textContent = formatDate(data.date);
    elements.lowStock.textContent = data.low_stock_count;
    elements.creditOutstanding.textContent = currency.format(data.credit_outstanding);
    elements.salesCount.textContent = data.sales_count_today;
    removeLoading();
  } catch (error) {
    removeLoading();
    elements.error.hidden = false;
    elements.error.textContent = error.message;
  }
}

loadDashboard();