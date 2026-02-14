// Neon Immortal - CÓDIGO FINAL (Brillo y Tamaño Corregidos)

// Configuración Base
const CONFIG = {
    particleCount: 150, // Cantidad de partículas
    colors: {
        heart: new THREE.Color(0xffffff), // Blanco para que no altere el color de la foto
    },
    cameraZ: 60
};

// Variables Globales
let scene, camera, renderer;
let photoGroup;
let mainGroup;
let isExpanding = false;
let time = 0;
let isMobile = false;

let mouseX = 0;
let mouseY = 0;
let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;

// --- INICIO ---
init();

async function init() {
    try {
        const container = document.getElementById('canvas-container');

        // Detectar si es celular (pantalla más alta que ancha)
        isMobile = window.innerWidth < window.innerHeight;

        // --- AJUSTE DE TAMAÑO (CRÍTICO) ---
        // Celular: 15.0 (Se ven bien las caras). PC: 6.0
        CONFIG.particleSize = isMobile ? 15.0 : 6.0;

        // 1. Escena
        scene = new THREE.Scene();
        // NIEBLA AL MÍNIMO: 0.001 (Casi invisible, solo para profundidad lejana)
        // Esto soluciona que se vean "opacas" o negras.
        scene.fog = new THREE.FogExp2(0x000000, 0.001);

        // 2. Cámara
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

        // Ajuste de distancia de cámara
        if (isMobile) {
            camera.position.z = 85; // Alejamos un poco para que entre todo el corazón
        } else {
            camera.position.z = 45; // PC
        }

        // 3. Renderizador
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        container.appendChild(renderer.domElement);

        // 4. Crear Partículas
        createPhotoParticles();

        // 5. Eventos
        document.addEventListener('mousemove', onDocumentMouseMove, false);
        window.addEventListener('resize', onWindowResize, false);
        setupUI();

        // 6. Loop de Animación
        animate();

    } catch (e) {
        console.error("Error crítico:", e);
    }
}

// --- CARGA Y RECORTE DE FOTOS ---
function createPhotoParticles() {
    photoGroup = new THREE.Group();
    mainGroup = new THREE.Group();
    mainGroup.add(photoGroup);
    scene.add(mainGroup);

    // TUS RUTAS DE FOTOS
    const photoPaths = [
        'assets/photos/photo1.jpg',
        'assets/photos/photo2.jpg',
        'assets/photos/photo3.jpg',
        'assets/photos/photo4.jpg',
        'assets/photos/photo5.jpg'
    ];

    const imageLoader = new THREE.ImageLoader();
    const heartTextures = [];
    let processedCount = 0;

    const checkCompletion = () => {
        processedCount++;
        if (processedCount === photoPaths.length) {
            if (heartTextures.length > 0) {
                // Iniciar solo cuando haya fotos
                initParticles(heartTextures);
            }
        }
    };

    photoPaths.forEach(path => {
        imageLoader.load(
            path,
            (image) => {
                // RECORTAR EN FORMA DE CORAZÓN
                const canvas = maskImageToHeart(image);
                const texture = new THREE.CanvasTexture(canvas);
                heartTextures.push(texture);
                checkCompletion();
            },
            undefined,
            (err) => {
                console.warn(`Error cargando: ${path}`);
                checkCompletion();
            }
        );
    });
}

// FUNCIÓN MATEMÁTICA PARA RECORTAR LA IMAGEN COMO CORAZÓN
function maskImageToHeart(image) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const size = 256;
    canvas.width = size;
    canvas.height = size;

    // 1. Dibujar silueta de corazón
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
    ctx.fillStyle = "#ff0000";
    ctx.fill();

    // 2. Modo máscara: Solo pintar dentro del corazón
    ctx.globalCompositeOperation = 'source-in';

    // 3. Pintar la foto centrada
    if (image) {
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
    }

    ctx.globalCompositeOperation = 'source-over';
    return canvas;
}

