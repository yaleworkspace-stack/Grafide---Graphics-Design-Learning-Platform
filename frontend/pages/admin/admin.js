/* ============================================
   GRAFIDE ADMIN — Panel JavaScript v2
   Fixed: removed duplicate const API declaration
   (API is defined in main.js which loads first)
   ============================================ */

/* ---- STATE ---- */
let allCourses    = [];
let allLessons    = [];
let allQuizzes    = [];
let editingLesson = null;
let editingQuiz   = null;
let sourceMode    = false;

/* ============================================
   GATE — Admin login
   ============================================ */
async function gateLogin() {
  const email    = document.getElementById('gateEmail').value.trim();
  const password = document.getElementById('gatePassword').value;
  const errEl    = document.getElementById('gateError');
  const btn      = document.getElementById('gateLoginBtn');

  if (!email || !password) { errEl.textContent = 'Fill in all fields.'; return; }

  btn.textContent = 'Signing in...';
  btn.disabled    = true;

  try {
    const res  = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (!res.ok || data.user?.role !== 'ADMIN') {
      errEl.textContent = data.message || 'Access denied. Admin accounts only.';
      return;
    }

    localStorage.setItem('grafide_token', data.token);
    localStorage.setItem('grafide_user', JSON.stringify(data.user));
    document.getElementById('adminUserName').textContent = data.user.name.split(' ')[0];
    document.getElementById('adminGate').style.display  = 'none';
    document.getElementById('adminShell').classList.remove('hidden');
    initAdmin();
  } catch (err) {
    errEl.textContent = 'Network error. Is the backend running?';
  } finally {
    btn.textContent = 'Sign In';
    btn.disabled    = false;
  }
}

function adminLogout() {
  localStorage.removeItem('grafide_token');
  localStorage.removeItem('grafide_user');
  location.reload();
}

function checkAdminSession() {
  const token = localStorage.getItem('grafide_token');
  const user  = JSON.parse(localStorage.getItem('grafide_user') || 'null');

  if (token && user?.role === 'ADMIN') {
    document.getElementById('adminUserName').textContent = user.name.split(' ')[0];
    document.getElementById('adminGate').style.display  = 'none';
    document.getElementById('adminShell').classList.remove('hidden');
    initAdmin();
  }
}

/* ============================================
   INIT
   ============================================ */
async function initAdmin() {
  await loadAllCourses();
  await loadDashboardStats();
  populateCourseSelects();
  loadLessonsTable();
  loadQuizzesTable();
  loadCertsTable();
  loadUsersTable();
  loadPortfolioTable();
}

/* ============================================
   VIEW SWITCHING
   ============================================ */
function switchView(viewName) {
  document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.admin-nav-item').forEach(n => n.classList.remove('active'));

  document.getElementById(`view-${viewName}`)?.classList.add('active');
  document.querySelector(`[data-view="${viewName}"]`)?.classList.add('active');

  const titles = {
    dashboard: 'Dashboard', courses: 'Courses', lessons: 'Lessons',
    quizzes: 'Quizzes', portfolio: 'Portfolio', certificates: 'Certificates', users: 'Users'
  };
  document.getElementById('adminPageTitle').textContent = titles[viewName] || viewName;

  if (viewName === 'portfolio') loadPortfolioTable();
  if (viewName === 'courses')      renderCoursesTable();
  if (viewName === 'lessons')      loadLessonsTable();
  if (viewName === 'quizzes')      loadQuizzesTable();
  if (viewName === 'certificates') loadCertsTable();
  if (viewName === 'users')        loadUsersTable();
}

/* ============================================
   COURSES
   ============================================ */
async function loadAllCourses() {
  try {
    const res  = await apiFetch('/courses');
    allCourses = await res.json();
    renderCoursesTable();
    renderDashboardCourseList();
  } catch (e) { console.error('Failed to load courses', e); }
}

