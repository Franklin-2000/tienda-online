// ============================================================
// main.js — Punto de entrada de la aplicación Softven
// Importa y conecta todos los módulos.
// ============================================================
import { EN_IFRAME_PREVIEW } from './config.js';
import { state } from './state.js';
import { checkAuthStatus, initAuth } from './auth.js';
import { showScreen } from './navegacion.js';
import { initInventario, renderProducts, updateProductCount } from './inventario.js';
import { initVentasFisicas, updateSalesDropdown } from './ventas-fisicas.js';
import { initVentasOnline, renderResumenAdmin, renderPedidosAdmin, actualizarBadgePedidos } from './ventas-online.js';
import { initCombos, renderTarjetasCombos, renderHistorialCombos } from './combos.js';
import { initEstadisticas, initEstadisticasOnline } from './estadisticas.js';
import { initOffline } from './offline.js';
import { loadInventory, loadSales, loadCombos, cargarPedidosAdmin } from './db.js';
import { initToggleModo, procesarLogoSoftven, initTogglesSecciones } from './ui.js';
import './reportes.js';

// ── Conectar callbacks entre módulos (evita dependencias circulares) ─
state.onUpdateSalesDropdown  = updateSalesDropdown;
state.onRenderProducts       = renderProducts;
state.onUpdateProductCount   = updateProductCount;

// ── Inicializar todos los módulos ────────────────────────────
async function init() {
    // 1. Modo offline (IndexedDB) — debe inicializarse primero
    await initOffline();

    // 2. UI de cada sección
    initAuth();
    initInventario();
    initVentasFisicas();
    await initVentasOnline();
    initCombos();
    initEstadisticas();
    initEstadisticasOnline();

    // 3. Sidebar — botones de navegación
    initSidebar();

    // 4. Modo claro/oscuro, logo y acordeones
    initToggleModo();
    procesarLogoSoftven();
    initTogglesSecciones();

    // 5. Botón actualizar datos
    initBtnActualizar();

    // 6. Arrancar auth (o modo previsualizador)
    if (EN_IFRAME_PREVIEW) {
        showScreen('pantalla-inicio', false);
    } else {
        await checkAuthStatus();
    }
}

// ── Sidebar navigation ───────────────────────────────────────
function initSidebar() {
    const nav = [
        ['btn-Inventario',           () => showScreen('pantalla-INVENTARIO')],
        ['btn-Menu-Ventas-Fisicas',  () => { showScreen('pantalla-ventas-fisicas'); setTimeout(() => document.getElementById('inputBuscarProductVenta')?.focus(), 400); }],
        ['btn-Menu-Ventas-Online',   () => { showScreen('pantalla-ventas-online'); cargarPedidosAdmin().then(() => { renderResumenAdmin(); renderPedidosAdmin(state.filtroEstadoAdmin); }); }],
        ['btn-Estadisticas',         () => showScreen('pantalla-estadisticas')],
        ['btn-EstadisticasOnline',   () => showScreen('pantalla-estadisticas-online')],
        ['btn-Combos',               () => showScreen('pantalla-combos')],
    ];
    nav.forEach(([id, handler]) => {
        document.getElementById(id)?.addEventListener('click', e => { e.preventDefault(); handler(); });
    });
}

// ── Botón actualizar ─────────────────────────────────────────
function initBtnActualizar() {
    const btn = document.getElementById('btnActualizar');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        btn.classList.add('girando'); btn.disabled = true;
        try {
            await Promise.all([loadInventory(), loadSales(), loadCombos(), cargarPedidosAdmin()]);
            renderTarjetasCombos();
            renderHistorialCombos();
            renderResumenAdmin();
            renderPedidosAdmin(state.filtroEstadoAdmin);
            if (state.onRenderSalesHistory) state.onRenderSalesHistory();
        } catch(e) { console.error('Error actualizando datos:', e); }
        showScreen('pantalla-inicio', false);
        btn.classList.remove('girando'); btn.disabled = false;
    });
}

// ── Arrancar ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
