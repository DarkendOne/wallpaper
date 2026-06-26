import * as THREE from 'three';

// --- State Variables ---
let targetWidth = 1920;
let targetHeight = 1080;
let zoomValue = 100; // In percentage (e.g. 100 to 300)
let panX = 0;
let panY = 0;
let isDragging = false;
let startX = 0;
let startY = 0;
let activeSourceType: 'three' | 'image' = 'three';

// Natural size of the active source
let srcWidth = 1920;
let srcHeight = 1080;

// --- DOM Elements ---
const canvasWorkspace = document.getElementById('canvas-workspace') as HTMLDivElement;
const previewImage = document.getElementById('preview-image') as HTMLImageElement;
const cropFrame = document.getElementById('crop-frame') as HTMLDivElement;
const exportStats = document.getElementById('export-stats') as HTMLSpanElement;

// Presets & Custom Dimensions
const presetButtons = document.querySelectorAll('.btn-preset');
const customDimsContainer = document.getElementById('custom-dims-container') as HTMLDivElement;
const inputWidth = document.getElementById('input-width') as HTMLInputElement;
const inputHeight = document.getElementById('input-height') as HTMLInputElement;
const customSizeDisplay = document.getElementById('custom-size-display') as HTMLSpanElement;

// File Upload
const dropzone = document.getElementById('dropzone') as HTMLDivElement;
const fileInput = document.getElementById('file-input') as HTMLInputElement;

// Controls
const zoomRange = document.getElementById('zoom-range') as HTMLInputElement;
const zoomBadge = document.getElementById('zoom-badge') as HTMLSpanElement;
const btnZoomIn = document.getElementById('zoom-in') as HTMLButtonElement;
const btnZoomOut = document.getElementById('zoom-out') as HTMLButtonElement;

// View Actions
const btnFit = document.getElementById('btn-fit') as HTMLButtonElement;
const btnFill = document.getElementById('btn-fill') as HTMLButtonElement;
const btnReset = document.getElementById('btn-reset') as HTMLButtonElement;
const btnDownload = document.getElementById('btn-download') as HTMLButtonElement;

// --- Three.js Setup for Generative Default ---
const threeCanvas = document.createElement('canvas');
threeCanvas.id = 'three-canvas';
threeCanvas.className = 'default-three-canvas';
canvasWorkspace.prepend(threeCanvas);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0b10);
scene.fog = new THREE.FogExp2(0x0a0b10, 0.015);

const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
camera.position.set(0, 8, 16);
camera.lookAt(0, 2, 0);