function renderCoursesTable() {
  const tbody = document.getElementById('coursesTableBody');
  if (!tbody) return;
  if (!allCourses.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-light);padding:2rem;">
      No courses yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = allCourses.map(c => {
    const lessonCount = c.levels?.reduce((a, l) => a + l.lessons.length, 0) || 0;
    return `<tr>
      <td><strong>${c.name}</strong></td>
      <td><code style="font-size:0.8rem;color:var(--cyan)">${c.slug}</code></td>
      <td>${c.levels?.length || 0}</td>
      <td>${lessonCount}</td>
      <td><span class="dash-course-status ${c.published ? 'status-published' : 'status-draft'}">
        ${c.published ? 'Published' : 'Draft'}</span></td>
      <td><div class="table-actions">
        <button class="tbl-btn" onclick="togglePublish('${c.id}', ${c.published})">
          ${c.published ? 'Unpublish' : 'Publish'}
        </button>
      </div></td>
    </tr>`;
  }).join('');
}

function renderDashboardCourseList() {
  const el = document.getElementById('dashboardCourseList');
  if (!el) return;
  el.innerHTML = allCourses.map(c => {
    const count = c.levels?.reduce((a, l) => a + l.lessons.length, 0) || 0;
    return `<div class="dash-course-card">
      <h4>${c.name}</h4>
      <p>${count} lesson${count !== 1 ? 's' : ''} across ${c.levels?.length || 0} levels</p>
      <span class="dash-course-status ${c.published ? 'status-published' : 'status-draft'}">
        ${c.published ? 'Published' : 'Draft'}
      </span>
    </div>`;
  }).join('') || '<p style="color:var(--text-light)">No courses found.</p>';
}

async function togglePublish(courseId, currentState) {
  const course = allCourses.find(c => c.id === courseId);
  if (!course) return;
  course.published = !currentState;
  try {
    await apiFetch(`/courses/${courseId}`, 'PUT', course);
    await loadAllCourses();
    showAdminToast(`Course ${course.published ? 'published' : 'unpublished'}.`, 'success');
  } catch { showAdminToast('Failed to update course.', 'error'); }
}

/* ============================================
   LESSONS
   ============================================ */
async function loadLessonsTable() {
  allLessons = [];
  allCourses.forEach(course => {
    course.levels?.forEach((level, li) => {
      level.lessons?.forEach((lesson, lsi) => {
        allLessons.push({
          ...lesson,
          courseId: course.id, courseName: course.name,
          courseSlug: course.slug, levelIndex: li,
          levelName: level.name, lessonIndex: lsi
        });
      });
    });
  });
  renderLessonsTable(allLessons);
}

