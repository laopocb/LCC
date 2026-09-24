/**
 * tunePanel.js —— 观感调优台（自建 DOM，不依赖任何 UI 库）
 * ---------------------------------------------------------------------------
 * 为什么需要它：领导说"让高斯数据更好看"但没给具体指标，
 * 与其猜，不如把所有**可立即生效**的旋钮摊开，用眼睛定参数，再把定稿写回 config.js。
 *
 * 面板里每一项都是"确定生效"的手段：
 *   · 机位预设   —— 来自真实采集轨迹（见 posePresets.js），一定不贴墙
 *   · FOV        —— 室内用 45° 太窄，60~70° 空间感明显更好
 *   · 画质档位   —— setMaxSplats 决定细节量（总模型 3258 万）
 *   · 透明度     —— setAlpha 压掉半透明的"飞点"
 *   · 调色/暗角  —— 对 canvas 做 CSS 后处理，与 SDK 无关，必定生效
 *   · 背景       —— canvas 透明 + CSS 渐变，换掉纯黑"虚空感"
 *   · 位姿快照   —— 一键复制成 config.js 片段
 *
 * @param {object} ctx - { camera, look, renderer, scene, canvas, lccObject }
 */

import { POSE_PRESETS, applyPose as applyPreset, snapshotPose } from './posePresets.js?v=34';
import { CAMERA } from './config.js?v=34';

const LS_KEY = 'wanlin_tune_v1';

const DEFAULTS = {
  posId: 'current',
  fov: 45,
  quality: 'mid',
  alpha: 1,
  brightness: 1.0,
  contrast: 1.05,
  saturate: 1.05,
  vignette: true,
  bg: 'black'
};

const QUALITY = {
  low: { maxSplats: 3000000, maxNodeSplats: 1500000, label: '流畅 300万' },
  mid: { maxSplats: 6000000, maxNodeSplats: 3000000, label: '标准 600万' },
  high: { maxSplats: 16000000, maxNodeSplats: 6000000, label: '精细 1600万' }
};

const BG_PRESETS = {
  black: { css: '#0b0e14', clearAlpha: 1, label: '纯黑' },
  studio: {
    css: 'radial-gradient(120% 90% at 50% 42%, #1d2734 0%, #131a24 45%, #080b11 100%)',
    clearAlpha: 0,
    label: '影棚'
  },
  gray: { css: 'linear-gradient(180deg, #1a222c 0%, #0e131a 100%)', clearAlpha: 0, label: '渐变' }
};