// --- CREACIÓN DE LAS PARTÍCULAS EN 3D ---
function initParticles(textures) {
    const count = CONFIG.particleCount;

    for (let i = 0; i < count; i++) {
        const texture = textures[i % textures.length];

        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            opacity: 1.0, // Opacidad total (sin transparencia)
            depthTest: false, // Importante para que no se recorten entre sí
        });

        const sprite = new THREE.Sprite(material);

        // Posición aleatoria inicial
        const r = 10 + Math.random() * 20;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        sprite.position.x = r * Math.sin(phi) * Math.cos(theta);
        sprite.position.y = r * Math.sin(phi) * Math.sin(theta);
        sprite.position.z = r * Math.cos(phi);

        // Asignar tamaño inicial
        sprite.scale.setScalar(CONFIG.particleSize);

        photoGroup.add(sprite);
    }
}

// --- INTERACCIÓN Y UI ---
function setupUI() {
    const fusionBtn = document.getElementById('fusion-btn');
    if (!fusionBtn) return;

    const startExpand = (e) => {
        if (e.cancelable) e.preventDefault();
        isExpanding = true;
    };
    const endExpand = (e) => {
        if (e.cancelable) e.preventDefault();
        isExpanding = false;
    };

    // Soporte para Mouse y Touch
    fusionBtn.addEventListener('mousedown', startExpand);
    fusionBtn.addEventListener('mouseup', endExpand);
    fusionBtn.addEventListener('mouseleave', endExpand);
    fusionBtn.addEventListener('touchstart', startExpand, { passive: false });
    fusionBtn.addEventListener('touchend', endExpand, { passive: false });
}

function onWindowResize() {
    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

    isMobile = window.innerWidth < window.innerHeight;

    // Actualizar tamaño si se gira el celular
    CONFIG.particleSize = isMobile ? 15.0 : 6.0;

    if (photoGroup) {
        photoGroup.children.forEach(sprite => {
            sprite.scale.setScalar(CONFIG.particleSize);
        });
    }

    camera.position.z = isMobile ? 85 : 45;
}

function onDocumentMouseMove(event) {
    mouseX = (event.clientX - windowHalfX) * 0.5;
    mouseY = (event.clientY - windowHalfY) * 0.5;
}

// --- BUCLE DE ANIMACIÓN ---
function animate() {
    requestAnimationFrame(animate);
    time += 0.005;
    render();
}

function render() {
    if (!photoGroup) return;

    const count = photoGroup.children.length;

    // Rotación automática pura (sin mouse)
    if (mainGroup) {
        mainGroup.rotation.y -= 0.01;
    }

    // Mover cada partícula
    for (let i = 0; i < count; i++) {
        const sprite = photoGroup.children[i];
        const pIndex = i;

        // Distribución esférica mapeada al corazón 3D
        const tStat = (pIndex / count) * Math.PI * 2;
        const pStat = (pIndex * 137.5) * (Math.PI / 180);

        // FÓRMULA DEL CORAZÓN
        const hx = 16 * Math.pow(Math.sin(tStat), 3) * Math.sin(pStat);
        const hy = 13 * Math.cos(tStat) - 5 * Math.cos(2 * tStat) - 2 * Math.cos(3 * tStat) - Math.cos(4 * tStat);
        const hz = 6 * Math.pow(Math.sin(tStat), 3) * Math.cos(pStat);

        // Latido
        const beatScale = 0.8 + Math.sin(time * 3) * 0.05;
        let scaleFactor = beatScale;

        // Expansión al presionar
        if (isExpanding) scaleFactor *= 1.8;

        let targetX = hx * scaleFactor;
        let targetY = hy * scaleFactor;
        let targetZ = hz * scaleFactor;

        // Velocidad de movimiento
        const speed = isExpanding ? 0.1 : 0.05;

        sprite.position.x += (targetX - sprite.position.x) * speed;
        sprite.position.y += (targetY - sprite.position.y) * speed;
        sprite.position.z += (targetZ - sprite.position.z) * speed;

        // Efectos de escala al expandir
        if (isExpanding) {
            sprite.scale.setScalar(CONFIG.particleSize * 1.5);
        } else {
            // Variación sutil de tamaño para dar naturalidad
            const variation = 1 + Math.sin(i * 10) * 0.1;
            sprite.scale.setScalar(CONFIG.particleSize * variation);
        }
    }

    renderer.render(scene, camera);
}