// ===== Datos EXACTOS del Excel "Cronograma Rediseño de SIU UP" =====
// dev keys: humberto, alex, alfredo, omar, mixto
const activities = [
    { id: 1,  name: "Look and feel",                                          dev: "Humberto",         days: 15, preds: [],    comentario: "Una vez que se implemente el look and feel, se pueden comenzar a trabajar los demás módulos" },
    { id: 2,  name: "Primera parte de la solicitud",                          dev: "Humberto",         days: 15, preds: [1],   comentario: "" },
    { id: 3,  name: "Segunda parte de la solicitud",                          dev: "Alex",             days: 10, preds: [1],   comentario: "" },
    { id: 4,  name: "Carga Documentos por alumno",                            dev: "Alex",             days: 15, preds: [3],   comentario: "Solo se mostrará el historial de los documentos; se puede subir el documento, pero no aparecen los botones de prevalidar, validar o rechazar." },
    { id: 5,  name: "Dashboard general de documentos para administrativos",   dev: "Humberto/Alfredo", days: 15, preds: [2],   comentario: "Se divide por etapas." },
    { id: 6,  name: "Configuración entrevista",                               dev: "Omar / Alfredo",   days: 11, preds: [1],   comentario: "" },
    { id: 7,  name: "Módulo evaluación entrevista - beca",                    dev: "Omar / Alfredo",   days: 11, preds: [8],   comentario: "" },
    { id: 8,  name: "Evaluación entrevista - docente",                        dev: "Alfredo",          days: 15, preds: [11],  comentario: "" },
    { id: 9,  name: "Dashboard alumno",                                       dev: "Humberto",         days: 10, preds: [5],   comentario: "" },
    { id: 10, name: "Adecuación pantallas SIU",                               dev: "Humberto",         days: 20, preds: [9],   comentario: "" },
    { id: 11, name: "Agendar entrevista",                                     dev: "Omar / Alfredo",   days: 5,  preds: [6],   comentario: "Sin duración definida en el Excel; se estima en 5 días." },
];

const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

// ===== Utilidades de fechas hábiles =====
function isWeekend(d) { const w = d.getDay(); return w === 0 || w === 6; }

