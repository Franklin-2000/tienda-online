// ============================================================
// inventario.js — CRUD de productos, render, búsqueda, exportar/importar
// ============================================================
import { supabaseClient } from './config.js';
import { state } from './state.js';
import { mostrarAlerta, mostrarConfirm } from './alertas.js';
import { loadInventory, subirImagenSupabase } from './db.js';
import { iniciarEscaner } from './escaner.js';
import { showScreen } from './navegacion.js';

// ── Referencias DOM ──────────────────────────────────────────
const pantallaInventario       = document.getElementById('pantalla-INVENTARIO');
const contenedorProductos      = document.getElementById('contenedorProductos');
const templateTarjetaProducto  = document.getElementById('template-tarjeta-producto');
const totalProductosCountEl    = document.getElementById('totalProductosCount');

const inputProductoImagen      = document.getElementById('inputProductoImagen');
const previewProductoImagen    = document.getElementById('previewProductoImagen');
const btnSeleccionarImagen     = document.getElementById('btnSeleccionarImagen');
const inputCodigoBarras        = document.getElementById('inputCodigoBarras');
const inputNombreProducto      = document.getElementById('inputNombreProducto');
const inputPrecioProducto      = document.getElementById('inputPrecioProducto');
const inputCantidadProducto    = document.getElementById('inputCantidadProducto');
const inputCategoriaProducto   = document.getElementById('inputCategoriaProducto');
const btnGuardarProducto       = document.getElementById('btnGuardarProducto');
const btnLimpiarFormulario     = document.getElementById('btnLimpiarFormulario');
const inputBuscarProducto      = document.getElementById('inputBuscarProducto');
const btnBuscarProducto        = document.getElementById('btnBuscarProducto');
const btnLimpiarBusqueda       = document.getElementById('btnLimpiarBusqueda');
const btnExportarDatos         = document.getElementById('btnExportarDatos');
const btnImportarDatos         = document.getElementById('btnImportarDatos');
const inputImportarDatos       = document.getElementById('inputImportarDatos');
const btnEscanearInventario    = document.getElementById('btnEscanearInventario');

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES  = ['image/jpeg', 'image/png', 'image/webp'];

const CATEGORIA_LABELS = {
    Perecederos: 'Perecederos', Abarrotes: 'Abarrotes', Bebidas: 'Bebidas',
    Congelados: 'Congelados', Hogar: 'Hogar', Higiene: 'Higiene', Otras: 'Otras',
};

// ── Render ───────────────────────────────────────────────────
export function renderProducts(productsToRender = null) {
    if (!contenedorProductos) return;

    let base = productsToRender !== null ? productsToRender : state.inventory;
    let lista = base;
    if (productsToRender === null && state.categoriaActivaFiltro && state.categoriaActivaFiltro !== 'todas') {
        lista = base.filter(p => p.categoria === state.categoriaActivaFiltro);
    }
    lista = [...lista].sort((a, b) => (b.cantidad || 0) - (a.cantidad || 0));

    contenedorProductos.innerHTML = '';
    if (lista.length === 0) {
        const msg = inputBuscarProducto?.value.trim()
            ? 'No se encontraron productos que coincidan con la búsqueda.'
            : state.categoriaActivaFiltro !== 'todas'
                ? 'No hay productos en esta categoría aún.'
                : 'El inventario está vacío. ¡Añade algunos productos!';
        contenedorProductos.innerHTML = `<p style="text-align:center;width:100%;margin-top:20px;font-size:1.2em;color:#555;">${msg}</p>`;
        return;
    }

    lista.forEach(product => {
        const clone  = templateTarjetaProducto.content.cloneNode(true);
        const card   = clone.querySelector('.tarjeta-producto');
        card.dataset.id = product.id;

        const img = clone.querySelector('.producto-imagen');
        img.alt = `Imagen de ${product.nombre}`;
        if (product.imagen) { img.src = product.imagen; img.onerror = () => img.removeAttribute('src'); }

        clone.querySelector('.producto-nombre').textContent  = product.nombre;
        const codEl = clone.querySelector('.producto-codigo');
        if (codEl) codEl.textContent = product.codigoBarras ? `Cod: ${product.codigoBarras}` : 'Cod: N/A';
        clone.querySelector('.producto-precio').textContent   = `$${product.precio}`;
        clone.querySelector('.producto-cantidad').textContent = `Unidades disponibles: ${product.cantidad}`;

        if (product.categoria) {
            const badge = document.createElement('span');
            badge.className   = 'badge-categoria';
            badge.textContent = CATEGORIA_LABELS[product.categoria] || product.categoria;
            card.insertBefore(badge, card.querySelector('.producto-nombre'));
        }
        contenedorProductos.appendChild(clone);
    });

    if (state.onUpdateSalesDropdown) state.onUpdateSalesDropdown();
}

