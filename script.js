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

    // Affichage des points
    L.geoJSON(data, {
      pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng, {
          radius: 6,
          fillColor: getColor(feature.properties.delta),
          color: "#000",
          weight: 1,
          fillOpacity: 0.8
        });
      }
    }).addTo(map);
  });

// COLOR FUNCTION
function getColor(delta) {
  if (delta >= 7) return "red";
  if (delta >= 4) return "orange";
  return "green";
}

// AUTOCOMPLETE
const searchInput = document.getElementById("search");
const suggestionsBox = document.getElementById("suggestions");
const resultBox = document.getElementById("result");

searchInput.addEventListener("input", async () => {
  const query = searchInput.value;

  if (query.length < 3) {
    suggestionsBox.innerHTML = "";
    return;
  }

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=5`,
    {
      headers: { "User-Agent": "hackathon-app" }
    }
  );

  const data = await res.json();
  suggestionsBox.innerHTML = "";

  data.forEach(place => {
    const div = document.createElement("div");
    div.textContent = place.display_name;
    div.onclick = () => selectPlace(place);
    suggestionsBox.appendChild(div);
  });
});

// SELECT ADDRESS
function selectPlace(place) {
  const lat = parseFloat(place.lat);
  const lon = parseFloat(place.lon);

  map.setView([lat, lon], 16);

  if (marker) map.removeLayer(marker);
  marker = L.marker([lat, lon]).addTo(map);

  // Trouver point le plus proche
  let closest = null;
  let minDist = Infinity;

  geoData.features.forEach(f => {
    const [lon2, lat2] = f.geometry.coordinates;

    const dist = Math.sqrt(
      Math.pow(lat - lat2, 2) + Math.pow(lon - lon2, 2)
    );

    if (dist < minDist) {
      minDist = dist;
      closest = f;
    }
  });

  const score = closest.properties.delta;

  let level, cls, advice;

  if (score >= 7) {
    level = "🔴 Risque ÉLEVÉ";
    cls = "card red";
    advice = "Zone très chaude → planter arbres, ombre, réduire béton";
  } else if (score >= 4) {
    level = "🟠 Risque MODÉRÉ";
    cls = "card orange";
    advice = "Ajouter végétation et limiter surfaces minérales";
  } else {
    level = "🟢 Risque FAIBLE";
    cls = "card green";
    advice = "Zone plutôt fraîche";
  }

  resultBox.className = cls;
  resultBox.innerHTML = `
    <strong>Adresse :</strong><br>${place.display_name}<br><br>
    <strong>Score :</strong> ${score}/10<br>
    <strong>Niveau :</strong> ${level}<br><br>
    <strong>Conseil :</strong><br>${advice}
  `;
}

// LEGEND
function toggleLegend() {
  document.getElementById("legend").classList.toggle("active");
}
