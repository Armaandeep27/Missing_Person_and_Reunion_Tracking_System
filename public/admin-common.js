const currentUser = JSON.parse(localStorage.getItem('missingTrackUser') || 'null');
const roleAccess = {
  admin: ['overview', 'persons', 'agencies', 'sightings', 'rehabilitation', 'support', 'reunions'],
  agency: ['overview', 'persons', 'sightings', 'rehabilitation', 'reunions'],
  sponsor: ['support']
};
const roleHome = { admin: 'dashboard.html', agency: 'dashboard.html', sponsor: 'support.html' };
const pageName = document.body.dataset.page || 'overview';
const currentRole = currentUser?.role || '';
const allowedPages = roleAccess[currentRole] || [];

if (!currentUser && !location.pathname.endsWith('/login.html') && !location.pathname.endsWith('/index.html') && location.pathname !== '/') {
  location.href = 'login.html';
}

if (currentUser && pageName && allowedPages.length && !allowedPages.includes(pageName)) {
  location.href = roleHome[currentRole] || 'dashboard.html';
}

if (currentUser) {
  const n = document.getElementById('dashboardName');
  const e = document.getElementById('dashboardEmail');
  if (n) n.textContent = currentUser.full_name || currentUser.username;
  if (e) e.textContent = (currentUser.role || '').toUpperCase() + ' - ' + (currentUser.email || '');
}

document.querySelectorAll('.sidebar-link').forEach(a => {
  const isAllowed = allowedPages.includes(a.dataset.nav);
  a.classList.toggle('hidden-by-role', currentUser && !isAllowed);
  if (a.dataset.nav === pageName) a.classList.add('active');
});

function authHeaders(extra = {}) {
  return { ...extra, 'X-User-Id': String(currentUser?.id || '') };
}

document.getElementById('logoutButton')?.addEventListener('click', () => {
  localStorage.removeItem('missingTrackUser');
  location.href = 'login.html';
});

function esc(value){ return String(value ?? '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }
function badge(value){ const v=String(value??''); let c=''; if(/Missing|Pending|New|Planned|Follow/.test(v))c='warn'; if(/Verified|Active|Sighted|Progress|Reunited|Completed/.test(v))c='blue'; if(/Rejected|Closed|Paused/.test(v))c='red'; return '<span class="badge '+c+'">'+esc(v)+'</span>'; }
