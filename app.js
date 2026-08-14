(() => {
"use strict";

const CFG = window.VP_CONFIG || {};
const STORAGE_KEY = "v-planer-cloud-v1.0";
const DRIVE_GRANT_KEY = "v-planer-drive-grant-known-v1";
const APPDATA_FILE = "v-planer-data-v1.0.json";
const SCOPES = "https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file";
const COLLECTIONS = ["tasks","projects","events","members","groups","functions","meetings","knowledge","documents","folders"];

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
      clubName:"Mein Verein", userRole:"Vorstand", uiScale:100, storageLimitGB:CFG.DEFAULT_STORAGE_LIMIT_GB||5, compressImages:true,
      modules:{club:true,documents:true},
      groupTypes:["Abteilung","Mannschaft","Trainingsgruppe","Vorstand","Ausschuss","Arbeitsgruppe","Projektgruppe"],
      reminders:{enabled:true,infoDays:14,warningDays:7,alarmDays:2,birthdayWeek:true,jubilee:true}
    },
    counters:{memberNo:1},
    tasks:[],projects:[],events:[],members:[],groups:[],functions:[],meetings:[],knowledge:[],documents:[],folders:[]
  };
}
function normalizeDB(data){
  const base=defaultDB(), out={...base,...(data||{})};
  out.settings={...base.settings,...(data?.settings||{})};
  out.settings.uiScale=Math.min(125,Math.max(80,Number(out.settings.uiScale)||100));
  out.settings.modules={...base.settings.modules,...(data?.settings?.modules||{})};
  out.settings.groupTypes=Array.isArray(data?.settings?.groupTypes)
    ? data.settings.groupTypes.map(x=>String(x||"").trim()).filter(Boolean)
    : [...base.settings.groupTypes];
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
  db.folders=[
    {id:"fld-m-vorstand",area:"meetings",name:"Vorstand",parentId:"",updatedAt:now()},
    {id:"fld-m-2026",area:"meetings",name:"2026",parentId:"fld-m-vorstand",updatedAt:now()},
    {id:"fld-d-vertraege",area:"documents",name:"Verträge",parentId:"",updatedAt:now()},
    {id:"fld-d-versicherungen",area:"documents",name:"Versicherungen",parentId:"",updatedAt:now()},
    {id:"fld-k-ablauf",area:"knowledge",name:"Abläufe",parentId:"",updatedAt:now()}
  ];
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
  db.projects=[{id:"p1",name:"Sommerfest",due:plus(9),status:"active",groupId:"",description:"Planung des jährlichen Sommerfests",updatedAt:now()},{id:"p2",name:"Mitgliederversammlung",due:plus(26),status:"active",groupId:"",description:"JHV vorbereiten und durchführen",updatedAt:now()}];
  db.tasks=[{id:"t1",title:"Genehmigung Sommerfest prüfen",due:plus(1),priority:"high",projectId:"p1",groupId:"",status:"doing",updatedAt:now()},{id:"t2",title:"Einladung Mitgliederversammlung",due:plus(6),priority:"mid",projectId:"p2",groupId:"",status:"open",updatedAt:now()},{id:"t3",title:"Rückmeldung Getränkehändler",due:plus(3),priority:"mid",projectId:"p1",groupId:"",status:"wait",updatedAt:now()}];
  db.events=[{id:"e1",title:"Vorstandssitzung",date:plus(2),startDate:plus(2),endDate:plus(2),time:"19:00",startTime:"19:00",endTime:"21:00",location:"Vereinsheim",groupId:"",color:"#7a5cc7",updatedAt:now()},{id:"e2",title:"Vereinswochenende",date:plus(9),startDate:plus(9),endDate:plus(11),time:"10:00",startTime:"10:00",endTime:"16:00",location:"Sportplatz",groupId:"",color:"#2f9628",updatedAt:now()}];
  db.meetings=[{id:"meet1",title:"Vorstandssitzung August",date:plus(2),groupId:"",folderId:"fld-m-2026",notes:"Sommerfest, Mitgliederentwicklung, Hallenbelegung",decisions:["Sommerfest wie geplant durchführen"],updatedAt:now()}];
  db.knowledge=[{id:"k1",title:"JHV vorbereiten",groupId:"",folderId:"fld-k-ablauf",text:"Einladung fristgerecht versenden, Tagesordnung abstimmen, Protokollvorlage vorbereiten.",updatedAt:now()}];
  db.counters.memberNo=4; db.updatedAt=now();
}
let selectedMemberId = null, selectedGroupId = null, calDate = new Date();
let memberSort = {key:"name",dir:"asc"};
let taskSort = {key:"due",dir:"asc"};
let selectedFolderByArea = {meetings:"",documents:"",knowledge:""};
const AREA_META = {
  meetings:{label:"Sitzungen & Beschlüsse",driveName:"Sitzungen und Beschlüsse"},
  documents:{label:"Dokumente & Bilder",driveName:"Dokumente und Bilder"},
  knowledge:{label:"Vereinswissen",driveName:"Vereinswissen"},
  tasks:{label:"Aufgaben",driveName:"Aufgaben"}
};
let accessToken="", tokenClient=null, rootFolderId="", syncTimer=null, cloudQuota=null, driveAreaFolderIds={};
let tokenExpiresAt=0, tokenWaiter=null;

function allRows(collection){ return db[collection].filter(x=>!x.deletedAt); }
function activeRows(collection){
  const rows=allRows(collection);
  return (collection==="tasks"||collection==="projects")?rows.filter(x=>!x.archivedAt):rows;
}
function archivedRows(collection){
  if(collection!=="tasks"&&collection!=="projects")return [];
  return allRows(collection).filter(x=>!!x.archivedAt);
}
function recordById(collection,id){ return allRows(collection).find(x=>x.id===id); }
function byId(collection,id){ return activeRows(collection).find(x=>x.id===id); }
function touch(rec){ rec.updatedAt=now(); return rec; }
function markDeleted(collection,id){ const r=db[collection].find(x=>x.id===id); if(r){r.deletedAt=now();r.updatedAt=r.deletedAt;} }
function saveLocal(opts={}){
  db.updatedAt=now(); localStorage.setItem(STORAGE_KEY,JSON.stringify(db)); renderAll();
  if(opts.autoSync!==false && accessToken) scheduleAutoSync();
}
function applyUiScale(value=db.settings?.uiScale||100){
  const scale=Math.min(125,Math.max(80,Number(value)||100));
  document.documentElement.style.setProperty("--ui-scale",String(scale/100));
  document.documentElement.dataset.uiScale=String(scale);
  const label=$("#uiScaleLabel");
  if(label)label.textContent=`${scale}%`;
}
function backupFileName(prefix="V-Planer_Backup"){
  const d=new Date();
  const stamp=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}_${String(d.getHours()).padStart(2,"0")}-${String(d.getMinutes()).padStart(2,"0")}`;
  return `${prefix}_${stamp}.json`;
}
function buildBackupPayload(){
  return {
    format:"V-Planer-Backup",
    backupVersion:1,
    appVersion:"1.0",
    exportedAt:now(),
    data:db
  };
}
function downloadJsonFile(data,fileName){
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download=fileName;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function exportFullBackup(prefix="V-Planer_Backup"){
  downloadJsonFile(buildBackupPayload(),backupFileName(prefix));
}
function validateBackupPayload(payload){
  if(!payload||typeof payload!=="object")throw new Error("Die ausgewählte Datei enthält kein gültiges V-Planer-Backup.");
  const raw=payload.format==="V-Planer-Backup"?payload.data:payload;
  if(!raw||typeof raw!=="object")throw new Error("Im Backup wurden keine V-Planer-Daten gefunden.");
  const required=["tasks","projects","events","members","groups","functions","meetings","knowledge","documents"];
  const missing=required.filter(k=>!Array.isArray(raw[k]));
  if(missing.length)throw new Error(`Das Backup ist unvollständig. Fehlende Bereiche: ${missing.join(", ")}`);
  return normalizeDB(raw);
}
async function importFullBackup(file){
  if(!file)return;
  let parsed;
  try{
    parsed=JSON.parse(await file.text());
  }catch{
    throw new Error("Die Backup-Datei konnte nicht gelesen werden. Bitte eine gültige JSON-Datei auswählen.");
  }
  const imported=validateBackupPayload(parsed);

  const members=imported.members.filter(x=>!x.deletedAt).length;
  const projects=imported.projects.filter(x=>!x.deletedAt).length;
  const tasks=imported.tasks.filter(x=>!x.deletedAt).length;
  const events=imported.events.filter(x=>!x.deletedAt).length;

  const ok=confirm(
    `Backup wirklich importieren?\n\n`+
    `Enthalten: ${members} Mitglieder, ${projects} Projekte, ${tasks} Aufgaben, ${events} Termine.\n\n`+
    `Der aktuelle V-Planer-Datenstand auf diesem Gerät wird vollständig ersetzt. `+
    `Vorher wird automatisch ein Sicherungsbackup des aktuellen Standes heruntergeladen.`
  );
  if(!ok)return false;

  // Safety snapshot before destructive replacement.
  exportFullBackup("V-Planer_Vor_Import");

  db=imported;
  db.updatedAt=now();
  db.settingsUpdatedAt=now();
  localStorage.setItem(STORAGE_KEY,JSON.stringify(db));
  selectedMemberId=null;
  selectedGroupId=null;
  selectedFolderByArea={meetings:"",documents:"",knowledge:""};
  applyUiScale();
  renderAll();

  if(hasUsableAccessToken()){
    try{
      await syncDrive(false);
    }catch(e){
      console.warn("Backup importiert, Cloud-Sync danach fehlgeschlagen:",e);
    }
  }
  alert("Backup wurde erfolgreich importiert.");
  return true;
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
function memberNoKey(value){
  const v=String(value??"").trim();
  if(/^\d+$/.test(v))return `n:${Number(v)}`;
  return `s:${v.toLocaleLowerCase("de-DE")}`;
}
function usedMemberNumberKeys(excludeMemberId=""){
  return new Set(activeRows("members")
    .filter(m=>m.id!==excludeMemberId&&String(m.memberNo||"").trim())
    .map(m=>memberNoKey(m.memberNo)));
}
function nextAvailableMemberNo(){
  const used=usedMemberNumberKeys();
  let n=1;
  while(used.has(`n:${n}`))n++;
  const numericWidths=activeRows("members")
    .map(m=>String(m.memberNo||"").trim())
    .filter(v=>/^\d+$/.test(v))
    .map(v=>v.length);
  const width=Math.max(4,...numericWidths,4);
  return String(n).padStart(width,"0");
}
function memberNoAvailable(value,excludeMemberId=""){
  const v=String(value??"").trim();
  return !!v && !usedMemberNumberKeys(excludeMemberId).has(memberNoKey(v));
}
function groupName(id){ return byId("groups",id)?.name || "—"; }
function effectiveGroupIdsForMember(m){ const ids=new Set(m.groupIds||[]); activeRows("groups").forEach(g=>{if(autoRuleMatches(m,g))ids.add(g.id)}); return [...ids]; }
function projectName(id){ return byId("projects",id)?.name || "—"; }
function projectNameAny(id){ return recordById("projects",id)?.name || "—"; }
function projectTasks(projectId){
  // Archivierte erledigte Aufgaben zählen weiterhin zum Projektfortschritt.
  return allRows("tasks").filter(t=>t.projectId===projectId);
}
function projectProgress(projectOrId){
  const id=typeof projectOrId==="string"?projectOrId:projectOrId?.id;
  if(!id)return 0;
  const tasks=projectTasks(id);
  if(!tasks.length)return 0;
  return Math.round(tasks.filter(t=>t.status==="done").length/tasks.length*100);
}
function projectTaskStats(projectId){
  const tasks=projectTasks(projectId),
        done=tasks.filter(t=>t.status==="done").length,
        archived=tasks.filter(t=>!!t.archivedAt).length;
  return {total:tasks.length,done,open:tasks.length-done,archived,progress:tasks.length?Math.round(done/tasks.length*100):0};
}

function taskAttachments(taskId){
  return activeRows("documents").filter(d=>(d.area||"documents")==="tasks"&&d.taskId===taskId);
}
function taskAttachmentRows(taskId){
  const rows=taskAttachments(taskId).slice().sort((a,b)=>String(b.createdAt||"").localeCompare(String(a.createdAt||"")));
  if(!rows.length)return `<div class="task-attachment-empty">Noch keine Dateien zu dieser Aufgabe abgelegt.</div>`;
  return rows.map(d=>`<div class="task-attachment-row">
    <div class="task-attachment-info">
      <span class="task-attachment-icon">📎</span>
      <div><b>${esc(d.name)}</b><small>${fmtSize(d.size||0)} · ${esc(fileTypeLabel(d))}</small></div>
    </div>
    <div class="task-attachment-actions">
      ${d.webViewLink?`<a class="action-link" href="${esc(d.webViewLink)}" target="_blank" rel="noopener">Öffnen</a>`:""}
      <button class="action-link danger-text" type="button" data-delete-task-attachment="${d.id}">Löschen</button>
    </div>
  </div>`).join("");
}
async function ensureTaskDriveFolder(task){
  const base=await ensureAreaDriveFolder("tasks");
  if(task.driveFolderId)return task.driveFolderId;
  const safeNo=String(task.id||"").slice(0,8);
  const folderName=`${task.title||"Aufgabe"}${safeNo?` (${safeNo})`:""}`;
  task.driveFolderId=await ensureNamedDriveFolder(folderName,base);
  touch(task);
  localStorage.setItem(STORAGE_KEY,JSON.stringify(db));
  return task.driveFolderId;
}
async function uploadTaskAttachment(file,task){
  if(!task?.id)throw new Error("Aufgabe muss zuerst gespeichert werden.");
  if(!hasUsableAccessToken())await ensureDriveAccess();

  const f=await compressImage(file),
        current=estimateLocalBytes()+activeRows("documents").reduce((s,d)=>s+(d.size||0),0),
        limit=(db.settings.storageLimitGB||5)*1024**3;
  if(current+f.size>limit)throw new Error("Eigenes Speicherlimit würde überschritten.");

  const targetFolder=await ensureTaskDriveFolder(task);
  const boundary=`vp_task_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const meta={name:f.name,parents:[targetFolder]};
  const body=new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n`,
    `--${boundary}\r\nContent-Type: ${f.type||"application/octet-stream"}\r\n\r\n`,
    f,
    `\r\n--${boundary}--`
  ]);

  const j=await (await driveFetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,createdTime,webViewLink,mimeType,parents",
    {method:"POST",headers:{"Content-Type":`multipart/related; boundary=${boundary}`},body}
  )).json();

  db.documents.unshift({
    id:j.id,name:j.name,size:Number(j.size)||f.size,
    area:"tasks",taskId:task.id,folderId:"",
    category:"Aufgabenanlage",mimeType:j.mimeType||f.type||"",
    createdAt:j.createdTime||now(),webViewLink:j.webViewLink||"",updatedAt:now()
  });
  saveLocal();
}
async function deleteTaskAttachment(documentId){
  const d=byId("documents",documentId);
  if(!d)return;
  if(!confirm(`Datei „${d.name}“ wirklich löschen?\n\nSie wird in den Papierkorb von Google Drive verschoben.`))return;
  if(!hasUsableAccessToken())await ensureDriveAccess();
  await driveFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(d.id)}?fields=id,trashed`,{
    method:"PATCH",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({trashed:true})
  });
  markDeleted("documents",d.id);
  saveLocal();
}

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

