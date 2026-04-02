console.log("✅ Script chargé");

// ─── INIT MAP ────────────────────────────────────────────────────────────────
const map = L.map('map', { zoomControl: false }).setView([44.84, -0.58], 12);
L.control.zoom({ position: 'bottomright' }).addTo(map);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; CARTO', maxZoom: 19, opacity: 0
}).addTo(map);

let marker;
let geoData;

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function getColor(d) {
  return d >= 7 ? "#e74c3c" : d >= 4 ? "#f39c12" : "#2ecc71";
}

function getScoreClass(d) {
  return d >= 7 ? "score-red" : d >= 4 ? "score-orange" : "score-green";
}

function getSchoolType(props) {
  const a = props.amenity || "", s = props["school:FR"] || "";
  if (a === "kindergarten")                                 return "Creche / Maternelle";
  if (s.includes("lycée"))                                  return "Lycée";
  if (s.includes("collège"))                                return "Collège";
  if (s.includes("maternelle"))                             return "École maternelle";
  if (s.includes("élémentaire") || s.includes("primaire")) return "École primaire";
  return "Établissement";
}

function getOperatorLabel(props) {
  const op = props["operator:type"] || "";
  if (op === "public")  return "Public";
  if (op === "private") return "Privé";
  return null;
}

function getBarometre(score) {
  if (score >= 7) return { icon: "🔴", label: "ROUGE — Urgence",    color: "#dc2626", bg: "#fff5f5", border: "#fca5a5" };
  if (score >= 4) return { icon: "🟠", label: "ORANGE — Vigilance", color: "#d97706", bg: "#fffbeb", border: "#fcd34d" };
  return              { icon: "🟢", label: "VERT — Protection",  color: "#16a34a", bg: "#f0fdf4", border: "#86efac" };
}

function getRecommandations(score) {
  if (score >= 7) return {
    decideurs: ["DÉCROUTAGE : Retrait de 50% de l'asphalte.","STABILISATION RGA : Noues d'infiltration pour hydrater l'argile.","MICRO-FORÊT : Plantation Miyawaki (3 arbres/m²).","COOL ROOF : Revêtement blanc réflectif sur les toits.","SOLS VIVANTS : Pavés enherbés en remplacement du bitume.","OMBRE BIOCLIMATIQUE : Pergolas végétalisées.","RÉSERVES HYDRIQUES : Cuves de 10m3 pour le déficit hydrique."],
    ecole:     ["RYTHME : Récréations matinales, salles fraîches l'après-midi.","OYATS : Jarres d'irrigation enterrées stabilisant l'argile.","PAILLAGE : 15cm de broyat bois contre la rétractation.","EAUX GRISES : Lavabos pour humidifier les fondations.","FREE-COOLING : Ventilation nocturne forcée (3h-6h).","BASSINAGE : Humidifier les feuillages à 11h.","AMBASSADEURS : Élèves responsables du suivi de l'humidité."],
    familles:  ["RASSURANCE : Bulletin Confort pour les familles.","VENTURI : Humidifier les avant-bras pour refroidir le sang.","DRESS-CODE : Fibres naturelles, casquette, nuque couverte.","HYDRATATION : Petite gorgée toutes les 20 min.","SLOW MOTION : Ralentir les jeux.","RÉCUPÉRATION : Douche tiède au retour.","VIGILANCE : Urines foncées = déshydratation."],
    citoyens:  ["HALTE FRAÎCHEUR : Ouvrir la cour aux seniors.","SIGNALÉTIQUE : Panneaux lien végétal et bâtiments.","DATA-PARTAGE : QR Code score thermique.","CHANTIER : Riverains dans les plantations.","ARROSAGE : Réseau de voisins vacances.","ECO-CIVISME : Campagne Moteur Coupé.","HUB : École modèle de résilience argile."]
  };
  if (score >= 4) return {
    decideurs: ["Albédo clair sur les revêtements.","Murs de lierre sur les façades.","Puits perdus pour les eaux pluviales.","Bancs en pierre naturelle.","Sondes humidité dans les sols argileux.","Voiles d'ombrage sur les cours.","Noues drainantes le long des bâtiments."],
    ecole:     ["Classe dehors sous les arbres.","Bassinage des feuillages avant récréation.","Oyats : jarres d'irrigation enterrées.","Collecte eaux des gourdes pour arroser.","Ateliers eau sur les cycles naturels.","Stores fermés dès 8h côté soleil.","Ventilation des salles pendant les pauses."],
    familles:  ["Crème solaire adaptée à l'indice UV.","Chemin de l'ombre jusqu'à l'école.","Douche tiède au retour.","Fermer les volets côté soleil.","Moment calme après l'école.","Eau à température ambiante.","Chapeau pour les sorties."],
    citoyens:  ["Végétaliser les balcons et façades.","Challenge Zéro Bitume.","Guide fraîcheur dans les boîtes.","Fête nature dans la cour.","Brigade voisins pour arrosage.","Information risques RGA.","Solidarité avec les seniors isolés."]
  };
  return {
    decideurs: ["PÉRENNISATION : Taille douce des arbres.","SOLS : Compost régulier pour l'humidité.","BIODIVERSITÉ : Nichoirs et hôtels à insectes.","VEILLE BÂTI : Inspection annuelle des fondations.","OPTIMISATION : Récupérateurs d'eau de pluie.","CONNECTIVITÉ : Passages pour la petite faune.","MATÉRIAUX : Remplacer les éléments sombres par tons clairs."],
    ecole:     ["ÉCOLE DE LA FORÊT : Cours en extérieur.","JARDINAGE : Potager avec les enfants.","GESTION EAU : Systèmes d'irrigation économes.","TRI : Compostage des déchets de cantine.","OBSERVATION : Relever les températures.","PARTAGE : Accueillir des classes de zones Rouges.","ARCHIVAGE : Carnet de santé de chaque arbre."],
    familles:  ["ÉDUCATION : Bons réflexes comme habitudes.","NATURE : Sorties en famille dans les parcs.","ECO-GESTE : Économie d'eau domestique.","MOBILITÉ : Vélo ou marche à l'ombre.","BIEN-ÊTRE : Impact de la verdure sur la concentration.","PARTICIPATION : Association des parents.","SANTÉ : Vigilance hydratation même par temps agréable."],
    citoyens:  ["VITRINE : École comme lieu de visite.","INSPIRATION : Copier les essences résilientes.","RÉSEAU : Trame Verte de Bordeaux Métropole.","FIERTÉ : Valoriser les agents d'entretien.","PARTAGE : Graines aux habitants.","VEILLE : Signaler fuites et dépérissements.","ÉVÈNEMENT : Nuit de la Fraîcheur biodiversité."]
  };
}

