// Neon Immortal - Particle System
// MediaPipe Imports Removed


// Configuration
const CONFIG = {
    particleCount: 1000,
    particleSize: 2.5,
    colors: {
        heart: new THREE.Color(0xffffff),
        white: new THREE.Color(0xffffff)
    },
    cameraZ: 40
};

// State
let scene, camera, renderer;
let particleSystems = []; // Array to hold multiple point systems
let photoGroup; // Group for photo particles
let mainGroup; // Parent group for rotation
let currentMode = 'heart';
let isExpanding = false;
let time = 0;

let handRotationTarget = 0;
let isHandDetected = false;


// Mouse interaction
let mouseX = 0;
let mouseY = 0;
const windowHalfX = window.innerWidth / 2;
const windowHalfY = window.innerHeight / 2;

// Initialize
async function init() {
    try {
        const container = document.getElementById('canvas-container');

        // Hand Tracking Removed


        // Scene setup
        scene = new THREE.Scene();
        // Add some subtle fog for depth
        scene.fog = new THREE.FogExp2(0x000000, 0.02);

        // Camera
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = CONFIG.cameraZ;

        // Initial Responsive Check
        if (window.innerWidth / window.innerHeight < 1.0) {
            camera.position.z = 100; // Zoom out
            scene.position.y = 5;    // Move up
        }

        // Renderer
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        container.appendChild(renderer.domElement);

        // Create Particles (Photos)
        createPhotoParticles();


        // Event Listeners

        document.addEventListener('mousemove', onDocumentMouseMove, false);
        window.addEventListener('resize', onWindowResize, false);

        // Camera start removed


        // UI Setup
        setupUI();

        // Animation Loop
        animate();
    } catch (e) {
        console.error("Initialization Error:", e);
        const statusText = document.getElementById('status-text');
        if (statusText) statusText.innerText = "ERROR DE INICIO";
        alert("Error inicializando: " + e.message);
    }
}




function createPhotoParticles() {
    photoGroup = new THREE.Group();
    mainGroup = photoGroup; // Assign for global rotation
    scene.add(photoGroup);

    const photoPaths = [
        'assets/photos/photo1.jpg',
        'assets/photos/photo2.jpg',
        'assets/photos/photo3.jpg',
        'assets/photos/photo4.jpg',
        'assets/photos/photo5.jpg'
    ];

    // 1. Create particles immediately with a fallback (red heart)
    const fallbackCanvas = maskImageToHeart(null);
    const fallbackTexture = new THREE.CanvasTexture(fallbackCanvas);
    fallbackTexture.needsUpdate = true;

    // Initialize the whole group with red hearts first
    initParticles(fallbackTexture);

    // 2. Start loading photos progressively
    const imageLoader = new THREE.ImageLoader();
    // No CORS needed for local assets
    const timestamp = Date.now();

    photoPaths.forEach((path, photoIdx) => {
        const cacheBustedPath = `${path}?t=${timestamp}`;
        imageLoader.load(
            cacheBustedPath,
            (image) => {
                try {
                    console.log("Cargada con éxito: " + path);
                    const canvas = maskImageToHeart(image);
                    const photoTexture = new THREE.CanvasTexture(canvas);
                    photoTexture.minFilter = THREE.LinearFilter;
                    photoTexture.magFilter = THREE.LinearFilter;
                    photoTexture.needsUpdate = true;

                    // Update only the sprites that belong to this photo index
                    updateParticleTextures(photoIdx, photoPaths.length, photoTexture);
                } catch (e) {
                    console.error("Error al procesar foto:", e);
                }
            },
            undefined,
            (err) => {
                console.error("Fallo al cargar " + path, err);
            }
        );
    });
}

function updateParticleTextures(photoIdx, totalPhotos, newTexture) {
    if (!photoGroup) return;

    // Each photo (0 to 4) is assigned to every Nth sprite
    photoGroup.children.forEach((sprite, i) => {
        if (i % totalPhotos === photoIdx) {
            sprite.material.map = newTexture;
            sprite.material.needsUpdate = true;
        }
    });
}