function firstBusinessOnOrAfter(d) {
    const r = new Date(d);
    while (isWeekend(r)) r.setDate(r.getDate() + 1);
    return r;
}
function nextBusinessDay(d) {
    const r = new Date(d);
    r.setDate(r.getDate() + 1);
    while (isWeekend(r)) r.setDate(r.getDate() + 1);
    return r;
}
// Fecha fin tras trabajar 'ndays' hábiles (inclusive el inicio)
function addBusinessDays(start, ndays) {
    let d = new Date(start);
    let count = 1;
    while (count < ndays) {
        d.setDate(d.getDate() + 1);
        if (!isWeekend(d)) count++;
    }
    return d;
}
function countBusinessDays(start, end) {
    let count = 0;
    let cur = new Date(start); cur.setHours(0,0,0,0);
    const e = new Date(end); e.setHours(0,0,0,0);
    while (cur <= e) { if (!isWeekend(cur)) count++; cur.setDate(cur.getDate() + 1); }
    return count;
}
function ymd(d) {
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function formatDate(dateStr) { const p = dateStr.split('-'); return `${p[2]}/${p[1]}`; }
function formatDateFull(d) {
    return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear();
}

// ===== Estado dinámico =====
let PROJECT_START = new Date('2026-10-19T00:00:00');
let tasks = [];          // filas del gantt (project + group + tasks)
let projectStart, projectEnd, allDays;

// Calcula start/end de cada actividad respetando predecesoras y días hábiles
function computeSchedule() {
    const starts = {}, ends = {};
    const byId = {}; activities.forEach(a => byId[a.id] = a);
    const pending = new Set(activities.map(a => a.id));
    let guard = 0;
    while (pending.size && guard++ < 1000) {
        for (const id of Array.from(pending)) {
            const a = byId[id];
            if (a.preds.every(p => ends[p])) {
                let s;
                if (a.preds.length) {
                    let latest = a.preds.map(p => ends[p]).reduce((m, x) => x > m ? x : m);
                    s = nextBusinessDay(latest);
                } else {
                    s = firstBusinessOnOrAfter(PROJECT_START);
                }
                starts[id] = s;
                ends[id] = addBusinessDays(s, a.days);
                pending.delete(id);
            }
        }
    }
    return { starts, ends };
}

function devKey(dev) {
    const d = (dev || '').toLowerCase();
    const has = k => d.includes(k);
    const multi = (d.includes('/') || d.includes(' y '));
    if (multi) return 'mixto';
    if (has('humberto')) return 'humberto';
    if (has('alex')) return 'alex';
    if (has('alfredo')) return 'alfredo';
    if (has('omar')) return 'omar';
    return 'mixto';
}
function getDevColor(dev) {
    switch (devKey(dev)) {
        case 'humberto': return '#4CAF50';
        case 'alex': return '#FF9800';
        case 'alfredo': return '#2196F3';
        case 'omar': return '#9C27B0';
        default: return '#009688';
    }
}
function getDevClass(dev) { return 'bar-' + devKey(dev); }

// Construye el arreglo tasks (proyecto + tareas). Este cronograma es plano (sin grupos del excel).
function buildTasks() {
    const { starts, ends } = computeSchedule();
    projectStart = firstBusinessOnOrAfter(PROJECT_START);
    projectEnd = activities.map(a => ends[a.id]).reduce((m, x) => x > m ? x : m);
    const totalDays = countBusinessDays(projectStart, projectEnd);

    tasks = [];
    tasks.push({
        id: "", name: "REDISEÑO SIU UP", dev: "", days: totalDays,
        start: ymd(projectStart), end: ymd(projectEnd), preds: "", risk: "-", type: "project"
    });
    activities.forEach(a => {
        tasks.push({
            id: String(a.id), name: a.name, dev: a.dev, days: a.days,
            start: ymd(starts[a.id]), end: ymd(ends[a.id]),
            preds: a.preds.join(', '), risk: "TRUE", type: "task",
            comentario: a.comentario
        });
    });

    allDays = getBusinessDaysRange(projectStart, projectEnd);
}

function getBusinessDaysRange(start, end) {
    const days = [];
    let current = new Date(start);
    while (current <= end) { if (!isWeekend(current)) days.push(new Date(current)); current.setDate(current.getDate() + 1); }
    return days;
}

function getDayIndex(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    for (let i = 0; i < allDays.length; i++) {
        if (allDays[i].getFullYear() === d.getFullYear() && allDays[i].getMonth() === d.getMonth() && allDays[i].getDate() === d.getDate()) return i;
    }
    let best = 0, bestDiff = Infinity;
    for (let i = 0; i < allDays.length; i++) { const diff = Math.abs(allDays[i] - d); if (diff < bestDiff) { bestDiff = diff; best = i; } }
    return best;
}

// ===== Progreso (persistente en localStorage) =====
const STORAGE_KEY = 'siu_up_avances';
const progressMap = {};

function loadProgress() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        activities.forEach(a => { progressMap[a.id] = saved[a.id] || 0; });
    } catch (e) { activities.forEach(a => { progressMap[a.id] = 0; }); }
    tasks.forEach(t => { if (t.type === 'task') t.progress = progressMap[t.id] || 0; });
}
function saveProgress() { localStorage.setItem(STORAGE_KEY, JSON.stringify(progressMap)); }

function setTaskProgress(id, value) {
    let v = parseInt(value, 10); if (isNaN(v)) v = 0; v = Math.max(0, Math.min(100, v));
    progressMap[id] = v;
    const task = tasks.find(t => t.id === id && t.type === 'task');
    if (task) task.progress = v;
    saveProgress();
    refreshAll();
}
function resetProgress() {
    if (confirm('¿Reiniciar todos los avances a 0%?')) {
        activities.forEach(a => { progressMap[a.id] = 0; });
        tasks.forEach(t => { if (t.type === 'task') t.progress = 0; });
        saveProgress(); refreshAll();
    }
}
function getProjectProgress() {
    const active = tasks.filter(t => t.type === 'task');
    const total = active.reduce((s, t) => s + t.days, 0);
    const weighted = active.reduce((s, t) => s + t.days * (t.progress || 0), 0);
    return total > 0 ? Math.round(weighted / total) : 0;
}