function renderLessonsTable(lessons) {
  const tbody = document.getElementById('lessonsTableBody');
  if (!tbody) return;
  if (!lessons.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-light);padding:2rem;">
      No lessons yet. Click <strong>New Lesson</strong> to add one.</td></tr>`;
    return;
  }
  tbody.innerHTML = lessons.map(l => `<tr>
    <td><strong>${l.title}</strong></td>
    <td>${l.courseName}</td>
    <td>${l.levelName}</td>
    <td>${l.order}</td>
    <td>${l.videoUrl ? '<i class="fa-brands fa-youtube" style="color:#FF0000"></i>' : '—'}</td>
    <td>${l.resources?.length || 0}</td>
    <td><div class="table-actions">
      <button class="tbl-btn" onclick='openLessonEditor(${JSON.stringify(l).replace(/'/g, "&#39;")})'>Edit</button>
      <button class="tbl-btn danger" onclick="deleteLesson('${l.courseId}', ${l.levelIndex}, ${l.lessonIndex})">Delete</button>
    </div></td>
  </tr>`).join('');
}

function filterLessons() {
  const courseFilter = document.getElementById('lessonFilterCourse').value;
  const levelFilter  = document.getElementById('lessonFilterLevel').value;
  let filtered = allLessons;
  if (courseFilter) filtered = filtered.filter(l => l.courseId === courseFilter);
  if (levelFilter !== '') filtered = filtered.filter(l => l.levelIndex === parseInt(levelFilter));
  renderLessonsTable(filtered);
}

function populateCourseSelects() {
  ['lessonCourse', 'quizCourse', 'lessonFilterCourse'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const current = el.value;
    el.innerHTML = `<option value="">Select course...</option>` +
      allCourses.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    if (current) el.value = current;
  });
}

/* ---- LESSON EDITOR ---- */
function openLessonEditor(lesson = null) {
  editingLesson = lesson;
  sourceMode    = false;

  document.getElementById('lessonModalTitle').textContent = lesson ? 'Edit Lesson' : 'New Lesson';
  document.getElementById('lessonTitle').value            = lesson?.title || '';
  document.getElementById('lessonVideoUrl').value         = lesson?.videoUrl || '';
  document.getElementById('lessonOrder').value            = lesson?.order ?? 0;
  document.getElementById('lessonPublished').checked      = lesson?.published ?? true;
  document.getElementById('lessonContentEditor').innerHTML = lesson?.content || '';
  document.getElementById('lessonContentSource').value    = lesson?.content || '';

  if (lesson) {
    document.getElementById('lessonCourse').value = lesson.courseId;
    document.getElementById('lessonLevel').value  = lesson.levelIndex;
  }

  document.getElementById('lessonContentEditor').classList.remove('hidden');
  document.getElementById('lessonContentSource').classList.add('hidden');
  document.getElementById('resourcesList').innerHTML = '';
  (lesson?.resources || []).forEach(r => addResourceRow(r));
  previewVideo(lesson?.videoUrl || '');
  document.getElementById('lessonModal').classList.remove('hidden');
}

function closeLessonModal() {
  document.getElementById('lessonModal').classList.add('hidden');
  editingLesson = null;
}

async function saveLesson() {
  const courseId   = document.getElementById('lessonCourse').value;
  const levelIndex = parseInt(document.getElementById('lessonLevel').value);
  const title      = document.getElementById('lessonTitle').value.trim();
  const videoUrl   = document.getElementById('lessonVideoUrl').value.trim();
  const order      = parseInt(document.getElementById('lessonOrder').value);
  const published  = document.getElementById('lessonPublished').checked;
  const content    = sourceMode
    ? document.getElementById('lessonContentSource').value
    : document.getElementById('lessonContentEditor').innerHTML;

  if (!courseId || !title) { showAdminToast('Course and title are required.', 'error'); return; }

  const resources = [];
  document.querySelectorAll('.resource-row').forEach(row => {
    const title = row.querySelector('.res-title')?.value.trim();
    const url   = row.querySelector('.res-url')?.value.trim();
    const type  = row.querySelector('.res-type')?.value;
    if (title && url) resources.push({ title, url, type });
  });

  const lesson = { title, content, videoUrl, order, published, resources };
  const course = JSON.parse(JSON.stringify(allCourses.find(c => c.id === courseId)));
  if (!course) { showAdminToast('Course not found.', 'error'); return; }

  while (course.levels.length <= levelIndex) {
    const names = ['Beginner', 'Intermediate', 'Advanced'];
    course.levels.push({
      name: names[course.levels.length] || `Level ${course.levels.length + 1}`,
      order: course.levels.length, lessons: []
    });
  }

  if (editingLesson && editingLesson.courseId === courseId && editingLesson.levelIndex === levelIndex) {
    course.levels[levelIndex].lessons[editingLesson.lessonIndex] = lesson;
  } else {
    course.levels[levelIndex].lessons.push(lesson);
  }

  try {
    const btn = document.getElementById('saveLessonBtn');
    btn.textContent = 'Saving...';
    await apiFetch(`/courses/${courseId}`, 'PUT', course);
    await loadAllCourses();
    loadLessonsTable();
    closeLessonModal();
    showAdminToast('Lesson saved.', 'success');
  } catch {
    showAdminToast('Failed to save lesson.', 'error');
  } finally {
    document.getElementById('saveLessonBtn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Lesson';
  }
}

async function deleteLesson(courseId, levelIndex, lessonIndex) {
  if (!confirm('Delete this lesson? This cannot be undone.')) return;
  const course = JSON.parse(JSON.stringify(allCourses.find(c => c.id === courseId)));
  course.levels[levelIndex].lessons.splice(lessonIndex, 1);
  try {
    await apiFetch(`/courses/${courseId}`, 'PUT', course);
    await loadAllCourses();
    loadLessonsTable();
    showAdminToast('Lesson deleted.', 'success');
  } catch { showAdminToast('Failed to delete lesson.', 'error'); }
}

/* ---- EDITOR TOOLS ---- */
function formatText(cmd) {
  document.getElementById('lessonContentEditor').focus();
  document.execCommand(cmd, false, null);
}
function insertHeading() {
  document.getElementById('lessonContentEditor').focus();
  document.execCommand('formatBlock', false, 'h4');
}
function insertBulletList() {
  document.getElementById('lessonContentEditor').focus();
  document.execCommand('insertUnorderedList', false, null);
}
function insertCallout() {
  const html = `<div style="background:rgba(0,180,216,0.08);border-left:4px solid #00B4D8;padding:1rem;border-radius:4px;margin:1rem 0;"><p>💡 Key point here...</p></div>`;
  document.getElementById('lessonContentEditor').focus();
  document.execCommand('insertHTML', false, html);
}
function toggleSourceMode() {
  sourceMode    = !sourceMode;
  const editor  = document.getElementById('lessonContentEditor');
  const source  = document.getElementById('lessonContentSource');
  const btn     = document.getElementById('sourceToggle');
  if (sourceMode) {
    source.value = editor.innerHTML;
    editor.classList.add('hidden');
    source.classList.remove('hidden');
    btn.style.color = 'var(--cyan)';
  } else {
    editor.innerHTML = source.value;
    source.classList.add('hidden');
    editor.classList.remove('hidden');
    btn.style.color = '';
  }
}
function addResourceRow(resource = {}) {
  const list = document.getElementById('resourcesList');
  const div  = document.createElement('div');
  div.className = 'resource-row';
  div.innerHTML = `
    <input type="text" class="res-title" placeholder="Title" value="${resource.title || ''}" />
    <input type="url"  class="res-url"   placeholder="https://..." value="${resource.url || ''}" />
    <select class="res-type">
      <option value="article"   ${resource.type === 'article'   ? 'selected' : ''}>Article</option>
      <option value="video"     ${resource.type === 'video'     ? 'selected' : ''}>Video</option>
      <option value="reference" ${resource.type === 'reference' ? 'selected' : ''}>Reference</option>
      <option value="tool"      ${resource.type === 'tool'      ? 'selected' : ''}>Tool</option>
    </select>
    <button class="remove-btn" onclick="this.parentElement.remove()">
      <i class="fa-solid fa-xmark"></i>
    </button>`;
  list.appendChild(div);
}
function previewVideo(url) {
  const preview = document.getElementById('videoPreview');
  if (!url || !preview) return;
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  preview.innerHTML = match
    ? `<iframe src="https://www.youtube.com/embed/${match[1]}" allowfullscreen></iframe>`
    : '';
}

/* ============================================
   QUIZZES
   ============================================ */
async function loadQuizzesTable() {
  try {
    const res  = await apiFetch('/quizzes');
    allQuizzes = await res.json();
    renderQuizzesTable();
  } catch { allQuizzes = []; renderQuizzesTable(); }
}

function renderQuizzesTable() {
  const tbody = document.getElementById('quizzesTableBody');
  if (!tbody) return;
  if (!allQuizzes.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-light);padding:2rem;">
      No quizzes yet.</td></tr>`;
    return;
  }
  const levelNames = ['Beginner', 'Intermediate', 'Advanced'];
  tbody.innerHTML = allQuizzes.map(q => `<tr>
    <td><strong>${q.title}</strong></td>
    <td>${allCourses.find(c => c.id === q.courseId)?.name || '—'}</td>
    <td>${levelNames[q.levelIndex] || q.levelIndex}</td>
    <td>${q.questions?.length || 0}</td>
    <td>${q.passMark}%</td>
    <td><div class="table-actions">
      <button class="tbl-btn" onclick='openQuizEditor(${JSON.stringify(q).replace(/'/g, "&#39;")})'>Edit</button>
      <button class="tbl-btn danger" onclick="deleteQuiz('${q.id}')">Delete</button>
    </div></td>
  </tr>`).join('');
}

