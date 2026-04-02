console.log("✅ Script chargé");

// ─── INIT MAP ────────────────────────────────────────────────────────────────
const map = L.map('map', { zoomControl: false }).setView([44.84, -0.58], 12);
L.control.zoom({ position: 'bottomright' }).addTo(map);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap &copy; CARTO', maxZoom: 19, opacity: 0
}).addTo(map);

let marker;
let geoData;

// ─── HELPERS COULEUR / TYPE ───────────────────────────────────────────────────
function getColor(delta) {
  if (delta >= 7) return "#e74c3c";
  if (delta >= 4) return "#f39c12";
  return "#2ecc71";
}

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

// ─── SCORING & BAROMÈTRE ─────────────────────────────────────────────────────
function getBarometre(score) {
  if (score >= 7) return { cls: "rouge",  icon: "🔴", label: "ROUGE — Urgence",   color: "#dc2626", bg: "#fff5f5", border: "#fca5a5" };
  if (score >= 4) return { cls: "orange", icon: "🟠", label: "ORANGE — Vigilance", color: "#d97706", bg: "#fffbeb", border: "#fcd34d" };
  return              { cls: "vert",   icon: "🟢", label: "VERT — Protection",  color: "#16a34a", bg: "#f0fdf4", border: "#86efac" };
}

