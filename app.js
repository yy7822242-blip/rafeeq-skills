const STORAGE_KEY = "rafeeq_skills_v1";
let state = {
  name: "مستكشف المهارات",
  freeTime: 5,
  goals: [],
  completedDoses: [],
  completedChallenges: [],
  streak: 0,
  lastActiveDate: null,
  weekActivity: [0,0,0,0,0,0,0],
  currentPathId: null,
  currentDoseId: null,
  dailyDoseId: null,
  dailyPathId: null,
  audioFirst: false
};
let currentUtterance = null;

function $(s){return document.querySelector(s)}
function $$(s){return document.querySelectorAll(s)}
function saveState(){localStorage.setItem(STORAGE_KEY, JSON.stringify(state))}
function loadState(){
  try{
    const s=localStorage.getItem(STORAGE_KEY);
    if(s) state={...state,...JSON.parse(s)};
  }catch(e){}
  updateStreak();
  pickDailyDose();
}
function updateStreak(){
  const today=new Date().toDateString();
  if(state.lastActiveDate===today) return;
  const y=new Date(); y.setDate(y.getDate()-1);
  if(state.lastActiveDate && state.lastActiveDate!==y.toDateString() && state.lastActiveDate!==today){
    state.streak=0;
  }
}
function markActivityToday(){
  const d=new Date();
  state.weekActivity[d.getDay()]=1;
  const today=d.toDateString();
  if(state.lastActiveDate!==today){
    const y=new Date(); y.setDate(y.getDate()-1);
    if(state.lastActiveDate===y.toDateString()) state.streak=(state.streak||0)+1;
    else state.streak=1;
    state.lastActiveDate=today;
  }
  saveState();
}
function pickDailyDose(){
  const all=[];
  Object.values(PATHS).forEach(p=>p.doses.forEach(d=>all.push({pathId:p.id,doseId:d.id})));
  const incomplete=all.filter(x=>!state.completedDoses.includes(x.doseId));
  const pool=incomplete.length?incomplete:all;
  const pick=pool[Math.floor(Math.random()*pool.length)];
  state.dailyPathId=pick.pathId;
  state.dailyDoseId=pick.doseId;
}
function showToast(msg,ms=2500){
  const t=$("#toast");
  t.textContent=msg;
  t.classList.remove("hidden");
  setTimeout(()=>t.classList.add("hidden"),ms);
}
function getGreeting(){
  const h=new Date().getHours();
  if(h<12) return "صباح الخير";
  if(h<17) return "مساء الخير";
  return "مساء النور";
}
function getDose(pathId,doseId){
  const p=PATHS[pathId];
  if(!p) return null;
  return p.doses.find(d=>d.id===doseId)||null;
}
function speak(text){
  if(!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);
  u.lang="ar-SA";
  u.rate=0.95;
  currentUtterance=u;
  window.speechSynthesis.speak(u);
}
function stopSpeak(){
  if(window.speechSynthesis) window.speechSynthesis.cancel();
}
function goPage(id){
  $$(".page").forEach(p=>p.classList.remove("active"));
  const el=$("#page-"+id);
  if(el) el.classList.add("active");
  $$(".nav-btn").forEach(b=>{
    b.classList.toggle("active", b.dataset.page===id || (id==="path-detail"&&b.dataset.page==="paths") || (id==="dose"&&b.dataset.page==="home"));
  });
}
function goHome(){
  renderHome();
  goPage("home");
}
function renderHome(){
  $("#greeting").textContent=getGreeting();
  $("#userName").textContent=state.name;
  $("#userAvatar").textContent=(state.name||"م")[0];
  $("#streakCount").textContent=state.streak||0;
  $("#totalDoses").textContent=state.completedDoses.length;
  const path=PATHS[state.dailyPathId];
  const dose=getDose(state.dailyPathId, state.dailyDoseId);
  if(path&&dose){
    const cat=CATEGORIES.find(c=>c.id===path.category);
    $("#dailyTitle").textContent=dose.title;
    $("#dailyDesc").textContent=dose.desc;
    $("#dailyCard .daily-meta").innerHTML=`<span>⏱ 3 دقائق</span><span>🎯 ${cat?cat.name:""}</span>`;
    $("#coachMessage").textContent=`جرعتك اليوم: ${dose.title}. ابدأ الآن في 3 دقائق.`;
  }
  const scroll=$("#pathsScroll");
  scroll.innerHTML="";
  Object.keys(PATHS).slice(0,6).forEach(pid=>{
    const p=PATHS[pid];
    const done=p.doses.filter(d=>state.completedDoses.includes(d.id)).length;
    const card=document.createElement("div");
    card.className="path-card";
    card.innerHTML=`<div class="path-icon">${p.icon}</div><h4>${p.title}</h4><p>${p.desc}</p><div class="path-count">${done}/${p.doses.length} جرعة</div>`;
    card.onclick=()=>openPath(pid);
    scroll.appendChild(card);
  });
  const week=$("#weekProgress");
  const days=["أحد","إثن","ثلا","أرب","خمي","جمع","سبت"];
  const today=new Date().getDay();
  week.innerHTML="";
  days.forEach((name,i)=>{
    const div=document.createElement("div");
    div.className="day-dot"+(state.weekActivity[i]?" done":"")+(i===today?" today":"");
    div.innerHTML=`<div class="circle">${state.weekActivity[i]?"✓":""}</div><span>${name}</span>`;
    week.appendChild(div);
  });
  const lastChallenge=state.completedDoses.slice(-1)[0];
  const btn=$("#btnChallenge");
  if(lastChallenge && !state.completedChallenges.includes(lastChallenge)){
    btn.disabled=false;
    const d=Object.values(PATHS).flatMap(p=>p.doses).find(x=>x.id===lastChallenge);
    if(d&&d.challenge){
      $("#challengeTitle").textContent=d.challenge.title;
      $("#challengeDesc").textContent=d.challenge.desc;
    }
  } else {
    btn.disabled=true;
  }
}
function renderCategories(){
  const grid=$("#categoriesGrid");
  grid.innerHTML="";
  CATEGORIES.forEach(cat=>{
    const paths=Object.values(PATHS).filter(p=>p.category===cat.id);
    if(!paths.length) return;
    const card=document.createElement("div");
    card.className="category-card";
    card.innerHTML=`<div class="category-icon" style="background:${cat.color}22">${cat.icon}</div>
      <div class="category-info"><h4>${cat.name}</h4><p>${paths.length} مسار</p></div>
      <span class="category-arrow">›</span>`;
    card.onclick=()=>{
      grid.innerHTML="";
      paths.forEach(p=>{
        const c=document.createElement("div");
        c.className="category-card";
        const done=p.doses.filter(d=>state.completedDoses.includes(d.id)).length;
        c.innerHTML=`<div class="category-icon">${p.icon}</div>
          <div class="category-info"><h4>${p.title}</h4><p>${done}/${p.doses.length} جرعة</p></div>`;
        c.onclick=()=>openPath(p.id);
        grid.appendChild(c);
      });
      const back=document.createElement("button");
      back.className="back-btn";
      back.textContent="← رجوع للأقسام";
      back.onclick=renderCategories;
      grid.prepend(back);
    };
    grid.appendChild(card);
  });
}
function openPath(pathId){
  const path=PATHS[pathId];
  if(!path) return;
  state.currentPathId=pathId;
  $("#pathDetailTitle").textContent=path.title;
  $("#pathDetailDesc").textContent=path.desc;
  const done=path.doses.filter(d=>state.completedDoses.includes(d.id)).length;
  $("#pathProgressFill").style.width=((done/path.doses.length)*100)+"%";
  $("#pathProgressText").textContent=`${done} / ${path.doses.length} جرعة`;
  const list=$("#dosesList");
  list.innerHTML="";
  path.doses.forEach((d,i)=>{
    const item=document.createElement("div");
    const completed=state.completedDoses.includes(d.id);
    item.className="dose-item"+(completed?" completed":"");
    item.innerHTML=`<div class="dose-num">${completed?"✓":(i+1)}</div>
      <div class="dose-item-info"><h4>${d.title}</h4><p>${d.desc}</p></div>`;
    item.onclick=()=>openDose(pathId,d.id);
    list.appendChild(item);
  });
  goPage("path-detail");
}
function openDose(pathId,doseId){
  const dose=getDose(pathId,doseId);
  if(!dose) return;
  state.currentPathId=pathId;
  state.currentDoseId=doseId;
  stopSpeak();
  $$(".dose-step").forEach((s,i)=>s.classList.toggle("active",i===0));
  $$(".dose-step-content").forEach((c,i)=>c.classList.toggle("active",i===0));
  $("#tipText").textContent=dose.tip;
  $("#tipSub").textContent=dose.tipSub||"";
  $("#videoTitle").textContent=dose.videoTitle||"";
  $("#videoTranscript").textContent=dose.videoTranscript||"";
  $("#quizQuestion").textContent=dose.quiz.question;
  const opts=$("#quizOptions");
  opts.innerHTML="";
  $("#quizFeedback").classList.add("hidden");
  $("#btnFinishDose").classList.add("hidden");
  dose.quiz.options.forEach((opt,i)=>{
    const b=document.createElement("button");
    b.className="quiz-option";
    b.textContent=opt;
    b.onclick=()=>{
      $$(".quiz-option").forEach(x=>x.disabled=true);
      const ok=i===dose.quiz.correct;
      b.classList.add(ok?"correct":"wrong");
      if(!ok) opts.children[dose.quiz.correct].classList.add("correct");
      const fb=$("#quizFeedback");
      fb.classList.remove("hidden","correct","wrong");
      fb.classList.add(ok?"correct":"wrong");
      fb.textContent=ok?"أحسنت! ثبت المعلومة.":"ليس صحيحاً، راجع الشرح مرة أخرى.";
      $("#btnFinishDose").classList.remove("hidden");
    };
    opts.appendChild(b);
  });
  goPage("dose");
  if(state.audioFirst) speak(dose.tip+" "+(dose.tipSub||""));
}
function finishDose(){
  const id=state.currentDoseId;
  if(id && !state.completedDoses.includes(id)){
    state.completedDoses.push(id);
    markActivityToday();
    saveState();
  }
  const dose=getDose(state.currentPathId,id);
  openShare(dose);
  if(dose&&dose.challenge) openChallenge(dose);
  else goHome();
}
function openChallenge(dose){
  $("#challengeBigIcon").textContent="💪";
  $("#challengeDetailTitle").textContent=dose.challenge.title;
  $("#challengeDetailDesc").textContent=dose.challenge.desc;
  const ul=$("#challengeSteps");
  ul.innerHTML="<ul class='challenge-steps'>"+dose.challenge.steps.map(s=>`<li>${s}</li>`).join("")+"</ul>";
  $("#challengeResponse").value="";
  state.currentDoseId=dose.id;
  goPage("challenge");
}
function openShare(dose){
  if(!dose) return;
  $("#shareIcon").textContent="🎯";
  $("#shareTitle").textContent=dose.title;
  $("#shareTip").textContent=dose.tip;
  $("#shareModal").classList.remove("hidden");
}
function renderProfile(){
  $("#profileAvatar").textContent=(state.name||"م")[0];
  $("#inputName").value=state.name||"";
  $("#profileDoses").textContent=state.completedDoses.length;
  $("#profileStreak").textContent=state.streak||0;
  $("#audioFirstToggle").checked=!!state.audioFirst;
  $$(".time-btn").forEach(b=>b.classList.toggle("active", +b.dataset.time===state.freeTime));
  const goals=$("#goalsList");
  goals.innerHTML="";
  GOALS.forEach(g=>{
    const chip=document.createElement("button");
    chip.className="goal-chip"+(state.goals.includes(g.id)?" active":"");
    chip.textContent=g.label;
    chip.onclick=()=>{
      if(state.goals.includes(g.id)) state.goals=state.goals.filter(x=>x!==g.id);
      else state.goals.push(g.id);
      saveState();
      renderProfile();
    };
    goals.appendChild(chip);
  });
}
function initEvents(){
  $$(".nav-btn").forEach(b=>{
    b.onclick=()=>{
      const page=b.dataset.page;
      if(page==="home") goHome();
      else if(page==="paths"){ renderCategories(); goPage("paths"); }
      else if(page==="profile"){ renderProfile(); goPage("profile"); }
    };
  });
  $("#btnStartDaily").onclick=()=>openDose(state.dailyPathId, state.dailyDoseId);
  $("#btnAudioDaily").onclick=()=>{
    const d=getDose(state.dailyPathId, state.dailyDoseId);
    if(d) speak(d.tip+" "+(d.tipSub||""));
  };
  $("#btnSeeAllPaths").onclick=()=>{ renderCategories(); goPage("paths"); };
  $("#btnBackFromPath").onclick=()=>{ renderCategories(); goPage("paths"); };
  $("#btnBackFromDose").onclick=()=>{
    stopSpeak();
    if(state.currentPathId) openPath(state.currentPathId);
    else goHome();
  };
  $("#btnBackFromChallenge").onclick=goHome;
  $("#btnListenTip").onclick=()=>{
    const d=getDose(state.currentPathId, state.currentDoseId);
    if(d) speak(d.tip+" "+(d.tipSub||""));
  };
  $("#btnNextToVideo").onclick=()=>{
    stopSpeak();
    $$(".dose-step").forEach((s,i)=>s.classList.toggle("active",i===1));
    $$(".dose-step").forEach((s,i)=>{ if(i===0) s.classList.add("done"); });
    $$(".dose-step-content").forEach((c,i)=>c.classList.toggle("active",i===1));
  };
  $("#btnListenTranscript").onclick=()=>{
    const d=getDose(state.currentPathId, state.currentDoseId);
    if(d) speak(d.videoTranscript||"");
  };
  $("#btnNextToQuiz").onclick=()=>{
    stopSpeak();
    $$(".dose-step").forEach((s,i)=>s.classList.toggle("active",i===2));
    $$(".dose-step").forEach((s,i)=>{ if(i<=1) s.classList.add("done"); });
    $$(".dose-step-content").forEach((c,i)=>c.classList.toggle("active",i===2));
  };
  $("#btnFinishDose").onclick=finishDose;
  $("#btnChallenge").onclick=()=>{
    const id=state.completedDoses.slice(-1)[0];
    const d=Object.values(PATHS).flatMap(p=>p.doses).find(x=>x.id===id);
    if(d) openChallenge(d);
  };
  $("#btnCompleteChallenge").onclick=()=>{
    if(state.currentDoseId && !state.completedChallenges.includes(state.currentDoseId)){
      state.completedChallenges.push(state.currentDoseId);
      saveState();
    }
    showToast("أحسنت! تحدٍ مكتمل");
    goHome();
  };
  $("#btnCloseShare").onclick=()=>$("#shareModal").classList.add("hidden");
  $("#shareOverlay").onclick=()=>$("#shareModal").classList.add("hidden");
  $("#btnShareNative").onclick=async()=>{
    const title=$("#shareTitle").textContent;
    const tip=$("#shareTip").textContent;
    const text=`⚡ أتممت مهارة: ${title}\n\n${tip}\n\n#رفيق_المهارات`;
    if(navigator.share){
      try{ await navigator.share({title, text}); }catch(e){}
    } else {
      await navigator.clipboard.writeText(text);
      showToast("تم نسخ النص");
    }
  };
  $("#btnCopyShare").onclick=async()=>{
    const title=$("#shareTitle").textContent;
    const tip=$("#shareTip").textContent;
    await navigator.clipboard.writeText(`⚡ أتممت مهارة: ${title}\n\n${tip}\n\n#رفيق_المهارات`);
    showToast("تم نسخ النص");
  };
  $("#btnSettings").onclick=()=>{ renderProfile(); goPage("profile"); };
  $("#inputName").onchange=()=>{
    state.name=$("#inputName").value.trim()||"مستكشف المهارات";
    saveState();
    renderHome();
  };
  $$(".time-btn").forEach(btn=>{
    btn.onclick=()=>{
      state.freeTime=parseInt(btn.dataset.time);
      saveState();
      renderProfile();
      showToast("تم تحديث وقت الفراغ");
    };
  });
  const audioToggle=$("#audioFirstToggle");
  if(audioToggle){
    audioToggle.onchange=()=>{
      state.audioFirst=audioToggle.checked;
      saveState();
      showToast(state.audioFirst?"تم تفعيل الوضع الصوتي":"تم إيقاف الوضع الصوتي");
    };
  }
  $("#btnResetData").onclick=()=>{
    if(confirm("هل أنت متأكد من إعادة تعيين كل التقدم؟")){
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    }
  };
  $("#videoBox").onclick=()=>showToast("▶ يتم تشغيل الفيديو التوضيحي...");
  if(window.speechSynthesis){
    window.speechSynthesis.getVoices();
  }
}
function registerSW(){
  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("./sw.js").catch(()=>{});
  }
}
function init(){
  loadState();
  initEvents();
  registerSW();
  setTimeout(()=>{
    $("#splash").classList.add("hidden");
    $("#app").classList.remove("hidden");
    goHome();
  }, 1200);
}
document.addEventListener("DOMContentLoaded", init);
