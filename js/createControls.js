import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CAMERA } from './config.js?v=5';

/**
 * 创建轨道控制器（旋转/缩放/平移）
 * - 俯仰限制：上下各 ±30°（水平为 0°，即 polar angle 60°~120°）
 * - 旋转阻尼：调高 dampingFactor，转动手感更黏滞顺滑
 */
export function createControls(camera, domElement) {
  const controls = new OrbitControls(camera, domElement);
  controls.target.set(...CAMERA.target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.15;              // 更强的旋转阻尼
  controls.minPolarAngle = Math.PI / 3;       // 上仰 30°
  controls.maxPolarAngle = (Math.PI * 2) / 3; // 下俯 30°
  controls.maxDistance = 5000;
  controls.minDistance = 0.5;
  controls.update();
  return controls;
}