function maskImageToHeart(image) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const size = 256;
    canvas.width = size;
    canvas.height = size;

    // 1. Draw Heart Shape Mask
    ctx.beginPath();
    ctx.translate(size / 2, size / 2);
    const s = size / 35;

    ctx.moveTo(0, 0);
    for (let t = 0; t <= Math.PI * 2; t += 0.05) {
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        ctx.lineTo(x * s, y * s);
    }
    ctx.closePath();

    // Fill with base color
    ctx.fillStyle = "#ff0000";
    ctx.fill();

    // 2. Draw Image (centered and cover)
    if (image) {
        ctx.globalCompositeOperation = 'source-in';
        ctx.translate(-size / 2, -size / 2);

        const aspect = image.width / image.height;
        let drawW, drawH, ox, oy;
        if (aspect > 1) {
            drawH = size;
            drawW = size * aspect;
            ox = -(drawW - size) / 2;
            oy = 0;
        } else {
            drawW = size;
            drawH = size / aspect;
            ox = 0;
            oy = -(drawH - size) / 2;
        }

        ctx.drawImage(image, ox, oy, drawW, drawH);
        ctx.globalCompositeOperation = 'source-over';
    }

    return canvas;
}

function initParticles(defaultTexture) {
    const photoCount = CONFIG.particleCount;

    for (let i = 0; i < photoCount; i++) {
        const material = new THREE.SpriteMaterial({
            map: defaultTexture,
            transparent: true,
            opacity: 1.0,
            blending: THREE.NormalBlending,
            depthTest: false
        });

        const sprite = new THREE.Sprite(material);

        // Random position within the main volume
        const r = 15 + Math.random() * 20;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        sprite.position.x = r * Math.sin(phi) * Math.cos(theta);
        sprite.position.y = r * Math.sin(phi) * Math.sin(theta);
        sprite.position.z = r * Math.cos(phi);

        // Scale - Slightly larger for better visibility
        const s = 6 + Math.random() * 4;
        sprite.scale.set(s, s, 1);

        // Store properties
        sprite.userData = {
            initialY: sprite.position.y,
            speed: 0.02 + Math.random() * 0.03,
            offset: Math.random() * Math.PI * 2
        };

        photoGroup.add(sprite);
    }
}



function setupUI() {
    // Mode switching buttons removed

    const fusionBtn = document.getElementById('fusion-btn');
    fusionBtn.addEventListener('mousedown', () => {
        isExpanding = true;
    });

    fusionBtn.addEventListener('mouseup', () => {
        isExpanding = false;
    });

    fusionBtn.addEventListener('mouseleave', () => {
        if (isExpanding) {
            isExpanding = false;
        }
    });

    // Mobile touch support for button
    fusionBtn.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Prevent ghost clicks
        isExpanding = true;
    }, { passive: false });

    fusionBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        isExpanding = false;
    }, { passive: false });
}




function animate() {
    requestAnimationFrame(animate);

    time += 0.005;

    // Gestures removed

    render();

}

