import * as THREE from 'three';
import { loadSdk } from './loadSdk.js';
import { DATA_PATH, APP_KEY } from './config.js';
import { updateProgress } from './updateProgress.js';

let LCCRenderModule = null;

// 参考 D:\lm\w ply 翻转：Z-up → Y-up，绕 X 轴 -90°
const MODEL_MATRIX = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));

/**
 * 加载 .lcc/.lcc2 分块高斯模型（官方 LCCRender.load）
 * @param {object} ctx - { camera, scene, renderer, canvas, controls }
 * @returns {Promise<{ lccObject, renderLoop }>}
 */
export async function loadLCC(ctx) {
  updateProgress(0, '初始化 SDK');
  const { LCCRender } = await loadSdk();
  LCCRenderModule = LCCRender;

  const lccObject = LCCRender.load(
    {
      camera: ctx.camera,
      scene: ctx.scene,
      dataPath: DATA_PATH,
      renderLib: THREE,
      canvas: ctx.canvas,
      renderer: ctx.renderer,
      useEnv: true,           // 加载环境光照
      useIndexDB: true,       // 本地缓存，二次打开更快
      useLoadingEffect: true, // 加载圈层特效
      gpuAcceleration: true,  // GPU 加速
      modelMatrix: MODEL_MATRIX, // Z-up → Y-up 翻转
      appKey: APP_KEY
    },
    function (mesh) {
      console.log('LCC 模型加载完成', mesh);
      // 性能参数：根据设备能力配置
      try {
        lccObject.setStartLod(0);
        lccObject.setMaxSplats(6000000);
        lccObject.setMaxNodeSplats(3000000);
        lccObject.setMaxDistance(300);
        lccObject.setLodAutoLevelUp(true);
      } catch (e) {
        console.warn('LOD 配置未生效（旧版本 SDK）', e);
      }
      updateProgress(1, '加载完成');
    },
    function (percent) {
      updateProgress(percent, '加载中');
    },
    function () {
      updateProgress(-1, '加载失败');
      console.error('LCC 模型加载失败');
    }
  );

  // 暴露实例便于控制台调试/探测碰撞
  window.lccObj = lccObject;

  return {
    lccObject,
    renderLoop(ctx2) {
      LCCRenderModule.update();
      ctx2.renderer.render(ctx2.scene, ctx2.camera);
    }
  };
}