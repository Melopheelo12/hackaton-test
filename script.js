console.log("✅ Script chargé");

// ─── INIT MAP ────────────────────────────────────────────────────────────────
const map = L.map('map', { zoomControl: false }).setView([44.84, -0.58], 12);

L.control.zoom({ position: 'bottomright' }).addTo(map);

// Aucune tuile — Leaflet transparent, Felt fait le fond
// On garde quand même une couche invisible pour que Leaflet fonctionne
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap &copy; CARTO',
  maxZoom: 19,
  opacity: 0
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
  const amenity  = props.amenity || "";
  const schoolFR = props["school:FR"] || "";
  if (amenity === "kindergarten")                                         return "🍼 Crèche / Maternelle";
  if (schoolFR.includes("lycée"))                                         return "🎓 Lycée";
  if (schoolFR.includes("collège"))                                       return "📚 Collège";
  if (schoolFR.includes("maternelle"))                                    return "🌱 École maternelle";
  if (schoolFR.includes("élémentaire") || schoolFR.includes("primaire")) return "✏️ École primaire";
  return "🏫 Établissement scolaire";
}

function getOperatorLabel(props) {
  const op = props["operator:type"] || "";
  if (op === "public")  return "🏛️ Public";
  if (op === "private") return "🏢 Privé";
  return null;
}

function getRisk(score) {
  if (score >= 7) return { cls: "is-red",    icon: "🔴", label: "Risque ÉLEVÉ",  color: "#e74c3c", bar: "#dc2626" };
  if (score >= 4) return { cls: "is-orange", icon: "🟠", label: "Risque MODÉRÉ", color: "#f39c12", bar: "#d97706" };
  return              { cls: "is-green",  icon: "🟢", label: "Risque FAIBLE", color: "#2ecc71", bar: "#16a34a" };
}

function getAdvice(score) {
  if (score >= 7) return [
    "Désimperméabiliser les cours (pavés drainants, engazonnement)",
    "Planter des arbres à grand développement pour créer de l'ombre",
    "Installer des brumisateurs ou points d'eau pour les élèves",
    "Végétaliser les toitures et façades (murs végétaux)",
    "Prévoir un plan de continuité pédagogique lors des canicules"
  ];
  if (score >= 4) return [
    "Ajouter des dispositifs d'ombrage (voiles, pergolas) en cour",
    "Végétaliser les façades les plus exposées au soleil",
    "Réduire les surfaces minérales (asphalte, béton) en cour",
    "Renforcer la canopée existante avec de nouvelles plantations"
  ];
  return [
    "Maintenir et entretenir la végétation existante",
    "Surveiller l'évolution du bâti aux alentours",
    "Continuer les bonnes pratiques de gestion thermique"
  ];
}

// ─── AFFICHER RÉSULTAT SIDEBAR ────────────────────────────────────────────────
function displayResult(name, address, score, props) {
  const resultBox = document.getElementById("result");
  const risk      = getRisk(score);
  const pct       = Math.round((score / 10) * 100);
  const type      = props ? getSchoolType(props) : "";
  const op        = props ? getOperatorLabel(props) : null;
  const email     = props && props.email   ? props.email   : null;
  const website   = props && props.website ? props.website : null;
  const advices   = getAdvice(score);

  const scoreExplain = score >= 7
    ? "Établissement situé dans une zone fortement exposée à la chaleur urbaine (îlot de chaleur, manque de végétation, surfaces imperméables)."
    : score >= 4
    ? "Exposition intermédiaire. Des améliorations ciblées peuvent réduire significativement le risque."
    : "Environnement relativement végétalisé et frais. La vigilance reste de mise lors des canicules.";

  const metaHTML = `
    <div class="result-meta">
      ${type ? `<span class="meta-badge type">${type}</span>` : ""}
      ${op   ? `<span class="meta-badge op">${op}</span>`   : ""}
    </div>`;

  const contactHTML = (email || website) ? `
    <div class="result-contact">
      ${email   ? `<a href="mailto:${email}" class="contact-link">✉️ ${email}</a>`              : ""}
      ${website ? `<a href="${website}" target="_blank" class="contact-link">🌐 Site web</a>` : ""}
    </div>` : "";

  const adviceHTML = advices.map(a => `<li>${a}</li>`).join("");

  resultBox.className = `result-card ${risk.cls}`;
  resultBox.innerHTML = `
    <div class="result-school">${name}</div>
    ${metaHTML}
    <div class="result-address">📍 ${address}</div>
    ${contactHTML}
    <div class="result-score-block">
      <div class="result-score-top">
        <span class="score-big" style="color:${risk.color}">${score}<span class="score-denom">/10</span></span>
        <div class="score-info">
          <span class="score-level">${risk.icon} ${risk.label}</span>
          <span class="score-sub">Indice d'exposition chaleur urbaine</span>
        </div>
      </div>
      <div class="score-bar"><div class="score-bar-fill" style="width:${pct}%;background:${risk.bar}"></div></div>
      <p class="score-explain">${scoreExplain}</p>
    </div>
    <div class="result-section-title">💡 Recommandations</div>
    <ul class="result-advice-list">${adviceHTML}</ul>
  `;
}

