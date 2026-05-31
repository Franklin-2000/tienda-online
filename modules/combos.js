// ============================================================
// combos.js — Gestión y venta de combos
// ============================================================
import { supabaseClient } from './config.js';
import { state } from './state.js';
import { mostrarAlerta, mostrarConfirm } from './alertas.js';
import { loadCombos, saveSale, generarNumeroTicket } from './db.js';
import { showScreen } from './navegacion.js';

// ── Helpers de Supabase para combos ─────────────────────────
async function updateCombo(comboId, combo) {
    const { error: err1 } = await supabaseClient.from('combos')
        .update({ nombre: combo.nombre, descripcion: combo.descripcion, precio: combo.precio, precio_suma: combo.precioSuma, stock: combo.stock ?? 0 })
        .eq('id', comboId);
    if (err1) throw err1;
    const { error: err2 } = await supabaseClient.from('combo_productos').delete().eq('combo_id', comboId);
    if (err2) throw err2;
    const items = combo.productos.map(p => ({ combo_id: comboId, product_id: p.id, nombre: p.nombre, precio: p.precio, imagen: p.imagen, user_id: state.currentUserId, cantidad: p.cantidad || 1 }));
    const { error: err3 } = await supabaseClient.from('combo_productos').insert(items);
    if (err3) throw err3;
}

async function deleteCombo(comboId) {
    const { error } = await supabaseClient.from('combos').delete().eq('id', comboId);
    if (error) throw error;
}

// ── Render chips de productos seleccionados ───────────────────
function actualizarValorSuma() {
    const suma = state.productosEnComboActual.reduce((s, p) => s + (p.precio || 0) * (p.cantidad || 1), 0);
    const el = document.getElementById('combo-valor-suma');
    if (el) el.textContent = '$' + suma.toLocaleString('es-CO');
}

function actualizarChipsCombo() {
    const contenedor = document.getElementById('combo-productos-seleccionados');
    if (!contenedor) return;
    if (!state.productosEnComboActual.length) {
        contenedor.innerHTML = '<p class="combo-empty-msg">No hay productos agregados al combo.</p>';
        return;
    }
    contenedor.innerHTML = state.productosEnComboActual.map((p, idx) => `
        <div class="combo-chip" data-idx="${idx}">
            <img src="${p.imagen || 'https://via.placeholder.com/26'}" alt="">
            <span class="combo-chip-nombre">${p.nombre}</span>
            <div class="combo-chip-cantidad-wrap">
                <label class="combo-chip-qty-label">Cant:</label>
                <input type="number" class="combo-chip-qty-input" data-idx="${idx}" value="${p.cantidad || 1}" min="1" step="1">
            </div>
            <span class="combo-chip-precio">$${((p.precio || 0) * (p.cantidad || 1)).toLocaleString('es-CO')}</span>
            <button class="combo-chip-remove" data-idx="${idx}" title="Quitar">✕</button>
        </div>`).join('');

    contenedor.querySelectorAll('.combo-chip-qty-input').forEach(input => {
        input.addEventListener('focus', () => input.select());
        input.addEventListener('input', () => {
            const i = parseInt(input.dataset.idx), val = parseInt(input.value);
            if (!isNaN(val) && val >= 1) {
                const prod = state.productosEnComboActual[i];
                const invProd = state.inventory.find(p => String(p.id) === String(prod.id));
                const max = invProd ? (invProd.cantidad || 0) : Infinity;
                if (val > max) { input.value = ''; mostrarAlerta(`Supera el stock de "${prod.nombre}" (${max} disponibles).`, 'warn'); return; }
                state.productosEnComboActual[i].cantidad = val;
                const chip = input.closest('.combo-chip');
                if (chip) { const s = chip.querySelector('.combo-chip-precio'); if (s) s.textContent = '$' + ((prod.precio || 0) * val).toLocaleString('es-CO'); }
                actualizarValorSuma();
            }
        });
        input.addEventListener('blur', () => {
            const i = parseInt(input.dataset.idx), val = parseInt(input.value);
            const prod = state.productosEnComboActual[i];
            const invProd = state.inventory.find(p => String(p.id) === String(prod.id));
            const max = invProd ? (invProd.cantidad || 0) : Infinity;
            const final = (isNaN(val) || val < 1) ? 1 : Math.min(val, max > 0 ? max : val);
            input.value = final; state.productosEnComboActual[i].cantidad = final;
            actualizarValorSuma();
        });
    });

    contenedor.querySelectorAll('.combo-chip-remove').forEach(btn => {
        btn.onclick = () => { state.productosEnComboActual.splice(parseInt(btn.dataset.idx), 1); actualizarChipsCombo(); actualizarValorSuma(); };
    });
}

