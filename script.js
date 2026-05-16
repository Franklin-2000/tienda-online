// ================================================================
// SISTEMA DE ALERTAS Y CONFIRMACIONES PERSONALIZADAS
// Enter = Aceptar / Escape = Cancelar
// ================================================================

// Inyectar estilos una sola vez
(function inyectarEstilosAlerta() {
    if (document.getElementById('__alerta-styles')) return;
    const style = document.createElement('style');
    style.id = '__alerta-styles';
    style.textContent = `
        @keyframes __fadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes __scaleIn { from { transform:scale(.85); opacity:0 } to { transform:scale(1); opacity:1 } }
        @keyframes __fadeOut { from { opacity:1 } to { opacity:0 } }

        .__alerta-overlay {
            position:fixed; inset:0;
            background:rgba(0,0,0,.5);
            display:flex; align-items:center; justify-content:center;
            z-index:99999;
            animation:__fadeIn .18s ease;
        }
        .__alerta-overlay.cerrando {
            animation:__fadeOut .18s ease forwards;
        }
        .__alerta-box {
            background:#fff;
            border-radius:20px;
            padding:32px 28px 24px;
            max-width:390px; width:92%;
            box-shadow:0 10px 50px rgba(0,0,0,.25);
            text-align:center;
            font-family:'Nunito', 'Segoe UI', sans-serif;
            animation:__scaleIn .2s cubic-bezier(.34,1.56,.64,1);
        }
        .__alerta-icono {
            font-size:2.4rem; margin-bottom:10px; display:block;
        }
        .__alerta-msg {
            margin:0 0 22px;
            font-size:1rem; color:#222;
            line-height:1.65; white-space:pre-line;
        }
        .__alerta-btns {
            display:flex; gap:10px; justify-content:center; flex-wrap:wrap;
        }
        .__alerta-btn {
            border:none; border-radius:50px;
            padding:11px 32px;
            font-size:.97rem; font-weight:700;
            cursor:pointer;
            font-family:'Nunito','Segoe UI',sans-serif;
            transition:transform .12s, box-shadow .12s;
            outline:none;
        }
        .__alerta-btn:focus { box-shadow:0 0 0 3px rgba(108,99,255,.4); }
        .__alerta-btn:hover { transform:scale(1.04); }
        .__alerta-btn-ok {
            background:linear-gradient(135deg,#6c63ff,#a78bfa);
            color:#fff;
            box-shadow:0 4px 14px rgba(108,99,255,.35);
        }
        .__alerta-btn-cancel {
            background:#f0f0f0; color:#444;
        }
        .__alerta-btn-danger {
            background:linear-gradient(135deg,#e53935,#f06292);
            color:#fff;
            box-shadow:0 4px 14px rgba(229,57,53,.3);
        }
    `;
    document.head.appendChild(style);
})();

/**
 * Muestra una alerta personalizada. Enter / click = Aceptar.
 * @param {string} mensaje
 * @param {'info'|'success'|'error'|'warn'} [tipo='info']
 * @returns {Promise<void>}
 */
function mostrarAlerta(mensaje, tipo = 'info') {
    return new Promise(resolve => {
        const iconos = { info:'ℹ️', success:'✅', error:'❌', warn:'⚠️' };
        const overlay = document.createElement('div');
        overlay.className = '__alerta-overlay';
        overlay.innerHTML = `
            <div class="__alerta-box">
                <span class="__alerta-icono">${iconos[tipo] || '📢'}</span>
                <p class="__alerta-msg">${mensaje}</p>
                <div class="__alerta-btns">
                    <button class="__alerta-btn __alerta-btn-ok" id="__btn-ok">Aceptar</button>
                </div>
            </div>`;

        const cerrar = () => {
            overlay.classList.add('cerrando');
            document.removeEventListener('keydown', onKey);
            setTimeout(() => { document.body.removeChild(overlay); resolve(); }, 170);
        };

        const onKey = (e) => {
            if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); cerrar(); }
        };

        overlay.querySelector('#__btn-ok').addEventListener('click', cerrar);
        document.addEventListener('keydown', onKey);
        document.body.appendChild(overlay);
        setTimeout(() => overlay.querySelector('#__btn-ok').focus(), 60);
    });
}

/**
 * Confirmación personalizada. Enter = Aceptar / Escape = Cancelar.
 * @param {string} mensaje
 * @param {'warn'|'danger'|'info'} [tipo='warn']
 * @returns {Promise<boolean>}
 */
function mostrarConfirm(mensaje, tipo = 'warn') {
    return new Promise(resolve => {
        const iconos = { warn:'⚠️', danger:'🗑️', info:'❓' };
        const overlay = document.createElement('div');
        overlay.className = '__alerta-overlay';
        overlay.innerHTML = `
            <div class="__alerta-box">
                <span class="__alerta-icono">${iconos[tipo] || '❓'}</span>
                <p class="__alerta-msg">${mensaje}</p>
                <div class="__alerta-btns">
                    <button class="__alerta-btn __alerta-btn-cancel" id="__btn-cancel">Cancelar</button>
                    <button class="__alerta-btn ${tipo === 'danger' ? '__alerta-btn-danger' : '__alerta-btn-ok'}" id="__btn-ok">Aceptar</button>
                </div>
            </div>`;

        const cerrar = (resultado) => {
            overlay.classList.add('cerrando');
            document.removeEventListener('keydown', onKey);
            setTimeout(() => { document.body.removeChild(overlay); resolve(resultado); }, 170);
        };

        const onKey = (e) => {
            if (e.key === 'Enter') { e.preventDefault(); cerrar(true); }
            if (e.key === 'Escape') { e.preventDefault(); cerrar(false); }
        };

        overlay.querySelector('#__btn-ok').addEventListener('click', () => cerrar(true));
        overlay.querySelector('#__btn-cancel').addEventListener('click', () => cerrar(false));
        document.addEventListener('keydown', onKey);
        document.body.appendChild(overlay);
        setTimeout(() => overlay.querySelector('#__btn-ok').focus(), 60);
    });
}

// ==========================================
// DETECCIÓN DE MODO PREVISUALIZACIÓN
// Detecta si corre dentro de un iframe previsualizador (ej: Yachai Codex)
// para saltar el checkAuthStatus() y mostrar pantalla-inicio directamente.
// ==========================================
const EN_IFRAME_PREVIEW = (() => {
    try {
        // Si no está en iframe, nunca es preview
        if (window.self === window.top) return false;
        // Iframe sin protocolo real (blob:, data:, file:, etc.)
        if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') return true;
        // Iframe con https pero el padre es inaccesible (cross-origin) → previsualizador
        try {
            // Si podemos leer window.top.location, es same-origin (dev local con live server)
            const _ = window.top.location.href;
            return false;
        } catch(e) {
            // Cross-origin iframe con https → Yachai Codex u otro previsualizador externo
            return true;
        }
    } catch(e) {
        return true;
    }
})();

// ==========================================
// CONFIGURACIÓN DE SUPABASE
const SB_URL = "https://mhnhfdtdpryrjaeaymsa.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1obmhmZHRkcHJ5cmphZWF5bXNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NDE3MjAsImV4cCI6MjA5MjExNzcyMH0.UINKafSUr0jI1_NGrh3Z-Uzhwi6Euqot3WQMsliteug";
const supabaseClient = supabase.createClient(SB_URL, SB_KEY);

// ==========================================
// REFERENCIAS AL DOM
// ==========================================
const pantallaLogin = document.querySelector("#pantalla-login");
const authMessageLogin = document.querySelector("#authMessageLogin");

const pantallaInicio = document.querySelector("#pantalla-inicio");
const pantallaInventario = document.querySelector("#pantalla-INVENTARIO");

// Botones menú principal
const btnInventario = document.querySelector("#btn-Inventario");
const btnVentas = document.querySelector("#btn-Ventas");

// Referencias para el Menú de Ventas
const pantallaMenuVentas = document.querySelector("#pantalla-menu-ventas");
const btnMenuVentasFisicas = document.querySelector("#btn-Menu-Ventas-Fisicas");
const btnMenuVentasOnline = document.querySelector("#btn-Menu-Ventas-Online");
const btnVolverInicioDesdeVentas = document.querySelector("#btnVolverInicioDesdeVentas");

// Referencias para Pantallas de Ventas
const pantallaVentasFisicas = document.querySelector("#pantalla-ventas-fisicas");
const pantallaVentasOnline = document.querySelector("#pantalla-ventas-online");
const btnVolverVentasFisicas = document.querySelector("#btnVolverVentasFisicas");
const btnVolverVentasOnline = document.querySelector("#btnVolverVentasOnline");

// Formulario Carrito Ventas
const inputBuscarProductVenta = document.querySelector("#inputBuscarProductVenta");
const btnEscanearVenta = document.querySelector("#btnEscanearVenta"); 
const selectProductoVenta = document.querySelector("#selectProductoVenta");
const inputCantidadVenta = document.querySelector("#inputCantidadVenta");
const btnAgregarAlCarrito = document.querySelector("#btnAgregarAlCarrito");
const listaCarrito = document.querySelector("#listaCarrito");
const totalCarritoPreview = document.querySelector("#totalCarritoPreview");
const btnLimpiarVenta = document.querySelector("#btnLimpiarVenta");
const btnRegistrarVenta = document.querySelector("#btnRegistrarVenta");

// Referencias Historial Ventas 
// Referencias Historial Ventas Físicas
const btnVerHistorial = document.querySelector("#btnVerHistorial");
const listaVentasHoy = document.querySelector("#listaVentasHoy");
const seccionHistorialAnterior = null; // movido a pantalla separada
const listaHistorialAcordeon = document.querySelector("#listaHistorialAcordeon");

// Referencias Historial Ventas Online
const btnVerHistorialOnline = document.querySelector("#btnVerHistorialOnline");
const seccionHistorialOnline = null; // movido a pantalla separada
// --------------------------------------

const inputProductoImagen = document.querySelector("#inputProductoImagen");
const previewProductoImagen = document.querySelector("#previewProductoImagen");
const btnSeleccionarImagen = document.querySelector("#btnSeleccionarImagen");

const inputCodigoBarras = document.querySelector("#inputCodigoBarras"); 
const btnEscanearInventario = document.querySelector("#btnEscanearInventario"); 
const inputNombreProducto = document.querySelector("#inputNombreProducto");
const inputPrecioProducto = document.querySelector("#inputPrecioProducto");
const inputCantidadProducto = document.querySelector("#inputCantidadProducto");
const inputCategoriaProducto = document.querySelector("#inputCategoriaProducto");

// Categoría activa para el filtro de inventario
let categoriaActivaFiltro = 'todas';
// Resultados de búsqueda activa (null = sin búsqueda activa)
let searchResults = null;

const btnGuardarProducto = document.querySelector("#btnGuardarProducto");
const btnLimpiarFormulario = document.querySelector("#btnLimpiarFormulario");

const contenedorProductos = document.querySelector("#contenedorProductos");
const templateTarjetaProducto = document.querySelector("#template-tarjeta-producto");

const btnVolverInicio = document.querySelector("#btnVolverInicio");

const inputBuscarProducto = document.querySelector("#inputBuscarProducto");
const btnBuscarProducto = document.querySelector("#btnBuscarProducto");
const btnLimpiarBusqueda = document.querySelector("#btnLimpiarBusqueda");
const totalProductosCountElement = document.querySelector("#totalProductosCount");
const btnExportarDatos = document.querySelector("#btnExportarDatos");
const btnLogout = document.querySelector("#btnLogout");

const btnGoogle = document.querySelector("#btnGoogle"); // Integrado desde Supabase

