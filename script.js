// ==========================================
// REFERENCIAS AL DOM
// ==========================================
const pantallaLogin = document.querySelector("#pantalla-login");
const inputEmailLogin = document.querySelector("#inputEmailLogin");
const inputPasswordLogin = document.querySelector("#inputPasswordLogin");
const btnRegistrarseLogin = document.querySelector("#btnRegistrarseLogin");
const btnIniciarSesionLogin = document.querySelector("#btnIniciarSesionLogin");
const authMessageLogin = document.querySelector("#authMessageLogin");

const pantallaRegistro = document.querySelector("#pantalla-registro");
const registroForm = document.querySelector("#registroForm");
const regEmail = document.querySelector("#regEmail");
const regPassword = document.querySelector("#regPassword");
const btnConfirmarRegistro = document.querySelector("#btnConfirmarRegistro");
const btnVolverLoginRegistro = document.querySelector("#btnVolverLoginRegistro");
const authMessageRegistro = document.querySelector("#authMessageRegistro");

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
let html5QrcodeScanner = null; 
let objetivoEscaneo = ''; 

// ==========================================
// FUNCIONES DE ALMACENAMIENTO (LocalStorage)
// ==========================================
function saveInventory() {
    localStorage.setItem('inventory', JSON.stringify(inventory));
    updateProductCount(); 
}

function loadInventory() {
    const storedInventory = localStorage.getItem('inventory');
    if (storedInventory) {
        inventory = JSON.parse(storedInventory);
        renderProducts(); 
    }
    updateProductCount(); 
}

function saveSales() {
    localStorage.setItem('sales', JSON.stringify(sales));
}

function loadSales() {
    const storedSales = localStorage.getItem('sales');
    if (storedSales) {
        sales = JSON.parse(storedSales);
        renderSalesHistory();
    }
}

function saveUsers() {
    localStorage.setItem('users', JSON.stringify(users));
}

function loadUsers() {
    const storedUsers = localStorage.getItem('users');
    if (storedUsers) {
        users = JSON.parse(storedUsers);
    }
}

