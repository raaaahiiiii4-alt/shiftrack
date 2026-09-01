// ============================================================================
// ShiftTrack - UI Module (DOM Manipulation, Rendering, Toasts, Modals)
// ============================================================================

import { formatters, helpers } from './utils.js';
import { dateUtils } from './utils.js';

let toastContainer = null;
let modalOverlay = null;

function initToastContainer() {
  if (!toastContainer) {
    toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toastContainer';
      toastContainer.className = 'toast-container';
      toastContainer.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastContainer);
    }
  }
}

export function showToast(message, type = 'info', duration = 3000) {
  initToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = { success: 'fa-circle-check', info: 'fa-circle-info', warning: 'fa-triangle-exclamation', error: 'fa-circle-xmark' };
  toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span>${message}</span>`;
  toastContainer.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

export function setLoading(isLoading, context) {
  document.body.style.cursor = isLoading ? 'wait' : 'default';
  const buttons = document.querySelectorAll('button:not(.tab-btn):not(.filter-btn):not(.pill-btn):not(.row-checkbox)');
  buttons.forEach(btn => { btn.disabled = isLoading; });
}

export function showModal(content, modalId = 'dynamicModal', onClose) {
  hideModal(modalId);
  modalOverlay = document.createElement('div');
  modalOverlay.id = modalId;
  modalOverlay.className = 'modal-overlay';
  modalOverlay.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="${modalId}-title">${content}</div>`;
  document.body.appendChild(modalOverlay);
  modalOverlay.querySelector('.modal').focus();

  const closeModal = () => hideModal(modalId);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });
  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', escHandler);
    }
  });
  if (onClose) modalOverlay.dataset.onClose = 'true';
}

export function hideModal(modalId = 'dynamicModal') {
  const modal = document.getElementById(modalId);
  if (modal) modal.remove();
}

export function renderRoster(tokens, filters, selection) {
  const rosterTbody = document.getElementById('rosterTbody');
  const emptyState = document.getElementById('emptyState');
  const showingRecordsText = document.getElementById('showingRecordsText');
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  const bulkActionsBar = document.getElementById('bulkActionsBar');
  const selectedCountText = document.getElementById('selectedCountText');

  if (!rosterTbody) return;

  const filteredTokens = tokens.filter(t => {
    const matchDate = (t.date === filters.date);
    const matchFilter = (filters.shift === 'ALL' || t.shift === filters.shift);
    const matchSearch = !filters.search || t.tokenNo.toLowerCase().includes(filters.search.toLowerCase()) || (t.workerName || '').toLowerCase().includes(filters.search.toLowerCase());
    return matchDate && matchFilter && matchSearch;
  });

  const selectedTokens = filteredTokens.filter(t => t.selected);
  const dateTokens = tokens.filter(t => t.date === filters.date);

  if (selectedTokens.length > 0) {
    bulkActionsBar.classList.add('active');
    selectedCountText.textContent = `${selectedTokens.length} token(s) selected`;
  } else {
    bulkActionsBar.classList.remove('active');
  }

  if (selectAllCheckbox) {
    selectAllCheckbox.checked = (filteredTokens.length > 0 && selectedTokens.length === filteredTokens.length);
  }

  rosterTbody.innerHTML = '';
  if (filteredTokens.length === 0) {
    if (emptyState) emptyState.classList.add('active');
  } else {
    if (emptyState) emptyState.classList.remove('active');
    filteredTokens.forEach((t, idx) => {
      const tr = document.createElement('tr');
      if (t.selected) tr.classList.add('selected');

      let badgeClass = 'badge-off';
      let shiftText = 'General / Off';
      if (t.shift === 'A') { badgeClass = 'badge-a'; shiftText = 'Shift A (Morning)'; }
      else if (t.shift === 'B') { badgeClass = 'badge-b'; shiftText = 'Shift B (Evening)'; }
      else if (t.shift === 'C') { badgeClass = 'badge-c'; shiftText = 'Shift C (Night)'; }

      tr.innerHTML = `
        <td class="th-checkbox"><input type="checkbox" class="row-checkbox" data-id="${t.id}" ${t.selected ? 'checked' : ''} aria-label="Select token ${t.tokenNo}"></td>
        <td>${idx + 1}</td>
        <td><span class="token-badge">${t.tokenNo}</span>${t.workerName ? ` <small style="color:var(--text-muted)">(${t.workerName})</small>` : ''}</td>
        <td>${dateUtils.format(t.date)}</td>
        <td><span class="shift-indicator ${badgeClass}">${shiftText}</span></td>
        <td>
          <div class="shift-pills">
            <button type="button" class="pill-btn pill-a ${t.shift === 'A' ? 'active' : ''}" data-id="${t.id}" data-shift="A" title="Set Shift A" aria-label="Set Shift A for ${t.tokenNo}">A</button>
            <button type="button" class="pill-btn pill-b ${t.shift === 'B' ? 'active' : ''}" data-id="${t.id}" data-shift="B" title="Set Shift B" aria-label="Set Shift B for ${t.tokenNo}">B</button>
            <button type="button" class="pill-btn pill-c ${t.shift === 'C' ? 'active' : ''}" data-id="${t.id}" data-shift="C" title="Set Shift C" aria-label="Set Shift C for ${t.tokenNo}">C</button>
            <button type="button" class="pill-btn pill-off ${t.shift === 'OFF' ? 'active' : ''}" data-id="${t.id}" data-shift="OFF" title="Set Off" aria-label="Set Off for ${t.tokenNo}">Off</button>
          </div>
        </td>
        <td class="text-right"><button type="button" class="btn-icon-danger delete-row-btn" data-id="${t.id}" title="Remove Token" aria-label="Remove Token ${t.tokenNo}"><i class="fa-solid fa-trash-can" aria-hidden="true"></i></button></td>
      `;
      rosterTbody.appendChild(tr);
    });
  }

  if (showingRecordsText) {
    showingRecordsText.textContent = `Showing ${filteredTokens.length} of ${dateTokens.length} records for ${dateUtils.format(filters.date)}`;
  }
}