// Referencias Modal Scanner
const modalEscaner = document.querySelector("#modal-escaner");
const btnCerrarScanner = document.querySelector("#btnCerrarScanner");

// ==========================================
// VARIABLES GLOBALES
// ==========================================
let imagenProductoActual = '';
let inventory = []; 
let sales = []; 
let currentCart = []; 
let users = [];
let editingProductId = null; 
let currentLoggedInUserEmail = null; 
let currentUserId = null; // <-- NUEVO: guardamos el user_id en memoria
let html5QrcodeScanner = null; 
let objetivoEscaneo = ''; 

// ==========================================
// FUNCIONES DE NUBE SUPABASE — INVENTARIO
// ==========================================
async function loadInventory() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return; 

    const { data, error } = await supabaseClient
        .from('productos')
        .select('*')
        .eq('user_id', user.id); 

    if (error) {
        console.error("Error cargando inventario:", error);
    } else {
        inventory = data; 
        renderProducts();
        updateProductCount();
    }
}

// ==========================================
// FUNCIONES DE NUBE SUPABASE — VENTAS
// (Reemplazan completamente a localStorage)
// ==========================================

/**
 * Guarda una venta completa en Supabase.
 * Inserta en `ventas` (cabecera) e `items_venta` (líneas de detalle).
 */
async function saveSale(saleData) {
    const { data: ventaInsertada, error: errorVenta } = await supabaseClient
        .from('ventas')
        .insert([{
            global_id:    saleData.globalId,
            numero_ticket: saleData.id,
            total:         saleData.total,
            fecha:         saleData.date,
            fecha_limpia:  saleData.fechaLimpia,
            user_id:       currentUserId
        }])
        .select()
        .single();

    if (errorVenta) {
        console.error("Error guardando venta:", errorVenta);
        throw errorVenta;
    }

    const itemsParaInsertar = saleData.items.map(item => ({
        venta_id:   ventaInsertada.id,
        product_id: item.productId,
        nombre:     item.name,
        cantidad:   item.qty,
        precio:     item.price,
        subtotal:   item.subtotal,
        user_id:    currentUserId
    }));

    const { error: errorItems } = await supabaseClient
        .from('items_venta')
        .insert(itemsParaInsertar);

    if (errorItems) {
        console.error("Error guardando items de venta:", errorItems);
        throw errorItems;
    }

    return ventaInsertada;
}

/**
 * Carga todas las ventas del usuario desde Supabase,
 * incluyendo sus items, y las deja en la variable global `sales`.
 */
async function loadSales() {
    if (!currentUserId) return;

    const { data: ventasData, error: errorVentas } = await supabaseClient
        .from('ventas')
        .select(`
            id,
            global_id,
            numero_ticket,
            total,
            fecha,
            fecha_limpia,
            items_venta (
                id,
                product_id,
                nombre,
                cantidad,
                precio,
                subtotal
            )
        `)
        .eq('user_id', currentUserId)
        .order('global_id', { ascending: false });

    if (errorVentas) {
        console.error("Error cargando ventas:", errorVentas);
        return;
    }

    // Mapeamos al formato interno que usa el resto del código
    sales = ventasData.map(v => ({
        supabaseId: v.id,          // ID real de la fila en Supabase
        globalId:   v.global_id,
        id:         v.numero_ticket,
        total:      v.total,
        date:       v.fecha,
        fechaLimpia: v.fecha_limpia,
        items: v.items_venta.map(i => ({
            itemSupabaseId: i.id,
            productId:  i.product_id,
            name:       i.nombre,
            qty:        i.cantidad,
            price:      i.precio,
            subtotal:   i.subtotal
        }))
    }));

    renderSalesHistory();
}

/**
 * Elimina una venta (y sus items en cascada) de Supabase
 * usando el global_id como identificador único de negocio.
 */
async function deleteSaleFromSupabase(ticketGlobalId) {
    const venta = sales.find(s => s.globalId === ticketGlobalId);
    if (!venta) return;

    // Los items se eliminan en cascada por la FK (ON DELETE CASCADE).
    const { error } = await supabaseClient
        .from('ventas')
        .delete()
        .eq('id', venta.supabaseId);

    if (error) {
        console.error("Error eliminando venta:", error);
        throw error;
    }
}

/**
 * Obtiene o crea un contador diario de tickets desde Supabase.
 * Reemplaza los localStorage 'ultimaFechaVenta' y 'contadorDiarioVentas'.
 */
async function generarNumeroTicket() {
    const fechaActual = new Date().toLocaleDateString();

    const { data, error } = await supabaseClient
        .from('contador_tickets')
        .select('*')
        .eq('user_id', currentUserId)
        .single();

    let nuevoContador;

    if (error || !data) {
        // Primera vez: crear registro
        nuevoContador = 1;
        await supabaseClient.from('contador_tickets').insert([{
            user_id:        currentUserId,
            ultima_fecha:   fechaActual,
            contador_diario: nuevoContador
        }]);
    } else if (data.ultima_fecha !== fechaActual) {
        // Nuevo día: reiniciar
        nuevoContador = 1;
        await supabaseClient
            .from('contador_tickets')
            .update({ ultima_fecha: fechaActual, contador_diario: nuevoContador })
            .eq('user_id', currentUserId);
    } else {
        // Mismo día: incrementar
        nuevoContador = data.contador_diario + 1;
        await supabaseClient
            .from('contador_tickets')
            .update({ contador_diario: nuevoContador })
            .eq('user_id', currentUserId);
    }

    return nuevoContador.toString().padStart(4, '0');
}

// ==========================================
// LÓGICA DEL ESCÁNER DE CÓDIGOS DE BARRAS (Intacta)
// ==========================================
function iniciarEscaner(objetivo) {
    objetivoEscaneo = objetivo;
    modalEscaner.style.display = 'flex';
    
    html5QrcodeScanner = new Html5QrcodeScanner(
        "lector-camara", 
        { 
            fps: 10, 
            qrbox: {width: 250, height: 100}, 
            formatsToSupport: [
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.EAN_8,
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.UPC_A,
                Html5QrcodeSupportedFormats.UPC_E,
                Html5QrcodeSupportedFormats.QR_CODE
            ]
        },
        false
    );

    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
}

function detenerEscaner() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().catch(error => {
            console.error("Fallo al detener el escáner", error);
        });
    }
    modalEscaner.style.display = 'none';
}

function onScanSuccess(decodedText, decodedResult) {
    const codigoLimpio = decodedText.trim();
    detenerEscaner();
    
    if (objetivoEscaneo === 'inventario') {
        inputCodigoBarras.value = codigoLimpio;
        inputCodigoBarras.dispatchEvent(new Event('input', { bubbles: true }));
        inputNombreProducto.focus(); 
    } else if (objetivoEscaneo === 'ventas') {
        // Buscar producto por código exacto y seleccionarlo directo
        const productoEscaneado = inventory.find(p => p.codigoBarras && p.codigoBarras === codigoLimpio && p.cantidad > 0);
        if (productoEscaneado) {
            // Coincidencia exacta → ir directo al panel de cantidad sin mostrar dropdown
            inputBuscarProductVenta.value = productoEscaneado.nombre;
            seleccionarProductoVenta(productoEscaneado.id);
        } else {
            // No encontrado → mostrar el código en el input para búsqueda manual
            inputBuscarProductVenta.value = codigoLimpio;
            inputBuscarProductVenta.dispatchEvent(new Event('input', { bubbles: true }));
            updateSalesDropdown(codigoLimpio);
        }
    }
}

function onScanFailure(error) {
    // Escaneo continuo silencioso
}

btnEscanearInventario.addEventListener('click', (e) => {
    e.preventDefault();
    iniciarEscaner('inventario');
});

btnEscanearVenta.addEventListener('click', (e) => {
    e.preventDefault();
    iniciarEscaner('ventas');
});

btnCerrarScanner.addEventListener('click', (e) => {
    e.preventDefault();
    detenerEscaner();
});


// ==========================================
// FUNCIONES DE UI Y NAVEGACIÓN
// ==========================================

function showScreen(screenId, pushToHistory = true) {
    // Ocultar TODAS las pantallas — solo manipulamos la clase CSS
    // El CSS en style.css define display:none por defecto y display:flex/block con .activa
    document.querySelectorAll(
        '#pantalla-login, #pantalla-inicio, #pantalla-menu-ventas, ' +
        '#pantalla-INVENTARIO, #pantalla-ventas-fisicas, #pantalla-historial-fisicas, ' +
        '#pantalla-ventas-online, #pantalla-historial-online'
    ).forEach(function(el) {
        el.classList.remove('activa');
    });

    // Muestra la pantalla pedida y vuelve al tope
    function show(el) {
        if (!el) return;
        el.classList.add('activa');
        el.scrollTop = 0;
    }

    switch (screenId) {
        case 'pantalla-login': {
            show(pantallaLogin);
            break;
        }
        case 'pantalla-inicio': {
            show(pantallaInicio);
            clearSearch();
            resetFormAndMode();
            break;
        }
        case 'pantalla-INVENTARIO': {
            show(pantallaInventario);
            resetFormAndMode();
            categoriaActivaFiltro = 'todas';
            searchResults = null;
            document.querySelectorAll('.btn-categoria-filtro').forEach(function(b) { b.classList.remove('activo'); });
            var btnTodasCat = document.querySelector('.btn-categoria-filtro[data-categoria="todas"]');
            if (btnTodasCat) btnTodasCat.classList.add('activo');
            loadInventory();
            break;
        }
        case 'pantalla-menu-ventas': {
            show(pantallaMenuVentas);
            break;
        }
        case 'pantalla-ventas-fisicas': {
            show(pantallaVentasFisicas);
            categoriaActivaVenta = 'todas';
            productoSeleccionadoVentaId = null;
            document.querySelectorAll('.btn-cat-venta').forEach(function(b) { b.classList.remove('activo'); });
            var btnTodasVenta = document.querySelector('.btn-cat-venta[data-cat="todas"]');
            if (btnTodasVenta) btnTodasVenta.classList.add('activo');
            var panelCant = document.getElementById('panelCantidadVenta');
            if (panelCant) panelCant.style.display = 'none';
            updateSalesDropdown();
            break;
        }
        case 'pantalla-ventas-online': {
            show(pantallaVentasOnline);
            break;
        }
        case 'pantalla-historial-online': {
            var ph = document.querySelector('#pantalla-historial-online');
            show(ph);
            renderHistorialOnline();
            break;
        }
        case 'pantalla-historial-fisicas': {
            var phf = document.querySelector('#pantalla-historial-fisicas');
            show(phf);
            renderSalesHistory();
            break;
        }
    }

    if (pushToHistory) {
        try { history.pushState({ screen: screenId }, '', '#' + screenId); } catch(e) {}
    }
}

// Integración Autenticación Supabase
async function checkAuthStatus(pushToHistory = true) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (session) {
        currentLoggedInUserEmail = session.user.email;
        currentUserId = session.user.id;

        // ---- Perfil sidebar ----
        const meta = session.user.user_metadata || {};
        const avatarUrl = meta.avatar_url || meta.picture || '';
        const fullName  = meta.full_name || meta.name || currentLoggedInUserEmail;

        const avatarEl = document.getElementById('sidebar-user-avatar');
        const nameEl   = document.getElementById('sidebar-user-name');
        const emailEl  = document.getElementById('sidebar-user-email');

        if (avatarEl) avatarEl.src = avatarUrl || 'https://ui-avatars.com/api/?background=0c566c&color=fff&name=' + encodeURIComponent(fullName);
        if (nameEl)   nameEl.textContent  = fullName;
        if (emailEl)  emailEl.textContent = currentLoggedInUserEmail;
        // ------------------------

        if (pushToHistory) try { history.replaceState({ screen: 'pantalla-inicio' }, '', '#pantalla-inicio'); } catch(e) {}
        showScreen('pantalla-inicio', false); 
        loadInventory(); 
        loadSales();
    } else {
        currentLoggedInUserEmail = null;
        currentUserId = null;
        if (pushToHistory) try { history.replaceState({ screen: 'pantalla-login' }, '', '#pantalla-login'); } catch(e) {}
        showScreen('pantalla-login', false);
    }
}

