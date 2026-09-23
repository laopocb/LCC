/**
 * posePresets.js —— 机位预设
 * ---------------------------------------------------------------------------
 * 数据来源：output/render2/info/poses.json 里 26834 个**真实采集相机位姿**。
 * 筛选条件：连续 1.5s 内位移 < 0.15m 且朝向变化 < 15°（= 采集者驻足观看的瞬间），
 *           俯仰角在 ±25° 内，彼此间距 > 2.5m 去重，按距轨迹质心排序。
 * 坐标已从原始 Z-up 转到页面坐标（Rx(-90°)）：new = (x, z, -y)
 *
 * 为什么用它：这是"人当时站在这里、看着这个方向"的真实视角，
 * 因此不可能贴墙、不可能穿模、前方一定有内容 —— 是最稳的取景来源。
 */

export const POSE_PRESETS = [
  {
    id: 1,
    label: '展厅中部 · 正对主展墙',
    note: '停留 0.08m / 朝向变化 9.5° · 采集时最稳的驻足点',
    position: [10.23, -0.03, 10.64],
    target: [2.70, 2.34, 11.92],
    fov: 60
  },
  {
    id: 2,
    label: '中偏前 · 仰看展墙',
    note: '停留 0.11m / 14.9° · 俯仰 +24.5°',
    position: [10.36, 0.02, 3.87],
    target: [3.11, 3.34, 4.58],
    fov: 60
  },
  {
    id: 3,
    label: '低视点 · 平视纵深',
    note: '停留 0.10m / 7.9° · 俯仰 -8.1°，近乎水平',
    position: [8.25, -6.91, 10.78],
    target: [0.33, -8.03, 10.98],
    fov: 65
  },
  {
    id: 4,
    label: '展厅中轴 · 反向平移',
    note: '停留 0.14m / 9.2° · 俯仰 -12.9°',
    position: [4.59, 0.42, 5.71],
    target: [12.39, -1.37, 5.92],
    fov: 60
  },
  {
    id: 5,
    label: '远端 · 平行展墙',
    note: '停留 0.01m / 0.7° · 几乎完全静止的机位',
    position: [10.72, -1.24, 20.16],
    target: [18.13, 1.78, 20.12],
    fov: 65
  },
  {
    id: 6,
    label: '左端 · 望向中厅',
    note: '停留 0.14m / 8.1° · 俯仰 -3.0°',
    position: [-0.35, -2.26, 9.79],
    target: [-8.32, -2.69, 9.33],
    fov: 65
  },
  {
    id: 7,
    label: '左端偏内 · 望向主区',
    note: '停留 0.08m / 14.9° · 俯仰 -9.0°',
    position: [-0.57, -1.67, 7.25],
    target: [-8.47, -2.91, 7.56],
    fov: 65
  },
  {
    id: 8,
    label: '前区 · 俯看地面',
    note: '停留 0.13m / 9.1° · 俯仰 -23.7°',
    position: [6.41, -0.01, -1.39],
    target: [-0.85, -3.22, -0.42],
    fov: 65
  }
];

/**
 * 把预设应用到相机（同时同步第一人称控制器的 yaw/pitch，避免拖拽时跳变）
 * @param {THREE.PerspectiveCamera} camera
 * @param {object} look - enableFirstPersonLook 返回的 update 函数（带 setPose）
 * @param {object} preset
 */
export function applyPose(camera, look, preset) {
  const [px, py, pz] = preset.position;
  const [tx, ty, tz] = preset.target;

  camera.position.set(px, py, pz);

  // 目标点 → 单位前向向量 → yaw/pitch（three 相机默认朝 -Z）
  let fx = tx - px, fy = ty - py, fz = tz - pz;
  const len = Math.hypot(fx, fy, fz) || 1;
  fx /= len; fy /= len; fz /= len;

  const yaw = Math.atan2(-fx, -fz);
  const pitch = Math.asin(Math.max(-1, Math.min(1, fy)));

  camera.rotation.order = 'YXZ';
  camera.rotation.set(pitch, yaw, 0);

  if (look && typeof look.setPose === 'function') look.setPose(yaw, pitch);
  if (typeof preset.fov === 'number') {
    camera.fov = preset.fov;
    camera.updateProjectionMatrix();
  }
  return { yaw, pitch };
}

/** 读取当前相机位姿，生成可直接粘贴进 config.js 的片段 */
export function snapshotPose(camera, look) {
  const pose = look && typeof look.getPose === 'function' ? look.getPose() : {};
  const yaw = Number.isFinite(pose.yaw) ? pose.yaw : camera.rotation.y;
  const pitch = Number.isFinite(pose.pitch) ? pose.pitch : camera.rotation.x;
  const p = camera.position;
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const sy = Math.sin(yaw), cy = Math.cos(yaw);
  // 前向 = R_y(yaw)·R_x(pitch)·(0,0,-1)
  const f = [-sy * cp, sp, -cy * cp];
  const L = 8;
  return {
    yaw, pitch,
    code:
      `  fov: ${camera.fov.toFixed(0)},\n` +
      `  position: [${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}],\n` +
      `  target: [${(p.x + f[0] * L).toFixed(2)}, ${(p.y + f[1] * L).toFixed(2)}, ${(p.z + f[2] * L).toFixed(2)}]`
  };
}
