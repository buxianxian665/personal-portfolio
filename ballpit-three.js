import * as THREE from 'https://esm.sh/three@0.180.0?target=es2022';
import { RoomEnvironment } from 'https://esm.sh/three@0.180.0/examples/jsm/environments/RoomEnvironment.js?target=es2022';

const canvas = document.querySelector('.contact-ballpit');
const host = canvas?.closest('.contact');

if (canvas && host) {
  const mobile = matchMedia('(max-width: 620px)').matches;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const count = mobile ? 56 : 110;
  const gravity = .7;
  const friction = .992;
  const wallBounce = .95;
  const maxVelocity = .15;
  const sizes = new Float32Array(count);
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  const palette = [0x1678ff, 0x7abfff, 0xc7e5ff, 0x14243a];
  const pointerWorld = new THREE.Vector3();
  const dummy = new THREE.Object3D();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(9, 9);
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  let pointerActive = false;
  let bounds = { x: 5, y: 5, z: 2.4 };
  let visible = false;
  let animationFrame = 0;
  let lastTime = performance.now();

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setClearColor(0xffffff, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, .1, 100);
  camera.position.set(0, 0, 20);
  camera.lookAt(0, 0, 0);

  const environment = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environmentMap = pmrem.fromScene(environment, .04).texture;
  environment.dispose();
  pmrem.dispose();

  const geometry = new THREE.SphereGeometry(1, 32, 24);
  const material = new THREE.MeshPhysicalMaterial({
    envMap: environmentMap,
    metalness: .18,
    roughness: .2,
    clearcoat: 1,
    clearcoatRoughness: .08,
    transmission: .06,
    thickness: .35
  });
  const spheres = new THREE.InstancedMesh(geometry, material, count);
  spheres.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(spheres);
  scene.add(new THREE.AmbientLight(0xffffff, 1.7));
  const mainLight = new THREE.PointLight(0xffffff, 130);
  mainLight.position.set(-4, 6, 8);
  scene.add(mainLight);
  const blueLight = new THREE.PointLight(0x1678ff, 85);
  blueLight.position.set(5, -2, 7);
  scene.add(blueLight);

  function randomSpread(range) {
    return (Math.random() - .5) * range;
  }

  function resetParticles() {
    for (let index = 0; index < count; index++) {
      const offset = index * 3;
      sizes[index] = index === 0 ? 1.05 : .42 + Math.random() * .56;
      positions[offset] = randomSpread(bounds.x * 2);
      positions[offset + 1] = randomSpread(bounds.y * 2);
      positions[offset + 2] = randomSpread(bounds.z * 2);
      velocities[offset] = randomSpread(.08);
      velocities[offset + 1] = randomSpread(.08);
      velocities[offset + 2] = randomSpread(.04);
      spheres.setColorAt(index, new THREE.Color(palette[index % palette.length]));
    }
    spheres.instanceColor.needsUpdate = true;
  }

  function resize() {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const viewHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    bounds.y = viewHeight / 2;
    bounds.x = viewHeight * camera.aspect / 2;
    bounds.z = 2.4;
    resetParticles();
    render();
  }

  function resolveCollision(first, second) {
    const a = first * 3;
    const b = second * 3;
    const dx = positions[b] - positions[a];
    const dy = positions[b + 1] - positions[a + 1];
    const dz = positions[b + 2] - positions[a + 2];
    const distanceSquared = dx * dx + dy * dy + dz * dz;
    const minimum = sizes[first] + sizes[second];
    if (!distanceSquared || distanceSquared >= minimum * minimum) return;
    const distance = Math.sqrt(distanceSquared);
    const nx = dx / distance;
    const ny = dy / distance;
    const nz = dz / distance;
    const overlap = (minimum - distance) * .5;
    positions[a] -= nx * overlap;
    positions[a + 1] -= ny * overlap;
    positions[a + 2] -= nz * overlap;
    positions[b] += nx * overlap;
    positions[b + 1] += ny * overlap;
    positions[b + 2] += nz * overlap;
    const relative = (velocities[b] - velocities[a]) * nx + (velocities[b + 1] - velocities[a + 1]) * ny + (velocities[b + 2] - velocities[a + 2]) * nz;
    if (relative >= 0) return;
    const impulse = -relative * .88;
    velocities[a] -= nx * impulse;
    velocities[a + 1] -= ny * impulse;
    velocities[a + 2] -= nz * impulse;
    velocities[b] += nx * impulse;
    velocities[b + 1] += ny * impulse;
    velocities[b + 2] += nz * impulse;
  }

  function update(delta) {
    const step = Math.min(delta, .032) * 60;
    for (let index = 0; index < count; index++) {
      const offset = index * 3;
      velocities[offset + 1] -= .0022 * gravity * sizes[index] * step;
      velocities[offset] *= friction;
      velocities[offset + 1] *= friction;
      velocities[offset + 2] *= friction;

      if (pointerActive) {
        const dx = positions[offset] - pointerWorld.x;
        const dy = positions[offset + 1] - pointerWorld.y;
        const dz = positions[offset + 2] - pointerWorld.z;
        const distance = Math.hypot(dx, dy, dz) || 1;
        const reach = sizes[index] + 1.45;
        if (distance < reach) {
          const force = (reach - distance) / reach * .055;
          velocities[offset] += dx / distance * force;
          velocities[offset + 1] += dy / distance * force;
          velocities[offset + 2] += dz / distance * force;
        }
      }

      const speed = Math.hypot(velocities[offset], velocities[offset + 1], velocities[offset + 2]);
      if (speed > maxVelocity) {
        velocities[offset] = velocities[offset] / speed * maxVelocity;
        velocities[offset + 1] = velocities[offset + 1] / speed * maxVelocity;
        velocities[offset + 2] = velocities[offset + 2] / speed * maxVelocity;
      }
      positions[offset] += velocities[offset] * step;
      positions[offset + 1] += velocities[offset + 1] * step;
      positions[offset + 2] += velocities[offset + 2] * step;

      const radius = sizes[index];
      if (Math.abs(positions[offset]) + radius > bounds.x) {
        positions[offset] = Math.sign(positions[offset]) * (bounds.x - radius);
        velocities[offset] *= -wallBounce;
      }
      if (positions[offset + 1] - radius < -bounds.y) {
        positions[offset + 1] = -bounds.y + radius;
        velocities[offset + 1] = Math.abs(velocities[offset + 1]) * wallBounce;
      } else if (positions[offset + 1] + radius > bounds.y) {
        positions[offset + 1] = bounds.y - radius;
        velocities[offset + 1] = -Math.abs(velocities[offset + 1]) * wallBounce;
      }
      if (Math.abs(positions[offset + 2]) + radius > bounds.z) {
        positions[offset + 2] = Math.sign(positions[offset + 2]) * (bounds.z - radius);
        velocities[offset + 2] *= -wallBounce;
      }
    }

    for (let first = 0; first < count; first++) {
      for (let second = first + 1; second < count; second++) resolveCollision(first, second);
    }

    for (let index = 0; index < count; index++) {
      const offset = index * 3;
      dummy.position.set(positions[offset], positions[offset + 1], positions[offset + 2]);
      dummy.scale.setScalar(sizes[index]);
      dummy.updateMatrix();
      spheres.setMatrixAt(index, dummy.matrix);
    }
    spheres.instanceMatrix.needsUpdate = true;
  }

  function render() {
    renderer.render(scene, camera);
  }

  function animate(time) {
    if (!visible || reducedMotion) return;
    const delta = (time - lastTime) / 1000;
    lastTime = time;
    update(delta);
    render();
    animationFrame = requestAnimationFrame(animate);
  }

  function updatePointer(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    pointerActive = Boolean(raycaster.ray.intersectPlane(plane, pointerWorld));
  }

  host.addEventListener('pointermove', updatePointer, { passive: true });
  host.addEventListener('pointerleave', () => { pointerActive = false; });
  new ResizeObserver(resize).observe(host);
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    cancelAnimationFrame(animationFrame);
    if (visible && !reducedMotion) {
      lastTime = performance.now();
      animationFrame = requestAnimationFrame(animate);
    } else if (visible) {
      update(0);
      render();
    }
  }).observe(host);

  resize();
}
