// ============================================================
// estadisticas.js — Gráficos KPI para ventas físicas y online
// ============================================================
import { state } from './state.js';

// ── Colores según el modo activo ─────────────────────────────
function _tc() { return document.body.classList.contains('modo-miopia') ? '#333333' : '#ffffff'; }
function _gc() { return document.body.classList.contains('modo-miopia') ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.04)'; }

function destroyC(ref) { try { if (ref) ref.destroy(); } catch(e){} }
function getCtx(id) { return document.getElementById(id)?.getContext('2d'); }

// ── Helpers de fecha ─────────────────────────────────────────
export function parsearFechaVenta(venta) {
    if (venta.globalId) {
        const gid = Number(venta.globalId);
        if (gid > 1_000_000_000_000) return new Date(gid);
        if (gid > 1_000_000_000)    return new Date(gid * 1000);
    }
    if (venta.fechaLimpia) {
        const p = venta.fechaLimpia.split('/');
        if (p.length === 3) { const d = new Date(+p[2], +p[1]-1, +p[0]); if (!isNaN(d)) return d; }
    }
    const d = new Date(venta.date); return isNaN(d) ? null : d;
}

// ── Estadísticas Físicas ──────────────────────────────────────
let periodoActivo = 'diaria';

function filtrarPorPeriodo(periodo) {
    const ahora = new Date(), hoyStr = ahora.toLocaleDateString();
    return state.sales.filter(v => {
        if (String(v.id||'').startsWith('ONLINE-') || String(v.id||'').startsWith('COMBO-')) return false;
        if (periodo === 'diaria') {
            if (v.fechaLimpia === hoyStr) return true;
            if (v.globalId > 1_000_000_000_000) return new Date(v.globalId).toDateString() === ahora.toDateString();
            return false;
        }
        const fv = parsearFechaVenta(v); if (!fv) return false;
        if (periodo === 'semanal') {
            const ini = new Date(ahora); ini.setDate(ahora.getDate() - (ahora.getDay()+6)%7); ini.setHours(0,0,0,0);
            return fv >= ini;
        }
        return fv.getMonth() === ahora.getMonth() && fv.getFullYear() === ahora.getFullYear();
    });
}

function filtrarPorPeriodoAnterior(periodo) {
    const ahora = new Date(), ayer = new Date(ahora);
    ayer.setDate(ahora.getDate()-1);
    return state.sales.filter(v => {
        if (String(v.id||'').startsWith('ONLINE-') || String(v.id||'').startsWith('COMBO-')) return false;
        if (periodo === 'diaria') {
            if (v.fechaLimpia === ayer.toLocaleDateString()) return true;
            if (v.globalId > 1_000_000_000_000) return new Date(v.globalId).toDateString() === ayer.toDateString();
            return false;
        }
        const fv = parsearFechaVenta(v); if (!fv) return false;
        if (periodo === 'semanal') {
            const d = (ahora.getDay()+6)%7;
            const ini = new Date(ahora); ini.setDate(ahora.getDate()-d-7); ini.setHours(0,0,0,0);
            const fin = new Date(ini); fin.setDate(ini.getDate()+7);
            return fv >= ini && fv < fin;
        }
        const m = ahora.getMonth()===0 ? 11 : ahora.getMonth()-1;
        const y = ahora.getMonth()===0 ? ahora.getFullYear()-1 : ahora.getFullYear();
        return fv.getMonth()===m && fv.getFullYear()===y;
    });
}