function openQuizEditor(quiz = null) {
  editingQuiz = quiz;
  document.getElementById('quizModalTitle').textContent = quiz ? 'Edit Quiz' : 'New Quiz';
  document.getElementById('quizTitle').value    = quiz?.title || '';
  document.getElementById('quizPassMark').value = quiz?.passMark || 70;
  if (quiz) {
    document.getElementById('quizCourse').value = quiz.courseId;
    document.getElementById('quizLevel').value  = quiz.levelIndex;
  }
  document.getElementById('questionsList').innerHTML = '';
  (quiz?.questions || [{ text: '', options: ['', '', '', ''], correctIndex: 0 }])
    .forEach(q => addQuestion(q));
  document.getElementById('quizModal').classList.remove('hidden');
}

function closeQuizModal() {
  document.getElementById('quizModal').classList.add('hidden');
  editingQuiz = null;
}

function addQuestion(question = { text: '', options: ['', '', '', ''], correctIndex: 0 }) {
  const list = document.getElementById('questionsList');
  const idx  = list.children.length;
  const div  = document.createElement('div');
  div.className = 'question-block';
  div.innerHTML = `
    <div class="question-block-header">
      <span class="question-block-label">Question ${idx + 1}</span>
      <button class="remove-btn" onclick="this.closest('.question-block').remove()">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
    <div class="admin-field" style="margin-bottom:0.75rem;">
      <input type="text" class="q-text" placeholder="Question text..." value="${question.text || ''}" />
    </div>
    ${question.options.map((opt, oi) => `
      <div class="option-row">
        <input type="radio" name="correct-${idx}" value="${oi}"
               ${question.correctIndex === oi ? 'checked' : ''} />
        <input type="text" class="q-option" placeholder="Option ${oi + 1}" value="${opt}" />
      </div>`).join('')}
    <p style="font-size:0.72rem;color:var(--text-light);margin-top:0.4rem;">
      Select the radio next to the correct answer.
    </p>`;
  list.appendChild(div);
}

