/**
 * main.tune.js —— 调优台版本入口（不动原版 main.js）
 * 与原版差异：加载完成后挂载"观感调优台"面板，方便实时试机位/画质/调色。
 */
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
import { mountTunePanel } from './tunePanel.js?v=34';

const canvas = document.getElementById('canvas');

main();

async function main() {
  const renderer = createRenderer(canvas);
  const scene = createScene();
  const camera = createCamera();

  const look = enableFirstPersonLook(camera, canvas, { pitchLimit: 30, sensitivity: 0.0025, damping: 0.15 });
  window.__dbg = { camera, look, renderer, scene };

  startCameraLog(camera, { getPose: () => look.getPose() });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  try {
    const { lccObject, renderLoop, sdkUpdate } = await loadLCC({ camera, scene, canvas, renderer });

    // LCC SDK 加载时可能挪动相机：加载完成后强制回到 config 预设位姿
    camera.position.set(...CAMERA.position);
    camera.lookAt(...CAMERA.target);
    camera.rotation.order = 'YXZ';
    const e0 = camera.rotation;
    look.setPose(e0.y, e0.x);

    const heightStep = enforceCameraHeight(camera, lccObject, { eye: 1.5 });
    const wasdUpdate = enableWasdMove(camera, { speed: 3 });
    const bodyStep = enableBodyCollision(camera, lccObject, { clearance: 0.5 });

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

      const keyMove = wasdUpdate.active();
      const anyInput = keyMove || look.active();
      const pX0 = camera.position.x, pZ0 = camera.position.z;
      sdkUpdate();
      wasdUpdate(dt);
      if (keyMove) heightStep(dt, now);
      if (keyMove) bodyStep(dt, now, pX0, pZ0);
      look();

      if (anyInput) {
        syncFrozen();
      } else {
        camera.position.set(fx, fy, fz);
        camera.quaternion.set(fqx, fqy, fqz, fqw);
      }
      renderLoop({ camera, scene, canvas, renderer });
    });

    // 挂载调优台
    const panel = mountTunePanel({ camera, look, renderer, scene, canvas, lccObject });
    window.__tune = panel;

    window.addEventListener('beforeunload', () => { wasdUpdate.stop(); look.stop(); });
  } catch (e) {
    console.error(e);
    showSdkTip();
  }
}
