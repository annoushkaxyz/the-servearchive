// Bound expensive image decoding and let a newly selected dress jump the queue.
export function priorityLoader(load, concurrency=2){
 const pending=new Map(),queue=[];let active=0;
 function pump(){
  while(active<concurrency&&queue.length){
   const job=queue.shift();active++;
   Promise.resolve().then(()=>load(job.index)).then(job.resolve,job.reject).finally(()=>{active--;pump();});
  }
 }
 return (index,priority=false)=>{
  if(pending.has(index)){
   const at=queue.findIndex(job=>job.index===index);
   if(priority&&at>0)queue.unshift(queue.splice(at,1)[0]);
   return pending.get(index);
  }
  let resolve,reject;const result=new Promise((yes,no)=>{resolve=yes;reject=no;});
  pending.set(index,result);const job={index,resolve,reject};priority?queue.unshift(job):queue.push(job);pump();
  result.catch(()=>pending.delete(index));return result;
 };
}