// ===== Retrasos =====
const TODAY = new Date();
function getExpectedProgress(task) {
    const start = new Date(task.start + "T00:00:00");
    const end = new Date(task.end + "T23:59:59");
    if (TODAY < start) return 0;
    if (TODAY > end) return 100;
    const totalBiz = countBusinessDays(start, end);
    const elapsedBiz = countBusinessDays(start, TODAY);
    return totalBiz > 0 ? Math.round(Math.min(100, (elapsedBiz / totalBiz) * 100)) : 0;
}
function getDelayStatus(task) {
    const prog = task.progress || 0;
    const expected = getExpectedProgress(task);
    const end = new Date(task.end + "T23:59:59");
    if (prog >= 100) return 'done';
    if (TODAY > end && prog < 100) return 'critical-delay';
    if (expected === 0) return 'notstarted';
    if (prog < expected - 10) return 'delayed';
    return 'ontrack';
}
function delayBadge(status) {
    switch (status) {
        case 'critical-delay': return '<span style="color:#ff1744;font-weight:bold">🔴 VENCIDA</span>';
        case 'delayed': return '<span style="color:#FF9800;font-weight:bold">⚠️ RETRASO</span>';
        case 'done': return '<span style="color:#4CAF50;font-weight:bold">✅ OK</span>';
        case 'ontrack': return '<span style="color:#4CAF50">🟢 En tiempo</span>';
        default: return '<span style="color:#666">— Sin iniciar</span>';
    }
}

// ===== Render Gantt =====
function renderGantt() {
    const table = document.getElementById('ganttTable');
    let header = '<thead><tr><th>Riesgo</th><th style="min-width:280px">Nombre de la tarea</th><th style="min-width:95px">Alerta</th><th style="min-width:120px">Asignado a</th><th>Dur.</th><th>Inicio</th><th>Fin</th><th style="min-width:60px">% Avance</th><th>Pred.</th>';
    allDays.forEach(d => {
        const border = d.getDay() === 1 ? 'border-left:2px solid #444;' : '';
        header += `<th class="day-cell" style="${border}" title="${d.toLocaleDateString('es-CO')}">${d.getDate()}<br><span style="font-size:0.6em;color:#888">${months[d.getMonth()]}</span></th>`;
    });
    header += '</tr></thead>';

    let body = '<tbody>';
    tasks.forEach((task) => {
        const startIdx = getDayIndex(task.start);
        const endIdx = getDayIndex(task.end);
        const rowClass = task.type === 'project' ? 'row-project' : (task.type === 'group' ? 'row-group' : '');
        const barClass = task.type === 'project' ? 'bar-project' : (task.type === 'group' ? 'bar-group' : getDevClass(task.dev));
        const indent = task.type === 'task' ? '&nbsp;&nbsp;&nbsp;&nbsp;' : '';
        const riskIcon = task.risk === 'TRUE' ? '<span class="risk-true">🚩</span>' : '<span class="risk-false">—</span>';

        let progress = 0, delayStatus = '';
        if (task.type === 'task') { progress = task.progress || 0; delayStatus = getDelayStatus(task); }
        else if (task.type === 'project') { progress = getProjectProgress(); }

        let rowStyle = '';
        if (delayStatus === 'critical-delay') rowStyle = 'style="background:#ff174415 !important"';
        else if (delayStatus === 'delayed') rowStyle = 'style="background:#FF980012 !important"';

        body += `<tr class="${rowClass}" ${rowStyle}>`;
        body += `<td class="task-info" style="text-align:center">${riskIcon}</td>`;
        body += `<td class="task-info">${indent}${task.name}</td>`;
        if (task.type === 'task') body += `<td class="task-info" style="font-size:0.68em;text-align:center">${delayBadge(delayStatus)}</td>`;
        else body += `<td class="task-info" style="text-align:center;color:#666">—</td>`;
        body += `<td class="task-info">${task.dev || ''}</td>`;
        body += `<td class="task-info" style="text-align:center">${task.days}d</td>`;
        body += `<td class="task-info">${formatDate(task.start)}</td>`;
        body += `<td class="task-info">${formatDate(task.end)}</td>`;
        if (task.type === 'task') body += `<td class="task-info" style="text-align:center"><input type="number" min="0" max="100" step="5" value="${progress}" class="pct-input" onchange="setTaskProgress('${task.id}', this.value)" />%</td>`;
        else body += `<td class="task-info pct-cell-group">${progress}%</td>`;
        body += `<td class="task-info">${task.preds}</td>`;

        allDays.forEach((d, i) => {
            const border = d.getDay() === 1 ? 'border-left:2px solid #333;' : '';
            if (i >= startIdx && i <= endIdx) {
                const color = task.type === 'task' ? getDevColor(task.dev) : '#546E7A';
                const trackClass = progress > 0 ? 'bar-progress-track' : '';
                body += `<td class="day-cell" style="${border}background:${color}15"><div class="bar ${barClass} ${trackClass}"></div></td>`;
            } else {
                body += `<td class="day-cell" style="${border}"></td>`;
            }
        });
        body += '</tr>';
    });
    body += '</tbody>';
    table.innerHTML = header + body;
    drawProgressOverlays();
}