function pageMeta(view){return({dashboard:["Übersicht","Heute, diese Woche und alles Wichtige im Blick."],tasks:["Aufgaben","Offene Punkte, Zuständigkeiten und Fälligkeiten."],projects:["Projekte","Vorhaben wie in einer Projektzentrale planen und verfolgen."],kanban:["Kanban","Offen, In Arbeit, Warten und Erledigt."],calendar:["Kalender","Termine, Geburtstage und Vereinsereignisse."],year:["Vereinsjahr","Das Vereinsjahr auf einen Blick."],archive:["Archiv","Abgeschlossene Aufgaben und Projekte übersichtlich aufbewahren."],members:["Mitglieder","Stammdaten, Historie, Beziehungen, Ehrungen und Erinnerungen."],groups:["Gruppen","Gruppen, Untergruppen, Funktionen, Mannschaften und Statistiken."],meetings:["Sitzungen & Beschlüsse","Tagesordnungen, Protokolle und Entscheidungen."],documents:["Dokumente & Bilder","Quittungen, Protokolle, PDFs und Fotos."],knowledge:["Vereinswissen","Abläufe, Ansprechpartner und Erfahrungswissen."],storage:["Speicher & Sync","Google Drive, Datenvolumen und Synchronisation."],settings:["Einstellungen","Module, Warnungen und Grundkonfiguration."]})[view]||[view,""]}
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

  const list=open.slice().sort((a,b)=>(a.due||"9999").localeCompare(b.due||"9999"));
  $("#dashboardTasks").innerHTML=list.length?list.map(t=>`<div class="mini-row"><input type="checkbox" data-finish-task="${t.id}"><div><div class="mini-title">${esc(t.title)}</div><div class="mini-meta">${esc(projectName(t.projectId))} · ${esc(groupName(t.groupId))}</div></div><span class="badge ${reminderClass(t.due)}">${esc(dueText(t.due))}</span></div>`).join(""):`<div class="empty">Keine offenen Aufgaben.</div>`;
  $$('[data-finish-task]').forEach(el=>el.onchange=()=>{const t=byId("tasks",el.dataset.finishTask);if(t){t.status="done";touch(t);saveLocal()}});

  const ps=projects.filter(p=>p.status!=="closed").sort((a,b)=>(a.due||"9999").localeCompare(b.due||"9999"));
  $("#dashboardProjects").innerHTML=ps.length?ps.map(p=>{const st=projectTaskStats(p.id);return `<div class="project-mini"><div class="row"><div><div class="mini-title">${esc(p.name)}</div><div class="mini-meta">${esc(groupName(p.groupId))} · ${st.done}/${st.total} Aufgaben erledigt</div></div><span class="project-days ${projectDayClass(p.due)}">${esc(dueText(p.due))}</span></div><div class="progress"><span style="width:${st.progress}%"></span></div><div class="mini-meta" style="text-align:right">${st.progress}%</div></div>`}).join(""):`<div class="empty">Noch keine Projekte.</div>`;

  const birthdays=[...bdays.slice(0,5),...upcomingJubilees(30).slice(0,3)];
  $("#dashboardBirthdays").innerHTML=birthdays.length?birthdays.map(m=>m._years?`<div class="birthday-row"><div class="person-dot">★</div><div><div class="mini-title">${esc(memberFullName(m))}</div><div class="mini-meta">${m._years}. Vereinsjubiläum · ${m._days===0?"heute":`in ${m._days} Tagen`}</div></div></div>`:`<div class="birthday-row"><div class="person-dot">🎂</div><div><div class="mini-title">${esc(memberFullName(m))}</div><div class="mini-meta">${m._days===0?"Heute Geburtstag":m._days===1?"Morgen Geburtstag":`in ${m._days} Tagen`} · wird ${ageAt(m.birthDate,new Date(new Date().setDate(new Date().getDate()+m._days)))+1}</div></div></div>`).join(""):`<div class="empty">Keine Geburtstage oder Jubiläen in Kürze.</div>`;

  const ev=activeRows("events")
    .filter(e=>eventEndDate(e)>=todayStr())
    .sort((a,b)=>eventStartDate(a).localeCompare(eventStartDate(b)))
    .slice(0,5);
  $("#dashboardEvents").innerHTML=ev.length?ev.map(e=>eventRowHTML(e)).join(""):`<div class="empty">Keine kommenden Termine.</div>`;
  bindEventOpeners($("#dashboardEvents"));
  renderDashboardStorage();
}
function projectDayClass(date){const c=reminderClass(date);return c.includes("alarm")?"alarm":c.includes("warning")?"warning":c.includes("info")?"info":"ok"}
function eventStartDate(e){ return e.startDate||e.date||""; }
function eventEndDate(e){ return e.endDate||eventStartDate(e); }
function eventStartTime(e){ return e.startTime||e.time||""; }
function eventEndTime(e){ return e.endTime||""; }
function eventIsMultiDay(e){ return !!eventStartDate(e)&&!!eventEndDate(e)&&eventEndDate(e)!==eventStartDate(e); }
function eventOccursOn(e,dateStr){
  const start=eventStartDate(e),end=eventEndDate(e);
  return !!start && dateStr>=start && dateStr<=(end||start);
}
function eventDateRangeText(e){
  const start=eventStartDate(e),end=eventEndDate(e);
  if(!start)return "Kein Datum";
  if(!end||end===start)return fmtDate(start);
  return `${fmtDate(start)} – ${fmtDate(end)}`;
}
function eventTimeRangeText(e){
  const start=eventStartTime(e),end=eventEndTime(e);
  if(start&&end)return `${start} – ${end} Uhr`;
  if(start)return `${start} Uhr`;
  if(end)return `bis ${end} Uhr`;
  return "";
}
function eventColor(e){ return /^#[0-9a-f]{6}$/i.test(e?.color||"")?e.color:"#1677c8"; }
function colorWithAlpha(hex,alpha=.14){
  const h=String(hex||"").replace("#","");
  if(!/^[0-9a-f]{6}$/i.test(h))return `rgba(22,119,200,${alpha})`;
  const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
  return `rgba(${r},${g},${b},${alpha})`;
}
function eventRowHTML(e){
  const start=eventStartDate(e);
  const d=start?new Date(`${start}T12:00:00`):new Date();
  const range=eventIsMultiDay(e)?eventDateRangeText(e):"";
  const time=eventTimeRangeText(e),color=eventColor(e);
  return `<button type="button" class="event-row event-row-button" data-open-event="${e.id}" style="--event-color:${color};--event-soft:${colorWithAlpha(color,.12)}">
    <div class="date-box event-date-box">${start?String(d.getDate()).padStart(2,"0"):"—"}<small>${start?d.toLocaleDateString("de-DE",{month:"short"}).toUpperCase():""}</small></div>
    <div>
      <div class="mini-title">${esc(e.title)}</div>
      <div class="mini-meta">${range?`${esc(range)} · `:""}${time?esc(time):""}${e.location?`${time?" · ":""}${esc(e.location)}`:""}</div>
    </div>
  </button>`;
}
function bindEventOpeners(scope=document){
  scope.querySelectorAll?.("[data-open-event]")?.forEach(el=>el.onclick=()=>{
    const e=byId("events",el.dataset.openEvent);
    if(e)showEventDetails(e);
  });
}
function renderDashboardStorage(){ const local=estimateLocalBytes(),docs=activeRows("documents").reduce((s,d)=>s+(d.size||0),0),total=local+docs,limit=(db.settings.storageLimitGB||5)*1024**3,pct=Math.min(100,Math.round(total/limit*100)); $("#dashboardStorage").innerHTML=`<div class="ring" data-text="${fmtSize(total)}"></div><div class="storage-caption">${pct}% von ${db.settings.storageLimitGB||5} GB eigenem Limit<br>${accessToken?"Drive verbunden":"Nur lokal"}</div>`; }

function archiveTask(taskId,{fromProject=false}={}){
  const t=recordById("tasks",taskId);
  if(!t||t.archivedAt)return false;
  if(t.status!=="done"){
    alert("Nur erledigte Aufgaben können archiviert werden.");
    return false;
  }
  t.archivedAt=now();
  if(fromProject&&t.projectId)t.archivedByProjectId=t.projectId;
  touch(t);
  saveLocal();
  return true;
}
function restoreTask(taskId){
  const t=recordById("tasks",taskId);
  if(!t||!t.archivedAt)return;
  delete t.archivedAt;
  delete t.archivedByProjectId;
  touch(t);
  saveLocal();
}
function archiveProject(projectId){
  const p=recordById("projects",projectId);
  if(!p||p.archivedAt)return false;
  if(p.status!=="closed"){
    alert("Nur abgeschlossene Projekte können archiviert werden.");
    return false;
  }

  const linked=projectTasks(p.id);
  const unfinished=linked.filter(t=>t.status!=="done");
  if(unfinished.length){
    alert(`Das Projekt kann noch nicht archiviert werden.\n\n${unfinished.length} zugehörige Aufgabe${unfinished.length===1?" ist":"n sind"} noch nicht erledigt.`);
    return false;
  }

  const message=linked.length
    ?`Projekt „${p.name}“ archivieren?\n\nDas Projekt und ${linked.filter(t=>!t.archivedAt).length} noch nicht archivierte erledigte Aufgabe${linked.filter(t=>!t.archivedAt).length===1?"":"n"} werden aus den aktiven Ansichten ins Archiv verschoben.`
    :`Projekt „${p.name}“ archivieren?`;

  if(!confirm(message))return false;

  const stamp=now();
  linked.forEach(t=>{
    if(!t.archivedAt){
      t.archivedAt=stamp;
      t.archivedByProjectId=p.id;
      touch(t);
    }
  });
  p.archivedAt=stamp;
  touch(p);
  saveLocal();
  return true;
}
function restoreProject(projectId){
  const p=recordById("projects",projectId);
  if(!p||!p.archivedAt)return;

  delete p.archivedAt;
  touch(p);

  // Nur Aufgaben zurückholen, die beim Archivieren dieses Projekts automatisch mitarchiviert wurden.
  allRows("tasks").filter(t=>t.archivedByProjectId===p.id).forEach(t=>{
    delete t.archivedAt;
    delete t.archivedByProjectId;
    touch(t);
  });
  saveLocal();
}
function archiveDateText(value){
  if(!value)return "—";
  const d=new Date(value);
  return Number.isNaN(d.getTime())?"—":d.toLocaleString("de-DE",{dateStyle:"short",timeStyle:"short"});
}
function renderArchive(){
  const tasks=archivedRows("tasks").slice().sort((a,b)=>String(b.archivedAt||"").localeCompare(String(a.archivedAt||"")));
  const projects=archivedRows("projects").slice().sort((a,b)=>String(b.archivedAt||"").localeCompare(String(a.archivedAt||"")));

  $("#archiveTaskCount").textContent=tasks.length;
  $("#archiveProjectCount").textContent=projects.length;

  $("#archiveTasks").innerHTML=tasks.length?tasks.map(t=>`
    <div class="archive-item">
      <div class="archive-icon">✅</div>
      <div class="archive-copy">
        <b>${esc(t.title)}</b>
        <span>${esc(projectNameAny(t.projectId))} · ${esc(groupName(t.groupId))}</span>
        ${t.description?`<small>${esc(t.description)}</small>`:""}
        <em>Archiviert ${esc(archiveDateText(t.archivedAt))}${taskAttachments(t.id).length?` · 📎 ${taskAttachments(t.id).length}`:""}</em>
      </div>
      <button class="btn tiny secondary" type="button" data-restore-task="${t.id}">Wiederherstellen</button>
    </div>`).join(""):`<div class="empty">Keine archivierten Aufgaben.</div>`;

  $("#archiveProjects").innerHTML=projects.length?projects.map(p=>{
    const st=projectTaskStats(p.id);
    return `<div class="archive-item archive-project-item">
      <div class="archive-icon">📁</div>
      <div class="archive-copy">
        <b>${esc(p.name)}</b>
        <span>${esc(groupName(p.groupId))} · Ziel ${fmtDate(p.due)}</span>
        ${p.description?`<small>${esc(p.description)}</small>`:""}
        <em>Archiviert ${esc(archiveDateText(p.archivedAt))} · ${st.done}/${st.total} Aufgaben erledigt</em>
      </div>
      <button class="btn tiny secondary" type="button" data-restore-project="${p.id}">Wiederherstellen</button>
    </div>`;
  }).join(""):`<div class="empty">Keine archivierten Projekte.</div>`;

  $$("[data-restore-task]").forEach(btn=>btn.onclick=()=>{
    if(confirm("Aufgabe wieder in die aktive Aufgabenliste verschieben?"))restoreTask(btn.dataset.restoreTask);
  });
  $$("[data-restore-project]").forEach(btn=>btn.onclick=()=>{
    if(confirm("Projekt wieder in die aktive Projektliste verschieben? Automatisch mitarchivierte Projektaufgaben werden ebenfalls wiederhergestellt."))restoreProject(btn.dataset.restoreProject);
  });
}

function taskPriorityRank(priority){
  return ({high:3,mid:2,low:1})[priority]||0;
}
function taskStatusRank(status){
  return ({open:1,doing:2,wait:3,done:4})[status]||99;
}
function taskSortValue(t,key){
  if(key==="title")return String(t.title||"").toLocaleLowerCase("de-DE");
  if(key==="project")return String(projectName(t.projectId)||"").toLocaleLowerCase("de-DE");
  if(key==="group")return String(groupName(t.groupId)||"").toLocaleLowerCase("de-DE");
  if(key==="due")return t.due||"9999-12-31";
  if(key==="priority")return taskPriorityRank(t.priority);
  if(key==="status")return taskStatusRank(t.status);
  return "";
}
function compareTaskValues(a,b){
  if(typeof a==="number"&&typeof b==="number")return a-b;
  return String(a).localeCompare(String(b),"de",{numeric:true,sensitivity:"base"});
}
function sortTasks(rows){
  const dir=taskSort.dir==="desc"?-1:1,key=taskSort.key;
  return rows.slice().sort((a,b)=>{
    const c=compareTaskValues(taskSortValue(a,key),taskSortValue(b,key));
    if(c!==0)return c*dir;
    return String(a.title||"").localeCompare(String(b.title||""),"de",{sensitivity:"base"});
  });
}
function updateTaskSortUI(){
  $$("[data-task-sort]").forEach(btn=>{
    const active=btn.dataset.taskSort===taskSort.key;
    btn.classList.toggle("active",active);
    btn.setAttribute("aria-pressed",active?"true":"false");
    const th=btn.closest("th");
    if(th)th.setAttribute("aria-sort",active?(taskSort.dir==="asc"?"ascending":"descending"):"none");
    const arrow=btn.querySelector(".sort-arrow");
    if(arrow)arrow.remove();
    if(active)btn.insertAdjacentHTML("beforeend",`<span class="sort-arrow" aria-hidden="true">${taskSort.dir==="asc"?" ↑":" ↓"}</span>`);
  });

  const select=$("#taskSortSelect"),dirBtn=$("#taskSortDir");
  if(select)select.value=taskSort.key;
  if(dirBtn){
    dirBtn.textContent=taskSort.dir==="asc"?"↑ Aufsteigend":"↓ Absteigend";
    dirBtn.setAttribute("aria-label",taskSort.dir==="asc"?"Aufgaben aufsteigend sortieren":"Aufgaben absteigend sortieren");
  }
}
function setTaskSort(key,forceDir=null){
  if(taskSort.key===key&&!forceDir)taskSort.dir=taskSort.dir==="asc"?"desc":"asc";
  else{
    taskSort.key=key;
    taskSort.dir=forceDir||"asc";
  }
  renderTasks();
}
function renderTasks(){
  const q=($("#taskSearch").value||"").toLowerCase(),f=$("#taskStatusFilter").value;
  const filtered=activeRows("tasks").filter(t=>
    (!q||`${t.title||""} ${t.description||""} ${projectName(t.projectId)} ${groupName(t.groupId)}`.toLowerCase().includes(q))&&
    (!f||t.status===f)
  );
  const rows=sortTasks(filtered);

  $("#taskTable").innerHTML=rows.length?rows.map(t=>`<tr>
    <td><b>${esc(t.title)}</b>${t.description?`<div class="task-table-description">${esc(t.description)}</div>`:""}${taskAttachments(t.id).length?`<div class="task-table-attachments">📎 ${taskAttachments(t.id).length} Datei${taskAttachments(t.id).length===1?"":"en"}</div>`:""}</td>
    <td>${esc(projectName(t.projectId))}</td>
    <td>${esc(groupName(t.groupId))}</td>
    <td><span class="badge ${reminderClass(t.due)}">${fmtDate(t.due)} · ${esc(dueText(t.due))}</span></td>
    <td>${priorityBadge(t.priority)}</td>
    <td><select data-task-status="${t.id}">${["open","doing","wait","done"].map(s=>`<option value="${s}" ${s===t.status?"selected":""}>${statusLabel(s)}</option>`).join("")}</select></td>
    <td><button class="action-link" data-edit-task="${t.id}">Bearbeiten</button> ${t.status==="done"?`<button class="action-link archive-link" data-archive-task="${t.id}">Archivieren</button>`:""} <button class="action-link" data-delete-task="${t.id}">Löschen</button></td>
  </tr>`).join(""):`<tr><td colspan="7" class="empty">Keine Aufgaben.</td></tr>`;

  updateTaskSortUI();

  $$('[data-task-status]').forEach(el=>el.onchange=()=>{
    const r=byId("tasks",el.dataset.taskStatus);
    if(r){r.status=el.value;touch(r);saveLocal()}
  });
  $$('[data-edit-task]').forEach(el=>el.onclick=()=>openTaskModal(byId("tasks",el.dataset.editTask)));
  $$('[data-archive-task]').forEach(el=>el.onclick=()=>{
    const t=byId("tasks",el.dataset.archiveTask);
    if(t&&confirm(`Aufgabe „${t.title}“ ins Archiv verschieben?`))archiveTask(t.id);
  });
  $$('[data-delete-task]').forEach(el=>el.onclick=()=>{
    if(confirm("Aufgabe wirklich löschen?")){
      markDeleted("tasks",el.dataset.deleteTask);
      saveLocal();
    }
  });
}
$$("[data-task-sort]").forEach(btn=>btn.onclick=()=>setTaskSort(btn.dataset.taskSort));
$("#taskSortSelect")?.addEventListener("change",e=>{
  taskSort.key=e.target.value;
  taskSort.dir="asc";
  renderTasks();
});
$("#taskSortDir")?.addEventListener("click",()=>{
  taskSort.dir=taskSort.dir==="asc"?"desc":"asc";
  renderTasks();
});
$("#taskSearch").addEventListener("input",renderTasks);$("#taskStatusFilter").addEventListener("change",renderTasks);

function projectTaskRowHTML(t){
  const attachments=taskAttachments(t.id).length;
  return `<div class="project-task-row ${t.status==="done"?"is-done":""}">
    <label class="project-task-check">
      <input type="checkbox" data-project-task-done="${t.id}" ${t.status==="done"?"checked":""}>
      <span></span>
    </label>
    <button class="project-task-title" type="button" data-edit-project-task="${t.id}">
      <span>${esc(t.title)}</span>
      ${t.description?`<small>${esc(t.description)}</small>`:""}
      ${attachments?`<em>📎 ${attachments}</em>`:""}
    </button>
    <span class="project-task-due ${reminderClass(t.due)}">${t.due?esc(dueText(t.due)):"ohne Termin"}</span>
  </div>`;
}
function renderProjects(){
  const q=($("#projectSearch").value||"").toLowerCase(),f=$("#projectStatusFilter").value;
  const rows=activeRows("projects").filter(p=>(!q||p.name.toLowerCase().includes(q))&&(!f||p.status===f));
  $("#projectGrid").innerHTML=rows.length?rows.map(p=>{
    const tasks=projectTasks(p.id).filter(t=>!t.archivedAt).slice().sort((a,b)=>{
      if(a.status==="done"&&b.status!=="done")return 1;
      if(a.status!=="done"&&b.status==="done")return -1;
      return (a.due||"9999").localeCompare(b.due||"9999");
    });
    const st=projectTaskStats(p.id);
    return `<div class="card project-card project-card-with-tasks">
      <div class="row"><h3>${esc(p.name)}</h3>${statusBadge(p.status)}</div>
      <p>${esc(p.description||"Keine Beschreibung hinterlegt.")}</p>
      <div class="mini-meta">${esc(groupName(p.groupId))} · Ziel ${fmtDate(p.due)}</div>
      <div class="project-days ${projectDayClass(p.due)}">${esc(dueText(p.due))}</div>

      <div class="project-progress-head">
        <span><b>${st.progress}%</b> Gesamtfortschritt</span>
        <span>${st.done} von ${st.total} Aufgaben erledigt${st.archived?` · ${st.archived} archiviert`:""}</span>
      </div>
      <div class="progress project-progress"><span style="width:${st.progress}%"></span></div>
      ${st.total===0?`<div class="project-progress-note">Der Fortschritt entsteht automatisch aus den Aufgaben dieses Projekts.</div>`:""}

      <div class="project-task-section">
        <div class="project-task-section-head">
          <strong>Projektaufgaben</strong>
          <button class="btn tiny secondary" type="button" data-add-project-task="${p.id}">+ Aufgabe</button>
        </div>
        <div class="project-task-list">
          ${tasks.length?tasks.map(projectTaskRowHTML).join(""):`<div class="empty project-task-empty">Noch keine Aufgaben. Lege die erste Projektaufgabe an.</div>`}
        </div>
      </div>

      <div class="row project-card-actions">
        <span class="mini-meta">${st.open} offene Aufgabe${st.open===1?"":"n"}</span>
        <span><button class="action-link" data-edit-project="${p.id}">Projekt bearbeiten</button> ${p.status==="closed"?`<button class="action-link archive-link" data-archive-project="${p.id}">Archivieren</button>`:""} <button class="action-link danger-text" data-delete-project="${p.id}">Löschen</button></span>
      </div>
    </div>`;
  }).join(""):`<div class="empty">Keine Projekte.</div>`;

  $$('[data-add-project-task]').forEach(el=>el.onclick=()=>openTaskModal(null,el.dataset.addProjectTask));
  $$('[data-edit-project-task]').forEach(el=>el.onclick=()=>openTaskModal(byId("tasks",el.dataset.editProjectTask)));
  $$('[data-project-task-done]').forEach(el=>el.onchange=()=>{
    const t=byId("tasks",el.dataset.projectTaskDone);
    if(t){
      t.status=el.checked?"done":"open";
      touch(t);
      saveLocal();
    }
  });
  $$('[data-edit-project]').forEach(el=>el.onclick=()=>openProjectModal(byId("projects",el.dataset.editProject)));
  $$('[data-archive-project]').forEach(el=>el.onclick=()=>archiveProject(el.dataset.archiveProject));
  $$('[data-delete-project]').forEach(el=>el.onclick=()=>{
    const p=byId("projects",el.dataset.deleteProject);
    if(!p)return;
    const count=projectTasks(p.id).length;
    const message=count
      ?`Projekt „${p.name}“ wirklich löschen?\n\nDie ${count} zugehörigen Aufgabe${count===1?"":"n"} werden nicht gelöscht, sondern zu eigenständigen Aufgaben ohne Projekt.`
      :`Projekt „${p.name}“ wirklich löschen?`;
    if(confirm(message)){
      projectTasks(p.id).forEach(t=>{t.projectId="";touch(t)});
      markDeleted("projects",p.id);
      saveLocal();
    }
  });
}
$("#projectSearch").addEventListener("input",renderProjects);$("#projectStatusFilter").addEventListener("change",renderProjects);

function renderKanban(){
  const cols=[["open","Offen"],["doing","In Arbeit"],["wait","Warten auf"],["done","Erledigt"]];
  $("#kanbanBoard").innerHTML=cols.map(([s,l])=>`<div class="kanban-col" data-kanban-col="${s}"><h3>${l} · ${activeRows("tasks").filter(t=>t.status===s).length}</h3>${activeRows("tasks").filter(t=>t.status===s).map(t=>`<div class="ticket" draggable="true" data-drag-task="${t.id}"><strong>${esc(t.title)}</strong><small>${esc(projectName(t.projectId))} · ${esc(dueText(t.due))}</small></div>`).join("")}</div>`).join("");
  $$('[data-drag-task]').forEach(el=>el.addEventListener("dragstart",e=>e.dataTransfer.setData("text/plain",el.dataset.dragTask)));
  $$('[data-kanban-col]').forEach(col=>{col.addEventListener("dragover",e=>e.preventDefault());col.addEventListener("drop",e=>{e.preventDefault();const t=byId("tasks",e.dataTransfer.getData("text/plain"));if(t){t.status=col.dataset.kanbanCol;touch(t);saveLocal()}})});
}

function renderCalendar(){
  const y=calDate.getFullYear(),m=calDate.getMonth();
  $("#calendarTitle").textContent=new Intl.DateTimeFormat("de-DE",{month:"long",year:"numeric"}).format(calDate);
  const first=new Date(y,m,1),offset=(first.getDay()+6)%7,days=new Date(y,m+1,0).getDate();
  let cells=["Mo","Di","Mi","Do","Fr","Sa","So"].map(x=>`<div class="weekday">${x}</div>`);
  for(let i=0;i<offset;i++)cells.push('<div class="cal-day muted"></div>');

  for(let d=1;d<=days;d++){
    const ds=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const ev=activeRows("events").filter(e=>eventOccursOn(e,ds)).slice(0,3);
    const bd=activeRows("members").filter(mem=>mem.birthDate&&mem.status!=="deceased"&&Number(mem.birthDate.slice(5,7))===m+1&&Number(mem.birthDate.slice(8,10))===d).slice(0,2);

    cells.push(`<div class="cal-day">
      <b>${d}</b>
      ${bd.map(mem=>`<div class="cal-chip birthday">🎂 ${esc(mem.firstName||mem.lastName)}</div>`).join("")}
      ${ev.map(e=>{
        const start=eventStartDate(e),end=eventEndDate(e);
        const isStart=ds===start,isEnd=ds===end,multi=eventIsMultiDay(e);
        const marker=multi?(isStart?"▶ ":isEnd?"■ ":"↔ "):"";
        const time=isStart&&eventStartTime(e)?` ${eventStartTime(e)}`:"";
        const color=eventColor(e);
        return `<button class="cal-chip ${multi?"multi-day":""} cal-event-button" type="button" data-calendar-event="${e.id}" style="--event-color:${color};--event-soft:${colorWithAlpha(color,.14)}" title="${esc(eventDateRangeText(e))}${eventTimeRangeText(e)?` · ${esc(eventTimeRangeText(e))}`:""}">${marker}${esc(e.title)}${time}</button>`;
      }).join("")}
    </div>`);
  }
  $("#calendarGrid").innerHTML=cells.join("");
  $$("[data-calendar-event]").forEach(btn=>btn.onclick=()=>{
    const e=byId("events",btn.dataset.calendarEvent);
    if(e)showEventDetails(e);
  });

  const combined=[
    ...activeRows("events")
      .filter(e=>eventEndDate(e)>=todayStr())
      .map(e=>({...e,_kind:"event"})),
    ...upcomingBirthdays(31).map(m=>({...m,_kind:"birthday"}))
  ].sort((a,b)=>{
    if(a._kind==="event"&&b._kind==="event")return eventStartDate(a).localeCompare(eventStartDate(b));
    if(a._kind==="event")return -1;
    if(b._kind==="event")return 1;
    return a._days-(b._days??9999);
  }).slice(0,12);

  $("#calendarSideList").innerHTML=combined.length?combined.map(x=>
    x._kind==="event"
      ?eventRowHTML(x)
      :`<div class="birthday-row"><div class="person-dot">🎂</div><div><div class="mini-title">${esc(memberFullName(x))}</div><div class="mini-meta">${x._days===0?"Heute":x._days===1?"Morgen":`in ${x._days} Tagen`}</div></div></div>`
  ).join(""):`<div class="empty">Keine Einträge.</div>`;
  bindEventOpeners($("#calendarSideList"));
}
$("#prevMonth").onclick=()=>{calDate=new Date(calDate.getFullYear(),calDate.getMonth()-1,1);renderCalendar()};$("#nextMonth").onclick=()=>{calDate=new Date(calDate.getFullYear(),calDate.getMonth()+1,1);renderCalendar()};

function eventOverlapsMonth(e,year,monthIndex){
  const start=eventStartDate(e),end=eventEndDate(e);
  if(!start)return false;
  const monthStart=`${year}-${String(monthIndex+1).padStart(2,"0")}-01`;
  const lastDay=new Date(year,monthIndex+1,0).getDate();
  const monthEnd=`${year}-${String(monthIndex+1).padStart(2,"0")}-${String(lastDay).padStart(2,"0")}`;
  return start<=monthEnd && (end||start)>=monthStart;
}
function renderYear(){
  const year=calDate.getFullYear();
  $("#yearGrid").innerHTML=[...Array(12)].map((_,i)=>{
    const name=new Intl.DateTimeFormat("de-DE",{month:"long"}).format(new Date(year,i,1));
    const ev=activeRows("events")
      .filter(e=>eventOverlapsMonth(e,year,i))
      .sort((a,b)=>eventStartDate(a).localeCompare(eventStartDate(b)))
      .slice(0,10);
    return `<div class="card month-card">
      <h3>${name}</h3>
      ${ev.length?ev.map(e=>{
        const color=eventColor(e);
        return `<button type="button" class="year-item year-event-button" data-year-event="${e.id}" style="--event-color:${color};--event-soft:${colorWithAlpha(color,.12)}">
          <span class="year-color-dot" style="background:${color}"></span>
          <b>${esc(eventIsMultiDay(e)?eventDateRangeText(e):fmtShort(eventStartDate(e)))}</b>
          <span>${esc(e.title)}</span>
          ${eventTimeRangeText(e)?`<small>${esc(eventTimeRangeText(e))}</small>`:""}
        </button>`;
      }).join(""):`<div class="mini-meta">Noch keine Einträge</div>`}
    </div>`;
  }).join("");
  $$("[data-year-event]").forEach(btn=>btn.onclick=()=>{
    const e=byId("events",btn.dataset.yearEvent);
    if(e)showEventDetails(e);
  });
}

function memberSortValue(m,key){
  if(key==="number"){
    const v=String(m.memberNo||"").trim();
    return /^\d+$/.test(v)?Number(v):v.toLocaleLowerCase("de-DE");
  }
  if(key==="name")return `${m.lastName||""}\u0000${m.firstName||""}`.toLocaleLowerCase("de-DE");
  if(key==="status")return ({active:1,passive:2,inactive:3,deceased:4})[m.status]||99;
  if(key==="age"){
    const age=ageAt(m.birthDate);
    return age===null?-1:age;
  }
  if(key==="groups")return effectiveGroupIdsForMember(m).map(groupName).filter(x=>x!=="—").join(", ").toLocaleLowerCase("de-DE");
  if(key==="next"){
    const d=daysToBirthday(m);
    return d===null?99999:d;
  }
  return "";
}
function compareMemberValues(a,b){
  if(typeof a==="number"&&typeof b==="number")return a-b;
  return String(a).localeCompare(String(b),"de",{numeric:true,sensitivity:"base"});
}
function sortMembers(rows){
  const dir=memberSort.dir==="desc"?-1:1,key=memberSort.key;
  return rows.slice().sort((a,b)=>{
    const c=compareMemberValues(memberSortValue(a,key),memberSortValue(b,key));
    if(c!==0)return c*dir;
    return memberFullName(a).localeCompare(memberFullName(b),"de",{sensitivity:"base"});
  });
}
function updateMemberSortUI(){
  $$("[data-member-sort]").forEach(btn=>{
    const active=btn.dataset.memberSort===memberSort.key;
    btn.classList.toggle("active",active);
    btn.setAttribute("aria-pressed",active?"true":"false");

    const th=btn.closest("th");
    if(th)th.setAttribute("aria-sort",active?(memberSort.dir==="asc"?"ascending":"descending"):"none");

    btn.querySelector(".sort-arrow")?.remove();
    if(active)btn.insertAdjacentHTML("beforeend",`<span class="sort-arrow" aria-hidden="true">${memberSort.dir==="asc"?" ↑":" ↓"}</span>`);
  });

  const select=$("#memberSortSelect"),dirBtn=$("#memberSortDir");
  if(select)select.value=memberSort.key;
  if(dirBtn){
    dirBtn.textContent=memberSort.dir==="asc"?"↑ Aufsteigend":"↓ Absteigend";
    dirBtn.setAttribute("aria-label",memberSort.dir==="asc"?"Mitglieder aufsteigend sortieren":"Mitglieder absteigend sortieren");
  }
}
function setMemberSort(key,forceDir=null){
  if(memberSort.key===key&&!forceDir)memberSort.dir=memberSort.dir==="asc"?"desc":"asc";
  else{
    memberSort.key=key;
    memberSort.dir=forceDir||"asc";
  }
  renderMembers();
}
function renderMembers(){
  const q=($("#memberSearch").value||"").toLowerCase(),f=$("#memberStatusFilter").value;
  const filtered=activeRows("members").filter(m=>
    (!q||`${m.firstName} ${m.lastName} ${m.memberNo}`.toLowerCase().includes(q))&&
    (!f||m.status===f)
  );
  const rows=sortMembers(filtered);

  $("#memberTable").innerHTML=rows.length?rows.map(m=>`<tr class="selectable" data-select-member="${m.id}">
    <td>${esc(memberNo(m))}</td>
    <td><b>${esc(memberFullName(m))}</b></td>
    <td>${statusBadge(m.status)}</td>
    <td>${ageAt(m.birthDate)??"—"} · ${ageCategory(m)}</td>
    <td>${esc(effectiveGroupIdsForMember(m).map(groupName).filter(x=>x!=="—").join(", ")||"—")}</td>
    <td>${nextPersonalDate(m)}</td>
  </tr>`).join(""):`<tr><td colspan="6" class="empty">Noch keine Mitglieder.</td></tr>`;

  $$('[data-select-member]').forEach(el=>el.onclick=()=>{
    selectedMemberId=el.dataset.selectMember;
    renderMemberDetail();
  });

  if(rows.length&&!rows.some(m=>m.id===selectedMemberId))selectedMemberId=rows[0].id;
  if(!rows.length)selectedMemberId=null;
  updateMemberSortUI();
  renderMemberDetail();
}
$$("[data-member-sort]").forEach(btn=>btn.onclick=()=>setMemberSort(btn.dataset.memberSort));
$("#memberSortSelect")?.addEventListener("change",e=>{
  memberSort.key=e.target.value;
  memberSort.dir="asc";
  renderMembers();
});
$("#memberSortDir")?.addEventListener("click",()=>{
  memberSort.dir=memberSort.dir==="asc"?"desc":"asc";
  renderMembers();
});
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
  $('[data-edit-member]')?.addEventListener("click",()=>openMemberModal(m));
  $('[data-member-card]')?.addEventListener("click",()=>showMemberCard(m));
  $('[data-delete-member]')?.addEventListener("click",()=>{
    const no=memberNo(m);
    if(confirm(`Mitglied „${m.firstName||""} ${m.lastName||""}“ wirklich löschen?\n\nDie Mitgliedsnummer ${no} wird danach wieder frei und kann erneut vergeben werden.`)){
      markDeleted("members",m.id);
      selectedMemberId=null;
      db.counters.memberNo=Number(nextAvailableMemberNo())||1;
      saveLocal();
    }
  });
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

const AREA_FOLDER_IDS={
  meetings:{tree:"meetingFolderTree",path:"meetingFolderPath"},
  documents:{tree:"documentFolderTree",path:"documentFolderPath"},
  knowledge:{tree:"knowledgeFolderTree",path:"knowledgeFolderPath"}
};
function foldersForArea(area){ return activeRows("folders").filter(f=>f.area===area); }
function currentFolderId(area){
  const id=selectedFolderByArea[area]||"";
  if(id && !foldersForArea(area).some(f=>f.id===id))selectedFolderByArea[area]="";
  return selectedFolderByArea[area]||"";
}
function currentFolder(area){ const id=currentFolderId(area); return id?byId("folders",id):null; }
function folderChildren(area,parentId=""){
  return foldersForArea(area).filter(f=>(f.parentId||"")===(parentId||"")).sort((a,b)=>String(a.name).localeCompare(String(b.name),"de"));
}
function flatFolders(area,parentId="",level=0,result=[]){
  folderChildren(area,parentId).forEach(f=>{result.push({folder:f,level});flatFolders(area,f.id,level+1,result)});
  return result;
}
function folderOptions(area,selected=""){
  return `<option value="">Hauptordner</option>${flatFolders(area).map(({folder,level})=>`<option value="${folder.id}" ${folder.id===selected?"selected":""}>${"— ".repeat(level)}${esc(folder.name)}</option>`).join("")}`;
}
function folderChain(area,folderId){
  const chain=[]; let id=folderId||"",guard=0;
  while(id&&guard++<50){const f=byId("folders",id);if(!f||f.area!==area)break;chain.unshift(f);id=f.parentId||""}
  return chain;
}
function areaDocs(area){ return activeRows("documents").filter(d=>(d.area||"documents")===area); }
function directAreaFiles(area,folderId=currentFolderId(area)){ return areaDocs(area).filter(d=>(d.folderId||"")===(folderId||"")); }
function directAreaEntries(area,folderId=currentFolderId(area)){
  if(area==="meetings")return activeRows("meetings").filter(r=>(r.folderId||"")===(folderId||""));
  if(area==="knowledge")return activeRows("knowledge").filter(r=>(r.folderId||"")===(folderId||""));
  return [];
}
function folderDirectCount(area,folderId){ return directAreaFiles(area,folderId).length+directAreaEntries(area,folderId).length; }
function folderNodeHTML(area,f,level=0){
  const children=folderChildren(area,f.id),selected=currentFolderId(area)===f.id;
  return `<div class="folder-node-wrap">
    <button class="folder-node ${selected?"active":""}" type="button" data-folder-select="${f.id}" data-folder-area="${area}" style="--folder-level:${Math.min(level,8)}">
      <span class="folder-icon">📁</span><span class="folder-node-name">${esc(f.name)}</span><span class="folder-count">${folderDirectCount(area,f.id)}</span>
    </button>
    ${children.map(c=>folderNodeHTML(area,c,level+1)).join("")}
  </div>`;
}
function renderFolderBrowser(area){
  const ids=AREA_FOLDER_IDS[area],tree=$("#"+ids.tree),path=$("#"+ids.path),selected=currentFolderId(area);
  if(!tree||!path)return;
  tree.innerHTML=`<button class="folder-node folder-root ${selected===""?"active":""}" type="button" data-folder-select="" data-folder-area="${area}" style="--folder-level:0"><span class="folder-icon">🗂️</span><span class="folder-node-name">Hauptordner</span><span class="folder-count">${folderDirectCount(area,"")}</span></button>${folderChildren(area,"").map(f=>folderNodeHTML(area,f,1)).join("")||'<div class="folder-empty">Noch keine Unterordner.</div>'}`;
  const chain=folderChain(area,selected);
  path.innerHTML=`<button type="button" class="breadcrumb-link" data-folder-crumb="" data-folder-area="${area}">${esc(AREA_META[area].label)}</button>${chain.map(f=>`<span>›</span><button type="button" class="breadcrumb-link" data-folder-crumb="${f.id}" data-folder-area="${area}">${esc(f.name)}</button>`).join("")}`;
  $$(`[data-folder-select][data-folder-area="${area}"]`).forEach(btn=>btn.onclick=()=>{selectedFolderByArea[area]=btn.dataset.folderSelect||"";renderArea(area)});
  $$(`[data-folder-crumb][data-folder-area="${area}"]`).forEach(btn=>btn.onclick=()=>{selectedFolderByArea[area]=btn.dataset.folderCrumb||"";renderArea(area)});
  $$(`[data-rename-folder="${area}"]`).forEach(btn=>btn.disabled=!selected);
  $$(`[data-delete-folder="${area}"]`).forEach(btn=>btn.disabled=!selected);
}
function fileTypeLabel(d){
  const name=String(d.name||"");
  const ext=name.includes(".")?name.split(".").pop().toUpperCase():"";
  return ext||"Datei";
}
function fileTableRows(area,categoryMode=false){
  const rows=directAreaFiles(area);
  if(!rows.length)return `<tr><td colspan="5" class="empty">In diesem Ordner liegen noch keine Dateien.</td></tr>`;
  return rows.slice().sort((a,b)=>String(b.createdAt||"").localeCompare(String(a.createdAt||""))).map(d=>`<tr>
    <td><b>${esc(d.name)}</b></td>
    <td>${categoryMode?esc(d.category||"Dokumente"):esc(fileTypeLabel(d))}</td>
    <td>${fmtSize(d.size||0)}</td>
    <td>${d.createdAt?new Date(d.createdAt).toLocaleString("de-DE"):"—"}</td>
    <td class="doc-actions">
      ${d.webViewLink?`<a class="action-link" href="${esc(d.webViewLink)}" target="_blank" rel="noopener">Öffnen</a>`:""}
      <button class="action-link" type="button" data-move-file="${d.id}">Verschieben</button>
      <button class="action-link danger-text" type="button" data-delete-file="${d.id}">Löschen</button>
    </td>
  </tr>`).join("");
}
function bindFileActions(scope=document){
  scope.querySelectorAll?.("[data-move-file]")?.forEach(btn=>btn.onclick=()=>openMoveFileModal(btn.dataset.moveFile));
  scope.querySelectorAll?.("[data-delete-file]")?.forEach(btn=>btn.onclick=()=>deleteStoredFile(btn.dataset.deleteFile));
}
function renderMeetings(){
  renderFolderBrowser("meetings");
  const folderId=currentFolderId("meetings");
  const rows=activeRows("meetings").filter(m=>(m.folderId||"")===folderId).sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  const files=directAreaFiles("meetings");
  $("#meetingFolderCount").textContent=`${rows.length} Sitzung${rows.length===1?"":"en"} · ${files.length} Datei${files.length===1?"":"en"}`;
  $("#meetingGrid").innerHTML=rows.length?rows.map(m=>`<div class="card meeting-card"><div class="row"><h3>${esc(m.title)}</h3><span class="badge low">${fmtDate(m.date)}</span></div><div class="mini-meta">${esc(groupName(m.groupId))}</div><p>${esc(m.notes||"Keine Notizen.")}</p><div class="mini-meta">${(m.decisions||[]).length} Beschlüsse</div><div style="margin-top:8px"><button class="action-link" data-edit-meeting="${m.id}">Bearbeiten</button> <button class="action-link danger-text" data-delete-meeting="${m.id}">Löschen</button></div></div>`).join(""):`<div class="empty browser-empty">In diesem Ordner sind noch keine Sitzungen oder Beschlüsse abgelegt.</div>`;
  $("#meetingFileTable").innerHTML=fileTableRows("meetings",false);
  $$('[data-edit-meeting]').forEach(el=>el.onclick=()=>openMeetingModal(byId("meetings",el.dataset.editMeeting)));
  $$('[data-delete-meeting]').forEach(el=>el.onclick=()=>{if(confirm("Sitzung wirklich löschen?")){markDeleted("meetings",el.dataset.deleteMeeting);saveLocal()}});
  bindFileActions($("#view-meetings"));
}
function renderDocuments(){
  renderFolderBrowser("documents");
  const all=areaDocs("documents"),cats=["Quittungen","Protokolle","Dokumente","Bilder"];
  $("#docCategories").innerHTML=cats.map(c=>{const r=all.filter(d=>d.category===c);return `<div class="card doc-category"><span>${c}</span><b>${r.length}</b><small class="muted">${fmtSize(r.reduce((s,d)=>s+(d.size||0),0))}</small></div>`}).join("");
  $("#docTable").innerHTML=fileTableRows("documents",true);
  bindFileActions($("#view-documents"));
}
function renderKnowledge(){
  renderFolderBrowser("knowledge");
  const folderId=currentFolderId("knowledge"),q=($("#knowledgeSearch").value||"").toLowerCase();
  const rows=activeRows("knowledge").filter(k=>(k.folderId||"")===folderId).filter(k=>!q||`${k.title} ${k.text}`.toLowerCase().includes(q));
  const files=directAreaFiles("knowledge");
  $("#knowledgeFolderCount").textContent=`${rows.length} Eintrag${rows.length===1?"":"e"} · ${files.length} Datei${files.length===1?"":"en"}`;
  $("#knowledgeGrid").innerHTML=rows.length?rows.map(k=>`<div class="card knowledge-card"><h3>${esc(k.title)}</h3><p>${esc(k.text||"")}</p><div class="mini-meta">${esc(groupName(k.groupId))}</div><div style="margin-top:8px"><button class="action-link" data-edit-knowledge="${k.id}">Bearbeiten</button> <button class="action-link danger-text" data-delete-knowledge="${k.id}">Löschen</button></div></div>`).join(""):`<div class="empty browser-empty">In diesem Ordner ist noch kein Vereinswissen hinterlegt.</div>`;
  $("#knowledgeFileTable").innerHTML=fileTableRows("knowledge",false);
  $$('[data-edit-knowledge]').forEach(el=>el.onclick=()=>openKnowledgeModal(byId("knowledge",el.dataset.editKnowledge)));
  $$('[data-delete-knowledge]').forEach(el=>el.onclick=()=>{if(confirm("Wissenseintrag wirklich löschen?")){markDeleted("knowledge",el.dataset.deleteKnowledge);saveLocal()}});
  bindFileActions($("#view-knowledge"));
}
function renderArea(area){
  if(area==="meetings")renderMeetings();
  else if(area==="documents")renderDocuments();
  else if(area==="knowledge")renderKnowledge();
}
$("#knowledgeSearch").addEventListener("input",renderKnowledge);

function openFolderModal(area){
  const parentId=currentFolderId(area),parent=parentId?byId("folders",parentId):null;
  showModal("Neuer Ordner",`<div class="form-grid"><label class="full">Ordnername<input id="folderName" placeholder="z. B. 2026, Verträge, Vorlagen"></label><div class="form-note">Der Ordner wird unter <b>${esc(parent?.name||AREA_META[area].label)}</b> angelegt. Unterordner können beliebig verschachtelt werden.</div></div>`,()=>{
    const name=$("#folderName").value.trim();
    if(!name)return false;
    if(folderChildren(area,parentId).some(f=>f.name.toLowerCase()===name.toLowerCase())){alert("In diesem Ordner gibt es bereits einen Ordner mit diesem Namen.");return false}
    const folder={id:uid(),area,name,parentId,driveFolderId:"",createdAt:now(),updatedAt:now()};
    db.folders.push(folder);selectedFolderByArea[area]=folder.id;saveLocal();return true;
  });
}
function openRenameFolderModal(area){
  const f=currentFolder(area);if(!f)return;
  showModal("Ordner umbenennen",`<div class="form-grid"><label class="full">Ordnername<input id="folderRename" value="${esc(f.name)}"></label></div>`,async()=>{
    const name=$("#folderRename").value.trim();if(!name)return false;
    if(folderChildren(area,f.parentId||"").some(x=>x.id!==f.id&&x.name.toLowerCase()===name.toLowerCase())){alert("Auf dieser Ebene gibt es bereits einen Ordner mit diesem Namen.");return false}
    f.name=name;f.driveNamePending=!!f.driveFolderId;touch(f);saveLocal();
    if(f.driveFolderId&&hasUsableAccessToken()){try{await syncOneDriveFolderName(f)}catch{}}
    return true;
  });
}
async function deleteCurrentFolder(area){
  const f=currentFolder(area);if(!f)return;
  const children=folderChildren(area,f.id),files=directAreaFiles(area,f.id),entries=directAreaEntries(area,f.id);
  if(children.length||files.length||entries.length){
    alert("Dieser Ordner ist nicht leer. Bitte verschiebe oder lösche zuerst die enthaltenen Unterordner, Einträge und Dateien.");
    return;
  }
  if(!confirm(`Ordner „${f.name}“ wirklich löschen?\n\nEin bereits angelegter Google-Drive-Ordner wird in den Drive-Papierkorb verschoben.`))return;
  try{
    if(f.driveFolderId){
      if(!hasUsableAccessToken())await ensureDriveAccess();
      await driveFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(f.driveFolderId)}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({trashed:true})});
    }
    const parent=f.parentId||"";
    markDeleted("folders",f.id);selectedFolderByArea[area]=parent;saveLocal();
  }catch(e){alert(e.message)}
}
$$("[data-new-folder]").forEach(btn=>btn.onclick=()=>openFolderModal(btn.dataset.newFolder));
$$("[data-rename-folder]").forEach(btn=>btn.onclick=()=>openRenameFolderModal(btn.dataset.renameFolder));
$$("[data-delete-folder]").forEach(btn=>btn.onclick=()=>deleteCurrentFolder(btn.dataset.deleteFolder));

