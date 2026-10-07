const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
let currentUser=sessionStorage.getItem("nstep_session_user")||"";
let heirs={beneficiaries:[],assets:[]};
let security={lastScan:null,score:null};
let users={};
try{users=JSON.parse(localStorage.getItem("nstep_users")||"{}")}catch(e){users={};localStorage.removeItem("nstep_users")}
let goals=[];
let activePlan=null;
let goalFilter="all";
function userKey(){return currentUser||"__guest__"}
function loadUserData(){
  const u=users[userKey()]||{goals:[],activePlan:null,heirs:{beneficiaries:[],assets:[]},security:{lastScan:null,score:null}};
  goals=u.goals||[]; activePlan=u.activePlan||null; heirs=u.heirs||{beneficiaries:[],assets:[]}; heirs.beneficiaries=heirs.beneficiaries||[]; heirs.assets=heirs.assets||[]; security=u.security||{lastScan:null,score:null};
}
function persistUserData(){
  const old=users[userKey()]||{};
  users[userKey()]={...old,goals,activePlan,heirs,security};
  localStorage.setItem("nstep_users",JSON.stringify(users));
  if(currentUser)sessionStorage.setItem("nstep_session_user",currentUser);
}
loadUserData();
const today=new Date(); today.setHours(0,0,0,0);
function money(n){return new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Math.round(Number(n)||0)).replace("IDR","Rp")}
function parseNumeric(v){return Number(String(v??"").replace(/[^0-9-]/g,""))||0}
function formatThousandsInput(el){if(!el)return; const raw=String(el.value).replace(/[^0-9]/g,""); el.value=raw?Number(raw).toLocaleString("id-ID"):""}
function fmtDate(d){return new Intl.DateTimeFormat("id-ID",{day:"numeric",month:"short",year:"numeric"}).format(d)}
function dateOnly(v){
  if(v instanceof Date)return new Date(v.getTime());
  const s=String(v??"");
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return new Date(s+"T00:00:00");
  return new Date(s);
}
function localDateKey(v){const d=dateOnly(v);if(Number.isNaN(d.getTime()))return "";return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
function save(){persistUserData();}
function toast(t){const x=$("#toast");x.textContent=t;x.classList.add("show");setTimeout(()=>x.classList.remove("show"),2600)}
function page(id){
 const target=document.getElementById(id);
 if(!target){toast("✨ Bagian ini akan kita bangun berikutnya.");return;}
 $$(".page").forEach(x=>x.classList.toggle("active",x.id===id));
 $$(".nav, .side-nav").forEach(x=>x.classList.toggle("active",x.dataset.page===id));
 scrollTo({top:0,behavior:"smooth"});
 if(id==="goals")renderGoals();
 if(id==="schedule")renderSchedule();
 if(id==="dashboard")renderDashboard();
 if(id==="reports")renderReports();
 if(id==="calculator")initQuickCalculator();
 if(id==="heirs")renderHeirs();
 if(id==="darkweb")renderDarkWeb();
 if(id==="settings")renderSettings();
}
$$("[data-page]").forEach(x=>x.onclick=()=>page(x.dataset.page));
function dateDiff(a,b){return Math.max(0,Math.floor((b-a)/86400000))}
function stepsFor(start,end,freq){
 const days=dateDiff(start,end)+1;
 if(days<1)return 0;
 if(freq==="daily")return days;
 if(freq==="weekly")return Math.floor((days-1)/7)+1;
 if(freq==="twice-weekly")return Math.floor((days-1)/3.5)+1;
 const n=Number(freq.replace("every","")); return Math.floor((days-1)/n)+1;
}
function stepDates(start,end,freq){
 const out=[];
 let d=new Date(start);
 const jumpDays=freq==="daily"?1:freq==="weekly"?7:freq==="twice-weekly"?3.5:Number(freq.replace("every",""));
 if(!Number.isFinite(jumpDays)||jumpDays<=0)return out;
 while(d<=end){
   out.push(new Date(d));
   d=new Date(d.getTime()+jumpDays*86400000);
 }
 return out;
}
function sequenceArithmetic(a,d,n){
 const vals=[]; for(let i=0;i<Math.min(n,5);i++) vals.push(money(a+i*d).replace(",00",""));
 return vals.join(" → ")+(n>5?" → …":"");
}
function makePlans(target,start,end,freq){
 const n=stepsFor(start,end,freq);
 if(!Number.isFinite(n)||n<1)return [];
 // Steady: mathematical total is exactly the target. Individual installments may
 // contain fractional rupiah when target is not divisible by n; the UI rounds only for display.
 const constant=target/n;
 // Growing: choose a sensible increase and solve a exactly from the arithmetic-series sum.
 let d=0;
 if(n>1){
   const candidate=Math.floor(((target/n)*0.20)/1000)*1000;
   const maxD=Math.floor((2*target/(n*(n-1)))*0.80/1000)*1000;
   d=Math.max(0,Math.min(candidate,maxD));
 }
 let a=n>1 ? target/n-((n-1)*d/2) : target;
 if(a<1000&&n>1){d=0;a=constant;}
 // Keep the exact sum. Do not round a/d here because that would silently change the target.
 const sparseFreq=freq==="weekly"?"weekly":(freq==="twice-weekly"?"twice-weekly":"every2");
 const sparseN=stepsFor(start,end,sparseFreq);
 let sparseD=0;
 if(sparseN>1){
   const candidate=Math.floor(((target/sparseN)*0.18)/1000)*1000;
   const maxD=Math.floor((2*target/(sparseN*(sparseN-1)))*0.70/1000)*1000;
   sparseD=Math.max(0,Math.min(candidate,maxD));
 }
 let sparseA=sparseN>1?target/sparseN-((sparseN-1)*sparseD/2):target;
 if(sparseA<1000&&sparseN>1){sparseD=0;sparseA=target/sparseN;}
 return [
  {name:"Steady Saver",icon:"🪙",desc:"Nominal tetap setiap kali menabung. Paling sederhana dan mudah dipantau.",type:"constant",a:constant,d:0,n,frequency:freq},
  {name:"Growing Saver",icon:"🌱",desc:"Nominal bertambah secara teratur. Cocok untuk pola barisan aritmetika.",type:"arithmetic",a,d,n,frequency:freq},
  {name:"Step-Up Schedule",icon:"🗓️",desc:"Lebih jarang menabung, tetapi nominal tiap langkah dibuat lebih besar.",type:"arithmetic",a:sparseA,d:sparseD,n:sparseN,frequency:sparseFreq}
 ];
}

function calc(){
 const name=$("#goalName").value.trim()||"Target Baru", target=parseNumeric($("#targetAmount").value), start=dateOnly($("#startDate").value), end=dateOnly($("#deadline").value), freq=$("#frequency").value;
 if(!target||target<1||Number.isNaN(start.getTime())||Number.isNaN(end.getTime())||end<start){toast("⚠️ Isi target dan tanggal dengan benar.");return}
 const n=stepsFor(start,end,freq), days=dateDiff(start,end)+1, plans=makePlans(target,start,end,freq);
 $("#calcPreview").innerHTML=`<div class="calc-head"><div><span class="eyebrow">YOUR CALCULATION</span><h2>${escapeHtml(name)}</h2><p>${days} calendar days · ${n} saving steps available</p></div><div class="calc-big">${money(target)}</div></div>
 <div class="calc-grid"><div class="calc-stat"><small>START</small><b>${fmtDate(start)}</b></div><div class="calc-stat"><small>DEADLINE</small><b>${fmtDate(end)}</b></div><div class="calc-stat"><small>SAVING STEPS</small><b>${n}×</b></div></div>`;
 renderPlans(plans,target,start,end,name);
}
function renderPlans(plans,target,start,end,name){
 $("#recommendations").classList.remove("hidden");
 $("#planCards").innerHTML=plans.map((p,i)=>{
   const dates=stepDates(start,end,p.frequency);
   const total=p.type==="constant"?p.a*p.n:p.n/2*(2*p.a+(p.n-1)*p.d);
   const seq=p.type==="constant"?`${money(p.a)} → ${money(p.a)} → ${money(p.a)} → …`:sequenceArithmetic(p.a,p.d,p.n);
   const formula=p.type==="constant"?`aₙ = ${money(p.a)}`:`aₙ = ${money(p.a)} + (n−1)(${money(p.d)})`;
   return `<article class="plan-card"><div class="plan-icon">${p.icon}</div><span class="eyebrow">${i===0?"EXACT TARGET":i===1?"PATTERN + PROOF":"SPACED SAVING"}</span><h3>${p.name}</h3><p>${p.desc}</p>
   <div class="sequence">${seq}</div><div class="plan-meta"><div>💰 Total<br><b>${money(total)}</b></div><div>📅 ${dates.length} steps<br><b>${freqText(p.frequency)}</b></div><div>🔢 First<br><b>${money(p.a)}</b></div><div>📈 Increase<br><b>${money(p.d)}</b></div></div>
   <button class="proof-btn" onclick='openProof(${JSON.stringify(p)})'>🔎 See proof</button><button class="use-btn" onclick='usePlan(${JSON.stringify(p)},${JSON.stringify({name,target,start:localDateKey(start),end:localDateKey(end)})})'>✓ Use this plan</button></article>`;
 }).join("");
}
function freqText(f){return f==="daily"?"Daily":f==="weekly"?"Weekly":f==="twice-weekly"?"2× / week":f==="every2"?"Every 2 days":f==="every3"?"Every 3 days":"Every 5 days"}
function usePlan(p,meta){
 const old=goals.find(g=>g.name===meta.name);
const existingSaved=old?.saved||[];
 const completed=existingSaved.reduce((s,x)=>s+Number(x.amount||0),0)>=Number(meta.target);
 activePlan={...p,...meta,saved:existingSaved,createdAt:old?.createdAt||new Date().toISOString(),completed};
 goals=goals.filter(g=>g.name!==meta.name);
 goals.push({name:meta.name,target:meta.target,start:meta.start,end:meta.end,plan:p,saved:existingSaved,completed});
 save();toast("✨ "+p.name+" is now active for "+meta.name);renderDashboard();page("schedule");
}
function openProof(p){
 const isConst=p.type==="constant", a=p.a,d=p.d;
 const formula=isConst?`aₙ = ${money(a)}`:`aₙ = ${money(a)} + (n − 1)(${money(d)})`;
 $("#modalContent").innerHTML=`<span class="eyebrow">MATHEMATICAL PROOF • ${p.name}</span><h2 style="font:700 31px 'Baloo 2';margin:5px 0 15px">Why does this pattern work?</h2>
 <div class="proof-step"><h4>① Basis of induction</h4><p>For n = 1:</p><div class="formula">${formula.replace("n − 1","1 − 1")}</div><p>✓ The first saving matches the defined rule.</p></div>
 <div class="proof-step"><h4>② Inductive hypothesis</h4><p>Assume the rule is true for n = k:</p><div class="formula">${isConst?"aₖ = "+money(a):"aₖ = "+money(a)+" + (k − 1)("+money(d)+")"}</div></div>
 <div class="proof-step"><h4>③ Inductive step</h4><p>Show that the rule remains true for k + 1.</p><div class="formula">${isConst?"aₖ₊₁ = "+money(a):"aₖ₊₁ = aₖ + d = [a + (k − 1)d] + d = a + kd"}</div><p>✓ Therefore the rule holds for the next saving step.</p></div>
 <div class="proof-step"><h4>④ Total target check</h4><div class="formula">${isConst?"Sₙ = n · a":`Sₙ = n/2 [2a + (n − 1)d]`}</div><p>This sum is the mathematical model used to calculate whether the selected number of saving steps reaches the target.</p></div>
 <div class="success">✓ Conclusion: the pattern is valid for every n ≥ 1 under the stated rule.</div>`;
 $("#modal").classList.add("show");
}
function analyzeCustom(){
 const target=parseNumeric($("#targetAmount").value), start=dateOnly($("#startDate").value), end=dateOnly($("#deadline").value), freq=$("#frequency").value,a=parseNumeric($("#customA").value),d=parseNumeric($("#customD").value),n=stepsFor(start,end,freq);
 if(!target||target<1||Number.isNaN(start.getTime())||Number.isNaN(end.getTime())||end<start||n<1||a<0||d<0){toast("⚠️ Isi target, tanggal, dan pola custom dengan benar.");return}
 const total=n/2*(2*a+(n-1)*d);
 const reaches=Math.abs(total-target)<1;
 $("#customResult").classList.remove("hidden");
 $("#customResult").innerHTML=`<b>${reaches?"🟢 Pattern can exactly reach the target":"🟠 Pattern does not exactly reach the target yet."}</b><p>${n} saving steps → estimated total <strong>${money(total)}</strong> for target ${money(target)}.</p><p>Rule: <strong>aₙ = ${money(a)} + (n−1)(${money(d)})</strong></p><button class="proof-btn" onclick='openProof(${JSON.stringify({name:"My Custom Pattern",type:"arithmetic",a,d,n})})'>🔎 View induction proof</button>`;
}

function initQuickCalculator(){
 const target=$("#quickTarget"),steps=$("#quickSteps"),first=$("#quickFirst"),increase=$("#quickIncrease");
 if(!target)return;
 if(!target.dataset.ready){
  target.dataset.ready="1";
  $("#quickCalcBtn").onclick=runQuickCalculator;
  $("#quickResetBtn").onclick=()=>{target.value="";steps.value="10";first.value="";increase.value="";$("#quickCalcResult").innerHTML=`<div class="quick-empty"><span>🌱</span><div><b>Hasil perhitungan muncul di sini</b><p>Coba masukkan target lalu tekan <strong>Hitung Sekarang</strong>.</p></div></div>`};
  $("#quickProofBtn").onclick=()=>openProof({name:"Contoh Growing Saver",type:"arithmetic",a:100000,d:25000,n:10});
 }
}
function runQuickCalculator(){
 const target=parseNumeric($("#quickTarget").value),n=Math.floor(Number($("#quickSteps").value)),a=parseNumeric($("#quickFirst").value),d=parseNumeric($("#quickIncrease").value);
 if(!target||target<=0||!Number.isInteger(n)||n<1||a<0||d<0){toast("⚠️ Isi target, jumlah langkah, dan nominal dengan benar.");return}
 const total=n/2*(2*a+(n-1)*d);
 const average=total/n;
 const remaining=Math.max(target-total,0);
 const diff=total-target;
 const pct=Math.min(100,total/target*100);
 const reaches=diff>=-0.01;
 const formula=`Sₙ = ${n}/2 [2(${money(a)}) + (${n} − 1)(${money(d)})]`;
 $("#quickCalcResult").innerHTML=`<div class="quick-result-head"><div><span class="eyebrow">HASIL KALKULASI</span><h2>${reaches?"Pola sudah mencapai target 🎯":"Pola masih perlu disesuaikan 🌱"}</h2><p>Total dari pola yang kamu masukkan dibandingkan langsung dengan target.</p></div><div class="quick-result-percent">${pct.toFixed(0)}%</div></div>
 <div class="quick-stat-grid"><div><small>Total pola</small><strong>${money(total)}</strong></div><div><small>Rata-rata / langkah</small><strong>${money(average)}</strong></div><div><small>Target</small><strong>${money(target)}</strong></div><div><small>${reaches?"Kelebihan":"Kekurangan"}</small><strong>${money(Math.abs(diff))}</strong></div></div>
 <div class="quick-progress"><div class="quick-progress-label"><b>Progress terhadap target</b><span>${pct.toFixed(1)}%</span></div><div class="quick-track"><i style="width:${pct}%"></i></div></div>
 <div class="quick-proof-box"><span>RUMUS YANG DIGUNAKAN</span><b>${formula}</b><p>Dengan a = ${money(a)}, d = ${money(d)}, dan n = ${n}, jumlah seluruh setoran adalah <strong>${money(total)}</strong>.</p><button class="proof-btn" onclick='openProof(${JSON.stringify({name:"Pola Kalkulator Saya",type:"arithmetic",a,d,n})})'>🔎 Buka pembuktian induksi</button></div>`;
}
function renderGoals(){
 const list=$("#goalList");
 const count=$("#goalCount");
 const filtered=goals.filter(g=>{
   const saved=(g.saved||[]).reduce((a,x)=>a+x.amount,0);
   const done=saved>=g.target;
   return goalFilter==="all" || (goalFilter==="completed" ? done : !done);
 });

 if(count) count.textContent=`${filtered.length} target${filtered.length===1?"":""}`;
 $$(".goal-filter").forEach(btn=>btn.classList.toggle("active",btn.dataset.filter===goalFilter));

 if(!filtered.length){
   const emptyText=goalFilter==="completed"
     ? "Belum ada target yang selesai. Sedikit demi sedikit, Nemi temani sampai 100%!"
     : goalFilter==="active"
       ? "Belum ada target aktif. Yuk buat target pertamamu!"
       : "Belum ada target. Yuk mulai dari satu langkah kecil dulu!";
   list.innerHTML=`<div class="goal-empty" style="grid-column:1/-1">
     <div class="goal-empty-nami"><img src="assets/nami/${goalFilter==="completed"?"target-complete":"motivation"}.png" alt="Nemi"></div>
     <div class="goal-empty-copy"><span class="eyebrow">NEMI SAYS</span><h2>${goalFilter==="completed"?"Target selesai akan terasa seperti ini 🎉":"Setiap target dimulai dari satu langkah kecil."}</h2><p>${emptyText}</p><button class="btn primary" data-page="planner">＋ Buat Target</button></div>
   </div>`;
   list.querySelector('[data-page="planner"]').onclick=()=>page("planner");
   return;
 }

 list.innerHTML=filtered.map(g=>{
   const saved=(g.saved||[]).reduce((a,x)=>a+x.amount,0);
   const pct=Math.min(100,saved/g.target*100);
   const done=saved>=g.target;
   const p=g.plan||{};
   const nami=done?"target-complete":pct>=75?"motivation":"saving-money";
   const status=done?"Selesai":"Sedang berjalan";
   const remaining=Math.max(0,g.target-saved);
   return `<article class="goal-card goal-card-modern ${done?"is-complete":""}">
     <div class="goal-card-glow"></div>
     <div class="goal-top"><span class="goal-status ${done?"complete":"active"}">${done?"🏆 Target selesai":"🎯 Target aktif"}</span><span class="goal-step">${(g.saved||[]).length} langkah</span></div>
     <div class="goal-nami"><img src="assets/nami/${nami}.png" alt="Nemi — ${status}"></div>
     <h3>${g.name}</h3>
     <p class="goal-target-label">Target ${money(g.target)}</p>
     <div class="goal-money-row"><strong>${money(saved)}</strong><span>${pct.toFixed(0)}%</span></div>
     <div class="progress goal-progress"><i style="width:${pct}%"></i></div>
     <div class="goal-remaining">${done?"🎉 Target sudah tercapai!":`Masih kurang <b>${money(remaining)}</b>`}</div>
     <div class="goal-info-row"><span>📅 ${done?"Selesai":`Deadline ${fmtDate(dateOnly(g.end))}`}</span><span>✨ ${p.name||"Rencana"}</span></div>
     <button class="btn ${done?"goal-complete-btn":"primary"}" onclick='openGoal("${encodeURIComponent(g.name)}")'>${done?"Lihat perjalanan →":"Lanjutkan Target →"}</button>
   </article>`;
 }).join("");
}

$$('.goal-filter').forEach(btn=>{
 btn.onclick=()=>{goalFilter=btn.dataset.filter;renderGoals();};
});

function openGoal(encoded){const name=decodeURIComponent(encoded);const g=goals.find(x=>x.name===name);if(!g)return;const saved=g.saved||[];activePlan={...g.plan,name:g.name,target:g.target,start:g.start,end:g.end,saved,completed:saved.reduce((s,x)=>s+Number(x.amount||0),0)>=Number(g.target||0)};save();page("schedule")}
function renderSchedule(){
 const c=$("#scheduleContent"),b=$("#activeBadge");
 if(!activePlan){
   b.className="badge gray";b.textContent="No active plan";
   c.className="schedule-empty";c.innerHTML=`<div class="empty-icon">📅</div><h2>Belum ada jadwal aktif</h2><p>Pilih rencana dari Rencana Saya untuk mulai menabung.</p><button class="btn primary" data-page="planner">Buat Rencana</button>`;
   c.querySelector('[data-page="planner"]').onclick=()=>page("planner");
   $("#activityPanel").innerHTML="";return;
 }
 b.className="badge green";b.textContent=activePlan.completed?"🏆 Completed":"🟢 Aktif";
 const p=activePlan.plan||activePlan,start=new Date(activePlan.start),end=new Date(activePlan.end),dates=stepDates(start,end,p.frequency),saved=activePlan.saved||[];
 const totalSaved=saved.reduce((s,x)=>s+Number(x.amount||0),0),pct=Math.min(100,activePlan.target?totalSaved/activePlan.target*100:0);
 const next=dates.find(d=>!saved.some(x=>x.date===localDateKey(d)));
 const amountFor=(item)=>p.type==="constant"?p.a:p.a+dates.indexOf(item)*p.d;
 const nextPlanned=next?amountFor(next):0;
 const namiSrc=activePlan.completed?"target-complete":next?"saving-money":"motivation";
 const doneCount=saved.length;
 const changedCount=saved.filter(x=>Math.abs(Number(x.amount||0)-Number(x.planned||x.amount||0))>.01).length;
 const remaining=Math.max(0,Number(activePlan.target)-totalSaved);
 const rows=dates.map((d,i)=>{
   const key=localDateKey(d),sv=saved.find(x=>x.date===key),planned=amountFor(d);
   const changed=sv&&Math.abs(Number(sv.amount)-Number(sv.planned||planned))>.01;
   return `<div class="saving-row">
     <div class="step-num">${i+1}</div>
     <div class="saving-date"><b>${fmtDate(d)}</b><small>Rencana ${money(planned)}</small></div>
     <div class="saving-amount"><b>${sv?money(sv.amount):"—"}</b><small>${sv?"Aktual":"Belum"}</small></div>
     <div>${sv?`<span class="saving-status ${changed?"changed":"done"}">${changed?"Berubah":"✓ Selesai"}</span>`:`<button class="record-btn" onclick="openSaving('${key}',${planned})">Catat</button>`}</div>
   </div>`;
 }).join("");
 const claim=next&&!activePlan.completed?`<div class="claim-box-modern"><div class="claim-flex"><div><span class="eyebrow">NEXT STEP • NEMI'S PICK</span><h3>${money(nextPlanned)}</h3><p>${fmtDate(next)} · Step #${dates.indexOf(next)+1} · ${freqText(p.frequency)}</p></div><div class="claim-actions"><button class="save-now-btn" onclick="openSaving('${localDateKey(next)}',${nextPlanned})">💰 Saya sudah menabung</button></div></div></div>`:`<div class="claim-box-modern"><div class="claim-flex"><div><span class="eyebrow">${activePlan.completed?"TARGET SELESAI":"JADWAL SELESAI"}</span><h3>${activePlan.completed?"🎉 Hebat!":"Semua step selesai"}</h3><p>${activePlan.completed?"Kamu berhasil mencapai target tabunganmu.":"Semua jadwal sudah dicatat."}</p></div></div></div>`;
 c.className="";
 c.innerHTML=`<div class="schedule-wrap">
   <div class="schedule-main-card">
     <div class="schedule-hero-row"><div><span class="eyebrow">ACTIVE SCHEDULE</span><h2>${activePlan.name}</h2><p>${fmtDate(start)} — ${fmtDate(end)} · ${freqText(p.frequency)}</p></div><div class="schedule-nami-mini"><img src="assets/nami/${namiSrc}.png" alt="Nemi"></div></div>
     <div class="schedule-progress-strip"><div><small>Progress target</small><div class="progress-track"><i style="width:${pct}%"></i></div></div><strong>${pct.toFixed(0)}%</strong></div>
     ${claim}
     <div class="schedule-list"><div class="schedule-list-head"><h3>Jadwal Menabung</h3><span>${doneCount}/${dates.length} selesai${changedCount?` · ${changedCount} berubah`:""}</span></div>${rows}</div>
   </div>
   <div>
     <div class="schedule-side-card"><span class="eyebrow">SAVING PROGRESS</span><div class="side-stat"><small>Total terkumpul</small><strong>${money(totalSaved)}</strong></div><div class="side-stat"><small>Sisa target</small><strong>${money(remaining)}</strong></div><div class="side-stat"><small>Target</small><strong>${money(activePlan.target)}</strong></div><div class="side-stat"><small>Step selesai</small><strong>${doneCount} / ${dates.length}</strong></div><div class="side-stat"><small>Pola</small><strong>${p.name||activePlan.name}</strong></div></div>
     <div class="nami-schedule-card"><img src="assets/nami/${namiSrc}.png" alt="Nemi"><div><b>${activePlan.completed?"Target tercapai! 🎉":next?"Yuk, satu langkah lagi!":"Jadwalmu sudah beres."}</b><p>${activePlan.completed?"Nemi bangga melihat progress kamu.":next?"Konsisten sedikit demi sedikit sampai target tercapai.":"Cek riwayat tabunganmu di bawah."}</p></div></div>
     <div class="proof-mini" style="margin-top:15px"><span class="eyebrow">MATHEMATICS</span><b>✓ Pola tetap mengikuti perhitungan N-STEP</b><button onclick='openProof(${JSON.stringify(p)})'>Lihat proof →</button></div>
     <button class="btn ghost wide" style="margin-top:10px" onclick="deleteGoal()">🗑 Hapus target ini</button>
   </div>
 </div>`;
 renderActivity(saved);
}
function openSaving(dateKey,planned){
 const modal=$("#modal"),box=$("#modalContent");
 box.innerHTML=`<div class="saving-modal-card"><div class="saving-modal-nami"><img src="assets/nami/saving-money.png" alt="Nemi menabung"></div><span class="eyebrow">CATAT TABUNGAN</span><h2>${money(planned)}</h2><p>${fmtDate(dateOnly(dateKey))} · Masukkan nominal yang benar-benar kamu tabung.</p><div class="saving-form"><label>Nominal aktual (Rp)</label><input id="savingActual" type="text" inputmode="numeric" data-money-input min="0" value="${Math.round(planned).toLocaleString("id-ID")}" autofocus></div><div class="saving-modal-actions"><button class="btn ghost" id="cancelSaving">Batal</button><button class="btn primary" id="confirmSaving">💰 Simpan</button></div></div>`;
 modal.classList.add("show");
 $("#cancelSaving").onclick=()=>modal.classList.remove("show");
 $("#confirmSaving").onclick=()=>{const actual=parseNumeric($("#savingActual").value);if(!Number.isFinite(actual)||actual<=0){toast("⚠️ Masukkan nominal tabungan yang valid.");return}modal.classList.remove("show");recordAmountForDate(dateKey,actual)};
 setTimeout(()=>$("#savingActual")?.focus(),50);
}
function renderActivity(saved){
 const panel=$("#activityPanel");
 if(!saved.length){panel.innerHTML=`<div class="activity-card"><span class="eyebrow">SAVING HISTORY</span><h3>No saving recorded yet</h3><p class="muted">When you claim a saving, its date and actual amount will stay here.</p></div>`;return}
 panel.innerHTML=`<div class="activity-card"><span class="eyebrow">SAVING HISTORY</span><h3>Your recorded savings</h3><div class="activity-list">${saved.slice().reverse().map(x=>`<div class="activity-item"><span>📅 ${fmtDate(dateOnly(x.date))}</span><span>Planned ${money(x.planned||x.amount)}</span><b>+ ${money(x.amount)}</b></div>`).join("")}</div></div>`;
}
function recordNext(){
 if(!activePlan)return;
 const p=activePlan.plan,start=new Date(activePlan.start),end=new Date(activePlan.end),dates=stepDates(start,end,p.frequency),saved=activePlan.saved||[],next=dates.find(d=>!saved.some(x=>x.date===localDateKey(d)));
 if(!next)return;
 const planned=p.type==="constant"?p.a:p.a+dates.indexOf(next)*p.d;
 claimSaving(localDateKey(next),planned);
}
$("#calculateBtn").onclick=calc;
$("#customAnalyze").onclick=analyzeCustom;
$$('input[name="freqChoice"]').forEach(r=>r.addEventListener("change",()=>{ $("#frequency").value=r.value; }));
$("#closeModal").onclick=()=>$("#modal").classList.remove("show");$("#modal").onclick=e=>{if(e.target.id==="modal")$("#modal").classList.remove("show")};

function updateUserUI(){
  $("#userName").textContent=currentUser||"User";
  const greeting=$("#dashUserGreeting"); if(greeting) greeting.textContent=currentUser||"kamu";
  const topGreeting=$("#topUserGreeting"); if(topGreeting) topGreeting.textContent=currentUser||"kamu";
  $("#dropUserName").textContent=currentUser||"User";
  $("#userAvatar").textContent=(currentUser||"U").charAt(0).toUpperCase();
}

function calcBestStreak(){
 const dates=[...new Set(goals.flatMap(g=>(g.saved||[]).map(x=>x.date)).filter(Boolean))].sort();
 if(!dates.length)return 0;
 let best=1,run=1;
 for(let i=1;i<dates.length;i++){
   const a=dateOnly(dates[i-1]),b=dateOnly(dates[i]);
   if(dateDiff(a,b)===1){run++;best=Math.max(best,run)}else run=1;
 }
 return best;
}
function renderReports(){
 const allSavings=goals.flatMap(g=>(g.saved||[]).map(x=>({...x,goal:g.name})));
 const total=allSavings.reduce((s,x)=>s+Number(x.amount||0),0);
 const active=goals.filter(g=>{const saved=(g.saved||[]).reduce((s,x)=>s+Number(x.amount||0),0);return saved<Number(g.target||0)});
 const completed=goals.filter(g=>{const saved=(g.saved||[]).reduce((s,x)=>s+Number(x.amount||0),0);return saved>=Number(g.target||0)});
 const totalTarget=goals.reduce((s,g)=>s+Number(g.target||0),0);
 const overallPct=totalTarget?Math.min(100,total/totalTarget*100):0;
 const el=(id)=>document.getElementById(id);
 el('reportTotal').textContent=money(total);
 el('reportActive').textContent=active.length;
 el('reportCompleted').textContent=completed.length;
 el('reportStreak').textContent=calcBestStreak()+' Hari';
 el('reportOverallPct').textContent=overallPct.toFixed(0)+'%';
 el('reportTotalHint').textContent=allSavings.length?`${allSavings.length} catatan tabungan tercatat`:'Belum ada tabungan tercatat';
 const progress=el('reportGoalProgress');
 if(!goals.length){progress.innerHTML=`<div class="report-empty"><div>🌱</div><b>Belum ada target</b><p>Buat target dan mulai menabung untuk melihat laporanmu.</p><button class="btn primary" data-page="planner">＋ Buat Target</button></div>`}
 else progress.innerHTML=goals.slice().sort((a,b)=>Number((b.saved||[]).reduce((s,x)=>s+x.amount,0))-Number((a.saved||[]).reduce((s,x)=>s+x.amount,0))).map(g=>{
   const saved=(g.saved||[]).reduce((s,x)=>s+Number(x.amount||0),0),pct=g.target?Math.min(100,saved/g.target*100):0;
   return `<div class="report-goal-row"><div class="report-goal-title"><b>${g.name}</b><span>${pct.toFixed(0)}%</span></div><div class="report-progress"><i style="width:${pct}%"></i></div><small>${money(saved)} dari ${money(g.target)} · ${saved>=g.target?'🏆 Selesai':'Masih berjalan'}</small></div>`;
 }).join('');
 const bars=el('reportBars');
 if(!goals.length){bars.innerHTML='<div class="report-empty compact"><div>📊</div><p>Data akan muncul setelah kamu memiliki target.</p></div>'}
 else bars.innerHTML=goals.slice(0,6).map(g=>{
   const planned=(g.plan?.type==='constant'?Number(g.plan.a||0)*Number(g.plan.n||0):g.plan?Number(g.plan.n||0)/2*(2*Number(g.plan.a||0)+(Number(g.plan.n||0)-1)*Number(g.plan.d||0)):Number(g.target||0));
   const actual=(g.saved||[]).reduce((s,x)=>s+Number(x.amount||0),0),max=Math.max(planned,actual,1),pw=planned/max*100,aw=actual/max*100;
   return `<div class="bar-group"><div class="bar-label"><b>${g.name}</b><span>Rencana ${money(planned)} · Aktual ${money(actual)}</span></div><div class="bar-track"><i class="bar-planned" style="width:${pw}%"></i><i class="bar-actual" style="width:${aw}%"></i></div><div class="bar-legend"><span><i></i> Rencana</span><span><i></i> Aktual</span></div></div>`;
 }).join('');
 const history=el('reportHistory');
 if(!allSavings.length) history.innerHTML=`<div class="report-empty compact"><div>💰</div><b>Belum ada riwayat</b><p>Setelah kamu mencatat tabungan di Jadwal, riwayatnya akan muncul di sini.</p></div>`;
 else history.innerHTML=allSavings.sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,12).map(x=>`<div class="report-history-item"><div class="history-date">📅<span>${fmtDate(dateOnly(x.date))}</span></div><div class="history-goal"><b>${x.goal}</b><small>Rencana ${money(x.planned||x.amount)}</small></div><strong>+ ${money(x.amount)}</strong></div>`).join('');
 $$('[data-page="planner"]').forEach(b=>b.onclick=()=>page('planner'));
}
function renderDarkWeb(){
 const checklist=[
  {title:"Password unik",text:"Gunakan password berbeda untuk akun penting.",ok:true},
  {title:"Verifikasi dua langkah",text:"Aktifkan 2FA pada email dan akun finansial.",ok:true},
  {title:"OTP tetap rahasia",text:"Jangan pernah memberikan OTP kepada orang lain.",ok:true},
  {title:"Email & nomor aktif",text:"Pastikan informasi pemulihan akun masih bisa diakses.",ok:true}
 ];
 const list=$("#securityChecklist"); if(!list)return;
 list.innerHTML=checklist.map(x=>`<div class="security-check-item"><span>${x.ok?'✓':'!'}</span><div><b>${x.title}</b><small>${x.text}</small></div></div>`).join('');
 const title=$("#securityStatusTitle"), textEl=$("#securityStatusText"), badge=$("#securityStatusBadge"), icon=$("#securityStatusIcon"), last=$("#securityLastScan");
 if(security.lastScan){
   title.textContent=security.score>=90?'Keamanan baik':'Perlu perhatian';
   textEl.textContent=security.score>=90?'Tidak ada indikasi masalah pada checklist lokal N-STEP. Tetap jaga kebiasaan keamananmu.':'Beberapa kebiasaan keamanan perlu diperhatikan kembali.';
   badge.textContent=security.score>=90?'AMAN':'PERLU PERHATIAN'; badge.className='security-badge '+(security.score>=90?'safe':'warn');
   icon.textContent=security.score>=90?'🛡️':'⚠️';
   last.textContent='Terakhir diperiksa '+new Date(security.lastScan).toLocaleString('id-ID',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
 } else {
   title.textContent='Belum diperiksa'; textEl.textContent='Jalankan pemeriksaan untuk melihat ringkasan keamanan lokal akun N-STEP.'; badge.textContent='BELUM DIPERIKSA'; badge.className='security-badge neutral'; icon.textContent='🛡️'; last.textContent='Belum diperiksa';
 }
 const btn=$("#runSecurityScan"); if(btn&&!btn.dataset.ready){btn.dataset.ready='1';btn.onclick=()=>{btn.disabled=true;btn.textContent='⏳ Memeriksa...';setTimeout(()=>{security.lastScan=new Date().toISOString();security.score=100;save();renderDarkWeb();btn.disabled=false;btn.textContent='🛡 Jalankan Pemeriksaan';toast('🛡 Pemeriksaan keamanan selesai.');},700);};}
}
function renderHeirs(){
 const bList=$("#beneficiaryList"), aList=$("#assetList"); if(!bList||!aList)return;
 const totalPct=heirs.beneficiaries.reduce((s,x)=>s+Number(x.percent||0),0);
 $("#heirCount").textContent=heirs.beneficiaries.length+" penerima";
 $("#assetCount").textContent=heirs.assets.length+" aset";
 $("#heirPercent").textContent=totalPct+"%";
 $("#heirPercentNote").textContent=totalPct===100?"Pembagian sudah 100%.":totalPct<100?"Masih ada "+(100-totalPct)+"% yang belum dibagi.":"Pembagian melebihi 100%. Periksa kembali.";
 bList.innerHTML=heirs.beneficiaries.length?heirs.beneficiaries.map((x,i)=>`<div class="heir-item"><div class="heir-avatar">${(x.name||"P").charAt(0).toUpperCase()}</div><div class="heir-info"><b>${escapeHtml(x.name)}</b><small>${escapeHtml(x.relation)} · ${escapeHtml(x.contact||"Kontak belum diisi")}</small></div><strong>${Number(x.percent||0)}%</strong><button class="icon-delete" onclick="removeBeneficiary(${i})" aria-label="Hapus penerima">×</button></div>`).join(""):`<div class="heir-empty"><span>👨‍👩‍👧‍👦</span><b>Belum ada penerima</b><p>Tambahkan orang yang kamu percaya sebagai penerima manfaat.</p></div>`;
 aList.innerHTML=heirs.assets.length?heirs.assets.map((x,i)=>`<div class="asset-item"><div class="asset-icon">${x.type==='Tabungan'?'💰':x.type==='Target'?'🎯':'📦'}</div><div class="asset-info"><b>${escapeHtml(x.name)}</b><small>${escapeHtml(x.type)} · ${money(Number(x.value||0))}</small></div><button class="icon-delete" onclick="removeAsset(${i})" aria-label="Hapus aset">×</button></div>`).join(""):`<div class="heir-empty compact"><span>📦</span><b>Belum ada aset</b><p>Catat aset yang ingin kamu masukkan ke rencana.</p></div>`;
 const addB=$("#addBeneficiaryBtn"); if(addB&&!addB.dataset.ready){addB.dataset.ready="1";addB.onclick=()=>{const name=$("#beneficiaryName").value.trim(),relation=$("#beneficiaryRelation").value.trim(),contact=$("#beneficiaryContact").value.trim(),percent=parseNumeric($("#beneficiaryPercent").value);if(!name||!relation||!Number.isFinite(percent)||percent<=0){toast("⚠️ Lengkapi nama, hubungan, dan persentase.");return}const next=totalPct+percent;if(next>100){toast("⚠️ Total pembagian tidak boleh lebih dari 100%.");return}heirs.beneficiaries.push({name,relation,contact,percent});save();["beneficiaryName","beneficiaryRelation","beneficiaryContact","beneficiaryPercent"].forEach(id=>$("#"+id).value="");renderHeirs();toast("💜 Penerima manfaat ditambahkan.")};}
 const addA=$("#addAssetBtn"); if(addA&&!addA.dataset.ready){addA.dataset.ready="1";addA.onclick=()=>{const name=$("#assetName").value.trim(),type=$("#assetType").value,value=parseNumeric($("#assetValue").value);if(!name||!Number.isFinite(value)||value<0){toast("⚠️ Isi nama aset dan nilai aset.");return}heirs.assets.push({name,type,value});save();["assetName","assetValue"].forEach(id=>$("#"+id).value="");renderHeirs();toast("📦 Aset berhasil dicatat.")};}
}
function escapeHtml(v){return String(v??"").replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function removeBeneficiary(i){heirs.beneficiaries.splice(i,1);save();renderHeirs();toast("Penerima dihapus.");}
function removeAsset(i){heirs.assets.splice(i,1);save();renderHeirs();toast("Aset dihapus.");}
function renderDashboard(){
  const active=goals.filter(g=>{const saved=(g.saved||[]).reduce((a,x)=>a+x.amount,0);return saved<g.target;});
  const allSaved=goals.reduce((sum,g)=>sum+(g.saved||[]).reduce((a,x)=>a+x.amount,0),0);
  const target=goals.length?goals.reduce((sum,g)=>sum+Number(g.target||0),0):5000000;
  const pct=target?Math.min(100,allSaved/target*100):0;
  const plans=goals.filter(g=>g.plan).length;
  const savedText=money(allSaved), targetText=money(target);
  ["#dashSaved","#dashSavedMini"].forEach(sel=>{const el=$(sel);if(el)el.textContent=savedText;});
  ["#dashGoals","#dashGoalsMini"].forEach(sel=>{const el=$(sel);if(el)el.textContent=active.length;});
  ["#dashProof","#dashProofMini"].forEach(sel=>{const el=$(sel);if(el)el.textContent=plans+(sel.includes("Mini")?" Plan":" Plan");});
  ["#dashStreak","#dashStreakMini"].forEach(sel=>{const el=$(sel);if(el)el.textContent=calcBestStreak()+" Hari";});
  const line=$("#dashTargetLine");if(line)line.textContent=`dari target ${targetText}`;
  const pctEl=$("#dashPercent");if(pctEl)pctEl.textContent=`${pct.toFixed(0)}%`;
  const bar=$("#dashProgressBar");if(bar)bar.style.width=`${pct}%`;
  const ring=$(".ring");if(ring)ring.style.background=`conic-gradient(#6d7ae8 ${pct*3.6}deg,#e6e9f7 0deg)`;
}
function showCelebrate(name,total){
  $("#celebrateText").textContent=`Hebat! Kamu berhasil menyelesaikan "${name}".`;
  $("#celebrateTotal").textContent=money(total)+" terkumpul 🎉";
  $("#celebrate").classList.add("show");
}
function maybeComplete(){
  if(!activePlan)return false;
  const saved=(activePlan.saved||[]).reduce((s,x)=>s+x.amount,0);
  if(saved>=activePlan.target && !activePlan.completed){
    activePlan.completed=true; save();
    const g=goals.find(x=>x.name===activePlan.name); if(g){g.completed=true;g.saved=activePlan.saved;save();}
    setTimeout(()=>showCelebrate(activePlan.name,saved),120);
    return true;
  }
  return false;
}
function recordAmountForDate(dateKey,actual){
  const p=activePlan.plan, start=new Date(activePlan.start),end=new Date(activePlan.end);
  const dates=stepDates(start,end,p.frequency);
  const idx=dates.findIndex(d=>localDateKey(d)===dateKey);
  const planned=p.type==="constant"?p.a:p.a+idx*p.d;
  if(!activePlan.saved)activePlan.saved=[];
  const existing=activePlan.saved.find(x=>x.date===dateKey);
  if(existing){ existing.amount=actual; existing.planned=planned; }
  else activePlan.saved.push({date:dateKey,amount:actual,planned});
  const g=goals.find(x=>x.name===activePlan.name);
  if(g)g.saved=activePlan.saved;
  save();
  const changed=Math.abs(actual-planned)>0.01;
  const completedNow=maybeComplete();
  if(completedNow){ toast("🏆 Target tercapai! Nemi ikut merayakan!"); }
  else { toast(changed?"⚠️ Nominal aktual berbeda dari rencana, tapi tetap tercatat.":"💚 Saving berhasil dicatat!"); }
  renderSchedule(); renderGoals(); updateUserUI();
}
function claimSaving(dateKey,planned){ openSaving(dateKey,planned); }
function deleteGoal(){
  if(!activePlan)return;
  if(!confirm(`Hapus target "${activePlan.name}"? Data target ini akan dihapus dari pengguna saat ini.`))return;
  goals=goals.filter(g=>g.name!==activePlan.name); activePlan=null; save(); toast("Target dihapus."); page("goals"); updateUserUI();
}
function renderSettings(){const n=$("#settingsName");if(n)n.value=currentUser;}
function setupEnhancements(){
 $$('[data-money-input]').forEach(el=>{
   formatThousandsInput(el);
   el.addEventListener('input',()=>formatThousandsInput(el));
   el.addEventListener('focus',()=>el.select());
 });
 $$('[data-percent-input]').forEach(el=>{
   el.addEventListener('input',()=>{el.value=String(el.value).replace(/[^0-9]/g,'').slice(0,3);if(Number(el.value)>100)el.value='100';});
 });
 const saveName=$("#saveSettingsName");
 if(saveName)saveName.onclick=()=>{
   const n=$("#settingsName").value.trim();
   if(!n){toast('Masukkan nama pengguna dulu.');return;}
   const old=currentUser;
   currentUser=n;
   if(old!==n){
     users[n]=users[old]||{goals:[],activePlan:null,heirs:{beneficiaries:[],assets:[]},security:{lastScan:null,score:null}};
     if(old&&old!==n)delete users[old];
     loadUserData();
   }
   persistUserData();updateUserUI();renderDashboard();renderGoals();renderHeirs();toast('👤 Nama pengguna diperbarui.');
 };
 const logout=$("#settingsLogout");if(logout)logout.onclick=()=>$("#logoutBtn").click();
 setupSearch();
}

function setupSearch(){
 const input=$("#topSearchInput"),box=$("#searchResults"); if(!input||!box)return;
 const pages=[
  ["Beranda","dashboard"],["Target Saya","goals"],["Rencana Saya","planner"],["Jadwal","schedule"],["Laporan","reports"],["Kalkulator","calculator"],["Ahli Waris","heirs"],["Dark Web","darkweb"],["Pengaturan","settings"]
 ];
 const show=(q)=>{
  q=q.trim().toLowerCase();
  if(!q){box.classList.remove('show');box.innerHTML='';return;}
  const matches=pages.filter(x=>x[0].toLowerCase().includes(q));
  const goalsMatch=goals.filter(g=>String(g.name||'').toLowerCase().includes(q)).slice(0,4);
  box.innerHTML=[...matches.map(x=>`<button class="search-result" data-search-page="${x[1]}"><span>⌕</span><div><b>${x[0]}</b><small>Buka halaman</small></div></button>`),...goalsMatch.map(g=>`<button class="search-result" data-search-page="goals"><span>🎯</span><div><b>${escapeHtml(g.name)}</b><small>Target saya</small></div></button>`)].join('') || `<div class="search-no-result">Tidak ditemukan. Coba kata kunci lain.</div>`;
  box.classList.add('show');
  box.querySelectorAll('[data-search-page]').forEach(b=>b.onclick=()=>{page(b.dataset.searchPage);input.value='';box.classList.remove('show');});
 };
 input.addEventListener('input',()=>show(input.value));
 input.addEventListener('keydown',e=>{if(e.key==='Enter'){const first=box.querySelector('.search-result');if(first)first.click();else toast('🔎 Tidak ada hasil yang cocok.');}});
 document.addEventListener('click',e=>{if(!e.target.closest('#topSearch'))box.classList.remove('show');});
}

async function passwordHash(password,name){
  const data=new TextEncoder().encode(String(name).trim().toLowerCase()+"::nstep::"+String(password));
  const digest=await crypto.subtle.digest("SHA-256",data);
  return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
function showAuthMessage(text,ok=false){const n=$("#passwordNote");if(!n)return;n.textContent=text;n.style.color=ok?"#2d986c":"#9a9fac";}
function clearLoginForm(){const p=$("#loginPassword");if(p)p.value="";const n=$("#loginName");if(n)n.value="";showAuthMessage("Pengguna baru akan membuat password saat pertama kali masuk. Password disimpan dalam bentuk hash di browser ini.");}
function init(){updateUserUI(); if(!currentUser){$("#authScreen").classList.remove("hidden")}else{$("#authScreen").classList.add("hidden")} const s=new Date();s.setDate(s.getDate()+1);const e=new Date(s);e.setDate(e.getDate()+9);$("#startDate").value=localDateKey(s);$("#deadline").value=localDateKey(e);$("#dashGoals").textContent=goals.length;$("#dashSaved").textContent=money(goals.reduce((sum,g)=>sum+(g.saved||[]).reduce((a,x)=>a+Number(x.amount||0),0),0));$("#dashProof").textContent=goals.filter(g=>g.plan).length;renderGoals();renderHeirs()}
$("#loginBtn").onclick=async()=>{
 const name=$("#loginName").value.trim();
 const password=$("#loginPassword").value;
 if(!name){toast("Masukkan nama pengguna dulu.");$("#loginName").focus();return}
 if(password.length<6){showAuthMessage("Password minimal 6 karakter.");toast("🔐 Password minimal 6 karakter.");$("#loginPassword").focus();return}
 const existing=users[name];
 const hash=await passwordHash(password,name);
 if(existing?.passwordHash && existing.passwordHash!==hash){showAuthMessage("Password salah. Coba lagi.");toast("❌ Password salah.");$("#loginPassword").select();return}
 currentUser=name;
 if(!users[name]) users[name]={goals:[],activePlan:null,heirs:{beneficiaries:[],assets:[]},security:{lastScan:null,score:null},passwordHash:hash};
 else if(!users[name].passwordHash) users[name].passwordHash=hash;
 sessionStorage.setItem("nstep_session_user",currentUser);
 loadUserData(); persistUserData();
 $("#authScreen").classList.add("hidden");
 updateUserUI(); renderDashboard(); renderGoals();
 toast(existing?.passwordHash?"👋 Selamat datang kembali, "+name+"!":"🔐 Password berhasil dibuat. Selamat datang, "+name+"!");
};
$("#loginName").addEventListener("keydown",e=>{if(e.key==="Enter")$("#loginPassword").focus()});
$("#loginPassword").addEventListener("keydown",e=>{if(e.key==="Enter")$("#loginBtn").click()});
$("#passwordToggle").onclick=()=>{const p=$("#loginPassword");if(!p)return;p.type=p.type==="password"?"text":"password";$("#passwordToggle").textContent=p.type==="password"?"👁":"🙈"};
$("#sidebarToggle").onclick=()=>{const collapsed=document.body.classList.toggle("sidebar-collapsed");$("#sidebarToggle").setAttribute("aria-expanded",String(!collapsed));localStorage.setItem("nstep_sidebar_collapsed",collapsed?"1":"0")};
if(localStorage.getItem("nstep_sidebar_collapsed")==="1"){document.body.classList.add("sidebar-collapsed");$("#sidebarToggle").setAttribute("aria-expanded","false")};
$("#userChip").onclick=()=>$("#userDropdown").classList.toggle("show");
document.addEventListener("click",e=>{if(!e.target.closest(".user-menu"))$("#userDropdown").classList.remove("show")});
$("#logoutBtn").onclick=()=>{currentUser="";sessionStorage.removeItem("nstep_session_user");$("#userDropdown").classList.remove("show");$("#authScreen").classList.remove("hidden");clearLoginForm();toast("Kamu sudah keluar.")};
$("#switchUser").onclick=()=>{$("#userDropdown").classList.remove("show");currentUser="";sessionStorage.removeItem("nstep_session_user");$("#authScreen").classList.remove("hidden");clearLoginForm()};
$("#closeCelebrate").onclick=()=>$("#celebrate").classList.remove("show");
init();
setupEnhancements();
const initialFreq=$('input[name="freqChoice"]:checked'); if(initialFreq) $("#frequency").value=initialFreq.value;

try{renderDashboard();updateUserUI();}catch(e){}
