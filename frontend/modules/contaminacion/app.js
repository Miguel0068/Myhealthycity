/*
 * ANDES CITY — Módulo Clima & Calidad (frontend-only, aislado por iframe)
 * Versión depurada y refactorizada.
 *
 * Requisitos esperados desde el HTML contenedor:
 *  - Leaflet disponible en global como `L`
 *  - Chart.js opcional en global como `Chart` (los gráficos se omiten si no está)
 *  - Contenedores con los IDs usados abajo (map, temp-now, etc.)
 */
(function(){
  'use strict';

  // ——— Config y helpers ———
  const SOIL_LOOKUP = [
    { minLat: -1.8, maxLat: -1.3, minLon: -79.0, maxLon: -78.5, type: 'Andosol', pH: '5.5–6.5', organicCarbon: '3–6%' },
    { minLat: -2.3, maxLat: -1.8, minLon: -79.0, maxLon: -78.4, type: 'Cambisol', pH: '6.0–7.0', organicCarbon: '1.5–3%' },
    { minLat: -2.5, maxLat: -2.0, minLon: -79.5, maxLon: -78.9, type: 'Regosol', pH: '5.0–6.0', organicCarbon: '0.8–2%' },
    { minLat: -90, maxLat: 90, minLon: -180, maxLon: 180, type: 'Franco-arcilloso', pH: '6.0–7.5', organicCarbon: '1–2%' }
  ];
  function getSoilProperties(lat, lon) {
    for (const z of SOIL_LOOKUP) {
      if (lat >= z.minLat && lat <= z.maxLat && lon >= z.minLon && lon <= z.maxLon) {
        return { type: z.type, pH: z.pH, organicCarbon: z.organicCarbon };
      }
    }
    const f = SOIL_LOOKUP[SOIL_LOOKUP.length - 1];
    return { type: f.type, pH: f.pH, organicCarbon: f.organicCarbon };
  }
  function estimateNDVI(soilMoisture, precip24h, temp) {
    if (soilMoisture == null || precip24h == null || temp == null) return null;
    let n = 0.2;
    if (soilMoisture > 0.3) n += 0.2;
    if (soilMoisture > 0.5) n += 0.15;
    if (precip24h > 5) n += 0.1;
    if (temp >= 10 && temp <= 25) n += 0.15;
    return Number(Math.min(0.9, Math.max(0.1, n)).toFixed(2));
  }

  // Área y malla
  const BBOX = { minLat: -2.5, minLon: -79.5, maxLat: -0.8, maxLon: -77.8 };
  const CENTER = [-1.664, -78.654];
  const GRID_RES_DEG = 0.04, SAMPLE_MAX = 48, IDW_POWER = 2, INFLUENCE = 0.4;

  // Endpoints
  const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast';
  const OPEN_METEO_AQ = 'https://air-quality-api.open-meteo.com/v1/air-quality';
  const OPENTOPO = 'https://api.opentopodata.org/v1/srtm30m';

  // Estado
  let activeTab = 'overview';
  let tempOverlay = null, aqiOverlay = null, soilTempOverlay = null;
  let lastTempStats = null, lastAQStats = null;
  let lastAdjustedSamples = null, lastAQSamples = null, lastSoilSamples = null;
  let hourlyChart = null, aqiChart = null;

  // DOM
  const loadingOverlay = document.getElementById('loading-overlay');

  // ——— Mapa ———
  const map = L.map('map', { zoomControl: true, preferCanvas: true, attributionControl: false }).setView(CENTER, 9);
  const bounds = [[BBOX.minLat, BBOX.minLon], [BBOX.maxLat, BBOX.maxLon]];
  map.setMaxBounds(bounds);
  map.on('drag', () => { if (!map.getBounds().intersects(bounds)) { map.panInsideBounds(bounds, { animate: true }); } });

  const streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 18 }).addTo(map);
  const topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { attribution: '© OpenTopoMap', maxZoom: 17 });
  L.control.layers({ 'Calles': streets, 'Topográfico': topo }, {}, { position: 'topleft' }).addTo(map);

  setTimeout(() => map.invalidateSize(), 250);
