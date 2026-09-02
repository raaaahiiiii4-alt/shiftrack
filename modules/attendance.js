// ============================================================================
// ShiftTrack - Attendance Module (Daily Roster CRUD)
// ============================================================================

import { getFirestore, collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, writeBatch, doc, serverTimestamp, orderBy, limit, runTransaction } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getUserState } from './auth.js';
import { getWorkerName, validateToken } from './workers.js';
import { showToast, setLoading } from './ui.js';

const db = getFirestore();

function getMineColl(mineId) {
  return collection(db, 'attendance', mineId, 'records');
}

function buildTokenRecord(docSnap, mineId) {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    tokenNo: data.tokenNo,
    date: data.date,
    shift: data.shift,
    markedAt: data.markedAt?.toDate ? data.markedAt.toDate() : new Date(data.markedAt),
    markedBy: data.markedBy,
    workerName: getWorkerName(mineId, data.tokenNo)
  };
}

export async function loadDailyRoster(mineId, date) {
  const q = query(
    getMineColl(mineId),
    where('date', '==', date),
    orderBy('tokenNo')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => buildTokenRecord(d, mineId));
}

export async function addSingle(mineId, date, tokenNo, shift) {
  const userState = getUserState();
  const validation = validateToken(mineId, tokenNo);
  if (!validation.valid) {
    showToast(`Token ${tokenNo} not in worker database`, 'warning');
  }

const newDoc = await runTransaction(db, async (transaction) => {
      const q = query(getMineColl(mineId), where('tokenNo', '==', tokenNo), where('date', '==', date), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        throw new Error(`Token ${tokenNo} already exists for ${date}`);
      }
      const ref = doc(getMineColl(mineId));
      transaction.set(ref, {
        tokenNo,
        date,
        shift,
        mineId,
        markedAt: serverTimestamp(),
        markedBy: userState.user?.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return ref;
    });

  return buildTokenRecord({ id: newDoc.id, data: () => ({ tokenNo, date, shift, markedAt: new Date(), markedBy: userState.user?.uid }) }, mineId);
}

export async function addBulk(mineId, date, tokens, shift) {
  const userState = getUserState();
  const results = { created: 0, skipped: 0, notFound: 0, errors: [] };

  const validTokens = tokens.filter(t => /^\d+$/.test(t));
  if (validTokens.length !== tokens.length) {
    results.errors.push('Some tokens were not numeric and were ignored');
  }

  const batch = writeBatch(db);
  const mineColl = getMineColl(mineId);

  for (const tokenNo of validTokens) {
    const q = query(mineColl, where('tokenNo', '==', tokenNo), where('date', '==', date), limit(1));
    const existing = await getDocs(q);
    if (!existing.empty) {
      results.skipped++;
      continue;
    }
    const validation = validateToken(mineId, tokenNo);
    if (!validation.valid) results.notFound++;

const ref = doc(mineColl);
      batch.set(ref, {
        tokenNo,
        date,
        shift,
        mineId,
        markedAt: serverTimestamp(),
        markedBy: userState.user?.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    results.created++;
  }

  if (results.created > 0) {
    await batch.commit();
  }

  return results;
}

export async function updateShift(mineId, recordId, newShift) {
  const ref = doc(db, 'attendance', mineId, 'records', recordId);
  await updateDoc(ref, {
    shift: newShift,
    markedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function deleteSingle(mineId, recordId) {
  await deleteDoc(doc(db, 'attendance', mineId, 'records', recordId));
}

export async function deleteBulk(mineId, recordIds) {
  if (!recordIds.length) return;
  const batch = writeBatch(db);
  recordIds.forEach(id => {
    batch.delete(doc(db, 'attendance', mineId, 'records', id));
  });
  await batch.commit();
}

export async function clearMineData(mineId) {
  const userState = getUserState();
  if (!userState.isAdmin) {
    throw new Error('Admin only operation');
  }
  const snap = await getDocs(query(getMineColl(mineId)));
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
}