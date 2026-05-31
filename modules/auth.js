// ============================================================
// auth.js — Autenticación (Google OAuth via Supabase)
// ============================================================
import { supabaseClient } from './config.js';
import { state } from './state.js';
import { mostrarAlerta } from './alertas.js';
import { showScreen } from './navegacion.js';
import { loadInventory, loadSales, loadCombos } from './db.js';

/**
 * Verifica la sesión activa y navega a la pantalla correcta.
 */
export async function checkAuthStatus(pushToHistory = true) {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (session) {
        state.currentLoggedInUserEmail = session.user.email;
        state.currentUserId            = session.user.id;

        // Perfil en sidebar
        const meta      = session.user.user_metadata || {};
        const avatarUrl = meta.avatar_url || meta.picture || '';
        const fullName  = meta.full_name  || meta.name   || state.currentLoggedInUserEmail;

        const avatarEl = document.getElementById('sidebar-user-avatar');
        const nameEl   = document.getElementById('sidebar-user-name');
        const emailEl  = document.getElementById('sidebar-user-email');
        if (avatarEl) avatarEl.src = avatarUrl || `https://ui-avatars.com/api/?background=0c566c&color=fff&name=${encodeURIComponent(fullName)}`;
        if (nameEl)   nameEl.textContent  = fullName;
        if (emailEl)  emailEl.textContent = state.currentLoggedInUserEmail;

        if (pushToHistory) {
            try { history.replaceState({ screen: 'pantalla-inicio' }, '', '#pantalla-inicio'); } catch (e) {}
        }
        showScreen('pantalla-inicio', false);
        await Promise.all([loadInventory(), loadSales(), loadCombos()]);
    } else {
        state.currentLoggedInUserEmail = null;
        state.currentUserId            = null;
        const sidebar = document.getElementById('sidebar-menu');
        if (sidebar) sidebar.classList.remove('activo');
        if (pushToHistory) {
            try { history.replaceState({ screen: 'pantalla-login' }, '', '#pantalla-login'); } catch (e) {}
        }
        showScreen('pantalla-login', false);
    }
}

/**
 * Inicia sesión con Google (popup).
 */
export async function loginConGoogle() {
    const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options:  { redirectTo: window.location.origin + window.location.pathname },
    });
    if (error) await mostrarAlerta('Error al iniciar sesión con Google: ' + error.message, 'error');
}

/**
 * Cierra la sesión activa.
 */
export async function logout() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) { await mostrarAlerta('Error al cerrar sesión: ' + error.message, 'error'); return; }
    state.currentLoggedInUserEmail = null;
    state.currentUserId            = null;
    state.inventory                = [];
    state.sales                    = [];
    state.currentCart              = [];
    state.combos                   = [];
    showScreen('pantalla-login', false);
}

/**
 * Registra listeners del módulo de auth en el DOM.
 */
export function initAuth() {
    const btnGoogle = document.getElementById('btnGoogle');
    if (btnGoogle) btnGoogle.addEventListener('click', loginConGoogle);

    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) btnLogout.addEventListener('click', logout);

    // Escuchar cambios de sesión (cierre externo, expiración, etc.)
    supabaseClient.auth.onAuthStateChange(async (event) => {
        if (event === 'SIGNED_OUT') showScreen('pantalla-login', false);
        if (event === 'SIGNED_IN')  await checkAuthStatus(false);
    });

    // Registrar callback para popstate en navegacion.js
    state.onCheckAuthStatus = checkAuthStatus;
}
