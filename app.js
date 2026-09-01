/* ==========================================================================
   ShiftTrack - Firebase Version (Raw Number Tokens)
   ========================================================================== */

// ---- Firebase Config (REPLACE WITH YOUR VALUES FROM CONSOLE) ----
const firebaseConfig = {
  apiKey: "AIzaSyD7edWThbHQ5IYUox30vNE51MBluakDdK0",
  authDomain: "shifttrack-prod.firebaseapp.com",
  projectId: "shifttrack-prod",
  storageBucket: "shifttrack-prod.firebasestorage.app",
  messagingSenderId: "693024326706",
  appId: "1:693024326706:web:8f62ca93178983bc00682b"
};

// ---- Firebase SDK Imports (ESM from CDN) ----
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, collection, query, where, getDocs, addDoc, updateDoc,
         deleteDoc, writeBatch, doc, serverTimestamp, orderBy, limit }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ---- State ----
let state = {
  tokens: [],
  selectedDate: getTodayDateString(),
  selectedMineId: 'balaria',
  selectedMineName: 'Balaria',
  activeFilter: 'ALL',
  searchQuery: '',
  loading: false,
  user: null,
  userMineId: null,
  isAdmin: false
};

const workerCache = {}; // { mineId: { "2": "Name", "11": "Name" } }

// ---- DOM Elements ----
const shiftDateInput = document.getElementById('shiftDate');
const mineSelectEl = document.getElementById('mineSelect');
const demoDataBtn = document.getElementById('demoDataBtn');
const downloadExcelBtn = document.getElementById('downloadExcelBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');

const statTotalEl = document.getElementById('statTotal');
const statShiftAEl = document.getElementById('statShiftA');
const statShiftBEl = document.getElementById('statShiftB');
const statShiftCEl = document.getElementById('statShiftC');
const statShiftOffEl = document.getElementById('statShiftOff');

const tabBulkBtn = document.getElementById('tabBulkBtn');
const tabSingleBtn = document.getElementById('tabSingleBtn');
const bulkAddPanel = document.getElementById('bulkAddPanel');
const singleAddPanel = document.getElementById('singleAddPanel');

const bulkTokensInput = document.getElementById('bulkTokensInput');
const bulkDefaultShift = document.getElementById('bulkDefaultShift');
const addBulkBtn = document.getElementById('addBulkBtn');

const singleTokenInput = document.getElementById('singleTokenInput');
const singleShiftSelect = document.getElementById('singleShiftSelect');
const addSingleBtn = document.getElementById('addSingleBtn');

const searchInput = document.getElementById('searchInput');
const filterPills = document.getElementById('filterPills');
const bulkActionsBar = document.getElementById('bulkActionsBar');
const selectedCountText = document.getElementById('selectedCountText');
const selectAllCheckbox = document.getElementById('selectAllCheckbox');

const bulkShiftABtn = document.getElementById('bulkShiftABtn');
const bulkShiftBBtn = document.getElementById('bulkShiftBBtn');
const bulkShiftCBtn = document.getElementById('bulkShiftCBtn');
const bulkShiftOffBtn = document.getElementById('bulkShiftOffBtn');
const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');

const rosterTbody = document.getElementById('rosterTbody');
const emptyState = document.getElementById('emptyState');
const showingRecordsText = document.getElementById('showingRecordsText');
const clearAllBtn = document.getElementById('clearAllBtn');

// ---- Date Utilities ----
function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTime(dateObj = new Date()) {
  return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function getMonthLabel(month) {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return monthNames[month - 1];
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ---- Auth ----
async function initAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        state.user = user;
        const tokenResult = await user.getIdTokenResult();
        state.userMineId = tokenResult.claims.mineId || null;
        state.isAdmin = tokenResult.claims.admin === true;

        if (state.userMineId) {
          state.selectedMineId = state.userMineId;
          state.selectedMineName = capitalize(state.userMineId);
          mineSelectEl.value = state.userMineId;
          mineSelectEl.disabled = true;
        }
        hideLoginModal();
        await loadWorkers();
        await loadTokens();
      } else {
        showLoginModal();
      }
      resolve();
    });
  });
}

