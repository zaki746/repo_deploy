// app.js - enhanced dashboard with multi-repo selection, filters, clickable status badges, animated progress

const REPOS = ['repo1', 'repo2']; // add more repos as needed
const repoButtonsEl = document.getElementById('repoButtons');
const repoCardsWrap = document.getElementById('repoCardsWrap');
const labelMultiEl = document.getElementById('labelMulti');
const searchInput = document.getElementById('searchInput');
const stateFilter = document.getElementById('stateFilter');
const rowsPerPageSelect = document.getElementById('rowsPerPage');
const applyBtn = document.getElementById('applyBtn');
const clearBtn = document.getElementById('clearBtn');
const issuesTableBody = document.getElementById('issuesTableBody');
const summaryEl = document.getElementById('summary');
const noResultsEl = document.getElementById('noResults');
const customLabelSelect = document.getElementById('customLabelSelect');
// repo toolbar elements
const repoSearchInput = document.getElementById('repoSearchInput');
const selectAllReposBtn = document.getElementById('selectAllReposBtn');
const clearReposBtn = document.getElementById('clearReposBtn');
const repoSelectedCountEl = document.getElementById('repoSelectedCount');

// Pagination elements
const paginationInfo = document.getElementById('paginationInfo');
const firstPageBtn = document.getElementById('firstPage');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const lastPageBtn = document.getElementById('lastPage');
const pageNumbers = document.getElementById('pageNumbers');

const overlay = document.getElementById('overlay');
const overlayImg = document.getElementById('overlayImg');
const closeOverlay = document.getElementById('closeOverlay');

let selectedRepos = new Set();
let repoDataCache = {}; // repo -> issues array
let combinedData = [];
let filteredData = [];
let labelsSet = new Set();
let activeLabelFilters = new Set();
let activeStatusFilter = ''; // '' or 'open'/'closed'

// Pagination state
let currentPage = 1;
let rowsPerPage = 30;
let totalPages = 1;

