const mapContainer = document.querySelector('.map-container');
const svgContainer = document.getElementById('svg-container');
const locationForm = document.querySelector('.location-form');
const deleteConfirm = document.querySelector('.delete-confirm');

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
});

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
    
    // Handle the color replacement for different SVGs
    if (location.symbol === 'style1' || location.symbol === 'style4') {
        // Standard fill replacement for style1 and style4
        pinSvg = pinSvg.replace(/fill="[^"]*"/g, `fill="${location.color}"`);
    } else if (location.symbol === 'style2' || location.symbol === 'style3') {
        // For style2 and style3, ensure we target the correct color properties
        pinSvg = pinSvg.replace(/stroke="[^"]*"/g, `stroke="${location.color}"`); // Check if `stroke` is used
        pinSvg = pinSvg.replace(/fill="[^"]*"/g, `fill="${location.color}"`);  // Apply fill change
    }
    
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
        const newSize = Math.max(12, Math.min(48, startSize + diff));
        
        svgContainer.style.width = `${newSize}px`;
        svgContainer.style.height = `${newSize}px`;
        
        // Update location object
        const locationObj = locations.find(loc => loc.id === parseInt(pin.dataset.id));
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
});

function addLocation() {
    const nameInput = document.getElementById('location-name');
    const name = nameInput.value.trim();
    const symbol = document.getElementById('symbol-select').value;
    const symbolColor = document.getElementById('symbol-color').value;

    if (name === '') {
        alert('Please enter a location name');
        return;
    }

    const location = {
        id: Date.now(),
        name: name,
        x: currentClickPos.x,
        y: currentClickPos.y,
        symbol: symbol,
        color: symbolColor,
        size: 24 // Default size
    };

    locations.push(location);
    addPin(location);
    updateLocationList();
    nameInput.value = '';
    hideForm();
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
            <button class="delete-btn" onclick="showDeleteConfirm(${location.id})">Delete</button>
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

// Resizing functionality for the map container and the SVG
const resizer = document.querySelector('.resizer');
let isResizing = false;

resizer.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isResizing = true;
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', () => {
        isResizing = false;
        document.removeEventListener('mousemove', handleResize);
    });
});

function handleResize(e) {
    if (isResizing) {
        const width = e.clientX - mapContainer.getBoundingClientRect().left;
        const height = e.clientY - mapContainer.getBoundingClientRect().top;

        // Update the size of the map container
        mapContainer.style.width = `${width}px`;
        mapContainer.style.height = `${height}px`;

        // Update the SVG container size
        svgContainer.style.width = `${width}px`;
        svgContainer.style.height = `${height}px`;

        // Resize the SVG content within the container to fit the new size
        const svg = svgContainer.querySelector('svg');
        svg.setAttribute('width', `${width}px`);
        svg.setAttribute('height', `${height}px`);

        // Update pin positions based on the new size
        updatePinPositions();

        // Store new size as initial size for future calculations
        initialMapWidth = width;
        initialMapHeight = height;
    }
}

function updatePinPositions() {
    // Update each pin position based on the new size of the map container
    const pins = document.querySelectorAll('.location-pin');
    pins.forEach(pin => {
        const locationId = pin.dataset.id;
        const location = locations.find(loc => loc.id === Number(locationId));

        if (location) {
            // Calculate new positions based on the stored percentage
            const newX = location.xPercentage * initialMapWidth;
            const newY = location.yPercentage * initialMapHeight;

            pin.style.left = `${newX}px`;
            pin.style.top = `${newY}px`;
        }
    });
}
