export function syncSearchInputs(els, value){
  els.searchInput.value = value;
}

export function sortProjects(state, list){
  const sorted = [...list];
  if(state.currentSort === 'deadline') sorted.sort((a,b)=>a.dueDays-b.dueDays);
  if(state.currentSort === 'trust') sorted.sort((a,b)=>b.trust-a.trust);
  if(state.currentSort === 'amount') sorted.sort((a,b)=>(b.amount ?? -1) - (a.amount ?? -1));
  if(state.currentSort === 'updated') sorted.sort((a,b)=>a.updatedHours - b.updatedHours);
  if(state.currentSort === 'priority') sorted.sort((a,b)=>(b.fit + b.trust/10) - (a.fit + a.trust/10));
  return sorted;
}

export function applyFilters(state, projects){
  const query = state.query.trim().toLowerCase();
  let list = projects.filter(project => {
    const catMatch = state.selectedCats.size === 0 || state.selectedCats.has(project.catCode);
    const regionMatch = state.currentRegion === 'all' || project.region === state.currentRegion || (state.currentRegion === '국내' && ['경기','전국','대전/충청'].includes(project.region));
    const statusMatch = state.currentStatus === 'all' || project.status === state.currentStatus || project.stage === state.currentStatus;
    const scopeMatch = state.projectScope === 'all' || (state.projectScope === 'domestic' && project.country === '대한민국') || (state.projectScope === 'international' && project.country !== '대한민국');
    const querySource = [project.title, project.client, project.scope, project.region, project.category, project.catCode, project.catLabel, project.country, project.stage, project.keywords.join(' '), project.relatedCompanies.join(' ')].join(' ').toLowerCase();
    const queryMatch = !query || querySource.includes(query);
    return catMatch && regionMatch && statusMatch && scopeMatch && queryMatch;
  });

  if(state.currentQuick === 'highFit') list = list.filter(project => project.fit >= 80);
  if(state.currentQuick === 'closingSoon') list = list.filter(project => project.dueDays <= 7);
  if(state.currentQuick === 'amountKnown') list = list.filter(project => project.amount !== null);
  if(state.currentQuick === 'updated') list = list.filter(project => project.status === '변경');

  return sortProjects(state, list);
}

export function applyPreset(state, els, key){
  state.selectedCats.clear();
  state.query = '';
  state.currentRegion = 'all';
  state.currentStatus = 'all';
  if(key === 'domestic-grid'){
    ['CAT-05','CAT-31'].forEach(code => state.selectedCats.add(code));
    state.currentRegion = '국내';
  }
  if(key === 'kogas'){
    ['CAT-11','CAT-13'].forEach(code => state.selectedCats.add(code));
    state.query = '한국가스공사';
  }
  if(key === 'epc-middle-east'){
    state.selectedCats.add('CAT-14');
    state.currentRegion = '중동';
    state.query = 'EPC';
  }
  syncSearchInputs(els, state.query);
  els.regionFilter.value = state.currentRegion;
  els.statusFilter.value = state.currentStatus;
}

export function resetFilters(state, els){
  state.query = '';
  state.currentQuick = 'all';
  state.currentRegion = 'all';
  state.currentStatus = 'all';
  state.currentSort = 'priority';
  state.selectedCats.clear();
  syncSearchInputs(els, '');
  els.regionFilter.value = 'all';
  els.statusFilter.value = 'all';
  els.sortFilter.value = 'priority';
}
