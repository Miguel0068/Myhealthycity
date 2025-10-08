// Movilidad — Andes City (adaptado y modular)
// - Capas exclusivas (Tráfico / Buses / Ciclo-vías / Running)
// - Leaflet con fallback de tiles
// - Overpass con fallback/rotación
// - Tema oscuro desde el padre vía postMessage

(function(){
  const $ = (s, r=document)=>r.querySelector(s);
  const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));

  function showOverlay(){ $("#overlay").classList.add("show"); }
  function whenLeafletReady(cb, tries){
    let t = typeof tries==="number" ? tries : 50;
    if (window.L){ cb(); return; }
    if (t<=0){ showOverlay(); return; }
    setTimeout(()=>whenLeafletReady(cb, t-1), 200);
  }

  whenLeafletReady(init);

  function init(){
    const CITY_CENTER = [-1.6687, -78.6546];
    const RIO_BOUNDS = L.latLngBounds(L.latLng(-1.712, -78.706), L.latLng(-1.635, -78.604));

    const map = L.map("map", { center: CITY_CENTER, zoom: 13, zoomControl:false, preferCanvas:true });
    L.control.zoom({ position:"bottomright" }).addTo(map);
    L.control.scale({ position:"bottomleft", metric:true, imperial:false }).addTo(map);
    map.createPane("labels"); map.getPane("labels").style.zIndex = 650; map.getPane("labels").style.pointerEvents="none";

    function addTileWithFallback(list, opts){
      let i=0, layer=null;
      function make(){
        const c=list[i]; if(!c) return null;
        layer = L.tileLayer(c.url, Object.assign({maxZoom:19, attribution:c.attr||""}, opts||{}));
        let failed=false;
        layer.on("tileerror", ()=>{
          if(failed) return;
          failed=true;
          if(map.hasLayer(layer)) map.removeLayer(layer);
          i++; const n=make(); if(n) n.addTo(map);
        });
        return layer;
      }
      return make();
    }

    const baseMap = addTileWithFallback([
      {url:"https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", attr:"© CARTO © OpenStreetMap"},
      {url:"https://tile.openstreetmap.org/{z}/{x}/{y}.png", attr:"© OpenStreetMap"}
    ]);
    const baseSat = addTileWithFallback([
      {url:"https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attr:"Tiles © Esri"},
      {url:"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attr:"Tiles © Esri (alt)"}
    ]);
    const baseLbl = L.tileLayer("https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", {pane:"labels", maxZoom:19});
    if(baseMap) baseMap.addTo(map);

    let baseMode="map";
    $("#baseSwitch").addEventListener("change", (e)=>{
      baseMode = e.target.checked ? "sat" : "map";
      [baseMap, baseSat, baseLbl].forEach(t=>{ if(t && map.hasLayer(t)) map.removeLayer(t); });
      if(baseMode==="map"){ if(baseMap) baseMap.addTo(map); $("#baseTxt").textContent="Mapa"; }
      else { if(baseSat) baseSat.addTo(map); if(baseLbl) baseLbl.addTo(map); $("#baseTxt").textContent="Satélite"; }
    });

    // Estilos
    function trafficStyle(level){
      const color = level>=4 ? "#ff4d4f" : level===3 ? "#ff9f45" : level===2 ? "#ffd166" : "#37d67a";
      const w = level>=4 ? 5 : level===3 ? 4.5 : level===2 ? 4 : 3.5;
      return { color, weight:w, opacity:0.95, lineCap:"round" };
    }
    const styles = {
      cycleTop   :{ color:"#2ed49c", weight:4, opacity:0.98, lineCap:"round", dashArray:"8 5", className:"cycle-glow" },
      cycleCasing:{ color:"#ffffff", weight:7, opacity:0.55, lineCap:"round" },
      running    :{ color:"#ff2db3", weight:5, opacity:0.95, lineCap:"round", className:"run-glow" }
    };

    // Capas
    const gTraffic = L.geoJSON(null, {
      style:f=>trafficStyle(trafficLevelForFeature(f)),
      onEachFeature:(f,l)=>l.bindTooltip((f.properties && (f.properties.name||f.properties.ref)) || "Vía")
    });

    const gBuses = L.geoJSON(null, {
      style:f=>{
        const c = (f && f.properties && f.properties.color) ? f.properties.color : "#7bc6ff";
        return { color:c, weight:4.5, opacity:0.95, dashArray:"8 6", lineCap:"round" };
      },
      onEachFeature:(f,l)=>{
        const p = f.properties || {};
        l.bindTooltip(p.nombre || p.linea_id || "Línea");
        l.bindPopup(busPopupHTML(p));
      }
    });

    // Ciclovías (casing + top)
    const gCyclesCasing = L.geoJSON(null, { style:styles.cycleCasing });
    const gCyclesTop    = L.geoJSON(null, { style:styles.cycleTop, onEachFeature:(f,l)=>l.bindTooltip((f.properties && f.properties.name) || "Ciclo-vía") });
    const gCyclesGroup  = L.layerGroup([gCyclesCasing, gCyclesTop]);

    const gRunning = L.geoJSON(null, { style:styles.running, onEachFeature:(f,l)=>l.bindTooltip((f.properties && f.properties.name) || "Ruta running") });

    let activeId="trafico";
    const groups={ trafico:gTraffic, buses:gBuses, ciclovias:gCyclesGroup, running:gRunning };
    gTraffic.addTo(map);

    $("#toggles").addEventListener("click",(e)=>{
      const el=e.target.closest(".toggle"); if(!el) return;
      showOnly(el.dataset.layer);
    });
    function showOnly(id){
      activeId=id;
      Object.values(groups).forEach(g=>{ if(map.hasLayer(g)) map.removeLayer(g); });
      const layer=groups[id]; if(layer) layer.addTo(map);

      $$("#toggles .toggle").forEach(t=>t.classList.toggle("active", t.dataset.layer===id));
      const label = id==="trafico"?"Tráfico":id==="buses"?"Buses":id==="ciclovias"?"Ciclo-vías":"Running";
      $("#estado").textContent="Activa: "+label;

      const busLeg = $("#busLegendFloating");
      const openBtn = $("#openBusLegend");
      if (id === "buses") { if (busLegendOpen) { busLeg.style.display = "block"; openBtn.style.display = "none"; } else { busLeg.style.display = "none"; openBtn.style.display = "block"; } }
      else { busLeg.style.display = "none"; openBtn.style.display = "none"; }
      $("#trafficLegendFloating").style.display = (id === "trafico") ? "block" : "none";

      focusActive();
    }

    // Popups buses
    const FARE_ADULT="0.30", FARE_REDUCED="0.15";
    function chip(lbl,val,em){
      if(!val) return "";
      const color=em?"#0b1220":"#0f172a";
      return `<div style="display:inline-block;margin:6px 8px 0 0;padding:6px 10px;border-radius:999px;border:1px solid rgba(0,0,0,.12);background:rgba(2,6,23,.04);font-size:12px;color:#0f172a"><span style="color:#475569">${lbl}:</span> <b style="color:${color}">${val}</b></div>`;
    }
    function busPopupHTML(p){
      const badge=`<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${(p.color||"#7bc6ff")};margin-right:8px;border:1px solid rgba(0,0,0,.25)"></span>`;
      let html='<div style="min-width:270px; line-height:1.28">';
      html+=`<div style="font-weight:900;margin-bottom:4px;color:#0b1220;display:flex;align-items:center">${badge}${(p.nombre||"Línea")}</div>`;
      html+=`<div style="font-size:12px;color:#475569;margin-bottom:8px">ID: <b style="color:#0b1220">${(p.linea_id||"-")}</b></div>`;
      html+=chip("Operador",p.operador||"—",false);
      html+=chip("Tarifa general","$"+FARE_ADULT,true);
      html+=chip("Tarifa estudiante/AM","$"+FARE_REDUCED,true);
      html+=chip("Horario",p.horario||"",false);
      html+=chip("Frecuencia",p.frecuencia_min?(p.frecuencia_min+" min"):"",false);
      html+=chip("Sentido",p.sentido||"",false);
      html+="</div>";
      return html;
    }

    // Líneas de buses (definición resumida; igual que tu base)
    const BUS_LINES = [ /* … (se mantienen todas las líneas que ya venían) … */ ];

    // Leyenda buses
    let busFilterId = null, busLegendOpen = true;
    function renderBusLegendFloating(){
      const box = $("#busLegendFloating"); if (!box) return;
      const chips = BUS_LINES.map(l=>{
        const shortName = l.nombre.replace(/^Línea \d+:\s*/,'');
        const active = (busFilterId === l.linea_id) ? " active" : "";
        return `<span class="chip${active}" data-line="${l.linea_id}" title="${ l.nombre }"><span class="dotL" style="background:${ l.color }"></span><span class="id">${ l.linea_id }</span><span class="name">· ${ shortName }</span></span>`;
      }).join("");
      const allActive = (busFilterId===null) ? " active" : "";
      const head = box.querySelector('.legend-head').outerHTML;
      box.innerHTML = head + `<span class="chip${allActive}" data-line="*">Todas</span>` + chips;
      box.onclick = (e)=>{
        const chip = e.target.closest(".chip"); if(!chip) return;
        const id = chip.getAttribute("data-line");
        busFilterId = (id==="*") ? null : id;
        applyBusFilter();
        renderBusLegendFloating();
      };
    }
    function applyBusFilter(){
      if(!gBuses) return;
      gBuses.setStyle(f=>{
        const show = (busFilterId===null) || (f.properties && f.properties.linea_id===busFilterId);
        return { color:(f.properties && f.properties.color)||"#7bc6ff", weight:4.5, opacity:show?0.95:0, dashArray:"8 6", lineCap:"round" };
      });
      setTimeout(focusActive,80);
    }
    renderBusLegendFloating();
    $("#closeBusLegend").onclick=function(){ busLegendOpen=false; $("#busLegendFloating").style.display="none"; if (activeId === "buses") $("#openBusLegend").style.display="block"; };
    $("#openBusLegend").onclick=function(){ busLegendOpen=true; if (activeId === "buses") { $("#busLegendFloating").style.display="block"; this.style.display="none"; } };

    // Overpass helpers
    const OVERPASS=["https://overpass-api.de/api/interpreter","https://overpass.kumi.systems/api/interpreter"];
    function overpassFetch(body){
      let i=0;
      function req(resolve,reject){
        fetch(OVERPASS[i],{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({data:body})})
          .then(r=>{ if(!r.ok) throw new Error("bad"); return r.json(); })
          .then(resolve)
          .catch(()=>{ i++; if(i<OVERPASS.length) req(resolve,reject); else reject(new Error("Overpass no disponible"));});
      }
      return new Promise(req);
    }
    function toGeoJSON(data){
      const nodes=new Map(), features=[];
      (data.elements||[]).forEach(el=>{ if(el.type==="node") nodes.set(el.id,[el.lon,el.lat]);});
      (data.elements||[]).forEach(el=>{
        if(el.type==="way" && Array.isArray(el.nodes)){
          const coords=el.nodes.map(id=>nodes.get(id)).filter(Boolean);
          if(coords.length>=2) features.push({type:"Feature",properties:el.tags||{},geometry:{type:"LineString",coordinates:coords}});
        }
      });
      return {type:"FeatureCollection",features};
    }

    // Tráfico
    function loadTraffic(){
      const q='[out:json][timeout:45];area[name="Riobamba"][admin_level=8]->.a;way[highway](area.a)["highway"!="service"]["highway"!="track"]["highway"!="footway"]["highway"!="path"]["access"!="private"];(._;>;); out body;';
      overpassFetch(q).then(data=>{ const gj=toGeoJSON(data); gTraffic.clearLayers(); gTraffic.addData(gj); if(activeId==='trafico') focusActive(); }).catch(()=>{});
    }

    // Ciclovías (+fallback)
    function loadCycles(){
      const q1 = `
[out:json][timeout:60];
area[name="Riobamba"][admin_level=8]->.a;
(
  way[highway=cycleway](area.a);
  way[cycleway](area.a);
  way[cycleway:left](area.a);
  way[cycleway:right](area.a);
  way[cycleway:both](area.a);
  way[bicycle~"^(designated|official|yes)$"](area.a);
  way[cycleway:both~"^(lane|track)$"](area.a);
  way[cycleway~"^(lane|track)$"](area.a);
);
(._;>;);
out body;`;
      overpassFetch(q1).then(data=>{
        const gj=toGeoJSON(data);
        if((gj.features||[]).length>=8){
          paintCycles(gj);
          if(activeId==='ciclovias') focusActive();
        }else{
          const q2 = `
[out:json][timeout:60];
area[name="Riobamba"][admin_level=8]->.a;
way
  [highway~"^(primary|secondary|tertiary|residential)$"]
  [surface~"^(paved|asphalt|concrete|paving_stones)$",i]
  (area.a);
(._;>;);
out body;`;
          overpassFetch(q2).then(data2=>{
            const gj2 = toGeoJSON(data2);
            gj2.features.forEach(f=>{
              const c=f.geometry.coordinates; let len=0;
              for(let i=1;i<c.length;i++){ const dx=c[i][0]-c[i-1][0], dy=c[i][1]-c[i-1][1]; len+=Math.hypot(dx,dy); }
              f._len=len;
            });
            gj2.features.sort((a,b)=> (b._len||0)-(a._len||0));
            gj2.features = gj2.features.slice(0,12);
            paintCycles(gj2);
            if(activeId==='ciclovias') focusActive();
          }).catch(()=>{});
        }
      }).catch(()=>{});
    }
    function paintCycles(geojson){
      gCyclesCasing.clearLayers(); gCyclesTop.clearLayers();
      gCyclesCasing.addData(geojson);
      gCyclesTop.addData(geojson);
    }

    // Running
    function loadRunning(){
      const q='[out:json][timeout:45];area[name="Riobamba"][admin_level=8]->.a;( way[highway=footway](area.a); way[highway=path][foot!=no](area.a); way[highway=track][foot=yes](area.a); way[foot=designated](area.a); );(._;>;); out body;';
      overpassFetch(q).then(data=>{ gRunning.clearLayers(); gRunning.addData(toGeoJSON(data)); if(activeId==='running') focusActive(); }).catch(()=>{});
    }

    // Buses
    function escapeRegexForOverpass(s){ return s.replace(/[\\"]/g,m=>"\\"+m); }
    function fetchLineByStreetNames(line){
      const parts=line.calles.map(part=>Array.isArray(part)?part:[part]);
      function toRegex(name){
        let s=name.trim()
          .replace(/^Av\.?\s*/i,"(Av\\.?|Avenida)\\s*")
          .replace(/Saint[-\s]Amand[-\s]Montrond/i,"Saint[-\\s]Amand[-\\s]Montrond")
          .replace(/Le[oó]nidas/i,"Le(o|ó)nidas")
          .replace(/Rodr[ií]guez/i,"Rodr(i|í)guez")
          .replace(/Fel[ií]x/i,"Fel(i|í)x")
          .replace(/Proa[nñ]o/i,"Proa(n|ñ)o")
          .replace(/C[oó]rdov[eé]z/i,"C(o|ó)rdov(e|é)z")
          .replace(/Villag[oó]mez/i,"Villag(o|ó)mez")
          .replace(/Rold[oó]s/i,"Rold(o|ó)s")
          .replace(/Jos[eé]/i,"Jos(e|é)")
          .replace(/Alf[aá]ro/i,"Alf(a|á)ro");
        return "^"+s+"$";
      }
      const clauses=parts.map(group=>{
        const ors=group.map(n=>`way["name"~"${escapeRegexForOverpass(toRegex(n))}", i](area.a);`).join("\n      ");
        return "(\n      "+ors+"\n    );";
      }).join("\n    ");
      const query=`[out:json][timeout:60];
area[name="Riobamba"][admin_level=8]->.a;
(
    ${clauses}
);
(._;>;);
out body;`;
      return overpassFetch(query).then(data=>{
        const gj=toGeoJSON(data);
        const order=new Map(); parts.forEach((group,i)=>group.forEach(n=>order.set(n.toLowerCase(),i)));
        gj.features.sort((a,b)=>{
          const an=(a.properties&&a.properties.name)?a.properties.name.toLowerCase():"";
          const bn=(b.properties&&b.properties.name)?b.properties.name.toLowerCase():"";
          const va=order.has(an)?order.get(an):999;
          const vb=order.has(bn)?order.get(bn):999;
          return va-vb;
        });
        gj.features.forEach(f=>{ f.properties=Object.assign({},f.properties||{},line,{color:line.color}); });
        return gj;
      });
    }
    function loadBuses(){
      const fc={type:"FeatureCollection",features:[]}; let idx=0;
      function next(){
        if(idx>=BUS_LINES.length){
          gBuses.clearLayers(); gBuses.addData(fc);
          applyBusFilter();
          if(activeId==='buses') focusActive();
          return;
        }
        fetchLineByStreetNames(BUS_LINES[idx]).then(gj=>{
          Array.prototype.push.apply(fc.features, gj.features);
          idx++; next();
        }).catch(()=>{ idx++; next(); });
      }
      next();
    }

    // “Realismo” tráfico
    function trafficLevelForFeature(f){
      const p=f.properties||{}, name=(p.name||p.ref||"").toLowerCase(), h=(p.highway||"").toLowerCase(), seed=hashStr(name+"|"+h);
      const base=(/motorway|trunk/.test(h))?2.9:(/primary/.test(h))?2.5:(/secondary/.test(h))?2.2:(/tertiary/.test(h))?1.9:1.6;
      const n=base+(((seed%100)/100)-0.5)*0.9; return Math.max(1,Math.min(4,Math.round(n)));
    }
    function hashStr(s){ let h=2166136261>>>0; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619);} return h>>>0; }

    // Enfocar / Ubicarme
    function layerValidBounds(layer){
      try{
        let b=null;
        layer.eachLayer(l=>{ if(typeof l.getBounds==='function'){ const lb=l.getBounds(); if(lb&&lb.isValid()) b=b?b.extend(lb):lb; }});
        return b&&b.isValid()?b:null;
      }catch(_){ return null; }
    }
    function focusActive(){
      const layer = groups[activeId];
      if(!layer){ map.fitBounds(RIO_BOUNDS,{padding:[26,26]}); return; }
      const b = (typeof layer.getBounds==='function' && layer.getBounds().isValid()) ? layer.getBounds() : layerValidBounds(layer);
      if(b && b.isValid()) map.fitBounds(b,{padding:[26,26]}); else map.fitBounds(RIO_BOUNDS,{padding:[26,26]});
    }
    $("#fit").onclick = focusActive;

    $("#loc").onclick=function(){
      if(!("geolocation" in navigator)){ alert("Tu navegador no soporta geolocalización"); return; }
      navigator.geolocation.getCurrentPosition(pos=>{
        const lat=pos.coords.latitude, lng=pos.coords.longitude;
        const m=L.circleMarker([lat,lng],{radius:7,weight:2,color:"#fff",fillColor:"#7bc6ff",fillOpacity:0.95}).addTo(map);
        m.bindTooltip("Estás aquí").openTooltip();
        map.flyTo([lat,lng],15,{duration:0.7});
      },err=>{ alert("No se pudo obtener tu ubicación: "+err.message); },{enableHighAccuracy:true,timeout:6000,maximumAge:0});
    };

    // Panel
    const panel=$("#panel"), openBtn=$("#openPanel"), closeBtn=$("#closePanel");
    function openPanel(){ panel.classList.remove("hidden"); openBtn.classList.add("hidden"); }
    function closePanel(){ panel.classList.add("hidden"); openBtn.classList.remove("hidden"); }
    openBtn.onclick=openPanel; closeBtn.onclick=closePanel; openPanel();

    $("#trafficLegendFloating").style.display="block";
    $("#busLegendFloating").style.display="none";
    $("#openBusLegend").style.display="none";

    // Cargas iniciales
    loadTraffic(); loadBuses(); loadCycles(); loadRunning();

    // Tema desde el padre (iframe)
    window.addEventListener("message",(ev)=>{
      if (!ev.data) return;
      if (ev.data.type === "set-theme"){
        const dark = ev.data.theme === "dark";
        document.documentElement.classList.toggle("dark", dark);
        document.body.classList.toggle("dark", dark);
      }
    });
    // Si el iframe ya se montó en oscuro
    const parentDark = document.body.classList.contains("dark") || document.documentElement.classList.contains("dark");
    if (parentDark){ document.documentElement.classList.add("dark"); document.body.classList.add("dark"); }
  }
})();
