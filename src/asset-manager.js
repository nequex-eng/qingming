import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

/**
 * One GLTFLoader + one DRACOLoader for every GLB entry point.
 * Never infer a scale from category or apply a shared footprint fit.
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
    this.catalog = null;
  }

  async fetchGLTF(url) {
    if (!url.endsWith('.gz')) return this.loader.loadAsync(url);
    const response = await fetch(url);
    if (!response.ok) throw new Error('HTTP ' + response.status + ' loading ' + url);
    if (!('DecompressionStream' in window)) throw new Error('当前浏览器不支持gzip解压');
    const compressed = await response.arrayBuffer();
    const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'));
    const data = await new Response(stream).arrayBuffer();
    // parseAsync uses the same GLTFLoader instance with DRACOLoader already attached.
    return this.loader.parseAsync(data, new URL('.', url).href);
  }

  getBounds(model) {
    model.updateMatrixWorld(true);
    return new THREE.Box3().setFromObject(model);
  }

  applyPlacement(model, { position = [0, 0, 0], rotationY = 0, scale }) {
    if (!Number.isFinite(scale) || scale <= 0) {
      throw new Error('资产缺少有效的逐模型 scale，拒绝猜测或统一缩放');
    }

    model.rotation.y = rotationY;
    // The model origin may be at its geometric center. Apply the authored
    // per-asset scale, then ground its actual bounding-box minimum at Y=0.
    model.scale.setScalar(scale);
    model.updateMatrixWorld(true);
    const bounds = this.getBounds(model);
    const center = bounds.getCenter(new THREE.Vector3());

    model.position.x += position[0] - center.x;
    model.position.z += position[2] - center.z;
    model.position.y += (position[1] || 0) - bounds.min.y;
    model.updateMatrixWorld(true);

    return this.getBounds(model);
  }

  configureMaterials(model) {
    model.traverse(object => {
      if (!object.isMesh) return;
      object.castShadow = true;
      object.receiveShadow = true;
      if (!object.material) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        material.side = THREE.DoubleSide;
        // The Blender references are matte, sunlit clay/wood/stone studies.
        // Preserve authored albedo and textures; only remove plastic-like shine.
        material.roughness = Math.max(Number.isFinite(material.roughness) ? material.roughness : 0.82, 0.82);
        if ('metalness' in material) material.metalness = 0;
        if (material.map) material.map.colorSpace = THREE.SRGBColorSpace;
      }
    });
  }

  async loadAsset(asset) {
    // First batch scales are baked into the GLB geometry. Manifest scale=1
    // is an identity transform; do not footprint-fit or multiply it again.
    const gltf = await this.fetchGLTF(asset.url);
    const model = gltf.scene;
    const bounds = this.applyPlacement(model, {
      position: asset.position || [0, 0, 0],
      rotationY: asset.rotationY || 0,
      scale: asset.scale
    });
    this.configureMaterials(model);
    this.scene.add(model);

    const size = bounds.getSize(new THREE.Vector3());
    const item = {
      id: asset.id,
      label: asset.label,
      model,
      size,
      bounds,
      expectedPosition: [...(asset.position || [0, 0, 0])],
      appliedScale: asset.scale,
      rotationY: asset.rotationY || 0
    };
    this.loaded.push(item);
    this.status.textContent = '已载入 ' + this.loaded.length + '/6：' + this.loaded.map(x => x.label).join('、');
    return item;
  }

  async loadManifest(url) {
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) throw new Error('资产清单加载失败：HTTP ' + response.status);
    this.manifest = await response.json();
    const assets = this.manifest.assets || [];
    if (assets.length !== 6) throw new Error('首屏 manifest 应为 6 个资产，实际为 ' + assets.length);
    const results = await Promise.allSettled(assets.map(asset => this.loadAsset(asset)));
    const failed = results
      .map((result, index) => result.status === 'rejected'
        ? { index, id: assets[index]?.id, error: result.reason }
        : null)
      .filter(Boolean);

    if (failed.length) {
      console.error('Asset load failures:', failed.map(({ index, id, error }) => ({
        index, id, message: error?.message || String(error), stack: error?.stack || ''
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

  async loadCatalogModel(id, position = [0, 0, 0], rotationY = null) {
    const catalog = await this.loadCatalog();
    const asset = catalog.find(item => item.file.split('/').pop().replace(/\.glb$/i, '') === id);
    if (!asset) throw new Error('资产库存中不存在：' + id);
    if (!Number.isFinite(asset.scale) || asset.scale <= 0) {
      throw new Error('资产 ' + id + ' 尚未录入实测 scale；拒绝用类别默认值或猜测值加载');
    }
    const gltf = await this.fetchGLTF('./public/' + asset.file);
    const model = gltf.scene;
    const appliedRotationY = Number.isFinite(rotationY)
      ? rotationY
      : (Number.isFinite(asset.recommended_rotationY) ? asset.recommended_rotationY : 0);
    const bounds = this.applyPlacement(model, { position, rotationY: appliedRotationY, scale: asset.scale });
    this.configureMaterials(model);
    this.scene.add(model);
    const size = bounds.getSize(new THREE.Vector3());
    return {
      id, model, size, bounds, appliedScale: asset.scale,
      measuredDimensions: asset.measured_dimensions_m || null,
      expectedScaledDimensions: asset.scaled_dimensions_m || null,
      rotationY: appliedRotationY,
      position: [...position]
    };
  }

  dispose() {
    this.draco.dispose();
  }
}
