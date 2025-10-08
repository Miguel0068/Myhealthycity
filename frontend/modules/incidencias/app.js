/* Incidencias — Andes City
   - Mapa Leaflet con click para elegir punto (marker draggable)
   - Form flotante con tipo/desc/foto obligatoria
   - Guarda en localStorage y pinta en el mapa
   - Lista con Ver/Eliminar + Borrar todo
   - Tema oscuro/claro via postMessage (opcional)
*/
const $ = (s, r=document)=>r.querySelector(s);
const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));

const MAP_CENTER = [-1.664, -78.654]; // Riobamba aprox
const STORAGE_KEY = "andes_incidents";

let map;
let selectMarker = null;        // marcador de selección (para el form)
let incidents = [];             // estado en memoria
let markersById = new Map();    // id -> L.Marker

/* ---------- Util ---------- */
function loadStorage(){
  try{ incidents = JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]"); }
  catch{ incidents = []; }
}
function saveStorage(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(incidents));
}
function fmtTime(ts){
  const d = new Date(ts);
  return d.toLocaleString();
}
function iconFor(type){
  const cls = ["basura","cierre","inseguridad","otro"].includes(type) ? type : "otro";
  return L.divIcon({
    className: "incident leaflet-marker-icon",
    html: `<span class="pin ${cls}"></span>`,
    iconSize: [18,18],
    iconAnchor:[9,18],
    popupAnchor:[0,-14],
  });
}
function setTheme(dark){
  document.documentElement.classList.toggle("dark", !!dark);
  document.body.classList.toggle("dark", !!dark);
}

/* ---------- Mapa ---------- */
function initMap(){
  map = L.map('map').setView(MAP_CENTER, 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, attribution: "© OpenStreetMap"
  }).addTo(map);

  map.on("click", (e)=>{
    placeSelection(e.latlng);
    openForm(e.latlng);
  });

  // Renderizar existentes
  loadStorage();
  incidents.forEach(addIncidentMarker);
  renderList();
}

function placeSelection(latlng){
  if (!selectMarker){
    selectMarker = L.marker(latlng, {
      draggable: true,
      icon: L.divIcon({
        className: "incident leaflet-marker-icon",
        html: `<span class="pin otro"></span>`,
        iconSize:[18,18], iconAnchor:[9,18]
      })
    }).addTo(map);
    selectMarker.on("dragend", ()=>{
      const ll = selectMarker.getLatLng();
      fillLocation(ll);
      validateForm();
    });
  } else {
    selectMarker.setLatLng(latlng);
  }
  map.panTo(latlng);
  fillLocation(latlng);
}

/* ---------- Formulario ---------- */
const formPanel   = $("#form-panel");
const form        = $("#report-form");
const inpLoc      = $("#location");
const inpType     = $("#type");
const inpDesc     = $("#desc");
const inpPhoto    = $("#photo");
const btnRemovePh = $("#remove-photo");
const preview     = $("#preview");
const btnSubmit   = $("#submit");
const btnCancel   = $("#cancel");
const btnClose    = $("#close-form");

function openForm(latlng){
  form.reset();
  preview.innerHTML = "";
  preview.classList.add("hidden");
  btnRemovePh.disabled = true;
  fillLocation(latlng);
  validateForm();
  formPanel.classList.remove("hidden");
}

function closeForm(){
  formPanel.classList.add("hidden");
  // mantenemos selectMarker para poder reabrir sin perder posición
}

function fillLocation(latlng){
  inpLoc.value = `${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`;
}

function validateForm(){
  const hasMarker = !!selectMarker;
  const typeOK = !!inpType.value;
  const descOK = inpDesc.value.trim().length > 0;
  const photoOK = inpPhoto.files && inpPhoto.files[0];
  btnSubmit.disabled = !(hasMarker && typeOK && descOK && photoOK);
}

