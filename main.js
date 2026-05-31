// ============================================================
// main.js — Punto de entrada de la aplicación Softven
// Importa y conecta todos los módulos.
// ============================================================
import { EN_IFRAME_PREVIEW } from './modules/config.js';
import { state } from './modules/state.js';
import { checkAuthStatus, initAuth } from './modules/auth.js';
import { showScreen } from './modules/navegacion.js';
import { initInventario, renderProducts, updateProductCount } from './modules/inventario.js';
import { initVentasFisicas, updateSalesDropdown, renderSalesHistory } from './modules/ventas-fisicas.js';
import { initVentasOnline, renderResumenAdmin, renderPedidosAdmin } from './modules/ventas-online.js';
import { initCombos, renderTarjetasCombos, renderHistorialCombos } from './modules/combos.js';
import { initEstadisticas, initEstadisticasOnline, actualizarColoresCharts } from './modules/estadisticas.js';
import { initOffline, guardarInventarioCache, cargarInventarioDesdeCache } from './modules/offline.js';
import { loadInventory, loadSales, loadCombos, cargarPedidosAdmin } from './modules/db.js';

// ── Conectar callbacks entre módulos (evita dependencias circulares) ─
// inventario.js necesita llamar a updateSalesDropdown (ventas-fisicas.js)
state.onUpdateSalesDropdown = updateSalesDropdown;

// offline.js necesita renderProducts y updateProductCount (inventario.js)
window.renderProducts     = renderProducts;
window.updateProductCount = updateProductCount;

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

    // 4. Modo miopía (claro/oscuro) — toggle de tema
    initToggleModo();

    // 5. Botón actualizar datos
    initBtnActualizar();

    // 6. Procesar logo Softven (quitar fondo blanco)
    procesarLogoSoftven();

    // 7. Toggles de historial (acordeones)
    initTogglesSecciones();

    // 8. Arrancar auth (o modo previsualizador)
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

// ── Toggle modo claro / oscuro ───────────────────────────────
function initToggleModo() {
    const btnToggle = document.getElementById('btnToggleMode');
    const label     = document.getElementById('modo-label');
    const ICO_SOL  = `<svg class="sidebar-icon" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
    const ICO_LUNA = `<svg class="sidebar-icon" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

    function actualizarBotonModo() {
        const esMiopia = document.body.classList.contains('modo-miopia');
        const icoEl = btnToggle?.querySelector('.sidebar-icon');
        if (icoEl) icoEl.outerHTML = esMiopia ? ICO_LUNA : ICO_SOL;
        if (label) label.textContent = esMiopia ? 'Oscuro' : 'Claro';
    }

    if (btnToggle) {
        btnToggle.addEventListener('click', () => {
            document.body.classList.toggle('modo-oscuro');
            document.body.classList.toggle('modo-miopia');
            actualizarBotonModo();
            actualizarColoresCharts();
            try { localStorage.setItem('softven_modo', document.body.classList.contains('modo-miopia') ? 'claro' : 'oscuro'); } catch(e) {}
        });
        // Restaurar modo guardado
        try {
            const saved = localStorage.getItem('softven_modo');
            if (saved === 'claro') { document.body.classList.add('modo-miopia'); document.body.classList.remove('modo-oscuro'); }
            else { document.body.classList.remove('modo-miopia'); document.body.classList.add('modo-oscuro'); }
        } catch(e) {}
        actualizarBotonModo();
    }
}

// ── Botón actualizar ─────────────────────────────────────────
function initBtnActualizar() {
    const btn = document.getElementById('btnActualizar');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        btn.classList.add('girando'); btn.disabled = true;
        try {
            await Promise.all([loadInventory(), loadSales(), loadCombos(), cargarPedidosAdmin()]);
            renderTarjetasCombos(); renderHistorialCombos();
            renderResumenAdmin(); renderPedidosAdmin(state.filtroEstadoAdmin);
        } catch(e) { console.error('Error actualizando datos:', e); }
        showScreen('pantalla-inicio', false);
        btn.classList.remove('girando'); btn.disabled = false;
    });
}

