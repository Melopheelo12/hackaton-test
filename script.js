console.log("✅ Script chargé");

// ─── INIT MAP ────────────────────────────────────────────────────────────────
const map = L.map('map', { zoomControl: false }).setView([44.84, -0.58], 12);

L.control.zoom({ position: 'bottomright' }).addTo(map);

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap &copy; CARTO',
  maxZoom: 19
}).addTo(map);

let marker;
let geoData;

// ─── COULEUR PAR SCORE ────────────────────────────────────────────────────────
function getColor(delta) {
  if (delta >= 7) return "#e74c3c";
  if (delta >= 4) return "#f39c12";
  return "#2ecc71";
}

// ─── TYPE D'ÉTABLISSEMENT ─────────────────────────────────────────────────────
function getSchoolType(props) {
  const amenity = props.amenity || "";
  const schoolFR = props["school:FR"] || "";
  if (amenity === "kindergarten") return "Crèche / Maternelle";
  if (schoolFR.includes("lycée"))    return "Lycée";
  if (schoolFR.includes("collège"))  return "Collège";
  if (schoolFR.includes("maternelle")) return "École maternelle";
  if (schoolFR.includes("élémentaire") || schoolFR.includes("primaire")) return "École primaire";
  return "Établissement scolaire";
}

// ─── AFFICHER UN RÉSULTAT DANS LA SIDEBAR ────────────────────────────────────
function displayResult(name, address, score) {
  const resultBox = document.getElementById("result");

  let cls, level, advice;

  if (score >= 7) {
    cls    = "is-red";
    level  = "🔴 Risque ÉLEVÉ";
    advice = "Zone très exposée à la chaleur. Priorité à la désimperméabilisation, à la plantation d'arbres et à la création d'îlots de fraîcheur.";
  } else if (score >= 4) {
    cls    = "is-orange";
    level  = "🟠 Risque MODÉRÉ";
    advice = "Zone vulnérable. Prévoir des dispositifs d'ombrage, végétaliser les façades et limiter les surfaces minérales.";
  } else {
    cls    = "is-green";
    level  = "🟢 Risque FAIBLE";
    advice = "Zone relativement protégée. Maintenir et renforcer la canopée existante.";
  }

  const pct = Math.round((score / 10) * 100);

  resultBox.className = `result-card ${cls}`;
  resultBox.innerHTML = `
    <div class="result-school">${name}</div>
    <div class="result-address">${address}</div>
    <div class="result-score">
      <span class="popup-score-num score-badge">${score}<span style="font-size:14px;opacity:.5">/10</span></span>
      <span class="score-label">${level}</span>
    </div>
    <div class="score-bar">
      <div class="score-bar-fill" style="width:${pct}%"></div>
    </div>
    <div class="result-advice">💡 ${advice}</div>
  `;
}

// ─── LOAD GEOJSON ─────────────────────────────────────────────────────────────
fetch('data.geojson')
  .then(res => res.json())
  .then(data => {
    geoData = data;

    L.geoJSON(data, {
      pointToLayer: function (feature, latlng) {
        const delta = feature.properties.delta || 0;
        const color = getColor(delta);
        return L.circleMarker(latlng, {
          radius: 7,
          fillColor: color,
          color: "#fff",
          weight: 1.5,
          fillOpacity: 0.92
        });
      },
      onEachFeature: function (feature, layer) {
        const props  = feature.properties;
        const nom    = props.nom || props.name || "École sans nom";
        const score  = props.delta || 0;
        const type   = getSchoolType(props);
        const color  = getColor(score);
        const addr   = [props["addr:housenumber"], props["addr:street"]].filter(Boolean).join(" ") || "Bordeaux";

        layer.bindPopup(`
          <div class="popup-name">${nom}</div>
          <div class="popup-type">${type}</div>
          <div class="popup-score">
            <span class="popup-score-num" style="color:${color}">${score}</span>
            <span style="color:#8a92a6;font-size:12px">/ 10 · Score chaleur</span>
          </div>
        `, { maxWidth: 240 });

        layer.on('click', function () {
          displayResult(nom, addr, score);
          map.flyTo(layer.getLatLng(), 16, { animate: true, duration: 1.2 });
          setTimeout(syncFelt, 1300);
        });
      }
    }).addTo(map);
  });

// ─── SEARCH ──────────────────────────────────────────────────────────────────
const searchInput    = document.getElementById("search");
const suggestionsBox = document.getElementById("suggestions");

