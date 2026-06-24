/* ============================================
   GRAFIDE — Dashboard JavaScript v4
   Fixed: auth gate shows correctly
   ============================================ */

const DASH_API = 'http://localhost:8080/api';

const COURSE_META = {
  coreldraw:   { name: 'CorelDRAW',        tag: 'Vector Design' },
  photoshop:   { name: 'Photoshop',         tag: 'Photo Editing' },
  illustrator: { name: 'Adobe Illustrator', tag: 'Illustration'  },
  msword:      { name: 'Microsoft Word',    tag: 'Layout & Type' },
  canva:       { name: 'Canva',             tag: 'Quick Design'  },
};

let _allCourses  = [];
let _allProgress = [];
let _allCerts    = [];

/* ============================================
   INIT — called on DOMContentLoaded
   ============================================ */
async function initDashboard() {
  const user  = getUser();
  const token = getToken();

  const gate  = document.getElementById('dashGate');
  const shell = document.getElementById('dashShell');

  // ---- NOT LOGGED IN ----
  if (!user || !token) {
    gate?.classList.remove('hidden');   // show gate
    shell?.classList.add('hidden');     // hide shell
    return;
  }

  // ---- LOGGED IN ----
  gate?.classList.add('hidden');        // hide gate
  shell?.classList.remove('hidden');    // show shell

  // Personalise greeting
  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning'
                 : hour < 17 ? 'Good afternoon'
                 : 'Good evening';
  const first = user.name.split(' ')[0];
  const welcomeEl = document.getElementById('dashWelcome');
  if (welcomeEl) welcomeEl.textContent = `${greeting}, ${first}`;

  // Show skeleton while loading
  skeletonCards(document.getElementById('continueCards'), 2);
  skeletonCards(document.getElementById('certCards'), 2);
  skeletonCards(document.getElementById('allCoursesGrid'), 5);

  // Load data in parallel
  await Promise.all([
    loadCourses(),
    loadProgress(),
    loadCertificates()
  ]);

  renderStats();
  renderContinueCards();
  renderCertCards();
  renderAllCourses();
}

/* ============================================
   DATA
   ============================================ */
async function loadCourses() {
  try {
    const res = await fetch(`${DASH_API}/courses`);
    if (res.ok) _allCourses = await res.json();
  } catch { _allCourses = []; }
}

async function loadProgress() {
  try {
    const res = await fetch(`${DASH_API}/progress`, { headers: authH() });
    if (res.ok) _allProgress = await res.json();
  } catch { _allProgress = []; }
}

async function loadCertificates() {
  try {
    const res = await fetch(`${DASH_API}/certificates/mine`, { headers: authH() });
    if (res.ok) _allCerts = await res.json();
  } catch { _allCerts = []; }
}

/* ============================================
   STATS
   ============================================ */
function renderStats() {
  const started = _allProgress.filter(p => p.completedLessons?.length > 0).length;
  const lessons = _allProgress.reduce((a, p) => a + (p.completedLessons?.length || 0), 0);
  const certs   = _allCerts.length;

  document.getElementById('dashStatCourses').textContent = started;
  document.getElementById('dashStatLessons').textContent = lessons;
  document.getElementById('dashStatCerts').textContent   = certs;

  const sub = certs > 0
    ? `${certs} certificate${certs > 1 ? 's' : ''} earned. Keep it up.`
    : started > 0
    ? `${lessons} lesson${lessons !== 1 ? 's' : ''} done across ${started} course${started !== 1 ? 's' : ''}.`
    : 'Pick a course below and start your first lesson.';

  const subEl = document.getElementById('dashSubtitle');
  if (subEl) subEl.textContent = sub;
}

/* ============================================
   CONTINUE LEARNING
   ============================================ */
