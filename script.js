const mapContainer = document.querySelector('.map-container');
const svgContainer = document.getElementById('svg-container');
const locationForm = document.querySelector('.location-form');
const deleteConfirm = document.querySelector('.delete-confirm');
const pinSizeRange = document.getElementById('pin-size');
const pinSizeDisplay = document.getElementById('pin-size-display');
const customPinSizeInput = document.getElementById('custom-pin-size');
const coordinatesDisplay = document.getElementById('coordinates-display');
const showCoordinatesToggle = document.getElementById('show-coordinates');

let locations = [];
let currentClickPos = { x: 0, y: 0 };
let locationToDelete = null;
let svgPoint = null;
let pins = {
    style1: '',
    style2: '',
    style3: '',
    style4: ''
};

// Predefined locations with coordinates
const predefinedLocations = [
    { id: 'sydney', name: 'Sydney', x: 335, y: 235, symbol: 'style1', color: '#FF4444', size: 24 },
    { id: 'melbourne', name: 'Melbourne', x: 295, y: 265, symbol: 'style2', color: '#4444FF', size: 24 },
    { id: 'brisbane', name: 'Brisbane', x: 345, y: 190, symbol: 'style3', color: '#44FF44', size: 24 },
    { id: 'perth', name: 'Perth', x: 90, y: 215, symbol: 'style4', color: '#FFAA44', size: 24 },
    { id: 'adelaide', name: 'Adelaide', x: 245, y: 240, symbol: 'style1', color: '#AA44FF', size: 24 },
    { id: 'darwin', name: 'Darwin', x: 220, y: 95, symbol: 'style2', color: '#FF44AA', size: 24 },
    { id: 'hobart', name: 'Hobart', x: 295, y: 310, symbol: 'style3', color: '#44FFFF', size: 24 },
    { id: 'canberra', name: 'Canberra', x: 320, y: 245, symbol: 'style4', color: '#FFFF44', size: 24 }
];

// Flag to track if showing coordinates is enabled
let showCoordinates = false;

// Store initial map width and height
let initialMapWidth = mapContainer.offsetWidth;
let initialMapHeight = mapContainer.offsetHeight;

// Load all SVGs
Promise.all([
    fetch('australia.svg').then(response => response.text()),
    fetch('pin_style_1.svg').then(response => response.text()),
    fetch('pin_style_2.svg').then(response => response.text()),
    fetch('pin_style_3.svg').then(response => response.text()),
    fetch('pin_style_4.svg').then(response => response.text())
]).then(([mapSvg, pin1, pin2, pin3, pin4]) => {
    svgContainer.innerHTML = mapSvg;
    pins.style1 = pin1;
    pins.style2 = pin2;
    pins.style3 = pin3;
    pins.style4 = pin4;

    const svg = svgContainer.querySelector('svg');
    svgPoint = svg.createSVGPoint();

    // Set the SVG viewBox for scaling
    const viewBox = svg.getAttribute('viewBox');
    if (!viewBox) {
        const bbox = svg.getBBox();
        svg.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
    }

    // Initialize map color
    const colorPicker = document.getElementById('map-color');
    const paths = svg.querySelectorAll('path');
    paths.forEach(path => {
        path.style.fill = colorPicker.value;
    });

    // Add color change listener
    colorPicker.addEventListener('input', (e) => {
        paths.forEach(path => {
            path.style.fill = e.target.value;
        });
    });

    // Set up coordinate display on hover
    svg.addEventListener('mousemove', showMouseCoordinates);
    
    // Generate the predefined locations list
    updatePredefinedLocationsList();
    
    // Move predefined locations container to the top of the map container
    const predefinedLocations = document.querySelector('.predefined-locations');
    if (predefinedLocations) {
        mapContainer.insertBefore(predefinedLocations, mapContainer.firstChild);
    }
    
    // Add "Edit Mode" label to the top
    const editModeLabel = document.createElement('div');
    editModeLabel.className = 'edit-mode-label';
    editModeLabel.innerText = 'Edit Mode';
    mapContainer.insertBefore(editModeLabel, mapContainer.firstChild);
});

