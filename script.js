// Neon Immortal - Script Completo Corregido

// Configuración
const CONFIG = {
    particleCount: 150, // Aumenté un poco para que se vea mejor
    particleSize: 2.5,
    colors: {
        heart: new THREE.Color(0xffffff), // Blanco para respetar los colores de las fotos
    },
    cameraZ: 40
};

// Variables Globales
let scene, camera, renderer;
let photoGroup; // Grupo de las fotos
let mainGroup;  // Grupo padre para rotación
let isExpanding = false;
let time = 0;

let mouseX = 0;
let mouseY = 0;
let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;

// --- INICIO ---
init();

async function init() {
    try {
        const container = document.getElementById('canvas-container');

        // 1. Escena
        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x000000, 0.02);

        // 2. Cámara
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = CONFIG.cameraZ;

        // Ajuste inicial para móviles
        if (window.innerWidth < window.innerHeight) {
            camera.position.z = 60; // Más lejos en celular
        }

        // 3. Renderizador
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        container.appendChild(renderer.domElement);

        // 4. Crear Partículas (Fotos)
        // Esta función ahora maneja errores de carga para que no se quede negro
        createPhotoParticles();

        // 5. Eventos
        document.addEventListener('mousemove', onDocumentMouseMove, false);
        window.addEventListener('resize', onWindowResize, false);
        setupUI();

        // 6. Loop de animación
        animate();

    } catch (e) {
        console.error("Error crítico:", e);
        alert("Hubo un error al iniciar: " + e.message);
    }
}

// --- LÓGICA DE FOTOS (CORREGIDA) ---
function createPhotoParticles() {
    photoGroup = new THREE.Group();
    mainGroup = photoGroup; // Asignar para rotación global
    scene.add(photoGroup);

    // Asegúrate de que estos nombres sean EXACTOS a los de tu carpeta (Mayúsculas importan)
    const photoPaths = [
        'assets/photos/photo1.jpg',
        'assets/photos/photo2.jpg',
        'assets/photos/photo3.jpg',
        'assets/photos/photo4.jpg',
        'assets/photos/photo5.jpg'
    ];

    const imageLoader = new THREE.ImageLoader();
    const heartTextures = [];
    let loadedCount = 0;

    // Esta función revisa si ya terminamos, con o sin errores
    const checkCompletion = () => {
        loadedCount++;
        // Si ya intentamos cargar todas (hayan fallado o no)
        if (loadedCount === photoPaths.length) {
            if (heartTextures.length > 0) {
                console.log("Iniciando con " + heartTextures.length + " imágenes.");
                initParticles(heartTextures);
            } else {
                alert("ERROR: No se pudo cargar ninguna imagen. Revisa la carpeta assets/photos");
            }
        }
    };

    photoPaths.forEach(path => {
        imageLoader.load(
            path, 
            (image) => {
                // ÉXITO: Crear la textura
                const texture = new THREE.CanvasTexture(maskImageToHeart(image));
                heartTextures.push(texture);
                checkCompletion();
            },
            undefined, // Progreso (no lo usamos)
            (err) => {
                // ERROR: Avisar en consola pero NO detener la app
                console.error("No se encontró la imagen: " + path);
                checkCompletion(); // ¡Importante! Contamos el fallo para no quedarnos esperando
            }
        );
    });
}

    photoPaths.forEach(path => {
        imageLoader.load(
            path,
            // Al cargar bien:
            (image) => {
                const texture = new THREE.CanvasTexture(maskImageToHeart(image));
                heartTextures.push(texture);
                checkCompletion();
            },
            // Progreso (no usado):
            undefined,
            // Al fallar (ERROR):
            (err) => {
                console.warn(`No se encontró la imagen: ${path}. Saltando...`);
                checkCompletion(); // Contamos el error para no bloquear la app
            }
        );
    });
}

// Recorta la imagen en forma de corazón usando Canvas 2D
function maskImageToHeart(image) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const size = 256;
    canvas.width = size;
    canvas.height = size;

    // 1. Dibujar máscara de corazón
    ctx.beginPath();
    ctx.translate(size / 2, size / 2);
    const s = size / 35;

    ctx.moveTo(0, 0);
    for (let t = 0; t <= Math.PI * 2; t += 0.05) {
        const x = 16 * Math.pow(Math.sin(t), 3);
        // Formula del corazón invertida en Y para Canvas
        const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)); 
        ctx.lineTo(x * s, y * s);
    }
    ctx.closePath();
    ctx.fillStyle = "#ff0000";
    ctx.fill();

    // 2. Composición: Mantener solo lo que esté DENTRO del corazón
    ctx.globalCompositeOperation = 'source-in';

    // 3. Dibujar imagen centrada (Cover)
    if (image) {
        ctx.translate(-size / 2, -size / 2); // Resetear origen
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

    ctx.globalCompositeOperation = 'source-over'; // Restaurar
    return canvas;
}

