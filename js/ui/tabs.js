// Tab switching for right panel

const TAB_ORDER = ['tab-schematic', 'tab-planetview', 'tab-encounter', 'tab-pv', 'tab-wake'];

export function initTabs() {
  const buttons = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-content');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      switchToTab(btn.dataset.tab);
    });
  });

  // Next/Prev navigation buttons
  document.querySelectorAll('.tab-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const currentTab = document.querySelector('.tab-content.active');
      if (!currentTab) return;
      const currentId = currentTab.id;
      const currentIdx = TAB_ORDER.indexOf(currentId);
      if (currentIdx === -1) return;

      const dir = btn.dataset.dir;
      const nextIdx = dir === 'next' ? currentIdx + 1 : currentIdx - 1;
      if (nextIdx >= 0 && nextIdx < TAB_ORDER.length) {
        switchToTab(TAB_ORDER[nextIdx]);
      }
    });
  });

  // Keyboard navigation in tab bar
  const tabBar = document.querySelector('.tab-bar');
  if (tabBar) {
    tabBar.addEventListener('keydown', (e) => {
      const tabs = Array.from(tabBar.querySelectorAll('.tab-btn'));
      const currentIdx = tabs.indexOf(document.activeElement);
      if (currentIdx === -1) return;

      let nextIdx;
      if (e.key === 'ArrowRight') nextIdx = Math.min(currentIdx + 1, tabs.length - 1);
      else if (e.key === 'ArrowLeft') nextIdx = Math.max(currentIdx - 1, 0);
      else return;

      e.preventDefault();
      tabs[nextIdx].focus();
      tabs[nextIdx].click();
    });
  }
}

function switchToTab(tabId) {
  const buttons = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-content');

  buttons.forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-selected', 'false');
  });
  panels.forEach(p => p.classList.remove('active'));

  const targetBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
  const panel = document.getElementById(tabId);
  if (targetBtn) {
    targetBtn.classList.add('active');
    targetBtn.setAttribute('aria-selected', 'true');
  }
  if (panel) panel.classList.add('active');

  // Dispatch event for modules that need to know about tab switches
  window.dispatchEvent(new CustomEvent('tabchange', { detail: { tab: tabId } }));
}