export function updateProductCount() {
    if (totalProductosCountEl) totalProductosCountEl.textContent = state.inventory.length;
}

// ── Imagen ───────────────────────────────────────────────────
export async function compressImageFile(file, maxWidth = 600, maxHeight = 600, quality = 0.80) {
    if (!file.type.startsWith('image/')) return file;
    const bmp = await createImageBitmap(file);
    const ratio = Math.min(maxWidth / bmp.width, maxHeight / bmp.height, 1);
    const w = Math.round(bmp.width * ratio), h = Math.round(bmp.height * ratio);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', quality));
    if (!blob) return file;
    const compressed = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), { type: 'image/jpeg' });
    return compressed.size < file.size ? compressed : file;
}

function handleImageSelection(event) {
    const archivo = event.target.files[0];
    if (!archivo) { clearImagePreview(); return; }
    if (!ALLOWED_IMAGE_TYPES.includes(archivo.type)) {
        mostrarAlerta('El archivo debe ser una imagen JPG, PNG o WEBP.', 'warn');
        clearImagePreview(); return;
    }
    if (archivo.size > MAX_IMAGE_SIZE_BYTES) {
        mostrarAlerta('La imagen excede el límite de 2 MB.', 'warn');
        clearImagePreview(); return;
    }
    state.archivoImagenFisico = archivo;
    const reader = new FileReader();
    reader.onload = e => {
        previewProductoImagen.src = e.target.result;
        previewProductoImagen.style.display = 'block';
        inputCodigoBarras.focus();
    };
    reader.onerror = () => { mostrarAlerta('No se pudo leer el archivo.', 'error'); clearImagePreview(); };
    reader.readAsDataURL(archivo);
}

function clearImagePreview() {
    if (previewProductoImagen) { previewProductoImagen.src = ''; previewProductoImagen.style.display = 'none'; }
    if (inputProductoImagen)   inputProductoImagen.value = '';
    state.archivoImagenFisico = null;
}

// ── Formulario ───────────────────────────────────────────────
export function resetFormAndMode() {
    if (inputCodigoBarras)     inputCodigoBarras.value     = '';
    if (inputNombreProducto)   inputNombreProducto.value   = '';
    if (inputPrecioProducto)   inputPrecioProducto.value   = '';
    if (inputCantidadProducto) inputCantidadProducto.value = '';
    if (inputCategoriaProducto) inputCategoriaProducto.value = '';
    clearImagePreview();
    state.editingProductId = null;
    if (btnGuardarProducto)   btnGuardarProducto.textContent  = 'Añadir Producto';
    if (btnLimpiarFormulario) btnLimpiarFormulario.textContent = 'Limpiar';
}

