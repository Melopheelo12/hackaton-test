console.log("JS chargé");

// INIT MAP
const map = L.map('map').setView([44.84, -0.58], 12);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap'
}).addTo(map);

let marker;
let geoData;

// LOAD GEOJSON
fetch('data.geojson')
  .then(res => res.json())
  .then(data => {
    geoData = data;

    L.geoJSON(data, {
      pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng, {
          radius: 8, // Un peu plus grand pour cliquer plus facilement
          fillColor: getColor(feature.properties.delta),
          color: "#fff",
          weight: 2,
          fillOpacity: 0.9
        });
      },
      // RENDRE LES ECOLES CLIQUABLES
      onEachFeature: function (feature, layer) {
        if (feature.properties) {
          const nom = feature.properties.nom || "École sans nom";
          const score = feature.properties.delta || 0;
          layer.bindPopup(`
            <div style="font-family: sans-serif;">
              <strong style="font-size: 14px;">${nom}</strong><br>
              <hr>
              Score de chaleur : <b>${score}/10</b>
            </div>
          `);
        }
      }
    }).addTo(map);
  });

// COLOR FUNCTION
function getColor(delta) {
  if (delta >= 7) return "#e74c3c"; // Rouge
  if (delta >= 4) return "#f39c12"; // Orange
  return "#2ecc71"; // Vert
}

// AUTOCOMPLETE (API ADRESSE FRANCE)
const searchInput = document.getElementById("search");
const suggestionsBox = document.getElementById("suggestions");
const resultBox = document.getElementById("result");

searchInput.addEventListener("input", async () => {
  const query = searchInput.value;

  if (query.length < 3) {
    suggestionsBox.innerHTML = "";
    suggestionsBox.style.display = "none";
    return;
  }

  // Utilisation de l'API Adresse (plus rapide et propre pour Bordeaux)
  const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5&citycode=33063`);
  const data = await res.json();
  
  suggestionsBox.innerHTML = "";
  suggestionsBox.style.display = "block";

  data.features.forEach(feature => {
    const div = document.createElement("div");
    div.className = "suggestion-item";
    div.textContent = feature.properties.label;
    div.onclick = () => selectPlace(feature);
    suggestionsBox.appendChild(div);
  });
});

// SELECT ADDRESS
function selectPlace(feature) {
  const [lon, lat] = feature.geometry.coordinates;
  const label = feature.properties.label;

  // NETTOYAGE
  suggestionsBox.innerHTML = "";
  suggestionsBox.style.display = "none";
  searchInput.value = label;

  // ZOOM FLUIDE
  map.flyTo([lat, lon], 17, {
    animate: true,
    duration: 1.5
  });

  if (marker) map.removeLayer(marker);
  marker = L.marker([lat, lon]).addTo(map);

  // Trouver point le plus proche
  let closest = null;
  let minDist = Infinity;

  geoData.features.forEach(f => {
    const [fLon, fLat] = f.geometry.coordinates;
    const dist = Math.sqrt(Math.pow(lat - fLat, 2) + Math.pow(lon - fLon, 2));

    if (dist < minDist) {
      minDist = dist;
      closest = f;
    }
  });

  if (closest) {
    displayResult(label, closest.properties.delta);
  }
}

function displayResult(address, score) {
  let level, cls, advice;

  if (score >= 7) {
    level = "🔴 Risque ÉLEVÉ";
    cls = "card red";
    advice = "Zone très chaude : Priorité à la désimperméabilisation et plantation massive.";
  } else if (score >= 4) {
    level = "🟠 Risque MODÉRÉ";
    cls = "card orange";
    advice = "Zone vulnérable : Prévoir des îlots de fraîcheur et végétaliser les façades.";
  } else {
    level = "🟢 Risque FAIBLE";
    cls = "card green";
    advice = "Zone protégée : Maintenir la canopée existante.";
  }

  resultBox.className = cls;
  resultBox.innerHTML = `
    <strong>📍 Adresse :</strong><br>${address}<br><br>
    <strong>📊 Score :</strong> ${score}/10<br>
    <strong>🌡️ Niveau :</strong> ${level}<br><br>
    <strong>💡 Conseil :</strong><br>${advice}
  `;
}

// LEGEND
function toggleLegend() {
  document.getElementById("legend").classList.toggle("active");
}
