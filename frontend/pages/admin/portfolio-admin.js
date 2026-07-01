/* ============================================
   GRAFIDE ADMIN — Portfolio Functions
   ============================================
   ADD THIS ENTIRE BLOCK to the bottom of
   frontend/pages/admin/admin.js
   (before the closing DOMContentLoaded block)
   ============================================ */

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

  const _modal = document.getElementById('portfolioModal');
  _modal.classList.remove('hidden');
  _modal.style.display = 'flex';
}

function closePortfolioModal() {
  const _modal = document.getElementById('portfolioModal');
  _modal.classList.add('hidden');
  _modal.style.display = 'none';
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

/*
  ALSO ADD to the switchView() function in admin.js:
  if (viewName === 'portfolio') loadPortfolioTable();

  AND ADD to initAdmin() function:
  loadPortfolioTable();

  AND ADD to the titles object in switchView():
  portfolio: 'Portfolio',
*/
