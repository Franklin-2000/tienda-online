// ============================================================
// ventas-fisicas.js — Carrito, registro de venta, historial físico
// ============================================================
import { state } from './state.js';
import { mostrarAlerta, mostrarConfirm } from './alertas.js';
import { saveSale, loadInventory, deleteSaleFromSupabase, generarNumeroTicket } from './db.js';
import { showScreen } from './navegacion.js';
import { iniciarEscaner } from './escaner.js';
import { normalizeStringForSearch } from './inventario.js';

// ── Referencias DOM ──────────────────────────────────────────
const pantallaVentasFisicas = document.getElementById('pantalla-ventas-fisicas');
const inputBuscarProductVenta = document.getElementById('inputBuscarProductVenta');
const selectProductoVenta     = document.getElementById('selectProductoVenta');
const inputCantidadVenta      = document.getElementById('inputCantidadVenta');
const btnAgregarAlCarrito     = document.getElementById('btnAgregarAlCarrito');
const listaCarrito            = document.getElementById('listaCarrito');
const totalCarritoPreview     = document.getElementById('totalCarritoPreview');
const btnLimpiarVenta         = document.getElementById('btnLimpiarVenta');
const btnRegistrarVenta       = document.getElementById('btnRegistrarVenta');
const btnVerHistorial         = document.getElementById('btnVerHistorial');
const btnEscanearVenta        = document.getElementById('btnEscanearVenta');

const ICO_REGISTRAR   = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Registrar Venta`;
const ICO_IR_A_PAGAR  = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Ir a Pagar`;

// ── Persistencia del carrito en localStorage ─────────────────
const CART_DRAFT_KEY = 'softven_cart_draft';

function saveCartDraft() {
    if (state.currentCart.length > 0) {
        localStorage.setItem(CART_DRAFT_KEY, JSON.stringify(state.currentCart));
    } else {
        localStorage.removeItem(CART_DRAFT_KEY);
    }
}

function clearCartDraft() {
    localStorage.removeItem(CART_DRAFT_KEY);
}

function restoreCartDraft() {
    try {
        const raw = localStorage.getItem(CART_DRAFT_KEY);
        if (!raw) return;
        const items = JSON.parse(raw);
        if (Array.isArray(items) && items.length > 0) {
            state.currentCart = items;
            updateCartUI();
        }
    } catch (e) {
        localStorage.removeItem(CART_DRAFT_KEY);
    }
}

// ── Carrito UI ───────────────────────────────────────────────
export function updateCartUI() {
    if (!listaCarrito) return;
    listaCarrito.innerHTML = '';
    let total = 0;

    if (state.currentCart.length === 0) {
        listaCarrito.innerHTML = '<p class="pos-empty-msg">No hay productos agregados al ticket.</p>';
        if (totalCarritoPreview) totalCarritoPreview.textContent = '0';
        return;
    }

    state.currentCart.forEach((item, index) => {
        const subtotal = item.qty * item.price;
        total += subtotal;
        const row = document.createElement('div');
        row.className = 'pos-ticket-row' + (index === state.currentCart.length - 1 ? ' pos-row-nuevo' : '');
        row.innerHTML = `
            <span class="ptc-cod" title="${item.code || ''}">${item.code || '—'}</span>
            <span class="ptc-desc" title="${item.name}">${item.name}</span>
            <span class="ptc-unit">$${Number(item.price).toLocaleString('es-CO')}</span>
            <span class="ptc-qty">${item.qty}</span>
            <span class="ptc-total">$${Number(subtotal).toLocaleString('es-CO')}</span>
            <button class="pos-remover ptc-del" onclick="removeFromCart(${index})" title="Eliminar">✕</button>
        `;
        listaCarrito.appendChild(row);
    });
    if (totalCarritoPreview) totalCarritoPreview.textContent = Number(total).toLocaleString('es-CO');
    saveCartDraft();
}

window.removeFromCart = function(index) {
    state.currentCart.splice(index, 1);
    updateCartUI();
};

