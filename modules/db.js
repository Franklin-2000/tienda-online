// ============================================================
// db.js — Todas las operaciones con Supabase (capa de datos)
// ============================================================
import { supabaseClient } from './config.js';
import { state } from './state.js';
import { mostrarAlerta } from './alertas.js';

// ── INVENTARIO ───────────────────────────────────────────────
export async function loadInventory(userId = null) {
    let uid = userId || state.currentUserId;
    if (!uid) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) return;
        uid = session.user.id;
    }
    // Mostrar caché local mientras llega Supabase
    if (state.onInventoryLoaded) await state.onInventoryLoaded('cache');

    const { data, error } = await supabaseClient
        .from('productos')
        .select('*')
        .eq('user_id', uid);

    if (error) {
        console.error('Error cargando inventario:', error);
        await mostrarAlerta('No se pudo cargar el inventario.\n' + (error.message || 'Verifica tu conexión.'), 'error');
    } else {
        state.inventory = data;
        if (state.onInventoryLoaded) await state.onInventoryLoaded('supabase');
    }
}

async function _compressImage(file, maxW = 600, maxH = 600, quality = 0.80) {
    if (!file.type.startsWith('image/')) return file;
    const bmp = await createImageBitmap(file);
    const ratio = Math.min(maxW / bmp.width, maxH / bmp.height, 1);
    const w = Math.round(bmp.width * ratio), h = Math.round(bmp.height * ratio);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', quality));
    if (!blob) return file;
    const compressed = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), { type: 'image/jpeg' });
    return compressed.size < file.size ? compressed : file;
}

export async function subirImagenSupabase(archivo) {
    const archivoParaSubir = await _compressImage(archivo);
    const extension  = archivoParaSubir.name.split('.').pop();
    const nombreUnico = `img_${Date.now()}.${extension}`;
    const rutaArchivo = `${state.currentUserId}/${nombreUnico}`;

    const { error } = await supabaseClient.storage.from('productos').upload(rutaArchivo, archivoParaSubir);
    if (error) { const msg = error.message || error.details || 'No se pudo subir la imagen.'; throw new Error(msg); }

    const { data: publicUrlData } = supabaseClient.storage.from('productos').getPublicUrl(rutaArchivo);
    return publicUrlData.publicUrl;
}

// ── VENTAS ───────────────────────────────────────────────────
export async function saveSale(saleData) {
    const { data: ventaInsertada, error: errorVenta } = await supabaseClient
        .from('ventas')
        .insert([{
            global_id:     saleData.globalId,
            numero_ticket: saleData.id,
            total:         saleData.total,
            fecha:         saleData.date,
            fecha_limpia:  saleData.fechaLimpia,
            user_id:       state.currentUserId,
        }])
        .select()
        .single();

    if (errorVenta) { console.error('Error guardando venta:', errorVenta); throw errorVenta; }

    const itemsParaInsertar = saleData.items.map(item => ({
        venta_id:   ventaInsertada.id,
        product_id: item.productId,
        nombre:     item.name,
        cantidad:   item.qty,
        precio:     item.price,
        subtotal:   item.subtotal,
        user_id:    state.currentUserId,
    }));

    const { error: errorItems } = await supabaseClient.from('items_venta').insert(itemsParaInsertar);
    if (errorItems) { console.error('Error guardando items:', errorItems); throw errorItems; }

    return ventaInsertada;
}

export async function loadSales() {
    if (!state.currentUserId) return;

    const { data: ventasData, error } = await supabaseClient
        .from('ventas')
        .select(`id, global_id, numero_ticket, total, fecha, fecha_limpia,
                 items_venta(id, product_id, nombre, cantidad, precio, subtotal)`)
        .eq('user_id', state.currentUserId)
        .order('global_id', { ascending: false });

    if (error) {
        console.error('Error cargando ventas:', error);
        await mostrarAlerta('No se pudo cargar el historial.\n' + (error.message || ''), 'error');
        return;
    }

    state.sales = ventasData.map(v => ({
        supabaseId:  v.id,
        globalId:    v.global_id,
        id:          v.numero_ticket,
        total:       v.total,
        date:        v.fecha,
        fechaLimpia: v.fecha_limpia,
        items: v.items_venta.map(i => ({
            itemSupabaseId: i.id,
            productId:  i.product_id,
            name:       i.nombre,
            qty:        i.cantidad,
            price:      i.precio,
            subtotal:   i.subtotal,
        })),
    }));

    if (state.onSalesLoaded) state.onSalesLoaded();
}

