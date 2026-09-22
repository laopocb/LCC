import * as THREE from 'three';

/**
 * 创建 WebGL 渲染器（底层 WebGL1/2，自动选择）
 * @param {HTMLCanvasElement} canvas
 */
export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x0b0e14, 1);
  return renderer;
}