function openMoveFileModal(fileId){
  const d=byId("documents",fileId);if(!d)return;
  const area=d.area||"documents";
  showModal("Datei verschieben",`<div class="form-grid"><label class="full">Zielordner<select id="moveFileFolder">${folderOptions(area,d.folderId||"")}</select></label><div class="form-note">Die Datei wird auch in Google Drive in den gewählten Ordner verschoben.</div></div>`,async()=>{
    try{await moveStoredFile(d,$("#moveFileFolder").value);return true}catch(e){alert(e.message);return false}
  });
}
async function deleteStoredFile(fileId){
  const d=byId("documents",fileId);if(!d)return;
  if(!confirm(`Soll „${d.name}“ wirklich gelöscht werden?\n\nDie Datei wird aus V-Planer entfernt und in den Papierkorb von Google Drive verschoben.`))return;
  try{
    if(!hasUsableAccessToken())await ensureDriveAccess();
    await driveFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(d.id)}?fields=id,trashed`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({trashed:true})});
    markDeleted("documents",d.id);saveLocal();
  }catch(e){alert(e.message)}
}

function estimateLocalBytes(){ return new Blob([JSON.stringify(db)]).size; }
function hasKnownDriveGrant(){ return localStorage.getItem(DRIVE_GRANT_KEY)==="1"; }
function hasUsableAccessToken(){ return !!accessToken && Date.now() < tokenExpiresAt; }
function renderStorage(){
  const local=estimateLocalBytes(),docs=activeRows("documents").reduce((s,d)=>s+(d.size||0),0),total=local+docs,
        limit=(db.settings.storageLimitGB||5)*1024**3,pct=Math.min(100,Math.round(total/limit*100));
  $("#storageDetail").innerHTML=`<div class="ring" data-text="${fmtSize(total)}"></div><div class="storage-caption"><b>${pct}% von ${db.settings.storageLimitGB||5} GB V-Planer-Limit</b><br>Programmdaten ${fmtSize(local)} · Dokumente ${fmtSize(docs)}${cloudQuota?`<br><br>Google-Konto: ${fmtSize(cloudQuota.usage)} von ${fmtSize(cloudQuota.limit)} belegt`:""}</div>`;

  const ready=hasKnownDriveGrant();
  if(hasUsableAccessToken()){
    $("#driveInfo").textContent="Google Drive ist verbunden. Änderungen werden automatisch und zusätzlich regelmäßig abgeglichen.";
    $("#driveState").textContent="● Drive verbunden";
    $("#driveState").style.color="#2f9628";
    $("#connectDriveBtn").textContent="Drive neu verbinden";
  }else if(ready){
    $("#driveInfo").textContent="Google Drive wurde bereits freigegeben. Nach einem Neuladen genügt ein Klick auf „Synchronisieren“ – V-Planer erneuert die Verbindung und setzt den Abgleich automatisch fort.";
    $("#driveState").textContent="● Drive bereit";
    $("#driveState").style.color="#075aa8";
    $("#connectDriveBtn").textContent="Drive verbinden";
  }else{
    $("#driveInfo").textContent="Google Drive ist noch nicht verbunden. Lokales Arbeiten bleibt möglich.";
    $("#driveState").textContent="● Nur lokal";
    $("#driveState").style.color="#667085";
    $("#connectDriveBtn").textContent="Google Drive verbinden";
  }
  $("#clientIdDisplay").textContent=CFG.GOOGLE_CLIENT_ID||"Noch nicht in config.js eingetragen";
}

function groupTypeRowHTML(name,index,total){
  return `<div class="group-type-row" data-group-type-row>
    <div class="group-type-order" aria-label="Position">${index+1}</div>
    <input class="group-type-name" value="${esc(name)}" aria-label="Gruppenart ${index+1}">
    <div class="group-type-actions">
      <button class="icon-btn small" type="button" data-group-type-up title="Nach oben" aria-label="Nach oben" ${index===0?"disabled":""}>↑</button>
      <button class="icon-btn small" type="button" data-group-type-down title="Nach unten" aria-label="Nach unten" ${index===total-1?"disabled":""}>↓</button>
      <button class="icon-btn small danger-text" type="button" data-group-type-remove title="Entfernen" aria-label="Entfernen">×</button>
    </div>
  </div>`;
}
function refreshGroupTypeEditorControls(){
  const rows=$$("#groupTypeList [data-group-type-row]");
  rows.forEach((row,index)=>{
    row.querySelector(".group-type-order").textContent=index+1;
    const up=row.querySelector("[data-group-type-up]"),down=row.querySelector("[data-group-type-down]");
    up.disabled=index===0;
    down.disabled=index===rows.length-1;
  });
}
function bindGroupTypeEditor(){
  const list=$("#groupTypeList");
  if(!list)return;
  list.querySelectorAll("[data-group-type-up]").forEach(btn=>btn.onclick=()=>{
    const row=btn.closest("[data-group-type-row]"),prev=row.previousElementSibling;
    if(prev)list.insertBefore(row,prev);
    refreshGroupTypeEditorControls();
  });
  list.querySelectorAll("[data-group-type-down]").forEach(btn=>btn.onclick=()=>{
    const row=btn.closest("[data-group-type-row]"),next=row.nextElementSibling;
    if(next)list.insertBefore(next,row);
    refreshGroupTypeEditorControls();
  });
  list.querySelectorAll("[data-group-type-remove]").forEach(btn=>btn.onclick=()=>{
    const rows=$$("#groupTypeList [data-group-type-row]");
    if(rows.length<=1){
      alert("Mindestens eine Gruppenart muss vorhanden bleiben.");
      return;
    }
    btn.closest("[data-group-type-row]").remove();
    refreshGroupTypeEditorControls();
  });
}
function renderGroupTypeSettings(){
  const types=Array.isArray(db.settings.groupTypes)&&db.settings.groupTypes.length
    ? db.settings.groupTypes
    : ["Gruppe"];
  $("#groupTypeList").innerHTML=types.map((name,index)=>groupTypeRowHTML(name,index,types.length)).join("");
  bindGroupTypeEditor();
}
function getGroupTypesFromSettingsForm(){
  const names=$$("#groupTypeList .group-type-name").map(el=>el.value.trim()).filter(Boolean);
  return [...new Set(names)];
}
function renderSettings(){
  const s=db.settings,r=s.reminders;
  $("#clubName").value=s.clubName||"";
  $("#userRole").value=s.userRole||"";
  $("#uiScale").value=s.uiScale||100;
  $("#uiScaleLabel").textContent=`${s.uiScale||100}%`;
  $("#moduleClub").checked=s.modules.club;
  $("#moduleDocuments").checked=s.modules.documents;
  $("#reminderEnabled").checked=r.enabled;
  $("#infoDays").value=r.infoDays;
  $("#warningDays").value=r.warningDays;
  $("#alarmDays").value=r.alarmDays;
  $("#infoDaysLabel").textContent=r.infoDays;
  $("#warningDaysLabel").textContent=r.warningDays;
  $("#alarmDaysLabel").textContent=r.alarmDays;
  $("#birthdayWeekReminder").checked=r.birthdayWeek;
  $("#jubileeReminder").checked=r.jubilee;
  $("#storageLimit").value=s.storageLimitGB||5;
  $("#compressImages").checked=!!s.compressImages;
  renderGroupTypeSettings();
}
["infoDays","warningDays","alarmDays"].forEach(id=>$("#"+id).addEventListener("input",()=>$("#"+id+"Label").textContent=$("#"+id).value));
$("#uiScale").addEventListener("input",()=>{
  $("#uiScaleLabel").textContent=`${$("#uiScale").value}%`;
  applyUiScale($("#uiScale").value);
});

$("#addGroupTypeBtn").onclick=()=>{
  const list=$("#groupTypeList");
  const current=$$("#groupTypeList [data-group-type-row]").length;
  list.insertAdjacentHTML("beforeend",groupTypeRowHTML("",current,current+1));
  bindGroupTypeEditor();
  refreshGroupTypeEditorControls();
  const inputs=$$("#groupTypeList .group-type-name");
  inputs[inputs.length-1]?.focus();
};

$("#saveSettingsBtn").onclick=()=>{
  const groupTypes=getGroupTypesFromSettingsForm();
  if(!groupTypes.length){
    alert("Bitte mindestens eine Gruppenart anlegen.");
    return;
  }
  db.settings.clubName=$("#clubName").value.trim();
  db.settings.userRole=$("#userRole").value.trim();
  db.settings.uiScale=Math.min(125,Math.max(80,Number($("#uiScale").value)||100));
  applyUiScale(db.settings.uiScale);
  db.settings.modules.club=$("#moduleClub").checked;
  db.settings.modules.documents=$("#moduleDocuments").checked;
  db.settings.groupTypes=groupTypes;
  db.settings.reminders.enabled=$("#reminderEnabled").checked;
  db.settings.reminders.infoDays=Number($("#infoDays").value);
  db.settings.reminders.warningDays=Number($("#warningDays").value);
  db.settings.reminders.alarmDays=Number($("#alarmDays").value);
  db.settings.reminders.birthdayWeek=$("#birthdayWeekReminder").checked;
  db.settings.reminders.jubilee=$("#jubileeReminder").checked;
  db.settings.storageLimitGB=Number($("#storageLimit").value)||5;
  db.settings.compressImages=$("#compressImages").checked;
  db.settingsUpdatedAt=now();
  saveLocal();
  applyModuleVisibility();
  alert("Einstellungen gespeichert.");
};

$("#exportBackupBtn").onclick=()=>exportFullBackup();

$("#importBackupBtn").onclick=()=>$("#backupImportInput").click();

$("#backupImportInput").addEventListener("change",async()=>{
  const input=$("#backupImportInput"),file=input.files?.[0];
  if(!file)return;
  try{
    await importFullBackup(file);
  }catch(e){
    alert(e.message);
  }finally{
    input.value="";
  }
});

$("#resetUiScaleBtn").onclick=()=>{
  $("#uiScale").value=100;
  $("#uiScaleLabel").textContent="100%";
  applyUiScale(100);
};



function renderAll(){ applyModuleVisibility(); renderDashboard();renderTasks();renderProjects();renderKanban();renderCalendar();renderYear();renderArchive();renderMembers();renderGroups();renderMeetings();renderDocuments();renderKnowledge();renderStorage();renderSettings(); }

function groupOptions(selected="",excludeId=""){return `<option value="">Gesamtverein / keine Gruppe</option>${activeRows("groups").filter(g=>g.id!==excludeId).map(g=>`<option value="${g.id}" ${g.id===selected?"selected":""}>${esc(g.name)}</option>`).join("")}`}
function projectOptions(selected=""){return `<option value="">Kein Projekt</option>${activeRows("projects").map(p=>`<option value="${p.id}" ${p.id===selected?"selected":""}>${esc(p.name)}</option>`).join("")}`}
function memberOptions(selected=""){return `<option value="">Nicht besetzt</option>${activeRows("members").map(m=>`<option value="${m.id}" ${m.id===selected?"selected":""}>${esc(memberFullName(m))}</option>`).join("")}`}
function showModal(title,body,saveFn){ $("#modalTitle").textContent=title;$("#modalBody").innerHTML=body;const dlg=$("#modal");dlg.showModal();$("#modalSave").onclick=e=>{e.preventDefault();Promise.resolve(saveFn()).then(ok=>{if(ok!==false)dlg.close()})}; }
function readPhoto(fileInput,current=""){ const f=fileInput.files?.[0]; if(!f)return Promise.resolve(current); return new Promise((resolve,reject)=>{const img=new Image(),fr=new FileReader();fr.onload=()=>{img.onload=()=>{const max=320,s=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement("canvas");c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext("2d").drawImage(img,0,0,c.width,c.height);resolve(c.toDataURL("image/jpeg",.72))};img.onerror=reject;img.src=fr.result};fr.onerror=reject;fr.readAsDataURL(f)}); }
function parseKeyValueLines(text,sep="="){return String(text||"").split(/\n+/).map(x=>x.trim()).filter(Boolean).map(line=>{const i=line.indexOf(sep);return i>=0?{key:line.slice(0,i).trim(),value:line.slice(i+1).trim()}:{key:line,value:""}})}
function parseDatedLines(text){return String(text||"").split(/\n+/).map(x=>x.trim()).filter(Boolean).map(line=>{const p=line.split("|");return {title:(p[0]||"").trim(),date:(p[1]||"").trim()}})}
function parseHistory(text){return String(text||"").split(/\n+/).map(x=>x.trim()).filter(Boolean).map(line=>{const p=line.split("|");return {date:(p[0]||"").trim(),note:(p.slice(1).join("|")||"").trim()}})}

function openTaskModal(rec=null,presetProjectId=""){
  const r=rec||{status:"open",priority:"mid",title:"",due:"",projectId:presetProjectId||"",groupId:"",description:""};
  const fixedProject=presetProjectId&&!rec;
  const existingAttachments=rec?taskAttachments(rec.id):[];

  showModal(rec?"Aufgabe bearbeiten":fixedProject?"Neue Projektaufgabe":"Neue Aufgabe",`<div class="form-grid">
    ${fixedProject?`<div class="form-note full">Diese Aufgabe wird dem Projekt <b>${esc(projectName(presetProjectId))}</b> zugeordnet und fließt automatisch in dessen Gesamtfortschritt ein.</div>`:""}

    <label class="full">Aufgabe<input id="fTitle" value="${esc(r.title)}"></label>
    <label>Fällig<input id="fDue" type="date" value="${esc(r.due||"")}"></label>
    <label>Priorität<select id="fPriority"><option value="high" ${r.priority==="high"?"selected":""}>Hoch</option><option value="mid" ${r.priority==="mid"?"selected":""}>Mittel</option><option value="low" ${r.priority==="low"?"selected":""}>Niedrig</option></select></label>
    <label>Status<select id="fStatus">${["open","doing","wait","done"].map(s=>`<option value="${s}" ${r.status===s?"selected":""}>${statusLabel(s)}</option>`).join("")}</select></label>
    <label>Projekt<select id="fProject" ${fixedProject?"disabled":""}>${projectOptions(r.projectId)}</select></label>
    <label class="full">Gruppe<select id="fGroup">${groupOptions(r.groupId)}</select></label>

    <div class="form-section">Informationen</div>
    <label class="full">Beschreibung / Notizen<textarea id="fDescription" rows="6" placeholder="Hier können Ablauf, Ansprechpartner, Hinweise, Links oder weitere Informationen zur Aufgabe hinterlegt werden.">${esc(r.description||"")}</textarea></label>

    <div class="form-section">Dateien zur Aufgabe</div>
    <div class="task-attachment-box full">
      ${rec
        ?`<div class="task-attachment-upload">
            <input id="taskAttachmentInput" type="file" multiple>
            <small>PDF, Word, Excel, Bilder und weitere Dateien. Bilder werden – falls aktiviert – automatisch komprimiert.</small>
          </div>
          <div id="taskAttachmentList">${taskAttachmentRows(rec.id)}</div>`
        :`<div class="form-note">Speichere die Aufgabe zunächst. Danach kannst du beim Bearbeiten Dateien zu dieser Aufgabe hochladen.</div>`
      }
    </div>

    <div class="form-note full">Aufgaben ohne Projekt bleiben eigenständige Aufgaben. Sobald ein Projekt ausgewählt ist, zählt die Aufgabe automatisch zum Projektfortschritt.</div>
  </div>`,async()=>{
    const title=$("#fTitle").value.trim();
    if(!title)return false;

    const target=rec||{id:uid(),createdAt:now()};
    Object.assign(target,{
      title,
      due:$("#fDue").value,
      priority:$("#fPriority").value,
      status:$("#fStatus").value,
      projectId:fixedProject?presetProjectId:$("#fProject").value,
      groupId:$("#fGroup").value,
      description:$("#fDescription").value.trim()
    });
    touch(target);

    if(!rec)db.tasks.push(target);
    saveLocal();

    if(rec){
      const input=$("#taskAttachmentInput");
      const files=[...(input?.files||[])];
      if(files.length){
        try{
          for(const file of files)await uploadTaskAttachment(file,target);
        }catch(e){
          alert(`Aufgabe gespeichert, aber Datei-Upload fehlgeschlagen:\n${e.message}`);
        }
      }
    }
    return true;
  });

  if(rec){
    $$("[data-delete-task-attachment]").forEach(btn=>btn.onclick=async()=>{
      try{
        await deleteTaskAttachment(btn.dataset.deleteTaskAttachment);
        const list=$("#taskAttachmentList");
        if(list)list.innerHTML=taskAttachmentRows(rec.id);
      }catch(e){
        alert(e.message);
      }
    });
  }
}

function openProjectModal(rec=null){
  const r=rec||{name:"",due:"",status:"planned",groupId:"",description:""};
  const stats=rec?projectTaskStats(rec.id):{total:0,done:0,progress:0};
  showModal(rec?"Projekt bearbeiten":"Neues Projekt",`<div class="form-grid">
    <label class="full">Projektname<input id="fName" value="${esc(r.name)}"></label>
    <label>Zieldatum<input id="fDue" type="date" value="${esc(r.due||"")}"></label>
    <label>Status<select id="fStatus">${["planned","active","paused","closed"].map(s=>`<option value="${s}" ${r.status===s?"selected":""}>${statusLabel(s)}</option>`).join("")}</select></label>
    <label>Gruppe<select id="fGroup">${groupOptions(r.groupId)}</select></label>
    ${rec?`<div class="project-modal-progress full"><b>Automatischer Fortschritt: ${stats.progress}%</b><span>${stats.done} von ${stats.total} Aufgaben erledigt</span><div class="progress"><span style="width:${stats.progress}%"></span></div></div>`:`<div class="form-note full">Der Projektfortschritt wird automatisch aus den später angelegten Projektaufgaben berechnet. Jede erledigte Aufgabe zählt gleich stark.</div>`}
    <label class="full">Beschreibung<textarea id="fDescription" rows="5">${esc(r.description||"")}</textarea></label>
  </div>`,()=>{
    const name=$("#fName").value.trim();if(!name)return false;
    const target=rec||{id:uid(),createdAt:now()};
    Object.assign(target,{
      name,
      due:$("#fDue").value,
      status:$("#fStatus").value,
      groupId:$("#fGroup").value,
      description:$("#fDescription").value
    });
    touch(target);
    if(!rec)db.projects.push(target);
    saveLocal();
    return true;
  });
}

function showEventDetails(e){
  const dlg=$("#detailModal"),color=eventColor(e),range=eventDateRangeText(e),time=eventTimeRangeText(e);
  $("#detailTitle").textContent=e.title||"Termin";
  $("#detailBody").innerHTML=`<div class="event-detail">
    <div class="event-detail-accent" style="background:${color}"></div>
    <div class="event-detail-grid">
      <div class="detail-box"><b>Titel</b>${esc(e.title||"—")}</div>
      <div class="detail-box"><b>Gruppe</b>${esc(groupName(e.groupId))}</div>
      <div class="detail-box"><b>Von – Datum</b>${esc(fmtDate(eventStartDate(e)))}</div>
      <div class="detail-box"><b>Bis – Datum</b>${esc(fmtDate(eventEndDate(e)))}</div>
      <div class="detail-box"><b>Von – Uhrzeit</b>${esc(eventStartTime(e)?`${eventStartTime(e)} Uhr`:"—")}</div>
      <div class="detail-box"><b>Bis – Uhrzeit</b>${esc(eventEndTime(e)?`${eventEndTime(e)} Uhr`:"—")}</div>
      <div class="detail-box full-detail"><b>Ort</b>${esc(e.location||"—")}</div>
    </div>
    <div class="event-detail-summary">
      <b>Gesamtzeitraum</b>
      <span>${esc(range)}${time?` · ${esc(time)}`:""}</span>
    </div>
    <div class="event-detail-color"><span style="background:${color}"></span><b>Terminfarbe</b><code>${esc(color.toUpperCase())}</code></div>
    <div class="event-detail-actions">
      <button class="btn primary" type="button" id="detailEditEvent">Bearbeiten</button>
      <button class="btn danger" type="button" id="detailDeleteEvent">Termin löschen</button>
    </div>
  </div>`;
  dlg.showModal();

  $("#detailEditEvent").onclick=()=>{
    dlg.close();
    openEventModal(e);
  };
  $("#detailDeleteEvent").onclick=()=>{
    if(!confirm(`Termin „${e.title}“ wirklich löschen?\n\nDer Termin wird aus Kalender und Vereinsjahr entfernt.`))return;
    markDeleted("events",e.id);
    dlg.close();
    saveLocal();
  };
}

function openEventModal(rec=null){
  const r=rec||{title:"",startDate:"",endDate:"",startTime:"",endTime:"",location:"",groupId:"",color:"#1677c8"};
  const startDate=eventStartDate(r),endDate=eventEndDate(r)||startDate,startTime=eventStartTime(r),endTime=eventEndTime(r);
  const currentColor=eventColor(r);
  const palette=[
    {name:"Blau",value:"#1677c8"},
    {name:"Grün",value:"#2f9628"},
    {name:"Orange",value:"#e67e22"},
    {name:"Rot",value:"#c43d3d"},
    {name:"Violett",value:"#7a5cc7"},
    {name:"Türkis",value:"#0097a7"},
    {name:"Pink",value:"#d94f9b"},
    {name:"Gelb",value:"#d4a017"},
    {name:"Dunkelblau",value:"#345995"},
    {name:"Grau",value:"#667085"}
  ];

  showModal(rec?"Termin bearbeiten":"Neuer Termin",`<div class="form-grid">
    <label class="full">Titel<input id="fTitle" value="${esc(r.title)}"></label>

    <div class="form-section">Zeitraum</div>
    <label>Von – Datum<input id="fStartDate" type="date" value="${esc(startDate)}"></label>
    <label>Bis – Datum<input id="fEndDate" type="date" value="${esc(endDate)}"></label>
    <label>Von – Uhrzeit<input id="fStartTime" type="time" value="${esc(startTime)}"></label>
    <label>Bis – Uhrzeit<input id="fEndTime" type="time" value="${esc(endTime)}"></label>

    <label>Ort<input id="fLocation" value="${esc(r.location||"")}"></label>
    <label>Gruppe<select id="fGroup">${groupOptions(r.groupId)}</select></label>

    <div class="form-section">Terminfarbe</div>
    <label>Freie Farbe<input id="fColor" class="event-color-input" type="color" value="${currentColor}"></label>
    <div class="event-color-preview"><span id="eventColorPreview" style="background:${currentColor}"></span><b id="eventColorValue">${currentColor.toUpperCase()}</b></div>

    <div class="event-color-palette full">
      <span class="event-color-palette-label">10 Farbvorschläge</span>
      <div class="event-color-swatches">
        ${palette.map(c=>`<button type="button" class="event-color-choice ${c.value===currentColor?"active":""}" data-event-color="${c.value}" title="${esc(c.name)}">
          <span class="event-color-swatch" style="background:${c.value}"></span>
          <small>${esc(c.name)}</small>
        </button>`).join("")}
      </div>
    </div>

    <div class="form-note full">Für eintägige Termine bei „Von“ und „Bis“ dasselbe Datum wählen. Mehrtägige Termine werden im Kalender an jedem betroffenen Tag und im Vereinsjahr in allen betroffenen Monaten angezeigt.</div>
  </div>`,()=>{
    const title=$("#fTitle").value.trim();
    const sd=$("#fStartDate").value,ed=$("#fEndDate").value||sd;
    const st=$("#fStartTime").value,et=$("#fEndTime").value;
    const color=$("#fColor").value||"#1677c8";

    if(!title)return false;
    if(!sd){alert("Bitte ein Startdatum auswählen.");return false}
    if(ed<sd){alert("Das Bis-Datum darf nicht vor dem Von-Datum liegen.");return false}
    if(sd===ed&&st&&et&&et<st){alert("Bei einem eintägigen Termin darf die Bis-Uhrzeit nicht vor der Von-Uhrzeit liegen.");return false}

    const target=rec||{id:uid(),createdAt:now()};
    Object.assign(target,{
      title,
      startDate:sd,
      endDate:ed,
      startTime:st,
      endTime:et,
      date:sd,
      time:st,
      location:$("#fLocation").value,
      groupId:$("#fGroup").value,
      color
    });
    touch(target);
    if(!rec)db.events.push(target);
    saveLocal();
    return true;
  });

  const colorInput=$("#fColor");
  function updateColorUI(value){
    $("#eventColorPreview").style.background=value;
    $("#eventColorValue").textContent=value.toUpperCase();
    $$(".event-color-choice").forEach(btn=>btn.classList.toggle("active",btn.dataset.eventColor.toLowerCase()===value.toLowerCase()));
  }
  colorInput.oninput=()=>updateColorUI(colorInput.value);
  $$("[data-event-color]").forEach(btn=>btn.onclick=()=>{
    colorInput.value=btn.dataset.eventColor;
    updateColorUI(colorInput.value);
  });
}

function openMemberModal(rec=null){
  const r=rec||{memberNo:nextAvailableMemberNo(),firstName:"",lastName:"",birthDate:"",status:"active",entryDate:todayStr(),exitDate:"",reentryDate:"",cancelDate:"",deceasedDate:"",honorary:false,email:"",phone:"",address:"",emergencyName:"",emergencyPhone:"",guardian:"",familyName:"",relationships:"",groupIds:[],photoData:"",extraFields:[],history:[],statusHistory:[],honors:[],notes:""};
  const extra=(r.extraFields||[]).map(x=>`${x.key}=${x.value}`).join("\n"), hist=(r.history||[]).map(x=>`${x.date||""}|${x.note||""}`).join("\n"), shist=(r.statusHistory||[]).map(x=>`${x.date||""}|${x.note||x.status||""}`).join("\n"), honors=(r.honors||[]).map(x=>`${x.title||""}|${x.date||""}`).join("\n");
  showModal(rec?"Mitglied bearbeiten":"Neues Mitglied",`<div class="form-grid">
    <div class="form-section">Stammdaten</div>
    <label>Mitgliedsnummer<input id="mNo" value="${esc(r.memberNo)}"><small class="field-help">Automatisch wird die kleinste freie Nummer vorgeschlagen. Freie Nummern können auch manuell vergeben werden.</small></label><label>Status<select id="mStatus"><option value="active" ${r.status==="active"?"selected":""}>Aktiv</option><option value="inactive" ${r.status==="inactive"?"selected":""}>Deaktiviert</option><option value="passive" ${r.status==="passive"?"selected":""}>Passiv</option><option value="deceased" ${r.status==="deceased"?"selected":""}>Verstorben</option></select></label>
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
    const first=$("#mFirst").value.trim(),last=$("#mLast").value.trim();
    if(!first&&!last)return false;
    const requestedNo=$("#mNo").value.trim()||nextAvailableMemberNo();
    if(!memberNoAvailable(requestedNo,rec?.id||"")){
      alert(`Die Mitgliedsnummer ${requestedNo} ist bereits vergeben. Bitte eine andere Nummer wählen.`);
      return false;
    }
    const birth=$("#mBirth").value,guardian=$("#mGuardian").value.trim();
    if(birth&&ageAt(birth)<18&&!guardian&&!confirm("Das Mitglied ist minderjährig, aber es ist keine gesetzliche Vertretung hinterlegt. Trotzdem speichern?"))return false;
    const entry=$("#mEntry").value,exit=$("#mExit").value,cancel=$("#mCancel").value;
    if(entry&&exit&&exit<entry&&!confirm("Das Austrittsdatum liegt vor dem Eintrittsdatum. Trotzdem speichern?"))return false;
    if(cancel&&exit&&cancel>exit&&!confirm("Das Kündigungsdatum liegt nach dem Austrittsdatum. Trotzdem speichern?"))return false;

    const target=rec||{id:uid(),createdAt:now()};
    const oldStatus=target.status;
    const photo=await readPhoto($("#mPhoto"),r.photoData||"");
    Object.assign(target,{
      memberNo:requestedNo,
      firstName:first,lastName:last,birthDate:birth,status:$("#mStatus").value,
      entryDate:$("#mEntry").value,exitDate:$("#mExit").value,reentryDate:$("#mReentry").value,
      cancelDate:$("#mCancel").value,deceasedDate:$("#mDeceased").value,
      honorary:$("#mHonorary").checked,
      groupIds:[...$("#mGroups").selectedOptions].map(o=>o.value),
      email:$("#mEmail").value.trim(),phone:$("#mPhone").value.trim(),address:$("#mAddress").value,
      emergencyName:$("#mEmergencyName").value.trim(),emergencyPhone:$("#mEmergencyPhone").value.trim(),
      familyName:$("#mFamily").value.trim(),guardian,relationships:$("#mRelationships").value,
      photoData:photo,extraFields:parseKeyValueLines($("#mExtra").value),
      honors:parseDatedLines($("#mHonors").value),history:parseHistory($("#mHistory").value),
      statusHistory:parseHistory($("#mStatusHistory").value),notes:$("#mNotes").value
    });
    if(rec&&oldStatus!==target.status){
      target.statusHistory=target.statusHistory||[];
      target.statusHistory.push({date:todayStr(),note:`${statusLabel(oldStatus)} → ${statusLabel(target.status)}`});
    }
    touch(target);
    if(!rec){
      db.members.push(target);
      selectedMemberId=target.id;
    }
    db.counters.memberNo=Number(nextAvailableMemberNo())||1;
    saveLocal();
    return true;
  });
}
function showMemberCard(m){ $("#detailTitle").textContent="Digitale Mitgliedskarte";$("#detailBody").innerHTML=`<div style="max-width:520px;margin:auto"><div class="member-card-digital" style="padding:24px"><div class="member-card-top"><div><b>V-Planer · ${esc(db.settings.clubName)}</b><div style="font-size:28px;margin-top:16px">${esc(`${m.firstName||""} ${m.lastName||""}`.trim())}</div><small>${esc(effectiveGroupIdsForMember(m).map(groupName).filter(x=>x!=="—").join(" · ")||"Gesamtverein")}</small></div><div style="text-align:right"><b style="font-size:22px">${esc(memberNo(m))}</b><div style="margin-top:15px">${m.honorary?"★ Ehrenmitglied":""}</div></div></div></div></div>`;$("#detailModal").showModal(); }