// ── Selección de producto ─────────────────────────────────────
function renderGridProductosVenta(searchTerm = '') {
    const raw = (searchTerm || '').trim();
    if (raw !== '') {
        const exacto = state.inventory.find(p => p.codigoBarras && p.codigoBarras === raw && p.cantidad > 0);
        if (exacto) seleccionarProductoVenta(exacto.id);
    }
}

export function seleccionarProductoVenta(productId) {
    state.productoSeleccionadoVentaId = productId;
    const product = state.inventory.find(p => p.id.toString() === productId.toString());
    if (!product) return;

    if (selectProductoVenta) selectProductoVenta.value = productId;
    const panelCantidad = document.getElementById('panelCantidadVenta');
    const infoEl        = document.getElementById('productoSeleccionadoInfo');
    if (panelCantidad) panelCantidad.style.display = 'flex';
    if (infoEl) {
        const imgSrc = product.imagen || '';
        infoEl.innerHTML = `
            ${imgSrc ? `<img src="${imgSrc}" alt="${product.nombre}" class="pos-sel-img" onerror="this.style.display='none'">` : ''}
            <div style="display:flex;flex-direction:column;min-width:0;flex:1">
                <strong class="pos-sel-nombre">${product.nombre}</strong>
                <span class="pos-sel-detalles">$${Number(product.precio).toLocaleString('es-CO')} &nbsp;·&nbsp; ${product.cantidad} disponibles</span>
            </div>
            <button class="pos-sel-cancel" id="btnEliminarSeleccion">✕ Quitar</button>
        `;
        document.getElementById('btnEliminarSeleccion')?.addEventListener('click', limpiarProductoSeleccionado);
    }
    const inputCant = document.getElementById('inputCantidadVenta');
    if (inputCant) { inputCant.value = '1'; inputCant.focus(); inputCant.select(); }
}

function limpiarProductoSeleccionado() {
    state.productoSeleccionadoVentaId = null;
    if (selectProductoVenta) selectProductoVenta.value = '';
    const panelCantidad = document.getElementById('panelCantidadVenta');
    if (panelCantidad) panelCantidad.style.display = 'none';
    if (inputBuscarProductVenta) { inputBuscarProductVenta.value = ''; inputBuscarProductVenta.focus(); }
}

export function updateSalesDropdown(searchTerm = '') {
    if (!selectProductoVenta) return;
    selectProductoVenta.innerHTML = '<option value="">-- Selecciona un producto --</option>';
    state.inventory.forEach(p => {
        if (p.cantidad > 0) {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = `${p.nombre} (Disp: ${p.cantidad} | $${p.precio})`;
            selectProductoVenta.appendChild(opt);
        }
    });
    renderGridProductosVenta(searchTerm);
}

// ── Limpiar venta ─────────────────────────────────────────────
export function limpiarTodaLaVenta() {
    state.currentCart = [];
    clearCartDraft();
    updateCartUI();
    if (inputBuscarProductVenta) inputBuscarProductVenta.value = '';
    if (selectProductoVenta)     selectProductoVenta.value     = '';
    if (inputCantidadVenta)      inputCantidadVenta.value      = '';
    state.productoSeleccionadoVentaId = null;
    const panelCantidad = document.getElementById('panelCantidadVenta');
    if (panelCantidad) panelCantidad.style.display = 'none';
    renderGridProductosVenta();
    if (inputBuscarProductVenta) inputBuscarProductVenta.focus();
}

// ── Factura PDF ───────────────────────────────────────────────
export function imprimirFacturaTicket(datosVenta) {
    if (typeof window.jspdf === 'undefined') return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: [80, 150] });
    doc.setFontSize(10); doc.text("MI TIENDA", 40, 10, { align: "center" });
    doc.setFontSize(8);
    doc.text(`Ticket #${datosVenta.id}`, 5, 20);
    doc.text(`Fecha: ${datosVenta.date}`, 5, 25);
    doc.text("------------------------------------------", 5, 30);
    let y = 35;
    datosVenta.items.forEach(item => {
        doc.text(`${item.qty}x ${item.name.substring(0, 15)}`, 5, y);
        doc.text(`$${item.subtotal}`, 75, y, { align: "right" });
        y += 5;
    });
    doc.text("------------------------------------------", 5, y + 2);
    doc.setFontSize(10);
    doc.text(`TOTAL: $${datosVenta.total}`, 75, y + 8, { align: "right" });
    window.open(doc.output('bloburl'), '_blank');
}

