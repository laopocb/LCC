/**
 * enforceCameraHeight.js —— 基准地面锁定 + 手动抬升（避免被顶到二楼）
 * --------------------------------------------------------------------------
 * 不再逐帧“顺着脚下地面自动爬升”（那会把相机一路托上坡/高台到二楼）。
 * 改为：首次探测出生点下方的基准地面 baseY，此后相机高度 = baseY + 眼高 + 手动抬升，
 * 即相机**锁定在地面一层**，只有按住 R/F 才升降。撞墙/斜坡由 bodyCollision 水平推开。
 *
 * 返回 step(dt, now)，由 render 主循环统一调用。
 *
 * @param {THREE.PerspectiveCamera} camera
 * @param {object} lccObject - LCCRender.load 返回值（raycastFromOrigin/getBounds）
 * @param {object} opts - { eye?(1.5), smooth?(8), lift?:{value:number}, deadZone?(0.02) }
 * @returns {(dt:number, now:number) => void}
 */
export function enforceCameraHeight(camera, lccObject, opts = {}) {
  const EYE = opts.eye ?? 1.5;
  const SMOOTH = opts.smooth ?? 8;
  const DEAD = opts.deadZone ?? 0.02;
  const lift = opts.lift || { value: 0 };   // 用户 R/F 手动抬升量（m）
  const BASE_PRESET = Number.isFinite(opts.baseY) ? opts.baseY : null; // 预设基准（来自 config，未被 SDK 篡改）
  const MAX_DROP = 60;

  let baseY = null;   // 基准地面高度（出生点下方），只测一次
  let first = true;

  const groundAt = (origin) => {
    if (lccObject && typeof lccObject.raycastFromOrigin === 'function') {
      try {
        const hit = lccObject.raycastFromOrigin({
          origin, direction: { x: 0, y: -1, z: 0 }, maxDistance: MAX_DROP, radius: 0.05
        });
        if (hit && Number.isFinite(hit.y)) return hit.y;
      } catch (e) {}
    }
    return null;
  };

  const step = (dt, now) => {
    const p = camera ? camera.position : null;
    if (!p) return;

    if (baseY === null) {
      // 基准：优先取 config 预设（SDK 加载时可能挪过相机，避免把 SDK 的位置当基准）
      baseY = BASE_PRESET !== null ? BASE_PRESET : (p.y - EYE);
    }

    const target = baseY + EYE + (Number.isFinite(lift.value) ? lift.value : 0);
    if (first) { p.y = target; first = false; return; }
    if (Math.abs(p.y - target) > DEAD) {
      // 硬性钉死到目标高度：SDK 每帧可能把相机挪回自己的位置，平滑修正会输给它
      p.y = target;
    }
  };

  return step;
}