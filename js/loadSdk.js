import { SDK_CANDIDATES } from './config.js?v=34';

/**
 * 动态加载 XGrids Web SDK（专有库，需从开发者平台登录下载）
 * 兼容两种形态：ES Module 导出 { LCCRender } 或全局变量 LCC.LCCRender
 * @returns {Promise<{LCCRender: object}>}
 */
export async function loadSdk() {
  for (const path of SDK_CANDIDATES) {
    try {
      const mod = await import(path);
      if (mod && mod.LCCRender) return { LCCRender: mod.LCCRender };
    } catch (e) {
      // 尝试下一个候选
    }
  }
  // 兜底：全局变量形态
  if (window && window.LCC && window.LCC.LCCRender) {
    return { LCCRender: window.LCC.LCCRender };
  }
  throw new Error('SDK_NOT_FOUND');
}