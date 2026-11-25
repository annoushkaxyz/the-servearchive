// Fade each dress and its hardware independently without altering shared materials.
export function prepareReveal(root, shadow, delay = 0) {
 const materials = new Map();
 function isolate(original) {
  if (materials.has(original)) return materials.get(original).material;
  const material = original.clone();
  // Three's clone intentionally omits custom shader callbacks; keep the cloth motion.
  material.onBeforeCompile = original.onBeforeCompile;
  material.customProgramCacheKey = original.customProgramCacheKey;
  materials.set(original, {material, opacity:original.opacity, alphaTest:original.alphaTest,
   transparent:original.transparent, depthWrite:original.depthWrite});
  material.transparent = true;
  material.opacity = 0;
  material.alphaTest = 0;
  material.depthWrite = false;
  return material;
 }
 for (const object of [root, shadow]) object.traverse(node => {
  if (node.material) node.material = Array.isArray(node.material)
   ? node.material.map(isolate) : isolate(node.material);
 });
 root.visible = shadow.visible = false;
 return {root, shadow, materials:[...materials.values()], delay, started:null, complete:false};
}

export function updateReveal(reveal, time, reduced, direction = 1) {
 if (reveal.started === null) reveal.started = time;
 const elapsed = Math.max(0, time - reveal.started - (reduced ? 0 : reveal.delay));
 const progress = Math.min(1, elapsed / 400);
 const opacity = progress * progress * (3 - 2 * progress);
 reveal.root.visible = reveal.shadow.visible = opacity > 0;
 if (!reveal.complete) {
  for (const state of reveal.materials) {
   const material = state.material;
   material.opacity = state.opacity * opacity;
   // Scale the cutout threshold with opacity so lace and shoulders don't pop in late.
   material.alphaTest = state.alphaTest * opacity;
   if (progress === 1) {
    material.transparent = state.transparent;
    material.depthWrite = state.depthWrite;
    material.needsUpdate = true;
   }
  }
  reveal.complete = progress === 1;
 }
 // Only the swivel settles; the hook remains resting on the rail.
 return reduced || elapsed >= 2400 ? 0 : direction * .012 * Math.sin(elapsed * .01) * Math.exp(-elapsed / 650);
}
