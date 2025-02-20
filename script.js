let map;
let markers = [];
let locationList = [];

// Initialize the map
function initMap() {
  // Initialize the map with a starting position and zoom level
  map = L.map('map').setView([39.8283, -98.5795], 4);  // Center of the US
  
  // Use OpenStreetMap tiles for the map background
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  // Hide the location form and location list initially
  const locationForm = document.getElementById('location-form');
  locationForm.style.display = 'none';

  const locationListContainer = document.getElementById('location-list-container');
  locationListContainer.style.display = 'none';

  // Listen for right-click event on the map
  map.on('contextmenu', function (e) {
    const locationForm = document.getElementById('location-form');
    const locationListContainer = document.getElementById('location-list-container');

    // Show the form and location list at the location of the right-click
    locationForm.style.display = 'block';
    locationListContainer.style.display = 'block';
    locationForm.style.position = 'absolute';
    locationListContainer.style.position = 'absolute';
    locationForm.style.left = `${e.containerPoint.x}px`;
    locationForm.style.top = `${e.containerPoint.y + 10}px`;
    locationListContainer.style.left = `${e.containerPoint.x}px`;
    locationListContainer.style.top = `${e.containerPoint.y + 100}px`;

    // Prevent form from closing immediately when clicking on the map
    e.originalEvent.stopPropagation();
  });

  // Listen for form submission to add new locations
  document.getElementById('location-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const locationName = document.getElementById('location-name').value;
    addLocation(locationName);
    // Hide the form after submitting
    document.getElementById('location-form').style.display = 'none';
  });

  // Close form and location list when clicking outside
  document.body.addEventListener('click', function(event) {
    const locationForm = document.getElementById('location-form');
    const locationListContainer = document.getElementById('location-list-container');
    if (
      !locationForm.contains(event.target) && 
      !locationListContainer.contains(event.target)
    ) {
      locationForm.style.display = 'none';
      locationListContainer.style.display = 'none';
    }
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
        const newMarker = placeMarker(lat, lng, title);

        // Add to location list
        locationList.push({ title, lat, lng, marker: newMarker });
        updateLocationList();

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
  marker.bindPopup(`
    <b>${title}</b><br>
    <button onclick="deleteLocation('${title}')">Delete Location</button>
  `);
  return marker;
}

// Function to delete a location
function deleteLocation(locationName) {
  // Find the location in the list and remove it
  const locationIndex = locationList.findIndex(location => location.title === locationName);
  if (locationIndex > -1) {
    const location = locationList[locationIndex];
    map.removeLayer(location.marker);  // Remove marker from map
    locationList.splice(locationIndex, 1);  // Remove from list
    updateLocationList();  // Update the displayed list
  }
}

// Function to update the location list in the UI
function updateLocationList() {
  const locationListElement = document.getElementById('location-list');
  locationListElement.innerHTML = '';  // Clear the list

  locationList.forEach(location => {
    const li = document.createElement('li');
    li.textContent = location.title;
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.onclick = () => deleteLocation(location.title);
    li.appendChild(deleteButton);
    locationListElement.appendChild(li);
  });
}

// Initialize the map
initMap();
