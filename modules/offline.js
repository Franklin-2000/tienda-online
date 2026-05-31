// ============================================================
// offline.js — Modo sin internet: IndexedDB, caché, sincronización
// ============================================================
import { supabaseClient } from './config.js';
import { state } from './state.js';
import { mostrarAlerta, mostrarConfirm } from './alertas.js';
import { loadInventory, loadSales, saveSale, saveCombo } from './db.js';

const DB_NAME    = 'softvent_offline';
const DB_VERSION = 1;
let _reconexionPendiente = false;

// ── IndexedDB helpers ────────────────────────────────────────
function abrirOfflineDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = e => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('productos_pending'))
                db.createObjectStore('productos_pending', { keyPath: 'localId', autoIncrement: true });
            if (!db.objectStoreNames.contains('ventas_pending'))
                db.createObjectStore('ventas_pending', { keyPath: 'localId', autoIncrement: true });
            if (!db.objectStoreNames.contains('inventario_cache'))
                db.createObjectStore('inventario_cache', { keyPath: 'id' });
        };
        req.onsuccess = e => resolve(e.target.result);
        req.onerror   = e => reject(e.target.error);
    });
}

function idbPut(store, data) {
    return new Promise((resolve, reject) => {
        const tx  = state.offlineDB.transaction(store, 'readwrite');
        const req = tx.objectStore(store).put(data);
        req.onsuccess = () => resolve(req.result);
        req.onerror   = () => reject(req.error);
    });
}

function idbGetAll(store) {
    return new Promise((resolve, reject) => {
        const tx  = state.offlineDB.transaction(store, 'readonly');
        const req = tx.objectStore(store).getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror   = () => reject(req.error);
    });
}

function idbDelete(store, key) {
    return new Promise((resolve, reject) => {
        const tx  = state.offlineDB.transaction(store, 'readwrite');
        const req = tx.objectStore(store).delete(key);
        req.onsuccess = () => resolve();
        req.onerror   = () => reject(req.error);
    });
}

function idbClear(store) {
    return new Promise((resolve, reject) => {
        const tx  = state.offlineDB.transaction(store, 'readwrite');
        const req = tx.objectStore(store).clear();
        req.onsuccess = () => resolve();
        req.onerror   = () => reject(req.error);
    });
}

// ── Caché de inventario ──────────────────────────────────────
export async function guardarInventarioCache() {
    if (!state.offlineDB) return;
    await idbClear('inventario_cache');
    for (const p of state.inventory) await idbPut('inventario_cache', p);
}

export async function cargarInventarioDesdeCache() {
    if (!state.offlineDB) return;
    const cached = await idbGetAll('inventario_cache');
    if (cached.length > 0) {
        state.inventory = cached;
        if (window.renderProducts)     window.renderProducts();
        if (window.updateProductCount) window.updateProductCount();
        if (state.onUpdateSalesDropdown) state.onUpdateSalesDropdown();
    }
}

async function contarPendientes() {
    if (!state.offlineDB) return 0;
    const prods  = await idbGetAll('productos_pending');
    const ventas = await idbGetAll('ventas_pending');
    return prods.length + ventas.length;
}

// ── Guardar en local (offline) ───────────────────────────────
export async function guardarProductoOffline(datosProducto) {
    await idbPut('productos_pending', { tipo: 'nuevo_producto', datos: datosProducto, timestamp: Date.now() });
    const fakeId        = 'OFFLINE_' + Date.now();
    const productoLocal = { ...datosProducto, id: fakeId };
    state.inventory.unshift(productoLocal);
    await guardarInventarioCache();
    if (window.renderProducts)     window.renderProducts();
    if (window.updateProductCount) window.updateProductCount();
    if (state.onUpdateSalesDropdown) state.onUpdateSalesDropdown();
    await actualizarUIOffline();
    return productoLocal;
}

