// ANDES CITY — módulo Incidencias (aislado por iframe)

// ====== Tema (recibe tema desde la SPA y guarda preferencia) ======
(function setupThemeListener(){
  try {
    const saved = localStorage.getItem("andes-theme");
    if (saved) document.documentElement.setAttribute("data-theme", saved);
  } catch {}
  window.addEventListener("message", (e) => {
    if (e?.data?.type === "set-theme") {
      document.documentElement.setAttribute("data-theme", e.data.theme);
      try { localStorage.setItem("andes-theme", e.data.theme); } catch {}
    }
  });
})();

// ====== Helpers ======
const $ = (sel) => document.querySelector(sel);
const reportBtn   = $('#reportBtn');
const clearBtn    = $('#clearBtn');
const viewDataBtn = $('#viewDataBtn');
const totalCount  = $('#totalCount');
const sectorCount = $('#sectorCount');
const sectorList  = $('#sectorList');

// ====== Mapa Leaflet ======
const map = L.map('map', { zoomControl: true }).setView([-1.6635, -78.6547], 13);

const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors',
  maxZoom: 19
}).addTo(map);

const hot = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors, HOT',
  maxZoom: 19
});

// Conmutador de capas (opcional)
L.control.layers({ "OSM": osm, "HOT": hot }, null, { position: 'topright', collapsed: false }).addTo(map);

// Ajuste tamaño al terminar de pintar
setTimeout(()=> map.invalidateSize(), 120);
window.addEventListener('resize', () => map.invalidateSize());

// ====== Parroquias de Riobamba/Chimborazo (aprox.) ======
const parishes = {
  'Riobamba':     { lat: -1.6635, lng: -78.6547, radius: 0.030 },
  'Lizarzaburu':  { lat: -1.6730, lng: -78.6470, radius: 0.008 },
  'Velasco':      { lat: -1.6580, lng: -78.6650, radius: 0.010 },
  'Veloz':        { lat: -1.6690, lng: -78.6380, radius: 0.008 },
  'Yaruquíes':    { lat: -1.6280, lng: -78.6480, radius: 0.012 },
  'Cacha':        { lat: -1.7000, lng: -78.7000, radius: 0.015 },
  'Cubijíes':     { lat: -1.7200, lng: -78.6800, radius: 0.010 },
  'Flores':       { lat: -1.6400, lng: -78.6300, radius: 0.010 },
  'Licán':        { lat: -1.6380, lng: -78.6350, radius: 0.012 },
  'Pungalá':      { lat: -1.6900, lng: -78.6200, radius: 0.010 },
  'Punín':        { lat: -1.6300, lng: -78.6800, radius: 0.010 },
  'Químiag':      { lat: -1.5800, lng: -78.7000, radius: 0.015 },
  'San Juan':     { lat: -1.6500, lng: -78.6400, radius: 0.008 },
  'San Luis':     { lat: -1.6920, lng: -78.6450, radius: 0.010 }
};

// ====== Estado ======
let incidents = [];
let reportMode = false;
let incidentCounter = 1;
const parishStats = Object.fromEntries(Object.keys(parishes).map(k => [k, 0]));
const typeStats = { basura: 0, cierre: 0, inseguridad: 0, accidente: 0 };

// ====== Tipos de reporte ======
const reportConfig = {
  basura:      { name: 'Basura',              icon: '🗑️', border: '#666' },
  cierre:      { name: 'Cierre de Vías',      icon: '🚧', border: '#f59f00' },
  inseguridad: { name: 'Inseguridad',         icon: '⚠️', border: '#d9480f' },
  accidente:   { name: 'Accidente de Tránsito', icon: '🚨', border: '#c92a2a' }
};

// ====== Icono dinámico ======
function makeIcon(type='basura'){
  const conf = reportConfig[type] || reportConfig.basura;
  return L.divIcon({
    className: 'report-icon',
    html: `<div style="
      background: rgba(255,255,255,.95);
      border: 2px solid ${conf.border};
      border-radius: 50%;
      width: 40px; height: 40px;
      display:flex; align-items:center; justify-content:center;
      font-size:18px; box-shadow:0 2px 8px rgba(0,0,0,.3);
      cursor:pointer">${conf.icon}</div>`,
    iconSize: [40, 40], iconAnchor: [20, 40]
  });
}

// ====== Botón Reportar ======
if (reportBtn){
  reportBtn.addEventListener('click', () => {
    reportMode = !reportMode;
    reportBtn.classList.toggle('active', reportMode);
    reportBtn.textContent = reportMode ? '✓ Modo Reporte Activo' : '📍 Reportar Basura';
    map.getContainer().style.cursor = reportMode ? 'crosshair' : '';
  });
}

// ====== Obtener parroquia por coordenadas ======
function getParish(latlng){
  for(const k in parishes){
    const p = parishes[k];
    const d = Math.hypot(latlng.lat - p.lat, latlng.lng - p.lng);
    if(d <= p.radius) return k;
  }
  return 'Área Rural';
}

// ====== Click en el mapa para crear reporte rápido (tipo por defecto: basura) ======
map.on('click', (e) => {
  if (!reportMode) return;
  addIncident(e.latlng, 'basura', 'Reporte ciudadano de basura.', null);
  // Desactiva modo después de un reporte
  reportMode = false;
  reportBtn?.classList.remove('active');
  reportBtn && (reportBtn.textContent = '📍 Reportar Basura');
  map.getContainer().style.cursor = '';
});

