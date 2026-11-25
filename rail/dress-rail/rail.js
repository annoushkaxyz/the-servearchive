import {priorityLoader} from './priority-loader.js';
import * as THREE from './vendor/three.module.js';
import {createGarment,updateFabric} from './fabric.js?v=21';
import {prepareReveal,updateReveal} from './reveal.js?v=1';
export async function initDressRail(container){
const $=id=>container.querySelector('#rail-'+id),stage=$('stage'),list=$('garments');
const looks=await fetch('/dress-rail/looks.json?v=21').then(r=>r.json());
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),clamp=THREE.MathUtils.clamp;
const count=looks.length;
let selected=4,requested=4,side='front',width=stage.clientWidth,offset=0,targetOffset=0,drag=null,suppressClick=false,ready=false,lastTime=0,failed=false,revealed=false;
const items=[],links=[],scene=new THREE.Scene();
const camera=new THREE.OrthographicCamera(-8,8,2.56,-2.56,.1,80);
camera.position.set(0,-1.3,18);camera.lookAt(0,-1.85,0);
const renderer=new THREE.WebGLRenderer({canvas:$('rail-scene'),antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.NoToneMapping;renderer.toneMappingExposure=1;
renderer.transmissionResolutionScale=.5;
scene.add(new THREE.HemisphereLight(0xffffff,0xb2aa9c,1.5));
const key=new THREE.DirectionalLight(0xfff8ec,1.7);key.position.set(-5,8,10);scene.add(key);
const fill=new THREE.DirectionalLight(0xe8edff,.55);fill.position.set(7,2,-5);scene.add(fill);
// Broad studio reflections keep the hanger hardware readable at every angle.
const studio=new THREE.Scene();studio.background=new THREE.Color(0xd3d0c7);
for(const [x,y,z,w,h] of [[0,4,5,15,7],[-7,2,0,6,8],[7,3,-2,6,8]]){
 const panel=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide}));
 panel.position.set(x,y,z);panel.lookAt(0,0,0);studio.add(panel);
}
const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(studio,.1).texture;scene.environmentIntensity=.22;pmrem.dispose();
const metal=new THREE.MeshStandardMaterial({color:0xc5c4bb,metalness:.86,roughness:.25});
const railMetal=new THREE.MeshStandardMaterial({color:0xe3e7ea,metalness:.42,roughness:.28,envMapIntensity:.9});
// Clear moulded plastic: light passes through the shoulders, with polished
// reflections and a denser edge that keeps the silhouette readable.
const clearPlastic=new THREE.MeshPhysicalMaterial({
 color:0xffffff,metalness:0,roughness:.07,transmission:.98,thickness:.086,
 ior:1.49,clearcoat:1,clearcoatRoughness:.04,envMapIntensity:1.1,
 transparent:true,opacity:.38,depthWrite:false
});
const plasticEdge=clearPlastic.clone();plasticEdge.color.setHex(0xdce6e9);
plasticEdge.transmission=.86;plasticEdge.thickness=.14;plasticEdge.roughness=.12;plasticEdge.opacity=.68;
function tube(points,radius,material,segments=40){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return new THREE.Mesh(new THREE.TubeGeometry(curve,segments,radius,10,false),material);}
function cylinderBetween(a,b,r,material){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),d=bv.clone().sub(av);const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),24),material);mesh.position.copy(av.add(bv).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return mesh;}
const track=new THREE.Group();scene.add(track);
const railHeight=.08,railRadius=.038,hookRadius=.10,hookWire=.0105;
const rail=cylinderBetween([-1,railHeight,0],[1,railHeight,0],railRadius,railMetal);track.add(rail);
const endCaps=[-1,1].map(sign=>{const cap=new THREE.Mesh(new THREE.SphereGeometry(.067,20,12),railMetal);cap.userData.sign=sign;cap.position.y=.08;track.add(cap);return cap;});
// Hooks stay wrapped around the rail; the clear shoulders turn on a swivel.
function makeHook(){
 const radius=hookRadius,centreY=railHeight+railRadius+hookWire-radius,yaw=.92,point=(x,y)=>[x*Math.sin(yaw),y,x*Math.cos(yaw)];
 const pts=[point(0,-.225),point(0,-.115),point(radius*.72,-.065),point(radius,centreY)];
 for(let j=1;j<=28;j++){const a=j/28*Math.PI*1.12;pts.push(point(Math.cos(a)*radius,centreY+Math.sin(a)*radius));}
 const hook=tube(pts,hookWire,metal,64);
 return hook;
}
function makeHanger(){
 // One standard size for every dress, including the selected and reverse views.
 const w=.66,y=-.57;
 const group=new THREE.Group(),shape=new THREE.Shape(),crown=-.215,tip=y-.135;
 group.userData.shoulderLimit=w-.045;
 // A continuous sculpted shoulder, open below, with thin rounded tips.
 shape.moveTo(0,crown);
 shape.bezierCurveTo(-w*.17,crown,-w*.20,crown-.11,-w*.37,crown-.205);
 shape.bezierCurveTo(-w*.57,y+.095,-w*.90,tip+.11,-w,tip+.045);
 shape.quadraticCurveTo(-w-.025,tip+.015,-w-.022,tip-.025);
 shape.quadraticCurveTo(-w-.018,tip-.038,-w+.048,tip-.007);
 shape.bezierCurveTo(-w*.77,y-.01,-w*.29,crown-.23,0,crown-.17);
 shape.bezierCurveTo(w*.29,crown-.23,w*.77,y-.01,w-.048,tip-.007);
 shape.quadraticCurveTo(w+.018,tip-.038,w+.022,tip-.025);
 shape.quadraticCurveTo(w+.025,tip+.015,w,tip+.045);
 shape.bezierCurveTo(w*.90,tip+.11,w*.57,y+.095,w*.37,crown-.205);
 shape.bezierCurveTo(w*.20,crown-.11,w*.17,crown,0,crown);
 const outline=shape.getPoints(160);
 group.userData.supportAt=x=>{
  // Broad shoulders can extend beyond a hanger tip. Let that fabric fall
  // gently over the end, rather than sampling outside the hanger's outline.
  const overhang=Math.max(0,Math.abs(x)-w);x=clamp(x,-w,w);
  let top=-Infinity;
  for(let i=1;i<outline.length;i++){const a=outline[i-1],b=outline[i];if(x<Math.min(a.x,b.x)||x>Math.max(a.x,b.x)||Math.abs(b.x-a.x)<1e-7)continue;top=Math.max(top,a.y+(b.y-a.y)*(x-a.x)/(b.x-a.x));}
  return top+.014-overhang*.65;
 };
 const geometry=new THREE.ExtrudeGeometry(shape,{depth:.086,bevelEnabled:true,bevelSegments:5,steps:1,bevelSize:.014,bevelThickness:.014,curveSegments:24});geometry.translate(0,0,-.043);
 group.add(new THREE.Mesh(geometry,[clearPlastic,plasticEdge]));
 group.add(cylinderBetween([0,crown-.014,0],[0,crown+.018,0],.021,metal));
 return group;
}
// Mask the connected studio backdrop without changing the collection's files.
async function prepareImage(url){
 const image=new Image();image.fetchPriority=url===looks[selected].front||url===looks[selected].back?'high':'low';image.src=url;await image.decode();const canvas=document.createElement('canvas');canvas.width=720;canvas.height=Math.round(image.height*720/image.width);
 const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,canvas.width,canvas.height);
 const w=canvas.width,h=canvas.height,frame=ctx.getImageData(0,0,w,h),d=frame.data;
 const sample=(x,y)=>{const c=[0,0,0];for(let j=0;j<8;j++)for(let i=0;i<8;i++){const k=((y+j)*w+x+i)*4;for(let n=0;n<3;n++)c[n]+=d[k+n]/64;}return c;};
 const bg=[sample(2,2),sample(w-10,2),sample(2,h-10),sample(w-10,h-10)],seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let begin=0,end=0;
 const strict=/pericoli|lenglen|serena-miami-2004|wozniacki-ao-2011/.test(url);const tolerance=strict?25:390;
 function visit(p){if(p<0||p>=w*h||seen[p])return;seen[p]=1;const k=p*4;if(bg.some(c=>(d[k]-c[0])**2+(d[k+1]-c[1])**2+(d[k+2]-c[2])**2<tolerance)){seen[p]=2;queue[end++]=p;}}
 for(let x=0;x<w;x++){visit(x);visit((h-1)*w+x);}for(let y=0;y<h;y++){visit(y*w);visit(y*w+w-1);}
 while(begin<end){const p=queue[begin++],x=p%w;if(x)visit(p-1);if(x<w-1)visit(p+1);visit(p-w);visit(p+w);}
 const original=d.slice();
 let minX=w,minY=h,maxX=0,maxY=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=y*w+x;if(seen[p]===2){d[p*4+3]=0;continue;}minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
 // White fabric can share a colour with the studio wall. Restore its
 // continuous bodice inside the visible silhouette instead of punching holes.
 if(strict)for(let y=Math.round(minY+(maxY-minY)*(url.includes('lenglen')?.04:.18));y<maxY;y++){
  let l=w,r=0;for(let x=0;x<w;x++)if(d[(y*w+x)*4+3]>170){l=Math.min(l,x);r=Math.max(r,x);}
  for(let x=l+1;x<r;x++){const k=(y*w+x)*4;if(d[k+3]===0){d[k]=original[k];d[k+1]=original[k+1];d[k+2]=original[k+2];d[k+3]=255;}}
 }
 ctx.putImageData(frame,0,0);const crop=document.createElement('canvas');crop.width=768;crop.height=1024;const cx=crop.getContext('2d',{willReadFrequently:true});
 const bw=maxX-minX+1,bh=maxY-minY+1,scale=Math.min(744/bw,1000/bh);cx.drawImage(canvas,minX,minY,bw,bh,(768-bw*scale)/2,12,bw*scale,bh*scale);
 const pixels=cx.getImageData(0,0,768,1024).data,rows=[];
 for(let y=0;y<1024;y++){let left=768,right=0;for(let x=0;x<768;x++)if(pixels[(y*768+x)*4+3]>170){left=Math.min(left,x);right=Math.max(right,x);}rows.push(right>left?{left,right}:null);}
 let first=rows.findIndex(Boolean),last=rows.length-1;while(!rows[last])last--;
 const texture=new THREE.CanvasTexture(crop);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return {canvas:crop,texture,pixels,rows,first,last};
}
function rowAt(image,t){const index=clamp(Math.round(image.first+t*(image.last-image.first)),image.first,image.last);let l=0,r=0,n=0;for(let j=-3;j<=3;j++){const row=image.rows[clamp(index+j,image.first,image.last)];if(row){l+=row.left;r+=row.right;n++;}}return {left:l/n,right:r/n,y:index};}
// The garment keeps its photographed detail while the cloth can bend below
// the shoulders. The original rail and hanger geometry stay independent.
function garmentShell(front,back,index){
 return createGarment(front,back,looks[index].id,index,{rowAt,makeHanger});
}
function shadowTexture(){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),g=x.createRadialGradient(64,64,2,64,64,60);g.addColorStop(0,'rgba(43,39,32,.16)');g.addColorStop(.5,'rgba(43,39,32,.065)');g.addColorStop(1,'rgba(43,39,32,0)');x.fillStyle=g;x.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);}
const shadowMap=shadowTexture();
// Show the empty rail before any dress images finish loading.
let visible=true;
const visibility=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;container.classList.toggle('rail-paused',!visible);},{rootMargin:'80px'});visibility.observe(container);
const projection=new THREE.Vector3();
resize();offset=targetOffset;renderer.render(scene,camera);container.classList.add('is-rendering');
const resizeObserver=new ResizeObserver(()=>{resize();if(!ready)renderer.render(scene,camera);});resizeObserver.observe(stage);
requestAnimationFrame(animate);
const loadDress=priorityLoader(async i=>{
 const look=looks[i];
 // Yield a frame between dresses so image preparation cannot block scrolling.
 await new Promise(resolve=>requestAnimationFrame(resolve));
 const [front,back]=await Promise.all([prepareImage(look.front),prepareImage(look.back)]);
 if(failed){front.texture.dispose();back.texture.dispose();return;}
 const root=new THREE.Group(),pivot=new THREE.Group(),body=garmentShell(front,back,i);
 root.add(makeHook(),pivot);pivot.position.y=-.215;body.position.y=.215;pivot.add(body);scene.add(root);
 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(2.7,.35),new THREE.MeshBasicMaterial({map:shadowMap,transparent:true,depthWrite:false}));shadow.position.set(0,-4.24,-.15);scene.add(shadow);
 const hitWidth=new THREE.Box3().setFromObject(body).getSize(new THREE.Vector3()).x;
 const reveal=prepareReveal(root,shadow,Math.min(Math.abs(i-selected)*25,100));
 items[i]={root,pivot,body,shadow,hitWidth,reveal,x:naturalX(i)+targetOffset+(i<selected?-.38:i>selected?.38:0),vx:0,angle:i===selected?0:-.98,va:0,swing:0,vs:0};
},2);