window.addEventListener("resize", () => map.invalidateSize());


  // ——— Utilidades ———
  function getWeatherIcon(wmo) {
    if (wmo === 0) return '☀️';
    if (wmo === 1) return '🌤️';
    if (wmo === 2) return '🌥️';
    if (wmo === 3) return '☁️';
    if ([45, 48].includes(wmo)) return '🌫️';
    if ([51, 53, 55, 56, 57].includes(wmo)) return '💧';
    if ([61, 63, 65, 66, 67].includes(wmo)) return '🌧️';
    if ([71, 73, 75, 77, 85, 86].includes(wmo)) return '❄️';
    if ([80, 81, 82].includes(wmo)) return '🌦️';
    if ([95, 96, 99].includes(wmo)) return '⛈️';
    return '🌍';
  }
  function buildGrid(bbox, res) {
    const pts = [];
    for (let lat = bbox.minLat; lat <= bbox.maxLat + 1e-9; lat += res) {
      for (let lon = bbox.minLon; lon <= bbox.maxLon + 1e-9; lon += res) {
        pts.push({ lat: +lat.toFixed(6), lon: +lon.toFixed(6) });
      }
    }
    return pts;
  }
  function samplePoints(grid, maxN) {
    if (grid.length <= maxN) return grid;
    const step = Math.ceil(Math.sqrt(grid.length / maxN));
    const out = [];
    for (let i = 0; i < grid.length; i += step) out.push(grid[i]);
    return out;
  }
  const grid = buildGrid(BBOX, GRID_RES_DEG);
  const samplesToQuery = samplePoints(grid, SAMPLE_MAX);

  function idwEstimate(lat, lon, samples, power = IDW_POWER, radiusDeg = INFLUENCE) {
    let num = 0, den = 0;
    for (const s of samples) {
      if (s.value == null) continue;
      const d = Math.hypot(s.lat - lat, s.lon - lon);
      if (d < 1e-6) return s.value;
      if (d > radiusDeg) continue;
      const w = 1 / Math.pow(d, power);
      num += w * s.value; den += w;
    }
    return den === 0 ? null : (num / den);
  }

  async function fetchElevation(lat, lon) {
    try {
      const r = await fetch(`${OPENTOPO}?locations=${lat},${lon}`);
      if (!r.ok) throw new Error('Elevation not available');
      const j = await r.json();
      return j.results && j.results[0] ? j.results[0].elevation : null;
    } catch (e) { console.warn('OpenTopo fail', e); return null; }
  }
  async function fetchWeather(lat, lon) {
    try {
      const params = new URLSearchParams({
        latitude: lat, longitude: lon,
        hourly: 'temperature_2m,precipitation_probability,weather_code,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,uv_index,soil_temperature_0_to_7cm,soil_moisture_0_to_7cm,surface_pressure,cloud_cover,visibility',
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,precipitation_sum',
        timezone: 'auto'
      });
      const r = await fetch(`${OPEN_METEO}?${params.toString()}`);
      if (!r.ok) throw new Error('Open-Meteo error');
      const j = await r.json();
      const now = { tempNow: null, precipProb: null, weatherCode: null, humidity: null, precipitation: null, windSpeed: null, windDirection: null, uvIndex: null, soilTemperature: null, soilMoisture: null, pressure: null, cloudCover: null, visibility: null };
      if (j.hourly && j.hourly.time) {
        const isoHour = new Date().toISOString().slice(0, 13);
        let idx = j.hourly.time.findIndex(t => t.startsWith(isoHour)); if (idx < 0) idx = 0;
        now.tempNow = j.hourly.temperature_2m[idx];
        now.precipProb = j.hourly.precipitation_probability[idx];
        now.weatherCode = j.hourly.weather_code[idx];
        now.humidity = j.hourly.relative_humidity_2m[idx];
        now.precipitation = j.hourly.precipitation[idx];
        now.windSpeed = j.hourly.wind_speed_10m[idx];
        now.windDirection = j.hourly.wind_direction_10m[idx];
        now.uvIndex = j.hourly.uv_index[idx];
        now.soilTemperature = j.hourly.soil_temperature_0_to_7cm[idx];
        now.soilMoisture = j.hourly.soil_moisture_0_to_7cm[idx];
        now.pressure = j.hourly.surface_pressure ? j.hourly.surface_pressure[idx] : null;
        now.cloudCover = j.hourly.cloud_cover ? j.hourly.cloud_cover[idx] : null;
        now.visibility = j.hourly.visibility ? j.hourly.visibility[idx] : null;
      }
      return { ...now, daily: j.daily || null, hourly: j.hourly || null, lat, lon };
    } catch (e) { console.warn('fetchWeather fail', e); return null; }
  }
  async function fetchAQ(lat, lon) {
    try {
      const r = await fetch(`${OPEN_METEO_AQ}?latitude=${lat}&longitude=${lon}&hourly=pm2_5,pm10,ozone,nitrogen_dioxide,sulphur_dioxide`);
      if (!r.ok) throw new Error('Open-Meteo AQ error');
      const j = await r.json();
      let pmNow = null, pm10Now = null, ozoneNow = null, no2Now = null, so2Now = null;
      if (j.hourly && j.hourly.time) {
        const isoHour = new Date().toISOString().slice(0, 13);
        let idx = j.hourly.time.findIndex(t => t.startsWith(isoHour)); if (idx < 0) idx = 0;
        pmNow = j.hourly.pm2_5[idx];
        pm10Now = j.hourly.pm10 ? j.hourly.pm10[idx] : null;
        ozoneNow = j.hourly.ozone ? j.hourly.ozone[idx] : null;
        no2Now = j.hourly.nitrogen_dioxide ? j.hourly.nitrogen_dioxide[idx] : null;
        so2Now = j.hourly.sulphur_dioxide ? j.hourly.sulphur_dioxide[idx] : null;
      }
      return { pm25: pmNow, pm10: pm10Now, ozone: ozoneNow, no2: no2Now, so2: so2Now, meta: j };
    } catch (e) { console.warn('fetchAQ fail', e); return null; }
  }

  async function fetchAllSamples(points) {
    const out = [];
    const BATCH = 8;
    for (let i = 0; i < points.length; i += BATCH) {
      const group = points.slice(i, i + BATCH);
      const res = await Promise.all(group.map(async p => {
        const [e, w, aq] = await Promise.allSettled([fetchElevation(p.lat, p.lon), fetchWeather(p.lat, p.lon), fetchAQ(p.lat, p.lon)]);
        const elev = e.status === 'fulfilled' ? e.value : null;
        const ww = w.status === 'fulfilled' ? w.value : null;
        const aa = aq.status === 'fulfilled' ? aq.value : null;
        return {
          lat: p.lat, lon: p.lon, elevation: elev,
          temp: ww ? ww.tempNow : null,
          precipProb: ww ? ww.precipProb : null,
          weatherCode: ww ? ww.weatherCode : null,
          humidity: ww ? ww.humidity : null,
          precipitation: ww ? ww.precipitation : null,
          windSpeed: ww ? ww.windSpeed : null,
          windDirection: ww ? ww.windDirection : null,
          uvIndex: ww ? ww.uvIndex : null,
          soilTemperature: ww ? ww.soilTemperature : null,
          soilMoisture: ww ? ww.soilMoisture : null,
          pressure: ww ? ww.pressure : null,
          cloudCover: ww ? ww.cloudCover : null,
          visibility: ww ? ww.visibility : null,
          daily: ww ? ww.daily : null,
          hourly: ww ? ww.hourly : null,
          pm25: aa ? aa.pm25 : null,
          pm10: aa ? aa.pm10 : null,
          ozone: aa ? aa.ozone : null,
          no2: aa ? aa.no2 : null,
          so2: aa ? aa.so2 : null
        };
      }));
      out.push(...res);
      await new Promise(r => setTimeout(r, 250));
    }
    return out;
  }

  function prepareTempSamples(raw) { return raw.map(s => ({ lat: s.lat, lon: s.lon, value: s.temp ?? null })); }
  function prepareAQSamples(raw) { return raw.map(s => ({ lat: s.lat, lon: s.lon, value: s.pm25 ?? null })); }
  function prepareSoilSamples(raw) { return raw.map(s => ({ lat: s.lat, lon: s.lon, value: s.soilTemperature ?? null })); }

  function lerp(a, b, u) { return [Math.round(a[0] + (b[0] - a[0]) * u), Math.round(a[1] + (b[1] - a[1]) * u), Math.round(a[2] + (b[2] - a[2]) * u)]; }
  function tempColor(norm) {
    if (norm <= 0.33) { const u = norm / 0.33; return lerp([27, 75, 255], [0, 195, 195], u); }
    else if (norm <= 0.66) { const u = (norm - 0.33) / 0.33; return lerp([0, 195, 195], [255, 209, 102], u); }
    else { const u = (norm - 0.66) / 0.34; return lerp([255, 209, 102], [239, 68, 68], u); }
  }
  function pm25Color(pm) {
    if (pm == null) return [0, 0, 0, 0];
    if (pm <= 12) return [0, 150, 0, 200];
    if (pm <= 35) return [255, 206, 0, 200];
    if (pm <= 55) return [255, 120, 0, 220];
    if (pm <= 150) return [200, 30, 30, 230];
    return [150, 0, 150, 240];
  }

  async function buildCanvasOverlay(samples, type = 'temp') {
    const valid = samples.filter(s => s.value != null && !isNaN(s.value));
    if (!valid.length) return null;
    const latSpan = BBOX.maxLat - BBOX.minLat, lonSpan = BBOX.maxLon - BBOX.minLon;
    const cols = Math.round(lonSpan / GRID_RES_DEG), rows = Math.round(latSpan / GRID_RES_DEG);
    const MAXPX = 900, scale = Math.min(1, MAXPX / Math.max(cols, rows));
    const w = Math.max(50, Math.round(cols * scale)), h = Math.max(50, Math.round(rows * scale));
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d'); const img = ctx.createImageData(w, h);
    let vmin, vmax; if (type === 'temp') { vmin = -10; vmax = 30; } else if (type === 'soil') { vmin = -5; vmax = 25; } else { vmin = 0; vmax = 100; }

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const lon = BBOX.minLon + (x / (w - 1)) * lonSpan, lat = BBOX.maxLat - (y / (h - 1)) * latSpan;
        const est = idwEstimate(lat, lon, valid, IDW_POWER, INFLUENCE); const idx = (y * w + x) * 4;
        if (est == null) { img.data[idx + 3] = 0; }
        else {
          if (type === 'temp' || type === 'soil') {
            const norm = Math.max(0, Math.min(1, (est - vmin) / (vmax - vmin)));
            const col = tempColor(norm);
            img.data[idx] = col[0]; img.data[idx + 1] = col[1]; img.data[idx + 2] = col[2]; img.data[idx + 3] = 200;
          } else {
            const col = pm25Color(est);
            img.data[idx] = col[0]; img.data[idx + 1] = col[1]; img.data[idx + 2] = col[2]; img.data[idx + 3] = col[3];
          }
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    const url = canvas.toDataURL('image/png');
    return { overlay: L.imageOverlay(url, [[BBOX.maxLat, BBOX.minLon], [BBOX.minLat, BBOX.maxLon]], { opacity: type === 'temp' ? 0.85 : 0.75 }), canvas };
  }

  // ——— UI setters ———
  function safeText(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
  }
  function setOverviewUI(stats, w) {
    safeText('temp-now', stats.mean != null ? stats.mean.toFixed(1) + ' °C' : '-- °C');
    safeText('temp-desc', stats.min != null ? `Min ${stats.min.toFixed(1)}° · Max ${stats.max.toFixed(1)}°` : '—');
    if (w) {
      safeText('weather-icon', getWeatherIcon(w.weatherCode));
      safeText('precip-prob', w.precipProb != null ? `💧 ${w.precipProb}%` : '—');
      safeText('humidity-now', w.humidity != null ? `${w.humidity}%` : '--%');
      safeText('wind-now', w.windSpeed != null ? `${w.windSpeed} km/h` : '-- km/h');
      safeText('precip-mm', w.precipitation != null ? `${w.precipitation} mm` : '-- mm');
    }
    const alerts = document.getElementById('alerts-container'); if (alerts) alerts.innerHTML = '';
    if (alerts) {
      if (stats.min != null && stats.min <= 0) alerts.innerHTML += `<div class="frost-alert">⚠️ ¡HELADA! Temperatura ≤ 0°C. Mín: ${stats.min.toFixed(1)}°C</div>`;
      else if (stats.min != null && stats.min <= 2) alerts.innerHTML += `<div class="frost-alert">❄️ Riesgo de helada (mín: ${stats.min.toFixed(1)}°C)</div>`;
      if (w && w.uvIndex != null && w.uvIndex >= 8) alerts.innerHTML += `<div class="uv-alert">☀️ Índice UV extremo (${w.uvIndex}). Protección necesaria.</div>`;
      else if (w && w.uvIndex != null && w.uvIndex >= 6) alerts.innerHTML += `<div class="uv-alert">☀️ Índice UV alto (${w.uvIndex}). Use protección.</div>`;
      if (w && w.windSpeed != null && w.windSpeed >= 30) alerts.innerHTML += `<div class="wind-alert">💨 Vientos fuertes (${w.windSpeed} km/h).</div>`;
      if (!alerts.innerHTML) alerts.innerHTML = '<div class="small-muted" style="text-align:center;margin-top:12px;">No hay alertas activas</div>';
    }
  }
  function setClimaUI(stats, w) {
    safeText('clima-temp-now', stats.mean != null ? stats.mean.toFixed(1) + ' °C' : '-- °C');
    safeText('clima-temp-desc', stats.min != null ? `Min ${stats.min.toFixed(1)}° · Max ${stats.max.toFixed(1)}°` : '—');
    if (w) {
      const feels = (w.tempNow != null && w.windSpeed != null) ? (w.tempNow - (w.windSpeed * 0.1)).toFixed(1) : null;
      safeText('feels-like', feels != null ? `${feels} °C` : '-- °C');
      safeText('uv-index', w.uvIndex != null ? w.uvIndex : '--');
      safeText('pressure-now', w.pressure != null ? `${w.pressure} hPa` : '-- hPa');
      safeText('visibility-now', w.visibility != null ? `${(w.visibility / 1000).toFixed(1)} km` : '-- km');
      safeText('cloudcover-now', w.cloudCover != null ? `${w.cloudCover}%` : '--%');
      let uv = '--'; if (w.uvIndex != null) { if (w.uvIndex <= 2) uv = 'Bajo'; else if (w.uvIndex <= 5) uv = 'Moderado'; else if (w.uvIndex <= 7) uv = 'Alto'; else if (w.uvIndex <= 10) uv = 'Muy alto'; else uv = 'Extremo'; }
      safeText('uv-desc', uv);
    }
  }
  function setAQIUI(avg, pm, pm10, oz, no2, so2) {
    safeText('aqi-now', avg != null ? avg.toFixed(0) : '—');
    safeText('pm-now', pm != null ? pm.toFixed(1) + ' µg/m³' : '—');
    safeText('pm10-now', pm10 != null ? pm10.toFixed(1) + ' µg/m³' : '-- µg/m³');
    safeText('ozone-now', oz != null ? oz.toFixed(1) + ' µg/m³' : '-- µg/m³');
    safeText('no2-now', no2 != null ? no2.toFixed(1) + ' µg/m³' : '-- µg/m³');
    safeText('so2-now', so2 != null ? so2.toFixed(1) + ' µg/m³' : '-- µg/m³');
    let desc = '—'; if (avg != null) { if (avg <= 50) desc = 'Buena'; else if (avg <= 100) desc = 'Moderada'; else if (avg <= 150) desc = 'Dañina para sensibles'; else desc = 'Mala'; }
    safeText('aqi-desc', desc);
  }
  function setAgriUI(soilStats, w) {
    safeText('soil-temp-now', soilStats.mean != null ? soilStats.mean.toFixed(1) + ' °C' : '-- °C');
    safeText('soil-moisture-now', (w && w.soilMoisture != null) ? w.soilMoisture.toFixed(3) + ' m³/m³' : '-- m³/m³');

    // precip. 24h
    let acc = 0;
    if (w && w.hourly && w.hourly.precipitation) {
      const now = new Date(); const idx = w.hourly.time.findIndex(t => t.startsWith(now.toISOString().slice(0, 13)));
      if (idx >= 0) { for (let i = Math.max(0, idx - 23); i <= idx; i++) acc += w.hourly.precipitation[i] || 0; }
    }
    safeText('precip-accum', acc.toFixed(1) + ' mm');

    const minT = w && w.daily && w.daily.temperature_2m_min ? w.daily.temperature_2m_min[0] : null;
    safeText('min-temp', minT != null ? minT.toFixed(1) + ' °C' : '-- °C');

    const et = w && w.tempNow != null ? Math.max(0, 0.0023 * (w.tempNow + 17.8) * Math.sqrt(w.tempNow + 5)) : null;
    safeText('evapotranspiration', et != null ? et.toFixed(2) + ' mm' : '-- mm');

    const ndvi = estimateNDVI(w?.soilMoisture, acc, w?.tempNow);
    safeText('ndvi-est', ndvi ?? '--');

    const ag = document.getElementById('agri-alerts-container'); if (ag) ag.innerHTML = '';
    if (ag) {
      if (soilStats.mean != null && soilStats.mean < 10) ag.innerHTML += `<div class="frost-alert">🌱 Temperatura del suelo baja (${soilStats.mean.toFixed(1)}°C).</div>`;
      if (w && w.soilMoisture != null && w.soilMoisture < 0.2) ag.innerHTML += `<div class="soil-alert">💧 Humedad del suelo crítica (${w.soilMoisture.toFixed(3)} m³/m³).</div>`;
      else if (w && w.soilMoisture != null && w.soilMoisture > 0.6) ag.innerHTML += `<div class="soil-alert">🌊 Exceso de humedad (${w.soilMoisture.toFixed(3)} m³/m³).</div>`;
      if (acc > 20) ag.innerHTML += `<div class="wind-alert">🌧️ Alta precipitación (${acc.toFixed(1)} mm).</div>`;
      if (!ag.innerHTML) ag.innerHTML = '<div class="small-muted" style="text-align:center;margin-top:12px;">Condiciones favorables para la agricultura</div>';
    }
  }

  function calculateReferenceEvapotranspiration(tmin, tmax, tmean, lat, doy) {
    if (tmin == null || tmax == null || tmean == null) return null;
    const Gs = 0.0820, latR = lat * Math.PI / 180, dec = 0.409 * Math.sin(2 * Math.PI * doy / 365 - 1.39);
    const dr = 1 + 0.033 * Math.cos(2 * Math.PI * doy / 365);
    const ws = Math.acos(-Math.tan(latR) * Math.tan(dec));
    const Ra = (24 * 60 / Math.PI) * Gs * dr * (ws * Math.sin(latR) * Math.sin(dec) + Math.cos(latR) * Math.cos(dec) * Math.sin(ws));
    const Ra_mm = Ra * 0.408;
    return Math.max(0, 0.0023 * (tmean + 17.8) * Math.sqrt(tmax - tmin) * Ra_mm);
  }
  function calculateSoilWaterBalance(soilMoisture, precip, et0, runoffCoef, drainFactor) {
    if (soilMoisture == null || precip == null || et0 == null) return soilMoisture;
    const FC = 0.35, WP = 0.15;
    const runoff = precip > 10 ? precip * runoffCoef : 0;
    const avail = precip - runoff;
    const actualET = Math.min(et0, soilMoisture * 100);
    const drainage = soilMoisture > FC ? (soilMoisture - FC) * drainFactor : 0;
    let m = soilMoisture + (avail - actualET - drainage) / 100;
    return Math.max(WP, Math.min(0.95, m));
  }
  function calculateIntegratedSoilMoisture(soilData, w, lat, elev) {
    if (!soilData || !w) return null;
    const tmin = w.daily?.temperature_2m_min ? w.daily.temperature_2m_min[0] : (w.tempNow != null ? w.tempNow - 5 : null);
    const tmax = w.daily?.temperature_2m_max ? w.daily.temperature_2m_max[0] : (w.tempNow != null ? w.tempNow + 5 : null);
    if (tmin == null || tmax == null) return soilData.soilMoisture ?? 0.25;
    const tmean = (tmin + tmax) / 2;
    const doy = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    let et0 = calculateReferenceEvapotranspiration(tmin, tmax, tmean, lat, doy);
    if (et0 == null) return soilData.soilMoisture ?? 0.25;
    const elevFactor = elev ? Math.max(0.7, 1 - (elev / 5000)) : 1;
    et0 *= elevFactor;
    let runoff = 0.1, drain = 0.2;
    if (soilData.soilTemperature != null) {
      if (soilData.soilTemperature < 5) drain *= 0.5;
      else if (soilData.soilTemperature > 25) runoff *= 1.5;
    }
    return calculateSoilWaterBalance(soilData.soilMoisture ?? 0.25, w.precipitation || 0, et0, runoff, drain);
  }
  function calculateWaterDeficit(soilMoisture, fieldCapacity, precipitation, et0) {
    if (soilMoisture == null) return null;
    const avail = (soilMoisture - 0.15) * 100, maxAvail = (fieldCapacity - 0.15) * 100;
    const def = maxAvail - avail - (precipitation || 0) + (et0 || 0);
    return Math.max(0, def);
  }

  function buildForecastUI(daily) {
    const c = document.getElementById('forecast-temp'); if (!c) return; c.innerHTML = '';
    if (!daily || !daily.time) return;
    const days = Math.min(7, daily.time.length);
    for (let i = 0; i < days; i++) {
      const d = daily.time[i];
      const tmax = daily.temperature_2m_max?.[i];
      const tmin = daily.temperature_2m_min?.[i];
      const wmo = daily.weather_code?.[i];
      const el = document.createElement('div'); el.className = 'forecast-item';
      el.innerHTML = `
        <div class="forecast-date">${new Date(d).toLocaleDateString(undefined, { weekday: 'short', day: '2-digit' })}</div>
        <div class="forecast-ico">${getWeatherIcon(wmo)}</div>
        <div class="forecast-temps">${tmax != null ? Math.round(tmax) + '°' : '—'} / ${tmin != null ? Math.round(tmin) + '°' : '—'}</div>
      `;
      c.appendChild(el);
    }
  }

  function computeStats(values) {
    const valid = values.filter(v => v != null && !isNaN(v));
    if (!valid.length) return { min: null, max: null, mean: null };
    let min = +Infinity, max = -Infinity, sum = 0;
    for (const v of valid) { if (v < min) min = v; if (v > max) max = v; sum += v; }
    return { min, max, mean: sum / valid.length };
  }

  function destroyOverlay(o) { if (o && map.hasLayer(o)) map.removeLayer(o); }
  function destroyChart(c) { if (c && typeof c.destroy === 'function') c.destroy(); }

  function renderCharts(anySample) {
    if (!anySample || !anySample.hourly || typeof Chart === 'undefined') return;

    // Temperatura horaria
    try {
      const ctx1 = document.getElementById('hourly-chart');
      if (ctx1) {
        destroyChart(hourlyChart);
        const labels = anySample.hourly.time.slice(0, 24).map(t => new Date(t).toLocaleTimeString([], { hour: '2-digit' }));
        const temps = anySample.hourly.temperature_2m.slice(0, 24);
        hourlyChart = new Chart(ctx1, {
          type: 'line',
          data: { labels, datasets: [{ label: 'Temp (°C)', data: temps, fill: false }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, elements: { point: { radius: 0 } } }
        });
      }
    } catch (e) { console.warn('hourly chart error', e); }

    // AQI simple (PM2.5)
    try {
      const ctx2 = document.getElementById('aqi-chart');
      if (ctx2 && anySample.hourly.pm2_5) {
        destroyChart(aqiChart);
        const labels = anySample.hourly.time.slice(0, 24).map(t => new Date(t).toLocaleTimeString([], { hour: '2-digit' }));
        const pm = anySample.hourly.pm2_5.slice(0, 24);
        aqiChart = new Chart(ctx2, {
          type: 'bar',
          data: { labels, datasets: [{ label: 'PM2.5 (µg/m³)', data: pm }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
      }
    } catch (e) { console.warn('aqi chart error', e); }
  }

  function updateSoilSidebar(lat, lon, elev, w) {
    const props = getSoilProperties(lat, lon);
    safeText('soil-type', props.type);
    safeText('soil-ph', props.pH);
    safeText('soil-carbon', props.organicCarbon);
    safeText('elevation-now', elev != null ? `${Math.round(elev)} m` : '-- m');

    const swb = calculateIntegratedSoilMoisture({ soilMoisture: w?.soilMoisture, soilTemperature: w?.soilTemperature }, w, lat, elev);
    const et0 = w && w.daily ? calculateReferenceEvapotranspiration(w.daily.temperature_2m_min?.[0], w.daily.temperature_2m_max?.[0], (w.daily.temperature_2m_min?.[0] + w.daily.temperature_2m_max?.[0]) / 2, lat, new Date().getDOY?.() || 200) : null;
    const deficit = calculateWaterDeficit(swb, 0.35, w?.precipitation, et0);
    safeText('soil-balance', swb != null ? swb.toFixed(3) + ' m³/m³' : '-- m³/m³');
    safeText('soil-deficit', deficit != null ? deficit.toFixed(1) + ' mm' : '-- mm');
  }

  // ——— Inicialización ———
  async function init() {
    try {
      if (loadingOverlay) loadingOverlay.style.display = 'flex';
      const raw = await fetchAllSamples(samplesToQuery);

      // Temperatura
      const tempSamples = prepareTempSamples(raw);
      lastAdjustedSamples = tempSamples;
      const tempVals = tempSamples.map(s => s.value);
      const tStats = lastTempStats = computeStats(tempVals);

      // AQ
      const aqSamples = prepareAQSamples(raw);
      lastAQSamples = aqSamples;
      const aqiVals = aqSamples.map(s => s.value);
      const aqStats = lastAQStats = computeStats(aqiVals);

      // Suelo (°C)
      const soilSamples = prepareSoilSamples(raw);
      lastSoilSamples = soilSamples;
      const soilVals = soilSamples.map(s => s.value);
      const soilStats = computeStats(soilVals);

      // Overlay temperatura
      destroyOverlay(tempOverlay);
      const tempLayer = await buildCanvasOverlay(tempSamples, 'temp');
      if (tempLayer && tempLayer.overlay) { tempOverlay = tempLayer.overlay; tempOverlay.addTo(map); }

      // Overlay AQI (PM2.5)
      destroyOverlay(aqiOverlay);
      const aqiLayer = await buildCanvasOverlay(aqSamples, 'aqi');
      if (aqiLayer && aqiLayer.overlay) aqiOverlay = aqiLayer.overlay;

      // Overlay suelo T
      destroyOverlay(soilTempOverlay);
      const soilLayer = await buildCanvasOverlay(soilSamples, 'soil');
      if (soilLayer && soilLayer.overlay) soilTempOverlay = soilLayer.overlay;

      // Un sample de referencia para UI (el centro de la malla si existe)
      const ref = raw.find(s => Math.abs(s.lat - CENTER[0]) < 0.05 && Math.abs(s.lon - CENTER[1]) < 0.05) || raw.find(Boolean);

      // UIs
      setOverviewUI(tStats, ref);
      setClimaUI(tStats, ref);
      setAQIUI(aqStats.mean != null ? Math.min(300, Math.round(aqStats.mean * 4)) : null, ref?.pm25, ref?.pm10, ref?.ozone, ref?.no2, ref?.so2);
      setAgriUI(soilStats, ref);
      if (ref) updateSoilSidebar(ref.lat, ref.lon, ref.elevation, ref);
      if (ref?.daily) buildForecastUI(ref.daily);
      renderCharts(ref);

      // Tabs / toggles
      setupInteractions();
    } catch (e) {
      console.error('Init error', e);
    } finally {
      if (loadingOverlay) loadingOverlay.style.display = 'none';
    }
  }

  function setupInteractions() {
    // Tabs
    document.querySelectorAll('[data-tab]')?.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        if (!tab || tab === activeTab) return;
        activeTab = tab;
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
        document.getElementById(`panel-${tab}`)?.classList.remove('hidden');
        // Mostrar/ocultar overlays según tab
        if (tab === 'overview' || tab === 'clima') {
          if (tempOverlay && !map.hasLayer(tempOverlay)) tempOverlay.addTo(map);
          if (aqiOverlay && map.hasLayer(aqiOverlay)) map.removeLayer(aqiOverlay);
          if (soilTempOverlay && map.hasLayer(soilTempOverlay)) map.removeLayer(soilTempOverlay);
        } else if (tab === 'calidad') {
          if (aqiOverlay && !map.hasLayer(aqiOverlay)) aqiOverlay.addTo(map);
          if (tempOverlay && map.hasLayer(tempOverlay)) map.removeLayer(tempOverlay);
          if (soilTempOverlay && map.hasLayer(soilTempOverlay)) map.removeLayer(soilTempOverlay);
        } else if (tab === 'agri') {
          if (soilTempOverlay && !map.hasLayer(soilTempOverlay)) soilTempOverlay.addTo(map);
          if (tempOverlay && map.hasLayer(tempOverlay)) map.removeLayer(tempOverlay);
          if (aqiOverlay && map.hasLayer(aqiOverlay)) map.removeLayer(aqiOverlay);
        }
      });
    });

    // Toggle overlays directos (si existen switches)
    document.getElementById('toggle-temp')?.addEventListener('change', (e) => {
      if (e.target.checked) tempOverlay?.addTo(map); else destroyOverlay(tempOverlay);
    });
    document.getElementById('toggle-aqi')?.addEventListener('change', (e) => {
      if (e.target.checked) aqiOverlay?.addTo(map); else destroyOverlay(aqiOverlay);
    });
    document.getElementById('toggle-soil')?.addEventListener('change', (e) => {
      if (e.target.checked) soilTempOverlay?.addTo(map); else destroyOverlay(soilTempOverlay);
    });

    // Recalcular a demanda (botón actualizar)
    document.getElementById('refresh-btn')?.addEventListener('click', () => init());
  }

  // Helper: getDayOfYear polyfill for Date if not present (used once above)
  if (!Date.prototype.getDOY) {
    Object.defineProperty(Date.prototype, 'getDOY', { value: function(){
      const start = new Date(this.getFullYear(), 0, 0); const diff = this - start;
      return Math.floor(diff / 86400000);
    }});
  }

  // Exponer utilidades para debug manual en consola (opcional)
  window.AndesCity = {
    getSoilProperties, estimateNDVI, idwEstimate,
    calculateReferenceEvapotranspiration, calculateSoilWaterBalance,
    calculateIntegratedSoilMoisture, calculateWaterDeficit,
    _state: () => ({ lastTempStats, lastAQStats, lastAdjustedSamples, lastAQSamples, lastSoilSamples })
  };

  // Lanzar
  init();
})();