// ── Eliminar ticket ───────────────────────────────────────────
window.eliminarTicket = async function(ticketGlobalId) {
    if (!await mostrarConfirm('¿Eliminar este ticket? Los productos volverán al inventario.', 'danger')) return;

    if (state.modoOffline) {
        const sale = state.sales.find(s => s.globalId === ticketGlobalId);
        if (sale) {
            for (const item of (sale.items || [])) {
                const prod = state.inventory.find(p => p.id?.toString() === item.productId?.toString());
                if (prod) prod.cantidad += item.qty;
            }
            state.sales = state.sales.filter(s => s.globalId !== ticketGlobalId);
            if (state.onGuardarInventarioCache) await state.onGuardarInventarioCache();
            updateSalesDropdown();
            renderSalesHistory();
        }
        await mostrarAlerta('Ticket eliminado localmente. El stock fue repuesto.', 'success');
        return;
    }

    try {
        await deleteSaleFromSupabase(ticketGlobalId);
        state.sales = state.sales.filter(s => s.globalId !== ticketGlobalId);
        await loadInventory();
        updateSalesDropdown();
        renderSalesHistory();
        await mostrarAlerta('Ticket eliminado y stock repuesto.', 'success');
    } catch (err) {
        await mostrarAlerta('Error al eliminar el ticket. Intenta de nuevo.', 'error');
    }
};

// ── Historial de ventas físicas ───────────────────────────────
export function renderSalesHistory() {
    // Ventas de hoy
    const listaHoyEl = document.getElementById('listaVentasHoy');
    if (listaHoyEl) {
        const estabaOculto = listaHoyEl.classList.contains('oculto');
        listaHoyEl.innerHTML = '';
        const hoy = new Date().toLocaleDateString();
        const ventasHoy = state.sales.filter(s => {
            if (String(s.id || '').startsWith('ONLINE-') || String(s.id || '').startsWith('COMBO-')) return false;
            const f = s.fechaLimpia || (s.date ? s.date.split(',')[0].trim() : '');
            return f === hoy;
        });
        if (ventasHoy.length === 0) {
            listaHoyEl.innerHTML = '<p>Aún no hay ventas registradas hoy.</p>';
        } else {
            [...ventasHoy].reverse().forEach(sale => listaHoyEl.appendChild(crearDOMTicket(sale, true)));
        }
        if (estabaOculto) listaHoyEl.classList.add('oculto');
    }

    // Historial días anteriores
    const acordeon = document.getElementById('listaHistorialAcordeon');
    if (!acordeon) return;
    acordeon.innerHTML = '';

    const fechaHoy = new Date().toLocaleDateString();
    const ventasPasadas = {};
    state.sales.forEach(sale => {
        if (String(sale.id || '').startsWith('ONLINE-') || String(sale.id || '').startsWith('COMBO-')) return;
        const f = sale.fechaLimpia || (sale.date ? sale.date.split(',')[0].trim() : '');
        if (f && f !== fechaHoy) {
            if (!ventasPasadas[f]) ventasPasadas[f] = [];
            ventasPasadas[f].push(sale);
        }
    });

    const fechasOrdenadas = Object.keys(ventasPasadas).sort((a, b) => {
        return new Date(b.split('/').reverse().join('-')) - new Date(a.split('/').reverse().join('-'));
    });

    if (!fechasOrdenadas.length) {
        acordeon.innerHTML = '<p style="color:#666;">No hay tickets de días anteriores.</p>';
        return;
    }

    fechasOrdenadas.forEach(fecha => {
        const ventas   = ventasPasadas[fecha];
        const totalDia = ventas.reduce((s, v) => s + v.total, 0);
        const btn      = document.createElement('div');
        btn.className  = 'acordeon-fecha';
        btn.innerHTML  = `<span>${fecha} (${ventas.length} tickets)</span> <strong>$${totalDia.toLocaleString('es-CO')} ▼</strong>`;
        const cont     = document.createElement('div');
        cont.className = 'acordeon-contenido';
        cont.style.display = 'none';
        [...ventas].reverse().forEach(sale => cont.appendChild(crearDOMTicket(sale, false)));
        btn.addEventListener('click', () => {
            const vis = cont.style.display === 'block';
            cont.style.display = vis ? 'none' : 'block';
            btn.querySelector('strong').innerHTML = `$${totalDia.toLocaleString('es-CO')} ${vis ? '▼' : '▲'}`;
        });
        acordeon.appendChild(btn);
        acordeon.appendChild(cont);
    });
}