function renderEstadisticas(periodo) {
    const filtradas  = filtrarPorPeriodo(periodo);
    const anteriores = filtrarPorPeriodoAnterior(periodo);
    const fmt = v => '$' + Math.round(v).toLocaleString('es-CO');

    const totalVentas = filtradas.reduce((s,v) => s+(v.total||0), 0);
    const numTrans    = filtradas.length;
    const totalProds  = filtradas.reduce((s,v) => s+v.items.reduce((a,i) => a+(i.qty||0), 0), 0);
    const ticketProm  = numTrans > 0 ? totalVentas/numTrans : 0;
    const totalAnt    = anteriores.reduce((s,v) => s+(v.total||0), 0);
    const transAnt    = anteriores.length;
    const prodAnt     = anteriores.reduce((s,v) => s+v.items.reduce((a,i) => a+(i.qty||0), 0), 0);
    const ticketAnt   = transAnt > 0 ? totalAnt/transAnt : 0;

    const el = id => document.getElementById(id);
    if (el('kpi-total-ventas'))      el('kpi-total-ventas').textContent      = fmt(totalVentas);
    if (el('kpi-num-transacciones')) el('kpi-num-transacciones').textContent = numTrans;
    if (el('kpi-productos-vendidos'))el('kpi-productos-vendidos').textContent= totalProds;
    if (el('kpi-ticket-promedio'))   el('kpi-ticket-promedio').textContent   = fmt(ticketProm);
    const labelMap = { diaria: 'Resumen de hoy', semanal: 'Esta semana', mensual: 'Este mes' };
    if (el('stats-fecha-label')) el('stats-fecha-label').textContent = labelMap[periodo]||'';

    function setTrend(elId, compId, actual, anterior) {
        const e=el(elId), ec=el(compId); if(!e) return;
        if (anterior===0 && actual===0) { e.textContent='—'; e.className='kpi-trend'; if(ec) ec.textContent='Sin datos del período anterior'; return; }
        if (anterior===0) { e.textContent='🆕 Nuevo'; e.className='kpi-trend positivo'; if(ec) ec.textContent='Primera vez en este período'; return; }
        const pct = Math.round(((actual-anterior)/anterior)*100);
        e.textContent = (pct>=0?'▲ ':'▼ ')+Math.abs(pct)+'%';
        e.className = 'kpi-trend '+(pct>=0?'positivo':'negativo');
        if(ec) ec.textContent = 'Período anterior: '+(anterior>100?fmt(anterior):anterior);
    }
    setTrend('kpi-trend-ventas','kpi-compare-ventas',totalVentas,totalAnt);
    setTrend('kpi-trend-trans','kpi-compare-trans',numTrans,transAnt);
    setTrend('kpi-trend-prod','kpi-compare-prod',totalProds,prodAnt);
    setTrend('kpi-trend-ticket','kpi-compare-ticket',ticketProm,ticketAnt);

    const prodMap={}, prodIngresos={};
    filtradas.forEach(v => v.items.forEach(i => { prodMap[i.name]=(prodMap[i.name]||0)+(i.qty||0); prodIngresos[i.name]=(prodIngresos[i.name]||0)+(i.subtotal||0); }));
    const topProductos = Object.entries(prodMap).sort((a,b)=>b[1]-a[1]).slice(0,8);

    const catMap = {};
    filtradas.forEach(v => v.items.forEach(i => {
        const prod = state.inventory.find(p=>p.id===i.productId);
        const cat = prod?.categoria||'Sin categoría';
        catMap[cat] = (catMap[cat]||0)+(i.subtotal||0);
    }));

    const tendenciaLabels=[], tendenciaData=[];
    if (periodo==='diaria') {
        const ph=Array(24).fill(0);
        filtradas.forEach(v => { const h=v.globalId>1e12?new Date(v.globalId).getHours():new Date(v.date).getHours(); if(!isNaN(h)&&h>=0) ph[h]+=(v.total||0); });
        for(let h=0;h<24;h++){tendenciaLabels.push(h+':00');tendenciaData.push(ph[h]);}
    } else if (periodo==='semanal') {
        const dias=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'],pd=Array(7).fill(0);
        filtradas.forEach(v=>{const fv=parsearFechaVenta(v);if(fv){pd[(fv.getDay()+6)%7]+=(v.total||0);}});
        dias.forEach((d,i)=>{tendenciaLabels.push(d);tendenciaData.push(pd[i]);});
    } else {
        const dm=new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate(),pd=Array(dm).fill(0);
        filtradas.forEach(v=>{const fv=parsearFechaVenta(v);if(fv){const d=fv.getDate()-1;if(d>=0&&d<dm)pd[d]+=(v.total||0);}});
        for(let d=1;d<=dm;d++){tendenciaLabels.push('D'+d);tendenciaData.push(pd[d-1]);}
    }
    for(let i=0;i<tendenciaData.length;i++) if(tendenciaData[i]<0) tendenciaData[i]=0;

    const maxVal=Math.max(...tendenciaData,1), horasPico=tendenciaData.filter(v=>v>0).length;
    if(el('chart-badge-tendencia')) el('chart-badge-tendencia').textContent = periodo==='diaria'?(horasPico>0?`${horasPico} hora${horasPico>1?'s':''} con ventas`:'Sin ventas hoy'):fmt(totalVentas)+' total';
    if(el('chart-badge-ingresos')) el('chart-badge-ingresos').textContent = numTrans===0?'Sin transacciones':numTrans+' venta'+(numTrans>1?'s':'');

    const CD = { responsive:true, maintainAspectRatio:false, plugins:{legend:{labels:{color:_tc(),font:{size:14}}}}, scales:{x:{ticks:{color:_tc(),font:{size:13}},grid:{color:_gc()}},y:{min:0,ticks:{color:_tc(),font:{size:13},callback:v=>v>=1000?'$'+Math.round(v/1000)+'k':'$'+v},grid:{color:_gc()}}} };
    const _cl = document.body.classList.contains('modo-miopia');
    const CG = _cl?['#00B5A0','#1A8FFF','#7C3AED','#F97316','#EC4899','#16A34A','#EAB308','#4F46E5']:['rgba(122,228,214,0.75)','rgba(100,180,255,0.75)','rgba(180,140,255,0.75)','rgba(255,160,80,0.75)','rgba(255,100,150,0.75)','rgba(80,220,160,0.75)','rgba(255,210,70,0.75)','rgba(120,160,255,0.75)'];
    const lc=_cl?'#006B5E':'#00B5A0', gt=_cl?'rgba(0,107,94,0.28)':'rgba(0,181,160,0.35)', gb=_cl?'rgba(0,107,94,0.02)':'rgba(0,181,160,0.02)';

    destroyC(state.chartTendencia);
    const cx1=getCtx('chartTendencia');
    if(cx1) state.chartTendencia=new Chart(cx1,{type:'line',data:{labels:tendenciaLabels,datasets:[{label:'Ingresos',data:tendenciaData,borderColor:lc,backgroundColor:ctx=>{const g=ctx.chart.ctx.createLinearGradient(0,0,0,210);g.addColorStop(0,gt);g.addColorStop(1,gb);return g;},pointBackgroundColor:lc,pointRadius:3,pointHoverRadius:6,fill:true,tension:0.35,borderWidth:_cl?2.5:2}]},options:{...CD,plugins:{...CD.plugins,legend:{display:false}}}});

    destroyC(state.chartProductos);
    const cx2=getCtx('chartProductos');
    if(cx2) state.chartProductos=new Chart(cx2,{type:'bar',data:{labels:topProductos.map(p=>p[0].length>16?p[0].slice(0,16)+'…':p[0]),datasets:[{label:'Unidades',data:topProductos.map(p=>p[1]),backgroundColor:CG,borderRadius:6}]},options:{...CD,plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>` ${ctx.raw} unidades`}}},scales:{x:{ticks:{color:_tc(),font:{size:14}},grid:{display:false}},y:{min:0,ticks:{color:_tc(),font:{size:13},stepSize:1},grid:{color:_gc()}}}}});

    destroyC(state.chartCategorias);
    const cx3=getCtx('chartCategorias');
    if(cx3) state.chartCategorias=new Chart(cx3,{type:'doughnut',data:{labels:Object.keys(catMap),datasets:[{data:Object.values(catMap),backgroundColor:CG,borderColor:'rgba(8,15,26,0.8)',borderWidth:2,hoverOffset:6}]},options:{responsive:true,maintainAspectRatio:false,cutout:'62%',plugins:{legend:{position:'right',labels:{color:_tc(),font:{size:22,weight:'bold'},boxWidth:22,padding:24}}}}});

    destroyC(state.chartIngresos);
    const cx4=getCtx('chartIngresos');
    if(cx4) state.chartIngresos=new Chart(cx4,{type:'bar',data:{labels:tendenciaLabels,datasets:[{label:'Ingresos $',data:tendenciaData,backgroundColor:tendenciaData.map(v=>v===maxVal?(_cl?'#00B5A0':'rgba(122,228,214,0.85)'):(_cl?'rgba(0,150,130,0.72)':'rgba(122,228,214,0.22)')),borderColor:tendenciaData.map(v=>v===maxVal?(_cl?'#006B5E':'#7ae4d6'):(_cl?'rgba(0,120,104,0.80)':'rgba(122,228,214,0.15)')),borderWidth:1.5,borderRadius:4}]},options:{...CD,plugins:{...CD.plugins,legend:{display:false}}}});

    const tbody=document.getElementById('stats-tabla-body');
    if(tbody){
        const todos=Object.entries(prodMap).sort((a,b)=>b[1]-a[1]).slice(0,15);
        tbody.innerHTML = todos.length===0
            ? '<tr><td colspan="5" class="stats-tabla-empty">Aún no hay ventas en este período.</td></tr>'
            : todos.map(([nombre,qty],idx)=>{const ing=prodIngresos[nombre]||0,pct=totalVentas>0?Math.round((ing/totalVentas)*100):0;return`<tr><td>${idx+1}</td><td style="text-align:left">${nombre}</td><td>${qty}</td><td>${fmt(ing)}</td><td><div class="stats-pct-bar"><span class="stats-pct-num">${pct}%</span><div class="stats-pct-track"><div class="stats-pct-fill" style="width:${pct}%"></div></div></div></td></tr>`;}).join('');
    }
}

