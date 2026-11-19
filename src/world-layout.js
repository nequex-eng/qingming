// Layout inspired by the three-part composition of Zhang Zeduan's handscroll:
// countryside -> Bian River / Rainbow Bridge -> dense city streets and city gate.
// World axes: river runs along X; the bridges cross it along Z.
export const WORLD_LAYOUT = {
  bounds: { length: 180, depth: 94, riverWidth: 12, bankOffset: 8.8 },
  landmarks: {
    rainbowBridge: [0, 0, 0],
    stoneBridge: [-48, 0, 0],
    wharf: [14, 0.08, 7.2],
    teahouse: [28, 0, 21],
    restaurant: [45, 0, 21],
    riversideBuilding: [62, 0, -21],
    cityGate: [82, 0, 35.5]
  },
  catalog: [
    { id: 'cargo-boat', position: [-31, 0.08, -2.4], speed: 0.34 },
    { id: 'passenger-boat', position: [-13, 0.08, 3.0], speed: -0.24 },
    { id: 'covered-boat', position: [17, 0.08, -3.2], speed: 0.18 },
    { id: 'skiff', position: [38, 0.08, 2.7], speed: -0.3 },
    { id: 'ferry-boat', position: [60, 0.08, -2.2], speed: 0.22 },
    { id: 'merchant-shopkeeper', position: [43, 0, 17.0] },
    { id: 'street-vendor', position: [32, 0, 32.0] },
    { id: 'boatman', position: [13, 0, 9.4] },
    { id: 'porter-laborer', position: [17, 0, 15.2] },
    { id: 'shop-assistant', position: [47, 0, 17.2] },
    { id: 'teahouse-worker', position: [27, 0, 17.2] },
    { id: 'artisan-craftsman', position: [59, 0, 32.0] },
    { id: 'scholar-literati', position: [69, 0, 32.0] },
    { id: 'cargo-cart', position: [39, 0, 35.0] },
    { id: 'handcart', position: [25, 0, 35.0] },
    { id: 'sedan-chair', position: [67, 0, 35.0] }
  ],
  marketStalls: [15, 24, 33, 42, 55, 65, 74],
  willowTrees: [
    [-82, -15, 1.25], [-69, -18, 1.1], [-56, 18, 1.15], [-39, 17, 1.0],
    [-26, -18, 1.0], [-16, 18, 1.05], [8, -18, 1.1], [19, 18, 1.0],
    [37, -18, 1.05], [56, 18, 1.1], [73, -18, 1.0]
  ]
};
