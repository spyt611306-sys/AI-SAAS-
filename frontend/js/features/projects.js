import { setHTML } from '../utils/dom.js';
import { safeNumber, normalizeProjectId, projectSummaryText, projectAmountText, projectInitials, projectTheme, daysLeftLabel, projectSourceLabel } from '../utils/helpers.js';

export function getCurrentSelectedProject(state, projects, list = projects) {
  return list.find(item => item.id === state.selectedId) || null;
}

export function resolveSelectedProject(state, list){
  if(!list.length){
    state.selectedId = null;
    return null;
  }
  const activeProject = list.find(item => item.id === state.selectedId) || list[0];
  state.selectedId = activeProject.id;
  return activeProject;
}

export function renderCounts(projects) {
  document.getElementById('countAll').textContent = projects.length;
  document.getElementById('countHighFit').textContent = projects.filter(project => project.fit >= 80).length;
  document.getElementById('countClosingSoon').textContent = projects.filter(project => project.dueDays <= 7).length;
  document.getElementById('countAmountKnown').textContent = projects.filter(project => project.amount !== null).length;
  document.getElementById('countUpdated').textContent = projects.filter(project => project.status === '변경').length;
}

export function renderKPIStats(items = [], els) {
  if (!els.kpiStripEl) return;
  const list = Array.isArray(items) ? items : [];
  const total = list.length;
  const avgFit = total ? Math.round(list.reduce((sum, p) => sum + safeNumber(p.fit), 0) / total) : 0;
  const avgTrust = total ? Math.round(list.reduce((sum, p) => sum + safeNumber(p.trust), 0) / total) : 0;
  const countries = new Set(list.map(p => p.country).filter(Boolean)).size;
  const urgent = list.filter(p => safeNumber(p.dueDays, 999) <= 14).length;

  els.kpiStripEl.innerHTML = `
    <article class="kpi-card"><div class="kpi-label">Opportunities</div><div class="kpi-value">${total}</div><div class="kpi-meta"><span>Visible pipeline</span><span class="kpi-delta">LIVE</span></div></article>
    <article class="kpi-card"><div class="kpi-label">Average Fit</div><div class="kpi-value">${avgFit}<small>%</small></div><div class="kpi-meta"><span>AI relevance score</span><span class="kpi-delta">+${Math.max(1, Math.round(avgFit / 12))}%</span></div></article>
    <article class="kpi-card"><div class="kpi-label">Confidence</div><div class="kpi-value">${avgTrust}<small>%</small></div><div class="kpi-meta"><span>Source trust blend</span><span class="kpi-delta">Stable</span></div></article>
    <article class="kpi-card"><div class="kpi-label">Markets</div><div class="kpi-value">${countries}</div><div class="kpi-meta"><span>Country coverage</span><span class="kpi-delta">Global</span></div></article>
    <article class="kpi-card"><div class="kpi-label">Urgent Closures</div><div class="kpi-value">${urgent}</div><div class="kpi-meta"><span>≤ 14 day windows</span><span class="kpi-delta">${urgent ? 'Watch' : 'Clear'}</span></div></article>`;
}

export function renderProjectList({ list, state, els, onSelect, onToggleSave }) {
  if (!els.projectListEl) return;

  if (!list.length) {
    els.projectListEl.innerHTML = `<div class="empty-projects"><div><strong style="display:block; margin-bottom:8px; color:var(--text);">No projects match the current filters</strong><span>Adjust Industry, Region, Status, or Search to reopen the live opportunity stream.</span></div></div>`;
    return;
  }

  els.projectListEl.innerHTML = list.map(project => {
    const fit = safeNumber(project.fit);
    const trust = safeNumber(project.trust);
    const amountText = projectAmountText(project);
    const theme = projectTheme(project);
    const isSaved = state.saved.has(project.id);
    const activeClass = state.selectedId === project.id ? 'active' : '';
    const summaryText = projectSummaryText(project);

    return `
      <article class="project-card ${activeClass}" data-project-id="${project.id}">
        <div class="project-card-visual" style="background:${theme.bg};">
          <div class="visual-grid-lines"></div>
          <div class="project-card-badge-row">
            <span class="project-chip ${theme.chip}">Fit ${fit}%</span>
            <span class="project-chip">${daysLeftLabel(project)}</span>
          </div>
          <div class="project-symbol">${projectInitials(project.title)}</div>
          <div class="project-mini-score"><strong>${trust}%</strong><span>Confidence</span></div>
        </div>
        <div class="project-card-body">
          <div class="project-card-topline">
            <div>
              <h4 class="project-card-title">${project.title || 'Untitled Project'}</h4>
              <div class="project-card-client">${project.client || 'Unknown Client'} · ${project.country || 'Global'}</div>
            </div>
            <button class="project-save-btn ${isSaved ? 'saved' : ''}" type="button" data-save-id="${project.id}" aria-label="Save project">${isSaved ? '★' : '☆'}</button>
          </div>
          <p class="project-card-summary">${summaryText}</p>
          <div class="project-stat-row">
            <div class="project-stat"><div class="project-stat-label">Budget</div><div class="project-stat-value">${amountText}</div></div>
            <div class="project-stat"><div class="project-stat-label">Stage</div><div class="project-stat-value">${project.stage || 'Discovery'}</div></div>
            <div class="project-stat"><div class="project-stat-label">Deadline</div><div class="project-stat-value">${project.deadline || daysLeftLabel(project)}</div></div>
          </div>
          <div class="project-card-footer"><span class="project-source">${projectSourceLabel(project)}</span><span class="project-link-mini">Analyzed</span></div>
        </div>
      </article>`;
  }).join('');

  els.projectListEl.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('[data-save-id]')) return;
      onSelect(Number(card.getAttribute('data-project-id')));
    });
  });

  els.projectListEl.querySelectorAll('[data-save-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onToggleSave(Number(btn.getAttribute('data-save-id')));
    });
  });
}

