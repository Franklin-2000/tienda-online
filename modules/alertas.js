// ============================================================
// alertas.js — Sistema de alertas y confirmaciones personalizadas
// Sin dependencias externas.
// ============================================================

// Inyectar estilos una sola vez al importar el módulo
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
        .__alerta-overlay.cerrando { animation:__fadeOut .18s ease forwards; }
        .__alerta-box {
            background:#fff; border-radius:20px; padding:32px 28px 24px;
            max-width:390px; width:92%;
            box-shadow:0 10px 50px rgba(0,0,0,.25);
            text-align:center;
            font-family:'Nunito','Segoe UI',sans-serif;
            animation:__scaleIn .2s cubic-bezier(.34,1.56,.64,1);
        }
        .__alerta-icono { font-size:2.4rem; margin-bottom:10px; display:block; }
        .__alerta-msg  { margin:0 0 22px; font-size:1rem; color:#222; line-height:1.65; white-space:pre-line; }
        .__alerta-btns { display:flex; gap:10px; justify-content:center; flex-wrap:wrap; }
        .__alerta-btn  {
            border:none; border-radius:50px; padding:11px 32px;
            font-size:.97rem; font-weight:700; cursor:pointer;
            font-family:'Nunito','Segoe UI',sans-serif;
            transition:transform .12s, box-shadow .12s; outline:none;
        }
        .__alerta-btn:focus  { box-shadow:0 0 0 3px rgba(108,99,255,.4); }
        .__alerta-btn:hover  { transform:scale(1.04); }
        .__alerta-btn-ok     { background:linear-gradient(135deg,#6c63ff,#a78bfa); color:#fff; box-shadow:0 4px 14px rgba(108,99,255,.35); }
        .__alerta-btn-cancel { background:#f0f0f0; color:#444; }
        .__alerta-btn-danger { background:linear-gradient(135deg,#e53935,#f06292); color:#fff; box-shadow:0 4px 14px rgba(229,57,53,.3); }
    `;
    document.head.appendChild(style);
})();

const ICONOS_ALERTA = {
    info:    '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    success: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error:   '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    warn:    '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
};
const ICO_FALLBACK = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';

/**
 * Muestra una alerta personalizada. Enter / click = Aceptar.
 * @param {string} mensaje
 * @param {'info'|'success'|'error'|'warn'} [tipo='info']
 * @returns {Promise<void>}
 */
export function mostrarAlerta(mensaje, tipo = 'info') {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = '__alerta-overlay';
        overlay.innerHTML = `
            <div class="__alerta-box">
                <span class="__alerta-icono">${ICONOS_ALERTA[tipo] || ICO_FALLBACK}</span>
                <p class="__alerta-msg">${mensaje}</p>
                <div class="__alerta-btns">
                    <button class="__alerta-btn __alerta-btn-ok" id="__btn-ok">Aceptar</button>
                </div>
            </div>`;

        let puedesCerrar = false;
        const cerrar = () => {
            if (!puedesCerrar) return;
            overlay.classList.add('cerrando');
            document.removeEventListener('keydown', onKey);
            setTimeout(() => { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); resolve(); }, 170);
        };
        const onKey = (e) => {
            if (!puedesCerrar) return;
            if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); cerrar(); }
        };
        overlay.querySelector('#__btn-ok').addEventListener('click', cerrar);
        document.addEventListener('keydown', onKey);
        document.body.appendChild(overlay);
        setTimeout(() => { const btn = overlay.querySelector('#__btn-ok'); if (btn) btn.focus(); puedesCerrar = true; }, 350);
    });
}

const ICONOS_CONFIRM = {
    warn:   ICONOS_ALERTA.warn,
    danger: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>',
    info:   '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
};

/**
 * Confirmación personalizada. Enter = Aceptar / Escape = Cancelar.
 * @param {string} mensaje
 * @param {'warn'|'danger'|'info'} [tipo='warn']
 * @returns {Promise<boolean>}
 */
export function mostrarConfirm(mensaje, tipo = 'warn') {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = '__alerta-overlay';
        overlay.innerHTML = `
            <div class="__alerta-box">
                <span class="__alerta-icono">${ICONOS_CONFIRM[tipo] || ICO_FALLBACK}</span>
                <p class="__alerta-msg">${mensaje}</p>
                <div class="__alerta-btns">
                    <button class="__alerta-btn __alerta-btn-cancel" id="__btn-cancel">Cancelar</button>
                    <button class="__alerta-btn ${tipo === 'danger' ? '__alerta-btn-danger' : '__alerta-btn-ok'}" id="__btn-ok">Aceptar</button>
                </div>
            </div>`;

        let puedesCerrar = false;
        const cerrar = (resultado) => {
            if (!puedesCerrar) return;
            overlay.classList.add('cerrando');
            document.removeEventListener('keydown', onKey);
            setTimeout(() => { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); resolve(resultado); }, 170);
        };
        const onKey = (e) => {
            if (!puedesCerrar) return;
            if (e.key === 'Enter')  { e.preventDefault(); cerrar(true); }
            if (e.key === 'Escape') { e.preventDefault(); cerrar(false); }
        };
        overlay.querySelector('#__btn-ok').addEventListener('click', () => cerrar(true));
        overlay.querySelector('#__btn-cancel').addEventListener('click', () => cerrar(false));
        document.addEventListener('keydown', onKey);
        document.body.appendChild(overlay);
        setTimeout(() => { const btn = overlay.querySelector('#__btn-ok'); if (btn) btn.focus(); puedesCerrar = true; }, 350);
    });
}