function crearDOMTicket(sale, esDeHoy) {
    const ticketDiv = document.createElement('div');
    ticketDiv.className = 'venta-ticket venta-ticket-fisica';
    ticketDiv.dataset.tipo = 'fisica';

    let itemsHtml = '<ul class="ticket-items-list">';
    if (sale.items?.length > 0) {
        sale.items.forEach(item => {
            const sub = Number(item.subtotal).toLocaleString('es-CO');
            itemsHtml += `<li class="ticket-item-row"><span class="ticket-item-name">${item.qty}x ${item.name}</span><span class="ticket-item-sub">$${sub}</span></li>`;
        });
    } else { itemsHtml += '<li>Sin detalle de productos.</li>'; }
    itemsHtml += '</ul>';

    const badgeOffline = String(sale.id).includes('OFF-')
        ? '<span class="ticket-badge ticket-badge-offline">Local</span>' : '';
    const totalFmt = Number(sale.total).toLocaleString('es-CO');
    const horaStr  = sale.date ? (sale.date.split(',')[1] || sale.date).trim() : '';

    ticketDiv.innerHTML = `
        <div class="venta-ticket-header">
            <div class="ticket-header-left">
                <div class="ticket-badges-row"><span class="ticket-badge ticket-badge-fisica">Venta Física</span>${badgeOffline}</div>
                <strong class="ticket-numero">${sale.id}</strong>
                <span class="fecha-venta">${horaStr}</span>
            </div>
            <div class="ticket-header-right">
                <strong class="ticket-total">$${totalFmt}</strong>
                <button class="btn-eliminar-ticket" onclick="eliminarTicket(${sale.globalId}); event.stopPropagation();">Eliminar</button>
                <span class="ticket-toggle-arrow">Ver detalles ▼</span>
            </div>
        </div>
        <div class="venta-ticket-details">${itemsHtml}</div>
    `;
    ticketDiv.querySelector('.venta-ticket-header').addEventListener('click', () => {
        const details = ticketDiv.querySelector('.venta-ticket-details');
        const arrow   = ticketDiv.querySelector('.ticket-toggle-arrow');
        const open    = details.style.display === 'block';
        details.style.display = open ? 'none' : 'block';
        if (arrow) arrow.textContent = open ? 'Ver detalles ▼' : 'Ocultar ▲';
    });
    return ticketDiv;
}

