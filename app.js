(() => {
"use strict";

const CFG = window.VP_CONFIG || {};
const STORAGE_KEY = "v-planer-cloud-v1.0";
const APPDATA_FILE = "v-planer-data-v1.0.json";
const SCOPES = "https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file";
const COLLECTIONS = ["tasks","projects","events","members","groups","functions","meetings","knowledge","documents"];

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const uid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const now = () => new Date().toISOString();
const todayStr = () => new Date().toISOString().slice(0,10);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const fmtDate = d => d ? new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(`${d}T12:00:00`)) : "—";
const fmtShort = d => d ? new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"2-digit"}).format(new Date(`${d}T12:00:00`)) : "—";
const fmtSize = n => { n=Number(n)||0; if(n<1024)return `${n} B`; if(n<1024**2)return `${(n/1024).toFixed(1)} KB`; if(n<1024**3)return `${(n/1024**2).toFixed(1)} MB`; return `${(n/1024**3).toFixed(2)} GB`; };
const daysUntil = d => d ? Math.ceil((new Date(`${d}T23:59:59`) - new Date()) / 86400000) : null;
const ageAt = (birth, onDate=new Date()) => { if(!birth) return null; const b=new Date(`${birth}T12:00:00`); let a=onDate.getFullYear()-b.getFullYear(); const md=onDate.getMonth()-b.getMonth(); if(md<0||(md===0&&onDate.getDate()<b.getDate()))a--; return a; };

