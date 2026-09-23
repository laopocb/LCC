import { createRenderer } from './createRenderer.js?v=5';
import { createScene } from './createScene.js?v=5';
import { createCamera } from './createCamera.js?v=5';
import { loadLCC } from './loadLCC.js?v=5';
import { showSdkTip } from './showSdkTip.js?v=5';
import { startCameraLog } from './camlog.js?v=5';
import { CAMERA } from './config.js?v=5';
import { enforceCameraHeight } from './enforceCameraHeight.js?v=5';
import { enableWasdMove } from './wasdMove.js?v=5';
import { enableFirstPersonLook } from './firstPersonControls.js?v=5';

const canvas = document.getElementById('canvas');

main();

async function main() {
  const renderer = createRenderer(canvas);
  const scene = createScene();
  const camera = createCamera();

  // 初始位姿：始终使用 config 预设（不读 localStorage，每次刷新都回到最初位置）

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
    const { lccObject, renderLoop, sdkUpdate } = await loadLCC({ camera, scene, canvas, renderer });

    // LCC SDK 加载时可能挪动相机：加载完成后强制回到 config 预设位姿（含 y）
    camera.position.set(...CAMERA.position);
    camera.lookAt(...CAMERA.target);

    // 地板下限约束 + WASD 位移（W/S/A/D 移动、R/F 升降）
    const heightStep = enforceCameraHeight(camera, lccObject, { eye: 1.5 });
    const wasdUpdate = enableWasdMove(camera, { speed: 3 });

    // 相机铁律：无位移输入时位置+朝向完全冻结（渲染前最后钉死）；SDK 无权挪镜头
    let fx, fy, fz, fqx, fqy, fqz, fqw;
    const syncFrozen = () => {
      fx = camera.position.x; fy = camera.position.y; fz = camera.position.z;
      fqx = camera.quaternion.x; fqy = camera.quaternion.y; fqz = camera.quaternion.z; fqw = camera.quaternion.w;
    };
    syncFrozen();

    let last = performance.now();
    renderer.setAnimationLoop(() => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const moving = wasdUpdate.active() || look.active(); // 键盘位移或鼠标拖拽都算“移动”（否则冻结会即时撤销鼠标旋转）
      sdkUpdate();      // SDK 每帧更新（可能挪相机），先跑，随后被约束/冻结压回
      wasdUpdate(dt);   // WASD 平面移动 + R/F 升降
      if (moving) heightStep(dt, now); // 仅移动时做地板下限约束，静止时不动高度
      look();          // 第一人称朝向（俯仰 ±30° + 阻尼）

      if (moving) {
        syncFrozen(); // 移动中记录由我们控制的位姿
      } else {
        camera.position.set(fx, fy, fz);         // 无输入：渲染前钉死位置
        camera.quaternion.set(fqx, fqy, fqz, fqw); // 与朝向
      }
      renderLoop({ camera, scene, canvas, renderer });
    });
    window.addEventListener('beforeunload', () => { wasdUpdate.stop(); look.stop(); });
  } catch (e) {
    console.error(e);
    showSdkTip();
  }
}