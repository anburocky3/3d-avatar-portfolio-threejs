import "./style.css";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// 1. Scene, Camera & Renderer Setup
const canvas = document.querySelector("#webgl-canvas");
const scene = new THREE.Scene();

// Responsive Device Check
const isMobile = () => window.innerWidth < 768;
const isTablet = () => window.innerWidth >= 768 && window.innerWidth < 1024;

const camera = new THREE.PerspectiveCamera(
  isMobile() ? 48 : isTablet() ? 40 : 35,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);

// Framed comfortably for face and upper torso
camera.position.set(0, 1.35, isMobile() ? 2.1 : 1.85);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// 2. Vibrant Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 1.6);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
keyLight.position.set(1, 2, 3);
scene.add(keyLight);

const rimLight1 = new THREE.PointLight(0x10b981, 6, 12); // Emerald
rimLight1.position.set(-3, 2, -1);
scene.add(rimLight1);

const rimLight2 = new THREE.PointLight(0x6366f1, 6, 12); // Indigo
rimLight2.position.set(3, 1, -1);
scene.add(rimLight2);

// 3. Animated Star Background
const starGeometry = new THREE.BufferGeometry();
const starCount = 600;
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount * 3; i++) {
  starPositions[i] = (Math.random() - 0.5) * 16;
}
starGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(starPositions, 3),
);
const starMaterial = new THREE.PointsMaterial({
  size: 0.03,
  color: 0x38bdf8,
  transparent: true,
  opacity: 0.5,
});
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

// 4. Model, Bone & Procedural Eyelid References
let avatar = null;
let headBone = null;
let leftEyeBone = null;
let rightEyeBone = null;
let leftArmBone = null;
let rightArmBone = null;
let leftForeArmBone = null;
let rightForeArmBone = null;

let leftLid = null;
let rightLid = null;

// Procedural Eyelid Builder
function createProceduralEyelids(parentHead) {
  const lidGeo = new THREE.SphereGeometry(
    0.019,
    16,
    16,
    0,
    Math.PI * 2,
    0,
    Math.PI * 0.5,
  );

  const lidMat = new THREE.MeshStandardMaterial({
    color: 0x985d43, // warm brown/tan skin tone
    roughness: 0.65,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });

  leftLid = new THREE.Mesh(lidGeo, lidMat);
  rightLid = new THREE.Mesh(lidGeo, lidMat);

  leftLid.position.set(0.031, 0.076, 0.076);
  rightLid.position.set(-0.031, 0.076, 0.076);

  leftLid.rotation.x = THREE.MathUtils.degToRad(35);
  rightLid.rotation.x = THREE.MathUtils.degToRad(35);

  leftLid.scale.set(1.05, 0.001, 1.05);
  rightLid.scale.set(1.05, 0.001, 1.05);

  parentHead.add(leftLid);
  parentHead.add(rightLid);
}

const loader = new GLTFLoader();
const modelPath = `${import.meta.env.BASE_URL}anbu-avatar.glb`;

loader.load(modelPath, (gltf) => {
  avatar = gltf.scene;

  // Initial placement adapted for mobile vs desktop
  const initX = isMobile() ? 0 : 0.85;
  avatar.position.set(initX, -0.32, 0);

  avatar.traverse((node) => {
    if (node.isBone) {
      const boneName = node.name.toLowerCase();

      // Eye tracking bones
      if (boneName.includes("lefteye") || boneName === "eye_l")
        leftEyeBone = node;
      if (boneName.includes("righteye") || boneName === "eye_r")
        rightEyeBone = node;

      // Head bone
      if (boneName.includes("head") && !boneName.includes("top")) {
        headBone = node;
        createProceduralEyelids(headBone);
      }

      // Upper arm bones
      if (
        (boneName.includes("leftarm") ||
          boneName.includes("arm_l") ||
          boneName.includes("upperarm_l")) &&
        !boneName.includes("forearm") &&
        !boneName.includes("shoulder")
      ) {
        leftArmBone = node;
        node.rotation.order = "ZXY";
      }

      if (
        (boneName.includes("rightarm") ||
          boneName.includes("arm_r") ||
          boneName.includes("upperarm_r")) &&
        !boneName.includes("forearm") &&
        !boneName.includes("shoulder")
      ) {
        rightArmBone = node;
        node.rotation.order = "ZXY";
      }

      // Forearm bones
      if (boneName.includes("leftforearm") || boneName.includes("forearm_l")) {
        leftForeArmBone = node;
        node.rotation.order = "ZXY";
      }
      if (boneName.includes("rightforearm") || boneName.includes("forearm_r")) {
        rightForeArmBone = node;
        node.rotation.order = "ZXY";
      }
    }
  });

  scene.add(avatar);
});