// ====== Agregar incidente ======
function addIncident(latlng, type, description, photoDataUrl){
  const now = new Date();
  const parish = getParish(latlng);
  const icon = makeIcon(type);

  const marker = L.marker(latlng, { icon, draggable: false }).addTo(map);

  // Botón eliminar enlaza a window.deleteIncident para funcionar dentro del popup
  let html = `
    <div style="min-width:220px; padding:6px 2px;">
      <h3 style="margin:0 0 8px; color:#1a73e8; font-size:1.05rem;">
        ${reportConfig[type]?.icon || '📍'} ${reportConfig[type]?.name || 'Reporte'}
      </h3>
      <p style="margin:6px 0; font-size:.9rem;"><strong>Parroquia:</strong> ${parish}</p>
      <p style="margin:6px 0; font-size:.9rem;"><strong>Fecha:</strong> ${now.toLocaleDateString('es-ES')}</p>
      <p style="margin:6px 0; font-size:.9rem;"><strong>Hora:</strong> ${now.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}</p>
      <p style="margin:8px 0; font-size:.9rem;"><strong>Descripción:</strong> ${description || '—'}</p>
  `;
  if (photoDataUrl){
    html += `<div style="margin:8px 0;"><img src="${photoDataUrl}" alt="Foto" style="max-width:100%;max-height:150px;border-radius:6px"/></div>`;
  }
  html += `
      <button class="delete-btn" onclick="deleteIncident(${incidentCounter})">Eliminar Reporte</button>
    </div>
  `;
  marker.bindPopup(html);

  const incident = {
    id: incidentCounter++,
    marker, latlng, parish, type,
    date: now.toLocaleDateString('es-ES'),
    time: now.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}),
    description, photo: photoDataUrl
  };
  incidents.push(incident);

  // Stats
  if (typeStats[type] != null) typeStats[type] += 1;
  if (parishStats[parish] != null) parishStats[parish] += 1;

  updateStats();
  updateParishList();

  marker.openPopup();
}

// ====== Eliminar incidente (expuesto para popup) ======
window.deleteIncident = function(id){
  const idx = incidents.findIndex(i => i.id === id);
  if (idx === -1) return;
  const inc = incidents[idx];

  map.removeLayer(inc.marker);
  if (typeStats[inc.type] != null) typeStats[inc.type] = Math.max(0, typeStats[inc.type]-1);
  if (parishStats[inc.parish] != null) parishStats[inc.parish] = Math.max(0, parishStats[inc.parish]-1);

  incidents.splice(idx, 1);
  updateStats();
  updateParishList();
};

// ====== Limpiar todos ======
clearBtn?.addEventListener('click', () => {
  if (incidents.length === 0) return;
  if (!confirm('¿Eliminar todos los reportes?')) return;
  incidents.forEach(i => map.removeLayer(i.marker));
  incidents = [];
  Object.keys(parishStats).forEach(k => parishStats[k] = 0);
  Object.keys(typeStats).forEach(k => typeStats[k] = 0);
  updateStats();
  updateParishList();
});

// ====== Estadísticas ======
function updateStats(){
  totalCount && (totalCount.textContent = String(incidents.length));
  const affected = Object.values(parishStats).filter(v => v > 0).length;
  sectorCount && (sectorCount.textContent = String(affected));
}

// ====== Lista de parroquias ======
function updateParishList(){
  if (!sectorList) return;

  const sorted = Object.entries(parishStats)
    .filter(([_, c]) => c > 0)
    .sort((a,b) => b[1]-a[1]);

  if (sorted.length === 0){
    sectorList.innerHTML = '<div class="empty-state">No hay reportes aún</div>';
    return;
  }

  sectorList.innerHTML = sorted.map(([name, count]) => `
    <div class="sector-item" data-sector="${name}">
      <span class="sector-name">${name}</span>
      <span class="sector-count">${count}</span>
    </div>
  `).join('');

  sectorList.querySelectorAll('.sector-item').forEach(it => {
    it.addEventListener('click', () => focusParish(it.dataset.sector));
  });
}

// ====== Foco en parroquia ======
window.focusParish = function(name){
  const p = parishes[name];
  if (!p) return;
  map.setView([p.lat, p.lng], 14);
  // Abre popups de incidentes en la parroquia
  incidents.filter(i => i.parish === name).forEach(i => i.marker.openPopup());
};

// ====== Ver análisis (simple por alert) ======
viewDataBtn?.addEventListener('click', () => {
  if (incidents.length === 0) {
    alert('No hay datos para analizar. Agrega algunos reportes primero.');
    return;
  }
  const total = incidents.length;
  const sortedParishes = Object.entries(parishStats).filter(([_,c]) => c>0).sort((a,b)=>b[1]-a[1]);
  const most = sortedParishes[0];

  const linesType = Object.entries(typeStats)
    .filter(([_, c]) => c>0)
    .map(([t,c]) => `• ${reportConfig[t].name}: ${c} (${((c/total)*100).toFixed(1)}%)`)
    .join('\n');

  const linesParish = sortedParishes
    .map(([p,c]) => `• ${p}: ${c} reportes`)
    .join('\n');

  const txt =
`📊 ANÁLISIS DE REPORTES URBANOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total de reportes: ${total}
Parroquias afectadas: ${sortedParishes.length}

Por tipo:
${linesType || '• —'}

Parroquia más afectada:
• ${most[0]}: ${most[1]} incidencias

Listado:
${linesParish || '• —'}

Recomendaciones:
${typeStats.inseguridad >= 3 ? '• Reforzar seguridad en zonas reportadas\n' : ''}${typeStats.basura >= 4 ? '• Incrementar rutas de recolección donde hay más basura\n' : ''}${typeStats.accidente >= 2 ? '• Revisar señalización en zonas de accidentes frecuentes\n' : ''}• Continuar el monitoreo y fomentar reportes ciudadanos`;
  alert(txt);
});

// ====== Init ======
updateStats();
updateParishList();