const renderer = new THREE.WebGLRenderer({
  canvas: threeCanvas,
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: true // Required for downloading canvas content
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Add ambient light
const ambientLight = new THREE.AmbientLight(0x1a1a2e, 0.5);
scene.add(ambientLight);

// Add colorful directional and point lights
const dirLight = new THREE.DirectionalLight(0x6366f1, 1.2);
dirLight.position.set(10, 20, 10);
scene.add(dirLight);

const pointLight1 = new THREE.PointLight(0xa855f7, 2.5, 50);
pointLight1.position.set(-8, 5, 5);
scene.add(pointLight1);

const pointLight2 = new THREE.PointLight(0x06b6d4, 2.5, 50);
pointLight2.position.set(8, 3, -5);
scene.add(pointLight2);

// Wave Plane Geometry & Material
const geometry = new THREE.PlaneGeometry(45, 45, 64, 64);
const material = new THREE.MeshStandardMaterial({
  color: 0x2e1a47,
  roughness: 0.15,
  metalness: 0.85,
  flatShading: true,
  wireframe: false
});
const waveMesh = new THREE.Mesh(geometry, material);
waveMesh.rotation.x = -Math.PI / 2;
scene.add(waveMesh);

// Add a wireframe overlay for tech aesthetics
const wireframeMaterial = new THREE.MeshBasicMaterial({
  color: 0x6366f1,
  wireframe: true,
  transparent: true,
  opacity: 0.15
});
const waveWireframe = new THREE.Mesh(geometry, wireframeMaterial);
waveWireframe.rotation.x = -Math.PI / 2;
waveWireframe.position.y = 0.02; // Slightly above the solid mesh to prevent z-fighting
scene.add(waveWireframe);

// Floating Particle System
const particleCount = 150;
const particleGeometry = new THREE.BufferGeometry();
const positions = new Float32Array(particleCount * 3);
for (let i = 0; i < particleCount * 3; i += 3) {
  positions[i] = (Math.random() - 0.5) * 40;     // X
  positions[i + 1] = Math.random() * 15;          // Y
  positions[i + 2] = (Math.random() - 0.5) * 40;  // Z
}
particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
const particleMaterial = new THREE.PointsMaterial({
  color: 0x06b6d4,
  size: 0.15,
  transparent: true,
  opacity: 0.8
});
const particles = new THREE.Points(particleGeometry, particleMaterial);
scene.add(particles);

// Animate Wave Vertices
const clock = new THREE.Clock();
const originalPositions = geometry.attributes.position.clone();

function animate() {
  if (activeSourceType === 'three') {
    requestAnimationFrame(animate);
  }

  const time = clock.getElapsedTime();
  const positionAttribute = geometry.attributes.position;

  for (let i = 0; i < positionAttribute.count; i++) {
    const x = originalPositions.getX(i);
    const y = originalPositions.getY(i);

    // Create dual-frequency wave ripples
    const z1 = Math.sin(x * 0.15 + time * 0.8) * Math.cos(y * 0.15 + time * 0.8) * 2.0;
    const z2 = Math.sin(x * 0.08 - time * 0.4) * 1.2;
    const z3 = Math.cos(y * 0.25 + time * 1.2) * 0.4;

    positionAttribute.setZ(i, z1 + z2 + z3);
  }

  geometry.attributes.position.needsUpdate = true;
  geometry.computeVertexNormals();

  // Slow rotations and light orbits
  waveMesh.rotation.z = time * 0.02;
  waveWireframe.rotation.z = time * 0.02;

  pointLight1.position.x = Math.sin(time * 0.5) * 12;
  pointLight1.position.z = Math.cos(time * 0.3) * 12;

  pointLight2.position.x = Math.cos(time * 0.4) * -12;
  pointLight2.position.z = Math.sin(time * 0.6) * 12;

  // Slowly drift particles
  const particlePositions = particleGeometry.attributes.position.array as Float32Array;
  for (let i = 1; i < particlePositions.length; i += 3) {
    particlePositions[i] -= 0.01; // Fall slowly
    if (particlePositions[i] < 0) {
      particlePositions[i] = 15; // Reset to top
    }
  }
  particleGeometry.attributes.position.needsUpdate = true;

  renderer.render(scene, camera);
}

// Start ThreeJS loop
animate();

// --- Layout & Transforming Functions ---

/**
 * Calculates current active element's base scale to fit or fill the crop frame.
 */
function getBaseScale(mode: 'fit' | 'fill' = 'fill'): number {
  const cropW = cropFrame.clientWidth;
  const cropH = cropFrame.clientHeight;

  const scaleX = cropW / srcWidth;
  const scaleY = cropH / srcHeight;

  return mode === 'fill' ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);
}

/**
 * Constrains panX and panY so that the image/canvas bounds always cover the crop frame.
 */
function constrainPan() {
  const cropW = cropFrame.clientWidth;
  const cropH = cropFrame.clientHeight;
  const baseScale = getBaseScale('fill');
  const finalScale = baseScale * (zoomValue / 100);

  const scaledImgW = srcWidth * finalScale;
  const scaledImgH = srcHeight * finalScale;

  const maxPanX = Math.max(0, (scaledImgW - cropW) / 2);
  const maxPanY = Math.max(0, (scaledImgH - cropH) / 2);

  panX = Math.max(-maxPanX, Math.min(maxPanX, panX));
  panY = Math.max(-maxPanY, Math.min(maxPanY, panY));
}

/**
 * Updates the visual transform (CSS translate + scale) of the active element.
 */
function updateTransform() {
  constrainPan();

  const activeElement = activeSourceType === 'three' ? threeCanvas : previewImage;
  const baseScale = getBaseScale('fill');
  const finalScale = baseScale * (zoomValue / 100);

  activeElement.style.transform = `translate(calc(-50% + ${panX}px), calc(-50% + ${panY}px)) scale(${finalScale})`;
  zoomBadge.textContent = `${zoomValue}%`;
  zoomRange.value = zoomValue.toString();
}

/**
 * Recalculates workspace layout, positions and sizes the crop-frame properly.
 */
function updateLayout() {
  const margin = 60;
  const workspaceW = Math.max(200, canvasWorkspace.clientWidth - margin);
  const workspaceH = Math.max(200, canvasWorkspace.clientHeight - margin);

  const targetRatio = targetWidth / targetHeight;
  const workspaceRatio = workspaceW / workspaceH;

  let cropW = 0;
  let cropH = 0;

  if (targetRatio > workspaceRatio) {
    cropW = workspaceW;
    cropH = workspaceW / targetRatio;
  } else {
    cropH = workspaceH;
    cropW = workspaceH * targetRatio;
  }

  cropFrame.style.width = `${cropW}px`;
  cropFrame.style.height = `${cropH}px`;

  // Update export stats footer text
  const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
  const divisor = gcd(targetWidth, targetHeight);
  const ratioStr = `${targetWidth / divisor}:${targetHeight / divisor}`;
  exportStats.textContent = `Resolution: ${targetWidth} x ${targetHeight} | Ratio: ${ratioStr}`;

  // Re-size ThreeJS viewport & camera if ThreeJS is currently active
  if (activeSourceType === 'three') {
    // Keep internal rendering resolution matching the source dimensions
    renderer.setSize(srcWidth, srcHeight, true);
    camera.aspect = srcWidth / srcHeight;
    camera.updateProjectionMatrix();
  }

  updateTransform();
}

// Run layout on resize
window.addEventListener('resize', updateLayout);

// --- User Interaction & Controls Handlers ---

// Presets
presetButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    presetButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const isCustom = btn.getAttribute('data-custom') === 'true';
    if (isCustom) {
      customDimsContainer.classList.remove('hidden');
      targetWidth = parseInt(inputWidth.value) || 1920;
      targetHeight = parseInt(inputHeight.value) || 1080;
    } else {
      customDimsContainer.classList.add('hidden');
      targetWidth = parseInt(btn.getAttribute('data-width') || '1920');
      targetHeight = parseInt(btn.getAttribute('data-height') || '1080');
    }

    // Reset positions and zoom when swapping resolutions
    panX = 0;
    panY = 0;
    zoomValue = 100;
    updateLayout();
  });
});

