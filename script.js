// Referencias a elementos del DOM existentes
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

const btnInventario = document.querySelector("#btn-Inventario");
const pantallaInicio = document.querySelector("#pantalla-inicio");
const pantallaInventario = document.querySelector("#pantalla-INVENTARIO");

const inputProductoImagen = document.querySelector("#inputProductoImagen");
const previewProductoImagen = document.querySelector("#previewProductoImagen");
const btnSeleccionarImagen = document.querySelector("#btnSeleccionarImagen");

const inputNombreProducto = document.querySelector("#inputNombreProducto");
const inputPrecioProducto = document.querySelector("#inputPrecioProducto");
const inputCantidadProducto = document.querySelector("#inputCantidadProducto");

const btnGuardarProducto = document.querySelector("#btnGuardarProducto");
const btnLimpiarFormulario = document.querySelector("#btnLimpiarFormulario");

const contenedorProductos = document.querySelector("#contenedorProductos");
const templateTarjetaProducto = document.querySelector("#template-tarjeta-producto");

const btnVolverInicio = document.querySelector("#btnVolverInicio");

// referencias para la búsqueda 
const inputBuscarProducto = document.querySelector("#inputBuscarProducto");
const btnBuscarProducto = document.querySelector("#btnBuscarProducto");
const btnLimpiarBusqueda = document.querySelector("#btnLimpiarBusqueda");


const totalProductosCountElement = document.querySelector("#totalProductosCount");


const btnExportarDatos = document.querySelector("#btnExportarDatos");

const btnLogout = document.querySelector("#btnLogout");

let imagenProductoActual = '';

// Array para almacenar todos los productos y su estado
let inventory = [];

let users = [];

// variable Para saber si estamos editando o añadiendo productos
let editingProductId = null; 


let currentLoggedInUserEmail = null; // Almacena el email del usuario logueado

// --- Funciones para manejar LocalStorage ---
function saveInventory() {
    localStorage.setItem('inventory', JSON.stringify(inventory));
    updateProductCount(); 
}
/* Carga el array 'inventory' desde localStorage y lo inicializa*/
function loadInventory() {
    const storedInventory = localStorage.getItem('inventory');
    if (storedInventory) {
        inventory = JSON.parse(storedInventory);
        renderProducts(); // Renderizar productos al cargar del almacenamiento
    }
    updateProductCount(); // Actualizar el contador después de cargar el inventario
}
// Guarda el array 'users' actual en localStorage.
function saveUsers() {
    localStorage.setItem('users', JSON.stringify(users));
}
//Carga el array 'users' desde localStorage.
function loadUsers() {
    const storedUsers = localStorage.getItem('users');
    if (storedUsers) {
        users = JSON.parse(storedUsers);
    }
}
// Función para mostrar mensajes de autenticación
function displayAuthMessage(element, message, type = '') {
    element.textContent = message;
    element.className = 'auth-message'; 
    if (type) {
        element.classList.add(type);
    }
    element.style.display = message ? 'block' : 'none';
}

//  Función centralizada para mostrar pantallas
function showScreen(screenId) {
    pantallaLogin.style.display = 'none';
    pantallaRegistro.style.display = 'none';
    pantallaInicio.style.display = 'none';
    pantallaInventario.style.display = 'none';

    switch (screenId) {
        case 'pantalla-login':
            pantallaLogin.style.display = 'flex'; 
            displayAuthMessage(authMessageLogin, ''); 
            inputEmailLogin.value = '';
            inputPasswordLogin.value = '';
            break;
        case 'pantalla-registro':
            pantallaRegistro.style.display = 'flex'; // Usar flex para centrar contenido
            displayAuthMessage(authMessageRegistro, ''); // Limpiar mensaje al cambiar
            regEmail.value = '';
            regPassword.value = '';
            break;
        case 'pantalla-inicio':
            pantallaInicio.style.display = 'block';
            clearSearch(); // Limpiar búsqueda y resetear formulario si se vuelve al inicio desde inventario
            resetFormAndMode();
            break;
        case 'pantalla-INVENTARIO':
            pantallaInventario.style.display = 'block';
            resetFormAndMode(); 
            break;
    }
}

//  Función para verificar el estado de autenticación al cargar la página 
function checkAuthStatus() {
    const storedUserEmail = localStorage.getItem('currentLoggedInUserEmail');
    if (storedUserEmail) {
        currentLoggedInUserEmail = storedUserEmail;
        showScreen('pantalla-inicio');
        loadInventory(); 
    } else {
        currentLoggedInUserEmail = null;
        showScreen('pantalla-login');
    }
}
// --- Funciones de Renderizado ---
function renderProducts(productsToRender = inventory) {
    contenedorProductos.innerHTML = ''; // Limpiar el contenedor antes de renderizar

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
        nuevaTarjeta.querySelector(".producto-precio").textContent = `$${product.precio}`;
        nuevaTarjeta.querySelector(".producto-cantidad").textContent = `Unidades disponibles: ${product.cantidad}`;

        contenedorProductos.appendChild(nuevaTarjeta);
    });
}

