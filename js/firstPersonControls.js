/**
 * firstPersonControls.js —— 第一人称视角控制（替代 OrbitControls 的 target 环绕）
 * --------------------------------------------------------------------------
 * 相机自身保存 水平角(yaw) / 俯仰角(pitch)：
 *   - 仅左键拖拽：水平 360° 旋转，俯仰锁定在 ±pitchLimit°（默认 ±30°）；
 *   - 阻尼：松开后缓慢停下，手感顺滑；
 *   - 只改相机朝向，不改位置。
 * 采用 setPointerCapture + preventDefault + touch-action:none，防止浏览器原生
 * 拖拽/手势截断 pointermove，保证真实鼠标拖拽稳定生效。
 *
 * @param {THREE.PerspectiveCamera} camera
 * @param {HTMLElement} canvas
 * @param {object} opts - { pitchLimit?(30) 度, sensitivity?(0.0025), damping?(0.15) }
 * @returns {object} update()；带 getPose()/setPose(yaw,pitch)/stop()/active()
 */
import * as THREE from 'three';

export function enableFirstPersonLook(camera, canvas, opts = {}) {
  const LIMIT = ((opts.pitchLimit ?? 30) * Math.PI) / 180;
  const SENS = opts.sensitivity ?? 0.0025;
  const DAMP = opts.damping ?? 0.15;

  camera.rotation.order = 'YXZ';

  let yaw = 0, pitch = 0;
  try {
    const e = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    yaw = e.y; pitch = e.x;
  } catch (_) {}

  let yawVel = 0, pitchVel = 0;
  let dragging = false;
  const last = { x: 0, y: 0 };

  canvas.style.cursor = 'grab';
  canvas.style.touchAction = 'none'; // 禁止浏览器手势截断拖拽

  const onDown = (e) => {
    if (e.button !== 0) return;      // 仅左键拖拽旋转
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    dragging = true;
    last.x = e.clientX; last.y = e.clientY;
    canvas.style.cursor = 'grabbing';
  };
  const onMove = (e) => {
    if (!dragging) return;
    e.preventDefault();
    const dx = e.clientX - last.x, dy = e.clientY - last.y;
    last.x = e.clientX; last.y = e.clientY;
    yawVel -= dx * SENS;
    pitchVel -= dy * SENS;
  };
  const onUp = (e) => {
    dragging = false;
    canvas.style.cursor = 'grab';
    try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
  };

  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);

  const update = () => {
    yawVel *= (1 - DAMP);
    pitchVel *= (1 - DAMP);
    yaw += yawVel;
    pitch += pitchVel;
    pitch = Math.max(-LIMIT, Math.min(LIMIT, pitch));
    camera.rotation.set(pitch, yaw, 0);
  };

  update.getPose = () => ({ yaw, pitch });
  update.setPose = (y, p) => { yaw = y; pitch = Math.max(-LIMIT, Math.min(LIMIT, p)); };
  update.active = () => dragging || Math.abs(yawVel) > 1e-6 || Math.abs(pitchVel) > 1e-6;
  update.stop = () => {
    canvas.removeEventListener('pointerdown', onDown);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
  };
  return update;
}