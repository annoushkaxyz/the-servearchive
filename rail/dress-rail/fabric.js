import * as THREE from './vendor/three.module.js';

// Material weight and skirt construction vary across the archive looks.
const profiles = {
 'osaka-ao-2026': {height:3.45,waist:.43,hemDepth:.28,flow:.92,folds:14,foldDepth:.018,damping:6,sheen:.18},
 'venus-ao-2010': {height:3.40,waist:.45,hemDepth:.145,flow:.4,folds:6,foldDepth:.004,damping:8,sheen:.16,preserveHem:true},
 'serena-us-2014': {height:3.45,waist:.43,hemDepth:.18,flow:.6,folds:10,foldDepth:.009,damping:7.2,sheen:.15},
 'wozniacki-ao-2011': {height:3.38,waist:.46,hemDepth:.30,flow:.74,folds:14,foldDepth:.017,damping:6.8,sheen:.14},
 'sharapova-rg-2007': {height:3.48,waist:.64,hemDepth:.18,flow:.55,folds:8,foldDepth:.008,damping:7.2,sheen:.18},
 'serena-rg-2002': {height:3.45,waist:.48,hemDepth:.11,flow:.34,folds:6,foldDepth:.003,damping:8.5,sheen:.16,preserveHem:true},
 'pierce-rg-1996': {height:3.42,waist:.48,hemDepth:.11,flow:.32,folds:6,foldDepth:.003,damping:8.5,sheen:.14,preserveHem:true},
 'serena-us-2002': {height:3.25,waist:.48,hemDepth:.105,flow:.22,folds:6,foldDepth:.003,damping:9,sheen:.24,preserveHem:true},
 'pericoli-hurlingham-1970-lace': {height:3.45,waist:.43,hemDepth:.23,flow:.7,folds:12,foldDepth:.016,damping:7.1,sheen:.18},
 'pericoli-w-1964': {height:3.60,waist:.46,hemDepth:.25,flow:1.14,folds:16,foldDepth:.020,damping:5.5,sheen:.12},
 'pericoli-w-1955': {height:3.32,waist:.39,hemDepth:.40,flow:1.05,folds:10,foldDepth:.035,damping:5.7,sheen:.26},
 'pericoli-w-1965': {height:3.48,waist:.45,hemDepth:.27,flow:.64,folds:12,foldDepth:.018,damping:7.3,sheen:.15},
 'pericoli-london-1970-pearls': {height:3.37,waist:.45,hemDepth:.31,flow:.79,folds:8,foldDepth:.022,damping:6.7,sheen:.24}
};
// Find the shoulders below raised collars rather than hanging from the collar.
const hangerFits = {
 'pericoli-hurlingham-1970-lace': {shoulderRow:.10,encloseHanger:true},
 'king-battle-1973': {shoulderRow:.10,encloseHanger:true}
};
const smooth = (a,b,x) => THREE.MathUtils.smoothstep(x,a,b);

// A shared deformation pins the shoulders and lets motion travel down the cloth.
// Both faces use the same field, so the seams remain together during a turn.
const clothShader = `
uniform float clothTime;
uniform float clothHeight;
uniform float clothWaist;
uniform float clothPhase;
uniform float clothFlow;
uniform float clothMotionScale;
uniform vec4 clothMotion;
vec3 clothPosition(vec3 p) {
 float t = clamp((-p.y - 0.57) / clothHeight, 0.0, 1.0);
 float hanging = pow(smoothstep(0.16, 1.0, t), 1.65);
 float skirt = smoothstep(clothWaist - 0.06, 0.96, t);
 float phase = clothTime + clothPhase;
 float twist = clothMotion.x * hanging * clothMotionScale;
 float c = cos(twist), s = sin(twist);
 vec3 q = vec3(c*p.x + s*p.z, p.y, -s*p.x + c*p.z);
 float breath = sin(phase*0.85 - t*2.7)*0.023 + sin(phase*1.31 + t*3.2)*0.009;
 float ripple = sin(p.x*7.8 - phase*2.05 + t*5.0)*0.010
              + sin(p.x*4.1 + phase*1.13 - t*6.1)*0.008;
 float flutter = (0.65 + clothMotion.w*0.7) * clothFlow * clothMotionScale;
 q.x += (clothMotion.y + breath*clothFlow) * hanging * clothMotionScale;
 q.z += clothMotion.z*hanging*clothMotionScale + (breath*0.65 + ripple)*skirt*flutter;
 // A tiny vertical response lifts moving folds; it never moves the neckline.
 q.y += (sin(p.x*5.6 + phase*1.42)*0.007 + abs(clothMotion.x)*0.015)*skirt*flutter;
 return q;
}
vec3 clothNormal(vec3 p, vec3 n) {
 vec3 tangent = normalize(cross(n, abs(n.y)<0.94 ? vec3(0.0,1.0,0.0) : vec3(1.0,0.0,0.0)));
 vec3 bitangent = cross(n,tangent);
 vec3 centre = clothPosition(p);
 vec3 a = clothPosition(p + tangent*0.003) - centre;
 vec3 b = clothPosition(p + bitangent*0.003) - centre;
 return normalize(cross(a,b));
}
`;

