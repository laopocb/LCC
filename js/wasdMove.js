/**
 * wasdMove.js —— WASD 前后左右移动 + R/F 升降相机
 * --------------------------------------------------------------------------
 * W/S 前/后、A/D 左/右（沿水平面），R 上升、F 下降（自由抬高/降低相机，
 * 下限由 enforceCameraHeight 约束防止穿地）。
 * 只负责位移计算，不自行开 rAF、不调 controls.update()——
 * 由 render 主循环统一每帧调用一次 update(dt)。
 *
 * @param {THREE.PerspectiveCamera} camera
 * @param {object} opts - { speed?(3) 米/秒 }
 * @returns {function} update(dt)；带 .stop() 移除按键监听
 */
import * as THREE from 'three';

export function enableWasdMove(camera, opts = {}) {
  const SPEED = opts.speed ?? 3; // 米/秒
  const keys = { f: false, b: false, l: false, r: false, up: false, down: false };

  const down = (e) => {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp':    keys.f = true;  break;
      case 'KeyS': case 'ArrowDown':  keys.b = true;  break;
      case 'KeyA': case 'ArrowLeft':  keys.l = true;  break;
      case 'KeyD': case 'ArrowRight': keys.r = true;  break;
      case 'KeyR': keys.up = true;   break;
      case 'KeyF': keys.down = true; break;
      default: return;
    }
    e.preventDefault();
  };
  const up = (e) => {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp':    keys.f = false;  break;
      case 'KeyS': case 'ArrowDown':  keys.b = false;  break;
      case 'KeyA': case 'ArrowLeft':  keys.l = false;  break;
      case 'KeyD': case 'ArrowRight': keys.r = false;  break;
      case 'KeyR': keys.up = false;   break;
      case 'KeyF': keys.down = false; break;
    }
  };

  const forwardVec = new THREE.Vector3();
  const rightVec = new THREE.Vector3();

  const update = (dt) => {
    // 前向：相机朝向的水平分量（抬头/低头不改变行走方向）
    camera.getWorldDirection(forwardVec);
    forwardVec.y = 0;
    forwardVec.normalize();
    rightVec.crossVectors(forwardVec, camera.up).normalize();

    let hx = 0, hz = 0;
    if (keys.f) { hx += forwardVec.x; hz += forwardVec.z; }
    if (keys.b) { hx -= forwardVec.x; hz -= forwardVec.z; }
    if (keys.r) { hx += rightVec.x;  hz += rightVec.z; }
    if (keys.l) { hx -= rightVec.x;  hz -= rightVec.z; }
    const hl = Math.hypot(hx, hz);
    if (hl > 0) { hx /= hl; hz /= hl; }

    const dist = SPEED * dt;
    camera.position.x += hx * dist;
    camera.position.z += hz * dist;
    const vy = (keys.up ? 1 : 0) - (keys.down ? 1 : 0);
    if (vy) camera.position.y += vy * dist;
  };

  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);

  update.stop = () => {
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
  };

  return update;
}