function showMouseCoordinates(event) {
    if (!showCoordinates) {
        coordinatesDisplay.style.display = 'none';
        return;
    }
    
    const position = getClickPosition(event);
    coordinatesDisplay.textContent = `X: ${Math.round(position.x)}, Y: ${Math.round(position.y)}`;
    coordinatesDisplay.style.display = 'block';
    coordinatesDisplay.style.left = `${event.clientX + 10}px`;
    coordinatesDisplay.style.top = `${event.clientY + 10}px`;
}

// Toggle coordinates display
function toggleCoordinatesDisplay() {
    showCoordinates = showCoordinatesToggle.checked;
    if (!showCoordinates) {
        coordinatesDisplay.style.display = 'none';
    }
}

function getClickPosition(event) {
    const svg = svgContainer.querySelector('svg');
    const rect = svg.getBoundingClientRect();

    svgPoint.x = event.clientX - rect.left;
    svgPoint.y = event.clientY - rect.top;

    return {
        x: svgPoint.x,
        y: svgPoint.y
    };
}

function addPin(location) {
    const pin = document.createElement('div');
    pin.className = 'location-pin';
    pin.title = location.name;
    pin.dataset.id = location.id;

    // Calculate relative positions (percentages) based on initial size
    location.xPercentage = location.x / initialMapWidth;
    location.yPercentage = location.y / initialMapHeight;

    // Set the initial pin position using the current width and height
    pin.style.left = `${location.x}px`;
    pin.style.top = `${location.y}px`;

    // Create container for the SVG pin
    const svgContainer = document.createElement('div');
    svgContainer.className = 'pin-svg-container';
    
    // Get the appropriate SVG content based on the selected style
    let pinSvg = pins[location.symbol];
    
    // Replace the fill color in the SVG
    pinSvg = pinSvg.replace(/fill="[^"]*"/g, `fill="${location.color}"`);
    
    // Set the SVG with the selected size
    svgContainer.innerHTML = pinSvg;
    svgContainer.style.width = `${location.size || 24}px`;
    svgContainer.style.height = `${location.size || 24}px`;

    pin.appendChild(svgContainer);
    
    // Add resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'pin-resize-handle';
    pin.appendChild(resizeHandle);

    // Add resize functionality
    let isResizing = false;
    let startSize = 0;
    let startY = 0;

    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startSize = parseInt(svgContainer.style.width);
        startY = e.clientY;
        e.stopPropagation();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;

        const diff = startY - e.clientY;
        // Apply the new size with a limit of 12px min and 200px max
        const newSize = Math.max(12, Math.min(200, startSize + diff));

        svgContainer.style.width = `${newSize}px`;
        svgContainer.style.height = `${newSize}px`;

        // Update location object with new size
        const locationObj = locations.find(loc => loc.id === pin.dataset.id);
        if (locationObj) {
            locationObj.size = newSize;
        }
    });

    document.addEventListener('mouseup', () => {
        isResizing = false;
    });

    mapContainer.appendChild(pin);
}

mapContainer.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    currentClickPos = getClickPosition(e);

    locationForm.style.display = 'block';
    locationForm.style.left = `${e.clientX}px`;
    locationForm.style.top = `${e.clientY}px`;

    // Keep form within viewport
    const rect = locationForm.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
        locationForm.style.left = `${window.innerWidth - rect.width - 10}px`;
    }
    if (rect.bottom > window.innerHeight) {
        locationForm.style.top = `${window.innerHeight - rect.height - 10}px`;
    }
    
    // Set the coordinates in the form
    document.getElementById('location-x').value = Math.round(currentClickPos.x);
    document.getElementById('location-y').value = Math.round(currentClickPos.y);
});