function defaultDB(){
  return {
    version:4, updatedAt:now(), settingsUpdatedAt:now(),
    settings:{
      clubName:"Mein Verein", userRole:"Vorstand", storageLimitGB:CFG.DEFAULT_STORAGE_LIMIT_GB||5, compressImages:true,
      modules:{club:true,documents:true},
      reminders:{enabled:true,infoDays:14,warningDays:7,alarmDays:2,birthdayWeek:true,jubilee:true}
    },
    counters:{memberNo:1},
    tasks:[],projects:[],events:[],members:[],groups:[],functions:[],meetings:[],knowledge:[],documents:[]
  };
}
function normalizeDB(data){
  const base=defaultDB(), out={...base,...(data||{})};
  out.settings={...base.settings,...(data?.settings||{})};
  out.settings.modules={...base.settings.modules,...(data?.settings?.modules||{})};
  out.settings.reminders={...base.settings.reminders,...(data?.settings?.reminders||{})};
  out.counters={...base.counters,...(data?.counters||{})};
  COLLECTIONS.forEach(c=>out[c]=Array.isArray(data?.[c])?data[c]:[]);
  return out;
}
function loadDB(){ try { return normalizeDB(JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}")); } catch { return defaultDB(); } }
let db = loadDB();
if (window.VP_DEMO && COLLECTIONS.every(c => db[c].filter(x => !x.deletedAt).length === 0)) {
  const gSport={id:"g-sport",name:"Sport",type:"Abteilung",parentId:"",description:"Sportabteilung des Vereins",contactMemberId:"m-anna",autoRule:{enabled:false,status:"",ageMin:"",ageMax:""},updatedAt:now()};
  const gFuss={id:"g-fuss",name:"Fußball",type:"Abteilung",parentId:"g-sport",description:"Fußballabteilung",contactMemberId:"m-max",autoRule:{enabled:false,status:"",ageMin:"",ageMax:""},updatedAt:now()};
  const gJugend={id:"g-jugend",name:"Jugend",type:"Mannschaft",parentId:"g-fuss",description:"Jugendbereich",contactMemberId:"m-lena",autoRule:{enabled:true,status:"active",ageMin:"",ageMax:"17"},updatedAt:now()};
  const year=new Date().getFullYear();
  db.groups=[gSport,gFuss,gJugend];
  db.members=[
    {id:"m-anna",memberNo:"0001",firstName:"Anna",lastName:"Becker",birthDate:`${year-38}-08-16`,status:"active",entryDate:`${year-12}-03-01`,honorary:false,email:"anna@verein.de",phone:"0123 456789",groupIds:["g-sport"],extraFields:[{key:"Qualifikation",value:"Übungsleiterin"}],history:[{date:`${year}-01-10`,note:"In Vorstand gewählt"}],statusHistory:[],honors:[],updatedAt:now()},
    {id:"m-max",memberNo:"0002",firstName:"Max",lastName:"Müller",birthDate:`${year-44}-08-14`,status:"active",entryDate:`${year-20}-05-15`,honorary:false,email:"max@verein.de",phone:"",groupIds:["g-fuss"],extraFields:[],history:[],statusHistory:[],honors:[{title:"Ehrennadel Silber",date:`${year-1}-06-01`}],updatedAt:now()},
    {id:"m-lena",memberNo:"0003",firstName:"Lena",lastName:"Schmidt",birthDate:`${year-16}-08-18`,status:"active",entryDate:`${year-4}-09-01`,honorary:false,email:"",phone:"",guardian:"Sabine Schmidt",groupIds:["g-jugend"],extraFields:[],history:[],statusHistory:[],honors:[],updatedAt:now()}
  ];
  db.functions=[
    {id:"fn1",title:"Abteilungsleiterin",kind:"Vorstandsfunktion",groupId:"g-sport",memberId:"m-anna",startDate:`${year}-01-01`,endDate:"",notes:"",updatedAt:now()},
    {id:"fn2",title:"Trainer",kind:"Trainer",groupId:"g-fuss",memberId:"m-max",startDate:`${year-2}-07-01`,endDate:"",notes:"",updatedAt:now()},
    {id:"fn3",title:"Jugendbetreuerin",kind:"Betreuer",groupId:"g-jugend",memberId:"m-lena",startDate:`${year}-01-01`,endDate:"",notes:"",updatedAt:now()}
  ];
  const plus=n=>{const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)};
  db.projects=[{id:"p1",name:"Sommerfest",due:plus(9),status:"active",groupId:"",progress:65,description:"Planung des jährlichen Sommerfests",updatedAt:now()},{id:"p2",name:"Mitgliederversammlung",due:plus(26),status:"active",groupId:"",progress:40,description:"JHV vorbereiten und durchführen",updatedAt:now()}];
  db.tasks=[{id:"t1",title:"Genehmigung Sommerfest prüfen",due:plus(1),priority:"high",projectId:"p1",groupId:"",status:"doing",updatedAt:now()},{id:"t2",title:"Einladung Mitgliederversammlung",due:plus(6),priority:"mid",projectId:"p2",groupId:"",status:"open",updatedAt:now()},{id:"t3",title:"Rückmeldung Getränkehändler",due:plus(3),priority:"mid",projectId:"p1",groupId:"",status:"wait",updatedAt:now()}];
  db.events=[{id:"e1",title:"Vorstandssitzung",date:plus(2),time:"19:00",location:"Vereinsheim",groupId:"",updatedAt:now()},{id:"e2",title:"Sommerfest",date:plus(9),time:"11:00",location:"Sportplatz",groupId:"",updatedAt:now()}];
  db.meetings=[{id:"meet1",title:"Vorstandssitzung August",date:plus(2),groupId:"",notes:"Sommerfest, Mitgliederentwicklung, Hallenbelegung",decisions:["Sommerfest wie geplant durchführen"],updatedAt:now()}];
  db.knowledge=[{id:"k1",title:"JHV vorbereiten",groupId:"",text:"Einladung fristgerecht versenden, Tagesordnung abstimmen, Protokollvorlage vorbereiten.",updatedAt:now()}];
  db.counters.memberNo=4; db.updatedAt=now();
}
let selectedMemberId = null, selectedGroupId = null, calDate = new Date();
let accessToken="", tokenClient=null, rootFolderId="", syncTimer=null, cloudQuota=null;

function activeRows(collection){ return db[collection].filter(x=>!x.deletedAt); }
function byId(collection,id){ return activeRows(collection).find(x=>x.id===id); }
function touch(rec){ rec.updatedAt=now(); return rec; }
function markDeleted(collection,id){ const r=db[collection].find(x=>x.id===id); if(r){r.deletedAt=now();r.updatedAt=r.deletedAt;} }
function saveLocal(opts={}){
  db.updatedAt=now(); localStorage.setItem(STORAGE_KEY,JSON.stringify(db)); renderAll();
  if(opts.autoSync!==false && accessToken) scheduleAutoSync();
}
function scheduleAutoSync(){ clearTimeout(syncTimer); syncTimer=setTimeout(()=>syncDrive(true).catch(()=>{}),1600); }

function statusLabel(s){return({open:"Offen",doing:"In Arbeit",wait:"Warten",done:"Erledigt",planned:"Geplant",active:"Aktiv",paused:"Pausiert",closed:"Abgeschlossen",inactive:"Deaktiviert",passive:"Passiv",deceased:"Verstorben"})[s]||s}
function statusBadge(s){ const cls=s==="done"||s==="active"?"ok":s==="wait"||s==="paused"?"mid":s==="deceased"?"gray":"low"; return `<span class="badge ${cls}">${esc(statusLabel(s))}</span>`; }
function priorityBadge(p){return `<span class="badge ${p==="high"?"high":p==="low"?"low":"mid"}">${p==="high"?"Hoch":p==="low"?"Niedrig":"Mittel"}</span>`}
function reminderClass(date){
  if(!date||!db.settings.reminders.enabled)return ""; const d=daysUntil(date); if(d===null)return "";
  if(d<=db.settings.reminders.alarmDays)return "due-alarm";
  if(d<=db.settings.reminders.warningDays)return "due-warning";
  if(d<=db.settings.reminders.infoDays)return "due-info";
  return "";
}
function dueText(date){ const d=daysUntil(date); if(d===null)return "Kein Termin"; if(d<0)return `${Math.abs(d)} Tag${Math.abs(d)===1?"":"e"} überfällig`; if(d===0)return "Heute"; if(d===1)return "Morgen"; return `noch ${d} Tage`; }
function memberFullName(m){ return `${m.lastName||""}, ${m.firstName||""}`.replace(/^, |, $/g,"") || "Unbenannt"; }
function ageCategory(m){ const a=ageAt(m.birthDate); if(a===null)return "—"; if(a<18)return "Jugend"; if(a>=65)return "Senioren"; return "Erwachsene"; }
function memberNo(m){ return m.memberNo || "—"; }
function groupName(id){ return byId("groups",id)?.name || "—"; }
function effectiveGroupIdsForMember(m){ const ids=new Set(m.groupIds||[]); activeRows("groups").forEach(g=>{if(autoRuleMatches(m,g))ids.add(g.id)}); return [...ids]; }
function projectName(id){ return byId("projects",id)?.name || "—"; }

function birthdayDateForYear(m,year){ if(!m.birthDate)return null; const [,mo,da]=m.birthDate.split("-").map(Number); return new Date(year,mo-1,da,12,0,0); }
function daysToBirthday(m, ref=new Date()){
  if(!m.birthDate)return null; let next=birthdayDateForYear(m,ref.getFullYear()); const refDay=new Date(ref.getFullYear(),ref.getMonth(),ref.getDate(),12); if(next<refDay)next=birthdayDateForYear(m,ref.getFullYear()+1); return Math.round((next-refDay)/86400000);
}
function upcomingBirthdays(maxDays=7){ return activeRows("members").filter(m=>m.status!=="deceased"&&m.birthDate).map(m=>({...m,_days:daysToBirthday(m)})).filter(m=>m._days>=0&&m._days<=maxDays).sort((a,b)=>a._days-b._days); }
function jubileeYears(m,year=new Date().getFullYear()){ if(!m.entryDate)return 0; return year-Number(m.entryDate.slice(0,4)); }
function upcomingJubilees(maxDays=30){
  if(!db.settings.reminders.jubilee)return[]; const ref=new Date();
  return activeRows("members").filter(m=>m.entryDate&&m.status!=="deceased").map(m=>{const [,mo,da]=m.entryDate.split("-").map(Number); let next=new Date(ref.getFullYear(),mo-1,da,12); const r=new Date(ref.getFullYear(),ref.getMonth(),ref.getDate(),12); if(next<r)next=new Date(ref.getFullYear()+1,mo-1,da,12); const days=Math.round((next-r)/86400000); const years=next.getFullYear()-Number(m.entryDate.slice(0,4)); return {...m,_days:days,_years:years};}).filter(m=>m._days<=maxDays&&m._years>0&&m._years%5===0).sort((a,b)=>a._days-b._days);
}

function descendants(groupId){
  const ids=[]; const walk=id=>activeRows("groups").filter(g=>g.parentId===id).forEach(g=>{ids.push(g.id);walk(g.id)}); walk(groupId); return ids;
}
function autoRuleMatches(m,g){
  const r=g.autoRule||{}; if(!r.enabled)return false; const a=ageAt(m.birthDate);
  if(r.status&&m.status!==r.status)return false;
  if(r.ageMin!==""&&r.ageMin!=null&&(a===null||a<Number(r.ageMin)))return false;
  if(r.ageMax!==""&&r.ageMax!=null&&(a===null||a>Number(r.ageMax)))return false;
  return true;
}
function directMembersOfGroup(groupId){ return activeRows("members").filter(m=>(m.groupIds||[]).includes(groupId)||autoRuleMatches(m,byId("groups",groupId)||{})); }
function membersOfGroup(groupId,includeChildren=true){ const ids=[groupId,...(includeChildren?descendants(groupId):[])]; const set=new Map(); ids.forEach(id=>directMembersOfGroup(id).forEach(m=>set.set(m.id,m))); return [...set.values()]; }
function activeFunctionsForGroup(groupId){ const today=todayStr(); return activeRows("functions").filter(f=>f.groupId===groupId&&(!f.endDate||f.endDate>=today)); }
function formerFunctionsForGroup(groupId){ const today=todayStr(); return activeRows("functions").filter(f=>f.groupId===groupId&&f.endDate&&f.endDate<today); }

function pageMeta(view){return({dashboard:["Übersicht","Heute, diese Woche und alles Wichtige im Blick."],tasks:["Aufgaben","Offene Punkte, Zuständigkeiten und Fälligkeiten."],projects:["Projekte","Vorhaben wie in einer Projektzentrale planen und verfolgen."],kanban:["Kanban","Offen, In Arbeit, Warten und Erledigt."],calendar:["Kalender","Termine, Geburtstage und Vereinsereignisse."],year:["Vereinsjahr","Das Vereinsjahr auf einen Blick."],members:["Mitglieder","Stammdaten, Historie, Beziehungen, Ehrungen und Erinnerungen."],groups:["Gruppen","Gruppen, Untergruppen, Funktionen, Mannschaften und Statistiken."],meetings:["Sitzungen & Beschlüsse","Tagesordnungen, Protokolle und Entscheidungen."],documents:["Dokumente & Bilder","Quittungen, Protokolle, PDFs und Fotos."],knowledge:["Vereinswissen","Abläufe, Ansprechpartner und Erfahrungswissen."],storage:["Speicher & Sync","Google Drive, Datenvolumen und Synchronisation."],settings:["Einstellungen","Module, Warnungen und Grundkonfiguration."]})[view]||[view,""]}
function applyModuleVisibility(){
  $$('[data-module="club"]').forEach(el=>el.classList.toggle("hidden",!db.settings.modules.club));
  $$('[data-module="documents"]').forEach(el=>el.classList.toggle("hidden",!db.settings.modules.documents));
}
function closeMobileMenu(){
  const menu=$("#mobileMenu"), overlay=$("#mobileMenuOverlay");
  if(menu){menu.classList.remove("open");menu.setAttribute("aria-hidden","true");}
  if(overlay){overlay.classList.remove("open");overlay.setAttribute("aria-hidden","true");}
  document.body.classList.remove("mobile-menu-open");
}
function openMobileMenu(){
  const menu=$("#mobileMenu"), overlay=$("#mobileMenuOverlay");
  if(menu){menu.classList.add("open");menu.setAttribute("aria-hidden","false");}
  if(overlay){overlay.classList.add("open");overlay.setAttribute("aria-hidden","false");}
  document.body.classList.add("mobile-menu-open");
}
function go(view){
  if((view==="members"||view==="groups"||view==="meetings")&&!db.settings.modules.club)view="dashboard";
  if((view==="documents"||view==="knowledge")&&!db.settings.modules.documents)view="dashboard";
  $$(".view").forEach(v=>v.classList.toggle("active",v.id===`view-${view}`));
  $$(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  const [t,s]=pageMeta(view); $("#pageTitle").textContent=t; $("#pageSubtitle").textContent=s;
  closeMobileMenu();
  if(window.innerWidth<=760)window.scrollTo({top:0,behavior:"smooth"});
}
$$('[data-view]').forEach(b=>b.addEventListener("click",()=>go(b.dataset.view)));
$("#mobileMoreBtn")?.addEventListener("click",openMobileMenu);
$("#mobileMenuClose")?.addEventListener("click",closeMobileMenu);
$("#mobileMenuOverlay")?.addEventListener("click",closeMobileMenu);
window.addEventListener("keydown",e=>{if(e.key==="Escape")closeMobileMenu();});
$$('[data-go]').forEach(b=>b.addEventListener("click",()=>go(b.dataset.go)));

function renderDashboard(){
  const tasks=activeRows("tasks"), projects=activeRows("projects"), members=activeRows("members");
  const open=tasks.filter(t=>t.status!=="done"); const today=open.filter(t=>t.due===todayStr()).length; const week=open.filter(t=>{const d=daysUntil(t.due);return d!==null&&d>=0&&d<=7}).length;
  $("#metricOpenTasks").textContent=open.length; $("#metricTaskHint").textContent=`Heute ${today} · Woche ${week}`;
  $("#metricProjects").textContent=projects.filter(p=>p.status==="active").length; $("#metricProjectHint").textContent=`${projects.filter(p=>p.due&&p.status!=="closed").length} mit Termin`;
  $("#metricMembers").textContent=members.length; $("#metricMemberHint").textContent=`${members.filter(m=>m.status==="active").length} aktiv`;
  const bdays=upcomingBirthdays(7); $("#metricBirthdays").textContent=bdays.length;

  const alertItems=[];
  const overdue=open.filter(t=>daysUntil(t.due)<0).length; if(overdue)alertItems.push(`${overdue} überfällige Aufgabe${overdue===1?"":"n"}`);
  const alarms=projects.filter(p=>p.status!=="closed"&&daysUntil(p.due)!==null&&daysUntil(p.due)<=db.settings.reminders.alarmDays&&daysUntil(p.due)>=0).length; if(alarms)alertItems.push(`${alarms} Projekt${alarms===1?"":"e"} im Alarm-Zeitraum`);
  if(db.settings.reminders.birthdayWeek&&bdays.length)alertItems.push(`${bdays.length} Geburtstag${bdays.length===1?"":"e"} in den nächsten 7 Tagen`);
  $("#alertStrip").classList.toggle("hidden",!alertItems.length); $("#alertStrip").textContent=alertItems.length?`⚠ ${alertItems.join(" · ")}`:"";

  const list=open.slice().sort((a,b)=>(a.due||"9999").localeCompare(b.due||"9999")).slice(0,7);
  $("#dashboardTasks").innerHTML=list.length?list.map(t=>`<div class="mini-row"><input type="checkbox" data-finish-task="${t.id}"><div><div class="mini-title">${esc(t.title)}</div><div class="mini-meta">${esc(projectName(t.projectId))} · ${esc(groupName(t.groupId))}</div></div><span class="badge ${reminderClass(t.due)}">${esc(dueText(t.due))}</span></div>`).join(""):`<div class="empty">Keine offenen Aufgaben.</div>`;
  $$('[data-finish-task]').forEach(el=>el.onchange=()=>{const t=byId("tasks",el.dataset.finishTask);if(t){t.status="done";touch(t);saveLocal()}});

  const ps=projects.filter(p=>p.status!=="closed").sort((a,b)=>(a.due||"9999").localeCompare(b.due||"9999")).slice(0,6);
  $("#dashboardProjects").innerHTML=ps.length?ps.map(p=>`<div class="project-mini"><div class="row"><div><div class="mini-title">${esc(p.name)}</div><div class="mini-meta">${esc(groupName(p.groupId))}</div></div><span class="project-days ${projectDayClass(p.due)}">${esc(dueText(p.due))}</span></div><div class="progress"><span style="width:${Math.max(0,Math.min(100,p.progress||0))}%"></span></div><div class="mini-meta" style="text-align:right">${p.progress||0}%</div></div>`).join(""):`<div class="empty">Noch keine Projekte.</div>`;

  const birthdays=[...bdays.slice(0,5),...upcomingJubilees(30).slice(0,3)];
  $("#dashboardBirthdays").innerHTML=birthdays.length?birthdays.map(m=>m._years?`<div class="birthday-row"><div class="person-dot">★</div><div><div class="mini-title">${esc(memberFullName(m))}</div><div class="mini-meta">${m._years}. Vereinsjubiläum · ${m._days===0?"heute":`in ${m._days} Tagen`}</div></div></div>`:`<div class="birthday-row"><div class="person-dot">🎂</div><div><div class="mini-title">${esc(memberFullName(m))}</div><div class="mini-meta">${m._days===0?"Heute Geburtstag":m._days===1?"Morgen Geburtstag":`in ${m._days} Tagen`} · wird ${ageAt(m.birthDate,new Date(new Date().setDate(new Date().getDate()+m._days)))+1}</div></div></div>`).join(""):`<div class="empty">Keine Geburtstage oder Jubiläen in Kürze.</div>`;

  const ev=activeRows("events").filter(e=>e.date>=todayStr()).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,5);
  $("#dashboardEvents").innerHTML=ev.length?ev.map(e=>eventRowHTML(e)).join(""):`<div class="empty">Keine kommenden Termine.</div>`;
  renderDashboardStorage();
}
function projectDayClass(date){const c=reminderClass(date);return c.includes("alarm")?"alarm":c.includes("warning")?"warning":c.includes("info")?"info":"ok"}
function eventRowHTML(e){ const d=new Date(`${e.date}T12:00:00`); return `<div class="event-row"><div class="date-box">${String(d.getDate()).padStart(2,"0")}<small>${d.toLocaleDateString("de-DE",{month:"short"}).toUpperCase()}</small></div><div><div class="mini-title">${esc(e.title)}</div><div class="mini-meta">${esc(e.time||"")} ${e.location?`· ${esc(e.location)}`:""}</div></div></div>`; }
function renderDashboardStorage(){ const local=estimateLocalBytes(),docs=activeRows("documents").reduce((s,d)=>s+(d.size||0),0),total=local+docs,limit=(db.settings.storageLimitGB||5)*1024**3,pct=Math.min(100,Math.round(total/limit*100)); $("#dashboardStorage").innerHTML=`<div class="ring" data-text="${fmtSize(total)}"></div><div class="storage-caption">${pct}% von ${db.settings.storageLimitGB||5} GB eigenem Limit<br>${accessToken?"Drive verbunden":"Nur lokal"}</div>`; }

function renderTasks(){
  const q=($("#taskSearch").value||"").toLowerCase(),f=$("#taskStatusFilter").value; const rows=activeRows("tasks").filter(t=>(!q||t.title.toLowerCase().includes(q))&&(!f||t.status===f)).sort((a,b)=>(a.due||"9999").localeCompare(b.due||"9999"));
  $("#taskTable").innerHTML=rows.length?rows.map(t=>`<tr><td><b>${esc(t.title)}</b></td><td>${esc(projectName(t.projectId))}</td><td>${esc(groupName(t.groupId))}</td><td><span class="badge ${reminderClass(t.due)}">${fmtDate(t.due)} · ${esc(dueText(t.due))}</span></td><td>${priorityBadge(t.priority)}</td><td><select data-task-status="${t.id}">${["open","doing","wait","done"].map(s=>`<option value="${s}" ${s===t.status?"selected":""}>${statusLabel(s)}</option>`).join("")}</select></td><td><button class="action-link" data-edit-task="${t.id}">Bearbeiten</button> <button class="action-link" data-delete-task="${t.id}">Löschen</button></td></tr>`).join(""):`<tr><td colspan="7" class="empty">Keine Aufgaben.</td></tr>`;
  $$('[data-task-status]').forEach(el=>el.onchange=()=>{const r=byId("tasks",el.dataset.taskStatus);if(r){r.status=el.value;touch(r);saveLocal()}});
  $$('[data-edit-task]').forEach(el=>el.onclick=()=>openTaskModal(byId("tasks",el.dataset.editTask)));
  $$('[data-delete-task]').forEach(el=>el.onclick=()=>{if(confirm("Aufgabe wirklich löschen?")){markDeleted("tasks",el.dataset.deleteTask);saveLocal()}});
}
$("#taskSearch").addEventListener("input",renderTasks);$("#taskStatusFilter").addEventListener("change",renderTasks);

function renderProjects(){
  const q=($("#projectSearch").value||"").toLowerCase(),f=$("#projectStatusFilter").value; const rows=activeRows("projects").filter(p=>(!q||p.name.toLowerCase().includes(q))&&(!f||p.status===f));
  $("#projectGrid").innerHTML=rows.length?rows.map(p=>`<div class="card project-card"><div class="row"><h3>${esc(p.name)}</h3>${statusBadge(p.status)}</div><p>${esc(p.description||"Keine Beschreibung hinterlegt.")}</p><div class="mini-meta">${esc(groupName(p.groupId))} · Ziel ${fmtDate(p.due)}</div><div class="project-days ${projectDayClass(p.due)}">${esc(dueText(p.due))}</div><div class="progress"><span style="width:${Math.max(0,Math.min(100,p.progress||0))}%"></span></div><div class="row" style="margin-top:10px"><span class="mini-meta">Fortschritt ${p.progress||0}%</span><span><button class="action-link" data-edit-project="${p.id}">Bearbeiten</button> <button class="action-link" data-delete-project="${p.id}">Löschen</button></span></div></div>`).join(""):`<div class="empty">Keine Projekte.</div>`;
  $$('[data-edit-project]').forEach(el=>el.onclick=()=>openProjectModal(byId("projects",el.dataset.editProject)));
  $$('[data-delete-project]').forEach(el=>el.onclick=()=>{if(confirm("Projekt wirklich löschen? Zugehörige Aufgaben bleiben erhalten.")){markDeleted("projects",el.dataset.deleteProject);saveLocal()}});
}
$("#projectSearch").addEventListener("input",renderProjects);$("#projectStatusFilter").addEventListener("change",renderProjects);

function renderKanban(){
  const cols=[["open","Offen"],["doing","In Arbeit"],["wait","Warten auf"],["done","Erledigt"]];
  $("#kanbanBoard").innerHTML=cols.map(([s,l])=>`<div class="kanban-col" data-kanban-col="${s}"><h3>${l} · ${activeRows("tasks").filter(t=>t.status===s).length}</h3>${activeRows("tasks").filter(t=>t.status===s).map(t=>`<div class="ticket" draggable="true" data-drag-task="${t.id}"><strong>${esc(t.title)}</strong><small>${esc(projectName(t.projectId))} · ${esc(dueText(t.due))}</small></div>`).join("")}</div>`).join("");
  $$('[data-drag-task]').forEach(el=>el.addEventListener("dragstart",e=>e.dataTransfer.setData("text/plain",el.dataset.dragTask)));
  $$('[data-kanban-col]').forEach(col=>{col.addEventListener("dragover",e=>e.preventDefault());col.addEventListener("drop",e=>{e.preventDefault();const t=byId("tasks",e.dataTransfer.getData("text/plain"));if(t){t.status=col.dataset.kanbanCol;touch(t);saveLocal()}})});
}

function renderCalendar(){
  const y=calDate.getFullYear(),m=calDate.getMonth(); $("#calendarTitle").textContent=new Intl.DateTimeFormat("de-DE",{month:"long",year:"numeric"}).format(calDate);
  const first=new Date(y,m,1),offset=(first.getDay()+6)%7,days=new Date(y,m+1,0).getDate(); let cells=["Mo","Di","Mi","Do","Fr","Sa","So"].map(x=>`<div class="weekday">${x}</div>`); for(let i=0;i<offset;i++)cells.push('<div class="cal-day muted"></div>');
  for(let d=1;d<=days;d++){
    const ds=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`; const ev=activeRows("events").filter(e=>e.date===ds).slice(0,2); const bd=activeRows("members").filter(mem=>mem.birthDate&&mem.status!=="deceased"&&Number(mem.birthDate.slice(5,7))===m+1&&Number(mem.birthDate.slice(8,10))===d).slice(0,2);
    cells.push(`<div class="cal-day"><b>${d}</b>${bd.map(mem=>`<div class="cal-chip birthday">🎂 ${esc(mem.firstName||mem.lastName)}</div>`).join("")}${ev.map(e=>`<div class="cal-chip">${esc(e.title)}</div>`).join("")}</div>`);
  }
  $("#calendarGrid").innerHTML=cells.join("");
  const combined=[...activeRows("events").filter(e=>e.date>=todayStr()).map(e=>({...e,_kind:"event"})),...upcomingBirthdays(31).map(m=>({...m,_kind:"birthday"}))].sort((a,b)=>a._kind==="event"?a.date.localeCompare(b._kind==="event"?b.date:"9999"):a._days-(b._days??9999)).slice(0,12);
  $("#calendarSideList").innerHTML=combined.length?combined.map(x=>x._kind==="event"?eventRowHTML(x):`<div class="birthday-row"><div class="person-dot">🎂</div><div><div class="mini-title">${esc(memberFullName(x))}</div><div class="mini-meta">${x._days===0?"Heute":x._days===1?"Morgen":`in ${x._days} Tagen`}</div></div></div>`).join(""):`<div class="empty">Keine Einträge.</div>`;
}
$("#prevMonth").onclick=()=>{calDate=new Date(calDate.getFullYear(),calDate.getMonth()-1,1);renderCalendar()};$("#nextMonth").onclick=()=>{calDate=new Date(calDate.getFullYear(),calDate.getMonth()+1,1);renderCalendar()};

function renderYear(){
  $("#yearGrid").innerHTML=[...Array(12)].map((_,i)=>{const name=new Intl.DateTimeFormat("de-DE",{month:"long"}).format(new Date(2026,i,1));const ev=activeRows("events").filter(e=>new Date(`${e.date}T12:00:00`).getMonth()===i).slice(0,6);return `<div class="card month-card"><h3>${name}</h3>${ev.length?ev.map(e=>`<div class="year-item"><b>${fmtShort(e.date)}</b> ${esc(e.title)}</div>`).join(""):`<div class="mini-meta">Noch keine Einträge</div>`}</div>`}).join("");
}

function renderMembers(){
  const q=($("#memberSearch").value||"").toLowerCase(),f=$("#memberStatusFilter").value; const rows=activeRows("members").filter(m=>(!q||`${m.firstName} ${m.lastName} ${m.memberNo}`.toLowerCase().includes(q))&&(!f||m.status===f)).sort((a,b)=>(a.lastName||"").localeCompare(b.lastName||""));
  $("#memberTable").innerHTML=rows.length?rows.map(m=>`<tr class="selectable" data-select-member="${m.id}"><td>${esc(memberNo(m))}</td><td><b>${esc(memberFullName(m))}</b></td><td>${statusBadge(m.status)}</td><td>${ageAt(m.birthDate)??"—"} · ${ageCategory(m)}</td><td>${esc(effectiveGroupIdsForMember(m).map(groupName).filter(x=>x!=="—").join(", ")||"—")}</td><td>${nextPersonalDate(m)}</td></tr>`).join(""):`<tr><td colspan="6" class="empty">Noch keine Mitglieder.</td></tr>`;
  $$('[data-select-member]').forEach(el=>el.onclick=()=>{selectedMemberId=el.dataset.selectMember;renderMemberDetail()});
  if(!selectedMemberId&&rows[0])selectedMemberId=rows[0].id; renderMemberDetail();
}
function nextPersonalDate(m){ const d=daysToBirthday(m); return d===null?"—":d===0?"🎂 heute":d===1?"🎂 morgen":d<=7?`🎂 in ${d} Tagen`:fmtDate(m.birthDate?`${new Date().getFullYear()}-${m.birthDate.slice(5)}`:""); }
function memberPhotoHTML(m){return m.photoData?`<img class="member-photo" src="${m.photoData}" alt="Foto">`:`<div class="member-photo person-dot" style="display:grid">${esc((m.firstName?.[0]||"")+(m.lastName?.[0]||""))}</div>`}
function renderMemberDetail(){
  const m=byId("members",selectedMemberId); if(!m){$("#memberDetail").innerHTML='<div class="empty">Mitglied auswählen.</div>';return}
  const groups=effectiveGroupIdsForMember(m).map(groupName).filter(x=>x!=="—"); const histories=[...(m.statusHistory||[]),...(m.history||[])].sort((a,b)=>(b.date||"").localeCompare(a.date||"")).slice(0,6);
  $("#memberDetail").innerHTML=`<div class="member-hero">${memberPhotoHTML(m)}<div><h2>${esc(`${m.firstName||""} ${m.lastName||""}`.trim())}</h2><div class="mini-meta">Mitglied ${esc(memberNo(m))} · ${statusLabel(m.status)} · ${ageCategory(m)}</div></div></div>
  <div class="member-card-digital"><div class="member-card-top"><div><b>V-Planer Mitgliedskarte</b><div style="font-size:20px;margin-top:8px">${esc(`${m.firstName||""} ${m.lastName||""}`.trim())}</div><small>${esc(groups.join(" · ")||"Gesamtverein")}</small></div><div style="text-align:right"><b>${esc(memberNo(m))}</b><div style="margin-top:8px">${m.honorary?"★ Ehrenmitglied":""}</div></div></div></div>
  <div class="detail-grid"><div class="detail-box"><b>Geburtstag</b>${fmtDate(m.birthDate)} · ${ageAt(m.birthDate)??"—"} Jahre</div><div class="detail-box"><b>Eintritt</b>${fmtDate(m.entryDate)}${m.entryDate?` · ${jubileeYears(m)} Jahre`:""}</div><div class="detail-box"><b>Kontakt</b>${esc(m.email||"—")}<br>${esc(m.phone||"")}</div><div class="detail-box"><b>Notfallkontakt</b>${esc(m.emergencyName||"—")}<br>${esc(m.emergencyPhone||"")}</div><div class="detail-box"><b>Familie</b>${esc(m.familyName||"—")}</div><div class="detail-box"><b>Gesetzliche Vertretung</b>${esc(m.guardian||"—")}</div></div>
  <div class="member-actions"><button class="btn tiny secondary" data-edit-member="${m.id}">Bearbeiten</button><button class="btn tiny secondary" data-member-card="${m.id}">Mitgliedskarte</button><button class="btn tiny danger" data-delete-member="${m.id}">Löschen</button></div>
  <h3 style="font-size:14px;margin:18px 0 6px">Historie</h3>${histories.length?`<ul class="history-list">${histories.map(h=>`<li>${fmtDate(h.date)} · ${esc(h.note||h.status||h.type||"")}</li>`).join("")}</ul>`:'<div class="mini-meta">Noch keine Historie.</div>'}
  <h3 style="font-size:14px;margin:18px 0 6px">Zusatzfelder</h3><div class="mini-meta">${(m.extraFields||[]).map(x=>`${esc(x.key)}: ${esc(x.value)}`).join(" · ")||"Keine Zusatzfelder"}</div>`;
  $('[data-edit-member]')?.addEventListener("click",()=>openMemberModal(m)); $('[data-member-card]')?.addEventListener("click",()=>showMemberCard(m)); $('[data-delete-member]')?.addEventListener("click",()=>{if(confirm("Mitglied wirklich löschen?")){markDeleted("members",m.id);selectedMemberId=null;saveLocal()}});
}
$("#memberSearch").addEventListener("input",renderMembers);$("#memberStatusFilter").addEventListener("change",renderMembers);

function renderGroups(){
  const roots=activeRows("groups").filter(g=>!g.parentId); $("#groupTree").innerHTML=roots.length?roots.map(g=>groupNodeHTML(g,0)).join(""):`<div class="empty">Noch keine Gruppen.</div>`;
  $$('[data-group-node]').forEach(el=>el.onclick=()=>{selectedGroupId=el.dataset.groupNode;renderGroups()}); if(!selectedGroupId&&roots[0])selectedGroupId=roots[0].id; renderGroupDetail();
}
function groupNodeHTML(g,level){ const children=activeRows("groups").filter(x=>x.parentId===g.id); return `<div class="node level-${Math.min(level,3)} ${g.id===selectedGroupId?"active":""}" data-group-node="${g.id}">${level?"↳ ":""}${esc(g.name)} <span class="mini-meta">· ${esc(g.type||"Gruppe")}</span></div>${children.map(c=>groupNodeHTML(c,level+1)).join("")}`; }
function renderGroupDetail(){
  const g=byId("groups",selectedGroupId); $("#editGroupBtn").disabled=!g; $("#deleteGroupBtn").disabled=!g; if(!g){$("#groupDetail").innerHTML='<div class="empty">Gruppe auswählen.</div>';$("#groupDetailTitle").textContent="Gruppendetails";return}
  $("#groupDetailTitle").textContent=g.name; const direct=directMembersOfGroup(g.id),all=membersOfGroup(g.id,true),activeFns=activeFunctionsForGroup(g.id),formerFns=formerFunctionsForGroup(g.id),children=activeRows("groups").filter(x=>x.parentId===g.id);
  const rule=g.autoRule?.enabled?`Automatisch: ${g.autoRule.status?`Status ${statusLabel(g.autoRule.status)}`:"alle Status"}${g.autoRule.ageMin!==""&&g.autoRule.ageMin!=null?`, ab ${g.autoRule.ageMin} J.`:""}${g.autoRule.ageMax!==""&&g.autoRule.ageMax!=null?`, bis ${g.autoRule.ageMax} J.`:""}`:"Keine automatische Regel";
  $("#groupDetail").innerHTML=`<p>${esc(g.description||"Keine Beschreibung hinterlegt.")}</p><div class="group-stat-grid"><div class="group-stat"><small>Direkte Mitglieder</small><b>${direct.length}</b></div><div class="group-stat"><small>inkl. Untergruppen</small><b>${all.length}</b></div><div class="group-stat"><small>Untergruppen</small><b>${children.length}</b></div><div class="group-stat"><small>Aktive Funktionen</small><b>${activeFns.length}</b></div></div>
  <div class="auto-rule"><b>Automatische Gruppenzuordnung</b><br>${esc(rule)}</div>
  <div class="group-section"><h3>Ansprechpartner</h3><div>${g.contactMemberId?esc(memberFullName(byId("members",g.contactMemberId)||{})):"Nicht hinterlegt"}</div></div>
  <div class="group-section"><h3>Aktuelle Funktionen</h3>${activeFns.length?activeFns.map(functionRowHTML).join(""):'<div class="mini-meta">Keine aktuellen Funktionen.</div>'}</div>
  <div class="group-section"><h3>Frühere Funktionen</h3>${formerFns.length?formerFns.map(functionRowHTML).join(""):'<div class="mini-meta">Keine früheren Funktionen.</div>'}</div>
  <div class="group-section"><h3>Mannschaft / Mitgliederliste</h3><div class="team-list">${all.length?all.map(m=>`<span class="person-pill">${esc(`${m.firstName||""} ${m.lastName||""}`.trim())}</span>`).join(""):'<span class="mini-meta">Keine Mitglieder zugeordnet.</span>'}</div></div>`;
  $$('[data-edit-function]').forEach(el=>el.onclick=()=>openFunctionModal(byId("functions",el.dataset.editFunction)));
  $$('[data-delete-function]').forEach(el=>el.onclick=()=>{if(confirm("Funktion löschen?")){markDeleted("functions",el.dataset.deleteFunction);saveLocal()}});
}
function functionRowHTML(f){ const m=byId("members",f.memberId); return `<div class="function-row"><div><b>${esc(f.title)}</b><div class="mini-meta">${esc(f.kind||"Funktion")}</div></div><div>${esc(m?memberFullName(m):"Nicht besetzt")}</div><div>${fmtDate(f.startDate)} – ${f.endDate?fmtDate(f.endDate):"offen"}</div><div><button class="action-link" data-edit-function="${f.id}">Bearbeiten</button> <button class="action-link" data-delete-function="${f.id}">Löschen</button></div></div>`; }
$("#editGroupBtn").onclick=()=>{const g=byId("groups",selectedGroupId);if(g)openGroupModal(g)};
$("#deleteGroupBtn").onclick=()=>deleteSelectedGroup();
$("#newFunctionBtn").onclick=()=>openFunctionModal(null,selectedGroupId);
function deleteSelectedGroup(){ const g=byId("groups",selectedGroupId); if(!g)return; if(!confirm(`Gruppe „${g.name}“ löschen? Untergruppen werden eine Ebene höher verschoben; Mitgliedszuordnungen zu dieser Gruppe werden entfernt.`))return; const parent=g.parentId||""; activeRows("groups").filter(x=>x.parentId===g.id).forEach(x=>{x.parentId=parent;touch(x)}); activeRows("members").forEach(m=>{if((m.groupIds||[]).includes(g.id)){m.groupIds=(m.groupIds||[]).filter(id=>id!==g.id);touch(m)}}); ["tasks","projects","events","meetings"].forEach(c=>activeRows(c).forEach(r=>{if(r.groupId===g.id){r.groupId="";touch(r)}})); activeRows("functions").forEach(f=>{if(f.groupId===g.id){f.groupId="";touch(f)}}); markDeleted("groups",g.id);selectedGroupId=null;saveLocal(); }

function renderMeetings(){ const rows=activeRows("meetings").sort((a,b)=>(b.date||"").localeCompare(a.date||"")); $("#meetingGrid").innerHTML=rows.length?rows.map(m=>`<div class="card meeting-card"><div class="row"><h3>${esc(m.title)}</h3><span class="badge low">${fmtDate(m.date)}</span></div><div class="mini-meta">${esc(groupName(m.groupId))}</div><p>${esc(m.notes||"Keine Notizen.")}</p><div class="mini-meta">${(m.decisions||[]).length} Beschlüsse</div><div style="margin-top:8px"><button class="action-link" data-edit-meeting="${m.id}">Bearbeiten</button> <button class="action-link" data-delete-meeting="${m.id}">Löschen</button></div></div>`).join(""):`<div class="empty">Noch keine Sitzungen.</div>`; $$('[data-edit-meeting]').forEach(el=>el.onclick=()=>openMeetingModal(byId("meetings",el.dataset.editMeeting))); $$('[data-delete-meeting]').forEach(el=>el.onclick=()=>{if(confirm("Sitzung löschen?")){markDeleted("meetings",el.dataset.deleteMeeting);saveLocal()}}); }

function renderDocuments(){ const cats=["Quittungen","Protokolle","Dokumente","Bilder"]; $("#docCategories").innerHTML=cats.map(c=>{const r=activeRows("documents").filter(d=>d.category===c);return `<div class="card doc-category"><span>${c}</span><b>${r.length}</b><small class="muted">${fmtSize(r.reduce((s,d)=>s+(d.size||0),0))}</small></div>`}).join(""); const rows=activeRows("documents"); $("#docTable").innerHTML=rows.length?rows.map(d=>`<tr><td><b>${esc(d.name)}</b></td><td>${esc(d.category)}</td><td>${fmtSize(d.size)}</td><td>${new Date(d.createdAt).toLocaleString("de-DE")}</td><td>${d.webViewLink?`<a href="${d.webViewLink}" target="_blank">Öffnen</a>`:""}</td></tr>`).join(""):`<tr><td colspan="5" class="empty">Noch keine Dokumente erfasst.</td></tr>`; }
function renderKnowledge(){ const q=($("#knowledgeSearch").value||"").toLowerCase(),rows=activeRows("knowledge").filter(k=>!q||`${k.title} ${k.text}`.toLowerCase().includes(q)); $("#knowledgeGrid").innerHTML=rows.length?rows.map(k=>`<div class="card knowledge-card"><h3>${esc(k.title)}</h3><p>${esc(k.text||"")}</p><div class="mini-meta">${esc(groupName(k.groupId))}</div><div style="margin-top:8px"><button class="action-link" data-edit-knowledge="${k.id}">Bearbeiten</button> <button class="action-link" data-delete-knowledge="${k.id}">Löschen</button></div></div>`).join(""):`<div class="empty">Noch kein Vereinswissen hinterlegt.</div>`; $$('[data-edit-knowledge]').forEach(el=>el.onclick=()=>openKnowledgeModal(byId("knowledge",el.dataset.editKnowledge))); $$('[data-delete-knowledge]').forEach(el=>el.onclick=()=>{if(confirm("Eintrag löschen?")){markDeleted("knowledge",el.dataset.deleteKnowledge);saveLocal()}}); }
$("#knowledgeSearch").addEventListener("input",renderKnowledge);

function estimateLocalBytes(){ return new Blob([JSON.stringify(db)]).size; }
function renderStorage(){ const local=estimateLocalBytes(),docs=activeRows("documents").reduce((s,d)=>s+(d.size||0),0),total=local+docs,limit=(db.settings.storageLimitGB||5)*1024**3,pct=Math.min(100,Math.round(total/limit*100)); $("#storageDetail").innerHTML=`<div class="ring" data-text="${fmtSize(total)}"></div><div class="storage-caption"><b>${pct}% von ${db.settings.storageLimitGB||5} GB V-Planer-Limit</b><br>Programmdaten ${fmtSize(local)} · Dokumente ${fmtSize(docs)}${cloudQuota?`<br><br>Google-Konto: ${fmtSize(cloudQuota.usage)} von ${fmtSize(cloudQuota.limit)} belegt`:""}</div>`; $("#driveInfo").textContent=accessToken?"Google Drive ist verbunden. Änderungen werden automatisch und zusätzlich alle 30 Sekunden abgeglichen.":"Google Drive ist momentan nicht verbunden. Lokales Arbeiten bleibt möglich."; $("#clientIdDisplay").textContent=CFG.GOOGLE_CLIENT_ID||"Noch nicht in config.js eingetragen"; $("#driveState").textContent=accessToken?"● Drive verbunden":"● Nur lokal"; $("#driveState").style.color=accessToken?"#2f9628":"#667085"; }

function renderSettings(){ const s=db.settings,r=s.reminders; $("#clubName").value=s.clubName||"";$("#userRole").value=s.userRole||"";$("#moduleClub").checked=s.modules.club;$("#moduleDocuments").checked=s.modules.documents;$("#reminderEnabled").checked=r.enabled;$("#infoDays").value=r.infoDays;$("#warningDays").value=r.warningDays;$("#alarmDays").value=r.alarmDays;$("#infoDaysLabel").textContent=r.infoDays;$("#warningDaysLabel").textContent=r.warningDays;$("#alarmDaysLabel").textContent=r.alarmDays;$("#birthdayWeekReminder").checked=r.birthdayWeek;$("#jubileeReminder").checked=r.jubilee;$("#storageLimit").value=s.storageLimitGB||5;$("#compressImages").checked=!!s.compressImages; }
["infoDays","warningDays","alarmDays"].forEach(id=>$("#"+id).addEventListener("input",()=>$("#"+id+"Label").textContent=$("#"+id).value));
$("#saveSettingsBtn").onclick=()=>{ db.settings.clubName=$("#clubName").value.trim();db.settings.userRole=$("#userRole").value.trim();db.settings.modules.club=$("#moduleClub").checked;db.settings.modules.documents=$("#moduleDocuments").checked;db.settings.reminders.enabled=$("#reminderEnabled").checked;db.settings.reminders.infoDays=Number($("#infoDays").value);db.settings.reminders.warningDays=Number($("#warningDays").value);db.settings.reminders.alarmDays=Number($("#alarmDays").value);db.settings.reminders.birthdayWeek=$("#birthdayWeekReminder").checked;db.settings.reminders.jubilee=$("#jubileeReminder").checked;db.settings.storageLimitGB=Number($("#storageLimit").value)||5;db.settings.compressImages=$("#compressImages").checked;db.settingsUpdatedAt=now();saveLocal();applyModuleVisibility();alert("Einstellungen gespeichert."); };

function renderAll(){ applyModuleVisibility(); renderDashboard();renderTasks();renderProjects();renderKanban();renderCalendar();renderYear();renderMembers();renderGroups();renderMeetings();renderDocuments();renderKnowledge();renderStorage();renderSettings(); }

function groupOptions(selected="",excludeId=""){return `<option value="">Gesamtverein / keine Gruppe</option>${activeRows("groups").filter(g=>g.id!==excludeId).map(g=>`<option value="${g.id}" ${g.id===selected?"selected":""}>${esc(g.name)}</option>`).join("")}`}
function projectOptions(selected=""){return `<option value="">Kein Projekt</option>${activeRows("projects").map(p=>`<option value="${p.id}" ${p.id===selected?"selected":""}>${esc(p.name)}</option>`).join("")}`}
function memberOptions(selected=""){return `<option value="">Nicht besetzt</option>${activeRows("members").map(m=>`<option value="${m.id}" ${m.id===selected?"selected":""}>${esc(memberFullName(m))}</option>`).join("")}`}
function showModal(title,body,saveFn){ $("#modalTitle").textContent=title;$("#modalBody").innerHTML=body;const dlg=$("#modal");dlg.showModal();$("#modalSave").onclick=e=>{e.preventDefault();Promise.resolve(saveFn()).then(ok=>{if(ok!==false)dlg.close()})}; }
function readPhoto(fileInput,current=""){ const f=fileInput.files?.[0]; if(!f)return Promise.resolve(current); return new Promise((resolve,reject)=>{const img=new Image(),fr=new FileReader();fr.onload=()=>{img.onload=()=>{const max=320,s=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement("canvas");c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext("2d").drawImage(img,0,0,c.width,c.height);resolve(c.toDataURL("image/jpeg",.72))};img.onerror=reject;img.src=fr.result};fr.onerror=reject;fr.readAsDataURL(f)}); }
function parseKeyValueLines(text,sep="="){return String(text||"").split(/\n+/).map(x=>x.trim()).filter(Boolean).map(line=>{const i=line.indexOf(sep);return i>=0?{key:line.slice(0,i).trim(),value:line.slice(i+1).trim()}:{key:line,value:""}})}
function parseDatedLines(text){return String(text||"").split(/\n+/).map(x=>x.trim()).filter(Boolean).map(line=>{const p=line.split("|");return {title:(p[0]||"").trim(),date:(p[1]||"").trim()}})}
function parseHistory(text){return String(text||"").split(/\n+/).map(x=>x.trim()).filter(Boolean).map(line=>{const p=line.split("|");return {date:(p[0]||"").trim(),note:(p.slice(1).join("|")||"").trim()}})}

function openTaskModal(rec=null){ const r=rec||{status:"open",priority:"mid",title:"",due:"",projectId:"",groupId:""}; showModal(rec?"Aufgabe bearbeiten":"Neue Aufgabe",`<div class="form-grid"><label class="full">Aufgabe<input id="fTitle" value="${esc(r.title)}"></label><label>Fällig<input id="fDue" type="date" value="${esc(r.due||"")}"></label><label>Priorität<select id="fPriority"><option value="high" ${r.priority==="high"?"selected":""}>Hoch</option><option value="mid" ${r.priority==="mid"?"selected":""}>Mittel</option><option value="low" ${r.priority==="low"?"selected":""}>Niedrig</option></select></label><label>Status<select id="fStatus">${["open","doing","wait","done"].map(s=>`<option value="${s}" ${r.status===s?"selected":""}>${statusLabel(s)}</option>`).join("")}</select></label><label>Projekt<select id="fProject">${projectOptions(r.projectId)}</select></label><label class="full">Gruppe<select id="fGroup">${groupOptions(r.groupId)}</select></label></div>`,()=>{const title=$("#fTitle").value.trim();if(!title)return false;const target=rec||{id:uid(),createdAt:now()};Object.assign(target,{title,due:$("#fDue").value,priority:$("#fPriority").value,status:$("#fStatus").value,projectId:$("#fProject").value,groupId:$("#fGroup").value});touch(target);if(!rec)db.tasks.push(target);saveLocal();return true}); }

function openProjectModal(rec=null){ const r=rec||{name:"",due:"",status:"planned",groupId:"",progress:0,description:""}; showModal(rec?"Projekt bearbeiten":"Neues Projekt",`<div class="form-grid"><label class="full">Projektname<input id="fName" value="${esc(r.name)}"></label><label>Zieldatum<input id="fDue" type="date" value="${esc(r.due||"")}"></label><label>Status<select id="fStatus">${["planned","active","paused","closed"].map(s=>`<option value="${s}" ${r.status===s?"selected":""}>${statusLabel(s)}</option>`).join("")}</select></label><label>Gruppe<select id="fGroup">${groupOptions(r.groupId)}</select></label><label>Fortschritt %<input id="fProgress" type="number" min="0" max="100" value="${r.progress||0}"></label><label class="full">Beschreibung<textarea id="fDescription" rows="5">${esc(r.description||"")}</textarea></label></div>`,()=>{const name=$("#fName").value.trim();if(!name)return false;const target=rec||{id:uid(),createdAt:now()};Object.assign(target,{name,due:$("#fDue").value,status:$("#fStatus").value,groupId:$("#fGroup").value,progress:Number($("#fProgress").value)||0,description:$("#fDescription").value});touch(target);if(!rec)db.projects.push(target);saveLocal();return true}); }

function openEventModal(rec=null){ const r=rec||{title:"",date:"",time:"",location:"",groupId:""}; showModal(rec?"Termin bearbeiten":"Neuer Termin",`<div class="form-grid"><label class="full">Titel<input id="fTitle" value="${esc(r.title)}"></label><label>Datum<input id="fDate" type="date" value="${esc(r.date||"")}"></label><label>Uhrzeit<input id="fTime" type="time" value="${esc(r.time||"")}"></label><label>Ort<input id="fLocation" value="${esc(r.location||"")}"></label><label>Gruppe<select id="fGroup">${groupOptions(r.groupId)}</select></label></div>`,()=>{const title=$("#fTitle").value.trim();if(!title)return false;const target=rec||{id:uid(),createdAt:now()};Object.assign(target,{title,date:$("#fDate").value,time:$("#fTime").value,location:$("#fLocation").value,groupId:$("#fGroup").value});touch(target);if(!rec)db.events.push(target);saveLocal();return true}); }

function openMemberModal(rec=null){
  const r=rec||{memberNo:String(db.counters.memberNo).padStart(4,"0"),firstName:"",lastName:"",birthDate:"",status:"active",entryDate:todayStr(),exitDate:"",reentryDate:"",cancelDate:"",deceasedDate:"",honorary:false,email:"",phone:"",address:"",emergencyName:"",emergencyPhone:"",guardian:"",familyName:"",relationships:"",groupIds:[],photoData:"",extraFields:[],history:[],statusHistory:[],honors:[],notes:""};
  const extra=(r.extraFields||[]).map(x=>`${x.key}=${x.value}`).join("\n"), hist=(r.history||[]).map(x=>`${x.date||""}|${x.note||""}`).join("\n"), shist=(r.statusHistory||[]).map(x=>`${x.date||""}|${x.note||x.status||""}`).join("\n"), honors=(r.honors||[]).map(x=>`${x.title||""}|${x.date||""}`).join("\n");
  showModal(rec?"Mitglied bearbeiten":"Neues Mitglied",`<div class="form-grid">
    <div class="form-section">Stammdaten</div>
    <label>Mitgliedsnummer<input id="mNo" value="${esc(r.memberNo)}"></label><label>Status<select id="mStatus"><option value="active" ${r.status==="active"?"selected":""}>Aktiv</option><option value="inactive" ${r.status==="inactive"?"selected":""}>Deaktiviert</option><option value="passive" ${r.status==="passive"?"selected":""}>Passiv</option><option value="deceased" ${r.status==="deceased"?"selected":""}>Verstorben</option></select></label>
    <label>Vorname<input id="mFirst" value="${esc(r.firstName)}"></label><label>Nachname<input id="mLast" value="${esc(r.lastName)}"></label><label>Geburtsdatum<input id="mBirth" type="date" value="${esc(r.birthDate||"")}"></label><label class="checkline"><input id="mHonorary" type="checkbox" ${r.honorary?"checked":""}> Ehrenmitglied</label>
    <label class="full">Mitgliedsfoto<input id="mPhoto" type="file" accept="image/*"></label>
    <div class="form-section">Mitgliedschaft & Historie</div>
    <label>Eintritt<input id="mEntry" type="date" value="${esc(r.entryDate||"")}"></label><label>Austritt<input id="mExit" type="date" value="${esc(r.exitDate||"")}"></label><label>Wiedereintritt<input id="mReentry" type="date" value="${esc(r.reentryDate||"")}"></label><label>Kündigungsdatum<input id="mCancel" type="date" value="${esc(r.cancelDate||"")}"></label><label>Sterbedatum<input id="mDeceased" type="date" value="${esc(r.deceasedDate||"")}"></label><label>Altersgruppe<input disabled value="wird automatisch berechnet"></label>
    <label class="full">Gruppen<select id="mGroups" multiple size="5">${activeRows("groups").map(g=>`<option value="${g.id}" ${(r.groupIds||[]).includes(g.id)?"selected":""}>${esc(g.name)}</option>`).join("")}</select></label>
    <div class="form-section">Kontakt & Familie</div>
    <label>E-Mail<input id="mEmail" type="email" value="${esc(r.email||"")}"></label><label>Telefon<input id="mPhone" value="${esc(r.phone||"")}"></label><label class="full">Adresse<textarea id="mAddress" rows="2">${esc(r.address||"")}</textarea></label><label>Notfallkontakt<input id="mEmergencyName" value="${esc(r.emergencyName||"")}"></label><label>Notfall-Telefon<input id="mEmergencyPhone" value="${esc(r.emergencyPhone||"")}"></label><label>Familie / Haushalt<input id="mFamily" value="${esc(r.familyName||"")}"></label><label>Gesetzliche Vertretung<input id="mGuardian" value="${esc(r.guardian||"")}"></label><label class="full">Beziehungen zu Mitgliedern<textarea id="mRelationships" rows="2" placeholder="z. B. Mutter von Anna; Bruder von Max">${esc(r.relationships||"")}</textarea></label>
    <div class="form-section">Zusatzfelder, Ehrungen & Verlauf</div>
    <label class="full">Frei definierbare Zusatzfelder<textarea id="mExtra" rows="3" placeholder="Trikotgröße=L\nQualifikation=Übungsleiter">${esc(extra)}</textarea></label>
    <label class="full">Ehrungen<textarea id="mHonors" rows="3" placeholder="Ehrennadel Gold|2025-06-01">${esc(honors)}</textarea></label>
    <label class="full">Mitgliedshistorie<textarea id="mHistory" rows="3" placeholder="2026-01-01|In Festausschuss aufgenommen">${esc(hist)}</textarea></label>
    <label class="full">Statushistorie<textarea id="mStatusHistory" rows="3" placeholder="2025-01-01|Aktiv\n2024-01-01|Passiv">${esc(shist)}</textarea></label>
    <label class="full">Notizen<textarea id="mNotes" rows="4">${esc(r.notes||"")}</textarea></label>
    <div class="form-note">Plausibilitätsprüfung: Bei Minderjährigen wird beim Speichern auf eine gesetzliche Vertretung hingewiesen; Austritt/Kündigung werden ebenfalls geprüft.</div>
  </div>`,async()=>{
    const first=$("#mFirst").value.trim(),last=$("#mLast").value.trim(); if(!first&&!last)return false; const birth=$("#mBirth").value,guardian=$("#mGuardian").value.trim(); if(birth&&ageAt(birth)<18&&!guardian&&!confirm("Das Mitglied ist minderjährig, aber es ist keine gesetzliche Vertretung hinterlegt. Trotzdem speichern?"))return false; const entry=$("#mEntry").value,exit=$("#mExit").value,cancel=$("#mCancel").value; if(entry&&exit&&exit<entry&&!confirm("Das Austrittsdatum liegt vor dem Eintrittsdatum. Trotzdem speichern?"))return false; if(cancel&&exit&&cancel>exit&&!confirm("Das Kündigungsdatum liegt nach dem Austrittsdatum. Trotzdem speichern?"))return false;
    const target=rec||{id:uid(),createdAt:now()}; const oldStatus=target.status; const photo=await readPhoto($("#mPhoto"),r.photoData||"");
    Object.assign(target,{memberNo:$("#mNo").value.trim()||String(db.counters.memberNo).padStart(4,"0"),firstName:first,lastName:last,birthDate:birth,status:$("#mStatus").value,entryDate:$("#mEntry").value,exitDate:$("#mExit").value,reentryDate:$("#mReentry").value,cancelDate:$("#mCancel").value,deceasedDate:$("#mDeceased").value,honorary:$("#mHonorary").checked,groupIds:[...$("#mGroups").selectedOptions].map(o=>o.value),email:$("#mEmail").value.trim(),phone:$("#mPhone").value.trim(),address:$("#mAddress").value,emergencyName:$("#mEmergencyName").value.trim(),emergencyPhone:$("#mEmergencyPhone").value.trim(),familyName:$("#mFamily").value.trim(),guardian,relationships:$("#mRelationships").value,photoData:photo,extraFields:parseKeyValueLines($("#mExtra").value),honors:parseDatedLines($("#mHonors").value),history:parseHistory($("#mHistory").value),statusHistory:parseHistory($("#mStatusHistory").value),notes:$("#mNotes").value});
    if(rec&&oldStatus!==target.status){target.statusHistory=target.statusHistory||[];target.statusHistory.push({date:todayStr(),note:`${statusLabel(oldStatus)} → ${statusLabel(target.status)}`})}
    touch(target); if(!rec){db.members.push(target);db.counters.memberNo=Math.max(db.counters.memberNo+1,Number(target.memberNo)+1||db.counters.memberNo+1);selectedMemberId=target.id} saveLocal(); return true;
  });
}
function showMemberCard(m){ $("#detailTitle").textContent="Digitale Mitgliedskarte";$("#detailBody").innerHTML=`<div style="max-width:520px;margin:auto"><div class="member-card-digital" style="padding:24px"><div class="member-card-top"><div><b>V-Planer · ${esc(db.settings.clubName)}</b><div style="font-size:28px;margin-top:16px">${esc(`${m.firstName||""} ${m.lastName||""}`.trim())}</div><small>${esc(effectiveGroupIdsForMember(m).map(groupName).filter(x=>x!=="—").join(" · ")||"Gesamtverein")}</small></div><div style="text-align:right"><b style="font-size:22px">${esc(memberNo(m))}</b><div style="margin-top:15px">${m.honorary?"★ Ehrenmitglied":""}</div></div></div></div></div>`;$("#detailModal").showModal(); }

function openGroupModal(rec=null){ const r=rec||{name:"",type:"Abteilung",parentId:"",description:"",contactMemberId:"",autoRule:{enabled:false,status:"",ageMin:"",ageMax:""}}; const ar=r.autoRule||{}; showModal(rec?"Gruppe bearbeiten":"Neue Gruppe",`<div class="form-grid"><label class="full">Gruppenname<input id="gName" value="${esc(r.name)}"></label><label>Typ<select id="gType">${["Abteilung","Mannschaft","Trainingsgruppe","Vorstand","Ausschuss","Arbeitsgruppe","Projektgruppe"].map(x=>`<option ${r.type===x?"selected":""}>${x}</option>`).join("")}</select></label><label>Übergeordnete Gruppe<select id="gParent">${groupOptions(r.parentId,rec?.id||"")}</select></label><label>Ansprechpartner<select id="gContact">${memberOptions(r.contactMemberId)}</select></label><label class="full">Beschreibung<textarea id="gDescription" rows="4">${esc(r.description||"")}</textarea></label><div class="form-section">Automatische Gruppenzuordnung</div><label class="checkline full"><input id="gAuto" type="checkbox" ${ar.enabled?"checked":""}> Regel aktivieren</label><label>Status<select id="gAutoStatus"><option value="">Alle Status</option><option value="active" ${ar.status==="active"?"selected":""}>Aktiv</option><option value="passive" ${ar.status==="passive"?"selected":""}>Passiv</option><option value="inactive" ${ar.status==="inactive"?"selected":""}>Deaktiviert</option></select></label><label>Mindestalter<input id="gAgeMin" type="number" min="0" max="120" value="${esc(ar.ageMin??"")}"></label><label>Höchstalter<input id="gAgeMax" type="number" min="0" max="120" value="${esc(ar.ageMax??"")}"></label><div class="form-note">Beispiel Jugendgruppe: Aktiv + Höchstalter 17. Mitglieder werden zusätzlich zu manuellen Zuordnungen automatisch berücksichtigt.</div></div>`,()=>{const name=$("#gName").value.trim();if(!name)return false;const target=rec||{id:uid(),createdAt:now()};Object.assign(target,{name,type:$("#gType").value,parentId:$("#gParent").value,contactMemberId:$("#gContact").value,description:$("#gDescription").value,autoRule:{enabled:$("#gAuto").checked,status:$("#gAutoStatus").value,ageMin:$("#gAgeMin").value,ageMax:$("#gAgeMax").value}});touch(target);if(!rec){db.groups.push(target);selectedGroupId=target.id}saveLocal();return true}); }
function openFunctionModal(rec=null,groupId=""){ const r=rec||{title:"",kind:"Vorstandsfunktion",groupId:groupId||"",memberId:"",startDate:"",endDate:"",notes:""}; showModal(rec?"Funktion bearbeiten":"Neue Funktion",`<div class="form-grid"><label class="full">Funktion / Rolle<input id="fnTitle" value="${esc(r.title)}" placeholder="z. B. Vorsitzender, Trainer, Betreuer"></label><label>Art<select id="fnKind">${["Vorstandsfunktion","Trainer","Betreuer","Ansprechpartner","Sonstige Funktion"].map(x=>`<option ${r.kind===x?"selected":""}>${x}</option>`).join("")}</select></label><label>Gruppe<select id="fnGroup">${groupOptions(r.groupId)}</select></label><label>Person<select id="fnMember">${memberOptions(r.memberId)}</select></label><label>Beginn<input id="fnStart" type="date" value="${esc(r.startDate||"")}"></label><label>Ende<input id="fnEnd" type="date" value="${esc(r.endDate||"")}"></label><label class="full">Notizen<textarea id="fnNotes" rows="3">${esc(r.notes||"")}</textarea></label></div>`,()=>{const title=$("#fnTitle").value.trim();if(!title)return false;const target=rec||{id:uid(),createdAt:now()};Object.assign(target,{title,kind:$("#fnKind").value,groupId:$("#fnGroup").value,memberId:$("#fnMember").value,startDate:$("#fnStart").value,endDate:$("#fnEnd").value,notes:$("#fnNotes").value});touch(target);if(!rec)db.functions.push(target);saveLocal();return true}); }
function openMeetingModal(rec=null){ const r=rec||{title:"",date:"",groupId:"",notes:"",decisions:[]}; showModal(rec?"Sitzung bearbeiten":"Neue Sitzung",`<div class="form-grid"><label class="full">Titel<input id="mtTitle" value="${esc(r.title)}"></label><label>Datum<input id="mtDate" type="date" value="${esc(r.date||"")}"></label><label>Gruppe<select id="mtGroup">${groupOptions(r.groupId)}</select></label><label class="full">Tagesordnung / Protokoll<textarea id="mtNotes" rows="6">${esc(r.notes||"")}</textarea></label><label class="full">Beschlüsse – eine Zeile pro Beschluss<textarea id="mtDecisions" rows="4">${esc((r.decisions||[]).join("\n"))}</textarea></label></div>`,()=>{const title=$("#mtTitle").value.trim();if(!title)return false;const target=rec||{id:uid(),createdAt:now()};Object.assign(target,{title,date:$("#mtDate").value,groupId:$("#mtGroup").value,notes:$("#mtNotes").value,decisions:$("#mtDecisions").value.split(/\n+/).map(x=>x.trim()).filter(Boolean)});touch(target);if(!rec)db.meetings.push(target);saveLocal();return true}); }
function openKnowledgeModal(rec=null){ const r=rec||{title:"",groupId:"",text:""}; showModal(rec?"Wissenseintrag bearbeiten":"Neuer Wissenseintrag",`<div class="form-grid"><label class="full">Titel<input id="kTitle" value="${esc(r.title)}"></label><label>Bereich<select id="kGroup">${groupOptions(r.groupId)}</select></label><label class="full">Inhalt<textarea id="kText" rows="7">${esc(r.text||"")}</textarea></label></div>`,()=>{const title=$("#kTitle").value.trim();if(!title)return false;const target=rec||{id:uid(),createdAt:now()};Object.assign(target,{title,groupId:$("#kGroup").value,text:$("#kText").value});touch(target);if(!rec)db.knowledge.push(target);saveLocal();return true}); }

$$('[data-action="new-task"]').forEach(b=>b.onclick=()=>openTaskModal());$$('[data-action="new-project"]').forEach(b=>b.onclick=()=>openProjectModal());$$('[data-action="new-event"]').forEach(b=>b.onclick=()=>openEventModal());$$('[data-action="new-member"]').forEach(b=>b.onclick=()=>openMemberModal());$$('[data-action="new-group"]').forEach(b=>b.onclick=()=>openGroupModal());$$('[data-action="new-meeting"]').forEach(b=>b.onclick=()=>openMeetingModal());$$('[data-action="new-knowledge"]').forEach(b=>b.onclick=()=>openKnowledgeModal());
$("#quickCreateBtn").onclick=()=>openTaskModal();

function mergeCollection(local,cloud){ const map=new Map(); [...(local||[]),...(cloud||[])].forEach(rec=>{const old=map.get(rec.id);if(!old||new Date(rec.updatedAt||0)>=new Date(old.updatedAt||0))map.set(rec.id,rec)});return [...map.values()]; }
function mergeDB(local,cloud){ const out=normalizeDB(local); COLLECTIONS.forEach(c=>out[c]=mergeCollection(local[c],cloud[c])); if(new Date(cloud.settingsUpdatedAt||0)>new Date(local.settingsUpdatedAt||0)){out.settings=normalizeDB(cloud).settings;out.settingsUpdatedAt=cloud.settingsUpdatedAt} out.counters={memberNo:Math.max(local.counters?.memberNo||1,cloud.counters?.memberNo||1)}; out.updatedAt=now(); return out; }
function initTokenClient(){ if(!CFG.GOOGLE_CLIENT_ID)throw new Error("Bitte zuerst GOOGLE_CLIENT_ID in config.js eintragen."); if(!window.google?.accounts?.oauth2)throw new Error("Google Identity Services noch nicht geladen. Internetverbindung prüfen."); if(!tokenClient)tokenClient=google.accounts.oauth2.initTokenClient({client_id:CFG.GOOGLE_CLIENT_ID,scope:SCOPES,callback:async r=>{if(r.error){alert(`Google-Anmeldung fehlgeschlagen: ${r.error}`);return}accessToken=r.access_token;$("#lastSync").textContent="Drive verbunden";renderStorage();try{await refreshQuota();await syncDrive(false);startPoll()}catch(e){console.warn(e)}}}); return tokenClient; }
function connectDrive(){ try{initTokenClient().requestAccessToken({prompt:""})}catch(e){alert(e.message)} }
$("#connectDriveBtn").onclick=connectDrive;
async function driveFetch(url,opt={}){ const h=new Headers(opt.headers||{});h.set("Authorization",`Bearer ${accessToken}`);const r=await fetch(url,{...opt,headers:h});if(r.status===401){accessToken="";renderStorage();throw new Error("Google-Zugriff abgelaufen. Bitte Drive erneut verbinden.")}if(!r.ok)throw new Error(`Drive-Fehler ${r.status}: ${(await r.text()).slice(0,180)}`);return r; }
async function findAppData(){ const q=encodeURIComponent(`name='${APPDATA_FILE}' and trashed=false`);const j=await (await driveFetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id,name,modifiedTime)&pageSize=10`)).json();return j.files?.[0]||null; }
async function createAppData(){ const j=await (await driveFetch("https://www.googleapis.com/drive/v3/files?fields=id",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:APPDATA_FILE,parents:["appDataFolder"],mimeType:"application/json"})})).json();return j.id; }
async function uploadAppData(id,data=db){ await driveFetch(`https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)}); }
async function downloadAppData(id){ return await (await driveFetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`)).json(); }
async function syncDrive(silent=false){ if(!accessToken){if(!silent)connectDrive();return} if(!silent)$("#lastSync").textContent="Synchronisiere …"; let f=await findAppData(); if(!f){const id=await createAppData();await uploadAppData(id);$("#lastSync").textContent=`Erster Cloud-Stand · ${new Date().toLocaleTimeString("de-DE")}`;return} const cloud=normalizeDB(await downloadAppData(f.id)); const merged=mergeDB(db,cloud); db=merged;localStorage.setItem(STORAGE_KEY,JSON.stringify(db));await uploadAppData(f.id,db);renderAll();$("#lastSync").textContent=`Aktuell · ${new Date().toLocaleTimeString("de-DE")}`; }
function startPoll(){ clearInterval(window.__vpPoll);window.__vpPoll=setInterval(()=>{if(accessToken)syncDrive(true).catch(()=>{})},Math.max(15,CFG.AUTO_SYNC_SECONDS||30)*1000); }
$("#syncBtn").onclick=()=>syncDrive(false).catch(e=>alert(e.message));$("#syncNowBtn").onclick=()=>syncDrive(false).catch(e=>alert(e.message));
async function refreshQuota(){ try{const j=await (await driveFetch("https://www.googleapis.com/drive/v3/about?fields=storageQuota")).json(); if(j.storageQuota)cloudQuota={usage:Number(j.storageQuota.usage)||0,limit:Number(j.storageQuota.limit)||0};renderStorage()}catch{} }