function drawProgressOverlays() {
    const rows = document.getElementById('ganttTable').querySelectorAll('tbody tr');
    tasks.forEach((task, taskIdx) => {
        const row = rows[taskIdx]; if (!row) return;
        let progress = task.type === 'project' ? getProjectProgress() : (task.progress || 0);
        if (progress <= 0) return;
        const startIdx = getDayIndex(task.start), endIdx = getDayIndex(task.end);
        const cells = row.querySelectorAll('td.day-cell');
        const total = endIdx - startIdx + 1;
        const filledCount = total * (progress / 100);
        for (let k = 0; k < total; k++) {
            const cell = cells[startIdx + k]; if (!cell) continue;
            const bar = cell.querySelector('.bar'); if (!bar) continue;
            let fillPct = 0;
            if (k + 1 <= filledCount) fillPct = 100;
            else if (k < filledCount) fillPct = (filledCount - k) * 100;
            if (fillPct > 0) { const ov = document.createElement('div'); ov.className = 'bar-progress'; ov.style.width = fillPct + '%'; bar.appendChild(ov); }
        }
        const midCell = cells[startIdx + Math.floor(total / 2)];
        if (midCell) { const lbl = document.createElement('div'); lbl.className = 'pct-label'; lbl.textContent = progress + '%'; midCell.appendChild(lbl); }
    });
}