async function login(email, password) {
  try {
    setLoading(true);
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    showToast(error.message, 'warning');
  } finally {
    setLoading(false);
  }
}

function logout() { signOut(auth); }

function showLoginModal() {
  const modal = document.createElement('div');
  modal.id = 'loginModal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal login-modal">
      <h2><i class="fa-solid fa-lock"></i> ShiftTrack Login</h2>
      <form id="loginForm">
        <div class="form-group">
          <label for="loginEmail">Email</label>
          <input type="email" id="loginEmail" required value="balaria@test.com">
        </div>
        <div class="form-group">
          <label for="loginPassword">Password</label>
          <input type="password" id="loginPassword" required value="skk#01@abc">
        </div>
        <button type="submit" class="btn btn-primary btn-full">Login</button>
      </form>
      ${state.isAdmin ? `
        <hr style="margin:1rem 0;border-color:var(--border);">
        <div class="admin-panel" style="padding:1rem;background:var(--bg-tertiary);border-radius:8px;">
          <h4><i class="fa-solid fa-user-shield"></i> Admin: Set Custom Claims</h4>
          <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:1rem;">Enter UIDs to set mine isolation.</p>
          <div class="form-group"><label>Balaria UID</label><input type="text" id="claimBalaria" class="form-control" placeholder="yD82roieZ1SenZ23Fpk53yI2S9H2"></div>
          <div class="form-group"><label>Mochia UID</label><input type="text" id="claimMochia" class="form-control" placeholder="tpQjQILOWKaG99ObhxGJdViy7Cx2"></div>
          <div class="form-group"><label>Office UID</label><input type="text" id="claimOffice" class="form-control" placeholder="7443xhlAYhaH4SpsNvQMIUkIs5O2"></div>
          <button type="button" id="setClaimsBtn" class="btn btn-emerald btn-full" style="margin-top:0.5rem;"><i class="fa-solid fa-key"></i> Set Claims</button>
        </div>
      ` : ''}
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    await login(email, password);
  });

  const setClaimsBtn = document.getElementById('setClaimsBtn');
  if (setClaimsBtn) {
    setClaimsBtn.addEventListener('click', async () => {
      const balariaUid = document.getElementById('claimBalaria').value.trim();
      const mochiaUid = document.getElementById('claimMochia').value.trim();
      const officeUid = document.getElementById('claimOffice').value.trim();
      if (!balariaUid || !mochiaUid || !officeUid) { showToast('All UIDs required', 'warning'); return; }
      try {
        setLoading(true);
        // Call the callable function
        const { httpsCallable } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js');
        const functions = httpsCallable;
        const setClaims = functions('setCustomClaims');
        await setClaims({ uid: balariaUid, mineId: 'balaria' });
        await setClaims({ uid: mochiaUid, mineId: 'mochia' });
        await setClaims({ uid: officeUid, admin: true });
        showToast('✅ Custom claims set for all users', 'success');
      } catch (e) {
        showToast('Failed: ' + e.message, 'warning');
      } finally { setLoading(false); }
    });
  }
}

function hideLoginModal() {
  const modal = document.getElementById('loginModal');
  if (modal) modal.remove();
}

// ---- Worker Master ----
async function loadWorkers() {
  if (workerCache[state.selectedMineId]) return;
  const q = query(collection(db, 'workers', state.selectedMineId, 'tokens'));
  const snap = await getDocs(q);
  workerCache[state.selectedMineId] = {};
  snap.forEach(d => { workerCache[state.selectedMineId][d.id] = d.data().name; });
}

function getWorkerName(tokenNo) {
  return workerCache[state.selectedMineId]?.[tokenNo] || '';
}