// ── Logo Softven ─────────────────────────────────────────────
function procesarLogoSoftven() {
    const img = document.getElementById('softven-logo-img');
    if (!img) return;
    const procesar = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const d = ctx.getImageData(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < d.data.length; i += 4) {
            if (d.data[i] > 210 && d.data[i+1] > 210 && d.data[i+2] > 210) d.data[i+3] = 0;
        }
        ctx.putImageData(d, 0, 0);
        img.src = canvas.toDataURL('image/png');
    };
    if (img.complete && img.naturalWidth > 0) procesar();
    else img.addEventListener('load', procesar);
    img.addEventListener('error', () => img.style.display = 'none');
}

// ── Toggles de secciones (acordeones en historial) ───────────
function initTogglesSecciones() {
    const pares = [
        ['btnToggleVentasHoy',        'listaVentasHoy'],
        ['btnToggleHistorialFisicas', 'listaHistorialAcordeon'],
        ['btnToggleEntregasHoy',      'listaEntregasHoy'],
        ['btnToggleHistorialOnline',  'listaHistorialEntregasAcordeon'],
        ['btnToggleCombosHoy',        'listaCombosHoy'],
        ['btnToggleHistorialCombos',  'listaHistorialCombosAcordeon'],
    ];
    pares.forEach(([btnId, listaId]) => {
        const header = document.getElementById(btnId);
        const lista  = document.getElementById(listaId);
        if (header && lista) {
            header.addEventListener('click', () => {
                lista.classList.toggle('oculto');
                header.classList.toggle('cerrado');
            });
        }
    });

    // Filtros de categoría en inventario
    document.querySelectorAll('.btn-categoria-filtro').forEach(btn => {
        btn.addEventListener('click', () => {
            const esTodas  = btn.dataset.categoria === 'todas';
            const yaActivo = btn.classList.contains('activo');
            const contenedor = document.getElementById('contenedorProductos');
            if (esTodas && yaActivo) { contenedor?.classList.toggle('oculto-productos'); btn.classList.toggle('atenuado'); return; }
            contenedor?.classList.remove('oculto-productos');
            document.querySelector('.btn-categoria-filtro[data-categoria="todas"]')?.classList.remove('atenuado');
            document.querySelectorAll('.btn-categoria-filtro').forEach(b => b.classList.remove('activo'));
            btn.classList.add('activo');
            state.categoriaActivaFiltro = btn.dataset.categoria;
            renderProducts(state.searchResults);
        });
    });

    // Filtros de categoría en ventas físicas
    document.querySelectorAll('.btn-cat-venta').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-cat-venta').forEach(b => b.classList.remove('activo'));
            btn.classList.add('activo');
            state.categoriaActivaVenta = btn.dataset.cat;
            updateSalesDropdown(document.getElementById('inputBuscarProductVenta')?.value || '');
        });
    });
}

// ── Imprimir factura de reporte diario (PDF) ─────────────────
function generarReporteDiario() {
    if (typeof window.jspdf === 'undefined') return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const hoy = new Date().toLocaleDateString();
    const ventasHoy = state.sales.filter(s => (s.fechaLimpia || s.date?.split(',')[0]?.trim()) === hoy);
    if (!ventasHoy.length) { return; }
    doc.text(`Reporte Diario de Ventas - ${hoy}`, 14, 20);
    const filas = [];
    ventasHoy.forEach(v => v.items.forEach(i => filas.push([v.id, i.name, i.qty, `$${i.price}`, `$${i.subtotal}`])));
    doc.autoTable({ startY: 30, head: [['Ticket','Producto','Cant.','Precio','Subtotal']], body: filas });
    doc.save(`Reporte_${hoy.replace(/\//g, '-')}.pdf`);
}
window.generarReporteDiario = generarReporteDiario;

// ── Arrancar ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
