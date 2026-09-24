/**
 * enforceCameraHeight.js —— 地面跟随 + 眼高 1.4m（强制）
 * --------------------------------------------------------------------------
 * 向下射线取相机正下方地面 g，目标高度 = g + 1.4（眼高）。
 *   - 上下楼/坡面：地面逐级变化，相机跟随升降（下楼即时跟、上楼逐级跟）；
 *   - 防"被顶到二楼"：单帧只允许爬升 ≤ MAX_STEP(0.45m)，远处高台/楼板不抬；
 *   - 首帧先直接落定到 地面+1.4。
 * 仅在键盘位移时由 render 循环调用（静止/旋转不触发）。
 *
 * @param {THREE.PerspectiveCamera} camera
 * @param {object} lccObject
 * @param {object} opts - { eye?(1.4) m, maxStep?(0.45) m/帧, throttle?(60) ms, lift?:{value:number} }
 * @returns {(dt:number, now:number) => void}
 */
export function enforceCameraHeight(camera, lccObject, opts = {}) {
  const EYE = opts.eye ?? 1.4;        // 眼高（强制 1.4m）
  const FALL_ACC = 9.8;               // 重力加速度（米/秒^2）
  const MAX_FALL = 3.5;               // 最大下落速度（米/秒）
  const FALL_SNAP = 1.8;              // 短射线找模型面距离（站定用）
  const SMOOTH = 9;                  // 站立收敛平滑速率(1/秒)——不跳变、走路丝滑
  const STILL_DEAD = 0.02;            // 死区：2cm 内不再挪（防微抖）
  const lift = opts.lift || { value: 0 };
  const DOWN = { x: 0, y: -1, z: 0 };
  let fallV = 0;
  let prevContact = false; // 上一帧是否踩到模型（门控下落：避免加载瞬间碰撞未就绪→穿地）

  const inContact = (x, y, z) => {
    // 竖直小胶囊：脚下 EYE+0.05 → 眼下方 0.15，半径 0.2，检测脚下/身边真实模型
    try {
      const c = lccObject.intersectsCapsule({
        start: { x, y: y - EYE - 0.05, z },
        end:   { x, y: y - 0.15, z },
        radius: 0.2
      });
      return !!(c && c.hit);
    } catch (e) { return false; }
  };

  const topAt = (x, y, z, maxD) => {
    // 向下射线：找脚下模型顶面（maxD 可长可短）
    try {
      const h = lccObject.raycastFromOrigin({
        origin: { x, y: y - 0.1, z },
        direction: DOWN, maxDistance: maxD ?? (FALL_SNAP + 0.2), radius: 0.03
      });
      return h && Number.isFinite(h.y) ? h.y : null;
    } catch (e) { return null; }
  };
  let fallT = 0; // 持续悬空时间（防无限下坠）
  let lastT = 0; // 探测节流：50ms 一次（降 CPU 射线开销）

  const step = (dt, now) => {
    const p = camera ? camera.position : null;
    if (!p) return;
    if (now - lastT < 50) return; // 50ms 节流：不逐帧探测，省 CPU
    lastT = now;

    const contact = inContact(p.x, p.y, p.z);
    if (contact) {
      // 脚下有真实模型：平滑站到 模型顶面 + 眼高（强制 1.4m），不硬跳→走路丝滑
      const g = topAt(p.x, p.y, p.z);
      if (g !== null) {
        const t = g + EYE + lift.value;
        const d = t - p.y;
        if (Math.abs(d) > STILL_DEAD) {
          // 指数平滑逼近（速率 SMOOTH/s），任何高差都连续移动，绝无跳变
          let step = d * Math.min(1, SMOOTH * (dt || 0.016));
          if (Math.abs(d) > 0.8) step = Math.sign(d) * Math.max(Math.abs(step), Math.abs(d) * 0.5); // 大落差(平台/台阶)也尽量快速贴合但保持连续
          p.y += step;
        }
      }
      fallV = 0;
      prevContact = true;
      return;
    }

    // 无支撑：仅当上一帧刚离开模型（走离边缘/楼梯）才允许下落；
    // 初始未接触（碰撞几何未就绪）保持原位，绝不凭空穿地
    if (prevContact) {
      // 下落中：长射线找落脚模型面，找到直接站定（避免悬空点长距离坠落）
      const g = topAt(p.x, p.y, p.z, 25);
      if (g !== null && g < p.y - 0.4) {
        p.y = g + EYE + lift.value;
        fallV = 0; fallT = 0;
        prevContact = true;
        return;
      }
      fallT += dt || 0.016;
      if (fallT < 4) { // 悬空 >4s 仍无面 → 停止下坠，防止穿到未知深度
        fallV = Math.min(fallV + FALL_ACC * (dt || 0.016), MAX_FALL);
        p.y -= fallV * (dt || 0.016);
      } else {
        fallV = 0;
      }
    } else {
      fallV = 0;
    }
    prevContact = contact;
  };

  return step;
}
