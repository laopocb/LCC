/**
 * 显示“缺少 SDK”引导面板（隐藏进度面板）
 */
export function showSdkTip() {
  const tip = document.getElementById('sdk-tip');
  const panel = document.getElementById('progress-panel');
  if (tip) tip.style.display = 'flex';
  if (panel) panel.style.display = 'none';
}