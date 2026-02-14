// Neon Immortal - Particle System
import { FilesetResolver, HandLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";


// Configuration
const CONFIG = {
    particleCount: 1000,
    particleSize: 2.5,   // Small points to form a smooth surface
    colors: {
        heart: new THREE.Color(0xffffff), // White to show original photos
        white: new THREE.Color(0xffffff)
    },
    cameraZ: 40 // Default for desktop
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

        // Initialize Hand Tracking
        await initHandTracker();


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

        // Start webcam
        enableCam();


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

    const textureLoader = new THREE.TextureLoader();
    const photoPaths = [
        'assets/photos/photo1.jpg',
        'assets/photos/photo2.jpg',
        'assets/photos/photo3.jpg',
        'assets/photos/photo4.jpg',
        'assets/photos/photo5.jpg'
    ];

    // Create multiple instances of photos floating around
    const photoCount = CONFIG.particleCount; // Use config for consistent spacing

    for (let i = 0; i < photoCount; i++) {
        const path = photoPaths[i % photoPaths.length];

        textureLoader.load(path, (texture) => {
            const material = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                opacity: 1.0,
                blending: THREE.NormalBlending, // Crucial for photo visibility!
                depthTest: false // Allow them to stack without z-fighting artifacts
            });

            const sprite = new THREE.Sprite(material);


            // Random position within the main volume
            const r = 15 + Math.random() * 20;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            sprite.position.x = r * Math.sin(phi) * Math.cos(theta);
            sprite.position.y = r * Math.sin(phi) * Math.sin(theta);
            sprite.position.z = r * Math.cos(phi);

            // Scale
            const s = 4 + Math.random() * 3;
            sprite.scale.set(s, s, 1);

            // Store initial y for floating animation
            sprite.userData = {
                initialY: sprite.position.y,
                speed: 0.02 + Math.random() * 0.03,
                offset: Math.random() * Math.PI * 2
            };

            photoGroup.add(sprite);
        });
    }
}


function setupUI() {
    // Mode switching buttons removed


    const fusionBtn = document.getElementById('fusion-btn');
    fusionBtn.addEventListener('mousedown', () => {
        isExpanding = true;
        document.getElementById('status-text').innerText = "FUSIÓN CRÍTICA";
        document.getElementById('status-text').style.color = "#ff0000";
    });

    fusionBtn.addEventListener('mouseup', () => {
        isExpanding = false;
        document.getElementById('status-text').innerText = "ESTABLE";
        document.getElementById('status-text').style.color = CONFIG.colors.heart.getStyle();
    });

    fusionBtn.addEventListener('mouseleave', () => {
        if (isExpanding) {
            isExpanding = false;
            document.getElementById('status-text').innerText = "ESTABLE";
            document.getElementById('status-text').style.color = CONFIG.colors.heart.getStyle();
        }
    });

    // Mobile touch support for button
    fusionBtn.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Prevent ghost clicks
        isExpanding = true;
        document.getElementById('status-text').innerText = "FUSIÓN CRÍTICA";
        document.getElementById('status-text').style.color = "#ff0000";
    }, { passive: false });

    fusionBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        isExpanding = false;
        document.getElementById('status-text').innerText = "ESTABLE";
        document.getElementById('status-text').style.color = CONFIG.colors.heart.getStyle();
    }, { passive: false });
}

function switchMode(mode) {
    currentMode = mode;
    console.log("Switching to " + mode);

    // Update target color
    let targetColor;
    if (mode === 'sphere') targetColor = CONFIG.colors.sphere;
    else if (mode === 'galaxy') targetColor = CONFIG.colors.galaxy;
    else if (mode === 'liquid') targetColor = CONFIG.colors.liquid;
    else if (mode === 'dna') targetColor = CONFIG.colors.dna;

    // Tween colors (simple linear interpolation for now done in animate, 
    // but here we just reset positions logic triggers)

    // We update the status text
    const statusText = document.getElementById('status-text');
    statusText.innerText = "RECONFIGURANDO...";
    setTimeout(() => {
        statusText.innerText = "ESTABLE";
    }, 1000);

    // Optional: Tint particles based on mode? 
    // Since we use textures, we could set material.color.
    particleSystems.forEach(sys => {
        sys.material.color.set(targetColor);
    });
}