export function initEstadisticas() {
    document.querySelectorAll('.btn-period').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-period').forEach(b => b.classList.remove('activo'));
            btn.classList.add('activo');
            periodoActivo = btn.dataset.period;
            renderEstadisticas(periodoActivo);
        });
    });
    renderEstadisticas(periodoActivo);
    state.onInitEstadisticas = () => renderEstadisticas(periodoActivo);
}

// ── Estadísticas Online ───────────────────────────────────────
let periodoOnlineActivo = 'diaria';

function getVentasOnline() { return state.sales.filter(v => v.id && String(v.id).startsWith('ONLINE-')); }

function filtrarOnlinePorPeriodo(periodo, lista) {
    const ahora=new Date(), hoyStr=ahora.toDateString();
    return lista.filter(v => {
        const fv=parsearFechaVenta(v); if(!fv) return false;
        if(periodo==='diaria') return fv.toDateString()===hoyStr;
        if(periodo==='semanal'){ const ini=new Date(ahora);ini.setDate(ahora.getDate()-(ahora.getDay()+6)%7);ini.setHours(0,0,0,0);return fv>=ini; }
        return fv.getMonth()===ahora.getMonth()&&fv.getFullYear()===ahora.getFullYear();
    });
}

function filtrarOnlinePorPeriodoAnterior(periodo, lista) {
    const ahora=new Date(),ayer=new Date(ahora);ayer.setDate(ahora.getDate()-1);
    return lista.filter(v => {
        const fv=parsearFechaVenta(v); if(!fv) return false;
        if(periodo==='diaria') return fv.toDateString()===ayer.toDateString();
        if(periodo==='semanal'){const d=(ahora.getDay()+6)%7,ini=new Date(ahora);ini.setDate(ahora.getDate()-d-7);ini.setHours(0,0,0,0);const fin=new Date(ini);fin.setDate(ini.getDate()+7);return fv>=ini&&fv<fin;}
        const m=ahora.getMonth()===0?11:ahora.getMonth()-1,y=ahora.getMonth()===0?ahora.getFullYear()-1:ahora.getFullYear();
        return fv.getMonth()===m&&fv.getFullYear()===y;
    });
}

