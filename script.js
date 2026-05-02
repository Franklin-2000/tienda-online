// ==========================================
// CONFIGURACIÓN DE SUPABASE
const SB_URL = "https://mhnhfdtdpryrjaeaymsa.supabase.co";
const SB_KEY = "sb_publishable_tiKyjeMyir7LD0EmFCdo8g_CqAXoM8R"; 
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
const btnVerHistorial = document.querySelector("#btnVerHistorial");
const listaVentasHoy = document.querySelector("#listaVentasHoy");
const seccionHistorialAnterior = document.querySelector("#seccionHistorialAnterior");
const listaHistorialAcordeon = document.querySelector("#listaHistorialAcordeon");
// --------------------------------------

const inputProductoImagen = document.querySelector("#inputProductoImagen");
const previewProductoImagen = document.querySelector("#previewProductoImagen");
const btnSeleccionarImagen = document.querySelector("#btnSeleccionarImagen");

const inputCodigoBarras = document.querySelector("#inputCodigoBarras"); 
const btnEscanearInventario = document.querySelector("#btnEscanearInventario"); 
const inputNombreProducto = document.querySelector("#inputNombreProducto");
const inputPrecioProducto = document.querySelector("#inputPrecioProducto");
const inputCantidadProducto = document.querySelector("#inputCantidadProducto");

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
        inputBuscarProductVenta.value = codigoLimpio;
        inputBuscarProductVenta.dispatchEvent(new Event('input', { bubbles: true }));
        updateSalesDropdown(codigoLimpio);
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
    pantallaLogin.style.display = 'none';
    pantallaInicio.style.display = 'none';
    pantallaInventario.style.display = 'none';
    if(pantallaMenuVentas) pantallaMenuVentas.style.display = 'none';
    if(pantallaVentasFisicas) pantallaVentasFisicas.style.display = 'none';
    if(pantallaVentasOnline) pantallaVentasOnline.style.display = 'none';

    switch (screenId) {
        case 'pantalla-login':
            pantallaLogin.style.display = 'flex'; 
            break;
        case 'pantalla-inicio':
            pantallaInicio.style.display = 'block'; 
            clearSearch(); 
            resetFormAndMode();
            break;
        case 'pantalla-INVENTARIO':
            pantallaInventario.style.display = 'block'; 
            resetFormAndMode(); 
            loadInventory();
            break;
        case 'pantalla-menu-ventas':
            if(pantallaMenuVentas) pantallaMenuVentas.style.display = '';
            break;
        case 'pantalla-ventas-fisicas':
            if(pantallaVentasFisicas) pantallaVentasFisicas.style.display = ''; 
            updateSalesDropdown(); 
            break;
        case 'pantalla-ventas-online':
            if(pantallaVentasOnline) pantallaVentasOnline.style.display = ''; 
            break;
    }

    if (pushToHistory) {
        history.pushState({ screen: screenId }, '', `#${screenId}`);
    }
}