let _guardandoProducto = false;
async function handleSaveProduct() {
    if (_guardandoProducto || btnGuardarProducto?.disabled) return;
    _guardandoProducto = true;

    const codigo   = inputCodigoBarras?.value.trim()      || '';
    const nombre   = inputNombreProducto?.value.trim()    || '';
    const precio   = parseInt(inputPrecioProducto?.value);
    const cantidad = parseInt(inputCantidadProducto?.value);
    const categoria = inputCategoriaProducto?.value || '';

    if (!nombre)                                         { _guardandoProducto = false; await mostrarAlerta('Ingresa el nombre del producto.', 'warn');     return; }
    if (isNaN(precio) || precio <= 0)                    { _guardandoProducto = false; await mostrarAlerta('Ingresa un precio válido.', 'warn');           return; }
    if (isNaN(cantidad) || cantidad <= 0)                { _guardandoProducto = false; await mostrarAlerta('Ingresa una cantidad válida.', 'warn');        return; }
    if (!categoria)                                      { _guardandoProducto = false; await mostrarAlerta('Selecciona una categoría.', 'warn');           return; }

    // ── MODO OFFLINE ────────────────────────────────────────────
    if (state.modoOffline && state.onGuardarProductoOffline) {
        let urlImagen = '';
        if (state.archivoImagenFisico) {
            urlImagen = await new Promise(res => {
                const reader = new FileReader();
                reader.onload = e => res(e.target.result);
                reader.readAsDataURL(state.archivoImagenFisico);
            });
        } else if (state.editingProductId !== null) {
            const prod = state.inventory.find(p => p.id.toString() === state.editingProductId.toString());
            urlImagen = prod?.imagen || '';
        }
        await state.onGuardarProductoOffline({ codigoBarras: codigo, nombre, precio, cantidad, imagen: urlImagen, categoria });
        resetFormAndMode();
        _guardandoProducto = false;
        await mostrarAlerta(`Producto "${nombre}" guardado localmente.\nSe subirá a Supabase al sincronizar.`, 'success');
        return;
    }

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) { _guardandoProducto = false; await mostrarAlerta('Debes iniciar sesión.', 'warn'); showScreen('pantalla-login'); return; }

    const textoOrig = btnGuardarProducto.textContent;
    btnGuardarProducto.textContent = 'Subiendo...';
    btnGuardarProducto.disabled    = true;

    try {
        let urlImagen = '';
        if (state.editingProductId !== null && !state.archivoImagenFisico) {
            const prod = state.inventory.find(p => p.id.toString() === state.editingProductId.toString());
            urlImagen = prod?.imagen || '';
        } else if (state.archivoImagenFisico) {
            urlImagen = await subirImagenSupabase(state.archivoImagenFisico);
        } else {
            await mostrarAlerta('Selecciona una imagen para el producto.', 'warn');
            btnGuardarProducto.textContent = textoOrig;
            btnGuardarProducto.disabled    = false;
            return;
        }

        if (state.editingProductId !== null) {
            const { error } = await supabaseClient.from('productos')
                .update({ codigoBarras: codigo, nombre, precio, cantidad, imagen: urlImagen, categoria })
                .eq('id', state.editingProductId);
            if (error) throw error;
            await mostrarAlerta(`¡Producto "${nombre}" actualizado!`, 'success');
        } else {
            // Verificar duplicado por código de barras
            if (codigo) {
                const duplicado = state.inventory.find(p => p.codigoBarras && p.codigoBarras === codigo);
                if (duplicado) {
                    const ok = await mostrarConfirm(`Ya existe un producto con el código "${codigo}".\n¿Deseas añadirlo de todas formas?`, 'warn');
                    if (!ok) { btnGuardarProducto.textContent = textoOrig; btnGuardarProducto.disabled = false; _guardandoProducto = false; return; }
                }
            }
            const { error } = await supabaseClient.from('productos').insert([{
                codigoBarras: codigo, nombre, precio, cantidad, imagen: urlImagen, user_id: user.id, categoria,
            }]);
            if (error) throw error;
            await mostrarAlerta(`¡Producto "${nombre}" añadido!`, 'success');
        }

        resetFormAndMode();
        await loadInventory();
    } catch (err) {
        const msg = err?.message || err?.details || JSON.stringify(err);
        await mostrarAlerta(`Error al guardar el producto:\n${msg}`, 'error');
    } finally {
        _guardandoProducto             = false;
        btnGuardarProducto.textContent = textoOrig;
        btnGuardarProducto.disabled    = false;
    }
}