export async function guardarVentaOffline(saleData) {
    await idbPut('ventas_pending', { tipo: 'nueva_venta', datos: saleData, timestamp: Date.now() });
    for (const item of saleData.items) {
        const prod = state.inventory.find(p => p.id?.toString() === item.productId?.toString());
        if (prod) prod.cantidad -= item.qty;
    }
    await guardarInventarioCache();
    await actualizarUIOffline();
}

// ── UI del switch ────────────────────────────────────────────
export async function actualizarUIOffline() {
    const toggle    = document.getElementById('offlineToggle');
    const dot       = document.getElementById('offlineStatusDot');
    const text      = document.getElementById('offlineStatusText');
    const syncBtn   = document.getElementById('offlineSyncBtn');
    const pending   = document.getElementById('offlinePendingCount');
    const indicator = document.getElementById('offline-indicator');
    const indText   = document.getElementById('offline-indicator-text');
    const n         = await contarPendientes();

    if (state.modoOffline) {
        if (toggle)    toggle.checked = false;
        if (dot)       dot.classList.add('activo');
        if (text)      text.textContent = 'Sin internet — guardando localmente';
        if (syncBtn)   syncBtn.classList.add('visible');
        if (indicator) indicator.classList.add('visible');
        if (indText)   indText.textContent = 'Sin internet — modo local activo';
        if (pending)   pending.textContent = n > 0 ? `${n} operación(es) pendiente(s)` : 'Sin operaciones pendientes';
    } else {
        if (toggle)    toggle.checked = true;
        if (dot)       dot.classList.remove('activo');
        if (text)      text.textContent = 'En línea — usando Supabase';
        if (syncBtn)   syncBtn.classList.remove('visible');
        if (indicator) indicator.classList.remove('visible');
        if (pending)   pending.textContent = '';
    }
}

// ── Sincronización ───────────────────────────────────────────
async function sincronizarConSupabase() {
    const syncBtn = document.getElementById('offlineSyncBtn');
    if (syncBtn) { syncBtn.disabled = true; syncBtn.textContent = 'Sincronizando...'; }
    let errores = 0;
    try {
        const productosPendientes = await idbGetAll('productos_pending');
        for (const item of productosPendientes) {
            if (item.tipo === 'nuevo_producto') {
                try {
                    const { data: { user } } = await supabaseClient.auth.getUser();
                    if (!user) throw new Error('Sin sesión activa');
                    const d = item.datos;
                    const { error } = await supabaseClient.from('productos').insert([{ codigoBarras: d.codigoBarras || null, nombre: d.nombre, precio: d.precio, cantidad: d.cantidad, imagen: d.imagen || '', user_id: user.id, categoria: d.categoria || 'Otras' }]);
                    if (error) throw error;
                    await idbDelete('productos_pending', item.localId);
                } catch(e) { console.error('Error sincronizando producto:', e); errores++; }
            } else if (item.tipo === 'nuevo_combo') {
                try {
                    const { data: { user } } = await supabaseClient.auth.getUser();
                    if (!user) throw new Error('Sin sesión activa');
                    state.currentUserId = user.id;
                    await saveCombo({ ...item.datos });
                    await idbDelete('productos_pending', item.localId);
                } catch(e) { console.error('Error sincronizando combo:', e); errores++; }
            }
        }

        const ventasPendientes = await idbGetAll('ventas_pending');
        for (const item of ventasPendientes) {
            if (item.tipo !== 'nueva_venta') continue;
            try { await saveSale(item.datos); await idbDelete('ventas_pending', item.localId); }
            catch(e) { console.error('Error sincronizando venta:', e); errores++; }
        }

        await loadInventory(); await loadSales(); await guardarInventarioCache(); await actualizarUIOffline();
        if (errores === 0) await mostrarAlerta('Sincronización completada. Todos los datos están en Supabase.', 'success');
        else await mostrarAlerta(`Sincronización parcial. ${errores} elemento(s) no se pudieron subir.`, 'warn');
    } catch(e) {
        await mostrarAlerta('Error durante la sincronización:\n' + e.message, 'error');
    } finally {
        if (syncBtn) { syncBtn.disabled = false; syncBtn.textContent = 'Sincronizar con Supabase'; }
    }
}