window.addEventListener('popstate', (event) => {
    if (event.state && event.state.screen) {
        showScreen(event.state.screen, false); 
    } else {
        checkAuthStatus(false);
    }
});

// ==========================================
// EVENTOS DE NAVEGACIÓN
// ==========================================
btnInventario.addEventListener("click", function(e) {
  e.preventDefault();
  showScreen('pantalla-INVENTARIO');
});

btnVolverInicio.addEventListener("click", function() {
  showScreen('pantalla-inicio');
});

// btn-Ventas ya no existe (eliminado del HTML), solo por compatibilidad
if (btnVentas) {
    btnVentas.addEventListener("click", function(e) {
        e.preventDefault();
        showScreen('pantalla-ventas-fisicas');
    });
}

// Sidebar: Ventas Físicas — navega directo sin pantalla-menu-ventas
if (btnMenuVentasFisicas) {
    btnMenuVentasFisicas.addEventListener("click", function(e) {
        e.preventDefault();
        showScreen('pantalla-ventas-fisicas');
    });
}

// Sidebar: Ventas Online — navega directo sin pantalla-menu-ventas
if (btnMenuVentasOnline) {
    btnMenuVentasOnline.addEventListener("click", function(e) {
        e.preventDefault();
        showScreen('pantalla-ventas-online');
        cargarPedidosAdmin();
    });
}

// Sidebar: Estadísticas (próximamente)
const btnEstadisticas = document.getElementById('btn-Estadisticas');
if (btnEstadisticas) {
    btnEstadisticas.addEventListener("click", function(e) {
        e.preventDefault();
        mostrarAlerta('📊 El módulo de Estadísticas estará disponible próximamente.', 'info');
    });
}

// Sidebar: Combos (próximamente)
const btnCombos = document.getElementById('btn-Combos');
if (btnCombos) {
    btnCombos.addEventListener("click", function(e) {
        e.preventDefault();
        mostrarAlerta('🎁 El módulo de Combos estará disponible próximamente.', 'info');
    });
}


if (btnVolverInicioDesdeVentas) {
    btnVolverInicioDesdeVentas.addEventListener("click", function() {
        showScreen('pantalla-inicio');
    });
}

if (btnVolverVentasFisicas) {
    btnVolverVentasFisicas.addEventListener("click", function() {
        showScreen('pantalla-inicio');
    });
}

if (btnVolverVentasOnline) {
    btnVolverVentasOnline.addEventListener("click", function() {
        showScreen('pantalla-inicio');
    });
}

// ==========================================
// LÓGICA DEL CARRITO
// ==========================================
// ==========================================
// PUNTO DE VENTA — Grid de tarjetas de productos
// ==========================================
let categoriaActivaVenta = 'todas';
let productoSeleccionadoVentaId = null;

function renderGridProductosVenta(searchTerm = '') {
    // El grid de tarjetas fue eliminado — solo se mantiene la selección automática por código de barras exacto
    const rawSearchTerm = (searchTerm || '').trim();
    if (rawSearchTerm !== '') {
        const exacto = inventory.find(p => p.codigoBarras && p.codigoBarras === rawSearchTerm && p.cantidad > 0);
        if (exacto) {
            seleccionarProductoVenta(exacto.id);
        }
    }
}

function limpiarProductoSeleccionado() {
    productoSeleccionadoVentaId = null;
    if (selectProductoVenta) selectProductoVenta.value = '';
    const panelCantidad = document.getElementById('panelCantidadVenta');
    if (panelCantidad) panelCantidad.style.display = 'none';
    // Limpiar el input y enfocar para nueva búsqueda
    if (inputBuscarProductVenta) {
        inputBuscarProductVenta.value = '';
        inputBuscarProductVenta.focus();
    }
}

function seleccionarProductoVenta(productId) {
    productoSeleccionadoVentaId = productId;
    const product = inventory.find(p => p.id.toString() === productId.toString());
    if (!product) return;

    // Sincronizar el select oculto (para compatibilidad)
    selectProductoVenta.value = productId;

    // Mostrar panel de cantidad con botón eliminar
    const panelCantidad = document.getElementById('panelCantidadVenta');
    const infoEl = document.getElementById('productoSeleccionadoInfo');
    if (panelCantidad) panelCantidad.style.display = 'block';
    if (infoEl) {
        infoEl.innerHTML = `
            <img src="${product.imagen || 'https://via.placeholder.com/50'}" alt="${product.nombre}">
            <div class="producto-seleccionado-datos">
                <strong>${product.nombre}</strong>
                <span>$${Number(product.precio).toLocaleString('es-CO')} · Stock: ${product.cantidad}</span>
                <button class="btn-eliminar-seleccion" id="btnEliminarSeleccion">✕ Eliminar</button>
            </div>
        `;
        // Evento del botón eliminar
        document.getElementById('btnEliminarSeleccion').addEventListener('click', () => {
            limpiarProductoSeleccionado();
        });
    }

    // Enfocar cantidad
    const inputCant = document.getElementById('inputCantidadVenta');
    if (inputCant) { inputCant.value = '1'; inputCant.focus(); }
}

function updateSalesDropdown(searchTerm = '') {
    // Actualizar select oculto para compatibilidad interna
    selectProductoVenta.innerHTML = '<option value="">-- Selecciona un producto --</option>';
    inventory.forEach(product => {
        if (product.cantidad > 0) {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = `${product.nombre} (Disp: ${product.cantidad} | $${product.precio})`;
            selectProductoVenta.appendChild(option);
        }
    });
    // Actualizar grid visual
    renderGridProductosVenta(searchTerm);
}

// ==========================================
// AUTOCOMPLETE DE BÚSQUEDA EN VENTAS FÍSICAS
// ==========================================
(function inicializarAutocomplete() {
    if (!inputBuscarProductVenta) return;

    // Crear el contenedor de sugerencias y envolver el input
    const wrapper = document.createElement('div');
    wrapper.className = 'autocomplete-wrapper';
    const parent = inputBuscarProductVenta.parentNode;
    parent.insertBefore(wrapper, inputBuscarProductVenta);
    wrapper.appendChild(inputBuscarProductVenta);

    const listaSugerencias = document.createElement('div');
    listaSugerencias.className = 'autocomplete-sugerencias';
    wrapper.appendChild(listaSugerencias);

    let indiceSugerencia = -1;
    let sugerenciasActuales = [];

    function mostrarSugerencias(termino) {
        const normalizado = normalizeStringForSearch(termino.trim());
        listaSugerencias.innerHTML = '';
        indiceSugerencia = -1;

        if (normalizado.length < 1) {
            listaSugerencias.classList.remove('visible');
            sugerenciasActuales = [];
            return;
        }

        const rawTerm = termino.trim();
        sugerenciasActuales = inventory.filter(p => {
            if (p.cantidad <= 0) return false;
            const coincideNombre = normalizeStringForSearch(p.nombre).includes(normalizado);
            const coincideCodigo = p.codigoBarras && p.codigoBarras.includes(rawTerm);
            return coincideNombre || coincideCodigo;
        }).slice(0, 8);

        if (sugerenciasActuales.length === 0) {
            listaSugerencias.classList.remove('visible');
            return;
        }

        sugerenciasActuales.forEach((p, i) => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.dataset.idx = i;
            item.innerHTML = `
                <img src="${p.imagen || 'https://via.placeholder.com/38'}" alt="${p.nombre}">
                <div class="autocomplete-item-info">
                    <span class="autocomplete-item-nombre">${p.nombre}</span>
                    <span class="autocomplete-item-detalle">Disponible: ${p.cantidad} uds${p.codigoBarras ? ' · Cód: ' + p.codigoBarras : ''}</span>
                </div>
                <span class="autocomplete-item-precio">$${Number(p.precio).toLocaleString('es-CO')}</span>
            `;
            item.addEventListener('mousedown', (e) => {
                e.preventDefault();
                seleccionarDesdeSugerencia(p);
            });
            listaSugerencias.appendChild(item);
        });

        listaSugerencias.classList.add('visible');
    }

    function seleccionarDesdeSugerencia(producto) {
        inputBuscarProductVenta.value = producto.nombre;
        listaSugerencias.classList.remove('visible');
        indiceSugerencia = -1;
        seleccionarProductoVenta(producto.id);
    }

    function actualizarResaltado() {
        listaSugerencias.querySelectorAll('.autocomplete-item').forEach((el, i) => {
            el.classList.toggle('activo', i === indiceSugerencia);
        });
    }

    inputBuscarProductVenta.addEventListener('input', (e) => {
        mostrarSugerencias(e.target.value);
        // Selección automática si el texto coincide exactamente con un código de barras
        renderGridProductosVenta(e.target.value);
    });

    inputBuscarProductVenta.addEventListener('keydown', (e) => {
        if (!listaSugerencias.classList.contains('visible')) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            indiceSugerencia = Math.min(indiceSugerencia + 1, sugerenciasActuales.length - 1);
            actualizarResaltado();
            const itemActivo = listaSugerencias.querySelector('.autocomplete-item.activo');
            if (itemActivo) itemActivo.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            indiceSugerencia = Math.max(indiceSugerencia - 1, -1);
            actualizarResaltado();
            const itemActivo = listaSugerencias.querySelector('.autocomplete-item.activo');
            if (itemActivo) itemActivo.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (indiceSugerencia >= 0 && sugerenciasActuales[indiceSugerencia]) {
                // Hay una sugerencia resaltada → seleccionarla
                seleccionarDesdeSugerencia(sugerenciasActuales[indiceSugerencia]);
            } else if (sugerenciasActuales.length === 1) {
                // Solo hay un resultado → seleccionar automáticamente
                seleccionarDesdeSugerencia(sugerenciasActuales[0]);
            }
        } else if (e.key === 'Escape') {
            listaSugerencias.classList.remove('visible');
            indiceSugerencia = -1;
        }
    });

    inputBuscarProductVenta.addEventListener('blur', () => {
        setTimeout(() => listaSugerencias.classList.remove('visible'), 200);
    });

    inputBuscarProductVenta.addEventListener('focus', (e) => {
        if (e.target.value.trim().length > 0) {
            mostrarSugerencias(e.target.value);
        }
    });
})();

function updateCartUI() {
    listaCarrito.innerHTML = '';
    let total = 0;
    
    if (currentCart.length === 0) {
        listaCarrito.innerHTML = '<p style="color: #666; margin: 0; text-align: center;">No hay productos agregados.</p>';
        totalCarritoPreview.textContent = '0';
        return;
    }

    currentCart.forEach((item, index) => {
        const subtotal = item.qty * item.price;
        total += subtotal;
        
        const div = document.createElement('div');
        div.className = 'carrito-item';
        div.style.alignItems = 'center';
        div.style.fontSize = '0.9em';
        
        div.innerHTML = `
            <span style="flex: 2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${item.name}">${item.name}</span>
            <span style="flex: 1; text-align: center;">${item.qty}</span>
            <span style="flex: 1; text-align: right;">$${item.price}</span>
            <span style="flex: 1; text-align: right; font-weight: bold; color: #0c566c;">$${subtotal}</span>
            <button class="carrito-item-remover" onclick="removeFromCart(${index})" title="Eliminar" style="width: 25px; margin-left: 10px;">✖</button>
        `;
        listaCarrito.appendChild(div);
    });
    
    totalCarritoPreview.textContent = total;
}

