// Neon Immortal - Script Final Corregido

// Configuración Base
const CONFIG = {
    particleCount: 80,
    colors: {
        heart: new THREE.Color(0xffffff),
    },
    // Definimos tamaños dinámicos abajo en el init
    cameraZ: 60 
};

// Variables Globales
let scene, camera, renderer;
let photoGroup;
let mainGroup;
let isExpanding = false;
let time = 0;
let isMobile = false; // Detectaremos esto al inicio

let mouseX = 0;
let mouseY = 0;
let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;

// --- INICIO ---
init();

async function init() {
    try {
        const container = document.getElementById('canvas-container');

        // Detectar si es celular
        isMobile = window.innerWidth < window.innerHeight;

        // --- AJUSTE DE TAMAÑO ---
        // Si es celular, tamaño 35 (muy grande). Si es PC, tamaño 8.
        CONFIG.particleSize = isMobile ? 35.0 : 8.0;

        // 1. Escena
        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x000000, 0.02);

        // 2. Cámara
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        // Ajuste de cámara según dispositivo
        if (isMobile) {
            camera.position.z = 85; // Un poco más lejos en celular para que quepa el corazón entero
        } else {
            camera.position.z = 45; // Más cerca en PC
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

        // 6. Loop
        animate();

    } catch (e) {
        console.error("Error crítico:", e);
    }
}

// --- CARGA Y RECORTE DE FOTOS ---
function createPhotoParticles() {
    photoGroup = new THREE.Group();
    mainGroup = new THREE.Group(); // Grupo padre para rotación global
    mainGroup.add(photoGroup);
    scene.add(mainGroup);

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
                initParticles(heartTextures);
            } else {
                console.error("No se cargaron imágenes.");
            }
        }
    };

    photoPaths.forEach(path => {
        imageLoader.load(
            path,
            (image) => {
                // ¡AQUÍ ESTÁ LA MAGIA! 
                // Usamos maskImageToHeart para recortar la foto antes de crear la textura
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

// FUNCIÓN DE RECORTE (ESTA FALTABA PARA QUE SEAN CORAZONES)
function maskImageToHeart(image) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const size = 256; // Calidad de la textura
    canvas.width = size;
    canvas.height = size;

    // 1. Dibujar forma de corazón
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

    // 2. Modo recorte: Mantener solo lo que está DENTRO del corazón
    ctx.globalCompositeOperation = 'source-in';

    // 3. Dibujar imagen centrada
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
    
    // Restaurar
    ctx.globalCompositeOperation = 'source-over';
    return canvas;
}

// --- CREACIÓN DE PARTÍCULAS ---
function initParticles(textures) {
    const count = CONFIG.particleCount;

    for (let i = 0; i < count; i++) {
        const texture = textures[i % textures.length];
        
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            opacity: 0.9,
            depthTest: false,
        });

        const sprite = new THREE.Sprite(material);

        // Posición aleatoria inicial
        const r = 10 + Math.random() * 20;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        sprite.position.x = r * Math.sin(phi) * Math.cos(theta);
        sprite.position.y = r * Math.sin(phi) * Math.sin(theta);
        sprite.position.z = r * Math.cos(phi);

        // Tamaño inicial
        sprite.scale.setScalar(CONFIG.particleSize);

        photoGroup.add(sprite);
    }
}

// --- UI Y EVENTOS ---
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

    // Recalcular si es móvil al rotar pantalla
    isMobile = window.innerWidth < window.innerHeight;
    
    // Actualizar tamaño de partículas y cámara dinámicamente
    CONFIG.particleSize = isMobile ? 35.0 : 8.0;
    
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

// --- ANIMACIÓN ---
function animate() {
    requestAnimationFrame(animate);
    time += 0.005;
    render();
}

function render() {
    if (!photoGroup) return;

    const count = photoGroup.children.length;

    // Rotación
    if (mainGroup) {
        mainGroup.rotation.y += 0.002;
        mainGroup.rotation.x += (mouseY * 0.001 - mainGroup.rotation.x) * 0.05;
        mainGroup.rotation.y += (mouseX * 0.001 - mainGroup.rotation.y) * 0.05;
    }

    // Actualizar partículas
    for (let i = 0; i < count; i++) {
        const sprite = photoGroup.children[i];
        const pIndex = i;

        // Distribución en forma de corazón
        const tStat = (pIndex / count) * Math.PI * 2;
        const pStat = (pIndex * 137.5) * (Math.PI / 180);

        const hx = 16 * Math.pow(Math.sin(tStat), 3) * Math.sin(pStat);
        const hy = 13 * Math.cos(tStat) - 5 * Math.cos(2 * tStat) - 2 * Math.cos(3 * tStat) - Math.cos(4 * tStat);
        const hz = 6 * Math.pow(Math.sin(tStat), 3) * Math.cos(pStat);

        const beatScale = 0.8 + Math.sin(time * 3) * 0.05;
        let scaleFactor = beatScale;

        if (isExpanding) scaleFactor *= 1.8;

        let targetX = hx * scaleFactor;
        let targetY = hy * scaleFactor;
        let targetZ = hz * scaleFactor;

        const speed = isExpanding ? 0.1 : 0.05;

        sprite.position.x += (targetX - sprite.position.x) * speed;
        sprite.position.y += (targetY - sprite.position.y) * speed;
        sprite.position.z += (targetZ - sprite.position.z) * speed;

        if (isExpanding) {
            sprite.scale.setScalar(CONFIG.particleSize * 1.5);
        } else {
            // Variación sutil para que no se vean monótonas
            const variation = 1 + Math.sin(i * 10) * 0.1;
            sprite.scale.setScalar(CONFIG.particleSize * variation);
        }
    }

    renderer.render(scene, camera);
}