function clothMaterial(texture, profile, uniforms) {
 const material = new THREE.MeshPhysicalMaterial({
  map:texture, roughness:.92, metalness:0, side:THREE.DoubleSide,
  alphaTest:.32, alphaToCoverage:true, transparent:false,
  sheen:profile.sheen, sheenColor:new THREE.Color(0xf5f0e8), sheenRoughness:.9,
  specularIntensity:.35
 });
 material.onBeforeCompile = shader => {
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader = shader.vertexShader
   .replace('#include <common>', '#include <common>\n' + clothShader)
   .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nobjectNormal = clothNormal(position, objectNormal);')
   .replace('#include <begin_vertex>', 'vec3 transformed = clothPosition(position);');
 };
 material.customProgramCacheKey = () => 'serve-archive-hanging-fabric-v2';
 return material;
}

// Find the actual fabric peaks at each shoulder, not the top of a bounding box.
function shoulderAnchors(image,rowAt,photoWidth,height,isBack,shoulderRow){
 const hint=rowAt(image,shoulderRow),span=hint.right-hint.left,depth=image.last-image.first;
 const solid=(x,y)=>x>=0&&x<768&&y>=0&&y<1024&&image.pixels[(Math.round(y)*768+Math.round(x))*4+3]>190;
 return [-1,1].map(side=>{
  const edge=side<0?hint.left:hint.right;
  const lo=Math.max(1,Math.floor(side<0?edge-7:edge-span*.14));
  const hi=Math.min(766,Math.ceil(side<0?edge+span*.14:edge+7));
  const tops=[];
  for(let x=lo;x<=hi;x++)for(let y=image.first;y<image.first+depth*.23;y++)if(solid(x,y)&&solid(x,y+2)){tops.push({x,y});break;}
  const peak=Math.min(...tops.map(p=>p.y));
  const crown=tops.filter(p=>p.y<=peak+5);
  const u=crown.length?crown.reduce((sum,p)=>sum+p.x,0)/crown.length:edge;
  const py=Number.isFinite(peak)?peak:hint.y,t=(py-image.first)/depth;
  let sampleY=Math.round(py+Math.max(7,depth*.012)),sampleX=Math.round(u);
  if(!solid(sampleX,sampleY)){
   const candidates=tops.filter(p=>solid(p.x,sampleY)).sort((a,b)=>Math.abs(a.x-u)-Math.abs(b.x-u));
   if(candidates.length)sampleX=candidates[0].x;
  }
  let left=sampleX,right=sampleX;
  while(left>lo&&solid(left-1,sampleY))left--;
  while(right<hi&&solid(right+1,sampleY))right++;
  return {x:(u/768-.5)*photoWidth*(isBack?-1:1),y:-.57-t*height,t,u:sampleX,v:sampleY,
   width:THREE.MathUtils.clamp((right-left+1)/768*photoWidth,.028,.20),sampleWidth:Math.max(3,right-left-1)};
 }).sort((a,b)=>a.x-b.x);
}

function shoulderFold(front,anchor,pin,halfWidth,supportAt){
 const positions=[],uvs=[],indices=[],across=8,around=16;
 for(let j=0;j<=around;j++)for(let i=0;i<=across;i++){
  const angle=j/around*Math.PI,x=pin.x+(i/across-.5)*halfWidth*2,c=Math.cos(angle);
  positions.push(x,supportAt(x)+.006-.018*c*c,.064*c);
  uvs.push((anchor.u+(i/across-.5)*anchor.sampleWidth)/768,1-anchor.v/1024);
 }
 for(let j=0;j<around;j++)for(let i=0;i<across;i++){const a=j*(across+1)+i,b=a+1,c=a+across+1,d=c+1;indices.push(a,c,b,b,c,d);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();
 return new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({map:front.texture,side:THREE.DoubleSide,roughness:.92,alphaTest:.2}));
}

