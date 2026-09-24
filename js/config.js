/**
 * 全局配置
 */
// dataPath 需为绝对 URL（SDK 内部 new URL() 解析），基于当前页面 origin 拼接
export const DATA_PATH = window.location.origin + '/output/render2/' + encodeURIComponent('万林.lcc2');
export const APP_KEY = ''; // 去水印用，可联系官方销售申请
// ===== 机位预设 =====
// c1（原默认，2026-09-22 记录的视角，当前默认生效）
export const CAMERA = {
  fov: 60,
  near: 0.1,
  far: 15000,
  position: [11.37, -7.52, 8.65],
  target: [19.69, -8.15, 3.14]   // 机位 c1：2026-09-23 定版视角（前向 10m）
};
// c2（P0-1 候选机位①；需切回时把它换回 CAMERA 即可）
// { fov:45, near:0.1, far:15000, position:[10.23,-0.03,10.64], target:[2.70,2.34,11.92] }
// 官方 SDK 候选文件（下载后放到如下任一位置即可）
export const SDK_CANDIDATES = [
  '../vendor/lcc.js',
  '../vendor/lcc-0.6.3.js',
  '../vendor/lcc/lcc.js'
];