// Integración Autenticación Supabase
async function checkAuthStatus(pushToHistory = true) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (session) {
        currentLoggedInUserEmail = session.user.email;
        currentUserId = session.user.id; // <-- guardamos el user_id
        if (pushToHistory) history.replaceState({ screen: 'pantalla-inicio' }, '', '#pantalla-inicio');
        showScreen('pantalla-inicio', false); 
        loadInventory(); 
        loadSales(); // <-- Ahora carga desde Supabase
    } else {
        currentLoggedInUserEmail = null;
        currentUserId = null;
        if (pushToHistory) history.replaceState({ screen: 'pantalla-login' }, '', '#pantalla-login');
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

if (btnVentas) {
    btnVentas.addEventListener("click", function(e) {
        e.preventDefault();
        showScreen('pantalla-menu-ventas');
    });
}

if (btnMenuVentasFisicas) {
    btnMenuVentasFisicas.addEventListener("click", function(e) {
        e.preventDefault();
        showScreen('pantalla-ventas-fisicas');
    });
}

if (btnMenuVentasOnline) {
    btnMenuVentasOnline.addEventListener("click", function(e) {
        e.preventDefault();
        showScreen('pantalla-ventas-online');
        cargarPedidosAdmin();
    });
}


if (btnVolverInicioDesdeVentas) {
    btnVolverInicioDesdeVentas.addEventListener("click", function() {
        showScreen('pantalla-inicio');
    });
}

if (btnVolverVentasFisicas) {
    btnVolverVentasFisicas.addEventListener("click", function() {
        showScreen('pantalla-menu-ventas');
    });
}

if (btnVolverVentasOnline) {
    btnVolverVentasOnline.addEventListener("click", function() {
        showScreen('pantalla-menu-ventas');
    });
}

// ==========================================
// LÓGICA DEL CARRITO
// ==========================================
function updateSalesDropdown(searchTerm = '') {
    selectProductoVenta.innerHTML = '<option value="">-- Selecciona un producto --</option>';
    const normalizedTerm = normalizeStringForSearch(searchTerm);
    const rawSearchTerm = searchTerm.trim(); 
    
    let seleccionAutomatica = false; 

    inventory.forEach(product => {
        if (product.cantidad > 0) {
            const coincidenciaNombre = normalizeStringForSearch(product.nombre).includes(normalizedTerm);
            const coincidenciaCodigo = product.codigoBarras && product.codigoBarras === rawSearchTerm;

            if (normalizedTerm === '' || coincidenciaNombre || coincidenciaCodigo) {
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = `${product.nombre} (Disp: ${product.cantidad} | $${product.precio})`;
                
                selectProductoVenta.appendChild(option);

                if (normalizedTerm !== '' && !seleccionAutomatica) {
                    option.selected = true; 
                    seleccionAutomatica = true; 
                }
            }
        }
    });
}

if(inputBuscarProductVenta) {
    inputBuscarProductVenta.addEventListener("input", (e) => {
        updateSalesDropdown(e.target.value);
    });
}

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
    updateSalesDropdown(); 
    inputBuscarProductVenta.focus(); 
}

if (btnLimpiarVenta) {
    btnLimpiarVenta.addEventListener("click", limpiarTodaLaVenta);
}

