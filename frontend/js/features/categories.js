import { getCatLabel } from '../utils/helpers.js';

export function renderActiveCats({ state, els, industryGroups, onRefresh }) {
  const cats = [...state.selectedCats];
  els.activeCatList.innerHTML = cats.length
    ? cats.map(code => `<span class="active-cat-tag">${code} ${getCatLabel(code, industryGroups)} <button type="button" data-remove-cat="${code}" aria-label="${code} 제거">✕</button></span>`).join('')
    : '<span class="caption">선택된 카테고리가 없습니다.</span>';

  document.querySelectorAll('[data-remove-cat]').forEach(button => {
    button.addEventListener('click', () => {
      state.selectedCats.delete(button.dataset.removeCat);
      onRefresh();
    });
  });
}

export function renderInterestCollections({ state, els, industryGroups }) {
  const interestCodes = [...new Set([...state.selectedCats, ...state.recentCats, ...state.favoriteCats])].slice(0, 4);
  els.myInterestList.innerHTML = interestCodes.length
    ? interestCodes.map(code => `<span class="summary-pill"><strong>${code}</strong> ${getCatLabel(code, industryGroups)}</span>`).join('')
    : '<span class="caption">아직 선택된 관심 산업이 없습니다.</span>';

  els.recentCategoryList.innerHTML = state.recentCats.length
    ? state.recentCats.slice(0, 3).map(code => `<span class="summary-pill">최근 ${code}</span>`).join('')
    : '<span class="caption">최근 선택 없음</span>';

  els.favoriteCategoryList.innerHTML = [...state.favoriteCats].length
    ? [...state.favoriteCats].slice(0, 3).map(code => `<span class="summary-pill">★ ${code}</span>`).join('')
    : '<span class="caption">즐겨찾기 없음</span>';
}

export function renderIndustryTree({ state, els, industryGroups, onRefresh }) {
  const query = state.catQuery.trim().toLowerCase();
  els.industryTree.innerHTML = industryGroups.map(group => {
    const filteredCats = group.cats.filter(([code,label]) => !query || `${code} ${label} ${group.label}`.toLowerCase().includes(query));
    if(!filteredCats.length) return '';
    const open = state.openGroups.has(group.id);
    return `
      <div class="industry-group">
        <button type="button" class="industry-group-head" data-group-toggle="${group.id}">
          <span><strong>${group.label}</strong><span>${filteredCats.length}개 CAT</span></span>
          <b>${open ? '▾' : '▸'}</b>
        </button>
        ${open ? `<div class="industry-cat-list">${filteredCats.map(([code,label]) => `
          <div class="cat-item ${state.selectedCats.has(code) ? 'active' : ''}">
            <button type="button" class="cat-main" data-cat-toggle="${code}">
              <span class="cat-check">${state.selectedCats.has(code) ? '✓' : ''}</span>
              <span class="cat-copy"><strong>${code} ${label}</strong><span>${group.label}</span></span>
            </button>
            <button type="button" class="cat-favorite ${state.favoriteCats.has(code) ? 'active' : ''}" data-cat-favorite="${code}" aria-label="${code} 즐겨찾기">★</button>
          </div>`).join('')}</div>` : ''}
      </div>`;
  }).join('') || '<div class="note-box">검색 조건에 맞는 산업 카테고리가 없습니다.</div>';

  document.querySelectorAll('[data-group-toggle]').forEach(button => button.addEventListener('click', () => {
    if(state.openGroups.has(button.dataset.groupToggle)) state.openGroups.delete(button.dataset.groupToggle);
    else state.openGroups.add(button.dataset.groupToggle);
    renderIndustryTree({ state, els, industryGroups, onRefresh });
  }));

  document.querySelectorAll('[data-cat-toggle]').forEach(button => button.addEventListener('click', () => {
    const code = button.dataset.catToggle;
    if(state.selectedCats.has(code)) state.selectedCats.delete(code);
    else state.selectedCats.add(code);
    state.recentCats = [code, ...state.recentCats.filter(item => item !== code)].slice(0, 4);
    onRefresh();
  }));

  document.querySelectorAll('[data-cat-favorite]').forEach(button => button.addEventListener('click', () => {
    const code = button.dataset.catFavorite;
    if(state.favoriteCats.has(code)) state.favoriteCats.delete(code);
    else state.favoriteCats.add(code);
    renderIndustryTree({ state, els, industryGroups, onRefresh });
    renderInterestCollections({ state, els, industryGroups });
  }));
}
