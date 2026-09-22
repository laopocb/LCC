/**
 * firstPersonControls.js —— 第一人称视角控制（替代 OrbitControls 的 target 环绕）
 * --------------------------------------------------------------------------
 * 相机自身保存 水平角(yaw) / 俯仰角(pitch)：
 *   - 拖拽：水平 360° 旋转，俯仰锁定在 ±pitchLimit°（相对水平面，默认 ±30°）；
 *   - 阻尼：按住/松开都有惯性衰减，手感顺滑；
 *   - 只改相机朝向，不改位置（抬升/移动交给 wasdMove + enforceCameraHeight）。
 * 这样把“俯仰 ±30°”加在相机自身朝向上，而不是绕固定 target 的轨道极角，
 * 因而相机高度可自由抬升而不会像 OrbitControls 那样被拽回地面。
 *
 * @param {THREE.PerspectiveCamera} camera
 * @param {HTMLElement} canvas       - 接收拖拽事件的元素
 * @param {object} opts - { pitchLimit?(30) 度, sensitivity?(0.0025) 弧度/像素, damping?(0.15) 每帧衰减 }
 * @returns {object} update(dt)；带 getPose()/setPose(yaw,pitch)/stop()
 */
import * as THREE from 'three';

export function enableFirstPersonLook(camera, canvas, opts = {}) {
  const LIMIT = ((opts.pitchLimit ?? 30) * Math.PI) / 180; // ±30°
  const SENS = opts.sensitivity ?? 0.0025;                  // 弧度/像素
  const DAMP = opts.damping ?? 0.15;                        // 每帧速度衰减(0~1)

  camera.rotation.order = 'YXZ';

  // 以当前朝向初始化 yaw/pitch（避免从已载入位姿起步时跳动）
  let yaw = 0, pitch = 0;
  try {
    const e = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    yaw = e.y; pitch = e.x;
  } catch (_) { /* 用默认 0 */ }

  let yawVel = 0, pitchVel = 0;
  let dragging = false;
  const last = { x: 0, y: 0 };

  canvas.style.cursor = 'grab';
  const onDown = (e) => { dragging = true; last.x = e.clientX; last.y = e.clientY; canvas.style.cursor = 'grabbing'; };
  const onMove = (e) => {
    if (!dragging) return;
    const dx = e.clientX - last.x, dy = e.clientY - last.y;
    last.x = e.clientX; last.y = e.clientY;
    yawVel -= dx * SENS;
    pitchVel -= dy * SENS; // 上拖 → 抬头（方向不符可在浏览器确认后翻转符号）
  };
  const onUp = () => { dragging = false; canvas.style.cursor = 'grab'; };

  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);

  const update = () => {
    yawVel *= (1 - DAMP);
    pitchVel *= (1 - DAMP);
    yaw += yawVel;
    pitch += pitchVel;
    pitch = Math.max(-LIMIT, Math.min(LIMIT, pitch)); // 俯仰锁 ±30°
    camera.rotation.set(pitch, yaw, 0);
  };

  update.getPose = () => ({ yaw, pitch });
  update.setPose = (y, p) => { yaw = y; pitch = Math.max(-LIMIT, Math.min(LIMIT, p)); };
  update.stop = () => {
    canvas.removeEventListener('pointerdown', onDown);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
  };
  return update;
}