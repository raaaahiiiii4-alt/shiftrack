/* ==========================================================================
   ShiftTrack - Application Logic & State Management (Monthly Matrix)
   Backend API Version - Connected to MongoDB Atlas via Express/Mongoose
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const API_BASE = 'http://127.0.0.1:3000/api';
    
    // --- Application State ---
    let state = {
        tokens: [],
        selectedDate: getTodayDateString(),
        selectedMineId: null,
        selectedMineName: 'Balaria',
        activeFilter: 'ALL',
        searchQuery: '',
        loading: false,
        accessToken: null,
        refreshToken: null,
        user: null,
        mines: []
    };

    // --- DOM Elements ---
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

    // --- Initialization ---
    async function init() {
        shiftDateInput.value = state.selectedDate;
        await checkAuth();
        await loadMines();
        await loadTokens();
        attachEventListeners();
    }

    // --- Date Utility Functions ---
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

    // --- Auth Functions ---
    async function checkAuth() {
        const savedToken = localStorage.getItem('shifttrack_access_token');
        const savedRefresh = localStorage.getItem('shifttrack_refresh_token');
        const savedUser = localStorage.getItem('shifttrack_user');

        if (savedToken && savedUser) {
            state.accessToken = savedToken;
            state.refreshToken = savedRefresh;
            state.user = JSON.parse(savedUser);
            showToast('Welcome back, ' + state.user.name, 'success');
            return true;
        }
        showLoginModal();
        return false;
    }

    async function login(email, password) {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            state.accessToken = data.accessToken;
            state.refreshToken = data.refreshToken;
            state.user = data.user;

            localStorage.setItem('shifttrack_access_token', data.accessToken);
            localStorage.setItem('shifttrack_refresh_token', data.refreshToken);
            localStorage.setItem('shifttrack_user', JSON.stringify(data.user));

            hideLoginModal();
            showToast('Login successful', 'success');
            return true;
        } catch (error) {
            showToast(error.message, 'warning');
            return false;
        } finally {
            setLoading(false);
        }
    }

    async function refreshAccessToken() {
        try {
            const response = await fetch(`${API_BASE}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: state.refreshToken })
            });
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Token refresh failed');
            }

            state.accessToken = data.accessToken;
            state.refreshToken = data.refreshToken;
            localStorage.setItem('shifttrack_access_token', data.accessToken);
            localStorage.setItem('shifttrack_refresh_token', data.refreshToken);
            return true;
        } catch (error) {
            logout();
            return false;
        }
    }

    function logout() {
        state.accessToken = null;
        state.refreshToken = null;
        state.user = null;
        localStorage.removeItem('shifttrack_access_token');
        localStorage.removeItem('shifttrack_refresh_token');
        localStorage.removeItem('shifttrack_user');
        showLoginModal();
    }

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
                        <input type="email" id="loginEmail" required value="farhankhansmg96@gmail.com">
                    </div>
                    <div class="form-group">
                        <label for="loginPassword">Password</label>
                        <input type="password" id="loginPassword" required value="skkIPL@2210">
                    </div>
                    <button type="submit" class="btn btn-primary btn-full">Login</button>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            await login(email, password);
        });
    }

    function hideLoginModal() {
        const modal = document.getElementById('loginModal');
        if (modal) modal.remove();
    }

    // --- API Helper Functions ---
    async function apiRequest(endpoint, options = {}) {
        const makeRequest = async (token) => {
            const response = await fetch(`${API_BASE}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    ...options.headers
                },
                ...options
            });
            return response;
        };

        let response = await makeRequest(state.accessToken);
        
        // Handle token expiration
        if (response.status === 401) {
            const refreshed = await refreshAccessToken();
            if (refreshed) {
                response = await makeRequest(state.accessToken);
            } else {
                throw new Error('Session expired. Please login again.');
            }
        }

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || data.errors?.[0] || `HTTP ${response.status}`);
        }
        
        return data;
    }

    async function loadMines() {
        try {
            const data = await apiRequest('/auth/mines');
            state.mines = data.mines;
            
            // Populate mine select
            mineSelectEl.innerHTML = '';
            state.mines.forEach(mine => {
                const option = document.createElement('option');
                option.value = mine._id;
                option.textContent = mine.displayName || mine.name;
                mineSelectEl.appendChild(option);
            });
            
            // Set default mine
            const balaria = state.mines.find(m => m.name === 'Balaria');
            if (balaria) {
                state.selectedMineId = balaria._id;
                state.selectedMineName = balaria.name;
                mineSelectEl.value = balaria._id;
            }
        } catch (error) {
            console.error('Failed to load mines:', error);
        }
    }

    async function loadTokens() {
        if (!state.selectedMineId) return;
        
        setLoading(true);
        try {
            const params = new URLSearchParams({
                mineId: state.selectedMineId,
                date: state.selectedDate
            });
            if (state.activeFilter !== 'ALL') params.append('shift', state.activeFilter);
            if (state.searchQuery) params.append('tokenNo', state.searchQuery);
            
            const data = await apiRequest(`/attendance?${params.toString()}`);
            
            // Transform backend format to frontend format
            state.tokens = data.records.map((record, index) => ({
                id: record._id,
                tokenNo: record.tokenNo,
                date: record.date,
                shift: record.shift,
                markedAt: record.markedAt || record.timeOfDay || formatTime(new Date(record.createdAt)),
                selected: false,
                workerName: record.workerId?.name || ''
            }));
            
            render();
        } catch (error) {
            showToast('Failed to load tokens: ' + error.message, 'warning');
            state.tokens = [];
            render();
        } finally {
            setLoading(false);
        }
    }

    function setLoading(loading) {
        state.loading = loading;
        document.body.style.cursor = loading ? 'wait' : 'default';
        const buttons = document.querySelectorAll('button:not(.tab-btn):not(.filter-btn)');
        buttons.forEach(btn => btn.disabled = loading);
    }

    // --- Token Operations ---
    async function addSingleToken() {
        const rawToken = singleTokenInput.value.trim().toUpperCase();
        const shift = singleShiftSelect.value;

        if (!rawToken) {
            showToast('Please enter a valid token number', 'warning');
            return;
        }

        try {
            setLoading(true);
            const data = await apiRequest('/attendance', {
                method: 'POST',
                body: JSON.stringify({
                    tokenNo: rawToken,
                    date: state.selectedDate,
                    shift: shift,
                    mineId: state.selectedMineId
                })
            });
            
            const newToken = {
                id: data.record._id,
                tokenNo: data.record.tokenNo,
                date: data.record.date,
                shift: data.record.shift,
                markedAt: data.record.markedAt || formatTime(),
                selected: false,
                workerName: data.record.workerId?.name || ''
            };
            
            state.tokens.unshift(newToken);
            singleTokenInput.value = '';
            render();
            showToast(`Token ${rawToken} added to ${state.selectedDate} with Shift ${shift}`, 'success');
        } catch (error) {
            showToast(error.message, 'warning');
        } finally {
            setLoading(false);
        }
    }

    async function addBulkTokens() {
        const rawText = bulkTokensInput.value.trim();
        const defaultShift = bulkDefaultShift.value;

        if (!rawText) {
            showToast('Please enter token numbers to import', 'warning');
            return;
        }

        const tokensArr = rawText.split(/[\s,\n]+/).map(t => t.trim().toUpperCase()).filter(t => t.length > 0);

        if (tokensArr.length === 0) {
            showToast('No valid tokens found in input', 'warning');
            return;
        }

        try {
            setLoading(true);
            const data = await apiRequest('/attendance/bulk', {
                method: 'POST',
                body: JSON.stringify({
                    tokens: tokensArr,
                    shift: defaultShift,
                    date: state.selectedDate,
                    mineId: state.selectedMineId
                })
            });

            bulkTokensInput.value = '';
            
            // Add new tokens to state
            const newTokens = data.records.map(record => ({
                id: record._id,
                tokenNo: record.tokenNo,
                date: record.date,
                shift: record.shift,
                markedAt: record.markedAt || formatTime(),
                selected: false,
                workerName: record.workerId?.name || ''
            }));
            
            newTokens.forEach(t => state.tokens.unshift(t));
            render();

            if (data.created > 0) {
                showToast(`Successfully added ${data.created} token(s) to ${state.selectedDate} (Shift ${defaultShift})`, 'success');
            }
            if (data.skipped > 0) {
                showToast(`Skipped ${data.skipped} duplicate token(s) for ${state.selectedDate}`, 'warning');
            }
            if (data.notFound > 0) {
                showToast(`${data.notFound} token(s) not found in worker database`, 'warning');
            }
        } catch (error) {
            showToast(error.message, 'warning');
        } finally {
            setLoading(false);
        }
    }

    async function updateShift(id, newShift) {
        try {
            const data = await apiRequest(`/attendance/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ shift: newShift })
            });
            
            const index = state.tokens.findIndex(t => t.id === id);
            if (index !== -1) {
                state.tokens[index] = {
                    ...state.tokens[index],
                    shift: data.record.shift,
                    markedAt: data.record.markedAt || formatTime()
                };
            }
            
            render();
            showToast(`Token ${data.record.tokenNo} updated to Shift ${newShift}`, 'info');
        } catch (error) {
            showToast(error.message, 'warning');
        }
    }

    async function deleteToken(id) {
        const token = state.tokens.find(t => t.id === id);
        if (!token) return;

        if (!confirm(`Delete token ${token.tokenNo}?`)) return;

        try {
            await apiRequest(`/attendance/${id}`, { method: 'DELETE' });
            state.tokens = state.tokens.filter(t => t.id !== id);
            render();
            showToast(`Token ${token.tokenNo} removed`, 'info');
        } catch (error) {
            showToast(error.message, 'warning');
        }
    }

    async function clearAllTokens() {
        if (state.tokens.length === 0) {
            showToast('No records to clear', 'info');
            return;
        }

        if (!confirm('Are you sure you want to clear all token attendance records for this mine?')) return;

        try {
            setLoading(true);
            const ids = state.tokens.map(t => t.id);
            await apiRequest('/attendance/bulk', {
                method: 'DELETE',
                body: JSON.stringify({ ids })
            });
            
            state.tokens = [];
            render();
            showToast('All roster records cleared', 'info');
        } catch (error) {
            showToast(error.message, 'warning');
        } finally {
            setLoading(false);
        }
    }

    // --- Bulk Selection Operations ---
    function toggleSelectAll(checked) {
        const filtered = getFilteredTokens();
        filtered.forEach(t => t.selected = checked);
        render();
    }

    function toggleSelectToken(id, checked) {
        const token = state.tokens.find(t => t.id === id);
        if (token) {
            token.selected = checked;
            render();
        }
    }

    async function applyBulkShift(shift) {
        const selectedTokens = state.tokens.filter(t => t.selected);
        if (selectedTokens.length === 0) return;

        try {
            setLoading(true);
            const ids = selectedTokens.map(t => t.id);
            
            await apiRequest('/attendance/bulk/shift', {
                method: 'PATCH',
                body: JSON.stringify({ ids, shift })
            });
            
            selectedTokens.forEach(t => {
                t.shift = shift;
                t.markedAt = formatTime();
            });
            
            render();
            showToast(`Updated ${selectedTokens.length} token(s) to Shift ${shift}`, 'success');
        } catch (error) {
            showToast(error.message, 'warning');
        } finally {
            setLoading(false);
        }
    }

    async function deleteSelectedTokens() {
        const selectedTokens = state.tokens.filter(t => t.selected);
        if (selectedTokens.length === 0) return;

        if (!confirm(`Are you sure you want to delete ${selectedTokens.length} selected token(s)?`)) return;

        try {
            setLoading(true);
            const ids = selectedTokens.map(t => t.id);
            await apiRequest('/attendance/bulk', {
                method: 'DELETE',
                body: JSON.stringify({ ids })
            });
            
            state.tokens = state.tokens.filter(t => !t.selected);
            render();
            showToast(`Deleted ${selectedTokens.length} token(s)`, 'info');
        } catch (error) {
            showToast(error.message, 'warning');
        } finally {
            setLoading(false);
        }
    }

    // --- Filter & Search logic ---
    function getFilteredTokens() {
        return state.tokens.filter(t => {
            const matchDate = (t.date === state.selectedDate);
            const matchFilter = (state.activeFilter === 'ALL' || t.shift === state.activeFilter);
            const matchSearch = state.searchQuery === '' || t.tokenNo.toLowerCase().includes(state.searchQuery.toLowerCase());
            return matchDate && matchFilter && matchSearch;
        });
    }

    // --- Monthly Matrix Excel (.xlsx) Download Handler ---
    async function downloadExcel() {
        if (state.tokens.length === 0) {
            showToast(`No attendance records available to export`, 'warning');
            return;
        }

        try {
            setLoading(true);
            const [yearStr, monthStr] = state.selectedDate.split('-');
            
            const response = await fetch(`${API_BASE}/attendance/export/excel?mineId=${state.selectedMineId}&month=${yearStr}-${monthStr}`, {
                headers: { 'Authorization': `Bearer ${state.accessToken}` }
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to export');
            }
            
            const blob = await response.blob();
            const monthLabel = getMonthLabel(parseInt(monthStr));
            const fileName = `${state.selectedMineName}_${monthLabel}_Attendance.xlsx`;
            
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            showToast(`Exported monthly matrix to ${fileName}`, 'success');
        } catch (error) {
            console.error('Error generating Monthly Excel file', error);
            showToast('Failed to export Excel file: ' + error.message, 'warning');
        } finally {
            setLoading(false);
        }
    }

    // --- Monthly CSV Export Handler ---
    async function exportCsv() {
        try {
            setLoading(true);
            const [yearStr, monthStr] = state.selectedDate.split('-');
            
            const response = await fetch(`${API_BASE}/attendance/export/csv?mineId=${state.selectedMineId}&month=${yearStr}-${monthStr}`, {
                headers: { 'Authorization': `Bearer ${state.accessToken}` }
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to export CSV');
            }
            
            const csvContent = await response.text();
            const monthLabel = getMonthLabel(parseInt(monthStr));
            const fileName = `${state.selectedMineName}_${monthLabel}_Attendance.csv`;
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showToast(`Exported monthly matrix to ${fileName}`, 'success');
        } catch (error) {
            console.error('Error generating Monthly CSV file', error);
            showToast('Failed to export CSV file: ' + error.message, 'warning');
        } finally {
            setLoading(false);
        }
    }

    // --- Render Dashboard UI ---
    function render() {
        const dateTokens = state.tokens.filter(t => t.date === state.selectedDate);

        // Update Stats Counters
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

        // Filtered Tokens for Table
        const filteredTokens = getFilteredTokens();

        // Update Bulk Action Bar visibility & text
        const selectedTokens = filteredTokens.filter(t => t.selected);
        if (selectedTokens.length > 0) {
            bulkActionsBar.classList.add('active');
            selectedCountText.textContent = `${selectedTokens.length} token(s) selected`;
        } else {
            bulkActionsBar.classList.remove('active');
        }

        // Update Select All Checkbox state
        selectAllCheckbox.checked = (filteredTokens.length > 0 && selectedTokens.length === filteredTokens.length);

        // Update Table Rows
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
                    <td class="th-checkbox">
                        <input type="checkbox" class="row-checkbox" data-id="${t.id}" ${t.selected ? 'checked' : ''} aria-label="Select token ${t.tokenNo}">
                    </td>
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
                    <td class="text-right">
                        <button type="button" class="btn-icon-danger delete-row-btn" data-id="${t.id}" title="Remove Token" aria-label="Remove Token ${t.tokenNo}">
                            <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
                        </button>
                    </td>
                `;

                rosterTbody.appendChild(tr);
            });
        }

        // Update Footer Info
        showingRecordsText.textContent = `Showing ${filteredTokens.length} of ${dateTokens.length} records for ${state.selectedDate}`;
    }

    // --- Toast Notifications ---
    function showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        let icon = 'fa-circle-info';
        if (type === 'success') icon = 'fa-circle-check';
        if (type === 'warning') icon = 'fa-triangle-exclamation';

        toast.innerHTML = `<i class="fa-solid ${icon}"></i><span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // --- Event Listeners ---
    function attachEventListeners() {
        // Date Change
        shiftDateInput.addEventListener('change', async (e) => {
            state.selectedDate = e.target.value;
            await loadTokens();
        });

        // Mine Selector Change
        mineSelectEl.addEventListener('change', async (e) => {
            state.selectedMineId = e.target.value;
            const mine = state.mines.find(m => m._id === state.selectedMineId);
            state.selectedMineName = mine?.name || 'Balaria';
            showToast(`Mine switched to ${state.selectedMineName}`, 'info');
            await loadTokens();
        });

        // Demo Data - Load sample data via API
        demoDataBtn.addEventListener('click', async () => {
            try {
                setLoading(true);
                const [yearStr, monthStr] = state.selectedDate.split('-');
                const d1 = `${yearStr}-${monthStr}-26`;
                const d2 = `${yearStr}-${monthStr}-27`;
                const d3 = `${yearStr}-${monthStr}-28`;
                
                const demoTokens = [
                    { tokenNo: 'TOK-101', date: d1, shift: 'A' },
                    { tokenNo: 'TOK-102', date: d1, shift: 'A' },
                    { tokenNo: 'TOK-103', date: d1, shift: 'B' },
                    { tokenNo: 'TOK-104', date: d1, shift: 'C' },
                    { tokenNo: 'TOK-105', date: d1, shift: 'OFF' },
                    { tokenNo: 'TOK-101', date: d2, shift: 'B' },
                    { tokenNo: 'TOK-102', date: d2, shift: 'A' },
                    { tokenNo: 'TOK-103', date: d2, shift: 'C' },
                    { tokenNo: 'TOK-104', date: d2, shift: 'A' },
                    { tokenNo: 'TOK-105', date: d2, shift: 'OFF' },
                    { tokenNo: 'TOK-101', date: d3, shift: 'A' },
                    { tokenNo: 'TOK-102', date: d3, shift: 'B' },
                    { tokenNo: 'TOK-103', date: d3, shift: 'B' },
                    { tokenNo: 'TOK-104', date: d3, shift: 'C' },
                    { tokenNo: 'TOK-105', date: d3, shift: 'A' },
                    { tokenNo: 'TOK-106', date: d3, shift: 'C' },
                    { tokenNo: 'TOK-107', date: d3, shift: 'OFF' }
                ];
                
                // Group by date and create via bulk API
                const byDate = {};
                demoTokens.forEach(t => {
                    if (!byDate[t.date]) byDate[t.date] = [];
                    byDate[t.date].push(t.tokenNo);
                });
                
                for (const [date, tokens] of Object.entries(byDate)) {
                    await apiRequest('/attendance/bulk', {
                        method: 'POST',
                        body: JSON.stringify({
                            tokens,
                            shift: 'A',
                            date,
                            mineId: state.selectedMineId
                        })
                    });
                }
                
                await loadTokens();
                showToast('Loaded multi-date demo roster data', 'info');
            } catch (error) {
                showToast('Failed to load demo data: ' + error.message, 'warning');
            } finally {
                setLoading(false);
            }
        });

        // Excel & CSV Download
        downloadExcelBtn.addEventListener('click', downloadExcel);
        exportCsvBtn.addEventListener('click', exportCsv);
        clearAllBtn.addEventListener('click', clearAllTokens);

        // Input Tabs
        tabBulkBtn.addEventListener('click', () => {
            tabBulkBtn.classList.add('active');
            tabBulkBtn.setAttribute('aria-selected', 'true');
            tabSingleBtn.classList.remove('active');
            tabSingleBtn.setAttribute('aria-selected', 'false');
            bulkAddPanel.classList.add('active');
            singleAddPanel.classList.remove('active');
        });

        tabSingleBtn.addEventListener('click', () => {
            tabSingleBtn.classList.add('active');
            tabSingleBtn.setAttribute('aria-selected', 'true');
            tabBulkBtn.classList.remove('active');
            tabBulkBtn.setAttribute('aria-selected', 'false');
            singleAddPanel.classList.add('active');
            bulkAddPanel.classList.remove('active');
        });

        // Add Tokens
        addSingleBtn.addEventListener('click', addSingleToken);
        singleTokenInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addSingleToken();
            }
        });

        addBulkBtn.addEventListener('click', addBulkTokens);

        // Form Submit Handlers
        const bulkAddForm = document.getElementById('bulkAddForm');
        if (bulkAddForm) {
            bulkAddForm.addEventListener('submit', (e) => {
                e.preventDefault();
                addBulkTokens();
            });
        }

        const singleAddForm = document.getElementById('singleAddForm');
        if (singleAddForm) {
            singleAddForm.addEventListener('submit', (e) => {
                e.preventDefault();
                addSingleToken();
            });
        }

        // Search Input
        searchInput.addEventListener('input', (e) => {
            state.searchQuery = e.target.value.trim();
            render();
        });

        // Filter Pills
        filterPills.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-btn')) {
                document.querySelectorAll('.filter-btn').forEach(btn => {
                    btn.classList.remove('active');
                    btn.setAttribute('aria-pressed', 'false');
                });
                e.target.classList.add('active');
                e.target.setAttribute('aria-pressed', 'true');
                state.activeFilter = e.target.getAttribute('data-filter');
                render();
            }
        });

        // Select All Checkbox
        selectAllCheckbox.addEventListener('change', (e) => {
            toggleSelectAll(e.target.checked);
        });

        // Table Event Delegation (Checkboxes, Shift Pills, Delete Button)
        rosterTbody.addEventListener('click', (e) => {
            const target = e.target;

            // Checkbox
            if (target.classList.contains('row-checkbox')) {
                const id = target.getAttribute('data-id');
                toggleSelectToken(id, target.checked);
                return;
            }

            // Shift Pill
            const pill = target.closest('.pill-btn');
            if (pill) {
                const id = pill.getAttribute('data-id');
                const shift = pill.getAttribute('data-shift');
                updateShift(id, shift);
                return;
            }

            // Delete Button
            const deleteBtn = target.closest('.delete-row-btn');
            if (deleteBtn) {
                const id = deleteBtn.getAttribute('data-id');
                deleteToken(id);
                return;
            }
        });

        // Bulk Action Bar Buttons
        bulkShiftABtn.addEventListener('click', () => applyBulkShift('A'));
        bulkShiftBBtn.addEventListener('click', () => applyBulkShift('B'));
        bulkShiftCBtn.addEventListener('click', () => applyBulkShift('C'));
        bulkShiftOffBtn.addEventListener('click', () => applyBulkShift('OFF'));
        bulkDeleteBtn.addEventListener('click', deleteSelectedTokens);
    }

    // Launch App
    init();
});