async function saveQuiz() {
  const courseId   = document.getElementById('quizCourse').value;
  const levelIndex = parseInt(document.getElementById('quizLevel').value);
  const title      = document.getElementById('quizTitle').value.trim();
  const passMark   = parseInt(document.getElementById('quizPassMark').value);
  if (!courseId || !title) { showAdminToast('Course and title are required.', 'error'); return; }

  const questions = [];
  document.querySelectorAll('.question-block').forEach((block, idx) => {
    const text    = block.querySelector('.q-text').value.trim();
    const options = [...block.querySelectorAll('.q-option')].map(i => i.value.trim());
    const ci      = block.querySelector(`input[type="radio"][name="correct-${idx}"]:checked`);
    if (text) questions.push({ text, options, correctIndex: ci ? parseInt(ci.value) : 0 });
  });

  const quiz = { courseId, levelIndex, title, passMark, questions };
  try {
    if (editingQuiz?.id) {
      await apiFetch(`/quizzes/${editingQuiz.id}`, 'PUT', quiz);
    } else {
      await apiFetch('/quizzes', 'POST', quiz);
    }
    await loadQuizzesTable();
    closeQuizModal();
    showAdminToast('Quiz saved.', 'success');
  } catch { showAdminToast('Failed to save quiz.', 'error'); }
}

async function deleteQuiz(id) {
  if (!confirm('Delete this quiz?')) return;
  try {
    await apiFetch(`/quizzes/${id}`, 'DELETE');
    await loadQuizzesTable();
    showAdminToast('Quiz deleted.', 'success');
  } catch { showAdminToast('Failed to delete.', 'error'); }
}

/* ============================================
   CERTIFICATES
   ============================================ */