searchInput.addEventListener("input", async () => {
  const query = searchInput.value.trim();

  if (query.length < 2) {
    suggestionsBox.innerHTML = "";
    suggestionsBox.style.display = "none";
    return;
  }

  suggestionsBox.innerHTML = "";
  suggestionsBox.style.display = "block";

  const results = [];

  if (geoData) {
    const q = query.toLowerCase();
    geoData.features.forEach(f => {
      const nom = f.properties.nom || f.properties.name || "";
      if (nom.toLowerCase().includes(q)) {
        results.push({ type: "school", label: nom, feature: f });
      }
    });
  }

  try {
    const res = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=4&citycode=33063`
    );
    const data = await res.json();
    data.features.forEach(f => {
      results.push({ type: "address", label: f.properties.label, feature: f });
    });
  } catch (e) {}

  suggestionsBox.innerHTML = "";

  if (results.length === 0) {
    suggestionsBox.innerHTML = `<div class="suggestion-item" style="opacity:.5;cursor:default">Aucun résultat trouvé</div>`;
    return;
  }

  results.slice(0, 8).forEach(item => {
    const div = document.createElement("div");
    div.className = "suggestion-item";

    const icon  = item.type === "school" ? "🏫" : "📍";
    const badge = item.type === "school"
      ? `<span class="sug-type school">École</span>`
      : `<span class="sug-type address">Adresse</span>`;

    div.innerHTML = `<span class="sug-icon">${icon}</span><span style="flex:1;font-size:13px">${item.label}</span>${badge}`;

    div.onclick = () => {
      if (item.type === "school") {
        selectSchool(item.feature);
      } else {
        selectAddress(item.feature);
      }
      searchInput.value = item.label;
      suggestionsBox.style.display = "none";
    };

    suggestionsBox.appendChild(div);
  });
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-section")) {
    suggestionsBox.style.display = "none";
  }
});

// ─── SÉLECTIONNER UNE ÉCOLE ───────────────────────────────────────────────────
function selectSchool(feature) {
  const [lon, lat] = feature.geometry.coordinates;
  const props  = feature.properties;
  const nom    = props.nom || props.name || "École";
  const score  = props.delta || 0;
  const addr   = [props["addr:housenumber"], props["addr:street"]].filter(Boolean).join(" ") || "Bordeaux";

  map.flyTo([lat, lon], 17, { animate: true, duration: 1.4 });
  if (marker) map.removeLayer(marker);
  marker = L.marker([lat, lon]).addTo(map);
  displayResult(nom, addr, score);
  setTimeout(syncFelt, 1500);
}

// ─── SÉLECTIONNER UNE ADRESSE ─────────────────────────────────────────────────
function selectAddress(feature) {
  const [lon, lat] = feature.geometry.coordinates;
  const label = feature.properties.label;

  map.flyTo([lat, lon], 17, { animate: true, duration: 1.4 });
  if (marker) map.removeLayer(marker);
  marker = L.marker([lat, lon]).addTo(map);

  let closest = null;
  let minDist  = Infinity;

  if (geoData) {
    geoData.features.forEach(f => {
      const [fLon, fLat] = f.geometry.coordinates;
      const dist = Math.hypot(lat - fLat, lon - fLon);
      if (dist < minDist) { minDist = dist; closest = f; }
    });
  }

  if (closest) {
    const props = closest.properties;
    const nom   = props.nom || props.name || "École la plus proche";
    const score = props.delta || 0;
    displayResult(`${nom} (école la plus proche)`, label, score);
  }

  setTimeout(syncFelt, 1500);
}

// ─── SYNC FELT QUAND LA CARTE BOUGE ──────────────────────────────────────────
const feltLayer = document.getElementById("felt-layer");

function syncFelt() {
  const c = map.getCenter();
  const z = map.getZoom();
  feltLayer.src = `https://felt.com/embed/map/Untitled-Map-trd59Cqj4RuKu8WX9Cw2eYCD?loc=${c.lat.toFixed(5)},${c.lng.toFixed(5)},${z.toFixed(2)}z&legend=0&link=1&geolocation=0&cooperativeGestures=1`;
}

map.on('moveend', syncFelt);
map.on('zoomend', syncFelt);

// ─── SLIDERS OPACITÉ ─────────────────────────────────────────────────────────
const mapDiv = document.getElementById("map");

document.getElementById("op-leaflet").addEventListener("input", function () {
  mapDiv.style.opacity = this.value / 100;
  document.getElementById("lf-val").textContent = this.value + "%";
});

document.getElementById("op-felt").addEventListener("input", function () {
  feltLayer.style.opacity = this.value / 100;
  document.getElementById("ft-val").textContent = this.value + "%";
});
