/**
 * saveCameraPose.js —— 将当前相机位姿持久化到 localStorage
 * 记录 position / yaw / pitch / fov，供下次加载恢复为初始定位。
 */

const KEY = 'wanlin_camera_pose';

/**
 * 保存当前相机位姿（第一人称视角：yaw/pitch 代替旧的 target 焦点）
 * @param {THREE.PerspectiveCamera} camera
 * @param {function} getPose - () => { yaw:number, pitch:number }，来自第一人称控制器
 * @returns {object} 已保存的位姿快照
 */
export function saveCameraPose(camera, getPose) {
  const pose = getPose ? getPose() : { yaw: camera.rotation.y, pitch: camera.rotation.x };
  const data = {
    position: [camera.position.x, camera.position.y, camera.position.z],
    yaw: Number.isFinite(pose.yaw) ? pose.yaw : 0,
    pitch: Number.isFinite(pose.pitch) ? pose.pitch : 0,
    fov: camera.fov,
    near: camera.near,
    far: camera.far,
    savedAt: Date.now()
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('保存相机位姿失败(可能无 localStorage 权限)', e);
  }
  return data;
}