async function loadCertsTable() {
  try {
    const res   = await apiFetch('/admin/certificates');
    const certs = await res.json();
    const tbody = document.getElementById('certsTableBody');
    if (!tbody) return;
    if (!certs.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-light);padding:2rem;">No certificates issued yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = certs.map(c => `<tr>
      <td><code style="font-size:0.8rem">${c.certificateId}</code></td>
      <td>${c.userName}</td>
      <td>${c.courseName}</td>
      <td>${new Date(c.issuedAt).toLocaleDateString('en-GB')}</td>
      <td><a href="../verify.html?id=${c.certificateId}" target="_blank"
             style="color:var(--cyan);font-size:0.82rem;">Verify ↗</a></td>
    </tr>`).join('');
  } catch { console.warn('Could not load certificates.'); }
}

/* ============================================
   USERS
   ============================================ */
async function loadUsersTable() {
  try {
    const res   = await apiFetch('/admin/users');
    const users = await res.json();
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    tbody.innerHTML = users.map(u => `<tr>
      <td><strong>${u.name}</strong></td>
      <td>${u.email}</td>
      <td><span class="dash-course-status ${u.role === 'ADMIN' ? 'status-published' : 'status-draft'}">${u.role}</span></td>
      <td>${new Date(u.createdAt).toLocaleDateString('en-GB')}</td>
      <td>${u.earnedCertificates?.length || 0}</td>
      <td><div class="table-actions">
        ${u.role !== 'ADMIN' ? `<button class="tbl-btn" onclick="promoteUser('${u.id}', '${u.role}')">
          ${u.role === 'TUTOR' ? 'Demote' : 'Make Tutor'}
        </button>` : ''}
      </div></td>
    </tr>`).join('');
  } catch { console.warn('Could not load users.'); }
}

async function promoteUser(userId, currentRole) {
  const newRole = currentRole === 'TUTOR' ? 'STUDENT' : 'TUTOR';
  try {
    await apiFetch(`/admin/users/${userId}/role`, 'PUT', { role: newRole });
    loadUsersTable();
    showAdminToast(`User role updated to ${newRole}.`, 'success');
  } catch { showAdminToast('Failed to update role.', 'error'); }
}

/* ============================================
   DASHBOARD STATS
   ============================================ */
async function loadDashboardStats() {
  document.getElementById('statCourses').textContent = allCourses.length;
  const totalLessons = allCourses.reduce((a, c) =>
    a + (c.levels?.reduce((b, l) => b + l.lessons.length, 0) || 0), 0);
  document.getElementById('statLessons').textContent = totalLessons;
  try {
    const [usersRes, certsRes] = await Promise.all([
      apiFetch('/admin/users'),
      apiFetch('/admin/certificates')
    ]);
    const users = await usersRes.json();
    const certs = await certsRes.json();
    document.getElementById('statUsers').textContent = users.filter(u => u.role === 'STUDENT').length;
    document.getElementById('statCerts').textContent = certs.length;
  } catch {
    document.getElementById('statUsers').textContent = '—';
    document.getElementById('statCerts').textContent = '—';
  }
}

/* ============================================
   UTILS
   ============================================ */
function apiFetch(path, method = 'GET', body = null) {
  const token = localStorage.getItem('grafide_token');
  const opts  = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  };
  if (body) opts.body = JSON.stringify(body);
  return fetch(`${API}${path}`, opts);
}

function showAdminToast(msg, type = 'success') {
  const toast = document.getElementById('adminToast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className   = `admin-toast ${type}`;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3500);
}

/* ============================================
   INIT
   ============================================ */
document.addEventListener('DOMContentLoaded', () => {
  checkAdminSession();

  document.getElementById('gateLoginBtn')?.addEventListener('click', gateLogin);
  document.getElementById('gatePassword')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') gateLogin();
  });
  document.getElementById('adminLogout')?.addEventListener('click', adminLogout);

  document.querySelectorAll('.admin-nav-item[data-view]').forEach(item => {
    item.addEventListener('click', e => { e.preventDefault(); switchView(item.dataset.view); });
  });

  document.getElementById('lessonVideoUrl')?.addEventListener('blur', e => {
    previewVideo(e.target.value);
  });
  let _portfolioItems  = [];
let _editingPortfolio = null;

/* ---- LOAD TABLE ---- */
async function loadPortfolioTable() {
  try {
    const res = await apiFetch('/portfolio/admin/all');
    _portfolioItems = await res.json();
    renderPortfolioTable();
  } catch {
    _portfolioItems = [];
    renderPortfolioTable();
  }
}

function renderPortfolioTable() {
  const tbody = document.getElementById('portfolioTableBody');
  if (!tbody) return;

  if (!_portfolioItems.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-light);padding:2rem;">
      No portfolio items yet. Click <strong>Add Work</strong> to get started.</td></tr>`;
    return;
  }

  const catLabels = {
    AGENCY: 'Agency', MAGAZINE: 'Magazine',
    EDITORIAL: 'Editorial', STUDENT: 'Student Work'
  };

  tbody.innerHTML = _portfolioItems.map(item => `<tr>
    <td>
      ${item.mediaType === 'VIDEO'
        ? `<div style="position:relative;width:64px;height:40px;background:var(--navy);border-radius:4px;overflow:hidden;">
             ${item.thumbnailUrl
               ? `<img src="${item.thumbnailUrl}" style="width:100%;height:100%;object-fit:cover;" />`
               : `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--cyan);"><i class="fa-solid fa-play"></i></div>`
             }
           </div>`
        : `<img src="${item.mediaUrl}" alt="${item.title}"
               style="width:64px;height:40px;object-fit:cover;border-radius:4px;border:1px solid var(--border);"
               onerror="this.style.display='none'" />`
      }
    </td>
    <td><strong>${item.title}</strong></td>
    <td>${catLabels[item.category] || item.category}</td>
    <td>
      <span style="display:inline-flex;align-items:center;gap:4px;font-size:0.78rem;color:var(--text-muted);">
        <i class="fa-solid ${item.mediaType === 'VIDEO' ? 'fa-video' : 'fa-image'}"
           style="color:var(--cyan)"></i>
        ${item.mediaType}
      </span>
    </td>
    <td>
      <span style="color:${item.featured ? 'var(--cyan)' : 'var(--border)'};font-size:1rem;">
        <i class="fa-solid fa-star"></i>
      </span>
    </td>
    <td>
      <span class="dash-course-status ${item.published ? 'status-published' : 'status-draft'}">
        ${item.published ? 'Published' : 'Draft'}
      </span>
    </td>
    <td>
      <div class="table-actions">
        <button class="tbl-btn" onclick='openPortfolioEditor(${JSON.stringify(item).replace(/'/g, "&#39;")})'>
          Edit
        </button>
        <button class="tbl-btn" onclick="togglePortfolioFeatured('${item.id}')">
          ${item.featured ? 'Unfeature' : 'Feature'}
        </button>
        <button class="tbl-btn" onclick="togglePortfolioPublish('${item.id}')">
          ${item.published ? 'Unpublish' : 'Publish'}
        </button>
        <button class="tbl-btn danger" onclick="deletePortfolioItem('${item.id}')">
          Delete
        </button>
      </div>
    </td>
  </tr>`).join('');
}