export function renderDetail(project, els) {
  if (!els.detailPanelEl) return;

  if (!project) {
    els.detailPanelEl.innerHTML = `<div class="panel-title"><h4>AI Insight Panel</h4></div><div class="empty-projects" style="min-height:220px;"><div><strong style="display:block; margin-bottom:8px; color:var(--text);">No project selected</strong><span>Select a project card to inspect AI score, confidence, stage, source, and recommendation logic.</span></div></div>`;
    return;
  }

  const fit = safeNumber(project.fit);
  const trust = safeNumber(project.trust);
  const amountText = projectAmountText(project);
  const summary = projectSummaryText(project);
  const stage = project.stage || 'Discovery';
  const timeline = project.deadline || daysLeftLabel(project);

  els.detailPanelEl.innerHTML = `
    <div class="panel-title" style="margin-bottom:14px;"><h4>AI Project Insight</h4></div>
    <div class="insight-score-hero">
      <div class="score-orb"><div class="score-orb-inner"><div class="score-orb-value">${fit}</div><div class="score-orb-label">Match Score</div></div></div>
      <div class="insight-meta"><h3>${project.title || 'Untitled Project'}</h3><p>${summary}</p></div>
    </div>
    <div class="insight-grid">
      <div class="insight-metric"><span class="label">Confidence</span><strong>${trust}%</strong></div>
      <div class="insight-metric"><span class="label">Stage</span><strong>${stage}</strong></div>
      <div class="insight-metric"><span class="label">Budget</span><strong>${amountText}</strong></div>
      <div class="insight-metric"><span class="label">Market</span><strong>${project.country || 'Global'}</strong></div>
    </div>
    <div class="insight-meter"><div class="insight-meter-label"><span>AI Confidence Meter</span><strong style="color:var(--text);">${trust}%</strong></div><div class="insight-meter-track"><div class="insight-meter-fill" style="width:${Math.max(4, Math.min(trust, 100))}%;"></div></div></div>
    <div class="insight-notes">
      <div class="insight-note"><strong style="display:block; margin-bottom:6px; color:var(--text);">Source</strong>${projectSourceLabel(project)}</div>
      <div class="insight-note"><strong style="display:block; margin-bottom:6px; color:var(--text);">Timeline</strong>${timeline}</div>
      <div class="insight-note"><strong style="display:block; margin-bottom:6px; color:var(--text);">Why this ranks high</strong>${summary}</div>
    </div>`;
}

export function renderSaved({ projects, state, els, onOpen }) {
  const savedProjects = projects.filter(project => state.saved.has(project.id));
  if (els.savedCount) els.savedCount.textContent = savedProjects.length;
  const html = savedProjects.length
    ? savedProjects.slice(0, 4).map(project => `<div class="intel-item"><div><strong style="display:block;font-size:14px">${project.title}</strong><span class="small">${project.client} · ${project.catCode} · ${project.fit}%</span></div><button class="btn secondary sm" data-open-id="${project.id}">보기</button></div>`).join('')
    : '<div class="note-box">아직 저장한 프로젝트가 없습니다. 목록에서 ★를 눌러 저장해보세요.</div>';
  setHTML(els.savedProjectsPanel, html);
  document.querySelectorAll('[data-open-id]').forEach(button => button.addEventListener('click', () => onOpen(Number(button.dataset.openId))));
}

export function renderRecent({ projects, state, els }) {
  if (els.recentCount) els.recentCount.textContent = state.recent.length;
  const recentProjects = state.recent.map(id => projects.find(project => project.id === id)).filter(Boolean);
  const html = recentProjects.length
    ? recentProjects.map(project => `<div class="intel-item"><div><strong style="display:block;font-size:14px">${project.title}</strong><span class="small">${project.updatedAgo} · ${project.stage}</span></div><span class="badge blue">${project.fit}%</span></div>`).join('')
    : '<div class="note-box">아직 본 프로젝트가 없습니다. 목록을 클릭하면 이 영역에 최근 본 항목이 쌓입니다.</div>';
  setHTML(els.recentProjectsPanel, html);
}

export function renderLiveLogs(logs, els) {
  const html = logs.map(log => `<div class="live-item"><span class="live-dot"></span><div><strong style="display:block;font-size:14px">${log}</strong><span class="small">최근 동기화 기준 반영</span></div></div>`).join('');
  setHTML(els.liveActivityPanel, html);
}

export function selectProject({ projectOrId, state, projects, filteredList, els, renderAll, api }) {
  const id = normalizeProjectId(projectOrId);
  if (id === null) return;
  state.selectedId = id;
  const project = projects.find(item => item.id === id);
  if (!project) return;
  state.recent = [id, ...state.recent.filter(item => item !== id)].slice(0, 4);
  api?.pushRecentProject?.(id);
  renderAll(filteredList);
}
