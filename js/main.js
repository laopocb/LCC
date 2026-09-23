import { createRenderer } from './createRenderer.js';
import { createScene } from './createScene.js';
import { createCamera } from './createCamera.js';
import { loadLCC } from './loadLCC.js';
import { showSdkTip } from './showSdkTip.js';
import { startCameraLog } from './camlog.js';
import { restoreCameraPose } from './restoreCameraPose.js';
import { enforceCameraHeight } from './enforceCameraHeight.js';
import { enableWasdMove } from './wasdMove.js';
import { enableFirstPersonLook } from './firstPersonControls.js';

const canvas = document.getElementById('canvas');

main();

async function main() {
  const renderer = createRenderer(canvas);
  const scene = createScene();
  const camera = createCamera();

  // 恢复上次保存的位姿作为初始定位（第一人称：position + yaw/pitch）
  const posed = restoreCameraPose();
  camera.position.set(...posed.position);
  camera.fov = posed.fov;
  camera.updateProjectionMatrix();
  if (Number.isFinite(posed.yaw) && Number.isFinite(posed.pitch)) {
    camera.rotation.order = 'YXZ';
    camera.rotation.set(posed.pitch, posed.yaw, 0); // 新格式：直接给定朝向
  } else {
    camera.lookAt(...(posed.target || [0, 0, -1])); // 旧格式/默认：看向 target
  }

  // 第一人称视角控制：俯仰锁 ±30°、水平 360°、带阻尼
  const look = enableFirstPersonLook(camera, canvas, { pitchLimit: 30, sensitivity: 0.0025, damping: 0.15 });

  // 相机日志：默认每 4s 输出 pos/yaw/pitch/fov；按 L/S 保存当前位姿作为下次初始定位
  startCameraLog(camera, { getPose: () => look.getPose() });


  // 窗口尺寸自适应
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  try {
    const { lccObject, renderLoop } = await loadLCC({ camera, scene, canvas, renderer });

    // 地板下限约束 + WASD 位移（W/S/A/D 移动、R/F 升降）
    const heightStep = enforceCameraHeight(camera, lccObject, { eye: 1.5 });
    const wasdUpdate = enableWasdMove(camera, { speed: 3 });

    // 统一在单一 render 循环里按固定顺序处理：位移 → 高度约束 → 视角 → 渲染
    let last = performance.now();
    renderer.setAnimationLoop(() => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      wasdUpdate(dt);      // WASD 平面移动 + R/F 升降
      heightStep(dt, now); // 地板下限约束（防穿地，节流探测 + 死区）
      look();             // 第一人称朝向（俯仰 ±30° + 阻尼）
      renderLoop({ camera, scene, canvas, renderer });
    });
    window.addEventListener('beforeunload', () => { wasdUpdate.stop(); look.stop(); });
  } catch (e) {
    console.error(e);
    showSdkTip();
  }
}