// ============================================================
// config.js — Supabase client y constantes globales
// ============================================================
export const SB_URL = "https://mhnhfdtdpryrjaeaymsa.supabase.co";
export const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1obmhmZHRkcHJ5cmphZWF5bXNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NDE3MjAsImV4cCI6MjA5MjExNzcyMH0.UINKafSUr0jI1_NGrh3Z-Uzhwi6Euqot3WQMsliteug";

// window.supabase es el global inyectado por el CDN de Supabase en index.html
export const supabaseClient = window.supabase.createClient(SB_URL, SB_KEY);

// Placeholder local (data URI SVG) para productos sin imagen.
// Reemplaza a via.placeholder.com, que dejó de funcionar. Nunca se rompe ni
// requiere internet, así también sirve en modo offline.
export const IMG_PLACEHOLDER = 'data:image/svg+xml;charset=UTF-8,'
    + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" fill="#e2e8ec"/><path d="M14 32l7-8 5 6 4-5 5 7z" fill="#aebfc9"/><circle cx="18" cy="17" r="3.2" fill="#aebfc9"/></svg>');

// Detecta si la app corre dentro de un iframe previsualizador externo
export const EN_IFRAME_PREVIEW = (() => {
    try {
        if (window.self === window.top) return false;
        if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') return true;
        try { const _ = window.top.location.href; return false; } catch (e) { return true; }
    } catch (e) { return true; }
})();
