/**
 * wasdMove.js —— WASD 前后左右移动 + R/F 升降（升量写入 lift 对象）
 * --------------------------------------------------------------------------
 * W/S 前/后、A/D 左/右（沿水平面）；R 上升、F 下降——不直接改 position.y，
 * 而是累加到共享 lift.value，由 enforceCameraHeight 据此把相机抬/降，
 * 以免与"地面锁定 + 水平碰撞推开"冲突。
 * 只负责位移计算，不自行开 rAF。
 *
 * @param {THREE.PerspectiveCamera} camera
 * @param {object} opts - { speed?(3), lift?:{value:number} }
 * @returns {function} update(dt)；带 .stop()
 */
import * as THREE from 'three';

export function enableWasdMove(camera, opts = {}) {
  const SPEED = opts.speed ?? 3; // 米/秒
  const lift = opts.lift || { value: 0 };
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
    if (vy) lift.value += vy * dist; // 累计手动抬升量（不低于地面）
  };

  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);

  update.stop = () => {
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
  };

  return update;
}