// 5. Automated Eyelid Blinking Controller
let isBlinking = false;
let blinkProgress = 0;
let nextBlinkTime = performance.now() + 1500;

function updateBlinking() {
  const now = performance.now();

  if (!isBlinking && now >= nextBlinkTime) {
    isBlinking = true;
    blinkProgress = 0;
  }

  if (isBlinking && leftLid && rightLid) {
    blinkProgress += 0.16;
    const weight = Math.sin(Math.min(blinkProgress, 1) * Math.PI);

    const lidScaleY = Math.max(0.001, weight * 1.15);
    leftLid.scale.y = lidScaleY;
    rightLid.scale.y = lidScaleY;

    if (blinkProgress >= 1) {
      isBlinking = false;
      leftLid.scale.y = 0.001;
      rightLid.scale.y = 0.001;
      nextBlinkTime = now + 2500 + Math.random() * 3000;
    }
  }
}

// 6. Scroll Progress Calculation
let scrollProgress = 0;
function onScroll() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  scrollProgress = Math.min(Math.max(window.scrollY / (maxScroll || 1), 0), 1);
}
window.addEventListener("scroll", onScroll);

// 7. Mouse Normalization (-1 to 1)
let mouseX = 0;
let mouseY = 0;
window.addEventListener("mousemove", (event) => {
  mouseX = (event.clientX / window.innerWidth) * 2 - 1;
  mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
});

// Responsive Resize Handling
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.fov = isMobile() ? 48 : isTablet() ? 40 : 35;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  onScroll();
});

// 8. Interactive Light Hovers
document.querySelectorAll(".pointer-events-auto").forEach((element) => {
  element.addEventListener("mouseenter", () => {
    rimLight1.intensity = 10;
    rimLight2.intensity = 10;
  });
  element.addEventListener("mouseleave", () => {
    rimLight1.intensity = 6;
    rimLight2.intensity = 6;
  });
});