function animate() {
    requestAnimationFrame(animate);

    time += 0.005;

    // Detect gestures
    detectGestures();

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
        if (isHandDetected) {
            // Lerp towards hand target
            const lerpFactor = 0.1;
            mainGroup.rotation.y += (handRotationTarget - mainGroup.rotation.y) * lerpFactor;
        } else {
            // Automatic slow rotation
            mainGroup.rotation.y += 0.002;
        }

        // Mouse tilt removed to keep heart shape upright
        mainGroup.rotation.x = 0;
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

// MediaPipe Hand Tracking Logic
let handLandmarker = undefined;
let webcamRunning = false;
let lastVideoTime = -1;
let results = undefined;
const video = document.getElementById("webcam");

async function initHandTracker() {
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
    );
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 1
    });
}

function enableCam() {
    if (!handLandmarker) {
        console.log("Wait for handLandmarker to load before clicking!");
        return;
    }

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
            video.srcObject = stream;
            video.addEventListener("loadeddata", predictWebcam);
            webcamRunning = true;
        });
    }
}

let lastPredictionTime = -1;
async function predictWebcam() {
    // Throttle prediction to save battery/FPS on mobile (e.g. 15fps for tracking is enough)
    const now = performance.now();
    if (now - lastPredictionTime < 100) { // Limit to ~10 checks per second
        window.requestAnimationFrame(predictWebcam);
        return;
    }
    lastPredictionTime = now;

    if (lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        results = handLandmarker.detectForVideo(video, now);
    }
    window.requestAnimationFrame(predictWebcam);
}


function detectGestures() {
    if (!results || !results.landmarks || results.landmarks.length === 0) {
        isHandDetected = false;
        return;
    }

    // We assume 1 hand for simplicity as configured
    const landmarks = results.landmarks[0];


    // Simple heuristic for closed fist vs open hand
    // Measure distance from finger tips to wrist (landmark 0)
    // Tips: 4 (Thumb), 8 (Index), 12 (Middle), 16 (Ring), 20 (Pinky)

    const wrist = landmarks[0];
    const tips = [8, 12, 16, 20]; // Identifying fingers (excluding thumb for simpler "fist" check sometimes)

    let avgDist = 0;
    tips.forEach(tipIdx => {
        const tip = landmarks[tipIdx];
        const dx = tip.x - wrist.x;
        const dy = tip.y - wrist.y;
        const dz = tip.z - wrist.z;
        avgDist += Math.sqrt(dx * dx + dy * dy + dz * dz);
    });
    avgDist /= tips.length;

    // Thresholds need tuning based on normalized coordinates (usually 0-1)
    // Closed fist has tips very close to wrist/palm center.
    // Open hand has tips far.

    // Position X -> Rotation Y
    // MediaPipe X is 0 (left) to 1 (right)
    const handX = landmarks[0].x;
    const SENSITIVITY = 4.0;
    const targetY = (handX - 0.5) * -SENSITIVITY; // Invert to follow naturally

    handRotationTarget = targetY;
    isHandDetected = true;

    //console.log(avgDist); // Debug if needed

    const FIST_THRESHOLD = 0.3; // Tunable parameter

    const wasExpanding = isExpanding;

    if (avgDist < FIST_THRESHOLD) {
        // Fist detected
        isExpanding = true;
    } else {
        // Open hand
        isExpanding = false;
    }

    // UI Feedback for state change
    if (wasExpanding !== isExpanding) {
        if (isExpanding) {
            document.getElementById('status-text').innerText = "FUSIÓN GESTUAL";
            document.getElementById('status-text').style.color = "#ff0000";
        } else {
            document.getElementById('status-text').innerText = "ESTABLE";
            document.getElementById('status-text').style.color = CONFIG.colors.heart.getStyle();
        }
    }
}

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