// Custom Input Handlers
[inputWidth, inputHeight].forEach(input => {
  input.addEventListener('input', () => {
    targetWidth = Math.max(100, Math.min(8192, parseInt(inputWidth.value) || 1920));
    targetHeight = Math.max(100, Math.min(8192, parseInt(inputHeight.value) || 1080));
    customSizeDisplay.textContent = `${targetWidth} × ${targetHeight}`;
    updateLayout();
  });
});

// Drag & Pan Actions
canvasWorkspace.addEventListener('mousedown', (e) => {
  isDragging = true;
  startX = e.clientX - panX;
  startY = e.clientY - panY;
});

window.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  panX = e.clientX - startX;
  panY = e.clientY - startY;
  updateTransform();
});

window.addEventListener('mouseup', () => {
  isDragging = false;
});

// Touch Drag support
canvasWorkspace.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1) {
    isDragging = true;
    startX = e.touches[0].clientX - panX;
    startY = e.touches[0].clientY - panY;
  }
}, { passive: true });

window.addEventListener('touchmove', (e) => {
  if (!isDragging || e.touches.length !== 1) return;
  panX = e.touches[0].clientX - startX;
  panY = e.touches[0].clientY - startY;
  updateTransform();
}, { passive: true });

window.addEventListener('touchend', () => {
  isDragging = false;
});

// Mouse Wheel Zoom
canvasWorkspace.addEventListener('wheel', (e) => {
  e.preventDefault();
  const zoomStep = 8;
  if (e.deltaY < 0) {
    zoomValue = Math.min(300, zoomValue + zoomStep);
  } else {
    zoomValue = Math.max(100, zoomValue - zoomStep);
  }
  updateTransform();
}, { passive: false });

// Zoom slider
zoomRange.addEventListener('input', () => {
  zoomValue = parseInt(zoomRange.value) || 100;
  updateTransform();
});

// Zoom Buttons
btnZoomIn.addEventListener('click', () => {
  zoomValue = Math.min(300, zoomValue + 10);
  updateTransform();
});

btnZoomOut.addEventListener('click', () => {
  zoomValue = Math.max(100, zoomValue - 10);
  updateTransform();
});

// Fit & Fill & Reset Bounds buttons
btnFit.addEventListener('click', () => {
  panX = 0;
  panY = 0;
  const fillScale = getBaseScale('fill');
  const fitScale = getBaseScale('fit');
  // Represent fitScale relative to fillScale as percentage zoom
  zoomValue = Math.round((fitScale / fillScale) * 100);
  updateTransform();
});

btnFill.addEventListener('click', () => {
  panX = 0;
  panY = 0;
  zoomValue = 100;
  updateTransform();
});

btnReset.addEventListener('click', () => {
  panX = 0;
  panY = 0;
  zoomValue = 100;
  updateTransform();
});

// --- Upload Handler ---

function handleUploadedFile(file: File) {
  if (!file.type.startsWith('image/')) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      // Switch active source
      activeSourceType = 'image';
      threeCanvas.classList.add('hidden');
      previewImage.classList.remove('hidden');

      // Update natural dimensions
      srcWidth = img.naturalWidth;
      srcHeight = img.naturalHeight;
      previewImage.src = img.src;
      console.log('Uploaded File')

      // Reset position/zoom
      panX = 0;
      panY = 0;
      zoomValue = 100;

      updateLayout();
    };
    img.src = e.target?.result as string;
  };
  reader.readAsDataURL(file);
}