// ─── RECOMMANDATIONS 7x4 ─────────────────────────────────────────────────────
function getRecommandations(score) {
  // ROUGE > 7
  if (score >= 7) return {
    decideurs: [
      "DÉCROUTAGE : Retrait de 50% de l'asphalte pour retrouver la pleine terre.",
      "STABILISATION RGA : Créer des noues d'infiltration pour hydrater l'argile et éviter les fissures.",
      "MICRO-FORÊT : Plantation 'Miyawaki' (3 arbres/m²) pour un dôme de fraîcheur naturel.",
      "COOL ROOF : Revêtement blanc réflectif sur les toits pour casser l'absorption de chaleur.",
      "SOLS VIVANTS : Pavés enherbés ou bois (matériaux à faible inertie) en remplacement du bitume.",
      "OMBRE BIOCLIMATIQUE : Pergolas végétalisées pour protéger les façades du rayonnement.",
      "RÉSERVES HYDRIQUES : Cuves de 10m³ pour compenser le déficit hydrique des sols."
    ],
    ecole: [
      "RYTHME : Récréations matinales et repli en salles fraîches l'après-midi.",
      "OYATS : Jarres d'irrigation enterrées pour un arrosage profond stabilisant l'argile.",
      "PAILLAGE : 15cm de broyat bois pour empêcher la rétractation argileuse.",
      "EAUX GRISES : Réutiliser l'eau des lavabos pour humidifier les fondations.",
      "FREE-COOLING : Ventilation nocturne forcée (3h-6h) pour évacuer les calories des murs.",
      "BASSINAGE : Humidifier les feuillages à 11h pour saturer l'air en fraîcheur.",
      "AMBASSADEURS : Élèves responsables du suivi de l'humidité et du bien-être végétal."
    ],
    familles: [
      "RASSURANCE : Bulletin 'Confort' pour apaiser l'anxiété des familles.",
      "VENTURI : Humidifier les avant-bras pour refroidir le sang circulant.",
      "DRESS-CODE : Fibres naturelles (coton/lin), casquette et nuque couverte.",
      "HYDRATATION : Gourde isotherme et protocole 'petite gorgée' toutes les 20 min.",
      "SLOW MOTION : Ralentir les jeux pour limiter la surchauffe interne.",
      "RÉCUPÉRATION : Douche tiède (30°C) au retour pour la baisse thermique.",
      "VIGILANCE : Observer les urines foncées ou l'apathie (signes de déshydratation)."
    ],
    citoyens: [
      "HALTE FRAÎCHEUR : Ouvrir la cour aux seniors isolés pendant les pics de chaleur.",
      "SIGNALÉTIQUE : Panneaux expliquant le lien entre végétal et protection des bâtiments (RGA).",
      "DATA-PARTAGE : QR Code sur le portail pour consulter le score thermique en direct.",
      "CHANTIER : Impliquer les riverains dans les plantations (lien nature-quartier).",
      "ARROSAGE : Réseau de voisins pour veiller sur le parc durant les vacances.",
      "ÉCO-CIVISME : Campagne 'Moteur Coupé' aux abords pour réduire l'ozone.",
      "HUB : Faire de l'école le modèle de résilience contre le retrait des argiles."
    ]
  };

  // ORANGE 4-7
  if (score >= 4) return {
    decideurs: [
      "Albédo clair sur les revêtements de sol.",
      "Murs de lierre pour rafraîchir les façades.",
      "Puits perdus pour infiltrer les eaux pluviales.",
      "Bancs en pierre naturelle pour limiter la réflexion thermique.",
      "Sondes d'humidité dans les sols argileux.",
      "Voiles d'ombrage sur les cours exposées au sud.",
      "Noues drainantes le long des bâtiments."
    ],
    ecole: [
      "Classe dehors : enseigner sous les arbres.",
      "Bassinage des feuillages avant les récréations.",
      "Oyats : jarres d'irrigation enterrées.",
      "Collecte des eaux des gourdes pour arroser.",
      "Ateliers eau : sensibiliser aux cycles naturels.",
      "Stores fermés dès 8h sur les façades ensoleillées.",
      "Ventilation des salles pendant les pauses."
    ],
    familles: [
      "Crème solaire adaptée à l'indice UV.",
      "Identifier le chemin de l'ombre jusqu'à l'école.",
      "Douche tiède au retour pour abaisser la température.",
      "Fermer les volets côté soleil en journée.",
      "Organiser un moment calme après l'école.",
      "Eau à température ambiante (pas glacée).",
      "Chapeau obligatoire pour les sorties."
    ],
    citoyens: [
      "Végétaliser les balcons et façades du quartier.",
      "Challenge 'Zéro Bitume' avec les riverains.",
      "Guide fraîcheur à distribuer dans les boîtes aux lettres.",
      "Fête nature dans la cour de l'école.",
      "Brigade de voisins pour l'arrosage collectif.",
      "Information sur les risques RGA (retrait-gonflement argile).",
      "Créer un lien de solidarité avec les seniors isolés."
    ]
  };

  // VERT < 4
  return {
    decideurs: [
      "PÉRENNISATION : Taille douce des arbres pour maintenir une ombre portée maximale.",
      "SOLS : Apport régulier de compost pour maintenir la porosité et l'humidité des argiles.",
      "BIODIVERSITÉ : Installation de nichoirs et d'hôtels à insectes (équilibre écosystémique).",
      "VEILLE BÂTI : Inspection annuelle des fondations pour prévenir tout micro-retrait d'argile.",
      "OPTIMISATION : Installation de récupérateurs d'eau de pluie pour l'autonomie du jardin.",
      "CONNECTIVITÉ : Créer des passages pour la petite faune entre les zones vertes.",
      "MATÉRIAUX : Remplacer progressivement les éléments sombres par des tons clairs."
    ],
    ecole: [
      "ÉCOLE DE LA FORÊT : Généraliser les cours en extérieur pour le bien-être cognitif.",
      "JARDINAGE : Entretenir le potager avec les enfants (notion de cycle de vie).",
      "GESTION EAU : Maintenance des systèmes d'irrigation économes (goutte-à-goutte).",
      "TRI : Compostage des déchets de cantine pour nourrir les sols de l'école.",
      "OBSERVATION : Relever les températures avec les élèves (effet 'Oasis').",
      "PARTAGE : Accueillir des classes de zones 'Rouges' pour des activités fraîches.",
      "ARCHIVAGE : Tenir un carnet de santé de chaque arbre (croissance, ombre)."
    ],
    familles: [
      "ÉDUCATION : Transmettre les bons réflexes comme des habitudes de vie.",
      "NATURE : Encourager les sorties en famille dans les parcs.",
      "ÉCO-GESTE : Sensibiliser à l'économie d'eau domestique.",
      "MOBILITÉ : Privilégier le vélo ou la marche à l'ombre pour venir à l'école.",
      "BIEN-ÊTRE : Noter l'impact positif de la verdure sur la concentration de l'enfant.",
      "PARTICIPATION : S'impliquer dans l'association des parents pour protéger la cour Oasis.",
      "SANTÉ : Garder une vigilance sur l'hydratation même quand le ressenti est agréable."
    ],
    citoyens: [
      "VITRINE : Faire de l'école un lieu de visite pour d'autres mairies de la Métropole.",
      "INSPIRATION : Inciter les riverains à copier les essences d'arbres résilientes.",
      "RÉSEAU : Intégrer l'école dans la 'Trame Verte' de Bordeaux Métropole.",
      "FIERTÉ : Valoriser le travail des agents d'entretien et des jardiniers de la ville.",
      "PARTAGE : Distribuer des graines issues du jardin aux habitants du quartier.",
      "VEILLE : Signaler toute fuite d'eau ou dépérissement végétal aux abords.",
      "ÉVÈNEMENT : Organiser une 'Nuit de la Fraîcheur' pour observer la biodiversité nocturne."
    ]
  };
}

