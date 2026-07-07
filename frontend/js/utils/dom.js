export function getElements() {
  return {
    projectListEl: document.getElementById('projectGrid'),
    kpiStripEl: document.getElementById('kpiStrip'),
    detailPanelEl: document.getElementById('detailPanel'),
    resultCount: document.getElementById('resultCount'),
    savedCount: document.getElementById('savedCount'),
    recentCount: document.getElementById('recentCount'),
    searchInput: document.getElementById('searchInput'),
    regionFilter: document.getElementById('regionFilter'),
    statusFilter: document.getElementById('statusFilter'),
    sortFilter: document.getElementById('sortFilter'),
    catSearchInput: document.getElementById('catSearchInput'),
    activeCatList: document.getElementById('activeCatList'),
    industryTree: document.getElementById('industryTree'),
    myInterestList: document.getElementById('myInterestList'),
    recentCategoryList: document.getElementById('recentCategoryList'),
    favoriteCategoryList: document.getElementById('favoriteCategoryList'),
    recentProjectsPanel: document.getElementById('recentProjects'),
    savedProjectsPanel: document.getElementById('savedProjects'),
    liveActivityPanel: document.getElementById('liveActivity'),
    workspaceFrame: document.getElementById('workspaceFrame')
  };
}

export function setHTML(el, html) {
  if (el) el.innerHTML = html;
}
