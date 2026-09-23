/**
 * camlog.js —— 相机位姿日志（第一人称 yaw/pitch 版）
 * ------------------------------------------------------------------
 * 默认每 4s 向 console 输出当前相机 pos / yaw / pitch / fov；
 * 键盘按 L 随时输出并同时持久化到 localStorage（下次加载据此定位）；
 * 键盘按 S 仅保存当前位姿（不打断）。
 *   ?camlog=0   关闭日志
 *   ?camlog=N   间隔 N 秒（默认 4）
 *   ?camgpt=1   输出可直接粘贴的定位片段（json）
 *
 * @param {THREE.PerspectiveCamera} camera
 * @param {object} opts - { getPose?: ()=>({yaw,pitch}), interval? }
 */
import { saveCameraPose } from './saveCameraPose.js?v=5';

export function startCameraLog(camera, opts = {}) {
  const p = new URLSearchParams(location.search);
  const raw = p.get('camlog');
  const iv = raw === null ? 4 : parseFloat(raw);
  if (iv === 0) return () => {};
  const gpt = p.get('camgpt') === '1';
  const getPose = opts.getPose || (() => ({ yaw: camera.rotation.y, pitch: camera.rotation.x }));
  const fmt = (n) => (Number.isFinite(n) ? n.toFixed(2) : 'nan');

  const once = (doSave) => {
    if (!camera) return;
    const pose = getPose();
    const yaw = Number.isFinite(pose.yaw) ? pose.yaw : 0;
    const pitch = Number.isFinite(pose.pitch) ? pose.pitch : 0;
    if (gpt) {
      console.log('[cam-gpt]', JSON.stringify({
        position: [camera.position.x, camera.position.y, camera.position.z],
        yaw: yaw,
        pitch: pitch,
        fov: camera.fov,
        near: camera.near,
        far: camera.far
      }));
    } else {
      console.log('[cam] pos=(' + fmt(camera.position.x) + ', ' + fmt(camera.position.y) + ', ' + fmt(camera.position.z) + ')' +
        ' yaw=' + fmt(yaw) + ' pitch=' + fmt(pitch) + ' fov=' + camera.fov);
    }
    if (doSave) {
      saveCameraPose(camera, getPose);
      console.log('[cam] 已保存当前位姿，作为下次加载的初始定位');
    }
  };

  once(false);
  const timer = setInterval(() => once(false), iv * 1000);
  const onKey = (e) => {
    if (e.key === 'l' || e.key === 'L' || e.key === 's' || e.key === 'S') once(true);
  };
  window.addEventListener('keydown', onKey);
  return () => { clearInterval(timer); window.removeEventListener('keydown', onKey); };
}