// ─── AFFICHER LE PANNEAU ──────────────────────────────────────────────────────
function showInfoPanel(name, address, score, props) {
  const panel   = document.getElementById("info-panel");
  const content = document.getElementById("info-content");

  const baro  = getBarometre(score);
  const pct   = Math.round((score / 10) * 100);
  const type  = props ? getSchoolType(props) : "";
  const op    = props ? getOperatorLabel(props) : null;
  const email = props && props.email   ? props.email   : null;
  const web   = props && props.website ? props.website : null;
  const reco  = getRecommandations(score);

  const scoreExplain = score >= 7
    ? "Établissement fortement exposé à la chaleur urbaine. Îlot de chaleur actif, surfaces imperméables dominantes, risque argile potentiel."
    : score >= 4
    ? "Exposition intermédiaire. Des améliorations ciblées peuvent réduire significativement le risque thermique."
    : "Environnement végétalisé et frais. Zone 'Oasis' à préserver et à valoriser comme modèle.";

  const metaHTML = `
    <div class="info-meta">
      ${type ? `<span class="meta-badge type">${type}</span>` : ""}
      ${op   ? `<span class="meta-badge op">${op}</span>`   : ""}
    </div>`;

  const contactHTML = (email || web) ? `
    <div class="info-contact">
      ${email ? `<a href="mailto:${email}" class="contact-link">✉️ ${email}</a>` : ""}
      ${web   ? `<a href="${web}" target="_blank" class="contact-link">🌐 Site web</a>` : ""}
    </div>` : "";

  // Onglets recommandations
  const tabs = [
    { key: "decideurs", icon: "🏛️", label: "Décideurs",  items: reco.decideurs },
    { key: "ecole",     icon: "🏫", label: "École",      items: reco.ecole     },
    { key: "familles",  icon: "👨‍👩‍👧", label: "Familles",  items: reco.familles  },
    { key: "citoyens",  icon: "🌿", label: "Citoyens",   items: reco.citoyens  },
  ];

  const tabHeaders = tabs.map((t, i) =>
    `<button class="tab-btn ${i === 0 ? 'active' : ''}" data-tab="${t.key}">${t.icon} ${t.label}</button>`
  ).join("");

  const tabContents = tabs.map((t, i) => `
    <div class="tab-content ${i === 0 ? 'active' : ''}" id="tab-${t.key}">
      <ol class="reco-list">
        ${t.items.map(item => {
          const parts = item.split(' : ');
          if (parts.length > 1) {
            return `<li><strong>${parts[0]}</strong> : ${parts.slice(1).join(' : ')}</li>`;
          }
          return `<li>${item}</li>`;
        }).join("")}
      </ol>
    </div>
  `).join("");

  content.innerHTML = `
    <div class="info-school">${name}</div>
    ${metaHTML}
    <div class="info-address">📍 ${address}</div>
    ${contactHTML}

    <div class="info-score-block" style="background:${baro.bg};border:1px solid ${baro.border}">
      <div class="info-score-top">
        <span class="score-big" style="color:${baro.color}">${score}<span class="score-denom">/10</span></span>
        <div class="score-info">
          <span class="score-level">${baro.icon} ${baro.label}</span>
          <span class="score-sub">Indice d'exposition chaleur urbaine</span>
        </div>
      </div>
      <div class="score-bar"><div class="score-bar-fill" style="width:${pct}%;background:${baro.color}"></div></div>
      <p class="score-explain">${scoreExplain}</p>
    </div>

    <div class="reco-section">
      <div class="reco-title">💡 Recommandations par public</div>
      <div class="tab-bar">${tabHeaders}</div>
      <div class="tab-body">${tabContents}</div>
    </div>
  `;

  // Logique onglets
  content.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      content.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      content.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      content.querySelector(`#tab-${btn.dataset.tab}`).classList.add("active");
    });
  });

  panel.classList.remove("hidden");
}

// Fermer panneau
document.getElementById("info-close").addEventListener("click", () => {
  document.getElementById("info-panel").classList.add("hidden");
});

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
          radius: 9, fillColor: color, color: "#fff", weight: 2.5, fillOpacity: 0.95
        });
      },
      onEachFeature: function (feature, layer) {
        const props  = feature.properties;
        const nom    = props.nom || props.name || "École sans nom";
        const score  = props.delta || 0;
        const addr   = [props["addr:housenumber"], props["addr:street"]].filter(Boolean).join(" ") || "Bordeaux";

        layer.on('click', function () {
          showInfoPanel(nom, addr, score, props);
          map.flyTo(layer.getLatLng(), 16, { animate: true, duration: 1.2 });
          setTimeout(syncFelt, 1300);
        });
      }
    }).addTo(map);
  })
  .catch(err => console.error("❌ Erreur GeoJSON :", err));