function renderEstadisticasOnline(periodo) {
    const todasOnline=getVentasOnline(),ventasFiltradas=filtrarOnlinePorPeriodo(periodo,todasOnline),ventasAnt=filtrarOnlinePorPeriodoAnterior(periodo,todasOnline);
    const todasCombo=state.sales.filter(v=>v.id&&String(v.id).startsWith('COMBO-ONLINE-'));
    const comboFilt=filtrarOnlinePorPeriodo(periodo,todasCombo),comboAnt=filtrarOnlinePorPeriodoAnterior(periodo,todasCombo);
    const itemsOnline=ventasFiltradas.flatMap(v=>v.items.filter(i=>!String(i.name||'').startsWith('🎁')));
    const itemsCombo=comboFilt.flatMap(v=>v.items);
    const todosItems=[...itemsOnline,...itemsCombo];
    const fmt=v=>'$'+Math.round(v).toLocaleString('es-CO');
    const totalVentas=ventasFiltradas.reduce((s,v)=>s+(v.total||0),0)+comboFilt.reduce((s,v)=>s+(v.total||0),0);
    const numTrans=new Set([...ventasFiltradas.map(v=>v.globalId),...comboFilt.map(v=>v.globalId)]).size;
    const totalProds=todosItems.reduce((a,i)=>a+(i.qty||0),0);
    const ticketProm=numTrans>0?totalVentas/numTrans:0;
    const totalAnt=ventasAnt.reduce((s,v)=>s+(v.total||0),0)+comboAnt.reduce((s,v)=>s+(v.total||0),0);
    const transAnt=new Set([...ventasAnt.map(v=>v.globalId),...comboAnt.map(v=>v.globalId)]).size;
    const prodAnt=ventasAnt.reduce((s,v)=>s+v.items.filter(i=>!String(i.name||'').startsWith('🎁')).reduce((a,i)=>a+(i.qty||0),0),0)+comboAnt.reduce((s,v)=>s+v.items.reduce((a,i)=>a+(i.qty||0),0),0);
    const ticketAnt=transAnt>0?totalAnt/transAnt:0;

    const el=id=>document.getElementById(id);
    if(el('kpio-total-ventas'))      el('kpio-total-ventas').textContent=fmt(totalVentas);
    if(el('kpio-num-transacciones')) el('kpio-num-transacciones').textContent=numTrans;
    if(el('kpio-productos-vendidos'))el('kpio-productos-vendidos').textContent=totalProds;
    if(el('kpio-ticket-promedio'))   el('kpio-ticket-promedio').textContent=fmt(ticketProm);
    const lm={diaria:'Resumen de hoy',semanal:'Esta semana',mensual:'Este mes'};
    if(el('stats-online-fecha-label')) el('stats-online-fecha-label').textContent=lm[periodo]||'';

    function setTrO(eId,cId,act,ant){const e=el(eId),ec=el(cId);if(!e)return;if(ant===0&&act===0){e.textContent='—';e.className='kpi-trend';if(ec)ec.textContent='Sin datos';return;}if(ant===0){e.textContent='🆕 Nuevo';e.className='kpi-trend positivo';if(ec)ec.textContent='Primera vez';return;}const p=Math.round(((act-ant)/ant)*100);e.textContent=(p>=0?'▲ ':'▼ ')+Math.abs(p)+'%';e.className='kpi-trend '+(p>=0?'positivo':'negativo');if(ec)ec.textContent='Período anterior: '+(ant>100?fmt(ant):ant);}
    setTrO('kpio-trend-ventas','kpio-compare-ventas',totalVentas,totalAnt);
    setTrO('kpio-trend-trans','kpio-compare-trans',numTrans,transAnt);
    setTrO('kpio-trend-prod','kpio-compare-prod',totalProds,prodAnt);
    setTrO('kpio-trend-ticket','kpio-compare-ticket',ticketProm,ticketAnt);

    const prodMap={},prodIngresos={};
    todosItems.forEach(i=>{if(!i.name)return;prodMap[i.name]=(prodMap[i.name]||0)+(i.qty||0);prodIngresos[i.name]=(prodIngresos[i.name]||0)+(i.subtotal||0);});
    const topP=Object.entries(prodMap).sort((a,b)=>b[1]-a[1]).slice(0,8);
    const catMap={};
    todosItems.forEach(i=>{if(!i.name)return;const p=state.inventory.find(p=>p.id===i.productId||String(p.id)===String(i.productId));catMap[p?.categoria||'Sin categoría']=(catMap[p?.categoria||'Sin categoría']||0)+(i.subtotal||0);});

    const tLabels=[],tData=[];
    if(periodo==='diaria'){const ph=Array(24).fill(0);ventasFiltradas.forEach(v=>{const fv=parsearFechaVenta(v);const h=fv?fv.getHours():NaN;if(!isNaN(h)&&h>=0)ph[h]+=(v.total||0);});comboFilt.forEach(v=>{const fv=parsearFechaVenta(v);const h=fv?fv.getHours():NaN;if(!isNaN(h)&&h>=0)ph[h]+=(v.total||0);});for(let h=0;h<24;h++){tLabels.push(h+':00');tData.push(ph[h]);}}
    else if(periodo==='semanal'){const dias=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'],pd=Array(7).fill(0);ventasFiltradas.forEach(v=>{const fv=parsearFechaVenta(v);if(fv)pd[(fv.getDay()+6)%7]+=(v.total||0);});comboFilt.forEach(v=>{const fv=parsearFechaVenta(v);if(fv)pd[(fv.getDay()+6)%7]+=(v.total||0);});dias.forEach((d,i)=>{tLabels.push(d);tData.push(pd[i]);});}
    else{const dm=new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate(),pd=Array(dm).fill(0);ventasFiltradas.forEach(v=>{const fv=parsearFechaVenta(v);if(fv){const d=fv.getDate()-1;if(d>=0&&d<dm)pd[d]+=(v.total||0);}});comboFilt.forEach(v=>{const fv=parsearFechaVenta(v);if(fv){const d=fv.getDate()-1;if(d>=0&&d<dm)pd[d]+=(v.total||0);}});for(let d=1;d<=dm;d++){tLabels.push('D'+d);tData.push(pd[d-1]);}}

    if(el('online-chart-badge-tendencia')) el('online-chart-badge-tendencia').textContent=periodo==='diaria'?(tData.filter(v=>v>0).length>0?tData.filter(v=>v>0).length+' hora(s) con pedidos':'Sin pedidos hoy'):fmt(totalVentas)+' total';
    if(el('online-chart-badge-ingresos')) el('online-chart-badge-ingresos').textContent=numTrans===0?'Sin pedidos':numTrans+' pedido'+(numTrans>1?'s':'');

    const maxV=Math.max(...tData,1);
    const CD2={responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:_tc(),font:{size:14}}}},scales:{x:{ticks:{color:_tc(),font:{size:13}},grid:{color:_gc()}},y:{min:0,ticks:{color:_tc(),font:{size:13},callback:v=>v>=1000?'$'+Math.round(v/1000)+'k':'$'+v},grid:{color:_gc()}}}};
    const _cl2=document.body.classList.contains('modo-miopia');
    const CG2=_cl2?['#1A8FFF','#00B5A0','#7C3AED','#F97316','#EC4899','#16A34A','#EAB308','#4F46E5']:['rgba(100,180,255,0.75)','rgba(122,228,214,0.75)','rgba(180,140,255,0.75)','rgba(255,160,80,0.75)','rgba(255,100,150,0.75)','rgba(80,220,160,0.75)','rgba(255,210,70,0.75)','rgba(120,160,255,0.75)'];
    const lc2=_cl2?'#0055B3':'#1A8FFF',gt2=_cl2?'rgba(0,85,179,0.25)':'rgba(26,143,255,0.35)',gb2=_cl2?'rgba(0,85,179,0.02)':'rgba(26,143,255,0.02)';

    destroyC(state.chartOnlineTendencia);const cx1=getCtx('chartOnlineTendencia');
    if(cx1) state.chartOnlineTendencia=new Chart(cx1,{type:'line',data:{labels:tLabels,datasets:[{label:'Ingresos online',data:tData,borderColor:lc2,backgroundColor:ctx=>{const g=ctx.chart.ctx.createLinearGradient(0,0,0,210);g.addColorStop(0,gt2);g.addColorStop(1,gb2);return g;},pointBackgroundColor:lc2,pointRadius:3,pointHoverRadius:6,fill:true,tension:0.35,borderWidth:_cl2?2.5:2}]},options:{...CD2,plugins:{...CD2.plugins,legend:{display:false}}}});

    destroyC(state.chartOnlineProductos);const cx2=getCtx('chartOnlineProductos');
    if(cx2) state.chartOnlineProductos=new Chart(cx2,{type:'bar',data:{labels:topP.map(p=>p[0].length>16?p[0].slice(0,16)+'…':p[0]),datasets:[{label:'Unidades pedidas',data:topP.map(p=>p[1]),backgroundColor:CG2,borderRadius:6}]},options:{...CD2,plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>` ${ctx.raw} unidades`}}},scales:{x:{ticks:{color:_tc(),font:{size:14}},grid:{display:false}},y:{min:0,ticks:{color:_tc(),font:{size:13},stepSize:1},grid:{color:_gc()}}}}});

    destroyC(state.chartOnlineCategorias);const cx3=getCtx('chartOnlineCategorias');
    if(cx3) state.chartOnlineCategorias=new Chart(cx3,{type:'doughnut',data:{labels:Object.keys(catMap),datasets:[{data:Object.values(catMap),backgroundColor:CG2,borderColor:'rgba(8,15,26,0.8)',borderWidth:2,hoverOffset:6}]},options:{responsive:true,maintainAspectRatio:false,cutout:'62%',plugins:{legend:{position:'right',labels:{color:_tc(),font:{size:22,weight:'bold'},boxWidth:22,padding:24}}}}});

    destroyC(state.chartOnlineIngresos);const cx4=getCtx('chartOnlineIngresos');
    if(cx4) state.chartOnlineIngresos=new Chart(cx4,{type:'bar',data:{labels:tLabels,datasets:[{label:'Ingresos $',data:tData,backgroundColor:tData.map(v=>v===maxV?(_cl2?'#1A8FFF':'rgba(100,180,255,0.85)'):(_cl2?'rgba(0,110,210,0.72)':'rgba(100,180,255,0.22)')),borderColor:tData.map(v=>v===maxV?(_cl2?'#0055B3':'#64b4ff'):(_cl2?'rgba(0,90,180,0.80)':'rgba(100,180,255,0.15)')),borderWidth:1.5,borderRadius:4}]},options:{...CD2,plugins:{...CD2.plugins,legend:{display:false}}}});

    const tbody=document.getElementById('stats-online-tabla-body');
    if(tbody){const todos=Object.entries(prodMap).sort((a,b)=>b[1]-a[1]).slice(0,15);tbody.innerHTML=todos.length===0?'<tr><td colspan="5" class="stats-tabla-empty">Sin pedidos confirmados en este período.</td></tr>':todos.map(([nombre,qty],idx)=>{const ing=prodIngresos[nombre]||0,pct=totalVentas>0?Math.round((ing/totalVentas)*100):0;return`<tr><td>${idx+1}</td><td style="text-align:left">${nombre}</td><td>${qty}</td><td>${fmt(ing)}</td><td><div class="stats-pct-bar"><span class="stats-pct-num">${pct}%</span><div class="stats-pct-track"><div class="stats-pct-fill" style="width:${pct}%"></div></div></div></td></tr>`;}).join('');}

    const seccionCombos=document.getElementById('seccionCombosOnlineStats'),listaCombos=document.getElementById('listaCombosOnlineStats');
    if(seccionCombos&&listaCombos){if(!comboFilt.length){seccionCombos.style.display='none';}else{seccionCombos.style.display='block';listaCombos.innerHTML=[...comboFilt].reverse().map(t=>{const nombre=t.items.length>0?t.items.map(i=>i.name).slice(0,2).join(', ')+(t.items.length>2?'…':''):'—';return`<div class="combo-online-stat-row"><span class="combo-stat-id">${t.id}</span><span class="combo-stat-nombre">${nombre}</span><span class="combo-stat-fecha">${t.fechaLimpia||''}</span><span class="combo-stat-total">${fmt(t.total||0)}</span></div>`;}).join('');}}
}

export function initEstadisticasOnline() {
    document.querySelectorAll('.btn-period-online').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-period-online').forEach(b => b.classList.remove('activo'));
            btn.classList.add('activo');
            periodoOnlineActivo = btn.dataset.period;
            renderEstadisticasOnline(periodoOnlineActivo);
        });
    });
    renderEstadisticasOnline(periodoOnlineActivo);
    state.onInitEstadisticasOnline = () => renderEstadisticasOnline(periodoOnlineActivo);
}

// ── Actualizar colores de charts al cambiar modo ──────────────
export function actualizarColoresCharts() {
    const todos = [state.chartTendencia, state.chartProductos, state.chartCategorias, state.chartIngresos,
                   state.chartOnlineTendencia, state.chartOnlineProductos, state.chartOnlineCategorias, state.chartOnlineIngresos];
    todos.forEach(chart => {
        if (!chart) return;
        if (chart.options.scales) { Object.values(chart.options.scales).forEach(s => { if(s.ticks) s.ticks.color=_tc(); if(s.grid&&s.grid.color!==undefined&&s.grid.display!==false) s.grid.color=_gc(); }); }
        if (chart.options.plugins?.legend?.labels) chart.options.plugins.legend.labels.color = _tc();
        chart.update('none');
    });
}
