import * as THREE from 'three';
import { loadSdk } from './loadSdk.js?v=34';
import { DATA_PATH, APP_KEY } from './config.js?v=34';
import { updateProgress } from './updateProgress.js?v=34';

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
  // 画质档位（P0-4）：手机=流畅；3060 以下=标准；3060 及以上=精细
  const TIERS = {
    smooth:   { splats: 6000000,  node: 3000000 },
    standard: { splats: 8000000,  node: 3500000 },
    fine:   { splats: 12000000, node: 4000000 }
  };
  let gpuTier = 'standard';
  try {
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints && navigator.maxTouchPoints > 1 && window.innerWidth < 1024);
    if (isMobile) {
      gpuTier = 'smooth';
    } else {
      let gpu = '';
      try {
        const gl = document.createElement('canvas').getContext('webgl') || document.createElement('canvas').getContext('experimental-webgl');
        if (gl) { const ext = gl.getExtension('WEBGL_debug_renderer_info'); if (ext) gpu = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || ''; }
      } catch (e) {}
      const mm = gpu.match(/(?:RTX|GTX|RX)?\s*(\d{3,4})/i);
      const num = mm ? parseInt(mm[1], 10) : 0;
      gpuTier = num >= 3060 ? 'fine' : 'standard'; // 3060 及以上→精细；以下/未知→标准
    }
  } catch (e) {}
  const TIER = TIERS[gpuTier];
  console.log('[LCC] 画质档位 = ' + gpuTier + ' | maxSplats ' + TIER.splats);

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
        lccObject.setMaxSplats(TIER.splats);
        lccObject.setMaxNodeSplats(TIER.node);
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
    sdkUpdate() { LCCRenderModule.update(); },
    renderLoop(ctx2) {
      ctx2.renderer.render(ctx2.scene, ctx2.camera);
    }
  };
}