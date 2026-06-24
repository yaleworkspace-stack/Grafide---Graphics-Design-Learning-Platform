/* ============================================
   GRAFIDE — Main JavaScript v4
   Fixed auth state, restructured nav,
   toast system, SEO meta helpers
   ============================================ */

const API = 'http://localhost:8080/api';

/* ============================================
   TOKEN / SESSION
   ============================================ */
const getToken = () => localStorage.getItem('grafide_token');
const getUser  = () => JSON.parse(localStorage.getItem('grafide_user') || 'null');

const setSession = (token, user) => {
  localStorage.setItem('grafide_token', token);
  localStorage.setItem('grafide_user', JSON.stringify(user));
};

const clearSession = () => {
  localStorage.removeItem('grafide_token');
  localStorage.removeItem('grafide_user');
};

/* ============================================
   NAV AUTH STATE
   Controls which nav state is visible.

   Logged OUT: nav-links + nav-auth visible
               (Home, About, Contact | Sign In, Get Started)

   Logged IN:  nav-user visible
               (Home, About, Contact, Dashboard | Hi Name | Sign Out)
   ============================================ */
function updateAuthUI() {
  const user  = getUser();
  const token = getToken();

  const navLinks = document.getElementById('navLinks');
  const navAuth  = document.getElementById('navAuth');
  const navUser  = document.getElementById('navUser');
  const userName = document.getElementById('userName');

  if (user && token) {
    // Logged in
    navLinks?.classList.add('hidden');
    navAuth?.classList.add('hidden');
    navUser?.classList.remove('hidden');
    if (userName) userName.textContent = user.name.split(' ')[0];
  } else {
    // Logged out
    navLinks?.classList.remove('hidden');
    navAuth?.classList.remove('hidden');
    navUser?.classList.add('hidden');
  }
}

/* ============================================
   AUTH MODAL
   ============================================ */
function openModal(panel = 'login') {
  const overlay = document.getElementById('authModal');
  if (!overlay) return;
  overlay.classList.add('active');
  switchPanel(panel);
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const overlay = document.getElementById('authModal');
  if (!overlay) return;
  overlay.classList.remove('active');
  document.body.style.overflow = '';
}

function switchPanel(panel) {
  document.getElementById('loginPanel')?.classList.toggle('hidden', panel !== 'login');
  document.getElementById('signupPanel')?.classList.toggle('hidden', panel !== 'signup');
  // Clear errors on switch
  document.getElementById('loginError') && (document.getElementById('loginError').textContent = '');
  document.getElementById('signupError') && (document.getElementById('signupError').textContent = '');
}

/* ============================================
   LOGIN
   ============================================ */
async function handleLogin() {
  const email    = document.getElementById('loginEmail')?.value.trim();
  const password = document.getElementById('loginPassword')?.value;
  const errEl    = document.getElementById('loginError');
  const btn      = document.getElementById('loginBtn');

  if (!email || !password) { errEl.textContent = 'Please fill in all fields.'; return; }

  btn.textContent = 'Signing in...';
  btn.disabled    = true;

  try {
    const res  = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (!res.ok) { errEl.textContent = data.message || 'Login failed.'; return; }

    setSession(data.token, data.user);
    updateAuthUI();
    closeModal();
    showToast(`Welcome back, ${data.user.name.split(' ')[0]}!`, 'success');
    if (typeof onAuthSuccess === 'function') onAuthSuccess(data.user);
  } catch {
    errEl.textContent = 'Network error. Is the backend running?';
  } finally {
    btn.textContent = 'Sign In';
    btn.disabled    = false;
  }
}

/* ============================================
   SIGNUP
   ============================================ */
async function handleSignup() {
  const name     = document.getElementById('signupName')?.value.trim();
  const email    = document.getElementById('signupEmail')?.value.trim();
  const password = document.getElementById('signupPassword')?.value;
  const errEl    = document.getElementById('signupError');
  const btn      = document.getElementById('signupBtn');

  if (!name || !email || !password) { errEl.textContent = 'Please fill in all fields.'; return; }
  if (password.length < 8) { errEl.textContent = 'Password must be at least 8 characters.'; return; }

  btn.textContent = 'Creating account...';
  btn.disabled    = true;

  try {
    const res  = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role: 'STUDENT' })
    });
    const data = await res.json();

    if (!res.ok) { errEl.textContent = data.message || 'Signup failed.'; return; }

    setSession(data.token, data.user);
    updateAuthUI();
    closeModal();
    showToast(`Welcome to Grafide, ${data.user.name.split(' ')[0]}!`, 'success');
    if (typeof onAuthSuccess === 'function') onAuthSuccess(data.user);
  } catch {
    errEl.textContent = 'Network error. Is the backend running?';
  } finally {
    btn.textContent = 'Create Account';
    btn.disabled    = false;
  }
}

/* ============================================
   LOGOUT
   ============================================ */
function logout() {
  clearSession();
  updateAuthUI();
  showToast('Signed out.', 'success');
  // Redirect to home if on a protected page
  const protectedPages = ['dashboard.html'];
  const onProtected = protectedPages.some(p => window.location.pathname.includes(p));
  if (onProtected) {
    setTimeout(() => { window.location.href = '../index.html'; }, 800);
  }
}