export function createGarment(front, back, id, index, {rowAt,makeHanger}) {
 const profile=profiles[id]||{height:3.45,waist:.43,hemDepth:.25,flow:.78,folds:12,foldDepth:.018,damping:6.8,sheen:.15},group=new THREE.Group();
 const height=profile.height,photoWidth=height*768/(front.last-front.first);
 const fit=hangerFits[id]||{},shoulderRow=fit.shoulderRow??.035;
 const frontAnchors=shoulderAnchors(front,rowAt,photoWidth,height,false,shoulderRow);
 const backAnchors=shoulderAnchors(back,rowAt,photoWidth,height,true,shoulderRow);
 // A long sleeve or an asymmetric skirt can move the photograph's bounding
 // centre. Hang from the centre of the two shoulders instead, on both faces.
 const frontCentre=(frontAnchors[0].x+frontAnchors[1].x)/2,backCentre=(backAnchors[0].x+backAnchors[1].x)/2;
 const hanger=makeHanger(),{supportAt,shoulderLimit}=hanger.userData;
 // The hanger is identical for every look. Adjust only the fabric's attachment
 // points, keeping wider shoulders supported within the shared hanger tips.
 const pins=frontAnchors.map(a=>{const x=THREE.MathUtils.clamp(a.x-frontCentre,-shoulderLimit,shoulderLimit);return {x,y:supportAt(x)-.012};});
 const lift=[...frontAnchors,...backAnchors].reduce((sum,a,i)=>sum+pins[i%2].y-a.y,0)/4;
 const rings=160,segments=64;
 const uniforms={
  clothTime:{value:0},clothHeight:{value:height},clothWaist:{value:profile.waist},
  clothPhase:{value:index*1.71},clothFlow:{value:profile.flow},
  clothMotionScale:{value:1},clothMotion:{value:new THREE.Vector4()}
 };
 // A photographed hem narrows at the final image rows. Continuing that narrow
 // silhouette around the body seals it like a bag. Keep the skirt open instead;
 // the original alpha texture supplies its scallops, fringe and irregular edge.
 function broadHem(image) {
  let best=rowAt(image,.76);
  for(let t=.77;t<=.96;t+=.01){const row=rowAt(image,t);if(row.right-row.left>best.right-best.left)best=row;}
  return best;
 }
 const frontHem=broadHem(front),backHem=broadHem(back);
 function outlineAt(image,hem,t) {
  const raw=rowAt(image,t),blend=profile.preserveHem?0:smooth(.70,.89,t);
  return {left:THREE.MathUtils.lerp(raw.left,hem.left,blend),right:THREE.MathUtils.lerp(raw.right,hem.right,blend),y:raw.y};
 }
 function thickness(t) {
  const bodice=.028+.106*smooth(0,.18,t)-.025*smooth(.21,profile.waist,t);
  const depth=THREE.MathUtils.lerp(bodice,profile.hemDepth,smooth(profile.waist,.98,t));
  // Closed collars surround the hanger's bevel instead of intersecting it.
  return fit.encloseHanger?Math.max(depth,.078*(1-smooth(.10,.20,t))):depth;
 }
 for(const [face,isBack] of [[front,false],[back,true]]) {
  const anchors=isBack?backAnchors:frontAnchors;
  const faceCentre=isBack?backCentre:frontCentre;
  const neckY=-.57+(pins[0].y-anchors[0].y+pins[1].y-anchors[1].y)/2;
  const neckLift=fit.encloseHanger?Math.max(0,supportAt(0)+.035-neckY):0;
  const neckWidth=Math.min(Math.abs(pins[0].x),Math.abs(pins[1].x))*.92;
  const positions=[],uvs=[],indices=[];
  for(let row=0;row<=rings;row++) {
   const t=row/rings,outline=outlineAt(front,frontHem,t);
   const source=outlineAt(face,isBack?backHem:frontHem,t);
   const centre=((outline.left+outline.right)*.5/768-.5)*photoWidth-frontCentre;
   const half=(outline.right-outline.left)*.5/768*photoWidth;
   const skirt=smooth(profile.waist,.95,t);
   for(let col=0;col<=segments;col++) {
    const angle=-Math.PI/2+col/segments*Math.PI;
    const sn=Math.sin(angle),cs=Math.max(0,Math.cos(angle));
    const fold=(Math.cos(angle*profile.folds+t*.75)+.3*Math.sin(angle*(profile.folds+3)-t)) * profile.foldDepth*skirt;
    const attachment=1-smooth(.10,.30,t);
    const ownCentre=((source.left+source.right)*.5/768-.5)*photoWidth*(isBack?-1:1)-faceCentre,ownHalf=(source.right-source.left)*.5/768*photoWidth;
    const rawX=THREE.MathUtils.lerp(centre+half*sn,ownCentre+ownHalf*sn,attachment),ratio=THREE.MathUtils.clamp((rawX-(anchors[0].x-faceCentre))/(anchors[1].x-anchors[0].x),0,1);
    const x=rawX+THREE.MathUtils.lerp(pins[0].x-(anchors[0].x-faceCentre),pins[1].x-(anchors[1].x-faceCentre),ratio)*attachment;
    const dy=THREE.MathUtils.lerp(pins[0].y-anchors[0].y,pins[1].y-anchors[1].y,ratio);
    // Lift only the collar centre around the hanger crown; the shoulders
    // remain pinned on the same shared hanger and the bodice keeps its shape.
    const collar=neckLift*(1-smooth(0,neckWidth,Math.abs(x)))*(1-smooth(.035,.24,t));
    const y=-.57-t*height+lift+(dy-lift)*attachment+collar;
    let z=(thickness(t)+fold)*cs*(isBack?-1:1);
    for(let p=0;p<2;p++){
     const shoulder=anchors[p],lateral=1-smooth(shoulder.width*.5,shoulder.width+.055,Math.abs(x-pins[p].x));
     const pinned=lateral*(1-smooth(shoulder.t+.025,shoulder.t+.12,t));
     z=THREE.MathUtils.lerp(z,(isBack?-1:1)*.064,pinned);
    }
    positions.push(x,y,z);
    const inset=2.2,span=source.right-source.left-inset*2;
    const u=isBack?source.right-inset-(sn+1)*.5*span:source.left+inset+(sn+1)*.5*span;
    uvs.push(u/768,1-source.y/1024);
   }
  }
  for(let row=0;row<rings;row++)for(let col=0;col<segments;col++) {
   const a=row*(segments+1)+col,b=a+1,c=a+segments+1,d=c+1;
   if(isBack)indices.push(a,b,c,b,d,c);else indices.push(a,c,b,b,c,d);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,clothMaterial(face.texture,profile,uniforms));
  // Shader displacement is small but can move vertices outside the rest bounds.
  geometry.computeBoundingSphere();geometry.boundingSphere.radius+=.3;
  group.add(mesh);
 }
 group.add(hanger);
 frontAnchors.forEach((anchor,i)=>group.add(shoulderFold(front,anchor,pins[i],anchor.width*.5,supportAt)));
 group.userData.fabric={profile,uniforms,lift,initialised:false,turn:0,vTurn:0,shift:0,vShift:0};
 return group;
}