function addLocation() {
    const nameInput = document.getElementById('location-name');
    const name = nameInput.value.trim();
    const symbol = document.getElementById('symbol-select').value;
    const symbolColor = document.getElementById('symbol-color').value;
    const pinSize = document.getElementById('pin-size').value;
    const xCoord = parseInt(document.getElementById('location-x').value);
    const yCoord = parseInt(document.getElementById('location-y').value);

    if (name === '') {
        alert('Please enter a location name');
        return;
    }

    // Check if name matches a predefined location
    const predefinedLocation = predefinedLocations.find(loc => 
        loc.name.toLowerCase() === name.toLowerCase()
    );
    
    if (predefinedLocation) {
        // Show confirmation dialog to use predefined coordinates
        if (confirm(`"${name}" is a predefined location. Would you like to use the predefined coordinates instead?`)) {
            // Use predefined location details
            const location = {
                id: Date.now().toString(),
                name: predefinedLocation.name,
                x: predefinedLocation.x,
                y: predefinedLocation.y,
                symbol: symbol,
                color: symbolColor,
                size: pinSize
            };
            
            locations.push(location);
            addPin(location);
            updateLocationList();
            nameInput.value = '';
            hideForm();
            return;
        }
    }

    // Use custom coordinates if provided, otherwise use the click position
    const x = !isNaN(xCoord) ? xCoord : currentClickPos.x;
    const y = !isNaN(yCoord) ? yCoord : currentClickPos.y;

    const location = {
        id: Date.now().toString(),
        name: name,
        x: x,
        y: y,
        symbol: symbol,
        color: symbolColor,
        size: pinSize
    };

    locations.push(location);
    addPin(location);
    updateLocationList();
    nameInput.value = '';
    hideForm();
}

// Function to add a predefined location
function addPredefinedLocation(locationId) {
    const predefined = predefinedLocations.find(loc => loc.id === locationId);
    
    if (predefined) {
        // Check if location already exists to avoid duplicates
        const exists = locations.some(loc => 
            loc.name === predefined.name && 
            Math.abs(loc.x - predefined.x) < 5 && 
            Math.abs(loc.y - predefined.y) < 5
        );
        
        if (!exists) {
            // Create a deep copy and assign a unique ID
            const location = {
                ...predefined,
                id: Date.now().toString()
            };
            
            locations.push(location);
            addPin(location);
            updateLocationList();
        } else {
            alert(`${predefined.name} is already on the map!`);
        }
    }
}

function updatePredefinedLocationsList() {
    const list = document.getElementById('predefined-locations-list');
    if (!list) return;
    
    list.innerHTML = '';
    
    predefinedLocations.forEach(location => {
        const item = document.createElement('div');
        item.className = 'predefined-location-item';
        
        let pinSvg = pins[location.symbol];
        pinSvg = pinSvg.replace(/fill="[^"]*"/g, `fill="${location.color}"`);
        
        item.innerHTML = `
            <span class="pin-option">
                <span class="pin-icon" style="width: 24px; height: 24px; display: inline-block;">${pinSvg}</span>
                ${location.name}
            </span>
            <button class="add-btn" onclick="addPredefinedLocation('${location.id}')">Add</button>
        `;
        list.appendChild(item);
    });
}

function updateLocationList() {
    const list = document.getElementById('location-list');
    list.innerHTML = '';

    locations.forEach(location => {
        const item = document.createElement('div');
        item.className = 'location-item';

        let pinSvg = pins[location.symbol];
        pinSvg = pinSvg.replace(/fill="[^"]*"/g, `fill="${location.color}"`);

        item.innerHTML = `
            <span class="pin-option">
                <span class="pin-icon" style="width: 24px; height: 24px; display: inline-block;">${pinSvg}</span>
                ${location.name}
            </span>
            <button class="delete-btn" onclick="showDeleteConfirm('${location.id}')">Delete</button>
        `;
        list.appendChild(item);
    });
}

function showDeleteConfirm(id) {
    locationToDelete = id;
    deleteConfirm.style.display = 'block';
}

function confirmDelete() {
    if (locationToDelete !== null) {
        const pin = document.querySelector(`.location-pin[data-id="${locationToDelete}"]`);
        if (pin) pin.remove();

        locations = locations.filter(loc => loc.id !== locationToDelete);

        updateLocationList();
        deleteConfirm.style.display = 'none';
        locationToDelete = null;
    }
}

function cancelDelete() {
    deleteConfirm.style.display = 'none';
    locationToDelete = null;
}

