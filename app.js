// ============================================================================
// ShiftTrack - Main Entry Point (Modular Architecture)
// ============================================================================

import { initAuth, login, logout, getUserState, onAuthChange, setupLoginForm } from './modules/auth.js';
import { loadWorkers, getWorkerName, clearCache } from './modules/workers.js';
import { loadDailyRoster, addSingle, addBulk, updateShift, deleteSingle, deleteBulk, clearMineData, clearDateData } from './modules/attendance.js';
import { generateMonthlyMatrix, downloadExcel, downloadCSV } from './modules/export.js';
import { renderRoster, updateStats, showToast, setLoading, bindEvents, updateMineSelector, updateDateSelector, hideModal } from './modules/ui.js';
import { dateUtils, helpers, validators } from './modules/utils.js';

let state = {
  tokens: [],
  selectedDate: dateUtils.today(),
  selectedMineId: 'balaria',
  selectedMineName: 'Balaria',
  activeFilter: 'ALL',
  searchQuery: '',
  loading: false
};

async function initApp() {
  const shiftDateInput = document.getElementById('shiftDate');
  if (shiftDateInput) shiftDateInput.value = state.selectedDate;

  await initAuth();
  onAuthChange(handleAuthChange);

  setupLoginForm(handleLogin, handleSetClaims);
  bindEvents(createEventHandlers());

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', () => logout());
}

function handleAuthChange(userState) {
  if (userState.isAuthenticated) {
    state.selectedMineId = userState.mineId || 'balaria';
    state.selectedMineName = helpers.capitalize(state.selectedMineId);
    updateMineSelector(state.selectedMineId, userState.isAdmin, state.selectedMineName);
    updateDateSelector(userState.isAdmin);
    initializeMine();
  }
}

async function initializeMine() {
  try {
    setLoading(true);
    await loadWorkers(state.selectedMineId);
    await loadRoster();
  } catch (error) {
    showToast('Failed to initialize: ' + error.message, 'warning');
  } finally {
    setLoading(false);
  }
}

async function loadRoster() {
  if (!state.selectedMineId) return;
  setLoading(true);
  try {
    const freshTokens = await loadDailyRoster(state.selectedMineId, state.selectedDate);
    state.tokens = freshTokens;
    render();
  } catch (error) {
    showToast('Failed to load roster: ' + error.message, 'warning');
    // DON'T clear state on error - keep optimistic updates visible
  } finally {
    setLoading(false);
  }
}

function handleLogin(email, password) {
  return login(email, password);
}

async function handleSetClaims() {
  const balariaUid = document.getElementById('claimBalaria').value.trim();
  const mochiaUid = document.getElementById('claimMochia').value.trim();
  const officeUid = document.getElementById('claimOffice').value.trim();
  if (!balariaUid || !mochiaUid || !officeUid) {
    showToast('All UIDs required', 'warning');
    return;
  }
  try {
    setLoading(true);
    const { httpsCallable } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js');
    const { functions } = await import('./modules/auth.js');
    const setClaims = httpsCallable(functions, 'setCustomClaims');
    await setClaims({ uid: balariaUid, mineId: 'balaria' });
    await setClaims({ uid: mochiaUid, mineId: 'mochia' });
    await setClaims({ uid: officeUid, admin: true });
    showToast('✅ Custom claims set for all users', 'success');
  } catch (e) {
    showToast('Failed: ' + e.message, 'warning');
  } finally {
    setLoading(false);
  }
}