function render() {
    // Iterate over photo particles if they exist
    if (photoGroup) {
        const count = photoGroup.children.length;

        // Determine target color (Heart Mode only)
        let targetColor = CONFIG.colors.heart;

        const lerpSpeed = 0.05;

        for (let i = 0; i < count; i++) {
            const sprite = photoGroup.children[i];
            const globalI = i; // simple index

            let x = sprite.position.x;
            let y = sprite.position.y;
            let z = sprite.position.z;

            let targetX, targetY, targetZ;

            // --- FORMATION LOGIC: HEART (DENSE SURFACE) ---

            // We need a stable parametric surface that looks good with many points.
            // Using a randomized distribution on the surface.

            // Formula A (Classic 3D Heart):
            // x = 16 sin^3(t) sin(p)
            // y = 13 cos(t) - 5 cos(2t) - 2 cos(3t) - cos(4t)
            // z = 6 sin^3(t) cos(p)

            // We map 'globalI' to cover the surface.

            const pIndex = globalI;

            // t (0 to PI) - Vertical profile
            // p (0 to 2PI) - Horizontal rotation

            // To distribute evenly, we can use Golden Spiral on sphere and map it.
            // Or just a dense grid.

            const t = Math.acos(-1 + (2 * pIndex) / count); // 0 to PI (Scanning from bottom to top)
            // Fix range for this specific formula: 
            // The 2D profile requires t from 0 to 2PI.
            // But 3D revolution usually takes half profile.

            // Let's use a simpler random distribution that naturally clumps to the surface.
            // t = 0..2PI
            // p = 0..2PI

            const tAngle = (pIndex * 0.1) + time * 0.05; // Dynamic rotation? No, static shape.

            const tStat = (pIndex / count) * Math.PI * 2;
            const pStat = (pIndex * 137.5) * (Math.PI / 180); // Golden angle scatter

            // 3D Heart Formula
            const hx = 16 * Math.pow(Math.sin(tStat), 3) * Math.sin(pStat);
            const hy = 13 * Math.cos(tStat) - 5 * Math.cos(2 * tStat) - 2 * Math.cos(3 * tStat) - Math.cos(4 * tStat);
            const hz = 6 * Math.pow(Math.sin(tStat), 3) * Math.cos(pStat);

            const beatScale = 1.0 + Math.sin(time * 3) * 0.05;
            const scale = 0.5 * beatScale;

            targetX = hx * scale;
            targetY = hy * scale;
            targetZ = hz * scale;

            // Slight noise
            targetX += (Math.random() - 0.5) * 0.5;
            targetY += (Math.random() - 0.5) * 0.5;
            targetZ += (Math.random() - 0.5) * 0.5;



            // --- INTERACTION: EXPANSION ---
            if (isExpanding) {
                const expansionFactor = 1.8; // Controlled expansion
                const shake = Math.sin(time * 20 + globalI * 0.1) * 0.5; // Smooth wave instead of jitter
                targetX = targetX * expansionFactor + shake;
                targetY = targetY * expansionFactor + shake;
                targetZ = targetZ * expansionFactor + shake;
            }

            // Move towards target
            const speed = isExpanding ? 0.2 : 0.05;
            sprite.position.x += (targetX - x) * speed;
            sprite.position.y += (targetY - y) * speed;
            sprite.position.z += (targetZ - z) * speed;

            // Color updates
            if (targetColor) {
                sprite.material.color.lerp(targetColor, lerpSpeed);
            }

            // Scale update for expansion
            if (isExpanding) {
                // Pulse
                const pulse = 1.0 + Math.sin(time * 10) * 0.2;
                sprite.scale.setScalar(CONFIG.particleSize * 4.0 * pulse);
            } else {
                // Return to normal
                const currentS = sprite.scale.x;
                const targetS = CONFIG.particleSize; // Base size
                // Lerp scale
                const newS = currentS + (targetS - currentS) * 0.1;
                sprite.scale.set(newS, newS, 1);
            }
        }
    }

    // Rotate the whole system
    if (mainGroup) {
        // Automatic slow rotation
        mainGroup.rotation.y += 0.002;
    }

    renderer.render(scene, camera);
}


function onWindowResize() {
    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Responsive Camera Adjustment
    if (camera.aspect < 1.0) {
        // Mobile Portrait
        camera.position.z = 100; // Zoom out significantly
        scene.position.y = 5;    // Move up slightly to clear bottom button
    } else {
        // Desktop Landscape
        camera.position.z = CONFIG.cameraZ;
        scene.position.y = 0;
    }
}

function onDocumentMouseMove(event) {
    mouseX = event.clientX;
    mouseY = event.clientY;
}

// MediaPipe Logic Removed

// Start
// init() called at the end of module now, wait for DOM? 
// Actually since we use type="module", we can just run it.
init();

// Mobile Touch Rotation
document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
        mouseX = e.touches[0].clientX - windowHalfX;
        // mouseY = e.touches[0].clientY - windowHalfY; // Vertical rotation is disabled
    }
}, { passive: true });

document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 0) {
        mouseX = e.touches[0].clientX - windowHalfX;
    }
}, { passive: true });
// Finalize and Start
console.log("Antigravity: Bootstrap iniciada.");
init();