// ─── SECTIONS REPLIABLES — sécurisé ──────────────────────────────────────────
function setupToggle(headerId, containerId, chevronId) {
  const header    = document.getElementById(headerId);
  const container = document.getElementById(containerId);
  const chevron   = document.getElementById(chevronId);

  if (!header || !container || !chevron) {
    console.warn("setupToggle: élément manquant", headerId, containerId, chevronId);
    return;
  }

  let open = true;
  header.addEventListener("click", () => {
    open = !open;
    container.classList.toggle("collapsed", !open);
    chevron.classList.toggle("collapsed", !open);
  });
}

// Attendre que le DOM soit prêt
document.addEventListener("DOMContentLoaded", () => {
  setupToggle("toggle-schools", "school-list-container", "chevron-schools");
  setupToggle("toggle-legend",  "legend-container",      "chevron-legend");
  setupToggle("toggle-diag",    "diag-container",        "chevron-diag");

  // Bouton rechercher
  const btnRechercher = document.getElementById("btn-rechercher");
  if (btnRechercher) {
    btnRechercher.addEventListener("click", () => {
      if (!geoData) return;
      const query  = (document.getElementById("search").value || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const filter = document.getElementById("filter-type").value;

      const filtered = geoData.features.filter(f => {
        const nom = (f.properties.nom || f.properties.name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const op  = f.properties["operator:type"] || "";
        const matchNom    = query === "" || nom.includes(query);
        const matchFilter = filter === "tous"
          || (filter === "public" && op === "public")
          || (filter === "prive"  && op === "private");
        return matchNom && matchFilter;
      });

      buildSchoolList(filtered);
      const slc = document.getElementById("school-list-container");
      const chv = document.getElementById("chevron-schools");
      if (slc) slc.classList.remove("collapsed");
      if (chv) chv.classList.remove("collapsed");
    });
  }
});

// ─── AFFICHER DIAGNOSTIC ──────────────────────────────────────────────────────
function showDiagnostic(name, address, score, props) {
  const container = document.getElementById("diag-container");
  if (!container) return;

  const baro  = getBarometre(score);
  const pct   = Math.round((score / 10) * 100);
  const type  = props ? getSchoolType(props) : "";
  const op    = props ? getOperatorLabel(props) : null;
  const email = props && props.email   ? props.email   : null;
  const web   = props && props.website ? props.website : null;
  const reco  = getRecommandations(score);

  const scoreExplain = score >= 7
    ? "Établissement fortement exposé à la chaleur urbaine. Îlot de chaleur actif, surfaces imperméables, risque argile potentiel."
    : score >= 4
    ? "Exposition intermédiaire. Des améliorations ciblées réduiront significativement le risque."
    : "Zone Oasis végétalisée et fraîche. A préserver et valoriser comme modèle.";

  const tabs = [
    { key: "decideurs", label: "Decideurs", items: reco.decideurs },
    { key: "ecole",     label: "École",     items: reco.ecole     },
    { key: "familles",  label: "Familles",  items: reco.familles  },
    { key: "citoyens",  label: "Citoyens",  items: reco.citoyens  },
  ];

  const tabHeaders  = tabs.map((t, i) => `<button class="tab-btn ${i===0?"active":""}" data-tab="${t.key}">${t.label}</button>`).join("");
  const tabContents = tabs.map((t, i) => `
    <div class="tab-content ${i===0?"active":""}" id="dtab-${t.key}">
      <ol class="reco-list">
        ${t.items.map(item => {
          const parts = item.split(" : ");
          return parts.length > 1
            ? `<li><strong>${parts[0]}</strong> : ${parts.slice(1).join(" : ")}</li>`
            : `<li>${item}</li>`;
        }).join("")}
      </ol>
    </div>`).join("");

  container.innerHTML = `
    <div class="info-school">${name}</div>
    <div class="info-meta">
      ${type ? `<span class="meta-badge type">${type}</span>` : ""}
      ${op   ? `<span class="meta-badge op">${op}</span>`    : ""}
    </div>
    <div class="info-address">📍 ${address}</div>
    ${(email||web) ? `<div class="info-contact">
      ${email ? `<a href="mailto:${email}" class="contact-link">✉️ ${email}</a>` : ""}
      ${web   ? `<a href="${web}" target="_blank" class="contact-link">Site web</a>` : ""}
    </div>` : ""}
    <div class="info-score-block" style="background:${baro.bg};border:1px solid ${baro.border}">
      <div class="info-score-top">
        <span class="score-big" style="color:${baro.color}">${score}<span class="score-denom">/10</span></span>
        <div class="score-info">
          <span class="score-level">${baro.icon} ${baro.label}</span>
          <span class="score-sub">Indice exposition chaleur urbaine</span>
        </div>
      </div>
      <div class="score-bar"><div class="score-bar-fill" style="width:${pct}%;background:${baro.color}"></div></div>
      <p class="score-explain">${scoreExplain}</p>
    </div>
    <div class="reco-section">
      <div class="reco-title">Recommandations par public</div>
      <div class="tab-bar">${tabHeaders}</div>
      <div class="tab-body">${tabContents}</div>
    </div>`;

  container.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      container.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      container.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      const tc = container.querySelector(`#dtab-${btn.dataset.tab}`);
      if (tc) tc.classList.add("active");
    });
  });

  // Ouvrir section diagnostic
  const diagContainer = document.getElementById("diag-container");
  const chevDiag      = document.getElementById("chevron-diag");
  if (diagContainer) diagContainer.classList.remove("collapsed");
  if (chevDiag)      chevDiag.classList.remove("collapsed");
}