// ===== Resumen / Info proyecto =====
function renderSummary() {
    const active = tasks.filter(t => t.type === 'task');
    const totalTaskDays = active.reduce((s, t) => s + t.days, 0);
    const devs = [...new Set(active.map(t => t.dev).filter(Boolean))];
    const delayed = active.filter(t => getDelayStatus(t) === 'delayed').length;
    const overdue = active.filter(t => getDelayStatus(t) === 'critical-delay').length;
    document.getElementById('summaryCards').innerHTML = `
        <div class="card"><h3>${getProjectProgress()}%</h3><p>Avance total</p></div>
        <div class="card"><h3>${active.length}</h3><p>Actividades</p></div>
        <div class="card"><h3>${devs.length}</h3><p>Recursos</p></div>
        <div class="card"><h3>${totalTaskDays}d</h3><p>Días-persona</p></div>
        <div class="card"><h3 style="color:#FF9800">${delayed}</h3><p>Con retraso ⚠️</p></div>
        <div class="card"><h3 style="color:#ff1744">${overdue}</h3><p>Vencidas 🔴</p></div>`;
}
function renderProjectInfo() {
    const active = tasks.filter(t => t.type === 'task');
    const inProgress = active.filter(t => (t.progress||0) > 0 && (t.progress||0) < 100).length;
    const done = active.filter(t => (t.progress||0) === 100).length;
    const notStarted = active.filter(t => (t.progress||0) === 0).length;
    const totalDays = countBusinessDays(projectStart, projectEnd);
    document.getElementById('projectInfo').innerHTML = `
        <div><div class="label">Proyecto</div><div class="value">Rediseño SIU UP</div></div>
        <div><div class="label">Inicio</div><div class="value">${formatDateFull(projectStart)}</div></div>
        <div><div class="label">Finalización</div><div class="value">${formatDateFull(projectEnd)}</div></div>
        <div><div class="label">Duración (hábiles)</div><div class="value">${totalDays} días</div></div>
        <div><div class="label">No iniciadas</div><div class="value">${notStarted}</div></div>
        <div><div class="label">En progreso</div><div class="value">${inProgress}</div></div>
        <div><div class="label">Completas</div><div class="value">${done}</div></div>`;
    document.getElementById('subtitle').textContent =
        `Inicio: ${formatDateFull(projectStart)} | Fin: ${formatDateFull(projectEnd)} | Duración: ${totalDays} días hábiles`;
}
function renderProjectProgress() {
    const pct = getProjectProgress();
    document.getElementById('projectProgressFill').style.width = pct + '%';
    document.getElementById('projectProgressText').textContent = pct + '%';
    const active = tasks.filter(t => t.type === 'task');
    const completed = active.filter(t => (t.progress || 0) === 100).length;
    const inProgress = active.filter(t => (t.progress || 0) > 0 && (t.progress || 0) < 100).length;
    const notStarted = active.filter(t => (t.progress || 0) === 0).length;
    document.getElementById('projectProgressDetail').innerHTML =
        `✅ Completadas: <b style="color:#4CAF50">${completed}</b> &nbsp;|&nbsp; 🔵 En progreso: <b style="color:#00d4ff">${inProgress}</b> &nbsp;|&nbsp; ⚪ Sin iniciar: <b style="color:#aaa">${notStarted}</b> &nbsp;|&nbsp; Avance ponderado por días de esfuerzo.`;
}

// ===== Hitos (una entrega por actividad) =====
function renderHitos() {
    const container = document.getElementById('hitosContainer');
    container.innerHTML = tasks.filter(t => t.type === 'task').map((t, i) => `
        <div class="hito-card pendiente">
            <div class="hito-title">🎯 Hito ${i + 1}: ${t.name}</div>
            <div class="hito-date">📅 Entrega: ${formatDateFull(new Date(t.end + 'T00:00:00'))}</div>
            <div class="hito-desc">${t.comentario || 'Responsable: ' + t.dev} · ${t.days} días hábiles</div>
        </div>`).join('');
}

// ===== Ruta crítica: cadena que define la fecha fin del proyecto =====
function renderCriticalPath() {
    const byId = {}; tasks.filter(t => t.type === 'task').forEach(t => byId[t.id] = t);
    // Reconstruir la cadena que termina en la fecha de fin del proyecto
    let endTask = null;
    tasks.filter(t => t.type === 'task').forEach(t => {
        if (!endTask || new Date(t.end) > new Date(endTask.end)) endTask = t;
    });
    const chain = [];
    let cur = endTask;
    const guard = new Set();
    while (cur && !guard.has(cur.id)) {
        guard.add(cur.id);
        chain.unshift(cur);
        const preds = cur.preds ? cur.preds.split(',').map(s => s.trim()).filter(Boolean) : [];
        if (!preds.length) break;
        // predecesora que termina más tarde
        let latest = null;
        preds.forEach(p => { const pt = byId[p]; if (pt && (!latest || new Date(pt.end) > new Date(latest.end))) latest = pt; });
        cur = latest;
    }
    const totalDays = chain.reduce((s, n) => s + n.days, 0);
    let html = '<div style="color:#fff;font-size:0.9em;font-weight:bold;margin-bottom:8px">🔴 Cadena crítica (define la fecha final del proyecto)</div><div class="cp-chain">';
    chain.forEach((n, i) => {
        html += `<div class="cp-node"><div class="cp-task">${n.id}. ${n.name}</div><div class="cp-dev">${n.dev}</div><div class="cp-days">${n.days}d | ${formatDate(n.start)} - ${formatDate(n.end)}</div></div>`;
        if (i < chain.length - 1) html += '<span class="cp-arrow">→</span>';
    });
    html += '</div>';
    html += `<div class="cp-summary"><strong>⚠️ Impacto:</strong> La cadena crítica suma <strong>${totalDays} días</strong> de esfuerzo y determina el fin del proyecto (${formatDateFull(projectEnd)}). Cualquier retraso en estas tareas mueve directamente la fecha final.</div>`;
    document.getElementById('criticalPath').innerHTML = html;
}