//  Actualiza el contador de productos
function updateProductCount() {
    totalProductosCountElement.textContent = inventory.length;
}

btnInventario.addEventListener("click", function(e) {
  e.preventDefault();
  showScreen('pantalla-INVENTARIO');
});

btnRegistrarseLogin.addEventListener("click", function() {
    showScreen('pantalla-registro');
});

btnVolverLoginRegistro.addEventListener("click", function() {
    showScreen('pantalla-login');
});

btnVolverInicio.addEventListener("click", function() {
  showScreen('pantalla-inicio');
});

btnLogout.addEventListener("click", handleLogout);
// seleccion de imagenes
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
//Limpia la vista previa de la imagen y resetea el input de archivo.
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

//Lógica de Formulario (Añadir/Editar)
function resetFormAndMode() {
    inputNombreProducto.value = '';
    inputPrecioProducto.value = '';
    inputCantidadProducto.value = '1';
    clearImagePreview();
    editingProductId = null;
    btnGuardarProducto.textContent = 'Añadir Producto';
    btnLimpiarFormulario.textContent = 'Limpiar';
}

//Maneja tanto la adición de un nuevo producto como la actualización de uno existente.
function handleSaveProduct() {
  const nombre = inputNombreProducto.value.trim();
  const precio = parseFloat(inputPrecioProducto.value);
  const cantidad = parseInt(inputCantidadProducto.value);
  // Validación básica de los inputs
  if (!nombre) {
    alert("Por favor, ingresa el nombre del producto.");
    return;
  }
  if (isNaN(precio) || precio <= 0) {
    alert("Por favor, ingresa un precio válido para el producto (mayor que 0).");
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
              nombre: nombre,
              precio: precio,
              imagen: imagenProductoActual,
              cantidad: cantidad
          };
          alert(`¡Producto "${nombre}" actualizado!`);
      }
  } else {
      // Estamos en modo añadir: Crear un nuevo producto
      const nuevoProducto = {
          id: Date.now(), 
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
  } else {
      renderProducts();
  }
  resetFormAndMode(); 
}

// Función que carga los datos de un producto en el formulario 
function editProduct(productId) {
    const productToEdit = inventory.find(p => p.id === productId);
    if (productToEdit) {
        editingProductId = productId; 
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

// Lógica de Búsqueda
function normalizeStringForSearch(text) {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "") 
        .replace(/[^a-z0-9]/g, ''); 
}
function searchProducts() {
    const searchTerm = normalizeStringForSearch(inputBuscarProducto.value.trim());

    if (searchTerm === '') {
        renderProducts(inventory);
        return;
    }

    const filteredProducts = inventory.filter(product =>
        normalizeStringForSearch(product.nombre).includes(searchTerm)
    );

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
// delegacion para borrar y editar productos dinámicamente
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
        // Re-renderizar, considerando si una búsqueda está activa
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
//Exportar inventario a CSV
function exportInventoryToCSV() {
    if (inventory.length === 0) {
        alert("El inventario está vacío. No hay datos para exportar.");
        return;
    }

    let csvContent = "Nombre Producto,Precio Unitario,Cantidad,Valor Total Producto\n";
    let totalInventoryValue = 0;

    inventory.forEach(product => {
        const productTotal = product.precio * product.cantidad;
        totalInventoryValue += productTotal;
        const escapedProductName = `"${product.nombre.replace(/"/g, '""')}"`;

        csvContent += `${escapedProductName},${product.precio.toFixed(2)},${product.cantidad},${productTotal.toFixed(2)}\n`;
    });

    csvContent += `\nVALOR TOTAL INVENTARIO,,,${totalInventoryValue.toFixed(2)}\n`;

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

//Lógica de Registro de Usuario
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

//Lógica de Inicio de Sesión 
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
    } else {
        displayAuthMessage(authMessageLogin, "Credenciales incorrectas. Inténtalo de nuevo.", 'error');
    }
}

btnIniciarSesionLogin.addEventListener('click', handleLoginSubmit);

//Lógica de Cierre de Sesión
function handleLogout() {
    currentLoggedInUserEmail = null;
    localStorage.removeItem('currentLoggedInUserEmail');
    showScreen('pantalla-login');
    alert("Has cerrado sesión.");
}

// Cargar usuarios y verificar estado de autenticación al iniciar la aplicación
document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    checkAuthStatus();
});