// ---- Daily Roster ----
async function loadTokens() {
  if (!state.selectedMineId) return;
  setLoading(true);
  try {
    const q = query(
      collection(db, 'attendance', state.selectedMineId, 'records'),
      where('date', '==', state.selectedDate),
      orderBy('tokenNo')
    );
    const snap = await getDocs(q);
    state.tokens = snap.docs.map(d => ({
      id: d.id,
      tokenNo: d.data().tokenNo,
      date: d.data().date,
      shift: d.data().shift,
      markedAt: d.data().markedAt?.toDate()
        ? formatTime(d.data().markedAt.toDate())
        : formatTime(d.data().createdAt?.toDate() || new Date()),
      selected: false,
      workerName: getWorkerName(d.data().tokenNo)
    }));
    render();
  } catch (e) {
    showToast('Failed to load roster: ' + e.message, 'warning');
    state.tokens = []; render();
  } finally { setLoading(false); }
}

// ---- Token Operations ----
async function addSingleToken() {
  const raw = singleTokenInput.value.trim();
  const shift = singleShiftSelect.value;
  if (!raw) { showToast('Enter token number', 'warning'); return; }
  if (!/^\d+$/.test(raw)) { showToast('Token must be a number', 'warning'); return; }
  if (!workerCache[state.selectedMineId]?.[raw]) {
    if (!confirm(`Token ${raw} not in worker database. Add anyway?`)) return;
  }

  try {
    setLoading(true);
    const ref = await addDoc(collection(db, 'attendance', state.selectedMineId, 'records'), {
      tokenNo: raw, date: state.selectedDate, shift,
      markedAt: serverTimestamp(), markedBy: state.user.uid,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp()
    });
    state.tokens.unshift({
      id: ref.id, tokenNo: raw, date: state.selectedDate, shift,
      markedAt: formatTime(), selected: false,
      workerName: getWorkerName(raw)
    });
    singleTokenInput.value = '';
    render();
    showToast(`Token ${raw} added (Shift ${shift})`, 'success');
  } catch (e) {
    if (e.code === 'permission-denied') showToast('Not authorized for this mine', 'warning');
    else if (e.code === 'already-exists') showToast(`Token ${raw} already exists for ${state.selectedDate}`, 'warning');
    else showToast(e.message, 'warning');
  } finally { setLoading(false); }
}

async function addBulkTokens() {
  const rawText = bulkTokensInput.value.trim();
  const defaultShift = bulkDefaultShift.value;
  if (!rawText) { showToast('Enter tokens to import', 'warning'); return; }

  const tokensArr = rawText.split(/[\s,\n]+/)
    .map(t => t.trim())
    .filter(t => t.length > 0 && /^\d+$/.test(t));

  if (!tokensArr.length) { showToast('No valid numeric tokens found', 'warning'); return; }

  try {
    setLoading(true);
    const batch = writeBatch(db);
    const mineColl = collection(db, 'attendance', state.selectedMineId, 'records');
    let created = 0, skipped = 0, notFound = 0;

    for (const tokenNo of tokensArr) {
      const q = query(mineColl, where('tokenNo', '==', tokenNo), where('date', '==', state.selectedDate), limit(1));
      const existing = await getDocs(q);
      if (!existing.empty) { skipped++; continue; }
      if (!workerCache[state.selectedMineId]?.[tokenNo]) notFound++;

      batch.set(doc(mineColl), {
        tokenNo, date: state.selectedDate, shift: defaultShift,
        markedAt: serverTimestamp(), markedBy: state.user.uid,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp()
      });
      created++;
    }
    await batch.commit();
    bulkTokensInput.value = '';
    await loadTokens();

    if (created) showToast(`Added ${created} token(s)`, 'success');
    if (skipped) showToast(`Skipped ${skipped} duplicates`, 'warning');
    if (notFound) showToast(`${notFound} tokens not in worker database`, 'warning');
  } catch (e) { showToast(e.message, 'warning'); }
  finally { setLoading(false); }
}

async function updateShift(id, newShift) {
  try {
    await updateDoc(doc(db, 'attendance', state.selectedMineId, 'records', id), {
      shift: newShift, markedAt: serverTimestamp(), updatedAt: serverTimestamp()
    });
    const i = state.tokens.findIndex(t => t.id === id);
    if (i !== -1) { state.tokens[i].shift = newShift; state.tokens[i].markedAt = formatTime(); }
    render();
  } catch (e) { showToast(e.message, 'warning'); }
}

