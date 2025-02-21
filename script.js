const mapContainer = document.querySelector('.map-container');
const svgContainer = document.getElementById('svg-container');
const locationForm = document.querySelector('.location-form');
const deleteConfirm = document.querySelector('.delete-confirm');

let locations = [];
let currentClickPos = { x: 0, y: 0 };
let locationToDelete = null;
let svgPoint = null;
let pinSvg = '';

// Store initial map width and height
let initialMapWidth = mapContainer.offsetWidth;
let initialMapHeight = mapContainer.offsetHeight;

// Load both SVGs
Promise.all([
    fetch('australia.svg').then(response => response.text()),
    fetch('gpin.svg').then(response => response.text())
]).then(([mapSvg, gpinSvg]) => {
    svgContainer.innerHTML = mapSvg;
    pinSvg = gpinSvg;

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
    pin.style.left = `${location.x}px`;
    pin.style.top = `${location.y}px`;
    pin.dataset.id = location.id;

    if (location.symbol === 'gpin') {
        // Replace fill color in the SVG string
        const coloredPinSvg = pinSvg.replace(/fill="[^"]*"/, `fill="${location.color}"`);
        pin.innerHTML = coloredPinSvg;
    } else {
        pin.innerHTML = location.symbol;
        pin.style.color = location.color;
    }

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
        color: symbolColor
    };

    locations.push(location);
    addPin(location);
    updateLocationList();
    nameInput.value = '';
}

function updateLocationList() {
    const list = document.getElementById('location-list');
    list.innerHTML = '';

    locations.forEach(location => {
        const item = document.createElement('div');
        item.className = 'location-item';

        let symbolDisplay;
        if (location.symbol === 'gpin') {
            const coloredPinSvg = pinSvg.replace(/fill="[^"]*"/, `fill="${location.color}"`);
            symbolDisplay = `<span class="pin-icon">${coloredPinSvg}</span>`;
        } else {
            symbolDisplay = `<span style="color: ${location.color}">${location.symbol}</span>`;
        }

        item.innerHTML = `
            <span class="pin-option">${symbolDisplay} ${location.name}</span>
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

// Resize handling logic
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

        // Calculate the scaling ratio for both width and height
        const widthRatio = width / initialMapWidth;
        const heightRatio = height / initialMapHeight;

        // Adjust the position of the pins based on the scaling ratio
        updatePinPositions(widthRatio, heightRatio);

        // Update the initial size to the new dimensions
        initialMapWidth = width;
        initialMapHeight = height;
    }
}

function updatePinPositions(widthRatio, heightRatio) {
    // Update each pin position based on the new size of the map container
    const pins = document.querySelectorAll('.location-pin');
    pins.forEach(pin => {
        const locationId = pin.dataset.id;
        const location = locations.find(loc => loc.id === Number(locationId));

        if (location) {
            // Recalculate pin position based on resizing
            const newX = location.x * widthRatio;
            const newY = location.y * heightRatio;

            pin.style.left = `${newX}px`;
            pin.style.top = `${newY}px`;
        }
    });
}
