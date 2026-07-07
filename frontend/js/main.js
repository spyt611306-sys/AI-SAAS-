import { industryGroups as fallbackIndustryGroups } from './data/industryGroups.js';
import { projects as fallbackProjects } from './data/projects.js';
import { liveLogs as fallbackLiveLogs } from './data/liveLogs.js';
import { createInitialState } from './state/workspaceState.js';
import { getElements } from './utils/dom.js';
import { createApi } from './services/api.js';
import { renderCounts, renderKPIStats, renderProjectList, renderDetail, renderSaved, renderRecent, renderLiveLogs, resolveSelectedProject, selectProject } from './features/projects.js';
import { renderIndustryTree, renderInterestCollections, renderActiveCats } from './features/categories.js';
import { syncSearchInputs, applyFilters, applyPreset, resetFilters } from './features/filters.js';
import { updateBilling, openOverlay, closeOverlay, wireCollapsibles, wireSidebar, wireFaq, wireAuthTabs } from './features/ui.js';

const api = createApi({ fallbackData: { industryGroups: fallbackIndustryGroups, projects: fallbackProjects, liveLogs: fallbackLiveLogs } });
const els = getElements();

let industryGroups = [...fallbackIndustryGroups];
let projects = [...fallbackProjects];
let liveLogs = [...fallbackLiveLogs];
const state = createInitialState(projects, industryGroups);

function hydrateFromBootstrap(bootstrap) {
  industryGroups = bootstrap.industryGroups || industryGroups;
  projects = bootstrap.projects || projects;
  liveLogs = bootstrap.liveLogs || liveLogs;
  state.saved = new Set(bootstrap.savedIds || projects.filter(project => project.saved).map(project => project.id));
  state.recent = bootstrap.recentIds || [];
  state.recentCats = bootstrap.recentCats || state.recentCats;
  state.favoriteCats = new Set(bootstrap.favoriteCats || [...state.favoriteCats]);
  state.openGroups = new Set(industryGroups.map(group => group.id));
}

function hydrateWorkspaceBootState(){
  state.currentQuick = 'all';
  state.currentRegion = 'all';
  state.currentStatus = 'all';
  state.currentSort = 'priority';
  state.projectScope = 'all';
  state.query = '';
  state.catQuery = '';
  state.selectedCats.clear();

  syncSearchInputs(els, '');
  if(els.regionFilter) els.regionFilter.value = 'all';
  if(els.statusFilter) els.statusFilter.value = 'all';
  if(els.sortFilter) els.sortFilter.value = 'priority';
  if(els.catSearchInput) els.catSearchInput.value = '';

  document.querySelectorAll('[data-quick]').forEach(button => button.classList.toggle('active', button.dataset.quick === 'all'));
  document.querySelectorAll('[data-scope]').forEach(button => button.classList.toggle('active', button.dataset.scope === 'all'));
}

function refreshWorkspace() {
  const list = applyFilters(state, projects);
  const activeProject = resolveSelectedProject(state, list);

  renderInterestCollections({ state, els, industryGroups });
  renderIndustryTree({ state, els, industryGroups, onRefresh: refreshWorkspace });
  renderActiveCats({ state, els, industryGroups, onRefresh: refreshWorkspace });
  renderKPIStats(list, els);
  renderProjectList({
    list,
    state,
    els,
    onSelect: (id) => selectProject({ projectOrId:id, state, projects, filteredList:list, els, renderAll:() => refreshWorkspace(), api }),
    onToggleSave: async (id) => {
      if(state.saved.has(id)) state.saved.delete(id);
      else state.saved.add(id);
      await api.toggleSavedProject(id);
      refreshWorkspace();
    }
  });
  renderDetail(activeProject, els);
  renderRecent({ projects, state, els });
  renderSaved({ projects, state, els, onOpen: (id) => selectProject({ projectOrId:id, state, projects, filteredList:list, els, renderAll:() => refreshWorkspace(), api }) });
  renderLiveLogs(liveLogs, els);
  renderCounts(projects);
  if (els.resultCount) els.resultCount.textContent = `${list.length}건 표시 중`;
}