export function mountTunePanel(ctx) {
  const { camera, look, renderer, canvas, lccObject } = ctx;
  const state = Object.assign({}, DEFAULTS, readLS());

  injectStyle();
  const root = buildDom();
  document.body.appendChild(root.panel);
  document.body.appendChild(root.toggle);

  // ---------- 应用函数 ----------
  function applyFilter() {
    const parts = [];
    if (Math.abs(state.brightness - 1) > 0.001) parts.push(`brightness(${state.brightness.toFixed(2)})`);
    if (Math.abs(state.contrast - 1) > 0.001) parts.push(`contrast(${state.contrast.toFixed(2)})`);
    if (Math.abs(state.saturate - 1) > 0.001) parts.push(`saturate(${state.saturate.toFixed(2)})`);
    canvas.style.filter = parts.join(' ');
    root.vignette.style.display = state.vignette ? 'block' : 'none';
  }

  function applyBg() {
    const p = BG_PRESETS[state.bg] || BG_PRESETS.black;
    canvas.style.background = p.css;
    try { renderer.setClearColor(0x0b0e14, p.clearAlpha); } catch (e) { /* ignore */ }
    root.bgButtons.forEach((b) => b.classList.toggle('on', b.dataset.bg === state.bg));
  }

  function applyFov() {
    camera.fov = state.fov;
    camera.updateProjectionMatrix();
    root.fovVal.textContent = state.fov + '°';
  }

  function applyQuality() {
    const q = QUALITY[state.quality] || QUALITY.mid;
    try {
      if (lccObject && lccObject.setMaxSplats) {
        lccObject.setMaxSplats(q.maxSplats);
        lccObject.setMaxNodeSplats(q.maxNodeSplats);
      }
    } catch (e) { console.warn('画质参数未生效', e); }
    root.qualityButtons.forEach((b) => b.classList.toggle('on', b.dataset.q === state.quality));
  }

  function applyAlpha() {
    try { if (lccObject && lccObject.setAlpha) lccObject.setAlpha(state.alpha); } catch (e) { /* ignore */ }
    root.alphaVal.textContent = state.alpha.toFixed(2);
  }

  function applyPose(id) {
    if (id === 'current') {
      // 用 config.js 里当前生效的默认位姿，便于和"候选机位"做 A/B 对比
      camera.position.set(...CAMERA.position);
      camera.lookAt(...CAMERA.target);
      camera.rotation.order = 'YXZ';
      const e = camera.rotation;
      if (look && look.setPose) look.setPose(e.y, e.x);
      state.fov = CAMERA.fov;
      root.fovInput.value = CAMERA.fov;
      root.fovVal.textContent = CAMERA.fov + '°';
      camera.fov = CAMERA.fov;
      camera.updateProjectionMatrix();
    } else {
      const p = POSE_PRESETS.find((x) => String(x.id) === String(id));
      if (p) {
        applyPreset(camera, look, p);
        state.fov = p.fov;
        root.fovInput.value = p.fov;
        root.fovVal.textContent = p.fov + '°';
      }
    }
    state.posId = id;
    root.poseButtons.forEach((b) => b.classList.toggle('on', String(b.dataset.id) === String(id)));
    refreshPoseText();
  }

  function refreshPoseText() {
    const s = snapshotPose(camera, look);
    root.poseText.textContent =
      `pos (${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)})` +
      `  yaw ${(s.yaw * 180 / Math.PI).toFixed(0)}°  pitch ${(s.pitch * 180 / Math.PI).toFixed(0)}°`;
    root.codeBox.value = `// 粘到 web/js/config.js 的 CAMERA\n{\n${s.code}\n}`;
  }

  // ---------- DOM ----------
  function buildDom() {
    const panel = document.createElement('div');
    panel.id = 'tp-panel';

    const head = document.createElement('div');
    head.className = 'tp-head';
    head.innerHTML = '<b>观感调优台</b><span class="tp-hint">H 键收起</span>';
    panel.appendChild(head);

    // 机位
    panel.appendChild(section('取景机位', '来自真实采集轨迹的驻足点，一定不贴墙'));
    const poseBox = document.createElement('div');
    poseBox.className = 'tp-grid';
    const poseButtons = [];
    const mk = (id, text, cls) => {
      const b = document.createElement('button');
      b.className = 'tp-btn ' + cls;
      b.dataset.id = id;
      b.textContent = text;
      b.onclick = () => { applyPose(id); save(); };
      poseButtons.push(b);
      poseBox.appendChild(b);
      return b;
    };
    mk('current', '初始（现在）', 'wide');
    POSE_PRESETS.forEach((p) => mk(String(p.id), '机位 ' + p.id, ''));
    panel.appendChild(poseBox);

    const poseText = document.createElement('div');
    poseText.className = 'tp-pose';
    panel.appendChild(poseText);

    // FOV
    const fovRow = slider('视场角 FOV', 40, 85, 1, state.fov, (v) => {
      state.fov = v; applyFov(); save();
    });
    panel.appendChild(fovRow.row);
    const fovVal = fovRow.val;
    const fovInput = fovRow.input;

    // 画质
    panel.appendChild(section('画质（模型共 3258 万 splat）'));
    const qBox = document.createElement('div');
    qBox.className = 'tp-grid';
    const qualityButtons = [];
    Object.entries(QUALITY).forEach(([k, v]) => {
      const b = document.createElement('button');
      b.className = 'tp-btn';
      b.dataset.q = k;
      b.textContent = v.label;
      b.onclick = () => { state.quality = k; applyQuality(); save(); };
      qualityButtons.push(b);
      qBox.appendChild(b);
    });
    panel.appendChild(qBox);

    // 透明度
    const aRow = slider('高斯透明度 setAlpha', 0.4, 1, 0.02, state.alpha, (v) => {
      state.alpha = v; applyAlpha(); save();
    }, '调低可压掉半透明的“飞点”');
    panel.appendChild(aRow.row);
    const alphaVal = aRow.val;

    // 调色
    panel.appendChild(section('画面调色', 'CSS 后处理，与 SDK 无关，必定生效'));
    const bRow = slider('亮度', 0.7, 1.5, 0.01, state.brightness, (v) => { state.brightness = v; applyFilter(); save(); });
    panel.appendChild(bRow.row);
    const cRow = slider('对比度', 0.7, 1.6, 0.01, state.contrast, (v) => { state.contrast = v; applyFilter(); save(); });
    panel.appendChild(cRow.row);
    const sRow = slider('饱和度', 0.5, 1.6, 0.01, state.saturate, (v) => { state.saturate = v; applyFilter(); save(); });
    panel.appendChild(sRow.row);
    const vRow = checkRow('暗角 Vignette', state.vignette, (v) => { state.vignette = v; applyFilter(); save(); });
    panel.appendChild(vRow);

    // 背景
    panel.appendChild(section('背景', '纯黑会让高斯“悬空”，渐变/影棚更有承托感'));
    const bgBox = document.createElement('div');
    bgBox.className = 'tp-grid';
    const bgButtons = [];
    Object.entries(BG_PRESETS).forEach(([k, v]) => {
      const b = document.createElement('button');
      b.className = 'tp-btn';
      b.dataset.bg = k;
      b.textContent = v.label;
      b.onclick = () => { state.bg = k; applyBg(); save(); };
      bgButtons.push(b);
      bgBox.appendChild(b);
    });
    panel.appendChild(bgBox);

    // 位姿导出
    panel.appendChild(section('定稿导出', '调好后复制这段，粘进 config.js'));
    const codeBox = document.createElement('textarea');
    codeBox.className = 'tp-code';
    codeBox.readOnly = true;
    panel.appendChild(codeBox);
    const copyBtn = document.createElement('button');
    copyBtn.className = 'tp-btn wide';
    copyBtn.textContent = '复制 config 片段';
    copyBtn.onclick = () => {
      codeBox.select();
      try {
        navigator.clipboard.writeText(codeBox.value);
      } catch (e) {
        document.execCommand('copy');
      }
      copyBtn.textContent = '已复制 ✓';
      setTimeout(() => { copyBtn.textContent = '复制 config 片段'; }, 1200);
    };
    panel.appendChild(copyBtn);

    // 暗角层
    const vignette = document.createElement('div');
    vignette.id = 'tp-vignette';
    document.body.appendChild(vignette);

    // 收起按钮
    const toggle = document.createElement('button');
    toggle.id = 'tp-toggle';
    toggle.textContent = '调优台';
    toggle.onclick = () => {
      panel.classList.toggle('hide');
      toggle.classList.toggle('hide');
    };

    // 快捷键
    window.addEventListener('keydown', (e) => {
      if (e.key === 'h' || e.key === 'H') {
        panel.classList.toggle('hide');
        toggle.classList.toggle('hide');
      }
      if (e.key === 'p' || e.key === 'P') refreshPoseText();
    });

    return { panel, toggle, poseButtons, qualityButtons, bgButtons, vignette, poseText, codeBox, fovVal, fovInput, alphaVal };
  }

  function section(title, sub) {
    const d = document.createElement('div');
    d.className = 'tp-section';
    d.innerHTML = `<div class="tp-title">${title}</div>` + (sub ? `<div class="tp-sub">${sub}</div>` : '');
    return d;
  }

  function slider(label, min, max, step, value, onInput, sub) {
    const row = document.createElement('div');
    row.className = 'tp-row';
    const lab = document.createElement('label');
    lab.innerHTML = `${label} <span class="tp-val"></span>`;
    const val = lab.querySelector('.tp-val');
    val.textContent = step < 1 ? Number(value).toFixed(2) : value;
    const input = document.createElement('input');
    input.type = 'range';
    input.min = min; input.max = max; input.step = step; input.value = value;
    input.oninput = () => {
      const v = parseFloat(input.value);
      val.textContent = step < 1 ? v.toFixed(2) : v;
      onInput(v);
    };
    row.appendChild(lab);
    row.appendChild(input);
    if (sub) {
      const s = document.createElement('div');
      s.className = 'tp-sub';
      s.textContent = sub;
      row.appendChild(s);
    }
    return { row, val, input };
  }

  function checkRow(label, checked, onChange) {
    const row = document.createElement('div');
    row.className = 'tp-row tp-check';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = !!checked;
    input.onchange = () => onChange(input.checked);
    const lab = document.createElement('label');
    lab.textContent = label;
    lab.onclick = () => { input.checked = !input.checked; onChange(input.checked); };
    row.appendChild(input);
    row.appendChild(lab);
    return row;
  }

  function readLS() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch (e) { return {}; }
  }
  function save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  // ---------- 初始化 ----------
  applyFov();
  applyQuality();
  applyAlpha();
  applyFilter();
  applyBg();
  root.poseButtons.forEach((b) => b.classList.toggle('on', String(b.dataset.id) === String(state.posId)));
  refreshPoseText();
  setInterval(refreshPoseText, 1000);

  return { state, applyPose, refreshPoseText };
}

