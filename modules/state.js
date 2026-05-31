// ============================================================
// state.js — Estado compartido de toda la aplicación
// Todos los módulos importan este objeto y lo mutan directamente.
// ============================================================
export const state = {
    // ── Datos principales ──────────────────────────────────
    inventory:               [],   // productos del inventario
    sales:                   [],   // historial de ventas (físicas + online + combos)
    currentCart:             [],   // carrito de ventas físicas
    combos:                  [],   // combos creados
    pedidosAdmin:            [],   // pedidos online
    productosEnComboActual:  [],   // productos seleccionados al crear un combo

    // ── Usuario ────────────────────────────────────────────
    currentLoggedInUserEmail: null,
    currentUserId:            null,

    // ── Modo de trabajo ────────────────────────────────────
    modoOffline:  false,
    offlineDB:    null,

    // ── Edición activa ─────────────────────────────────────
    editingProductId:           null,
    productoSeleccionadoVentaId: null,
    editandoComboId:            null,

    // ── Filtros y búsqueda ─────────────────────────────────
    categoriaActivaFiltro: 'todas',
    categoriaActivaVenta:  'todas',
    filtroEstadoAdmin:     'todos',
    searchResults:         null,

    // ── Imagen producto ────────────────────────────────────
    imagenProductoActual:  '',
    archivoImagenFisico:   null,

    // ── Escáner ────────────────────────────────────────────
    html5QrcodeScanner: null,
    objetivoEscaneo:    '',

    // ── Charts (referencias para destruir antes de recrear) ─
    chartTendencia:          null,
    chartProductos:          null,
    chartCategorias:         null,
    chartIngresos:           null,
    chartOnlineTendencia:    null,
    chartOnlineProductos:    null,
    chartOnlineCategorias:   null,
    chartOnlineIngresos:     null,

    // ── Callbacks entre módulos (se asignan en main.js) ────
    // Permiten que un módulo llame a funciones de otro sin importarlo directamente,
    // evitando dependencias circulares.
    onInventoryLoaded:    null,  // inventario.js → renderProducts + updateSalesDropdown
    onSalesLoaded:        null,  // ventas-fisicas.js → renderSalesHistory
    onCombosLoaded:       null,  // combos.js → renderTarjetasCombos
};