/* Foto: preview y quitar */
inpPhoto.addEventListener("change", ()=>{
  if (inpPhoto.files && inpPhoto.files[0]){
    const file = inpPhoto.files[0];
    const reader = new FileReader();
    reader.onload = ()=>{
      preview.innerHTML = `<img src="${reader.result}" alt="Vista previa de la foto" />`;
      preview.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
    btnRemovePh.disabled = false;
  } else {
    preview.innerHTML = "";
    preview.classList.add("hidden");
    btnRemovePh.disabled = true;
  }
  validateForm();
});
btnRemovePh.addEventListener("click", ()=>{
  inpPhoto.value = "";
  preview.innerHTML = "";
  preview.classList.add("hidden");
  btnRemovePh.disabled = true;
  validateForm();
});

/* Envío */
form.addEventListener("submit", (e)=>{
  e.preventDefault();
  if (btnSubmit.disabled) return;

  const ll = selectMarker.getLatLng();
  const type = inpType.value || "otro";
  const desc = inpDesc.value.trim();

  const file = inpPhoto.files[0];
  const reader = new FileReader();
  reader.onload = ()=>{
    const id = Date.now();
    const incident = {
      id, type, desc,
      lat: ll.lat, lng: ll.lng,
      photo: reader.result,   // DataURL
      ts: id
    };
    incidents.unshift(incident);
    saveStorage();

    addIncidentMarker(incident, true);
    renderList();
    closeForm();

    // limpiar selección si quieres:
    // map.removeLayer(selectMarker); selectMarker = null;
  };
  reader.readAsDataURL(file);
});

btnCancel.addEventListener("click", closeForm);
btnClose.addEventListener("click", closeForm);

/* ---------- Marcadores y lista ---------- */
function addIncidentMarker(inc, openPopup=false){
  // crear marcador
  const m = L.marker([inc.lat, inc.lng], { icon: iconFor(inc.type) })
    .addTo(map)
    .bindPopup(popupHtml(inc));
  if (openPopup) m.openPopup();

  // guardar referencia
  markersById.set(inc.id, m);
}

function popupHtml(inc){
  const label = labelType(inc.type);
  return `
    <div style="min-width:180px">
      <div class="small-muted">${fmtTime(inc.ts)}</div>
      <div style="margin:4px 0"><span class="badge ${inc.type}">${label}</span></div>
      <div style="font-size:14px">${escapeHTML(inc.desc)}</div>
      ${inc.photo ? `<div style="margin-top:6px"><img src="${inc.photo}" alt="foto" style="max-width:100%;border-radius:8px;border:1px solid var(--line)"></div>` : ""}
      <div class="small-muted" style="margin-top:6px">${inc.lat.toFixed(5)}, ${inc.lng.toFixed(5)}</div>
    </div>
  `;
}
function labelType(t){
  if (t==="basura") return "Basura";
  if (t==="cierre") return "Cierre de vía";
  if (t==="inseguridad") return "Inseguridad";
  return "Otro";
}
function escapeHTML(s){
  return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}

function renderList(){
  const wrap = $("#reports");
  if (!wrap) return;

  if (!incidents.length){
    wrap.classList.add("empty");
    wrap.innerHTML = `<p class="small-muted">Aún no hay reportes.</p>`;
    return;
  }
  wrap.classList.remove("empty");
  wrap.innerHTML = incidents.map(inc => `
    <div class="report" data-id="${inc.id}">
      <div>
        <div><span class="badge ${inc.type}">${labelType(inc.type)}</span></div>
        <div class="meta">${fmtTime(inc.ts)} — ${inc.lat.toFixed(5)}, ${inc.lng.toFixed(5)}</div>
        <div>${escapeHTML(inc.desc)}</div>
      </div>
      <div class="actions">
        <button class="btn btn-outline js-view" title="Ver en mapa">Ver</button>
        <button class="btn btn-outline js-del" title="Eliminar">🗑️</button>
      </div>
    </div>
  `).join("");

  // eventos
  $$(".report .js-view", wrap).forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = Number(btn.closest(".report").dataset.id);
      const m = markersById.get(id);
      if (m){ map.setView(m.getLatLng(), 16); m.openPopup(); }
    });
  });
  $$(".report .js-del", wrap).forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = Number(btn.closest(".report").dataset.id);
      deleteIncident(id);
    });
  });
}

function deleteIncident(id){
  const idx = incidents.findIndex(x=>x.id===id);
  if (idx>=0){
    incidents.splice(idx,1);
    saveStorage();
    const m = markersById.get(id);
    if (m){ map.removeLayer(m); markersById.delete(id); }
    renderList();
  }
}

/* ---------- Borrar todo ---------- */
$("#clear-all").addEventListener("click", ()=>{
  if (!incidents.length) return;
  if (!confirm("¿Eliminar todos los reportes?")) return;
  incidents = [];
  saveStorage();
  markersById.forEach(m=>map.removeLayer(m));
  markersById.clear();
  renderList();
});

/* ---------- Tema desde el padre (opcional) ---------- */
window.addEventListener("message", (ev)=>{
  if (!ev.data) return;
  if (ev.data.type === "set-theme"){
    setTheme(ev.data.theme === "dark");
  }
});

/* ---------- Init ---------- */
document.addEventListener("DOMContentLoaded", ()=>{
  initMap();
  // En caso el iframe cargue en modo oscuro:
  const parentIsDark = document.body.classList.contains("dark-mode") || document.documentElement.classList.contains("dark");
  if (parentIsDark) setTheme(true);
});
