/**
 * 全局配置
 */
// dataPath 需为绝对 URL（SDK 内部 new URL() 解析），基于当前页面 origin 拼接
export const DATA_PATH = window.location.origin + '/output/render2/' + encodeURIComponent('万林.lcc2');
export const APP_KEY = ''; // 去水印用，可联系官方销售申请
// 默认相机定位：以 2026-09-22 记录的实际当前视角为准（Z-up→Y-up 翻转后）
export const CAMERA = {
  fov: 45,
  near: 0.1,
  far: 15000,
  position: [11.37, -7.52, 8.65],
  target: [13.55, -7.37, 7.03]
};
// 官方 SDK 候选文件（下载后放到如下任一位置即可）
export const SDK_CANDIDATES = [
  '../vendor/lcc.js',
  '../vendor/lcc-0.6.3.js',
  '../vendor/lcc/lcc.js'
];