// helper to escape regex
function esc(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
// Map raw labels to normalized progress categories used in the UI
function normalizeLabel(label){
  const low = (label||'').toLowerCase();
  if(low === 'todo' || low === 'to-do') return 'todo';
  if(low === 'inprogress' || low === 'in-progress' || low === 'progress') return 'progress';
  if(low === 'published') return 'published';
  return null;
}


// resolve image path from JSON (./assets/xxx) -> ../data/<repo>/assets/xxx
function resolveImage(imgPath, repo){
  if(!imgPath) return null;
  if(/^https?:\/\//i.test(imgPath)) return imgPath;
  const cleaned = imgPath.replace(/^\.\//, '').replace(/^assets\//,'');
  return `../data/${repo}/assets/${cleaned}`;
}

// load stats for all repos (build cards)
async function loadRepoStats(){
  repoCardsWrap.innerHTML = '';
  repoButtonsEl.innerHTML = '';
  // filter chips by search
  const query = (repoSearchInput?.value || '').toLowerCase();
  const toRender = REPOS.filter(r=> r.toLowerCase().includes(query));
  for(const r of toRender){
    // create repo button (chip)
    const chip = document.createElement('button');
    chip.className = 'repo-chip';
    chip.textContent = r;
    chip.dataset.repo = r;
    // Enable repo chip selection and reflect current selection state
    chip.title = 'Click to include/exclude this repo';
    chip.addEventListener('click', () => { toggleRepo(r); });
    if(selectedRepos.has(r)){
      chip.classList.add('active');
    }
    repoButtonsEl.appendChild(chip);

    // try to load summary counts for card
    let arr = [];
    try{
      const res = await fetch(`../data/${r}/issues.json`, {cache:'no-store'});
      if(res.ok) arr = await res.json();
    }catch(e){ arr = [] }
    // compute counts
    let todo=0, inprogress=0, published=0, noprogress=0;
    arr.forEach(it=>{
      const labs = (it.labels||[]).map(x=>x.toLowerCase());
      if(labs.includes('published')) published++;
      else if(labs.includes('inprogress')||labs.includes('in-progress')||labs.includes('progress')) inprogress++;
      else if(labs.includes('todo')||labs.includes('to-do')) todo++;
      else noprogress++;
    });
    renderRepoCard(r, todo, inprogress, published, noprogress);
  }
  updateRepoSelectedCount();
}

// render repo card with animated progress segments
function renderRepoCard(repo, todo, inprogress, published, noprogress){
  const total = todo+inprogress+published+noprogress;
  const card = document.createElement('div');
  card.className = 'repo-card';
  card.dataset.repo = repo;
  card.innerHTML = `
    <h4>${repo}</h4>
    <div class="repo-meta">${total} issues</div>
    <div class="progress-bar" aria-hidden="true"></div>
    <div class="progress-legend"></div>
  `;
  const bar = card.querySelector('.progress-bar');
  const legend = card.querySelector('.progress-legend');

  if(total === 0){
    const seg = document.createElement('div'); seg.className='progress-seg seg-noprogress'; seg.style.width='100%';
    bar.appendChild(seg);
    legend.textContent = 'no issues';
  } else {
    if(todo>0){ const s=document.createElement('div'); s.className='progress-seg seg-todo'; s.style.width='0%'; bar.appendChild(s); }
    if(inprogress>0){ const s=document.createElement('div'); s.className='progress-seg seg-inprogress'; s.style.width='0%'; bar.appendChild(s); }
    if(published>0){ const s=document.createElement('div'); s.className='progress-seg seg-published'; s.style.width='0%'; bar.appendChild(s); }
    if(noprogress>0){ const s=document.createElement('div'); s.className='progress-seg seg-noprogress'; s.style.width='0%'; bar.appendChild(s); }
    // animate widths
    requestAnimationFrame(()=> {
      let i=0;
      if(todo>0){ bar.children[i].style.width = `${(todo/total)*100}%`; i++; }
      if(inprogress>0){ bar.children[i].style.width = `${(inprogress/total)*100}%`; i++; }
      if(published>0){ bar.children[i].style.width = `${(published/total)*100}%`; i++; }
      if(noprogress>0){ bar.children[i].style.width = `${(noprogress/total)*100}%`; i++; }
    });
    legend.innerHTML = `
      <span class="legend-badge todo">Todo: <strong>${todo}</strong></span>
      <span class="legend-badge progress">In&nbsp;Progress: <strong>${inprogress}</strong></span>
      <span class="legend-badge published">Published: <strong>${published}</strong></span>
      <span class="legend-badge neutral">Other: <strong>${noprogress}</strong></span>
    `;
  }

  // Repo cards remain informational only (not clickable)
  repoCardsWrap.appendChild(card);
}

// toggle repo selection (multi-select) for chips in top-right
function toggleRepo(repo){
  const chip = [...repoButtonsEl.children].find(c=>c.dataset.repo===repo);
  if(selectedRepos.has(repo)){
    selectedRepos.delete(repo);
    if(chip) chip.classList.remove('active');
  } else {
    selectedRepos.add(repo);
    if(chip) chip.classList.add('active');
  }
  // Visual emphasis stays on cards; we only update selection via chips
  loadSelectedReposData();
  updateRepoSelectedCount();
}

// load data for the currently selected repos (merge)
async function loadSelectedReposData(){
  if(selectedRepos.size === 0){
    // clear UI when no repos selected
    combinedData = [];
    filteredData = [];
    labelsSet.clear();
    populateLabelMulti();
    updatePagination();
    renderIssuesTable();
    updateSummary(0);
  updateRepoSelectedCount();
    return;
  }

  combinedData = [];
  labelsSet.clear();

  for(const repo of selectedRepos){
    if(!repoDataCache[repo]){
      try{
        const res = await fetch(`../data/${repo}/issues.json`, {cache:'no-store'});
        if(res.ok){
          const arr = await res.json();
          // attach repo name to each item (for resolving images)
          repoDataCache[repo] = (arr||[]).map(it=> ({...it, __repo:repo}) );
        } else {
          repoDataCache[repo] = [];
        }
      }catch(e){ repoDataCache[repo]=[]; }
    }
    const arr = repoDataCache[repo] || [];
    for(const it of arr){
      combinedData.push(it);
      (it.labels||[]).forEach(l=> {
        const n = normalizeLabel(l);
        if(n) labelsSet.add(n);
      });
    }
  }

  populateLabelMulti();
  applyFiltersAndRender(); // default rendering
}

// populate label multi chips (OR logic)
function populateLabelMulti(){
  labelMultiEl.innerHTML = '';
  // Only show our three categories in a fixed order, when present
  const preferred = ['todo','progress','published'];
  const labels = preferred.filter(l => labelsSet.has(l));
  if(labels.length === 0){
    labelMultiEl.innerHTML = '<div class="meta">No labels</div>';
    return;
  }
  labels.forEach(l=>{
    const btn = document.createElement('button');
    btn.className = 'label-chip';
    btn.textContent = l;
    btn.dataset.label = l;
    btn.addEventListener('click', ()=>{
      if(activeLabelFilters.has(l)){ activeLabelFilters.delete(l); btn.classList.remove('active'); }
      else { activeLabelFilters.add(l); btn.classList.add('active'); }
      applyFiltersAndRender();
    });
    labelMultiEl.appendChild(btn);
  });
}

// apply filters & render
function applyFiltersAndRender(){
  let list = [...combinedData];
  // state
  const st = stateFilter.value;
  if(st) list = list.filter(i=> (i.state||'').toLowerCase() === st.toLowerCase());
  // labels: OR logic -> keep issue if it has any of activeLabelFilters
  if(activeLabelFilters.size>0){
    list = list.filter(i=>{
      const labs = (i.labels||[]).map(x=> normalizeLabel(x)).filter(Boolean);
      for(const sel of activeLabelFilters){
        if(labs.includes(sel)) return true;
      }
      return false;
    });
  }
  // search: substring/regex-like (escape input)
  const s = searchInput.value.trim();
  if(s){
    const rx = new RegExp(esc(s), 'i');
    list = list.filter(i => rx.test(i.title || ''));
  }

  // customized label filter removed - now handled by label multi chips

  filteredData = list;
  currentPage = 1; // Reset to first page when filters change
  updatePagination();
  renderIssuesTable();
  updateSummary(list.length);
}

// render issues in table format with pagination
function renderIssuesTable(){
  issuesTableBody.innerHTML = '';
  
  if(!filteredData.length){
    noResultsEl.classList.remove('hidden');
    return;
  } else {
    noResultsEl.classList.add('hidden');
  }

  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, filteredData.length);
  const pageData = filteredData.slice(startIndex, endIndex);

  for(const it of pageData){
    const row = document.createElement('tr');
    row.className = 'issue-row';

    // Issue Number
    const numberCell = document.createElement('td');
    const numberLink = document.createElement('a');
    numberLink.href = it.issueLink || '#';
    numberLink.target = '_blank';
    numberLink.textContent = `#${it.number}`;
    numberLink.className = 'issue-number-link';
    numberCell.appendChild(numberLink);

    // Title
    const titleCell = document.createElement('td');
    titleCell.textContent = it.title || '';
    titleCell.className = 'issue-title-cell';

    // State
    const stateCell = document.createElement('td');
    const stateBadge = document.createElement('span');
    stateBadge.className = `state-badge ${it.state || 'unknown'}`;
    stateBadge.textContent = it.state || 'unknown';
    stateCell.appendChild(stateBadge);

    // Labels
    const labelsCell = document.createElement('td');
    const labelsContainer = document.createElement('div');
    labelsContainer.className = 'labels-container';
    
    // Only display normalized progress labels
    const normalized = (it.labels||[]).map(l=> normalizeLabel(l)).filter(Boolean);
    if(normalized.length === 0){
      const badge = document.createElement('span');
      badge.className = 'badge nolabel';
      badge.textContent = 'no label';
      labelsContainer.appendChild(badge);
    } else {
      normalized.forEach(l=>{
        const badge = document.createElement('span');
        if(l==='todo') badge.className='badge todo';
        else if(l==='progress') badge.className='badge inprogress';
        else if(l==='published') badge.className='badge published';
        else badge.className='badge nolabel';
        badge.textContent = l;
        // clicking a badge should filter by that label (toggle)
        badge.style.cursor = 'pointer';
        badge.addEventListener('click', ()=>{
          if(activeLabelFilters.has(l)){ activeLabelFilters.delete(l); }
          else activeLabelFilters.add(l);
          [...labelMultiEl.children].forEach(chip => chip.classList.toggle('active', activeLabelFilters.has(chip.dataset.label)));
          applyFiltersAndRender();
        });
        labelsContainer.appendChild(badge);
      });
    }
    labelsCell.appendChild(labelsContainer);

    // Updated Date
    const updatedCell = document.createElement('td');
    updatedCell.textContent = new Date(it.updated_at || it.created_at).toLocaleDateString();
    updatedCell.className = 'updated-cell';

    // Evidence
    const evidenceCell = document.createElement('td');
    const evidenceContainer = document.createElement('div');
    evidenceContainer.className = 'evidence-container';
    
    const allImgs = [...(it.images||[]), ...((it.sub_issue_images||[]))];
    if(allImgs.length === 0){
      evidenceContainer.textContent = 'No evidence';
      evidenceContainer.className += ' no-evidence';
    } else {
      allImgs.slice(0, 3).forEach(img=>{ // Show max 3 thumbnails
        const repo = it.__repo || it.repo || [...selectedRepos][0] || REPOS[0];
        const src = resolveImage(img, repo);
        const imgEl = document.createElement('img');
        imgEl.src = src;
        imgEl.className = 'evidence-thumb';
        imgEl.alt = `evidence-${it.number}`;
        imgEl.addEventListener('click', ()=> showOverlay(src));
        evidenceContainer.appendChild(imgEl);
      });
      if(allImgs.length > 3) {
        const moreEl = document.createElement('span');
        moreEl.textContent = `+${allImgs.length - 3} more`;
        moreEl.className = 'more-evidence';
        evidenceContainer.appendChild(moreEl);
      }
    }
    evidenceCell.appendChild(evidenceContainer);

    row.appendChild(numberCell);
    row.appendChild(titleCell);
    row.appendChild(stateCell);
    row.appendChild(labelsCell);
    row.appendChild(updatedCell);
    row.appendChild(evidenceCell);
    
    issuesTableBody.appendChild(row);
  }
}

// Update pagination controls
function updatePagination(){
  totalPages = Math.ceil(filteredData.length / rowsPerPage);
  if(totalPages === 0) totalPages = 1;
  
  // Update pagination info
  const startIndex = (currentPage - 1) * rowsPerPage + 1;
  const endIndex = Math.min(currentPage * rowsPerPage, filteredData.length);
  paginationInfo.textContent = `Showing ${startIndex}-${endIndex} of ${filteredData.length} issues`;
  
  // Update button states
  firstPageBtn.disabled = currentPage === 1;
  prevPageBtn.disabled = currentPage === 1;
  nextPageBtn.disabled = currentPage === totalPages;
  lastPageBtn.disabled = currentPage === totalPages;
  
  // Update page numbers
  pageNumbers.innerHTML = '';
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  if(endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  
  for(let i = startPage; i <= endPage; i++){
    const pageBtn = document.createElement('button');
    pageBtn.textContent = i;
    pageBtn.className = `btn page-btn ${i === currentPage ? 'active' : ''}`;
    pageBtn.addEventListener('click', () => goToPage(i));
    pageNumbers.appendChild(pageBtn);
  }
}

// Navigate to specific page
function goToPage(page){
  if(page >= 1 && page <= totalPages){
    currentPage = page;
    renderIssuesTable();
    updatePagination();
  }
}

// summary
function updateSummary(count){
  summaryEl.textContent = `${count} issues shown (${selectedRepos.size} repo(s) selected)`;
}

// overlay
function showOverlay(src){ overlayImg.src = src; overlay.classList.remove('hidden'); overlay.setAttribute('aria-hidden','false'); }
function hideOverlay(){ overlay.classList.add('hidden'); overlay.setAttribute('aria-hidden','true'); overlayImg.src=''; }
closeOverlay.addEventListener('click', hideOverlay);
overlay.addEventListener('click', (e)=> { if(e.target === overlay) hideOverlay(); });

// apply & clear
applyBtn.addEventListener('click', applyFiltersAndRender);
clearBtn.addEventListener('click', ()=>{
  searchInput.value = '';
  stateFilter.value = '';
  activeLabelFilters.clear();
  [...labelMultiEl.children].forEach(ch => ch.classList.remove('active'));
  applyFiltersAndRender();
});

// pagination event listeners
firstPageBtn.addEventListener('click', () => goToPage(1));
prevPageBtn.addEventListener('click', () => goToPage(currentPage - 1));
nextPageBtn.addEventListener('click', () => goToPage(currentPage + 1));
lastPageBtn.addEventListener('click', () => goToPage(totalPages));

// rows per page change
rowsPerPageSelect.addEventListener('change', ()=>{
  rowsPerPage = parseInt(rowsPerPageSelect.value);
  currentPage = 1;
  updatePagination();
  renderIssuesTable();
});

// repo toolbar handlers
if(repoSearchInput){
  repoSearchInput.addEventListener('input', ()=>{
    loadRepoStats();
  });
}
if(selectAllReposBtn){
  selectAllReposBtn.addEventListener('click', ()=>{
    REPOS.forEach(r=> selectedRepos.add(r));
    loadRepoStats();
    loadSelectedReposData();
  });
}
if(clearReposBtn){
  clearReposBtn.addEventListener('click', ()=>{
    selectedRepos.clear();
    loadRepoStats();
    loadSelectedReposData();
  });
}

function updateRepoSelectedCount(){
  if(!repoSelectedCountEl) return;
  const n = selectedRepos.size;
  repoSelectedCountEl.textContent = n ? `(${n} selected)` : '';
}

// initialize
(async function init(){
  // create repo chips UI
  REPOS.forEach(r=>{
    const btn = document.createElement('button');
    btn.className = 'repo-chip';
    btn.textContent = r;
    btn.dataset.repo = r;
    // Enable chip toggling
    btn.title = 'Click to include/exclude this repo';
    btn.addEventListener('click', ()=> toggleRepo(r));
    if(selectedRepos.has(r)){
      btn.classList.add('active');
    }
    repoButtonsEl.appendChild(btn);
  });

  // preselect first repo and mark as active visually
  if(REPOS.length){
    toggleRepo(REPOS[0]);
    const first = repoButtonsEl.querySelector('[data-repo="'+REPOS[0]+'"]');
    if(first) first.classList.add('active');
  }

  // load summary cards (async)
  loadRepoStats();
})();
