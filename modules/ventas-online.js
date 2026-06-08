// ============================================================
// ventas-online.js — Pedidos online, cambios de estado, historial
// ============================================================
import { supabaseClient } from './config.js';
import { state } from './state.js';
import { mostrarAlerta, mostrarConfirm } from './alertas.js';
import { cargarPedidosAdmin, deletePedidoFromSupabase, loadInventory, loadSales, saveSale, generarNumeroTicket, loadCombos } from './db.js';
import { showScreen } from './navegacion.js';

const btnBorrarTodasVentasCanceladas = document.getElementById('btnBorrarTodasVentasCanceladas');

// Escapa caracteres HTML para prevenir XSS en campos ingresados por clientes
function escHtml(str) {
    return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ── Tickets anti-duplicado ────────────────────────────────────
const _ticketsPedidosConfirmados = new Set();

// ── Badge de pedidos sin confirmar en el sidebar ─────────────
export function actualizarBadgePedidos() {
    const badge = document.getElementById('badgePedidosOnline');
    if (!badge) return;
    const count = state.pedidosAdmin.filter(p =>
        ['pendiente', 'esperando_pago', 'pago_confirmado'].includes(p.estado)
    ).length;
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.style.display = count > 0 ? 'flex' : 'none';
}

// ── Resumen ──────────────────────────────────────────────────
export function renderResumenAdmin() {
    const el = document.getElementById('resumenPedidosAdmin');
    if (!el) return;
    const c = { pendiente:0, esperando_pago:0, pago_confirmado:0, despachado:0, entregado:0, pago_fallido:0, cancelado:0 };
    let totalPorCobrar = 0, totalCobrado = 0;
    state.pedidosAdmin.forEach(p => {
        if (c[p.estado] !== undefined) c[p.estado]++;
        if (['pendiente','esperando_pago'].includes(p.estado)) totalPorCobrar += Number(p.total);
        if (['pago_confirmado','despachado','entregado'].includes(p.estado)) totalCobrado += Number(p.total);
    });
    el.innerHTML = `
        <div class="tarjeta-resumen-online amarilla"><strong>Por atender</strong><span class="num">${c.pendiente + c.esperando_pago}</span><small>$${totalPorCobrar.toLocaleString('es-CO')} por cobrar</small></div>
        <div class="tarjeta-resumen-online verde"><strong>Confirmados + Entregados</strong><span class="num">${c.pago_confirmado + c.despachado + c.entregado}</span><small>$${totalCobrado.toLocaleString('es-CO')} cobrado</small></div>
        <div class="tarjeta-resumen-online roja"><strong>Fallidos / Cancelados</strong><span class="num">${c.pago_fallido + c.cancelado}</span></div>`;
    actualizarBadgePedidos();
}

// ── Lista de pedidos ─────────────────────────────────────────
export function renderPedidosAdmin(estadoFiltro = 'todos') {
    const el = document.getElementById('listaPedidosAdmin');
    if (!el) return;
    state.filtroEstadoAdmin = estadoFiltro;

    if (btnBorrarTodasVentasCanceladas)
        btnBorrarTodasVentasCanceladas.style.display = estadoFiltro === 'cancelado' ? 'inline-flex' : 'none';

    const activos = ['pendiente','esperando_pago','pago_confirmado'];
    const lista = estadoFiltro === 'todos'
        ? state.pedidosAdmin.filter(p => activos.includes(p.estado))
        : state.pedidosAdmin.filter(p => p.estado === estadoFiltro);

    if (!lista.length) {
        el.innerHTML = `<p style="color:#666;padding:30px;text-align:center;">${estadoFiltro === 'todos' ? 'No hay pedidos activos.' : 'No hay pedidos con este estado.'}</p>`;
        return;
    }

    const etqMap = {
        pendiente:       { texto: 'Pendiente',        clase: 'estado-pendiente' },
        esperando_pago:  { texto: 'Esperando pago',   clase: 'estado-pendiente' },
        pago_confirmado: { texto: 'Pago confirmado',   clase: 'estado-pagado'    },
        entregado:       { texto: 'Entregado',         clase: 'estado-entregado' },
        pago_fallido:    { texto: 'Pago fallido',      clase: 'estado-cancelado' },
        cancelado:       { texto: 'Cancelado',         clase: 'estado-cancelado' },
    };

    el.innerHTML = '';
    lista.forEach(pedido => {
        const etq  = etqMap[pedido.estado] || { texto: pedido.estado, clase: '' };
        const fecha = new Date(pedido.fecha).toLocaleString('es-CO');
        const todos = pedido.items_pedido || [];
        const _itemsCombo = todos.filter(i => i.combo_id || String(i.nombre||'').startsWith('Combo: '));
        const _itemsProds = todos.filter(i => !i.combo_id && !String(i.nombre||'').startsWith('Combo: '));
        const esMixto = _itemsCombo.length > 0 && _itemsProds.length > 0;

        let botonesHTML = '';
        if (['pendiente','esperando_pago'].includes(pedido.estado)) {
            botonesHTML = `<button class="btn-añadir btn-accion-pedido" data-id="${pedido.id}" data-nuevo-estado="pago_confirmado">Confirmar Pago → Descontar Inventario</button><button class="btn-borrar-producto btn-accion-pedido" data-id="${pedido.id}" data-nuevo-estado="cancelado">Cancelar pedido</button>`;
        } else if (pedido.estado === 'pago_confirmado') {
            botonesHTML = `<button class="btn-añadir btn-accion-pedido" data-id="${pedido.id}" data-nuevo-estado="entregado">Confirmar Entrega</button>`;
        } else if (pedido.estado === 'cancelado') {
            botonesHTML = `<button class="btn-borrar-producto btn-eliminar-pedido-cancelado" data-id="${pedido.id}">Eliminar venta cancelada</button>`;
        }

        const card = document.createElement('div');
        card.className = 'tarjeta-producto pedido-admin-card';
        card.innerHTML = `
            <div class="pedido-admin-header">
                <div class="pedido-admin-id"><strong>#${pedido.id}</strong><span class="pedido-estado ${etq.clase}">${etq.texto}</span>${esMixto ? '<span class="pedido-badge-mixto">Mixto</span>' : ''}</div>
                <div class="pedido-admin-total">$${Number(pedido.total).toLocaleString('es-CO')}<small>${pedido.metodo_pago === 'contraentrega' ? ' Contra entrega' : ' Pago online'}</small></div>
            </div>
            <div class="pedido-admin-cliente">
                <div><strong>${escHtml(pedido.cliente_nombre)}</strong></div>
                <div>${escHtml(pedido.cliente_email)}</div>
                <div>${escHtml(pedido.cliente_tel)}</div>
                <div>${escHtml(pedido.direccion)}</div>
                ${pedido.notas ? `<div><em>${escHtml(pedido.notas)}</em></div>` : ''}
                <div class="pedido-admin-fecha">${fecha}</div>
            </div>
            <div class="pedido-admin-items">
                <table class="tabla-items-pedido">
                    <thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr></thead>
                    <tbody>${todos.map(i => `<tr><td>${escHtml(i.nombre)}</td><td style="text-align:center">${i.cantidad}</td><td style="text-align:right">$${Number(i.precio).toLocaleString('es-CO')}</td><td style="text-align:right;font-weight:700">$${Number(i.subtotal).toLocaleString('es-CO')}</td></tr>`).join('')}</tbody>
                </table>
            </div>
            ${botonesHTML ? `<div class="pedido-admin-acciones">${botonesHTML}</div>` : ''}`;

        card.querySelectorAll('.btn-accion-pedido').forEach(btn => {
            btn.addEventListener('click', () => cambiarEstadoPedido(parseInt(btn.dataset.id), btn.dataset.nuevoEstado, btn));
        });
        card.querySelectorAll('.btn-eliminar-pedido-cancelado').forEach(btn => {
            btn.addEventListener('click', () => eliminarPedidoCancelado(parseInt(btn.dataset.id)));
        });
        el.appendChild(card);
    });
}

async function cambiarEstadoPedido(pedidoId, nuevoEstado, btnEl) {
    const msgs = {
        pago_confirmado: `¿Confirmar el PAGO del pedido #${pedidoId}?\nEl inventario se descontará automáticamente.`,
        entregado:       `¿Confirmar la entrega del pedido #${pedidoId}?`,
        cancelado:       `¿Cancelar el pedido #${pedidoId}?`,
    };
    if (!await mostrarConfirm(msgs[nuevoEstado] || `¿Cambiar estado del pedido #${pedidoId}?`, nuevoEstado === 'cancelado' ? 'danger' : 'warn')) return;

    const textoOrig = btnEl.textContent;
    btnEl.disabled = true; btnEl.textContent = 'Procesando...';

    const { error } = await supabaseClient.rpc('cambiar_estado_pedido', { p_pedido_id: pedidoId, p_nuevo_estado: nuevoEstado });

    if (error) {
        let msg;
        const partes = (error.message || '').split('|');
        if (partes[0] === 'STOCK_INSUF' && partes.length === 4) {
            const [, nombre, disponible, necesario] = partes;
            msg = `Stock insuficiente\n\nProducto: "${nombre}"\nDisponible: ${disponible}\nNecesario: ${necesario}`;
        } else { msg = `Error: ${error.message}`; }
        await mostrarAlerta(msg, 'error');
        btnEl.disabled = false; btnEl.textContent = textoOrig;
        return;
    }

    const idx = state.pedidosAdmin.findIndex(p => p.id === pedidoId);
    if (idx !== -1) { state.pedidosAdmin[idx].estado = nuevoEstado; if (nuevoEstado === 'pago_confirmado') state.pedidosAdmin[idx].fecha_confirmacion = new Date().toISOString(); }

    renderResumenAdmin(); renderPedidosAdmin(state.filtroEstadoAdmin);

    if (nuevoEstado === 'entregado') {
        renderHistorialOnline();
        await mostrarAlerta(`Pedido #${pedidoId} marcado como entregado.`, 'success');
    }

    if (nuevoEstado === 'pago_confirmado') {
        await loadInventory(); await loadSales();
        await crearTicketsComboOnline(pedidoId);
        if (state.onRenderHistorialCombos) state.onRenderHistorialCombos();
        await mostrarAlerta(`Pago del pedido #${pedidoId} confirmado. Inventario descontado.`, 'success');
    }
}

async function eliminarPedidoCancelado(pedidoId) {
    if (!await mostrarConfirm(`¿Eliminar permanentemente la venta cancelada #${pedidoId}?`, 'danger')) return;
    try {
        await deletePedidoFromSupabase(pedidoId);
        state.pedidosAdmin = state.pedidosAdmin.filter(p => p.id !== pedidoId);
        renderResumenAdmin(); renderPedidosAdmin(state.filtroEstadoAdmin); renderHistorialOnline();
        await mostrarAlerta(`Venta cancelada #${pedidoId} eliminada.`, 'success');
    } catch(error) { await mostrarAlerta(`No se pudo eliminar: ${error.message || error}`, 'error'); }
}

window.eliminarPedidoEntregado = async function(pedidoId) {
    if (!await mostrarConfirm(`¿Eliminar el pedido entregado #${pedidoId}?\nLos productos volverán al inventario.`, 'danger')) return;
    const respaldo = state.pedidosAdmin.find(p => p.id === pedidoId);
    state.pedidosAdmin = state.pedidosAdmin.filter(p => p.id !== pedidoId);
    renderHistorialOnline();
    if (state.onRenderHistorialCombos) state.onRenderHistorialCombos();
    try {
        const { data: items } = await supabaseClient.from('items_pedido').select('product_id, cantidad').eq('pedido_id', pedidoId).not('product_id', 'is', null);
        for (const item of (items || [])) {
            const prod = state.inventory.find(p => String(p.id) === String(item.product_id));
            await supabaseClient.from('productos').update({ cantidad: (prod?.cantidad || 0) + item.cantidad }).eq('id', item.product_id);
        }
        const comboSales = state.sales.filter(s => String(s.id).startsWith('COMBO-ONLINE-') && Number(s.globalId) === Number(pedidoId));
        for (const cs of comboSales) { await supabaseClient.from('ventas').delete().eq('id', cs.supabaseId); }
        state.sales = state.sales.filter(s => !(String(s.id).startsWith('COMBO-ONLINE-') && Number(s.globalId) === Number(pedidoId)));
        await deletePedidoFromSupabase(pedidoId);
        await loadInventory(); renderResumenAdmin(); renderPedidosAdmin(state.filtroEstadoAdmin);
        await mostrarAlerta(`Pedido #${pedidoId} eliminado y stock repuesto.`, 'success');
    } catch(err) {
        if (respaldo) { state.pedidosAdmin.push(respaldo); state.pedidosAdmin.sort((a,b) => b.id - a.id); }
        renderHistorialOnline();
        await mostrarAlerta(`Error al eliminar: ${err.message || err}`, 'error');
    }
};

async function eliminarTodosLosPedidosCancelados() {
    const cancelados = state.pedidosAdmin.filter(p => p.estado === 'cancelado');
    if (!cancelados.length) { await mostrarAlerta('No hay ventas canceladas.', 'info'); return; }
    if (!await mostrarConfirm(`¿Eliminar todas las ventas canceladas? Se borrarán ${cancelados.length} pedidos.`, 'danger')) return;
    const ids = cancelados.map(p => p.id);
    if (btnBorrarTodasVentasCanceladas) { btnBorrarTodasVentasCanceladas.disabled = true; btnBorrarTodasVentasCanceladas.textContent = 'Eliminando...'; }
    try {
        const { error } = await supabaseClient.from('pedidos').delete().in('id', ids);
        if (error) throw error;
        state.pedidosAdmin = state.pedidosAdmin.filter(p => p.estado !== 'cancelado');
        renderResumenAdmin(); renderPedidosAdmin(state.filtroEstadoAdmin);
        await mostrarAlerta(`${ids.length} ventas canceladas eliminadas.`, 'success');
    } catch(error) { await mostrarAlerta(`No se pudo eliminar: ${error.message || error}`, 'error'); }
    finally { if (btnBorrarTodasVentasCanceladas) { btnBorrarTodasVentasCanceladas.disabled = false; btnBorrarTodasVentasCanceladas.textContent = 'Borrar canceladas'; } }
}

// ── Tickets de combo al confirmar pago ───────────────────────
async function crearTicketsComboOnline(pedidoId) {
    if (_ticketsPedidosConfirmados.has(pedidoId)) return;
    const { data: existing } = await supabaseClient.from('ventas').select('id').eq('user_id', state.currentUserId).eq('global_id', pedidoId).limit(1);
    if (existing?.length > 0) { _ticketsPedidosConfirmados.add(pedidoId); return; }

    const { data: itemsPedido, error } = await supabaseClient.from('items_pedido').select('id, nombre, cantidad, precio, subtotal, combo_id, product_id').eq('pedido_id', pedidoId);
    if (error || !itemsPedido?.length) return;

    const comboItems   = itemsPedido.filter(i => i.combo_id || String(i.nombre||'').startsWith('Combo: '));
    const productItems = itemsPedido.filter(i => !i.combo_id && !String(i.nombre||'').startsWith('Combo: '));
    _ticketsPedidosConfirmados.add(pedidoId);

    if (comboItems.length > 0 && !state.combos.length) await loadCombos();

    const ahora = new Date(), fechaLimpia = `${String(ahora.getDate()).padStart(2,'0')}/${String(ahora.getMonth()+1).padStart(2,'0')}/${ahora.getFullYear()}`;

    if (productItems.length > 0) {
        const numProd = await generarNumeroTicket();
        const newSale = { globalId: pedidoId, id: `ONLINE-${pedidoId}-PROD-${numProd}`, total: productItems.reduce((s,i) => s+Number(i.subtotal), 0), date: ahora.toLocaleString(), fechaLimpia, items: productItems.map(i => ({ productId: i.product_id||'', name: i.nombre, qty: i.cantidad, price: Number(i.precio), subtotal: Number(i.subtotal) })) };
        try { const g = await saveSale(newSale); newSale.supabaseId = g.id; state.sales.unshift(newSale); } catch(e) { console.error(e); }
    }

    for (const item of comboItems) {
        const numCombo = await generarNumeroTicket();
        const combo    = state.combos.find(c => c.id === item.combo_id || c.nombre === String(item.nombre||'').replace('Combo: ','').trim());
        const prods    = combo?.combo_productos || [];
        const newSale  = { globalId: pedidoId, id: `COMBO-ONLINE-${numCombo}`, total: Number(item.precio) * item.cantidad, date: ahora.toLocaleString(), fechaLimpia, items: prods.map(cp => ({ productId: cp.product_id||'', name: cp.nombre||'Producto', qty: (Number(cp.cantidad)||1)*item.cantidad, price: Number(cp.precio)||0, subtotal: (Number(cp.precio)||0)*(Number(cp.cantidad)||1)*item.cantidad })) };
        try { const g = await saveSale(newSale); newSale.supabaseId = g.id; state.sales.unshift(newSale); } catch(e) { console.error(e); }
    }
}

// ── Historial online ─────────────────────────────────────────
function _buildTicketOnlineCard(pedido) {
    const div = document.createElement('div');
    div.className = 'venta-ticket venta-ticket-online';
    const totalFmt = Number(pedido.total).toLocaleString('es-CO');
    const fecha    = new Date(pedido.fecha).toLocaleString('es-CO');
    div.innerHTML = `
        <div class="venta-ticket-header">
            <div class="ticket-header-left">
                <span class="ticket-badge ticket-badge-online">Pedido Online</span>
                <strong class="ticket-numero">#${pedido.id}</strong>
                <span class="fecha-venta">${fecha}</span>
            </div>
            <div class="ticket-header-right">
                <strong class="ticket-total">$${totalFmt}</strong>
                <button class="btn-eliminar-ticket" onclick="eliminarPedidoEntregado(${pedido.id}); event.stopPropagation();">Eliminar</button>
                <span class="ticket-toggle-arrow">Ver detalles ▼</span>
            </div>
        </div>
        <div class="venta-ticket-details">
            <p><strong>${escHtml(pedido.cliente_nombre)}</strong> · ${escHtml(pedido.cliente_email)}</p>
            <ul class="ticket-items-list">${(pedido.items_pedido||[]).map(i => `<li class="ticket-item-row"><span class="ticket-item-name">${i.cantidad}x ${escHtml(i.nombre)}</span><span class="ticket-item-sub">$${Number(i.subtotal).toLocaleString('es-CO')}</span></li>`).join('')}</ul>
        </div>`;
    div.querySelector('.venta-ticket-header').addEventListener('click', () => {
        const det = div.querySelector('.venta-ticket-details'), arr = div.querySelector('.ticket-toggle-arrow');
        const open = det.style.display === 'block'; det.style.display = open ? 'none' : 'block';
        if (arr) arr.textContent = open ? 'Ver detalles ▼' : 'Ocultar ▲';
    });
    return div;
}

export function renderHistorialOnline() {
    const listaHoy   = document.getElementById('listaEntregasHoy');
    const acordeon   = document.getElementById('listaHistorialEntregasAcordeon');
    if (!listaHoy || !acordeon) return;
    listaHoy.innerHTML = ''; acordeon.innerHTML = '';

    const entregados = state.pedidosAdmin.filter(p => p.estado === 'entregado');
    if (!entregados.length) { listaHoy.innerHTML = '<p>Aún no hay entregas registradas.</p>'; acordeon.innerHTML = '<p style="color:#666">El historial está vacío.</p>'; return; }

    const hoy = new Date().toLocaleDateString('es-CO');
    const hoyList = [], pasados = {};

    entregados.forEach(p => {
        const fecha = p.fecha_confirmacion ? new Date(p.fecha_confirmacion).toLocaleDateString('es-CO') : new Date(p.fecha).toLocaleDateString('es-CO');
        if (fecha === hoy) hoyList.push(p);
        else { if (!pasados[fecha]) pasados[fecha] = []; pasados[fecha].push(p); }
    });

    if (!hoyList.length) listaHoy.innerHTML = '<p>Aún no hay entregas registradas hoy.</p>';
    else hoyList.forEach(p => listaHoy.appendChild(_buildTicketOnlineCard(p)));

    const fechas = Object.keys(pasados).sort((a, b) => new Date(b.split('/').reverse().join('-')) - new Date(a.split('/').reverse().join('-')));
    if (!fechas.length) { acordeon.innerHTML = '<p style="color:#666">Sin historial anterior.</p>'; return; }
    fechas.forEach(fecha => {
        const del = pasados[fecha], total = del.reduce((s,p) => s + Number(p.total), 0);
        const btn  = document.createElement('div'); btn.className = 'acordeon-fecha';
        btn.innerHTML = `<span>${fecha} (${del.length} entregas)</span> <strong>$${total.toLocaleString('es-CO')} ▼</strong>`;
        const cont = document.createElement('div'); cont.className = 'acordeon-contenido'; cont.style.display = 'none';
        del.forEach(p => cont.appendChild(_buildTicketOnlineCard(p)));
        btn.addEventListener('click', () => { const open = cont.style.display==='block'; cont.style.display=open?'none':'block'; btn.querySelector('strong').innerHTML=`$${total.toLocaleString('es-CO')} ${open?'▼':'▲'}`; });
        acordeon.appendChild(btn); acordeon.appendChild(cont);
    });
}

// ── Init ─────────────────────────────────────────────────────
export async function initVentasOnline() {
    const btnRef = document.getElementById('btnRefrescarPedidosAdmin');
    if (btnRef) btnRef.addEventListener('click', async () => { await cargarPedidosAdmin(); renderResumenAdmin(); renderPedidosAdmin(state.filtroEstadoAdmin); });

    if (btnBorrarTodasVentasCanceladas) btnBorrarTodasVentasCanceladas.addEventListener('click', eliminarTodosLosPedidosCancelados);

    const btnVerHistOnline = document.getElementById('btnVerHistorialOnline');
    if (btnVerHistOnline) btnVerHistOnline.addEventListener('click', async e => { e.preventDefault(); await cargarPedidosAdmin(); showScreen('pantalla-historial-online'); });

    const btnVolverOnline = document.getElementById('btnVolverDesdeHistorialOnline');
    if (btnVolverOnline) btnVolverOnline.addEventListener('click', () => showScreen('pantalla-ventas-online'));

    const btnVolverFisicas = document.getElementById('btnVolverDesdeHistorialFisicas');
    if (btnVolverFisicas) btnVolverFisicas.addEventListener('click', () => showScreen('pantalla-ventas-fisicas'));

    document.querySelectorAll('.btn-filtro-estado').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-filtro-estado').forEach(b => b.classList.remove('activo'));
            btn.classList.add('activo');
            renderPedidosAdmin(btn.dataset.estado);
        });
    });

    state.onCargarPedidosAdmin    = async () => { await cargarPedidosAdmin(); renderResumenAdmin(); renderPedidosAdmin(state.filtroEstadoAdmin); };
    state.onRenderHistorialOnline = renderHistorialOnline;
    state.onPedidosCargados       = actualizarBadgePedidos;

    // Suscripción en tiempo real: actualiza el badge y la lista cuando llega un pedido nuevo
    let _debounceRealtime = null;
    supabaseClient
        .channel('pedidos-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
            clearTimeout(_debounceRealtime);
            _debounceRealtime = setTimeout(async () => {
                await cargarPedidosAdmin();
                actualizarBadgePedidos();
                const pantallaActiva = document.getElementById('pantalla-ventas-online');
                if (pantallaActiva?.classList.contains('activa')) {
                    renderResumenAdmin();
                    renderPedidosAdmin(state.filtroEstadoAdmin);
                }
            }, 600);
        })
        .subscribe();
}