function createEventHandlers() {
  return {
    onDateChange: async (date) => {
      state.selectedDate = date;
      await loadRoster();
    },
    onMineChange: async (mineId) => {
      state.selectedMineId = mineId;
      state.selectedMineName = helpers.capitalize(mineId);
      clearCache(mineId);
      showToast(`Mine switched to ${state.selectedMineName}`, 'info');
      await initializeMine();
    },
    onDemoData: async () => {
      try {
        setLoading(true);
        const [yearStr, monthStr] = state.selectedDate.split('-');
        const demoDates = [26, 27, 28].map(d => `${yearStr}-${monthStr}-${String(d).padStart(2, '0')}`);
        const demoTokens = [
          { tokenNo: '2', shift: 'A' }, { tokenNo: '4', shift: 'A' },
          { tokenNo: '5', shift: 'B' }, { tokenNo: '7', shift: 'C' },
          { tokenNo: '9', shift: 'OFF' }, { tokenNo: '2', shift: 'B' },
          { tokenNo: '4', shift: 'A' }, { tokenNo: '5', shift: 'C' },
          { tokenNo: '7', shift: 'A' }, { tokenNo: '9', shift: 'OFF' },
          { tokenNo: '2', shift: 'A' }, { tokenNo: '4', shift: 'B' },
          { tokenNo: '5', shift: 'B' }, { tokenNo: '7', shift: 'C' },
          { tokenNo: '9', shift: 'A' }, { tokenNo: '11', shift: 'C' },
          { tokenNo: '12', shift: 'OFF' }
        ];

        const { writeBatch, doc, collection, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
        const { getFirestore } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
        const db = getFirestore();
        const userState = getUserState();

        const batch = writeBatch(db);
        const mineColl = collection(db, 'attendance', state.selectedMineId, 'records');

        demoTokens.forEach((t, i) => {
          const ref = doc(mineColl);
          batch.set(ref, {
            tokenNo: t.tokenNo,
            date: demoDates[Math.floor(i / 5)],
            shift: t.shift,
            markedAt: serverTimestamp(),
            markedBy: userState.user?.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        });
        await batch.commit();
        await loadRoster();
        showToast('Loaded multi-date demo roster data', 'info');
      } catch (error) {
        showToast('Failed to load demo data: ' + error.message, 'warning');
      } finally {
        setLoading(false);
      }
    },
    onDownloadExcel: async () => {
      const [y, m] = state.selectedDate.split('-');
      try {
        setLoading(true);
        const matrix = await generateMonthlyMatrix(state.selectedMineId, +y, +m);
        await downloadExcel(matrix, state.selectedMineName, dateUtils.monthLabel(+m));
      } catch (error) {
        showToast('Export failed: ' + error.message, 'warning');
      } finally {
        setLoading(false);
      }
    },
    onExportCsv: async () => {
      const [y, m] = state.selectedDate.split('-');
      try {
        setLoading(true);
        const matrix = await generateMonthlyMatrix(state.selectedMineId, +y, +m);
        await downloadCSV(matrix, state.selectedMineName, dateUtils.monthLabel(+m));
      } catch (error) {
        showToast('Export failed: ' + error.message, 'warning');
      } finally {
        setLoading(false);
      }
    },
    onClearAll: async () => {
      const userState = getUserState();
      if (!userState.isAdmin) { showToast('Admin only', 'warning'); return; }
      if (!confirm(`Clear ALL records for ${state.selectedDate}?`)) return;
      try {
        setLoading(true);
        await clearDateData(state.selectedMineId, state.selectedDate);
        await loadRoster();
        showToast(`Records for ${state.selectedDate} cleared`, 'success');
      } catch (error) {
        showToast(error.message, 'warning');
      } finally {
        setLoading(false);
      }
    },
    onLogout: () => logout(),
    onAddSingle: async () => {
      const tokenInput = document.getElementById('singleTokenInput');
      const shiftSelect = document.getElementById('singleShiftSelect');
      const raw = tokenInput.value.trim();
      const shift = shiftSelect.value;
      if (!raw) { showToast('Enter token number', 'warning'); return; }
      if (!validators.tokenNo(raw)) { showToast('Token must be a number', 'warning'); return; }
      if (!validators.shift(shift)) { showToast('Invalid shift', 'warning'); return; }

      try {
        setLoading(true);
        const record = await addSingle(state.selectedMineId, state.selectedDate, raw, shift);
        // Optimistic update with worker name
        const workerName = getWorkerName(state.selectedMineId, raw) || '';
        state.tokens.unshift({ ...record, selected: false, workerName });
        tokenInput.value = '';
        render();
        showToast(`Token ${raw} added (Shift ${shift})`, 'success');
      } catch (error) {
        if (error.message.includes('already exists')) showToast(`Token ${raw} already exists for ${state.selectedDate}`, 'warning');
        else if (error.message.includes('permission')) showToast('Not authorized for this mine', 'warning');
        else showToast(error.message, 'warning');
      } finally {
        setLoading(false);
      }
    },
    onAddBulk: async () => {
      const rawText = document.getElementById('bulkTokensInput').value.trim();
      const defaultShift = document.getElementById('bulkDefaultShift').value;
      if (!rawText) { showToast('Enter tokens to import', 'warning'); return; }

      const tokensArr = rawText.split(/[\s,\n]+/).map(t => t.trim()).filter(t => t.length > 0 && validators.tokenNo(t));
      if (!tokensArr.length) { showToast('No valid numeric tokens found', 'warning'); return; }

      try {
        setLoading(true);
        const results = await addBulk(state.selectedMineId, state.selectedDate, tokensArr, defaultShift);
        document.getElementById('bulkTokensInput').value = '';
        
        // Optimistic update - add new tokens to existing state
        if (results.created > 0) {
          const newTokens = tokensArr.slice(0, results.created).map((tokenNo, idx) => ({
            id: `temp-${Date.now()}-${idx}`,
            tokenNo,
            date: state.selectedDate,
            shift: defaultShift,
            markedAt: new Date(),
            markedBy: getUserState().user?.uid,
            workerName: getWorkerName(state.selectedMineId, tokenNo) || '',
            selected: false
          }));
          state.tokens = [...newTokens, ...state.tokens];
          render();
        }
        
        // Refresh from server after 1 second (won't clear on error)
        setTimeout(() => loadRoster(), 1000);
        
        if (results.created) showToast(`Added ${results.created} token(s)`, 'success');
        if (results.skipped) showToast(`Skipped ${results.skipped} duplicates`, 'warning');
        if (results.notFound) showToast(`${results.notFound} tokens not in worker database`, 'warning');
        if (results.errors.length) results.errors.forEach(e => showToast(e, 'warning'));
      } catch (error) {
        showToast(error.message, 'warning');
      } finally {
        setLoading(false);
      }
    },
    onSearch: (query) => {
      state.searchQuery = query;
      render();
    },
    onFilterChange: (filter) => {
      state.activeFilter = filter;
      render();
    },
    onSelectAll: (checked) => {
      const filtered = getFilteredTokens();
      filtered.forEach(t => t.selected = checked);
      render();
    },
    onSelectToken: (id, checked) => {
      const token = state.tokens.find(t => t.id === id);
      if (token) { token.selected = checked; render(); }
    },
    onUpdateShift: async (id, shift) => {
      try {
        await updateShift(state.selectedMineId, id, shift);
        const idx = state.tokens.findIndex(t => t.id === id);
        if (idx !== -1) { state.tokens[idx].shift = shift; state.tokens[idx].markedAt = new Date(); }
        render();
        showToast(`Shift updated to ${shift}`, 'success');
      } catch (error) {
        showToast(error.message, 'warning');
        render();
      }
    },
    onDeleteToken: async (id) => {
      const token = state.tokens.find(t => t.id === id);
      if (!token || !confirm(`Delete token ${token.tokenNo}?`)) return;
      try {
        await deleteSingle(state.selectedMineId, id);
        state.tokens = state.tokens.filter(t => t.id !== id);
        render();
        showToast('Token deleted', 'success');
      } catch (error) {
        showToast(error.message, 'warning');
      }
    },
    onBulkShift: async (shift) => {
      const selectedTokens = state.tokens.filter(t => t.selected);
      if (!selectedTokens.length) return;
      try {
        setLoading(true);
        const ids = selectedTokens.map(t => t.id);
        const { writeBatch, doc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
        const { getFirestore } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
        const db = getFirestore();
        const batch = writeBatch(db);
        ids.forEach(id => {
          batch.update(doc(db, 'attendance', state.selectedMineId, 'records', id), {
            shift, markedAt: serverTimestamp(), updatedAt: serverTimestamp()
          });
        });
        await batch.commit();
        selectedTokens.forEach(t => { t.shift = shift; t.markedAt = new Date(); });
        render();
        showToast(`Updated ${selectedTokens.length} token(s) to Shift ${shift}`, 'success');
      } catch (error) {
        showToast(error.message, 'warning');
      } finally {
        setLoading(false);
      }
    },
    onBulkDelete: async () => {
      const selectedTokens = state.tokens.filter(t => t.selected);
      if (!selectedTokens.length) return;
      if (!confirm(`Delete ${selectedTokens.length} tokens?`)) return;
      try {
        setLoading(true);
        await deleteBulk(state.selectedMineId, selectedTokens.map(t => t.id));
        state.tokens = state.tokens.filter(t => !t.selected);
        render();
        showToast(`${selectedTokens.length} tokens deleted`, 'success');
      } catch (error) {
        showToast(error.message, 'warning');
      } finally {
        setLoading(false);
      }
    }
  };
}

function getFilteredTokens() {
  return state.tokens.filter(t => {
    const matchDate = (t.date === state.selectedDate);
    const matchFilter = (state.activeFilter === 'ALL' || t.shift === state.activeFilter);
    const matchSearch = state.searchQuery === '' || t.tokenNo.toLowerCase().includes(state.searchQuery.toLowerCase()) || (t.workerName || '').toLowerCase().includes(state.searchQuery.toLowerCase());
    return matchDate && matchFilter && matchSearch;
  });
}

function render() {
  const counts = updateStats(state.tokens, state.selectedDate);
  renderRoster(state.tokens, {
    date: state.selectedDate,
    shift: state.activeFilter,
    search: state.searchQuery
  }, {});
}

initApp();