// ─── LISTE D'ÉCOLES ───────────────────────────────────────────────────────────
function buildSchoolList(features) {
  const list = document.getElementById("school-list");
  if (!list) return;
  list.innerHTML = "";

  if (!features || features.length === 0) {
    list.innerHTML = `<div class="school-empty">Aucune école trouvée.</div>`;
    return;
  }

  features.forEach(f => {
    const props = f.properties;
    const nom   = props.nom || props.name || "École sans nom";
    const score = props.delta || 0;
    const color = getColor(score);
    const cls   = getScoreClass(score);
    const slabel = score >= 7 ? "Rouge" : score >= 4 ? "Moyen" : "Vert";

    const item = document.createElement("div");
    item.className = "school-item";
    item.innerHTML = `
      <div class="school-dot" style="background:${color}"></div>
      <span class="school-name">${nom}</span>
      <span class="school-score ${cls}">${slabel} ${score}/10</span>`;

    item.addEventListener("click", () => {
      const [lon, lat] = f.geometry.coordinates;
      const addr = [props["addr:housenumber"], props["addr:street"]].filter(Boolean).join(" ") || "Bordeaux";
      map.flyTo([lat, lon], 16, { animate: true, duration: 1.2 });
      showDiagnostic(nom, addr, score, props);
      setTimeout(syncFelt, 1300);
    });

    list.appendChild(item);
  });
}

