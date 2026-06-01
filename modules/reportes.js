// ============================================================
// reportes.js — Generación de reportes PDF
// ============================================================
import { state } from './state.js';

export function generarReporteDiario() {
    if (typeof window.jspdf === 'undefined') return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const hoy = new Date().toLocaleDateString();
    const ventasHoy = state.sales.filter(s => (s.fechaLimpia || s.date?.split(',')[0]?.trim()) === hoy);
    if (!ventasHoy.length) return;
    doc.text(`Reporte Diario de Ventas - ${hoy}`, 14, 20);
    const filas = [];
    ventasHoy.forEach(v => v.items.forEach(i => filas.push([v.id, i.name, i.qty, `$${i.price}`, `$${i.subtotal}`])));
    doc.autoTable({ startY: 30, head: [['Ticket','Producto','Cant.','Precio','Subtotal']], body: filas });
    doc.save(`Reporte_${hoy.replace(/\//g, '-')}.pdf`);
}

// Expuesto en window para llamadas desde atributos onclick del HTML
window.generarReporteDiario = generarReporteDiario;
