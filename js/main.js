import { createRenderer } from './createRenderer.js?v=34';
import { createScene } from './createScene.js?v=34';
import { createCamera } from './createCamera.js?v=34';
import { loadLCC } from './loadLCC.js?v=34';
import { showSdkTip } from './showSdkTip.js?v=34';
import { startCameraLog } from './camlog.js?v=34';
import { CAMERA } from './config.js?v=34';
import { enforceCameraHeight } from './enforceCameraHeight.js?v=34';
import { enableWasdMove } from './wasdMove.js?v=34';
import { enableFirstPersonLook } from './firstPersonControls.js?v=34';
import { enableBodyCollision } from './bodyCollision.js?v=34';

const canvas = document.getElementById('canvas');

main();

async function main() {
  const renderer = createRenderer(canvas);
  const scene = createScene();
  const camera = createCamera();

  // 初始位姿：始终使用 config 预设（不读 localStorage，每次刷新都回到最初位置）

  // 第一人称视角控制：俯仰锁 ±30°、水平 360°、带阻尼
  const look = enableFirstPersonLook(camera, canvas, { pitchLimit: 30, sensitivity: 0.0025, damping: 0.15 });

  window.__dbg = { camera, look }; // 调试句柄：F12 里可直接读/看相机

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
    const lift = { value: 0 }; // R/F 手动升降量
        const heightStep = enforceCameraHeight(camera, lccObject, { eye: 1.4, lift });
    const wasdUpdate = enableWasdMove(camera, { speed: 3, lift });
    const bodyStep = enableBodyCollision(camera, lccObject, { clearance: 0.5 });

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

      const keyMove = wasdUpdate.active(); // 只有键盘位移(WASD/R/F)才属于“位置移动”，旋转不算
      const anyInput = keyMove || look.active(); // 键盘或鼠标拖拽都算“有操作”（用于是否冻结 x/z 与朝向）
      const pX0 = camera.position.x, pZ0 = camera.position.z; // 帧内位移起始点
      sdkUpdate();      // SDK 每帧更新（可能挪相机），先跑，随后被约束压回
      wasdUpdate(dt);   // WASD 平面移动 + R/F 升降
      if (anyInput) {
        syncFrozen(); // 有操作时记录由我们控制的位姿
      } else {
        // 无输入：x/z 与朝向钉死；y 由“立足约束”接管（站到真实模型面+1.4，含悬空下落）
        camera.position.x = fx;
        camera.position.z = fz;
        camera.quaternion.set(fqx, fqy, fqz, fqw);
      }
      if (keyMove) bodyStep(dt, now, pX0, pZ0); // 仅键盘位移时做穿墙拦截；旋转永不触发位移
      heightStep(dt, now); // 每帧最后：眼高 1.4m 强制（含嵌地恢复），永远收尾
      look();          // 第一人称朝向（俯仰 ±30° + 阻尼）

      renderLoop({ camera, scene, canvas, renderer });
    });
    window.addEventListener('beforeunload', () => { wasdUpdate.stop(); look.stop(); });
  } catch (e) {
    console.error(e);
    showSdkTip();
  }
}