function configuredGroupTypes(currentType=""){
  const configured=(Array.isArray(db.settings.groupTypes)?db.settings.groupTypes:[])
    .map(x=>String(x||"").trim()).filter(Boolean);
  const result=[...configured];
  // Existing groups keep their stored type even if that type was later removed
  // from the selectable list in Settings.
  if(currentType&&!result.includes(currentType))result.push(currentType);
  return result.length?result:["Gruppe"];
}
function openGroupModal(rec=null){
  const firstType=configuredGroupTypes()[0]||"Gruppe";
  const r=rec||{name:"",type:firstType,parentId:"",description:"",contactMemberId:"",autoRule:{enabled:false,status:"",ageMin:"",ageMax:""}};
  const ar=r.autoRule||{};
  const types=configuredGroupTypes(r.type);
  showModal(rec?"Gruppe bearbeiten":"Neue Gruppe",`<div class="form-grid">
    <label class="full">Gruppenname<input id="gName" value="${esc(r.name)}"></label>
    <label>Gruppenart<select id="gType">${types.map(x=>`<option value="${esc(x)}" ${r.type===x?"selected":""}>${esc(x)}</option>`).join("")}</select></label>
    <label>Übergeordnete Gruppe<select id="gParent">${groupOptions(r.parentId,rec?.id||"")}</select></label>
    <label>Ansprechpartner<select id="gContact">${memberOptions(r.contactMemberId)}</select></label>
    <label class="full">Beschreibung<textarea id="gDescription" rows="4">${esc(r.description||"")}</textarea></label>
    <div class="form-note full">Die auswählbaren Gruppenarten und ihre Reihenfolge kannst du unter <b>Einstellungen → Gruppenarten</b> ändern.</div>
    <div class="form-section">Automatische Gruppenzuordnung</div>
    <label class="checkline full"><input id="gAuto" type="checkbox" ${ar.enabled?"checked":""}> Regel aktivieren</label>
    <label>Status<select id="gAutoStatus"><option value="">Alle Status</option><option value="active" ${ar.status==="active"?"selected":""}>Aktiv</option><option value="passive" ${ar.status==="passive"?"selected":""}>Passiv</option><option value="inactive" ${ar.status==="inactive"?"selected":""}>Deaktiviert</option></select></label>
    <label>Mindestalter<input id="gAgeMin" type="number" min="0" max="120" value="${esc(ar.ageMin??"")}"></label>
    <label>Höchstalter<input id="gAgeMax" type="number" min="0" max="120" value="${esc(ar.ageMax??"")}"></label>
    <div class="form-note">Beispiel Jugendgruppe: Aktiv + Höchstalter 17. Mitglieder werden zusätzlich zu manuellen Zuordnungen automatisch berücksichtigt.</div>
  </div>`,()=>{
    const name=$("#gName").value.trim();
    if(!name)return false;
    const target=rec||{id:uid(),createdAt:now()};
    Object.assign(target,{
      name,
      type:$("#gType").value,
      parentId:$("#gParent").value,
      contactMemberId:$("#gContact").value,
      description:$("#gDescription").value,
      autoRule:{
        enabled:$("#gAuto").checked,
        status:$("#gAutoStatus").value,
        ageMin:$("#gAgeMin").value,
        ageMax:$("#gAgeMax").value
      }
    });
    touch(target);
    if(!rec){db.groups.push(target);selectedGroupId=target.id}
    saveLocal();
    return true;
  });
}
function openFunctionModal(rec=null,groupId=""){ const r=rec||{title:"",kind:"Vorstandsfunktion",groupId:groupId||"",memberId:"",startDate:"",endDate:"",notes:""}; showModal(rec?"Funktion bearbeiten":"Neue Funktion",`<div class="form-grid"><label class="full">Funktion / Rolle<input id="fnTitle" value="${esc(r.title)}" placeholder="z. B. Vorsitzender, Trainer, Betreuer"></label><label>Art<select id="fnKind">${["Vorstandsfunktion","Trainer","Betreuer","Ansprechpartner","Sonstige Funktion"].map(x=>`<option ${r.kind===x?"selected":""}>${x}</option>`).join("")}</select></label><label>Gruppe<select id="fnGroup">${groupOptions(r.groupId)}</select></label><label>Person<select id="fnMember">${memberOptions(r.memberId)}</select></label><label>Beginn<input id="fnStart" type="date" value="${esc(r.startDate||"")}"></label><label>Ende<input id="fnEnd" type="date" value="${esc(r.endDate||"")}"></label><label class="full">Notizen<textarea id="fnNotes" rows="3">${esc(r.notes||"")}</textarea></label></div>`,()=>{const title=$("#fnTitle").value.trim();if(!title)return false;const target=rec||{id:uid(),createdAt:now()};Object.assign(target,{title,kind:$("#fnKind").value,groupId:$("#fnGroup").value,memberId:$("#fnMember").value,startDate:$("#fnStart").value,endDate:$("#fnEnd").value,notes:$("#fnNotes").value});touch(target);if(!rec)db.functions.push(target);saveLocal();return true}); }
function openMeetingModal(rec=null){
  const r=rec||{title:"",date:"",groupId:"",folderId:currentFolderId("meetings"),notes:"",decisions:[]};
  showModal(rec?"Sitzung bearbeiten":"Neue Sitzung",`<div class="form-grid">
    <label class="full">Titel<input id="mtTitle" value="${esc(r.title)}"></label>
    <label>Datum<input id="mtDate" type="date" value="${esc(r.date||"")}"></label>
    <label>Gruppe<select id="mtGroup">${groupOptions(r.groupId)}</select></label>
    <label class="full">Ordner<select id="mtFolder">${folderOptions("meetings",r.folderId||"")}</select></label>
    <label class="full">Tagesordnung / Protokoll<textarea id="mtNotes" rows="6">${esc(r.notes||"")}</textarea></label>
    <label class="full">Beschlüsse – eine Zeile pro Beschluss<textarea id="mtDecisions" rows="4">${esc((r.decisions||[]).join("\n"))}</textarea></label>
  </div>`,()=>{
    const title=$("#mtTitle").value.trim();if(!title)return false;
    const target=rec||{id:uid(),createdAt:now()};
    Object.assign(target,{title,date:$("#mtDate").value,groupId:$("#mtGroup").value,folderId:$("#mtFolder").value,notes:$("#mtNotes").value,decisions:$("#mtDecisions").value.split(/\n+/).map(x=>x.trim()).filter(Boolean)});
    touch(target);if(!rec)db.meetings.push(target);selectedFolderByArea.meetings=target.folderId||"";saveLocal();return true;
  });
}
function openKnowledgeModal(rec=null){
  const r=rec||{title:"",groupId:"",folderId:currentFolderId("knowledge"),text:""};
  showModal(rec?"Wissenseintrag bearbeiten":"Neuer Wissenseintrag",`<div class="form-grid">
    <label class="full">Titel<input id="kTitle" value="${esc(r.title)}"></label>
    <label>Bereich<select id="kGroup">${groupOptions(r.groupId)}</select></label>
    <label>Ordner<select id="kFolder">${folderOptions("knowledge",r.folderId||"")}</select></label>
    <label class="full">Inhalt<textarea id="kText" rows="7">${esc(r.text||"")}</textarea></label>
  </div>`,()=>{
    const title=$("#kTitle").value.trim();if(!title)return false;
    const target=rec||{id:uid(),createdAt:now()};
    Object.assign(target,{title,groupId:$("#kGroup").value,folderId:$("#kFolder").value,text:$("#kText").value});
    touch(target);if(!rec)db.knowledge.push(target);selectedFolderByArea.knowledge=target.folderId||"";saveLocal();return true;
  });
}
$$('[data-action="new-task"]').forEach(b=>b.onclick=()=>openTaskModal());$$('[data-action="new-project"]').forEach(b=>b.onclick=()=>openProjectModal());$$('[data-action="new-event"]').forEach(b=>b.onclick=()=>openEventModal());$$('[data-action="new-member"]').forEach(b=>b.onclick=()=>openMemberModal());$$('[data-action="new-group"]').forEach(b=>b.onclick=()=>openGroupModal());$$('[data-action="new-meeting"]').forEach(b=>b.onclick=()=>openMeetingModal());$$('[data-action="new-knowledge"]').forEach(b=>b.onclick=()=>openKnowledgeModal());
$("#quickCreateBtn").onclick=()=>openTaskModal();

