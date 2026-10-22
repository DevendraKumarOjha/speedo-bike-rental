const tokenKey = 'speedo-super-admin-token';
const apiBase =
  new URLSearchParams(window.location.search).get('api') ||
  `${window.location.origin}/api`;
const loginPanel = document.querySelector('#login-panel');
const dashboard = document.querySelector('#dashboard');
const loginForm = document.querySelector('#login-form');
const loginError = document.querySelector('#login-error');
const dashboardError = document.querySelector('#dashboard-error');
const settleButton = document.querySelector('#settle');

const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const dateTime = (value) =>
  value ? new Date(value).toLocaleString() : '-';

const request = async (route, options = {}) => {
  const token = sessionStorage.getItem(tokenKey);
  const response = await fetch(`${apiBase}${route}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
};

const showDashboard = (visible) => {
  loginPanel.hidden = visible;
  dashboard.hidden = !visible;
};

const renderRows = (selector, rows, columns, emptyMessage) => {
  const body = document.querySelector(selector);
  body.innerHTML = rows.length
    ? rows.map((row) => `<tr>${columns.map((column) =>
      `<td>${escapeHtml(column(row))}</td>`).join('')}</tr>`).join('')
    : `<tr><td class="empty" colspan="${columns.length}">${escapeHtml(emptyMessage)}</td></tr>`;
};

const renderDashboard = (data) => {
  const users = data.users || [];
  const bikes = data.bikes || [];
  const bookings = data.bookings || [];
  const settlements = data.settlements || [];
  const wallet = data.wallet || {};
  const commission = bookings.reduce(
    (sum, booking) => sum + Number(booking.superAdminCommission || 0),
    0
  );
  const paidToAdmins = Number(wallet.totalPaidToAdmins || 0);
  const adminUsers = users.filter((user) => user.role === 'ADMIN').length;
  const riderUsers = users.filter((user) => user.role === 'USER').length;

  document.querySelector('#metrics').innerHTML = [
    ['Platform gross', money(wallet.totalGrossReceived)],
    ['Commission earned', money(wallet.totalCommission)],
    ['Pending admin payouts', money(data.pendingPayouts)],
    ['Users / providers', `${riderUsers} / ${adminUsers}`],
    ['Registered bikes', bikes.length],
    ['Bookings', bookings.length],
    ['Commission rate', `${Number(data.commissionRate || 0) * 100}%`],
    ['Paid to providers', money(paidToAdmins)],
  ].map(([label, value]) => `
    <article class="metric">
      <span class="metric-label">${escapeHtml(label)}</span>
      <span class="metric-value">${escapeHtml(value)}</span>
    </article>
  `).join('');

  renderRows('#users', users, [
    (user) => user.mobile,
    (user) => user.role,
    (user) => user.id,
  ], 'No user accounts yet.');

  renderRows('#bikes', bikes, [
    (bike) => `${bike.bikeName} (${bike.bikeNumber})`,
    (bike) => bike.adminMobile,
    (bike) => `${bike.hotelName}, ${bike.city}`,
    (bike) => `${money(bike.pricePerHour)}/hr`,
    (bike) => bike.status,
  ], 'No bikes registered yet.');

  renderRows('#bookings', bookings, [
    (booking) => booking.id,
    (booking) => booking.userMobile,
    (booking) => booking.adminMobile,
    (booking) => money(booking.grossAmount),
    (booking) => money(booking.superAdminCommission),
    (booking) => money(booking.adminAmount),
    (booking) => booking.status,
  ], 'No bookings yet.');

  renderRows('#settlements', settlements.slice().reverse(), [
    (record) => dateTime(record.createdAt),
    (record) => record.adminMobile,
    (record) => money(record.amount),
    (record) => (record.bookingIds || []).length,
    (record) => record.status,
  ], 'No weekly settlement records yet.');
};

const loadDashboard = async () => {
  dashboardError.textContent = '';
  try {
    const data = await request('/super-admin/dashboard');
    renderDashboard(data);
  } catch (error) {
    dashboardError.textContent = error.message;
    if (error.message.includes('session') || error.message.includes('Sign in')) {
      sessionStorage.removeItem(tokenKey);
      showDashboard(false);
    }
  }
};

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginError.textContent = '';
  const button = loginForm.querySelector('button');
  button.disabled = true;

  try {
    const response = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        mobile: document.querySelector('#mobile').value.trim(),
        password: document.querySelector('#password').value,
      }),
    });

    if (response.user?.role !== 'SUPER_ADMIN') {
      throw new Error('This portal is available to Super Admin accounts only.');
    }

    sessionStorage.setItem(tokenKey, response.token);
    document.querySelector('#password').value = '';
    showDashboard(true);
    await loadDashboard();
  } catch (error) {
    loginError.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

document.querySelector('#logout').addEventListener('click', () => {
  sessionStorage.removeItem(tokenKey);
  showDashboard(false);
});

settleButton.addEventListener('click', async () => {
  if (!window.confirm('Record a demo settlement for all pending admin balances? No real money will be transferred.')) {
    return;
  }

  settleButton.disabled = true;
  dashboardError.textContent = '';

  try {
    const response = await request('/super-admin/settle-weekly', {
      method: 'POST',
    });
    window.alert(`${response.message}. ${response.settledBookings} booking(s) recorded.`);
    await loadDashboard();
  } catch (error) {
    dashboardError.textContent = error.message;
  } finally {
    settleButton.disabled = false;
  }
});

if (sessionStorage.getItem(tokenKey)) {
  showDashboard(true);
  loadDashboard();
}