async function deleteToken(id) {
  const t = state.tokens.find(x => x.id === id);
  if (!t || !confirm(`Delete token ${t.tokenNo}?`)) return;
  try { await deleteDoc(doc(db, 'attendance', state.selectedMineId, 'records', id)); state.tokens = state.tokens.filter(x => x.id !== id); render(); }
  catch (e) { showToast(e.message, 'warning'); }
}

async function deleteSelectedTokens() {
  const sel = state.tokens.filter(t => t.selected);
  if (!sel.length || !confirm(`Delete ${sel.length} tokens?`)) return;
  try {
    setLoading(true);
    const batch = writeBatch(db);
    sel.forEach(t => batch.delete(doc(db, 'attendance', state.selectedMineId, 'records', t.id)));
    await batch.commit();
    state.tokens = state.tokens.filter(t => !t.selected);
    render();
  } catch (e) { showToast(e.message, 'warning'); }
  finally { setLoading(false); }
}

async function clearAllTokens() {
  if (!state.isAdmin) { showToast('Admin only', 'warning'); return; }
  if (!confirm('Clear ALL records for this mine?')) return;
  try {
    setLoading(true);
    const snap = await getDocs(query(collection(db, 'attendance', state.selectedMineId, 'records')));
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    state.tokens = []; render();
  } catch (e) { showToast(e.message, 'warning'); }
  finally { setLoading(false); }
}

// ---- Selection ----
function toggleSelectAll(checked) {
  const filtered = getFilteredTokens();
  filtered.forEach(t => t.selected = checked);
  render();
}

function toggleSelectToken(id, checked) {
  const token = state.tokens.find(t => t.id === id);
  if (token) { token.selected = checked; render(); }
}

async function applyBulkShift(shift) {
  const selectedTokens = state.tokens.filter(t => t.selected);
  if (!selectedTokens.length) return;
  try {
    setLoading(true);
    const batch = writeBatch(db);
    selectedTokens.forEach(t => {
      const ref = doc(db, 'attendance', state.selectedMineId, 'records', t.id);
      batch.update(ref, { shift, markedAt: serverTimestamp(), updatedAt: serverTimestamp() });
    });
    await batch.commit();
    selectedTokens.forEach(t => { t.shift = shift; t.markedAt = formatTime(); });
    render();
    showToast(`Updated ${selectedTokens.length} token(s) to Shift ${shift}`, 'success');
  } catch (e) { showToast(e.message, 'warning'); }
  finally { setLoading(false); }
}

// ---- Filters ----
function getFilteredTokens() {
  return state.tokens.filter(t => {
    const matchDate = (t.date === state.selectedDate);
    const matchFilter = (state.activeFilter === 'ALL' || t.shift === state.activeFilter);
    const matchSearch = state.searchQuery === '' || t.tokenNo.toLowerCase().includes(state.searchQuery.toLowerCase());
    return matchDate && matchFilter && matchSearch;
  });
}