// ── Autocomplete ─────────────────────────────────────────────
function inicializarAutocomplete() {
    if (!inputBuscarProductVenta) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'autocomplete-wrapper';
    inputBuscarProductVenta.parentNode.insertBefore(wrapper, inputBuscarProductVenta);
    wrapper.appendChild(inputBuscarProductVenta);
    const listaSugerencias = document.createElement('div');
    listaSugerencias.className = 'autocomplete-sugerencias';
    wrapper.appendChild(listaSugerencias);

    let indiceSugerencia = -1, sugerenciasActuales = [];

    function mostrarSugerencias(termino) {
        const norm = normalizeStringForSearch(termino.trim());
        listaSugerencias.innerHTML = ''; indiceSugerencia = -1;
        if (norm.length < 1) { listaSugerencias.classList.remove('visible'); sugerenciasActuales = []; return; }
        sugerenciasActuales = state.inventory.filter(p => {
            if (p.cantidad <= 0) return false;
            return normalizeStringForSearch(p.nombre).includes(norm) || (p.codigoBarras && p.codigoBarras.includes(termino.trim()));
        }).slice(0, 8);
        if (!sugerenciasActuales.length) { listaSugerencias.classList.remove('visible'); return; }
        sugerenciasActuales.forEach((p, i) => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item'; item.dataset.idx = i;
            item.innerHTML = `<img src="${p.imagen || 'https://via.placeholder.com/38'}" alt="${p.nombre}"><div class="autocomplete-item-info"><span class="autocomplete-item-nombre">${p.nombre}</span><span class="autocomplete-item-detalle">Disp: ${p.cantidad}${p.codigoBarras ? ' · Cód: '+p.codigoBarras : ''}</span></div><span class="autocomplete-item-precio">$${Number(p.precio).toLocaleString('es-CO')}</span>`;
            item.addEventListener('mousedown', e => { e.preventDefault(); seleccionarDesdeSugerencia(p); });
            listaSugerencias.appendChild(item);
        });
        listaSugerencias.classList.add('visible');
    }

    function seleccionarDesdeSugerencia(p) {
        inputBuscarProductVenta.value = p.nombre;
        listaSugerencias.classList.remove('visible'); indiceSugerencia = -1;
        seleccionarProductoVenta(p.id);
    }

    function actualizarResaltado() {
        listaSugerencias.querySelectorAll('.autocomplete-item').forEach((el, i) => el.classList.toggle('activo', i === indiceSugerencia));
    }

    inputBuscarProductVenta.addEventListener('input', e => { mostrarSugerencias(e.target.value); renderGridProductosVenta(e.target.value); });
    inputBuscarProductVenta.addEventListener('blur', () => setTimeout(() => listaSugerencias.classList.remove('visible'), 200));
    inputBuscarProductVenta.addEventListener('focus', e => { if (e.target.value.trim().length > 0) mostrarSugerencias(e.target.value); });
    inputBuscarProductVenta.addEventListener('keydown', e => {
        if (!listaSugerencias.classList.contains('visible')) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); indiceSugerencia = Math.min(indiceSugerencia+1, sugerenciasActuales.length-1); actualizarResaltado(); listaSugerencias.querySelector('.autocomplete-item.activo')?.scrollIntoView({ block: 'nearest' }); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); indiceSugerencia = Math.max(indiceSugerencia-1, -1); actualizarResaltado(); listaSugerencias.querySelector('.autocomplete-item.activo')?.scrollIntoView({ block: 'nearest' }); }
        else if (e.key === 'Enter') { e.preventDefault(); if (indiceSugerencia >= 0 && sugerenciasActuales[indiceSugerencia]) seleccionarDesdeSugerencia(sugerenciasActuales[indiceSugerencia]); else if (sugerenciasActuales.length === 1) seleccionarDesdeSugerencia(sugerenciasActuales[0]); }
        else if (e.key === 'Escape') { listaSugerencias.classList.remove('visible'); indiceSugerencia = -1; }
    });
}

// ── Modal de pago en efectivo ────────────────────────────────
function cerrarModalPago() {
    document.getElementById('modalPagoOverlay')?.remove();
    document.removeEventListener('keydown', _escapeModalPago);
}

function _escapeModalPago(e) {
    if (e.key === 'Escape') cerrarModalPago();
}

