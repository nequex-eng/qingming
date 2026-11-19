import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

/**
 * Owns GLB loading, Draco/gzip decoding, placement and loaded-asset metadata.
 * The world renderer should not know where model files are stored.
 */
export class AssetManager {
  constructor({ scene, status }) {
    this.scene = scene;
    this.status = status;
    this.loader = new GLTFLoader();
    this.draco = new DRACOLoader();
    this.draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.179.1/examples/jsm/libs/draco/');
    this.loader.setDRACOLoader(this.draco);
    this.loaded = [];
    this.manifest = null;
  }

  async fetchGLTF(url) {
    if (!url.endsWith('.gz')) return this.loader.loadAsync(url);
    const response = await fetch(url);
    if (!response.ok) throw new Error('HTTP ' + response.status + ' loading ' + url);
    if (!('DecompressionStream' in window)) throw new Error('当前浏览器不支持gzip解压');
    const compressed = await response.arrayBuffer();
    const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'));
    const data = await new Response(stream).arrayBuffer();
    return this.loader.parseAsync(data, '');
  }

  async loadAsset(asset) {
    const gltf = await this.fetchGLTF(asset.url);
    const model = gltf.scene;
    model.rotation.y = asset.rotationY || 0;
    model.updateMatrixWorld(true);

    const initialBounds = new THREE.Box3().setFromObject(model);
    const initialSize = initialBounds.getSize(new THREE.Vector3());
    const horizontal = Math.max(initialSize.x, initialSize.z);
    const fitScale = horizontal > 0
      ? Math.min(asset.targetFootprint / horizontal, 1.8)
      : 1;
    const appliedScale = fitScale * (asset.scale || 1);

    model.scale.setScalar(appliedScale);
    model.updateMatrixWorld(true);

    const bounds = new THREE.Box3().setFromObject(model);
    const center = bounds.getCenter(new THREE.Vector3());
    const position = asset.position || [0, 0, 0];
    model.position.x += position[0] - center.x;
    model.position.z += position[2] - center.z;
    model.position.y += -bounds.min.y + (position[1] || 0);

    model.traverse(object => {
      if (!object.isMesh) return;
      object.castShadow = true;
      object.receiveShadow = true;
      if (!object.material) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        material.side = THREE.DoubleSide;
        if (material.map) material.map.colorSpace = THREE.SRGBColorSpace;
      }
    });

    this.scene.add(model);
    const finalBounds = new THREE.Box3().setFromObject(model);
    const finalSize = finalBounds.getSize(new THREE.Vector3());
    const item = {
      id: asset.id,
      label: asset.label,
      model,
      size: finalSize,
      bounds: finalBounds,
      expectedPosition: [...position],
      appliedScale
    };
    this.loaded.push(item);
    this.status.textContent = '已载入 ' + this.loaded.length + '/6：' + this.loaded.map(x => x.label).join('、');
    return item;
  }

  async loadManifest(url) {
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) throw new Error('资产清单加载失败：HTTP ' + response.status);
    this.manifest = await response.json();
    const results = await Promise.allSettled((this.manifest.assets || []).map(asset => this.loadAsset(asset)));
    const failed = results
      .map((result, index) => result.status === 'rejected'
        ? { index, id: this.manifest.assets[index]?.id, error: result.reason }
        : null)
      .filter(Boolean);

    if (failed.length) {
      console.error('Asset load failures:', failed.map(({ index, id, error }) => ({
        index,
        id,
        message: error?.message || String(error),
        stack: error?.stack || ''
      })));
      this.status.textContent = '已加载 ' + this.loaded.length + '/6；失败 ' + failed.length + ' 个（详见控制台）';
    } else {
      this.status.textContent = '六种独立资产全部载入 · 虹桥只保留一份';
    }
    return { manifest: this.manifest, loaded: this.loaded, failed };
  }

  async loadCatalog() {
    if (this.catalog) return this.catalog;
    const response = await fetch('./public/assets/3d/asset-catalog-batch2.json');
    if (!response.ok) throw new Error('资产库存加载失败：HTTP ' + response.status);
    this.catalog = await response.json();
    return this.catalog;
  }

  async loadCatalogModel(id) {
    const catalog = await this.loadCatalog();
    const asset = catalog.find(item => item.file.split('/').pop().replace(/\.glb$/i, '') === id);
    if (!asset) throw new Error('资产库存中不存在：' + id);
    return this.fetchGLTF('./public/' + asset.file);
  }

  dispose() {
    this.draco.dispose();
  }
}