// ===== Swimlane por desarrollador =====
function renderSwimlane() {
    const table = document.getElementById('swimlaneTable');
    const devNames = [...new Set(tasks.filter(t => t.type === 'task').map(t => t.dev))];
    let header = '<thead><tr><th style="min-width:160px">Recurso</th><th style="min-width:220px">Tarea</th><th>Días</th>';
    allDays.forEach(d => {
        const border = d.getDay() === 1 ? 'border-left:2px solid #444;' : '';
        header += `<th class="day-cell" style="${border}">${d.getDate()}<br><span style="font-size:0.6em;color:#888">${months[d.getMonth()]}</span></th>`;
    });
    header += '</tr></thead>';
    let body = '<tbody>';
    devNames.forEach(devName => {
        const devTasks = tasks.filter(t => t.type === 'task' && t.dev === devName);
        devTasks.forEach((task, idx) => {
            const startIdx = getDayIndex(task.start), endIdx = getDayIndex(task.end);
            body += '<tr>';
            if (idx === 0) body += `<td class="task-info" rowspan="${devTasks.length}" style="background:${getDevColor(devName)}22;color:${getDevColor(devName)};font-weight:bold;vertical-align:middle">${devName}</td>`;
            body += `<td class="task-info" style="font-size:0.7em">${task.name}</td>`;
            body += `<td class="task-info" style="text-align:center">${task.days}d</td>`;
            allDays.forEach((d, i) => {
                const border = d.getDay() === 1 ? 'border-left:2px solid #333;' : '';
                if (i >= startIdx && i <= endIdx) body += `<td class="day-cell" style="${border}background:${getDevColor(devName)}22"><div class="bar ${getDevClass(devName)}"></div></td>`;
                else body += `<td class="day-cell" style="${border}"></td>`;
            });
            body += '</tr>';
        });
    });
    body += '</tbody>';
    table.innerHTML = header + body;
}

// ===== Mapa de dependencias =====
function renderDependencies() {
    const byId = {}; tasks.filter(t => t.type === 'task').forEach(t => byId[t.id] = t);
    const deps = tasks.filter(t => t.type === 'task' && t.preds);
    document.getElementById('depsContainer').innerHTML = deps.map(t => {
        const preds = t.preds.split(',').map(s => s.trim()).filter(Boolean);
        return `<div class="dep-card">
            <div class="dep-title">🎯 Tarea ${t.id}: ${t.name} (${t.dev})</div>
            ${preds.map(p => { const pt = byId[p]; return `<div class="dep-item"><span class="dep-from">Tarea ${p}: ${pt ? pt.name : ''}</span><span class="dep-arrow">→</span><span class="dep-to">Tarea ${t.id}</span></div>`; }).join('')}
            <div class="dep-risk">⚠️ No puede iniciar hasta terminar su(s) predecesora(s). Un retraso previo desplaza esta tarea.</div>
        </div>`;
    }).join('');
}

// ===== Semáforo semanal =====
function renderSemaforo() {
    // Agrupar tareas por semana ISO a partir de su rango
    const weeks = {};
    tasks.filter(t => t.type === 'task').forEach(t => {
        const s = new Date(t.start + 'T00:00:00');
        // lunes de la semana
        const monday = new Date(s); monday.setDate(s.getDate() - ((s.getDay() + 6) % 7));
        const key = ymd(monday);
        if (!weeks[key]) weeks[key] = [];
        weeks[key].push(t);
    });
    const orderedKeys = Object.keys(weeks).sort();
    const container = document.getElementById('semaforoContainer');
    container.innerHTML = orderedKeys.map((k, idx) => {
        const monday = new Date(k + 'T00:00:00');
        const friday = new Date(monday); friday.setDate(monday.getDate() + 4);
        const title = `Semana ${idx + 1} (${formatDate(ymd(monday))} - ${formatDate(ymd(friday))})`;
        return `<div class="semaforo-week"><div class="week-title">📅 ${title}</div><div class="week-tasks">
            ${weeks[k].map(t => `<div class="week-task"><div class="semaforo-dot dot-gray"></div><span>${t.name} <span style="color:${getDevColor(t.dev)}">(${t.dev})</span></span></div>`).join('')}
        </div></div>`;
    }).join('');
}