function hideForm() {
    locationForm.style.display = 'none';
}

document.addEventListener('click', (e) => {
    if (!locationForm.contains(e.target) && 
        !deleteConfirm.contains(e.target) && 
        !e.target.classList.contains('location-pin')) {
        locationForm.style.display = 'none';
    }
});

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('location-pin')) {
        e.stopPropagation();
    }
});

// Resizing functionality for the map container and the SVG with perfect scaling
const resizer = document.querySelector('.resizer');
let isResizing = false;

resizer.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isResizing = true;
    document.addEventListener('mousemove', handlePerfectResize);
    document.addEventListener('mouseup', () => {
        isResizing = false;
        document.removeEventListener('mousemove', handlePerfectResize);
    });
});

function handlePerfectResize(e) {
    if (isResizing) {
        const rect = mapContainer.getBoundingClientRect();
        const width = e.clientX - rect.left;
        const height = e.clientY - rect.top;

        // Ensure the aspect ratio is preserved during resizing
        const aspectRatio = initialMapWidth / initialMapHeight;
        const newHeight = Math.min(height, width / aspectRatio);
        const newWidth = newHeight * aspectRatio;

        // Update the size of the map container
        mapContainer.style.width = `${newWidth}px`;
        mapContainer.style.height = `${newHeight}px`;

        // Update the SVG container size
        svgContainer.style.width = `${newWidth}px`;
        svgContainer.style.height = `${newHeight}px`;

        // Resize the SVG content within the container to fit the new size
        const svg = svgContainer.querySelector('svg');
        svg.setAttribute('width', `${newWidth}px`);
        svg.setAttribute('height', `${newHeight}px`);

        // Update pin positions based on the new size
        updatePinPositions();

        // Update the initial map size for future reference
        initialMapWidth = newWidth;
        initialMapHeight = newHeight;
    }
}

function updatePinPositions() {
    // Update each pin position based on the new size of the map container
    const pins = document.querySelectorAll('.location-pin');
    pins.forEach(pin => {
        const locationId = pin.dataset.id;
        const location = locations.find(loc => loc.id === locationId);

        if (location) {
            // Calculate new positions based on the new size of the map
            const newX = location.xPercentage * initialMapWidth;
            const newY = location.yPercentage * initialMapHeight;

            pin.style.left = `${newX}px`;
            pin.style.top = `${newY}px`;

            // Update the size of the pin based on its current size
            const svgContainer = pin.querySelector('.pin-svg-container');
            svgContainer.style.width = `${location.size || 24}px`;
            svgContainer.style.height = `${location.size || 24}px`;
        }
    });
}

// Update pin size display dynamically as the range is adjusted
pinSizeRange.addEventListener('input', (e) => {
    const pinSize = e.target.value;
    pinSizeDisplay.textContent = `${pinSize}px`; // Update the label to show the current size
    customPinSizeInput.value = pinSize; // Sync the number input value with the range
});

// Allow the user to enter a custom pin size via the number input
customPinSizeInput.addEventListener('input', (e) => {
    const customSize = e.target.value;
    if (customSize >= 12 && customSize <= 200) {
        pinSizeRange.value = customSize; // Sync the range slider with the custom input
        pinSizeDisplay.textContent = `${customSize}px`; // Update the label with the custom size
    }
});

// Add event listener for coordinates toggle
if (showCoordinatesToggle) {
    showCoordinatesToggle.addEventListener('change', toggleCoordinatesDisplay);
}
// Add this to your script.js file to handle the predefined locations panel toggle

document.addEventListener('DOMContentLoaded', function() {
    const toggleBtn = document.getElementById('toggle-predefined');
    const predefinedList = document.getElementById('predefined-locations-list');
    
    // Set initial state
    let isPredefinedVisible = true;
    
    toggleBtn.addEventListener('click', function() {
        if (isPredefinedVisible) {
            predefinedList.style.display = 'none';
            toggleBtn.textContent = '▲';
            isPredefinedVisible = false;
        } else {
            predefinedList.style.display = 'block';
            toggleBtn.textContent = '▼';
            isPredefinedVisible = true;
        }
    });
});