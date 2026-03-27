const canvas = document.getElementById('canvas-container');
const svg = document.getElementById('svg-layer');
const overlay = document.getElementById('mask-overlay');
const codeBox = document.getElementById('output-code');

// State
let points = [{x:40, y:40}, {x:760, y:40}, {x:760, y:460}, {x:40, y:460}];
let radius = 20;
let gridSize = 20;
let draggingIdx = null;

function init() {
    // Setup Sliders
    setupSlider('w-slider', 'w-val', (v) => {
        canvas.style.width = v + 'px';
        constrainPoints(); // Fix points getting lost outside container
    });
    setupSlider('h-slider', 'h-val', (v) => {
        canvas.style.height = v + 'px';
        constrainPoints(); // Fix points getting lost outside container
    });
    setupSlider('r-slider', 'r-val', (v) => radius = parseInt(v));
    setupSlider('g-slider', 'g-val', (v) => {
        gridSize = parseInt(v);
        canvas.style.backgroundSize = `${gridSize}px ${gridSize}px`;
    });

   document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', () => draggingIdx = null);
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('touchend', () => draggingIdx = null);
    render();
}

function setupSlider(id, valId, callback) {
    const el = document.getElementById(id);
    el.addEventListener('input', (e) => {
        document.getElementById(valId).innerText = e.target.value;
        callback(e.target.value);
        render();
    });
}

// Keep points inside the container when resizing down
function constrainPoints() {
    const currentW = parseInt(canvas.style.width);
    const currentH = parseInt(canvas.style.height);
    
    points.forEach(p => {
        if (p.x > currentW) p.x = currentW;
        if (p.y > currentH) p.y = currentH;
    });
}

function addPoint() {
    const last = points[points.length - 1];
    const offset = gridSize > 1 ? gridSize : 10;

    let newX = last.x - offset;
    let newY = last.y;

     if (newX < 0) {
        newX = 0;
        newY = last.y - offset;
    } else if (newX > canvas.clientWidth) {
        newX = canvas.clientWidth;
        newY = last.y - offset;
    }

    newX = Math.min(newX, canvas.clientWidth);
    newY = Math.min(newY, canvas.clientHeight);

    const snappedX = gridSize > 1 ? Math.round(newX / gridSize) * gridSize : newX;
    const snappedY = gridSize > 1 ? Math.round(newY / gridSize) * gridSize : newY;

    points.push({ x: snappedX, y: snappedY });
    render();
}

function deletePoint() {
    if (points.length > 3) {
        points.pop();
        render();
    }
}

function resetPoints() {
    points = [{x:40,y:40}, {x:760,y:40}, {x:760,y:460}, {x:40,y:460}];
    document.getElementById('w-slider').value = 800;
    document.getElementById('w-val').innerText = 800;
    canvas.style.width = '800px';
    
    document.getElementById('h-slider').value = 500;
    document.getElementById('h-val').innerText = 500;
    canvas.style.height = '500px';
    
    render();
}

function drag(e) {
    if (draggingIdx === null) return;
    e.preventDefault();
    const rect = svg.getBoundingClientRect();

    // ✅ Check for touch FIRST, then use those coordinates for rawX/rawY
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    let rawX = clientX - rect.left;
    let rawY = clientY - rect.top;

    rawX = Math.max(0, Math.min(rawX, canvas.clientWidth));
    rawY = Math.max(0, Math.min(rawY, canvas.clientHeight));

    const snappedX = gridSize > 1 ? Math.round(rawX / gridSize) * gridSize : rawX;
    const snappedY = gridSize > 1 ? Math.round(rawY / gridSize) * gridSize : rawY;

    points[draggingIdx].x = snappedX;
    points[draggingIdx].y = snappedY;
    render();
}

function generatePath(pts, r) {
    let d = "";
    for (let i = 0; i < pts.length; i++) {
        const p1 = pts[(i - 1 + pts.length) % pts.length];
        const p2 = pts[i];
        const p3 = pts[(i + 1) % pts.length];

        const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
        const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
        const d1 = Math.sqrt(v1.x**2 + v1.y**2);
        const d2 = Math.sqrt(v2.x**2 + v2.y**2);

        const currR = Math.min(r, d1/2, d2/2);
        
        // Avoid dividing by zero if points are stacked
        if (d1 === 0 || d2 === 0) continue; 

        const s = { x: p2.x + (v1.x/d1)*currR, y: p2.y + (v1.y/d1)*currR };
        const e = { x: p2.x + (v2.x/d2)*currR, y: p2.y + (v2.y/d2)*currR };

        d += (i === 0 ? `M ${s.x} ${s.y} ` : `L ${s.x} ${s.y} `);
        d += `Q ${p2.x} ${p2.y} ${e.x} ${e.y} `;
    }
    return d + "Z";
}

function render() {
    const d = generatePath(points, radius);
    overlay.style.clipPath = `path('${d}')`;
    
    // Convert to percentages for responsive CSS
    let percentD = d;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    
    codeBox.innerText = `clip-path: path('${d}');`;

    svg.innerHTML = '';
    points.forEach((p, i) => {
        const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        c.setAttribute("cx", p.x); c.setAttribute("cy", p.y);
        c.setAttribute("r", 7); c.setAttribute("class", "handle");
        c.onmousedown = () => draggingIdx = i;
        c.ontouchstart = (e) => { e.preventDefault(); draggingIdx = i; }; 
        svg.appendChild(c);
    });
}
    const copyToClipboard = async () => {
    const textToCopy = codeBox.innerText;
    
    try {
        await navigator.clipboard.writeText(textToCopy);
        
        // Optional: Provide visual feedback
        const originalBg = codeBox.style.backgroundColor;
        codeBox.style.backgroundColor = "#000000"; 
        const originalText = codeBox.innerText;
        
        // Temporarily change text to show "Copied!"
        console.log("Copied to clipboard!");
        
        // Alert or simple UI feedback
        alert("CSS Copied to clipboard!");

    } catch (err) {
        console.error("Failed to copy: ", err);
    }
};

        // Attach the click event to your existing codeBox element
        codeBox.addEventListener('click', copyToClipboard);

        // Add a style hint so users know it's clickable
        codeBox.style.cursor = "pointer";
        codeBox.title = "Click to copy code";
init();