async function ensureRootFolder(){ if(rootFolderId)return rootFolderId;const name=CFG.ROOT_FOLDER_NAME||"Vereinsplanung",q=encodeURIComponent(`name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`),j=await (await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&pageSize=10`)).json();if(j.files?.[0])return rootFolderId=j.files[0].id;const c=await (await driveFetch("https://www.googleapis.com/drive/v3/files?fields=id",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,mimeType:"application/vnd.google-apps.folder"})})).json();return rootFolderId=c.id; }
async function ensureSubFolder(name){ const root=await ensureRootFolder(),q=encodeURIComponent(`name='${name}' and '${root}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`),j=await (await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)&pageSize=10`)).json();if(j.files?.[0])return j.files[0].id;return (await (await driveFetch("https://www.googleapis.com/drive/v3/files?fields=id",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,mimeType:"application/vnd.google-apps.folder",parents:[root]})})).json()).id; }
async function compressImage(file){ if(!db.settings.compressImages||!file.type.startsWith("image/"))return file;const img=await createImageBitmap(file),max=1600,scale=Math.min(1,max/Math.max(img.width,img.height)),canvas=document.createElement("canvas");canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);const blob=await new Promise(r=>canvas.toBlob(r,"image/jpeg",.76));return new File([blob],file.name.replace(/\.[^.]+$/,"")+".jpg",{type:"image/jpeg"}); }
async function uploadDocument(file,category){ if(!accessToken)throw new Error("Zuerst Google Drive verbinden.");const f=await compressImage(file),current=estimateLocalBytes()+activeRows("documents").reduce((s,d)=>s+(d.size||0),0),limit=(db.settings.storageLimitGB||5)*1024**3;if(current+f.size>limit)throw new Error("Eigenes Speicherlimit würde überschritten.");const folder=await ensureSubFolder(category),boundary=`vp_${Date.now()}`,meta={name:f.name,parents:[folder]},body=new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: ${f.type||"application/octet-stream"}\r\n\r\n`,f,`\r\n--${boundary}--`]);const j=await (await driveFetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,createdTime,webViewLink",{method:"POST",headers:{"Content-Type":`multipart/related; boundary=${boundary}`},body})).json();db.documents.unshift({id:j.id,name:j.name,size:Number(j.size)||f.size,category,createdAt:j.createdTime||now(),webViewLink:j.webViewLink||"",updatedAt:now()});saveLocal(); }
$("#uploadBtn").onclick=async()=>{try{const files=[...$("#fileInput").files];if(!files.length)return alert("Bitte Datei auswählen.");for(const f of files)await uploadDocument(f,$("#docCategory").value);$("#fileInput").value="";alert("Upload abgeschlossen.")}catch(e){alert(e.message)}};

if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
renderAll();
})();