// Distribuye las partículas en 3D
function initParticles(textures) {
    const count = CONFIG.particleCount;

    for (let i = 0; i < count; i++) {
        // Usar texturas cíclicamente
        const texture = textures[i % textures.length];

        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            opacity: 0.9,
            depthTest: false, // Ayuda a que se mezclen mejor visualmente
            blending: THREE.AdditiveBlending // O NormalBlending si quieres fotos sólidas
        });

        const sprite = new THREE.Sprite(material);

        // Posición inicial aleatoria (explotarán hacia la forma de corazón)
        const r = 10 + Math.random() * 20;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        sprite.position.x = r * Math.sin(phi) * Math.cos(theta);
        sprite.position.y = r * Math.sin(phi) * Math.sin(theta);
        sprite.position.z = r * Math.cos(phi);

        // Escala aleatoria
        const s = 3 + Math.random() * 3;
        sprite.scale.set(s, s, 1);

        photoGroup.add(sprite);
    }
}

// --- INTERACCIÓN ---
function setupUI() {
    const fusionBtn = document.getElementById('fusion-btn');
    if (!fusionBtn) return;

    // Mouse y Touch events para el botón
    const startExpand = (e) => { 
        if(e.cancelable) e.preventDefault(); 
        isExpanding = true; 
    };
    const endExpand = (e) => { 
        if(e.cancelable) e.preventDefault(); 
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
    
    // Reajuste móvil si cambian la orientación
    if (window.innerWidth < window.innerHeight) {
        camera.position.z = 60;
    } else {
        camera.position.z = CONFIG.cameraZ;
    }
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
    if (!photoGroup) return; // Si no han cargado las fotos, no hacemos nada

    const count = photoGroup.children.length;
    
    // Rotación suave con el mouse
    if (mainGroup) {
        mainGroup.rotation.y += 0.002; // Rotación automática
        // Rotación interactiva sutil
        mainGroup.rotation.x += (mouseY * 0.001 - mainGroup.rotation.x) * 0.05;
        mainGroup.rotation.y += (mouseX * 0.001 - mainGroup.rotation.y) * 0.05;
    }

    // Actualizar cada partícula
    for (let i = 0; i < count; i++) {
        const sprite = photoGroup.children[i];
        
        // Matemáticas de la forma de corazón
        // Distribuimos los puntos usando un índice
        const pIndex = i;
        
        // Distribución esférica básica mapeada al corazón
        const tStat = (pIndex / count) * Math.PI * 2; 
        const pStat = (pIndex * 137.5) * (Math.PI / 180); // Ángulo áureo para evitar patrones de rejilla

        // Fórmula del corazón 3D
        const hx = 16 * Math.pow(Math.sin(tStat), 3) * Math.sin(pStat);
        const hy = 13 * Math.cos(tStat) - 5 * Math.cos(2 * tStat) - 2 * Math.cos(3 * tStat) - Math.cos(4 * tStat);
        const hz = 6 * Math.pow(Math.sin(tStat), 3) * Math.cos(pStat);

        // Latido
        const beatScale = 0.8 + Math.sin(time * 3) * 0.05;
        let scaleFactor = beatScale;

        // Expansión al presionar botón
        if (isExpanding) {
            scaleFactor *= 1.8; // Explosión
        }

        let targetX = hx * scaleFactor;
        let targetY = hy * scaleFactor;
        let targetZ = hz * scaleFactor;

        // Movimiento suave (Lerp) hacia la posición destino
        const speed = isExpanding ? 0.1 : 0.05;
        
        sprite.position.x += (targetX - sprite.position.x) * speed;
        sprite.position.y += (targetY - sprite.position.y) * speed;
        sprite.position.z += (targetZ - sprite.position.z) * speed;
        
        // Efecto visual al expandir
        if (isExpanding) {
             sprite.material.opacity = 1.0;
             sprite.scale.setScalar(CONFIG.particleSize * 1.5);
        } else {
             sprite.material.opacity = 0.9;
             // Volver a tamaño normal
             sprite.scale.setScalar(CONFIG.particleSize);
        }
    }

    renderer.render(scene, camera);
}