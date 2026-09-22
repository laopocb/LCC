/**
 * 更新加载进度 UI
 * @param {number} percent 0~1；1 完成；-1 失败
 * @param {string} status  状态文本
 */
export function updateProgress(percent, status) {
  const fill = document.getElementById('progress-fill');
  const text = document.getElementById('progress-text');
  const st = document.getElementById('progress-status');
  if (fill && text && st) {
    const p = Math.round(Math.max(0, Math.min(1, percent)) * 100);
    fill.style.width = p + '%';
    text.textContent = p + '%';
    st.textContent = status || '';
  }
  if (percent === 1) {
    setTimeout(() => {
      const panel = document.getElementById('progress-panel');
      if (panel) panel.style.display = 'none';
    }, 400);
  }
  if (percent === -1) {
    const panel = document.getElementById('progress-panel');
    if (panel) panel.style.display = 'none';
  }
}