/* ============================================
   TOAST
   ============================================ */
function showToast(msg, type = 'success') {
  let toast = document.getElementById('globalToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'globalToast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className   = `toast ${type}`;
  // Force reflow for re-trigger
  void toast.offsetWidth;
  toast.classList.add('show');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => toast.classList.remove('show'), 3200);
}

/* ============================================
   BURGER NAV
   ============================================ */
function initBurger() {
  const burger = document.getElementById('navBurger');
  const mobile = document.getElementById('navMobile');
  if (!burger || !mobile) return;
  burger.addEventListener('click', () => {
    mobile.classList.toggle('open');
  });
  // Close on outside click
  document.addEventListener('click', e => {
    if (!burger.contains(e.target) && !mobile.contains(e.target)) {
      mobile.classList.remove('open');
    }
  });
}

/* ============================================
   NEWSLETTER
   ============================================ */
async function subscribeNewsletter() {
  const input = document.getElementById('newsletterEmail');
  const email = input?.value.trim();
  if (!email) return;
  try {
    await fetch(`${API}/newsletter/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
  } catch { /* silent */ }
  input.value       = '';
  input.placeholder = "You're subscribed!";
  showToast('Subscribed!', 'success');
}

/* ============================================
   SEO HELPERS
   ============================================ */
function setSEOMeta({ title, description, url, type = 'website' } = {}) {
  // Title
  if (title) {
    document.title = `${title} — Grafide`;
    setMeta('og:title', `${title} — Grafide`);
    setMeta('twitter:title', `${title} — Grafide`);
  }
  // Description
  if (description) {
    setMeta('description', description);
    setMeta('og:description', description);
    setMeta('twitter:description', description);
  }
  // URL
  if (url) {
    setMeta('og:url', url);
    setLinkCanonical(url);
  }
  // Type
  setMeta('og:type', type);
  setMeta('og:site_name', 'Grafide');
  setMeta('twitter:card', 'summary_large_image');
}

function setMeta(nameOrProp, content) {
  // Try name first, then property
  let el = document.querySelector(`meta[name="${nameOrProp}"]`)
        || document.querySelector(`meta[property="${nameOrProp}"]`);
  if (!el) {
    el = document.createElement('meta');
    // og: and twitter: use property, others use name
    if (nameOrProp.startsWith('og:') || nameOrProp.startsWith('twitter:')) {
      el.setAttribute('property', nameOrProp);
    } else {
      el.setAttribute('name', nameOrProp);
    }
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setLinkCanonical(url) {
  let el = document.querySelector('link[rel="canonical"]');
  if (!el) { el = document.createElement('link'); el.rel = 'canonical'; document.head.appendChild(el); }
  el.href = url;
}

/* ============================================
   SKELETON LOADERS
   ============================================ */
function skeletonCards(container, count = 3) {
  if (!container) return;
  container.innerHTML = Array.from({ length: count }, () => `
    <div class="skeleton-card">
      <div class="skeleton skeleton-line short"></div>
      <div class="skeleton skeleton-line title"></div>
      <div class="skeleton skeleton-line full"></div>
      <div class="skeleton skeleton-line medium"></div>
      <div class="skeleton skeleton-line short"></div>
    </div>`).join('');
}

/* ============================================
   CONTACT ENDPOINT
   ============================================ */
async function submitContactForm({ name, email, subject, message }) {
  const res = await fetch(`${API}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, subject, message })
  });
  return res.ok;
}

/* ============================================
   INIT
   ============================================ */
document.addEventListener('DOMContentLoaded', () => {
  updateAuthUI();
  initBurger();

  // Modal close
  document.getElementById('closeModal')?.addEventListener('click', closeModal);
  document.getElementById('authModal')?.addEventListener('click', e => {
    if (e.target.id === 'authModal') closeModal();
  });

  // Escape key closes modal
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  // Auth buttons
  document.getElementById('loginBtn')?.addEventListener('click', handleLogin);
  document.getElementById('signupBtn')?.addEventListener('click', handleSignup);

  // Enter key on inputs
  document.querySelectorAll('.auth-field input').forEach(input => {
    input.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      const panel = input.closest('#loginPanel') ? 'login' : 'signup';
      panel === 'login' ? handleLogin() : handleSignup();
    });
  });

  // Page-specific SEO
  const path = window.location.pathname;
  if (path.includes('about'))    setSEOMeta({ title: 'About', description: 'Learn about Grafide — the graphics design learning platform built for structured, accountable learning.' });
  if (path.includes('contact'))  setSEOMeta({ title: 'Contact', description: 'Get in touch with the Grafide team.' });
  if (path.includes('dashboard'))setSEOMeta({ title: 'My Dashboard', description: 'Track your learning progress and certificates on Grafide.' });
  if (path.includes('course'))   setSEOMeta({ title: 'Course', description: 'Learn graphics design with structured lessons, video tutorials, and verified certificates.' });
  if (path.includes('verify'))   setSEOMeta({ title: 'Verify Certificate', description: 'Verify the authenticity of a Grafide design certificate.' });
});