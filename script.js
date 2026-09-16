const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');io.unobserve(e.target)}}),{threshold:.12,rootMargin:'0px 0px -40px'});document.querySelectorAll('.reveal').forEach(e=>io.observe(e));const m=document.querySelector('.menu'),h=document.querySelector('.nav-shell');m.addEventListener('click',()=>{const o=h.classList.toggle('open');m.setAttribute('aria-expanded',o)});document.querySelectorAll('#nav a').forEach(a=>a.onclick=()=>h.classList.remove('open'));window.addEventListener('pointermove',e=>{if(innerWidth>900)document.querySelector('.hero-photo').style.transform=`scale(1.03) translate(${(e.clientX/innerWidth-.5)*9}px,${(e.clientY/innerHeight-.5)*7}px)`},{passive:true});

document.querySelector('.hero h1')?.remove();document.querySelector('.hero .metrics')?.remove();

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
  index.innerHTML='<div class="sphere-index__globe" aria-hidden="true"><i></i><i></i><i></i></div><div class="asteroid-system" aria-hidden="true"><div class="asteroid-belt asteroid-belt--outer"></div><div class="asteroid-belt asteroid-belt--inner"></div></div><nav class="sphere-index__orbit" aria-label="首屏索引"></nav>';
  hero.append(index);
  const asteroidBelts=index.querySelectorAll('.asteroid-belt');
  asteroidBelts.forEach((belt,beltIndex)=>{
    const count=beltIndex===0?18:11;
    for(let i=0;i<count;i++){
      const asteroid=document.createElement('i');
      const angle=(360/count)*i+(beltIndex?13:0);
      const size=2+((i*7+3)%5);
      asteroid.style.setProperty('--angle',`${angle}deg`);
      asteroid.style.setProperty('--reverse-angle',`${-angle}deg`);
      asteroid.style.setProperty('--size',`${size}px`);
      asteroid.style.setProperty('--offset',`${((i*11)%13)-6}px`);
      asteroid.style.setProperty('--alpha',String(.24+((i*17)%55)/100));
      belt.append(asteroid);
    }
  });
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

const experienceItems=[
  {date:'2024.07 — 2024.08',point:'2024.07',label:'中天国富证券',photo:'assets/internship-photo-enhanced.png',photoAlt:'中天国富证券深圳分公司实习照片',cardTitle:'中天国富证券',title:'中天国富证券有限公司深圳分公司',role:'网络金融部｜运营数据与新媒体调研',copy:'面向证券机构新媒体运营，拆解抖音、视频号、快手等平台的内容选题、发布节奏、互动方式与用户触达路径。完成 30+ 证券机构调研与 200+ 条金融内容数据结构化整理，并从 0 到 1 建立“样本采集 → 字段拆解 → 标签归类 → 统计分析 → 用户洞察”的运营研究链路，为营销活动、渠道内容和用户运营策略提供输入。',tags:['新媒体竞品分析','内容数据结构化','金融产品运营']},
  {date:'2024.09 — 2025.03',point:'2024.09',label:'深圳大学',photo:'assets/experience-szu-assets.jpg',photoAlt:'深圳大学校园个人照片',cardTitle:'深圳大学',title:'深圳大学实验室与国有资产管理部',role:'办公室助理｜财务与资产数据审核',copy:'作为跨学院报表审核执行 Owner，支持校内 20+ 学院国有资产与财务报表审核，负责部门报表汇总及上报前的数据一致性检查。日均处理 120+ 条数据，通过交叉核对与逻辑校验将准确率稳定在约 97%。将分散学院报表转化为“字段核对 → 异常识别 → 逻辑校验 → 汇总上报”的可审核数据流，形成稳定的行政数据处理闭环。',tags:['报表审核','流程执行','数据校验']},
  {date:'2026.09 — 至今',point:'2026.09',label:'AI 面试陪练',photo:'assets/hkustgZ-campus.png',photoAlt:'AI 面试陪练产品项目封面',cardTitle:'AI 面试陪练',title:'AI 面试陪练产品开发',role:'个人项目发起者｜产品设计与 AI 开发',copy:'面向 AI 产品经理实习候选人，参考 3 份岗位 JD 梳理需求，设计“资料输入—匹配分析—模拟面试—动态追问—能力报告”的完整流程。通过结构化数据串联简历分析、问题生成、回答诊断与报告，区分事实、推断和未知信息，减少泛化反馈与经历误判。借助 Codex 等 AI 编程工具完成前后端、DeepSeek API 接入与 GitHub 发布；18 项自动化测试通过。现已完成本地可运行原型，公网模型后端尚未部署，也尚未开展外部用户测试。',tags:['3 份岗位 JD','18 项自动化测试','DeepSeek API']}
];

const timelineCard=document.querySelector('.timeline-card');
const timelinePoints=[...document.querySelectorAll('.timeline-point')];
const timelineProgress=document.querySelector('.experience-timeline__line i');
let experienceIndex=0;
function renderExperience(index,{flip=true}={}){
  experienceIndex=(index+experienceItems.length)%experienceItems.length;
  const item=experienceItems[experienceIndex];
  timelineCard?.classList.toggle('is-ai-project',experienceIndex===2);
  const img=timelineCard?.querySelector('.timeline-card__front img');
  if(img){img.src=item.photo;img.alt=item.photoAlt;}
  const set=(selector,value)=>{const el=timelineCard?.querySelector(selector);if(el)el.textContent=value};
  set('.timeline-photo-label span',`PHOTO / ${String(experienceIndex+1).padStart(2,'0')}`);
  set('.timeline-photo-label strong',item.cardTitle||item.title);
  set('.timeline-back-index',String(experienceIndex+1).padStart(2,'0'));
  set('.timeline-back-date',item.date);
  set('.timeline-card__back h3',item.title);
  set('.timeline-back-role',item.role);
  set('.timeline-back-copy',item.copy);
  const tagWrap=timelineCard?.querySelector('.timeline-back-tags');
  if(tagWrap)tagWrap.innerHTML=item.tags.map(tag=>`<span>${tag}</span>`).join('');
  timelinePoints.forEach((point,i)=>{point.classList.toggle('is-active',i===experienceIndex);point.setAttribute('aria-selected',String(i===experienceIndex));point.querySelector('strong').textContent=experienceItems[i].point;point.querySelector('span').textContent=experienceItems[i].label});
  if(timelineProgress)timelineProgress.style.width=`${experienceIndex/(experienceItems.length-1)*100}%`;
  if(flip){timelineCard?.classList.remove('is-flipped');requestAnimationFrame(()=>requestAnimationFrame(()=>timelineCard?.classList.add('is-flipped')))}
}
timelinePoints.forEach(point=>point.addEventListener('click',()=>renderExperience(Number(point.dataset.index))));
document.querySelector('.timeline-arrow--prev')?.addEventListener('click',()=>renderExperience(experienceIndex-1));
document.querySelector('.timeline-arrow--next')?.addEventListener('click',()=>renderExperience(experienceIndex+1));
timelineCard?.addEventListener('click',()=>timelineCard.classList.toggle('is-flipped'));
timelineCard?.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();timelineCard.classList.toggle('is-flipped')}});
renderExperience(0,{flip:false});
