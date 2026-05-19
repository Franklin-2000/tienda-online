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
 * La alerta NO se cierra sola — siempre espera una acción deliberada del usuario.
 * Protección de 350ms contra teclas heredadas del contexto anterior.
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

        let puedesCerrar = false;

        const cerrar = () => {
            if (!puedesCerrar) return;          // bloquear cierres prematuros
            overlay.classList.add('cerrando');
            document.removeEventListener('keydown', onKey);
            setTimeout(() => {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                resolve();
            }, 170);
        };

        const onKey = (e) => {
            if (!puedesCerrar) return;          // ignorar teclas heredadas
            if (e.key === 'Enter' || e.key === 'Escape') {
                e.preventDefault();
                cerrar();
            }
        };

        overlay.querySelector('#__btn-ok').addEventListener('click', cerrar);
        document.addEventListener('keydown', onKey);
        document.body.appendChild(overlay);

        // Dar foco al botón y habilitar cierre tras 350ms
        // (tiempo suficiente para que cualquier keydown previo ya pasó)
        setTimeout(() => {
            const btn = overlay.querySelector('#__btn-ok');
            if (btn) btn.focus();
            puedesCerrar = true;
        }, 350);
    });
}

/**
 * Confirmación personalizada. Enter = Aceptar / Escape = Cancelar.
 * La confirmación NO se cierra sola — siempre espera una acción deliberada del usuario.
 * Protección de 350ms contra teclas heredadas del contexto anterior.
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

        let puedesCerrar = false;

        const cerrar = (resultado) => {
            if (!puedesCerrar) return;          // bloquear cierres prematuros
            overlay.classList.add('cerrando');
            document.removeEventListener('keydown', onKey);
            setTimeout(() => {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                resolve(resultado);
            }, 170);
        };

        const onKey = (e) => {
            if (!puedesCerrar) return;          // ignorar teclas heredadas
            if (e.key === 'Enter') { e.preventDefault(); cerrar(true); }
            if (e.key === 'Escape') { e.preventDefault(); cerrar(false); }
        };

        overlay.querySelector('#__btn-ok').addEventListener('click', () => cerrar(true));
        overlay.querySelector('#__btn-cancel').addEventListener('click', () => cerrar(false));
        document.addEventListener('keydown', onKey);
        document.body.appendChild(overlay);

        // Dar foco al botón Aceptar y habilitar cierre tras 350ms
        setTimeout(() => {
            const btn = overlay.querySelector('#__btn-ok');
            if (btn) btn.focus();
            puedesCerrar = true;
        }, 350);
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
const btnVolverVentasFisicas = null; // eliminado del HTML — navegación solo por sidebar
const btnVolverVentasOnline = null;  // eliminado del HTML — navegación solo por sidebar

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

const btnVolverInicio = null; // eliminado del HTML — navegación solo por sidebar

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
        await mostrarAlerta('❌ No se pudo cargar el inventario.\n' + (error.message || 'Verifica tu conexión a internet.'), 'error');
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
        await mostrarAlerta('❌ No se pudo cargar el historial de ventas.\n' + (errorVentas.message || 'Verifica tu conexión a internet.'), 'error');
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
        '#pantalla-ventas-online, #pantalla-historial-online, #pantalla-estadisticas, ' +
        '#pantalla-estadisticas-online, #pantalla-combos, #pantalla-historial-combos'
    ).forEach(function(el) {
        el.classList.remove('activa');
    });

    // Gestionar visibilidad del sidebar global
    const sidebar = document.getElementById('sidebar-menu');
    const pantallasSinSidebar = ['pantalla-login', 'pantalla-menu-ventas'];
    if (sidebar) {
        if (pantallasSinSidebar.includes(screenId)) {
            sidebar.classList.remove('activo');
        } else {
            sidebar.classList.add('activo');
        }
    }

    // Marcar ítem activo en sidebar
    const mapaActivoSidebar = {
        'pantalla-INVENTARIO':           'btn-Inventario',
        'pantalla-ventas-fisicas':       'btn-Menu-Ventas-Fisicas',
        'pantalla-historial-fisicas':    'btn-Menu-Ventas-Fisicas',
        'pantalla-ventas-online':        'btn-Menu-Ventas-Online',
        'pantalla-historial-online':     'btn-Menu-Ventas-Online',
        'pantalla-historial-combos':     'btn-Combos',
        'pantalla-estadisticas':         'btn-Estadisticas',
        'pantalla-estadisticas-online':  'btn-EstadisticasOnline',
        'pantalla-combos':               'btn-Combos',
    };
    document.querySelectorAll('.sidebar-boton').forEach(function(b) { b.classList.remove('sidebar-activo'); });
    const btnActivoId = mapaActivoSidebar[screenId];
    if (btnActivoId) {
        const btnActivo = document.getElementById(btnActivoId);
        if (btnActivo) btnActivo.classList.add('sidebar-activo');
    }

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
        case 'pantalla-estadisticas': {
            var pe = document.querySelector('#pantalla-estadisticas');
            show(pe);
            initEstadisticas();
            break;
        }
        case 'pantalla-estadisticas-online': {
            var peo = document.querySelector('#pantalla-estadisticas-online');
            show(peo);
            initEstadisticasOnline();
            break;
        }
        case 'pantalla-combos': {
            var pc = document.querySelector('#pantalla-combos');
            show(pc);
            renderCombos();
            break;
        }
        case 'pantalla-historial-combos': {
            var phc = document.querySelector('#pantalla-historial-combos');
            show(phc);
            renderHistorialCombos();
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
        // Ocultar sidebar al cerrar sesión
        const sidebar = document.getElementById('sidebar-menu');
        if (sidebar) sidebar.classList.remove('activo');
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

// btnVolverInicio fue eliminado del HTML — navegación solo por sidebar
if (btnVolverInicio) {
    btnVolverInicio.addEventListener("click", function() {
        showScreen('pantalla-inicio');
    });
}

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

// Sidebar: Estadísticas Ventas Físicas
const btnEstadisticas = document.getElementById('btn-Estadisticas');
if (btnEstadisticas) {
    btnEstadisticas.addEventListener("click", function(e) {
        e.preventDefault();
        showScreen('pantalla-estadisticas');
    });
}

// Sidebar: Estadísticas Ventas Online
const btnEstadisticasOnline = document.getElementById('btn-EstadisticasOnline');
if (btnEstadisticasOnline) {
    btnEstadisticasOnline.addEventListener("click", function(e) {
        e.preventDefault();
        showScreen('pantalla-estadisticas-online');
    });
}



// Sidebar: Combos
const btnCombos = document.getElementById('btn-Combos');
if (btnCombos) {
    btnCombos.addEventListener("click", function(e) {
        e.preventDefault();
        showScreen('pantalla-combos');
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

    // En modo offline solo eliminar localmente (no hay cómo revertir en Supabase)
    if (modoOffline) {
        const sale = sales.find(s => s.globalId === ticketGlobalId);
        if (sale) {
            // Reponer stock visualmente
            for (const item of (sale.items || [])) {
                const prod = inventory.find(p => p.id && p.id.toString() === item.productId?.toString());
                if (prod) prod.cantidad += item.qty;
            }
            sales = sales.filter(s => s.globalId !== ticketGlobalId);
            await guardarInventarioCache();
            updateSalesDropdown();
            renderSalesHistory();
        }
        await mostrarAlerta("Ticket eliminado localmente. El stock fue repuesto en la vista.", 'success');
        return;
    }

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
            for (let item of currentCart) {
                const prod = inventory.find(p => p.id.toString() === item.id.toString());
                if (prod) prod.cantidad -= item.qty;
            }
            updateSalesDropdown();

            // En offline no llamamos a Supabase — generamos ID local con timestamp
            let numeroTicket;
            if (modoOffline) {
                const ahora = new Date();
                const hhmm = String(ahora.getHours()).padStart(2,'0') + String(ahora.getMinutes()).padStart(2,'0');
                numeroTicket = 'OFF-' + hhmm + '-' + String(Date.now()).slice(-4);
            } else {
                numeroTicket = await generarNumeroTicket();
            }

            const newSale = {
                globalId:    Date.now(), 
                id:          `V-${numeroTicket}`,
                total:       totalSale,
                date:        saleDateStr,
                fechaLimpia: soloFechaStr, 
                items:       cartItemsForReceipt 
            };

            if (modoOffline) {
                // MODO OFFLINE: guardar en IndexedDB
                await guardarVentaOffline(newSale);
                sales.unshift(newSale);
                renderSalesHistory();
                if (await mostrarConfirm("¿Desea imprimir la factura de esta venta?", 'info')) {
                    imprimirFacturaTicket(newSale);
                }
                limpiarTodaLaVenta();
                await mostrarAlerta(`✅ Venta guardada localmente.\nTicket #${newSale.id} por $${totalSale.toLocaleString('es-CO')}\nSe sincronizará con Supabase cuando actives el modo en línea.`, 'success');
            } else {
                // MODO ONLINE: guardar en Supabase
                const ventaGuardada = await saveSale(newSale);
                newSale.supabaseId = ventaGuardada.id;
                sales.unshift(newSale);
                await loadInventory();
                renderSalesHistory();
                if (await mostrarConfirm("¿Desea imprimir la factura de esta venta?", 'info')) {
                    imprimirFacturaTicket(newSale);
                }
                limpiarTodaLaVenta();
                if(inputBuscarProductVenta) inputBuscarProductVenta.focus();
                await mostrarAlerta(`¡Venta registrada con éxito!\nTicket #${newSale.id} por $${totalSale.toLocaleString('es-CO')}`, 'success');
            }

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
            if (s.id && String(s.id).startsWith('ONLINE-')) return false;
            if (s.id && String(s.id).startsWith('COMBO-')) return false;
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
        // Excluir ventas online y combos del historial físico
        if (sale.id && String(sale.id).startsWith('ONLINE-')) return;
        if (sale.id && String(sale.id).startsWith('COMBO-')) return;
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

// ──────────────────────────────────────────────────────
// TICKET VENTAS FÍSICAS — identificador visual claro
// Clase CSS: venta-ticket-fisica | Badge: 🛒 Venta Física
// ──────────────────────────────────────────────────────
function crearDOMTicket(sale, esDeHoy) {
    const ticketDiv = document.createElement('div');
    ticketDiv.className = 'venta-ticket venta-ticket-fisica';
    ticketDiv.dataset.tipo = 'fisica';

    let itemsHtml = '<ul class="ticket-items-list">';
    if (sale.items && sale.items.length > 0) {
        sale.items.forEach(item => {
            const sub = Number(item.subtotal).toLocaleString('es-CO');
            itemsHtml += `<li class="ticket-item-row">
                <span class="ticket-item-name">${item.qty}x ${item.name}</span>
                <span class="ticket-item-sub">$${sub}</span>
            </li>`;
        });
    } else {
        itemsHtml += '<li>Sin detalle de productos.</li>';
    }
    itemsHtml += '</ul>';

    const esOffline = String(sale.id).includes('OFF-');
    const badgeOffline = esOffline
        ? '<span class="ticket-badge ticket-badge-offline">⚡ Local</span>'
        : '';
    const botonEliminarHtml = esDeHoy
        ? `<button class="btn-eliminar-ticket" onclick="eliminarTicket(${sale.globalId}); event.stopPropagation();">✖ Eliminar</button>`
        : '';
    const totalFmt = Number(sale.total).toLocaleString('es-CO');
    const horaStr = sale.date ? (sale.date.split(',')[1] || sale.date).trim() : '';

    ticketDiv.innerHTML = `
        <div class="venta-ticket-header">
            <div class="ticket-header-left">
                <div class="ticket-badges-row">
                    <span class="ticket-badge ticket-badge-fisica">🛒 Venta Física</span>
                    ${badgeOffline}
                </div>
                <strong class="ticket-numero">${sale.id}</strong>
                <span class="fecha-venta">${horaStr}</span>
            </div>
            <div class="ticket-header-right">
                <strong class="ticket-total">$${totalFmt}</strong>
                ${botonEliminarHtml}
                <span class="ticket-toggle-arrow">Ver detalles ▼</span>
            </div>
        </div>
        <div class="venta-ticket-details">
            ${itemsHtml}
        </div>
    `;

    ticketDiv.querySelector('.venta-ticket-header').addEventListener('click', () => {
        const details = ticketDiv.querySelector('.venta-ticket-details');
        const arrow = ticketDiv.querySelector('.ticket-toggle-arrow');
        const open = details.style.display === 'block';
        details.style.display = open ? 'none' : 'block';
        if (arrow) arrow.textContent = open ? 'Ver detalles ▼' : 'Ocultar ▲';
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
// BOTÓN ACTUALIZAR (sidebar)
// ==========================================
(function() {
    const btnActualizar = document.getElementById('btnActualizar');
    if (!btnActualizar) return;
    btnActualizar.addEventListener('click', async function() {
        btnActualizar.classList.add('girando');
        btnActualizar.disabled = true;
        try {
            await Promise.all([
                loadInventory(),
                loadSales(),
                loadCombos(),
                cargarPedidosAdmin()
            ]);
        } catch(e) {
            console.error('Error actualizando datos:', e);
        }
        showScreen('pantalla-inicio', false);
        btnActualizar.classList.remove('girando');
        btnActualizar.disabled = false;
    });
})();

// ==========================================
// LOGO SOFTVEN — quitar fondo blanco via canvas
// ==========================================
(function() {
    function procesarLogo(img) {
        const origW = img.naturalWidth;
        const origH = img.naturalHeight;
        const canvas = document.createElement('canvas');
        canvas.width = origW; canvas.height = origH;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, origW, origH);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
            if (d[i] > 210 && d[i+1] > 210 && d[i+2] > 210) d[i+3] = 0;
        }
        ctx.putImageData(imgData, 0, 0);
        img.src = canvas.toDataURL('image/png');
    }
    const logoImg = document.getElementById('softven-logo-img');
    if (!logoImg) return;
    if (logoImg.complete && logoImg.naturalWidth > 0) {
        procesarLogo(logoImg);
    } else {
        logoImg.addEventListener('load', function() { procesarLogo(logoImg); });
    }
    logoImg.addEventListener('error', function() { logoImg.style.display = 'none'; });
})();

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
const btnBorrarTodasVentasCanceladas = document.querySelector('#btnBorrarTodasVentasCanceladas');
 
 
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
        let msg;
        const partes = (error.message || '').split('|');
        if (partes[0] === 'STOCK_INSUF' && partes.length === 4) {
            const [, nombre, disponible, necesario] = partes;
            const faltan = Number(necesario) - Number(disponible);
            msg = `❌ Stock insuficiente\n\nProducto: "${nombre}"\nDisponible: ${disponible} unidad${Number(disponible) !== 1 ? 'es' : ''}\nNecesario: ${necesario} unidad${Number(necesario) !== 1 ? 'es' : ''}\nFaltan: ${faltan} unidad${faltan !== 1 ? 'es' : ''}\n\nRecarga el inventario antes de confirmar este pedido.`;
        } else {
            msg = `Error: ${error.message}`;
        }
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
        await crearTicketsComboOnline(pedidoId);
        renderHistorialCombos();
        await mostrarAlerta(`✅ Pago del pedido #${pedidoId} confirmado.\nInventario descontado e historial actualizado.`, 'success');
    }
}

// ---------------------------------------------------------------
// Crear tickets COMBO-ONLINE si el trigger SQL no los generó
// ---------------------------------------------------------------
async function crearTicketsComboOnline(pedidoId) {
    const { data: itemsPedido, error } = await supabaseClient
        .from('items_pedido')
        .select('id, nombre, cantidad, precio, combo_id')
        .eq('pedido_id', pedidoId);

    if (error || !itemsPedido) return;

    const comboItems = itemsPedido.filter(i =>
        i.combo_id || (i.nombre && String(i.nombre).startsWith('🎁 Combo:'))
    );
    if (comboItems.length === 0) return;

    // Si el trigger SQL ya creó algún ticket para este pedido, no duplicar
    if (sales.some(s => s.id && String(s.id).startsWith(`COMBO-ONLINE-${pedidoId}`))) return;

    if (!combos.length) await loadCombos();

    // Usar el momento de confirmación como fecha real de la venta
    const ahora = new Date();
    const fechaLimpia = `${String(ahora.getDate()).padStart(2,'0')}/${String(ahora.getMonth()+1).padStart(2,'0')}/${ahora.getFullYear()}`;

    for (let idx = 0; idx < comboItems.length; idx++) {
        const item     = comboItems[idx];
        const ticketId = comboItems.length === 1
            ? `COMBO-ONLINE-${pedidoId}`
            : `COMBO-ONLINE-${pedidoId}-${idx + 1}`;

        const combo     = combos.find(c =>
            c.id === item.combo_id ||
            c.nombre === String(item.nombre).replace('🎁 Combo: ', '').trim()
        );
        const comboProd = combo?.combo_productos || [];

        const itemsVenta = comboProd.map(cp => ({
            productId: cp.product_id || '',
            name:      cp.nombre     || 'Producto',
            qty:       (Number(cp.cantidad) || 1) * item.cantidad,
            price:     Number(cp.precio)   || 0,
            subtotal:  (Number(cp.precio) || 0) * (Number(cp.cantidad) || 1) * item.cantidad
        }));

        const newSale = {
            globalId:    Date.now() + Math.floor(Math.random() * 1000),
            id:          ticketId,
            total:       Number(item.precio) * item.cantidad,
            date:        ahora.toLocaleString(),
            fechaLimpia: fechaLimpia,
            items:       itemsVenta
        };

        try {
            const guardada     = await saveSale(newSale);
            newSale.supabaseId = guardada.id;
            sales.unshift(newSale);
        } catch (e) {
            console.error('[ComboOnline] Error guardando ticket COMBO-ONLINE:', e);
        }
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

    // Normaliza DD/MM/YYYY o D/M/YYYY a localeDateString('es-CO') para comparar
    const normFechaLimpia = fl => {
        if (!fl) return '';
        const p = String(fl).split('/');
        if (p.length !== 3) return fl;
        return new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0])).toLocaleDateString('es-CO');
    };

    pedidosEntregados.forEach(pedido => {
        const esComboP = (pedido.items_pedido || []).some(i =>
            i.combo_id || (i.nombre && String(i.nombre).startsWith('🎁 Combo:'))
        );
        let fecha;
        if (esComboP) {
            // Para combos usar la fecha del ticket (momento de confirmación)
            const t = sales.find(s => s.id && String(s.id).startsWith(`COMBO-ONLINE-${pedido.id}`));
            fecha = t?.fechaLimpia ? normFechaLimpia(t.fechaLimpia) : new Date(pedido.fecha).toLocaleDateString('es-CO');
        } else {
            fecha = new Date(pedido.fecha).toLocaleDateString('es-CO');
        }

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
// ──────────────────────────────────────────────────────
// TICKET VENTAS ONLINE — identificador visual claro
// Clase CSS: venta-ticket-online | Badge: 🌐 Pedido Online
// ──────────────────────────────────────────────────────
function crearDOMTicketOnline(pedido, esDeHoy) {
    const ticketDiv = document.createElement('div');

    // Detectar si es un pedido de combo
    const esCombo = (pedido.items_pedido || []).some(i =>
        i.combo_id || (i.nombre && String(i.nombre).startsWith('🎁 Combo:'))
    );

    ticketDiv.className = `venta-ticket ${esCombo ? 'venta-ticket-combo' : 'venta-ticket-online'}`;
    ticketDiv.dataset.tipo = esCombo ? 'combo-online' : 'online';

    // Usar el ID real del ticket en sales para que coincida exactamente con historial de combos
    const ticketReal = esCombo
        ? sales.find(s => s.id && String(s.id).startsWith(`COMBO-ONLINE-${pedido.id}`))
        : null;
    const nombreTicket = esCombo
        ? (ticketReal ? ticketReal.id : `COMBO-ONLINE-${pedido.id}`)
        : `Pedido #${pedido.id}`;
    const badgePrincipal = esCombo
        ? '<span class="ticket-badge ticket-badge-combo">🎁 Venta Combo</span><span class="ticket-badge ticket-badge-online-combo">🌐 Online</span>'
        : '<span class="ticket-badge ticket-badge-online">🌐 Pedido Online</span>';

    let itemsHtml = '<ul class="ticket-items-list">';
    (pedido.items_pedido || []).forEach(item => {
        const sub = Number(item.subtotal).toLocaleString('es-CO');
        itemsHtml += `<li class="ticket-item-row">
            <span class="ticket-item-name">${item.cantidad}x ${item.nombre}</span>
            <span class="ticket-item-sub">$${sub}</span>
        </li>`;
    });
    itemsHtml += '</ul>';

    // Combos: mostrar fecha/hora de confirmación (ticket) en formato AM/PM; pedidos normales: fecha del pedido
    const fecha = (esCombo && ticketReal?.date)
        ? fechaDBaLocale(ticketReal.date)
        : new Date(pedido.fecha).toLocaleString('es-CO');
    const totalFmt = Number(pedido.total).toLocaleString('es-CO');
    const metodoBadge = pedido.metodo_pago === 'contraentrega'
        ? '<span class="ticket-badge ticket-badge-contraentrega">💵 Contra entrega</span>'
        : '<span class="ticket-badge ticket-badge-online-pago">💳 Pago online</span>';

    ticketDiv.innerHTML = `
        <div class="venta-ticket-header">
            <div class="ticket-header-left">
                <div class="ticket-badges-row">
                    ${badgePrincipal}
                    ${metodoBadge}
                </div>
                <strong class="ticket-numero">${nombreTicket}</strong>
                <span class="fecha-venta">${fecha}</span>
            </div>
            <div class="ticket-header-right">
                <strong class="ticket-total">$${totalFmt}</strong>
                <span class="ticket-toggle-arrow">Ver detalles ▼</span>
            </div>
        </div>
        <div class="venta-ticket-details">
            <div class="ticket-cliente-info">
                <div><span class="ticket-info-label">👤 Cliente:</span> ${pedido.cliente_nombre}</div>
                <div><span class="ticket-info-label">📧 Email:</span> ${pedido.cliente_email}</div>
                <div><span class="ticket-info-label">📞 Teléfono:</span> ${pedido.cliente_tel}</div>
                <div><span class="ticket-info-label">📍 Dirección:</span> ${pedido.direccion}</div>
                ${pedido.notas ? `<div><span class="ticket-info-label">📝 Notas:</span> ${pedido.notas}</div>` : ''}
            </div>
            ${itemsHtml}
        </div>
    `;

    ticketDiv.querySelector('.venta-ticket-header').addEventListener('click', () => {
        const details = ticketDiv.querySelector('.venta-ticket-details');
        const arrow = ticketDiv.querySelector('.ticket-toggle-arrow');
        const open = details.style.display === 'block';
        details.style.display = open ? 'none' : 'block';
        if (arrow) arrow.textContent = open ? 'Ver detalles ▼' : 'Ocultar ▲';
    });

    return ticketDiv;
}
 
// ---------------------------------------------------------------
// Toggle Ventas de Hoy — registrado en DOMContentLoaded (ver abajo)
// ---------------------------------------------------------------

// ---------------------------------------------------------------
// Eventos de filtros y botón refrescar
// ---------------------------------------------------------------

// ============================================================
// MÓDULO: ESTADÍSTICAS
// ============================================================
let chartTendencia = null;
let chartProductos = null;
let chartCategorias = null;
let chartIngresos   = null;
let periodoActivo   = 'diaria';

function initEstadisticas() {
    // Registrar listeners de período (solo 1 vez)
    document.querySelectorAll('.btn-period').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.btn-period').forEach(b => b.classList.remove('activo'));
            btn.classList.add('activo');
            periodoActivo = btn.dataset.period;
            renderEstadisticas(periodoActivo);
        };
    });

    // Botón volver
    const btnVolver = document.getElementById('btnVolverDesdeEstadisticas');
    if (btnVolver) btnVolver.onclick = () => showScreen('pantalla-inicio');

    renderEstadisticas(periodoActivo);
}

function parsearFechaVenta(venta) {
    // globalId puede ser epoch en MILISEGUNDOS (ventas físicas: Date.now())
    // o en SEGUNDOS (ventas ONLINE: EXTRACT(EPOCH FROM NOW()) en Supabase)
    if (venta.globalId) {
        const gid = Number(venta.globalId);
        if (gid > 1000000000000) {
            // milisegundos (ventas físicas JS)
            return new Date(gid);
        } else if (gid > 1000000000) {
            // segundos (ventas ONLINE desde Supabase) → convertir a ms
            return new Date(gid * 1000);
        }
    }
    // fechaLimpia puede venir en varios formatos:
    //   - "16/5/2026"   (toLocaleDateString del navegador, ventas físicas)
    //   - "16/05/2026"  (TO_CHAR Supabase, ventas ONLINE)
    if (venta.fechaLimpia) {
        const partes = venta.fechaLimpia.split('/');
        if (partes.length === 3) {
            const dia  = parseInt(partes[0], 10);
            const mes  = parseInt(partes[1], 10) - 1; // 0-indexed
            const anio = parseInt(partes[2], 10);
            const d = new Date(anio, mes, dia);
            if (!isNaN(d)) return d;
        }
    }
    // Fallback: intentar parsear venta.date directamente
    const d = new Date(venta.date);
    if (!isNaN(d)) return d;
    return null;
}

function filtrarVentasPorPeriodo(periodo) {
    const ahora = new Date();
    const hoyStr = ahora.toLocaleDateString(); // mismo formato que fechaLimpia
    return sales.filter(venta => {
        // Excluir ventas online de las estadísticas físicas
        if (venta.id && String(venta.id).startsWith('ONLINE-')) return false;
        // Para 'diaria': comparar strings directamente (más confiable)
        if (periodo === 'diaria') {
            const fl = venta.fechaLimpia || '';
            if (fl === hoyStr) return true;
            // Fallback con globalId (timestamp)
            if (venta.globalId && venta.globalId > 1000000000000) {
                return new Date(venta.globalId).toDateString() === ahora.toDateString();
            }
            return false;
        }
        const fechaVenta = parsearFechaVenta(venta);
        if (!fechaVenta) return false;
        if (periodo === 'semanal') {
            const inicioSemana = new Date(ahora);
            // getDay(): 0=Dom,1=Lun,...,6=Sáb → retroceder al lunes más cercano
            const diasDesdeElLunes = (ahora.getDay() + 6) % 7; // 0=Lun, 6=Dom
            inicioSemana.setDate(ahora.getDate() - diasDesdeElLunes);
            inicioSemana.setHours(0,0,0,0);
            return fechaVenta >= inicioSemana;
        } else if (periodo === 'mensual') {
            return fechaVenta.getMonth() === ahora.getMonth() &&
                   fechaVenta.getFullYear() === ahora.getFullYear();
        }
        return false;
    });
}

function filtrarVentasPorPeriodoAnterior(periodo) {
    const ahora = new Date();
    const ayer = new Date(ahora);
    ayer.setDate(ahora.getDate() - 1);
    const ayerStr = ayer.toLocaleDateString();
    return sales.filter(venta => {
        if (venta.id && String(venta.id).startsWith('ONLINE-')) return false;
        if (periodo === 'diaria') {
            const fl = venta.fechaLimpia || '';
            if (fl === ayerStr) return true;
            if (venta.globalId && venta.globalId > 1000000000000) {
                return new Date(venta.globalId).toDateString() === ayer.toDateString();
            }
            return false;
        }
        const fechaVenta = parsearFechaVenta(venta);
        if (!fechaVenta) return false;
        if (periodo === 'semanal') {
            const diasDesdeElLunesAct = (ahora.getDay() + 6) % 7;
            const inicioSemanaAnterior = new Date(ahora);
            inicioSemanaAnterior.setDate(ahora.getDate() - diasDesdeElLunesAct - 7);
            inicioSemanaAnterior.setHours(0,0,0,0);
            const finSemanaAnterior = new Date(inicioSemanaAnterior);
            finSemanaAnterior.setDate(inicioSemanaAnterior.getDate() + 7);
            return fechaVenta >= inicioSemanaAnterior && fechaVenta < finSemanaAnterior;
        } else if (periodo === 'mensual') {
            const mesAnterior = ahora.getMonth() === 0 ? 11 : ahora.getMonth() - 1;
            const anioAnterior = ahora.getMonth() === 0 ? ahora.getFullYear() - 1 : ahora.getFullYear();
            return fechaVenta.getMonth() === mesAnterior && fechaVenta.getFullYear() === anioAnterior;
        }
        return false;
    });
}

function renderEstadisticas(periodo) {
    const ventasFiltradas = filtrarVentasPorPeriodo(periodo);

    // Calcular período anterior para comparar
    const ventasAnteriores = filtrarVentasPorPeriodoAnterior(periodo);

    // --- KPIs ---
    const totalVentas      = ventasFiltradas.reduce((s,v) => s + (v.total || 0), 0);
    const numTransacciones = ventasFiltradas.length;
    const totalProductos   = ventasFiltradas.reduce((s,v) => s + v.items.reduce((a,i) => a + (i.qty||0), 0), 0);
    const ticketPromedio   = numTransacciones > 0 ? totalVentas / numTransacciones : 0;

    const totalAnt      = ventasAnteriores.reduce((s,v) => s + (v.total || 0), 0);
    const transAnt      = ventasAnteriores.length;
    const prodAnt       = ventasAnteriores.reduce((s,v) => s + v.items.reduce((a,i) => a + (i.qty||0), 0), 0);
    const ticketAnt     = transAnt > 0 ? totalAnt / transAnt : 0;

    const fmt = v => '$' + Math.round(v).toLocaleString('es-CO');
    document.getElementById('kpi-total-ventas').textContent      = fmt(totalVentas);
    document.getElementById('kpi-num-transacciones').textContent  = numTransacciones;
    document.getElementById('kpi-productos-vendidos').textContent = totalProductos;
    document.getElementById('kpi-ticket-promedio').textContent    = fmt(ticketPromedio);

    // Etiqueta del período
    const labelMap = { diaria: 'Resumen de hoy', semanal: 'Esta semana', mensual: 'Este mes' };
    const subLabel = document.getElementById('stats-fecha-label');
    if (subLabel) subLabel.textContent = labelMap[periodo] || '';

    // Trends
    function setTrend(elId, compareId, actual, anterior) {
        const el = document.getElementById(elId);
        const elc = document.getElementById(compareId);
        if (!el) return;
        if (anterior === 0 && actual === 0) {
            el.textContent = '—';
            el.className = 'kpi-trend';
            if (elc) elc.textContent = 'Sin datos del período anterior';
            return;
        }
        if (anterior === 0) {
            el.textContent = '🆕 Nuevo';
            el.className = 'kpi-trend positivo';
            if (elc) elc.textContent = 'Primera vez en este período';
            return;
        }
        const pct = Math.round(((actual - anterior) / anterior) * 100);
        el.textContent = (pct >= 0 ? '▲ ' : '▼ ') + Math.abs(pct) + '%';
        el.className = 'kpi-trend ' + (pct >= 0 ? 'positivo' : 'negativo');
        const antLabel = anterior > 1000 ? fmt(anterior) : anterior + (compareId.includes('ventas') || compareId.includes('ticket') ? '' : ' uds');
        if (elc) elc.textContent = 'Período anterior: ' + (anterior > 100 ? fmt(anterior) : anterior);
    }
    setTrend('kpi-trend-ventas',  'kpi-compare-ventas',  totalVentas,      totalAnt);
    setTrend('kpi-trend-trans',   'kpi-compare-trans',   numTransacciones,  transAnt);
    setTrend('kpi-trend-prod',    'kpi-compare-prod',    totalProductos,    prodAnt);
    setTrend('kpi-trend-ticket',  'kpi-compare-ticket',  ticketPromedio,    ticketAnt);

    // --- Agrupar productos más vendidos ---
    const prodMap = {};
    const prodIngresos = {};
    ventasFiltradas.forEach(v => v.items.forEach(i => {
        prodMap[i.name]      = (prodMap[i.name] || 0) + (i.qty || 0);
        prodIngresos[i.name] = (prodIngresos[i.name] || 0) + (i.subtotal || 0);
    }));
    const topProductos = Object.entries(prodMap)
        .sort((a,b) => b[1]-a[1]).slice(0, 8);

    // --- Agrupar por categoría ---
    const catMap = {};
    ventasFiltradas.forEach(v => v.items.forEach(i => {
        const prod = inventory.find(p => p.id === i.productId);
        const cat  = prod?.categoria || 'Sin categoría';
        catMap[cat] = (catMap[cat] || 0) + (i.subtotal || 0);
    }));

    // Actualizar título del gráfico tendencia según período
    const tituloTendencia = document.querySelector('.stats-chart-card.stats-chart-wide:first-child .chart-title');
    if (tituloTendencia) {
        const titulosMap = { diaria: '📈 Ingresos hora a hora (hoy)', semanal: '📈 Ingresos por día de la semana', mensual: '📈 Ingresos por día del mes' };
        tituloTendencia.textContent = titulosMap[periodo] || '📈 Tendencia de ingresos';
    }

    // --- Tendencia por período ---
    const tendenciaLabels = [];
    const tendenciaData   = [];

    if (periodo === 'diaria') {
        const porHora = Array(24).fill(0);
        ventasFiltradas.forEach(v => {
            // Usar globalId (timestamp) para obtener la hora exacta
            let hora = -1;
            if (v.globalId && v.globalId > 1000000000000) {
                hora = new Date(v.globalId).getHours();
            } else {
                hora = new Date(v.date).getHours();
            }
            if (!isNaN(hora) && hora >= 0) porHora[hora] += (v.total || 0);
        });
        for (let h = 0; h < 24; h++) {
            tendenciaLabels.push(h + ':00');
            tendenciaData.push(porHora[h]);
        }
    } else if (periodo === 'semanal') {
        // Semana Lun → Dom (índice: 0=Lun,...,6=Dom)
        const dias = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
        const porDia = Array(7).fill(0);
        ventasFiltradas.forEach(v => {
            const fv = parsearFechaVenta(v);
            if (fv) {
                // getDay(): 0=Dom,1=Lun,...,6=Sáb → convertir a índice Lun=0..Dom=6
                const idx = (fv.getDay() + 6) % 7;
                porDia[idx] += (v.total || 0);
            }
        });
        dias.forEach((d,i) => { tendenciaLabels.push(d); tendenciaData.push(porDia[i]); });
    } else {
        const diasEnMes = new Date(new Date().getFullYear(), new Date().getMonth()+1, 0).getDate();
        const porDia = Array(diasEnMes).fill(0);
        ventasFiltradas.forEach(v => {
            const fv = parsearFechaVenta(v);
            if (fv) { const d = fv.getDate() - 1; if (d >= 0 && d < diasEnMes) porDia[d] += (v.total || 0); }
        });
        for (let d = 1; d <= diasEnMes; d++) {
            tendenciaLabels.push('D' + d);
            tendenciaData.push(porDia[d-1]);
        }
    }

    // Clampear a 0 — los ingresos nunca pueden ser negativos
    for (let i = 0; i < tendenciaData.length; i++) {
        if (tendenciaData[i] < 0) tendenciaData[i] = 0;
    }

    // Badge de tendencia
    const maxVal = Math.max(...tendenciaData, 1);
    const horasPico = tendenciaData.filter(v => v > 0).length;
    const badgeTend = document.getElementById('chart-badge-tendencia');
    if (badgeTend) {
        if (periodo === 'diaria') badgeTend.textContent = horasPico > 0 ? `${horasPico} hora${horasPico > 1 ? 's' : ''} con ventas` : 'Sin ventas hoy';
        else badgeTend.textContent = fmt(totalVentas) + ' total';
    }
    const badgeIng  = document.getElementById('chart-badge-ingresos');
    if (badgeIng) {
        badgeIng.textContent = numTransacciones === 0 ? 'Sin transacciones' :
            numTransacciones + ' venta' + (numTransacciones > 1 ? 's' : '');
    }

    const CHART_DEFAULTS = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#ffffff', font: { size: 14 } } } },
        scales: {
            x: { ticks: { color: '#ffffff', font: { size: 13 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
            y: { min: 0, ticks: { color: '#ffffff', font: { size: 13 }, callback: v => v >= 1000 ? '$'+Math.round(v/1000)+'k' : '$'+v }, grid: { color: 'rgba(255,255,255,0.04)' } }
        }
    };

    const COLORS_GRAD = [
        'rgba(122,228,214,0.75)', 'rgba(100,180,255,0.75)', 'rgba(180,140,255,0.75)',
        'rgba(255,160,80,0.75)',  'rgba(255,100,150,0.75)', 'rgba(80,220,160,0.75)',
        'rgba(255,210,70,0.75)',  'rgba(120,160,255,0.75)'
    ];

    function destroyChart(ref) { try { if (ref) ref.destroy(); } catch(e){} }
    function getCtx(id) { return document.getElementById(id)?.getContext('2d'); }

    // Gráfico 1: Tendencia (área)
    destroyChart(chartTendencia);
    const ctx1 = getCtx('chartTendencia');
    if (ctx1) chartTendencia = new Chart(ctx1, {
        type: 'line',
        data: {
            labels: tendenciaLabels,
            datasets: [{
                label: 'Ingresos',
                data: tendenciaData,
                borderColor: '#7ae4d6',
                backgroundColor: (ctx) => {
                    const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 210);
                    gradient.addColorStop(0, 'rgba(122,228,214,0.18)');
                    gradient.addColorStop(1, 'rgba(122,228,214,0.01)');
                    return gradient;
                },
                pointBackgroundColor: '#7ae4d6',
                pointRadius: 3,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.35,
                borderWidth: 2
            }]
        },
        options: { ...CHART_DEFAULTS, plugins: { ...CHART_DEFAULTS.plugins, legend: { display: false } } }
    });

    // Gráfico 2: Productos más vendidos (barras verticales)
    destroyChart(chartProductos);
    const ctx2 = getCtx('chartProductos');
    if (ctx2) chartProductos = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: topProductos.map(p => p[0].length > 16 ? p[0].slice(0,16)+'…' : p[0]),
            datasets: [{
                label: 'Unidades vendidas',
                data: topProductos.map(p => p[1]),
                backgroundColor: COLORS_GRAD,
                borderRadius: 6
            }]
        },
        options: {
            ...CHART_DEFAULTS,
            plugins: { legend: { display: false }, tooltip: {
                callbacks: { label: ctx => ` ${ctx.raw} unidades` }
            }},
            scales: {
                x: { ticks: { color: '#ffffff', font: { size: 14 } }, grid: { display: false } },
                y: { min: 0, ticks: { color: '#ffffff', font: { size: 13 }, stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.04)' } }
            }
        }
    });

    // Gráfico 3: Categorías (dona)
    destroyChart(chartCategorias);
    const ctx3 = getCtx('chartCategorias');
    if (ctx3) chartCategorias = new Chart(ctx3, {
        type: 'doughnut',
        data: {
            labels: Object.keys(catMap),
            datasets: [{
                data: Object.values(catMap),
                backgroundColor: COLORS_GRAD,
                borderColor: 'rgba(8,15,26,0.8)',
                borderWidth: 2,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '62%',
            plugins: {
                legend: { position: 'right', labels: { color: '#ffffff', font: { size: 22, weight: 'bold' }, boxWidth: 22, padding: 24 } }
            }
        }
    });

    // Gráfico 4: Distribución barras
    destroyChart(chartIngresos);
    const ctx4 = getCtx('chartIngresos');
    if (ctx4) chartIngresos = new Chart(ctx4, {
        type: 'bar',
        data: {
            labels: tendenciaLabels,
            datasets: [{
                label: 'Ingresos $',
                data: tendenciaData,
                backgroundColor: tendenciaData.map(v => v === maxVal
                    ? 'rgba(122,228,214,0.85)' : 'rgba(122,228,214,0.22)'),
                borderColor: tendenciaData.map(v => v === maxVal
                    ? '#7ae4d6' : 'rgba(122,228,214,0.15)'),
                borderWidth: 1.5,
                borderRadius: 4
            }]
        },
        options: { ...CHART_DEFAULTS, plugins: { ...CHART_DEFAULTS.plugins, legend: { display: false } } }
    });

    // --- Tabla de productos ---
    const tbody = document.getElementById('stats-tabla-body');
    if (tbody) {
        const todosProductos = Object.entries(prodMap)
            .sort((a,b) => b[1]-a[1]).slice(0,15);
        if (todosProductos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="stats-tabla-empty">📭 Aún no hay ventas registradas en este período.<br><small style="opacity:0.6">Registra una venta y los datos aparecerán aquí.</small></td></tr>';
        } else {
            const maxIngreso = Math.max(...todosProductos.map(p => prodIngresos[p[0]] || 0), 1);
            tbody.innerHTML = todosProductos.map(([nombre, qty], idx) => {
                const ingreso = prodIngresos[nombre] || 0;
                const pct = totalVentas > 0 ? Math.round((ingreso / totalVentas) * 100) : 0;
                return `<tr>
                    <td>${idx+1}</td>
                    <td style="text-align:left">${nombre}</td>
                    <td>${qty}</td>
                    <td>${fmt(ingreso)}</td>
                    <td>
                        <div class="stats-pct-bar">
                            <span class="stats-pct-num">${pct}%</span>
                            <div class="stats-pct-track">
                                <div class="stats-pct-fill" style="width:${pct}%"></div>
                            </div>
                        </div>
                    </td>
                </tr>`;
            }).join('');
        }
    }
}

// ============================================================
// MÓDULO: ESTADÍSTICAS VENTAS ONLINE
// Solo procesa ventas cuyo número de ticket empieza con "ONLINE-"
// (generadas por el trigger fn_descontar_inventario_pedido en Supabase)
// ============================================================
let chartOnlineTendencia  = null;
let chartOnlineProductos  = null;
let chartOnlineCategorias = null;
let chartOnlineIngresos   = null;
let periodoOnlineActivo   = 'diaria';

function initEstadisticasOnline() {
    document.querySelectorAll('.btn-period-online').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.btn-period-online').forEach(b => b.classList.remove('activo'));
            btn.classList.add('activo');
            periodoOnlineActivo = btn.dataset.period;
            renderEstadisticasOnline(periodoOnlineActivo);
        };
    });
    renderEstadisticasOnline(periodoOnlineActivo);
}

function getVentasOnline() {
    // Solo ventas con prefijo ONLINE- (pedidos confirmados de la tienda)
    return sales.filter(v => v.id && String(v.id).startsWith('ONLINE-'));
}

function filtrarOnlinePorPeriodo(periodo, ventasOnline) {
    const ahora  = new Date();
    const hoyStr = ahora.toDateString(); // formato invariante del navegador
    return ventasOnline.filter(venta => {
        const fv = parsearFechaVenta(venta);
        if (!fv) return false;
        if (periodo === 'diaria') {
            return fv.toDateString() === hoyStr;
        }
        if (periodo === 'semanal') {
            const ini = new Date(ahora);
            const diasDesdeElLunes = (ahora.getDay() + 6) % 7;
            ini.setDate(ahora.getDate() - diasDesdeElLunes);
            ini.setHours(0,0,0,0);
            return fv >= ini;
        }
        if (periodo === 'mensual') {
            return fv.getMonth() === ahora.getMonth() && fv.getFullYear() === ahora.getFullYear();
        }
        return false;
    });
}

function filtrarOnlinePorPeriodoAnterior(periodo, ventasOnline) {
    const ahora   = new Date();
    const ayer    = new Date(ahora);
    ayer.setDate(ahora.getDate() - 1);
    const ayerStr = ayer.toDateString();
    return ventasOnline.filter(venta => {
        const fv = parsearFechaVenta(venta);
        if (!fv) return false;
        if (periodo === 'diaria') {
            return fv.toDateString() === ayerStr;
        }
        if (periodo === 'semanal') {
            const diasDesdeElLunesAct = (ahora.getDay() + 6) % 7;
            const ini = new Date(ahora);
            ini.setDate(ahora.getDate() - diasDesdeElLunesAct - 7);
            ini.setHours(0,0,0,0);
            const fin = new Date(ini);
            fin.setDate(ini.getDate() + 7);
            return fv >= ini && fv < fin;
        }
        if (periodo === 'mensual') {
            const mes  = ahora.getMonth() === 0 ? 11 : ahora.getMonth() - 1;
            const anio = ahora.getMonth() === 0 ? ahora.getFullYear() - 1 : ahora.getFullYear();
            return fv.getMonth() === mes && fv.getFullYear() === anio;
        }
        return false;
    });
}

function renderEstadisticasOnline(periodo) {
    const todasOnline      = getVentasOnline();
    const ventasFiltradas  = filtrarOnlinePorPeriodo(periodo, todasOnline);
    const ventasAnteriores = filtrarOnlinePorPeriodoAnterior(periodo, todasOnline);

    // Tickets COMBO-ONLINE: sus items individuales contribuyen a stats de productos
    const todasComboOnline = sales.filter(v => v.id && String(v.id).startsWith('COMBO-ONLINE-'));
    const comboFiltradas   = filtrarOnlinePorPeriodo(periodo, todasComboOnline);

    // Items fusionados: de ONLINE- excluir resúmenes "🎁 Combo:..." + todos los de COMBO-ONLINE
    const itemsOnlineSinCombo = ventasFiltradas.flatMap(v =>
        v.items.filter(i => !String(i.name || '').startsWith('🎁'))
    );
    const itemsComboOnline    = comboFiltradas.flatMap(v => v.items);
    const todosItemsOnline    = [...itemsOnlineSinCombo, ...itemsComboOnline];

    const fmt = v => '$' + Math.round(v).toLocaleString('es-CO');

    // --- KPIs ---
    // Ingresos y transacciones: solo ONLINE- (ya incluye totales de combos, sin duplicar)
    const totalVentas      = ventasFiltradas.reduce((s,v) => s + (v.total || 0), 0);
    const numTransacciones = ventasFiltradas.length;
    // Productos: items reales (individuales del combo + productos sueltos online)
    const totalProductos   = todosItemsOnline.reduce((a,i) => a + (i.qty||0), 0);
    const ticketPromedio   = numTransacciones > 0 ? totalVentas / numTransacciones : 0;
    const totalAnt  = ventasAnteriores.reduce((s,v) => s + (v.total || 0), 0);
    const transAnt  = ventasAnteriores.length;
    const prodAnt   = ventasAnteriores.reduce((s,v) => s + v.items.filter(i => !String(i.name||'').startsWith('🎁')).reduce((a,i) => a + (i.qty||0), 0), 0);
    const ticketAnt = transAnt > 0 ? totalAnt / transAnt : 0;

    const el = id => document.getElementById(id);
    if (el('kpio-total-ventas'))      el('kpio-total-ventas').textContent      = fmt(totalVentas);
    if (el('kpio-num-transacciones')) el('kpio-num-transacciones').textContent = numTransacciones;
    if (el('kpio-productos-vendidos'))el('kpio-productos-vendidos').textContent = totalProductos;
    if (el('kpio-ticket-promedio'))   el('kpio-ticket-promedio').textContent   = fmt(ticketPromedio);

    // Etiqueta período
    const labelMap = { diaria: 'Resumen de hoy', semanal: 'Esta semana', mensual: 'Este mes' };
    if (el('stats-online-fecha-label')) el('stats-online-fecha-label').textContent = labelMap[periodo] || '';

    // Trends
    function setTrendOnline(elId, compareId, actual, anterior) {
        const e = el(elId), ec = el(compareId);
        if (!e) return;
        if (anterior === 0 && actual === 0) {
            e.textContent = '—'; e.className = 'kpi-trend';
            if (ec) ec.textContent = 'Sin datos del período anterior';
            return;
        }
        if (anterior === 0) {
            e.textContent = '🆕 Nuevo'; e.className = 'kpi-trend positivo';
            if (ec) ec.textContent = 'Primera vez en este período';
            return;
        }
        const pct = Math.round(((actual - anterior) / anterior) * 100);
        e.textContent = (pct >= 0 ? '▲ ' : '▼ ') + Math.abs(pct) + '%';
        e.className = 'kpi-trend ' + (pct >= 0 ? 'positivo' : 'negativo');
        if (ec) ec.textContent = 'Período anterior: ' + (anterior > 100 ? fmt(anterior) : anterior);
    }
    setTrendOnline('kpio-trend-ventas', 'kpio-compare-ventas', totalVentas,     totalAnt);
    setTrendOnline('kpio-trend-trans',  'kpio-compare-trans',  numTransacciones, transAnt);
    setTrendOnline('kpio-trend-prod',   'kpio-compare-prod',   totalProductos,   prodAnt);
    setTrendOnline('kpio-trend-ticket', 'kpio-compare-ticket', ticketPromedio,   ticketAnt);

    // --- Agrupar productos (incluye items individuales de combos online) ---
    const prodMap = {}, prodIngresos = {};
    todosItemsOnline.forEach(i => {
        if (!i.name) return;
        prodMap[i.name]      = (prodMap[i.name] || 0) + (i.qty || 0);
        prodIngresos[i.name] = (prodIngresos[i.name] || 0) + (i.subtotal || 0);
    });
    const topProductos = Object.entries(prodMap).sort((a,b) => b[1]-a[1]).slice(0, 8);

    // --- Agrupar por categoría (incluye productos de combos online) ---
    const catMap = {};
    todosItemsOnline.forEach(i => {
        if (!i.name) return;
        const prod = inventory.find(p => p.id === i.productId || String(p.id) === String(i.productId));
        const cat  = prod?.categoria || 'Sin categoría';
        catMap[cat] = (catMap[cat] || 0) + (i.subtotal || 0);
    });

    // --- Tendencia ---
    const tendenciaLabels = [], tendenciaData = [];
    if (periodo === 'diaria') {
        const porHora = Array(24).fill(0);
        ventasFiltradas.forEach(v => {
            const fv = parsearFechaVenta(v);
            const h = fv ? fv.getHours() : NaN;
            if (!isNaN(h) && h >= 0) porHora[h] += (v.total || 0);
        });
        for (let h = 0; h < 24; h++) { tendenciaLabels.push(h+':00'); tendenciaData.push(porHora[h]); }
    } else if (periodo === 'semanal') {
        // Semana Lun → Dom
        const dias = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
        const porDia = Array(7).fill(0);
        ventasFiltradas.forEach(v => { const fv = parsearFechaVenta(v); if (fv) { const idx = (fv.getDay() + 6) % 7; porDia[idx] += (v.total||0); } });
        dias.forEach((d,i) => { tendenciaLabels.push(d); tendenciaData.push(porDia[i]); });
    } else {
        const diasEnMes = new Date(new Date().getFullYear(), new Date().getMonth()+1, 0).getDate();
        const porDia = Array(diasEnMes).fill(0);
        ventasFiltradas.forEach(v => { const fv = parsearFechaVenta(v); if (fv) { const d = fv.getDate()-1; if (d>=0&&d<diasEnMes) porDia[d]+=(v.total||0); } });
        for (let d = 1; d <= diasEnMes; d++) { tendenciaLabels.push('D'+d); tendenciaData.push(porDia[d-1]); }
    }

    // Título gráfico dinámico
    const titulosMap = { diaria: '📈 Ingresos online hora a hora (hoy)', semanal: '📈 Ingresos online por día de la semana', mensual: '📈 Ingresos online por día del mes' };
    if (el('online-chart-title-tendencia')) el('online-chart-title-tendencia').textContent = titulosMap[periodo];

    const maxVal = Math.max(...tendenciaData, 1);
    const horasPico = tendenciaData.filter(v => v > 0).length;
    if (el('online-chart-badge-tendencia')) {
        el('online-chart-badge-tendencia').textContent = periodo === 'diaria'
            ? (horasPico > 0 ? `${horasPico} hora${horasPico>1?'s':''} con pedidos` : 'Sin pedidos hoy')
            : fmt(totalVentas) + ' total';
    }
    if (el('online-chart-badge-ingresos')) {
        el('online-chart-badge-ingresos').textContent = numTransacciones === 0
            ? 'Sin pedidos' : numTransacciones + ' pedido' + (numTransacciones > 1 ? 's' : '');
    }

    const CHART_DEFAULTS = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#ffffff', font: { size: 14 } } } },
        scales: {
            x: { ticks: { color: '#ffffff', font: { size: 13 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
            y: { min: 0, ticks: { color: '#ffffff', font: { size: 13 }, callback: v => v>=1000?'$'+Math.round(v/1000)+'k':'$'+v }, grid: { color: 'rgba(255,255,255,0.04)' } }
        }
    };
    const COLORS_GRAD = [
        'rgba(100,180,255,0.75)', 'rgba(122,228,214,0.75)', 'rgba(180,140,255,0.75)',
        'rgba(255,160,80,0.75)',  'rgba(255,100,150,0.75)', 'rgba(80,220,160,0.75)',
        'rgba(255,210,70,0.75)',  'rgba(120,160,255,0.75)'
    ];
    function destroyC(ref) { try { if (ref) ref.destroy(); } catch(e){} }
    function getCtxO(id) { return document.getElementById(id)?.getContext('2d'); }

    // Gráfico 1: Tendencia
    destroyC(chartOnlineTendencia);
    const cx1 = getCtxO('chartOnlineTendencia');
    if (cx1) chartOnlineTendencia = new Chart(cx1, {
        type: 'line',
        data: { labels: tendenciaLabels, datasets: [{ label: 'Ingresos online', data: tendenciaData,
            borderColor: '#64b4ff',
            backgroundColor: ctx => { const g = ctx.chart.ctx.createLinearGradient(0,0,0,210); g.addColorStop(0,'rgba(100,180,255,0.18)'); g.addColorStop(1,'rgba(100,180,255,0.01)'); return g; },
            pointBackgroundColor: '#64b4ff', pointRadius: 3, pointHoverRadius: 6, fill: true, tension: 0.35, borderWidth: 2 }]
        },
        options: { ...CHART_DEFAULTS, plugins: { ...CHART_DEFAULTS.plugins, legend: { display: false } } }
    });

    // Gráfico 2: Top productos (barras verticales)
    destroyC(chartOnlineProductos);
    const cx2 = getCtxO('chartOnlineProductos');
    if (cx2) chartOnlineProductos = new Chart(cx2, {
        type: 'bar',
        data: { labels: topProductos.map(p => p[0].length>16?p[0].slice(0,16)+'…':p[0]),
            datasets: [{ label: 'Unidades pedidas', data: topProductos.map(p=>p[1]), backgroundColor: COLORS_GRAD, borderRadius: 6 }]
        },
        options: { ...CHART_DEFAULTS,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.raw} unidades` } } },
            scales: { x: { ticks: { color: '#ffffff', font: { size: 14 } }, grid: { display: false } },
                y: { min: 0, ticks: { color: '#ffffff', font: { size: 13 }, stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.04)' } } }
        }
    });

    // Gráfico 3: Dona categorías
    destroyC(chartOnlineCategorias);
    const cx3 = getCtxO('chartOnlineCategorias');
    if (cx3) chartOnlineCategorias = new Chart(cx3, {
        type: 'doughnut',
        data: { labels: Object.keys(catMap), datasets: [{ data: Object.values(catMap), backgroundColor: COLORS_GRAD, borderColor: 'rgba(8,15,26,0.8)', borderWidth: 2, hoverOffset: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '62%',
            plugins: { legend: { position: 'right', labels: { color: '#ffffff', font: { size: 22, weight: 'bold' }, boxWidth: 22, padding: 24 } } }
        }
    });

    // Gráfico 4: Barras distribución
    destroyC(chartOnlineIngresos);
    const cx4 = getCtxO('chartOnlineIngresos');
    if (cx4) chartOnlineIngresos = new Chart(cx4, {
        type: 'bar',
        data: { labels: tendenciaLabels, datasets: [{ label: 'Ingresos $', data: tendenciaData,
            backgroundColor: tendenciaData.map(v => v===maxVal ? 'rgba(100,180,255,0.85)' : 'rgba(100,180,255,0.22)'),
            borderColor:     tendenciaData.map(v => v===maxVal ? '#64b4ff' : 'rgba(100,180,255,0.15)'),
            borderWidth: 1.5, borderRadius: 4 }]
        },
        options: { ...CHART_DEFAULTS, plugins: { ...CHART_DEFAULTS.plugins, legend: { display: false } } }
    });

    // --- Tabla ---
    const tbody = document.getElementById('stats-online-tabla-body');
    if (tbody) {
        const todos = Object.entries(prodMap).sort((a,b) => b[1]-a[1]).slice(0,15);
        if (todos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="stats-tabla-empty">📭 Aún no hay pedidos online confirmados en este período.<br><small style="opacity:0.6">Cuando un pedido pase a "pago confirmado" aparecerá aquí.</small></td></tr>';
        } else {
            tbody.innerHTML = todos.map(([nombre, qty], idx) => {
                const ingreso = prodIngresos[nombre] || 0;
                const pct = totalVentas > 0 ? Math.round((ingreso / totalVentas) * 100) : 0;
                return `<tr>
                    <td>${idx+1}</td>
                    <td style="text-align:left">${nombre}</td>
                    <td>${qty}</td>
                    <td>${fmt(ingreso)}</td>
                    <td>
                        <div class="stats-pct-bar">
                            <span class="stats-pct-num">${pct}%</span>
                            <div class="stats-pct-track"><div class="stats-pct-fill" style="width:${pct}%"></div></div>
                        </div>
                    </td>
                </tr>`;
            }).join('');
        }
    }

    // --- Sección Tickets COMBO-ONLINE del período ---
    const seccionCombos = document.getElementById('seccionCombosOnlineStats');
    const listaCombos   = document.getElementById('listaCombosOnlineStats');
    if (seccionCombos && listaCombos) {
        if (comboFiltradas.length === 0) {
            seccionCombos.style.display = 'none';
        } else {
            seccionCombos.style.display = 'block';
            listaCombos.innerHTML = [...comboFiltradas].reverse().map(ticket => {
                const nombre = ticket.items.length > 0
                    ? ticket.items.map(i => i.name).slice(0,2).join(', ') + (ticket.items.length > 2 ? '…' : '')
                    : '—';
                return `
                <div class="combo-online-stat-row">
                    <span class="combo-stat-id">🎁 ${ticket.id}</span>
                    <span class="combo-stat-nombre">${nombre}</span>
                    <span class="combo-stat-fecha">${ticket.fechaLimpia || ''}</span>
                    <span class="combo-stat-total">${fmt(ticket.total || 0)}</span>
                </div>`;
            }).join('');
        }
    }
}
let combos = [];
let productosEnComboActual = []; // [{id, nombre, precio, imagen}]
let editandoComboId = null;

async function loadCombos() {
    if (!currentUserId) return;
    const { data, error } = await supabaseClient
        .from('combos')
        .select('*, combo_productos(*)')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });
    if (!error && data) combos = data;
}

async function saveCombo(combo) {
    const { data: comboInsertado, error: err1 } = await supabaseClient
        .from('combos')
        .insert([{ nombre: combo.nombre, descripcion: combo.descripcion, precio: combo.precio, precio_suma: combo.precioSuma, stock: combo.stock ?? 0, user_id: currentUserId }])
        .select().single();
    if (err1) throw err1;

    const items = combo.productos.map(p => ({
        combo_id: comboInsertado.id,
        product_id: p.id,
        nombre: p.nombre,
        precio: p.precio,
        imagen: p.imagen,
        user_id: currentUserId,
        cantidad: p.cantidad || 1
    }));
    const { error: err2 } = await supabaseClient.from('combo_productos').insert(items);
    if (err2) throw err2;
    return comboInsertado;
}

async function deleteCombo(comboId) {
    const { error } = await supabaseClient.from('combos').delete().eq('id', comboId);
    if (error) throw error;
}

async function updateCombo(comboId, combo) {
    const { error: err1 } = await supabaseClient
        .from('combos')
        .update({ nombre: combo.nombre, descripcion: combo.descripcion, precio: combo.precio, precio_suma: combo.precioSuma, stock: combo.stock ?? 0 })
        .eq('id', comboId);
    if (err1) throw err1;

    const { error: err2 } = await supabaseClient.from('combo_productos').delete().eq('combo_id', comboId);
    if (err2) throw err2;

    const items = combo.productos.map(p => ({
        combo_id: comboId,
        product_id: p.id,
        nombre: p.nombre,
        precio: p.precio,
        imagen: p.imagen,
        user_id: currentUserId,
        cantidad: p.cantidad || 1
    }));
    const { error: err3 } = await supabaseClient.from('combo_productos').insert(items);
    if (err3) throw err3;
}

function editarCombo(combo) {
    editandoComboId = combo.id;

    const inputNombre = document.getElementById('inputComboNombre');
    const inputDesc   = document.getElementById('inputComboDescripcion');
    const inputPrecio = document.getElementById('inputComboPrecio');
    if (inputNombre) inputNombre.value = combo.nombre || '';
    if (inputDesc)   inputDesc.value   = combo.descripcion || '';
    if (inputPrecio) inputPrecio.value = combo.precio || '';
    const inputStock = document.getElementById('inputComboStock');
    if (inputStock)  inputStock.value  = combo.stock != null ? combo.stock : '';

    productosEnComboActual = (combo.combo_productos || []).map(p => ({
        id:       p.product_id || p.id,
        nombre:   p.nombre,
        precio:   Number(p.precio) || 0,
        imagen:   p.imagen || '',
        cantidad: p.cantidad || 1
    }));

    actualizarChipsCombo();
    actualizarValorSuma();

    const btnGuardar = document.getElementById('btnGuardarCombo');
    if (btnGuardar) btnGuardar.textContent = '✏️ Actualizar Combo';

    document.querySelector('#pantalla-combos .tarjeta-input-producto')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderCombos() {
    const contenedor = document.getElementById('contenedorCombos');
    if (!contenedor) return;

    // Botones de navegación
    const btnVolver = document.getElementById('btnVolverDesdeCombos');
    if (btnVolver && !btnVolver._ev) {
        btnVolver._ev = true;
        btnVolver.onclick = () => showScreen('pantalla-inicio');
    }
    const btnGuardar = document.getElementById('btnGuardarCombo');
    if (btnGuardar && !btnGuardar._ev) {
        btnGuardar._ev = true;
        btnGuardar.onclick = handleGuardarCombo;
    }
    const btnLimpiar = document.getElementById('btnLimpiarCombo');
    if (btnLimpiar && !btnLimpiar._ev) {
        btnLimpiar._ev = true;
        btnLimpiar.onclick = limpiarFormCombo;
    }
    const btnHistCombos = document.getElementById('btnVerHistorialCombos');
    if (btnHistCombos && !btnHistCombos._ev) {
        btnHistCombos._ev = true;
        btnHistCombos.onclick = () => {
            renderHistorialCombos();
            showScreen('pantalla-historial-combos');
        };
    }
    const btnVolverHistCombos = document.getElementById('btnVolverDesdeHistorialCombos');
    if (btnVolverHistCombos && !btnVolverHistCombos._ev) {
        btnVolverHistCombos._ev = true;
        btnVolverHistCombos.onclick = () => showScreen('pantalla-combos');
    }

    // Autocomplete de búsqueda de productos
    const inputBuscar = document.getElementById('inputBuscarProductoCombo');
    const autoList    = document.getElementById('combo-autocomplete-list');
    if (inputBuscar && !inputBuscar._ev) {
        inputBuscar._ev = true;
        inputBuscar.addEventListener('input', () => {
            const q = inputBuscar.value.trim().toLowerCase();
            autoList.innerHTML = '';
            if (!q) { autoList.classList.remove('visible'); return; }
            const resultados = inventory.filter(p =>
                (p.nombre || '').toLowerCase().includes(q) ||
                (p.codigoBarras || '').includes(q)
            ).slice(0, 8);
            if (!resultados.length) { autoList.classList.remove('visible'); return; }
            resultados.forEach(p => {
                const item = document.createElement('div');
                item.className = 'combo-auto-item';
                const disponibles = p.cantidad ?? 0;
                const dispColor = disponibles > 0 ? '#2e7d32' : '#c62828';
                item.innerHTML = `
                    <img class="combo-auto-thumb" src="${p.imagen || 'https://via.placeholder.com/34'}" alt="">
                    <div class="combo-auto-info">
                        <span class="combo-auto-nombre">${p.nombre}</span>
                        <span class="combo-auto-precio">$${(p.precio||0).toLocaleString('es-CO')}</span>
                        <span class="combo-auto-stock" style="font-size:0.78em;font-weight:700;color:${dispColor}">${disponibles > 0 ? disponibles + ' disponibles' : 'Sin stock'}</span>
                    </div>`;
                item.onclick = () => {
                    agregarProductoAlCombo({ id: p.id, nombre: p.nombre, precio: p.precio || 0, imagen: p.imagen || '' });
                    inputBuscar.value = '';
                    autoList.classList.remove('visible');
                };
                autoList.appendChild(item);
            });
            autoList.classList.add('visible');
        });
        document.addEventListener('click', e => {
            if (!autoList.contains(e.target) && e.target !== inputBuscar)
                autoList.classList.remove('visible');
        });
        inputBuscar.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const primerItem = autoList.querySelector('.combo-auto-item');
                if (primerItem) primerItem.click();
            }
        });
    }

    // Enter: navegar entre campos del formulario
    const inputNombre = document.getElementById('inputComboNombre');
    const inputDesc   = document.getElementById('inputComboDescripcion');
    const inputPrecio = document.getElementById('inputComboPrecio');
    const inputStock  = document.getElementById('inputComboStock');
    if (inputNombre && !inputNombre._enterEv) {
        inputNombre._enterEv = true;
        inputNombre.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); inputDesc?.focus(); } });
    }
    if (inputDesc && !inputDesc._enterEv) {
        inputDesc._enterEv = true;
        inputDesc.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); inputStock?.focus(); } });
    }
    if (inputStock && !inputStock._enterEv) {
        inputStock._enterEv = true;
        inputStock.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); inputBuscar?.focus(); } });
    }
    if (inputPrecio && !inputPrecio._enterEv) {
        inputPrecio._enterEv = true;
        inputPrecio.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); handleGuardarCombo(); } });
    }

    loadCombos().then(() => renderTarjetasCombos());
}

function agregarProductoAlCombo(prod) {
    if (productosEnComboActual.find(p => p.id === prod.id)) {
        mostrarAlerta(`"${prod.nombre}" ya está en el combo. Puedes ajustar la cantidad en la lista.`, 'info');
        return;
    }
    const invProd = inventory.find(p => String(p.id) === String(prod.id));
    const stockDisp = invProd ? (invProd.cantidad || 0) : 0;
    if (stockDisp <= 0) {
        mostrarAlerta(`⚠️ "${prod.nombre}" no tiene stock disponible en el inventario y no puede agregarse al combo.`, 'warn');
        return;
    }
    productosEnComboActual.push({ ...prod, cantidad: 1 });
    actualizarChipsCombo();
    actualizarValorSuma();
    // Enfocar el input de cantidad del último chip y limpiarlo para que el usuario ingrese directamente
    const inputs = document.querySelectorAll('.combo-chip-qty-input');
    const ultimo = inputs[inputs.length - 1];
    if (ultimo) { ultimo.value = ''; ultimo.focus(); }
}

function actualizarChipsCombo() {
    const contenedor = document.getElementById('combo-productos-seleccionados');
    if (!contenedor) return;
    if (!productosEnComboActual.length) {
        contenedor.innerHTML = '<p class="combo-empty-msg">No hay productos agregados al combo.</p>';
        return;
    }
    contenedor.innerHTML = productosEnComboActual.map((p, idx) => `
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

    // Actualizar cantidad al cambiar el input
    contenedor.querySelectorAll('.combo-chip-qty-input').forEach(input => {
        input.addEventListener('focus', () => input.select());
        input.addEventListener('click', () => setTimeout(() => input.select(), 0));
        input.addEventListener('input', () => {
            const i   = parseInt(input.dataset.idx);
            const val = parseInt(input.value);
            if (!isNaN(val) && val >= 1) {
                // Validar contra inventario
                const prod = productosEnComboActual[i];
                const invProd = inventory.find(p => String(p.id) === String(prod.id));
                const maxDisp = invProd ? (invProd.cantidad || 0) : Infinity;
                if (val > maxDisp) {
                    input.value = '';
                    mostrarAlerta(`⚠️ Supera la cantidad existente en el inventario.\n"${prod.nombre}" solo tiene ${maxDisp} unidad${maxDisp !== 1 ? 'es' : ''} disponible${maxDisp !== 1 ? 's' : ''}.`, 'warn');
                    return;
                }
                productosEnComboActual[i].cantidad = val;
                const chip = input.closest('.combo-chip');
                if (chip) {
                    const precioSpan = chip.querySelector('.combo-chip-precio');
                    if (precioSpan) precioSpan.textContent = '$' + ((prod.precio || 0) * val).toLocaleString('es-CO');
                }
                actualizarValorSuma();
            }
        });
        input.addEventListener('blur', () => {
            const i     = parseInt(input.dataset.idx);
            const val   = parseInt(input.value);
            const prod  = productosEnComboActual[i];
            const invProd = inventory.find(p => String(p.id) === String(prod.id));
            const maxDisp = invProd ? (invProd.cantidad || 0) : Infinity;
            const final = (isNaN(val) || val < 1) ? 1 : Math.min(val, maxDisp > 0 ? maxDisp : val);
            input.value = final;
            productosEnComboActual[i].cantidad = final;
            const chip  = input.closest('.combo-chip');
            if (chip) {
                const precioSpan = chip.querySelector('.combo-chip-precio');
                if (precioSpan) precioSpan.textContent = '$' + ((productosEnComboActual[i].precio || 0) * final).toLocaleString('es-CO');
            }
            actualizarValorSuma();
        });
        input.addEventListener('keydown', async e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const i       = parseInt(input.dataset.idx);
                const val     = parseInt(input.value);
                const prod    = productosEnComboActual[i];
                const invProd = inventory.find(p => String(p.id) === String(prod.id));
                const maxDisp = invProd ? (invProd.cantidad || 0) : Infinity;
                if (!isNaN(val) && val > maxDisp) {
                    await mostrarAlerta(`⚠️ Supera la cantidad existente en el inventario.\n"${prod.nombre}" solo tiene ${maxDisp} unidad${maxDisp !== 1 ? 'es' : ''} disponible${maxDisp !== 1 ? 's' : ''}.`, 'warn');
                    input.value = '';
                    input.focus();
                    return;
                }
                const final = (isNaN(val) || val < 1) ? 1 : val;
                input.value = final;
                productosEnComboActual[i].cantidad = final;
                actualizarValorSuma();
                // Alerta pequeña de confirmación
                await mostrarAlerta('✅ Producto agregado al combo', 'success');
                // Al cerrar la alerta → limpiar buscador y enfocar para nuevo producto
                const buscar = document.getElementById('inputBuscarProductoCombo');
                const lista  = document.getElementById('combo-autocomplete-list');
                if (buscar) { buscar.value = ''; buscar.focus(); }
                if (lista)  { lista.innerHTML = ''; lista.classList.remove('visible'); }
            }
        });
    });

    // Botones quitar
    contenedor.querySelectorAll('.combo-chip-remove').forEach(btn => {
        btn.onclick = () => {
            const i = parseInt(btn.dataset.idx);
            productosEnComboActual.splice(i, 1);
            actualizarChipsCombo();
            actualizarValorSuma();
        };
    });
}

function actualizarValorSuma() {
    const suma = productosEnComboActual.reduce((s,p) => s + (p.precio||0) * (p.cantidad||1), 0);
    const el = document.getElementById('combo-valor-suma');
    if (el) el.textContent = '$' + suma.toLocaleString('es-CO');
}

function limpiarFormCombo() {
    editandoComboId = null;
    productosEnComboActual = [];
    ['inputComboNombre','inputComboDescripcion','inputComboPrecio','inputComboStock'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    actualizarChipsCombo();
    actualizarValorSuma();
    const btnGuardar = document.getElementById('btnGuardarCombo');
    if (btnGuardar) btnGuardar.textContent = '💾 Guardar Combo';
}

async function handleGuardarCombo() {
    const nombre = (document.getElementById('inputComboNombre')?.value || '').trim();
    const descripcion = (document.getElementById('inputComboDescripcion')?.value || '').trim();
    const precioInput = parseFloat(document.getElementById('inputComboPrecio')?.value || 0);
    const stock = parseInt(document.getElementById('inputComboStock')?.value || 0) || 0;

    if (!nombre) { mostrarAlerta('⚠️ El combo debe tener un nombre.', 'warn'); return; }
    if (!productosEnComboActual.length) { mostrarAlerta('⚠️ Agrega al menos un producto al combo.', 'warn'); return; }
    const conCantidadCero = productosEnComboActual.filter(p => !(p.cantidad >= 1));
    if (conCantidadCero.length) {
        const lista = conCantidadCero.map(p => `• "${p.nombre}"`).join('\n');
        mostrarAlerta(`⚠️ La cantidad debe ser mayor a cero en:\n${lista}`, 'warn');
        return;
    }
    const excedidos = productosEnComboActual.filter(p => {
        const invP = inventory.find(inv => String(inv.id) === String(p.id));
        const maxDisp = invP ? (invP.cantidad || 0) : 0;
        return p.cantidad > maxDisp;
    });
    if (excedidos.length) {
        const lista = excedidos.map(p => {
            const invP = inventory.find(inv => String(inv.id) === String(p.id));
            const maxDisp = invP ? (invP.cantidad || 0) : 0;
            return `• "${p.nombre}": solicitado ${p.cantidad}, disponible ${maxDisp}`;
        }).join('\n');
        mostrarAlerta(`⚠️ La cantidad supera el stock disponible:\n${lista}`, 'warn');
        return;
    }

    const precioSuma = productosEnComboActual.reduce((s,p) => s + (p.precio||0) * (p.cantidad||1), 0);
    const precio = precioInput > 0 ? precioInput : precioSuma;

    // MODO OFFLINE: guardar combo localmente en IndexedDB
    if (modoOffline) {
        try {
            await idbPut('productos_pending', {
                tipo: 'nuevo_combo',
                datos: { nombre, descripcion, precio, precioSuma, stock, productos: productosEnComboActual },
                timestamp: Date.now()
            });
            // Simularlo visualmente en memoria
            const comboLocal = {
                id: 'OFFLINE_COMBO_' + Date.now(),
                nombre, descripcion, precio, precio_suma: precioSuma, stock,
                combo_productos: productosEnComboActual.map(p => ({
                    nombre: p.nombre, precio: p.precio, imagen: p.imagen, cantidad: p.cantidad || 1
                }))
            };
            combos.unshift(comboLocal);
            limpiarFormCombo();
            renderTarjetasCombos();
            await actualizarUIOffline();
            mostrarAlerta('✅ Combo guardado localmente.\nSe subirá a Supabase al sincronizar.', 'success');
        } catch(e) {
            console.error(e);
            mostrarAlerta('❌ Error guardando combo localmente.', 'error');
        }
        return;
    }

    // MODO ONLINE: editar o crear en Supabase
    if (editandoComboId) {
        if (String(editandoComboId).startsWith('OFFLINE_COMBO_')) {
            mostrarAlerta('⚠️ Este combo aún no fue sincronizado. Sincroniza primero antes de editarlo.', 'warn');
            return;
        }
        try {
            await updateCombo(editandoComboId, { nombre, descripcion, precio, precioSuma, stock, productos: productosEnComboActual });
            mostrarAlerta('✅ Combo actualizado correctamente.', 'success');
            limpiarFormCombo();
            await loadCombos();
            renderTarjetasCombos();
        } catch(e) {
            console.error(e);
            mostrarAlerta('❌ Error actualizando combo.\n' + (e.message || 'Intenta de nuevo.'), 'error');
        }
        return;
    }

    try {
        await saveCombo({ nombre, descripcion, precio, precioSuma, stock, productos: productosEnComboActual });
        mostrarAlerta('✅ Combo guardado correctamente.', 'success');
        limpiarFormCombo();
        await loadCombos();
        renderTarjetasCombos();
    } catch(e) {
        console.error(e);
        mostrarAlerta('❌ Error guardando combo. Verifica que las tablas existan en Supabase.', 'error');
    }
}

function renderTarjetasCombos() {
    const contenedor = document.getElementById('contenedorCombos');
    const totalEl = document.getElementById('totalCombosCount');
    if (!contenedor) return;
    if (totalEl) totalEl.textContent = combos.length;
    if (!combos.length) {
        contenedor.innerHTML = '<p class="combo-empty-msg" style="color:rgba(200,180,255,0.4);padding:20px">No hay combos creados todavía.</p>';
        return;
    }
    contenedor.innerHTML = combos.map(combo => {
        const prods = combo.combo_productos || [];
        const miniImgs = prods.map(p => `
            <div class="combo-mini-producto">
                <img class="combo-mini-img" src="${p.imagen || 'https://via.placeholder.com/48'}" alt="${p.nombre || ''}">
                <span class="combo-mini-nombre">${p.cantidad || 1}u. ${p.nombre || ''}</span>
            </div>`).join('');
        const precioOrig = combo.precio_suma && combo.precio_suma !== combo.precio
            ? `<div class="combo-card-precio-orig">Valor individual: $${Math.round(combo.precio_suma).toLocaleString('es-CO')}</div>` : '';
        const stockBadge = combo.stock != null && combo.stock > 0
            ? `<div class="combo-card-stock">📦 ${combo.stock} disponible${combo.stock !== 1 ? 's' : ''}</div>`
            : combo.stock === 0 ? `<div class="combo-card-stock combo-card-stock--agotado">❌ Agotado</div>` : '';
        return `
        <div class="tarjeta-combo tarjeta-producto">
            <div class="combo-card-nombre">${combo.nombre}</div>
            ${combo.descripcion ? `<div class="combo-card-desc">${combo.descripcion}</div>` : ''}
            <div class="combo-card-productos">${miniImgs}</div>
            <div class="combo-card-precio">$${Math.round(combo.precio).toLocaleString('es-CO')}</div>
            ${precioOrig}
            ${stockBadge}
            <div class="combo-card-acciones">
                <div class="combo-card-acciones-fila">
                    <button class="btn-editar-combo" data-comboidx="${combos.indexOf(combo)}">✏️ Editar</button>
                    <button class="btn-borrar-producto btn-borrar-combo" data-comboid="${combo.id}">🗑️ Eliminar</button>
                </div>
                <button class="btn-vender-combo" data-comboidx="${combos.indexOf(combo)}">💵 Vender Combo</button>
            </div>
        </div>`;
    }).join('');

    contenedor.querySelectorAll('.btn-editar-combo').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.dataset.comboidx);
            if (!isNaN(idx) && combos[idx]) editarCombo(combos[idx]);
        };
    });

    contenedor.querySelectorAll('.btn-vender-combo').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.dataset.comboidx);
            if (!isNaN(idx) && combos[idx]) venderCombo(combos[idx]);
        };
    });

    contenedor.querySelectorAll('.btn-borrar-combo').forEach(btn => {
        btn.onclick = async () => {
            const ok = await mostrarConfirm('¿Eliminar este combo?', 'danger');
            if (!ok) return;
            try {
                await deleteCombo(btn.dataset.comboid);
                combos = combos.filter(c => String(c.id) !== String(btn.dataset.comboid));
                renderTarjetasCombos();
            } catch (e) {
                console.error('Error eliminando combo:', e);
                await mostrarAlerta('❌ No se pudo eliminar el combo.\n' + (e.message || 'Intenta de nuevo.'), 'error');
            }
        };
    });
}

// ──────────────────────────────────────────────────────
// VENTA DE COMBO
// ──────────────────────────────────────────────────────
async function venderCombo(combo) {
    const prods = combo.combo_productos || [];
    if (!prods.length) {
        mostrarAlerta('⚠️ Este combo no tiene productos.', 'warn');
        return;
    }
    const precioFmt = Math.round(combo.precio).toLocaleString('es-CO');
    const ok = await mostrarConfirm(
        `¿Vender 1 combo "${combo.nombre}" por $${precioFmt}?`, 'info'
    );
    if (!ok) return;

    // Validar stock de TODOS los productos antes de llamar a Supabase
    const sinStock = prods.filter(cp => {
        const prodId = cp.product_id || cp.id;
        const prod = inventory.find(p => String(p.id) === String(prodId));
        return !prod || (prod.cantidad || 0) < (cp.cantidad || 1);
    });
    if (sinStock.length) {
        const lista = sinStock.map(cp => {
            const prodId = cp.product_id || cp.id;
            const prod = inventory.find(p => String(p.id) === String(prodId));
            const disponible = prod ? (prod.cantidad || 0) : 0;
            return `• "${cp.nombre}" (necesita ${cp.cantidad || 1}, hay ${disponible})`;
        }).join('\n');
        await mostrarAlerta(
            `❌ Stock insuficiente para los siguientes productos:\n${lista}\n\nVerifica el inventario antes de vender este combo.`,
            'error'
        );
        return;
    }

    try {
        const ahora  = new Date();
        const fechaStr  = ahora.toLocaleString();
        const soloFecha = ahora.toLocaleDateString();

        const items = prods.map(p => ({
            productId: p.product_id || p.id || '',
            name:      p.nombre,
            qty:       p.cantidad || 1,
            price:     Number(p.precio) || 0,
            subtotal:  (Number(p.precio) || 0) * (p.cantidad || 1)
        }));

        // Descuento local inmediato en el array inventory
        for (const cp of prods) {
            const prodId = cp.product_id || cp.id;
            const prod = inventory.find(p => String(p.id) === String(prodId));
            if (prod) prod.cantidad = Math.max(0, (prod.cantidad || 0) - (cp.cantidad || 1));
        }
        // Descuento local del stock del combo
        if (combo.stock > 0) combo.stock = Math.max(0, combo.stock - 1);

        const newSale = {
            globalId:    Date.now(),
            total:       combo.precio,
            date:        fechaStr,
            fechaLimpia: soloFecha,
            items
        };

        if (modoOffline) {
            const hhmm = String(ahora.getHours()).padStart(2,'0') + String(ahora.getMinutes()).padStart(2,'0');
            newSale.id = 'COMBO-OFF-' + hhmm + '-' + String(Date.now()).slice(-4);
            await guardarVentaOffline(newSale);
            sales.unshift(newSale);
            renderSalesHistory();
            renderHistorialCombos();
            renderTarjetasCombos();
            mostrarAlerta(`✅ Venta guardada localmente.\n${combo.nombre} — $${precioFmt}`, 'success');
        } else {
            const numero  = await generarNumeroTicket();
            newSale.id    = 'COMBO-' + numero;
            const guardada = await saveSale(newSale);
            newSale.supabaseId = guardada.id;
            // Actualizar stock del combo en Supabase
            if (!String(combo.id).startsWith('OFFLINE_COMBO_')) {
                await supabaseClient.from('combos')
                    .update({ stock: combo.stock })
                    .eq('id', combo.id);
            }
            sales.unshift(newSale);
            await loadInventory();
            renderSalesHistory();
            renderHistorialCombos();
            renderTarjetasCombos();
            if (await mostrarConfirm('¿Desea imprimir el ticket de esta venta?', 'info')) {
                imprimirFacturaTicket(newSale);
            }
            mostrarAlerta(`✅ ¡Combo vendido!\nTicket #${newSale.id} — $${precioFmt}`, 'success');
        }
    } catch(e) {
        console.error('Error al vender combo:', e);
        let mensaje = e.message || 'Intenta de nuevo.';
        // Traducir "Stock insuficiente para el producto id=X." al nombre real del producto
        const matchId = mensaje.match(/producto\s+id=(\d+)/i);
        if (matchId) {
            const prodId = matchId[1];
            const prod = inventory.find(p => String(p.id) === String(prodId));
            if (prod) {
                mensaje = `Stock insuficiente de "${prod.nombre}".\nVerifica las unidades disponibles en inventario.`;
            }
        }
        mostrarAlerta('❌ Error al registrar la venta.\n' + mensaje, 'error');
    }
}

// ──────────────────────────────────────────────────────
// TICKET COMBOS
// ──────────────────────────────────────────────────────
// Convierte "DD/MM/YYYY, HH:MM:SS" (24h, formato BD) a locale es-CO con AM/PM.
// Si la cadena ya viene del navegador (ej. "18/5/2026, 8:01:17 p. m.") la devuelve igual.
function fechaDBaLocale(str) {
    if (!str) return str;
    const m = String(str).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}),\s*(\d{2}):(\d{2}):(\d{2})$/);
    if (!m) return str;
    return new Date(+m[3], +m[2]-1, +m[1], +m[4], +m[5], +m[6]).toLocaleString('es-CO');
}

function crearDOMTicketCombo(sale, esDeHoy) {
    const ticketDiv = document.createElement('div');
    ticketDiv.className = 'venta-ticket venta-ticket-combo';
    ticketDiv.dataset.tipo = 'combo';

    let itemsHtml = '<ul class="ticket-items-list">';
    if (sale.items && sale.items.length > 0) {
        sale.items.forEach(item => {
            const sub = Number(item.subtotal).toLocaleString('es-CO');
            itemsHtml += `<li class="ticket-item-row">
                <span class="ticket-item-name">${item.qty}x ${item.name}</span>
                <span class="ticket-item-sub">$${sub}</span>
            </li>`;
        });
    } else {
        itemsHtml += '<li>Sin detalle de productos.</li>';
    }
    itemsHtml += '</ul>';

    const esOffline   = String(sale.id).includes('OFF-');
    const esOnline    = String(sale.id).includes('ONLINE-');
    const badgeOffline = esOffline
        ? '<span class="ticket-badge ticket-badge-offline">⚡ Local</span>' : '';
    const badgeOnline  = esOnline
        ? '<span class="ticket-badge ticket-badge-online-combo">🌐 Online</span>' : '';
    const botonEliminarHtml = esDeHoy
        ? `<button class="btn-eliminar-ticket" onclick="eliminarTicket(${sale.globalId}); event.stopPropagation();">✖ Eliminar</button>`
        : '';
    const totalFmt  = Number(sale.total).toLocaleString('es-CO');
    const fechaFmt  = fechaDBaLocale(sale.date || '');
    const horaStr   = fechaFmt ? (fechaFmt.split(',')[1] || fechaFmt).trim() : '';

    ticketDiv.innerHTML = `
        <div class="venta-ticket-header">
            <div class="ticket-header-left">
                <div class="ticket-badges-row">
                    <span class="ticket-badge ticket-badge-combo">🎁 Venta Combo</span>
                    ${badgeOffline}
                    ${badgeOnline}
                </div>
                <strong class="ticket-numero">${sale.id}</strong>
                <span class="fecha-venta">${horaStr}</span>
            </div>
            <div class="ticket-header-right">
                <strong class="ticket-total">$${totalFmt}</strong>
                ${botonEliminarHtml}
                <span class="ticket-toggle-arrow">Ver detalles ▼</span>
            </div>
        </div>
        <div class="venta-ticket-details">
            ${itemsHtml}
        </div>`;

    ticketDiv.querySelector('.venta-ticket-header').addEventListener('click', () => {
        const details = ticketDiv.querySelector('.venta-ticket-details');
        const arrow   = ticketDiv.querySelector('.ticket-toggle-arrow');
        const open    = details.style.display === 'block';
        details.style.display = open ? 'none' : 'block';
        if (arrow) arrow.textContent = open ? 'Ver detalles ▼' : 'Ocultar ▲';
    });

    return ticketDiv;
}

// ──────────────────────────────────────────────────────
// HISTORIAL DE COMBOS VENDIDOS
// ──────────────────────────────────────────────────────
function renderHistorialCombos() {
    // Normaliza "18/5/2026" y "18/05/2026" al mismo string "18/05/2026"
    const normFecha = f => {
        if (!f) return '';
        const p = String(f).split('/');
        if (p.length !== 3) return f;
        return `${p[0].padStart(2,'0')}/${p[1].padStart(2,'0')}/${p[2]}`;
    };
    const _ahora = new Date();
    const hoy = `${String(_ahora.getDate()).padStart(2,'0')}/${String(_ahora.getMonth()+1).padStart(2,'0')}/${_ahora.getFullYear()}`;
    const ventasCombo = sales.filter(s => s.id && String(s.id).startsWith('COMBO-'));

    // Sección "hoy"
    const listHoy = document.getElementById('listaCombosHoy');
    if (listHoy) {
        const estabaOculto = listHoy.classList.contains('oculto');
        listHoy.innerHTML = '';
        const deHoy = ventasCombo.filter(s => {
            const f = normFecha(s.fechaLimpia || (s.date ? s.date.split(',')[0].trim() : ''));
            return f === hoy;
        });
        if (!deHoy.length) {
            listHoy.innerHTML = '<p>Aún no hay combos vendidos hoy.</p>';
        } else {
            [...deHoy].reverse().forEach(s => listHoy.appendChild(crearDOMTicketCombo(s, true)));
        }
        if (estabaOculto) listHoy.classList.add('oculto');
    }

    // Sección acordeón días anteriores
    const acordeon = document.getElementById('listaHistorialCombosAcordeon');
    if (!acordeon) return;
    acordeon.innerHTML = '';

    const pasados = {};
    ventasCombo.forEach(s => {
        const f = normFecha(s.fechaLimpia || (s.date ? s.date.split(',')[0].trim() : ''));
        if (f && f !== hoy) {
            if (!pasados[f]) pasados[f] = [];
            pasados[f].push(s);
        }
    });

    const fechas = Object.keys(pasados).sort((a, b) => {
        return new Date(b.split('/').reverse().join('-')) - new Date(a.split('/').reverse().join('-'));
    });

    if (!fechas.length) {
        acordeon.innerHTML = '<p style="color:#666">No hay combos vendidos en días anteriores.</p>';
        return;
    }

    fechas.forEach(fecha => {
        const del = pasados[fecha];
        const total = del.reduce((s, v) => s + v.total, 0);
        const btn = document.createElement('div');
        btn.className = 'acordeon-fecha';
        btn.innerHTML = `<span>📅 ${fecha} (${del.length} combos)</span> <strong>$${total.toLocaleString('es-CO')} ▼</strong>`;
        const cont = document.createElement('div');
        cont.className = 'acordeon-contenido';
        cont.style.display = 'none';
        [...del].reverse().forEach(s => cont.appendChild(crearDOMTicketCombo(s, false)));
        btn.addEventListener('click', () => {
            const open = cont.style.display === 'block';
            cont.style.display = open ? 'none' : 'block';
            btn.querySelector('strong').innerHTML = `$${total.toLocaleString('es-CO')} ${open ? '▼' : '▲'}`;
        });
        acordeon.appendChild(btn);
        acordeon.appendChild(cont);
    });
}

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
// ============================================================
// MÓDULO: MODO DE TRABAJO
// ============================================================
// SWITCH ON  = trabajando CON Supabase (modo normal, en línea)
// SWITCH OFF = sin internet, todo se guarda en IndexedDB local
//
// Detección automática de internet:
//   - Caída    → switch se pone OFF automáticamente, sigue operando
//   - Regreso  → alerta, pide sincronizar ANTES de volver a ON
// ============================================================

const DB_NAME    = 'softvent_offline';
const DB_VERSION = 1;
let offlineDB    = null;
let modoOffline  = false;        // false = en línea (Supabase)
let _reconexionPendiente = false; // evita diálogo doble al reconectar

// ──────────────────────────────────────────────────────────
// IndexedDB: abrir / helpers
// ──────────────────────────────────────────────────────────
function abrirOfflineDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('productos_pending'))
                db.createObjectStore('productos_pending', { keyPath: 'localId', autoIncrement: true });
            if (!db.objectStoreNames.contains('ventas_pending'))
                db.createObjectStore('ventas_pending',   { keyPath: 'localId', autoIncrement: true });
            if (!db.objectStoreNames.contains('inventario_cache'))
                db.createObjectStore('inventario_cache', { keyPath: 'id' });
        };
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror   = (e) => reject(e.target.error);
    });
}

function idbPut(store, data) {
    return new Promise((resolve, reject) => {
        const tx  = offlineDB.transaction(store, 'readwrite');
        const req = tx.objectStore(store).put(data);
        req.onsuccess = () => resolve(req.result);
        req.onerror   = () => reject(req.error);
    });
}

function idbGetAll(store) {
    return new Promise((resolve, reject) => {
        const tx  = offlineDB.transaction(store, 'readonly');
        const req = tx.objectStore(store).getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror   = () => reject(req.error);
    });
}

function idbDelete(store, key) {
    return new Promise((resolve, reject) => {
        const tx  = offlineDB.transaction(store, 'readwrite');
        const req = tx.objectStore(store).delete(key);
        req.onsuccess = () => resolve();
        req.onerror   = () => reject(req.error);
    });
}

function idbClear(store) {
    return new Promise((resolve, reject) => {
        const tx  = offlineDB.transaction(store, 'readwrite');
        const req = tx.objectStore(store).clear();
        req.onsuccess = () => resolve();
        req.onerror   = () => reject(req.error);
    });
}

// ──────────────────────────────────────────────────────────
// Cache de inventario local
// ──────────────────────────────────────────────────────────
async function guardarInventarioCache() {
    if (!offlineDB) return;
    await idbClear('inventario_cache');
    for (const p of inventory) await idbPut('inventario_cache', p);
}

async function cargarInventarioDesdeCache() {
    if (!offlineDB) return;
    const cached = await idbGetAll('inventario_cache');
    if (cached.length > 0) {
        inventory = cached;
        renderProducts();
        updateProductCount();
        updateSalesDropdown();
    }
}

async function contarPendientes() {
    if (!offlineDB) return 0;
    const prods  = await idbGetAll('productos_pending');
    const ventas = await idbGetAll('ventas_pending');
    return prods.length + ventas.length;
}

// ──────────────────────────────────────────────────────────
// Actualizar UI del switch y panel
// ──────────────────────────────────────────────────────────
async function actualizarUIOffline() {
    const toggle    = document.getElementById('offlineToggle');
    const dot       = document.getElementById('offlineStatusDot');
    const text      = document.getElementById('offlineStatusText');
    const syncBtn   = document.getElementById('offlineSyncBtn');
    const pending   = document.getElementById('offlinePendingCount');
    const indicator = document.getElementById('offline-indicator');
    const indText   = document.getElementById('offline-indicator-text');

    const n = await contarPendientes();

    if (modoOffline) {
        // Switch visualmente en OFF (sin internet)
        if (toggle) toggle.checked = false;
        if (dot)    dot.classList.add('activo');
        if (text)   text.textContent = '⚠️ Sin internet — guardando localmente';
        if (syncBtn) syncBtn.classList.add('visible');
        if (indicator) indicator.classList.add('visible');
        if (indText) indText.textContent = 'Sin internet — modo local activo';
        if (pending) pending.textContent = n > 0
            ? `${n} operación(es) pendiente(s) de sincronizar`
            : 'Sin operaciones pendientes';
    } else {
        // Switch en ON (Supabase)
        if (toggle) toggle.checked = true;
        if (dot)    dot.classList.remove('activo');
        if (text)   text.textContent = '🟢 En línea — usando Supabase';
        if (syncBtn) syncBtn.classList.remove('visible');
        if (indicator) indicator.classList.remove('visible');
        if (pending) pending.textContent = '';
    }
}

// ──────────────────────────────────────────────────────────
// Guardar producto / venta en local (modo offline)
// ──────────────────────────────────────────────────────────
async function guardarProductoOffline(datosProducto) {
    await idbPut('productos_pending', {
        tipo: 'nuevo_producto',
        datos: datosProducto,
        timestamp: Date.now()
    });
    const fakeId = 'OFFLINE_' + Date.now();
    const productoLocal = { ...datosProducto, id: fakeId };
    inventory.unshift(productoLocal);
    await guardarInventarioCache();
    renderProducts();
    updateProductCount();
    updateSalesDropdown();
    await actualizarUIOffline();
    return productoLocal;
}

async function guardarVentaOffline(saleData) {
    await idbPut('ventas_pending', {
        tipo: 'nueva_venta',
        datos: saleData,
        timestamp: Date.now()
    });
    // Descontar stock visualmente
    for (const item of saleData.items) {
        const prod = inventory.find(p => p.id && p.id.toString() === item.productId?.toString());
        if (prod) prod.cantidad -= item.qty;
    }
    await guardarInventarioCache();
    await actualizarUIOffline();
}

// ──────────────────────────────────────────────────────────
// Sincronizar datos pendientes → Supabase
// ──────────────────────────────────────────────────────────
async function sincronizarConSupabase() {
    const syncBtn = document.getElementById('offlineSyncBtn');
    if (syncBtn) { syncBtn.disabled = true; syncBtn.textContent = '⏳ Sincronizando...'; }

    let errores = 0;

    try {
        // 1. Productos nuevos
        const productosPendientes = await idbGetAll('productos_pending');
        for (const item of productosPendientes) {
            if (item.tipo !== 'nuevo_producto') continue;
            try {
                const { data: { user } } = await supabaseClient.auth.getUser();
                if (!user) throw new Error('Sin sesión activa');
                const d = item.datos;
                const { error } = await supabaseClient.from('productos').insert([{
                    codigoBarras: d.codigoBarras || null,
                    nombre:       d.nombre,
                    precio:       d.precio,
                    cantidad:     d.cantidad,
                    imagen:       d.imagen || '',
                    user_id:      user.id,
                    categoria:    d.categoria || 'Otras'
                }]);
                if (error) throw error;
                await idbDelete('productos_pending', item.localId);
            } catch(e) {
                console.error('Error sincronizando producto:', e);
                errores++;
            }
        }

        // 1b. Combos offline
        const combosPendientes = productosPendientes.filter(item => item.tipo === 'nuevo_combo');
        for (const item of combosPendientes) {
            try {
                const { data: { user } } = await supabaseClient.auth.getUser();
                if (!user) throw new Error('Sin sesión activa');
                currentUserId = user.id;
                await saveCombo({ ...item.datos });
                await idbDelete('productos_pending', item.localId);
            } catch(e) {
                console.error('Error sincronizando combo:', e);
                errores++;
            }
        }

        // 2. Ventas
        const ventasPendientes = await idbGetAll('ventas_pending');
        for (const item of ventasPendientes) {
            if (item.tipo !== 'nueva_venta') continue;
            try {
                await saveSale(item.datos);
                await idbDelete('ventas_pending', item.localId);
            } catch(e) {
                console.error('Error sincronizando venta:', e);
                errores++;
            }
        }

        // 3. Recargar todo desde Supabase
        await loadInventory();
        await loadSales();
        await guardarInventarioCache();
        await actualizarUIOffline();

        if (errores === 0) {
            await mostrarAlerta('✅ Sincronización completada.\nTodos los datos están en Supabase.', 'success');
        } else {
            await mostrarAlerta(`⚠️ Sincronización parcial.\n${errores} elemento(s) no se pudieron subir.`, 'warn');
        }
    } catch(e) {
        console.error('Error general en sincronización:', e);
        await mostrarAlerta('❌ Error durante la sincronización:\n' + e.message, 'error');
    } finally {
        if (syncBtn) { syncBtn.disabled = false; syncBtn.textContent = '☁️ Sincronizar con Supabase'; }
    }
}

// ──────────────────────────────────────────────────────────
// Activación manual del switch
// toggle: true  = usuario pone switch ON  → quiere volver a Supabase
//         false = usuario pone switch OFF → quiere trabajar offline
// ──────────────────────────────────────────────────────────
async function manejarCambioSwitch(queremosSupabase) {
    if (queremosSupabase) {
        // El usuario quiere activar Supabase (switch → ON)
        const n = await contarPendientes();
        if (n > 0) {
            // Hay datos sin subir: primero preguntar
            const ok = await mostrarConfirm(
                `Hay ${n} operación(es) guardada(s) localmente.\n¿Sincronizar con Supabase antes de volver al modo en línea?`,
                'warn'
            );
            if (ok) {
                await sincronizarConSupabase();
            } else {
                // El usuario rechazó sincronizar: dejar el switch en OFF (modoOffline sigue true)
                const toggle = document.getElementById('offlineToggle');
                if (toggle) toggle.checked = false;
                await actualizarUIOffline();
                return;
            }
        } else {
            // Sin pendientes: simplemente recargar Supabase
            await loadInventory();
            await loadSales();
            await guardarInventarioCache();
        }
        modoOffline = false;
        await actualizarUIOffline();
        await mostrarAlerta('🌐 Modo en línea activado.\nConectado a Supabase.', 'success');

    } else {
        // El usuario quiere trabajar sin internet (switch → OFF)
        modoOffline = true;
        await guardarInventarioCache();
        await actualizarUIOffline();
        await mostrarAlerta('⚡ Modo sin internet activado.\nLas ventas y productos se guardan localmente.', 'info');
    }
}

// ──────────────────────────────────────────────────────────
// Detección automática de caída / recuperación de internet
// ──────────────────────────────────────────────────────────
async function manejarCaidaInternet() {
    if (modoOffline) return; // ya estamos en modo offline, nada que hacer
    modoOffline = true;
    await guardarInventarioCache();
    await actualizarUIOffline();

    // Abrir el panel de modo de trabajo para que el usuario lo vea
    const panel = document.getElementById('panelModoTrabajo');
    if (panel && !panel.classList.contains('abierto')) {
        panel.classList.add('abierto');
        const btn = document.getElementById('btnModoTrabajo');
        if (btn) {
            const flecha = btn.querySelector('span:last-child');
            if (flecha) flecha.textContent = '▲';
        }
    }

    await mostrarAlerta(
        '📵 Se perdió la conexión a internet.\nSe activó el Modo Sin Internet automáticamente.\nPuedes seguir vendiendo y registrando productos.\nAl recuperar internet, sincroniza los datos.', 
        'warn'
    );
}

async function manejarRecuperacionInternet() {
    if (!modoOffline) return; // ya estamos en línea
    if (_reconexionPendiente) return; // ya hay un diálogo abierto
    _reconexionPendiente = true;

    const n = await contarPendientes();

    // Abrir el panel
    const panel = document.getElementById('panelModoTrabajo');
    if (panel && !panel.classList.contains('abierto')) {
        panel.classList.add('abierto');
        const btn = document.getElementById('btnModoTrabajo');
        if (btn) {
            const flecha = btn.querySelector('span:last-child');
            if (flecha) flecha.textContent = '▲';
        }
    }

    if (n > 0) {
        const ok = await mostrarConfirm(
            `📶 ¡Volvió el internet!\nHay ${n} operación(es) guardada(s) sin sincronizar.\n¿Sincronizar ahora con Supabase y volver al modo en línea?`,
            'warn'
        );
        if (ok) {
            await sincronizarConSupabase();
            modoOffline = false;
        }
        // Si dice NO: se queda en modo offline hasta que él decida
    } else {
        // Sin pendientes: volver automáticamente a Supabase
        modoOffline = false;
        await loadInventory();
        await loadSales();
        await guardarInventarioCache();
        await mostrarAlerta('📶 ¡Volvió el internet!\nConectado a Supabase nuevamente.', 'success');
    }

    await actualizarUIOffline();
    _reconexionPendiente = false;
}

// ──────────────────────────────────────────────────────────
// Inicializar módulo
// ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    try {
        offlineDB = await abrirOfflineDB();
    } catch(e) {
        console.warn('IndexedDB no disponible:', e);
    }

    // Switch ON por defecto (en línea / Supabase)
    modoOffline = false;
    await actualizarUIOffline();

    // Botón expandir/contraer panel
    const btnModo = document.getElementById('btnModoTrabajo');
    const panel   = document.getElementById('panelModoTrabajo');
    if (btnModo && panel) {
        btnModo.addEventListener('click', () => {
            panel.classList.toggle('abierto');
            const flecha = btnModo.querySelector('span:last-child');
            if (flecha) flecha.textContent = panel.classList.contains('abierto') ? '▲' : '▼';
        });
    }

    // Cambio manual del switch
    const toggle = document.getElementById('offlineToggle');
    if (toggle) {
        // Al cargar: switch en ON (checked = true = Supabase)
        toggle.checked = true;
        toggle.addEventListener('change', async () => {
            await manejarCambioSwitch(toggle.checked);
        });
    }

    // Botón sincronizar manual
    const syncBtn = document.getElementById('offlineSyncBtn');
    if (syncBtn) {
        syncBtn.addEventListener('click', async () => {
            await sincronizarConSupabase();
            // Si la sync fue exitosa, volver a ON
            const n = await contarPendientes();
            if (n === 0 && modoOffline) {
                modoOffline = false;
                await actualizarUIOffline();
            }
        });
    }

    // Detectar caída de internet (evento 'offline')
    window.addEventListener('offline', () => {
        manejarCaidaInternet();
    });

    // Detectar recuperación de internet (evento 'online')
    window.addEventListener('online', () => {
        manejarRecuperacionInternet();
    });

    // Al arrancar: si ya no hay internet (ej: recarga en modo avión), activar offline
    if (!navigator.onLine) {
        modoOffline = true;
        await cargarInventarioDesdeCache();
        await actualizarUIOffline();
    }
});

// ──────────────────────────────────────────────────────────
// PARCHEO de handleSaveProduct para modo offline
// ──────────────────────────────────────────────────────────
const _handleSaveProductOriginal = handleSaveProduct;
window.handleSaveProduct = async function() {
    if (!modoOffline) {
        return _handleSaveProductOriginal();
    }
    // MODO OFFLINE: guardar en IndexedDB
    const codigo    = inputCodigoBarras.value.trim();
    const nombre    = inputNombreProducto.value.trim();
    const precio    = parseInt(inputPrecioProducto.value);
    const cantidad  = parseInt(inputCantidadProducto.value);
    const categoria = inputCategoriaProducto ? inputCategoriaProducto.value : 'Otras';

    if (!nombre)                          { await mostrarAlerta('Por favor, ingresa el nombre del producto.', 'warn'); return; }
    if (isNaN(precio) || precio <= 0)     { await mostrarAlerta('Por favor, ingresa un precio válido.', 'warn'); return; }
    if (isNaN(cantidad) || cantidad <= 0) { await mostrarAlerta('Por favor, ingresa una cantidad válida.', 'warn'); return; }
    if (!categoria)                       { await mostrarAlerta('Por favor, selecciona una categoría.', 'warn'); return; }

    let urlImagen = '';
    if (archivoImagenFisico) {
        urlImagen = await new Promise((res) => {
            const reader = new FileReader();
            reader.onload = e => res(e.target.result);
            reader.readAsDataURL(archivoImagenFisico);
        });
    } else if (editingProductId !== null) {
        const p = inventory.find(p => p.id.toString() === editingProductId.toString());
        urlImagen = p ? p.imagen : '';
    }
    // En modo offline la imagen es opcional — se puede agregar al sincronizar

    await guardarProductoOffline({ codigoBarras: codigo, nombre, precio, cantidad, imagen: urlImagen, categoria });
    resetFormAndMode();
    await mostrarAlerta(`✅ Producto "${nombre}" guardado localmente.\nSe subirá a Supabase al sincronizar.`, 'success');
};

if (btnGuardarProducto) {
    btnGuardarProducto.removeEventListener('click', handleSaveProduct);
    btnGuardarProducto.addEventListener('click', window.handleSaveProduct);
}