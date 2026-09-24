import * as THREE from 'three';
import { CAMERA } from './config.js?v=34';

/**
 * 创建透视相机
 */
export function createCamera() {
  const camera = new THREE.PerspectiveCamera(
    CAMERA.fov,
    window.innerWidth / window.innerHeight,
    CAMERA.near,
    CAMERA.far
  );
  camera.position.set(...CAMERA.position);
  camera.lookAt(...CAMERA.target);
  return camera;
}