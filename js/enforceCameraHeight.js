/**
 * enforceCameraHeight.js —— 开启碰撞 + 每帧“地板”下限约束镜头（防穿地）
 * --------------------------------------------------------------------------
 * 每帧以相机正下方 (0,-1,0) 向下发射线，得到地面高度 g，允许的最低高度 = g + EYE。
 *   - 只做**下限约束**：相机低于地面+眼高（超死区）时平滑抬高至眼高（防穿地）；
 *   - 相机高于该下限时**不做任何处理**，允许用户自由抬高 / 降低相机位置。
 * 为避免抖动：
 *   - 地面探测做了**节流**（默认 120ms 一次），不逐帧打射线，兼顾帧率与采样噪声；
 *   - 修正带**死区**（默认 0.02m），低于地板超过死区才动作，消除边界处的上下反复。
 * 返回的是每帧 step(dt, now)，由 render 主循环统一调用（不自行开 rAF）。
 *
 * @param {THREE.PerspectiveCamera} camera
 * @param {object} lccObject - LCCRender.load 返回值（raycastFromOrigin/getBounds）
 * @param {object} opts - { eye?(1.5), smooth?(14), throttle?(120), deadZone?(0.02), maxDrop?(30) }
 * @returns {(dt:number, now:number) => void} 每帧步进函数
 */
export function enforceCameraHeight(camera, lccObject, opts = {}) {
  const EYE = opts.eye ?? 1.5;
  const SMOOTH = opts.smooth ?? 14;   // 收敛速率（每秒），越大跟得越紧
  const THROTTLE = opts.throttle ?? 120; // 地面探测节流 ms
  const DEAD = opts.deadZone ?? 0.02;    // 死区 m
  const MAX_DROP = opts.maxDrop ?? 30;
  const DOWN = { x: 0, y: -1, z: 0 };

  let floorY = null;   // 最近一次测得的最低高度（地面+眼高）
  let lastT = 0;

  const groundAt = (origin) => {
    if (lccObject && typeof lccObject.raycastFromOrigin === 'function') {
      try {
        const hit = lccObject.raycastFromOrigin({
          origin, direction: DOWN, maxDistance: MAX_DROP, radius: 0.05
        });
        if (hit && Number.isFinite(hit.y)) return hit.y;
      } catch (e) { /* 无碰撞数据则由调用方处理 */ }
    }
    return null; // 未命中，不约束
  };

  const step = (dt, now) => {
    const p = camera ? camera.position : null;
    if (!p) return;

    // 节流探测地面；未命中则沿用上一次的 floorY（避免场景空洞时高度猛变）
    if (now - lastT >= THROTTLE) {
      lastT = now;
      const g = groundAt({ x: p.x, y: p.y + EYE + 0.1, z: p.z });
      if (g !== null) floorY = g + EYE;
    }
    if (floorY === null) return;

    // 死区 + 平滑：明显低于地板才抬高，避免边界处上下反复抖动
    if (p.y < floorY - DEAD) {
      p.y += (floorY - p.y) * (1 - Math.exp(-SMOOTH * dt));
    }
  };

  return step;
}