function injectStyle() {
  if (document.getElementById('tp-style')) return;
  const s = document.createElement('style');
  s.id = 'tp-style';
  s.textContent = `
  #tp-vignette{position:fixed;inset:0;pointer-events:none;z-index:5;
    background:radial-gradient(115% 95% at 50% 45%, rgba(0,0,0,0) 45%, rgba(0,0,0,.28) 78%, rgba(0,0,0,.5) 100%);}
  #tp-panel{position:fixed;right:14px;top:14px;z-index:40;width:270px;max-height:calc(100vh - 28px);
    overflow-y:auto;padding:14px 14px 16px;border-radius:14px;color:#e6ecf5;
    background:rgba(16,21,30,.9);border:1px solid rgba(255,255,255,.1);
    box-shadow:0 18px 50px rgba(0,0,0,.5);backdrop-filter:blur(14px);
    font:13px/1.55 system-ui,"Microsoft YaHei",sans-serif;transition:transform .25s ease,opacity .25s ease;}
  #tp-panel.hide{transform:translateX(120%);opacity:0;pointer-events:none;}
  #tp-panel .tp-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;}
  #tp-panel .tp-head b{font-size:14px;letter-spacing:.5px;color:#fff;}
  #tp-panel .tp-hint{font-size:11px;color:rgba(255,255,255,.4);}
  #tp-panel .tp-section{margin-top:14px;padding-top:10px;border-top:1px solid rgba(255,255,255,.08);}
  #tp-panel .tp-title{font-size:12.5px;font-weight:600;color:#8fd8ff;}
  #tp-panel .tp-sub{font-size:11px;color:rgba(255,255,255,.42);margin-top:2px;line-height:1.5;}
  #tp-panel .tp-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:8px;}
  #tp-panel .tp-btn{padding:6px 4px;border-radius:8px;cursor:pointer;font-size:11.5px;
    background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);color:#dfe7f2;
    transition:all .15s ease;font-family:inherit;}
  #tp-panel .tp-btn:hover{background:rgba(255,255,255,.14);}
  #tp-panel .tp-btn.on{background:linear-gradient(180deg,#12b7e8,#0b93c4);border-color:#4fd3ff;color:#fff;font-weight:600;}
  #tp-panel .tp-btn.wide{grid-column:span 4;}
  #tp-panel .tp-row{margin-top:10px;}
  #tp-panel .tp-row label{display:flex;justify-content:space-between;font-size:12px;color:rgba(255,255,255,.8);}
  #tp-panel .tp-val{color:#7fe0ff;font-variant-numeric:tabular-nums;}
  #tp-panel input[type=range]{width:100%;margin-top:5px;height:4px;-webkit-appearance:none;appearance:none;
    background:rgba(255,255,255,.16);border-radius:2px;outline:none;}
  #tp-panel input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;
    background:#12b7e8;border:2px solid #e9f8ff;cursor:pointer;}
  #tp-panel .tp-check{display:flex;align-items:center;gap:7px;margin-top:10px;font-size:12px;}
  #tp-panel .tp-check input{width:15px;height:15px;accent-color:#12b7e8;cursor:pointer;}
  #tp-panel .tp-pose{margin-top:8px;font-size:11px;color:rgba(255,255,255,.5);
    font-family:ui-monospace,Consolas,monospace;word-break:break-all;}
  #tp-panel .tp-code{width:100%;height:74px;margin-top:8px;padding:8px;border-radius:8px;resize:none;
    background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.1);color:#a9e7ff;
    font:11px/1.5 ui-monospace,Consolas,monospace;}
  #tp-toggle{position:fixed;right:14px;top:14px;z-index:41;padding:8px 14px;border-radius:10px;cursor:pointer;
    background:rgba(16,21,30,.9);border:1px solid rgba(255,255,255,.14);color:#dfe7f2;font:12px system-ui;
    backdrop-filter:blur(10px);transition:transform .25s ease,opacity .25s ease;}
  #tp-toggle.hide{transform:translateX(120%);opacity:0;pointer-events:none;}`;
  document.head.appendChild(s);
}