function bindEvents() {
  els.searchInput?.addEventListener('input', event => {
    state.query = event.target.value;
    syncSearchInputs(els, state.query);
    refreshWorkspace();
  });
  els.regionFilter?.addEventListener('change', event => { state.currentRegion = event.target.value; refreshWorkspace(); });
  els.statusFilter?.addEventListener('change', event => { state.currentStatus = event.target.value; refreshWorkspace(); });
  els.sortFilter?.addEventListener('change', event => { state.currentSort = event.target.value; refreshWorkspace(); });
  els.catSearchInput?.addEventListener('input', event => { state.catQuery = event.target.value; renderIndustryTree({ state, els, industryGroups, onRefresh: refreshWorkspace }); });

  document.getElementById('clearCatFilterBtn')?.addEventListener('click', () => { state.selectedCats.clear(); refreshWorkspace(); });
  document.getElementById('resetFilterBtn')?.addEventListener('click', () => { resetFilters(state, els); refreshWorkspace(); });
  document.getElementById('resetFiltersBtn')?.addEventListener('click', () => { resetFilters(state, els); refreshWorkspace(); });

  document.querySelectorAll('[data-quick]').forEach(button => button.addEventListener('click', () => {
    state.currentQuick = button.dataset.quick;
    document.querySelectorAll('[data-quick]').forEach(node => node.classList.toggle('active', node === button));
    refreshWorkspace();
  }));

  document.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => {
    applyPreset(state, els, button.dataset.preset);
    refreshWorkspace();
  }));

  document.querySelectorAll('[data-billing]').forEach(button => button.addEventListener('click', () => updateBilling(button.dataset.billing)));
  document.querySelectorAll('[data-open-auth]').forEach(button => button.addEventListener('click', () => {
    openOverlay('authOverlay');
    if(button.dataset.openAuth === 'register') document.querySelector('[data-auth-tab="register"]')?.click();
  }));
  document.querySelectorAll('[data-close-overlay]').forEach(button => button.addEventListener('click', () => closeOverlay(button.dataset.closeOverlay)));
  document.querySelectorAll('.modal-overlay').forEach(overlay => overlay.addEventListener('click', event => { if(event.target === overlay) closeOverlay(overlay.id); }));

  document.getElementById('demoLoginBtn')?.addEventListener('click', async () => {
    try { await api.login({ email:'sales@company.com', password:'demo1234' }); } catch (error) {}
    closeOverlay('authOverlay');
    alert('데모 로그인 완료');
  });
  document.getElementById('demoRegisterBtn')?.addEventListener('click', async () => {
    try { await api.register({ company:'ABC Power Systems', name:'홍길동' }); } catch (error) {}
    closeOverlay('authOverlay');
    alert('무료 체험 계정 생성 데모 완료');
  });

  document.querySelectorAll('[data-scope]').forEach(button => {
    button.addEventListener('click', () => {
      state.projectScope = button.dataset.scope;
      document.querySelectorAll('[data-scope]').forEach(item => item.classList.remove('active'));
      button.classList.add('active');

      if (state.projectScope === 'domestic') {
        state.currentRegion = '국내';
        els.regionFilter.value = '국내';
      } else if (state.projectScope === 'international') {
        state.currentRegion = '중동';
        els.regionFilter.value = '중동';
      } else {
        state.currentRegion = 'all';
        els.regionFilter.value = 'all';
      }
      refreshWorkspace();
    });
  });

  wireCollapsibles();
  wireSidebar(els.workspaceFrame);
  wireFaq();
  wireAuthTabs();
}

async function bootstrap() {
  const bootstrapData = await api.loadBootstrap();
  hydrateFromBootstrap(bootstrapData);
  hydrateWorkspaceBootState();
  bindEvents();
  refreshWorkspace();
}

bootstrap();