// Drag & Drop
dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('dragover');
});

dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
    handleUploadedFile(e.dataTransfer.files[0]);
  }
});

// File Browser
dropzone.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', () => {
  if (fileInput.files && fileInput.files[0]) {
    handleUploadedFile(fileInput.files[0]);
  }
});

// --- Download Handler ---

btnDownload.addEventListener('click', () => {
  // Offscreen canvas at exact target resolution
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = targetWidth;
  exportCanvas.height = targetHeight;
  const ctx = exportCanvas.getContext('2d');
  if (!ctx) return;

  const cropW = cropFrame.clientWidth;
  const cropH = cropFrame.clientHeight;
  const baseScale = getBaseScale('fill');
  const finalScale = baseScale * (zoomValue / 100);

  if (activeSourceType === 'image') {
    // 1. Calculate how the cropped portion maps onto the target resolution
    // Inside workspace space:
    // Center of crop frame is workspace center (0,0 relative coordinate)
    // The image's top-left in workspace space:
    // x = workspaceCenter.x + panX - (srcWidth * finalScale / 2)
    // The crop frame top-left in workspace space:
    // x = workspaceCenter.x - (cropW / 2)
    // Difference between crop frame top-left and image top-left (in workspace pixels):
    // cropOffsetX = (cropW / 2) - panX + (srcWidth * finalScale / 2) ? No, let's write it cleanly:

    // We can map backwards: What part of the original image is enclosed in the crop frame?
    // Scale factor from workspace to natural image:
    const workToNaturalScale = 1 / finalScale;

    // The center of the crop frame is at offsets (panX, panY) relative to the center of the image.
    // In natural image pixels, the center of the crop frame is at:
    const naturalCenterX = srcWidth / 2 - (panX * workToNaturalScale);
    const naturalCenterY = srcHeight / 2 - (panY * workToNaturalScale);

    // Size of the crop frame in natural image pixels:
    const naturalCropW = cropW * workToNaturalScale;
    const naturalCropH = cropH * workToNaturalScale;

    // Top-left of crop frame in natural image pixels:
    const sourceX = naturalCenterX - naturalCropW / 2;
    const sourceY = naturalCenterY - naturalCropH / 2;

    // Draw slice of image onto target size canvas
    ctx.drawImage(
      previewImage,
      sourceX,
      sourceY,
      naturalCropW,
      naturalCropH,
      0,
      0,
      targetWidth,
      targetHeight
    );

    triggerDownload(exportCanvas.toDataURL('image/png'), 'wallpaper.png');
  } else {
    // 2. Three.js Export:
    // Resize the ThreeJS renderer directly to the target resolution temporarily
    const originalWidth = srcWidth;
    const originalHeight = srcHeight;

    // Set internal renderer size to target width/height
    renderer.setSize(targetWidth, targetHeight, true);
    camera.aspect = targetWidth / targetHeight;
    camera.updateProjectionMatrix();

    // Render a single high quality frame
    renderer.render(scene, camera);

    // Now copy the WebGL canvas content. Since we resized the renderer to target resolution,
    // the WebGL canvas itself contains the exact pixel dimensions!
    // But we need to crop it based on the pan/zoom parameters:
    // Inside workspace space:
    // The ThreeJS canvas behaves exactly like an image.
    // Its scale is `finalScale` and translate is `panX`, `panY`.
    // Let's draw it using the same slice logic onto the export canvas!

    const workToNaturalScale = 1 / finalScale;
    const naturalCenterX = targetWidth / 2 - (panX * workToNaturalScale);
    const naturalCenterY = targetHeight / 2 - (panY * workToNaturalScale);
    const naturalCropW = cropW * workToNaturalScale;
    const naturalCropH = cropH * workToNaturalScale;
    const sourceX = naturalCenterX - naturalCropW / 2;
    const sourceY = naturalCenterY - naturalCropH / 2;

    ctx.drawImage(
      threeCanvas,
      sourceX,
      sourceY,
      naturalCropW,
      naturalCropH,
      0,
      0,
      targetWidth,
      targetHeight
    );

    triggerDownload(exportCanvas.toDataURL('image/png'), 'wallpaper-generative.png');

    // Restore renderer back to original dimensions
    renderer.setSize(originalWidth, originalHeight, true);
    camera.aspect = originalWidth / originalHeight;
    camera.updateProjectionMatrix();

    // Trigger animation loop rendering again
    renderer.render(scene, camera);
  }
});

function triggerDownload(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

// --- Initial Setup ---
// Initialize layout values
updateLayout();