// ─── LOAD GEOJSON ─────────────────────────────────────────────────────────────
fetch('data.geojson')
  .then(r => r.json())
  .then(data => {
    geoData = data;
    console.log("✅ GeoJSON :", data.features.length, "établissements");
    buildSchoolList(data.features);

    L.geoJSON(data, {
      pointToLayer: (feature, latlng) => {
        const color = getColor(feature.properties.delta || 0);
        return L.circleMarker(latlng, { radius: 9, fillColor: color, color: "#fff", weight: 2.5, fillOpacity: 0.95 });
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties;
        const nom   = props.nom || props.name || "École";
        const score = props.delta || 0;
        const addr  = [props["addr:housenumber"], props["addr:street"]].filter(Boolean).join(" ") || "Bordeaux";

        layer.on("click", () => {
          showDiagnostic(nom, addr, score, props);
          map.flyTo(layer.getLatLng(), 16, { animate: true, duration: 1.2 });
          setTimeout(syncFelt, 1300);
        });
      }
    }).addTo(map);
  })
  .catch(e => console.error("❌ GeoJSON :", e));

// ─── SEARCH LIVE ─────────────────────────────────────────────────────────────
const searchInput    = document.getElementById("search");
const suggestionsBox = document.getElementById("suggestions");

if (searchInput) {
  searchInput.addEventListener("input", async () => {
    const query = searchInput.value.trim();
    if (query.length < 2) { suggestionsBox.style.display = "none"; return; }
    suggestionsBox.style.display = "block";
    suggestionsBox.innerHTML = `<div class="suggestion-item" style="opacity:.5;cursor:default">Recherche...</div>`;

    const results = [];
    if (geoData) {
      const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      geoData.features.forEach(f => {
        const nom = (f.properties.nom || f.properties.name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (nom.includes(q)) results.push({ type: "school", label: f.properties.nom || f.properties.name, feature: f });
      });
    }
    try {
      const res  = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=4&lat=44.84&lon=-0.58`);
      const data = await res.json();
      data.features.forEach(f => results.push({ type: "address", label: f.properties.label, feature: f }));
    } catch(e) { console.warn("API adresse:", e); }

    suggestionsBox.innerHTML = "";
    if (!results.length) {
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
        if (item.type === "school") {
          const f     = item.feature;
          const props = f.properties;
          const [lon, lat] = f.geometry.coordinates;
          const nom   = props.nom || props.name || "École";
          const score = props.delta || 0;
          const addr  = [props["addr:housenumber"], props["addr:street"]].filter(Boolean).join(" ") || "Bordeaux";
          map.flyTo([lat, lon], 17, { animate: true, duration: 1.4 });
          showDiagnostic(nom, addr, score, props);
          setTimeout(syncFelt, 1500);
        } else {
          const [lon, lat] = item.feature.geometry.coordinates;
          map.flyTo([lat, lon], 17, { animate: true, duration: 1.4 });
          setTimeout(syncFelt, 1500);
        }
        searchInput.value = item.label;
        suggestionsBox.style.display = "none";
      });
      suggestionsBox.appendChild(div);
    });
  });
}

document.addEventListener("click", e => {
  if (suggestionsBox && !e.target.closest(".search-section")) suggestionsBox.style.display = "none";
});

// ─── SYNC FELT ────────────────────────────────────────────────────────────────
const feltLayer = document.getElementById("felt-layer");

function syncFelt() {
  if (!feltLayer) return;
  const c = map.getCenter(), z = map.getZoom();
  feltLayer.src = `https://felt.com/embed/map/Untitled-Map-trd59Cqj4RuKu8WX9Cw2eYCD?loc=${c.lat.toFixed(5)},${c.lng.toFixed(5)},${z.toFixed(2)}z&legend=0&link=1&geolocation=0&cooperativeGestures=1`;
}

map.on("moveend", syncFelt);
map.on("zoomend", syncFelt);
