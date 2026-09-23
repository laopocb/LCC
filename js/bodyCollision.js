/**
 * bodyCollision.js —— 穿墙拦截（对称：从屋内外任意一侧都无法穿过墙体）
 * --------------------------------------------------------------------------
 * 方案：按“本帧实际位移方向”打水平射线（raycastFromOrigin，世界坐标），
 *   若前方 CLEAR(0.5m) 内出现碰撞面，就把移动钳制在“该面 -CLEAR”处。
 * 仅用射线拦截（不再用胶囊最短路径推出，避免薄墙被推到墙外）。
 * 仅在键盘位移时由 render 循环调用；旋转/静止不触发任何位移。
 *
 * @param {THREE.PerspectiveCamera} camera
 * @param {object} lccObject
 * @param {object} opts - { clearance?(0.5) m }
 * @returns {(dt:number, now:number, prevX:number, prevZ:number) => void}
 */
export function enableBodyCollision(camera, lccObject, opts = {}) {
  const CLEAR = opts.clearance ?? 0.5;

  const step = (dt, now, prevX, prevZ) => {
    const p = camera ? camera.position : null;
    if (!p || !lccObject || typeof lccObject.raycastFromOrigin !== 'function') return;
    if (!Number.isFinite(prevX) || !Number.isFinite(prevZ)) return;

    const dx = p.x - prevX, dz = p.z - prevZ;
    const len = Math.hypot(dx, dz);
    if (len < 1e-5) return;

    const ux = dx / len, uz = dz / len;
    let hit = null;
    try {
      hit = lccObject.raycastFromOrigin({
        origin: { x: prevX, y: p.y, z: prevZ },
        direction: { x: ux, y: 0, z: uz },
        maxDistance: len + CLEAR + 0.05,
        radius: 0.05
      });
    } catch (e) { return; }
    if (!hit || !Number.isFinite(hit.x)) return;

    const hd = Math.hypot(hit.x - prevX, hit.z - prevZ); // 到墙的水平距离
    const allowed = hd - CLEAR;                          // 允许走到距墙 CLEAR
    if (allowed < len) {
      const k = allowed < 0 ? 0 : allowed;
      p.x = prevX + ux * k;
      p.z = prevZ + uz * k;
    }
  };

  return step;
}
