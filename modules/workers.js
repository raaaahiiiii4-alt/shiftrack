// ============================================================================
// ShiftTrack - Workers Module (Worker Master Cache)
// ============================================================================

import { getFirestore, collection, query, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getUserState } from './auth.js';
import { showToast } from './ui.js';

const db = getFirestore();

const workerCache = new Map();

export async function loadWorkers(mineId) {
  if (workerCache.has(mineId)) return;

  try {
    const q = query(collection(db, 'workers', mineId, 'tokens'));
    const snap = await getDocs(q);
    const mineMap = new Map();
    snap.forEach(d => { mineMap.set(d.id, d.data().name); });
    workerCache.set(mineId, mineMap);
  } catch (error) {
    if (error.code === 'permission-denied') {
      showToast(`Permission denied: cannot load workers for ${mineId}`, 'warning');
    } else {
      showToast('Failed to load workers: ' + error.message, 'warning');
    }
    throw error;
  }
}

export function getWorkerName(mineId, tokenNo) {
  const mineMap = workerCache.get(mineId);
  return mineMap?.get(String(tokenNo)) || '';
}

export function validateToken(mineId, tokenNo) {
  const mineMap = workerCache.get(mineId);
  if (!mineMap) return { valid: false, name: '', reason: 'Cache not loaded' };
  const name = mineMap.get(String(tokenNo));
  if (!name) return { valid: false, name: '', reason: 'Token not found in worker master' };
  return { valid: true, name };
}

export function clearCache(mineId) {
  if (mineId) {
    workerCache.delete(mineId);
  } else {
    workerCache.clear();
  }
}

export function getCacheSize() {
  let total = 0;
  workerCache.forEach(map => total += map.size);
  return total;
}