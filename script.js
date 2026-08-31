const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');io.unobserve(e.target)}}),{threshold:.12,rootMargin:'0px 0px -40px'});document.querySelectorAll('.reveal').forEach(e=>io.observe(e));const m=document.querySelector('.menu'),h=document.querySelector('.nav-shell');m.addEventListener('click',()=>{const o=h.classList.toggle('open');m.setAttribute('aria-expanded',o)});document.querySelectorAll('#nav a').forEach(a=>a.onclick=()=>h.classList.remove('open'));window.addEventListener('pointermove',e=>{if(innerWidth>900)document.querySelector('.hero-photo').style.transform=`scale(1.03) translate(${(e.clientX/innerWidth-.5)*9}px,${(e.clientY/innerHeight-.5)*7}px)`},{passive:true});

const heroRefresh=document.createElement('link');heroRefresh.rel='stylesheet';heroRefresh.href='hero-refresh.css';document.head.append(heroRefresh);document.querySelector('.hero h1')?.remove();document.querySelector('.hero .metrics')?.remove();

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

const hero=document.querySelector('.hero');
document.querySelector('.contact')?.setAttribute('id','contact');
if(hero){
  const index=document.createElement('aside');
  index.className='sphere-index';
  index.setAttribute('aria-label','页面索引');
  const sections=[
    {text:'01 / PROFILE',href:'#about'},
    {text:'02 / EXPERIENCE',href:'#experience'},
    {text:'03 / SELECTED WORK',href:'#projects'},
    {text:'04 / EDUCATION',href:'#education'},
    {text:'05 / LET\'S CONNECT',href:'#contact'}
  ];
  index.innerHTML='<div class="sphere-index__globe" aria-hidden="true"><i></i><i></i><i></i></div><nav class="sphere-index__orbit" aria-label="首屏索引"></nav>';
  hero.append(index);
  const orbit=index.querySelector('.sphere-index__orbit');
  const links=sections.map((section,i)=>{
    const link=document.createElement('a');
    link.href=section.href;
    link.textContent=section.text;
    link.dataset.index=i;
    orbit.append(link);
    return link;
  });
  let rotation=0;
  let paused=false;
  const render=()=>{
    const width=index.clientWidth;
    const radius=width*.36;
    links.forEach((link,i)=>{
      const longitude=(i/links.length)*Math.PI*2+rotation;
      const latitude=Math.sin(i*2.18)*.48;
      const x=Math.cos(longitude)*Math.cos(latitude)*radius;
      const y=Math.sin(latitude)*radius*.78;
      const z=Math.sin(longitude)*Math.cos(latitude);
      const scale=.72+(z+1)*.22;
      link.style.transform=`translate(-50%,-50%) translate3d(${x}px,${y}px,0) scale(${scale})`;
      link.style.opacity=String(.28+(z+1)*.36);
      link.style.zIndex=String(Math.round((z+1)*10));
      link.style.filter=`blur(${Math.max(0,-z)*.65}px)`;
    });
    if(!paused)rotation+=.004;
    requestAnimationFrame(render);
  };
  orbit.addEventListener('pointerenter',()=>paused=true);
  orbit.addEventListener('pointerleave',()=>paused=false);
  orbit.addEventListener('focusin',()=>paused=true);
  orbit.addEventListener('focusout',()=>paused=false);
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)paused=true;
  render();
}