function abrirModalPago() {
    const total = state.currentCart.reduce((s, i) => s + i.qty * i.price, 0);
    const overlay = document.createElement('div');
    overlay.id = 'modalPagoOverlay';
    overlay.className = 'modal-pago-overlay';
    overlay.innerHTML = `
        <div class="modal-pago-card">
            <div class="modal-pago-header">
                <div class="modal-pago-info">
                    <h3 class="modal-pago-titulo">Pago en Efectivo</h3>
                    <span class="modal-pago-total-label">Total: <strong>$${total.toLocaleString('es-CO')}</strong></span>
                </div>
                <button class="modal-pago-close" id="btnCerrarModalPago" title="Cerrar (Esc)">✕</button>
            </div>
            <div class="modal-pago-body">
                <label class="modal-pago-label">Efectivo recibido del cliente</label>
                <div class="modal-pago-input-row">
                    <span class="modal-pago-currency">$</span>
                    <input type="number" id="inputEfectivoCliente" class="modal-pago-input"
                           placeholder="0" min="0" step="1000" inputmode="numeric">
                </div>
                <div id="modalPagoCambio" class="modal-pago-cambio-display"></div>
            </div>
            <div class="modal-pago-footer">
                <button id="btnConfirmarRegistrarVenta" class="btn-añadir modal-btn-registrar" disabled>${ICO_REGISTRAR}</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);

    const inputEfectivo = document.getElementById('inputEfectivoCliente');
    const cambioEl      = document.getElementById('modalPagoCambio');
    const btnConfirmar  = document.getElementById('btnConfirmarRegistrarVenta');

    setTimeout(() => inputEfectivo?.focus(), 60);

    inputEfectivo?.addEventListener('input', () => {
        const efectivo = parseFloat(inputEfectivo.value) || 0;
        if (efectivo >= total) {
            const cambio = efectivo - total;
            cambioEl.className = 'modal-pago-cambio-display cambio-ok-wrap';
            cambioEl.innerHTML = `<div class="cambio-info"><span class="cambio-etiqueta">Cambio a devolver</span><strong class="cambio-valor">$${cambio.toLocaleString('es-CO')}</strong></div>`;
            btnConfirmar.disabled = false;
        } else if (efectivo > 0) {
            cambioEl.className = 'modal-pago-cambio-display cambio-insuf-wrap';
            cambioEl.innerHTML = `<div class="cambio-info"><span class="cambio-etiqueta">⚠ Efectivo insuficiente</span><small class="cambio-falta">Faltan $${(total - efectivo).toLocaleString('es-CO')}</small></div>`;
            btnConfirmar.disabled = true;
        } else {
            cambioEl.className = 'modal-pago-cambio-display';
            cambioEl.innerHTML = '';
            btnConfirmar.disabled = true;
        }
    });

    document.getElementById('btnCerrarModalPago')?.addEventListener('click', cerrarModalPago);
    overlay.addEventListener('click', e => { if (e.target === overlay) cerrarModalPago(); });
    btnConfirmar?.addEventListener('click', () => _ejecutarRegistroVenta(btnConfirmar));
    inputEfectivo?.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !btnConfirmar.disabled) btnConfirmar.click();
    });
    document.addEventListener('keydown', _escapeModalPago);
}

async function _ejecutarRegistroVenta(btnConfirmar) {
    if (btnConfirmar) { btnConfirmar.disabled = true; btnConfirmar.innerHTML = 'Registrando...'; }
    try {
        const now       = new Date();
        const cartItems = state.currentCart.map(item => ({ productId: item.id, name: item.name, qty: item.qty, price: item.price, subtotal: item.qty * item.price }));
        const totalSale = cartItems.reduce((s, i) => s + i.subtotal, 0);

        state.currentCart.forEach(item => {
            const prod = state.inventory.find(p => p.id.toString() === item.id.toString());
            if (prod) prod.cantidad -= item.qty;
        });
        updateSalesDropdown();

        let numeroTicket;
        if (state.modoOffline) {
            const hhmm = String(now.getHours()).padStart(2,'0') + String(now.getMinutes()).padStart(2,'0');
            numeroTicket = 'OFF-' + hhmm + '-' + String(Date.now()).slice(-4);
        } else {
            numeroTicket = await generarNumeroTicket();
        }

        const newSale = { globalId: Date.now(), id: `V-${numeroTicket}`, total: totalSale, date: now.toLocaleString(), fechaLimpia: now.toLocaleDateString(), items: cartItems };

        if (state.modoOffline) {
            if (state.onGuardarVentaOffline) await state.onGuardarVentaOffline(newSale);
            state.sales.unshift(newSale);
            renderSalesHistory();
            cerrarModalPago();
            if (await mostrarConfirm('¿Imprimir factura?', 'info')) imprimirFacturaTicket(newSale);
            limpiarTodaLaVenta();
            await mostrarAlerta(`Venta guardada localmente.\nTicket #${newSale.id} por $${totalSale.toLocaleString('es-CO')}`, 'success');
        } else {
            const guardada = await saveSale(newSale);
            newSale.supabaseId = guardada.id;
            state.sales.unshift(newSale);
            await loadInventory();
            renderSalesHistory();
            cerrarModalPago();
            if (await mostrarConfirm('¿Imprimir factura?', 'info')) imprimirFacturaTicket(newSale);
            limpiarTodaLaVenta();
            if (inputBuscarProductVenta) inputBuscarProductVenta.focus();
            await mostrarAlerta(`¡Venta registrada!\nTicket #${newSale.id} por $${totalSale.toLocaleString('es-CO')}`, 'success');
        }
    } catch (err) {
        await mostrarAlerta('Error al registrar la venta. Intenta de nuevo.', 'error');
        if (btnConfirmar) { btnConfirmar.disabled = false; btnConfirmar.innerHTML = ICO_REGISTRAR; }
    }
}