export function updateStats(tokens, date) {
  const dateTokens = tokens.filter(t => t.date === date);
  const counts = {
    total: dateTokens.length,
    A: dateTokens.filter(t => t.shift === 'A').length,
    B: dateTokens.filter(t => t.shift === 'B').length,
    C: dateTokens.filter(t => t.shift === 'C').length,
    OFF: dateTokens.filter(t => t.shift === 'OFF').length
  };

  const statTotalEl = document.getElementById('statTotal');
  const statShiftAEl = document.getElementById('statShiftA');
  const statShiftBEl = document.getElementById('statShiftB');
  const statShiftCEl = document.getElementById('statShiftC');
  const statShiftOffEl = document.getElementById('statShiftOff');

  if (statTotalEl) statTotalEl.textContent = counts.total;
  if (statShiftAEl) statShiftAEl.textContent = counts.A;
  if (statShiftBEl) statShiftBEl.textContent = counts.B;
  if (statShiftCEl) statShiftCEl.textContent = counts.C;
  if (statShiftOffEl) statShiftOffEl.textContent = counts.OFF;

  return counts;
}

export function bindEvents(handlers) {
  const shiftDateInput = document.getElementById('shiftDate');
  const mineSelectEl = document.getElementById('mineSelect');
  const demoDataBtn = document.getElementById('demoDataBtn');
  const downloadExcelBtn = document.getElementById('downloadExcelBtn');
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const tabBulkBtn = document.getElementById('tabBulkBtn');
  const tabSingleBtn = document.getElementById('tabSingleBtn');
  const addSingleBtn = document.getElementById('addSingleBtn');
  const addBulkBtn = document.getElementById('addBulkBtn');
  const singleTokenInput = document.getElementById('singleTokenInput');
  const searchInput = document.getElementById('searchInput');
  const filterPills = document.getElementById('filterPills');
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  const bulkShiftABtn = document.getElementById('bulkShiftABtn');
  const bulkShiftBBtn = document.getElementById('bulkShiftBBtn');
  const bulkShiftCBtn = document.getElementById('bulkShiftCBtn');
  const bulkShiftOffBtn = document.getElementById('bulkShiftOffBtn');
  const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
  const rosterTbody = document.getElementById('rosterTbody');

  if (shiftDateInput) shiftDateInput.addEventListener('change', (e) => handlers.onDateChange(e.target.value));
  if (mineSelectEl) mineSelectEl.addEventListener('change', (e) => handlers.onMineChange(e.target.value));
  if (demoDataBtn) demoDataBtn.addEventListener('click', handlers.onDemoData);
  if (downloadExcelBtn) downloadExcelBtn.addEventListener('click', handlers.onDownloadExcel);
  if (exportCsvBtn) exportCsvBtn.addEventListener('click', handlers.onExportCsv);
  if (clearAllBtn) clearAllBtn.addEventListener('click', handlers.onClearAll);
  if (logoutBtn) logoutBtn.addEventListener('click', handlers.onLogout);

  if (tabBulkBtn && tabSingleBtn) {
    tabBulkBtn.addEventListener('click', () => {
      tabBulkBtn.classList.add('active'); tabBulkBtn.setAttribute('aria-selected', 'true');
      tabSingleBtn.classList.remove('active'); tabSingleBtn.setAttribute('aria-selected', 'false');
      document.getElementById('bulkAddPanel').classList.add('active');
      document.getElementById('singleAddPanel').classList.remove('active');
    });
    tabSingleBtn.addEventListener('click', () => {
      tabSingleBtn.classList.add('active'); tabSingleBtn.setAttribute('aria-selected', 'true');
      tabBulkBtn.classList.remove('active'); tabBulkBtn.setAttribute('aria-selected', 'false');
      document.getElementById('singleAddPanel').classList.add('active');
      document.getElementById('bulkAddPanel').classList.remove('active');
    });
  }

  if (addSingleBtn) addSingleBtn.addEventListener('click', handlers.onAddSingle);
  if (singleTokenInput) singleTokenInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); handlers.onAddSingle(); } });
  if (addBulkBtn) addBulkBtn.addEventListener('click', handlers.onAddBulk);

  const bulkAddForm = document.getElementById('bulkAddForm');
  if (bulkAddForm) bulkAddForm.addEventListener('submit', (e) => { e.preventDefault(); handlers.onAddBulk(); });

  const singleAddForm = document.getElementById('singleAddForm');
  if (singleAddForm) singleAddForm.addEventListener('submit', (e) => { e.preventDefault(); handlers.onAddSingle(); });

  if (searchInput) {
    const debouncedSearch = helpers.debounce((value) => handlers.onSearch(value), 300);
    searchInput.addEventListener('input', (e) => debouncedSearch(e.target.value.trim()));
  }

  if (filterPills) {
    filterPills.addEventListener('click', (e) => {
      if (e.target.classList.contains('filter-btn')) {
        document.querySelectorAll('.filter-btn').forEach(btn => { btn.classList.remove('active'); btn.setAttribute('aria-pressed', 'false'); });
        e.target.classList.add('active'); e.target.setAttribute('aria-pressed', 'true');
        handlers.onFilterChange(e.target.getAttribute('data-filter'));
      }
    });
  }

  if (selectAllCheckbox) selectAllCheckbox.addEventListener('change', (e) => handlers.onSelectAll(e.target.checked));

  if (rosterTbody) {
    rosterTbody.addEventListener('click', (e) => {
      const target = e.target;
      if (target.classList.contains('row-checkbox')) {
        const id = target.getAttribute('data-id');
        handlers.onSelectToken(id, target.checked);
        return;
      }
      const pill = target.closest('.pill-btn');
      if (pill) {
        const id = pill.getAttribute('data-id');
        const shift = pill.getAttribute('data-shift');
        handlers.onUpdateShift(id, shift);
        return;
      }
      const deleteBtn = target.closest('.delete-row-btn');
      if (deleteBtn) {
        const id = deleteBtn.getAttribute('data-id');
        handlers.onDeleteToken(id);
        return;
      }
    });
  }

  if (bulkShiftABtn) bulkShiftABtn.addEventListener('click', () => handlers.onBulkShift('A'));
  if (bulkShiftBBtn) bulkShiftBBtn.addEventListener('click', () => handlers.onBulkShift('B'));
  if (bulkShiftCBtn) bulkShiftCBtn.addEventListener('click', () => handlers.onBulkShift('C'));
  if (bulkShiftOffBtn) bulkShiftOffBtn.addEventListener('click', () => handlers.onBulkShift('OFF'));
  if (bulkDeleteBtn) bulkDeleteBtn.addEventListener('click', handlers.onBulkDelete);
}

export function updateMineSelector(mineId, isAdmin, mineName) {
  const mineSelectEl = document.getElementById('mineSelect');
  if (mineSelectEl) {
    mineSelectEl.value = mineId;
    mineSelectEl.disabled = !isAdmin;
  }
}

export function setupLoginForm(onLogin, onSetClaims) {
  const form = document.getElementById('loginForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      if (email) localStorage.setItem('lastEmail', email);
      await onLogin(email, password);
    });
  }
  const setClaimsBtn = document.getElementById('setClaimsBtn');
  if (setClaimsBtn && onSetClaims) {
    setClaimsBtn.addEventListener('click', onSetClaims);
  }
}