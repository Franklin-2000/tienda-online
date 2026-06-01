// ============================================================
// ui.js — Tema, logo, acordeones y filtros de categoría
// ============================================================
import { state } from './state.js';
import { actualizarColoresCharts } from './estadisticas.js';

const ICO_SOL  = `<svg class="sidebar-icon" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
const ICO_LUNA = `<svg class="sidebar-icon" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

// ── Toggle modo claro / oscuro ───────────────────────────────
export function initToggleModo() {
    const btnToggle = document.getElementById('btnToggleMode');
    const label     = document.getElementById('modo-label');

    function actualizarBotonModo() {
        const esMiopia = document.body.classList.contains('modo-miopia');
        const icoEl = btnToggle?.querySelector('.sidebar-icon');
        if (icoEl) icoEl.outerHTML = esMiopia ? ICO_LUNA : ICO_SOL;
        if (label) label.textContent = esMiopia ? 'Oscuro' : 'Claro';
    }

    if (btnToggle) {
        btnToggle.addEventListener('click', () => {
            document.body.classList.toggle('modo-miopia');
            actualizarBotonModo();
            actualizarColoresCharts();
            try { localStorage.setItem('softven_modo', document.body.classList.contains('modo-miopia') ? 'claro' : 'oscuro'); } catch(e) {}
        });
        try {
            const saved = localStorage.getItem('softven_modo');
            if (saved === 'claro') document.body.classList.add('modo-miopia');
            else                   document.body.classList.remove('modo-miopia');
        } catch(e) {}
        actualizarBotonModo();
    }
}

// ── Logo Softven: quitar fondo blanco ────────────────────────
export function procesarLogoSoftven() {
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

// ── Acordeones de historial y filtros de categoría ───────────
export function initTogglesSecciones() {
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
            if (state.onRenderProducts) state.onRenderProducts(state.searchResults);
        });
    });

    // Filtros de categoría en ventas físicas
    document.querySelectorAll('.btn-cat-venta').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-cat-venta').forEach(b => b.classList.remove('activo'));
            btn.classList.add('activo');
            state.categoriaActivaVenta = btn.dataset.cat;
            if (state.onUpdateSalesDropdown) state.onUpdateSalesDropdown(document.getElementById('inputBuscarProductVenta')?.value || '');
        });
    });
}