function editProduct(productId) {
    const p = state.inventory.find(prod => prod.id.toString() === productId.toString());
    if (!p) return;
    state.editingProductId = productId;
    if (inputCodigoBarras)    inputCodigoBarras.value    = p.codigoBarras || '';
    if (inputNombreProducto)  inputNombreProducto.value  = p.nombre;
    if (inputPrecioProducto)  inputPrecioProducto.value  = p.precio;
    if (inputCantidadProducto) inputCantidadProducto.value = p.cantidad;
    if (inputCategoriaProducto) inputCategoriaProducto.value = p.categoria || '';
    if (previewProductoImagen) { previewProductoImagen.src = p.imagen; previewProductoImagen.style.display = 'block'; }
    state.imagenProductoActual = p.imagen;
    if (btnGuardarProducto)   btnGuardarProducto.textContent  = 'Guardar Cambios';
    if (btnLimpiarFormulario) btnLimpiarFormulario.textContent = 'Cancelar Edición';
    pantallaInventario?.querySelector('.formulario-producto-nuevo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
window.editarProducto = editProduct;

// ── Búsqueda ─────────────────────────────────────────────────
export function normalizeStringForSearch(text) {
    return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, '');
}

export function searchProducts() {
    const rawTerm  = inputBuscarProducto?.value.trim() || '';
    const termNorm = normalizeStringForSearch(rawTerm);
    if (termNorm === '') { state.searchResults = null; renderProducts(); return; }

    state.searchResults = state.inventory
        .map(p => {
            const nombre = normalizeStringForSearch(p.nombre);
            const codigo = p.codigoBarras || '';
            let score = 0;
            if (nombre === termNorm)               score = 4;
            else if (nombre.startsWith(termNorm))  score = 3;
            else if (nombre.includes(termNorm))    score = 2;
            else if (codigo.includes(rawTerm))     score = 1;
            return { p, score };
        })
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .map(({ p }) => p);

    renderProducts(state.searchResults);
}

export function clearSearch() {
    if (inputBuscarProducto) inputBuscarProducto.value = '';
    state.searchResults = null;
    renderProducts();
}

// ── Exportar ─────────────────────────────────────────────────
async function exportInventoryToExcel() {
    if (state.inventory.length === 0) { await mostrarAlerta('El inventario está vacío.', 'warn'); return; }
    if (typeof ExcelJS === 'undefined') { await mostrarAlerta('Librería de exportación no disponible.', 'error'); return; }

    const fileDate = new Date().toISOString().slice(0, 10);
    if (!await mostrarConfirm(`¿Exportar inventario como "inventario_${fileDate}.xlsx"?`, 'info')) return;

    try {
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Inventario');
        ws.columns = [
            { header: 'Código',              key: 'codigo',    width: 22 },
            { header: 'Nombre del Producto', key: 'nombre',    width: 44 },
            { header: 'Categoría',           key: 'categoria', width: 22 },
            { header: 'Precio Unitario',     key: 'precio',    width: 18 },
            { header: 'Cantidad',            key: 'cantidad',  width: 12 },
            { header: 'Valor Total',         key: 'valor',     width: 22 },
        ];
        ws.getRow(1).font = { bold: true };

        let totalVal = 0;
        state.inventory.forEach(p => {
            const total = Number(p.precio) * Number(p.cantidad);
            totalVal += total;
            ws.addRow({ codigo: p.codigoBarras || 'N/A', nombre: p.nombre, categoria: p.categoria || 'Sin categoría', precio: Number(p.precio), cantidad: Number(p.cantidad), valor: total });
        });
        ws.getColumn('precio').numFmt = '#,##0';
        ws.getColumn('valor').numFmt  = '#,##0';
        const totalRowNum = ws.rowCount + 1;
        const tr = ws.addRow({ codigo: 'VALOR TOTAL DEL INVENTARIO', nombre: '', categoria: '', precio: '', cantidad: '', valor: totalVal });
        tr.font = { bold: true }; tr.getCell('valor').numFmt = '#,##0';
        ws.mergeCells(`A${totalRowNum}:E${totalRowNum}`);

        const buffer = await wb.xlsx.writeBuffer();
        const url    = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
        const a      = Object.assign(document.createElement('a'), { href: url, download: `inventario_${fileDate}.xlsx` });
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        await mostrarAlerta('¡Inventario exportado correctamente!', 'success');
    } catch (err) {
        await mostrarAlerta('Error al exportar: ' + (err.message || ''), 'error');
    }
}

// ── Importar ─────────────────────────────────────────────────
async function importarInventarioDesdeExcel(file) {
    if (!file) return;
    if (typeof XLSX === 'undefined') { await mostrarAlerta('Librería de importación no disponible.', 'error'); return; }

    const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '');
    const HEADER_MAP = {
        'nombre': 'nombre', 'nombredelproducto': 'nombre', 'producto': 'nombre',
        'precio': 'precio', 'preciounitario': 'precio',
        'cantidad': 'cantidad', 'stock': 'cantidad',
        'codigo': 'codigoBarras', 'codigodebarras': 'codigoBarras', 'barcode': 'codigoBarras',
        'categoria': 'categoria', 'category': 'categoria',
    };
    const CATS_VALIDAS = ['Perecederos','Abarrotes','Bebidas','Congelados','Hogar','Higiene','Otras'];

    try {
        const buffer  = await file.arrayBuffer();
        const wb      = XLSX.read(buffer, { type: 'array' });
        const rows    = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
        if (!rows.length) { await mostrarAlerta('El archivo está vacío.', 'warn'); return; }

        const headerMap = {};
        Object.keys(rows[0]).forEach(h => { const c = HEADER_MAP[norm(h)]; if (c) headerMap[h] = c; });

        const errores = [], validos = [];
        rows.forEach((row, i) => {
            const p = {};
            Object.entries(headerMap).forEach(([col, campo]) => { p[campo] = row[col]; });
            const fila = i + 2;
            if (!p.nombre?.trim()) { errores.push(`Fila ${fila}: falta el nombre.`); return; }
            const precio = parseFloat(String(p.precio || '').replace(/[^0-9.,-]/g, '').replace(',', '.'));
            if (isNaN(precio) || precio <= 0) { errores.push(`Fila ${fila}: precio inválido.`); return; }
            const cat = CATS_VALIDAS.find(c => norm(c) === norm(String(p.categoria || ''))) || null;
            validos.push({ nombre: String(p.nombre).trim(), precio, cantidad: Math.max(0, parseInt(p.cantidad) || 0), categoria: cat, codigoBarras: String(p.codigoBarras || '').trim() || null, user_id: state.currentUserId });
        });

        if (!validos.length) { await mostrarAlerta(`Sin productos válidos.\n${errores.slice(0,10).join('\n')}`, 'error'); return; }
        if (!await mostrarConfirm(`¿Importar ${validos.length} producto(s)?${errores.length ? `\n\n${errores.length} fila(s) con errores serán omitidas.` : ''}`, 'info')) return;

        for (let i = 0; i < validos.length; i += 50) {
            const { error } = await supabaseClient.from('productos').insert(validos.slice(i, i + 50));
            if (error) throw error;
        }
        await loadInventory();
        await mostrarAlerta(`✅ ${validos.length} producto(s) importados.${errores.length ? `\n⚠️ ${errores.length} fila(s) omitidas.` : ''}`, 'success');
    } catch (err) {
        await mostrarAlerta('Error al importar: ' + (err.message || ''), 'error');
    }
}

