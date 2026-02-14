// Neon Immortal - VERSIÓN DEFINITIVA (Fotos Cuadradas + Rotación Automática)

const CONFIG = {
    particleCount: 150,
    colors: {
        heart: new THREE.Color(0xffffff),
    },
    cameraZ: 60
};

let scene, camera, renderer;
let photoGroup, mainGroup;
let isExpanding = false;
let time = 0;
let isMobile = false;

init();

async function init() {
    try {
        const container = document.getElementById('canvas-container');
        isMobile = window.innerWidth < window.innerHeight;

        // --- AJUSTE DE TAMAÑO ---
        CONFIG.particleSize = isMobile ? 18.0 : 8.0;

        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x000000, 0.001);

        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = isMobile ? 85 : 45;

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        container.appendChild(renderer.domElement);

        createPhotoParticles();
        window.addEventListener('resize', onWindowResize, false);
        setupUI();
        animate();

    } catch (e) {
        console.error("Error al iniciar:", e);
    }
}

function createPhotoParticles() {
    photoGroup = new THREE.Group();
    mainGroup = new THREE.Group();
    mainGroup.add(photoGroup);
    scene.add(mainGroup);

    const photoPaths = [
        'assets/photos/foto_doctora.png',
        'assets/photos/d205c5a8c07194d85afb95921b3719bb.jpg',
        'assets/photos/feliz-san-valentin-150-imagenes-y-frases-para-enviar_795af111_240206130838_1280x720.jpg',
        'assets/photos/images.png'
    ];

    // 1. Crear partículas inmediatamente transparentes (Evita cuadros rojos)
    const fallbackCanvas = document.createElement('canvas');
    fallbackCanvas.width = 2; fallbackCanvas.height = 2;
    const fctx = fallbackCanvas.getContext('2d');
    fctx.clearRect(0, 0, 2, 2);
    const fallbackTexture = new THREE.CanvasTexture(fallbackCanvas);

    initParticles(fallbackTexture);

    // 2. Cargar fotos progresivamente
    const textureLoader = new THREE.TextureLoader();
    const timestamp = Date.now();

    photoPaths.forEach((path, photoIdx) => {
        textureLoader.load(
            path,
            (texture) => {
                try {
                    console.log("Cargada: " + path);
                    const canvas = maskImageToHeart(texture.image);
                    const maskedTexture = new THREE.CanvasTexture(canvas);
                    maskedTexture.minFilter = THREE.LinearFilter;
                    maskedTexture.needsUpdate = true;
                    updateParticleTextures(photoIdx, photoPaths.length, maskedTexture);
                } catch (e) {
                    console.error("Error procesando foto:", e);
                }
            },
            undefined,
            (err) => console.warn("No cargó: " + path)
        );
    });
}

function maskImageToHeart(image) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const size = 256;
    canvas.width = size;
    canvas.height = size;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.save();
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

    if (!image) {
        // No mostrar nada si la imagen falla
        ctx.clearRect(0, 0, size, size);
    } else {
        ctx.save();
        ctx.clip(); // Mask the image inside the heart

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
        ctx.restore();
    }

    ctx.restore();
    return canvas;
}

function updateParticleTextures(photoIdx, totalPhotos, newTexture) {
    if (!photoGroup) return;
    photoGroup.children.forEach((sprite, i) => {
        if (i % totalPhotos === photoIdx) {
            sprite.material.map = newTexture;
            sprite.material.needsUpdate = true;
        }
    });
}

function initParticles(defaultTexture) {
    const count = CONFIG.particleCount;
    for (let i = 0; i < count; i++) {
        const material = new THREE.SpriteMaterial({
            map: defaultTexture,
            transparent: true,
            opacity: 1.0,
            depthTest: false,
            blending: THREE.NormalBlending
        });

        const sprite = new THREE.Sprite(material);

        // Posición aleatoria inicial
        const r = 10 + Math.random() * 20;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        sprite.position.set(
            r * Math.sin(phi) * Math.cos(theta),
            r * Math.sin(phi) * Math.sin(theta),
            r * Math.cos(phi)
        );

        sprite.scale.setScalar(CONFIG.particleSize);
        photoGroup.add(sprite);
    }
}

function setupUI() {
    const fusionBtn = document.getElementById('fusion-btn');
    if (!fusionBtn) return;

    const start = (e) => { if (e.cancelable) e.preventDefault(); isExpanding = true; };
    const end = (e) => { if (e.cancelable) e.preventDefault(); isExpanding = false; };

    fusionBtn.addEventListener('mousedown', start);
    fusionBtn.addEventListener('mouseup', end);
    fusionBtn.addEventListener('mouseleave', end);
    fusionBtn.addEventListener('touchstart', start, { passive: false });
    fusionBtn.addEventListener('touchend', end, { passive: false });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    isMobile = window.innerWidth < window.innerHeight;
    CONFIG.particleSize = isMobile ? 18.0 : 8.0;
    camera.position.z = isMobile ? 85 : 45;
    if (photoGroup) photoGroup.children.forEach(s => s.scale.setScalar(CONFIG.particleSize));
}

function animate() {
    requestAnimationFrame(animate);
    time += 0.005;
    render();
}

function render() {
    if (!photoGroup || !mainGroup) return;

    const count = photoGroup.children.length;

    // ROTACIÓN AUTOMÁTICA PURA (SIN MOUSE)
    mainGroup.rotation.y -= 0.01;

    for (let i = 0; i < count; i++) {
        const sprite = photoGroup.children[i];

        const tStat = (i / count) * Math.PI * 2;
        const pStat = (i * 137.5) * (Math.PI / 180);

        // Geometría Corazón 3D
        const hx = 16 * Math.pow(Math.sin(tStat), 3) * Math.sin(pStat);
        const hy = 13 * Math.cos(tStat) - 5 * Math.cos(2 * tStat) - 2 * Math.cos(3 * tStat) - Math.cos(4 * tStat);
        const hz = 6 * Math.pow(Math.sin(tStat), 3) * Math.cos(pStat);

        const beat = 0.8 + Math.sin(time * 3) * 0.05;
        let factor = beat * (isExpanding ? 1.8 : 1.0);

        const speed = isExpanding ? 0.1 : 0.05;
        sprite.position.x += (hx * factor - sprite.position.x) * speed;
        sprite.position.y += (hy * factor - sprite.position.y) * speed;
        sprite.position.z += (hz * factor - sprite.position.z) * speed;

        if (isExpanding) {
            sprite.scale.setScalar(CONFIG.particleSize * 1.5);
        } else {
            const varSize = 1 + Math.sin(i * 10) * 0.1;
            sprite.scale.setScalar(CONFIG.particleSize * varSize);
        }
    }

    renderer.render(scene, camera);
}