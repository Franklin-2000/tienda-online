// ============================================================
// navegacion.js — Sistema de pantallas (showScreen + routing)
// ============================================================
import { state } from './state.js';

const PANTALLAS = [
    '#pantalla-login', '#pantalla-inicio', '#pantalla-menu-ventas',
    '#pantalla-INVENTARIO', '#pantalla-ventas-fisicas', '#pantalla-historial-fisicas',
    '#pantalla-ventas-online', '#pantalla-historial-online', '#pantalla-estadisticas',
    '#pantalla-estadisticas-online', '#pantalla-combos', '#pantalla-historial-combos',
].join(', ');

const MAPA_SIDEBAR = {
    'pantalla-INVENTARIO':          'btn-Inventario',
    'pantalla-ventas-fisicas':      'btn-Menu-Ventas-Fisicas',
    'pantalla-historial-fisicas':   'btn-Menu-Ventas-Fisicas',
    'pantalla-ventas-online':       'btn-Menu-Ventas-Online',
    'pantalla-historial-online':    'btn-Menu-Ventas-Online',
    'pantalla-historial-combos':    'btn-Combos',
    'pantalla-estadisticas':        'btn-Estadisticas',
    'pantalla-estadisticas-online': 'btn-EstadisticasOnline',
    'pantalla-combos':              'btn-Combos',
};

/**
 * Muestra la pantalla indicada y oculta todas las demás.
 * @param {string} screenId  — ID de la pantalla sin '#'
 * @param {boolean} pushToHistory
 */
export function showScreen(screenId, pushToHistory = true) {
    // Ocultar todas las pantallas (solo clase CSS — display lo maneja el CSS)
    document.querySelectorAll(PANTALLAS).forEach(el => el.classList.remove('activa'));

    // Sidebar visibilidad
    const sidebar = document.getElementById('sidebar-menu');
    const sinSidebar = ['pantalla-login', 'pantalla-menu-ventas'];
    if (sidebar) sidebar.classList.toggle('activo', !sinSidebar.includes(screenId));

    // Marcar botón activo en sidebar
    document.querySelectorAll('.sidebar-boton').forEach(b => b.classList.remove('sidebar-activo'));
    const btnActivoId = MAPA_SIDEBAR[screenId];
    if (btnActivoId) document.getElementById(btnActivoId)?.classList.add('sidebar-activo');

    // Mostrar pantalla objetivo
    function show(el) {
        if (!el) return;
        el.classList.add('activa');
        el.scrollTop = 0;
    }

    switch (screenId) {
        case 'pantalla-login':
            show(document.getElementById('pantalla-login'));
            break;

        case 'pantalla-inicio':
            show(document.getElementById('pantalla-inicio'));
            if (state.onClearSearch) state.onClearSearch();
            if (state.onResetForm)   state.onResetForm();
            break;

        case 'pantalla-INVENTARIO':
            show(document.getElementById('pantalla-INVENTARIO'));
            if (state.onResetForm) state.onResetForm();
            state.categoriaActivaFiltro = 'todas';
            state.searchResults = null;
            document.querySelectorAll('.btn-categoria-filtro').forEach(b => b.classList.remove('activo'));
            document.querySelector('.btn-categoria-filtro[data-categoria="todas"]')?.classList.add('activo');
            if (state.onLoadInventory) state.onLoadInventory();
            break;

        case 'pantalla-ventas-fisicas': {
            show(document.getElementById('pantalla-ventas-fisicas'));
            state.categoriaActivaVenta = 'todas';
            state.productoSeleccionadoVentaId = null;
            document.querySelectorAll('.btn-cat-venta').forEach(b => b.classList.remove('activo'));
            document.querySelector('.btn-cat-venta[data-cat="todas"]')?.classList.add('activo');
            const panelCant = document.getElementById('panelCantidadVenta');
            if (panelCant) panelCant.style.display = 'none';
            if (state.onUpdateSalesDropdown) state.onUpdateSalesDropdown();
            break;
        }

        case 'pantalla-ventas-online':
            show(document.getElementById('pantalla-ventas-online'));
            if (state.onCargarPedidosAdmin) state.onCargarPedidosAdmin();
            break;

        case 'pantalla-historial-online':
            show(document.getElementById('pantalla-historial-online'));
            if (state.onRenderHistorialOnline) state.onRenderHistorialOnline();
            break;

        case 'pantalla-historial-fisicas':
            show(document.getElementById('pantalla-historial-fisicas'));
            if (state.onRenderSalesHistory) state.onRenderSalesHistory();
            break;

        case 'pantalla-estadisticas':
            show(document.getElementById('pantalla-estadisticas'));
            if (state.onInitEstadisticas) state.onInitEstadisticas();
            break;

        case 'pantalla-estadisticas-online':
            show(document.getElementById('pantalla-estadisticas-online'));
            if (state.onInitEstadisticasOnline) state.onInitEstadisticasOnline();
            break;

        case 'pantalla-combos':
            show(document.getElementById('pantalla-combos'));
            if (state.onRenderCombos) state.onRenderCombos();
            break;

        case 'pantalla-historial-combos':
            show(document.getElementById('pantalla-historial-combos'));
            if (state.onRenderHistorialCombos) state.onRenderHistorialCombos();
            break;

        default:
            show(document.getElementById(screenId));
    }

    if (pushToHistory) {
        try { history.pushState({ screen: screenId }, '', '#' + screenId); } catch (e) {}
    }
}

// Navegar con botón atrás del browser
window.addEventListener('popstate', (event) => {
    if (event.state?.screen) showScreen(event.state.screen, false);
    else if (state.onCheckAuthStatus) state.onCheckAuthStatus(false);
});
