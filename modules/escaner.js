// ============================================================
// escaner.js — Lógica del escáner de códigos de barras
// ============================================================
import { state } from './state.js';
import { mostrarAlerta } from './alertas.js';

const modalEscaner   = document.querySelector('#modal-escaner');
const btnCerrarScanner = document.querySelector('#btnCerrarScanner');

export function iniciarEscaner(objetivo) {
    state.objetivoEscaneo = objetivo;
    if (modalEscaner) modalEscaner.style.display = 'flex';

    state.html5QrcodeScanner = new Html5QrcodeScanner(
        'lector-camara',
        {
            fps: 10,
            qrbox: { width: 250, height: 100 },
            formatsToSupport: [
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.EAN_8,
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.UPC_A,
                Html5QrcodeSupportedFormats.UPC_E,
                Html5QrcodeSupportedFormats.QR_CODE,
            ],
        },
        false
    );
    state.html5QrcodeScanner.render(onScanSuccess, onScanFailure);
}

export function detenerEscaner() {
    if (state.html5QrcodeScanner) {
        state.html5QrcodeScanner.clear().catch(err => console.error('Fallo al detener el escáner', err));
    }
    if (modalEscaner) modalEscaner.style.display = 'none';
}

function onScanSuccess(decodedText) {
    const codigoLimpio = decodedText.trim();
    detenerEscaner();

    if (state.objetivoEscaneo === 'inventario') {
        const inputCodigo = document.getElementById('inputCodigoBarras');
        if (inputCodigo) {
            inputCodigo.value = codigoLimpio;
            inputCodigo.dispatchEvent(new Event('input', { bubbles: true }));
        }
        const inputNombre = document.getElementById('inputNombreProducto');
        if (inputNombre) inputNombre.focus();

    } else if (state.objetivoEscaneo === 'venta') {
        const productoEscaneado = state.inventory.find(p => p.codigoBarras && p.codigoBarras === codigoLimpio && p.cantidad > 0);
        const inputBuscar = document.getElementById('inputBuscarProductVenta');
        if (productoEscaneado) {
            if (inputBuscar) inputBuscar.value = productoEscaneado.nombre;
            // Delegar a ventas-fisicas a través del callback registrado en state
            if (state.onSeleccionarProductoVenta) state.onSeleccionarProductoVenta(productoEscaneado.id);
        } else {
            if (inputBuscar) {
                inputBuscar.value = codigoLimpio;
                inputBuscar.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
    }
}

function onScanFailure() { /* ignorar errores de lectura individuales */ }

// Botón cerrar escáner
if (btnCerrarScanner) {
    btnCerrarScanner.addEventListener('click', detenerEscaner);
}
