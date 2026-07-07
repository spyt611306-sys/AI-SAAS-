export function createInitialState(projects, industryGroups) {
  const allGroupIds = industryGroups.map(group => group.id);
  const initialSaved = new Set(projects.filter(project => project.saved).map(project => project.id));

  return {
    currentQuick:'all',
    currentRegion:'all',
    currentStatus:'all',
    currentSort:'priority',
    query:'',
    catQuery:'',
    selectedId:null,
    recent:[],
    recentCats:['CAT-14','CAT-05'],
    favoriteCats:new Set(['CAT-05','CAT-11','CAT-14']),
    selectedCats:new Set(),
    openGroups:new Set(allGroupIds),
    saved:initialSaved,
    projectScope:'all'
  };
}