// ─── SEARCH ──────────────────────────────────────────────────────────────────
const searchInput    = document.getElementById("search");
const suggestionsBox = document.getElementById("suggestions");

searchInput.addEventListener("input", async () => {
  const query = searchInput.value.trim();
  if (query.length < 2) { suggestionsBox.style.display = "none"; return; }

  suggestionsBox.style.display = "block";
  suggestionsBox.innerHTML = `<div class="suggestion-item" style="opacity:.5;cursor:default">Recherche…</div>`;

  const results = [];

  if (geoData) {
    const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    geoData.features.forEach(f => {
      const nom = (f.properties.nom || f.properties.name || "")
        .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (nom.includes(q)) results.push({ type: "school", label: f.properties.nom || f.properties.name, feature: f });
    });
  }

  try {
    const res  = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5&lat=44.84&lon=-0.58`);
    const data = await res.json();
    data.features.forEach(f => results.push({ type: "address", label: f.properties.label, feature: f }));
  } catch (e) { console.warn("API adresse :", e); }

  suggestionsBox.innerHTML = "";
  if (results.length === 0) {
    suggestionsBox.innerHTML = `<div class="suggestion-item" style="opacity:.5;cursor:default">Aucun résultat</div>`;
    return;
  }

  results.slice(0, 8).forEach(item => {
    const div = document.createElement("div");
    div.className = "suggestion-item";
    const badge = item.type === "school"
      ? `<span class="sug-type school">École</span>`
      : `<span class="sug-type address">Adresse</span>`;
    div.innerHTML = `<span class="sug-icon">${item.type === "school" ? "🏫" : "📍"}</span><span style="flex:1;font-size:13px">${item.label}</span>${badge}`;
    div.addEventListener("click", () => {
      if (item.type === "school") selectSchool(item.feature);
      else                        selectAddress(item.feature);
      searchInput.value = item.label;
      suggestionsBox.style.display = "none";
    });
    suggestionsBox.appendChild(div);
  });
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-section")) suggestionsBox.style.display = "none";
});

function selectSchool(feature) {
  const [lon, lat] = feature.geometry.coordinates;
  const props = feature.properties;
  const nom   = props.nom || props.name || "École";
  const score = props.delta || 0;
  const addr  = [props["addr:housenumber"], props["addr:street"]].filter(Boolean).join(" ") || "Bordeaux";
  map.flyTo([lat, lon], 17, { animate: true, duration: 1.4 });
  if (marker) map.removeLayer(marker);
  marker = L.marker([lat, lon]).addTo(map);
  showInfoPanel(nom, addr, score, props);
  setTimeout(syncFelt, 1500);
}

function selectAddress(feature) {
  const [lon, lat] = feature.geometry.coordinates;
  const label = feature.properties.label;
  map.flyTo([lat, lon], 17, { animate: true, duration: 1.4 });
  if (marker) map.removeLayer(marker);
  marker = L.marker([lat, lon]).addTo(map);

  let closest = null, minDist = Infinity;
  if (geoData) {
    geoData.features.forEach(f => {
      const [fLon, fLat] = f.geometry.coordinates;
      const dist = Math.hypot(lat - fLat, lon - fLon);
      if (dist < minDist) { minDist = dist; closest = f; }
    });
  }
  if (closest) {
    const props = closest.properties;
    showInfoPanel(`${props.nom || props.name || "École la plus proche"} (école la plus proche)`, label, props.delta || 0, props);
  }
  setTimeout(syncFelt, 1500);
}

// ─── SYNC FELT ────────────────────────────────────────────────────────────────
const feltLayer = document.getElementById("felt-layer");
function syncFelt() {
  const c = map.getCenter(), z = map.getZoom();
  feltLayer.src = `https://felt.com/embed/map/Untitled-Map-trd59Cqj4RuKu8WX9Cw2eYCD?loc=${c.lat.toFixed(5)},${c.lng.toFixed(5)},${z.toFixed(2)}z&legend=0&link=1&geolocation=0&cooperativeGestures=1`;
}
map.on('moveend', syncFelt);
map.on('zoomend', syncFelt);
