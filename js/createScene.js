import * as THREE from 'three';

/**
 * 创建场景
 */
export function createScene() {
  const scene = new THREE.Scene();
  // 微弱环境光与半球光，避免 LCC 自身光照不足时全黑
  const ambient = new THREE.AmbientLight(0xffffff, 0.4);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444455, 0.5);
  scene.add(ambient);
  scene.add(hemi);
  return scene;
}