window.removeFromCart = function(index) {
    currentCart.splice(index, 1);
    updateCartUI();
};

function limpiarTodaLaVenta() {
    currentCart = [];
    updateCartUI(); 
    inputBuscarProductVenta.value = '';
    selectProductoVenta.value = '';
    inputCantidadVenta.value = '';
    productoSeleccionadoVentaId = null;
    const panelCantidad = document.getElementById('panelCantidadVenta');
    if (panelCantidad) panelCantidad.style.display = 'none';
    renderGridProductosVenta(); 
    inputBuscarProductVenta.focus(); 
}

if (btnLimpiarVenta) {
    btnLimpiarVenta.addEventListener("click", limpiarTodaLaVenta);
}

if (btnAgregarAlCarrito) {
    btnAgregarAlCarrito.addEventListener("click", async () => {
        const productId = selectProductoVenta.value;
        let qty = parseInt(inputCantidadVenta.value);

        if (isNaN(qty) || qty <= 0) qty = 1; 

        if (!productId) { await mostrarAlerta("Selecciona un producto.", 'warn'); return; }

        const product = inventory.find(p => p.id.toString() === productId.toString());
        if (!product) return;

        const cartItem = currentCart.find(item => item.id.toString() === productId.toString());
        const currentCartQty = cartItem ? cartItem.qty : 0;
        
        if (currentCartQty + qty > product.cantidad) {
            await mostrarAlerta(`Stock insuficiente. Solo quedan ${product.cantidad - currentCartQty} unidades disponibles de ${product.nombre}.`, 'warn');
            return;
        }

        if (cartItem) {
            cartItem.qty += qty;
        } else {
            currentCart.push({
                id: product.id, 
                name: product.nombre,
                price: product.precio,
                qty: qty
            });
        }

        updateCartUI();
        
        inputCantidadVenta.value = ''; 
        inputBuscarProductVenta.value = ''; 
        selectProductoVenta.value = '';
        productoSeleccionadoVentaId = null;
        const panelCantidad = document.getElementById('panelCantidadVenta');
        if (panelCantidad) panelCantidad.style.display = 'none';
        updateSalesDropdown(); 
        inputBuscarProductVenta.focus(); 
    });
}

inputCantidadVenta.addEventListener("keydown", function(event) {
    if (event.key === "Enter" && pantallaVentasFisicas.style.display !== 'none') {
        event.preventDefault();
        btnAgregarAlCarrito.click();
    }
});

inputBuscarProductVenta.addEventListener("keydown", function(event) {
    if (event.key === "Enter" && pantallaVentasFisicas.style.display !== 'none') {
        event.preventDefault();
        if (selectProductoVenta.value) {
            inputCantidadVenta.focus(); 
        }
    }
});

// Función para ELIMINAR un ticket y DEVOLVER al inventario
window.eliminarTicket = async function(ticketGlobalId) {
    if(!await mostrarConfirm("¿Estás seguro de eliminar este ticket? Los productos volverán al inventario.", 'danger')) return;

    try {
        const sale = sales.find(s => s.globalId === ticketGlobalId);
        if (!sale) return;

        // Eliminar la venta de Supabase.
        // ON DELETE CASCADE borra los items_venta, y el trigger
        // fn_reponer_inventario() repone automáticamente el stock por cada item.
        await deleteSaleFromSupabase(ticketGlobalId);

        // Actualizar estado local
        sales = sales.filter(s => s.globalId !== ticketGlobalId);

        // Recargamos inventario desde Supabase para reflejar las cantidades reales
        // actualizadas por el trigger (fuente de verdad).
        await loadInventory();
        updateSalesDropdown();
        renderSalesHistory();
        
        await mostrarAlerta("Ticket eliminado exitosamente y stock repuesto al inventario.", 'success');

    } catch (err) {
        console.error("Error al eliminar ticket:", err);
        await mostrarAlerta("Hubo un error al eliminar el ticket. Intenta de nuevo.", 'error');
    }
};

// =========================================================
// REGISTRO DE VENTA — Ahora guarda en Supabase
// =========================================================
if (btnRegistrarVenta) {
    btnRegistrarVenta.addEventListener("click", async () => {
        if (currentCart.length === 0) {
            await mostrarAlerta("Añade al menos un producto a la lista antes de registrar.", 'warn');
            return;
        }

        btnRegistrarVenta.disabled = true;
        btnRegistrarVenta.textContent = "Registrando... ⏳";

        try {
            const saleDateObj = new Date();
            const saleDateStr = saleDateObj.toLocaleString();
            const soloFechaStr = saleDateObj.toLocaleDateString(); 
            let totalSale = 0;
            const cartItemsForReceipt = []; 

            for (let item of currentCart) {
                const subtotal = item.qty * item.price;
                totalSale += subtotal;

                cartItemsForReceipt.push({
                    productId: item.id, 
                    name:      item.name,
                    qty:       item.qty,
                    price:     item.price,
                    subtotal:  subtotal
                });
            }
            // Descuento local inmediato en `inventory` (respaldo visual)
            // El trigger fn_descontar_inventario() de Supabase también lo hace en BD.
            for (let item of currentCart) {
                const prod = inventory.find(p => p.id.toString() === item.id.toString());
                if (prod) prod.cantidad -= item.qty;
            }
            updateSalesDropdown(); // refleja stock actualizado de inmediato

            const numeroTicket = await generarNumeroTicket(); // <-- ahora es async

            const newSale = {
                globalId:    Date.now(), 
                id:          `V-${numeroTicket}`,   // prefijo V- para distinguir de ONLINE-
                total:       totalSale,
                date:        saleDateStr,
                fechaLimpia: soloFechaStr, 
                items:       cartItemsForReceipt 
            };

            // Guardar en Supabase (reemplaza saveSales con localStorage).
            // El trigger fn_descontar_inventario() descuenta el stock automáticamente.
            const ventaGuardada = await saveSale(newSale);
            newSale.supabaseId = ventaGuardada.id;
            sales.unshift(newSale); // Añadir al inicio del array local

            // Recargamos inventario desde Supabase para reflejar las cantidades reales
            // actualizadas por el trigger (fuente de verdad).
            await loadInventory();
            renderSalesHistory();

            if (await mostrarConfirm("¿Desea imprimir la factura de esta venta?", 'info')) {
                 imprimirFacturaTicket(newSale);
            }

            limpiarTodaLaVenta();
            if(inputBuscarProductVenta) inputBuscarProductVenta.focus();

            await mostrarAlerta(`¡Venta registrada con éxito!\nTicket #${newSale.id} por $${totalSale.toLocaleString('es-CO')}`, 'success');

        } catch (err) {
            console.error("Error al registrar venta:", err);
            await mostrarAlerta("Hubo un error al registrar la venta. Por favor intenta de nuevo.", 'error');
        } finally {
            btnRegistrarVenta.disabled = false;
            btnRegistrarVenta.textContent = "Registrar Venta";
        }
    });
}

// Lógica botón Historial Ventas Físicas → nueva pantalla
btnVerHistorial.addEventListener('click', (e) => {
    e.preventDefault();
    showScreen('pantalla-historial-fisicas');
});

// Renderizado Inteligente de Historial
function renderSalesHistory() {
    // --- VENTAS DE HOY (bloque dentro de pantalla-ventas-fisicas) ---
    const listaVentasHoyEl = document.getElementById('listaVentasHoy');
    if (listaVentasHoyEl) {
        const estabaOculto = listaVentasHoyEl.classList.contains('oculto');
        listaVentasHoyEl.innerHTML = '';
        const hoy = new Date().toLocaleDateString();
        const ventasDeHoy = sales.filter(s => {
            const f = s.fechaLimpia || (s.date ? s.date.split(',')[0].trim() : '');
            return f === hoy;
        });
        if (ventasDeHoy.length === 0) {
            listaVentasHoyEl.innerHTML = '<p>Aún no hay ventas registradas hoy.</p>';
        } else {
            // Mostrar la más reciente primero
            [...ventasDeHoy].reverse().forEach(sale => {
                listaVentasHoyEl.appendChild(crearDOMTicket(sale, true));
            });
        }
        // Restaurar estado oculto si estaba cerrado antes de re-renderizar
        if (estabaOculto) listaVentasHoyEl.classList.add('oculto');
    }

    // --- HISTORIAL DÍAS ANTERIORES (bloque dentro de pantalla-historial-fisicas) ---
    const listaHistorialAcordeon = document.getElementById('listaHistorialAcordeon');
    if (!listaHistorialAcordeon) return;

    listaHistorialAcordeon.innerHTML = '';

    if (sales.length === 0) {
        listaHistorialAcordeon.innerHTML = '<p style="color: #666;">El historial está vacío.</p>';
        return;
    }

    const fechaHoy = new Date().toLocaleDateString();
    const ventasPasadas = {};

    sales.forEach(sale => {
        // Normalizar fecha: preferir fechaLimpia (toLocaleDateString guardado en BD)
        // Si no existe, extraer la parte de fecha del string completo
        const fechaVenta = sale.fechaLimpia
            ? sale.fechaLimpia
            : (sale.date ? sale.date.split(',')[0].trim() : '');
        if (!sale.fechaLimpia) {
            console.warn(`[Historial] Venta #${sale.id} sin fechaLimpia, usando fallback:`, fechaVenta);
        }
        if (fechaVenta && fechaVenta !== fechaHoy) {
            if (!ventasPasadas[fechaVenta]) ventasPasadas[fechaVenta] = [];
            ventasPasadas[fechaVenta].push(sale);
        }
    });

    const fechasOrdenadas = Object.keys(ventasPasadas).sort((a, b) => {
        const dateA = new Date(a.split('/').reverse().join('-'));
        const dateB = new Date(b.split('/').reverse().join('-'));
        return dateB - dateA;
    });

    if (fechasOrdenadas.length === 0) {
        listaHistorialAcordeon.innerHTML = '<p style="color: #666;">No hay tickets de días anteriores.</p>';
    } else {
        fechasOrdenadas.forEach(fecha => {
            const ventasDelDia = ventasPasadas[fecha];
            const totalDia = ventasDelDia.reduce((sum, v) => sum + v.total, 0);
            
            const acordeonBtn = document.createElement('div');
            acordeonBtn.className = 'acordeon-fecha';
            acordeonBtn.innerHTML = `<span>📅 ${fecha} (${ventasDelDia.length} tickets)</span> <strong>$${totalDia} ▼</strong>`;
            
            const acordeonContent = document.createElement('div');
            acordeonContent.className = 'acordeon-contenido';
            acordeonContent.style.display = 'none';

            [...ventasDelDia].reverse().forEach(sale => {
                acordeonContent.appendChild(crearDOMTicket(sale, false));
            });

            acordeonBtn.addEventListener('click', () => {
                const isVisible = acordeonContent.style.display === 'block';
                acordeonContent.style.display = isVisible ? 'none' : 'block';
                acordeonBtn.querySelector('strong').innerHTML = `$${totalDia} ${isVisible ? '▼' : '▲'}`;
            });

            listaHistorialAcordeon.appendChild(acordeonBtn);
            listaHistorialAcordeon.appendChild(acordeonContent);
        });
    }
}

