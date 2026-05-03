const roleProfiles = {
  admin: {
    user: 'admin',
    password: 'admin123',
    hint: 'Admin has full access to every module.',
    credential: 'Demo login: admin / admin123'
  },
  agency: {
    user: 'agency',
    password: 'agency123',
    hint: 'Agency users can manage cases, sightings, rehabilitation, and reunions. They cannot create agencies or sponsor programs.',
    credential: 'Demo login: agency / agency123'
  },
  sponsor: {
    user: 'sponsor',
    password: 'sponsor123',
    hint: 'Sponsor users can manage support programs only.',
    credential: 'Demo login: sponsor / sponsor123'
  }
};

const chips = document.querySelectorAll('.role-chip');
const roleInput = document.getElementById('role');
const userField = document.getElementById('userId');
const passwordField = document.getElementById('password');
const fullNameField = document.getElementById('fullName');
const emailField = document.getElementById('email');
const roleHint = document.getElementById('roleHint');
const credentialHint = document.getElementById('credentialHint');
const authTitle = document.getElementById('authTitle');
const authSubmit = document.getElementById('authSubmit');
const authTabs = document.querySelectorAll('.auth-tab');
let authMode = 'login';

function applyRole(role) {
  if (authMode === 'signup' && role === 'admin') role = 'agency';
  const profile = roleProfiles[role] || roleProfiles.admin;
  chips.forEach(c => c.classList.toggle('active', c.dataset.role === role));
  roleInput.value = role;
  userField.placeholder = profile.user;
  passwordField.placeholder = profile.password;
  roleHint.textContent = profile.hint;
  credentialHint.textContent = authMode === 'signup' ? 'Create a new account for the selected role.' : profile.credential;
}

function applyMode(mode) {
  authMode = mode;
  document.body.classList.toggle('auth-login', mode === 'login');
  document.body.classList.toggle('auth-signup', mode === 'signup');
  if (mode === 'signup' && roleInput.value === 'admin') applyRole('agency');
  authTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.mode === mode));
  authTitle.textContent = mode === 'signup' ? 'Create Account' : 'Portal Login';
  authSubmit.innerHTML = mode === 'signup'
    ? '<i class="fa-solid fa-user-plus"></i> Sign Up'
    : '<i class="fa-solid fa-right-to-bracket"></i> Login';
  credentialHint.textContent = mode === 'signup'
    ? 'Create a new agency or sponsor account.'
    : roleProfiles[roleInput.value || 'admin'].credential;
  fullNameField.required = mode === 'signup';
  emailField.required = mode === 'signup';
}

chips.forEach(chip => chip.addEventListener('click', () => applyRole(chip.dataset.role)));
authTabs.forEach(tab => tab.addEventListener('click', () => applyMode(tab.dataset.mode)));
applyRole(roleInput.value || 'admin');
applyMode('login');

document.getElementById('loginForm')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const status = document.getElementById('loginStatus');
  status.textContent = authMode === 'signup' ? 'Creating account...' : 'Checking credentials...';
  status.className = 'status-message';
  try {
    const payload = authMode === 'signup'
      ? {
          fullName: fullNameField.value.trim(),
          email: emailField.value.trim(),
          username: userField.value.trim(),
          password: passwordField.value,
          role: roleInput.value
        }
      : {
          userId: userField.value.trim(),
          password: passwordField.value,
          role: roleInput.value
        };
    const res = await fetch(authMode === 'signup' ? '/api/register' : '/api/login', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.message);
    localStorage.setItem('missingTrackUser', JSON.stringify(data.user));
    location.href = data.user.role === 'sponsor' ? 'support.html' : 'dashboard.html';
  } catch (error) {
    status.textContent = error.message || 'Login failed.';
    status.className = 'status-message error';
  }
});
