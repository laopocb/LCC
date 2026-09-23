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
      // 以出生瞬间相机高度为基准：保持 config 预设的初始位置（含 y），不做拉拽
      baseY = p.y - EYE;
    }

    const target = baseY + EYE + (Number.isFinite(lift.value) ? lift.value : 0);
    if (first) { p.y = target; first = false; return; }
    if (Math.abs(p.y - target) > DEAD) {
      p.y += (target - p.y) * (1 - Math.exp(-SMOOTH * dt));
    }
  };

  return step;
}