function mergeCollection(local,cloud){ const map=new Map(); [...(local||[]),...(cloud||[])].forEach(rec=>{const old=map.get(rec.id);if(!old||new Date(rec.updatedAt||0)>=new Date(old.updatedAt||0))map.set(rec.id,rec)});return [...map.values()]; }
function mergeDB(local,cloud){ const out=normalizeDB(local); COLLECTIONS.forEach(c=>out[c]=mergeCollection(local[c],cloud[c])); if(new Date(cloud.settingsUpdatedAt||0)>new Date(local.settingsUpdatedAt||0)){out.settings=normalizeDB(cloud).settings;out.settingsUpdatedAt=cloud.settingsUpdatedAt} out.counters={memberNo:Math.max(local.counters?.memberNo||1,cloud.counters?.memberNo||1)}; out.updatedAt=now(); return out; }
function initTokenClient(){
  if(!CFG.GOOGLE_CLIENT_ID)throw new Error("Bitte zuerst GOOGLE_CLIENT_ID in config.js eintragen.");
  if(!window.google?.accounts?.oauth2)throw new Error("Google Identity Services noch nicht geladen. Internetverbindung prüfen.");
  if(!tokenClient){
    tokenClient=google.accounts.oauth2.initTokenClient({
      client_id:CFG.GOOGLE_CLIENT_ID,
      scope:SCOPES,
      callback:r=>{
        if(r.error){
          const err=new Error(`Google-Anmeldung fehlgeschlagen: ${r.error}`);
          if(tokenWaiter){ tokenWaiter.reject(err); tokenWaiter=null; }
          $("#lastSync").textContent="Drive-Verbindung fehlgeschlagen";
          renderStorage();
          return;
        }
        accessToken=r.access_token||"";
        tokenExpiresAt=Date.now()+Math.max(60,(Number(r.expires_in)||3600)-60)*1000;
        localStorage.setItem(DRIVE_GRANT_KEY,"1");
        if(tokenWaiter){ tokenWaiter.resolve(accessToken); tokenWaiter=null; }
        $("#lastSync").textContent="Drive verbunden";
        renderStorage();
      },
      error_callback:e=>{
        const msg=e?.type==="popup_closed"
          ?"Google-Anmeldung wurde geschlossen."
          :e?.type==="popup_failed_to_open"
            ?"Google-Anmeldung konnte nicht geöffnet werden. Bitte Pop-ups für diese Seite erlauben."
            :"Google Drive konnte nicht verbunden werden.";
        const err=new Error(msg);
        if(tokenWaiter){ tokenWaiter.reject(err); tokenWaiter=null; }
        $("#lastSync").textContent="Drive-Verbindung nicht hergestellt";
        renderStorage();
      }
    });
  }
  return tokenClient;
}