if (btnAgregarAlCarrito) {
    btnAgregarAlCarrito.addEventListener("click", () => {
        const productId = selectProductoVenta.value;
        let qty = parseInt(inputCantidadVenta.value);

        if (isNaN(qty) || qty <= 0) qty = 1; 

        if (!productId) { alert("Selecciona un producto."); return; }

        const product = inventory.find(p => p.id.toString() === productId.toString());
        if (!product) return;

        const cartItem = currentCart.find(item => item.id.toString() === productId.toString());
        const currentCartQty = cartItem ? cartItem.qty : 0;
        
        if (currentCartQty + qty > product.cantidad) {
            alert(`Stock insuficiente. Solo quedan ${product.cantidad - currentCartQty} unidades disponibles de ${product.nombre}.`);
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
    if(!confirm("¿Estás seguro de eliminar este ticket? Los productos volverán al inventario.")) return;

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
        
        setTimeout(() => {
            alert("Ticket eliminado exitosamente y stock repuesto al inventario.");
        }, 100);

    } catch (err) {
        console.error("Error al eliminar ticket:", err);
        alert("Hubo un error al eliminar el ticket. Intenta de nuevo.");
    }
};

// =========================================================
// REGISTRO DE VENTA — Ahora guarda en Supabase
// =========================================================
if (btnRegistrarVenta) {
    btnRegistrarVenta.addEventListener("click", async () => {
        if (currentCart.length === 0) {
            alert("Añade al menos un producto a la lista antes de registrar.");
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
            // NOTA: el descuento de inventario lo hace automáticamente
            // el trigger fn_descontar_inventario() en Supabase al insertar items_venta.

            const numeroTicket = await generarNumeroTicket(); // <-- ahora es async

            const newSale = {
                globalId:    Date.now(), 
                id:          numeroTicket, 
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

            if (confirm("¿Desea imprimir la factura de esta venta?")) {
                 imprimirFacturaTicket(newSale);
            }

            limpiarTodaLaVenta();
            if(inputBuscarProductVenta) inputBuscarProductVenta.focus();

            setTimeout(() => {
                alert(`¡Venta registrada con éxito! Ticket #${newSale.id} por $${totalSale}`);
            }, 100);

        } catch (err) {
            console.error("Error al registrar venta:", err);
            alert("Hubo un error al registrar la venta. Por favor intenta de nuevo.");
        } finally {
            btnRegistrarVenta.disabled = false;
            btnRegistrarVenta.textContent = "Registrar Venta";
        }
    });
}

// Lógica de Mostrar/Ocultar Historial
btnVerHistorial.addEventListener('click', (e) => {
    e.preventDefault();
    if(seccionHistorialAnterior.style.display === 'none') {
        seccionHistorialAnterior.style.display = 'block';
        btnVerHistorial.innerHTML = 'Ocultar Historial de Días Anteriores ✖';
    } else {
        seccionHistorialAnterior.style.display = 'none';
        btnVerHistorial.innerHTML = 'Ver Historial de Días Anteriores 📅';
    }
});

// Renderizado Inteligente de Historial
function renderSalesHistory() {
    listaVentasHoy.innerHTML = '';
    listaHistorialAcordeon.innerHTML = '';

    if (sales.length === 0) {
        listaVentasHoy.innerHTML = '<p>Aún no hay ventas registradas.</p>';
        listaHistorialAcordeon.innerHTML = '<p style="color: #666;">El historial está vacío.</p>';
        return;
    }

    const fechaHoy = new Date().toLocaleDateString();
    const ventasHoy = [];
    const ventasPasadas = {};

    sales.forEach(sale => {
        const fechaVenta = sale.fechaLimpia || sale.date.split(',')[0].trim();

        if (fechaVenta === fechaHoy) {
            ventasHoy.push(sale);
        } else {
            if (!ventasPasadas[fechaVenta]) ventasPasadas[fechaVenta] = [];
            ventasPasadas[fechaVenta].push(sale);
        }
    });

    if (ventasHoy.length === 0) {
        listaVentasHoy.innerHTML = '<p>Aún no hay ventas registradas hoy.</p>';
    } else {
        [...ventasHoy].reverse().forEach(sale => {
            listaVentasHoy.appendChild(crearDOMTicket(sale, true));
        });
    }

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
function renderProducts(productsToRender = inventory) {
    if (!contenedorProductos) return;

    contenedorProductos.innerHTML = ''; 

    if (productsToRender.length === 0) {
        if (inputBuscarProducto.value.trim() !== '') {
            contenedorProductos.innerHTML = '<p style="text-align: center; width: 100%; margin-top: 20px; font-size: 1.2em; color: #555;">No se encontraron productos que coincidan con la búsqueda.</p>';
        } else if (inventory.length === 0) {
            contenedorProductos.innerHTML = '<p style="text-align: center; width: 100%; margin-top: 20px; font-size: 1.2em; color: #555;">El inventario está vacío. ¡Añade algunos productos!</p>';
        }
        return;
    }
    
    productsToRender.forEach(product => {
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
let archivoImagenFisico = null; 

function handleImageSelection(event) {
    const archivo = event.target.files[0];

    if (archivo) {
        archivoImagenFisico = archivo;

        const reader = new FileReader();
        reader.onload = function(e) {
            previewProductoImagen.src = e.target.result;
            previewProductoImagen.style.display = "block";
        };
        reader.readAsDataURL(archivo);
    } else {
        clearImagePreview();
        archivoImagenFisico = null;
    }
}

async function subirImagenSupabase(archivo) {
    const extension = archivo.name.split('.').pop();
    const nombreUnico = `img_${Date.now()}.${extension}`;
    const rutaArchivo = `inventario/${nombreUnico}`;

    const { data, error } = await supabaseClient
        .storage
        .from('productos')
        .upload(rutaArchivo, archivo);

    if (error) {
        console.error("Error subiendo imagen:", error);
        throw new Error("No se pudo subir la imagen.");
    }

    const { data: publicUrlData } = supabaseClient
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
btnSeleccionarImagen.addEventListener('click', () => {
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
  
    if (!nombre) { alert("Por favor, ingresa el nombre del producto."); return; }
    if (isNaN(precio) || precio <= 0) { alert("Por favor, ingresa un precio válido."); return; }
    if (isNaN(cantidad) || cantidad <= 0 || !Number.isInteger(cantidad)) { alert("Por favor, ingresa una cantidad válida."); return; }

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        alert("Debes iniciar sesión para guardar productos.");
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
            alert("Por favor, selecciona una imagen para el producto.");
            btnGuardarProducto.textContent = textoOriginalBoton;
            btnGuardarProducto.disabled = false;
            return;
        }

        if (editingProductId !== null) {
            const { error } = await supabaseClient
                .from('productos')
                .update({ codigoBarras: codigo, nombre, precio, cantidad, imagen: urlImagenFinal })
                .eq('id', editingProductId);

            if (error) throw error;
            alert(`¡Producto "${nombre}" actualizado!`);
        } 
        else {
            const { error } = await supabaseClient
                .from('productos')
                .insert([{ 
                    codigoBarras: codigo,
                    nombre, precio, cantidad, 
                    imagen: urlImagenFinal, 
                    user_id: user.id 
                }]);

            if (error) throw error;
            alert(`¡Producto "${nombre}" añadido al inventario!`);
        }

        resetFormAndMode(); 
        loadInventory(); 

    } catch (error) {
        console.error("Error en handleSaveProduct:", error);
        alert("Ocurrió un error al guardar el producto.");
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
        alert("Edición cancelada.");
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
        renderProducts(inventory);
        return;
    }

    const filteredProducts = inventory.filter(product => {
        const coincidenciaNombre = normalizeStringForSearch(product.nombre).includes(searchTerm);
        const coincidenciaCodigo = product.codigoBarras && product.codigoBarras.includes(searchTermRaw);
        return coincidenciaNombre || coincidenciaCodigo;
    });

    renderProducts(filteredProducts);
}

function clearSearch() {
    inputBuscarProducto.value = '';
    renderProducts(inventory);
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
            if(confirm("¿Estás seguro de que quieres eliminar este producto?")){
                const { error } = await supabaseClient.from('productos').delete().eq('id', productId);
                
                if (!error) {
                    if (productId === editingProductId) resetFormAndMode();
                    alert("Producto eliminado.");
                    loadInventory(); 
                } else {
                    console.error("Error al eliminar producto:", error);
                    alert("Error al eliminar el producto.");
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
function exportInventoryToCSV() {
    if (inventory.length === 0) {
        alert("El inventario está vacío. No hay datos para exportar.");
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
    alert("¡Inventario exportado exitosamente a inventario.csv!");
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
        alert("Sesión cerrada correctamente.");
    } else {
        console.error("Error al cerrar sesión:", error);
        alert("Hubo un error al cerrar la sesión.");
    }
}

if (btnGoogle) btnGoogle.addEventListener("click", handleLoginWithGoogle);
btnLogout.addEventListener("click", handleLogout);

// ==========================================
// INICIALIZACIÓN DE LA APP
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
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

    if (ventasHoy.length === 0) return alert("No hay ventas registradas hoy.");

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
            direccion, notas, wompi_transaction_id,
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
        <div class="tarjeta-resumen-online azul">
            <strong>🚚 En camino</strong>
            <span class="num">${c.despachado}</span>
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
 
    const lista = estadoFiltro === 'todos'
        ? pedidosAdmin
        : pedidosAdmin.filter(p => p.estado === estadoFiltro);
 
    if (lista.length === 0) {
        el.innerHTML = '<p style="color:#666;padding:30px;text-align:center;">No hay pedidos con este estado.</p>';
        return;
    }
 
    el.innerHTML = '';
 
    const etqMap = {
        pendiente:       { texto: '⏳ Pendiente',         clase: 'estado-pendiente'  },
        esperando_pago:  { texto: '💳 Esperando pago',    clase: 'estado-pendiente'  },
        pago_confirmado: { texto: '✅ Pago confirmado',   clase: 'estado-pagado'     },
        despachado:      { texto: '🚚 Despachado',        clase: 'estado-despachado' },
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
        if (pedido.estado === 'pendiente' && esContraEntrega) {
            botonesHTML = `
                <button class="btn-añadir btn-accion-pedido"
                        data-id="${pedido.id}" data-nuevo-estado="pago_confirmado">
                    ✅ Confirmar Pago → Descontar Inventario
                </button>
                <button class="btn-borrar-producto btn-accion-pedido"
                        data-id="${pedido.id}" data-nuevo-estado="cancelado">
                    🚫 Cancelar pedido
                </button>`;
        } else if (pedido.estado === 'esperando_pago') {
            botonesHTML = `
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
        }
 
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
                    <small>${esContraEntrega ? '💵 Contra entrega' : '💳 Wompi'}</small>
                </div>
            </div>
 
            <div class="pedido-admin-cliente">
                <div>👤 <strong>${pedido.cliente_nombre}</strong></div>
                <div>📧 ${pedido.cliente_email}</div>
                <div>📞 ${pedido.cliente_tel}</div>
                <div>📍 ${pedido.direccion}</div>
                ${pedido.notas ? `<div>📝 <em>${pedido.notas}</em></div>` : ''}
                <div class="pedido-admin-fecha">📅 ${fecha}</div>
                ${pedido.wompi_transaction_id
                    ? `<div style="font-size:0.8em;color:#666;">🔑 Wompi ID: ${pedido.wompi_transaction_id}</div>`
                    : ''}
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
 
        el.appendChild(card);
    });
}
 
// ---------------------------------------------------------------
// Cambiar estado — al confirmar pago el trigger descuenta stock
// ---------------------------------------------------------------
async function cambiarEstadoPedido(pedidoId, nuevoEstado, btnEl) {
    const msgs = {
        pago_confirmado: `¿Confirmar el PAGO del pedido #${pedidoId}?\n\nEl inventario se descontará automáticamente.`,
        despachado:      `¿Marcar el pedido #${pedidoId} como despachado?`,
        entregado:       `¿Confirmar la entrega del pedido #${pedidoId}?`,
        cancelado:       `¿Cancelar el pedido #${pedidoId}?`,
    };
    if (!confirm(msgs[nuevoEstado] || `¿Cambiar estado del pedido #${pedidoId}?`)) return;

    const textoOrig   = btnEl.textContent;
    btnEl.disabled    = true;
    btnEl.textContent = '⏳ Procesando...';

    const { error } = await supabaseClient.rpc('cambiar_estado_pedido', {
        p_pedido_id:          pedidoId,
        p_nuevo_estado:       nuevoEstado,
        p_fecha_confirmacion: nuevoEstado === 'pago_confirmado' ? new Date().toISOString() : null
    });

    if (error) {
        console.error('Error actualizando pedido:', error);
        alert(`Error: ${error.message}`);
        btnEl.disabled    = false;
        btnEl.textContent = textoOrig;
        return;
    }

    // Actualizar estado local
    const idx = pedidosAdmin.findIndex(p => p.id === pedidoId);
    if (idx !== -1) {
        pedidosAdmin[idx].estado = nuevoEstado;
        if (nuevoEstado === 'pago_confirmado') {
            pedidosAdmin[idx].fecha_confirmacion = new Date().toISOString();
        }
    }

    renderResumenAdmin();
    renderPedidosAdmin(filtroEstadoAdmin);

    if (nuevoEstado === 'pago_confirmado') {
        await loadInventory();
        alert(`✅ Pago del pedido #${pedidoId} confirmado.\nEl inventario fue descontado automáticamente.`);
    }
}
 
// ---------------------------------------------------------------
// Eventos de filtros y botón refrescar
// ---------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
 
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
})