const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');io.unobserve(e.target)}}),{threshold:.12,rootMargin:'0px 0px -40px'});document.querySelectorAll('.reveal').forEach(e=>io.observe(e));const m=document.querySelector('.menu'),h=document.querySelector('.nav-shell');m.addEventListener('click',()=>{const o=h.classList.toggle('open');m.setAttribute('aria-expanded',o)});document.querySelectorAll('#nav a').forEach(a=>a.onclick=()=>h.classList.remove('open'));window.addEventListener('pointermove',e=>{if(innerWidth>900)document.querySelector('.hero-photo').style.transform=`scale(1.03) translate(${(e.clientX/innerWidth-.5)*9}px,${(e.clientY/innerHeight-.5)*7}px)`},{passive:true});

const intro=document.querySelector('.hero-intro');
if(intro){
  const text=intro.textContent.trim();
  intro.setAttribute('aria-label',text);
  const content=document.createElement('span');
  const cursor=document.createElement('span');
  cursor.className='text-type__cursor';
  cursor.textContent='|';
  cursor.setAttribute('aria-hidden','true');
  cursor.style.cssText='display:inline-block;margin-left:.25rem;color:var(--cyan)';
  cursor.animate([{opacity:1},{opacity:0}],{duration:500,iterations:Infinity,direction:'alternate',easing:'ease-in-out'});
  intro.textContent='';
  intro.append(content,cursor);
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){content.textContent=text}else{
    let index=0;
    setTimeout(function type(){content.textContent=text.slice(0,index++);if(index<=text.length)setTimeout(type,54+Math.random()*34)},700);
  }
}