function renderContinueCards() {
  const container = document.getElementById('continueCards');
  if (!container) return;

  const inProgress = _allProgress.filter(
    p => p.completedLessons?.length > 0 && !p.courseCompleted
  );

  if (!inProgress.length) {
    container.innerHTML = `
      <div class="dash-empty">
        <i class="fa-solid fa-book-open"></i>
        <p>You haven't started any courses yet.</p>
        <a href="../index.html#courses" class="btn-primary" style="margin-top:1rem;">Browse Courses</a>
      </div>`;
    return;
  }

  container.innerHTML = inProgress.map(progress => {
    const course = _allCourses.find(c => c.id === progress.courseId);
    if (!course) return '';

    const total = course.levels?.reduce((a, l) => a + l.lessons.length, 0) || 0;
    const done  = progress.completedLessons?.length || 0;
    const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
    const meta  = COURSE_META[course.slug] || { name: course.name, tag: '' };

    return `
      <div class="dash-course-card">
        <div class="dash-card-top">
          <span class="dash-card-tool">${meta.tag}</span>
          <span class="dash-card-pct">${pct}%</span>
        </div>
        <h4 class="dash-card-name">${meta.name}</h4>
        <div class="dash-card-bar">
          <div class="dash-card-bar-fill" style="width:${pct}%"></div>
        </div>
        <p class="dash-card-meta">${done} of ${total} lessons complete</p>
        <a href="course.html?tool=${course.slug}" class="dash-card-cta">
          Continue <i class="fa-solid fa-arrow-right"></i>
        </a>
      </div>`;
  }).join('');
}

/* ============================================
   CERTIFICATES
   ============================================ */
function renderCertCards() {
  const container = document.getElementById('certCards');
  if (!container) return;

  if (!_allCerts.length) {
    container.innerHTML = `
      <div class="dash-empty">
        <i class="fa-solid fa-certificate"></i>
        <p>Complete a course to earn your first certificate.</p>
      </div>`;
    return;
  }

  container.innerHTML = _allCerts.map(cert => {
    const issued = new Date(cert.issuedAt).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
    return `
      <div class="dash-cert-card">
        <div class="dash-cert-icon">🏆</div>
        <h4 class="dash-cert-course">${cert.courseName}</h4>
        <p class="dash-cert-date">Issued ${issued}</p>
        <p class="dash-cert-id">${cert.certificateId}</p>
        <div class="dash-cert-actions">
          <button class="dash-cert-btn" onclick="window.open('verify.html?id=${cert.certificateId}','_blank')">
            <i class="fa-solid fa-eye"></i> View
          </button>
          <button class="dash-cert-btn" onclick="copyToClipboard('${window.location.origin}/pages/verify.html?id=${cert.certificateId}')">
            <i class="fa-solid fa-share-nodes"></i> Share
          </button>
        </div>
      </div>`;
  }).join('');
}

/* ============================================
   ALL COURSES
   ============================================ */
function renderAllCourses() {
  const container = document.getElementById('allCoursesGrid');
  if (!container) return;

  if (!_allCourses.length) {
    container.innerHTML = `<div class="dash-empty"><p>No courses available yet.</p></div>`;
    return;
  }

  container.innerHTML = _allCourses.map(course => {
    const progress  = _allProgress.find(p => p.courseId === course.id);
    const total     = course.levels?.reduce((a, l) => a + l.lessons.length, 0) || 0;
    const done      = progress?.completedLessons?.length || 0;
    const pct       = total > 0 ? Math.round((done / total) * 100) : 0;
    const completed = progress?.courseCompleted || false;
    const meta      = COURSE_META[course.slug] || { name: course.name, tag: '' };

    const statusClass = completed ? 'status-completed'
                      : done > 0  ? 'status-in-progress'
                      :             'status-not-started';
    const statusText  = completed ? 'Completed'
                      : done > 0  ? 'In Progress'
                      :             'Not Started';

    return `
      <a href="course.html?tool=${course.slug}" class="dash-all-card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;">
          <span class="dash-all-name">${meta.name}</span>
          <span class="dash-all-status ${statusClass}">${statusText}</span>
        </div>
        <div class="dash-all-bar">
          <div class="dash-all-bar-fill" style="width:${pct}%"></div>
        </div>
        <div class="dash-all-meta">
          <span>${done} / ${total} lessons</span>
          <span>${pct}%</span>
        </div>
      </a>`;
  }).join('');
}

/* ============================================
   UTILS
   ============================================ */
function authH() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function copyToClipboard(text) {
  if (navigator.share) {
    navigator.share({ title: 'My Grafide Certificate', url: text });
  } else {
    navigator.clipboard.writeText(text)
      .then(() => showToast('Certificate link copied!', 'success'))
      .catch(() => showToast('Copy failed — try manually.', 'error'));
  }
}

/* Called by main.js after successful login/signup */
function onAuthSuccess() {
  initDashboard();
}

/* ============================================
   BOOT
   ============================================ */
document.addEventListener('DOMContentLoaded', initDashboard);