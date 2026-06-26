/* ============================================
   GRAFIDE — Portfolio JavaScript
   Fetches items from API, renders grid,
   handles category filtering and lightbox
   ============================================ */

const PORTFOLIO_API = 'http://localhost:8080/api';

let _allItems      = [];
let _activeFilter  = 'ALL';

/* ============================================
   LOAD & RENDER
   ============================================ */
async function loadPortfolio() {
  try {
    const res = await fetch(`${PORTFOLIO_API}/portfolio`);
    if (!res.ok) throw new Error('Failed');
    _allItems = await res.json();
    renderPortfolio(_allItems);
  } catch {
    document.getElementById('portfolioGrid').innerHTML = '';
    document.getElementById('portfolioEmpty')?.classList.remove('hidden');
  }
}

function renderPortfolio(items) {
  const grid  = document.getElementById('portfolioGrid');
  const empty = document.getElementById('portfolioEmpty');
  if (!grid) return;

  if (!items.length) {
    grid.innerHTML = '';
    empty?.classList.remove('hidden');
    return;
  }

  empty?.classList.add('hidden');
  grid.innerHTML = items.map(item => buildCard(item)).join('');
}

function buildCard(item) {
  const isVideo = item.mediaType === 'VIDEO';
  const thumb   = item.thumbnailUrl || item.mediaUrl;

  const mediaHtml = isVideo
    ? `<div class="portfolio-video-thumb">
         <img src="${thumb}" alt="${item.title}" loading="lazy"
              onerror="this.style.display='none'" />
         <div class="portfolio-play-btn">
           <i class="fa-solid fa-circle-play"></i>
         </div>
       </div>`
    : `<img src="${item.mediaUrl}" alt="${item.title}" loading="lazy"
            onerror="this.closest('.portfolio-item').style.display='none'" />`;

  const featured = item.featured
    ? `<div class="portfolio-featured-badge">Featured</div>` : '';

  return `
    <div class="portfolio-item" data-category="${item.category}"
         onclick='openLightbox(${JSON.stringify(item).replace(/'/g, "&#39;")})'>
      ${featured}
      ${mediaHtml}
      <div class="portfolio-overlay">
        <p class="portfolio-overlay-cat">${formatCategory(item.category)}</p>
        <p class="portfolio-overlay-title">${item.title}</p>
      </div>
    </div>`;
}

function formatCategory(cat) {
  const map = {
    AGENCY:    'Agency Work',
    MAGAZINE:  'Magazine',
    EDITORIAL: 'Editorial',
    STUDENT:   'Student Work'
  };
  return map[cat] || cat;
}

/* ============================================
   FILTERING
   ============================================ */
function filterPortfolio(category) {
  _activeFilter = category;

  document.querySelectorAll('.portfolio-filter').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.trim().toUpperCase() === category ||
      (category === 'ALL' && btn.textContent.trim() === 'All'));
  });

  const filtered = category === 'ALL'
    ? _allItems
    : _allItems.filter(i => i.category === category);

  renderPortfolio(filtered);
}

/* ============================================
   LIGHTBOX
   ============================================ */
function openLightbox(item) {
  const lb      = document.getElementById('lightbox');
  const content = document.getElementById('lightboxContent');
  const meta    = document.getElementById('lightboxMeta');

  if (!lb || !content) return;

  // Build media content
  if (item.mediaType === 'VIDEO') {
    const url = item.mediaUrl;

    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);

    if (ytMatch) {
      content.innerHTML = `<iframe src="https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1"
        allow="autoplay; fullscreen" allowfullscreen></iframe>`;
    } else if (vimeoMatch) {
      content.innerHTML = `<iframe src="https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1"
        allow="autoplay; fullscreen" allowfullscreen></iframe>`;
    } else {
      // Direct MP4
      content.innerHTML = `<video src="${url}" controls autoplay
        style="width:100%;max-height:75vh;border-radius:8px;"></video>`;
    }
  } else {
    content.innerHTML = `<img src="${item.mediaUrl}" alt="${item.title}" />`;
  }

  // Meta
  let metaHtml = `<h3>${item.title}</h3>`;
  if (item.description) metaHtml += `<p>${item.description}</p>`;
  if (item.externalLink) {
    metaHtml += `<a href="${item.externalLink}" target="_blank" rel="noopener">
      View Project <i class="fa-solid fa-arrow-up-right-from-square"></i>
    </a>`;
  }
  meta.innerHTML = metaHtml;

  lb.classList.add('open');
  document.body.style.overflow = 'hidden';

  // ESC to close
  document.addEventListener('keydown', handleLightboxKey);
}

function closeLightbox() {
  const lb = document.getElementById('lightbox');
  if (!lb) return;
  lb.classList.remove('open');
  document.body.style.overflow = '';
  // Stop video/audio
  document.getElementById('lightboxContent').innerHTML = '';
  document.removeEventListener('keydown', handleLightboxKey);
}

function handleLightboxKey(e) {
  if (e.key === 'Escape') closeLightbox();
}

/* ============================================
   BOOT
   ============================================ */
document.addEventListener('DOMContentLoaded', loadPortfolio);