function follow(state,key,velocity,target,stiffness,damping,dt) {
 state[velocity]+=(target-state[key])*stiffness*dt;
 state[velocity]*=Math.exp(-damping*dt);
 state[key]+=state[velocity]*dt;
}
export function updateFabric(item,time,dt,reduced,active) {
 const state=item.body.userData.fabric,{profile,uniforms}=state;
 if(!state.initialised||reduced){state.turn=item.angle;state.shift=item.x;state.vTurn=0;state.vShift=0;state.initialised=true;}
 else {
  follow(state,'turn','vTurn',item.angle,31,profile.damping,dt);
  follow(state,'shift','vShift',item.x,25,profile.damping+.5,dt);
 }
 const twist=THREE.MathUtils.clamp(state.turn-item.angle,-.36,.36)*profile.flow;
 const drift=THREE.MathUtils.clamp((state.shift-item.x)*.22,-.17,.17)*profile.flow;
 const energy=THREE.MathUtils.clamp(Math.abs(item.va)*.1+Math.abs(item.vx)*.12,0,1);
 uniforms.clothTime.value=time*.001;
 uniforms.clothMotionScale.value=reduced?0:1;
 uniforms.clothMotion.value.set(twist,drift*Math.cos(item.angle),drift*Math.sin(item.angle),energy);
 item.shadow.position.x=item.x+drift*.4;
 item.shadow.position.y=-.57-profile.height-.11+state.lift;
 item.shadow.scale.x=(active?1:.68)*(1+energy*.06);
}