function crearDOMTicket(sale, esDeHoy) {
    const ticketDiv = document.createElement('div');
    ticketDiv.className = 'venta-ticket';
    
    let itemsHtml = '<ul>';
    sale.items.forEach(item => {
        itemsHtml += `<li><span>${item.qty}x ${item.name}</span> <span>$${item.subtotal}</span></li>`;
    });
    itemsHtml += '</ul>';

    const botonEliminarHtml = esDeHoy ? `<button class="btn-eliminar-ticket" onclick="eliminarTicket(${sale.globalId}); event.stopPropagation();">✖ Eliminar</button>` : '';

    ticketDiv.innerHTML = `
        <div class="venta-ticket-header">
            <div style="text-align: left;">
                <strong>Ticket #${sale.id}</strong>
                <span class="fecha-venta">${sale.date.split(',')[1] || sale.date}</span>
            </div>
            <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 5px;">
                <div style="display:flex; align-items:center;">
                    <strong>$${sale.total}</strong>
                    ${botonEliminarHtml}
                </div>
                <span style="font-size: 0.8em; color: #007bff;">Ver detalles ▼</span>
            </div>
        </div>
        <div class="venta-ticket-details">
            ${itemsHtml}
        </div>
    `;

    ticketDiv.querySelector('.venta-ticket-header').addEventListener('click', () => {
        const details = ticketDiv.querySelector('.venta-ticket-details');
        if (details.style.display === 'block') {
            details.style.display = 'none';
        } else {
            details.style.display = 'block';
        }
    });

    return ticketDiv;
}


// ==========================================
// FUNCIONES DE RENDERIZADO (INVENTARIO)
// ==========================================
function renderProducts(productsToRender = null) {
    if (!contenedorProductos) return;

    // Si no se pasan productos, aplicar categoría sobre inventario completo
    // Si se pasan productos (búsqueda), sólo filtrar categoría encima de ellos
    let base = productsToRender !== null ? productsToRender : inventory;
    let productosFiltrados = base;
    if (categoriaActivaFiltro && categoriaActivaFiltro !== 'todas') {
        productosFiltrados = base.filter(p => p.categoria === categoriaActivaFiltro);
    }

    contenedorProductos.innerHTML = ''; 

    if (productosFiltrados.length === 0) {
        if (inputBuscarProducto.value.trim() !== '') {
            contenedorProductos.innerHTML = '<p style="text-align: center; width: 100%; margin-top: 20px; font-size: 1.2em; color: #555;">No se encontraron productos que coincidan con la búsqueda.</p>';
        } else if (categoriaActivaFiltro !== 'todas') {
            contenedorProductos.innerHTML = `<p style="text-align: center; width: 100%; margin-top: 20px; font-size: 1.2em; color: #555;">No hay productos en esta categoría aún.</p>`;
        } else if (inventory.length === 0) {
            contenedorProductos.innerHTML = '<p style="text-align: center; width: 100%; margin-top: 20px; font-size: 1.2em; color: #555;">El inventario está vacío. ¡Añade algunos productos!</p>';
        }
        return;
    }
    
    const CATEGORIA_LABELS = {
        'Perecederos': '🥦 Perecederos',
        'Abarrotes': '🛒 Abarrotes',
        'Bebidas': '🥤 Bebidas',
        'Congelados': '🧊 Congelados',
        'Hogar': '🧹 Hogar',
        'Higiene': '🧴 Higiene',
        'Otras': '📦 Otras',
    };

    productosFiltrados.forEach(product => {
        const nuevaTarjeta = templateTarjetaProducto.content.cloneNode(true);
        const cardDiv = nuevaTarjeta.querySelector(".tarjeta-producto");
        
        cardDiv.dataset.id = product.id;

        const imgElement = nuevaTarjeta.querySelector(".producto-imagen");
        imgElement.src = product.imagen || 'https://via.placeholder.com/150'; 
        imgElement.alt = `Imagen de ${product.nombre}`;
        
        nuevaTarjeta.querySelector(".producto-nombre").textContent = product.nombre;
        
        const codigoElement = nuevaTarjeta.querySelector(".producto-codigo");
        if (codigoElement) {
            codigoElement.textContent = product.codigoBarras ? `Cod: ${product.codigoBarras}` : 'Cod: N/A';
        }

        nuevaTarjeta.querySelector(".producto-precio").textContent = `$${product.precio}`; 
        nuevaTarjeta.querySelector(".producto-cantidad").textContent = `Unidades disponibles: ${product.cantidad}`;

        // Agregar badge de categoría
        if (product.categoria) {
            const badge = document.createElement('span');
            badge.className = 'badge-categoria';
            badge.textContent = CATEGORIA_LABELS[product.categoria] || product.categoria;
            // Insertar después de la imagen
            const img = cardDiv.querySelector('.producto-imagen') || cardDiv.firstChild;
            cardDiv.insertBefore(badge, cardDiv.querySelector('.producto-nombre'));
        }

        contenedorProductos.appendChild(nuevaTarjeta);
    });

    updateSalesDropdown();
}

function updateProductCount() {
    totalProductosCountElement.textContent = inventory.length;
}

// ==========================================
// LÓGICA DE IMÁGENES
// ==========================================
const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
let archivoImagenFisico = null; 

function handleImageSelection(event) {
    const archivo = event.target.files[0];

    if (archivo) {
        if (!ALLOWED_IMAGE_TYPES.includes(archivo.type)) {
            mostrarAlerta('El archivo debe ser una imagen JPG, PNG o WEBP.', 'warn');
            clearImagePreview();
            return;
        }

        if (archivo.size > MAX_IMAGE_SIZE_BYTES) {
            mostrarAlerta('La imagen seleccionada excede el límite de 2 MB. Elige un archivo más pequeño.', 'warn');
            clearImagePreview();
            return;
        }

        archivoImagenFisico = archivo;

        const reader = new FileReader();
        reader.onload = function(e) {
            previewProductoImagen.src = e.target.result;
            previewProductoImagen.style.display = "block";
            previewProductoImagen.style.removeProperty('display'); // dejar que CSS tome control
            previewProductoImagen.style.display = "block"; // forzar visible
        };
        reader.onerror = function() {
            mostrarAlerta("No se pudo leer el archivo de imagen. Intenta con otro.", 'error');
            clearImagePreview();
        };
        reader.readAsDataURL(archivo);
    } else {
        clearImagePreview();
        archivoImagenFisico = null;
    }
}

async function compressImageFile(file, maxWidth = 1200, maxHeight = 1200, quality = 0.75) {
    if (!file.type.startsWith('image/')) return file;

    if (file.size <= MAX_IMAGE_SIZE_BYTES) {
        return file;
    }

    const imageBitmap = await createImageBitmap(file);
    const width = imageBitmap.width;
    const height = imageBitmap.height;
    const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
    const targetWidth = Math.round(width * ratio);
    const targetHeight = Math.round(height * ratio);

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);

    const outputType = 'image/jpeg';
    const outputName = file.name.replace(/\.[^/.]+$/, '.jpg');

    const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, outputType, quality);
    });

    if (!blob) {
        return file;
    }

    const compressedFile = new File([blob], outputName, { type: outputType });
    return compressedFile.size < file.size ? compressedFile : file;
}

async function subirImagenSupabase(archivo) {
    const archivoParaSubir = await compressImageFile(archivo);
    const extension = archivoParaSubir.name.split('.').pop();
    const nombreUnico = `img_${Date.now()}.${extension}`;
    const rutaArchivo = `${currentUserId}/${nombreUnico}`;

    const { data, error } = await supabaseClient
        .storage
        .from('productos')
        .upload(rutaArchivo, archivoParaSubir);

    if (error) {
        console.error("Error subiendo imagen:", error);
        const mensaje = error.message || error.details || "No se pudo subir la imagen.";
        throw new Error(mensaje);
    }

    const { data: publicUrlData } = await supabaseClient
        .storage
        .from('productos')
        .getPublicUrl(rutaArchivo);

    return publicUrlData.publicUrl;
}

function clearImagePreview() {
    previewProductoImagen.src = "";
    previewProductoImagen.style.display = "none";
    inputProductoImagen.value = ''; 
    archivoImagenFisico = null;
}

inputProductoImagen.addEventListener("change", handleImageSelection);
btnSeleccionarImagen.addEventListener('click', (e) => {
    e.preventDefault();
    inputProductoImagen.click();
});

// ==========================================
// LÓGICA DE FORMULARIO (Añadir/Editar a Supabase)
// ==========================================
function resetFormAndMode() {
    inputCodigoBarras.value = ''; 
    inputNombreProducto.value = '';
    inputPrecioProducto.value = '';
    inputCantidadProducto.value = ''; 
    if (inputCategoriaProducto) inputCategoriaProducto.value = '';
    clearImagePreview();
    editingProductId = null;
    btnGuardarProducto.textContent = 'Añadir Producto';
    btnLimpiarFormulario.textContent = 'Limpiar';
}

async function handleSaveProduct() {
    const codigo = inputCodigoBarras.value.trim(); 
    const nombre = inputNombreProducto.value.trim();
    const precio = parseInt(inputPrecioProducto.value); 
    const cantidad = parseInt(inputCantidadProducto.value);
    const categoria = inputCategoriaProducto ? inputCategoriaProducto.value : '';
  
    if (!nombre) { await mostrarAlerta("Por favor, ingresa el nombre del producto.", 'warn'); return; }
    if (isNaN(precio) || precio <= 0) { await mostrarAlerta("Por favor, ingresa un precio válido.", 'warn'); return; }
    if (isNaN(cantidad) || cantidad <= 0 || !Number.isInteger(cantidad)) { await mostrarAlerta("Por favor, ingresa una cantidad válida.", 'warn'); return; }
    if (!categoria) { await mostrarAlerta("Por favor, selecciona una categoría para el producto.", 'warn'); return; }

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        await mostrarAlerta("Debes iniciar sesión para guardar productos.", 'warn');
        showScreen('pantalla-login');
        return;
    }

    const textoOriginalBoton = btnGuardarProducto.textContent;
    btnGuardarProducto.textContent = "Subiendo... ⏳";
    btnGuardarProducto.disabled = true;

    try {
        let urlImagenFinal = '';

        if (editingProductId !== null && !archivoImagenFisico) {
            const productoAntiguo = inventory.find(p => p.id.toString() === editingProductId.toString());
            urlImagenFinal = productoAntiguo.imagen;
        } 
        else if (archivoImagenFisico) {
            urlImagenFinal = await subirImagenSupabase(archivoImagenFisico);
        } 
        else {
            await mostrarAlerta("Por favor, selecciona una imagen para el producto.", 'warn');
            btnGuardarProducto.textContent = textoOriginalBoton;
            btnGuardarProducto.disabled = false;
            return;
        }

        if (editingProductId !== null) {
            const { error } = await supabaseClient
                .from('productos')
                .update({ 
                    "codigoBarras": codigo, 
                    nombre, precio, cantidad, 
                    imagen: urlImagenFinal, 
                    categoria 
                })
                .eq('id', editingProductId);

            if (error) {
                console.error("Supabase UPDATE error:", JSON.stringify(error));
                throw error;
            }
            await mostrarAlerta(`¡Producto "${nombre}" actualizado!`, 'success');
        } 
        else {
            const { error } = await supabaseClient
                .from('productos')
                .insert([{ 
                    "codigoBarras": codigo,
                    nombre, precio, cantidad, 
                    imagen: urlImagenFinal, 
                    user_id: user.id,
                    categoria
                }]);

            if (error) {
                console.error("Supabase INSERT error:", JSON.stringify(error));
                throw error;
            }
            await mostrarAlerta(`¡Producto "${nombre}" añadido al inventario!`, 'success');
        }

        resetFormAndMode(); 
        loadInventory(); 

    } catch (error) {
        console.error("Error completo handleSaveProduct:", error);
        const msg = error?.message || error?.details || JSON.stringify(error);
        await mostrarAlerta(`Error al guardar el producto:\n${msg}`, 'error');
    } finally {
        btnGuardarProducto.textContent = textoOriginalBoton;
        btnGuardarProducto.disabled = false;
    }
}