for(const [i,look] of looks.entries()){
 const link=document.createElement('a');link.href=look.url;link.draggable=false;link.hidden=true;link.dataset.railIndex=i;link.className='rail-dress-hit';link.setAttribute('aria-label',`View ${look.name}, ${look.athlete}, ${look.year}`);link.setAttribute('aria-controls','rail-look-info');list.append(link);links.push(link);
 link.addEventListener('focus',()=>select(i));link.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?count-1:clamp(selected+(e.key==='ArrowRight'?1:-1),0,count-1);select(next);links[next].focus();}});
}
function mobile(){return width<=760;}function viewWidth(){return camera.right-camera.left;}function spacing(){return mobile()?2.05:Math.max(1.08,Math.min(1.8,(viewWidth()-2.7)/Math.min(count,10)));}function naturalX(i){return (i-(count-1)/2)*spacing();}function maxOffset(){return Math.max(0,naturalX(count-1)-viewWidth()/2+1.5);}
function select(i,force=false){
 i=clamp(i,0,count-1);requested=i;if(!items[i]){loadDress(i,true).then(()=>{if(requested===i)select(i,force);}).catch(()=>{});return;}if(i===selected&&!force)return;const old=selected;selected=i;side='front';if(items[old])items[old].vs+=(i>old?-.09:.09);items[i].vs+=(i>old?.07:-.07);targetOffset=mobile()?-naturalX(i):clamp(-naturalX(i),-maxOffset(),maxOffset());
 const look=looks[i];$('look-meta').textContent=`${look.athlete} · ${look.event} ${look.year}`;$('look-title').textContent=look.name;
 links.forEach((link,j)=>{if(i===j)link.setAttribute('aria-current','true');else link.removeAttribute('aria-current');link.tabIndex=i===j?0:-1;});$('front').setAttribute('aria-pressed','true');$('back').setAttribute('aria-pressed','false');
}
function flip(value){if(!items[selected])return;side=value;for(const id of ['front','back'])$(id).setAttribute('aria-pressed',id===side);items[selected].vs+=.055;}
$('front').addEventListener('click',()=>flip('front'));$('back').addEventListener('click',()=>flip('back'));$('previous').addEventListener('click',()=>select((requested+count-1)%count));$('next').addEventListener('click',()=>select((requested+1)%count));
// Keep normal link activation (including keyboard and modified clicks). Capture
// a gesture on its original link so moving dresses cannot change its destination.
stage.addEventListener('pointerdown',e=>{suppressClick=false;if(!ready||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;const captureTarget=e.target.closest('.rail-dress-hit')||stage;drag={id:e.pointerId,x:e.clientX,last:e.clientX,offset:targetOffset,moved:false,captureTarget};captureTarget.setPointerCapture(e.pointerId);stage.classList.add('dragging');});
stage.addEventListener('pointermove',e=>{
 if(drag){if(e.pointerId!==drag.id)return;const dx=e.clientX-drag.x;drag.moved ||=Math.abs(dx)>7;targetOffset=clamp(drag.offset+dx/width*viewWidth(),-naturalX(count-1)-.35,-naturalX(0)+.35);const impulse=clamp(e.clientX-drag.last,-15,15)*.0008;items.forEach(item=>item.vs+=impulse);drag.last=e.clientX;return;}
 if(e.pointerType==='touch')return;const link=e.target.closest('.rail-dress-hit');if(link)select(Number(link.dataset.railIndex));
});
stage.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const gesture=drag;suppressClick=gesture.moved;if(gesture.moved){let i=0;items.forEach((_,j)=>{if(Math.abs(naturalX(j)+targetOffset)<Math.abs(naturalX(i)+targetOffset))i=j;});select(i,true);}drag=null;stage.classList.remove('dragging');if(gesture.captureTarget.hasPointerCapture(e.pointerId))gesture.captureTarget.releasePointerCapture(e.pointerId);});
stage.addEventListener('click',e=>{if(suppressClick&&e.detail!==0){e.preventDefault();e.stopPropagation();}suppressClick=false;},true);
stage.addEventListener('pointercancel',e=>{if(!drag||drag.id!==e.pointerId)return;const gesture=drag;drag=null;suppressClick=false;targetOffset=mobile()?-naturalX(selected):clamp(-naturalX(selected),-maxOffset(),maxOffset());stage.classList.remove('dragging');if(gesture.captureTarget.hasPointerCapture(e.pointerId))gesture.captureTarget.releasePointerCapture(e.pointerId);});
function resize(){width=stage.clientWidth;const h=stage.clientHeight,worldH=5.12;camera.left=-worldH*width/h/2;camera.right=-camera.left;camera.top=worldH/2;camera.bottom=-worldH/2;camera.updateProjectionMatrix();renderer.setSize(width,h,false);const length=viewWidth()+.5;rail.scale.y=length/2;endCaps.forEach(cap=>cap.position.x=cap.userData.sign*length/2);targetOffset=mobile()?-naturalX(selected):clamp(-naturalX(selected),-maxOffset(),maxOffset());}
function spring(item,key,velocity,target,k,d,dt){item[velocity]+=(target-item[key])*k*dt;item[velocity]*=Math.exp(-d*dt);item[key]+=item[velocity]*dt;}
function animate(time){if(failed)return;if(!visible||document.hidden){lastTime=time;requestAnimationFrame(animate);return;}const dt=Math.min((time-lastTime)/1000||1/60,.032);lastTime=time;offset=reduced.matches?targetOffset:offset+(targetOffset-offset)*(1-Math.exp(-9*dt));
 items.forEach((item,i)=>{const active=i===selected,x=naturalX(i)+offset+(i<selected?-.38:i>selected?.38:0),baseAngle=active?(side==='back'?Math.PI:0):-.98,angle=item.angle+Math.atan2(Math.sin(baseAngle-item.angle),Math.cos(baseAngle-item.angle));
 if(reduced.matches){item.x=x;item.angle=angle;item.swing=0;}else{spring(item,'x','vx',x,140,21,dt);spring(item,'angle','va',angle,105,16,dt);spring(item,'swing','vs',Math.sin(time*.0007+i)*.004,30,5.5,dt);}
 const settling=updateReveal(item.reveal,time,reduced.matches,i%2?1:-1);
 item.root.position.x=item.x;item.pivot.rotation.z=item.swing+settling;item.body.rotation.y=item.angle;updateFabric(item,time,dt,reduced.matches,active);projection.set(item.x,-1.7,0).project(camera);const px=(projection.x+1)*width/2,hit=links[i];if(hit){hit.hidden=!item.root.visible;hit.style.left=`${px}px`;hit.style.width=`${Math.max(38,(active?item.hitWidth:spacing()*.8)/viewWidth()*width)}px`;hit.style.zIndex=active?'2':'1';}
 });if(ready&&!revealed&&items[selected]?.reveal.complete){revealed=true;container.classList.add('is-ready');}renderer.render(scene,camera);requestAnimationFrame(animate);
}
try{
 await loadDress(selected,true);
 resize();select(selected,true);ready=true;container.querySelectorAll('[data-rail-control]').forEach(b=>b.disabled=false);
 // Populate the surrounding rail outward, after the first dress is usable.
 const order=looks.map((_,i)=>i).filter(i=>i!==selected).sort((a,b)=>Math.abs(a-selected)-Math.abs(b-selected));
 order.forEach(i=>loadDress(i).catch(()=>{}));
}catch(error){failed=true;container.classList.add('rail-unavailable');renderer.dispose();resizeObserver.disconnect();visibility.disconnect();throw error;}


}