function agregarProductoAlCombo(prod) {
    if (state.productosEnComboActual.find(p => p.id === prod.id)) {
        mostrarAlerta(`"${prod.nombre}" ya está en el combo.`, 'info'); return;
    }
    const invProd = state.inventory.find(p => String(p.id) === String(prod.id));
    if (!invProd || (invProd.cantidad || 0) <= 0) {
        mostrarAlerta(`"${prod.nombre}" no tiene stock disponible.`, 'warn'); return;
    }
    state.productosEnComboActual.push({ ...prod, cantidad: 1 });
    actualizarChipsCombo(); actualizarValorSuma();
    const inputs = document.querySelectorAll('.combo-chip-qty-input');
    const ultimo = inputs[inputs.length - 1];
    if (ultimo) { ultimo.value = ''; ultimo.focus(); }
}

function limpiarFormCombo() {
    state.editandoComboId = null;
    state.productosEnComboActual = [];
    ['inputComboNombre','inputComboDescripcion','inputComboPrecio','inputComboStock'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    actualizarChipsCombo(); actualizarValorSuma();
    const btn = document.getElementById('btnGuardarCombo');
    if (btn) btn.textContent = 'Guardar Combo';
}

function editarCombo(combo) {
    state.editandoComboId = combo.id;
    const f = id => document.getElementById(id);
    if (f('inputComboNombre'))     f('inputComboNombre').value     = combo.nombre || '';
    if (f('inputComboDescripcion')) f('inputComboDescripcion').value = combo.descripcion || '';
    if (f('inputComboPrecio'))     f('inputComboPrecio').value     = combo.precio || '';
    if (f('inputComboStock'))      f('inputComboStock').value      = combo.stock != null ? combo.stock : '';
    state.productosEnComboActual = (combo.combo_productos || []).map(p => ({ id: p.product_id || p.id, nombre: p.nombre, precio: Number(p.precio) || 0, imagen: p.imagen || '', cantidad: p.cantidad || 1 }));
    actualizarChipsCombo(); actualizarValorSuma();
    const btn = document.getElementById('btnGuardarCombo');
    if (btn) btn.textContent = 'Actualizar Combo';
    document.querySelector('#pantalla-combos .tarjeta-input-producto')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function handleGuardarCombo() {
    const nombre      = (document.getElementById('inputComboNombre')?.value || '').trim();
    const descripcion = (document.getElementById('inputComboDescripcion')?.value || '').trim();
    const precioInput = parseFloat(document.getElementById('inputComboPrecio')?.value || 0);
    const stock       = parseInt(document.getElementById('inputComboStock')?.value || 0) || 0;

    if (!nombre)                           { mostrarAlerta('El combo debe tener un nombre.', 'warn'); return; }
    if (!state.productosEnComboActual.length) { mostrarAlerta('Agrega al menos un producto al combo.', 'warn'); return; }

    const conCero = state.productosEnComboActual.filter(p => !(p.cantidad >= 1));
    if (conCero.length) { mostrarAlerta(`Cantidad debe ser mayor a cero:\n${conCero.map(p => `• "${p.nombre}"`).join('\n')}`, 'warn'); return; }

    const excedidos = state.productosEnComboActual.filter(p => {
        const inv = state.inventory.find(i => String(i.id) === String(p.id));
        return p.cantidad > (inv ? inv.cantidad || 0 : 0);
    });
    if (excedidos.length) { mostrarAlerta(`Stock insuficiente:\n${excedidos.map(p => { const inv = state.inventory.find(i => String(i.id) === String(p.id)); return `• "${p.nombre}": necesita ${p.cantidad}, hay ${inv?.cantidad || 0}`; }).join('\n')}`, 'warn'); return; }

    const precioSuma = state.productosEnComboActual.reduce((s, p) => s + (p.precio || 0) * (p.cantidad || 1), 0);
    const precio = precioInput > 0 ? precioInput : precioSuma;

    if (state.modoOffline) {
        const comboLocal = { id: 'OFFLINE_COMBO_' + Date.now(), nombre, descripcion, precio, precio_suma: precioSuma, stock, combo_productos: state.productosEnComboActual.map(p => ({ nombre: p.nombre, precio: p.precio, imagen: p.imagen, cantidad: p.cantidad || 1 })) };
        state.combos.unshift(comboLocal);
        limpiarFormCombo(); renderTarjetasCombos();
        mostrarAlerta('Combo guardado localmente. Se subirá al sincronizar.', 'success');
        return;
    }

    if (state.editandoComboId) {
        try {
            await updateCombo(state.editandoComboId, { nombre, descripcion, precio, precioSuma, stock, productos: state.productosEnComboActual });
            mostrarAlerta('Combo actualizado.', 'success'); limpiarFormCombo();
            await loadCombos(); renderTarjetasCombos();
        } catch(e) { mostrarAlerta('Error actualizando combo.\n' + (e.message || ''), 'error'); }
        return;
    }

    try {
        const { saveCombo } = await import('./db.js');
        await saveCombo({ nombre, descripcion, precio, precioSuma, stock, productos: state.productosEnComboActual });
        mostrarAlerta('Combo guardado correctamente.', 'success'); limpiarFormCombo();
        await loadCombos(); renderTarjetasCombos();
    } catch(e) { mostrarAlerta('Error guardando combo.\n' + (e.message || ''), 'error'); }
}

export function renderTarjetasCombos() {
    const contenedor = document.getElementById('contenedorCombos');
    const totalEl    = document.getElementById('totalCombosCount');
    if (!contenedor) return;
    if (totalEl) totalEl.textContent = state.combos.length;

    if (!state.combos.length) {
        contenedor.innerHTML = '<p class="combo-empty-msg" style="color:rgba(200,180,255,0.4);padding:20px">No hay combos creados todavía.</p>';
        return;
    }

    contenedor.innerHTML = state.combos.map((combo, comboIdx) => {
        const prods    = combo.combo_productos || [];
        const miniImgs = prods.map(p => `<div class="combo-mini-producto"><img class="combo-mini-img" src="${p.imagen || 'https://via.placeholder.com/48'}" alt="${p.nombre||''}"><span class="combo-mini-nombre">${p.cantidad||1}u. ${p.nombre||''}</span></div>`).join('');
        const precioOrig = combo.precio_suma && combo.precio_suma !== combo.precio ? `<div class="combo-card-precio-orig">Valor individual: $${Math.round(combo.precio_suma).toLocaleString('es-CO')}</div>` : '';
        const stockBadge = combo.stock > 0 ? `<div class="combo-card-stock">${combo.stock} disponible${combo.stock!==1?'s':''}</div>` : combo.stock === 0 ? `<div class="combo-card-stock combo-card-stock--agotado">Agotado</div>` : '';
        return `<div class="tarjeta-combo tarjeta-producto">
            <div class="combo-card-nombre">${combo.nombre}</div>
            ${combo.descripcion ? `<div class="combo-card-desc">${combo.descripcion}</div>` : ''}
            <div class="combo-card-productos">${miniImgs}</div>
            <div class="combo-card-precio">$${Math.round(combo.precio).toLocaleString('es-CO')}</div>
            ${precioOrig}${stockBadge}
            <div class="combo-card-acciones">
                <div class="combo-card-acciones-fila">
                    <button class="btn-editar-combo" data-comboidx="${comboIdx}">Editar</button>
                    <button class="btn-borrar-producto btn-borrar-combo" data-comboid="${combo.id}">Eliminar</button>
                </div>
                <button class="btn-vender-combo" data-comboidx="${comboIdx}">Vender Combo</button>
            </div>
        </div>`;
    }).join('');

    contenedor.querySelectorAll('.btn-editar-combo').forEach(btn => {
        btn.onclick = () => { const idx = parseInt(btn.dataset.comboidx); if (!isNaN(idx) && state.combos[idx]) editarCombo(state.combos[idx]); };
    });
    contenedor.querySelectorAll('.btn-vender-combo').forEach(btn => {
        btn.onclick = () => { const idx = parseInt(btn.dataset.comboidx); if (!isNaN(idx) && state.combos[idx]) venderCombo(state.combos[idx]); };
    });
    contenedor.querySelectorAll('.btn-borrar-combo').forEach(btn => {
        btn.onclick = async () => {
            if (!await mostrarConfirm('¿Eliminar este combo?', 'danger')) return;
            try { await deleteCombo(btn.dataset.comboid); state.combos = state.combos.filter(c => String(c.id) !== String(btn.dataset.comboid)); renderTarjetasCombos(); }
            catch(e) { await mostrarAlerta('No se pudo eliminar el combo.\n' + (e.message || ''), 'error'); }
        };
    });
}

async function venderCombo(combo) {
    const prods = combo.combo_productos || [];
    if (!prods.length) { mostrarAlerta('Este combo no tiene productos.', 'warn'); return; }
    const precioFmt = Math.round(combo.precio).toLocaleString('es-CO');
    if (!await mostrarConfirm(`¿Vender 1 combo "${combo.nombre}" por $${precioFmt}?`, 'info')) return;

    const sinStock = prods.filter(cp => {
        const prod = state.inventory.find(p => String(p.id) === String(cp.product_id || cp.id));
        return !prod || (prod.cantidad || 0) < (cp.cantidad || 1);
    });
    if (sinStock.length) {
        await mostrarAlerta(`Stock insuficiente:\n${sinStock.map(cp => { const prod = state.inventory.find(p => String(p.id) === String(cp.product_id || cp.id)); return `• "${cp.nombre}" (necesita ${cp.cantidad||1}, hay ${prod?.cantidad||0})`; }).join('\n')}`, 'error');
        return;
    }

    try {
        const ahora     = new Date();
        const items     = prods.map(p => ({ productId: p.product_id || p.id || '', name: p.nombre, qty: p.cantidad || 1, price: Number(p.precio) || 0, subtotal: (Number(p.precio) || 0) * (p.cantidad || 1) }));

        for (const cp of prods) {
            const prod = state.inventory.find(p => String(p.id) === String(cp.product_id || cp.id));
            if (prod) prod.cantidad = Math.max(0, (prod.cantidad || 0) - (cp.cantidad || 1));
        }
        if (combo.stock > 0) combo.stock = Math.max(0, combo.stock - 1);

        const newSale = { globalId: Date.now(), total: combo.precio, date: ahora.toLocaleString(), fechaLimpia: ahora.toLocaleDateString(), items };

        if (state.modoOffline) {
            const hhmm = String(ahora.getHours()).padStart(2,'0') + String(ahora.getMinutes()).padStart(2,'0');
            newSale.id = 'COMBO-OFF-' + hhmm + '-' + String(Date.now()).slice(-4);
            if (state.onGuardarVentaOffline) await state.onGuardarVentaOffline(newSale);
            state.sales.unshift(newSale);
            if (state.onRenderSalesHistory) state.onRenderSalesHistory();
            renderHistorialCombos(); renderTarjetasCombos();
            mostrarAlerta(`Venta guardada localmente.\n${combo.nombre} — $${precioFmt}`, 'success');
        } else {
            const numero = await generarNumeroTicket();
            newSale.id = 'COMBO-' + numero;
            const guardada = await saveSale(newSale);
            newSale.supabaseId = guardada.id;
            if (!String(combo.id).startsWith('OFFLINE_COMBO_')) {
                await supabaseClient.from('combos').update({ stock: combo.stock }).eq('id', combo.id);
            }
            state.sales.unshift(newSale);
            const { loadInventory } = await import('./db.js');
            await loadInventory();
            if (state.onRenderSalesHistory) state.onRenderSalesHistory();
            renderHistorialCombos(); renderTarjetasCombos();
            await mostrarAlerta(`¡Combo "${combo.nombre}" vendido!\n$${precioFmt}`, 'success');
        }
    } catch(e) { await mostrarAlerta('Error al vender el combo.\n' + (e.message || ''), 'error'); }
}

function crearDOMTicketCombo(sale, esDeHoy) {
    const div = document.createElement('div');
    div.className = 'venta-ticket venta-ticket-combo';
    const totalFmt = Number(sale.total).toLocaleString('es-CO');
    const horaStr  = sale.date ? (sale.date.split(',')[1] || sale.date).trim() : '';
    let itemsHtml = '<ul class="ticket-items-list">';
    if (sale.items?.length) sale.items.forEach(i => { itemsHtml += `<li class="ticket-item-row"><span class="ticket-item-name">${i.qty}x ${i.name}</span><span class="ticket-item-sub">$${Number(i.subtotal).toLocaleString('es-CO')}</span></li>`; });
    else itemsHtml += '<li>Sin detalle.</li>';
    itemsHtml += '</ul>';
    div.innerHTML = `
        <div class="venta-ticket-header">
            <div class="ticket-header-left">
                <span class="ticket-badge ticket-badge-combo">Combo</span>
                <strong class="ticket-numero">${sale.id}</strong>
                <span class="fecha-venta">${horaStr}</span>
            </div>
            <div class="ticket-header-right">
                <strong class="ticket-total">$${totalFmt}</strong>
                <button class="btn-eliminar-ticket" onclick="eliminarTicket(${sale.globalId}); event.stopPropagation();">Eliminar</button>
                <span class="ticket-toggle-arrow">Ver detalles ▼</span>
            </div>
        </div>
        <div class="venta-ticket-details">${itemsHtml}</div>`;
    div.querySelector('.venta-ticket-header').addEventListener('click', () => {
        const det = div.querySelector('.venta-ticket-details');
        const arr = div.querySelector('.ticket-toggle-arrow');
        const open = det.style.display === 'block';
        det.style.display = open ? 'none' : 'block';
        if (arr) arr.textContent = open ? 'Ver detalles ▼' : 'Ocultar ▲';
    });
    return div;
}

export function renderHistorialCombos() {
    const hoy = new Date().toLocaleDateString();
    const normFecha = f => {
        if (!f) return '';
        const p = String(f).split('/');
        return p.length === 3 ? new Date(+p[2], +p[1]-1, +p[0]).toLocaleDateString() : f;
    };
    const ventasCombo = state.sales.filter(s => s.id && String(s.id).startsWith('COMBO-'));

    const listaHoy = document.getElementById('listaCombosHoy');
    if (listaHoy) {
        listaHoy.innerHTML = '';
        const hoyCombo = ventasCombo.filter(s => { const f = normFecha(s.fechaLimpia) || (s.date ? s.date.split(',')[0].trim() : ''); return f === hoy; });
        if (!hoyCombo.length) { listaHoy.innerHTML = '<p>Aún no hay combos vendidos hoy.</p>'; }
        else [...hoyCombo].reverse().forEach(s => listaHoy.appendChild(crearDOMTicketCombo(s, true)));
    }

    const acordeon = document.getElementById('listaHistorialCombosAcordeon');
    if (!acordeon) return;
    acordeon.innerHTML = '';
    const pasados = {};
    ventasCombo.forEach(s => {
        const f = normFecha(s.fechaLimpia || (s.date ? s.date.split(',')[0].trim() : ''));
        if (f && f !== hoy) { if (!pasados[f]) pasados[f] = []; pasados[f].push(s); }
    });
    const fechas = Object.keys(pasados).sort((a, b) => new Date(b.split('/').reverse().join('-')) - new Date(a.split('/').reverse().join('-')));
    if (!fechas.length) { acordeon.innerHTML = '<p style="color:#666">No hay combos vendidos en días anteriores.</p>'; return; }
    fechas.forEach(fecha => {
        const del = pasados[fecha], total = del.reduce((s, v) => s + v.total, 0);
        const btn = document.createElement('div'); btn.className = 'acordeon-fecha';
        btn.innerHTML = `<span>${fecha} (${del.length} combos)</span> <strong>$${total.toLocaleString('es-CO')} ▼</strong>`;
        const cont = document.createElement('div'); cont.className = 'acordeon-contenido'; cont.style.display = 'none';
        [...del].reverse().forEach(s => cont.appendChild(crearDOMTicketCombo(s, false)));
        btn.addEventListener('click', () => { const open = cont.style.display === 'block'; cont.style.display = open ? 'none' : 'block'; btn.querySelector('strong').innerHTML = `$${total.toLocaleString('es-CO')} ${open ? '▼' : '▲'}`; });
        acordeon.appendChild(btn); acordeon.appendChild(cont);
    });
}

export function renderCombos() {
    const inputBuscar = document.getElementById('inputBuscarProductoCombo');
    const autoList    = document.getElementById('combo-autocomplete-list');
    if (inputBuscar && !inputBuscar._ev) {
        inputBuscar._ev = true;
        inputBuscar.addEventListener('input', () => {
            const q = inputBuscar.value.trim().toLowerCase();
            if (autoList) autoList.innerHTML = '';
            if (!q) { autoList?.classList.remove('visible'); return; }
            const res = state.inventory.filter(p => (p.nombre||'').toLowerCase().includes(q) || (p.codigoBarras||'').includes(q)).slice(0, 8);
            if (!res.length) { autoList?.classList.remove('visible'); return; }
            res.forEach(p => {
                const item = document.createElement('div'); item.className = 'combo-auto-item';
                const disp = p.cantidad ?? 0;
                item.innerHTML = `<img class="combo-auto-thumb" src="${p.imagen||'https://via.placeholder.com/34'}" alt=""><div class="combo-auto-info"><span class="combo-auto-nombre">${p.nombre}</span><span class="combo-auto-precio">$${(p.precio||0).toLocaleString('es-CO')}</span><span class="combo-auto-stock" style="font-size:0.78em;font-weight:700;color:${disp>0?'#2e7d32':'#c62828'}">${disp>0?disp+' disponibles':'Sin stock'}</span></div>`;
                item.onclick = () => { agregarProductoAlCombo({ id: p.id, nombre: p.nombre, precio: p.precio||0, imagen: p.imagen||'' }); inputBuscar.value = ''; autoList?.classList.remove('visible'); };
                autoList?.appendChild(item);
            });
            autoList?.classList.add('visible');
        });
        document.addEventListener('click', e => { if (!autoList?.contains(e.target) && e.target !== inputBuscar) autoList?.classList.remove('visible'); });
    }

    loadCombos().then(() => renderTarjetasCombos());
}

export function initCombos() {
    const btnGuardar = document.getElementById('btnGuardarCombo');
    const btnLimpiar = document.getElementById('btnLimpiarCombo');
    const btnHistCombos = document.getElementById('btnVerHistorialCombos');
    const btnVolverHistCombos = document.getElementById('btnVolverDesdeHistorialCombos');

    if (btnGuardar)        btnGuardar.addEventListener('click', handleGuardarCombo);
    if (btnLimpiar)        btnLimpiar.addEventListener('click', limpiarFormCombo);
    if (btnHistCombos)     btnHistCombos.addEventListener('click', () => { renderHistorialCombos(); showScreen('pantalla-historial-combos'); });
    if (btnVolverHistCombos) btnVolverHistCombos.addEventListener('click', () => showScreen('pantalla-combos'));

    state.onRenderCombos         = renderCombos;
    state.onRenderHistorialCombos = renderHistorialCombos;
    state.onCombosLoaded         = renderTarjetasCombos;
}
