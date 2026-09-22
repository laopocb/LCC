/**
 * restoreCameraPose.js —— 从 localStorage 恢复上次保存的相机位姿
 * 无记录时返回 config 默认 CAMERA，保证首次打开仍有合理视角。
 * 兼容旧格式（保存过 target）：优先用新 yaw/pitch，没有则回退 target 让上层 lookAt。
 */
import { CAMERA } from './config.js';

const KEY = 'wanlin_camera_pose';

/**
 * 获取初始相机位姿（优先上次保存；否则 config 默认）
 * @returns {{position:number[], yaw?:number, pitch?:number, target?:number[], fov:number, near:number, far:number}}
 */
export function restoreCameraPose() {
  const def = {
    position: CAMERA.position,
    target: CAMERA.target,
    fov: CAMERA.fov,
    near: CAMERA.near,
    far: CAMERA.far,
    yaw: undefined,
    pitch: undefined
  };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (Array.isArray(p.position)) {
        const base = {
          position: p.position,
          fov: typeof p.fov === 'number' ? p.fov : CAMERA.fov,
          near: typeof p.near === 'number' ? p.near : CAMERA.near,
          far: typeof p.far === 'number' ? p.far : CAMERA.far,
          yaw: undefined,
          pitch: undefined
        };
        if (Number.isFinite(p.yaw) && Number.isFinite(p.pitch)) {
          base.yaw = p.yaw;
          base.pitch = p.pitch;
          return base; // 新格式：直接用 yaw/pitch
        }
        if (Array.isArray(p.target)) {
          base.target = p.target; // 旧格式：用 lookAt
          return base;
        }
      }
    }
  } catch (e) {
    console.warn('解析相机位姿失败，回退默认视角', e);
  }
  return def;
}