// ---- Monthly Excel Export ----
async function downloadExcel() {
  const [y, m] = state.selectedDate.split('-');
  const year = +y, month = +m;
  const daysInMonth = getDaysInMonth(year, month);

  try {
    setLoading(true);
    showToast('Fetching monthly data...', 'info');

    const start = `${y}-${m}-01`;
    const end = `${y}-${m}-${daysInMonth}`;
    const q = query(
      collection(db, 'attendance', state.selectedMineId, 'records'),
      where('date', '>=', start), where('date', '<=', end),
      orderBy('date'), orderBy('tokenNo')
    );
    const snap = await getDocs(q);

    const matrix = {};
    snap.forEach(d => {
      const r = d.data();
      if (!matrix[r.tokenNo]) matrix[r.tokenNo] = {};
      matrix[r.tokenNo][r.date] = r.shift;
    });

    const monthLabel = getMonthLabel(month);
    const dayHeaders = Array.from({length: daysInMonth}, (_, i) => {
      const d = `${y}-${m}-${String(i+1).padStart(2,'0')}`;
      return `Day ${i+1} (${new Date(d).toLocaleDateString('en', {weekday:'short'})})`;
    });

    const headers = ['Sl No', 'Token No', 'Worker Name', ...dayHeaders, 'Total A', 'Total B', 'Total C', 'Total OFF', 'Total Worked'];

    const rows = Object.entries(matrix).sort((a,b) => a[0].localeCompare(b[0], undefined, {numeric:true}))
      .map(([tokenNo, days], idx) => {
        const row = [idx+1, tokenNo, getWorkerName(tokenNo)];
        let a=0,b=0,c=0,off=0,worked=0;
        for(let i=1;i<=daysInMonth;i++) {
          const key = `${y}-${m}-${String(i).padStart(2,'0')}`;
          const s = days[key] || '-';
          row.push(s);
          if(s==='A') a++; else if(s==='B') b++; else if(s==='C') c++; else if(s==='OFF') off++;
          if(s!=='OFF' && s!=='-') worked++;
        }
        row.push(a,b,c,off,worked);
        return row;
      });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = [{wch:6},{wch:12},{wch:22}, ...Array(daysInMonth).fill({wch:10}), {wch:10},{wch:10},{wch:10},{wch:10},{wch:12}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${monthLabel} Attendance`);
    XLSX.writeFile(wb, `${state.selectedMineName}_${monthLabel}_Attendance.xlsx`);
    showToast('Excel downloaded', 'success');
  } catch (e) { showToast('Export failed: ' + e.message, 'warning'); }
  finally { setLoading(false); }
}

async function exportCsv() {
  const [y, m] = state.selectedDate.split('-');
  const year = +y, month = +m;
  const daysInMonth = getDaysInMonth(year, month);

  try {
    setLoading(true);
    const start = `${y}-${m}-01`;
    const end = `${y}-${m}-${daysInMonth}`;
    const q = query(
      collection(db, 'attendance', state.selectedMineId, 'records'),
      where('date', '>=', start), where('date', '<=', end),
      orderBy('date'), orderBy('tokenNo')
    );
    const snap = await getDocs(q);

    const matrix = {};
    snap.forEach(d => {
      const r = d.data();
      if (!matrix[r.tokenNo]) matrix[r.tokenNo] = {};
      matrix[r.tokenNo][r.date] = r.shift;
    });

    const monthLabel = getMonthLabel(month);
    const dayHeaders = Array.from({length: daysInMonth}, (_, i) => {
      const d = `${y}-${m}-${String(i+1).padStart(2,'0')}`;
      return `Day ${i+1} (${new Date(d).toLocaleDateString('en', {weekday:'short'})})`;
    });

    const headers = ['Sl No', 'Token No', 'Worker Name', ...dayHeaders, 'Total A', 'Total B', 'Total C', 'Total OFF', 'Total Worked'];

    const rows = Object.entries(matrix).sort((a,b) => a[0].localeCompare(b[0], undefined, {numeric:true}))
      .map(([tokenNo, days], idx) => {
        const row = [idx+1, tokenNo, getWorkerName(tokenNo)];
        let a=0,b=0,c=0,off=0,worked=0;
        for(let i=1;i<=daysInMonth;i++) {
          const key = `${y}-${m}-${String(i).padStart(2,'0')}`;
          const s = days[key] || '-';
          row.push(s);
          if(s==='A') a++; else if(s==='B') b++; else if(s==='C') c++; else if(s==='OFF') off++;
          if(s!=='OFF' && s!=='-') worked++;
        }
        row.push(a,b,c,off,worked);
        return row;
      });

    const csv = [headers.join(',')].concat(rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(','))).join('\n');
    const blob = new Blob(['\uFEFF' + csv], {type: 'text/csv;charset=utf-8;'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `${state.selectedMineName}_${monthLabel}_Attendance.csv`; a.click();
    showToast('CSV downloaded', 'success');
  } catch (e) { showToast('Export failed: ' + e.message, 'warning'); }
  finally { setLoading(false); }
}

// ---- Render ----
function render() {
  const dateTokens = state.tokens.filter(t => t.date === state.selectedDate);

  const total = dateTokens.length;
  const countA = dateTokens.filter(t => t.shift === 'A').length;
  const countB = dateTokens.filter(t => t.shift === 'B').length;
  const countC = dateTokens.filter(t => t.shift === 'C').length;
  const countOff = dateTokens.filter(t => t.shift === 'OFF').length;

  statTotalEl.textContent = total;
  statShiftAEl.textContent = countA;
  statShiftBEl.textContent = countB;
  statShiftCEl.textContent = countC;
  statShiftOffEl.textContent = countOff;

  const filteredTokens = getFilteredTokens();
  const selectedTokens = filteredTokens.filter(t => t.selected);

  if (selectedTokens.length > 0) {
    bulkActionsBar.classList.add('active');
    selectedCountText.textContent = `${selectedTokens.length} token(s) selected`;
  } else {
    bulkActionsBar.classList.remove('active');
  }

  selectAllCheckbox.checked = (filteredTokens.length > 0 && selectedTokens.length === filteredTokens.length);

  rosterTbody.innerHTML = '';
  if (filteredTokens.length === 0) {
    emptyState.classList.add('active');
  } else {
    emptyState.classList.remove('active');
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
        <td>${t.date}</td>
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

  showingRecordsText.textContent = `Showing ${filteredTokens.length} of ${dateTokens.length} records for ${state.selectedDate}`;
}

// ---- Toast ----
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  let icon = 'fa-circle-info';
  if (type === 'success') icon = 'fa-circle-check';
  if (type === 'warning') icon = 'fa-triangle-exclamation';
  toast.innerHTML = `<i class="fa-solid ${icon}"></i><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateY(10px)'; setTimeout(() => toast.remove(), 300); }, 3000);
}

function setLoading(loading) {
  state.loading = loading;
  document.body.style.cursor = loading ? 'wait' : 'default';
  const buttons = document.querySelectorAll('button:not(.tab-btn):not(.filter-btn)');
  buttons.forEach(btn => btn.disabled = loading);
}

// ---- Event Listeners ----
function attachEventListeners() {
  shiftDateInput.addEventListener('change', async (e) => { state.selectedDate = e.target.value; await loadTokens(); });

  mineSelectEl.addEventListener('change', async (e) => {
    state.selectedMineId = e.target.value;
    const mine = state.mines?.find(m => m._id === state.selectedMineId) || { name: capitalize(state.selectedMineId) };
    state.selectedMineName = mine.name || capitalize(state.selectedMineId);
    showToast(`Mine switched to ${state.selectedMineName}`, 'info');
    await loadWorkers();
    await loadTokens();
  });

  demoDataBtn.addEventListener('click', async () => {
    try {
      setLoading(true);
      const [yearStr, monthStr] = state.selectedDate.split('-');
      const d1 = `${yearStr}-${monthStr}-26`;
      const d2 = `${yearStr}-${monthStr}-27`;
      const d3 = `${yearStr}-${monthStr}-28`;
      const demoTokens = [
        { tokenNo: '2', date: d1, shift: 'A' }, { tokenNo: '4', date: d1, shift: 'A' },
        { tokenNo: '5', date: d1, shift: 'B' }, { tokenNo: '7', date: d1, shift: 'C' },
        { tokenNo: '9', date: d1, shift: 'OFF' }, { tokenNo: '2', date: d2, shift: 'B' },
        { tokenNo: '4', date: d2, shift: 'A' }, { tokenNo: '5', date: d2, shift: 'C' },
        { tokenNo: '7', date: d2, shift: 'A' }, { tokenNo: '9', date: d2, shift: 'OFF' },
        { tokenNo: '2', date: d3, shift: 'A' }, { tokenNo: '4', date: d3, shift: 'B' },
        { tokenNo: '5', date: d3, shift: 'B' }, { tokenNo: '7', date: d3, shift: 'C' },
        { tokenNo: '9', date: d3, shift: 'A' }, { tokenNo: '11', date: d3, shift: 'C' },
        { tokenNo: '12', date: d3, shift: 'OFF' }
      ];
      const byDate = {};
      demoTokens.forEach(t => { if (!byDate[t.date]) byDate[t.date] = []; byDate[t.date].push(t.tokenNo); });
      for (const [date, tokens] of Object.entries(byDate)) {
        await addDoc(collection(db, 'attendance', state.selectedMineId, 'records'), {
          tokens, shift: 'A', date, mineId: state.selectedMineId,
          markedAt: serverTimestamp(), markedBy: state.user.uid,
          createdAt: serverTimestamp(), updatedAt: serverTimestamp()
        });
      }
      await loadTokens();
      showToast('Loaded multi-date demo roster data', 'info');
    } catch (error) { showToast('Failed to load demo data: ' + error.message, 'warning'); }
    finally { setLoading(false); }
  });

  downloadExcelBtn.addEventListener('click', downloadExcel);
  exportCsvBtn.addEventListener('click', exportCsv);
  clearAllBtn.addEventListener('click', clearAllTokens);

  tabBulkBtn.addEventListener('click', () => { tabBulkBtn.classList.add('active'); tabBulkBtn.setAttribute('aria-selected', 'true'); tabSingleBtn.classList.remove('active'); tabSingleBtn.setAttribute('aria-selected', 'false'); bulkAddPanel.classList.add('active'); singleAddPanel.classList.remove('active'); });
  tabSingleBtn.addEventListener('click', () => { tabSingleBtn.classList.add('active'); tabSingleBtn.setAttribute('aria-selected', 'true'); tabBulkBtn.classList.remove('active'); tabBulkBtn.setAttribute('aria-selected', 'false'); singleAddPanel.classList.add('active'); bulkAddPanel.classList.remove('active'); });

  addSingleBtn.addEventListener('click', addSingleToken);
  singleTokenInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); addSingleToken(); } });

  addBulkBtn.addEventListener('click', addBulkTokens);

  const bulkAddForm = document.getElementById('bulkAddForm');
  if (bulkAddForm) { bulkAddForm.addEventListener('submit', (e) => { e.preventDefault(); addBulkTokens(); }); }

  const singleAddForm = document.getElementById('singleAddForm');
  if (singleAddForm) { singleAddForm.addEventListener('submit', (e) => { e.preventDefault(); addSingleToken(); }); }

  searchInput.addEventListener('input', (e) => { state.searchQuery = e.target.value.trim(); render(); });

  filterPills.addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-btn')) {
      document.querySelectorAll('.filter-btn').forEach(btn => { btn.classList.remove('active'); btn.setAttribute('aria-pressed', 'false'); });
      e.target.classList.add('active'); e.target.setAttribute('aria-pressed', 'true');
      state.activeFilter = e.target.getAttribute('data-filter');
      render();
    }
  });

  selectAllCheckbox.addEventListener('change', (e) => { toggleSelectAll(e.target.checked); });

  rosterTbody.addEventListener('click', (e) => {
    const target = e.target;
    if (target.classList.contains('row-checkbox')) { const id = target.getAttribute('data-id'); toggleSelectToken(id, target.checked); return; }
    const pill = target.closest('.pill-btn');
    if (pill) { const id = pill.getAttribute('data-id'); const shift = pill.getAttribute('data-shift'); updateShift(id, shift); return; }
    const deleteBtn = target.closest('.delete-row-btn');
    if (deleteBtn) { const id = deleteBtn.getAttribute('data-id'); deleteToken(id); return; }
  });

  bulkShiftABtn.addEventListener('click', () => applyBulkShift('A'));
  bulkShiftBBtn.addEventListener('click', () => applyBulkShift('B'));
  bulkShiftCBtn.addEventListener('click', () => applyBulkShift('C'));
  bulkShiftOffBtn.addEventListener('click', () => applyBulkShift('OFF'));
  bulkDeleteBtn.addEventListener('click', deleteSelectedTokens);
}

// ---- Init ----
async function init() {
  shiftDateInput.value = state.selectedDate;
  await initAuth();
  attachEventListeners();
}

init();