// 9. Animation & Render Loop
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const elapsedTime = clock.getElapsedTime();

  stars.rotation.y = elapsedTime * 0.02;

  // Run procedural eyelid blink animation
  updateBlinking();

  // Responsive camera parameters
  const mobile = isMobile();
  const tablet = isTablet();

  let targetCamX = 0;
  let targetCamY = mobile ? 1.4 : 1.35;
  let targetCamZ = mobile ? 2.1 : 1.85;

  let targetLookAtX = mobile ? 0 : 0.35;
  let targetLookAtY = mobile ? 1.2 : 1.15;
  let targetLookAtZ = 0;

  // Initial hero avatar position
  let targetAvatarX = mobile ? 0 : 0.85;
  let targetAvatarYRot = mobile ? 0 : -0.32;

  if (scrollProgress < 0.45) {
    // Section 1: Hero
    const factor = scrollProgress / 0.45;
    targetCamX = 0;
    targetCamY = THREE.MathUtils.lerp(mobile ? 1.4 : 1.35, 1.25, factor);
    targetCamZ = THREE.MathUtils.lerp(
      mobile ? 2.1 : 1.85,
      mobile ? 2.4 : 2.2,
      factor,
    );
    targetAvatarX = THREE.MathUtils.lerp(
      mobile ? 0 : 0.85,
      mobile ? 0 : 0.95,
      factor,
    );
    targetAvatarYRot = THREE.MathUtils.lerp(
      mobile ? 0 : -0.32,
      mobile ? 0 : -0.4,
      factor,
    );
    targetLookAtY = THREE.MathUtils.lerp(mobile ? 1.2 : 1.15, 1.05, factor);
  } else if (scrollProgress >= 0.45 && scrollProgress < 0.8) {
    // Section 2: About
    const factor = (scrollProgress - 0.45) / 0.35;
    targetCamX = 0;
    targetCamY = 1.2;
    targetCamZ = THREE.MathUtils.lerp(
      mobile ? 2.4 : 2.2,
      mobile ? 2.6 : 2.4,
      factor,
    );
    targetAvatarX = mobile ? 0 : tablet ? 0.6 : 0.95;
    targetAvatarYRot = mobile ? 0 : -0.35;
    targetLookAtX = mobile ? 0 : tablet ? 0.2 : 0.35;
    targetLookAtY = 1.05;
  } else {
    // Section 3: Contact
    targetCamX = 0;
    targetCamY = 1.2;
    targetCamZ = mobile ? 2.6 : 2.4;
    targetAvatarX = mobile ? 0 : tablet ? -0.4 : -0.2;
    targetAvatarYRot = mobile ? 0 : 0.35;
    targetLookAtX = mobile ? 0 : -0.2;
    targetLookAtY = 1.05;
  }

  // Smooth camera dampening
  camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetCamX, 0.06);
  camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetCamY, 0.06);
  camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetCamZ, 0.06);

  camera.lookAt(targetLookAtX, targetLookAtY, targetLookAtZ);

  if (avatar) {
    avatar.position.x = THREE.MathUtils.lerp(
      avatar.position.x,
      targetAvatarX,
      0.06,
    );
    avatar.rotation.y = THREE.MathUtils.lerp(
      avatar.rotation.y,
      targetAvatarYRot + mouseX * 0.12,
      0.06,
    );

    // Natural vertical breathing motion
    avatar.position.y = -0.32 + Math.sin(elapsedTime * 2) * 0.012;

    // === CALIBRATED RESTING ARM POSE ===
    if (leftArmBone) {
      leftArmBone.rotation.x = THREE.MathUtils.degToRad(-20);
      leftArmBone.rotation.y = THREE.MathUtils.degToRad(200);
      leftArmBone.rotation.z = THREE.MathUtils.degToRad(-160);
    }
    if (rightArmBone) {
      rightArmBone.rotation.x = THREE.MathUtils.degToRad(10);
      rightArmBone.rotation.y = THREE.MathUtils.degToRad(-200);
      rightArmBone.rotation.z = THREE.MathUtils.degToRad(125);
    }

    if (leftForeArmBone) {
      leftForeArmBone.rotation.x = 0.1;
      leftForeArmBone.rotation.y = 0;
      leftForeArmBone.rotation.z = THREE.MathUtils.degToRad(10);
    }
    if (rightForeArmBone) {
      rightForeArmBone.rotation.x = 2;
      rightForeArmBone.rotation.y = 0;
      rightForeArmBone.rotation.z = THREE.MathUtils.degToRad(0);
    }

    // Interactive Head & Eye Look-At Tracking
    const eyeTargetX = mouseX * 0.35;
    const eyeTargetY = mouseY * 0.25;

    if (headBone) {
      headBone.rotation.y = THREE.MathUtils.lerp(
        headBone.rotation.y,
        mouseX * 0.35,
        0.1,
      );
      headBone.rotation.x = THREE.MathUtils.lerp(
        headBone.rotation.x,
        -mouseY * 0.2,
        0.1,
      );
    }

    if (leftEyeBone) {
      leftEyeBone.rotation.y = THREE.MathUtils.lerp(
        leftEyeBone.rotation.y,
        eyeTargetX,
        0.15,
      );
      leftEyeBone.rotation.x = THREE.MathUtils.lerp(
        leftEyeBone.rotation.x,
        -eyeTargetY,
        0.15,
      );
    }
    if (rightEyeBone) {
      rightEyeBone.rotation.y = THREE.MathUtils.lerp(
        rightEyeBone.rotation.y,
        eyeTargetX,
        0.15,
      );
      rightEyeBone.rotation.x = THREE.MathUtils.lerp(
        rightEyeBone.rotation.x,
        -eyeTargetY,
        0.15,
      );
    }
  }

  renderer.render(scene, camera);
}

animate();