function editProduct(productId) {
    const productToEdit = inventory.find(p => p.id.toString() === productId.toString());
    if (productToEdit) {
        editingProductId = productId; 
        inputCodigoBarras.value = productToEdit.codigoBarras || ''; 
        inputNombreProducto.value = productToEdit.nombre;
        inputPrecioProducto.value = productToEdit.precio;
        inputCantidadProducto.value = productToEdit.cantidad;
        if (inputCategoriaProducto) inputCategoriaProducto.value = productToEdit.categoria || '';
        previewProductoImagen.src = productToEdit.imagen;
        previewProductoImagen.style.display = 'block';
        imagenProductoActual = productToEdit.imagen;

        btnGuardarProducto.textContent = 'Guardar Cambios';
        btnLimpiarFormulario.textContent = 'Cancelar Edición';
        pantallaInventario.querySelector('.formulario-producto-nuevo').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

btnLimpiarFormulario.addEventListener('click', function() {
    if (editingProductId !== null) {
        mostrarAlerta("Edición cancelada.", 'info');
    } else { 
         clearSearch();
    }
    resetFormAndMode();
});

btnGuardarProducto.addEventListener("click", handleSaveProduct); 

// ATAJOS DE TECLADO (ENTER)
inputCodigoBarras.addEventListener("keydown", function(event) {
    if (event.key === "Enter" && pantallaInventario.style.display !== 'none') {
        event.preventDefault(); 
        inputNombreProducto.focus(); 
    }
});

inputNombreProducto.addEventListener("keydown", function(event) {
    if (event.key === "Enter" && pantallaInventario.style.display !== 'none') {
        event.preventDefault(); 
        inputPrecioProducto.focus(); 
    }
});

inputPrecioProducto.addEventListener("keydown", function(event) {
    if (event.key === "Enter" && pantallaInventario.style.display !== 'none') {
        event.preventDefault(); 
        inputCantidadProducto.focus(); 
    }
});

inputCantidadProducto.addEventListener("keydown", function(event) {
    if (event.key === "Enter" && pantallaInventario.style.display !== 'none') {
        event.preventDefault();
        btnGuardarProducto.click(); 
    }
});

// ==========================================
// LÓGICA DE BÚSQUEDA EN INVENTARIO
// ==========================================
function normalizeStringForSearch(text) {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") 
        .replace(/[^a-z0-9\s]/g, ''); 
}

function searchProducts() {
    const searchTermRaw = inputBuscarProducto.value.trim();
    const searchTerm = normalizeStringForSearch(searchTermRaw);

    if (searchTerm === '') {
        searchResults = null;
        renderProducts();
        return;
    }

    searchResults = inventory.filter(product => {
        const coincidenciaNombre = normalizeStringForSearch(product.nombre).includes(searchTerm);
        const coincidenciaCodigo = product.codigoBarras && product.codigoBarras.includes(searchTermRaw);
        return coincidenciaNombre || coincidenciaCodigo;
    });

    renderProducts(searchResults);
}

function clearSearch() {
    inputBuscarProducto.value = '';
    searchResults = null;
    renderProducts();
}

btnBuscarProducto.addEventListener("click", searchProducts);
btnLimpiarBusqueda.addEventListener("click", clearSearch);

inputBuscarProducto.addEventListener("input", searchProducts);

inputBuscarProducto.addEventListener("keydown", function(event) {
    if (event.key === 'Enter') {
        event.preventDefault(); 
        searchProducts();
    }
});

// ==========================================
// DELEGACIÓN: BORRAR Y EDITAR (Con Supabase)
// ==========================================
if (contenedorProductos) { 
    contenedorProductos.addEventListener('click', async function(event) {
        const cardDiv = event.target.closest('.tarjeta-producto');
        if (!cardDiv) return; 
        
        const productId = cardDiv.dataset.id;

        if (event.target.classList.contains('btn-borrar-producto')) {
            if(await mostrarConfirm("¿Estás seguro de que quieres eliminar este producto?", 'danger')){
                const { error } = await supabaseClient.from('productos').delete().eq('id', productId);
                
                if (!error) {
                    if (productId === editingProductId) resetFormAndMode();
                    await mostrarAlerta("Producto eliminado.", 'success');
                    loadInventory(); 
                } else {
                    console.error("Error al eliminar producto:", error);
                    await mostrarAlerta("Error al eliminar el producto.", 'error');
                }
            }
        } else if (event.target.classList.contains('btn-editar-producto')) {
            editProduct(productId);
        }
    });
}

// ==========================================
// LÓGICA DE EXPORTACIÓN (CSV)
// ==========================================
async function exportInventoryToCSV() {
    if (inventory.length === 0) {
        await mostrarAlerta("El inventario está vacío. No hay datos para exportar.", 'warn');
        return;
    }

    let csvContent = "Codigo,Nombre Producto,Precio Unitario,Cantidad,Valor Total Producto\n";
    let totalInventoryValue = 0;

    inventory.forEach(product => {
        const productTotal = product.precio * product.cantidad;
        totalInventoryValue += productTotal;
        const escapedProductName = `"${product.nombre.replace(/"/g, '""')}"`;
        const codigoExp = product.codigoBarras ? product.codigoBarras : "N/A";

        csvContent += `${codigoExp},${escapedProductName},${product.precio},${product.cantidad},${productTotal}\n`;
    });

    csvContent += `\nVALOR TOTAL INVENTARIO,,,,${totalInventoryValue}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'inventario.csv';

    document.body.appendChild(link); 
    link.click();
    document.body.removeChild(link); 
    URL.revokeObjectURL(link.href); 
    mostrarAlerta("¡Inventario exportado exitosamente a inventario.csv!", 'success');
}

btnExportarDatos.addEventListener("click", exportInventoryToCSV);

// ==========================================
// INTEGRACIÓN DE INICIO DE SESIÓN CON SUPABASE
// ==========================================
async function handleLoginWithGoogle() {
    const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: "https://franklin-2000.github.io/tienda-online/" } 
    });
    if (error) {
        console.error('Error al iniciar sesión con Google:', error);
    } else {
        console.log('Redirigiendo a Google para autenticación...');
    }
}

async function handleLogout() {
    const { error } = await supabaseClient.auth.signOut();
    if (!error) {
        inventory = []; 
        sales = [];
        currentUserId = null;
        showScreen('pantalla-login');
        mostrarAlerta("Sesión cerrada correctamente.", 'info');
    } else {
        console.error("Error al cerrar sesión:", error);
        mostrarAlerta("Hubo un error al cerrar la sesión.", 'error');
    }
}

if (btnGoogle) btnGoogle.addEventListener("click", handleLoginWithGoogle);
btnLogout.addEventListener("click", handleLogout);

// ==========================================
// INICIALIZACIÓN DE LA APP
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    if (EN_IFRAME_PREVIEW) {
        // Modo previsualizador (ej: Yachai Codex): mostrar pantalla de inicio directamente
        // sin pasar por Supabase, para que la previsualización funcione correctamente.
        showScreen('pantalla-inicio', false);
    } else {
        checkAuthStatus();
    }
});

// =========================================================
// EXTENSIÓN DE FUNCIONALIDADES
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    // Foco automático al entrar a Ventas Físicas
    if (btnMenuVentasFisicas) {
        btnMenuVentasFisicas.addEventListener('click', () => {
            setTimeout(() => {
                if(inputBuscarProductVenta) inputBuscarProductVenta.focus();
            }, 500); 
        });
    }

    // Mejora de flujo: Si escaneas un código y hay coincidencia única
    if (inputBuscarProductVenta) {
        inputBuscarProductVenta.addEventListener('input', () => {
            const term = inputBuscarProductVenta.value.trim();
            const productoEncontrado = inventory.find(p => p.codigoBarras === term);
            
            if (productoEncontrado) {
                selectProductoVenta.value = productoEncontrado.id;
                inputCantidadVenta.focus();
            }
        });
    }
});

// ==========================================
// MODIFICACIONES DE FACTURACIÓN Y REPORTE
// ==========================================

const imprimirFacturaTicket = (datosVenta) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: [80, 150] }); 

    doc.setFontSize(10);
    doc.text("MI TIENDA", 40, 10, { align: "center" });
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
};

const descargarReporteDiario = () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const hoy = new Date().toLocaleDateString();
    
    const ventasHoy = sales.filter(s => (s.fechaLimpia || s.date.split(',')[0].trim()) === hoy);

    if (ventasHoy.length === 0) return mostrarAlerta("No hay ventas registradas hoy.", 'info');

    doc.text(`Reporte Diario de Ventas - ${hoy}`, 14, 20);

    const filas = [];
    ventasHoy.forEach(v => {
        v.items.forEach(i => {
            filas.push([v.id, i.name, i.qty, `$${i.price}`, `$${i.subtotal}`]);
        });
    });

    doc.autoTable({
        startY: 30,
        head: [['Ticket', 'Producto', 'Cant.', 'Precio', 'Subtotal']],
        body: filas
    });

    doc.save(`Reporte_${hoy.replace(/\//g, '-')}.pdf`);
};

document.addEventListener('DOMContentLoaded', () => {
    const seccionHistorial = document.querySelector('.historial-ventas');
    if (seccionHistorial) {
        const btnPDF = document.createElement('button');
        btnPDF.textContent = "Generar Reporte Diario PDF 📄";
        btnPDF.className = "btn-exportar";
        btnPDF.style.width = "100%";
        btnPDF.style.marginBottom = "15px";
        btnPDF.onclick = descargarReporteDiario;
        seccionHistorial.prepend(btnPDF); 
    }
});

let pedidosAdmin      = [];
let filtroEstadoAdmin = 'todos';
 
 
// ---------------------------------------------------------------
// Cargar pedidos — el admin ve todos gracias a la política
// es_admin() que definiste en el SQL definitivo
// ---------------------------------------------------------------
async function cargarPedidosAdmin() {
    const lista = document.getElementById('listaPedidosAdmin');
    if (!lista) return;
    lista.innerHTML = '<p style="color:#666;padding:30px;text-align:center;">Cargando pedidos...</p>';
 
    const { data, error } = await supabaseClient
        .from('pedidos')
        .select(`
            id, estado, total, metodo_pago, fecha, fecha_confirmacion,
            cliente_nombre, cliente_email, cliente_tel,
            direccion, notas,
            items_pedido ( nombre, cantidad, precio, subtotal )
        `)
        .order('id', { ascending: false });
 
    if (error) {
        console.error('Error cargando pedidos online:', error);
        lista.innerHTML = `<p style="color:red;padding:20px;">Error al cargar pedidos: ${error.message}</p>`;
        return;
    }
 
    pedidosAdmin = data || [];
    renderResumenAdmin();
    renderPedidosAdmin(filtroEstadoAdmin);
}

async function deletePedidoFromSupabase(pedidoId) {
    // items_pedido se borra en cascada por la FK (ON DELETE CASCADE)
    // Solo necesitamos borrar el pedido. El admin tiene política DELETE.
    const { error } = await supabaseClient
        .from('pedidos')
        .delete()
        .eq('id', pedidoId);

    if (error) {
        console.error('Error eliminando pedido:', error);
        throw error;
    }
}

async function eliminarPedidoCancelado(pedidoId) {
    if (!await mostrarConfirm(`¿Eliminar permanentemente la venta cancelada #${pedidoId}?`, 'danger')) return;

    try {
        await deletePedidoFromSupabase(pedidoId);
        pedidosAdmin = pedidosAdmin.filter(p => p.id !== pedidoId);
        renderResumenAdmin();
        renderPedidosAdmin(filtroEstadoAdmin);
        renderHistorialOnline();
        await mostrarAlerta(`Venta cancelada #${pedidoId} eliminada correctamente.`, 'success');
    } catch (error) {
        await mostrarAlerta(`No se pudo eliminar la venta cancelada: ${error.message || error}`, 'error');
    }
}

async function eliminarTodosLosPedidosCancelados() {
    const cancelados = pedidosAdmin.filter(p => p.estado === 'cancelado');
    if (cancelados.length === 0) {
        await mostrarAlerta('No hay ventas canceladas para eliminar.', 'info');
        return;
    }

    if (!await mostrarConfirm(`¿Eliminar todas las ventas canceladas? Se borrarán ${cancelados.length} pedidos.`, 'danger')) return;

    const ids = cancelados.map(p => p.id);
    const btn = btnBorrarTodasVentasCanceladas;
    const originalText = btn ? btn.textContent : '';
    if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ Eliminando...';
    }

    try {
        // items_pedido se borra en cascada — solo borrar los pedidos
        const { error } = await supabaseClient
            .from('pedidos')
            .delete()
            .in('id', ids);

        if (error) throw error;

        pedidosAdmin = pedidosAdmin.filter(p => p.estado !== 'cancelado');
        renderResumenAdmin();
        renderPedidosAdmin(filtroEstadoAdmin);
        renderHistorialOnline();
        await mostrarAlerta(`Se eliminaron ${ids.length} ventas canceladas correctamente.`, 'success');
    } catch (error) {
        console.error('Error eliminando pedidos cancelados:', error);
        await mostrarAlerta(`No se pudieron eliminar las ventas canceladas: ${error.message || error}`, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }
}

// ---------------------------------------------------------------
// Tarjetas de resumen
// ---------------------------------------------------------------
function renderResumenAdmin() {
    const el = document.getElementById('resumenPedidosAdmin');
    if (!el) return;
 
    const c = { pendiente:0, esperando_pago:0, pago_confirmado:0,
                despachado:0, entregado:0, pago_fallido:0, cancelado:0 };
    let totalPorCobrar = 0, totalCobrado = 0;
 
    pedidosAdmin.forEach(p => {
        if (c[p.estado] !== undefined) c[p.estado]++;
        if (p.estado === 'pendiente' || p.estado === 'esperando_pago')
            totalPorCobrar += Number(p.total);
        if (['pago_confirmado','despachado','entregado'].includes(p.estado))
            totalCobrado += Number(p.total);
    });
 
    el.innerHTML = `
        <div class="tarjeta-resumen-online amarilla">
            <strong>⏳ Por atender</strong>
            <span class="num">${c.pendiente + c.esperando_pago}</span>
            <small>$${totalPorCobrar.toLocaleString('es-CO')} por cobrar</small>
        </div>
        <div class="tarjeta-resumen-online verde">
            <strong>✅ Confirmados + Entregados</strong>
            <span class="num">${c.pago_confirmado + c.despachado + c.entregado}</span>
            <small>$${totalCobrado.toLocaleString('es-CO')} cobrado</small>
        </div>
        <div class="tarjeta-resumen-online roja">
            <strong>❌ Fallidos / Cancelados</strong>
            <span class="num">${c.pago_fallido + c.cancelado}</span>
        </div>
    `;
}
 
// ---------------------------------------------------------------
// Render lista con filtro activo
// ---------------------------------------------------------------
function renderPedidosAdmin(estadoFiltro = 'todos') {
    const el = document.getElementById('listaPedidosAdmin');
    if (!el) return;
    filtroEstadoAdmin = estadoFiltro;

    if (btnBorrarTodasVentasCanceladas) {
        btnBorrarTodasVentasCanceladas.style.display = estadoFiltro === 'cancelado' ? 'inline-flex' : 'none';
    }
 
    // Cuando el filtro es "todos", mostrar solo pedidos activos (no cancelados ni entregados)
    const pedidosActivos = ['pendiente', 'esperando_pago', 'pago_confirmado'];
    let lista;
    if (estadoFiltro === 'todos') {
        lista = pedidosAdmin.filter(p => pedidosActivos.includes(p.estado));
    } else {
        lista = pedidosAdmin.filter(p => p.estado === estadoFiltro);
    }
 
    if (lista.length === 0) {
        const mensaje = estadoFiltro === 'todos'
            ? 'No hay pedidos activos para mostrar.'
            : 'No hay pedidos con este estado.';
        el.innerHTML = `<p style="color:#666;padding:30px;text-align:center;">${mensaje}</p>`;
        return;
    }
 
    el.innerHTML = '';
 
    const etqMap = {
        pendiente:       { texto: '⏳ Pendiente',         clase: 'estado-pendiente'  },
        esperando_pago:  { texto: '💳 Esperando pago',    clase: 'estado-pendiente'  },
        pago_confirmado: { texto: '✅ Pago confirmado',   clase: 'estado-pagado'     },
        entregado:       { texto: '📦 Entregado',         clase: 'estado-entregado'  },
        pago_fallido:    { texto: '❌ Pago fallido',      clase: 'estado-cancelado'  },
        cancelado:       { texto: '🚫 Cancelado',         clase: 'estado-cancelado'  },
    };
 
    lista.forEach(pedido => {
        const etq = etqMap[pedido.estado] || { texto: pedido.estado, clase: '' };
        const fecha = new Date(pedido.fecha).toLocaleString('es-CO');
        const esContraEntrega = pedido.metodo_pago === 'contraentrega';
 
        // Botones según el estado actual del pedido
        let botonesHTML = '';
        if (pedido.estado === 'pendiente' || pedido.estado === 'esperando_pago') {
            botonesHTML = `
                <button class="btn-añadir btn-accion-pedido"
                        data-id="${pedido.id}" data-nuevo-estado="pago_confirmado">
                    ✅ Confirmar Pago → Descontar Inventario
                </button>
                <button class="btn-borrar-producto btn-accion-pedido"
                        data-id="${pedido.id}" data-nuevo-estado="cancelado">
                    🚫 Cancelar pedido
                </button>`;
        } else if (pedido.estado === 'pago_confirmado') {
            botonesHTML = `
                <button class="btn-añadir btn-accion-pedido"
                        data-id="${pedido.id}" data-nuevo-estado="entregado">
                    📦 Confirmar Entrega
                </button>`;
        } else if (pedido.estado === 'cancelado') {
            botonesHTML = `
                <button class="btn-borrar-producto btn-eliminar-pedido-cancelado"
                        data-id="${pedido.id}">
                    🗑️ Eliminar venta cancelada
                </button>`;
        }
 
        const metodoLabel = esContraEntrega ? '💵 Contra entrega' : '💳 Pago online';
        const card = document.createElement('div');
        card.className = 'tarjeta-producto pedido-admin-card';
        card.innerHTML = `
            <div class="pedido-admin-header">
                <div class="pedido-admin-id">
                    <strong>#${pedido.id}</strong>
                    <span class="pedido-estado ${etq.clase}">${etq.texto}</span>
                </div>
                <div class="pedido-admin-total">
                    $${Number(pedido.total).toLocaleString('es-CO')}
                    <small>${metodoLabel}</small>
                </div>
            </div>
 
            <div class="pedido-admin-cliente">
                <div>👤 <strong>${pedido.cliente_nombre}</strong></div>
                <div>📧 ${pedido.cliente_email}</div>
                <div>📞 ${pedido.cliente_tel}</div>
                <div>📍 ${pedido.direccion}</div>
                ${pedido.notas ? `<div>📝 <em>${pedido.notas}</em></div>` : ''}
                <div class="pedido-admin-fecha">📅 ${fecha}</div>
                ${pedido.fecha_confirmacion
                    ? `<div style="font-size:0.8em;color:#1e7e34;">✅ Confirmado el ${new Date(pedido.fecha_confirmacion).toLocaleString('es-CO')}</div>`
                    : ''}
            </div>
 
            <div class="pedido-admin-items">
                <table class="tabla-items-pedido">
                    <thead><tr>
                        <th>Producto</th><th>Cant.</th><th>Precio</th><th>Subtotal</th>
                    </tr></thead>
                    <tbody>
                        ${(pedido.items_pedido || []).map(i => `
                            <tr>
                                <td>${i.nombre}</td>
                                <td style="text-align:center">${i.cantidad}</td>
                                <td style="text-align:right">$${Number(i.precio).toLocaleString('es-CO')}</td>
                                <td style="text-align:right;font-weight:700">$${Number(i.subtotal).toLocaleString('es-CO')}</td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>
 
            ${botonesHTML ? `<div class="pedido-admin-acciones">${botonesHTML}</div>` : ''}
        `;
 
        card.querySelectorAll('.btn-accion-pedido').forEach(btn => {
            btn.addEventListener('click', () =>
                cambiarEstadoPedido(parseInt(btn.dataset.id), btn.dataset.nuevoEstado, btn)
            );
        });

        card.querySelectorAll('.btn-eliminar-pedido-cancelado').forEach(btn => {
            btn.addEventListener('click', () => eliminarPedidoCancelado(parseInt(btn.dataset.id)));
        });
 
        el.appendChild(card);
    });
}
 
// ---------------------------------------------------------------
// Cambiar estado — al confirmar pago el trigger descuenta stock
// ---------------------------------------------------------------
async function cambiarEstadoPedido(pedidoId, nuevoEstado, btnEl) {
    const msgs = {
        pago_confirmado: `¿Confirmar el PAGO del pedido #${pedidoId}?\n\nEl inventario se descontará automáticamente.`,
        entregado:       `¿Confirmar la entrega del pedido #${pedidoId}?\n\nEl pedido pasará al historial y dejará de aparecer en Activos.`,
        cancelado:       `¿Cancelar el pedido #${pedidoId}?`,
    };
    if (!await mostrarConfirm(msgs[nuevoEstado] || `¿Cambiar estado del pedido #${pedidoId}?`, nuevoEstado === 'cancelado' ? 'danger' : 'warn')) return;

    const textoOrig   = btnEl.textContent;
    btnEl.disabled    = true;
    btnEl.textContent = '⏳ Procesando...';

    // La RPC cambiar_estado_pedido valida que seas admin y dispara el trigger
    // que descuenta inventario y registra en historial automáticamente.
    // p_fecha_confirmacion se omite: el trigger BEFORE UPDATE la asigna.
    const { error } = await supabaseClient.rpc('cambiar_estado_pedido', {
        p_pedido_id:    pedidoId,
        p_nuevo_estado: nuevoEstado
    });

    if (error) {
        console.error('Error actualizando pedido:', error);
        // Mostrar mensaje amigable si es error de stock insuficiente
        const msg = error.message.includes('Stock insuficiente')
            ? `❌ Stock insuficiente:\n${error.message}`
            : `Error: ${error.message}`;
        await mostrarAlerta(msg, 'error');
        btnEl.disabled    = false;
        btnEl.textContent = textoOrig;
        return;
    }

    // Actualizar estado local sin recargar toda la lista
    const idx = pedidosAdmin.findIndex(p => p.id === pedidoId);
    if (idx !== -1) {
        pedidosAdmin[idx].estado = nuevoEstado;
        if (nuevoEstado === 'pago_confirmado') {
            pedidosAdmin[idx].fecha_confirmacion = new Date().toISOString();
        }
    }

    renderResumenAdmin();
    renderPedidosAdmin(filtroEstadoAdmin);

    if (nuevoEstado === 'entregado') {
        renderHistorialOnline();
        await mostrarAlerta(`✅ Pedido #${pedidoId} marcado como entregado.\nAhora aparece en el historial de entregas.`, 'success');
    }

    if (nuevoEstado === 'pago_confirmado') {
        await loadInventory();
        await loadSales();
        await mostrarAlerta(`✅ Pago del pedido #${pedidoId} confirmado.\nInventario descontado e historial actualizado.`, 'success');
    }
}

// ---------------------------------------------------------------
// Renderizar historial de entregas (pedidos con estado entregado)
// ---------------------------------------------------------------
// Renderizar historial de entregas (pedidos con estado entregado)
// ---------------------------------------------------------------
function renderHistorialOnline() {
    const listaEntregasHoy = document.getElementById('listaEntregasHoy');
    const listaHistorialEntregasAcordeon = document.getElementById('listaHistorialEntregasAcordeon');
    if (!listaEntregasHoy || !listaHistorialEntregasAcordeon) return;
    
    listaEntregasHoy.innerHTML = '';
    listaHistorialEntregasAcordeon.innerHTML = '';

    // Filtrar solo pedidos entregados
    const pedidosEntregados = pedidosAdmin.filter(p => p.estado === 'entregado');

    if (pedidosEntregados.length === 0) {
        listaEntregasHoy.innerHTML = '<p>Aún no hay entregas registradas.</p>';
        listaHistorialEntregasAcordeon.innerHTML = '<p style="color: #666;">El historial está vacío.</p>';
        return;
    }

    const fechaHoy = new Date().toLocaleDateString('es-CO');
    const entregasHoy = [];
    const entregasPasadas = {};

    pedidosEntregados.forEach(pedido => {
        const fecha = new Date(pedido.fecha).toLocaleDateString('es-CO');

        if (fecha === fechaHoy) {
            entregasHoy.push(pedido);
        } else {
            if (!entregasPasadas[fecha]) entregasPasadas[fecha] = [];
            entregasPasadas[fecha].push(pedido);
        }
    });

    // Mostrar entregas de hoy
    if (entregasHoy.length === 0) {
        listaEntregasHoy.innerHTML = '<p>Aún no hay entregas registradas hoy.</p>';
    } else {
        const titleHoy = document.createElement('h4');
        titleHoy.textContent = `📅 Entregas de Hoy (${entregasHoy.length})`;
        titleHoy.style.cssText = 'color: #0c566c; margin-bottom: 10px;';
        listaEntregasHoy.appendChild(titleHoy);
        
        [...entregasHoy].reverse().forEach(pedido => {
            listaEntregasHoy.appendChild(crearDOMTicketOnline(pedido, true));
        });
    }

    // Mostrar entregas de días pasados en acordeón
    const fechasOrdenadas = Object.keys(entregasPasadas).sort((a, b) => {
        const dateA = new Date(a.split('/').reverse().join('-'));
        const dateB = new Date(b.split('/').reverse().join('-'));
        return dateB - dateA;
    });

    if (fechasOrdenadas.length === 0) {
        listaHistorialEntregasAcordeon.innerHTML = '<p style="color: #666;">No hay entregas de días anteriores.</p>';
    } else {
        fechasOrdenadas.forEach(fecha => {
            const entregasDelDia = entregasPasadas[fecha];
            const totalDia = entregasDelDia.reduce((sum, p) => sum + Number(p.total), 0);
            
            const acordeonBtn = document.createElement('div');
            acordeonBtn.className = 'acordeon-fecha';
            acordeonBtn.innerHTML = `<span>📅 ${fecha} (${entregasDelDia.length} entregas)</span> <strong>$${totalDia.toLocaleString('es-CO')} ▼</strong>`;
            
            const acordeonContent = document.createElement('div');
            acordeonContent.className = 'acordeon-contenido';
            acordeonContent.style.display = 'none';

            [...entregasDelDia].reverse().forEach(pedido => {
                acordeonContent.appendChild(crearDOMTicketOnline(pedido, false));
            });

            acordeonBtn.addEventListener('click', () => {
                const isVisible = acordeonContent.style.display === 'block';
                acordeonContent.style.display = isVisible ? 'none' : 'block';
                acordeonBtn.querySelector('strong').innerHTML = `$${totalDia.toLocaleString('es-CO')} ${isVisible ? '▼' : '▲'}`;
            });

            listaHistorialEntregasAcordeon.appendChild(acordeonBtn);
            listaHistorialEntregasAcordeon.appendChild(acordeonContent);
        });
    }
}

// ---------------------------------------------------------------
// Crear ticket de pedido para el historial
// ---------------------------------------------------------------
function crearDOMTicketOnline(pedido, esDeHoy) {
    const ticketDiv = document.createElement('div');
    ticketDiv.className = 'venta-ticket';
    
    let itemsHtml = '<ul style="list-style: none; padding: 0;">';
    (pedido.items_pedido || []).forEach(item => {
        itemsHtml += `<li style="border-bottom: 1px solid #eee; padding: 5px 0;"><span>${item.cantidad}x ${item.nombre}</span> <span style="float:right;">$${Number(item.subtotal).toLocaleString('es-CO')}</span></li>`;
    });
    itemsHtml += '</ul>';

    const fecha = new Date(pedido.fecha).toLocaleString('es-CO');

    ticketDiv.innerHTML = `
        <div class="venta-ticket-header">
            <div style="text-align: left;">
                <strong>Pedido #${pedido.id}</strong>
                <span class="fecha-venta">${fecha}</span>
            </div>
            <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 5px;">
                <div style="display:flex; align-items:center;">
                    <strong>$${Number(pedido.total).toLocaleString('es-CO')}</strong>
                </div>
                <span style="font-size: 0.8em; color: #007bff;">Ver detalles ▼</span>
            </div>
        </div>
        <div class="venta-ticket-details">
            <div style="margin-bottom: 10px;">
                <strong>Cliente:</strong> ${pedido.cliente_nombre} <br>
                <strong>Email:</strong> ${pedido.cliente_email} <br>
                <strong>Teléfono:</strong> ${pedido.cliente_tel} <br>
                <strong>Dirección:</strong> ${pedido.direccion} <br>
                ${pedido.notas ? `<strong>Notas:</strong> ${pedido.notas} <br>` : ''}
            </div>
            ${itemsHtml}
        </div>
    `;

    ticketDiv.querySelector('.venta-ticket-header').addEventListener('click', () => {
        const details = ticketDiv.querySelector('.venta-ticket-details');
        if (details.style.display === 'block') {
            details.style.display = 'none';
        } else {
            details.style.display = 'block';
        }
    });

    return ticketDiv;
}
 
// ---------------------------------------------------------------
// Toggle Ventas de Hoy — registrado en DOMContentLoaded (ver abajo)
// ---------------------------------------------------------------

// ---------------------------------------------------------------
// Eventos de filtros y botón refrescar
// ---------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {

    // Filtros de categoría en ventas físicas
    document.querySelectorAll('.btn-cat-venta').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-cat-venta').forEach(b => b.classList.remove('activo'));
            btn.classList.add('activo');
            categoriaActivaVenta = btn.dataset.cat;
            renderGridProductosVenta(inputBuscarProductVenta ? inputBuscarProductVenta.value : '');
        });
    });

    // Filtros de categoría en inventario
    document.querySelectorAll('.btn-categoria-filtro').forEach(btn => {
        btn.addEventListener('click', () => {
            const esTodas = btn.dataset.categoria === 'todas';
            const yaActivo = btn.classList.contains('activo');

            if (esTodas && yaActivo) {
                // "Todas" ya estaba activo → ocultar productos
                contenedorProductos.classList.toggle('oculto-productos');
                btn.classList.toggle('atenuado');
                return;
            }

            // Cualquier otro botón: mostrar productos, quitar ocultado previo
            contenedorProductos.classList.remove('oculto-productos');
            document.querySelector('.btn-categoria-filtro[data-categoria="todas"]')
                ?.classList.remove('atenuado');

            document.querySelectorAll('.btn-categoria-filtro').forEach(b => b.classList.remove('activo'));
            btn.classList.add('activo');
            categoriaActivaFiltro = btn.dataset.categoria;
            // Respetar búsqueda activa si existe
            renderProducts(searchResults);
        });
    });
 
    document.querySelectorAll('.btn-filtro-estado').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-filtro-estado')
                .forEach(b => b.classList.remove('activo'));
            btn.classList.add('activo');
            renderPedidosAdmin(btn.dataset.estado);
        });
    });
 
    const btnRef = document.getElementById('btnRefrescarPedidosAdmin');
    if (btnRef) btnRef.addEventListener('click', cargarPedidosAdmin);
    if (btnBorrarTodasVentasCanceladas) {
        btnBorrarTodasVentasCanceladas.addEventListener('click', eliminarTodosLosPedidosCancelados);
    }
    
    // Evento para navegar al historial online (nueva pantalla)
    if (btnVerHistorialOnline) {
        btnVerHistorialOnline.addEventListener('click', async (e) => {
            e.preventDefault();
            await cargarPedidosAdmin();
            showScreen('pantalla-historial-online');
        });
    }

    // Botón volver desde historial online
    const btnVolverDesdeHistorialOnline = document.querySelector('#btnVolverDesdeHistorialOnline');
    if (btnVolverDesdeHistorialOnline) {
        btnVolverDesdeHistorialOnline.addEventListener('click', () => {
            showScreen('pantalla-ventas-online');
        });
    }

    // Botón volver desde historial físicas
    const btnVolverDesdeHistorialFisicas = document.querySelector('#btnVolverDesdeHistorialFisicas');
    if (btnVolverDesdeHistorialFisicas) {
        btnVolverDesdeHistorialFisicas.addEventListener('click', () => {
            showScreen('pantalla-ventas-fisicas');
        });
    }

    // Toggle Ventas de Hoy (ahora en pantalla-historial-fisicas)
    const headerToggle = document.getElementById('btnToggleVentasHoy');
    const listaToggle  = document.getElementById('listaVentasHoy');
    if (headerToggle && listaToggle) {
        headerToggle.addEventListener('click', () => {
            listaToggle.classList.toggle('oculto');
            headerToggle.classList.toggle('cerrado');
        });
    }

    // Toggle Días Anteriores — historial físicas
    const headerHistFisicas = document.getElementById('btnToggleHistorialFisicas');
    const listaHistFisicas  = document.getElementById('listaHistorialAcordeon');
    if (headerHistFisicas && listaHistFisicas) {
        headerHistFisicas.addEventListener('click', () => {
            listaHistFisicas.classList.toggle('oculto');
            headerHistFisicas.classList.toggle('cerrado');
        });
    }

    // Toggle Entregas de Hoy — historial online
    const headerEntregasHoy = document.getElementById('btnToggleEntregasHoy');
    const listaEntregasHoy  = document.getElementById('listaEntregasHoy');
    if (headerEntregasHoy && listaEntregasHoy) {
        headerEntregasHoy.addEventListener('click', () => {
            listaEntregasHoy.classList.toggle('oculto');
            headerEntregasHoy.classList.toggle('cerrado');
        });
    }

    // Toggle Historial Anterior — historial online
    const headerHistOnline = document.getElementById('btnToggleHistorialOnline');
    const listaHistOnline  = document.getElementById('listaHistorialEntregasAcordeon');
    if (headerHistOnline && listaHistOnline) {
        headerHistOnline.addEventListener('click', () => {
            listaHistOnline.classList.toggle('oculto');
            headerHistOnline.classList.toggle('cerrado');
        });
    }
});