/* ---- EDITOR ---- */
function openPortfolioEditor(item = null) {
  _editingPortfolio = item;
  document.getElementById('portfolioModalTitle').textContent =
    item ? 'Edit Portfolio Item' : 'Add Portfolio Item';

  document.getElementById('portfolioTitle').value        = item?.title || '';
  document.getElementById('portfolioDescription').value  = item?.description || '';
  document.getElementById('portfolioMediaUrl').value     = item?.mediaUrl || '';
  document.getElementById('portfolioThumbnail').value    = item?.thumbnailUrl || '';
  document.getElementById('portfolioExternalLink').value = item?.externalLink || '';
  document.getElementById('portfolioOrder').value        = item?.order ?? 0;
  document.getElementById('portfolioFeatured').checked   = item?.featured ?? false;
  document.getElementById('portfolioPublished').checked  = item?.published ?? true;
  document.getElementById('portfolioCategory').value     = item?.category || 'AGENCY';
  document.getElementById('portfolioMediaType').value    = item?.mediaType || 'IMAGE';

  toggleThumbnailField();
  updatePortfolioPreview(item?.mediaUrl || '', item?.mediaType || 'IMAGE');

  document.getElementById('portfolioModal').classList.remove('hidden');
}

function closePortfolioModal() {
  document.getElementById('portfolioModal').classList.add('hidden');
  document.getElementById('portfolioPreview').innerHTML = '';
  _editingPortfolio = null;
}

