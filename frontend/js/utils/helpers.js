export function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeProjectId(projectOrId) {
  if (projectOrId && typeof projectOrId === 'object') return Number(projectOrId.id);
  const id = Number(projectOrId);
  return Number.isFinite(id) ? id : null;
}

export function projectSummaryText(project) {
  if (typeof project.summary === 'string' && project.summary.trim()) return project.summary.trim();
  if (Array.isArray(project.explanation)) {
    return project.explanation
      .map(item => Array.isArray(item) ? item[1] : String(item))
      .filter(Boolean)
      .slice(0, 2)
      .join(' · ');
  }
  return 'AI-curated opportunity with strong matching signals and verified sourcing.';
}

export function projectAmountText(project) {
  if (project.amountLabel) return project.amountLabel;
  if (project.amount !== null && project.amount !== undefined) return `${project.amount}`;
  return '금액 미공개';
}

export function projectInitials(title = '') {
  return String(title).split(' ').filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase() || 'AI';
}

export function projectTheme(project) {
  const text = `${project.title || ''} ${project.client || ''} ${project.country || ''}`.toLowerCase();
  if (text.includes('energy') || text.includes('grid')) return { bg:'linear-gradient(135deg, rgba(0,229,255,0.28), rgba(0,209,178,0.16) 52%, rgba(7,17,31,0.14))', chip:'teal' };
  if (text.includes('health') || text.includes('medical')) return { bg:'linear-gradient(135deg, rgba(79,195,247,0.28), rgba(0,229,255,0.15) 52%, rgba(7,17,31,0.14))', chip:'cyan' };
  if (text.includes('infra') || text.includes('transport') || text.includes('rail')) return { bg:'linear-gradient(135deg, rgba(255,184,77,0.22), rgba(0,229,255,0.14) 52%, rgba(7,17,31,0.14))', chip:'warn' };
  return { bg:'linear-gradient(135deg, rgba(0,229,255,0.26), rgba(0,209,178,0.18) 50%, rgba(7,17,31,0.12))', chip:'cyan' };
}

export function daysLeftLabel(project) {
  const raw = project.dueDays ?? project.daysLeft ?? project.deadlineDays ?? project.remainingDays;
  const days = safeNumber(raw, null);
  if (days === null) return '일정 확인 필요';
  if (days <= 7) return `${days}일 남음`;
  if (days <= 21) return `${days}일 윈도우`;
  return `${days}일 남음`;
}

export function projectSourceLabel(project) {
  return project.sourceLabel || project.source || project.origin || project.publisher || 'Verified source';
}

export function getDaysLabel(days){
  if(days <= 3) return 'D-3 이내';
  if(days <= 7) return 'D-7 이내';
  if(days <= 30) return 'D-30';
  return '장기';
}

export function getStatusBadge(status){
  if(status === '신규') return 'green';
  if(status === '변경') return 'blue';
  if(status === '마감임박') return 'red';
  return 'amber';
}

export function getCatLabel(code, industryGroups){
  for(const group of industryGroups){
    const cat = group.cats.find(item => item[0] === code);
    if(cat) return cat[1];
  }
  return code;
}