// ── Init ─────────────────────────────────────────────────────
export function initVentasFisicas() {
    restoreCartDraft();
    inicializarAutocomplete();

    if (btnLimpiarVenta)  btnLimpiarVenta.addEventListener('click', limpiarTodaLaVenta);
    if (btnVerHistorial)  btnVerHistorial.addEventListener('click', e => { e.preventDefault(); showScreen('pantalla-historial-fisicas'); });
    if (btnEscanearVenta) btnEscanearVenta.addEventListener('click', e => { e.preventDefault(); iniciarEscaner('venta'); });

    if (btnAgregarAlCarrito) {
        btnAgregarAlCarrito.addEventListener('click', async () => {
            const productId = selectProductoVenta?.value;
            let qty = parseInt(inputCantidadVenta?.value);
            if (isNaN(qty) || qty <= 0) qty = 1;
            if (!productId) { await mostrarAlerta('Selecciona un producto.', 'warn'); return; }
            const product = state.inventory.find(p => p.id.toString() === productId.toString());
            if (!product) return;
            const cartItem    = state.currentCart.find(i => i.id.toString() === productId.toString());
            const currentQty  = cartItem ? cartItem.qty : 0;
            if (currentQty + qty > product.cantidad) { await mostrarAlerta(`Stock insuficiente. Solo quedan ${product.cantidad - currentQty} unidades de ${product.nombre}.`, 'warn'); return; }
            if (cartItem) { cartItem.qty += qty; } else { state.currentCart.push({ id: product.id, name: product.nombre, code: product.codigoBarras || '—', price: product.precio, qty }); }
            updateCartUI();
            if (inputCantidadVenta)      inputCantidadVenta.value = '';
            if (inputBuscarProductVenta) inputBuscarProductVenta.value = '';
            if (selectProductoVenta)     selectProductoVenta.value = '';
            state.productoSeleccionadoVentaId = null;
            const panelCantidad = document.getElementById('panelCantidadVenta');
            if (panelCantidad) panelCantidad.style.display = 'none';
            updateSalesDropdown();
            if (inputBuscarProductVenta) inputBuscarProductVenta.focus();
        });
    }

    inputCantidadVenta?.addEventListener('keydown', e => {
        if (e.key === 'Enter' && pantallaVentasFisicas?.classList.contains('activa')) { e.preventDefault(); btnAgregarAlCarrito?.click(); }
    });
    inputBuscarProductVenta?.addEventListener('keydown', e => {
        if (e.key === 'Enter' && pantallaVentasFisicas?.classList.contains('activa')) { e.preventDefault(); if (selectProductoVenta?.value) inputCantidadVenta?.focus(); }
    });

    if (btnRegistrarVenta) {
        btnRegistrarVenta.addEventListener('click', async () => {
            if (state.currentCart.length === 0) { await mostrarAlerta('Añade al menos un producto antes de pagar.', 'warn'); return; }
            abrirModalPago();
        });
    }

    // Shift → Ir a Pagar (abre modal de pago, solo en pantalla ventas físicas)
    document.addEventListener('keydown', e => {
        if (e.key === 'Shift' && !e.repeat && pantallaVentasFisicas?.classList.contains('activa') && btnRegistrarVenta && !btnRegistrarVenta.disabled) {
            btnRegistrarVenta.click();
        }
    });

    // Registrar callbacks en state para navegacion.js
    state.onUpdateSalesDropdown = updateSalesDropdown;
    state.onRenderSalesHistory  = renderSalesHistory;
    state.onSalesLoaded         = renderSalesHistory;

    // Escaner → callback para escaner.js
    state.onSeleccionarProductoVenta = seleccionarProductoVenta;
}