export async function deleteSaleFromSupabase(ticketGlobalId) {
    const venta = state.sales.find(s => s.globalId === ticketGlobalId);
    if (!venta) return;
    const { error } = await supabaseClient.from('ventas').delete().eq('id', venta.supabaseId);
    if (error) { console.error('Error eliminando venta:', error); throw error; }
}

export async function generarNumeroTicket() {
    const _n = new Date();
    const fechaActual = `${_n.getFullYear()}-${String(_n.getMonth()+1).padStart(2,'0')}-${String(_n.getDate()).padStart(2,'0')}`;

    const { data, error } = await supabaseClient
        .from('contador_tickets')
        .select('*')
        .eq('user_id', state.currentUserId)
        .single();

    let nuevoContador;
    if (error || !data) {
        nuevoContador = 1;
        await supabaseClient.from('contador_tickets').insert([{ user_id: state.currentUserId, ultima_fecha: fechaActual, contador_diario: nuevoContador }]);
    } else if (data.ultima_fecha !== fechaActual) {
        nuevoContador = 1;
        await supabaseClient.from('contador_tickets').update({ ultima_fecha: fechaActual, contador_diario: nuevoContador }).eq('user_id', state.currentUserId);
    } else {
        nuevoContador = data.contador_diario + 1;
        await supabaseClient.from('contador_tickets').update({ contador_diario: nuevoContador }).eq('user_id', state.currentUserId);
    }
    return nuevoContador;
}

export async function generarNumeroCombo() {
    const _n = new Date();
    const fechaHoy = `${String(_n.getDate()).padStart(2,'0')}/${String(_n.getMonth()+1).padStart(2,'0')}/${_n.getFullYear()}`;
    const { data } = await supabaseClient
        .from('ventas')
        .select('numero_ticket')
        .eq('user_id', state.currentUserId)
        .eq('fecha_limpia', fechaHoy)
        .ilike('numero_ticket', 'COMBO-%');

    let maxNum = 0;
    for (const row of (data || [])) {
        const m = String(row.numero_ticket || '').match(/^COMBO-(?:ONLINE-)?(\d+)/);
        if (m) { const n = parseInt(m[1], 10); if (n > maxNum) maxNum = n; }
    }
    return maxNum + 1;
}

// ── COMBOS ───────────────────────────────────────────────────
export async function loadCombos() {
    if (!state.currentUserId) return;
    const { data, error } = await supabaseClient
        .from('combos')
        .select('*, combo_productos(*)')
        .eq('user_id', state.currentUserId)
        .order('created_at', { ascending: false });
    if (!error && data) {
        state.combos = data;
        if (state.onCombosLoaded) state.onCombosLoaded();
    }
}

export async function saveCombo(combo) {
    const { data: comboInsertado, error: err1 } = await supabaseClient
        .from('combos')
        .insert([{ nombre: combo.nombre, descripcion: combo.descripcion, precio: combo.precio, precio_suma: combo.precioSuma, stock: combo.stock ?? 0, user_id: state.currentUserId }])
        .select()
        .single();
    if (err1) throw err1;

    if (combo.productos && combo.productos.length > 0) {
        const prods = combo.productos.map(p => ({ combo_id: comboInsertado.id, producto_id: p.id, nombre: p.nombre, precio: p.precio, cantidad: p.cantidad || 1 }));
        const { error: err2 } = await supabaseClient.from('combo_productos').insert(prods);
        if (err2) throw err2;
    }
    return comboInsertado;
}

export async function deleteComboFromSupabase(comboId) {
    const { error } = await supabaseClient.from('combos').delete().eq('id', comboId);
    if (error) throw error;
}

// ── PEDIDOS ONLINE ───────────────────────────────────────────
export async function cargarPedidosAdmin() {
    if (!state.currentUserId) return;
    const { data, error } = await supabaseClient
        .from('pedidos')
        .select(`*, items_pedido(id, producto_id, combo_id, nombre, cantidad, precio, subtotal)`)
        .eq('admin_user_id', state.currentUserId)
        .order('id', { ascending: false });

    if (error) { console.error('Error cargando pedidos:', error); return; }
    state.pedidosAdmin = data || [];
}

export async function deletePedidoFromSupabase(pedidoId) {
    const { error } = await supabaseClient.from('pedidos').delete().eq('id', pedidoId);
    if (error) throw error;
}

export async function updateStockEnSupabase(productoId, nuevaCantidad) {
    const { error } = await supabaseClient
        .from('productos')
        .update({ cantidad: nuevaCantidad })
        .eq('id', productoId);
    if (error) console.error('Error actualizando stock:', error);
}
