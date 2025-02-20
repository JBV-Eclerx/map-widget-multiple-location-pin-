let map;
let markers = [];

// Dummy Locations (Predefined pins on the map)
const locations = [
  {lat: 40.748817, lng: -73.985428, title: 'New York'},
  {lat: 34.052235, lng: -118.243683, title: 'Los Angeles'},
  {lat: 51.5074, lng: -0.1278, title: 'London'},
  {lat: 48.8566, lng: 2.3522, title: 'Paris'}
];

function initMap() {
  // Initialize the map with a starting position and zoom level
  map = L.map('map').setView([39.8283, -98.5795], 4);  // Center of the US
  
  // Use OpenStreetMap tiles for the map background
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  // Place predefined markers on the map
  locations.forEach(location => {
    placeMarker(location.lat, location.lng, location.title);
  });

  // Listen for form submission to add new locations
  document.getElementById('location-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const locationName = document.getElementById('location-name').value;
    addLocation(locationName);
  });
}

// Function to add a location based on name (city)
function addLocation(locationName) {
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${locationName}`)
    .then(response => response.json())
    .then(data => {
      if (data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        const title = locationName;

        // Place the new marker
        placeMarker(lat, lng, title);
      } else {
        alert('Location not found!');
      }
    })
    .catch(error => {
      console.error('Error fetching geolocation data:', error);
    });
}

// Function to place a marker on the map
function placeMarker(lat, lng, title) {
  const marker = L.marker([lat, lng]).addTo(map);
  marker.bindPopup(title);
  markers.push(marker);
}

// Initialize the map
initMap();
