export function updateBilling(type){
  document.querySelectorAll('[data-billing]').forEach(button => button.classList.toggle('active', button.dataset.billing === type));
  document.querySelectorAll('[data-price-month]').forEach(el => {
    const value = type === 'monthly' ? el.dataset.priceMonth : el.dataset.priceYear;
    el.innerHTML = `₩${Number(value).toLocaleString('ko-KR')} <small>/${type === 'monthly' ? '월' : '월, 연간 결제 기준'}</small>`;
  });
}

export function openOverlay(id){
  const overlay = document.getElementById(id);
  if (!overlay) return;
  overlay.classList.add('show');
  overlay.setAttribute('aria-hidden','false');
  document.body.style.overflow = 'hidden';
}

export function closeOverlay(id){
  const overlay = document.getElementById(id);
  if (!overlay) return;
  overlay.classList.remove('show');
  overlay.setAttribute('aria-hidden','true');
  document.body.style.overflow = '';
}

export function wireCollapsibles() {
  const profileToggle = document.getElementById('companyProfileToggle');
  const profileContent = document.getElementById('companyProfileContent');
  if (profileToggle && profileContent) {
    profileToggle.addEventListener('click', () => {
      const isCollapsed = profileContent.classList.toggle('collapsed');
      profileToggle.classList.toggle('collapsed', isCollapsed);
      profileToggle.setAttribute('aria-expanded', String(!isCollapsed));
    });
  }

  const toolbarMetaToggle = document.getElementById('toolbarMetaToggle');
  const toolbarMetaContent = document.getElementById('toolbarMetaContent');
  if (toolbarMetaToggle && toolbarMetaContent) {
    toolbarMetaToggle.addEventListener('click', () => {
      const isHidden = toolbarMetaContent.classList.toggle('collapsed');
      toolbarMetaToggle.classList.toggle('collapsed', isHidden);
      toolbarMetaToggle.setAttribute('aria-expanded', String(!isHidden));
    });
  }
}

export function wireSidebar(workspaceFrame) {
  const sidebar = document.getElementById('appSidebar');
  const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
  const sidebarItems = document.querySelectorAll('[data-sidebar-item]');
  if (!workspaceFrame || !sidebar || !sidebarToggleBtn || !sidebarItems.length) return;

  const syncSidebarState = () => {
    const expanded = workspaceFrame.classList.contains('sidebar-expanded');
    sidebar.setAttribute('aria-expanded', String(expanded));
    sidebarToggleBtn.setAttribute('aria-pressed', String(expanded));
  };

  sidebarToggleBtn.addEventListener('click', () => {
    workspaceFrame.classList.toggle('sidebar-expanded');
    syncSidebarState();
  });

  sidebarItems.forEach((item) => {
    item.addEventListener('click', () => {
      sidebarItems.forEach((node) => node.classList.remove('active'));
      item.classList.add('active');
    });
  });

  syncSidebarState();
}

export function wireFaq() {
  document.querySelectorAll('.faq-q').forEach(button => button.addEventListener('click', () => button.parentElement.classList.toggle('open')));
}

export function wireAuthTabs() {
  document.querySelectorAll('.auth-tab').forEach(tab => tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.auth-panel').forEach(item => item.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`auth-${tab.dataset.authTab}`)?.classList.add('active');
  }));
}