// ─── LOAD GEOJSON ─────────────────────────────────────────────────────────────
fetch('data.geojson')
  .then(res => res.json())
  .then(data => {
    geoData = data;
    console.log("✅ GeoJSON chargé :", data.features.length, "établissements");

    L.geoJSON(data, {
      pointToLayer: function (feature, latlng) {
        const delta = feature.properties.delta || 0;
        const color = getColor(delta);
        return L.circleMarker(latlng, {
          radius: 9,
          fillColor: color,
          color: "#fff",
          weight: 2.5,
          fillOpacity: 0.95
        });
      },
      onEachFeature: function (feature, layer) {
        const props  = feature.properties;
        const nom    = props.nom || props.name || "École sans nom";
        const score  = props.delta || 0;
        const type   = getSchoolType(props);
        const color  = getColor(score);
        const risk   = getRisk(score);
        const addr   = [props["addr:housenumber"], props["addr:street"]].filter(Boolean).join(" ") || "Bordeaux";

        layer.bindPopup(`
          <div class="popup-name">${nom}</div>
          <div class="popup-type">${type}</div>
          <div class="popup-score">
            <span class="popup-score-num" style="color:${color}">${score}</span>
            <span style="color:#666;font-size:12px"> / 10 · ${risk.icon} ${risk.label}</span>
          </div>
        `, { maxWidth: 260 });

        layer.on('click', function () {
          displayResult(nom, addr, score, props);
          map.flyTo(layer.getLatLng(), 16, { animate: true, duration: 1.2 });
          setTimeout(syncFelt, 1300);
        });
      }
    }).addTo(map);
  })
  .catch(err => console.error("❌ Erreur chargement GeoJSON :", err));

// ─── SEARCH ──────────────────────────────────────────────────────────────────
const searchInput    = document.getElementById("search");
const suggestionsBox = document.getElementById("suggestions");

searchInput.addEventListener("input", async () => {
  const query = searchInput.value.trim();
  console.log("🔍 Recherche :", query);

  if (query.length < 2) {
    suggestionsBox.innerHTML    = "";
    suggestionsBox.style.display = "none";
    return;
  }

  suggestionsBox.style.display = "block";
  suggestionsBox.innerHTML     = `<div class="suggestion-item" style="opacity:.5;cursor:default">Recherche en cours…</div>`;

  const results = [];

  // ① Écoles du GeoJSON — recherche locale instantanée
  if (geoData) {
    const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    geoData.features.forEach(f => {
      const nom = (f.properties.nom || f.properties.name || "")
        .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (nom.includes(q)) {
        results.push({ type: "school", label: f.properties.nom || f.properties.name, feature: f });
      }
    });
    console.log("📍 Écoles trouvées localement :", results.length);
  }

  // ② API adresse.gouv.fr — geoloc Bordeaux, pas de filtre commune
  try {
    const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5&lat=44.84&lon=-0.58`;
    console.log("🌐 Appel API adresse :", url);
    const res  = await fetch(url);
    const data = await res.json();
    console.log("📦 Résultats API :", data.features.length);
    data.features.forEach(f => {
      results.push({ type: "address", label: f.properties.label, feature: f });
    });
  } catch (e) {
    console.warn("⚠️ API adresse indisponible :", e);
  }

  suggestionsBox.innerHTML = "";

  if (results.length === 0) {
    suggestionsBox.innerHTML = `<div class="suggestion-item" style="opacity:.5;cursor:default">Aucun résultat trouvé</div>`;
    return;
  }

  results.slice(0, 8).forEach(item => {
    const div   = document.createElement("div");
    div.className = "suggestion-item";
    const icon  = item.type === "school" ? "🏫" : "📍";
    const badge = item.type === "school"
      ? `<span class="sug-type school">École</span>`
      : `<span class="sug-type address">Adresse</span>`;
    div.innerHTML = `<span class="sug-icon">${icon}</span><span style="flex:1;font-size:13px">${item.label}</span>${badge}`;
    div.addEventListener("click", () => {
      if (item.type === "school") selectSchool(item.feature);
      else                        selectAddress(item.feature);
      searchInput.value          = item.label;
      suggestionsBox.style.display = "none";
    });
    suggestionsBox.appendChild(div);
  });
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-section")) suggestionsBox.style.display = "none";
});

// ─── SÉLECTIONNER UNE ÉCOLE ───────────────────────────────────────────────────
function selectSchool(feature) {
  const [lon, lat] = feature.geometry.coordinates;
  const props      = feature.properties;
  const nom        = props.nom || props.name || "École";
  const score      = props.delta || 0;
  const addr       = [props["addr:housenumber"], props["addr:street"]].filter(Boolean).join(" ") || "Bordeaux";

  map.flyTo([lat, lon], 17, { animate: true, duration: 1.4 });
  if (marker) map.removeLayer(marker);
  marker = L.marker([lat, lon]).addTo(map);
  displayResult(nom, addr, score, props);
  setTimeout(syncFelt, 1500);
}

// ─── SÉLECTIONNER UNE ADRESSE ─────────────────────────────────────────────────
function selectAddress(feature) {
  const [lon, lat] = feature.geometry.coordinates;
  const label      = feature.properties.label;

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
    displayResult(`${nom} (école la plus proche)`, label, score, props);
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
