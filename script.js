const SK='sleep-history-v2';
const AK='active-sleep-session-v2';
const CYCLE=90,LATENCY=14,IDEAL=8;
let chart=null,timerInterval=null;
const toastEl=document.getElementById('toast');
const tooltipEl=document.getElementById('metricTooltip');
function sGet(k){try{return JSON.parse(localStorage.getItem(k))}catch{return null}}
function sSet(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}}
function sDel(k){try{localStorage.removeItem(k)}catch{}}
function showToast(msg){
  toastEl.textContent=msg;
  toastEl.classList.add('show');
  setTimeout(()=>toastEl.classList.remove('show'),2800);
}
function fmtTime(d){return d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
function fmtDur(min){return`${Math.floor(min/60)}h ${String(min%60).padStart(2,'0')}m`}
function fmtDate(d){return d.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'short'})}
function showScreen(id,btn){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if(btn)btn.classList.add('active');
}
function goToSleep(){showScreen('sleepScreen',document.querySelectorAll('.nav-btn')[0])}
function getMoodValue(m){return{Excelente:4,Bom:3,Cansado:2,Péssimo:1}[m]||1}
function moodDotClass(m){return{Excelente:'ok',Bom:'',Cansado:'warn',Péssimo:'err'}[m]||''}
function moodColor(m){return{Excelente:'var(--ok)',Bom:'var(--accent)',Cansado:'var(--warn)',Péssimo:'var(--err)'}[m]||'var(--t2)'}
function moodIcon(m,size=16){
  const col=moodColor(m);
  const icons={
    Excelente:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${col}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`,
    Bom:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${col}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 1 4 1 4-1 4-1"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`,
    Cansado:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${col}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 15h8"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`,
    Péssimo:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${col}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`
  };
  return icons[m]||icons['Bom'];
}
function renderHomeBanners(){
  const session=sGet(AK);
  const banner=document.getElementById('activeBanner');
  const bannerTime=document.getElementById('bannerTime');
  if(session){
    banner.classList.remove('hidden');
    bannerTime.textContent=`Dormindo desde ${fmtTime(new Date(session.sleepStartedAt))}`;
  } else {
    banner.classList.add('hidden');
  }
  const history=sGet(SK)||[];
  const card=document.getElementById('lastNightCard');
  if(history.length>0){
    const last=history[history.length-1];
    document.getElementById('lastNightMood').innerHTML=`${moodIcon(last.mood)} <span style="color:${moodColor(last.mood)};font-size:12px">${last.mood}</span>`;
    document.getElementById('lnDuration').textContent=`${last.totalSleepHours}h`;
    document.getElementById('lnCycles').textContent=last.cyclesCompleted;
    document.getElementById('lnRecovery').textContent=`${last.recoveryScore}%`;
    card.classList.remove('hidden');
  } else {
    card.classList.add('hidden');
  }
}
function resultRow(time,cycles,rec){
  const hours=(cycles*1.5).toFixed(1);
  return`<div class="result-row">
    <div>
      ${rec?'<span class="rec-badge">Recomendado</span><br>':''}
      <span class="result-time">${time}</span>
      <div class="result-meta">${cycles} ciclos &middot; ${hours}h de sono</div>
    </div>
    <button class="btn btn-ok btn-sm" onclick="startSleep('${time}',${cycles})">Dormir</button>
  </div>`;
}
function showResults(el,html){
  el.innerHTML=html;
  el.style.display='grid';
  requestAnimationFrame(()=>el.classList.add('visible'));
}
document.getElementById('sleepNowBtn').addEventListener('click',()=>{
  const el=document.getElementById('sleepNowResults');
  el.classList.remove('visible');
  const now=new Date();
  now.setMinutes(now.getMinutes()+LATENCY);
  let html='';
  [4,5,6].forEach(c=>{const w=new Date(now);w.setMinutes(w.getMinutes()+c*CYCLE);html+=resultRow(fmtTime(w),c,c===6)});
  showResults(el,html);
  setTimeout(()=>el.scrollIntoView({behavior:'smooth',block:'nearest'}),50);
});
document.getElementById('calculateSleepBtn').addEventListener('click',()=>{
  const val=document.getElementById('wakeTimeInput').value;
  if(!val){
    const inp=document.getElementById('wakeTimeInput');
    inp.classList.add('error');
    setTimeout(()=>inp.classList.remove('error'),600);
    showToast('Informe o horário de despertar');
    return;
  }
  const el=document.getElementById('sleepTimeResults');
  el.classList.remove('visible');
  const[h,m]=val.split(':');
  const wake=new Date();
  wake.setHours(Number(h),Number(m),0,0);
  if(wake<=new Date())wake.setDate(wake.getDate()+1);
  let html='';
  [6,5,4].forEach(c=>{const s=new Date(wake);s.setMinutes(s.getMinutes()-c*CYCLE-LATENCY);html+=resultRow(fmtTime(s),c,c===6)});
  showResults(el,html);
  setTimeout(()=>el.scrollIntoView({behavior:'smooth',block:'nearest'}),50);
});
function startSleep(time,cycles){
  sSet(AK,{sleepStartedAt:new Date().toISOString(),plannedWakeTime:time,cycles});
  loadSession();
  renderHomeBanners();
  showScreen('sleepScreen',document.querySelectorAll('.nav-btn')[0]);
}
function loadSession(){
  const s=sGet(AK);
  if(!s)return;
  const start=new Date(s.sleepStartedAt);
  document.getElementById('sleepStartedAt').textContent=fmtTime(start);
  document.getElementById('plannedWakeTime').textContent=s.plannedWakeTime;
  document.getElementById('sessionDate').textContent=fmtDate(start);
  startTimer(start);
}
function startTimer(from){
  if(timerInterval)clearInterval(timerInterval);
  const tick=()=>{
    const elapsed=Math.max(0,Math.round((Date.now()-from)/60000));
    document.getElementById('liveTimer').textContent=fmtDur(elapsed);
  };
  tick();
  timerInterval=setInterval(tick,30000);
}
document.getElementById('wakeUpBtn').addEventListener('click',()=>{
  document.getElementById('reviewSection').classList.remove('hidden');
  document.getElementById('wakeUpBtn').classList.add('hidden');
  document.getElementById('cancelSession').classList.add('hidden');
});
document.getElementById('cancelSession').addEventListener('click',()=>{
  if(!confirm('Cancelar a sessão de sono atual?'))return;
  sDel(AK);
  if(timerInterval){clearInterval(timerInterval);timerInterval=null}
  renderHomeBanners();
  showScreen('homeScreen',document.querySelectorAll('.nav-btn')[0]);
  showToast('Sessão cancelada');
});
document.querySelectorAll('.mood-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.mood-btn').forEach(b=>b.classList.remove('selected'));
    btn.classList.add('selected');
    setTimeout(()=>saveSleep(btn.dataset.mood),300);
  });
});
function buildRecord(sleepStart,wakeTime,plannedCycles,mood){
  const totalMin=Math.max(0,Math.round((wakeTime-sleepStart)/60000));
  const totalH=Number((totalMin/60).toFixed(1));
  const cycles=Math.round(totalMin/CYCLE);
  const startH=sleepStart.getHours();
  const sleptBeforeMidnight=startH>=20&&startH<=23;
  const debt=Math.max(0,IDEAL-totalH);
  const eff=Math.min(100,Math.round((totalMin/((plannedCycles||cycles)*90))*100));
  const recovery=Math.min(100,Math.round(eff*.4+(getMoodValue(mood)*25)*.3+(Math.min(totalH,8)/8*100)*.3));
  return{
    mood,value:getMoodValue(mood),
    date:wakeTime.toLocaleDateString('pt-BR'),
    weekday:wakeTime.toLocaleDateString('pt-BR',{weekday:'long'}),
    sleepStartedAt:fmtTime(sleepStart),
    plannedWakeTime:fmtTime(wakeTime),
    actualWakeTime:fmtTime(wakeTime),
    totalSleepMinutes:totalMin,totalSleepHours:totalH,
    cyclesCompleted:cycles,sleptBeforeMidnight,
    sleepDebt:debt,efficiency:eff,recoveryScore:recovery,
    createdAt:Date.now()
  };
}
function saveSleep(mood){
  const s=sGet(AK);
  if(!s)return;
  const now=new Date();
  const start=new Date(s.sleepStartedAt);
  const record=buildRecord(start,now,s.cycles,mood);
  const history=sGet(SK)||[];
  history.push(record);
  const saved=sSet(SK,history);
  sDel(AK);
  if(timerInterval){clearInterval(timerInterval);timerInterval=null}
  showToast(saved?'Sono registrado':'Erro ao salvar — modo privado?');
  renderHistory();
  loadAnalytics();
  renderHomeBanners();
  document.getElementById('reviewSection').classList.add('hidden');
  document.getElementById('cancelSession').classList.remove('hidden');
  document.getElementById('wakeUpBtn').classList.remove('hidden');
  document.querySelectorAll('.mood-btn').forEach(b=>b.classList.remove('selected'));
  showScreen('homeScreen',document.querySelectorAll('.nav-btn')[0]);
}
function openManualLog(){document.getElementById('manualModal').classList.add('open')}
function closeManualLog(){document.getElementById('manualModal').classList.remove('open')}
document.getElementById('manualModal').addEventListener('click',e=>{
  if(e.target===e.currentTarget)closeManualLog();
});
function saveManualLog(){
  const sv=document.getElementById('manualSleep').value;
  const wv=document.getElementById('manualWake').value;
  if(!sv||!wv){showToast('Preencha os dois horários');return}
  const now=new Date();
  const sleep=new Date(now);
  const[sh,sm]=sv.split(':');sleep.setHours(Number(sh),Number(sm),0,0);
  const wake=new Date(now);
  const[wh,wm]=wv.split(':');wake.setHours(Number(wh),Number(wm),0,0);
  if(wake<=sleep)wake.setDate(wake.getDate()+1);
  if(sleep>now)sleep.setDate(sleep.getDate()-1);
  const history=sGet(SK)||[];
  const record=buildRecord(sleep,wake,null,'Bom');
  record.isManual=true;
  history.push(record);
  sSet(SK,history);
  closeManualLog();
  renderHistory();
  loadAnalytics();
  renderHomeBanners();
  showToast('Registro manual adicionado');
  document.getElementById('manualSleep').value='';
  document.getElementById('manualWake').value='';
}
function renderHistory(){
  const history=sGet(SK)||[];
  const list=document.getElementById('historyList');
  list.innerHTML='';
  if(!history.length){
    list.innerHTML=`<div class="empty"><div class="empty-icon"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><h3>Nenhum registro ainda</h3><p>Inicie uma sessão de sono na aba Dormir.</p></div>`;
    return;
  }
  [...history].reverse().forEach((item,idx)=>{
    const orig=history.length-1-idx;
    const dot=moodDotClass(item.mood);
    const manualBadge=item.isManual?`<span style="font-size:9px;background:var(--s3);color:var(--t3);padding:2px 7px;border-radius:4px;margin-left:6px;font-weight:600;letter-spacing:.06em;text-transform:uppercase">manual</span>`:'';
    list.innerHTML+=`<div class="hist-item">
      <div class="hist-head">
        <div class="hist-head-left">
          <div class="hist-mood-dot ${dot}"></div>
          <div>
            <div class="hist-date">${item.date} &middot; ${item.weekday}${manualBadge}</div>
            <div class="hist-mood">${item.mood}</div>
          </div>
        </div>
        <button class="del-btn" onclick="deleteRecord(${orig})">Remover</button>
      </div>
      <div class="hist-stats">
        <div class="hist-stat"><span class="hist-stat-label">Duração</span><span class="hist-stat-val">${item.totalSleepHours}h</span></div>
        <div class="hist-stat"><span class="hist-stat-label">Ciclos</span><span class="hist-stat-val">${item.cyclesCompleted}</span></div>
        <div class="hist-stat"><span class="hist-stat-label">Recovery</span><span class="hist-stat-val">${item.recoveryScore}%</span></div>
      </div>
      <div class="hist-detail">
        <span>Dormiu: ${item.sleepStartedAt}</span>
        <span>Acordou: ${item.actualWakeTime}</span>
      </div>
    </div>`;
  });
}
function deleteRecord(idx){
  const h=sGet(SK)||[];
  h.splice(idx,1);
  sSet(SK,h);
  renderHistory();
  loadAnalytics();
  renderHomeBanners();
  showToast('Registro removido');
}
function showHistory(btn){renderHistory();showScreen('historyScreen',btn)}
document.querySelectorAll('.metric[data-tip]').forEach(el=>{
  el.addEventListener('mouseenter',e=>{
    tooltipEl.textContent=el.dataset.tip;
    tooltipEl.classList.add('show');
  });
  el.addEventListener('mousemove',e=>{
    tooltipEl.style.left=Math.min(e.clientX+12,window.innerWidth-220)+'px';
    tooltipEl.style.top=(e.clientY-60)+'px';
  });
  el.addEventListener('mouseleave',()=>tooltipEl.classList.remove('show'));
  el.addEventListener('touchstart',e=>{
    tooltipEl.textContent=el.dataset.tip;
    const r=el.getBoundingClientRect();
    tooltipEl.style.left='16px';
    tooltipEl.style.top=(r.top-70)+'px';
    tooltipEl.classList.add('show');
    setTimeout(()=>tooltipEl.classList.remove('show'),2500);
  },{passive:true});
});
function calcConsistency(h){
  if(h.length<2)return 100;
  const times=h.map(i=>{const[hr,mn]=i.sleepStartedAt.split(':').map(Number);return hr*60+mn});
  const avg=times.reduce((a,b)=>a+b,0)/times.length;
  return Math.max(0,Math.round(100-times.reduce((acc,t)=>acc+Math.abs(t-avg),0)/times.length));
}
function calcChronotype(h){
  if(!h.length)return'—';
  const avg=h.reduce((acc,i)=>{
    const[hr,mn]=i.sleepStartedAt.split(':').map(Number);
    return acc+(hr<8?(hr+24)*60+mn:hr*60+mn);
  },0)/h.length;
  if(avg<21*60)return'Matutino';
  if(avg<23*60)return'Intermediário';
  return'Noturno';
}
function genInsights(h){
  const ins=[];
  if(!h.length)return ins;
  const avgH=h.reduce((a,i)=>a+i.totalSleepHours,0)/h.length;
  if(avgH<6)ins.push({type:'err',text:'Média abaixo de 6h. Isso prejudica consolidação de memória, imunidade e recuperação muscular de forma significativa.'});
  else if(avgH>=7&&avgH<=9)ins.push({type:'ok',text:'Média dentro da faixa ideal (7–9h). Boa base para recuperação cognitiva e física.'});
  const late=h.filter(i=>{const hr=Number(i.sleepStartedAt.split(':')[0]);return hr>=1&&hr<8});
  if(late.length>h.length/2)ins.push({type:'warn',text:'Você costuma dormir muito tarde. Isso pode fragmentar o ritmo circadiano e reduzir a qualidade das fases de sono profundo.'});
  if(h.filter(i=>i.value>=3).length>h.length*.7)ins.push({type:'ok',text:'Mais de 70% das noites com avaliação positiva. Boa consistência de recuperação percebida.'});
  const cons=calcConsistency(h);
  if(cons<70)ins.push({type:'warn',text:'Consistência de horários abaixo de 70%. Regularidade é um dos pilares mais impactantes da qualidade do sono — mais que a duração isolada.'});
  const debt=h.reduce((a,i)=>a+Math.max(0,IDEAL-i.totalSleepHours),0);
  if(debt>10)ins.push({type:'err',text:`Dívida de sono acumulada: ${debt.toFixed(1)}h. Recomendado compensar gradualmente — 30 a 60 min extras por noite durante a semana.`});
  if(h.filter(i=>i.sleptBeforeMidnight).length>h.length*.6)ins.push({type:'ok',text:'Padrão saudável: você dorme antes da meia-noite na maioria das noites, favorecendo as fases de sono profundo iniciais.'});
  return ins;
}
function calcWeekAvg(h,weeksAgo){
  const now=Date.now();
  const msWeek=7*24*3600*1000;
  const end=now-weeksAgo*msWeek;
  const start=end-msWeek;
  const slice=h.filter(i=>i.createdAt>=start&&i.createdAt<end);
  if(!slice.length)return null;
  return{
    recovery:Math.round(slice.reduce((a,i)=>a+i.recoveryScore,0)/slice.length),
    hours:Number((slice.reduce((a,i)=>a+i.totalSleepHours,0)/slice.length).toFixed(1)),
    n:slice.length
  };
}
function setM(id,v){const el=document.getElementById(id);if(el)el.textContent=v}
function showAnalytics(btn){loadAnalytics();showScreen('analyticsScreen',btn)}
function loadAnalytics(){
  const h=sGet(SK)||[];
  const ringFg=document.getElementById('scoreRingFg');
  const scoreEl=document.getElementById('sleepScore');
  const statusEl=document.getElementById('scoreStatus');
  const noteEl=document.getElementById('scoreText');
  const insEl=document.getElementById('insights');
  const confFill=document.getElementById('confidenceFill');
  const confLabel=document.getElementById('confidenceLabel');
  const confPct=Math.min(100,Math.round((h.length/7)*100));
  confFill.style.width=confPct+'%';
  confLabel.textContent=`${h.length} / 7 registros`;
  if(!h.length){
    scoreEl.textContent='—';
    statusEl.textContent='Sem dados';
    noteEl.textContent='Registre seu primeiro sono para começar.';
    ringFg.style.strokeDashoffset='251';
    ['avgSleep','consistency','sleepDebt','recovery','avgCycles'].forEach(id=>setM(id,'—'));
    setM('chronotype','—');
    insEl.innerHTML=`<div class="empty" style="padding:16px 0"><div class="empty-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><h3>Nenhum insight ainda</h3><p>Insights aparecem após alguns registros.</p></div>`;
    document.getElementById('trendBlock').style.display='none';
    if(chart){chart.destroy();chart=null}
    return;
  }
  const avgMood=h.reduce((a,i)=>a+i.value,0)/h.length;
  const avgRec=h.reduce((a,i)=>a+i.recoveryScore,0)/h.length;
  const cons=calcConsistency(h);
  const score=Math.min(100,Math.round((avgMood/4)*40+(avgRec/100)*35+(cons/100)*25));
  scoreEl.textContent=score;
  const circ=251;
  ringFg.style.strokeDashoffset=(circ-(score/100)*circ).toFixed(1);
  if(score>=80)ringFg.style.stroke='var(--ok)';
  else if(score>=60)ringFg.style.stroke='var(--accent)';
  else if(score>=40)ringFg.style.stroke='var(--warn)';
  else ringFg.style.stroke='var(--err)';
  const statuses=[[85,'Excelente','Padrão de sono sólido. Continue assim.'],[70,'Saudável','Pequenos ajustes podem elevar ainda mais a qualidade.'],[50,'Irregular','Sinais de irregularidade que merecem atenção.'],[0,'Crítico','Padrão de sono precisa de atenção urgente.']];
  const[,st,nt]=statuses.find(([min])=>score>=min);
  statusEl.textContent=st;
  noteEl.textContent=nt;
  const avgH=(h.reduce((a,i)=>a+i.totalSleepHours,0)/h.length).toFixed(1);
  const debt=h.reduce((a,i)=>a+i.sleepDebt,0).toFixed(1);
  const avgC=(h.reduce((a,i)=>a+i.cyclesCompleted,0)/h.length).toFixed(1);
  setM('avgSleep',`${avgH}h`);
  setM('consistency',`${cons}%`);
  setM('sleepDebt',`${debt}h`);
  setM('recovery',`${Math.round(avgRec)}%`);
  setM('avgCycles',avgC);
  setM('chronotype',calcChronotype(h));
  const ins=genInsights(h);
  insEl.innerHTML=ins.length?ins.map(i=>`<div class="insight ${i.type}">${i.text}</div>`).join(''):'<div class="insight ok">Tudo dentro do esperado. Continue mantendo o padrão.</div>';
  const trendBlock=document.getElementById('trendBlock');
  const thisWeek=calcWeekAvg(h,0);
  const lastWeek=calcWeekAvg(h,1);
  if(thisWeek&&lastWeek){
    trendBlock.style.display='block';
    const wp=document.getElementById('weekPills');
    const tw=document.getElementById('trendWrap');
    const ts=document.getElementById('trendSvg');
    const tt=document.getElementById('trendText');
    wp.innerHTML=`
      <div class="week-pill"><span class="week-pill-label">Esta semana</span><span class="week-pill-value">${thisWeek.recovery}%</span></div>
      <div class="week-pill"><span class="week-pill-label">Semana anterior</span><span class="week-pill-value">${lastWeek.recovery}%</span></div>
      <div class="week-pill"><span class="week-pill-label">Média horas</span><span class="week-pill-value">${thisWeek.hours}h</span></div>
    `;
    const diff=thisWeek.recovery-lastWeek.recovery;
    if(diff>0){
      ts.setAttribute('stroke','var(--ok)');
      ts.innerHTML='<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>';
      tt.innerHTML=`Recovery <strong>+${diff}pts</strong> em relação à semana anterior. Melhora consistente.`;
    } else if(diff<0){
      ts.setAttribute('stroke','var(--err)');
      ts.innerHTML='<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>';
      tt.innerHTML=`Recovery <strong>${diff}pts</strong> em relação à semana anterior. Pode valer revisar os horários.`;
    } else {
      ts.setAttribute('stroke','var(--t2)');
      ts.innerHTML='<line x1="5" y1="12" x2="19" y2="12"/>';
      tt.innerHTML=`Recovery <strong>estável</strong> em relação à semana anterior.`;
    }
  } else {
    trendBlock.style.display='none';
  }
  const ctx=document.getElementById('analyticsChart').getContext('2d');
  if(chart)chart.destroy();
  const last=h.slice(-14);
  chart=new Chart(ctx,{
    type:'line',
    data:{
      labels:last.map(i=>i.date),
      datasets:[{
        label:'Recovery',
        data:last.map(i=>i.recoveryScore),
        tension:.4,fill:true,
        borderColor:'#2873ff',borderWidth:1.5,
        pointBackgroundColor:'#2873ff',pointRadius:3,pointHoverRadius:5,
        backgroundColor:(ctx)=>{
          const g=ctx.chart.ctx.createLinearGradient(0,0,0,180);
          g.addColorStop(0,'rgba(135, 143, 219, 0.2)');
          g.addColorStop(1,'rgba(200,184,255,0)');
          return g;
        }
      }]
    },
    options:{
      responsive:true,
      interaction:{mode:'index',intersect:false},
      plugins:{
        legend:{display:false},
        tooltip:{backgroundColor:'#1a2030',borderColor:'rgba(255,255,255,.08)',borderWidth:1,titleColor:'#7a869e',bodyColor:'#f0f2f7',padding:10,cornerRadius:8,displayColors:false}
      },
      scales:{
        y:{min:0,max:100,ticks:{color:'#3d4659',font:{size:10},stepSize:25},grid:{color:'rgba(255,255,255,.04)'},border:{display:false}},
        x:{ticks:{color:'#3d4659',font:{size:10},maxRotation:0,maxTicksLimit:6},grid:{display:false},border:{display:false}}
      }
    }
  });
}
loadSession();
renderHistory();
loadAnalytics();
renderHomeBanners();