function toggleThumbnailField() {
  const isVideo = document.getElementById('portfolioMediaType')?.value === 'VIDEO';
  const field   = document.getElementById('thumbnailField');
  const hint    = document.getElementById('mediaUrlHint');
  field?.classList.toggle('hidden', !isVideo);
  if (hint) {
    hint.textContent = isVideo
      ? 'Full URL to your hosted video (MP4) or YouTube/Vimeo link'
      : 'Full URL to your hosted image';
  }
}

function updatePortfolioPreview(url, type) {
  const preview = document.getElementById('portfolioPreview');
  if (!preview || !url) return;

  if (type === 'IMAGE') {
    preview.innerHTML = `<img src="${url}" alt="Preview"
      style="max-height:120px;border-radius:4px;border:1px solid var(--border);"
      onerror="this.style.display='none'" />`;
  } else {
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (ytMatch) {
      preview.innerHTML = `<div style="font-size:0.8rem;color:var(--text-muted);">
        <i class="fa-brands fa-youtube" style="color:#FF0000"></i>
        YouTube video detected: ${ytMatch[1]}
      </div>`;
    } else {
      preview.innerHTML = `<div style="font-size:0.8rem;color:var(--text-muted);">
        <i class="fa-solid fa-video" style="color:var(--cyan)"></i>
        Video URL set.
      </div>`;
    }
  }
}

async function savePortfolioItem() {
  const title       = document.getElementById('portfolioTitle').value.trim();
  const description = document.getElementById('portfolioDescription').value.trim();
  const mediaUrl    = document.getElementById('portfolioMediaUrl').value.trim();
  const thumbnailUrl= document.getElementById('portfolioThumbnail').value.trim();
  const externalLink= document.getElementById('portfolioExternalLink').value.trim();
  const category    = document.getElementById('portfolioCategory').value;
  const mediaType   = document.getElementById('portfolioMediaType').value;
  const order       = parseInt(document.getElementById('portfolioOrder').value);
  const featured    = document.getElementById('portfolioFeatured').checked;
  const published   = document.getElementById('portfolioPublished').checked;

  if (!title || !mediaUrl) {
    showAdminToast('Title and media URL are required.', 'error'); return;
  }

  const payload = {
    title, description, mediaUrl, thumbnailUrl,
    externalLink, category, mediaType, order, featured, published
  };

  const btn = document.getElementById('savePortfolioBtn');
  btn.textContent = 'Saving...';
  btn.disabled    = true;

  try {
    if (_editingPortfolio?.id) {
      await apiFetch(`/portfolio/${_editingPortfolio.id}`, 'PUT', payload);
    } else {
      await apiFetch('/portfolio', 'POST', payload);
    }
    await loadPortfolioTable();
    closePortfolioModal();
    showAdminToast('Portfolio item saved.', 'success');
  } catch {
    showAdminToast('Failed to save item.', 'error');
  } finally {
    btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Item';
    btn.disabled  = false;
  }
}

async function togglePortfolioFeatured(id) {
  try {
    await apiFetch(`/portfolio/${id}/toggle-featured`, 'PUT');
    await loadPortfolioTable();
    showAdminToast('Featured status updated.', 'success');
  } catch { showAdminToast('Failed.', 'error'); }
}

async function togglePortfolioPublish(id) {
  try {
    await apiFetch(`/portfolio/${id}/toggle-publish`, 'PUT');
    await loadPortfolioTable();
    showAdminToast('Publish status updated.', 'success');
  } catch { showAdminToast('Failed.', 'error'); }
}

async function deletePortfolioItem(id) {
  if (!confirm('Delete this portfolio item?')) return;
  try {
    await apiFetch(`/portfolio/${id}`, 'DELETE');
    await loadPortfolioTable();
    showAdminToast('Item deleted.', 'success');
  } catch { showAdminToast('Failed to delete.', 'error'); }
}

/* ---- Wire media URL preview on blur ---- */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('portfolioMediaUrl')?.addEventListener('blur', e => {
    const type = document.getElementById('portfolioMediaType')?.value || 'IMAGE';
    updatePortfolioPreview(e.target.value, type);
  });
});
});