// ===== Gráficas =====
function renderCharts() {
    const active = tasks.filter(t => t.type === 'task');
    const devDays = {};
    active.forEach(t => { if (t.dev) devDays[t.dev] = (devDays[t.dev] || 0) + t.days; });
    drawBarChart(document.getElementById('chartDev').getContext('2d'), 'Carga por Recurso (días)', Object.keys(devDays), Object.values(devDays), Object.keys(devDays).map(getDevColor));

    const taskDays = {}; active.forEach(t => { taskDays[t.name] = t.days; });
    const colors2 = ['#00d4ff','#ff6b6b','#ffd93d','#6bcf7f','#c56cf0','#ff9ff3','#74b9ff','#4CAF50','#FF9800','#2196F3','#9C27B0'];
    drawBarChart(document.getElementById('chartReq').getContext('2d'), 'Duración por Actividad (días)', Object.keys(taskDays), Object.values(taskDays), colors2);
}
function drawBarChart(ctx, title, labels, values, colors) {
    const canvas = ctx.canvas; const W = canvas.width, H = canvas.height;
    const padding = { top: 40, bottom: 110, left: 45, right: 20 };
    const chartW = W - padding.left - padding.right, chartH = H - padding.top - padding.bottom;
    const maxVal = Math.max(...values, 1) * 1.15;
    const barWidth = Math.min(chartW / labels.length * 0.6, 55);
    const gap = chartW / labels.length;
    ctx.fillStyle = '#16213e'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#00d4ff'; ctx.font = 'bold 13px Segoe UI'; ctx.textAlign = 'center'; ctx.fillText(title, W / 2, 25);
    ctx.strokeStyle = '#444'; ctx.beginPath(); ctx.moveTo(padding.left, padding.top); ctx.lineTo(padding.left, H - padding.bottom); ctx.lineTo(W - padding.right, H - padding.bottom); ctx.stroke();
    ctx.fillStyle = '#666'; ctx.font = '10px Segoe UI'; ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
        const y = padding.top + chartH - (chartH * i / 4);
        ctx.fillText(Math.round(maxVal * i / 4), padding.left - 5, y + 3);
        ctx.strokeStyle = '#2a2a4a'; ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(W - padding.right, y); ctx.stroke();
    }
    labels.forEach((label, i) => {
        const x = padding.left + gap * i + (gap - barWidth) / 2;
        const barH = (values[i] / maxVal) * chartH; const y = padding.top + chartH - barH;
        ctx.fillStyle = colors[i % colors.length]; ctx.fillRect(x, y, barWidth, barH);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Segoe UI'; ctx.textAlign = 'center'; ctx.fillText(values[i] + 'd', x + barWidth / 2, y - 5);
        ctx.fillStyle = '#aaa'; ctx.font = '8px Segoe UI'; ctx.save();
        ctx.translate(x + barWidth / 2, H - padding.bottom + 8); ctx.rotate(Math.PI / 4.5); ctx.textAlign = 'left';
        ctx.fillText(label.length > 28 ? label.substring(0, 28) + '…' : label, 0, 0); ctx.restore();
    });
}

// ===== Orquestación =====
function refreshAll() {
    renderGantt(); renderSummary(); renderProjectInfo(); renderProjectProgress();
    renderHitos(); renderCriticalPath(); renderSwimlane(); renderDependencies(); renderSemaforo(); renderCharts();
}
function onStartChange(value) {
    if (!value) return;
    PROJECT_START = new Date(value + 'T00:00:00');
    buildTasks(); loadProgress(); refreshAll();
}

// Init
buildTasks();
loadProgress();
refreshAll();
