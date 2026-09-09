// site/js/auth.js — Unified login button state for public site
// Handles logged-out / client / admin states without exposing admin existence.
// Uses existing Supabase anon + is_admin() RPC. No new dashboard.

import { getPublicSupabase } from "./supabase.js";

const supabase = getPublicSupabase();

function escapeHtml(s){ return String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

function createLoginButton() {
  // Find header-right containers on index.html and market.html
  const rights = document.querySelectorAll('.header-right');
  rights.forEach(right => {
    if (right.querySelector('#authBtn')) return; // already added
    const btn = document.createElement('a');
    btn.id = 'authBtn';
    btn.className = 'header-icon-btn';
    btn.href = 'login.html';
    btn.setAttribute('aria-label', 'Login');
    // default logged-out icon: user login (door + user)
    btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/></svg>`;
    // Insert before the market icon if exists, otherwise append
    const marketBtn = right.querySelector('a[href="market.html"], a[href="./market.html"], a.m-only');
    if (marketBtn && marketBtn.nextSibling) {
      right.insertBefore(btn, marketBtn.nextSibling);
    } else {
      right.appendChild(btn);
    }
  });
}

function updateButtonForState(user, isAdmin) {
  const btns = document.querySelectorAll('#authBtn');
  btns.forEach(btn => {
    if (!user) {
      // Logged-out: normal login icon, links to login
      btn.href = 'login.html';
      btn.setAttribute('aria-label', 'Login');
      btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/></svg>`;
      btn.onclick = null;
    } else if (isAdmin) {
      // Admin: dashboard icon (open door + layout), links to dashboard
      btn.href = 'admin/index.html';
      btn.setAttribute('aria-label', 'Open dashboard');
      btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>`;
      btn.onclick = null;
    } else {
      // Normal client: remain normal user state, no admin UI; show user icon, click shows toast and stays
      btn.href = 'index.html';
      btn.setAttribute('aria-label', 'Account');
      btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 19a7 7 0 0 1 14 0"/></svg>`;
      btn.onclick = (e) => {
        // Keep session, just inform and stay; prevent navigation to login
        e.preventDefault();
        // simple toast via existing showToast if available, else alert
        const msg = 'Already signed in';
        // try to use app.js showToast if exists
        if (typeof window.showToast === 'function') window.showToast(msg);
        else {
          const t = document.createElement('div');
          t.textContent = msg;
          t.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#0E1A14;color:#fff;padding:10px 14px;border-radius:999px;font-size:13px;z-index:99';
          document.body.appendChild(t);
          setTimeout(()=> t.remove(), 1800);
        }
      };
    }
  });
}

async function refreshAuthState() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user || null;
    let isAdmin = false;
    if (user) {
      try {
        const { data } = await supabase.rpc("is_admin");
        isAdmin = !!data;
      } catch (_) {
        isAdmin = false;
      }
    }
    updateButtonForState(user, isAdmin);
    return { user, isAdmin };
  } catch (e) {
    console.warn("[TPM auth] refresh failed", e);
    updateButtonForState(null, false);
    return { user: null, isAdmin: false };
  }
}

// Init on DOM ready
function initAuthUI() {
  createLoginButton();
  refreshAuthState();
  // Keep in sync across tabs / refresh
  supabase.auth.onAuthStateChange(() => {
    refreshAuthState();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAuthUI);
} else {
  initAuthUI();
}

// Also handle drawer login link if present
document.addEventListener('DOMContentLoaded', () => {
  const drawerNav = document.querySelector('.drawer-nav');
  if (drawerNav && !drawerNav.querySelector('a[href="login.html"]')) {
    const a = document.createElement('a');
    a.href = 'login.html';
    a.innerHTML = 'Login <span aria-hidden="true">→</span>';
    a.id = 'drawerLoginLink';
    drawerNav.appendChild(a);
    // update it same as header button
    const updateDrawer = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user || null;
      let isAdmin = false;
      if (user) {
        const { data } = await supabase.rpc("is_admin").catch(()=>({data:false}));
        isAdmin = !!data;
      }
      if (!user) {
        a.href = 'login.html';
        a.innerHTML = 'Login <span aria-hidden="true">→</span>';
      } else if (isAdmin) {
        a.href = 'admin/index.html';
        a.innerHTML = 'Dashboard <span aria-hidden="true">→</span>';
      } else {
        a.href = 'index.html';
        a.innerHTML = 'Account <span aria-hidden="true">→</span>';
        a.onclick = (e)=>{ e.preventDefault(); if(window.showToast) window.showToast('Already signed in'); };
      }
    };
    updateDrawer();
    supabase.auth.onAuthStateChange(updateDrawer);
  }
});

export { refreshAuthState };
