// ============================================================================
// ShiftTrack - Export Module (Monthly Matrix Generation)
// ============================================================================

import { getFirestore, collection, query, where, getDocs, orderBy } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getUserState } from './auth.js';
import { getWorkerName } from './workers.js';
import { dateUtils, helpers } from './utils.js';
import { showToast, setLoading } from './ui.js';

const db = getFirestore();

function getMineColl(mineId) {
  return collection(db, 'attendance', mineId, 'records');
}

export async function generateMonthlyMatrix(mineId, year, month) {
  const daysInMonth = dateUtils.daysInMonth(year, month);
  const { start, end } = dateUtils.range(year, month);

  const q = query(
    getMineColl(mineId),
    where('date', '>=', start),
    where('date', '<=', end),
    orderBy('date'),
    orderBy('tokenNo')
  );
  const snap = await getDocs(q);

  const matrix = {};
  snap.forEach(d => {
    const r = d.data();
    if (!matrix[r.tokenNo]) matrix[r.tokenNo] = {};
    matrix[r.tokenNo][r.date] = r.shift;
  });

  const dayHeaders = Array.from({ length: daysInMonth }, (_, i) => {
    const d = `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
    return `Day ${i + 1} (${new Date(d).toLocaleDateString('en', { weekday: 'short' })})`;
  });

  const headers = [
    'Sl No',
    'Token No',
    'Worker Name',
    ...dayHeaders,
    'Total A',
    'Total B',
    'Total C',
    'Total OFF',
    'Total Worked'
  ];

  const rows = Object.entries(matrix)
    .sort((a, b) => helpers.numericSort(a[0], b[0]))
    .map(([tokenNo, days], idx) => {
      const row = [idx + 1, tokenNo, getWorkerName(mineId, tokenNo)];
      let a = 0, b = 0, c = 0, off = 0, worked = 0;
      for (let i = 1; i <= daysInMonth; i++) {
        const key = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const s = days[key] || '-';
        row.push(s);
        if (s === 'A') a++;
        else if (s === 'B') b++;
        else if (s === 'C') c++;
        else if (s === 'OFF') off++;
        if (s !== 'OFF' && s !== '-') worked++;
      }
      row.push(a, b, c, off, worked);
      return row;
    });

  return {
    headers,
    rows,
    metadata: { mineId, year, month, generatedAt: new Date().toISOString(), recordCount: rows.length }
  };
}

export async function downloadExcel(matrixData, mineName, monthLabel) {
  if (typeof XLSX === 'undefined') {
    throw new Error('SheetJS (XLSX) not loaded');
  }

  if (matrixData.rows.length > 500) {
    showToast('Generating large Excel file...', 'info');
  }

  const ws = XLSX.utils.aoa_to_sheet([matrixData.headers, ...matrixData.rows]);

  const dayCount = matrixData.headers.length - 8;
  ws['!cols'] = [
    { wch: 6 },
    { wch: 12 },
    { wch: 22 },
    ...Array(dayCount).fill({ wch: 10 }),
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${monthLabel} Attendance`);
  XLSX.writeFile(wb, `${mineName}_${monthLabel}_Attendance.xlsx`);
  showToast('Excel downloaded', 'success');
}

export async function downloadCSV(matrixData, mineName, monthLabel) {
  if (matrixData.rows.length > 500) {
    showToast('Generating large CSV file...', 'info');
  }

  const escape = (val) => `"${String(val).replace(/"/g, '""')}"`;
  const csv = [
    matrixData.headers.map(escape).join(','),
    ...matrixData.rows.map(row => row.map(escape).join(','))
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${mineName}_${monthLabel}_Attendance.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('CSV downloaded', 'success');
}