function ensureDriveAccess(){
  if(hasUsableAccessToken())return Promise.resolve(accessToken);
  accessToken=""; tokenExpiresAt=0;
  if(tokenWaiter)return Promise.reject(new Error("Google Drive-Verbindung wird bereits hergestellt."));
  return new Promise((resolve,reject)=>{
    tokenWaiter={resolve,reject};
    $("#lastSync").textContent=hasKnownDriveGrant()
      ?"Drive-Verbindung wird erneuert …"
      :"Google Drive wird verbunden …";
    renderStorage();
    try{
      // Leerer Prompt: Bereits erteilte Zustimmung wird wiederverwendet.
      // Der Token wird bewusst erst durch den Klick auf „Synchronisieren“ oder „Drive verbinden“ angefordert.
      initTokenClient().requestAccessToken({prompt:""});
    }catch(e){
      tokenWaiter=null;
      reject(e);
    }
  });
}

async function connectDrive(){
  await ensureDriveAccess();
  await refreshQuota();
  startPoll();
  await syncDrive(false);
}
$("#connectDriveBtn").onclick=()=>connectDrive().catch(e=>alert(e.message));

async function driveFetch(url,opt={}){
  const h=new Headers(opt.headers||{});
  h.set("Authorization",`Bearer ${accessToken}`);
  const r=await fetch(url,{...opt,headers:h});
  if(r.status===401){
    accessToken=""; tokenExpiresAt=0;
    clearInterval(window.__vpPoll);
    $("#lastSync").textContent="Drive-Verbindung abgelaufen – erneut synchronisieren";
    renderStorage();
    const err=new Error("Google-Zugriff ist abgelaufen. Bitte noch einmal auf „Synchronisieren“ klicken.");
    err.code="AUTH_REQUIRED";
    throw err;
  }
  if(!r.ok)throw new Error(`Drive-Fehler ${r.status}: ${(await r.text()).slice(0,180)}`);
  return r;
}
async function findAppData(){ const q=encodeURIComponent(`name='${APPDATA_FILE}' and trashed=false`);const j=await (await driveFetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id,name,modifiedTime)&pageSize=10`)).json();return j.files?.[0]||null; }
async function createAppData(){ const j=await (await driveFetch("https://www.googleapis.com/drive/v3/files?fields=id",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:APPDATA_FILE,parents:["appDataFolder"],mimeType:"application/json"})})).json();return j.id; }
async function uploadAppData(id,data=db){ await driveFetch(`https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)}); }
async function downloadAppData(id){ return await (await driveFetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`)).json(); }

async function syncDrive(silent=false){
  // Nach einem Reload wird der Access-Token absichtlich nicht dauerhaft gespeichert.
  // Bei einem manuellen Sync erneuert V-Planer den Token mit demselben Klick
  // und fährt danach automatisch mit dem eigentlichen Datenabgleich fort.
  if(!hasUsableAccessToken()){
    accessToken=""; tokenExpiresAt=0;
    if(silent)return;
    await ensureDriveAccess();
    await refreshQuota();
    startPoll();
  }

  if(!silent)$("#lastSync").textContent="Synchronisiere …";
  let f=await findAppData();
  if(!f){
    const id=await createAppData();
    await uploadAppData(id);
    $("#lastSync").textContent=`Erster Cloud-Stand · ${new Date().toLocaleTimeString("de-DE")}`;
    renderStorage();
    return;
  }
  const cloud=normalizeDB(await downloadAppData(f.id));
  const merged=mergeDB(db,cloud);
  db=merged;
  await syncDriveFolderNames().catch(()=>{});
  localStorage.setItem(STORAGE_KEY,JSON.stringify(db));
  await uploadAppData(f.id,db);
  renderAll();
  $("#lastSync").textContent=`Aktuell · ${new Date().toLocaleTimeString("de-DE")}`;
}

function startPoll(){
  clearInterval(window.__vpPoll);
  window.__vpPoll=setInterval(()=>{
    if(hasUsableAccessToken())syncDrive(true).catch(()=>{});
  },Math.max(15,CFG.AUTO_SYNC_SECONDS||30)*1000);
}
$("#syncBtn").onclick=()=>syncDrive(false).catch(e=>alert(e.message));
$("#syncNowBtn").onclick=()=>syncDrive(false).catch(e=>alert(e.message));

async function refreshQuota(){
  try{
    const j=await (await driveFetch("https://www.googleapis.com/drive/v3/about?fields=storageQuota")).json();
    if(j.storageQuota)cloudQuota={usage:Number(j.storageQuota.usage)||0,limit:Number(j.storageQuota.limit)||0};
    renderStorage();
  }catch{}
}

async function ensureRootFolder(){ if(rootFolderId)return rootFolderId;const name=CFG.ROOT_FOLDER_NAME||"Vereinsplanung",q=encodeURIComponent(`name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`),j=await (await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&pageSize=10`)).json();if(j.files?.[0])return rootFolderId=j.files[0].id;const c=await (await driveFetch("https://www.googleapis.com/drive/v3/files?fields=id",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,mimeType:"application/vnd.google-apps.folder"})})).json();return rootFolderId=c.id; }
async function ensureNamedDriveFolder(name,parentId){
  const safe=String(name).replace(/\\/g,"\\\\").replace(/'/g,"\\'");
  const q=encodeURIComponent(`name='${safe}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const j=await (await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&pageSize=20`)).json();
  if(j.files?.[0])return j.files[0].id;
  const c=await (await driveFetch("https://www.googleapis.com/drive/v3/files?fields=id",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,mimeType:"application/vnd.google-apps.folder",parents:[parentId]})})).json();
  return c.id;
}
async function ensureAreaDriveFolder(area){
  if(driveAreaFolderIds[area])return driveAreaFolderIds[area];
  const root=await ensureRootFolder(),id=await ensureNamedDriveFolder(AREA_META[area].driveName,root);
  driveAreaFolderIds[area]=id;return id;
}
async function ensureDriveFolderForLogicalFolder(area,folderId=""){
  const base=await ensureAreaDriveFolder(area);
  if(!folderId)return base;
  const folder=byId("folders",folderId);
  if(!folder||folder.area!==area)return base;
  if(folder.driveFolderId)return folder.driveFolderId;
  const parentDrive=folder.parentId?await ensureDriveFolderForLogicalFolder(area,folder.parentId):base;
  folder.driveFolderId=await ensureNamedDriveFolder(folder.name,parentDrive);
  folder.driveNamePending=false;touch(folder);
  db.updatedAt=now();localStorage.setItem(STORAGE_KEY,JSON.stringify(db));
  if(accessToken)scheduleAutoSync();
  return folder.driveFolderId;
}
async function syncOneDriveFolderName(folder){
  if(!folder?.driveFolderId)return;
  await driveFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folder.driveFolderId)}?fields=id,name`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:folder.name})});
  folder.driveNamePending=false;touch(folder);localStorage.setItem(STORAGE_KEY,JSON.stringify(db));
}
async function syncDriveFolderNames(){
  for(const folder of activeRows("folders").filter(f=>f.driveFolderId&&f.driveNamePending)){try{await syncOneDriveFolderName(folder)}catch{}}
}
async function compressImage(file){ if(!db.settings.compressImages||!file.type.startsWith("image/"))return file;const img=await createImageBitmap(file),max=1600,scale=Math.min(1,max/Math.max(img.width,img.height)),canvas=document.createElement("canvas");canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);const blob=await new Promise(r=>canvas.toBlob(r,"image/jpeg",.76));return new File([blob],file.name.replace(/\.[^.]+$/,"")+".jpg",{type:"image/jpeg"}); }
async function uploadAreaFile(file,area,folderId="",category=""){
  if(!hasUsableAccessToken())await ensureDriveAccess();
  const f=await compressImage(file),current=estimateLocalBytes()+activeRows("documents").reduce((s,d)=>s+(d.size||0),0),limit=(db.settings.storageLimitGB||5)*1024**3;
  if(current+f.size>limit)throw new Error("Eigenes Speicherlimit würde überschritten.");
  const targetFolder=await ensureDriveFolderForLogicalFolder(area,folderId);
  const boundary=`vp_${Date.now()}_${Math.random().toString(16).slice(2)}`,meta={name:f.name,parents:[targetFolder]},
        body=new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: ${f.type||"application/octet-stream"}\r\n\r\n`,f,`\r\n--${boundary}--`]);
  const j=await (await driveFetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,createdTime,webViewLink,mimeType,parents",{method:"POST",headers:{"Content-Type":`multipart/related; boundary=${boundary}`},body})).json();
  db.documents.unshift({id:j.id,name:j.name,size:Number(j.size)||f.size,area,folderId:folderId||"",category:category||"",mimeType:j.mimeType||f.type||"",createdAt:j.createdTime||now(),webViewLink:j.webViewLink||"",updatedAt:now()});
  saveLocal();
}
async function moveStoredFile(doc,targetFolderId){
  const area=doc.area||"documents";
  if(!hasUsableAccessToken())await ensureDriveAccess();
  const newParent=await ensureDriveFolderForLogicalFolder(area,targetFolderId||"");
  const info=await (await driveFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(doc.id)}?fields=parents`)).json();
  const oldParents=(info.parents||[]).filter(Boolean),params=new URLSearchParams({addParents:newParent,fields:"id,parents"});
  if(oldParents.length)params.set("removeParents",oldParents.join(","));
  await driveFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(doc.id)}?${params.toString()}`,{method:"PATCH"});
  doc.area=area;doc.folderId=targetFolderId||"";touch(doc);selectedFolderByArea[area]=doc.folderId;saveLocal();
}
async function handleAreaUpload(area,inputId,categoryId=""){
  const input=$("#"+inputId),files=[...(input.files||[])];
  if(!files.length)return alert("Bitte mindestens eine Datei auswählen.");
  const folderId=currentFolderId(area),category=categoryId?$("#"+categoryId).value:"";
  try{
    for(const f of files)await uploadAreaFile(f,area,folderId,category);
    input.value="";
    alert(`${files.length} Datei${files.length===1?"":"en"} erfolgreich hochgeladen.`);
  }catch(e){alert(e.message)}
}
$("#uploadBtn").onclick=()=>handleAreaUpload("documents","fileInput","docCategory");
$("#meetingUploadBtn").onclick=()=>handleAreaUpload("meetings","meetingFileInput");
$("#knowledgeUploadBtn").onclick=()=>handleAreaUpload("knowledge","knowledgeFileInput");

applyUiScale();

if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
renderAll();
})();