async function manejarCambioSwitch(queremosSupabase) {
    if (queremosSupabase) {
        const n = await contarPendientes();
        if (n > 0) {
            const ok = await mostrarConfirm(`Hay ${n} operación(es) guardada(s) localmente.\n¿Sincronizar con Supabase antes de volver al modo en línea?`, 'warn');
            if (ok) { await sincronizarConSupabase(); }
            else { const toggle = document.getElementById('offlineToggle'); if (toggle) toggle.checked = false; await actualizarUIOffline(); return; }
        } else {
            await loadInventory(); await loadSales(); await guardarInventarioCache();
        }
        state.modoOffline = false; await actualizarUIOffline();
        await mostrarAlerta('Modo en línea activado. Conectado a Supabase.', 'success');
    } else {
        state.modoOffline = true; await guardarInventarioCache(); await actualizarUIOffline();
        await mostrarAlerta('Modo sin internet activado. Las ventas se guardan localmente.', 'info');
    }
}

async function manejarCaidaInternet() {
    if (state.modoOffline) return;
    state.modoOffline = true; await guardarInventarioCache(); await actualizarUIOffline();
    const panel = document.getElementById('panelModoTrabajo');
    if (panel && !panel.classList.contains('abierto')) panel.classList.add('abierto');
    await mostrarAlerta('Se perdió la conexión. Modo Sin Internet activado automáticamente.\nPuedes seguir vendiendo y registrando productos.', 'warn');
}

async function manejarRecuperacionInternet() {
    if (!state.modoOffline || _reconexionPendiente) return;
    _reconexionPendiente = true;
    const n = await contarPendientes();
    const panel = document.getElementById('panelModoTrabajo');
    if (panel && !panel.classList.contains('abierto')) panel.classList.add('abierto');
    if (n > 0) {
        const ok = await mostrarConfirm(`¡Volvió el internet!\nHay ${n} operación(es) sin sincronizar. ¿Sincronizar ahora?`, 'warn');
        if (ok) { await sincronizarConSupabase(); state.modoOffline = false; }
    } else {
        state.modoOffline = false;
        await loadInventory(); await loadSales(); await guardarInventarioCache();
        await mostrarAlerta('¡Volvió el internet! Conectado a Supabase.', 'success');
    }
    await actualizarUIOffline(); _reconexionPendiente = false;
}

// ── Init ─────────────────────────────────────────────────────
export async function initOffline() {
    try { state.offlineDB = await abrirOfflineDB(); } catch(e) { console.warn('IndexedDB no disponible:', e); }

    state.modoOffline = false;
    await cargarInventarioDesdeCache();
    await actualizarUIOffline();

    const btnModo = document.getElementById('btnModoTrabajo');
    const panel   = document.getElementById('panelModoTrabajo');
    if (btnModo && panel) {
        btnModo.addEventListener('click', () => {
            panel.classList.toggle('abierto');
            const flecha = btnModo.querySelector('span:last-child');
            if (flecha) flecha.textContent = panel.classList.contains('abierto') ? '▲' : '▼';
        });
    }

    const toggle = document.getElementById('offlineToggle');
    if (toggle) { toggle.checked = true; toggle.addEventListener('change', async () => manejarCambioSwitch(toggle.checked)); }

    const syncBtn = document.getElementById('offlineSyncBtn');
    if (syncBtn) {
        syncBtn.addEventListener('click', async () => {
            await sincronizarConSupabase();
            const n = await contarPendientes();
            if (n === 0 && state.modoOffline) { state.modoOffline = false; await actualizarUIOffline(); }
        });
    }

    window.addEventListener('offline', manejarCaidaInternet);
    window.addEventListener('online',  manejarRecuperacionInternet);

    // Registrar callbacks para ventas-fisicas.js e inventario.js
    state.onGuardarInventarioCache    = guardarInventarioCache;
    state.onGuardarVentaOffline       = guardarVentaOffline;
    state.onGuardarProductoOffline    = guardarProductoOffline;
}
