/**
 * bodyCollision.js —— 相机胶囊体碰撞：距高斯数据 0.5m 水平弹开（硬性）
 * --------------------------------------------------------------------------
 * 用 SDK 的 intersectsCapsule 把相机当作一个“竖直胶囊体”（radius=0.5m）：
 *   - 一旦与高斯/墙体相撞，返回的 delta 是把它推离到恰好 0.5m 间距的最小向量；
 *   - 直接取 delta 的 x/z 水平分量对相机做**硬性位置修正**（每帧），保证相机永远
 *     和模型数据保持 ≥0.5m；
 *   - 完全忽略 delta.y：避免墙壁的地面/斜坡把相机顶高（这正是“被顶到二楼”的来源）。
 *
 * 返回 step(dt, now)，由 render 主循环统一调用。
 *
 * @param {THREE.PerspectiveCamera} camera
 * @param {object} lccObject - LCCRender.load 返回值（intersectsCapsule）
 * @param {object} opts - { clearance?(0.5) m, bodyLow?(1.5) m, bodyHigh?(0.6) m, throttle?(66) ms, axisCap?(2.0) m }
 * @returns {(dt:number, now:number) => void}
 */
export function enableBodyCollision(camera, lccObject, opts = {}) {
  const CLEAR = opts.clearance ?? 0.5;   // 碰撞半径/间距 0.5m
  const BODY_LOW = opts.bodyLow ?? 1.5;  // 胶囊底部：相机y 下方（贴近脚底，能拦上升坡/矮墙）
  const BODY_HIGH = opts.bodyHigh ?? 0.6;// 胶囊顶部：相机y 上方
  const THROTTLE = opts.throttle ?? 66;  // 探测节流 ms（更快响应）
  const AXIS_CAP = opts.axisCap ?? 2.0;  // 单次单轴最大修正，防止瞬移

  let lastT = 0;

  const push = (px, dx) => {
    if (!Number.isFinite(dx)) return px;
    if (dx > AXIS_CAP) dx = AXIS_CAP; else if (dx < -AXIS_CAP) dx = -AXIS_CAP;
    return px + dx;
  };

  const step = (dt, now) => {
    const p = camera ? camera.position : null;
    if (!p || !lccObject || typeof lccObject.intersectsCapsule !== 'function') return;
    if (now - lastT < THROTTLE) return;
    lastT = now;

    let res = null;
    try {
      res = lccObject.intersectsCapsule({
        start: { x: p.x, y: p.y - BODY_LOW, z: p.z },
        end:   { x: p.x, y: p.y + BODY_HIGH, z: p.z },
        radius: CLEAR
      });
    } catch (e) { return; }
    if (!res || !res.hit) return;

    const d = res.delta || {};
    const dx = d.x, dz = d.z;
    // 只做水平硬修正，绝不改 y（避免被抬到上层）
    if (Number.isFinite(dx) && Math.abs(dx) > 1e-4) p.x = push(p.x, dx);
    if (Number.isFinite(dz) && Math.abs(dz) > 1e-4) p.z = push(p.z, dz);
  };

  return step;
}