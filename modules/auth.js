// ============================================================================
// ShiftTrack - Auth Module
// ============================================================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js';
import { showToast, showModal, hideModal, setLoading } from './ui.js';

const firebaseConfig = {
  apiKey: "AIzaSyD7edWThbHQ5IYUox30vNE51MBluakDdK0",
  authDomain: "shifttrack-prod.firebaseapp.com",
  projectId: "shifttrack-prod",
  storageBucket: "shifttrack-prod.appspot.com",
  messagingSenderId: "693024326706",
  appId: "1:693024326706:web:8f62ca93178983bc00682b"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const functions = getFunctions(app);

let userState = {
  user: null,
  mineId: null,
  isAdmin: false,
  isAuthenticated: false
};

let authChangeCallback = null;

export function getUserState() {
  return { ...userState };
}

export function onAuthChange(callback) {
  authChangeCallback = callback;
}

function notifyAuthChange() {
  if (authChangeCallback) authChangeCallback(userState);
}

export async function initAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        userState.user = user;
        const tokenResult = await user.getIdTokenResult();
        userState.mineId = tokenResult.claims.mineId || null;
        userState.isAdmin = tokenResult.claims.admin === true;
        userState.isAuthenticated = true;

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.style.display = 'inline-flex';

        hideModal('loginModal');
        notifyAuthChange();
      } else {
        userState = { user: null, mineId: null, isAdmin: false, isAuthenticated: false };
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.style.display = 'none';
        showLoginModal();
      }
      resolve();
    });
  });
}

export async function login(email, password) {
  try {
    setLoading(true);
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    showToast(error.message, 'warning');
    throw error;
  } finally {
    setLoading(false);
  }
}

export function logout() {
  signOut(auth);
}

function showLoginModal() {
  const lastEmail = localStorage.getItem('lastEmail') || '';
  const content = `
    <div class="modal login-modal">
      <h2><i class="fa-solid fa-lock"></i> ShiftTrack Login</h2>
      <form id="loginForm">
        <div class="form-group">
          <label for="loginEmail">Email</label>
          <input type="email" id="loginEmail" required value="${lastEmail}" class="form-control" autocomplete="email" placeholder="Enter your email">
        </div>
        <div class="form-group">
          <label for="loginPassword">Password</label>
          <input type="password" id="loginPassword" required class="form-control" autocomplete="current-password" placeholder="Enter your password">
        </div>
        <button type="submit" class="btn btn-primary btn-full">Login</button>
      </form>
      ${userState.isAdmin ? renderAdminPanel() : ''}
    </div>
  `;
  showModal(content, 'loginModal', () => {
    document.getElementById('loginEmail').focus();
  });
}

function renderAdminPanel() {
  return `
    <hr style="margin:1rem 0;border-color:var(--border);">
    <div class="admin-panel" style="padding:1rem;background:var(--bg-tertiary);border-radius:8px;">
      <h4><i class="fa-solid fa-user-shield"></i> Admin: Set Custom Claims</h4>
      <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:1rem;">Enter UIDs to set mine isolation.</p>
      <div class="form-group"><label>Balaria UID</label><input type="text" id="claimBalaria" class="form-control" placeholder="Enter UID for Balaria operator"></div>
      <div class="form-group"><label>Mochia UID</label><input type="text" id="claimMochia" class="form-control" placeholder="Enter UID for Mochia operator"></div>
      <div class="form-group"><label>Office Admin UID</label><input type="text" id="claimOffice" class="form-control" placeholder="Enter UID for office admin"></div>
      <button type="button" id="setClaimsBtn" class="btn btn-emerald btn-full" style="margin-top:0.5rem;"><i class="fa-solid fa-key"></i> Set Claims</button>
    </div>
  `;
}

export function setupLoginForm() {
  const form = document.getElementById('loginForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      if (email) localStorage.setItem('lastEmail', email);
      await login(email, password);
    });
  }

  const setClaimsBtn = document.getElementById('setClaimsBtn');
  if (setClaimsBtn) {
    setClaimsBtn.addEventListener('click', async () => {
      const balariaUid = document.getElementById('claimBalaria').value.trim();
      const mochiaUid = document.getElementById('claimMochia').value.trim();
      const officeUid = document.getElementById('claimOffice').value.trim();
      if (!balariaUid || !mochiaUid || !officeUid) {
        showToast('All UIDs required', 'warning');
        return;
      }
      try {
        setLoading(true);
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
    });
  }
}