// ── Event listeners del módulo ───────────────────────────────
export function initInventario() {
    if (inputProductoImagen)  inputProductoImagen.addEventListener('change', handleImageSelection);
    if (btnSeleccionarImagen) btnSeleccionarImagen.addEventListener('click', e => { e.preventDefault(); inputProductoImagen.click(); });
    if (btnGuardarProducto)   btnGuardarProducto.addEventListener('click', handleSaveProduct);
    if (btnExportarDatos)     btnExportarDatos.addEventListener('click', exportInventoryToExcel);
    if (btnImportarDatos)     btnImportarDatos.addEventListener('click', () => inputImportarDatos.click());
    if (inputImportarDatos)   inputImportarDatos.addEventListener('change', e => { importarInventarioDesdeExcel(e.target.files[0]); inputImportarDatos.value = ''; });
    if (btnEscanearInventario) btnEscanearInventario.addEventListener('click', e => { e.preventDefault(); iniciarEscaner('inventario'); });

    if (btnLimpiarFormulario) {
        btnLimpiarFormulario.addEventListener('click', () => {
            if (state.editingProductId !== null) mostrarAlerta('Edición cancelada.', 'info');
            else clearSearch();
            resetFormAndMode();
        });
    }

    // Búsqueda
    if (btnBuscarProducto)  btnBuscarProducto.addEventListener('click', searchProducts);
    if (btnLimpiarBusqueda) btnLimpiarBusqueda.addEventListener('click', clearSearch);
    if (inputBuscarProducto) {
        inputBuscarProducto.addEventListener('input', searchProducts);
        inputBuscarProducto.addEventListener('keydown', e => {
            if (e.key !== 'Enter') return;
            e.preventDefault(); searchProducts();
            setTimeout(() => contenedorProductos.querySelector('.tarjeta-producto')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
        });
    }

    // Atajos de teclado en formulario
    const nextFocus = (from, to) => from?.addEventListener('keydown', e => {
        if (e.key === 'Enter' && pantallaInventario?.classList.contains('activa')) { e.preventDefault(); to?.focus(); }
    });
    nextFocus(inputCodigoBarras,   inputNombreProducto);
    nextFocus(inputNombreProducto, inputPrecioProducto);
    nextFocus(inputPrecioProducto, inputCategoriaProducto || inputCantidadProducto);
    if (inputCategoriaProducto) nextFocus(inputCategoriaProducto, inputCantidadProducto);
    if (inputCantidadProducto) {
        inputCantidadProducto.addEventListener('keydown', e => {
            if (e.key === 'Enter' && pantallaInventario?.classList.contains('activa')) { e.preventDefault(); if (!btnGuardarProducto.disabled) btnGuardarProducto.click(); }
        });
    }

    // Shift → guardar producto desde inventario
    document.addEventListener('keydown', e => {
        if (e.key === 'Shift' && !e.repeat && pantallaInventario?.classList.contains('activa') && btnGuardarProducto && !btnGuardarProducto.disabled) {
            btnGuardarProducto.click();
        }
    });

    // Delegación de clicks en tarjetas de productos (editar / borrar)
    if (contenedorProductos) {
        contenedorProductos.addEventListener('click', async event => {
            const card = event.target.closest('.tarjeta-producto');
            if (!card) return;
            const productId = card.dataset.id;

            if (event.target.classList.contains('btn-borrar-producto')) {
                if (!await mostrarConfirm('¿Eliminar este producto?', 'danger')) return;
                const { error } = await supabaseClient.from('productos').delete().eq('id', productId);
                if (!error) {
                    if (productId === state.editingProductId) resetFormAndMode();
                    await mostrarAlerta('Producto eliminado.', 'success');
                    await loadInventory();
                } else {
                    await mostrarAlerta('Error al eliminar el producto.', 'error');
                }
            } else if (event.target.classList.contains('btn-editar-producto')) {
                editProduct(productId);
            }
        });
    }

    // Registrar callbacks para navegacion.js
    state.onInventoryLoaded = async (fuente) => {
        if (fuente === 'cache') {
            // caché ya cargada en state.inventory por offline.js
            renderProducts();
            updateProductCount();
        } else {
            renderProducts();
            updateProductCount();
        }
    };
    state.onResetForm    = resetFormAndMode;
    state.onClearSearch  = clearSearch;
    state.onLoadInventory = loadInventory;

    // Exponer para modo offline
    window.renderProducts    = renderProducts;
    window.updateProductCount = updateProductCount;
}