// ==========================================
// LÓGICA DEL ESCÁNER DE CÓDIGOS DE BARRAS
// ==========================================
function iniciarEscaner(objetivo) {
    objetivoEscaneo = objetivo;
    modalEscaner.style.display = 'flex';
    
    // Ajustamos la configuración para que lea mejor códigos de barras físicos (formato 1D)
    html5QrcodeScanner = new Html5QrcodeScanner(
        "lector-camara", 
        { 
            fps: 10, 
            qrbox: {width: 250, height: 100}, // Caja más horizontal para códigos de barras
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
    detenerEscaner();
    
    if (objetivoEscaneo === 'inventario') {
        inputCodigoBarras.value = decodedText;
        // Forzamos el evento input para asegurar compatibilidad con otras funciones
        inputCodigoBarras.dispatchEvent(new Event('input', { bubbles: true }));
        inputNombreProducto.focus(); 
    } else if (objetivoEscaneo === 'ventas') {
        inputBuscarProductVenta.value = decodedText;
        // Obligamos al navegador a detectar que se pegó el código para el salto automático
        inputBuscarProductVenta.dispatchEvent(new Event('input', { bubbles: true }));
        updateSalesDropdown(decodedText);
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
function displayAuthMessage(element, message, type = '') {
    element.textContent = message;
    element.className = 'auth-message'; 
    if (type) {
        element.classList.add(type);
    }
    element.style.display = message ? 'block' : 'none';
}

function showScreen(screenId, pushToHistory = true) {
    pantallaLogin.style.display = 'none';
    pantallaRegistro.style.display = 'none';
    pantallaInicio.style.display = 'none';
    pantallaInventario.style.display = 'none';
    if(pantallaMenuVentas) pantallaMenuVentas.style.display = 'none';
    if(pantallaVentasFisicas) pantallaVentasFisicas.style.display = 'none';
    if(pantallaVentasOnline) pantallaVentasOnline.style.display = 'none';

    switch (screenId) {
        case 'pantalla-login':
            pantallaLogin.style.display = 'flex'; 
            displayAuthMessage(authMessageLogin, ''); 
            inputEmailLogin.value = '';
            inputPasswordLogin.value = '';
            break;
        case 'pantalla-registro':
            pantallaRegistro.style.display = 'flex'; 
            displayAuthMessage(authMessageRegistro, '');
            regEmail.value = '';
            regPassword.value = '';
            break;
        case 'pantalla-inicio':
            pantallaInicio.style.display = ''; 
            clearSearch(); 
            resetFormAndMode();
            break;
        case 'pantalla-INVENTARIO':
            pantallaInventario.style.display = ''; 
            resetFormAndMode(); 
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

function checkAuthStatus(pushToHistory = true) {
    const storedUserEmail = localStorage.getItem('currentLoggedInUserEmail');
    if (storedUserEmail) {
        currentLoggedInUserEmail = storedUserEmail;
        if (pushToHistory) history.replaceState({ screen: 'pantalla-inicio' }, '', '#pantalla-inicio');
        showScreen('pantalla-inicio', false); 
        loadInventory(); 
        loadSales(); 
    } else {
        currentLoggedInUserEmail = null;
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
btnRegistrarseLogin.addEventListener("click", function() {
    showScreen('pantalla-registro');
});

btnVolverLoginRegistro.addEventListener("click", function() {
    showScreen('pantalla-login');
});

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

btnLogout.addEventListener("click", handleLogout);

// ==========================================
// LÓGICA DEL CARRITO Y TICKETS DIARIOS
// ==========================================

function generarNumeroTicket() {
    const fechaActual = new Date().toLocaleDateString(); 
    let ultimaFecha = localStorage.getItem('ultimaFechaVenta');
    let contadorDiario = parseInt(localStorage.getItem('contadorDiarioVentas')) || 0;

    if (ultimaFecha !== fechaActual) {
        contadorDiario = 0;
        localStorage.setItem('ultimaFechaVenta', fechaActual);
    }

    contadorDiario++;
    localStorage.setItem('contadorDiarioVentas', contadorDiario.toString());

    return contadorDiario.toString().padStart(4, '0');
}

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

// Función para vaciar completamente la lista y cajas de texto de ventas
function limpiarTodaLaVenta() {
    currentCart = [];
    updateCartUI(); 
    inputBuscarProductVenta.value = '';
    selectProductoVenta.value = '';
    inputCantidadVenta.value = '';
    updateSalesDropdown(); 
    inputBuscarProductVenta.focus(); 
}

// Botón explícito de Limpiar Venta
if (btnLimpiarVenta) {
    btnLimpiarVenta.addEventListener("click", limpiarTodaLaVenta);
}

if (btnAgregarAlCarrito) {
    btnAgregarAlCarrito.addEventListener("click", () => {
        const productId = parseInt(selectProductoVenta.value);
        let qty = parseInt(inputCantidadVenta.value);

        if (isNaN(qty) || qty <= 0) {
            qty = 1; 
        }

        if (!productId) { alert("Selecciona un producto."); return; }

        const product = inventory.find(p => p.id === productId);
        if (!product) return;

        const cartItem = currentCart.find(item => item.id === productId);
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
        
        // Limpiamos los inputs para escanear el siguiente producto
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
window.eliminarTicket = function(ticketGlobalId) {
    if(!confirm("¿Estás seguro de eliminar este ticket? Los productos volverán al inventario de inmediato.")) return;

    const saleIndex = sales.findIndex(s => s.globalId === ticketGlobalId);
    if(saleIndex !== -1) {
        const sale = sales[saleIndex];
        
        sale.items.forEach(item => {
            const productIndex = inventory.findIndex(p => p.id === item.productId);
            if(productIndex !== -1) {
                inventory[productIndex].cantidad += item.qty;
            }
        });

        sales.splice(saleIndex, 1);
        
        saveInventory();
        saveSales();
        renderProducts();
        updateSalesDropdown();
        renderSalesHistory();
        
        setTimeout(() => {
            alert("Ticket eliminado exitosamente y stock repuesto al inventario.");
        }, 100);
    }
};

// =========================================================
// REGISTRO DE VENTA Y LIMPIEZA AUTOMÁTICA DEL CARRITO
// =========================================================
if (btnRegistrarVenta) {
    btnRegistrarVenta.addEventListener("click", () => {
        if (currentCart.length === 0) {
            alert("Añade al menos un producto a la lista antes de registrar.");
            return;
        }

        const saleDateObj = new Date();
        const saleDateStr = saleDateObj.toLocaleString();
        const soloFechaStr = saleDateObj.toLocaleDateString(); 
        let totalSale = 0;
        const cartItemsForReceipt = []; 

        currentCart.forEach(item => {
            const productIndex = inventory.findIndex(p => p.id === item.id);
            if (productIndex !== -1) {
                inventory[productIndex].cantidad -= item.qty;
            }
            
            const subtotal = item.qty * item.price;
            totalSale += subtotal;

            cartItemsForReceipt.push({
                productId: item.id, 
                name: item.name,
                qty: item.qty,
                price: item.price,
                subtotal: subtotal
            });
        });

        const numeroTicket = generarNumeroTicket();

        const newSale = {
            globalId: Date.now(), 
            id: numeroTicket, 
            total: totalSale,
            date: saleDateStr,
            fechaLimpia: soloFechaStr, 
            items: cartItemsForReceipt 
        };

        sales.push(newSale);
        
        saveInventory();
        saveSales();
        renderProducts();
        renderSalesHistory();

        // LIMPIEZA TOTAL Y AUTOMÁTICA AL FINALIZAR LA VENTA
        limpiarTodaLaVenta();

        // El timeout permite que el navegador refresque la pantalla dejándola en blanco antes de la alerta
        setTimeout(() => {
            alert(`¡Venta registrada con éxito! Ticket #${newSale.id} por $${totalSale}`);
        }, 100);
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

    // Clasificar ventas
    sales.forEach(sale => {
        const fechaVenta = sale.fechaLimpia || sale.date.split(',')[0].trim();

        if (fechaVenta === fechaHoy) {
            ventasHoy.push(sale);
        } else {
            if (!ventasPasadas[fechaVenta]) ventasPasadas[fechaVenta] = [];
            ventasPasadas[fechaVenta].push(sale);
        }
    });

    // 1. Renderizar Ventas de Hoy
    if (ventasHoy.length === 0) {
        listaVentasHoy.innerHTML = '<p>Aún no hay ventas registradas hoy.</p>';
    } else {
        [...ventasHoy].reverse().forEach(sale => {
            listaVentasHoy.appendChild(crearDOMTicket(sale, true));
        });
    }

    // 2. Renderizar Historial Pasado (Acordeones)
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
    contenedorProductos.innerHTML = ''; 

    if (productsToRender.length === 0 && inputBuscarProducto.value.trim() !== '') {
        contenedorProductos.innerHTML = '<p style="text-align: center; width: 100%; margin-top: 20px; font-size: 1.2em; color: #555;">No se encontraron productos que coincidan con la búsqueda.</p>';
        return;
    } else if (productsToRender.length === 0 && inventory.length === 0) {
        contenedorProductos.innerHTML = '<p style="text-align: center; width: 100%; margin-top: 20px; font-size: 1.2em; color: #555;">El inventario está vacío. ¡Añade algunos productos!</p>';
        return;
    }
    
    productsToRender.forEach(product => {
        const nuevaTarjeta = templateTarjetaProducto.content.cloneNode(true);
        const cardDiv = nuevaTarjeta.querySelector(".tarjeta-producto");
        cardDiv.dataset.id = product.id;

        nuevaTarjeta.querySelector(".producto-imagen").src = product.imagen;
        nuevaTarjeta.querySelector(".producto-imagen").alt = `Imagen de ${product.nombre}`;
        nuevaTarjeta.querySelector(".producto-nombre").textContent = product.nombre;
        
        nuevaTarjeta.querySelector(".producto-codigo").textContent = product.codigoBarras ? `Cod: ${product.codigoBarras}` : 'Cod: N/A';
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
function handleImageSelection(event) {
  const archivo = event.target.files[0];

  if (archivo) {
    const reader = new FileReader();
    reader.onload = function(e) {
      previewProductoImagen.src = e.target.result;
      previewProductoImagen.style.display = "block";
      imagenProductoActual = e.target.result;
    };
    reader.readAsDataURL(archivo);
  } else {
    clearImagePreview();
  }
}

function clearImagePreview() {
    previewProductoImagen.src = "";
    previewProductoImagen.style.display = "none";
    imagenProductoActual = '';
    inputProductoImagen.value = ''; 
}

inputProductoImagen.addEventListener("change", handleImageSelection);
btnSeleccionarImagen.addEventListener('click', () => {
  inputProductoImagen.click();
});

// ==========================================
// LÓGICA DE FORMULARIO (Añadir/Editar)
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

function handleSaveProduct() {
  const codigo = inputCodigoBarras.value.trim(); 
  const nombre = inputNombreProducto.value.trim();
  const precio = parseInt(inputPrecioProducto.value); 
  const cantidad = parseInt(inputCantidadProducto.value);
  
  if (!nombre) {
    alert("Por favor, ingresa el nombre del producto.");
    return;
  }
  if (isNaN(precio) || precio <= 0) {
    alert("Por favor, ingresa un precio válido para el producto (número entero mayor que 0).");
    return;
  }
  if (!imagenProductoActual) {
      alert("Por favor, selecciona una imagen para el producto.");
      return;
  }
  if (isNaN(cantidad) || cantidad <= 0 || !Number.isInteger(cantidad)) {
      alert("Por favor, ingresa una cantidad válida para el producto (número entero mayor que 0).");
      return;
  }

  if (editingProductId !== null) {
      const productIndex = inventory.findIndex(p => p.id === editingProductId);
      if (productIndex !== -1) {
          inventory[productIndex] = {
              ...inventory[productIndex], 
              codigoBarras: codigo, 
              nombre: nombre,
              precio: precio,
              imagen: imagenProductoActual,
              cantidad: cantidad
          };
          alert(`¡Producto "${nombre}" actualizado!`);
      }
  } 
  else {
      const nuevoProducto = {
          id: Date.now(), 
          codigoBarras: codigo, 
          nombre: nombre,
          precio: precio,
          imagen: imagenProductoActual,
          cantidad: cantidad
      };
      inventory.push(nuevoProducto);
      alert(`¡Producto "${nombre}" (Cantidad: ${cantidad}) añadido al inventario!`);
  }

  saveInventory();
  if (inputBuscarProducto.value.trim() !== '') {
      searchProducts();
  } 
  else {
      renderProducts();
  }
  resetFormAndMode(); 
  
  inputCodigoBarras.focus(); 
}

function editProduct(productId) {
    const productToEdit = inventory.find(p => p.id === productId);
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
    }
     else { 
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
// DELEGACIÓN: BORRAR Y EDITAR
// ==========================================
contenedorProductos.addEventListener('click', function(event) {
    const cardDiv = event.target.closest('.tarjeta-producto');
    if (!cardDiv) return; 
    
    const productId = parseInt(cardDiv.dataset.id);

    if (event.target.classList.contains('btn-borrar-producto')) {
        inventory = inventory.filter(product => product.id !== productId);
        saveInventory();
    
        if (productId === editingProductId) {
            resetFormAndMode();
        }
        if (inputBuscarProducto.value.trim() !== '') {
            searchProducts(); 
        } else {
            renderProducts(); 
        }
        alert("Producto eliminado.");
    } else if (event.target.classList.contains('btn-editar-producto')) {
        editProduct(productId);
    }
});

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
// LÓGICA DE AUTENTICACIÓN (LOGIN/REGISTRO)
// ==========================================
inputEmailLogin.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        event.preventDefault(); 
        inputPasswordLogin.focus(); 
    }
});

inputPasswordLogin.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        btnIniciarSesionLogin.click(); 
    }
});

function handleRegistrationSubmit(event) {
    event.preventDefault(); 

    const email = regEmail.value.trim();
    const password = regPassword.value;

    displayAuthMessage(authMessageRegistro, ''); 

    if (!email || !password) {
        displayAuthMessage(authMessageRegistro, "Por favor, completa todos los campos.", 'error');
        return;
    }

    if (password.length < 6) {
        displayAuthMessage(authMessageRegistro, "La contraseña debe tener al menos 6 caracteres.", 'error');
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        displayAuthMessage(authMessageRegistro, "Por favor, ingresa un formato de email válido.", 'error');
        return;
    }

    if (users.some(user => user.email === email)) {
        displayAuthMessage(authMessageRegistro, "Este email ya está registrado. Por favor, usa otro o inicia sesión.", 'error');
        return;
    }

    const newUser = {
        email: email,
        password: password
    };

    users.push(newUser);
    saveUsers();
    displayAuthMessage(authMessageRegistro, "¡Registro exitoso! Ya puedes iniciar sesión.", 'success');

    regEmail.value = '';
    regPassword.value = '';
    setTimeout(() => showScreen('pantalla-login'), 1500);
}

registroForm.addEventListener("submit", handleRegistrationSubmit);

function handleLoginSubmit(event) {
    event.preventDefault(); 

    const email = inputEmailLogin.value.trim();
    const password = inputPasswordLogin.value;

    displayAuthMessage(authMessageLogin, '');

    if (!email || !password) {
        displayAuthMessage(authMessageLogin, "Por favor, ingresa tu email y contraseña.", 'error');
        return;
    }

    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        currentLoggedInUserEmail = user.email;
        localStorage.setItem('currentLoggedInUserEmail', user.email);
        displayAuthMessage(authMessageLogin, `Bienvenido, ${user.email}!`, 'success');
        setTimeout(() => showScreen('pantalla-inicio'), 1000);
        loadInventory(); 
        loadSales(); 
    } else {
        displayAuthMessage(authMessageLogin, "Credenciales incorrectas. Inténtalo de nuevo.", 'error');
    }
}

btnIniciarSesionLogin.addEventListener('click', handleLoginSubmit);

function handleLogout() {
    currentLoggedInUserEmail = null;
    localStorage.removeItem('currentLoggedInUserEmail');
    showScreen('pantalla-login');
    alert("Has cerrado sesión.");
}

// ==========================================
// INICIALIZACIÓN DE LA APP
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    checkAuthStatus();
});

// =================================================MAA=======
// EXTENSIÓN DE FUNCIONALIDADES (SIN ALTERAR FUNCIONES PREVIAS)
// ===========================================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Limpieza automática tras registrar la venta
    if (btnRegistrarVenta) {
        btnRegistrarVenta.addEventListener('click', () => {
            // Verificamos si la venta fue posible (si había algo en el carrito)
            if (currentCart.length > 0) {
                // Esperamos un instante para que tu función original termine de guardar
                setTimeout(() => {
                    // Llamamos a tu función existente para resetear la vista de ventas
                    limpiarTodaLaVenta();
                    
                    // Aseguramos el foco en el buscador para la siguiente venta
                    if(inputBuscarProductVenta) inputBuscarProductVenta.focus();
                    
                    console.log("Interfaz de ventas reseteada automáticamente.");
                }, 300); 
            }
        });
    }

    // 2. Foco automático al entrar a Ventas Físicas
    if (btnMenuVentasFisicas) {
        btnMenuVentasFisicas.addEventListener('click', () => {
            setTimeout(() => {
                if(inputBuscarProductVenta) inputBuscarProductVenta.focus();
            }, 500); // Espera a que la pantalla sea visible
        });
    }

    // 3. Mejora de flujo: Si escaneas un código y hay coincidencia única, saltar a cantidad
    if (inputBuscarProductVenta) {
        inputBuscarProductVenta.addEventListener('input', () => {
            const term = inputBuscarProductVenta.value.trim();
            // Si el término coincide exactamente con un código de barras en tu inventario
            const productoEncontrado = inventory.find(p => p.codigoBarras === term);
            
            if (productoEncontrado) {
                // Seleccionamos el producto en tu <select> automáticamente
                selectProductoVenta.value = productoEncontrado.id;
                // Saltamos a la cantidad para ahorrar un clic
                inputCantidadVenta.focus();
            }
        });
    }
});

// ==========================================
// MODIFICACIONES DE FACTURACIÓN Y REPORTE
// ==========================================

// Función para generar la factura pequeña (Ticket)
const imprimirFacturaTicket = (datosVenta) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: [80, 150] }); // Tamaño ticket

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
    
    // Abre el diálogo de impresión
    window.open(doc.output('bloburl'), '_blank');
};

// Función para el reporte diario de todos los productos vendidos
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

// --- INYECCIÓN DE COMPORTAMIENTO ---
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Al registrar, preguntar por factura y LIMPIAR AUTOMÁTICAMENTE
    if (btnRegistrarVenta) {
        btnRegistrarVenta.addEventListener('click', () => {
            if (currentCart.length > 0) {
                setTimeout(() => {
                    // Obtener la venta que acabas de guardar en tu array global 'sales'
                    const ultimaVenta = sales[sales.length - 1];
                    
                    if (confirm("¿Desea imprimir la factura de esta venta?")) {
                        imprimirFacturaTicket(ultimaVenta);
                    }

                    // Limpieza automática (usando tu propia función original)
                    limpiarTodaLaVenta();
                    if(inputBuscarProductVenta) inputBuscarProductVenta.focus();
                }, 500); // Espera a que tu código original termine de procesar
            }
        });
    }

    // 2. Añadir el botón de Reporte Diario en la sección de Historial
    const seccionHistorial = document.querySelector('.historial-ventas');
    if (seccionHistorial) {
        const btnPDF = document.createElement('button');
        btnPDF.textContent = "Generar Reporte Diario PDF 📄";
        btnPDF.className = "btn-exportar";
        btnPDF.style.width = "100%";
        btnPDF.style.marginBottom = "15px";
        btnPDF.onclick = descargarReporteDiario;
        seccionHistorial.prepend(btnPDF); // Lo pone al principio del historial
    }
});

// ==========================================
// INTEGRACIÓN DE INICIO DE SESIÓN CON GOOGLE
// ==========================================

// 1. Función para desencriptar los datos que envía Google
function decodeJwtResponse(token) {
    let base64Url = token.split('.')[1];
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    let jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

// 2. Función que procesa el login exitoso
window.handleCredentialResponse = (response) => {
    // Decodificamos el token de Google
    const responsePayload = decodeJwtResponse(response.credential);

    // Extraemos el email
    const userEmail = responsePayload.email;

    // Usamos TU lógica original para guardar el usuario logueado
    currentLoggedInUserEmail = userEmail;
    localStorage.setItem('currentLoggedInUserEmail', userEmail);
    
    // Usamos TU función original para mostrar el mensaje
    displayAuthMessage(authMessageLogin, `¡Ingreso exitoso con Google, ${userEmail}!`, 'success');
    
    // Redirigimos al inicio usando TU función original tras 1 segundo
    setTimeout(() => {
        showScreen('pantalla-inicio');
        loadInventory(); 
        loadSales();
    }, 1000);
};

// 3. Inicializar el botón cuando cargue la página
window.addEventListener('load', () => {
    // Verificamos que la librería de Google cargó correctamente
    if (window.google && window.google.accounts) {
        google.accounts.id.initialize({
            // REEMPLAZA ESTO CON TU CLIENT ID REAL DE GOOGLE CLOUD
            client_id: "430987812790-27986ekgk51cslp1uaqdqbnsnsn3if7m.apps.googleusercontent.com",
            callback: handleCredentialResponse
        });
        
        const btnContainer = document.getElementById("buttonDiv");
        if (btnContainer) {
            google.accounts.id.renderButton(
                btnContainer,
                { theme: "filled_black", size: "large", width: "220", shape: "pill" } 
            );
        }
    }
});