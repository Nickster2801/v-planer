(() => {
"use strict";

const CFG = window.VP_CONFIG || {};
const STORAGE_KEY = "v-planer-cloud-v1.0";
const DRIVE_GRANT_KEY = "v-planer-drive-grant-known-v1";
const APPDATA_FILE = "v-planer-data-v1.0.json";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const CALENDAR_SCOPE = `${DRIVE_SCOPE} https://www.googleapis.com/auth/calendar.app.created`;
const SCOPES = DRIVE_SCOPE;
const CALENDAR_GRANT_KEY = "v-planer-calendar-grant-known-v1";
const CALENDAR_ID_KEY = "v-planer-google-calendar-id-v1";
const CALENDAR_PREFS_KEY = "v-planer-google-calendar-prefs-v1";
const COLLECTIONS = ["tasks","projects","events","members","groups","functions","fines"];

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
    version:8, updatedAt:now(), settingsUpdatedAt:now(), googleCalendarId:"", googleCalendarUpdatedAt:"",
    settings:{
      clubName:"Mein Verein", userRole:"Vorstand", uiScale:100, honoraryContributionFree:false, calendarSyncEnabled:false,
      clubData:{
        shortName:"",
        logoData:"",
        foundedDate:"",
        legalForm:"e. V.",
        address:{street:"",zip:"",city:""},
        contact:{email:"",phone:"",website:""},
        registry:{registerNo:"",registerCourt:"",taxNo:"",taxOffice:""},
        fiscalYearStart:"01.01.",
        fiscalYearEnd:"31.12.",
        venue:{name:"",street:"",zip:"",city:""},
        responsibleFunctions:{chairFunctionId:"",secretaryFunctionId:"",treasurerFunctionId:""},
        description:"",
        internalNotes:""
      },
      groupTypes:["Abteilung","Mannschaft","Trainingsgruppe","Vorstand","Ausschuss","Arbeitsgruppe","Projektgruppe"],
      fineCatalog:[],
      reminders:{enabled:true,infoDays:14,warningDays:7,alarmDays:2,birthdayWeek:true,roundBirthdays:true,roundBirthdayAges:[20,30,40,50,60,70,80,90,100],jubilee:true,jubileeYears:[10,20,25,30,40,50]}
    },
    counters:{memberNo:1},
    tasks:[],projects:[],events:[],members:[],groups:[],functions:[],fines:[],financeSnapshots:[]
  };
}
function normalizeDB(data){
  const base=defaultDB(), out={...base,...(data||{})};
  out.settings={...base.settings,...(data?.settings||{})};
  const rawClubData=data?.settings?.clubData||{};
  out.settings.clubData={
    ...base.settings.clubData,
    ...rawClubData,
    address:{...base.settings.clubData.address,...(rawClubData.address||{})},
    contact:{...base.settings.clubData.contact,...(rawClubData.contact||{})},
    registry:{...base.settings.clubData.registry,...(rawClubData.registry||{})},
    venue:{...base.settings.clubData.venue,...(rawClubData.venue||{})},
    responsibleFunctions:{...base.settings.clubData.responsibleFunctions,...(rawClubData.responsibleFunctions||{})}
  };
  out.settings.uiScale=Math.min(125,Math.max(80,Number(out.settings.uiScale)||100));
  out.settings.groupTypes=Array.isArray(data?.settings?.groupTypes)
    ? data.settings.groupTypes.map(x=>String(x||"").trim()).filter(Boolean)
    : [...base.settings.groupTypes];
  out.settings.fineCatalog=Array.isArray(data?.settings?.fineCatalog)
    ? data.settings.fineCatalog.map(x=>({
        id:String(x?.id||uid()),
        label:String(x?.label||x?.reason||"").trim(),
        amount:Math.max(0,Number(x?.amount)||0)
      })).filter(x=>x.label&&x.amount>0)
    : [];
  out.settings.reminders={...base.settings.reminders,...(data?.settings?.reminders||{})};
  out.settings.reminders.roundBirthdayAges=Array.isArray(data?.settings?.reminders?.roundBirthdayAges)
    ? [...new Set(data.settings.reminders.roundBirthdayAges.map(Number).filter(n=>Number.isInteger(n)&&n>0&&n<=150))].sort((a,b)=>a-b)
    : [...base.settings.reminders.roundBirthdayAges];
  out.settings.reminders.jubileeYears=Array.isArray(data?.settings?.reminders?.jubileeYears)
    ? [...new Set(data.settings.reminders.jubileeYears.map(Number).filter(n=>Number.isInteger(n)&&n>0&&n<=150))].sort((a,b)=>a-b)
    : [...base.settings.reminders.jubileeYears];
  out.counters={...base.counters,...(data?.counters||{})};
  COLLECTIONS.forEach(c=>out[c]=Array.isArray(data?.[c])?data[c]:[]);
  out.financeSnapshots=Array.isArray(data?.financeSnapshots)?data.financeSnapshots:[];
  ["meetings","documents","knowledge","folders","links","memberRelations","households",
   "financeKassenKumpelState","financeKassenKumpelUpdatedAt"].forEach(key=>delete out[key]);
  delete out.settings.modules;
  delete out.settings.storageLimitGB;
  return out;
}
function loadDB(){ try { return normalizeDB(JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}")); } catch { return defaultDB(); } }
let db = loadDB();
/* Production build: no demo seed data. */
let selectedMemberId = null, selectedGroupId = null, calDate = new Date();
let memberSort = {key:"name",dir:"asc"};
let taskSort = {key:"due",dir:"asc"};
let fineSort = {key:"date",dir:"desc"};
let accessToken="", tokenClient=null, syncTimer=null;
let tokenExpiresAt=0, tokenWaiter=null;
let accessTokenHasCalendarScope=false;

let calendarAccessToken="", calendarTokenClient=null, calendarTokenExpiresAt=0, calendarTokenWaiter=null;
let calendarSyncTimer=null, calendarSyncRunning=false, calendarEnsurePromise=null;

function allRows(collection){ return (db[collection]||[]).filter(x=>!x.deletedAt); }
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
function markDeleted(collection,id,meta={}){ const r=(db[collection]||[]).find(x=>x.id===id); if(r){r.deletedAt=now();r.updatedAt=r.deletedAt;Object.assign(r,meta||{});} }
function saveLocal(opts={}){
  db.updatedAt=now(); localStorage.setItem(STORAGE_KEY,JSON.stringify(db)); renderAll();
  if(opts.autoSync!==false && accessToken) scheduleAutoSync();
  if(opts.autoCalendar!==false && db.settings.calendarSyncEnabled===true && hasUsableCalendarToken()) scheduleCalendarAutoSync();
}
function defaultCalendarPrefs(){
  return {enabled:false,syncEvents:true,syncBirthdays:false,syncTasks:false,syncProjects:false,calendarName:"V-Planer"};
}
function calendarPrefs(){
  let stored={};
  try{stored=JSON.parse(localStorage.getItem(CALENDAR_PREFS_KEY)||"{}")||{}}catch{}
  return {...defaultCalendarPrefs(),...stored,enabled:db.settings.calendarSyncEnabled===true,syncEvents:true,syncBirthdays:false,syncTasks:false,syncProjects:false,calendarName:"V-Planer"};
}
function saveCalendarPrefs(prefs){
  const clean={...defaultCalendarPrefs(),...(prefs||{}),enabled:db.settings.calendarSyncEnabled===true,syncEvents:true,syncBirthdays:false,syncTasks:false,syncProjects:false,calendarName:"V-Planer"};
  localStorage.setItem(CALENDAR_PREFS_KEY,JSON.stringify(clean));
  return clean;
}
function hasKnownCalendarGrant(){return localStorage.getItem(CALENDAR_GRANT_KEY)==="1"}
function hasUsableCalendarToken(){return !!calendarAccessToken && Date.now()<calendarTokenExpiresAt}
function googleCalendarId(){
  return String(db.googleCalendarId||localStorage.getItem(CALENDAR_ID_KEY)||"").trim();
}
function setGoogleCalendarId(id){
  const clean=String(id||"").trim();
  if(clean)localStorage.setItem(CALENDAR_ID_KEY,clean);
  else localStorage.removeItem(CALENDAR_ID_KEY);
  if(db.googleCalendarId!==clean){
    db.googleCalendarId=clean;
    db.googleCalendarUpdatedAt=now();
    db.updatedAt=now();
    localStorage.setItem(STORAGE_KEY,JSON.stringify(db));
    if(hasUsableAccessToken())scheduleAutoSync();
  }
}
function calendarTimeZone(){
  return Intl.DateTimeFormat().resolvedOptions().timeZone||"Europe/Berlin";
}
function isoDayOffset(dateStr,days){
  if(!dateStr)return "";
  const d=new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate()+days);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function oneHourAfter(dateStr,timeStr){
  const [h,m]=String(timeStr||"00:00").split(":").map(Number);
  const d=new Date(`${dateStr}T${String(h||0).padStart(2,"0")}:${String(m||0).padStart(2,"0")}:00`);
  d.setMinutes(d.getMinutes()+60);
  return {
    date:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`,
    time:`${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`
  };
}
function calendarRecordKey(type,id){return `${type}:${id}`}
function calendarRecordExists(type,id){
  const collection=type==="event"?"events":type==="birthday"?"members":type==="task"?"tasks":type==="project"?"projects":"";
  return collection?db[collection].some(r=>r.id===id):false;
}
function calendarRecordEligible(type,rec,prefs=calendarPrefs()){
  if(!rec||rec.deletedAt)return false;
  if(type==="event")return prefs.syncEvents && !!eventStartDate(rec);
  if(type==="birthday")return prefs.syncBirthdays && rec.status!=="deceased" && !!rec.birthDate;
  if(type==="task")return prefs.syncTasks && !rec.archivedAt && !!rec.due;
  if(type==="project")return prefs.syncProjects && !rec.archivedAt && !!projectStartDate(rec);
  return false;
}
function calendarDescriptionLines(type,rec){
  if(type==="birthday"){
    return [
      "V-Planer Geburtstag",
      `Mitglied: ${memberFullName(rec)}`,
      rec.memberNo?`Mitgliedsnummer: ${rec.memberNo}`:"",
      "Wird jährlich aus dem im V-Planer hinterlegten Geburtsdatum synchronisiert."
    ].filter(Boolean);
  }
  if(type==="event"){
    const linkedProject=linkedProjectForEvent(rec);
    return [
      "V-Planer Termin",
      linkedProject?`Projekt: ${linkedProject.name}`:"",
      rec.groupId?`Gruppe: ${groupName(rec.groupId)}`:"",
      rec.location?`Ort: ${rec.location}`:"",
      rec.description||""
    ].filter(Boolean);
  }
  if(type==="task"){
    return [
      "V-Planer Aufgabe",
      `Status: ${statusLabel(rec.status)}`,
      `Priorität: ${taskPriorityLabel(rec.priority)}`,
      rec.projectId?`Projekt: ${projectNameAny(rec.projectId)}`:"",
      rec.groupId?`Gruppe: ${groupName(rec.groupId)}`:"",
      rec.description||""
    ].filter(Boolean);
  }
  const stats=projectTaskStats(rec.id);
  const linkedEvent=linkedEventForProject(rec);
  return [
    "V-Planer Projekt",
    `Status: ${statusLabel(rec.status)}`,
    `Fortschritt: ${stats.progress}% (${stats.done}/${stats.total} Aufgaben erledigt)`,
    linkedEvent?`Zugehöriger Termin: ${linkedEvent.title} · ${projectEventSummary(linkedEvent)}`:"",
    rec.groupId?`Gruppe: ${groupName(rec.groupId)}`:"",
    rec.description||""
  ].filter(Boolean);
}
function googleCalendarBody(type,rec){
  const privateProps={
    vPlanerApp:"V-Planer",
    vPlanerRecordType:type,
    vPlanerRecordId:rec.id,
    vPlanerUpdatedAt:rec.updatedAt||""
  };
  const common={
    description:calendarDescriptionLines(type,rec).join("\n"),
    extendedProperties:{private:privateProps}
  };

  if(type==="birthday"){
    const sd=rec.birthDate;
    return {
      ...common,
      summary:`🎂 Geburtstag: ${memberFullName(rec)}`,
      start:{date:sd},
      end:{date:isoDayOffset(sd,1)},
      recurrence:["RRULE:FREQ=YEARLY"],
      transparency:"transparent"
    };
  }

  if(type==="event"){
    const sd=eventStartDate(rec),ed=eventEndDate(rec)||sd,
          st=eventStartTime(rec),et=eventEndTime(rec),
          hasTime=!!(st||et);
    const body={...common,summary:rec.title||"V-Planer Termin",location:rec.location||""};

    if(!hasTime){
      body.start={date:sd};
      body.end={date:isoDayOffset(ed,1)};
      return body;
    }

    const startTime=st||"00:00";
    let endDate=ed,endTime=et;
    if(!endTime){
      const plus=oneHourAfter(sd,startTime);
      if(ed===sd){endDate=plus.date;endTime=plus.time}
      else endTime=startTime;
    }

    // Defensive guard: Google requires end strictly after start.
    if(`${endDate}T${endTime}`<=`${sd}T${startTime}`){
      const plus=oneHourAfter(sd,startTime);
      endDate=plus.date;endTime=plus.time;
    }

    const tz=calendarTimeZone();
    body.start={dateTime:`${sd}T${startTime}:00`,timeZone:tz};
    body.end={dateTime:`${endDate}T${endTime}:00`,timeZone:tz};
    return body;
  }

  if(type==="task"){
    return {
      ...common,
      summary:`✓ ${rec.title||"Aufgabe"}`,
      start:{date:rec.due},
      end:{date:isoDayOffset(rec.due,1)}
    };
  }

  const projectStart=projectStartDate(rec),projectEnd=projectEndDate(rec)||projectStart;
  return {
    ...common,
    summary:`◆ ${rec.name||"Projekt"}`,
    start:{date:projectStart},
    // Google Calendar uses an exclusive end date for all-day entries.
    end:{date:isoDayOffset(projectEnd,1)}
  };
}
function initCalendarTokenClient(){
  if(!CFG.GOOGLE_CLIENT_ID)throw new Error("Bitte zuerst GOOGLE_CLIENT_ID in config.js eintragen.");
  if(!window.google?.accounts?.oauth2)throw new Error("Google Identity Services noch nicht geladen. Internetverbindung prüfen.");
  if(!calendarTokenClient){
    calendarTokenClient=google.accounts.oauth2.initTokenClient({
      client_id:CFG.GOOGLE_CLIENT_ID,
      scope:CALENDAR_SCOPE,
      callback:r=>{
        if(r.error){
          const err=new Error(`Google-Kalender-Anmeldung fehlgeschlagen: ${r.error}`);
          if(calendarTokenWaiter){calendarTokenWaiter.reject(err);calendarTokenWaiter=null}
          calendarAccessToken="";calendarTokenExpiresAt=0;
          renderCalendarSyncSettings();
          return;
        }
        calendarAccessToken=r.access_token||"";
        calendarTokenExpiresAt=Date.now()+Math.max(60,(Number(r.expires_in)||3600)-60)*1000;
        // Seit 2.1.5 werden Drive und Kalender mit demselben Google-Token verbunden.
        accessToken=calendarAccessToken;
        tokenExpiresAt=calendarTokenExpiresAt;
        accessTokenHasCalendarScope=true;
        localStorage.setItem(CALENDAR_GRANT_KEY,"1");
        localStorage.setItem(DRIVE_GRANT_KEY,"1");
        startPoll();
        if(calendarTokenWaiter){calendarTokenWaiter.resolve(calendarAccessToken);calendarTokenWaiter=null}
        renderCalendarSyncSettings();
      },
      error_callback:e=>{
        const msg=e?.type==="popup_closed"
          ?"Google-Kalender-Anmeldung wurde geschlossen."
          :e?.type==="popup_failed_to_open"
            ?"Google-Kalender-Anmeldung konnte nicht geöffnet werden. Bitte Pop-ups für diese Seite erlauben."
            :"Google Kalender konnte nicht verbunden werden.";
        const err=new Error(msg);
        if(calendarTokenWaiter){calendarTokenWaiter.reject(err);calendarTokenWaiter=null}
        renderCalendarSyncSettings();
      }
    });
  }
  return calendarTokenClient;
}
function ensureCalendarAccess(){
  if(hasUsableCalendarToken())return Promise.resolve(calendarAccessToken);
  if(hasUsableAccessToken()&&accessTokenHasCalendarScope){
    calendarAccessToken=accessToken;
    calendarTokenExpiresAt=tokenExpiresAt;
    localStorage.setItem(CALENDAR_GRANT_KEY,"1");
    return Promise.resolve(calendarAccessToken);
  }
  calendarAccessToken="";calendarTokenExpiresAt=0;
  if(calendarTokenWaiter)return Promise.reject(new Error("Google-Kalender-Verbindung wird bereits hergestellt."));
  return new Promise((resolve,reject)=>{
    calendarTokenWaiter={resolve,reject};
    renderCalendarSyncSettings("Google Kalender wird verbunden …");
    try{
      initCalendarTokenClient().requestAccessToken({prompt:""});
    }catch(e){
      calendarTokenWaiter=null;
      reject(e);
    }
  });
}
async function calendarFetch(url,opt={}){
  if(!hasUsableCalendarToken()){
    const err=new Error("Google-Kalender-Zugriff ist abgelaufen. Bitte erneut auf „Verbinden / synchronisieren“ klicken.");
    err.code="CALENDAR_AUTH_REQUIRED";
    throw err;
  }
  const headers=new Headers(opt.headers||{});
  headers.set("Authorization",`Bearer ${calendarAccessToken}`);
  const response=await fetch(url,{...opt,headers});
  if(response.status===401){
    calendarAccessToken="";calendarTokenExpiresAt=0;
    accessToken="";tokenExpiresAt=0;
    clearInterval(window.__vpPoll);
    renderCalendarSyncSettings();
    const err=new Error("Google-Kalender-Zugriff ist abgelaufen. Bitte erneut verbinden.");
    err.code="CALENDAR_AUTH_REQUIRED";
    throw err;
  }
  if(!response.ok){
    const text=(await response.text()).slice(0,500);
    if(response.status===403){
      throw new Error("Google Calendar API verweigert den Zugriff. Bitte prüfen, ob die Google Calendar API im verwendeten Google-Cloud-Projekt aktiviert und der Kalender-Scope zugelassen ist.");
    }
    const err=new Error(`Google-Kalender-Fehler ${response.status}: ${text}`);
    err.status=response.status;
    throw err;
  }
  return response;
}
async function validateGoogleCalendar(calendarId){
  if(!calendarId)return false;
  try{
    await calendarFetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}`);
    return true;
  }catch(e){
    if(e.status===404)return false;
    throw e;
  }
}
async function ensureVPlanerGoogleCalendar(){
  if(calendarEnsurePromise)return calendarEnsurePromise;
  calendarEnsurePromise=(async()=>{
    // Die Kalender-ID wird sowohl lokal als auch im Drive-synchronisierten Datenbestand gehalten.
    // Dadurch verwenden weitere Tabs/Geraete denselben V-Planer-Kalender, statt einen neuen anzulegen.
    const candidates=[db.googleCalendarId,localStorage.getItem(CALENDAR_ID_KEY)].map(x=>String(x||"").trim()).filter(Boolean);
    for(const id of [...new Set(candidates)]){
      const valid=await validateGoogleCalendar(id).catch(e=>{
        if(e.status===404||e.status===410)return false;
        throw e;
      });
      if(valid){
        setGoogleCalendarId(id);
        return id;
      }
    }

    // Keine der bekannten IDs existiert noch (z. B. nach manuellem Loeschen in Google).
    // Erst jetzt wird genau ein neuer Kalender erzeugt.
    setGoogleCalendarId("");
    const prefs=calendarPrefs();
    const created=await (await calendarFetch("https://www.googleapis.com/calendar/v3/calendars",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        summary:prefs.calendarName||"V-Planer",
        description:"V-Planer – automatisch verwalteter Kalender. Bitte nicht mehrfach anlegen.",
        timeZone:calendarTimeZone()
      })
    })).json();

    if(!created.id)throw new Error("Google Kalender wurde erstellt, aber es wurde keine Kalender-ID zurückgegeben.");
    setGoogleCalendarId(created.id);
    return created.id;
  })();
  try{return await calendarEnsurePromise}
  finally{calendarEnsurePromise=null}
}
async function listVPlanerGoogleEvents(calendarId){
  const result=[];
  let pageToken="";
  do{
    const params=new URLSearchParams({
      maxResults:"2500",
      singleEvents:"false",
      showDeleted:"true"
    });
    if(pageToken)params.set("pageToken",pageToken);
    const data=await (await calendarFetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`)).json();
    result.push(...(data.items||[]));
    pageToken=data.nextPageToken||"";
  }while(pageToken);
  return result;
}
function remoteVPlanerEventMap(items){
  const map=new Map();
  (items||[]).forEach(item=>{
    const p=item.extendedProperties?.private||{};
    if(!p.vPlanerRecordType||!p.vPlanerRecordId)return;
    const key=calendarRecordKey(p.vPlanerRecordType,p.vPlanerRecordId),current=map.get(key);
    if(!current){map.set(key,item);return;}
    // Prefer an active event over an older cancelled master. This is especially
    // important when a recurring birthday was deleted and safely recreated.
    if(current.status==="cancelled"&&item.status!=="cancelled"){map.set(key,item);return;}
    if(current.status!=="cancelled"&&item.status==="cancelled")return;
    if(new Date(item.updated||0).getTime()>new Date(current.updated||0).getTime())map.set(key,item);
  });
  return map;
}
function calendarTypeCollection(type){
  return type==="event"?"events":type==="birthday"?"members":type==="task"?"tasks":type==="project"?"projects":"";
}
function calendarTypeEnabled(type,prefs=calendarPrefs()){
  if(type==="event")return !!prefs.syncEvents;
  if(type==="birthday")return !!prefs.syncBirthdays;
  if(type==="task")return !!prefs.syncTasks;
  if(type==="project")return !!prefs.syncProjects;
  return false;
}
function googleCalendarEventParts(item){
  const s=item?.start||{},e=item?.end||{};
  if(s.date){
    const sd=s.date||"";
    const exclusiveEnd=e.date||isoDayOffset(sd,1);
    return {startDate:sd,endDate:isoDayOffset(exclusiveEnd,-1)||sd,startTime:"",endTime:"",allDay:true};
  }
  const start=String(s.dateTime||"");
  const end=String(e.dateTime||"");
  const sd=start.slice(0,10),ed=(end.slice(0,10)||sd);
  return {startDate:sd,endDate:ed,startTime:start.slice(11,16),endTime:end.slice(11,16),allDay:false};
}
function stripCalendarPrefix(type,title){
  const s=String(title||"").trim();
  if(type==="birthday")return s.replace(/^🎂\s*Geburtstag:\s*/i,"")||"Geburtstag";
  if(type==="task")return s.replace(/^✓\s*/,"")||"Aufgabe";
  if(type==="project")return s.replace(/^◆\s*/,"")||"Projekt";
  return s||"Termin";
}
function birthDateWithRemoteMonthDay(localBirthDate,remoteDate){
  if(!remoteDate)return localBirthDate||"";
  if(!localBirthDate)return remoteDate;
  const year=localBirthDate.slice(0,4),candidate=`${year}-${remoteDate.slice(5,10)}`;
  const d=new Date(`${candidate}T12:00:00`);
  if(Number.isNaN(d.getTime())||`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`!==candidate)return localBirthDate;
  return candidate;
}
function applyGoogleCalendarEventToLocal(type,rec,item){
  const parts=googleCalendarEventParts(item);
  if(type==="birthday"){
    // The member record remains authoritative for the person's name and birth year.
    // Moving the recurring birthday in Google updates only month/day in V-Planer.
    rec.birthDate=birthDateWithRemoteMonthDay(rec.birthDate,parts.startDate);
  }else if(type==="event"){
    Object.assign(rec,{
      title:stripCalendarPrefix(type,item.summary),
      startDate:parts.startDate,
      endDate:parts.endDate||parts.startDate,
      startTime:parts.startTime,
      endTime:parts.endTime,
      date:parts.startDate,
      time:parts.startTime,
      location:item.location||"",
      groupId:rec.groupId||"",
      color:rec.color||"#1677c8"
    });
  }else if(type==="task"){
    rec.title=stripCalendarPrefix(type,item.summary);
    rec.due=parts.startDate||rec.due||"";
    rec.status=rec.status||"open";
    rec.priority=rec.priority||"mid";
    rec.projectId=rec.projectId||"";
    rec.groupId=rec.groupId||"";
    rec.description=rec.description||"";
  }else if(type==="project"){
    rec.name=stripCalendarPrefix(type,item.summary);
    rec.startDate=parts.startDate||projectStartDate(rec)||"";
    rec.endDate=parts.endDate||rec.startDate;
    // Legacy due remains the project end/target date for old views and data.
    rec.due=rec.endDate||rec.startDate||"";
    rec.status=rec.status||"active";
    rec.groupId=rec.groupId||"";
    rec.description=rec.description||"";
  }
  rec.calendarGoogleEventId=item.id||rec.calendarGoogleEventId||"";
  rec.updatedAt=item.updated||now();
  delete rec.deletedAt;
  return rec;
}
function createLocalFromGoogleCalendar(type,item,preferredId=""){
  const common={id:preferredId||uid(),createdAt:item.created||now(),updatedAt:item.updated||now(),calendarGoogleEventId:item.id||""};
  let rec;
  if(type==="task")rec={...common,title:"Aufgabe",due:"",priority:"mid",projectId:"",groupId:"",status:"open",description:""};
  else if(type==="project")rec={...common,name:"Projekt",startDate:"",endDate:"",due:"",status:"active",groupId:"",description:""};
  else rec={...common,title:"Termin",startDate:"",endDate:"",startTime:"",endTime:"",date:"",time:"",location:"",groupId:"",color:"#1677c8"};
  applyGoogleCalendarEventToLocal(type,rec,item);
  return rec;
}
function setCalendarSyncMarkers(rec,item){
  if(item?.id)rec.calendarGoogleEventId=item.id;
  rec.calendarLastLocalUpdatedAt=rec.updatedAt||"";
  rec.calendarLastRemoteUpdatedAt=item?.updated||"";
}
function calendarRemoteMatchesLocal(type,rec,item){
  const parts=googleCalendarEventParts(item);
  if(type==="birthday"){
    const expectedTitle=`🎂 Geburtstag: ${memberFullName(rec)}`;
    const yearly=(item.recurrence||[]).some(x=>String(x).toUpperCase().includes("FREQ=YEARLY"));
    return String(item.summary||"")===expectedTitle && parts.startDate===(rec.birthDate||"") && yearly;
  }
  if(type==="event"){
    return stripCalendarPrefix(type,item.summary)===(rec.title||"Termin") &&
      String(item.location||"")===String(rec.location||"") &&
      parts.startDate===eventStartDate(rec) &&
      parts.endDate===(eventEndDate(rec)||eventStartDate(rec)) &&
      parts.startTime===eventStartTime(rec) &&
      parts.endTime===eventEndTime(rec);
  }
  if(type==="task")return stripCalendarPrefix(type,item.summary)===(rec.title||"Aufgabe")&&parts.startDate===(rec.due||"");
  if(type==="project")return stripCalendarPrefix(type,item.summary)===(rec.name||"Projekt")&&
    parts.startDate===projectStartDate(rec)&&
    parts.endDate===projectEndDate(rec);
  return false;
}
function calendarRemoteIsNewer(item,rec){
  return new Date(item?.updated||0).getTime()>new Date(rec?.updatedAt||0).getTime();
}
async function deleteGoogleCalendarEvent(calendarId,eventId){
  try{
    await calendarFetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,{method:"DELETE"});
  }catch(e){
    if(e.status!==404&&e.status!==410)throw e;
  }
}
async function writeGoogleCalendarEvent(calendarId,type,rec,remote=null){
  const body=googleCalendarBody(type,rec);
  if(remote?.id&&remote.status!=="cancelled"){
    try{
      const updated=await (await calendarFetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(remote.id)}`,
        {method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}
      )).json();
      return {action:"updated",event:updated};
    }catch(e){
      if(e.status!==404&&e.status!==410)throw e;
    }
  }
  const created=await (await calendarFetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}
  )).json();
  return {action:"created",event:created};
}
async function tagGoogleCalendarEvent(calendarId,item,type,rec){
  const oldPrivate=item.extendedProperties?.private||{};
  const body={extendedProperties:{private:{
    ...oldPrivate,
    vPlanerApp:"V-Planer",
    vPlanerRecordType:type,
    vPlanerRecordId:rec.id,
    vPlanerUpdatedAt:rec.updatedAt||""
  }}};
  return await (await calendarFetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(item.id)}`,
    {method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}
  )).json();
}
async function syncGoogleCalendar({interactive=false}={}){
  const prefs=calendarPrefs();
  if(!prefs.enabled){
    if(interactive)alert("Bitte zuerst in den Einstellungen „Kalendersynchronisierung aktiv“ einschalten.");
    return;
  }
  if(calendarSyncRunning)return;
  calendarSyncRunning=true;
  renderCalendarSyncSettings("Synchronisiere in beide Richtungen mit Google Kalender …");

  try{
    if(!hasUsableCalendarToken()){
      if(!interactive)return;
      await ensureCalendarAccess();
    }

    const calendarId=await ensureVPlanerGoogleCalendar();
    const remoteItems=await listVPlanerGoogleEvents(calendarId);
    const remoteByKey=remoteVPlanerEventMap(remoteItems);
    const remoteById=new Map(remoteItems.filter(x=>x?.id).map(x=>[x.id,x]));
    const claimedRemoteIds=new Set();
    let created=0,updated=0,pulled=0,imported=0,deletedRemote=0,deletedLocal=0,unchanged=0,conflicts=0,skippedRecurring=0;

    const sets=[["event",db.events],["birthday",db.members],["task",db.tasks],["project",db.projects]];

    for(const [type,records] of sets){
      if(!calendarTypeEnabled(type,prefs))continue;
      for(const rec of records){
        const key=calendarRecordKey(type,rec.id);
        let remote=remoteByKey.get(key)||remoteById.get(rec.calendarGoogleEventId||"")||null;
        if(remote?.id)claimedRemoteIds.add(remote.id);

        const isDeleted=!!rec.deletedAt;
        const isEligible=calendarRecordEligible(type,rec,prefs);

        // Local deletion wins unless Google contains a truly newer edit.
        if(isDeleted){
          if(remote&&remote.status!=="cancelled"){
            if(calendarRemoteIsNewer(remote,rec)){
              applyGoogleCalendarEventToLocal(type,rec,remote);
              setCalendarSyncMarkers(rec,remote);
              pulled++;conflicts++;
            }else{
              await deleteGoogleCalendarEvent(calendarId,remote.id);
              deletedRemote++;
            }
          }
          continue;
        }

        // Archived records / records without a synchronisable date are removed from the calendar.
        if(!isEligible){
          if(remote?.id&&remote.status!=="cancelled"){
            await deleteGoogleCalendarEvent(calendarId,remote.id);
            deletedRemote++;
          }
          continue;
        }

        // Google deletion: regular records are removed locally unless a newer local edit exists.
        // A birthday is derived from member master data; deleting it in Google must never delete the member.
        // Therefore a deleted birthday series is safely recreated on the next sync.
        if(remote?.status==="cancelled"){
          if(type==="birthday"){
            const result=await writeGoogleCalendarEvent(calendarId,type,rec,null);
            setCalendarSyncMarkers(rec,result.event);
            created++;
            continue;
          }
          const localChanged=!!rec.calendarLastLocalUpdatedAt&&rec.updatedAt!==rec.calendarLastLocalUpdatedAt;
          if(localChanged&&!calendarRemoteIsNewer(remote,rec)){
            const result=await writeGoogleCalendarEvent(calendarId,type,rec,null);
            setCalendarSyncMarkers(rec,result.event);
            created++;conflicts++;
          }else{
            rec.deletedAt=remote.updated||now();
            rec.updatedAt=rec.deletedAt;
            rec.calendarGoogleEventId=remote.id||rec.calendarGoogleEventId||"";
            rec.calendarLastLocalUpdatedAt=rec.updatedAt;
            rec.calendarLastRemoteUpdatedAt=remote.updated||"";
            deletedLocal++;
          }
          continue;
        }

        if(!remote){
          // A record that was previously linked but disappeared remotely is treated as a Google deletion.
          // Birthday series are an exception: the member/birth date is never deleted by a calendar action.
          if(rec.calendarGoogleEventId&&rec.calendarLastRemoteUpdatedAt){
            if(type==="birthday"){
              conflicts++;
            }else{
              const localChanged=rec.updatedAt!==rec.calendarLastLocalUpdatedAt;
              if(!localChanged){
                rec.deletedAt=now();rec.updatedAt=rec.deletedAt;deletedLocal++;
                continue;
              }
              conflicts++;
            }
          }
          const result=await writeGoogleCalendarEvent(calendarId,type,rec,null);
          setCalendarSyncMarkers(rec,result.event);
          created++;
          continue;
        }

        const remoteVersion=remote.extendedProperties?.private?.vPlanerUpdatedAt||"";
        const hasMarkers=!!(rec.calendarLastLocalUpdatedAt||rec.calendarLastRemoteUpdatedAt);

        // Migration from the former one-way synchronisation: compare the actual calendar fields.
        // This also detects a Google-side edit even when the old vPlanerUpdatedAt marker still matches.
        const remoteMatchesLocal=calendarRemoteMatchesLocal(type,rec,remote);
        if(!hasMarkers&&remoteVersion&&(remoteVersion===(rec.updatedAt||""))&&remoteMatchesLocal){
          setCalendarSyncMarkers(rec,remote);unchanged++;continue;
        }

        const localChanged=hasMarkers
          ? rec.updatedAt!==rec.calendarLastLocalUpdatedAt
          : (!!remoteVersion?remoteVersion!==rec.updatedAt:!remoteMatchesLocal&&new Date(rec.updatedAt||0)>new Date(remote.updated||0));
        const remoteChanged=hasMarkers
          ? remote.updated!==rec.calendarLastRemoteUpdatedAt
          : !remoteMatchesLocal;

        if(remoteChanged&&!localChanged){
          applyGoogleCalendarEventToLocal(type,rec,remote);
          setCalendarSyncMarkers(rec,remote);
          pulled++;
        }else if(localChanged&&!remoteChanged){
          const result=await writeGoogleCalendarEvent(calendarId,type,rec,remote);
          setCalendarSyncMarkers(rec,result.event);
          updated++;
        }else if(remoteChanged&&localChanged){
          conflicts++;
          if(calendarRemoteIsNewer(remote,rec)){
            applyGoogleCalendarEventToLocal(type,rec,remote);
            setCalendarSyncMarkers(rec,remote);
            pulled++;
          }else{
            const result=await writeGoogleCalendarEvent(calendarId,type,rec,remote);
            setCalendarSyncMarkers(rec,result.event);
            updated++;
          }
        }else{
          setCalendarSyncMarkers(rec,remote);unchanged++;
        }
      }
    }

    // Import entries created directly in the dedicated Google calendar.
    for(const item of remoteItems){
      if(!item?.id||claimedRemoteIds.has(item.id)||item.status==="cancelled")continue;
      if(item.recurrence?.length||item.recurringEventId){skippedRecurring++;continue;}
      const p=item.extendedProperties?.private||{};
      // Only independent Google records can create new V-Planer work items.
      // A Google calendar entry must never create a new member just because it resembles a birthday.
      let type=(p.vPlanerApp==="V-Planer"&&["event","task","project"].includes(p.vPlanerRecordType))?p.vPlanerRecordType:"event";
      if(!calendarTypeEnabled(type,prefs))continue;
      const collection=calendarTypeCollection(type);
      if(!collection)continue;

      const preferredId=(p.vPlanerApp==="V-Planer"&&p.vPlanerRecordId)?p.vPlanerRecordId:"";
      const already=preferredId?db[collection].find(r=>r.id===preferredId):null;
      if(already)continue;

      const rec=createLocalFromGoogleCalendar(type,item,preferredId);
      db[collection].push(rec);
      let tagged=item;
      if(p.vPlanerApp!=="V-Planer"||p.vPlanerRecordId!==rec.id||p.vPlanerRecordType!==type){
        tagged=await tagGoogleCalendarEvent(calendarId,item,type,rec);
      }
      setCalendarSyncMarkers(rec,tagged);
      claimedRemoteIds.add(item.id);
      imported++;
    }

    // Persist imported/pulled changes locally and into Drive app-data without triggering a sync loop.
    saveLocal({autoCalendar:false});
    localStorage.setItem("v-planer-calendar-last-sync-v1",now());
    const parts=[
      created?`${created} neu zu Google`:"",
      updated?`${updated} in Google aktualisiert`:"",
      pulled?`${pulled} aus Google aktualisiert`:"",
      imported?`${imported} aus Google neu`:"",
      deletedRemote?`${deletedRemote} in Google entfernt`:"",
      deletedLocal?`${deletedLocal} in V-Planer entfernt`:"",
      conflicts?`${conflicts} Konflikt${conflicts===1?"":"e"} automatisch nach letzter Änderung gelöst`:"",
      skippedRecurring?`${skippedRecurring} Serientermin${skippedRecurring===1?"":"e"} übersprungen`:""
    ].filter(Boolean);
    renderCalendarSyncSettings(`Synchronisiert: ${parts.join(" · ")||`${unchanged} unverändert`}`);
  }finally{
    calendarSyncRunning=false;
  }
}
function scheduleCalendarAutoSync(){
  clearTimeout(calendarSyncTimer);
  calendarSyncTimer=setTimeout(()=>{
    if(hasUsableCalendarToken()&&calendarPrefs().enabled){
      syncGoogleCalendar({interactive:false}).catch(e=>console.warn("Google-Kalender-Sync:",e));
    }
  },1600);
}
function renderCalendarSyncSettings(){
  if(typeof renderDashboardStorage==="function")renderDashboardStorage();
}
function disconnectGoogleCalendar(){
  if(calendarAccessToken&&window.google?.accounts?.oauth2?.revoke){
    try{google.accounts.oauth2.revoke(calendarAccessToken,()=>{})}catch{}
  }
  calendarAccessToken="";calendarTokenExpiresAt=0;calendarTokenClient=null;
  localStorage.removeItem(CALENDAR_GRANT_KEY);
  renderCalendarSyncSettings();
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
    appVersion:"1.8.0",
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
  const required=["tasks","projects","events","members","groups","functions","fines"];
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
  clubLogoDraft=undefined;
  db.updatedAt=now();
  db.settingsUpdatedAt=now();
  localStorage.setItem(STORAGE_KEY,JSON.stringify(db));
  selectedMemberId=null;
  selectedGroupId=null;
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

function birthdayDateForYear(m,year){ if(!m.birthDate)return null; const [,mo,da]=m.birthDate.split("-").map(Number); return new Date(year,mo-1,da,12,0,0); }
function daysToBirthday(m, ref=new Date()){
  if(!m.birthDate)return null; let next=birthdayDateForYear(m,ref.getFullYear()); const refDay=new Date(ref.getFullYear(),ref.getMonth(),ref.getDate(),12); if(next<refDay)next=birthdayDateForYear(m,ref.getFullYear()+1); return Math.round((next-refDay)/86400000);
}
function upcomingBirthdays(maxDays=7){ return activeRows("members").filter(m=>m.status!=="deceased"&&m.birthDate).map(m=>({...m,_days:daysToBirthday(m)})).filter(m=>m._days>=0&&m._days<=maxDays).sort((a,b)=>a._days-b._days); }
function jubileeYears(m,year=new Date().getFullYear()){ if(!m.entryDate)return 0; return year-Number(m.entryDate.slice(0,4)); }
function configuredRoundBirthdayAges(){
  const values=db.settings.reminders?.roundBirthdayAges;
  return Array.isArray(values)?values.map(Number).filter(n=>Number.isInteger(n)&&n>0):[];
}
function isRoundBirthdayAge(age){
  return db.settings.reminders?.roundBirthdays!==false && configuredRoundBirthdayAges().includes(Number(age));
}
function upcomingRoundBirthdays(maxDays=30){
  if(db.settings.reminders?.roundBirthdays===false)return[];
  return activeRows("members")
    .filter(m=>m.status!=="deceased"&&m.birthDate)
    .map(m=>{
      const info=nextRecurringInfo(m.birthDate);
      if(!info)return null;
      const age=info.year-Number(m.birthDate.slice(0,4));
      return {...m,_days:info.days,_date:info.date,_age:age};
    })
    .filter(Boolean)
    .filter(m=>m._days>=0&&m._days<=maxDays&&isRoundBirthdayAge(m._age))
    .sort((a,b)=>a._days-b._days||memberFullName(a).localeCompare(memberFullName(b),"de"));
}
function configuredJubileeYears(){
  const values=db.settings.reminders?.jubileeYears;
  return Array.isArray(values)?values.map(Number).filter(n=>Number.isInteger(n)&&n>0):[];
}
function isConfiguredJubilee(years){
  return configuredJubileeYears().includes(Number(years));
}
function nextRecurringInfo(dateStr,ref=new Date()){
  if(!dateStr)return null;
  const [,mo,da]=dateStr.split("-").map(Number);
  if(!mo||!da)return null;

  const refDay=new Date(ref.getFullYear(),ref.getMonth(),ref.getDate(),12);
  let next=new Date(ref.getFullYear(),mo-1,da,12);

  // Handle leap-day-style invalid dates by moving to the last valid day
  // of the intended month.
  if(next.getMonth()!==mo-1){
    next=new Date(ref.getFullYear(),mo,0,12);
  }
  if(next<refDay){
    next=new Date(ref.getFullYear()+1,mo-1,da,12);
    if(next.getMonth()!==mo-1)next=new Date(ref.getFullYear()+1,mo,0,12);
  }

  const days=Math.round((next-refDay)/86400000);
  const date=`${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,"0")}-${String(next.getDate()).padStart(2,"0")}`;
  return {date,days,year:next.getFullYear()};
}
function upcomingJubilees(maxDays=365){
  if(!db.settings.reminders.jubilee)return[];
  return activeRows("members")
    .filter(m=>m.entryDate&&m.status!=="deceased")
    .map(m=>{
      const info=nextRecurringInfo(m.entryDate);
      if(!info)return null;
      const years=info.year-Number(m.entryDate.slice(0,4));
      return {...m,_days:info.days,_date:info.date,_years:years,_kind:"jubilee"};
    })
    .filter(Boolean)
    .filter(m=>m._days>=0&&m._days<=maxDays&&m._years>0&&isConfiguredJubilee(m._years))
    .sort((a,b)=>a._days-b._days||memberFullName(a).localeCompare(memberFullName(b),"de"));
}
function dashboardPersonalEvents(limit=8){
  const birthdays=activeRows("members")
    .filter(m=>m.status!=="deceased"&&m.birthDate)
    .map(m=>{
      const info=nextRecurringInfo(m.birthDate);
      if(!info)return null;
      const age=info.year-Number(m.birthDate.slice(0,4));
      return {...m,_kind:"birthday",_days:info.days,_date:info.date,_age:age,_roundBirthday:isRoundBirthdayAge(age)};
    })
    .filter(Boolean);

  const jubilees=upcomingJubilees(366);

  return [...birthdays,...jubilees]
    .sort((a,b)=>
      a._days-b._days ||
      (a._kind===b._kind?0:(a._kind==="birthday"?-1:1)) ||
      memberFullName(a).localeCompare(memberFullName(b),"de")
    )
    .slice(0,limit);
}
function relativePersonalDateText(days){
  if(days===0)return "heute";
  if(days===1)return "morgen";
  return `in ${days} Tagen`;
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
function functionState(f){
  const today=todayStr();
  if(f?.startDate&&f.startDate>today)return "upcoming";
  if(f?.endDate&&f.endDate<today)return "former";
  return "active";
}
function functionStateLabel(f){return ({active:"Aktuell",upcoming:"Künftig",former:"Früher"})[functionState(f)]||"Aktuell"}
function activeFunctionsForGroup(groupId){ return activeRows("functions").filter(f=>f.groupId===groupId&&functionState(f)==="active"); }
function formerFunctionsForGroup(groupId){ return activeRows("functions").filter(f=>f.groupId===groupId&&functionState(f)==="former"); }
function upcomingFunctionsForGroup(groupId){ return activeRows("functions").filter(f=>f.groupId===groupId&&functionState(f)==="upcoming"); }

function pageMeta(view){return({dashboard:["Übersicht","Heute, diese Woche und alles Wichtige im Blick."],tasks:["Aufgaben","Offene Punkte, Zuständigkeiten und Fälligkeiten."],projects:["Projekte","Vorhaben mit Aufgaben, Terminen und Notizen organisieren."],calendar:["Kalender",""],year:["Vereinsjahr",""],archive:["Archiv",""],"finance-kasse":["Finanzen",""],"finance-fines":["Strafen",""],members:["Mitglieder",""],groups:["Gruppen & Funktionen",""],trash:["Papierkorb",""],settings:["Einstellungen",""]})[view]||[view,""]}
function applyModuleVisibility(){}
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
  if(view==="storage"){
    view="settings";
    requestAnimationFrame(()=>setSettingsSection("sync"));
  }
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

const SETTINGS_SECTION_KEY="v-planer-settings-section-v1";
const SETTINGS_SECTION_LABELS={club:"Vereinsdaten",organization:"Verein & Mitglieder",appearance:"Darstellung & Bereiche",reminders:"Erinnerungen",calendar:"Google Kalender",sync:"Speicher & Sync",backup:"Backup & Daten"};
function activeSettingsSection(){
  const key=localStorage.getItem(SETTINGS_SECTION_KEY)||"club";
  return SETTINGS_SECTION_LABELS[key]?key:"club";
}
function setSettingsSection(key,store=true){
  if(!SETTINGS_SECTION_LABELS[key])key="club";
  if(store)localStorage.setItem(SETTINGS_SECTION_KEY,key);
  $$('[data-settings-panel]').forEach(panel=>panel.classList.toggle("active",panel.dataset.settingsPanel===key));
  $$('[data-settings-section]').forEach(btn=>{
    const active=btn.dataset.settingsSection===key;
    btn.classList.toggle("active",active);
    btn.setAttribute("aria-current",active?"page":"false");
  });
  const mobileCurrent=$("#settingsMobileCurrent");if(mobileCurrent)mobileCurrent.textContent=SETTINGS_SECTION_LABELS[key];
  const mobileMenu=$("#settingsMobileMenu");if(mobileMenu&&window.innerWidth<=900)mobileMenu.open=false;
  const saveBar=$("#view-settings .settings-save");
  if(saveBar)saveBar.classList.toggle("hidden",key==="backup"||key==="calendar");
}
$$('[data-settings-section]').forEach(btn=>btn.addEventListener("click",()=>setSettingsSection(btn.dataset.settingsSection)));
const SETTINGS_NAV_COLLAPSED_KEY="v-planer-settings-nav-collapsed-v1";
function applySettingsNavCollapsed(){
  const shell=$("#view-settings .settings-shell"),collapsed=localStorage.getItem(SETTINGS_NAV_COLLAPSED_KEY)==="1";
  shell?.classList.toggle("nav-collapsed",collapsed);
  const btn=$("#settingsNavCollapse");if(btn){btn.title=collapsed?"Einstellungsmenü ausklappen":"Einstellungsmenü einklappen";btn.setAttribute("aria-label",btn.title)}
}
$("#settingsNavCollapse")?.addEventListener("click",()=>{const next=localStorage.getItem(SETTINGS_NAV_COLLAPSED_KEY)!=="1";localStorage.setItem(SETTINGS_NAV_COLLAPSED_KEY,next?"1":"0");applySettingsNavCollapsed()});
document.addEventListener("click",e=>{
  const jump=e.target.closest?.("[data-settings-jump]");
  if(!jump)return;
  go("settings");
  setSettingsSection(jump.dataset.settingsJump||"club");
});

const DASHBOARD_DISMISS_KEY="v-planer-dashboard-dismissed-v1";
function dashboardDismissMap(){
  let map={};
  try{map=JSON.parse(localStorage.getItem(DASHBOARD_DISMISS_KEY)||"{}")||{}}catch{}
  const today=todayStr();let changed=false;
  Object.entries(map).forEach(([key,until])=>{if(until&&until<today){delete map[key];changed=true}});
  if(changed)localStorage.setItem(DASHBOARD_DISMISS_KEY,JSON.stringify(map));
  return map;
}
function dashboardNoticeDismissed(key){return !!dashboardDismissMap()[key]}
function dismissDashboardNotice(key,until=todayStr()){
  const map=dashboardDismissMap();map[key]=until||todayStr();localStorage.setItem(DASHBOARD_DISMISS_KEY,JSON.stringify(map));renderDashboard();
}
function personalDashboardDismissKey(item){return `personal:${item._kind}:${item.id}:${item._date}`}
function dashboardAlertHTML(items){
  if(!items.length)return "";
  return `<div class="dashboard-alert-items">${items.map(item=>`<div class="dashboard-alert-item"><span>${esc(item.icon||"⚠")} ${esc(item.text)}</span>${item.dismissKey?`<button type="button" data-dismiss-dashboard-alert="${esc(item.dismissKey)}" data-dismiss-until="${esc(item.until||todayStr())}" title="Hinweis für diesen Zeitraum ausblenden" aria-label="Hinweis ausblenden">×</button>`:""}</div>`).join("")}</div>`;
}

function renderDashboard(){
  const tasks=activeRows("tasks"),projects=activeRows("projects"),members=activeRows("members");
  const open=tasks.filter(t=>t.status!=="done");
  const today=open.filter(t=>t.due===todayStr()).length;
  const week=open.filter(t=>{const d=daysUntil(t.due);return d!==null&&d>=0&&d<=7}).length;
  $("#metricOpenTasks").textContent=open.length;$("#metricTaskHint").textContent=`Heute ${today} · Woche ${week}`;
  $("#metricProjects").textContent=projects.filter(p=>p.status==="active").length;$("#metricProjectHint").textContent=`${projects.filter(p=>projectStartDate(p)&&p.status!=="closed").length} mit Zeitraum`;
  const clubMembers=members.filter(m=>m.status!=="exited");
  $("#metricMembers").textContent=clubMembers.length;$("#metricMemberHint").textContent=`davon ${clubMembers.filter(m=>m.status==="active").length} aktiv`;

  const bdays=upcomingBirthdays(7).filter(item=>{
    const info=nextRecurringInfo(item.birthDate);
    if(!info)return true;
    const age=info.year-Number(item.birthDate.slice(0,4));
    if(!isRoundBirthdayAge(age))return true;
    return !dashboardNoticeDismissed(personalDashboardDismissKey({...item,_kind:"birthday",_date:info.date,_age:age,_roundBirthday:true}));
  }),alertItems=[];
  const overdue=open.filter(t=>daysUntil(t.due)<0).length;
  if(overdue)alertItems.push({icon:"⚠",text:`${overdue} überfällige Aufgabe${overdue===1?"":"n"}`});
  const alarms=projects.filter(p=>{
    const end=projectEndDate(p),days=daysUntil(end);
    return p.status!=="closed"&&days!==null&&days<=db.settings.reminders.alarmDays&&days>=0;
  }).length;
  if(alarms)alertItems.push({icon:"◆",text:`${alarms} Projekt${alarms===1?"":"e"} im Alarm-Zeitraum`});
  if(db.settings.reminders.birthdayWeek&&bdays.length)alertItems.push({icon:"🎂",text:`${bdays.length} Geburtstag${bdays.length===1?"":"e"} in den nächsten 7 Tagen`});

  const visibleRound=upcomingRoundBirthdays(30).filter(item=>!dashboardNoticeDismissed(personalDashboardDismissKey({...item,_kind:"birthday"})));
  const roundSummaryKey=`summary:round:${todayStr()}`;
  if(visibleRound.length&&!dashboardNoticeDismissed(roundSummaryKey))alertItems.push({icon:"🎉",text:`${visibleRound.length} runde${visibleRound.length===1?"r Geburtstag":" Geburtstage"} in den nächsten 30 Tagen`,dismissKey:roundSummaryKey,until:todayStr()});
  const visibleJubilees=upcomingJubilees(30).filter(item=>!dashboardNoticeDismissed(personalDashboardDismissKey(item)));
  const jubileeSummaryKey=`summary:jubilee:${todayStr()}`;
  if(visibleJubilees.length&&!dashboardNoticeDismissed(jubileeSummaryKey))alertItems.push({icon:"★",text:`${visibleJubilees.length} Vereinsjubiläum${visibleJubilees.length===1?"":"en"} in den nächsten 30 Tagen`,dismissKey:jubileeSummaryKey,until:todayStr()});

  const alertStrip=$("#alertStrip");
  alertStrip.classList.toggle("hidden",!alertItems.length);
  alertStrip.innerHTML=dashboardAlertHTML(alertItems);
  $$('[data-dismiss-dashboard-alert]').forEach(btn=>btn.onclick=e=>{e.stopPropagation();dismissDashboardNotice(btn.dataset.dismissDashboardAlert,btn.dataset.dismissUntil)});

  const list=open.slice().sort((a,b)=>(a.due||"9999").localeCompare(b.due||"9999"));
  $("#dashboardTasks").innerHTML=list.length?list.map(t=>`<div class="mini-row"><input type="checkbox" data-finish-task="${t.id}" aria-label="Aufgabe erledigen"><div><div class="mini-title">${esc(t.title)}</div><div class="mini-meta">${esc(projectName(t.projectId))} · ${esc(groupName(t.groupId))}</div></div><span class="badge ${reminderClass(t.due)}">${esc(dueText(t.due))}</span></div>`).join(""):`<div class="empty">Keine offenen Aufgaben.</div>`;
  $$('[data-finish-task]').forEach(el=>el.onchange=()=>{const t=byId("tasks",el.dataset.finishTask);if(t){t.status="done";touch(t);saveLocal()}});

  const ps=projects.filter(p=>p.status!=="closed").sort((a,b)=>(projectStartDate(a)||"9999").localeCompare(projectStartDate(b)||"9999"));
  $("#dashboardProjects").innerHTML=ps.length?ps.map(p=>{
    const st=projectTaskStats(p.id),end=projectEndDate(p);
    return `<div class="project-mini"><div class="row"><div><div class="mini-title">${esc(p.name)}</div><div class="mini-meta">${esc(groupName(p.groupId))} · ${esc(projectDateRangeText(p))} · ${st.done}/${st.total} Aufgaben erledigt</div></div><span class="project-days ${projectDayClass(end)}">${end?esc(dueText(end)):"ohne Zeitraum"}</span></div><div class="progress"><span style="width:${st.progress}%"></span></div><div class="mini-meta" style="text-align:right">${st.progress}%</div></div>`;
  }).join(""):`<div class="empty">Noch keine Projekte.</div>`;

  const personalEvents=dashboardPersonalEvents(40)
    .filter(item=>!(item._kind==="jubilee"||item._roundBirthday)||!dashboardNoticeDismissed(personalDashboardDismissKey(item)))
    .slice(0,8);
  $("#dashboardBirthdays").innerHTML=personalEvents.length?personalEvents.map(item=>{
    const isJubilee=item._kind==="jubilee",isRound=!isJubilee&&!!item._roundBirthday,special=isJubilee||isRound;
    const meta=isJubilee
      ?`${fmtDate(item._date)} · ${item._years}. Vereinsjubiläum · ${relativePersonalDateText(item._days)}`
      :`${fmtDate(item._date)} · ${isRound?"Runder Geburtstag":"Geburtstag"} · ${relativePersonalDateText(item._days)} · wird ${item._age}`;
    return `<div class="birthday-row personal-event-row ${isRound?"round-birthday-row":""}">
      <button type="button" class="personal-event-open" data-dashboard-member="${item.id}">
        <span class="person-dot">${isJubilee?"★":isRound?"🎉":"🎂"}</span>
        <span class="personal-event-copy"><span class="mini-title">${esc(memberFullName(item))}</span><span class="mini-meta">${esc(meta)}</span></span>
        <span class="personal-event-type ${isJubilee?"jubilee":isRound?"round-birthday":"birthday"}">${isJubilee?"Jubiläum":isRound?"Runder Geburtstag":"Geburtstag"}</span>
      </button>
      ${special?`<button type="button" class="personal-event-dismiss" data-dismiss-personal-event="${esc(personalDashboardDismissKey(item))}" data-dismiss-until="${esc(item._date)}" title="Nur aus der Übersicht ausblenden" aria-label="Hinweis aus der Übersicht ausblenden">×</button>`:""}
    </div>`;
  }).join(""):`<div class="empty">Keine Geburtstage oder Jubiläen vorhanden.</div>`;

  $$('[data-dashboard-member]').forEach(btn=>btn.onclick=()=>{const member=byId("members",btn.dataset.dashboardMember);if(!member)return;selectedMemberId=member.id;renderMembers();go("members")});
  $$('[data-dismiss-personal-event]').forEach(btn=>btn.onclick=e=>{e.stopPropagation();dismissDashboardNotice(btn.dataset.dismissPersonalEvent,btn.dataset.dismissUntil)});

  const ev=activeRows("events").filter(e=>eventEndDate(e)>=todayStr()).sort((a,b)=>eventStartDate(a).localeCompare(eventStartDate(b))).slice(0,5);
  $("#dashboardEvents").innerHTML=ev.length?ev.map(e=>eventRowHTML(e)).join(""):`<div class="empty">Keine kommenden Termine.</div>`;
  bindEventOpeners($("#dashboardEvents"));
  renderDashboardStorage();
}
function projectDayClass(date){const c=reminderClass(date);return c.includes("alarm")?"alarm":c.includes("warning")?"warning":c.includes("info")?"info":"ok"}
function calendarTaskRowHTML(t){
  return `<button type="button" class="event-row event-row-button calendar-linked-row calendar-task-row" data-calendar-task="${t.id}">
    <div class="calendar-type-box task-type-box">✓</div>
    <div><div class="mini-title">${esc(t.title)}</div><div class="mini-meta">Aufgabe · fällig ${fmtDate(t.due)} · ${esc(projectName(t.projectId))}</div></div>
  </button>`;
}
function calendarProjectRowHTML(p){
  return `<button type="button" class="event-row event-row-button calendar-linked-row calendar-project-row" data-calendar-project="${p.id}">
    <div class="calendar-type-box project-type-box">◆</div>
    <div><div class="mini-title">${esc(p.name)}</div><div class="mini-meta">Projekt · ${esc(projectDateRangeText(p))} · ${esc(groupName(p.groupId))}</div></div>
  </button>`;
}
function bindCalendarWorkOpeners(scope=document){
  scope.querySelectorAll?.("[data-calendar-task]")?.forEach(btn=>btn.onclick=()=>{
    const t=byId("tasks",btn.dataset.calendarTask);
    if(t)openTaskModal(t);
  });
  scope.querySelectorAll?.("[data-calendar-project]")?.forEach(btn=>btn.onclick=()=>{
    const p=byId("projects",btn.dataset.calendarProject);
    if(p)openProjectModal(p);
  });
}

function projectStartDate(p){ return p?.startDate||p?.due||""; }
function projectEndDate(p){ return p?.endDate||p?.due||projectStartDate(p); }
function projectIsMultiDay(p){
  const start=projectStartDate(p),end=projectEndDate(p);
  return !!start&&!!end&&start!==end;
}
function projectOccursOn(p,dateStr){
  const start=projectStartDate(p),end=projectEndDate(p);
  return !!start&&dateStr>=start&&dateStr<=(end||start);
}
function projectDateRangeText(p){
  const start=projectStartDate(p),end=projectEndDate(p);
  if(!start)return "Kein Zeitraum";
  if(!end||end===start)return fmtDate(start);
  return `${fmtDate(start)} – ${fmtDate(end)}`;
}
function projectOverlapsMonth(p,year,monthIndex){
  const start=projectStartDate(p),end=projectEndDate(p);
  if(!start)return false;
  const monthStart=`${year}-${String(monthIndex+1).padStart(2,"0")}-01`;
  const lastDay=new Date(year,monthIndex+1,0).getDate();
  const monthEnd=`${year}-${String(monthIndex+1).padStart(2,"0")}-${String(lastDay).padStart(2,"0")}`;
  return start<=monthEnd&&(end||start)>=monthStart;
}

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
      <div class="mini-meta">${range?`${esc(range)} · `:""}${time?esc(time):""}${e.location?`${time?" · ":""}${esc(e.location)}`:""}${linkedProjectForEvent(e)?` · Projekt: ${esc(linkedProjectForEvent(e).name)}`:""}</div>
    </div>
  </button>`;
}
function bindEventOpeners(scope=document){
  scope.querySelectorAll?.("[data-open-event]")?.forEach(el=>el.onclick=()=>{
    const e=byId("events",el.dataset.openEvent);
    if(e)showEventDetails(e);
  });
}
function renderDashboardStorage(){ /* Replaced by the 2.2 dashboard sync renderer below. */ }

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
function renderArchive(){}
function taskPriorityLabel(priority){return ({high:"Hoch",mid:"Mittel",low:"Niedrig"})[priority]||priority||"—"}
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

function renderTasks(){}
function projectTaskRowHTML(){return ""}
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
      <div class="mini-meta">${esc(groupName(p.groupId))} · Projektzeitraum: ${esc(projectDateRangeText(p))}</div>
      <div class="project-days ${projectDayClass(projectEndDate(p))}">${projectEndDate(p)?esc(dueText(projectEndDate(p))):"ohne Zeitraum"}</div>


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
    const count=projectTasks(p.id).length,linkedEvent=linkedEventForProject(p);
    const details=[
      count?`Die ${count} zugehörigen Aufgabe${count===1?"":"n"} bleiben erhalten und werden beim Wiederherstellen des Projekts automatisch wieder zugeordnet.`:"",
      linkedEvent?`Der verknüpfte Termin „${linkedEvent.title}“ bleibt erhalten; die Projektverknüpfung wird für eine mögliche Wiederherstellung beibehalten.`:""
    ].filter(Boolean).join("\n\n");
    const message=`Projekt „${p.name}“ wirklich löschen?${details?`\n\n${details}`:""}`;
    if(confirm(message)){
      markDeleted("projects",p.id);
      saveLocal();
    }
  });
}
$("#projectSearch").addEventListener("input",renderProjects);$("#projectStatusFilter").addEventListener("change",renderProjects);

function kanbanDueRank(task){
  if(!task?.due)return {bucket:5,date:"9999-12-31",days:99999};
  const days=daysUntil(task.due);
  if(days===null)return {bucket:5,date:task.due,days:99999};
  if(days<0)return {bucket:0,date:task.due,days};
  if(days===0)return {bucket:1,date:task.due,days};
  if(days===1)return {bucket:2,date:task.due,days};
  if(days<=7)return {bucket:3,date:task.due,days};
  return {bucket:4,date:task.due,days};
}
function kanbanTaskCompare(a,b){
  const da=kanbanDueRank(a),dbb=kanbanDueRank(b);
  if(da.bucket!==dbb.bucket)return da.bucket-dbb.bucket;
  if(da.date!==dbb.date)return String(da.date).localeCompare(String(dbb.date));
  const priorityDiff=taskPriorityRank(b.priority)-taskPriorityRank(a.priority);
  if(priorityDiff!==0)return priorityDiff;
  return String(a.title||"").localeCompare(String(b.title||""),"de",{sensitivity:"base"});
}
function kanbanDueText(task){
  if(!task?.due)return "Ohne Termin";
  const days=daysUntil(task.due);
  if(days===null)return fmtDate(task.due);
  if(days<0){
    const n=Math.abs(days);
    return n===1?"1 Tag überfällig":`${n} Tage überfällig`;
  }
  if(days===0)return "Heute";
  if(days===1)return "Morgen";
  if(days<=7)return `in ${days} Tagen`;
  return fmtDate(task.due);
}
function kanbanDueClass(task){
  if(!task?.due)return "no-date";
  const days=daysUntil(task.due);
  if(days===null)return "later";
  if(days<0)return "overdue";
  if(days===0)return "today";
  if(days===1)return "tomorrow";
  if(days<=7)return "soon";
  return "later";
}
function renderKanban(){
  const cols=[["open","Offen"],["doing","In Arbeit"],["wait","Warten auf"],["done","Erledigt"]];

  $("#kanbanBoard").innerHTML=cols.map(([status,label])=>{
    const tasks=activeRows("tasks")
      .filter(t=>t.status===status)
      .slice()
      .sort(kanbanTaskCompare);

    return `<div class="kanban-col" data-kanban-col="${status}">
      <h3>${label} · ${tasks.length}</h3>
      ${tasks.map(t=>`<div class="ticket kanban-ticket" draggable="true" data-drag-task="${t.id}">
        <div class="kanban-ticket-head">
          <strong>${esc(t.title)}</strong>
          ${priorityBadge(t.priority)}
        </div>
        <small class="kanban-project-line">${esc(projectName(t.projectId))}</small>
        <div class="kanban-ticket-footer">
          <span class="kanban-due ${kanbanDueClass(t)}">${esc(kanbanDueText(t))}</span>
          ${t.due?`<time datetime="${esc(t.due)}">${esc(fmtDate(t.due))}</time>`:""}
        </div>
      </div>`).join("")}
    </div>`;
  }).join("");

  $$('[data-drag-task]').forEach(el=>el.addEventListener("dragstart",e=>{
    e.dataTransfer.setData("text/plain",el.dataset.dragTask);
  }));

  $$('[data-kanban-col]').forEach(col=>{
    col.addEventListener("dragover",e=>e.preventDefault());
    col.addEventListener("drop",e=>{
      e.preventDefault();
      const t=byId("tasks",e.dataTransfer.getData("text/plain"));
      if(t){
        t.status=col.dataset.kanbanCol;
        touch(t);
        saveLocal();
      }
    });
  });
}
function renderCalendar(){
  const y=calDate.getFullYear(),m=calDate.getMonth();
  $("#calendarTitle").textContent=new Intl.DateTimeFormat("de-DE",{month:"long",year:"numeric"}).format(calDate);

  const first=new Date(y,m,1),
        offset=(first.getDay()+6)%7,
        days=new Date(y,m+1,0).getDate(),
        prevDays=new Date(y,m,0).getDate(),
        today=todayStr();

  let cells=["Mo","Di","Mi","Do","Fr","Sa","So"].map((x,i)=>`<div class="weekday ${i>=5?"weekend-head":""}">${x}</div>`);

  // Always render six complete weeks. This avoids the large empty-looking
  // first row when a month begins late in the week.
  for(let cell=0;cell<42;cell++){
    const rawDay=cell-offset+1;
    let cellDate,dayNumber,outside=false;

    if(rawDay<1){
      dayNumber=prevDays+rawDay;
      cellDate=new Date(y,m-1,dayNumber);
      outside=true;
    }else if(rawDay>days){
      dayNumber=rawDay-days;
      cellDate=new Date(y,m+1,dayNumber);
      outside=true;
    }else{
      dayNumber=rawDay;
      cellDate=new Date(y,m,dayNumber);
    }

    const cy=cellDate.getFullYear(),
          cm=cellDate.getMonth()+1,
          cd=cellDate.getDate(),
          ds=`${cy}-${String(cm).padStart(2,"0")}-${String(cd).padStart(2,"0")}`,
          weekdayIndex=cell%7,
          weekend=weekdayIndex>=5,
          isToday=ds===today;

    if(outside){
      cells.push(`<div class="cal-day outside-month ${weekend?"weekend":""}">
        <div class="cal-day-top"><span class="cal-day-number">${dayNumber}</span></div>
      </div>`);
      continue;
    }

    const birthdays=activeRows("members")
      .filter(mem=>mem.birthDate&&mem.status!=="deceased"&&Number(mem.birthDate.slice(5,7))===m+1&&Number(mem.birthDate.slice(8,10))===dayNumber)
      .slice(0,1);
    const events=activeRows("events").filter(e=>eventOccursOn(e,ds));
    const tasks=activeRows("tasks").filter(t=>t.due===ds);
    const projects=activeRows("projects").filter(p=>projectOccursOn(p,ds));

    const workItems=[
      ...events.map(e=>({kind:"event",record:e})),
      ...tasks.map(t=>({kind:"task",record:t})),
      ...projects.map(p=>({kind:"project",record:p}))
    ];
    const visible=workItems.slice(0,3),
          more=Math.max(0,workItems.length-visible.length);

    cells.push(`<div class="cal-day ${weekend?"weekend":""} ${isToday?"today":""}">
      <div class="cal-day-top">
        <span class="cal-day-number">${dayNumber}</span>
        ${isToday?`<span class="today-label">Heute</span>`:""}
      </div>
      <div class="cal-day-content">
        ${birthdays.map(mem=>`<div class="cal-chip birthday" title="Geburtstag: ${esc(memberFullName(mem))}">🎂 ${esc(mem.firstName||mem.lastName)}</div>`).join("")}
        ${visible.map(item=>{
          if(item.kind==="event"){
            const e=item.record,start=eventStartDate(e),end=eventEndDate(e);
            const isStart=ds===start,isEnd=ds===end,multi=eventIsMultiDay(e);
            const marker=multi?(isStart?"▶ ":isEnd?"■ ":"↔ "):"";
            const time=isStart&&eventStartTime(e)?` ${eventStartTime(e)}`:"";
            const color=eventColor(e);
            return `<button class="cal-chip ${multi?"multi-day":""} cal-event-button" type="button" data-calendar-event="${e.id}" style="--event-color:${color};--event-soft:${colorWithAlpha(color,.14)}" title="${esc(eventDateRangeText(e))}${eventTimeRangeText(e)?` · ${esc(eventTimeRangeText(e))}`:""}">${marker}${esc(e.title)}${time}</button>`;
          }
          if(item.kind==="task"){
            const t=item.record;
            return `<button class="cal-chip cal-work-button cal-task-button ${t.status==="done"?"is-done":""}" type="button" data-calendar-task="${t.id}" title="Aufgabe fällig · ${esc(statusLabel(t.status))}">✓ ${esc(t.title)}</button>`;
          }
          const p=item.record,start=projectStartDate(p),end=projectEndDate(p),
                multi=projectIsMultiDay(p),isStart=ds===start,isEnd=ds===end,
                marker=multi?(isStart?"▶ ":isEnd?"■ ":"↔ "):"";
          return `<button class="cal-chip cal-work-button cal-project-button ${multi?"multi-day":""} ${p.status==="closed"?"is-closed":""}" type="button" data-calendar-project="${p.id}" title="Projekt · ${esc(projectDateRangeText(p))} · ${esc(statusLabel(p.status))}">${marker}◆ ${esc(p.name)}</button>`;
        }).join("")}
        ${more?`<div class="cal-more">+ ${more} weitere</div>`:""}
      </div>
    </div>`);
  }

  $("#calendarGrid").innerHTML=cells.join("");
  $$("[data-calendar-event]").forEach(btn=>btn.onclick=()=>{
    const e=byId("events",btn.dataset.calendarEvent);
    if(e)showEventDetails(e);
  });
  bindCalendarWorkOpeners($("#calendarGrid"));

  const combined=[
    ...activeRows("events").filter(e=>eventEndDate(e)>=todayStr()).map(e=>({...e,_kind:"event",_sortDate:eventStartDate(e)})),
    ...activeRows("tasks").filter(t=>t.due&&t.due>=todayStr()).map(t=>({...t,_kind:"task",_sortDate:t.due})),
    ...activeRows("projects").filter(p=>projectEndDate(p)&&projectEndDate(p)>=todayStr()).map(p=>({...p,_kind:"project",_sortDate:projectStartDate(p)||projectEndDate(p)})),
    ...upcomingBirthdays(31).map(mem=>({...mem,_kind:"birthday",_sortDate:`9999-${String(mem._days).padStart(4,"0")}`}))
  ].sort((a,b)=>{
    if(a._kind==="birthday"&&b._kind==="birthday")return a._days-b._days;
    if(a._kind==="birthday")return 1;
    if(b._kind==="birthday")return -1;
    return String(a._sortDate||"").localeCompare(String(b._sortDate||""));
  }).slice(0,16);

  $("#calendarSideList").innerHTML=combined.length?combined.map(x=>{
    if(x._kind==="event")return eventRowHTML(x);
    if(x._kind==="task")return calendarTaskRowHTML(x);
    if(x._kind==="project")return calendarProjectRowHTML(x);
    return `<div class="birthday-row"><div class="person-dot">🎂</div><div><div class="mini-title">${esc(memberFullName(x))}</div><div class="mini-meta">${x._days===0?"Heute":x._days===1?"Morgen":`in ${x._days} Tagen`}</div></div></div>`;
  }).join(""):`<div class="empty">Keine Einträge.</div>`;
  bindEventOpeners($("#calendarSideList"));
  bindCalendarWorkOpeners($("#calendarSideList"));
  renderCalendarAgenda();
  applyCalendarDisplayMode();
}
$("#prevMonth").onclick=()=>{calDate=new Date(calDate.getFullYear(),calDate.getMonth()-1,1);renderCalendar()};
$("#nextMonth").onclick=()=>{calDate=new Date(calDate.getFullYear(),calDate.getMonth()+1,1);renderCalendar()};
$("#todayMonth").onclick=()=>{const d=new Date();calDate=new Date(d.getFullYear(),d.getMonth(),1);renderCalendar()};

function eventOverlapsMonth(e,year,monthIndex){
  const start=eventStartDate(e),end=eventEndDate(e);
  if(!start)return false;
  const monthStart=`${year}-${String(monthIndex+1).padStart(2,"0")}-01`;
  const lastDay=new Date(year,monthIndex+1,0).getDate();
  const monthEnd=`${year}-${String(monthIndex+1).padStart(2,"0")}-${String(lastDay).padStart(2,"0")}`;
  return start<=monthEnd && (end||start)>=monthStart;
}
function recurringDateForYear(dateStr,year){
  if(!dateStr||dateStr.length<10)return "";
  const mo=Number(dateStr.slice(5,7)),da=Number(dateStr.slice(8,10));
  if(!mo||!da)return "";
  const lastDay=new Date(year,mo,0).getDate();
  return `${year}-${String(mo).padStart(2,"0")}-${String(Math.min(da,lastDay)).padStart(2,"0")}`;
}
function yearEntriesForMonth(year,monthIndex){
  const rows=[];
  activeRows("events").filter(e=>eventOverlapsMonth(e,year,monthIndex)).forEach(e=>{
    const start=eventStartDate(e),end=eventEndDate(e)||start;
    const monthStart=`${year}-${String(monthIndex+1).padStart(2,"0")}-01`;
    rows.push({kind:"event",id:e.id,date:start<monthStart?monthStart:start,sortDate:start,title:e.title||"Termin",record:e});
  });
  activeRows("tasks").filter(t=>t.due&&Number(t.due.slice(0,4))===year&&Number(t.due.slice(5,7))===monthIndex+1).forEach(t=>{
    rows.push({kind:"task",id:t.id,date:t.due,sortDate:t.due,title:t.title||"Aufgabe",record:t});
  });
  activeRows("projects").filter(p=>projectOverlapsMonth(p,year,monthIndex)).forEach(p=>{
    const start=projectStartDate(p),monthStart=`${year}-${String(monthIndex+1).padStart(2,"0")}-01`;
    rows.push({kind:"project",id:p.id,date:start<monthStart?monthStart:start,sortDate:start,title:p.name||"Projekt",record:p});
  });
  activeRows("members").filter(m=>m.status!=="deceased"&&m.birthDate).forEach(m=>{
    const date=recurringDateForYear(m.birthDate,year);
    if(date&&Number(date.slice(5,7))===monthIndex+1){
      const age=Math.max(0,year-Number(m.birthDate.slice(0,4)));
      rows.push({kind:"birthday",id:m.id,date,sortDate:date,title:`${memberFullName(m)} · ${age}. Geburtstag`,record:m,age,roundBirthday:isRoundBirthdayAge(age)});
    }
  });
  activeRows("members").filter(m=>m.status!=="deceased"&&m.entryDate).forEach(m=>{
    const years=year-Number(m.entryDate.slice(0,4));
    if(years<=0||!isConfiguredJubilee(years))return;
    const date=recurringDateForYear(m.entryDate,year);
    if(date&&Number(date.slice(5,7))===monthIndex+1){
      rows.push({kind:"jubilee",id:m.id,date,sortDate:date,title:`${memberFullName(m)} · ${years} Jahre im Verein`,record:m,years});
    }
  });
  const order={event:0,birthday:1,jubilee:2,task:3,project:4};
  return rows.sort((a,b)=>String(a.sortDate||a.date).localeCompare(String(b.sortDate||b.date))||(order[a.kind]??9)-(order[b.kind]??9)||String(a.title).localeCompare(String(b.title),"de"));
}
function yearEntryHTML(item){
  if(item.kind==="event"){
    const e=item.record,color=eventColor(e);
    return `<button type="button" class="year-item year-event-button" data-year-event="${e.id}" style="--event-color:${color};--event-soft:${colorWithAlpha(color,.12)}">
      <span class="year-color-dot" style="background:${color}"></span>
      <b>${esc(eventIsMultiDay(e)?eventDateRangeText(e):fmtShort(eventStartDate(e)))}</b>
      <span>${esc(e.title)}</span>
      ${eventTimeRangeText(e)?`<small>${esc(eventTimeRangeText(e))}</small>`:""}
    </button>`;
  }
  const meta={
    task:{icon:"✓",label:"Aufgabe",cls:"year-task-button"},
    project:{icon:"◆",label:"Projekt",cls:"year-project-button"},
    birthday:{icon:"🎂",label:"Geburtstag",cls:"year-birthday-button"},
    jubilee:{icon:"★",label:"Vereinsjubiläum",cls:"year-jubilee-button"}
  }[item.kind];
  const dataAttr=item.kind==="task"?`data-year-task="${item.id}"`:item.kind==="project"?`data-year-project="${item.id}"`:`data-year-member="${item.id}"`;
  if(item.kind==="birthday"&&item.roundBirthday){
    meta.icon="🎉";
    meta.label="Runder Geburtstag";
    meta.cls+=" year-round-birthday-button";
  }
  let sub=meta.label;
  if(item.kind==="task")sub+=` · ${statusLabel(item.record.status)}`;
  if(item.kind==="project")sub+=` · ${statusLabel(item.record.status)}`;
  if(item.kind==="birthday")sub+=` · ${Math.max(0,Number(item.date.slice(0,4))-Number(item.record.birthDate.slice(0,4)))} Jahre`;
  if(item.kind==="jubilee")sub+=` · ${item.years} Jahre`;
  const dateText=item.kind==="project"
    ?(projectIsMultiDay(item.record)?projectDateRangeText(item.record):fmtShort(projectStartDate(item.record)))
    :fmtShort(item.date);
  return `<button type="button" class="year-item year-special-button ${meta.cls}" ${dataAttr}>
    <span class="year-type-icon">${meta.icon}</span>
    <b>${esc(dateText)}</b>
    <span>${esc(item.title)}</span>
    <small>${esc(sub)}</small>
  </button>`;
}
function renderYear(){
  const year=calDate.getFullYear();
  $("#yearTitle").textContent=`Vereinsjahr ${year}`;
  $("#yearGrid").innerHTML=[...Array(12)].map((_,i)=>{
    const name=new Intl.DateTimeFormat("de-DE",{month:"long"}).format(new Date(year,i,1));
    const entries=yearEntriesForMonth(year,i);
    return `<div class="card month-card">
      <div class="year-month-head"><h3>${name}</h3><span class="year-month-count">${entries.length}</span></div>
      ${entries.length?entries.map(yearEntryHTML).join(""):`<div class="mini-meta">Noch keine Einträge</div>`}
    </div>`;
  }).join("");
  $$('[data-year-event]').forEach(btn=>btn.onclick=()=>{
    const e=byId("events",btn.dataset.yearEvent);
    if(e)showEventDetails(e);
  });
  $$('[data-year-task]').forEach(btn=>btn.onclick=()=>{
    const t=byId("tasks",btn.dataset.yearTask);
    if(t)openTaskModal(t);
  });
  $$('[data-year-project]').forEach(btn=>btn.onclick=()=>{
    const p=byId("projects",btn.dataset.yearProject);
    if(p)openProjectModal(p);
  });
  $$('[data-year-member]').forEach(btn=>btn.onclick=()=>{
    const m=byId("members",btn.dataset.yearMember);
    if(!m)return;
    selectedMemberId=m.id;
    renderMembers();
    go("members");
  });
}
$("#prevYear")?.addEventListener("click",()=>{calDate=new Date(calDate.getFullYear()-1,calDate.getMonth(),1);renderYear()});
$("#nextYear")?.addEventListener("click",()=>{calDate=new Date(calDate.getFullYear()+1,calDate.getMonth(),1);renderYear()});
$("#todayYear")?.addEventListener("click",()=>{const d=new Date();calDate=new Date(d.getFullYear(),d.getMonth(),1);renderYear()});

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
function honoraryContributionFree(m){ return !!(m?.honorary && db.settings.honoraryContributionFree); }
function renderMembers(){
  const q=($("#memberSearch").value||"").toLowerCase(),f=$("#memberStatusFilter").value,hf=$("#memberHonoraryFilter")?.value||"";
  const filtered=activeRows("members").filter(m=>
    (!q||`${m.firstName} ${m.lastName} ${m.memberNo}`.toLowerCase().includes(q))&&
    (!f||m.status===f)&&
    (!hf||(hf==="yes"?!!m.honorary:!m.honorary))
  );
  const rows=sortMembers(filtered);

  $("#memberTable").innerHTML=rows.length?rows.map(m=>`<tr class="selectable" data-select-member="${m.id}">
    <td>${esc(memberNo(m))}</td>
    <td><b>${esc(memberFullName(m))}</b>${m.honorary?`<div class="mini-meta">★ Ehrenmitglied${honoraryContributionFree(m)?" · beitragsfrei":""}</div>`:""}</td>
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
function renderMemberDetail(){}
function fineMoney(value){return euroFmt.format(Number(value)||0)}
function fineStatusLabel(status){return ({open:"Offen",paid:"Bezahlt",waived:"Erlassen"})[status]||status||"Offen"}
function fineStatusBadge(status,dueDate=""){
  if(status==="open"){
    const overdue=!!dueDate&&dueDate<todayStr();
    return `<span class="badge alarm">${overdue?"Überfällig · zu bezahlen":"Offen · zu bezahlen"}</span>`;
  }
  const cls=status==="paid"?"ok":"gray";
  return `<span class="badge ${cls}">${fineStatusLabel(status)}</span>`;
}
function fineCatalog(){return Array.isArray(db.settings.fineCatalog)?db.settings.fineCatalog:[]}
function fineCatalogOptions(selected=""){
  const rows=fineCatalog().slice().sort((a,b)=>String(a.label||"").localeCompare(String(b.label||""),"de",{sensitivity:"base"}));
  return `<option value="">Individuelle Strafe …</option>`+rows.map(x=>`<option value="${esc(x.id)}" ${x.id===selected?"selected":""}>${esc(x.label)} · ${esc(fineMoney(x.amount))}</option>`).join("");
}
function fineMemberLabel(f){
  const m=byId("members",f.memberId);
  return m?memberFullName(m):(f.memberNameSnapshot||"Mitglied nicht mehr vorhanden");
}
function fineSortValue(f,key){
  if(key==="date")return f.date||"";
  if(key==="member")return fineMemberLabel(f).toLocaleLowerCase("de-DE");
  if(key==="reason")return String(f.reason||"").toLocaleLowerCase("de-DE");
  if(key==="amount")return Number(f.amount)||0;
  if(key==="due")return f.dueDate||"9999-12-31";
  if(key==="status")return ({open:1,paid:2,waived:3})[f.status]||99;
  return "";
}
function sortFines(rows){
  const dir=fineSort.dir==="desc"?-1:1,key=fineSort.key;
  return rows.slice().sort((a,b)=>{
    const av=fineSortValue(a,key),bv=fineSortValue(b,key);
    const c=(typeof av==="number"&&typeof bv==="number")?av-bv:String(av).localeCompare(String(bv),"de",{numeric:true,sensitivity:"base"});
    return c?c*dir:String(a.reason||"").localeCompare(String(b.reason||""),"de",{sensitivity:"base"});
  });
}
function updateFineSortUI(){
  $$("[data-fine-sort]").forEach(btn=>{
    const active=btn.dataset.fineSort===fineSort.key;
    btn.classList.toggle("active",active);
    btn.querySelector(".sort-arrow")?.remove();
    const th=btn.closest("th");
    if(th)th.setAttribute("aria-sort",active?(fineSort.dir==="asc"?"ascending":"descending"):"none");
    if(active)btn.insertAdjacentHTML("beforeend",`<span class="sort-arrow" aria-hidden="true">${fineSort.dir==="asc"?" ↑":" ↓"}</span>`);
  });
  if($("#fineSortSelect"))$("#fineSortSelect").value=fineSort.key;
  if($("#fineSortDir"))$("#fineSortDir").textContent=fineSort.dir==="asc"?"↑ Aufsteigend":"↓ Absteigend";
}
function fineMemberOptions(selected="",snapshot=""){
  const members=activeRows("members").slice().sort((a,b)=>memberFullName(a).localeCompare(memberFullName(b),"de"));
  let result='<option value="">Mitglied auswählen …</option>';
  if(selected&&!members.some(m=>m.id===selected))result+=`<option value="${esc(selected)}" selected>${esc(snapshot||"Nicht mehr vorhandenes Mitglied")}</option>`;
  result+=members.map(m=>`<option value="${m.id}" ${m.id===selected?"selected":""}>${esc(memberFullName(m))} · ${esc(memberNo(m))}</option>`).join("");
  return result;
}
function renderFines(){
  const all=activeRows("fines");
  const q=($("#fineSearch")?.value||"").toLowerCase(),status=$("#fineStatusFilter")?.value||"";
  const rows=sortFines(all.filter(f=>(!status||f.status===status)&&(!q||`${fineMemberLabel(f)} ${f.reason||""} ${f.notes||""}`.toLowerCase().includes(q))));
  const open=all.filter(f=>f.status==="open");
  const paidYear=all.filter(f=>f.status==="paid"&&(f.paidDate||"").startsWith(String(new Date().getFullYear())));
  const openAmount=open.reduce((s,f)=>s+Number(f.amount||0),0);
  if($("#fineOpenAmount"))$("#fineOpenAmount").textContent=fineMoney(openAmount);
  if($("#finePaidYear"))$("#finePaidYear").textContent=fineMoney(paidYear.reduce((s,f)=>s+Number(f.amount||0),0));
  if($("#fineOpenCount"))$("#fineOpenCount").textContent=open.length;
  if($("#fineTotalCount"))$("#fineTotalCount").textContent=all.length;
  if($("#fineOpenNotice")){
    $("#fineOpenNotice").hidden=!open.length;
    $("#fineOpenNotice").innerHTML=open.length?`<strong>⚠ ${open.length} offene ${open.length===1?"Strafe":"Strafen"}</strong><span>${esc(fineMoney(openAmount))} sind noch zu bezahlen.</span>`:"";
  }
  if(!$("#fineTable"))return;

  $("#fineTable").innerHTML=rows.length?rows.map(f=>`<tr class="${f.status==="open"?"fine-row-open":""}">
    <td>${fmtDate(f.date)}</td>
    <td><b>${esc(fineMemberLabel(f))}</b><div class="mini-meta">${esc(f.memberNoSnapshot||"")}</div></td>
    <td><b>${esc(f.reason||"—")}</b>${f.notes?`<div class="fine-note">${esc(f.notes)}</div>`:""}</td>
    <td><b>${esc(fineMoney(f.amount))}</b></td>
    <td>${f.dueDate?fmtDate(f.dueDate):"—"}</td>
    <td>${fineStatusBadge(f.status,f.dueDate)}</td>
    <td class="fine-actions">
      <button class="action-link" data-edit-fine="${f.id}">Bearbeiten</button>
      
      ${f.status!=="paid"?`<button class="action-link" data-pay-fine="${f.id}">Bezahlt</button>`:""}
      ${f.status!=="waived"?`<button class="action-link" data-waive-fine="${f.id}">Erlassen</button>`:""}
      ${f.status!=="open"?`<button class="action-link" data-reopen-fine="${f.id}">Wieder öffnen</button>`:""}
      <button class="action-link danger-text" data-delete-fine="${f.id}">Löschen</button>
    </td>
  </tr>`).join(""):`<tr><td colspan="7" class="empty">Keine Strafen gefunden.</td></tr>`;

  updateFineSortUI();
  $$("[data-edit-fine]").forEach(btn=>btn.onclick=()=>openFineModal(byId("fines",btn.dataset.editFine)));
  $$("[data-pay-fine]").forEach(btn=>btn.onclick=()=>{const f=byId("fines",btn.dataset.payFine);if(f){f.status="paid";f.paidDate=todayStr();touch(f);saveLocal();}});
  $$("[data-waive-fine]").forEach(btn=>btn.onclick=()=>{const f=byId("fines",btn.dataset.waiveFine);if(f&&confirm(`Strafe „${f.reason}“ wirklich erlassen?`)){f.status="waived";f.paidDate="";touch(f);saveLocal();}});
  $$("[data-reopen-fine]").forEach(btn=>btn.onclick=()=>{const f=byId("fines",btn.dataset.reopenFine);if(f){f.status="open";f.paidDate="";touch(f);saveLocal();}});
  $$("[data-delete-fine]").forEach(btn=>btn.onclick=()=>{const f=byId("fines",btn.dataset.deleteFine);if(f&&confirm(`Strafe „${f.reason}“ wirklich löschen?`)){markDeleted("fines",f.id);saveLocal();}});
}
function renderFineMemberSearch(query=""){
  const box=$("#fineMemberSearchResults");
  if(!box)return;
  const q=String(query||"").trim().toLowerCase();
  const members=activeRows("members")
    .filter(m=>!q||`${memberFullName(m)} ${memberNo(m)} ${m.email||""}`.toLowerCase().includes(q))
    .sort((a,b)=>memberFullName(a).localeCompare(memberFullName(b),"de"))
    .slice(0,80);
  box.innerHTML=members.length?members.map(m=>`<button type="button" class="fine-member-result" data-pick-fine-member="${esc(m.id)}"><span><b>${esc(memberFullName(m))}</b><small>${esc(memberNo(m))}${m.email?` · ${esc(m.email)}`:""}</small></span><span>Auswählen</span></button>`).join(""):`<div class="empty compact">Kein passendes Mitglied gefunden.</div>`;
  $$('[data-pick-fine-member]').forEach(btn=>btn.onclick=()=>{
    const sel=$("#fineMember"); if(sel)sel.value=btn.dataset.pickFineMember;
    const panel=$("#fineMemberSearchPanel"); if(panel)panel.hidden=true;
  });
}
function bindFineMemberSearch(){
  const toggle=$("#fineMemberSearchToggle"),panel=$("#fineMemberSearchPanel"),input=$("#fineMemberSearchInput");
  if(!toggle||!panel||!input)return;
  toggle.onclick=()=>{panel.hidden=!panel.hidden;if(!panel.hidden){input.value="";renderFineMemberSearch("");setTimeout(()=>input.focus(),0)}};
  input.addEventListener("input",()=>renderFineMemberSearch(input.value));
}
const fineCatalogUi={
  query:"",
  editingId:"",
  feedback:"",
  highlightId:""
};
function fineCatalogUsageCount(catalogId){
  return activeRows("fines").filter(f=>f.fineCatalogId===catalogId).length;
}
function fineCatalogSortedRows(){
  return fineCatalog().slice().sort((a,b)=>
    String(a.label||"").localeCompare(String(b.label||""),"de",{sensitivity:"base"}) ||
    Number(a.amount||0)-Number(b.amount||0)
  );
}
function fineCatalogFilteredRows(){
  const q=String(fineCatalogUi.query||"").trim().toLocaleLowerCase("de-DE");
  const rows=fineCatalogSortedRows();
  if(!q)return rows;
  return rows.filter(item=>
    String(item.label||"").toLocaleLowerCase("de-DE").includes(q) ||
    fineMoney(item.amount).toLocaleLowerCase("de-DE").includes(q)
  );
}
function fineCatalogCardHTML(item){
  const uses=fineCatalogUsageCount(item.id);
  const highlighted=item.id===fineCatalogUi.highlightId;
  return `<div class="fine-catalog-card ${highlighted?"is-highlighted":""}" data-catalog-row="${esc(item.id)}">
    <div class="fine-catalog-card-main">
      <div class="fine-catalog-card-head">
        <b>${esc(item.label)}</b>
        <strong>${esc(fineMoney(item.amount))}</strong>
      </div>
      <small>${uses===0?"Noch nicht vergeben":`${uses}× vergeben`}</small>
    </div>
    <div class="fine-catalog-card-actions">
      <button class="btn tiny secondary" type="button" data-edit-catalog="${esc(item.id)}">Bearbeiten</button>
      <button class="btn tiny danger" type="button" data-delete-catalog="${esc(item.id)}">Löschen</button>
    </div>
  </div>`;
}
function fineCatalogEditorHTML(){
  if(!fineCatalogUi.editingId)return "";
  const isNew=fineCatalogUi.editingId==="__new__";
  const item=isNew?{label:"",amount:""}:fineCatalog().find(x=>x.id===fineCatalogUi.editingId);
  if(!item)return "";

  return `<div class="fine-catalog-inline-editor" id="fineCatalogEditor">
    <div class="fine-catalog-inline-head">
      <div>
        <b>${isNew?"Neue Strafe":"Strafe bearbeiten"}</b>
        <span>${isNew?"Bezeichnung und Standardbetrag festlegen.":"Änderungen gelten für zukünftige Vergaben; bereits vergebene Strafen bleiben unverändert."}</span>
      </div>
      <button class="icon-btn fine-catalog-editor-close" id="cancelCatalogEditTop" type="button" aria-label="Eingabe schließen">×</button>
    </div>
    <div class="fine-catalog-inline-form">
      <label>Bezeichnung
        <input id="catalogFineLabel" value="${esc(item.label||"")}" placeholder="z. B. Arbeitsdienst versäumt" autocomplete="off">
      </label>
      <label>Betrag (€)
        <input id="catalogFineAmount" type="number" min="0.01" step="0.01" inputmode="decimal" value="${esc(item.amount||"")}">
      </label>
    </div>
    <div class="fine-catalog-inline-actions">
      <button class="btn secondary" id="cancelCatalogEdit" type="button">Abbrechen</button>
      <button class="btn primary" id="saveCatalogEdit" type="button">${isNew?"Strafe hinzufügen":"Änderungen speichern"}</button>
    </div>
  </div>`;
}
function fineCatalogListHTML(){
  const total=fineCatalog().length;
  const rows=fineCatalogFilteredRows();

  if(!total){
    return `<div class="fine-catalog-empty">
      <div class="fine-catalog-empty-icon">📋</div>
      <b>Noch keine Strafen im Katalog</b>
      <span>Lege häufig verwendete Strafen einmal an und wähle sie später bei der Vergabe direkt aus.</span>
      <button class="btn primary" id="emptyNewCatalogFineBtn" type="button">+ Erste Strafe anlegen</button>
    </div>`;
  }

  if(!rows.length){
    return `<div class="fine-catalog-empty compact">
      <b>Keine passende Strafe gefunden</b>
      <span>Ändere den Suchbegriff oder lege eine neue Strafart an.</span>
    </div>`;
  }

  return rows.map(fineCatalogCardHTML).join("");
}
function updateFineCatalogList(){
  const list=$("#fineCatalogList");
  if(!list)return;
  list.innerHTML=fineCatalogListHTML();

  const total=fineCatalog().length,visible=fineCatalogFilteredRows().length;
  const count=$("#fineCatalogCount");
  if(count)count.textContent=fineCatalogUi.query?`${visible} von ${total} Strafarten`:`${total} Strafart${total===1?"":"en"}`;

  bindFineCatalogListActions();
}
function bindFineCatalogListActions(){
  $("#emptyNewCatalogFineBtn")?.addEventListener("click",()=>startFineCatalogEdit("__new__"));

  $$("[data-edit-catalog]").forEach(btn=>btn.onclick=()=>{
    startFineCatalogEdit(btn.dataset.editCatalog);
  });

  $$("[data-delete-catalog]").forEach(btn=>btn.onclick=()=>{
    const item=fineCatalog().find(x=>x.id===btn.dataset.deleteCatalog);
    if(!item)return;

    const uses=fineCatalogUsageCount(item.id);
    const note=uses
      ?`\n\nDiese Strafart wurde bereits ${uses}× vergeben. Bereits vergebene Strafen bleiben unverändert erhalten.`
      :"";

    if(!confirm(`„${item.label}“ wirklich aus dem Strafkatalog löschen?${note}`))return;

    db.settings.fineCatalog=fineCatalog().filter(x=>x.id!==item.id);
    db.settingsUpdatedAt=now();
    saveLocal();

    if(fineCatalogUi.editingId===item.id)fineCatalogUi.editingId="";
    fineCatalogUi.highlightId="";
    fineCatalogUi.feedback=`„${item.label}“ wurde aus dem Strafkatalog gelöscht.`;
    renderFineCatalogDialog({focusSearch:false});
  });
}
function startFineCatalogEdit(id="__new__"){
  fineCatalogUi.editingId=id;
  fineCatalogUi.feedback="";
  fineCatalogUi.highlightId="";
  renderFineCatalogDialog({focusEditor:true});
}
function cancelFineCatalogEdit(){
  fineCatalogUi.editingId="";
  fineCatalogUi.feedback="";
  renderFineCatalogDialog({focusSearch:false});
}
function saveFineCatalogEdit(){
  const isNew=fineCatalogUi.editingId==="__new__";
  const label=$("#catalogFineLabel")?.value.trim()||"";
  const amount=Number($("#catalogFineAmount")?.value);

  if(!label){
    $("#catalogFineLabel")?.focus();
    alert("Bitte eine Bezeichnung eintragen.");
    return;
  }
  if(!(amount>0)){
    $("#catalogFineAmount")?.focus();
    alert("Bitte einen Betrag größer 0 eingeben.");
    return;
  }

  const editingId=isNew?"":fineCatalogUi.editingId;
  const duplicate=fineCatalog().find(x=>
    x.id!==editingId &&
    String(x.label||"").trim().toLocaleLowerCase("de-DE")===label.toLocaleLowerCase("de-DE")
  );
  if(duplicate&&!confirm(`Eine Strafart mit der Bezeichnung „${duplicate.label}“ existiert bereits. Trotzdem speichern?`))return;

  let savedItem;
  if(isNew){
    savedItem={id:uid(),label,amount:Math.round(amount*100)/100};
    db.settings.fineCatalog.push(savedItem);
  }else{
    savedItem=fineCatalog().find(x=>x.id===editingId);
    if(!savedItem){
      alert("Der Katalogeintrag ist nicht mehr vorhanden.");
      fineCatalogUi.editingId="";
      renderFineCatalogDialog();
      return;
    }
    savedItem.label=label;
    savedItem.amount=Math.round(amount*100)/100;
  }

  db.settingsUpdatedAt=now();
  saveLocal();

  fineCatalogUi.editingId="";
  fineCatalogUi.highlightId=savedItem.id;
  fineCatalogUi.feedback=isNew
    ?`„${savedItem.label}“ wurde zum Strafkatalog hinzugefügt.`
    :`„${savedItem.label}“ wurde aktualisiert.`;

  // The editor closes immediately. The user stays in the catalog and sees
  // the newly saved/updated row directly in the list.
  renderFineCatalogDialog({scrollToHighlight:true});

  setTimeout(()=>{
    if(fineCatalogUi.highlightId===savedItem.id){
      fineCatalogUi.highlightId="";
      document.querySelector(`[data-catalog-row="${CSS.escape(savedItem.id)}"]`)?.classList.remove("is-highlighted");
    }
  },2200);
}
function renderFineCatalogDialog({focusEditor=false,focusSearch=false,scrollToHighlight=false}={}){
  const dlg=$("#detailModal");
  const total=fineCatalog().length,visible=fineCatalogFilteredRows().length;

  $("#detailTitle").textContent="Strafkatalog";
  $("#detailBody").innerHTML=`<div class="fine-catalog-overview">
    <div class="fine-catalog-summary">
      <div>
        <b id="fineCatalogCount">${fineCatalogUi.query?`${visible} von ${total} Strafarten`:`${total} Strafart${total===1?"":"en"}`}</b>
        <span>Vorlagen für häufig verwendete Strafen. Neue Einträge stehen sofort bei „Neue Strafe“ zur Auswahl.</span>
      </div>
      <button class="btn primary" id="newCatalogFineBtn" type="button">+ Neue Strafe</button>
    </div>

    ${fineCatalogUi.feedback?`<div class="fine-catalog-feedback" role="status">✓ ${esc(fineCatalogUi.feedback)}</div>`:""}

    ${fineCatalogEditorHTML()}

    ${total?`<div class="fine-catalog-tools">
      <div class="search-with-icon fine-catalog-search">
        <span>🔍</span>
        <input id="fineCatalogSearch" type="search" value="${esc(fineCatalogUi.query)}" placeholder="Strafkatalog durchsuchen …" autocomplete="off">
      </div>
    </div>`:""}

    <div class="fine-catalog-overview-list" id="fineCatalogList">
      ${fineCatalogListHTML()}
    </div>
  </div>`;

  $("#newCatalogFineBtn").onclick=()=>startFineCatalogEdit("__new__");
  $("#cancelCatalogEdit")?.addEventListener("click",cancelFineCatalogEdit);
  $("#cancelCatalogEditTop")?.addEventListener("click",cancelFineCatalogEdit);
  $("#saveCatalogEdit")?.addEventListener("click",saveFineCatalogEdit);

  $("#catalogFineLabel")?.addEventListener("keydown",e=>{
    if(e.key==="Enter"){
      e.preventDefault();
      $("#catalogFineAmount")?.focus();
    }
  });
  $("#catalogFineAmount")?.addEventListener("keydown",e=>{
    if(e.key==="Enter"){
      e.preventDefault();
      saveFineCatalogEdit();
    }
  });

  const search=$("#fineCatalogSearch");
  if(search){
    search.addEventListener("input",()=>{
      fineCatalogUi.query=search.value;
      updateFineCatalogList();
    });
    search.addEventListener("keydown",e=>{
      if(e.key==="Escape"&&search.value){
        e.preventDefault();
        search.value="";
        fineCatalogUi.query="";
        updateFineCatalogList();
      }
    });
  }

  bindFineCatalogListActions();

  if(focusEditor)setTimeout(()=>$("#catalogFineLabel")?.focus(),0);
  else if(focusSearch)setTimeout(()=>$("#fineCatalogSearch")?.focus(),0);

  if(scrollToHighlight&&fineCatalogUi.highlightId){
    setTimeout(()=>document.querySelector(`[data-catalog-row="${CSS.escape(fineCatalogUi.highlightId)}"]`)?.scrollIntoView({behavior:"smooth",block:"nearest"}),30);
  }

  if(!dlg.open)dlg.showModal();
}
function openFineCatalogModal(){
  fineCatalogUi.editingId="";
  fineCatalogUi.feedback="";
  fineCatalogUi.highlightId="";
  renderFineCatalogDialog();
}
function openFineModal(rec=null){
  const r=rec||{memberId:"",memberNameSnapshot:"",memberNoSnapshot:"",date:todayStr(),dueDate:"",reason:"",amount:"",status:"open",paidDate:"",notes:"",fineCatalogId:""};
  showModal(rec?"Strafe bearbeiten":"Neue Strafe",`<div class="form-grid">
    ${!rec?`<label class="full">Strafe aus Katalog<select id="fineCatalogSelect">${fineCatalogOptions(r.fineCatalogId||"")}</select></label>`:""}
    <label class="full">Mitglied<div class="fine-member-select-row"><select id="fineMember">${fineMemberOptions(r.memberId,r.memberNameSnapshot)}</select><button id="fineMemberSearchToggle" class="btn secondary fine-member-search-btn" type="button" title="Mitglied suchen" aria-label="Mitglied suchen">🔍</button></div></label>
    <div id="fineMemberSearchPanel" class="fine-member-search-panel full" hidden><div class="search-with-icon"><span>🔍</span><input id="fineMemberSearchInput" type="search" placeholder="Name, Mitgliedsnummer oder E-Mail suchen …"></div><div id="fineMemberSearchResults" class="fine-member-results"></div></div>
    <label>Datum<input id="fineDate" type="date" value="${esc(r.date||todayStr())}"></label>
    <label>Fällig am<input id="fineDue" type="date" value="${esc(r.dueDate||"")}"></label>
    <label class="full">Grund<input id="fineReason" value="${esc(r.reason||"")}" placeholder="z. B. nicht geleisteter Dienst"></label>
    <label>Betrag (€)<input id="fineAmount" type="number" min="0.01" step="0.01" inputmode="decimal" value="${esc(r.amount||"")}"></label>
    <label>Status<select id="fineStatus">
      <option value="open" ${r.status==="open"?"selected":""}>Offen</option>
      <option value="paid" ${r.status==="paid"?"selected":""}>Bezahlt</option>
      <option value="waived" ${r.status==="waived"?"selected":""}>Erlassen</option>
    </select></label>
    <label>Bezahlt am<input id="finePaidDate" type="date" value="${esc(r.paidDate||"")}"></label>
    <label class="full">Notizen<textarea id="fineNotes" rows="4">${esc(r.notes||"")}</textarea></label>
    <div class="form-note full">Strafen sind mit einem V-Planer-Mitglied verknüpft. Name und Mitgliedsnummer werden zusätzlich als Historie gespeichert.</div>
  </div>`,()=>{
    const memberId=$("#fineMember").value,reason=$("#fineReason").value.trim(),amount=Number($("#fineAmount").value);
    if(!memberId){alert("Bitte ein Mitglied auswählen.");return false;}
    if(!reason){alert("Bitte einen Grund angeben.");return false;}
    if(!(amount>0)){alert("Bitte einen gültigen Betrag größer 0 eingeben.");return false;}
    const member=byId("members",memberId),status=$("#fineStatus").value;
    const target=rec||{id:uid(),createdAt:now()};
    Object.assign(target,{
      memberId,
      memberNameSnapshot:member?memberFullName(member):(r.memberNameSnapshot||""),
      memberNoSnapshot:member?memberNo(member):(r.memberNoSnapshot||""),
      date:$("#fineDate").value||todayStr(),
      dueDate:$("#fineDue").value,
      reason,
      amount:Math.round(amount*100)/100,
      status,
      paidDate:status==="paid"?($("#finePaidDate").value||todayStr()):"",
      notes:$("#fineNotes").value.trim(),
      fineCatalogId:$("#fineCatalogSelect")?.value||r.fineCatalogId||""
    });
    touch(target);
    if(!rec)db.fines.push(target);
    saveLocal();
    return true;
  });
  bindFineMemberSearch();
  if(!rec&&$("#fineCatalogSelect"))$("#fineCatalogSelect").onchange=e=>{
    const item=fineCatalog().find(x=>x.id===e.target.value);
    if(!item)return;
    $("#fineReason").value=item.label||"";
    $("#fineAmount").value=Number(item.amount||0).toFixed(2);
  };
}
$("#fineSearch")?.addEventListener("input",renderFines);
$("#fineStatusFilter")?.addEventListener("change",renderFines);
$$("[data-fine-sort]").forEach(btn=>btn.onclick=()=>{
  const key=btn.dataset.fineSort;
  if(fineSort.key===key)fineSort.dir=fineSort.dir==="asc"?"desc":"asc";
  else{fineSort.key=key;fineSort.dir="asc";}
  renderFines();
});
$("#fineSortSelect")?.addEventListener("change",e=>{fineSort.key=e.target.value;fineSort.dir="asc";renderFines();});
$("#fineSortDir")?.addEventListener("click",()=>{fineSort.dir=fineSort.dir==="asc"?"desc":"asc";renderFines();});
$("#newFineBtn")?.addEventListener("click",()=>openFineModal());
$("#fineCatalogBtn")?.addEventListener("click",openFineCatalogModal);

function renderGroups(){
  const roots=activeRows("groups").filter(g=>!g.parentId); $("#groupTree").innerHTML=roots.length?roots.map(g=>groupNodeHTML(g,0)).join(""):`<div class="empty">Noch keine Gruppen.</div>`;
  $$('[data-group-node]').forEach(el=>el.onclick=()=>{selectedGroupId=el.dataset.groupNode;renderGroups()});
  if(!selectedGroupId&&roots[0])selectedGroupId=roots[0].id;
  renderGroupDetail();
  renderFunctionOverview();
}
function groupNodeHTML(g,level){ const children=activeRows("groups").filter(x=>x.parentId===g.id); return `<div class="node level-${Math.min(level,3)} ${g.id===selectedGroupId?"active":""}" data-group-node="${g.id}">${level?"↳ ":""}${esc(g.name)} <span class="mini-meta">· ${esc(g.type||"Gruppe")}</span></div>${children.map(c=>groupNodeHTML(c,level+1)).join("")}`; }
function renderGroupDetail(){
  const g=byId("groups",selectedGroupId); $("#editGroupBtn").disabled=!g; $("#deleteGroupBtn").disabled=!g; if($("#linkGroupBtn"))$("#linkGroupBtn").disabled=!g; if(!g){const clip=$("#linkGroupBtn");if(clip){clip.innerHTML="📎";clip.title="Verknüpfungen"}$("#groupDetail").innerHTML='<div class="empty">Gruppe auswählen.</div>';$("#groupDetailTitle").textContent="Gruppendetails";return}
  $("#groupDetailTitle").textContent=g.name; const direct=directMembersOfGroup(g.id),all=membersOfGroup(g.id,true),activeFns=activeFunctionsForGroup(g.id),upcomingFns=upcomingFunctionsForGroup(g.id),formerFns=formerFunctionsForGroup(g.id),children=activeRows("groups").filter(x=>x.parentId===g.id);
  const groupLinkBtn=$("#linkGroupBtn");if(groupLinkBtn){const linkCount=relatedRecordCount("group",g.id);groupLinkBtn.innerHTML=`📎${linkCount?`<span>${linkCount}</span>`:""}`;groupLinkBtn.title=`Verknüpfungen${linkCount?` (${linkCount})`:""}`;}
  const rule=g.autoRule?.enabled?`Automatisch: ${g.autoRule.status?`Status ${statusLabel(g.autoRule.status)}`:"alle Status"}${g.autoRule.ageMin!==""&&g.autoRule.ageMin!=null?`, ab ${g.autoRule.ageMin} J.`:""}${g.autoRule.ageMax!==""&&g.autoRule.ageMax!=null?`, bis ${g.autoRule.ageMax} J.`:""}`:"Keine automatische Regel";
  $("#groupDetail").innerHTML=`<p>${esc(g.description||"Keine Beschreibung hinterlegt.")}</p><div class="group-stat-grid"><div class="group-stat"><small>Direkte Mitglieder</small><b>${direct.length}</b></div><div class="group-stat"><small>inkl. Untergruppen</small><b>${all.length}</b></div><div class="group-stat"><small>Untergruppen</small><b>${children.length}</b></div><div class="group-stat"><small>Aktive Funktionen</small><b>${activeFns.length}</b></div></div>
  <div class="auto-rule"><b>Automatische Gruppenzuordnung</b><br>${esc(rule)}</div>
  <div class="group-section"><h3>Ansprechpartner</h3><div>${g.contactMemberId?esc(memberFullName(byId("members",g.contactMemberId)||{})):"Nicht hinterlegt"}</div></div>
  <div class="group-section"><h3>Aktuelle Funktionen</h3>${activeFns.length?activeFns.map(functionRowHTML).join(""):'<div class="mini-meta">Keine aktuellen Funktionen.</div>'}</div>
  <div class="group-section"><h3>Künftige Funktionen</h3>${upcomingFns.length?upcomingFns.map(functionRowHTML).join(""):'<div class="mini-meta">Keine künftigen Funktionen.</div>'}</div>
  <div class="group-section"><h3>Frühere Funktionen</h3>${formerFns.length?formerFns.map(functionRowHTML).join(""):'<div class="mini-meta">Keine früheren Funktionen.</div>'}</div>
  <div class="group-section"><h3>Mannschaft / Mitgliederliste</h3><div class="team-list">${all.length?all.map(m=>`<span class="person-pill">${esc(`${m.firstName||""} ${m.lastName||""}`.trim())}</span>`).join(""):'<span class="mini-meta">Keine Mitglieder zugeordnet.</span>'}</div></div>`;
  $$('[data-edit-function]').forEach(el=>el.onclick=()=>openFunctionModal(byId("functions",el.dataset.editFunction)));
  $$('[data-delete-function]').forEach(el=>el.onclick=()=>{if(confirm("Funktion löschen?")){markDeleted("functions",el.dataset.deleteFunction);saveLocal()}});
}
function renderFunctionOverview(){
  const host=$("#functionOverviewList");if(!host)return;
  const q=($("#functionSearch")?.value||"").trim().toLowerCase(),filter=$("#functionStatusFilter")?.value||"";
  const order={active:0,upcoming:1,former:2};
  const rows=activeRows("functions").filter(f=>{
    const member=byId("members",f.memberId),state=functionState(f);
    const matches=!q||`${f.title||""} ${f.kind||""} ${member?memberFullName(member):"unbesetzt"} ${groupName(f.groupId)} ${f.notes||""}`.toLowerCase().includes(q);
    const statusMatch=!filter||(filter==="vacant"?!f.memberId:state===filter);
    return matches&&statusMatch;
  }).sort((a,b)=>(order[functionState(a)]-order[functionState(b)])||String(a.title||"").localeCompare(String(b.title||""),"de"));
  host.innerHTML=rows.length?rows.map(f=>{
    const member=byId("members",f.memberId),state=functionState(f),count=relatedRecordCount("function",f.id);
    return `<div class="function-overview-row ${state}">
      <div class="function-overview-icon">${f.kind==="Trainer"?"🏃":f.kind==="Vorstandsfunktion"?"🏛️":"🎖️"}</div>
      <div class="function-overview-copy"><div class="function-overview-title"><b>${esc(f.title)}</b><span class="function-state ${state}">${esc(functionStateLabel(f))}</span>${!f.memberId?'<span class="function-state vacant">Unbesetzt</span>':""}</div><small>${esc(f.kind||"Funktion")} · ${esc(groupName(f.groupId))}</small><span>${esc(member?memberFullName(member):"Noch keine Person zugeordnet")} · ${f.startDate?fmtDate(f.startDate):"Beginn offen"} – ${f.endDate?fmtDate(f.endDate):"offen"}</span>${f.notes?`<em>${esc(f.notes)}</em>`:""}</div>
      <div class="function-overview-actions"><button class="btn tiny secondary" type="button" data-overview-edit-function="${f.id}">Bearbeiten</button><button class="btn tiny danger" type="button" data-overview-delete-function="${f.id}">Löschen</button></div>
    </div>`;
  }).join(""):`<div class="empty">Keine passenden Funktionen vorhanden.</div>`;
  $$('[data-overview-edit-function]').forEach(btn=>btn.onclick=()=>{const f=byId("functions",btn.dataset.overviewEditFunction);if(f)openFunctionModal(f)});
  $$('[data-overview-delete-function]').forEach(btn=>btn.onclick=()=>{const f=byId("functions",btn.dataset.overviewDeleteFunction);if(f&&confirm(`Funktion „${f.title}“ in den Papierkorb verschieben?`)){markDeleted("functions",f.id);saveLocal()}});
}
$("#functionSearch")?.addEventListener("input",renderFunctionOverview);
$("#functionStatusFilter")?.addEventListener("change",renderFunctionOverview);
$("#newFunctionOverviewBtn")?.addEventListener("click",()=>openFunctionModal(null,selectedGroupId||""));

function functionRowHTML(f){ const m=byId("members",f.memberId); return `<div class="function-row"><div><b>${esc(f.title)}</b><div class="mini-meta">${esc(f.kind||"Funktion")}</div></div><div>${esc(m?memberFullName(m):"Nicht besetzt")}</div><div>${fmtDate(f.startDate)} – ${f.endDate?fmtDate(f.endDate):"offen"}</div><div><button class="action-link" data-edit-function="${f.id}">Bearbeiten</button>  <button class="action-link" data-delete-function="${f.id}">Löschen</button></div></div>`; }
$("#editGroupBtn").onclick=()=>{const g=byId("groups",selectedGroupId);if(g)openGroupModal(g)};
$("#deleteGroupBtn").onclick=()=>deleteSelectedGroup();
$("#newFunctionBtn").onclick=()=>openFunctionModal(null,selectedGroupId);
function deleteSelectedGroup(){ const g=byId("groups",selectedGroupId); if(!g)return; if(!confirm(`Gruppe „${g.name}“ löschen? Untergruppen werden eine Ebene höher verschoben; Mitgliedszuordnungen zu dieser Gruppe werden entfernt.`))return; const parent=g.parentId||""; activeRows("groups").filter(x=>x.parentId===g.id).forEach(x=>{x.parentId=parent;touch(x)}); activeRows("members").forEach(m=>{if((m.groupIds||[]).includes(g.id)){m.groupIds=(m.groupIds||[]).filter(id=>id!==g.id);touch(m)}}); ["tasks","projects","events"].forEach(c=>activeRows(c).forEach(r=>{if(r.groupId===g.id){r.groupId="";touch(r)}})); activeRows("functions").forEach(f=>{if(f.groupId===g.id){f.groupId="";touch(f)}}); markDeleted("groups",g.id);selectedGroupId=null;saveLocal(); }

function estimateLocalBytes(){ return new Blob([JSON.stringify(db)]).size; }
function hasKnownDriveGrant(){ return localStorage.getItem(DRIVE_GRANT_KEY)==="1"; }
function hasUsableAccessToken(){ return !!accessToken && Date.now() < tokenExpiresAt; }

function groupOptions(selected="",excludeId=""){return `<option value="">Gesamtverein / keine Gruppe</option>${activeRows("groups").filter(g=>g.id!==excludeId).map(g=>`<option value="${g.id}" ${g.id===selected?"selected":""}>${esc(g.name)}</option>`).join("")}`}
function projectOptions(selected=""){return `<option value="">Kein Projekt</option>${activeRows("projects").map(p=>`<option value="${p.id}" ${p.id===selected?"selected":""}>${esc(p.name)}</option>`).join("")}`}
function linkedEventForProject(project){
  if(!project)return null;
  if(project.linkedEventId){
    const direct=recordById("events",project.linkedEventId);
    if(direct&&!direct.deletedAt)return direct;
  }
  return allRows("events").find(e=>!e.deletedAt&&e.projectId===project.id)||null;
}
function linkedProjectForEvent(event){
  if(!event)return null;
  if(event.projectId){
    const direct=recordById("projects",event.projectId);
    if(direct&&!direct.deletedAt)return direct;
  }
  return allRows("projects").find(p=>!p.deletedAt&&p.linkedEventId===event.id)||null;
}
function eventOptionsForProject(selected="",projectId=""){
  const rows=activeRows("events").filter(e=>{
    const linked=linkedProjectForEvent(e);
    return !linked||linked.id===projectId||e.id===selected;
  });
  return `<option value="">Kein Termin verknüpft</option>${rows
    .slice()
    .sort((a,b)=>eventStartDate(a).localeCompare(eventStartDate(b))||String(a.title||"").localeCompare(String(b.title||""),"de"))
    .map(e=>`<option value="${e.id}" ${e.id===selected?"selected":""}>${esc(e.title)} · ${esc(eventDateRangeText(e))}</option>`)
    .join("")}`;
}
function projectOptionsForEvent(selected="",eventId=""){
  const rows=activeRows("projects").filter(p=>{
    const linked=linkedEventForProject(p);
    return !linked||linked.id===eventId||p.id===selected;
  });
  return `<option value="">Kein Projekt verknüpft</option>${rows
    .slice()
    .sort((a,b)=>String(a.name||"").localeCompare(String(b.name||""),"de"))
    .map(p=>`<option value="${p.id}" ${p.id===selected?"selected":""}>${esc(p.name)} · ${esc(projectDateRangeText(p))}</option>`)
    .join("")}`;
}
function detachProjectEvent(project,event){
  if(project&&project.linkedEventId===event?.id){
    delete project.linkedEventId;
    touch(project);
  }
  if(event&&event.projectId===project?.id){
    delete event.projectId;
    touch(event);
  }
}
function linkProjectEvent(project,event){
  if(!project||!event)return;
  const oldEvent=linkedEventForProject(project);
  if(oldEvent&&oldEvent.id!==event.id)detachProjectEvent(project,oldEvent);
  const oldProject=linkedProjectForEvent(event);
  if(oldProject&&oldProject.id!==project.id)detachProjectEvent(oldProject,event);
  project.linkedEventId=event.id;
  event.projectId=project.id;
  touch(project);
  touch(event);
}
function projectEventSummary(event){
  if(!event)return "";
  const range=eventDateRangeText(event),time=eventTimeRangeText(event);
  return `${range}${time?` · ${time}`:""}${event.location?` · ${event.location}`:""}`;
}
function openEventForProject(project){
  if(!project)return;
  const event=linkedEventForProject(project);
  if(event){
    showEventDetails(event);
    return;
  }
  const eventDate=projectEndDate(project)||projectStartDate(project)||todayStr();
  openEventModal(null,project.id,{
    title:project.name||"",
    startDate:eventDate,
    endDate:eventDate,
    groupId:project.groupId||"",
    description:project.description||""
  });
}
function memberOptions(selected=""){return `<option value="">Nicht besetzt</option>${activeRows("members").filter(m=>m.status!=="exited").map(m=>`<option value="${m.id}" ${m.id===selected?"selected":""}>${esc(memberFullName(m))}</option>`).join("")}`}
function showModal(title,body,saveFn){ $("#modalTitle").textContent=title;$("#modalBody").innerHTML=body;const dlg=$("#modal");dlg.showModal();$("#modalSave").onclick=e=>{e.preventDefault();Promise.resolve(saveFn()).then(ok=>{if(ok!==false)dlg.close()})}; }
function readPhoto(fileInput,current=""){ const f=fileInput.files?.[0]; if(!f)return Promise.resolve(current); return new Promise((resolve,reject)=>{const img=new Image(),fr=new FileReader();fr.onload=()=>{img.onload=()=>{const max=320,s=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement("canvas");c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext("2d").drawImage(img,0,0,c.width,c.height);resolve(c.toDataURL("image/jpeg",.72))};img.onerror=reject;img.src=fr.result};fr.onerror=reject;fr.readAsDataURL(f)}); }
function parseKeyValueLines(text,sep="="){return String(text||"").split(/\n+/).map(x=>x.trim()).filter(Boolean).map(line=>{const i=line.indexOf(sep);return i>=0?{key:line.slice(0,i).trim(),value:line.slice(i+1).trim()}:{key:line,value:""}})}
function parseDatedLines(text){return String(text||"").split(/\n+/).map(x=>x.trim()).filter(Boolean).map(line=>{const p=line.split("|");return {title:(p[0]||"").trim(),date:(p[1]||"").trim()}})}
function parseHistory(text){return String(text||"").split(/\n+/).map(x=>x.trim()).filter(Boolean).map(line=>{const p=line.split("|");return {date:(p[0]||"").trim(),note:(p.slice(1).join("|")||"").trim()}})}

function openTaskModal(){}
function openProjectModal(rec=null){
  const r=rec||{name:"",startDate:"",endDate:"",due:"",status:"planned",groupId:"",description:"",linkedEventId:""};
  const stats=rec?projectTaskStats(rec.id):{total:0,done:0,progress:0};
  const startDate=projectStartDate(r),endDate=projectEndDate(r)||startDate;
  const currentLinked=rec?linkedEventForProject(rec):null;

  showModal(rec?"Projekt bearbeiten":"Neues Projekt",`<div class="form-grid">
    <label class="full">Projektname<input id="fName" value="${esc(r.name)}"></label>

    <div class="form-section">Organisationszeitraum</div>
    <label>Projektbeginn<input id="fProjectStartDate" type="date" value="${esc(startDate)}"></label>
    <label>Projektende<input id="fProjectEndDate" type="date" value="${esc(endDate)}"></label>

    <label>Status<select id="fStatus">${["planned","active","paused","closed"].map(s=>`<option value="${s}" ${r.status===s?"selected":""}>${statusLabel(s)}</option>`).join("")}</select></label>
    <label>Gruppe<select id="fGroup">${groupOptions(r.groupId)}</select></label>

    ${rec?`<label class="full">Zugehöriger Termin
      <select id="fProjectEvent">${eventOptionsForProject(currentLinked?.id||"",r.id)}</select>
      <small class="field-help">Projekt = Organisation und Aufgaben. Termin = das tatsächliche Ereignis mit Datum, Uhrzeit und Ort.</small>
    </label>`:`<div class="form-note full">Nach dem Speichern kannst du direkt einen Termin zum Projekt anlegen. Dieser bildet das tatsächliche Ereignis ab.</div>`}

    ${rec?`<div class="project-modal-progress full"><b>Automatischer Fortschritt: ${stats.progress}%</b><span>${stats.done} von ${stats.total} Aufgaben erledigt</span><div class="progress"><span style="width:${stats.progress}%"></span></div></div>`:`<div class="form-note full">Der Projektfortschritt wird automatisch aus den später angelegten Projektaufgaben berechnet. Jede erledigte Aufgabe zählt gleich stark.</div>`}

    <label class="full">Beschreibung<textarea id="fDescription" rows="5">${esc(r.description||"")}</textarea></label>
    <div class="form-note full">Der Projektzeitraum beschreibt die Organisations- und Arbeitsphase. Der tatsächliche Veranstaltungstermin kann separat mit Uhrzeit und Ort verknüpft werden.</div>
  </div>`,()=>{
    const name=$("#fName").value.trim();
    if(!name)return false;

    let start=$("#fProjectStartDate").value;
    let end=$("#fProjectEndDate").value;
    if(!start&&end)start=end;
    if(start&&!end)end=start;

    if(start&&end&&end<start){
      alert("Das Projektende darf nicht vor dem Projektbeginn liegen.");
      return false;
    }

    const target=rec||{id:uid(),createdAt:now()};
    const previousLinked=rec?linkedEventForProject(rec):null;

    Object.assign(target,{
      name,
      startDate:start,
      endDate:end,
      due:end||start||"",
      status:$("#fStatus").value,
      groupId:$("#fGroup").value,
      description:$("#fDescription").value
    });
    touch(target);
    if(!rec)db.projects.push(target);

    if(rec){
      const selectedEventId=$("#fProjectEvent").value;
      const selectedEvent=selectedEventId?recordById("events",selectedEventId):null;
      if(previousLinked&&previousLinked.id!==selectedEventId)detachProjectEvent(target,previousLinked);
      if(selectedEvent)linkProjectEvent(target,selectedEvent);
      if(!selectedEventId)delete target.linkedEventId;
    }

    saveLocal();
    return true;
  });
}
function showEventDetails(e){
  const dlg=$("#detailModal"),color=eventColor(e),range=eventDateRangeText(e),time=eventTimeRangeText(e),
        linkedProject=linkedProjectForEvent(e);
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
      ${e.description?`<div class="detail-box full-detail"><b>Beschreibung / Hinweise</b>${esc(e.description)}</div>`:""}
    </div>
    ${linkedProject?`<div class="event-project-link">
      <div><b>Gehört zu Projekt</b><span>${esc(linkedProject.name)} · ${esc(projectDateRangeText(linkedProject))}</span></div>
      <button class="btn tiny secondary" type="button" id="detailOpenProject">Projekt öffnen</button>
    </div>`:""}
    <div class="event-detail-summary">
      <b>Terminzeitraum</b>
      <span>${esc(range)}${time?` · ${esc(time)}`:""}</span>
    </div>
    <div class="event-detail-color"><span style="background:${color}"></span><b>Terminfarbe</b><code>${esc(color.toUpperCase())}</code></div>
    <div class="event-detail-actions">
      
      <button class="btn primary" type="button" id="detailEditEvent">Bearbeiten</button>
      <button class="btn danger" type="button" id="detailDeleteEvent">Termin löschen</button>
    </div>
  </div>`;
  dlg.showModal();

  $("#detailOpenProject")?.addEventListener("click",()=>{
    dlg.close();
    const current=recordById("projects",linkedProject?.id);
    if(!current)return;
    if(current.archivedAt){go("archive");return;}
    go("projects");
    setTimeout(()=>document.querySelector(`[data-edit-project="${CSS.escape(current.id)}"]`)?.scrollIntoView({behavior:"smooth",block:"center"}),50);
  });

  $("#detailEditEvent").onclick=()=>{
    const current=recordById("events",e.id);
    dlg.close();
    if(current)openEventModal(current);
    else alert("Der Termin ist im aktuellen Datenstand nicht mehr vorhanden.");
  };

  $("#detailDeleteEvent").onclick=()=>{
    const linked=linkedProjectForEvent(e);
    const extra=linked?`\n\nDie Verknüpfung zum Projekt „${linked.name}“ bleibt für eine mögliche Wiederherstellung gespeichert.`:"";
    if(!confirm(`Termin „${e.title}“ wirklich löschen?\n\nDer Termin wird aus Kalender und Vereinsjahr entfernt.${extra}`))return;
    markDeleted("events",e.id);
    dlg.close();
    saveLocal();
  };
}
function openEventModal(rec=null,presetProjectId="",preset={}){
  const eventId=rec?.id||"";
  const linkedProject=rec?linkedProjectForEvent(rec):(presetProjectId?recordById("projects",presetProjectId):null);
  const r=(eventId?recordById("events",eventId):null)||rec||{
    title:preset.title||linkedProject?.name||"",
    startDate:preset.startDate||"",
    endDate:preset.endDate||preset.startDate||"",
    startTime:"",
    endTime:"",
    location:"",
    groupId:preset.groupId||linkedProject?.groupId||"",
    projectId:presetProjectId||"",
    description:preset.description||linkedProject?.description||"",
    color:"#1677c8"
  };
  const startDate=eventStartDate(r),endDate=eventEndDate(r)||startDate,startTime=eventStartTime(r),endTime=eventEndTime(r);
  const currentColor=eventColor(r);
  const currentProject=linkedProjectForEvent(r)||linkedProject;
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

  showModal(rec?"Termin bearbeiten":presetProjectId?"Termin zum Projekt anlegen":"Neuer Termin",`<div class="form-grid">
    ${presetProjectId?`<div class="form-note full">Dieser Termin wird mit dem Projekt <b>${esc(linkedProject?.name||"")}</b> verknüpft. Projekt und Termin bleiben getrennte Datensätze.</div>`:""}

    <label class="full">Titel<input id="fTitle" value="${esc(r.title)}"></label>

    <div class="form-section">Terminzeitraum</div>
    <label>Von – Datum<input id="fStartDate" type="date" value="${esc(startDate)}"></label>
    <label>Bis – Datum<input id="fEndDate" type="date" value="${esc(endDate)}"></label>
    <label>Von – Uhrzeit<input id="fStartTime" type="time" value="${esc(startTime)}"></label>
    <label>Bis – Uhrzeit<input id="fEndTime" type="time" value="${esc(endTime)}"></label>

    <label>Ort<input id="fLocation" value="${esc(r.location||"")}"></label>
    <label>Gruppe<select id="fGroup">${groupOptions(r.groupId)}</select></label>

    <label class="full">Zugehöriges Projekt
      <select id="fEventProject" ${presetProjectId?"disabled":""}>${projectOptionsForEvent(currentProject?.id||presetProjectId,eventId)}</select>
      <small class="field-help">Optional. So bleibt sichtbar, welches Projekt diesen Termin organisiert.</small>
    </label>

    <label class="full">Beschreibung / Hinweise<textarea id="fEventDescription" rows="4">${esc(r.description||"")}</textarea></label>

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

    <div class="form-note full">Termin = tatsächliches Ereignis mit Datum, Uhrzeit und Ort. Projekt = Organisationszeitraum, Aufgaben und Fortschritt.</div>
  </div>`,()=>{
    const title=$("#fTitle").value.trim();
    const sd=$("#fStartDate").value,ed=$("#fEndDate").value||sd;
    const st=$("#fStartTime").value,et=$("#fEndTime").value;
    const color=$("#fColor").value||"#1677c8";

    if(!title)return false;
    if(!sd){alert("Bitte ein Startdatum auswählen.");return false}
    if(ed<sd){alert("Das Bis-Datum darf nicht vor dem Von-Datum liegen.");return false}
    if(sd===ed&&st&&et&&et<st){alert("Bei einem eintägigen Termin darf die Bis-Uhrzeit nicht vor der Von-Uhrzeit liegen.");return false}

    let target=eventId?recordById("events",eventId):null;
    const isNew=!eventId;
    if(eventId&&!target){
      alert("Der Termin konnte nicht gespeichert werden, weil er im aktuellen Datenstand nicht mehr vorhanden ist.");
      return false;
    }
    if(isNew)target={id:uid(),createdAt:now()};

    const previousProject=eventId?linkedProjectForEvent(target):null;
    const selectedProjectId=presetProjectId||$("#fEventProject").value;
    const selectedProject=selectedProjectId?recordById("projects",selectedProjectId):null;

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
      description:$("#fEventDescription").value.trim(),
      color
    });
    target.updatedAt=now();
    if(isNew)db.events.push(target);

    if(previousProject&&previousProject.id!==selectedProjectId)detachProjectEvent(previousProject,target);
    if(selectedProject)linkProjectEvent(selectedProject,target);
    if(!selectedProjectId)delete target.projectId;

    saveLocal();

    const saved=recordById("events",target.id);
    if(!saved||saved.title!==title||eventStartDate(saved)!==sd||eventEndDate(saved)!==ed){
      alert("Der Termin konnte nicht vollständig aktualisiert werden. Bitte erneut versuchen.");
      return false;
    }
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
function openMemberModal(){}
function showMemberCard(m){
  const c=db.settings.clubData||{},
        clubLabel=c.shortName||db.settings.clubName||"Verein",
        logo=c.logoData?`<img class="member-card-club-logo" src="${c.logoData}" alt="${esc(clubLabel)}">`:"";
  $("#detailTitle").textContent="Digitale Mitgliedskarte";
  $("#detailBody").innerHTML=`<div style="max-width:520px;margin:auto"><div class="member-card-digital" style="padding:24px"><div class="member-card-top"><div><div class="member-card-club-brand">${logo}<b>${esc(clubLabel)}</b></div><div style="font-size:28px;margin-top:16px">${esc(`${m.firstName||""} ${m.lastName||""}`.trim())}</div><small>${esc(effectiveGroupIdsForMember(m).map(groupName).filter(x=>x!=="—").join(" · ")||"Gesamtverein")}</small></div><div style="text-align:right"><b style="font-size:22px">${esc(memberNo(m))}</b><div style="margin-top:15px">${m.honorary?`★ Ehrenmitglied${honoraryContributionFree(m)?" · beitragsfrei":""}`:""}</div></div></div></div></div>`;
  $("#detailModal").showModal();
}

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
function openFunctionModal(rec=null,groupId=""){
  const r=rec||{title:"",kind:"Vorstandsfunktion",groupId:groupId||"",memberId:"",startDate:"",endDate:"",notes:""};
  showModal(rec?"Funktion / Amt bearbeiten":"Neue Funktion / neues Amt",`<div class="form-grid">
    <div class="form-note full"><b>Was ist eine Funktion?</b><br>Eine Funktion beschreibt ein Amt oder eine Zuständigkeit im Verein – z. B. Vorsitz, Kasse, Trainer oder Ansprechpartner. Sie ist <b>keine Benutzerberechtigung</b>. Durch die Verknüpfung mit einem Mitglied bleibt die Person nur einmal gepflegt; Beginn und Ende bilden Wechsel und Historie ab.</div>
    <label class="full">Bezeichnung des Amts / der Funktion<input id="fnTitle" value="${esc(r.title)}" placeholder="z. B. 1. Vorsitzender, Kassenwart, Trainer"></label>
    <label>Art<select id="fnKind">${["Vorstandsfunktion","Trainer","Betreuer","Ansprechpartner","Sonstige Funktion"].map(x=>`<option ${r.kind===x?"selected":""}>${x}</option>`).join("")}</select></label>
    <label>Gruppe<select id="fnGroup">${groupOptions(r.groupId)}</select></label>
    <label class="full">Mitglied / Person<select id="fnMember">${memberOptions(r.memberId)}</select><small class="field-help">Kann leer bleiben, wenn ein Amt aktuell unbesetzt ist.</small></label>
    <label>Beginn<input id="fnStart" type="date" value="${esc(r.startDate||"")}"></label>
    <label>Ende<input id="fnEnd" type="date" value="${esc(r.endDate||"")}"><small class="field-help">Leer = derzeit ohne festgelegtes Ende.</small></label>
    <label class="full">Notizen<textarea id="fnNotes" rows="3" placeholder="z. B. Wahlperiode, Zuständigkeiten oder Besonderheiten">${esc(r.notes||"")}</textarea></label>
  </div>`,()=>{
    const title=$("#fnTitle").value.trim(),startDate=$("#fnStart").value,endDate=$("#fnEnd").value;
    if(!title)return false;
    if(startDate&&endDate&&endDate<startDate){alert("Das Ende der Funktion darf nicht vor dem Beginn liegen.");return false}
    const target=rec||{id:uid(),createdAt:now()};
    Object.assign(target,{title,kind:$("#fnKind").value,groupId:$("#fnGroup").value,memberId:$("#fnMember").value,startDate,endDate,notes:$("#fnNotes").value.trim()});
    touch(target);if(!rec)db.functions.push(target);saveLocal();return true;
  });
}
$$('[data-action="new-task"]').forEach(b=>b.onclick=()=>openTaskModal());
$$('[data-action="new-project"]').forEach(b=>b.onclick=()=>openProjectModal());
$$('[data-action="new-event"]').forEach(b=>b.onclick=()=>openEventModal());
$$('[data-action="new-member"]').forEach(b=>b.onclick=()=>openMemberModal());
$$('[data-action="new-group"]').forEach(b=>b.onclick=()=>openGroupModal());
$("#quickCreateBtn").onclick=()=>openTaskModal();

function mergeCollection(local,cloud){
  const map=new Map();
  // Local records are inserted first. Cloud replaces them only when it is
  // strictly newer. On identical timestamps the local record wins, avoiding
  // freshly edited values being reverted by an equal-timestamp cloud copy.
  [...(local||[]),...(cloud||[])].forEach(rec=>{
    const old=map.get(rec.id);
    if(!old||new Date(rec.updatedAt||0)>new Date(old.updatedAt||0))map.set(rec.id,rec);
  });
  return [...map.values()];
}
function mergeDB(local,cloud){
  const out=normalizeDB(local);
  COLLECTIONS.forEach(c=>out[c]=mergeCollection(local[c],cloud[c]));
  if(new Date(cloud.settingsUpdatedAt||0)>new Date(local.settingsUpdatedAt||0)){
    out.settings=normalizeDB(cloud).settings;
    out.settingsUpdatedAt=cloud.settingsUpdatedAt;
  }
  const localCalendarStamp=new Date(local.googleCalendarUpdatedAt||0).getTime();
  const cloudCalendarStamp=new Date(cloud.googleCalendarUpdatedAt||0).getTime();
  if(cloudCalendarStamp>localCalendarStamp){
    out.googleCalendarId=cloud.googleCalendarId||"";
    out.googleCalendarUpdatedAt=cloud.googleCalendarUpdatedAt||"";
  }else{
    out.googleCalendarId=local.googleCalendarId||cloud.googleCalendarId||"";
    out.googleCalendarUpdatedAt=local.googleCalendarUpdatedAt||cloud.googleCalendarUpdatedAt||"";
  }
  out.counters={memberNo:Math.max(local.counters?.memberNo||1,cloud.counters?.memberNo||1)};
  out.updatedAt=now();
  return out;
}
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
          renderDashboardStorage();
          return;
        }
        accessToken=r.access_token||"";
        tokenExpiresAt=Date.now()+Math.max(60,(Number(r.expires_in)||3600)-60)*1000;
        accessTokenHasCalendarScope=false;
        localStorage.setItem(DRIVE_GRANT_KEY,"1");
        startPoll();
        if(tokenWaiter){ tokenWaiter.resolve(accessToken); tokenWaiter=null; }
        $("#lastSync").textContent="Drive verbunden";
        renderDashboardStorage();
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
        renderDashboardStorage();
      }
    });
  }
  return tokenClient;
}

function ensureDriveAccess(){
  if(hasUsableAccessToken())return Promise.resolve(accessToken);
  if(hasUsableCalendarToken()){
    accessToken=calendarAccessToken;
    tokenExpiresAt=calendarTokenExpiresAt;
    accessTokenHasCalendarScope=true;
    localStorage.setItem(DRIVE_GRANT_KEY,"1");
    return Promise.resolve(accessToken);
  }
  accessToken=""; tokenExpiresAt=0;
  if(tokenWaiter)return Promise.reject(new Error("Google Drive-Verbindung wird bereits hergestellt."));
  return new Promise((resolve,reject)=>{
    tokenWaiter={resolve,reject};
    $("#lastSync").textContent=hasKnownDriveGrant()
      ?"Drive-Verbindung wird erneuert …"
      :"Google Drive wird verbunden …";
    renderDashboardStorage();
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


async function driveFetch(url,opt={}){
  const h=new Headers(opt.headers||{});
  h.set("Authorization",`Bearer ${accessToken}`);
  const r=await fetch(url,{...opt,headers:h});
  if(r.status===401){
    accessToken=""; tokenExpiresAt=0;
    clearInterval(window.__vpPoll);
    $("#lastSync").textContent="Drive-Verbindung abgelaufen – erneut synchronisieren";
    renderDashboardStorage();
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
    startPoll();
  }

  if(!silent)$("#lastSync").textContent="Synchronisiere …";
  let f=await findAppData();
  if(!f){
    const id=await createAppData();
    await uploadAppData(id);
    localStorage.setItem("v-planer-last-sync-v1",now());
    $("#lastSync").textContent=`Erster Cloud-Stand · ${new Date().toLocaleTimeString("de-DE")}`;
    renderDashboardStorage();
    return;
  }
  const cloud=normalizeDB(await downloadAppData(f.id));
  const merged=mergeDB(db,cloud);
  db=merged;
  localStorage.setItem(STORAGE_KEY,JSON.stringify(db));
  await uploadAppData(f.id,db);
  renderAll();
  localStorage.setItem("v-planer-last-sync-v1",now());
  $("#lastSync").textContent=`Aktuell · ${new Date().toLocaleTimeString("de-DE")}`;
}

function startPoll(){
  clearInterval(window.__vpPoll);
  window.__vpPoll=setInterval(async()=>{
    if(window.__vpGoogleAutoSyncRunning)return;
    window.__vpGoogleAutoSyncRunning=true;
    try{
      // Drive und Kalender laufen bewusst nacheinander, damit beide denselben lokalen Datenstand sehen.
      if(hasUsableAccessToken())await syncDrive(true).catch(e=>console.warn("Drive-Auto-Sync",e));
      if(db.settings.calendarSyncEnabled===true&&hasUsableCalendarToken())await vp2SyncGoogleCalendarOneWay().catch(e=>console.warn("Kalender-Auto-Sync",e));
      renderDashboardStorage();
    }finally{
      window.__vpGoogleAutoSyncRunning=false;
    }
  },Math.max(15,CFG.AUTO_SYNC_SECONDS||30)*1000);
}

/* =========================================================
   V-Planer 1.5.0–1.7.0
   Globale Suche, allgemeine Verknüpfungen, Papierkorb,
   Mitgliederbeziehungen/Datenaustausch und Mobile Agenda
   ========================================================= */

const LINK_TYPE_META={
  task:{collection:"tasks",label:"Aufgabe",plural:"Aufgaben",icon:"✅",view:"tasks"},
  project:{collection:"projects",label:"Projekt",plural:"Projekte",icon:"📁",view:"projects"},
  event:{collection:"events",label:"Termin",plural:"Termine",icon:"📅",view:"calendar"},
  member:{collection:"members",label:"Mitglied",plural:"Mitglieder",icon:"👤",view:"members"},
  group:{collection:"groups",label:"Gruppe",plural:"Gruppen",icon:"🌳",view:"groups"},
  function:{collection:"functions",label:"Funktion",plural:"Funktionen",icon:"🎖️",view:"groups"},
  fine:{collection:"fines",label:"Strafe",plural:"Strafen",icon:"⚠️",view:"finance-fines"}
};
function linkRecord(type,id,includeDeleted=false){
  const meta=LINK_TYPE_META[type];if(!meta)return null;
  return (db[meta.collection]||[]).find(r=>r.id===id&&(includeDeleted||!r.deletedAt))||null;
}
function linkRecordTitle(type,rec){
  if(!rec)return "Nicht mehr vorhanden";
  if(type==="task")return rec.title||"Aufgabe";
  if(type==="project")return rec.name||"Projekt";
  if(type==="event")return rec.title||"Termin";
  if(type==="member")return memberFullName(rec);
  if(type==="group")return rec.name||"Gruppe";
  if(type==="function")return rec.title||"Funktion";
  if(type==="fine")return rec.reason||"Strafe";
  return rec.title||rec.name||"Eintrag";
}
function linkRecordSubtitle(type,rec){
  if(!rec)return "";
  if(type==="task")return `${rec.due?fmtDate(rec.due):"ohne Fälligkeit"} · ${statusLabel(rec.status)}`;
  if(type==="project")return `${projectDateRangeText(rec)} · ${statusLabel(rec.status)}`;
  if(type==="event")return `${eventDateRangeText(rec)}${eventTimeRangeText(rec)?` · ${eventTimeRangeText(rec)}`:""}`;
  if(type==="member")return `${memberNo(rec)} · ${statusLabel(rec.status)}`;
  if(type==="group")return rec.type||"Gruppe";
  if(type==="function")return `${groupName(rec.groupId)} · ${rec.memberId&&recordById("members",rec.memberId)?memberFullName(recordById("members",rec.memberId)):"nicht besetzt"}`;
  if(type==="fine")return `${fineMemberLabel(rec)} · ${fineMoney(rec.amount)} · ${fineStatusLabel(rec.status)}`;
  return "";
}

/* ---------- Global search ---------- */
const GLOBAL_SEARCH_TYPES=["task","project","event","member","group","function","fine"];
function globalSearchText(type,r){
  if(type==="task")return `${r.title||""} ${r.description||""} ${projectNameAny(r.projectId)} ${groupName(r.groupId)}`;
  if(type==="project")return `${r.name||""} ${r.description||""} ${groupName(r.groupId)}`;
  if(type==="event")return `${r.title||""} ${r.description||""} ${r.location||""} ${groupName(r.groupId)}`;
  if(type==="member")return `${r.firstName||""} ${r.lastName||""} ${r.memberNo||""} ${r.email||""} ${r.phone||""} ${r.address||""}`;
  if(type==="group")return `${r.name||""} ${r.type||""} ${r.description||""}`;
  if(type==="function")return `${r.title||""} ${r.kind||""} ${groupName(r.groupId)} ${r.memberId&&byId("members",r.memberId)?memberFullName(byId("members",r.memberId)):""}`;
  if(type==="fine")return `${fineMemberLabel(r)} ${r.reason||""} ${r.notes||""} ${fineStatusLabel(r.status)}`;
  return linkRecordTitle(type,r);
}
function globalSearch(query){
  const q=String(query||"").trim().toLocaleLowerCase("de-DE");
  if(q.length<2)return [];
  const tokens=q.split(/\s+/).filter(Boolean);
  const results=[];
  GLOBAL_SEARCH_TYPES.forEach(type=>{
    const meta=LINK_TYPE_META[type];
    activeRows(meta.collection).forEach(r=>{
      const hay=globalSearchText(type,r).toLocaleLowerCase("de-DE");
      if(tokens.every(t=>hay.includes(t)))results.push({type,id:r.id,record:r});
    });
  });
  return results;
}
function renderGlobalSearch(){
  const input=$("#globalSearchInput"),box=$("#globalSearchResults"),q=input?.value||"";
  if(!box)return;
  if(String(q).trim().length<2){box.hidden=true;box.innerHTML="";return}
  const rows=globalSearch(q);
  const groups=GLOBAL_SEARCH_TYPES.map(type=>({type,rows:rows.filter(r=>r.type===type).slice(0,6)})).filter(g=>g.rows.length);
  box.innerHTML=groups.length?groups.map(g=>`<div class="global-search-group">
    <div class="global-search-group-title">${esc(LINK_TYPE_META[g.type].plural)}</div>
    ${g.rows.map(x=>`<button class="global-search-hit" type="button" data-global-result="${x.type}" data-global-id="${x.id}">
      <span class="global-search-hit-icon">${LINK_TYPE_META[x.type].icon}</span>
      <span class="global-search-hit-copy"><b>${esc(linkRecordTitle(x.type,x.record))}</b><small>${esc(linkRecordSubtitle(x.type,x.record))}</small></span>
    </button>`).join("")}
  </div>`).join(""):`<div class="global-search-empty">Keine Treffer für „${esc(q)}“.</div>`;
  box.hidden=false;
}
function closeGlobalSearch(){
  $("#globalSearchResults").hidden=true;
  $("#globalSearchWrap")?.classList.remove("mobile-open");
}
function openLinkedRecord(type,id){
  const r=linkRecord(type,id);
  if(!r)return alert("Der Eintrag ist nicht mehr vorhanden.");
  closeGlobalSearch();
  if(type==="task"){go("tasks");openTaskModal(r);return}
  if(type==="project"){if(r.archivedAt)go("archive");else{go("projects");openProjectModal(r)}return}
  if(type==="event"){go("calendar");showEventDetails(r);return}
  if(type==="member"){
    if(r.status==="exited"){go("archive");if($("#archiveSearch"))$("#archiveSearch").value=memberFullName(r);renderArchive();return}
    if($("#memberSearch"))$("#memberSearch").value="";
    if($("#memberStatusFilter"))$("#memberStatusFilter").value="";
    if($("#memberHonoraryFilter"))$("#memberHonoraryFilter").value="";
    go("members");selectedMemberId=r.id;renderMembers();selectedMemberId=r.id;renderMemberDetail();
    setTimeout(()=>$("#memberDetail")?.scrollIntoView({behavior:"smooth",block:"start"}),30);return
  }
  if(type==="group"){go("groups");selectedGroupId=r.id;renderGroups();renderGroupDetail();return}
  if(type==="function"){go("groups");selectedGroupId=r.groupId||"";renderGroups();renderGroupDetail();openFunctionModal(r);return}
  if(type==="fine"){go("finance-fines");openFineModal(r);return}
}
$("#globalSearchInput")?.addEventListener("input",renderGlobalSearch);
$("#globalSearchInput")?.addEventListener("keydown",e=>{if(e.key==="Escape")closeGlobalSearch()});
$("#globalSearchClear")?.addEventListener("click",()=>{$("#globalSearchInput").value="";renderGlobalSearch();$("#globalSearchInput").focus()});
$("#globalSearchMobileBtn")?.addEventListener("click",()=>{
  $("#globalSearchWrap").classList.toggle("mobile-open");
  setTimeout(()=>$("#globalSearchInput")?.focus(),20);
});
$("#globalSearchResults")?.addEventListener("click",e=>{
  const hit=e.target.closest?.("[data-global-result]");
  if(hit)openLinkedRecord(hit.dataset.globalResult,hit.dataset.globalId);
});
document.addEventListener("click",e=>{
  const wrap=$("#globalSearchWrap");
  if(wrap&&!wrap.contains(e.target))$("#globalSearchResults").hidden=true;
});
document.addEventListener("keydown",e=>{
  if((e.ctrlKey||e.metaKey)&&String(e.key).toLowerCase()==="k"){
    e.preventDefault();
    const wrap=$("#globalSearchWrap"),input=$("#globalSearchInput");
    if(window.innerWidth<=760)wrap?.classList.add("mobile-open");
    input?.focus();
    input?.select();
  }
});

/* ---------- Papierkorb ---------- */
const TRASH_META={
  tasks:{label:"Aufgabe",icon:"✅"},projects:{label:"Projekt",icon:"📁"},events:{label:"Termin",icon:"📅"},
  members:{label:"Mitglied",icon:"👤"},groups:{label:"Gruppe",icon:"🌳"},functions:{label:"Funktion",icon:"🎖️"},fines:{label:"Strafe",icon:"⚠️"}
};
function trashRecordTitle(collection,r){
  if(collection==="tasks")return r.title||"Aufgabe";if(collection==="projects")return r.name||"Projekt";if(collection==="events")return r.title||"Termin";
  if(collection==="members")return memberFullName(r);if(collection==="groups")return r.name||"Gruppe";if(collection==="functions")return r.title||"Funktion";
  if(collection==="fines")return `${r.reason||"Strafe"} · ${r.memberNameSnapshot||""}`;return r.title||r.name||"Eintrag";
}
function deletedTrashRows(){
  const rows=[];Object.keys(TRASH_META).forEach(collection=>(db[collection]||[]).filter(r=>r.deletedAt&&!r.purgedAt).forEach(r=>{
    if(r.trashRootType==="project"&&collection!=="projects")return;if(r.trashRootType==="group"&&collection!=="groups")return;rows.push({collection,record:r});
  }));return rows.sort((a,b)=>String(b.record.deletedAt||"").localeCompare(String(a.record.deletedAt||"")));
}
function updateTrashBadge(count=deletedTrashRows().length){[$("#trashNavCount"),$("#mobileTrashCount")].forEach(el=>{if(!el)return;el.textContent=count>99?"99+":String(count||"");el.classList.toggle("has-items",count>0)})}
function renderTrash(){
  const list=$("#trashList");if(!list)return;const all=deletedTrashRows(),q=($("#trashSearch")?.value||"").trim().toLowerCase(),type=$("#trashTypeFilter")?.value||"";
  const rows=all.filter(x=>(!type||x.collection===type)&&(!q||trashRecordTitle(x.collection,x.record).toLowerCase().includes(q)));$("#trashCount").textContent=all.length;updateTrashBadge(all.length);$("#emptyTrashBtn").disabled=!all.length;
  list.innerHTML=rows.length?rows.map(({collection,record})=>{const meta=TRASH_META[collection];return `<div class="trash-row"><span class="trash-row-icon">${meta.icon}</span><div class="trash-row-copy"><b>${esc(trashRecordTitle(collection,record))}</b><small>${esc(meta.label)} · gelöscht ${record.deletedAt?new Date(record.deletedAt).toLocaleString("de-DE"):"—"}</small></div><div class="trash-row-actions"><button class="btn tiny secondary" type="button" data-trash-restore="${collection}" data-trash-id="${record.id}">Wiederherstellen</button><button class="btn tiny danger" type="button" data-trash-purge="${collection}" data-trash-id="${record.id}">Endgültig löschen</button></div></div>`}).join(""):'<div class="card empty">Der Papierkorb ist leer.</div>';
  $$('[data-trash-restore]').forEach(btn=>btn.onclick=()=>restoreTrashRecord(btn.dataset.trashRestore,btn.dataset.trashId));$$('[data-trash-purge]').forEach(btn=>btn.onclick=()=>purgeTrashRecord(btn.dataset.trashPurge,btn.dataset.trashId));
}
function clearDeletedFlag(r){if(!r)return;delete r.deletedAt;delete r.purgedAt;delete r.trashBatchId;delete r.trashRootType;delete r.trashRootId;r.updatedAt=now()}
async function restoreTrashRecord(collection,id){
  const r=(db[collection]||[]).find(x=>x.id===id&&x.deletedAt);if(!r)return;const batch=r.trashBatchId||"",records=[];
  if(batch)COLLECTIONS.forEach(c=>(db[c]||[]).filter(x=>x.deletedAt&&x.trashBatchId===batch).forEach(x=>records.push({collection:c,record:x})));else records.push({collection,record:r});
  records.forEach(x=>clearDeletedFlag(x.record));saveLocal();alert(records.length>1?`${records.length} zusammengehörige Einträge wurden wiederhergestellt.`:"Eintrag wurde wiederhergestellt.");
}
function cleanupBeforePermanentRemoval(collection,r){
  if(collection==="projects"){projectTasks(r.id).forEach(t=>{if(!t.deletedAt){t.projectId="";touch(t)}});allRows("events").filter(e=>e.projectId===r.id).forEach(e=>{e.projectId="";touch(e)})}
  else if(collection==="members"){activeRows("functions").forEach(f=>{if(f.memberId===r.id){f.memberId="";touch(f)}});activeRows("groups").forEach(g=>{if(g.contactMemberId===r.id){g.contactMemberId="";touch(g)}})}
  else if(collection==="groups"){const gid=r.id;activeRows("members").forEach(m=>{if((m.groupIds||[]).includes(gid)){m.groupIds=(m.groupIds||[]).filter(x=>x!==gid);touch(m)}});["tasks","projects","events"].forEach(c=>activeRows(c).forEach(x=>{if(x.groupId===gid){x.groupId="";touch(x)}}));activeRows("functions").forEach(f=>{if(f.groupId===gid){f.groupId="";touch(f)}})}
}
function markRecordPurged(collection,r){if(!r)return;r.purgedAt=now();r.updatedAt=r.purgedAt}
async function purgeTrashRecord(collection,id){
  const r=(db[collection]||[]).find(x=>x.id===id&&x.deletedAt);if(!r)return;const title=trashRecordTitle(collection,r);if(!confirm(`„${title}“ endgültig löschen?\n\nDieser Schritt kann nicht rückgängig gemacht werden.`))return;
  const batch=r.trashBatchId||"",records=[];if(batch)COLLECTIONS.forEach(c=>(db[c]||[]).filter(x=>x.deletedAt&&x.trashBatchId===batch).forEach(x=>records.push({collection:c,record:x})));else records.push({collection,record:r});
  records.forEach(item=>cleanupBeforePermanentRemoval(item.collection,item.record));records.forEach(item=>markRecordPurged(item.collection,item.record));saveLocal();
}
async function purgeAllTrash(){const rows=deletedTrashRows();if(!rows.length)return;if(!confirm(`Papierkorb mit ${rows.length} Einträgen endgültig leeren?\n\nDieser Schritt kann nicht rückgängig gemacht werden.`))return;const deleted=[];Object.keys(TRASH_META).forEach(c=>(db[c]||[]).filter(r=>r.deletedAt&&!r.purgedAt).forEach(r=>deleted.push({collection:c,record:r})));deleted.forEach(item=>cleanupBeforePermanentRemoval(item.collection,item.record));deleted.forEach(item=>markRecordPurged(item.collection,item.record));saveLocal()}
$("#trashSearch")?.addEventListener("input",renderTrash);$("#trashTypeFilter")?.addEventListener("change",renderTrash);$("#emptyTrashBtn")?.addEventListener("click",()=>purgeAllTrash().catch(e=>alert(e.message)));

/* Reversible group deletion: keep associations intact until permanent purge. */
function deleteSelectedGroup(){
  const g=byId("groups",selectedGroupId);if(!g)return;
  const ids=[],walk=id=>{ids.push(id);activeRows("groups").filter(x=>x.parentId===id).forEach(x=>walk(x.id))};walk(g.id);
  const functions=activeRows("functions").filter(f=>ids.includes(f.groupId));
  if(!confirm(`Gruppe „${g.name}“ in den Papierkorb verschieben?\n\n${ids.length-1} Untergruppe${ids.length-1===1?"":"n"} und ${functions.length} Funktion${functions.length===1?"":"en"} werden gemeinsam in den Papierkorb verschoben. Zuordnungen bleiben für eine Wiederherstellung gespeichert.`))return;
  const trashBatchId=`group-${g.id}-${Date.now()}`;
  ids.forEach(id=>markDeleted("groups",id,{trashBatchId,trashRootType:"group",trashRootId:g.id}));
  functions.forEach(f=>markDeleted("functions",f.id,{trashBatchId,trashRootType:"group",trashRootId:g.id}));
  selectedGroupId=null;saveLocal();
}

/* ---------- Calendar Agenda / Smartphone ---------- */
const CALENDAR_DISPLAY_KEY="v-planer-calendar-display-v1";
function calendarDisplayMode(){
  const stored=localStorage.getItem(CALENDAR_DISPLAY_KEY);
  if(stored==="agenda"||stored==="month")return stored;
  return window.innerWidth<=760?"agenda":"month";
}
function setCalendarDisplayMode(mode){
  if(mode!=="agenda"&&mode!=="month")return;
  localStorage.setItem(CALENDAR_DISPLAY_KEY,mode);
  applyCalendarDisplayMode();
}
function applyCalendarDisplayMode(){
  const mode=calendarDisplayMode(),card=$("#view-calendar .calendar-card");
  if(card){card.classList.toggle("is-agenda",mode==="agenda");card.classList.toggle("is-month",mode==="month")}
  $$("[data-calendar-mode]").forEach(btn=>btn.classList.toggle("active",btn.dataset.calendarMode===mode));
}
function agendaItemsForDate(ds){
  const date=new Date(`${ds}T12:00:00`),year=date.getFullYear();
  const items=[];
  activeRows("events").filter(e=>eventOccursOn(e,ds)).forEach(e=>items.push({
    kind:"event",id:e.id,time:eventStartDate(e)===ds?(eventStartTime(e)||""):"",
    title:e.title||"Termin",sub:[event.location,groupName(e.groupId)!=="—"?groupName(e.groupId):""].filter(Boolean).join(" · "),
    icon:"📅",sort:`0-${eventStartTime(e)||"99:99"}`
  }));
  activeRows("tasks").filter(t=>t.due===ds).forEach(t=>items.push({
    kind:"task",id:t.id,time:"",title:t.title||"Aufgabe",sub:`${statusLabel(t.status)} · ${projectNameAny(t.projectId)}`,
    icon:"✓",sort:"1-00"
  }));
  activeRows("projects").filter(p=>projectOccursOn(p,ds)).forEach(p=>items.push({
    kind:"project",id:p.id,time:"",title:p.name||"Projekt",sub:`${statusLabel(p.status)} · ${projectDateRangeText(p)}`,
    icon:"◆",sort:"2-00"
  }));
  activeRows("members").filter(m=>m.status!=="deceased"&&m.birthDate&&recurringDateForYear(m.birthDate,year)===ds).forEach(m=>{
    const age=year-Number(m.birthDate.slice(0,4));
    items.push({kind:"member",id:m.id,time:"",title:memberFullName(m),sub:`${age}. Geburtstag${isRoundBirthdayAge(age)?" · Runder Geburtstag":""}`,icon:isRoundBirthdayAge(age)?"🎉":"🎂",sort:"3-00"});
  });
  if(db.settings.reminders.jubilee){
    activeRows("members").filter(m=>m.status!=="deceased"&&m.entryDate&&recurringDateForYear(m.entryDate,year)===ds).forEach(m=>{
      const years=year-Number(m.entryDate.slice(0,4));
      if(years>0&&isConfiguredJubilee(years))items.push({kind:"member",id:m.id,time:"",title:memberFullName(m),sub:`${years}. Vereinsjubiläum`,icon:"★",sort:"4-00"});
    });
  }
  return items.sort((a,b)=>a.sort.localeCompare(b.sort)||a.title.localeCompare(b.title,"de"));
}
function renderCalendarAgenda(){
  const host=$("#calendarAgenda");if(!host)return;
  const y=calDate.getFullYear(),m=calDate.getMonth(),today=todayStr(),currentMonth=today.startsWith(`${y}-${String(m+1).padStart(2,"0")}`);
  let startDay=currentMonth?Number(today.slice(8,10)):1;
  const monthDays=new Date(y,m+1,0).getDate();
  let dates=[];
  for(let d=startDay;d<=monthDays;d++)dates.push(`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`);
  // In the current month also show the first two weeks ahead so the agenda never ends abruptly.
  if(currentMonth){
    const last=new Date(y,m,monthDays,12);
    for(let i=1;i<=14;i++){const x=new Date(last);x.setDate(x.getDate()+i);dates.push(`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`)}
  }
  const populated=dates.map(ds=>({ds,items:agendaItemsForDate(ds)})).filter(x=>x.items.length);
  host.innerHTML=populated.length?populated.map(day=>{
    const d=new Date(`${day.ds}T12:00:00`),delta=Math.round((d-new Date(`${today}T12:00:00`))/86400000);
    const relative=delta===0?"Heute":delta===1?"Morgen":new Intl.DateTimeFormat("de-DE",{weekday:"long"}).format(d);
    const dateText=new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"long",year:day.ds.slice(0,4)!==today.slice(0,4)?"numeric":undefined}).format(d);
    return `<section class="calendar-agenda-day">
      <div class="calendar-agenda-date"><b>${esc(relative)}</b><span>${esc(dateText)}</span></div>
      <div class="calendar-agenda-items">${day.items.map(item=>`<button class="calendar-agenda-item" type="button" data-agenda-type="${item.kind}" data-agenda-id="${item.id}">
        <span class="calendar-agenda-time">${esc(item.time?`${item.time} Uhr`:"ganztägig")}</span>
        <span class="calendar-agenda-icon">${item.icon}</span>
        <span class="calendar-agenda-copy"><b>${esc(item.title)}</b><small>${esc(item.sub||"")}</small></span>
        <span class="calendar-agenda-kind">${esc(LINK_TYPE_META[item.kind]?.label||"Mitglied")}</span>
      </button>`).join("")}</div>
    </section>`;
  }).join(""):`<div class="calendar-agenda-empty">In diesem Zeitraum gibt es keine Termine, Aufgaben, Projekte oder persönlichen Ereignisse.</div>`;
  $$("[data-agenda-type]").forEach(btn=>btn.onclick=()=>openLinkedRecord(btn.dataset.agendaType,btn.dataset.agendaId));
}
$$("[data-calendar-mode]").forEach(btn=>btn.addEventListener("click",()=>setCalendarDisplayMode(btn.dataset.calendarMode)));
window.addEventListener("resize",()=>{if(!localStorage.getItem(CALENDAR_DISPLAY_KEY))applyCalendarDisplayMode()});


/* ---------- CSV / Excel Import & Export ---------- */
const MEMBER_IO_FIELDS=[
  {key:"memberNo",label:"Mitgliedsnummer",syn:["mitgliedsnummer","mitgliedsnr","mitglied nr","nummer","nr"]},
  {key:"firstName",label:"Vorname",syn:["vorname","firstname","first name"]},
  {key:"lastName",label:"Nachname",syn:["nachname","name","surname","lastname","last name"]},
  {key:"birthDate",label:"Geburtsdatum",syn:["geburtsdatum","geburtstag","birthdate","date of birth"]},
  {key:"status",label:"Status",syn:["status","mitgliedsstatus"]},
  {key:"entryDate",label:"Eintritt",syn:["eintritt","eintrittsdatum","beitritt","joined"]},
  {key:"exitDate",label:"Austritt",syn:["austritt","austrittsdatum","exit"]},
  {key:"email",label:"E-Mail",syn:["e-mail","email","mail"]},
  {key:"phone",label:"Telefon",syn:["telefon","phone","mobil","handy"]},
  {key:"address",label:"Adresse",syn:["adresse","anschrift","address"]},
  {key:"honorary",label:"Ehrenmitglied",syn:["ehrenmitglied","honorary"]},
  {key:"groups",label:"Gruppen",syn:["gruppen","gruppe","abteilung","mannschaft"]},
  {key:"notes",label:"Notizen",syn:["notizen","bemerkung","bemerkungen","notes"]}
];
function normalizeHeader(s){
  return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
}
function guessMemberImportField(header){
  const h=normalizeHeader(header);
  const exact=MEMBER_IO_FIELDS.find(f=>f.syn.some(s=>normalizeHeader(s)===h));
  if(exact)return exact.key;
  const partial=MEMBER_IO_FIELDS.find(f=>f.syn.some(s=>h.includes(normalizeHeader(s))||normalizeHeader(s).includes(h)));
  return partial?.key||"";
}
function detectCsvDelimiter(text){
  const first=String(text||"").split(/\r?\n/).slice(0,3).join("\n");
  const counts={";":0,",":0,"\t":0};let quote=false;
  for(const c of first){if(c==='"')quote=!quote;else if(!quote&&Object.prototype.hasOwnProperty.call(counts,c))counts[c]++}
  return Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0];
}
function parseCsvText(text){
  const delimiter=detectCsvDelimiter(text),rows=[];let row=[],cell="",quote=false;
  const src=String(text||"").replace(/^\uFEFF/,"");
  for(let i=0;i<src.length;i++){
    const c=src[i];
    if(quote){
      if(c==='"'&&src[i+1]==='"'){cell+='"';i++}
      else if(c==='"')quote=false;
      else cell+=c;
    }else{
      if(c==='"')quote=true;
      else if(c===delimiter){row.push(cell);cell=""}
      else if(c==="\n"){row.push(cell.replace(/\r$/,""));rows.push(row);row=[];cell=""}
      else cell+=c;
    }
  }
  if(cell||row.length){row.push(cell.replace(/\r$/,""));rows.push(row)}
  const clean=rows.filter(r=>r.some(x=>String(x).trim()!==""));
  if(!clean.length)return {headers:[],rows:[]};
  const headers=clean[0].map((x,i)=>String(x||"").trim()||`Spalte ${i+1}`);
  return {headers,rows:clean.slice(1)};
}
function zipColumnIndex(ref){
  const letters=String(ref||"").match(/^[A-Z]+/i)?.[0]?.toUpperCase()||"A";
  let n=0;for(const c of letters)n=n*26+(c.charCodeAt(0)-64);return n-1;
}
async function unzipXlsxEntries(buffer){
  const bytes=new Uint8Array(buffer),view=new DataView(buffer);
  let eocd=-1;
  for(let i=bytes.length-22;i>=Math.max(0,bytes.length-66000);i--){if(view.getUint32(i,true)===0x06054b50){eocd=i;break}}
  if(eocd<0)throw new Error("Die Excel-Datei besitzt keine gültige ZIP-Struktur.");
  const count=view.getUint16(eocd+10,true),centralOffset=view.getUint32(eocd+16,true),decoder=new TextDecoder("utf-8"),entries=new Map();
  let p=centralOffset;
  for(let i=0;i<count;i++){
    if(view.getUint32(p,true)!==0x02014b50)throw new Error("Excel-ZIP-Verzeichnis konnte nicht gelesen werden.");
    const method=view.getUint16(p+10,true),compressedSize=view.getUint32(p+20,true),
          nameLen=view.getUint16(p+28,true),extraLen=view.getUint16(p+30,true),commentLen=view.getUint16(p+32,true),
          localOffset=view.getUint32(p+42,true),name=decoder.decode(bytes.slice(p+46,p+46+nameLen));
    const localNameLen=view.getUint16(localOffset+26,true),localExtraLen=view.getUint16(localOffset+28,true),
          dataStart=localOffset+30+localNameLen+localExtraLen,compressed=bytes.slice(dataStart,dataStart+compressedSize);
    let data;
    if(method===0)data=compressed;
    else if(method===8){
      if(typeof DecompressionStream==="undefined")throw new Error("Dieser Browser unterstützt das Entpacken von Excel-Dateien nicht. Bitte CSV verwenden oder den Browser aktualisieren.");
      const stream=new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      data=new Uint8Array(await new Response(stream).arrayBuffer());
    }else throw new Error(`Nicht unterstützte Excel-Komprimierung (${method}).`);
    entries.set(name,data);
    p+=46+nameLen+extraLen+commentLen;
  }
  return entries;
}
function zipEntryText(entries,name){const b=entries.get(name);return b?new TextDecoder("utf-8").decode(b):""}
async function parseXlsxFile(file){
  const entries=await unzipXlsxEntries(await file.arrayBuffer()),parser=new DOMParser();
  const workbookText=zipEntryText(entries,"xl/workbook.xml");
  if(!workbookText)throw new Error("Die Excel-Arbeitsmappe enthält keine workbook.xml.");
  const workbook=parser.parseFromString(workbookText,"application/xml"),
        firstSheet=workbook.getElementsByTagNameNS("*","sheet")[0];
  if(!firstSheet)throw new Error("Die Excel-Datei enthält kein Tabellenblatt.");
  const relId=firstSheet.getAttribute("r:id")||firstSheet.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships","id");
  const rels=parser.parseFromString(zipEntryText(entries,"xl/_rels/workbook.xml.rels"),"application/xml");
  let target="";
  [...rels.getElementsByTagNameNS("*","Relationship")].forEach(rel=>{if(rel.getAttribute("Id")===relId)target=rel.getAttribute("Target")||""});
  target=target.replace(/^\/+/,"");
  const sheetPath=target.startsWith("xl/")?target:`xl/${target}`;
  const sheetText=zipEntryText(entries,sheetPath);
  if(!sheetText)throw new Error("Das erste Tabellenblatt konnte nicht gelesen werden.");
  const sharedText=zipEntryText(entries,"xl/sharedStrings.xml"),shared=[];
  if(sharedText){
    const sharedDoc=parser.parseFromString(sharedText,"application/xml");
    [...sharedDoc.getElementsByTagNameNS("*","si")].forEach(si=>shared.push([...si.getElementsByTagNameNS("*","t")].map(t=>t.textContent||"").join("")));
  }
  const doc=parser.parseFromString(sheetText,"application/xml"),matrix=[];let maxCol=0;
  [...doc.getElementsByTagNameNS("*","row")].forEach((rowEl,rowIndex)=>{
    const row=[];
    [...rowEl.getElementsByTagNameNS("*","c")].forEach(c=>{
      const col=zipColumnIndex(c.getAttribute("r")),type=c.getAttribute("t")||"",v=c.getElementsByTagNameNS("*","v")[0]?.textContent||"";
      let value=v;
      if(type==="s")value=shared[Number(v)]??"";
      else if(type==="inlineStr")value=[...c.getElementsByTagNameNS("*","t")].map(t=>t.textContent||"").join("");
      else if(type==="b")value=v==="1"?"Ja":"Nein";
      row[col]=value;maxCol=Math.max(maxCol,col);
    });
    matrix[rowIndex]=row;
  });
  const normalized=matrix.map(r=>Array.from({length:maxCol+1},(_,i)=>r?.[i]??"")).filter(r=>r.some(v=>String(v).trim()!==""));
  if(!normalized.length)return {headers:[],rows:[]};
  return {headers:normalized[0].map((x,i)=>String(x||"").trim()||`Spalte ${i+1}`),rows:normalized.slice(1)};
}
async function parseMemberImportFile(file){
  if(/\.xlsx$/i.test(file.name)||file.type.includes("spreadsheetml"))return parseXlsxFile(file);
  return parseCsvText(await file.text());
}
function normalizeImportDate(value){
  const s=String(value??"").trim();if(!s)return "";
  if(/^\d{5}(?:\.\d+)?$/.test(s)){
    const serial=Number(s),ms=Date.UTC(1899,11,30)+Math.round(serial*86400000),d=new Date(ms);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}`;
  }
  let m=s.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/);
  if(m)return `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;
  m=s.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/);
  if(m)return `${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`;
  return s;
}
function normalizeImportStatus(value){
  const s=normalizeHeader(value);
  if(["inaktiv","deaktiviert","inactive"].includes(s))return "inactive";
  if(["passiv","passive"].includes(s))return "passive";
  if(["verstorben","deceased"].includes(s))return "deceased";
  return "active";
}
function importBoolean(value){
  const s=normalizeHeader(value);return ["ja","yes","true","1","x","j"].includes(s);
}
function groupIdsFromImport(value){
  const names=String(value||"").split(/[;,|]+/).map(x=>x.trim()).filter(Boolean);
  const groups=activeRows("groups");
  return names.map(n=>groups.find(g=>String(g.name||"").trim().toLocaleLowerCase("de-DE")===n.toLocaleLowerCase("de-DE"))?.id).filter(Boolean);
}
function memberImportTargetOptions(selected=""){
  return `<option value="">Nicht importieren</option>`+MEMBER_IO_FIELDS.map(f=>`<option value="${f.key}" ${f.key===selected?"selected":""}>${esc(f.label)}</option>`).join("");
}
function memberImportPreviewHTML(data){
  const preview=data.rows.slice(0,5);
  return `<div class="member-import-preview"><table><thead><tr>${data.headers.map(h=>`<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${preview.map(row=>`<tr>${data.headers.map((_,i)=>`<td>${esc(row[i]??"")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}
async function startMemberImport(file){
  const data=await parseMemberImportFile(file);
  if(!data.headers.length||!data.rows.length)throw new Error("Die Datei enthält keine importierbaren Mitgliedsdaten.");
  const dlg=$("#detailModal");
  $("#detailTitle").textContent=`Mitglieder importieren · ${file.name}`;
  $("#detailBody").innerHTML=`<div>
    <div class="member-io-intro">${data.rows.length} Datenzeile${data.rows.length===1?"":"n"} erkannt. Ordne die Spalten den V-Planer-Feldern zu. Vor dem Import wird automatisch ein Sicherheitsbackup erstellt.</div>
    <div class="member-import-mapping">${data.headers.map((h,i)=>`<div class="member-import-map-row"><span><b>${esc(h)}</b></span><select data-member-import-map="${i}">${memberImportTargetOptions(guessMemberImportField(h))}</select></div>`).join("")}</div>
    <div class="switch-row"><div><b>Bestehende Mitglieder aktualisieren</b><small>Erkennung über Mitgliedsnummer, sonst Name + Geburtsdatum. Leere Importwerte überschreiben keine bestehenden Daten.</small></div><label class="switch"><input id="memberImportUpdateExisting" type="checkbox"><span></span></label></div>
    ${memberImportPreviewHTML(data)}
    <div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn primary" id="memberImportRun" type="button">Import starten</button></div>
  </div>`;
  dlg.showModal();
  $("#memberImportRun").onclick=()=>runMemberImport(data,!!$("#memberImportUpdateExisting").checked,dlg);
}
function findImportDuplicate(obj){
  const no=String(obj.memberNo||"").trim();
  if(no){const m=activeRows("members").find(x=>memberNoKey(x.memberNo)===memberNoKey(no));if(m)return m}
  const key=`${normalizeHeader(obj.firstName)}|${normalizeHeader(obj.lastName)}|${normalizeImportDate(obj.birthDate)}`;
  if(!obj.firstName&&!obj.lastName)return null;
  return activeRows("members").find(m=>`${normalizeHeader(m.firstName)}|${normalizeHeader(m.lastName)}|${m.birthDate||""}`===key)||null;
}
function buildImportObject(row,mapping){
  const obj={};
  mapping.forEach(({col,key})=>{if(key)obj[key]=row[col]??""});
  return obj;
}
async function runMemberImport(data,updateExisting,dlg){
  const mapping=$$("[data-member-import-map]").map(s=>({col:Number(s.dataset.memberImportMap),key:s.value})).filter(x=>x.key);
  if(!mapping.some(x=>x.key==="firstName"||x.key==="lastName"))return alert("Bitte mindestens Vorname oder Nachname zuordnen.");
  exportFullBackup("V-Planer_Vor_Mitgliederimport");
  let added=0,updated=0,skipped=0,errors=0;
  for(const row of data.rows){
    try{
      const raw=buildImportObject(row,mapping),first=String(raw.firstName||"").trim(),last=String(raw.lastName||"").trim();
      if(!first&&!last){skipped++;continue}
      const parsed={
        memberNo:String(raw.memberNo||"").trim(),
        firstName:first,lastName:last,
        birthDate:normalizeImportDate(raw.birthDate),
        status:normalizeImportStatus(raw.status),
        entryDate:normalizeImportDate(raw.entryDate),
        exitDate:normalizeImportDate(raw.exitDate),
        email:String(raw.email||"").trim(),phone:String(raw.phone||"").trim(),address:String(raw.address||"").trim(),
        honorary:importBoolean(raw.honorary),groupIds:groupIdsFromImport(raw.groups),
        notes:String(raw.notes||"").trim()
      };
      const duplicate=findImportDuplicate(parsed);
      if(duplicate&&!updateExisting){skipped++;continue}
      if(duplicate){
        const assign={};
        ["firstName","lastName","birthDate","entryDate","exitDate","email","phone","address","notes"].forEach(k=>{if(parsed[k]!==""&&parsed[k]!=null)assign[k]=parsed[k]});
        if(raw.status!==undefined&&String(raw.status).trim()!=="")assign.status=parsed.status;
        if(raw.honorary!==undefined&&String(raw.honorary).trim()!=="")assign.honorary=parsed.honorary;
        if(raw.groups!==undefined&&String(raw.groups).trim()!=="")assign.groupIds=parsed.groupIds;
        Object.assign(duplicate,assign);touch(duplicate);updated++;continue;
      }
      let memberNoValue=parsed.memberNo;
      if(!memberNoValue||!memberNoAvailable(memberNoValue))memberNoValue=nextAvailableMemberNo();
      db.members.push({
        id:uid(),memberNo:memberNoValue,firstName:parsed.firstName,lastName:parsed.lastName,birthDate:parsed.birthDate,
        status:parsed.status||"active",entryDate:parsed.entryDate||todayStr(),exitDate:parsed.exitDate||"",reentryDate:"",cancelDate:"",deceasedDate:"",
        honorary:parsed.honorary,email:parsed.email,phone:parsed.phone,address:parsed.address,emergencyName:"",emergencyPhone:"",guardian:"",
        groupIds:parsed.groupIds,photoData:"",extraFields:[],history:[],statusHistory:[],honors:[],notes:parsed.notes,
        createdAt:now(),updatedAt:now()
      });added++;
    }catch(e){console.warn("Mitgliederimport:",e);errors++}
  }
  db.counters.memberNo=Number(nextAvailableMemberNo())||1;
  dlg.close();saveLocal();
  alert(`Mitgliederimport abgeschlossen.\n\nNeu: ${added}\nAktualisiert: ${updated}\nÜbersprungen: ${skipped}${errors?`\nFehler: ${errors}`:""}`);
}
$("#memberImportBtn")?.addEventListener("click",()=>$("#memberImportInput").click());
$("#memberImportInput")?.addEventListener("change",async()=>{
  const input=$("#memberImportInput"),file=input.files?.[0];if(!file)return;
  try{await startMemberImport(file)}catch(e){alert(`Import nicht möglich:\n${e.message}`)}
  finally{input.value=""}
});

function currentFilteredMembersForExport(){
  const q=($("#memberSearch")?.value||"").toLowerCase(),f=$("#memberStatusFilter")?.value||"",hf=$("#memberHonoraryFilter")?.value||"";
  return activeRows("members").filter(m=>m.status!=="exited").filter(m=>
    (!q||`${m.firstName} ${m.lastName} ${m.memberNo}`.toLowerCase().includes(q))&&
    (!f||m.status===f)&&(!hf||(hf==="yes"?!!m.honorary:!m.honorary))
  );
}
const MEMBER_EXPORT_FIELDS=[
  ["memberNo","Mitgliedsnummer"],["firstName","Vorname"],["lastName","Nachname"],["birthDate","Geburtsdatum"],["status","Status"],
  ["entryDate","Eintritt"],["exitDate","Austritt"],["email","E-Mail"],["phone","Telefon"],["address","Adresse"],["honorary","Ehrenmitglied"],
  ["groups","Gruppen"],["notes","Notizen"]
];
function memberExportValue(m,key){
  if(key==="status")return statusLabel(m.status);
  if(key==="honorary")return m.honorary?"Ja":"Nein";
  if(key==="groups")return effectiveGroupIdsForMember(m).map(groupName).filter(x=>x!=="—").join("; ");
  return m[key]??"";
}
function csvEscape(value){
  let s=String(value??"");
  if(/^[=+@-]/.test(s))s="'"+s;
  return /[;"\r\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;
}
function exportMembersCsv(rows,fields){
  const lines=[fields.map(f=>csvEscape(f[1])).join(";"),...rows.map(m=>fields.map(f=>csvEscape(memberExportValue(m,f[0]))).join(";"))];
  saveBrowserBlob(new Blob(["\uFEFF"+lines.join("\r\n")],{type:"text/csv;charset=utf-8"}),`V-Planer_Mitglieder_${todayStr()}.csv`);
}
function xmlEscape(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"}[c]))}
function xlsxColName(index){let n=index+1,s="";while(n){const r=(n-1)%26;s=String.fromCharCode(65+r)+s;n=Math.floor((n-1)/26)}return s}
function textBytes(s){return new TextEncoder().encode(String(s))}
function exportMembersXlsx(rows,fields){
  const allRows=[fields.map(f=>f[1]),...rows.map(m=>fields.map(f=>memberExportValue(m,f[0])))];
  const sheetRows=allRows.map((row,ri)=>`<row r="${ri+1}">${row.map((v,ci)=>`<c r="${xlsxColName(ci)}${ri+1}" t="inlineStr"${ri===0?' s="1"':""}><is><t xml:space="preserve">${xmlEscape(v)}</t></is></c>`).join("")}</row>`).join("");
  const cols=`<cols>${fields.map((f,ci)=>`<col min="${ci+1}" max="${ci+1}" width="${["address","notes"].includes(f[0])?32:["email","groups"].includes(f[0])?24:18}" customWidth="1"/>`).join("")}</cols>`;
  const sheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>${cols}<sheetData>${sheetRows}</sheetData></worksheet>`;
  const entries=[
    {name:"[Content_Types].xml",data:textBytes(`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`)},
    {name:"_rels/.rels",data:textBytes(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`)},
    {name:"xl/workbook.xml",data:textBytes(`<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Mitglieder" sheetId="1" r:id="rId1"/></sheets></workbook>`)},
    {name:"xl/_rels/workbook.xml.rels",data:textBytes(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`)},
    {name:"xl/styles.xml",data:textBytes(`<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><color rgb="FF123B62"/><sz val="11"/><name val="Calibri"/><family val="2"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDDEBF7"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`)},
    {name:"xl/worksheets/sheet1.xml",data:textBytes(sheet)}
  ];
  saveBrowserBlob(buildStoreZip(entries),`V-Planer_Mitglieder_${todayStr()}.xlsx`);
}
function openMemberExport(){
  const dlg=$("#detailModal");
  $("#detailTitle").textContent="Mitglieder exportieren";
  $("#detailBody").innerHTML=`<div>
    <div class="member-io-intro">Exportiere die Mitgliederliste als CSV oder echte Excel-Datei (.xlsx). Felder und Datenumfang können ausgewählt werden.</div>
    <div class="form-grid">
      <label>Format<select id="memberExportFormat"><option value="xlsx">Excel (.xlsx)</option><option value="csv">CSV (.csv)</option></select></label>
      <label>Umfang<select id="memberExportScope"><option value="all">Alle Mitglieder der Übersicht</option><option value="filtered">Aktuelle Filter/Suche</option></select></label>
      <div class="form-section">Felder</div>
      <div class="member-export-fields full">${MEMBER_EXPORT_FIELDS.map(([key,label])=>`<label class="member-export-field"><input type="checkbox" data-member-export-field="${key}" checked> ${esc(label)}</label>`).join("")}</div>
    </div>
    <div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn primary" id="memberExportRun" type="button">Exportieren</button></div>
  </div>`;
  dlg.showModal();
  $("#memberExportRun").onclick=()=>{
    const selectedKeys=new Set($$("[data-member-export-field]:checked").map(x=>x.dataset.memberExportField));
    const fields=MEMBER_EXPORT_FIELDS.filter(f=>selectedKeys.has(f[0]));
    if(!fields.length)return alert("Bitte mindestens ein Feld auswählen.");
    const rows=$("#memberExportScope").value==="filtered"?currentFilteredMembersForExport():activeRows("members").filter(m=>m.status!=="exited");
    if(!rows.length)return alert("Für den gewählten Umfang gibt es keine Mitglieder.");
    if($("#memberExportFormat").value==="csv")exportMembersCsv(rows,fields);else exportMembersXlsx(rows,fields);
    dlg.close();
  };
}
$("#memberExportBtn")?.addEventListener("click",openMemberExport);

/* =========================================================
   V-PLANER 2.2.0 CLEAN CORE
   Current production model. Obsolete document, meeting, knowledge,
   household and generic-link subsystems have been removed.
   ========================================================= */
const VP2_VERSION="2.2.0";
const VP2_TASK_VIEW_KEY="v-planer-task-view-v2";
const VP2_CAL_VIEW_KEY="v-planer-calendar-view-v2";
let vp2YearFilter="";
let vp2CalendarMode="month";

function vp2Migrate(){
  db.version=Math.max(Number(db.version)||0,10);
  db.financeSnapshots=Array.isArray(db.financeSnapshots)?db.financeSnapshots:[];
  db.settings.yearNotes=db.settings.yearNotes&&typeof db.settings.yearNotes==="object"?db.settings.yearNotes:{};
  db.settings.taskDefaultView=["list","kanban"].includes(db.settings.taskDefaultView)?db.settings.taskDefaultView:"list";
  db.settings.calendarDefaultView=["month","week","day","list"].includes(db.settings.calendarDefaultView)?db.settings.calendarDefaultView:"month";
  db.settings.appearance=["system","light","dark"].includes(db.settings.appearance)?db.settings.appearance:"system";
  if(typeof db.settings.calendarSyncEnabled!=="boolean")db.settings.calendarSyncEnabled=false;
  saveCalendarPrefs({enabled:db.settings.calendarSyncEnabled===true});
  (db.tasks||[]).forEach(t=>{if(t.status==="wait")t.status="open"});
  (db.projects||[]).forEach(p=>{if(p.status==="paused")p.status="active"; if(p.status==="closed"&&!p.completedAt)p.completedAt=p.updatedAt||now()});
  (db.members||[]).forEach(m=>{if(m.status==="inactive")m.status="exited"});
  localStorage.setItem(STORAGE_KEY,JSON.stringify(db));
}
vp2Migrate();

statusLabel=function(s){return({open:"Offen",doing:"In Bearbeitung",done:"Erledigt",planned:"Geplant",active:"Aktiv",closed:"Abgeschlossen",exited:"Ausgetreten",passive:"Passiv",deceased:"Verstorben"})[s]||s};
statusBadge=function(s){const cls=s==="done"||s==="active"||s==="closed"?"ok":s==="deceased"||s==="exited"?"gray":"low";return `<span class="badge ${cls}">${esc(statusLabel(s))}</span>`};
groupName=function(id){if(!id)return "Gesamtverein";return recordById("groups",id)?.name||"—"};
function vp2CurrentGroups(){return activeRows("groups").filter(g=>!g.inactiveAt)}
groupOptions=function(selected="",excludeId=""){
  const rows=vp2CurrentGroups().filter(g=>g.id!==excludeId);
  const current=selected?recordById("groups",selected):null;
  let html='<option value="">Gesamtverein</option>';
  if(current&&!rows.some(g=>g.id===current.id))html+=`<option value="${esc(current.id)}" selected>${esc(current.name)} · inaktiv</option>`;
  return html+rows.map(g=>`<option value="${g.id}" ${g.id===selected?"selected":""}>${esc(g.name)}</option>`).join("");
};
projectOptions=function(selected=""){
  const rows=activeRows("projects").filter(p=>["planned","active"].includes(p.status));
  const current=selected?recordById("projects",selected):null;
  let html='<option value="">Kein Projekt</option>';
  if(current&&!rows.some(p=>p.id===current.id))html+=`<option value="${esc(current.id)}" selected>${esc(current.name)} · ${esc(statusLabel(current.status))}</option>`;
  return html+rows.map(p=>`<option value="${p.id}" ${p.id===selected?"selected":""}>${esc(p.name)}</option>`).join("");
};
pageMeta=function(view){return({dashboard:["Übersicht","Heute, diese Woche und alles Wichtige im Blick."],tasks:["Aufgaben","Liste und Kanban greifen auf dieselben Aufgaben zu."],projects:["Projekte","Vorhaben mit Aufgaben, Terminen und Notizen organisieren."],calendar:["Kalender",""],year:["Vereinsjahr","Automatische Jahresübersicht aus Kalender, Projekten und Mitgliederdaten."],archive:["Archiv","Archivierte Projekte, erledigte Aufgaben und ausgetretene Mitglieder."],"finance-kasse":["Finanzen",""],"finance-fines":["Strafen","Strafen und Zahlungen der Vereinsmitglieder verwalten."],members:["Mitglieder","Zentrale Stammdatenquelle für Mitglieder, Geburtstage und Jubiläen."],groups:["Gruppen & Funktionen","Organisatorische Zugehörigkeit und zeitlich dokumentierte Rollen."],trash:["Papierkorb","Gelöschte Inhalte wiederherstellen oder endgültig entfernen."],settings:["Einstellungen","Globale Einstellungen für Anwendung, Verein, Darstellung und Sicherung."]})[view]||[view,""]};

const vp2LegacyGo=go;
go=function(view){
  if(view==="kanban")view="tasks";
  vp2LegacyGo(view);
  if(view==="tasks")vp2ApplyTaskView();
};
applyModuleVisibility=function(){$$('[data-module="club"]').forEach(el=>el.classList.remove("module-hidden"));$$('[data-module="finance"]').forEach(el=>el.classList.remove("module-hidden"));};

function vp2MemberCurrent(m){return m&&!["exited","deceased"].includes(m.status)}
upcomingBirthdays=function(maxDays=7){return activeRows("members").filter(m=>vp2MemberCurrent(m)&&m.birthDate).map(m=>({...m,_days:daysToBirthday(m)})).filter(m=>m._days>=0&&m._days<=maxDays).sort((a,b)=>a._days-b._days)};
upcomingRoundBirthdays=function(maxDays=30){return upcomingBirthdays(maxDays).map(m=>{const info=nextRecurringInfo(m.birthDate);const age=info?info.year-Number(m.birthDate.slice(0,4)):0;return {...m,_kind:"birthday",_date:info?.date||"",_age:age,_roundBirthday:isRoundBirthdayAge(age)}}).filter(m=>m._roundBirthday)};
upcomingJubilees=function(maxDays=365){
  const ref=new Date();
  return activeRows("members").filter(m=>vp2MemberCurrent(m)&&m.entryDate).map(m=>{
    const info=nextRecurringInfo(m.entryDate,ref); if(!info)return null;
    const years=info.year-Number(m.entryDate.slice(0,4));
    return {...m,_kind:"jubilee",_date:info.date,_days:info.days,_years:years};
  }).filter(Boolean).filter(m=>m._days>=0&&m._days<=maxDays&&m._years>0&&isConfiguredJubilee(m._years)).sort((a,b)=>a._days-b._days);
};

renderDashboardStorage=function(){
  const host=$("#dashboardStorage");if(!host)return;
  const calendarEnabled=db.settings.calendarSyncEnabled===true;
  const drive=hasUsableAccessToken()?"✓ Verbunden":hasKnownDriveGrant()?"Bereit":"Nicht verbunden";
  const driveLast=localStorage.getItem("v-planer-last-sync-v1")||db.lastSync||"";
  const lines=$("#dashboardSyncLines");
  let html=`<div class="sync-service-row"><b>Google Drive</b><span>${esc(drive)}</span><small>${driveLast?`Zuletzt: ${new Date(driveLast).toLocaleString("de-DE")}`:"Noch nicht synchronisiert"}</small></div>`;
  let calLast="";
  if(calendarEnabled){
    const cal=hasUsableCalendarToken()?"✓ Verbunden":hasKnownCalendarGrant()?"Bereit":"Nicht verbunden";
    calLast=localStorage.getItem("v-planer-calendar-last-sync-v1")||"";
    html+=`<div class="sync-service-row"><b>Google Kalender</b><span>${esc(cal)}</span><small>${calLast?`Zuletzt: ${new Date(calLast).toLocaleString("de-DE")}`:"Noch nicht synchronisiert"}</small></div>`;
  }
  if(lines)lines.innerHTML=html;
  const connected=calendarEnabled?hasUsableAccessToken()&&hasUsableCalendarToken():hasUsableAccessToken();
  const known=calendarEnabled?(hasKnownDriveGrant()||hasKnownCalendarGrant()):hasKnownDriveGrant();
  $("#driveState").textContent=connected?"● Google verbunden":known?"● Google bereit":"● Nur lokal";
  $("#driveState").style.color=connected?"#2f9628":known?"#075aa8":"#667085";
  const last=[driveLast,calendarEnabled?calLast:""].filter(Boolean).sort().pop();
  $("#lastSync").textContent=last?`Letzte Synchronisierung ${new Date(last).toLocaleString("de-DE")}`:"Noch nicht synchronisiert";
  const button=$("#dashboardSyncBtn");if(button&&!button.disabled)button.textContent=calendarEnabled?"↻ Alles synchronisieren":"↻ Google Drive synchronisieren";
};

renderDashboard=function(){
  const tasks=activeRows("tasks"),projects=activeRows("projects"),members=activeRows("members");
  const open=tasks.filter(t=>t.status!=="done");
  const today=open.filter(t=>t.due===todayStr()).length;
  const week=open.filter(t=>{const d=daysUntil(t.due);return d!==null&&d>=0&&d<=7}).length;
  $("#metricOpenTasks").textContent=open.length;$("#metricTaskHint").textContent=`Heute ${today} · Woche ${week}`;
  const activeProjects=projects.filter(p=>p.status==="active");
  $("#metricProjects").textContent=activeProjects.length;$("#metricProjectHint").textContent=`${activeProjects.filter(p=>projectStartDate(p)).length} mit Zeitraum`;
  const clubMembers=members.filter(m=>m.status!=="exited");
  $("#metricMembers").textContent=clubMembers.length;$("#metricMemberHint").textContent=`davon ${clubMembers.filter(m=>m.status==="active").length} aktiv`;

  const alertItems=[];
  const overdueTasks=open.filter(t=>daysUntil(t.due)<0);
  if(overdueTasks.length){
    const key=`summary:overdue:${overdueTasks.map(t=>`${t.id}:${t.due||""}`).sort().join("|")}`;
    if(!dashboardNoticeDismissed(key))alertItems.push({icon:"⚠",text:`${overdueTasks.length} überfällige Aufgabe${overdueTasks.length===1?"":"n"}`,dismissKey:key,until:"9999-12-31"});
  }
  const endingProjects=activeProjects.filter(p=>{const d=daysUntil(projectEndDate(p));return d!==null&&d>=0&&d<=db.settings.reminders.alarmDays});
  if(endingProjects.length){
    const key=`summary:project-ending:${endingProjects.map(p=>`${p.id}:${projectEndDate(p)||""}`).sort().join("|")}`;
    const until=endingProjects.map(p=>projectEndDate(p)).filter(Boolean).sort().pop()||todayStr();
    if(!dashboardNoticeDismissed(key))alertItems.push({icon:"◆",text:`${endingProjects.length} aktive${endingProjects.length===1?"s Projekt":" Projekte"} kurz vor dem Projektende`,dismissKey:key,until});
  }
  upcomingRoundBirthdays(30).forEach(item=>{const key=personalDashboardDismissKey(item);if(!dashboardNoticeDismissed(key))alertItems.push({icon:"🎉",text:`${memberFullName(item)} wird ${item._age} Jahre`,dismissKey:key,until:item._date})});
  upcomingJubilees(30).forEach(item=>{const key=personalDashboardDismissKey(item);if(!dashboardNoticeDismissed(key))alertItems.push({icon:"★",text:`${memberFullName(item)}: ${item._years} Jahre Vereinszugehörigkeit`,dismissKey:key,until:item._date})});
  const alertStrip=$("#alertStrip"); alertStrip.classList.toggle("hidden",!alertItems.length); alertStrip.innerHTML=dashboardAlertHTML(alertItems);
  $$('[data-dismiss-dashboard-alert]').forEach(btn=>btn.onclick=e=>{e.stopPropagation();dismissDashboardNotice(btn.dataset.dismissDashboardAlert,btn.dataset.dismissUntil)});

  const list=open.slice().sort((a,b)=>(a.due||"9999").localeCompare(b.due||"9999")).slice(0,8);
  $("#dashboardTasks").innerHTML=list.length?list.map(t=>`<div class="mini-row"><input type="checkbox" data-finish-task="${t.id}" aria-label="Aufgabe erledigen"><div><div class="mini-title">${esc(t.title)}</div><div class="mini-meta">${esc(projectName(t.projectId))} · ${esc(groupName(t.groupId))}</div></div><span class="badge ${reminderClass(t.due)}">${esc(dueText(t.due))}</span></div>`).join(""):`<div class="empty">Keine offenen Aufgaben.</div>`;
  $$('[data-finish-task]').forEach(el=>el.onchange=()=>{const t=byId("tasks",el.dataset.finishTask);if(t){t.status="done";touch(t);saveLocal()}});

  $("#dashboardProjects").innerHTML=activeProjects.length?activeProjects.slice().sort(vp214CompareProjectsByDue).slice(0,3).map(p=>{const st=projectTaskStats(p.id),end=projectEndDate(p),group=groupName(p.groupId),dateText=end?`Ende ${fmtDate(end)}`:projectDateRangeText(p),taskText=st.total?`${st.done} von ${st.total} Aufgaben erledigt`:"Keine Aufgaben vorhanden";return `<button class="dashboard-project-row" type="button" data-dashboard-project="${p.id}"><div class="dashboard-project-title-row"><div class="dashboard-project-title">${esc(p.name)}</div><span class="project-days dashboard-project-days ${projectDayClass(end)}">${end?esc(dueText(end)):"ohne Zeitraum"}</span></div><div class="dashboard-project-meta">${esc(group)}${dateText?` · ${esc(dateText)}`:""}</div><div class="dashboard-project-task-state">${esc(taskText)}</div>${st.total?`<div class="progress dashboard-project-progress"><span style="width:${st.progress}%"></span></div>`:""}</button>`}).join(""):`<div class="empty">Keine aktiven Projekte.</div>`;
  $$('[data-dashboard-project]').forEach(btn=>btn.onclick=()=>{const p=byId("projects",btn.dataset.dashboardProject);if(p){go("projects");showProjectDetails(p)}});

  const personal=[...upcomingBirthdays(60).map(m=>{const info=nextRecurringInfo(m.birthDate);return {...m,_kind:"birthday",_date:info.date,_days:info.days,_age:info.year-Number(m.birthDate.slice(0,4))}}),...upcomingJubilees(365)].sort((a,b)=>a._days-b._days).slice(0,10);
  $("#dashboardBirthdays").innerHTML=personal.length?personal.map(item=>`<button type="button" class="birthday-row personal-event-open" data-dashboard-member="${item.id}"><span class="person-dot">${item._kind==="jubilee"?"★":"🎂"}</span><span class="personal-event-copy"><span class="mini-title">${esc(memberFullName(item))}</span><span class="mini-meta">${esc(item._kind==="jubilee"?`${fmtDate(item._date)} · ${item._years}. Vereinsjubiläum`:`${fmtDate(item._date)} · ${item._age}. Geburtstag`)}</span></span></button>`).join(""):`<div class="empty">Keine Geburtstage oder Jubiläen vorhanden.</div>`;
  $$('[data-dashboard-member]').forEach(btn=>btn.onclick=()=>{const m=byId("members",btn.dataset.dashboardMember);if(m){selectedMemberId=m.id;go("members");renderMembers()}});
  const ev=activeRows("events").filter(e=>eventEndDate(e)>=todayStr()).sort((a,b)=>eventStartDate(a).localeCompare(eventStartDate(b))).slice(0,5);
  $("#dashboardEvents").innerHTML=ev.length?ev.map(eventRowHTML).join(""):`<div class="empty">Keine kommenden Termine.</div>`;bindEventOpeners($("#dashboardEvents"));
  renderDashboardStorage();
};

async function vp2SyncGoogleCalendarOneWay(){
  if(db.settings.calendarSyncEnabled!==true)return {skipped:true};
  if(calendarSyncRunning)return;
  calendarSyncRunning=true;
  try{
    saveCalendarPrefs({enabled:true,syncEvents:true,syncBirthdays:false,syncTasks:false,syncProjects:false,calendarName:"V-Planer"});
    await ensureCalendarAccess();
    const calendarId=await ensureVPlanerGoogleCalendar();
    const remoteItems=await listVPlanerGoogleEvents(calendarId),remoteMap=remoteVPlanerEventMap(remoteItems);
    let created=0,updated=0,deleted=0;
    for(const rec of db.events||[]){
      const remote=remoteMap.get(calendarRecordKey("event",rec.id));
      if(rec.deletedAt){if(remote&&remote.status!=="cancelled"){await deleteGoogleCalendarEvent(calendarId,remote.id);deleted++}continue}
      if(!eventStartDate(rec))continue;
      if(!remote||remote.status==="cancelled"){
        const result=await writeGoogleCalendarEvent(calendarId,"event",rec,null);setCalendarSyncMarkers(rec,result.event);created++;
      }else{
        const body=googleCalendarBody("event",rec);
        const localVersion=remote.extendedProperties?.private?.vPlanerUpdatedAt||"";
        if(localVersion!==(rec.updatedAt||"")||!calendarRemoteMatchesLocal("event",rec,remote)){
          const result=await writeGoogleCalendarEvent(calendarId,"event",rec,remote);setCalendarSyncMarkers(rec,result.event);updated++;
        }else setCalendarSyncMarkers(rec,remote);
      }
    }
    localStorage.setItem("v-planer-calendar-last-sync-v1",now());
    localStorage.setItem(STORAGE_KEY,JSON.stringify(db));
    return {created,updated,deleted};
  }finally{calendarSyncRunning=false}
}
syncGoogleCalendar=async function(){return vp2SyncGoogleCalendarOneWay()};
scheduleCalendarAutoSync=function(){clearTimeout(calendarSyncTimer);if(db.settings.calendarSyncEnabled!==true)return;calendarSyncTimer=setTimeout(()=>{if(db.settings.calendarSyncEnabled===true&&hasUsableCalendarToken())vp2SyncGoogleCalendarOneWay().then(renderDashboardStorage).catch(e=>console.warn("Kalender-Sync",e))},1600)};

const vp2LegacyGoogleBody=googleCalendarBody;
googleCalendarBody=function(type,rec){
  const body=vp2LegacyGoogleBody(type,rec);
  if(type==="event"&&rec.recurrence&&rec.recurrence!=="none"){
    const freq=({daily:"DAILY",weekly:"WEEKLY",monthly:"MONTHLY",yearly:"YEARLY"})[rec.recurrence];
    if(freq){let rule=`RRULE:FREQ=${freq}`;if(rec.recurrenceUntil)rule+=`;UNTIL=${rec.recurrenceUntil.replaceAll("-","")}T235959Z`;body.recurrence=[rule]}
  }
  return body;
};

async function vp2SyncAllGoogle(){
  const calendarEnabled=db.settings.calendarSyncEnabled===true;
  const buttons=[$("#syncBtn"),$("#dashboardSyncBtn")].filter(Boolean);buttons.forEach(b=>{b.disabled=true;b.textContent="↻ Synchronisierung läuft …"});
  const errors=[];
  try{
    if(calendarEnabled)await ensureCalendarAccess();else await ensureDriveAccess();
    startPoll();await syncDrive(false);
  }catch(e){errors.push(`Drive: ${e.message}`)}
  if(calendarEnabled){try{await vp2SyncGoogleCalendarOneWay();if(hasUsableAccessToken())scheduleAutoSync()}catch(e){errors.push(`Kalender: ${e.message}`)}}
  buttons.forEach(b=>{b.disabled=false;b.textContent=calendarEnabled?"↻ Alles synchronisieren":"↻ Google Drive synchronisieren"});renderDashboardStorage();
  if(errors.length)alert(`Synchronisierung teilweise fehlgeschlagen:\n\n${errors.join("\n\n")}`);
}


/* ---------- Tasks: one data set, List | Kanban ---------- */
function vp2TaskView(){return localStorage.getItem(VP2_TASK_VIEW_KEY)||db.settings.taskDefaultView||"list"}
function vp2ApplyTaskView(){
  const mode=vp2TaskView(),list=$("#tasksListPanel"),kan=$("#tasksKanbanPanel");if(!list||!kan)return;
  list.hidden=mode!=="list";kan.hidden=mode!=="kanban";
  $("#taskListModeBtn")?.classList.toggle("active",mode==="list");$("#taskKanbanModeBtn")?.classList.toggle("active",mode==="kanban");
  if(mode==="kanban")renderKanban();
}
function vp2SetTaskView(mode){localStorage.setItem(VP2_TASK_VIEW_KEY,mode);vp2ApplyTaskView()}
taskStatusRank=function(s){return({open:1,doing:2,done:3})[s]||99};
renderTasks=function(){
  const q=($("#taskSearch")?.value||"").toLowerCase(),f=$("#taskStatusFilter")?.value||"";
  const rows=sortTasks(activeRows("tasks").filter(t=>(!q||`${t.title||""} ${t.description||""} ${projectName(t.projectId)} ${groupName(t.groupId)}`.toLowerCase().includes(q))&&(!f||t.status===f)));
  $("#taskTable").innerHTML=rows.length?rows.map(t=>`<tr><td><b>${esc(t.title)}</b>${t.description?`<div class="task-table-description">${esc(t.description)}</div>`:""}</td><td>${esc(projectName(t.projectId))}</td><td>${esc(groupName(t.groupId))}</td><td><span class="badge ${reminderClass(t.due)}">${fmtDate(t.due)} · ${esc(dueText(t.due))}</span></td><td>${priorityBadge(t.priority)}</td><td><select data-task-status="${t.id}">${["open","doing","done"].map(s=>`<option value="${s}" ${s===t.status?"selected":""}>${statusLabel(s)}</option>`).join("")}</select></td><td><button class="action-link" data-edit-task="${t.id}">Bearbeiten</button>${t.status==="done"?` <button class="action-link archive-link" data-archive-task="${t.id}">Archivieren</button>`:""} <button class="action-link danger-text" data-delete-task="${t.id}">Löschen</button></td></tr>`).join(""):`<tr><td colspan="7" class="empty">Keine Aufgaben.</td></tr>`;
  updateTaskSortUI();
  $$('[data-task-status]').forEach(el=>el.onchange=()=>{const t=byId("tasks",el.dataset.taskStatus);if(t){t.status=el.value;touch(t);saveLocal()}});
  $$('[data-edit-task]').forEach(el=>el.onclick=()=>openTaskModal(byId("tasks",el.dataset.editTask)));
  $$('[data-archive-task]').forEach(el=>el.onclick=()=>{const t=recordById("tasks",el.dataset.archiveTask);if(t&&confirm(`Aufgabe „${t.title}“ archivieren?`))archiveTask(t.id)});
  $$('[data-delete-task]').forEach(el=>el.onclick=()=>{if(confirm("Aufgabe in den Papierkorb verschieben?")){markDeleted("tasks",el.dataset.deleteTask);saveLocal()}});
  vp2ApplyTaskView();
};
renderKanban=function(){
  const q=($("#taskSearch")?.value||"").toLowerCase(),f=$("#taskStatusFilter")?.value||"";
  const cols=[["open","Offen"],["doing","In Bearbeitung"],["done","Erledigt"]];
  $("#kanbanBoard").innerHTML=cols.map(([status,label])=>{let tasks=activeRows("tasks").filter(t=>t.status===status&&(!f||f===status)&&(!q||`${t.title} ${projectName(t.projectId)} ${groupName(t.groupId)}`.toLowerCase().includes(q))).sort(kanbanTaskCompare);if(status==="done")tasks=tasks.slice(0,30);return `<div class="kanban-col" data-kanban-col="${status}"><h3>${label} · ${tasks.length}</h3>${tasks.map(t=>`<div class="ticket kanban-ticket" draggable="true" data-drag-task="${t.id}"><div class="kanban-ticket-head"><strong>${esc(t.title)}</strong>${priorityBadge(t.priority)}</div><small>${esc(projectName(t.projectId))} · ${esc(groupName(t.groupId))}</small><div class="kanban-ticket-footer"><span class="kanban-due ${kanbanDueClass(t)}">${esc(kanbanDueText(t))}</span>${status==="done"?`<button class="action-link archive-link" type="button" data-kanban-archive-task="${t.id}">Archivieren</button>`:""}</div></div>`).join("")}${status==="done"&&activeRows("tasks").filter(t=>t.status==="done").length>30?`<div class="mini-meta">Nur die ersten 30 erledigten Aufgaben werden angezeigt.</div>`:""}</div>`}).join("");
  $$('[data-drag-task]').forEach(el=>{el.addEventListener("dragstart",e=>e.dataTransfer.setData("text/plain",el.dataset.dragTask));el.addEventListener("click",()=>{const t=byId("tasks",el.dataset.dragTask);if(t)openTaskModal(t)})});
  $$('[data-kanban-archive-task]').forEach(btn=>btn.onclick=e=>{e.stopPropagation();const t=recordById("tasks",btn.dataset.kanbanArchiveTask);if(t&&confirm(`Aufgabe „${t.title}“ archivieren?`))archiveTask(t.id)});
  $$('[data-kanban-col]').forEach(col=>{col.addEventListener("dragover",e=>e.preventDefault());col.addEventListener("drop",e=>{e.preventDefault();const t=byId("tasks",e.dataTransfer.getData("text/plain"));if(t){t.status=col.dataset.kanbanCol;touch(t);saveLocal()}})});
};
openTaskModal=function(rec=null,presetProjectId=""){
  const project=presetProjectId?recordById("projects",presetProjectId):null;
  if(!rec&&project&&project.status==="closed")return alert("Abgeschlossene Projekte müssen zuerst wieder aktiviert werden, bevor neue Aufgaben angelegt werden können.");
  const r=rec||{status:"open",priority:"mid",title:"",due:"",projectId:presetProjectId||"",groupId:"",description:""},fixed=!!(presetProjectId&&!rec);
  showModal(rec?"Aufgabe bearbeiten":fixed?"Neue Projektaufgabe":"Neue Aufgabe",`<div class="form-grid">${fixed?`<div class="form-note full">Projekt: <b>${esc(projectName(presetProjectId))}</b></div>`:""}<label class="full">Aufgabe<input id="fTitle" value="${esc(r.title)}"></label><label>Fällig<input id="fDue" type="date" value="${esc(r.due||"")}"></label><label>Priorität<select id="fPriority">${[["high","Hoch"],["mid","Mittel"],["low","Niedrig"]].map(([v,l])=>`<option value="${v}" ${r.priority===v?"selected":""}>${l}</option>`).join("")}</select></label><label>Status<select id="fStatus">${["open","doing","done"].map(s=>`<option value="${s}" ${r.status===s?"selected":""}>${statusLabel(s)}</option>`).join("")}</select></label><label>Projekt<select id="fProject" ${fixed?"disabled":""}>${projectOptions(r.projectId)}</select></label><label>Gruppe<select id="fGroup">${groupOptions(r.groupId)}</select></label><div class="form-section">Notizen</div><label class="full"><textarea id="fDescription" rows="6">${esc(r.description||"")}</textarea></label></div>`,()=>{const title=$("#fTitle").value.trim();if(!title)return false;const target=rec||{id:uid(),createdAt:now()};Object.assign(target,{title,due:$("#fDue").value,priority:$("#fPriority").value,status:$("#fStatus").value,projectId:fixed?presetProjectId:$("#fProject").value,groupId:$("#fGroup").value,description:$("#fDescription").value.trim()});touch(target);if(!rec)db.tasks.push(target);saveLocal();return true});
};

/* ---------- Projects ---------- */
function vp2CloseProject(p){
  if(!p||p.status==="closed")return;
  const open=projectTasks(p.id).filter(t=>!t.archivedAt&&t.status!=="done");
  const msg=open.length?`Dieses Projekt enthält noch ${open.length} offene Aufgabe${open.length===1?"":"n"}.\n\nProjekt trotzdem abschließen?`:`Projekt „${p.name}“ abschließen?`;
  if(!confirm(msg))return;
  p.status="closed";p.completedAt=now();touch(p);saveLocal();
}
archiveProject=function(projectId){
  const p=recordById("projects",projectId);if(!p||p.archivedAt)return false;
  if(p.status!=="closed"){alert("Nur abgeschlossene Projekte können archiviert werden.");return false}
  const linked=projectTasks(p.id).filter(t=>!t.deletedAt),open=linked.filter(t=>t.status!=="done");
  if(open.length){
    if(!confirm(`Dieses Projekt enthält noch ${open.length} offene Aufgabe${open.length===1?"":"n"}.\n\nProjekt trotzdem archivieren?`))return false;
  }else if(!confirm(`Projekt „${p.name}“ archivieren?`))return false;
  const stamp=now();p.archivedAt=stamp;touch(p);
  linked.forEach(t=>{if(!t.archivedAt){t.archivedAt=stamp;t.archivedByProjectId=p.id;touch(t)}});
  saveLocal();return true;
};
restoreProject=function(projectId){
  const p=recordById("projects",projectId);if(!p||!p.archivedAt)return;
  const answer=prompt("Projekt wiederherstellen als:\n1 = Geplant\n2 = Aktiv\n3 = Abgeschlossen","2");if(answer===null)return;
  const status=answer==="1"?"planned":answer==="3"?"closed":"active";
  delete p.archivedAt;p.status=status;if(status!=="closed")delete p.completedAt;else if(!p.completedAt)p.completedAt=now();touch(p);
  allRows("tasks").filter(t=>t.archivedByProjectId===p.id).forEach(t=>{delete t.archivedAt;delete t.archivedByProjectId;touch(t)});
  saveLocal();
};
function vp2ProjectEvents(projectId){return activeRows("events").filter(e=>e.projectId===projectId).sort((a,b)=>eventStartDate(a).localeCompare(eventStartDate(b)))}
function vp2ProjectNextEvent(projectId){return vp2ProjectEvents(projectId).filter(e=>eventEndDate(e)>=todayStr())[0]||null}
function vp2MoveProjectToTrash(p){
  if(!p||p.deletedAt)return;
  const batch=`project-${p.id}-${Date.now()}`;
  markDeleted("projects",p.id,{trashBatchId:batch,trashRootType:"project",trashRootId:p.id});
  projectTasks(p.id).filter(t=>!t.deletedAt).forEach(t=>markDeleted("tasks",t.id,{trashBatchId:batch,trashRootType:"project",trashRootId:p.id}));
  saveLocal();
}
function vp2ProjectTabButton(tab,label,active=false){return `<button type="button" class="btn secondary ${active?"active":""}" data-project-detail-tab="${tab}">${label}</button>`}
function showProjectDetails(p){
  const current=recordById("projects",p?.id);if(!current)return;
  const dlg=$("#detailModal"),readonly=!!current.archivedAt||current.status==="closed",st=projectTaskStats(current.id),tasks=projectTasks(current.id),events=vp2ProjectEvents(current.id),next=vp2ProjectNextEvent(current.id);
  $("#detailTitle").textContent=current.name||"Projekt";
  $("#detailBody").innerHTML=`<div class="project-detail-v2"><div class="project-detail-top"><div>${statusBadge(current.status)} ${current.archivedAt?'<span class="badge gray">Archiviert</span>':''}<div class="mini-meta">${esc(projectDateRangeText(current))} · ${esc(groupName(current.groupId))}</div></div><div class="project-detail-actions"><button class="btn secondary" id="projectDetailEdit" type="button" ${current.archivedAt?"disabled":""}>Bearbeiten</button>${current.status!=="closed"&&!current.archivedAt?'<button class="btn primary" id="projectDetailClose" type="button">Projekt abschließen</button>':''}${current.status==="closed"&&!current.archivedAt?'<button class="btn primary" id="projectDetailArchive" type="button">Archivieren</button>':''}</div></div><div class="project-detail-tabs">${vp2ProjectTabButton("overview","Übersicht",true)}${vp2ProjectTabButton("tasks","Aufgaben")}${vp2ProjectTabButton("events","Termine")}${vp2ProjectTabButton("notes","Notizen")}</div><div id="projectDetailPanel"></div></div>`;
  const renderTab=tab=>{
    $$('[data-project-detail-tab]').forEach(b=>b.classList.toggle("active",b.dataset.projectDetailTab===tab));
    const panel=$("#projectDetailPanel");
    if(tab==="overview")panel.innerHTML=`<div class="project-detail-grid"><div class="detail-box full-detail"><b>Beschreibung</b>${esc(current.description||"Keine Beschreibung hinterlegt.")}</div><div class="detail-box"><b>Fortschritt</b>${st.total?`${st.done} von ${st.total} Aufgaben · ${st.progress}%`:"Noch keine Aufgaben vorhanden"}</div><div class="detail-box"><b>Nächster Termin</b>${next?`${esc(next.title)} · ${esc(eventDateRangeText(next))}`:"Kein kommender Termin"}</div><div class="detail-box"><b>Offene Aufgaben</b>${st.open}</div><div class="detail-box"><b>Termine</b>${events.length}</div></div>`;
    if(tab==="tasks")panel.innerHTML=`<div class="project-detail-section-head"><b>Projektaufgaben</b>${!readonly?'<button class="btn tiny primary" id="projectDetailAddTask" type="button">+ Aufgabe</button>':''}</div><div>${tasks.length?tasks.map(t=>`<div class="project-detail-row">${current.archivedAt?`<div class="project-detail-row-main"><b>${esc(t.title)}</b><small>${esc(statusLabel(t.status))} · ${t.due?fmtDate(t.due):"ohne Fälligkeit"}</small></div>`:`<button class="project-detail-row-main" data-project-detail-task="${t.id}" type="button"><b>${esc(t.title)}</b><small>${esc(statusLabel(t.status))} · ${t.due?fmtDate(t.due):"ohne Fälligkeit"}</small></button>`}</div>`).join(""):'<div class="empty">Keine Aufgaben.</div>'}</div>`;
    if(tab==="events")panel.innerHTML=`<div class="project-detail-section-head"><b>Projekttermine</b>${!readonly?'<button class="btn tiny primary" id="projectDetailAddEvent" type="button">+ Termin</button>':''}</div><div>${events.length?events.map(e=>`<button class="project-detail-row project-detail-row-main" data-project-detail-event="${e.id}" type="button"><b>${esc(e.title)}</b><small>${esc(eventDateRangeText(e))}${eventTimeRangeText(e)?` · ${esc(eventTimeRangeText(e))}`:""}</small></button>`).join(""):'<div class="empty">Keine Termine.</div>'}</div>`;
    if(tab==="notes")panel.innerHTML=`<div class="detail-box full-detail"><b>Notizen</b><div class="project-notes-display">${esc(current.notes||"Keine Notizen hinterlegt.")}</div></div>`;
    $("#projectDetailAddTask")?.addEventListener("click",()=>{dlg.close();openTaskModal(null,current.id)});
    $("#projectDetailAddEvent")?.addEventListener("click",()=>{dlg.close();openEventModal(null,current.id)});
    $$('[data-project-detail-task]').forEach(b=>b.onclick=()=>{const t=recordById("tasks",b.dataset.projectDetailTask);if(t){dlg.close();openTaskModal(t)}});
    $$('[data-project-detail-event]').forEach(b=>b.onclick=()=>{const e=recordById("events",b.dataset.projectDetailEvent);if(e)showEventDetails(e)});
  };
  $$('[data-project-detail-tab]').forEach(b=>b.onclick=()=>renderTab(b.dataset.projectDetailTab));renderTab("overview");
  $("#projectDetailEdit")?.addEventListener("click",()=>{dlg.close();openProjectModal(current)});
  $("#projectDetailClose")?.addEventListener("click",()=>{dlg.close();vp2CloseProject(current)});
  $("#projectDetailArchive")?.addEventListener("click",()=>{dlg.close();archiveProject(current.id)});
  dlg.showModal();
}
openProjectModal=function(rec=null){
  const r=rec||{name:"",startDate:"",endDate:"",status:"planned",groupId:"",description:"",notes:""},st=rec?projectTaskStats(rec.id):{total:0,done:0,progress:0};
  showModal(rec?"Projekt bearbeiten":"Neues Projekt",`<div class="form-grid"><label class="full">Projektname<input id="fName" value="${esc(r.name)}"></label><label>Projektbeginn<input id="fProjectStartDate" type="date" value="${esc(projectStartDate(r))}"></label><label>Projektende<input id="fProjectEndDate" type="date" value="${esc(projectEndDate(r))}"></label><label>Status<select id="fStatus">${["planned","active","closed"].map(s=>`<option value="${s}" ${r.status===s?"selected":""}>${statusLabel(s)}</option>`).join("")}</select></label><label>Gruppe<select id="fGroup">${groupOptions(r.groupId)}</select></label>${rec?`<div class="project-modal-progress full"><b>${st.total?`${st.progress}% Fortschritt`:"Noch keine Aufgaben vorhanden"}</b>${st.total?`<span>${st.done} von ${st.total} Aufgaben erledigt</span><div class="progress"><span style="width:${st.progress}%"></span></div>`:""}</div>`:""}<label class="full">Beschreibung<textarea id="fDescription" rows="4">${esc(r.description||"")}</textarea></label><label class="full">Notizen<textarea id="fProjectNotes" rows="5">${esc(r.notes||"")}</textarea></label></div>`,()=>{const name=$("#fName").value.trim();if(!name)return false;let start=$("#fProjectStartDate").value,end=$("#fProjectEndDate").value;if(!start&&end)start=end;if(start&&!end)end=start;if(start&&end&&end<start){alert("Das Projektende darf nicht vor dem Projektbeginn liegen.");return false}const target=rec||{id:uid(),createdAt:now()};const oldStatus=target.status;Object.assign(target,{name,startDate:start,endDate:end,due:end||start||"",status:$("#fStatus").value,groupId:$("#fGroup").value,description:$("#fDescription").value.trim(),notes:$("#fProjectNotes").value.trim()});if(target.status==="closed"&&oldStatus!=="closed")target.completedAt=now();if(target.status!=="closed")delete target.completedAt;touch(target);if(!rec)db.projects.push(target);saveLocal();return true});
};
renderProjects=function(){
  const q=($("#projectSearch")?.value||"").toLowerCase(),f=$("#projectStatusFilter")?.value||"";
  const rows=activeRows("projects").filter(p=>(!q||`${p.name} ${p.description||""} ${p.notes||""}`.toLowerCase().includes(q))&&(!f||p.status===f)).sort(vp214CompareProjectsByDue);
  $("#projectGrid").innerHTML=rows.length?rows.map(p=>{const st=projectTaskStats(p.id),next=vp2ProjectNextEvent(p.id),allDone=st.total>0&&st.open===0;return `<div class="card project-card project-card-v2"><div class="row"><h3>${esc(p.name)}</h3>${statusBadge(p.status)}</div><p>${esc(p.description||"Keine Beschreibung hinterlegt.")}</p><div class="mini-meta">${esc(groupName(p.groupId))} · ${esc(projectDateRangeText(p))}</div><div class="project-progress-head"><span>${st.total?`<b>${st.progress}%</b> Fortschritt`:"Noch keine Aufgaben"}</span><span>${st.done}/${st.total} erledigt</span></div>${st.total?`<div class="progress"><span style="width:${st.progress}%"></span></div>`:""}<div class="project-card-info"><span><b>${st.open}</b> offen</span><span><b>${vp2ProjectEvents(p.id).length}</b> Termine</span><span><b>${next?fmtShort(eventStartDate(next)):"—"}</b> nächster Termin</span></div>${allDone&&p.status!=="closed"?`<div class="project-complete-hint">✓ Alle Aufgaben erledigt. <button class="action-link" data-close-project="${p.id}">Projekt abschließen</button></div>`:""}<div class="row project-card-actions"><button class="btn tiny primary" data-open-project="${p.id}" type="button">Projekt öffnen</button><span><button class="action-link" data-edit-project="${p.id}">Bearbeiten</button>${p.status==="closed"?` <button class="action-link archive-link" data-archive-project="${p.id}">Archivieren</button>`:""} <button class="action-link danger-text" data-delete-project="${p.id}">Löschen</button></span></div></div>`}).join(""):`<div class="empty">Keine Projekte.</div>`;
  $$('[data-open-project]').forEach(b=>b.onclick=()=>showProjectDetails(byId("projects",b.dataset.openProject)));
  $$('[data-edit-project]').forEach(b=>b.onclick=()=>openProjectModal(byId("projects",b.dataset.editProject)));
  $$('[data-close-project]').forEach(b=>b.onclick=()=>vp2CloseProject(byId("projects",b.dataset.closeProject)));
  $$('[data-archive-project]').forEach(b=>b.onclick=()=>archiveProject(b.dataset.archiveProject));
  $$('[data-delete-project]').forEach(b=>b.onclick=()=>{const p=byId("projects",b.dataset.deleteProject);if(p&&confirm(`Projekt „${p.name}“ und seine Projektaufgaben in den Papierkorb verschieben?`)){vp2MoveProjectToTrash(p)}});
};

function vp22ArchiveYear(item,type){
  const value=type==="project"?(item.completedAt||item.archivedAt||projectEndDate(item)||""):type==="task"?(item.archivedAt||item.due||""):(item.exitDate||item.updatedAt||"");
  return String(value||"").slice(0,4)||"Ohne Jahr";
}
function vp22ArchiveMemberReactivate(member){
  if(!member||member.status!=="exited")return;const answer=prompt("Mitglied wieder aufnehmen als:\n1 = Aktiv\n2 = Passiv","1");if(answer===null)return;
  member.status=answer==="2"?"passive":"active";member.exitDate="";member.statusHistory=Array.isArray(member.statusHistory)?member.statusHistory:[];member.history=Array.isArray(member.history)?member.history:[];
  member.statusHistory.push({date:todayStr(),note:`Ausgetreten → ${statusLabel(member.status)}`});member.history.push({date:todayStr(),note:"Wiedereintritt"});touch(member);saveLocal();
}
renderArchive=function(){
  const q=($("#archiveSearch")?.value||"").toLowerCase(),typeFilter=$("#archiveTypeFilter")?.value||"",yearFilter=$("#archiveYearFilter")?.value||"";
  const projects=archivedRows("projects").slice().sort((a,b)=>String(b.archivedAt||"").localeCompare(String(a.archivedAt||"")));
  const tasks=archivedRows("tasks").slice().sort((a,b)=>String(b.archivedAt||"").localeCompare(String(a.archivedAt||"")));
  const members=allRows("members").filter(m=>m.status==="exited").slice().sort((a,b)=>String(b.exitDate||b.updatedAt||"").localeCompare(String(a.exitDate||a.updatedAt||"")));
  $("#archiveProjectCount").textContent=projects.length;$("#archiveTaskCount").textContent=tasks.length;$("#archiveMemberCount").textContent=members.length;
  const years=[...new Set([...projects.map(x=>vp22ArchiveYear(x,"project")),...tasks.map(x=>vp22ArchiveYear(x,"task")),...members.map(x=>vp22ArchiveYear(x,"member"))].filter(y=>y!=="Ohne Jahr"))].sort().reverse();
  const yearSel=$("#archiveYearFilter");if(yearSel){const old=yearSel.value;yearSel.innerHTML='<option value="">Alle Jahre</option>'+years.map(y=>`<option value="${y}" ${old===y?"selected":""}>${y}</option>`).join("");if(!years.includes(old))yearSel.value=""}
  const matches=(item,type,text)=>{const y=vp22ArchiveYear(item,type);return(!q||text.toLowerCase().includes(q))&&(!yearFilter||y===yearFilter)};
  const pRows=(typeFilter&&typeFilter!=="projects")?[]:projects.filter(p=>matches(p,"project",`${p.name||""} ${p.description||""} ${p.notes||""}`));
  const tRows=(typeFilter&&typeFilter!=="tasks")?[]:tasks.filter(t=>matches(t,"task",`${t.title||""} ${t.description||""} ${projectNameAny(t.projectId)} ${groupName(t.groupId)}`));
  const mRows=(typeFilter&&typeFilter!=="members")?[]:members.filter(m=>matches(m,"member",`${m.firstName||""} ${m.lastName||""} ${m.memberNo||""} ${m.email||""}`));
  const sections=[];
  if(!typeFilter||typeFilter==="projects")sections.push(`<section class="card archive-section-v22"><div class="card-head"><h2>Projekte</h2><span class="archive-section-count">${pRows.length}</span></div><div class="archive-list">${pRows.length?pRows.map(p=>{const st=projectTaskStats(p.id);return `<div class="archive-item archive-project-v2"><div class="archive-icon">📁</div><div class="archive-copy"><b>${esc(p.name)}</b><span>${esc(projectDateRangeText(p))} · ${st.done}/${st.total} Aufgaben erledigt</span>${p.description?`<small>${esc(p.description)}</small>`:""}<em>Archiviert ${esc(archiveDateText(p.archivedAt))}</em></div><div class="archive-row-actions"><button class="btn tiny secondary" data-archive-open="${p.id}" type="button">Öffnen</button><button class="btn tiny secondary" data-restore-project="${p.id}" type="button">Wiederherstellen</button><button class="btn tiny danger" data-archive-delete="${p.id}" type="button">Löschen</button></div></div>`}).join(""):'<div class="empty">Keine archivierten Projekte.</div>'}</div></section>`);
  if(!typeFilter||typeFilter==="tasks")sections.push(`<section class="card archive-section-v22"><div class="card-head"><h2>Aufgaben</h2><span class="archive-section-count">${tRows.length}</span></div><div class="archive-list">${tRows.length?tRows.map(t=>`<div class="archive-item"><div class="archive-icon">✅</div><div class="archive-copy"><b>${esc(t.title)}</b><span>${esc(projectNameAny(t.projectId))} · ${esc(groupName(t.groupId))}${t.due?` · fällig ${fmtDate(t.due)}`:""}</span>${t.description?`<small>${esc(t.description)}</small>`:""}<em>Archiviert ${esc(archiveDateText(t.archivedAt))}</em></div><div class="archive-row-actions"><button class="btn tiny secondary" data-restore-task="${t.id}" type="button">Wiederherstellen</button><button class="btn tiny danger" data-archive-task-delete="${t.id}" type="button">Löschen</button></div></div>`).join(""):'<div class="empty">Keine archivierten Aufgaben.</div>'}</div></section>`);
  if(!typeFilter||typeFilter==="members")sections.push(`<section class="card archive-section-v22"><div class="card-head"><h2>Mitglieder</h2><span class="archive-section-count">${mRows.length}</span></div><div class="archive-list">${mRows.length?mRows.map(m=>`<div class="archive-item"><div class="archive-icon">👤</div><div class="archive-copy"><b>${esc(memberFullName(m))}</b><span>Mitglied Nr. ${esc(memberNo(m))}${m.exitDate?` · Austritt ${fmtDate(m.exitDate)}`:" · Ausgetreten"}</span><small>${esc([m.email,m.phone].filter(Boolean).join(" · ")||"")}</small></div><div class="archive-row-actions"><button class="btn tiny secondary" data-archive-edit-member="${m.id}" type="button">Bearbeiten</button><button class="btn tiny primary" data-reactivate-member="${m.id}" type="button">Wieder aufnehmen</button></div></div>`).join(""):'<div class="empty">Keine ausgetretenen Mitglieder.</div>'}</div></section>`);
  $("#archiveOverview").innerHTML=sections.join("");
  $$('[data-archive-open]').forEach(b=>b.onclick=()=>showProjectDetails(recordById("projects",b.dataset.archiveOpen)));
  $$('[data-restore-project]').forEach(b=>b.onclick=()=>restoreProject(b.dataset.restoreProject));
  $$('[data-archive-delete]').forEach(b=>b.onclick=()=>{const p=recordById("projects",b.dataset.archiveDelete);if(p&&confirm(`Archiviertes Projekt „${p.name}“ und seine Projektaufgaben in den Papierkorb verschieben?`))vp2MoveProjectToTrash(p)});
  $$('[data-restore-task]').forEach(b=>b.onclick=()=>{const t=recordById("tasks",b.dataset.restoreTask);if(t&&confirm(`Aufgabe „${t.title}“ wiederherstellen?`))restoreTask(t.id)});
  $$('[data-archive-task-delete]').forEach(b=>b.onclick=()=>{const t=recordById("tasks",b.dataset.archiveTaskDelete);if(t&&confirm(`Archivierte Aufgabe „${t.title}“ in den Papierkorb verschieben?`)){markDeleted("tasks",t.id);saveLocal()}});
  $$('[data-archive-edit-member]').forEach(b=>b.onclick=()=>openMemberModal(recordById("members",b.dataset.archiveEditMember)));
  $$('[data-reactivate-member]').forEach(b=>b.onclick=()=>vp22ArchiveMemberReactivate(recordById("members",b.dataset.reactivateMember)));
};


/* ---------- Calendar: appointments only + birthdays/jubilees ---------- */
function vp2DateStr(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function vp2AddDays(ds,n){const d=new Date(`${ds}T12:00:00`);d.setDate(d.getDate()+n);return vp2DateStr(d)}
function vp2DayDiff(a,b){return Math.round((new Date(`${b}T12:00:00`)-new Date(`${a}T12:00:00`))/86400000)}
function vp2RecurrenceStartOnOrBefore(e,ds){
  const start=eventStartDate(e);if(!start||ds<start)return "";
  const until=e.recurrenceUntil||"9999-12-31";if(ds>until)return "";
  const mode=e.recurrence||"none";if(mode==="none")return start;
  const s=new Date(`${start}T12:00:00`),d=new Date(`${ds}T12:00:00`);
  if(mode==="daily")return ds;
  if(mode==="weekly"){const diff=vp2DayDiff(start,ds),back=((diff%7)+7)%7;return vp2AddDays(ds,-back)}
  if(mode==="monthly"){
    const day=s.getDate();let y=d.getFullYear(),m=d.getMonth();let last=new Date(y,m+1,0).getDate(),cand=vp2DateStr(new Date(y,m,Math.min(day,last),12));if(cand>ds){m--;if(m<0){m=11;y--}last=new Date(y,m+1,0).getDate();cand=vp2DateStr(new Date(y,m,Math.min(day,last),12))}return cand;
  }
  if(mode==="yearly"){
    let y=d.getFullYear(),m=s.getMonth(),day=s.getDate(),last=new Date(y,m+1,0).getDate(),cand=vp2DateStr(new Date(y,m,Math.min(day,last),12));if(cand>ds){y--;last=new Date(y,m+1,0).getDate();cand=vp2DateStr(new Date(y,m,Math.min(day,last),12))}return cand;
  }
  return start;
}
function vp2EventOccursOn(e,ds){
  const start=eventStartDate(e),end=eventEndDate(e)||start;if(!start)return false;
  const duration=Math.max(0,vp2DayDiff(start,end));
  if(!e.recurrence||e.recurrence==="none")return ds>=start&&ds<=end;
  const occ=vp2RecurrenceStartOnOrBefore(e,ds);if(!occ||occ<start||(e.recurrenceUntil&&occ>e.recurrenceUntil))return false;
  const diff=vp2DayDiff(start,occ);
  if(e.recurrence==="weekly"&&diff%7!==0)return false;
  if(e.recurrence==="monthly"){const s=new Date(`${start}T12:00:00`),o=new Date(`${occ}T12:00:00`);if((o.getFullYear()-s.getFullYear())*12+(o.getMonth()-s.getMonth())<0)return false}
  if(e.recurrence==="yearly"&&new Date(`${occ}T12:00:00`).getFullYear()<new Date(`${start}T12:00:00`).getFullYear())return false;
  return ds>=occ&&ds<=vp2AddDays(occ,duration);
}
eventOccursOn=function(e,ds){return vp2EventOccursOn(e,ds)};
function vp2EventOccurrenceStartsBetween(e,from,to){
  const out=[];for(let ds=from;ds<=to;ds=vp2AddDays(ds,1)){if(vp2EventOccursOn(e,ds)){const prev=vp2AddDays(ds,-1);if(!vp2EventOccursOn(e,prev)||ds===eventStartDate(e))out.push(ds)}}return out;
}
function vp2MemberActiveOn(m,ds){
  if(!m)return false;if(m.entryDate&&m.entryDate>ds)return false;if(m.exitDate&&m.exitDate<ds)return false;if(m.deceasedDate&&m.deceasedDate<ds)return false;return true;
}
function vp2CalendarFilters(){return {type:$("#calendarTypeFilter")?.value||"",project:$("#calendarProjectFilter")?.value||"",group:$("#calendarGroupFilter")?.value||""}}
function vp2CalendarItemsForDate(ds){
  const f=vp2CalendarFilters(),year=Number(ds.slice(0,4)),items=[];
  if(!f.type||f.type==="event")activeRows("events").filter(e=>vp2EventOccursOn(e,ds)&&(!f.project||e.projectId===f.project)&&(!f.group||e.groupId===f.group)).forEach(e=>items.push({kind:"event",id:e.id,title:e.title||"Termin",time:eventStartTime(e)||"",record:e,sort:`0-${eventStartTime(e)||"99:99"}`}));
  if(!f.project&&!f.group&&(!f.type||f.type==="birthday"))activeRows("members").filter(m=>m.birthDate&&vp2MemberActiveOn(m,ds)&&recurringDateForYear(m.birthDate,year)===ds).forEach(m=>{const age=year-Number(m.birthDate.slice(0,4));items.push({kind:"birthday",id:m.id,title:memberFullName(m),sub:`${age}. Geburtstag`,icon:isRoundBirthdayAge(age)?"🎉":"🎂",sort:"1"})});
  if(!f.project&&!f.group&&(!f.type||f.type==="jubilee"))activeRows("members").filter(m=>m.entryDate&&vp2MemberActiveOn(m,ds)&&recurringDateForYear(m.entryDate,year)===ds).forEach(m=>{const years=year-Number(m.entryDate.slice(0,4));if(years>0&&isConfiguredJubilee(years))items.push({kind:"jubilee",id:m.id,title:memberFullName(m),sub:`${years} Jahre Vereinsmitglied`,icon:"★",sort:"2"})});
  return items.sort((a,b)=>a.sort.localeCompare(b.sort)||a.title.localeCompare(b.title,"de"));
}
function vp2PopulateCalendarFilters(){
  const p=$("#calendarProjectFilter"),g=$("#calendarGroupFilter");if(p){const old=p.value;p.innerHTML='<option value="">Alle Projekte</option>'+allRows("projects").filter(x=>!x.deletedAt).map(x=>`<option value="${x.id}" ${old===x.id?"selected":""}>${esc(x.name)}</option>`).join("")}if(g){const old=g.value;g.innerHTML='<option value="">Alle Gruppen</option><option value="__all__">Gesamtverein</option>'+vp2CurrentGroups().map(x=>`<option value="${x.id}" ${old===x.id?"selected":""}>${esc(x.name)}</option>`).join("");if(old==="__all__")g.value=old}
}
function vp2FilteredGroupMatch(e,filter){return !filter||(filter==="__all__"?!e.groupId:e.groupId===filter)}
function vp2CalendarItemsForDateWithGroup(ds){
  const f=vp2CalendarFilters();if(f.group==="__all__"){const old=$("#calendarGroupFilter").value;$("#calendarGroupFilter").value="";const items=vp2CalendarItemsForDate(ds).filter(i=>i.kind!=="event"||!i.record.groupId);$("#calendarGroupFilter").value=old;return items}return vp2CalendarItemsForDate(ds)
}
function vp2RenderCalendarList(from,to,host){
  const days=[];for(let ds=from;ds<=to;ds=vp2AddDays(ds,1)){const items=vp2CalendarItemsForDateWithGroup(ds);if(items.length)days.push({ds,items})}
  host.innerHTML=days.length?days.map(day=>`<section class="calendar-agenda-day"><div class="calendar-agenda-date"><b>${esc(new Intl.DateTimeFormat("de-DE",{weekday:"long"}).format(new Date(`${day.ds}T12:00:00`)))}</b><span>${esc(fmtDate(day.ds))}</span></div><div class="calendar-agenda-items">${day.items.map(item=>item.kind==="event"?`<button class="calendar-agenda-item" data-v2-event="${item.id}" type="button"><span class="calendar-agenda-time">${esc(item.time?item.time+" Uhr":"ganztägig")}</span><span class="calendar-agenda-icon">📅</span><span class="calendar-agenda-copy"><b>${esc(item.title)}</b><small>${esc([item.record.location,item.record.projectId?projectNameAny(item.record.projectId):"",groupName(item.record.groupId)].filter(x=>x&&x!=="—"&&x!=="Gesamtverein").join(" · "))}</small></span></button>`:`<button class="calendar-agenda-item" data-v2-member="${item.id}" type="button"><span class="calendar-agenda-time">ganztägig</span><span class="calendar-agenda-icon">${item.icon}</span><span class="calendar-agenda-copy"><b>${esc(item.title)}</b><small>${esc(item.sub)}</small></span></button>`).join("")}</div></section>`).join(""):'<div class="calendar-agenda-empty">In diesem Zeitraum gibt es keine Einträge.</div>';
  $$('[data-v2-event]').forEach(b=>b.onclick=()=>{const e=byId("events",b.dataset.v2Event);if(e)showEventDetails(e)});$$('[data-v2-member]').forEach(b=>b.onclick=()=>{selectedMemberId=b.dataset.v2Member;go("members");renderMembers()});
}
function vp2CalendarRangeForMode(mode){
  const base=calDate;if(mode==="day"){const ds=vp2DateStr(base);return [ds,ds]}
  if(mode==="week"){const d=new Date(base),wd=(d.getDay()+6)%7;d.setDate(d.getDate()-wd);return [vp2DateStr(d),vp2AddDays(vp2DateStr(d),6)]}
  if(mode==="list"){const start=vp2DateStr(new Date(base.getFullYear(),base.getMonth(),1)),end=vp2DateStr(new Date(base.getFullYear(),base.getMonth()+2,0));return [start,end]}
  return [vp2DateStr(new Date(base.getFullYear(),base.getMonth(),1)),vp2DateStr(new Date(base.getFullYear(),base.getMonth()+1,0))]
}
function vp2ApplyCalendarMode(){
  const mode=vp2CalendarMode;[$("#calendarGrid"),$("#calendarWeek"),$("#calendarDay"),$("#calendarAgenda")].forEach(x=>{if(x)x.hidden=true});
  const map={month:"#calendarGrid",week:"#calendarWeek",day:"#calendarDay",list:"#calendarAgenda"};const host=$(map[mode]);if(host)host.hidden=false;
  $$('[data-calendar-mode]').forEach(b=>b.classList.toggle("active",b.dataset.calendarMode===mode));
}
function vp2SetCalendarMode(mode){if(!["month","week","day","list"].includes(mode))return;vp2CalendarMode=mode;localStorage.setItem(VP2_CAL_VIEW_KEY,mode);renderCalendar()}
renderCalendar=function(){
  vp2PopulateCalendarFilters();const y=calDate.getFullYear(),m=calDate.getMonth(),today=todayStr(),mode=vp2CalendarMode;
  const [rangeStart,rangeEnd]=vp2CalendarRangeForMode(mode);
  if(mode==="month"||mode==="list")$("#calendarTitle").textContent=new Intl.DateTimeFormat("de-DE",{month:"long",year:"numeric"}).format(calDate);
  if(mode==="week")$("#calendarTitle").textContent=`Woche ${fmtDate(rangeStart)} – ${fmtDate(rangeEnd)}`;
  if(mode==="day")$("#calendarTitle").textContent=new Intl.DateTimeFormat("de-DE",{weekday:"long",day:"2-digit",month:"long",year:"numeric"}).format(calDate);
  if(mode==="month"){
    const first=new Date(y,m,1),offset=(first.getDay()+6)%7,days=new Date(y,m+1,0).getDate(),prevDays=new Date(y,m,0).getDate();let cells=["Mo","Di","Mi","Do","Fr","Sa","So"].map((x,i)=>`<div class="weekday ${i>=5?"weekend-head":""}">${x}</div>`);
    for(let cell=0;cell<42;cell++){
      const raw=cell-offset+1;let date,day,outside=false;if(raw<1){day=prevDays+raw;date=new Date(y,m-1,day);outside=true}else if(raw>days){day=raw-days;date=new Date(y,m+1,day);outside=true}else{day=raw;date=new Date(y,m,day)}const ds=vp2DateStr(date),items=outside?[]:vp2CalendarItemsForDateWithGroup(ds),visible=items.slice(0,4),more=items.length-visible.length;
      cells.push(`<div class="cal-day ${outside?"outside-month":""} ${ds===today?"today":""}" data-calendar-drop-date="${ds}"><div class="cal-day-top"><span class="cal-day-number">${day}</span>${ds===today?'<span class="today-label">Heute</span>':''}</div><div class="cal-day-content">${visible.map(item=>item.kind==="event"?`<button draggable="true" class="cal-chip cal-event-button" data-v2-event="${item.id}" data-drag-event="${item.id}" type="button" style="--event-color:${eventColor(item.record)};--event-soft:${colorWithAlpha(eventColor(item.record),.14)}">${esc(item.title)}${item.time?` ${esc(item.time)}`:""}</button>`:`<button class="cal-chip ${item.kind}" data-v2-member="${item.id}" type="button">${item.icon} ${esc(item.title)}</button>`).join("")}${more?`<div class="cal-more">+ ${more} weitere</div>`:""}</div></div>`);
    }
    $("#calendarGrid").innerHTML=cells.join("");
  }else if(mode==="week")vp2RenderCalendarList(rangeStart,rangeEnd,$("#calendarWeek"));
  else if(mode==="day")vp2RenderCalendarList(rangeStart,rangeEnd,$("#calendarDay"));
  else vp2RenderCalendarList(rangeStart,rangeEnd,$("#calendarAgenda"));
  const upcoming=[];for(let ds=todayStr(),i=0;i<45;i++,ds=vp2AddDays(ds,1)){vp2CalendarItemsForDateWithGroup(ds).forEach(x=>upcoming.push({...x,ds}));if(upcoming.length>14)break}
  $("#calendarSideList").innerHTML=upcoming.slice(0,12).map(x=>x.kind==="event"?`<button class="event-row event-row-button" data-v2-event="${x.id}" type="button"><div class="date-box">${esc(x.ds.slice(8,10))}<small>${esc(new Intl.DateTimeFormat("de-DE",{month:"short"}).format(new Date(`${x.ds}T12:00:00`)))}</small></div><div><div class="mini-title">${esc(x.title)}</div><div class="mini-meta">${esc(x.time||"ganztägig")}</div></div></button>`:`<button class="birthday-row" data-v2-member="${x.id}" type="button"><span class="person-dot">${x.icon}</span><span><span class="mini-title">${esc(x.title)}</span><span class="mini-meta">${esc(x.sub)}</span></span></button>`).join("")||'<div class="empty">Keine kommenden Einträge.</div>';
  $$('[data-v2-event]').forEach(b=>b.onclick=e=>{if(e.type==="click"){const ev=byId("events",b.dataset.v2Event);if(ev)showEventDetails(ev)}});$$('[data-v2-member]').forEach(b=>b.onclick=()=>{selectedMemberId=b.dataset.v2Member;go("members");renderMembers()});
  $$('[data-drag-event]').forEach(b=>b.addEventListener("dragstart",e=>e.dataTransfer.setData("text/vplaner-event",b.dataset.dragEvent)));
  $$('[data-calendar-drop-date]').forEach(cell=>{cell.addEventListener("dragover",e=>e.preventDefault());cell.addEventListener("drop",e=>{e.preventDefault();const id=e.dataTransfer.getData("text/vplaner-event"),ev=byId("events",id);if(!ev)return;const oldStart=eventStartDate(ev),oldEnd=eventEndDate(ev)||oldStart,duration=vp2DayDiff(oldStart,oldEnd);ev.startDate=cell.dataset.calendarDropDate;ev.endDate=vp2AddDays(ev.startDate,duration);ev.date=ev.startDate;touch(ev);saveLocal()})});
  vp2ApplyCalendarMode();
};
openEventModal=function(rec=null,presetProjectId="",preset={}){
  const project=presetProjectId?recordById("projects",presetProjectId):null;if(!rec&&project&&project.status==="closed")return alert("Abgeschlossene Projekte müssen zuerst wieder aktiviert werden, bevor neue Termine angelegt werden können.");
  const r=rec||{title:preset.title||"",startDate:preset.startDate||todayStr(),endDate:preset.endDate||preset.startDate||todayStr(),startTime:"",endTime:"",location:"",groupId:project?.groupId||"",projectId:presetProjectId||"",description:"",color:"#1677c8",recurrence:"none",recurrenceUntil:""};
  const fixed=!!(presetProjectId&&!rec),allDay=!eventStartTime(r)&&!eventEndTime(r);
  showModal(rec?"Termin bearbeiten":fixed?"Termin zum Projekt anlegen":"Neuer Termin",`<div class="form-grid">${fixed?`<div class="form-note full">Projekt: <b>${esc(project?.name||"")}</b></div>`:""}<label class="full">Titel<input id="fTitle" value="${esc(r.title||"")}"></label><label>Von<input id="fStartDate" type="date" value="${esc(eventStartDate(r)||todayStr())}"></label><label>Bis<input id="fEndDate" type="date" value="${esc(eventEndDate(r)||eventStartDate(r)||todayStr())}"></label><label class="checkline full"><input id="fAllDay" type="checkbox" ${allDay?"checked":""}> Ganztägig</label><label>Startzeit<input id="fStartTime" type="time" value="${esc(eventStartTime(r))}"></label><label>Endzeit<input id="fEndTime" type="time" value="${esc(eventEndTime(r))}"></label><label>Ort<input id="fLocation" value="${esc(r.location||"")}"></label><label>Gruppe<select id="fGroup">${groupOptions(r.groupId)}</select></label><label class="full">Projekt<select id="fEventProject" ${fixed?"disabled":""}>${projectOptions(r.projectId||presetProjectId)}</select></label><label>Wiederholung<select id="fRecurrence"><option value="none">Keine</option>${[["daily","Täglich"],["weekly","Wöchentlich"],["monthly","Monatlich"],["yearly","Jährlich"]].map(([v,l])=>`<option value="${v}" ${r.recurrence===v?"selected":""}>${l}</option>`).join("")}</select></label><label>Wiederholen bis<input id="fRecurrenceUntil" type="date" value="${esc(r.recurrenceUntil||"")}"></label><label class="full">Notizen<textarea id="fEventDescription" rows="4">${esc(r.description||"")}</textarea></label><label>Farbe<input id="fColor" type="color" value="${eventColor(r)}"></label></div>`,()=>{const title=$("#fTitle").value.trim(),sd=$("#fStartDate").value,ed=$("#fEndDate").value||sd;if(!title||!sd)return false;if(ed<sd){alert("Das Bis-Datum darf nicht vor dem Von-Datum liegen.");return false}const all=$("#fAllDay").checked,st=all?"":$("#fStartTime").value,et=all?"":$("#fEndTime").value;if(!all&&st&&et&&sd===ed&&et<=st){alert("Die Endzeit muss nach der Startzeit liegen.");return false}const target=rec||{id:uid(),createdAt:now()};Object.assign(target,{title,startDate:sd,endDate:ed,date:sd,startTime:st,endTime:et,time:st,location:$("#fLocation").value.trim(),groupId:$("#fGroup").value,projectId:fixed?presetProjectId:$("#fEventProject").value,description:$("#fEventDescription").value.trim(),color:$("#fColor").value,recurrence:$("#fRecurrence").value,recurrenceUntil:$("#fRecurrenceUntil").value});touch(target);if(!rec)db.events.push(target);saveLocal();return true});
  const toggle=()=>{$("#fStartTime").disabled=$("#fAllDay").checked;$("#fEndTime").disabled=$("#fAllDay").checked};$("#fAllDay")?.addEventListener("change",toggle);toggle();
};
showEventDetails=function(e){
  const dlg=$("#detailModal"),project=e.projectId?recordById("projects",e.projectId):null,locked=!!project?.archivedAt;$("#detailTitle").textContent=e.title||"Termin";$("#detailBody").innerHTML=`<div class="event-detail"><div class="event-detail-grid"><div class="detail-box"><b>Datum</b>${esc(eventDateRangeText(e))}</div><div class="detail-box"><b>Zeit</b>${esc(eventTimeRangeText(e)||"ganztägig")}</div><div class="detail-box"><b>Ort</b>${esc(e.location||"—")}</div><div class="detail-box"><b>Gruppe</b>${esc(groupName(e.groupId))}</div>${project?`<div class="detail-box"><b>Projekt</b>${esc(`${project.name}${project.archivedAt?" · archiviert":""}`)}</div>`:""}<div class="detail-box"><b>Wiederholung</b>${esc(({daily:"Täglich",weekly:"Wöchentlich",monthly:"Monatlich",yearly:"Jährlich",none:"Keine"})[e.recurrence||"none"]||"Keine")}</div>${e.description?`<div class="detail-box full-detail"><b>Notizen</b>${esc(e.description)}</div>`:""}</div>${locked?'<div class="form-note">Dieser Termin gehört zu einem archivierten Projekt und ist hier schreibgeschützt.</div>':`<div class="event-detail-actions"><button class="btn primary" id="detailEditEvent" type="button">Bearbeiten</button><button class="btn danger" id="detailDeleteEvent" type="button">Termin löschen</button></div>`}</div>`;dlg.showModal();if(!locked){$("#detailEditEvent").onclick=()=>{dlg.close();openEventModal(e)};$("#detailDeleteEvent").onclick=()=>{if(confirm(`Termin „${e.title}“ in den Papierkorb verschieben?`)){markDeleted("events",e.id);dlg.close();saveLocal()}};}
};

/* ---------- Vereinsjahr ---------- */
yearEntriesForMonth=function(year,monthIndex){
  const rows=[],monthStart=`${year}-${String(monthIndex+1).padStart(2,"0")}-01`,monthEnd=`${year}-${String(monthIndex+1).padStart(2,"0")}-${String(new Date(year,monthIndex+1,0).getDate()).padStart(2,"0")}`;
  allRows("events").filter(e=>!e.deletedAt).forEach(e=>{
    const starts=vp2EventOccurrenceStartsBetween(e,monthStart,monthEnd);starts.forEach(ds=>rows.push({kind:"event",id:e.id,date:ds,sortDate:ds,title:e.title||"Termin",record:e}));
    if(!e.recurrence||e.recurrence==="none")if(eventOverlapsMonth(e,year,monthIndex)&&!starts.length)rows.push({kind:"event",id:e.id,date:eventStartDate(e)<monthStart?monthStart:eventStartDate(e),sortDate:eventStartDate(e),title:e.title||"Termin",record:e});
  });
  allRows("projects").filter(p=>!p.deletedAt&&projectOverlapsMonth(p,year,monthIndex)).forEach(p=>{const start=projectStartDate(p);rows.push({kind:"project",id:p.id,date:start<monthStart?monthStart:start,sortDate:start,title:p.name||"Projekt",record:p})});
  allRows("members").filter(m=>m.birthDate).forEach(m=>{const date=recurringDateForYear(m.birthDate,year);if(date&&Number(date.slice(5,7))===monthIndex+1&&vp2MemberActiveOn(m,date)){const age=year-Number(m.birthDate.slice(0,4));rows.push({kind:"birthday",id:m.id,date,sortDate:date,title:`${memberFullName(m)} · ${age}. Geburtstag`,record:m,age,roundBirthday:isRoundBirthdayAge(age)})}});
  allRows("members").filter(m=>m.entryDate).forEach(m=>{const years=year-Number(m.entryDate.slice(0,4));if(years<=0||!isConfiguredJubilee(years))return;const date=recurringDateForYear(m.entryDate,year);if(date&&Number(date.slice(5,7))===monthIndex+1&&vp2MemberActiveOn(m,date))rows.push({kind:"jubilee",id:m.id,date,sortDate:date,title:`${memberFullName(m)} · ${years} Jahre im Verein`,record:m,years})});
  return rows.sort((a,b)=>String(a.sortDate||"").localeCompare(String(b.sortDate||""))||String(a.title).localeCompare(String(b.title),"de"));
};
yearEntryHTML=function(item){
  const dateParts=String(item.date||"").split("-");
  const day=dateParts[2]||"";
  const monthShort=item.date?new Intl.DateTimeFormat("de-DE",{month:"short"}).format(new Date(`${item.date}T12:00:00`)).replace(".",""):"";
  if(item.kind==="event"){
    const e=item.record,project=e.projectId?projectNameAny(e.projectId):"",group=e.groupId?groupName(e.groupId):"";
    const meta=[eventTimeRangeText(e)||"ganztägig",project?`Projekt: ${project}`:"",group&&group!=="—"?group:""].filter(Boolean).join(" · ");
    return `<button type="button" class="year-entry-card year-entry-event" data-year-event="${item.id}">
      <span class="year-entry-icon">📅</span>
      <span class="year-entry-copy"><span class="year-entry-kicker">Termin</span><strong>${esc(item.title)}</strong><small>${esc(meta)}</small></span>
      <span class="year-entry-side"><span class="year-entry-day">${esc(day)}</span><span class="year-entry-month">${esc(monthShort)}</span></span>
      <span class="year-entry-chevron">›</span>
    </button>`;
  }
  if(item.kind==="project"){
    const p=item.record,group=p.groupId?groupName(p.groupId):"",state=`${statusLabel(p.status)}${p.archivedAt?" · archiviert":""}`;
    const meta=[projectDateRangeText(p),group&&group!=="—"?group:""].filter(Boolean).join(" · ");
    return `<button type="button" class="year-entry-card year-entry-project" data-year-project="${item.id}">
      <span class="year-entry-icon">📁</span>
      <span class="year-entry-copy"><span class="year-entry-kicker">Projekt</span><strong>${esc(item.title)}</strong><small>${esc(meta)}</small></span>
      <span class="year-entry-status">${esc(state)}</span>
      <span class="year-entry-chevron">›</span>
    </button>`;
  }
  const isJubilee=item.kind==="jubilee",icon=isJubilee?"★":item.roundBirthday?"🎉":"🎂";
  const kicker=isJubilee?"Jubiläum":item.roundBirthday?"Runder Geburtstag":"Geburtstag";
  const meta=isJubilee?`${item.years} Jahre Vereinsmitglied`:`${item.age}. Geburtstag`;
  return `<button type="button" class="year-entry-card ${isJubilee?"year-entry-jubilee":"year-entry-birthday"}" data-year-member="${item.id}">
    <span class="year-entry-icon">${icon}</span>
    <span class="year-entry-copy"><span class="year-entry-kicker">${esc(kicker)}</span><strong>${esc(memberFullName(item.record))}</strong><small>${esc(meta)}</small></span>
    <span class="year-entry-side"><span class="year-entry-day">${esc(day)}</span><span class="year-entry-month">${esc(monthShort)}</span></span>
    <span class="year-entry-chevron">›</span>
  </button>`;
};
renderYear=function(){
  const year=calDate.getFullYear();$("#yearTitle").textContent=`Vereinsjahr ${year}`;
  const allMonths=[...Array(12)].map((_,i)=>yearEntriesForMonth(year,i));
  const all=allMonths.flat(),events=new Set(all.filter(x=>x.kind==="event").map(x=>x.id)).size,projects=new Set(all.filter(x=>x.kind==="project").map(x=>x.id)).size,round=all.filter(x=>x.kind==="birthday"&&x.roundBirthday).length,jub=all.filter(x=>x.kind==="jubilee").length;
  $("#yearSummary").innerHTML=`<span><b>${projects}</b> Projekte</span><span><b>${events}</b> Termine</span><span><b>${round}</b> besondere Geburtstage</span><span><b>${jub}</b> Jubiläen</span>`;
  $("#yearNote").value=db.settings.yearNotes?.[year]||"";
  $("#yearGrid").innerHTML=allMonths.map((entries,i)=>{const name=new Intl.DateTimeFormat("de-DE",{month:"long"}).format(new Date(year,i,1)),filtered=vp2YearFilter?entries.filter(x=>x.kind===vp2YearFilter):entries;return `<div class="card month-card"><div class="year-month-head"><h3>${name}</h3><span class="year-month-count">${filtered.length}</span></div>${filtered.length?filtered.map(yearEntryHTML).join(""):'<div class="mini-meta">Keine Einträge</div>'}</div>`}).join("");
  $$('[data-year-event]').forEach(b=>b.onclick=()=>{const e=recordById("events",b.dataset.yearEvent);if(e)showEventDetails(e)});$$('[data-year-project]').forEach(b=>b.onclick=()=>{const p=recordById("projects",b.dataset.yearProject);if(p)showProjectDetails(p)});$$('[data-year-member]').forEach(b=>b.onclick=()=>{selectedMemberId=b.dataset.yearMember;go("members");renderMembers()});
  $$('[data-year-filter]').forEach(b=>b.classList.toggle("active",b.dataset.yearFilter===vp2YearFilter));
};

/* ---------- Members ---------- */
memberSortValue=function(m,key){if(key==="number"){const v=String(m.memberNo||"").trim();return /^\d+$/.test(v)?Number(v):v.toLowerCase()}if(key==="name")return `${m.lastName||""}\0${m.firstName||""}`.toLowerCase();if(key==="status")return({active:1,passive:2,exited:3,deceased:4})[m.status]||99;if(key==="age")return ageAt(m.birthDate)??999;if(key==="groups")return effectiveGroupIdsForMember(m).map(groupName).join(" ").toLowerCase();return ""};
function vp2MemberFunctions(m){return activeRows("functions").filter(f=>f.memberId===m.id&&!f.inactiveAt).sort((a,b)=>String(a.startDate||"").localeCompare(String(b.startDate||"")))}
renderMembers=function(){
  const q=($("#memberSearch")?.value||"").toLowerCase(),f=$("#memberStatusFilter")?.value||"",hf=$("#memberHonoraryFilter")?.value||"";
  const rows=sortMembers(activeRows("members").filter(m=>m.status!=="exited").filter(m=>(!q||`${m.firstName} ${m.lastName} ${m.memberNo} ${m.email||""}`.toLowerCase().includes(q))&&(!f||m.status===f)&&(!hf||(hf==="yes"?!!m.honorary:!m.honorary))));
  $("#memberTable").innerHTML=rows.length?rows.map(m=>{
    const groups=effectiveGroupIdsForMember(m).map(id=>({id,name:groupName(id)})).filter(g=>g.name&&g.name!=="—");
    return `<tr class="selectable member-row-v2 ${m.id===selectedMemberId?"selected":""}" data-member-row="${m.id}">
      <td class="member-no-cell">${esc(memberNo(m))}</td>
      <td><div class="member-name-cell"><b>${esc(memberFullName(m))}</b>${m.email?`<small>${esc(m.email)}</small>`:""}${m.honorary?'<span class="member-honorary-tag">★ Ehrenmitglied</span>':''}</div></td>
      <td>${statusBadge(m.status)}</td>
      <td><span class="member-age-value">${ageAt(m.birthDate)??"—"}</span></td>
      <td><div class="member-group-tags compact">${groups.length?groups.map(g=>`<span class="member-group-tag">${esc(g.name)}</span>`).join(""):'<span class="member-group-empty">Keine Gruppe</span>'}</div></td>
    </tr>`
  }).join(""):'<tr><td colspan="5" class="empty">Keine Mitglieder.</td></tr>';
  updateMemberSortUI();
  $$('[data-member-row]').forEach(tr=>tr.onclick=()=>{selectedMemberId=tr.dataset.memberRow;renderMemberDetail();$$('[data-member-row]').forEach(x=>x.classList.toggle("selected",x.dataset.memberRow===selectedMemberId))});
  if(!rows.some(m=>m.id===selectedMemberId))selectedMemberId=rows[0]?.id||null;
  renderMemberDetail();
};

function vp2MemberGroupTags(m){
  const ids=effectiveGroupIdsForMember(m);
  return ids.length?ids.map(id=>`<span class="member-group-tag">${esc(groupName(id))}</span>`).join(""):'<span class="member-group-empty">Keine spezielle Gruppe zugeordnet.</span>';
}

function vp2AddGroupToMember(m){
  const assigned=new Set(effectiveGroupIdsForMember(m)),available=vp2CurrentGroups().filter(g=>!assigned.has(g.id));
  if(!available.length){alert("Es sind keine weiteren Gruppen vorhanden, die diesem Mitglied zugeordnet werden können.");return}
  showModal("Gruppe hinzufügen",`<div class="form-grid"><label class="full">Gruppe<select id="memberQuickGroup"><option value="">Gruppe auswählen …</option>${available.map(g=>`<option value="${g.id}">${esc(g.name)}</option>`).join("")}</select></label><div class="form-note full">Die Gruppe wird direkt dem Mitglied zugeordnet. Neue Gruppen werden zentral unter „Gruppen & Funktionen“ angelegt.</div></div>`,()=>{
    const id=$("#memberQuickGroup").value;if(!id){alert("Bitte eine Gruppe auswählen.");return false}
    m.groupIds=[...new Set([...(m.groupIds||[]),id])];m.history=Array.isArray(m.history)?m.history:[];m.history.push({date:todayStr(),note:`Gruppe ${groupName(id)} beigetreten`});touch(m);saveLocal();selectedMemberId=m.id;renderMembers();return true
  });
}

renderMemberDetail=function(){
  const host=$("#memberDetail"),m=byId("members",selectedMemberId);if(!m){host.innerHTML='<div class="empty">Mitglied auswählen.</div>';return}
  const funcs=vp2MemberFunctions(m),current=funcs.filter(f=>functionState(f)==="active"),former=funcs.filter(f=>functionState(f)==="former"),hist=[...(m.history||[]),...(m.statusHistory||[])].sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")));
  host.innerHTML=`
    <div class="member-profile-head">
      <div class="member-hero">${memberPhotoHTML(m)}<div class="member-hero-copy"><h2>${esc(`${m.firstName||""} ${m.lastName||""}`.trim())}</h2><div class="member-badge-row">${statusBadge(m.status)} ${m.honorary?'<span class="badge purple">Ehrenmitglied</span>':''}</div><div class="mini-meta">Mitglied Nr. ${esc(memberNo(m))}</div></div></div>
    </div>
    <div class="member-profile-actions-row"><div class="member-detail-actions"><button class="btn primary" data-edit-member="${m.id}">Bearbeiten</button><button class="btn danger" data-delete-member="${m.id}">Löschen</button></div></div>
    <div class="member-info-grid member-fact-grid">
      <div class="detail-box"><b>Geboren</b><span>${m.birthDate?`${fmtDate(m.birthDate)} · ${ageAt(m.birthDate)} Jahre`:"—"}</span></div>
      <div class="detail-box"><b>Mitgliedschaft</b><span>${m.entryDate?`${fmtDate(m.entryDate)} · ${Math.max(0,new Date().getFullYear()-Number(m.entryDate.slice(0,4)))} Jahre`:"—"}</span></div>
      <div class="detail-box"><b>Kontakt</b><span>${esc([m.email,m.phone].filter(Boolean).join(" · ")||"—")}</span></div>
      <div class="detail-box"><b>Adresse</b><span>${esc(m.address||"—")}</span></div>
    </div>
    <section class="member-detail-section">
      <div class="member-section-head"><div><h3>Verein</h3><small>Gruppen und aktuelle Funktionen</small></div><button class="btn tiny secondary" type="button" data-add-member-group="${m.id}">+ Gruppe</button></div>
      <div class="member-group-tags">${vp2MemberGroupTags(m)}</div>
      ${current.length?`<div class="function-summary member-function-list">${current.map(f=>`<div><b>${esc(groupName(f.groupId))} → ${esc(f.title)}</b><small>${f.startDate?`seit ${fmtDate(f.startDate)}`:"aktuell"}</small></div>`).join("")}</div>`:""}
    </section>
    ${m.honors?.length?`<section class="member-detail-section"><div class="member-section-head"><div><h3>Ehrungen</h3><small>Auszeichnungen und Ehrungen</small></div></div>${m.honors.map(h=>`<div class="history-row"><b>${esc(h.title)}</b><span>${fmtDate(h.date)}</span></div>`).join("")}</section>`:""}
    ${m.notes?`<section class="member-detail-section"><div class="member-section-head"><div><h3>Notizen</h3></div></div><p class="member-notes-text">${esc(m.notes)}</p></section>`:""}
    <section class="member-detail-section"><div class="member-section-head"><div><h3>Historie</h3><small>Automatisch dokumentierte Änderungen</small></div></div>${hist.length?hist.map(h=>`<div class="history-row"><span>${fmtDate(h.date)}</span><b>${esc(h.note||"")}</b></div>`).join(""):'<div class="mini-meta">Noch keine Historieneinträge.</div>'}${former.length?former.map(f=>`<div class="history-row"><span>${fmtDate(f.endDate)}</span><b>Funktion beendet: ${esc(f.title)} · ${esc(groupName(f.groupId))}</b></div>`).join(""):""}</section>`;
  $('[data-edit-member]')?.addEventListener("click",()=>openMemberModal(m));
  $('[data-delete-member]')?.addEventListener("click",()=>{if(confirm(`Mitglied „${memberFullName(m)}“ in den Papierkorb verschieben?\n\nFür einen normalen Vereinsaustritt bitte den Status „Ausgetreten“ verwenden.`)){markDeleted("members",m.id);selectedMemberId=null;saveLocal()}});
  $('[data-add-member-group]')?.addEventListener("click",()=>vp2AddGroupToMember(m));
};

function vp2HonorRows(honors=[]){return honors.map((h,i)=>`<div class="honor-edit-row" data-honor-row><input class="honor-title" value="${esc(h.title||"")}" placeholder="Ehrung"><input class="honor-date" type="date" value="${esc(h.date||"")}"><button class="icon-btn small danger-text" data-remove-honor type="button">×</button></div>`).join("")}
openMemberModal=function(rec=null){
  const r=rec||{memberNo:nextAvailableMemberNo(),firstName:"",lastName:"",birthDate:"",status:"active",entryDate:todayStr(),exitDate:"",deceasedDate:"",honorary:false,email:"",phone:"",address:"",emergencyName:"",emergencyPhone:"",guardian:"",groupIds:[],photoData:"",history:[],statusHistory:[],honors:[],notes:""};
  const assignedGroupIds=new Set((r.groupIds||[]).filter(id=>recordById("groups",id)));
  const initialGroupPills=[...assignedGroupIds].map(id=>`<span class="member-group-tag editable">${esc(groupName(id))}<button type="button" data-remove-member-group="${id}" aria-label="${esc(groupName(id))} entfernen">×</button></span>`).join("");
  showModal(rec?"Mitglied bearbeiten":"Neues Mitglied",`<div class="form-grid">
    <div class="form-section">Stammdaten</div>
    <label>Mitgliedsnummer<input id="mNo" value="${esc(r.memberNo)}"></label><label>Status<select id="mStatus">${["active","passive","exited","deceased"].map(s=>`<option value="${s}" ${r.status===s?"selected":""}>${statusLabel(s)}</option>`).join("")}</select></label>
    <label>Vorname<input id="mFirst" value="${esc(r.firstName)}"></label><label>Nachname<input id="mLast" value="${esc(r.lastName)}"></label><label>Geburtsdatum<input id="mBirth" type="date" value="${esc(r.birthDate||"")}"></label><label class="checkline"><input id="mHonorary" type="checkbox" ${r.honorary?"checked":""}> Ehrenmitglied</label><label class="full">Mitgliedsfoto<input id="mPhoto" type="file" accept="image/*"></label>
    <div class="form-section">Mitgliedschaft</div><label>Eintritt<input id="mEntry" type="date" value="${esc(r.entryDate||"")}"></label><label data-member-status-field="exited">Austritt<input id="mExit" type="date" value="${esc(r.exitDate||"")}"></label><label data-member-status-field="deceased">Sterbedatum<input id="mDeceased" type="date" value="${esc(r.deceasedDate||"")}"></label>
    <div class="full member-group-editor"><div class="member-group-editor-head"><b>Gruppen</b><small>Mehrere Gruppen können nacheinander hinzugefügt werden.</small></div><div class="member-group-tags" id="mGroupChips">${initialGroupPills||'<span class="member-group-empty">Noch keine Gruppe zugeordnet.</span>'}</div><div class="member-group-add-row"><select id="mGroupPicker"><option value="">Gruppe auswählen …</option></select><button class="btn secondary" id="mAddGroup" type="button">+ Gruppe hinzufügen</button></div></div>
    <div class="form-section">Kontakt</div><label>E-Mail<input id="mEmail" type="email" value="${esc(r.email||"")}"></label><label>Telefon<input id="mPhone" value="${esc(r.phone||"")}"></label><label class="full">Adresse<textarea id="mAddress" rows="2">${esc(r.address||"")}</textarea></label><label>Notfallkontakt<input id="mEmergencyName" value="${esc(r.emergencyName||"")}"></label><label>Notfall-Telefon<input id="mEmergencyPhone" value="${esc(r.emergencyPhone||"")}"></label><label class="full">Gesetzliche Vertretung<input id="mGuardian" value="${esc(r.guardian||"")}"></label>
    <div class="form-section">Verein</div><div class="full"><b>Ehrungen</b><div id="mHonorList">${vp2HonorRows(r.honors||[])}</div><button class="btn tiny secondary" id="mAddHonor" type="button">+ Ehrung</button></div>
    <div class="form-section">Notizen</div><label class="full"><textarea id="mNotes" rows="5">${esc(r.notes||"")}</textarea></label>
  </div>`,async()=>{
    const first=$("#mFirst").value.trim(),last=$("#mLast").value.trim();if(!first&&!last)return false;const no=$("#mNo").value.trim()||nextAvailableMemberNo();if(!memberNoAvailable(no,rec?.id||"")){alert(`Die Mitgliedsnummer ${no} ist bereits vergeben.`);return false}
    const birth=$("#mBirth").value,guardian=$("#mGuardian").value.trim();if(birth&&ageAt(birth)<18&&!guardian&&!confirm("Das Mitglied ist minderjährig, aber es ist keine gesetzliche Vertretung hinterlegt. Trotzdem speichern?"))return false;
    const target=rec||{id:uid(),createdAt:now(),history:[],statusHistory:[],honors:[]},oldStatus=target.status,oldGroups=new Set(target.groupIds||[]),oldHonors=(target.honors||[]).map(h=>`${h.title}|${h.date}`),photo=await readPhoto($("#mPhoto"),r.photoData||""),status=$("#mStatus").value,newGroups=[...assignedGroupIds],honors=$$('[data-honor-row]').map(row=>({title:row.querySelector('.honor-title').value.trim(),date:row.querySelector('.honor-date').value})).filter(h=>h.title);
    Object.assign(target,{memberNo:no,firstName:first,lastName:last,birthDate:birth,status,entryDate:$("#mEntry").value,exitDate:status==="exited"?($("#mExit").value||todayStr()):(target.exitDate||""),deceasedDate:status==="deceased"?($("#mDeceased").value||todayStr()):(target.deceasedDate||""),honorary:$("#mHonorary").checked,groupIds:newGroups,email:$("#mEmail").value.trim(),phone:$("#mPhone").value.trim(),address:$("#mAddress").value.trim(),emergencyName:$("#mEmergencyName").value.trim(),emergencyPhone:$("#mEmergencyPhone").value.trim(),guardian,photoData:photo,honors,notes:$("#mNotes").value.trim()});
    target.history=Array.isArray(target.history)?target.history:[];target.statusHistory=Array.isArray(target.statusHistory)?target.statusHistory:[];
    if(!rec&&target.entryDate)target.history.push({date:target.entryDate,note:"Vereinseintritt"});
    if(rec&&oldStatus!==status){target.statusHistory.push({date:todayStr(),note:`Status geändert: ${statusLabel(oldStatus)} → ${statusLabel(status)}`});target.history.push({date:todayStr(),note:`Status geändert: ${statusLabel(oldStatus)} → ${statusLabel(status)}`})}
    newGroups.filter(id=>!oldGroups.has(id)).forEach(id=>target.history.push({date:todayStr(),note:`Gruppe ${groupName(id)} beigetreten`}));[...oldGroups].filter(id=>!newGroups.includes(id)).forEach(id=>target.history.push({date:todayStr(),note:`Gruppe ${groupName(id)} beendet`}));
    honors.filter(h=>!oldHonors.includes(`${h.title}|${h.date}`)).forEach(h=>target.history.push({date:h.date||todayStr(),note:`Ehrung erhalten: ${h.title}`}));touch(target);if(!rec){db.members.push(target);selectedMemberId=target.id}db.counters.memberNo=Number(nextAvailableMemberNo())||1;saveLocal();return true
  });
  function renderGroupEditor(){
    const chips=$("#mGroupChips"),picker=$("#mGroupPicker");if(!chips||!picker)return;
    chips.innerHTML=assignedGroupIds.size?[...assignedGroupIds].map(id=>`<span class="member-group-tag editable">${esc(groupName(id))}<button type="button" data-remove-member-group="${id}" aria-label="${esc(groupName(id))} entfernen">×</button></span>`).join(""):'<span class="member-group-empty">Noch keine Gruppe zugeordnet.</span>';
    const available=vp2CurrentGroups().filter(g=>!assignedGroupIds.has(g.id));picker.innerHTML=`<option value="">${available.length?"Gruppe auswählen …":"Keine weitere Gruppe verfügbar"}</option>${available.map(g=>`<option value="${g.id}">${esc(g.name)}</option>`).join("")}`;picker.disabled=!available.length;$("#mAddGroup").disabled=!available.length;
    $$('[data-remove-member-group]').forEach(b=>b.onclick=()=>{assignedGroupIds.delete(b.dataset.removeMemberGroup);renderGroupEditor()});
  }
  $("#mAddGroup")?.addEventListener("click",()=>{const id=$("#mGroupPicker").value;if(!id)return;assignedGroupIds.add(id);renderGroupEditor()});renderGroupEditor();
  function bindHonors(){ $$('[data-remove-honor]').forEach(b=>b.onclick=()=>b.closest('[data-honor-row]').remove()) }
  $("#mAddHonor")?.addEventListener("click",()=>{$("#mHonorList").insertAdjacentHTML("beforeend",vp2HonorRows([{title:"",date:""}]));bindHonors()});bindHonors();
  const showStatus=()=>{$$('[data-member-status-field]').forEach(el=>el.style.display=el.dataset.memberStatusField===$("#mStatus").value?"block":"none")};$("#mStatus")?.addEventListener("change",showStatus);showStatus();
};


/* ---------- Groups & Functions ---------- */
function vp2GroupMembers(groupId){return activeRows("members").filter(m=>m.status!=="exited"&&(m.groupIds||[]).includes(groupId))}
function vp2FunctionStateBadge(f){const state=functionState(f);return `<span class="function-state ${state}">${esc(functionStateLabel(f))}</span>${!f.memberId?'<span class="function-state vacant">Unbesetzt</span>':""}`}
function vp2FunctionPeriodText(f){const start=f.startDate?fmtDate(f.startDate):"Beginn offen",end=f.endDate?fmtDate(f.endDate):"offen";return `${start} – ${end}`}
function vp2FunctionListRow(f,{showGroup=true,compact=false}={}){
  const member=f.memberId?byId("members",f.memberId):null,state=functionState(f);
  return `<div class="function-list-row ${state} ${compact?"compact":""}">
    <div class="function-list-main"><div class="function-list-title"><b>${esc(f.title)}</b>${vp2FunctionStateBadge(f)}</div>${showGroup?`<small>${esc(groupName(f.groupId))}</small>`:""}</div>
    <div class="function-list-meta"><small>Besetzung</small><span>${esc(member?memberFullName(member):"Nicht besetzt")}</span></div>
    <div class="function-list-meta"><small>Zeitraum</small><span>${esc(vp2FunctionPeriodText(f))}</span></div>
    <div class="function-list-actions"><button class="btn tiny secondary" type="button" data-edit-function="${f.id}">Bearbeiten</button>${compact?"":`<button class="btn tiny danger" type="button" data-deactivate-function="${f.id}">${f.memberId||f.startDate?"Deaktivieren":"Löschen"}</button>`}</div>
  </div>`
}
renderGroups=function(){
  const groups=vp2CurrentGroups().slice().sort((a,b)=>String(a.name||"").localeCompare(String(b.name||""),"de"));
  if(!selectedGroupId||!recordById("groups",selectedGroupId)||recordById("groups",selectedGroupId)?.inactiveAt)selectedGroupId=groups[0]?.id||null;
  const badge=$("#groupCountBadge");if(badge)badge.textContent=`${groups.length} ${groups.length===1?"Gruppe":"Gruppen"}`;
  $("#groupTree").innerHTML=groups.length?groups.map(g=>{const count=vp2GroupMembers(g.id).length;return `<button class="group-list-row ${g.id===selectedGroupId?"active":""}" data-group-node="${g.id}" type="button"><span class="group-list-copy"><b>${esc(g.name)}</b>${g.description?`<small>${esc(g.description)}</small>`:""}</span><span class="group-member-count">${count} ${count===1?"Mitglied":"Mitglieder"}</span></button>`}).join(""):'<div class="empty">Noch keine Gruppen.</div>';
  $$('[data-group-node]').forEach(b=>b.onclick=()=>{selectedGroupId=b.dataset.groupNode;renderGroups()});renderGroupDetail();renderFunctionOverview();
};
renderGroupDetail=function(){
  const g=recordById("groups",selectedGroupId),host=$("#groupDetail");
  $("#editGroupBtn").disabled=!g;$("#deleteGroupBtn").disabled=!g;
  if(!g){$("#groupDetailTitle").textContent="Gruppendetails";host.innerHTML='<div class="empty">Gruppe auswählen.</div>';return}
  const members=vp2GroupMembers(g.id),funcs=activeRows("functions").filter(f=>f.groupId===g.id&&!f.inactiveAt).sort((a,b)=>String(a.title||"").localeCompare(String(b.title||""),"de"));
  $("#groupDetailTitle").textContent=g.name;
  host.innerHTML=`${g.description?`<div class="group-detail-description">${esc(g.description)}</div>`:""}
    <section class="group-detail-section"><div class="group-detail-section-head"><h3>Funktionen</h3><span>${funcs.length}</span></div><div class="group-function-list">${funcs.length?funcs.map(f=>vp2FunctionListRow(f,{showGroup:false,compact:true})).join(""):'<div class="empty compact">Keine Funktionen zugeordnet.</div>'}</div></section>
    <section class="group-detail-section"><div class="group-detail-section-head"><h3>Mitglieder</h3><span>${members.length}</span></div><div class="team-list group-member-list">${members.length?members.map(m=>`<button class="person-pill" data-group-member="${m.id}" type="button">${esc(memberFullName(m))}</button>`).join(""):'<span class="mini-meta">Keine Mitglieder zugeordnet.</span>'}</div></section>`;
  $("#deleteGroupBtn").textContent=members.length||funcs.length?"Deaktivieren":"Löschen";
  $$('[data-edit-function]').forEach(b=>b.onclick=()=>openFunctionModal(byId("functions",b.dataset.editFunction)));
  $$('[data-group-member]').forEach(b=>b.onclick=()=>{selectedMemberId=b.dataset.groupMember;go("members");renderMembers()});
};
renderFunctionOverview=function(){
  const q=($("#functionSearch")?.value||"").trim().toLowerCase(),filter=$("#functionStatusFilter")?.value||"",order={active:0,upcoming:1,former:2};
  const rows=activeRows("functions").filter(f=>!f.inactiveAt).filter(f=>{const m=f.memberId?byId("members",f.memberId):null,state=functionState(f);return(!q||`${f.title||""} ${groupName(f.groupId)} ${m?memberFullName(m):""}`.toLowerCase().includes(q))&&(!filter||(filter==="vacant"?!f.memberId:state===filter))}).sort((a,b)=>(order[functionState(a)]-order[functionState(b)])||String(a.title||"").localeCompare(String(b.title||""),"de"));
  const badge=$("#functionCountBadge");if(badge)badge.textContent=`${rows.length} ${rows.length===1?"Funktion":"Funktionen"}`;
  $("#functionOverviewList").innerHTML=rows.length?rows.map(f=>vp2FunctionListRow(f)).join(""):'<div class="empty">Keine Funktionen vorhanden.</div>';
  $$('[data-edit-function]').forEach(b=>b.onclick=()=>openFunctionModal(byId("functions",b.dataset.editFunction)));
  $$('[data-deactivate-function]').forEach(b=>b.onclick=()=>{const f=byId("functions",b.dataset.deactivateFunction);if(!f)return;if(f.memberId||f.startDate){if(confirm(`Funktion „${f.title}“ deaktivieren? Historische Daten bleiben erhalten.`)){f.inactiveAt=now();if(!f.endDate)f.endDate=todayStr();touch(f);saveLocal()}}else if(confirm(`Funktion „${f.title}“ in den Papierkorb verschieben?`)){markDeleted("functions",f.id);saveLocal()}});
};
openGroupModal=function(rec=null){const r=rec||{name:"",description:""};showModal(rec?"Gruppe bearbeiten":"Neue Gruppe",`<div class="form-grid"><label class="full">Gruppenname<input id="gName" value="${esc(r.name||"")}"></label><label class="full">Beschreibung<textarea id="gDescription" rows="4">${esc(r.description||"")}</textarea></label></div>`,()=>{const name=$("#gName").value.trim();if(!name)return false;const t=rec||{id:uid(),createdAt:now()};Object.assign(t,{name,description:$("#gDescription").value.trim(),type:"Gruppe",parentId:"",autoRule:{enabled:false,status:"",ageMin:"",ageMax:""}});delete t.inactiveAt;touch(t);if(!rec){db.groups.push(t);selectedGroupId=t.id}saveLocal();return true})};
deleteSelectedGroup=function(){const g=recordById("groups",selectedGroupId);if(!g)return;const used=vp2GroupMembers(g.id).length+activeRows("functions").filter(f=>f.groupId===g.id).length+activeRows("tasks").filter(t=>t.groupId===g.id).length+activeRows("events").filter(e=>e.groupId===g.id).length;if(used){if(confirm(`Die Gruppe „${g.name}“ wird noch verwendet.\n\nGruppe deaktivieren? Bestehende Zuordnungen bleiben historisch erhalten.`)){g.inactiveAt=now();touch(g);selectedGroupId=null;saveLocal()}}else if(confirm(`Gruppe „${g.name}“ in den Papierkorb verschieben?`)){markDeleted("groups",g.id);selectedGroupId=null;saveLocal()}};
openFunctionModal=function(rec=null,groupId=""){
  const r=rec||{title:"",groupId:groupId||selectedGroupId||"",memberId:"",startDate:todayStr(),endDate:"",notes:""};
  showModal(rec?"Funktion bearbeiten":"Neue Funktion",`<div class="form-grid"><label class="full">Funktion / Amt<input id="fnTitle" value="${esc(r.title||"")}" placeholder="z. B. 1. Vorsitzender, Kassierer, Jugendleiter"></label><label>Gruppe<select id="fnGroup">${groupOptions(r.groupId)}</select></label><label>Mitglied<select id="fnMember">${memberOptions(r.memberId)}</select></label><label>Beginn<input id="fnStart" type="date" value="${esc(r.startDate||"")}"></label><label>Ende<input id="fnEnd" type="date" value="${esc(r.endDate||"")}"></label><label class="full">Notizen<textarea id="fnNotes" rows="3">${esc(r.notes||"")}</textarea></label></div>`,()=>{const title=$("#fnTitle").value.trim(),gid=$("#fnGroup").value,start=$("#fnStart").value,end=$("#fnEnd").value;if(!title||!gid){alert("Bitte Funktion und Gruppe angeben.");return false}if(start&&end&&end<start){alert("Das Ende darf nicht vor dem Beginn liegen.");return false}const t=rec||{id:uid(),createdAt:now()},oldMember=t.memberId,oldEnd=t.endDate;Object.assign(t,{title,kind:"Funktion",groupId:gid,memberId:$("#fnMember").value,startDate:start,endDate:end,notes:$("#fnNotes").value.trim()});delete t.inactiveAt;touch(t);if(!rec)db.functions.push(t);if(t.memberId&&(!rec||oldMember!==t.memberId)){const m=byId("members",t.memberId);if(m){m.history=m.history||[];m.history.push({date:start||todayStr(),note:`Funktion übernommen: ${title} · ${groupName(gid)}`});touch(m)}}if(rec&&oldMember&&oldMember!==t.memberId){const m=byId("members",oldMember);if(m){m.history=m.history||[];m.history.push({date:todayStr(),note:`Funktion beendet: ${title} · ${groupName(gid)}`});touch(m)}}if(rec&&oldEnd!==end&&end&&t.memberId){const m=byId("members",t.memberId);if(m){m.history=m.history||[];m.history.push({date:end,note:`Funktion beendet: ${title} · ${groupName(gid)}`});touch(m)}}saveLocal();return true})
};

/* ---------- Finance read-only import ---------- */
const vp2Euro=new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"});
function vp2ValidateFinanceSnapshot(x){
  if(!x||typeof x!=="object")throw new Error("Die Datei enthält keine gültigen Finanzdaten.");if(x.kind!=="vplaner-finance-snapshot"||x.source!=="KassenKumpel")throw new Error("Diese Datei ist keine gültige KassenKumpel-Exportdatei.");if(Number(x.schemaVersion)!==1)throw new Error("Diese Exportversion wird vom V-Planer nicht unterstützt.");if(!Number.isInteger(Number(x.businessYear)))throw new Error("Das Geschäftsjahr fehlt oder ist ungültig.");if(!x.generatedAt||Number.isNaN(new Date(x.generatedAt).getTime()))throw new Error("Der Datenstand ist ungültig.");for(const v of [x.balances?.bank,x.balances?.cash,x.balances?.total,x.yearToDate?.income,x.yearToDate?.expenses,x.yearToDate?.result])if(typeof v!=="number"||!Number.isFinite(v))throw new Error("Die Finanzdaten sind unvollständig oder enthalten ungültige Zahlen.");return x;
}
async function vp2ImportFinanceFile(file){const text=await file.text();let data;try{data=JSON.parse(text)}catch{throw new Error("Die ausgewählte Datei ist keine gültige JSON-Datei.")}vp2ValidateFinanceSnapshot(data);const exists=db.financeSnapshots.some(s=>(data.exportId&&s.exportId===data.exportId)||(!data.exportId&&s.generatedAt===data.generatedAt&&s.businessYear===data.businessYear));if(exists){alert("Dieser Finanzstand wurde bereits importiert.");return}db.financeSnapshots.push(data);db.financeSnapshots.sort((a,b)=>String(a.generatedAt).localeCompare(String(b.generatedAt)));saveLocal();alert(`Finanzdaten erfolgreich aktualisiert.\n\nDatenstand: ${new Date(data.generatedAt).toLocaleString("de-DE")}`)}
function renderFinanceReadOnly(){
  const rows=(db.financeSnapshots||[]).slice().sort((a,b)=>String(b.generatedAt).localeCompare(String(a.generatedAt))),latest=rows[0];
  const ids={financeTotal:latest?.balances?.total,financeBank:latest?.balances?.bank,financeCash:latest?.balances?.cash,financeIncome:latest?.yearToDate?.income,financeExpenses:latest?.yearToDate?.expenses,financeResult:latest?.yearToDate?.result};Object.entries(ids).forEach(([id,v])=>{const el=$("#"+id);if(el)el.textContent=typeof v==="number"?vp2Euro.format(v):"—"});
  ["financeIncomeYear","financeExpensesYear","financeResultYear"].forEach(id=>{const el=$("#"+id);if(el)el.textContent=latest?`Geschäftsjahr ${latest.businessYear}`:"Laufendes Geschäftsjahr"});
  const state=$("#financeDataState");if(state){if(!latest)state.textContent="Noch keine KassenKumpel-Daten importiert.";else{const age=Math.floor((Date.now()-new Date(latest.generatedAt).getTime())/86400000);state.textContent=`Datenstand: ${new Date(latest.generatedAt).toLocaleString("de-DE")} · Quelle: KassenKumpel${age>45?" · ⚠ Daten älter als 45 Tage":""}`}}
  const h=$("#financeHistory");if(h)h.innerHTML=rows.length?rows.slice(0,24).map(s=>`<div class="finance-history-row"><div><b>${esc(String(s.businessYear))}</b><small>${new Date(s.generatedAt).toLocaleString("de-DE")}</small></div><span>${vp2Euro.format(s.balances.total)}</span><span>Einnahmen ${vp2Euro.format(s.yearToDate.income)}</span><span>Ausgaben ${vp2Euro.format(s.yearToDate.expenses)}</span></div>`).join(""):'<div class="empty">Noch keine Finanzstände importiert.</div>';
}

/* ---------- Settings ---------- */
function vp2ApplyAppearance(){const mode=db.settings.appearance||"system",dark=mode==="dark"||(mode==="system"&&window.matchMedia?.("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.v2Theme=dark?"dark":"light";document.body?.classList.toggle("vp2-dark",dark)}
renderSettings=function(){
  const c=db.settings.clubData||defaultDB().settings.clubData;$("#v2TaskDefault").value=db.settings.taskDefaultView||"list";$("#v2CalendarDefault").value=db.settings.calendarDefaultView||"month";$("#v2Appearance").value=db.settings.appearance||"system";$("#v2Scale").value=db.settings.uiScale||100;$("#v2ScaleLabel").textContent=`${db.settings.uiScale||100}%`;$("#v2ClubName").value=db.settings.clubName||"";$("#v2ClubShortName").value=c.shortName||"";$("#v2ClubFounded").value=c.foundedDate||"";$("#v2ClubEmail").value=c.contact?.email||"";$("#v2ClubPhone").value=c.contact?.phone||"";$("#v2ClubStreet").value=c.address?.street||"";$("#v2ClubZip").value=c.address?.zip||"";$("#v2ClubCity").value=c.address?.city||"";if($("#v2CalendarSyncEnabled"))$("#v2CalendarSyncEnabled").checked=db.settings.calendarSyncEnabled===true;vp2ApplyAppearance()
};
function vp2SaveSettings(){
  const c=db.settings.clubData||defaultDB().settings.clubData,wasCalendarEnabled=db.settings.calendarSyncEnabled===true;db.settings.taskDefaultView=$("#v2TaskDefault").value;db.settings.calendarDefaultView=$("#v2CalendarDefault").value;db.settings.appearance=$("#v2Appearance").value;db.settings.uiScale=Number($("#v2Scale").value)||100;db.settings.calendarSyncEnabled=$("#v2CalendarSyncEnabled")?.checked===true;db.settings.clubName=$("#v2ClubName").value.trim();db.settings.clubData={...c,shortName:$("#v2ClubShortName").value.trim(),foundedDate:$("#v2ClubFounded").value,address:{...(c.address||{}),street:$("#v2ClubStreet").value.trim(),zip:$("#v2ClubZip").value.trim(),city:$("#v2ClubCity").value.trim()},contact:{...(c.contact||{}),email:$("#v2ClubEmail").value.trim(),phone:$("#v2ClubPhone").value.trim()}};db.settingsUpdatedAt=now();saveCalendarPrefs({enabled:db.settings.calendarSyncEnabled});if(!db.settings.calendarSyncEnabled){clearTimeout(calendarSyncTimer)}else if(!wasCalendarEnabled&&hasUsableCalendarToken())scheduleCalendarAutoSync();applyUiScale(db.settings.uiScale);vp2ApplyAppearance();saveLocal({autoCalendar:false});renderDashboardStorage();alert("Einstellungen gespeichert.")
}
buildBackupPayload=function(){return {format:"V-Planer-Backup",backupVersion:2,appVersion:VP2_VERSION,exportedAt:now(),data:db}};

/* ---------- Search and Trash cleanup ---------- */
globalSearch=function(query){const q=String(query||"").trim().toLowerCase();if(q.length<2)return[];const tokens=q.split(/\s+/).filter(Boolean),types=["task","project","event","member","group","function","fine"],results=[];types.forEach(type=>{const meta=LINK_TYPE_META[type];activeRows(meta.collection).forEach(r=>{const hay=globalSearchText(type,r).toLowerCase();if(tokens.every(t=>hay.includes(t)))results.push({type,id:r.id,record:r})})});return results};
renderGlobalSearch=function(){const input=$("#globalSearchInput"),box=$("#globalSearchResults"),q=input?.value||"";if(!box)return;if(q.trim().length<2){box.hidden=true;box.innerHTML="";return}const rows=globalSearch(q),types=["task","project","event","member","group","function","fine"],groups=types.map(type=>({type,rows:rows.filter(r=>r.type===type).slice(0,6)})).filter(x=>x.rows.length);box.innerHTML=groups.length?groups.map(g=>`<div class="global-search-group"><div class="global-search-group-title">${esc(LINK_TYPE_META[g.type].plural)}</div>${g.rows.map(x=>`<button class="global-search-hit" type="button" data-global-result="${x.type}" data-global-id="${x.id}"><span class="global-search-hit-icon">${LINK_TYPE_META[x.type].icon}</span><span class="global-search-hit-copy"><b>${esc(linkRecordTitle(x.type,x.record))}</b><small>${esc(linkRecordSubtitle(x.type,x.record))}</small></span></button>`).join("")}</div>`).join(""):`<div class="global-search-empty">Keine Treffer für „${esc(q)}“.</div>`;box.hidden=false};
deletedTrashRows=function(){const allowed=["tasks","projects","events","members","groups","functions","fines"],rows=[];allowed.forEach(c=>(db[c]||[]).filter(r=>r.deletedAt&&!r.purgedAt).forEach(r=>{if(r.trashRootType==="project"&&c!=="projects")return;rows.push({collection:c,record:r})}));return rows.sort((a,b)=>String(b.record.deletedAt||"").localeCompare(String(a.record.deletedAt||"")))};

/* ---------- Master render + bindings ---------- */
renderAll=function(){applyModuleVisibility();renderDashboard();renderTasks();renderProjects();renderCalendar();renderYear();renderArchive();renderFinanceReadOnly();renderFines();renderMembers();renderGroups();renderTrash();renderSettings();requestAnimationFrame(()=>{vp2ApplyTaskView();vp2ApplyCalendarMode()})};

// One-time UI bindings for 2.0
// Some controls existed in 1.8.0 and already had anonymous listeners attached.
// Clone those nodes once so the 2.0 behavior is not executed in parallel with legacy handlers.
function vp2Fresh(id){const old=$("#"+id);if(!old)return null;const fresh=old.cloneNode(true);old.replaceWith(fresh);return fresh}
const vp2PrevMonth=vp2Fresh("prevMonth"),vp2NextMonth=vp2Fresh("nextMonth"),vp2TodayMonth=vp2Fresh("todayMonth");
const vp2SyncTop=vp2Fresh("syncBtn");
const vp2EditGroup=vp2Fresh("editGroupBtn"),vp2DeleteGroup=vp2Fresh("deleteGroupBtn");
const vp2NewFunction=vp2Fresh("newFunctionBtn"),vp2NewFunctionOverview=vp2Fresh("newFunctionOverviewBtn");
const vp2FunctionSearch=vp2Fresh("functionSearch"),vp2FunctionStatus=vp2Fresh("functionStatusFilter");
$("#taskListModeBtn")?.addEventListener("click",()=>vp2SetTaskView("list"));$("#taskKanbanModeBtn")?.addEventListener("click",()=>vp2SetTaskView("kanban"));
$$('[data-calendar-mode]').forEach(b=>b.onclick=()=>vp2SetCalendarMode(b.dataset.calendarMode));
vp2CalendarMode=localStorage.getItem(VP2_CAL_VIEW_KEY)||db.settings.calendarDefaultView||"month";
[$("#calendarTypeFilter"),$("#calendarProjectFilter"),$("#calendarGroupFilter")].filter(Boolean).forEach(el=>el.addEventListener("change",renderCalendar));
vp2PrevMonth.onclick=()=>{if(vp2CalendarMode==="day")calDate=new Date(calDate.getFullYear(),calDate.getMonth(),calDate.getDate()-1);else if(vp2CalendarMode==="week")calDate=new Date(calDate.getFullYear(),calDate.getMonth(),calDate.getDate()-7);else calDate=new Date(calDate.getFullYear(),calDate.getMonth()-1,1);renderCalendar()};
vp2NextMonth.onclick=()=>{if(vp2CalendarMode==="day")calDate=new Date(calDate.getFullYear(),calDate.getMonth(),calDate.getDate()+1);else if(vp2CalendarMode==="week")calDate=new Date(calDate.getFullYear(),calDate.getMonth(),calDate.getDate()+7);else calDate=new Date(calDate.getFullYear(),calDate.getMonth()+1,1);renderCalendar()};
vp2TodayMonth.onclick=()=>{calDate=new Date();renderCalendar()};
$$('[data-year-filter]').forEach(b=>b.onclick=()=>{vp2YearFilter=b.dataset.yearFilter;renderYear()});
$("#saveYearNoteBtn")?.addEventListener("click",()=>{const y=calDate.getFullYear();db.settings.yearNotes=db.settings.yearNotes||{};db.settings.yearNotes[y]=$("#yearNote").value.trim();saveLocal();alert("Jahresnotiz gespeichert.")});
$("#archiveSearch")?.addEventListener("input",renderArchive);$("#archiveTypeFilter")?.addEventListener("change",renderArchive);$("#archiveYearFilter")?.addEventListener("change",renderArchive);
$("#financeImportBtn")?.addEventListener("click",()=>$("#financeImportInput").click());$("#financeImportInput")?.addEventListener("change",async e=>{const file=e.target.files?.[0];if(!file)return;try{await vp2ImportFinanceFile(file)}catch(err){alert(`Import nicht möglich:\n${err.message}`)}finally{e.target.value=""}});
$("#dashboardSyncBtn")?.addEventListener("click",()=>vp2SyncAllGoogle());if(vp2SyncTop)vp2SyncTop.onclick=()=>vp2SyncAllGoogle();
$$('[data-settings-v2]').forEach(b=>b.onclick=()=>{$$('[data-settings-v2]').forEach(x=>x.classList.toggle("active",x===b));$$('[data-settings-v2-panel]').forEach(x=>x.classList.toggle("active",x.dataset.settingsV2Panel===b.dataset.settingsV2))});
$("#v2Scale")?.addEventListener("input",()=>{$("#v2ScaleLabel").textContent=`${$("#v2Scale").value}%`;applyUiScale($("#v2Scale").value)});$("#v2ScaleReset")?.addEventListener("click",()=>{$("#v2Scale").value=100;$("#v2ScaleLabel").textContent="100%";applyUiScale(100)});$("#v2SaveSettings")?.addEventListener("click",vp2SaveSettings);$("#v2BackupExport")?.addEventListener("click",()=>exportFullBackup());$("#v2BackupImport")?.addEventListener("click",()=>$("#backupImportInput").click());
$("#v2DisconnectGoogle")?.addEventListener("click",()=>{if(!confirm("Google-Verbindungen auf diesem Gerät trennen?"))return;accessToken="";tokenExpiresAt=0;accessTokenHasCalendarScope=false;localStorage.removeItem(DRIVE_GRANT_KEY);disconnectGoogleCalendar();renderDashboardStorage()});
if(vp2EditGroup)vp2EditGroup.onclick=()=>{const g=recordById("groups",selectedGroupId);if(g)openGroupModal(g)};if(vp2DeleteGroup)vp2DeleteGroup.onclick=deleteSelectedGroup;
if(vp2NewFunction)vp2NewFunction.onclick=()=>openFunctionModal(null,selectedGroupId||"");if(vp2NewFunctionOverview)vp2NewFunctionOverview.onclick=()=>openFunctionModal(null,selectedGroupId||"");
if(vp2FunctionSearch)vp2FunctionSearch.oninput=renderFunctionOverview;if(vp2FunctionStatus)vp2FunctionStatus.onchange=renderFunctionOverview;


/* ---------- V-Planer 2.0.9: Mehrtaegiger Termin mit zugeordneten Projekten ---------- */
function vp209ParentEventForProject(project){
  if(!project?.parentEventId)return null;
  const e=recordById("events",project.parentEventId);
  return e&&!e.deletedAt?e:null;
}
function vp209ProjectsForEvent(eventId){
  return allRows("projects").filter(p=>!p.deletedAt&&p.parentEventId===eventId).sort((a,b)=>{
    const da=a.eventDate||"9999-99-99",dbb=b.eventDate||"9999-99-99";
    return da.localeCompare(dbb)||String(a.eventStartTime||"").localeCompare(String(b.eventStartTime||""))||String(a.name||"").localeCompare(String(b.name||""),"de");
  });
}
function vp209ParentEventOptions(selected=""){
  const rows=allRows("events").filter(e=>!e.deletedAt).slice().sort((a,b)=>eventStartDate(a).localeCompare(eventStartDate(b))||String(a.title||"").localeCompare(String(b.title||""),"de"));
  return `<option value="">Kein Termin</option>${rows.map(e=>`<option value="${e.id}" ${e.id===selected?"selected":""}>${esc(e.title||"Termin")} · ${esc(eventDateRangeText(e))}</option>`).join("")}`;
}
function vp209ProjectEventTimeText(project){
  const start=project?.eventStartTime||"",end=project?.eventEndTime||"";
  if(start&&end)return `${start} – ${end} Uhr`;
  if(start)return `${start} Uhr`;
  return "";
}

/* V-Planer 2.1.4: Projekte nach Faelligkeit, am selben Tag nach Termin-Von-Uhrzeit */
function vp214ProjectDueDate(project){
  return projectEndDate(project)||project?.eventDate||projectStartDate(project)||"";
}
function vp214ProjectStartTimeForSort(project,sortDate=""){
  const time=String(project?.eventStartTime||"");
  if(!time)return "99:99";
  const eventDate=String(project?.eventDate||"");
  // Die Terminzeit ist nur fuer den zugeordneten Projekttag aussagekraeftig.
  if(sortDate&&eventDate&&eventDate!==sortDate)return "99:99";
  return time;
}
function vp214CompareProjectsByDue(a,b){
  const da=vp214ProjectDueDate(a)||"9999-99-99",dbb=vp214ProjectDueDate(b)||"9999-99-99";
  if(da!==dbb)return da.localeCompare(dbb);
  const ta=vp214ProjectStartTimeForSort(a,da),tb=vp214ProjectStartTimeForSort(b,dbb);
  if(ta!==tb)return ta.localeCompare(tb);
  return String(a?.name||"").localeCompare(String(b?.name||""),"de");
}
function vp209ProjectParentSummary(project){
  const e=vp209ParentEventForProject(project);
  if(!e)return "";
  const bits=[e.title||"Termin",project.eventDate?fmtDate(project.eventDate):eventDateRangeText(e),vp209ProjectEventTimeText(project)].filter(Boolean);
  return bits.join(" · ");
}
function vp209ProjectEventDayLabel(ds){
  if(!ds)return "Ohne Tag";
  const d=new Date(`${ds}T12:00:00`);
  const weekday=new Intl.DateTimeFormat("de-DE",{weekday:"long"}).format(d);
  return `${weekday}, ${fmtDate(ds)}`;
}
function vp209AssignedProjectsHTML(event){
  const projects=vp209ProjectsForEvent(event.id);
  if(!projects.length)return '<div class="event-projects-empty">Noch keine Projekte zugeordnet.</div>';
  const groups=[];
  projects.forEach(p=>{
    const key=p.eventDate||"";
    let g=groups.find(x=>x.key===key);
    if(!g){g={key,items:[]};groups.push(g)}
    g.items.push(p);
  });
  return groups.map(g=>`<div class="event-project-day-group"><div class="event-project-day-title">${esc(vp209ProjectEventDayLabel(g.key))}</div><div class="event-project-list">${g.items.map(p=>`<button class="event-project-assignment" type="button" data-event-assigned-project="${p.id}"><span class="event-project-assignment-main"><b>${esc(p.name||"Projekt")}</b><small>${esc([vp209ProjectEventTimeText(p),groupName(p.groupId)].filter(x=>x&&x!=="Gesamtverein"&&x!=="—").join(" · ")||"Projekt")}</small></span><span class="event-project-assignment-status">${esc(statusLabel(p.status))}${p.archivedAt?" · archiviert":""}</span><span class="event-project-assignment-chevron">›</span></button>`).join("")}</div></div>`).join("");
}

openProjectModal=function(rec=null,preset={}){
  if(typeof preset!=="object"||preset===null)preset={};
  const r=rec||{name:"",startDate:"",endDate:"",status:"planned",groupId:"",description:"",notes:"",parentEventId:preset.parentEventId||"",eventDate:preset.eventDate||"",eventStartTime:"",eventEndTime:""};
  const st=rec?projectTaskStats(rec.id):{total:0,done:0,progress:0};
  const selectedParent=r.parentEventId||preset.parentEventId||"";
  showModal(rec?"Projekt bearbeiten":"Neues Projekt",`<div class="form-grid">
    <label class="full">Projektname<input id="fName" value="${esc(r.name||"")}"></label>
    <div class="form-section">Organisationszeitraum</div>
    <label>Projektbeginn<input id="fProjectStartDate" type="date" value="${esc(projectStartDate(r))}"></label>
    <label>Projektende<input id="fProjectEndDate" type="date" value="${esc(projectEndDate(r))}"></label>
    <label>Status<select id="fStatus">${["planned","active","closed"].map(s=>`<option value="${s}" ${r.status===s?"selected":""}>${statusLabel(s)}</option>`).join("")}</select></label>
    <label>Gruppe<select id="fGroup">${groupOptions(r.groupId)}</select></label>
    ${rec?`<div class="project-modal-progress full"><b>${st.total?`${st.progress}% Fortschritt`:"Noch keine Aufgaben vorhanden"}</b>${st.total?`<span>${st.done} von ${st.total} Aufgaben erledigt</span><div class="progress"><span style="width:${st.progress}%"></span></div>`:""}</div>`:""}
    <label class="full">Beschreibung<textarea id="fDescription" rows="4">${esc(r.description||"")}</textarea></label>
    <div class="form-section">Termin</div>
    <label class="full">Termin<select id="fParentEvent">${vp209ParentEventOptions(selectedParent)}</select></label>
    <label>Tag<input id="fParentEventDate" type="date" value="${esc(r.eventDate||preset.eventDate||"")}"></label>
    <label>Von<input id="fParentEventStartTime" type="time" value="${esc(r.eventStartTime||"")}"></label>
    <label>Bis<input id="fParentEventEndTime" type="time" value="${esc(r.eventEndTime||"")}"></label>
    <div class="form-note full parent-event-note" id="fParentEventHint"></div>
    <label class="full">Notizen<textarea id="fProjectNotes" rows="5">${esc(r.notes||"")}</textarea></label>
  </div>`,()=>{
    const name=$("#fName").value.trim();if(!name)return false;
    let start=$("#fProjectStartDate").value,end=$("#fProjectEndDate").value;
    if(!start&&end)start=end;if(start&&!end)end=start;
    if(start&&end&&end<start){alert("Das Projektende darf nicht vor dem Projektbeginn liegen.");return false}
    const parentEventId=$("#fParentEvent").value,eventDate=$("#fParentEventDate").value,eventStartTime=$("#fParentEventStartTime").value,eventEndTime=$("#fParentEventEndTime").value;
    const parentEvent=parentEventId?recordById("events",parentEventId):null;
    if(parentEventId&&!parentEvent){alert("Der ausgewählte Termin ist nicht mehr vorhanden.");return false}
    if(parentEvent){
      const ps=eventStartDate(parentEvent),pe=eventEndDate(parentEvent)||ps;
      if(!eventDate){alert("Bitte einen Tag innerhalb des ausgewählten Termins festlegen.");return false}
      if(eventDate<ps||eventDate>pe){alert(`Der Projekttag muss innerhalb des Termins ${eventDateRangeText(parentEvent)} liegen.`);return false}
      if(eventStartTime&&eventEndTime&&eventEndTime<=eventStartTime){alert("Die Bis-Uhrzeit muss nach der Von-Uhrzeit liegen.");return false}
    }
    const target=rec||{id:uid(),createdAt:now()},oldStatus=target.status;
    Object.assign(target,{name,startDate:start,endDate:end,due:end||start||"",status:$("#fStatus").value,groupId:$("#fGroup").value,description:$("#fDescription").value.trim(),notes:$("#fProjectNotes").value.trim(),parentEventId:parentEventId||"",eventDate:parentEventId?eventDate:"",eventStartTime:parentEventId?eventStartTime:"",eventEndTime:parentEventId?eventEndTime:""});
    if(target.status==="closed"&&oldStatus!=="closed")target.completedAt=now();if(target.status!=="closed")delete target.completedAt;
    touch(target);if(!rec)db.projects.push(target);saveLocal();return true;
  });
  const syncParentEventFields=()=>{
    const select=$("#fParentEvent"),date=$("#fParentEventDate"),start=$("#fParentEventStartTime"),end=$("#fParentEventEndTime"),hint=$("#fParentEventHint");
    const e=select?.value?recordById("events",select.value):null;
    const enabled=!!e;[date,start,end].forEach(x=>{if(x)x.disabled=!enabled});
    if(!e){if(hint)hint.textContent="Optional: Ein Projekt kann einem übergeordneten Termin zugeordnet werden.";return}
    const es=eventStartDate(e),ee=eventEndDate(e)||es;
    date.min=es;date.max=ee;
    if(!date.value||date.value<es||date.value>ee)date.value=es;
    if(hint)hint.textContent=`${e.title} · ${eventDateRangeText(e)}${e.location?` · ${e.location}`:""}`;
  };
  $("#fParentEvent")?.addEventListener("change",syncParentEventFields);syncParentEventFields();
};

showProjectDetails=function(p){
  const current=recordById("projects",p?.id);if(!current)return;
  const dlg=$("#detailModal"),readonly=!!current.archivedAt||current.status==="closed",st=projectTaskStats(current.id),tasks=projectTasks(current.id),events=vp2ProjectEvents(current.id),next=vp2ProjectNextEvent(current.id),parentEvent=vp209ParentEventForProject(current);
  $("#detailTitle").textContent=current.name||"Projekt";
  $("#detailBody").innerHTML=`<div class="project-detail-v2"><div class="project-detail-top"><div>${statusBadge(current.status)} ${current.archivedAt?'<span class="badge gray">Archiviert</span>':''}<div class="mini-meta">${esc(projectDateRangeText(current))} · ${esc(groupName(current.groupId))}</div></div><div class="project-detail-actions"><button class="btn secondary" id="projectDetailEdit" type="button" ${current.archivedAt?"disabled":""}>Bearbeiten</button>${current.status!=="closed"&&!current.archivedAt?'<button class="btn primary" id="projectDetailClose" type="button">Projekt abschließen</button>':''}${current.status==="closed"&&!current.archivedAt?'<button class="btn primary" id="projectDetailArchive" type="button">Archivieren</button>':''}</div></div><div class="project-detail-tabs">${vp2ProjectTabButton("overview","Übersicht",true)}${vp2ProjectTabButton("tasks","Aufgaben")}${vp2ProjectTabButton("events","Termine")}${vp2ProjectTabButton("notes","Notizen")}</div><div id="projectDetailPanel"></div></div>`;
  const renderTab=tab=>{
    $$('[data-project-detail-tab]').forEach(b=>b.classList.toggle("active",b.dataset.projectDetailTab===tab));
    const panel=$("#projectDetailPanel");
    if(tab==="overview")panel.innerHTML=`<div class="project-detail-grid"><div class="detail-box full-detail"><b>Beschreibung</b>${esc(current.description||"Keine Beschreibung hinterlegt.")}</div><div class="detail-box full-detail project-parent-event-box"><b>Termin</b>${parentEvent?`<button class="project-parent-event-open" id="projectParentEventOpen" type="button"><span><strong>${esc(parentEvent.title)}</strong><small>${esc([current.eventDate?fmtDate(current.eventDate):eventDateRangeText(parentEvent),vp209ProjectEventTimeText(current),parentEvent.location].filter(Boolean).join(" · "))}</small></span><span>›</span></button>`:"Kein Termin zugeordnet"}</div><div class="detail-box"><b>Fortschritt</b>${st.total?`${st.done} von ${st.total} Aufgaben · ${st.progress}%`:"Noch keine Aufgaben vorhanden"}</div><div class="detail-box"><b>Nächster Termin</b>${next?`${esc(next.title)} · ${esc(eventDateRangeText(next))}`:"Kein kommender Termin"}</div><div class="detail-box"><b>Offene Aufgaben</b>${st.open}</div><div class="detail-box"><b>Termine</b>${events.length}</div></div>`;
    if(tab==="tasks")panel.innerHTML=`<div class="project-detail-section-head"><b>Projektaufgaben</b>${!readonly?'<button class="btn tiny primary" id="projectDetailAddTask" type="button">+ Aufgabe</button>':''}</div><div>${tasks.length?tasks.map(t=>`<div class="project-detail-row">${current.archivedAt?`<div class="project-detail-row-main"><b>${esc(t.title)}</b><small>${esc(statusLabel(t.status))} · ${t.due?fmtDate(t.due):"ohne Fälligkeit"}</small></div>`:`<button class="project-detail-row-main" data-project-detail-task="${t.id}" type="button"><b>${esc(t.title)}</b><small>${esc(statusLabel(t.status))} · ${t.due?fmtDate(t.due):"ohne Fälligkeit"}</small></button>`}</div>`).join(""):'<div class="empty">Keine Aufgaben.</div>'}</div>`;
    if(tab==="events")panel.innerHTML=`<div class="project-detail-section-head"><b>Projekttermine</b>${!readonly?'<button class="btn tiny primary" id="projectDetailAddEvent" type="button">+ Termin</button>':''}</div><div>${events.length?events.map(e=>`<button class="project-detail-row project-detail-row-main" data-project-detail-event="${e.id}" type="button"><b>${esc(e.title)}</b><small>${esc(eventDateRangeText(e))}${eventTimeRangeText(e)?` · ${esc(eventTimeRangeText(e))}`:""}</small></button>`).join(""):'<div class="empty">Keine Termine.</div>'}</div>`;
    if(tab==="notes")panel.innerHTML=`<div class="detail-box full-detail"><b>Notizen</b><div class="project-notes-display">${esc(current.notes||"Keine Notizen hinterlegt.")}</div></div>`;
    $("#projectParentEventOpen")?.addEventListener("click",()=>{const e=vp209ParentEventForProject(current);if(e){dlg.close();showEventDetails(e)}});
    $("#projectDetailAddTask")?.addEventListener("click",()=>{dlg.close();openTaskModal(null,current.id)});
    $("#projectDetailAddEvent")?.addEventListener("click",()=>{dlg.close();openEventModal(null,current.id)});
    $$('[data-project-detail-task]').forEach(b=>b.onclick=()=>{const t=recordById("tasks",b.dataset.projectDetailTask);if(t){dlg.close();openTaskModal(t)}});
    $$('[data-project-detail-event]').forEach(b=>b.onclick=()=>{const e=recordById("events",b.dataset.projectDetailEvent);if(e)showEventDetails(e)});
  };
  $$('[data-project-detail-tab]').forEach(b=>b.onclick=()=>renderTab(b.dataset.projectDetailTab));renderTab("overview");
  $("#projectDetailEdit")?.addEventListener("click",()=>{dlg.close();openProjectModal(current)});
  $("#projectDetailClose")?.addEventListener("click",()=>{dlg.close();vp2CloseProject(current)});
  $("#projectDetailArchive")?.addEventListener("click",()=>{dlg.close();archiveProject(current.id)});
  dlg.showModal();
};

openEventModal=function(rec=null,presetProjectId="",preset={}){
  const project=presetProjectId?recordById("projects",presetProjectId):null;if(!rec&&project&&project.status==="closed")return alert("Abgeschlossene Projekte müssen zuerst wieder aktiviert werden, bevor neue Termine angelegt werden können.");
  const r=rec||{title:preset.title||"",startDate:preset.startDate||todayStr(),endDate:preset.endDate||preset.startDate||todayStr(),startTime:"",endTime:"",location:"",groupId:project?.groupId||"",projectId:presetProjectId||"",description:"",color:"#1677c8",recurrence:"none",recurrenceUntil:""};
  const fixed=!!(presetProjectId&&!rec),allDay=!eventStartTime(r)&&!eventEndTime(r);
  const colorPalette=[
    "#1677c8","#2f9628","#e67e22","#c43d3d","#7a5cc7",
    "#86bce8","#95cb8d","#f1b67a","#e79292","#b8a2dd"
  ];
  const currentColor=eventColor(r);
  showModal(rec?"Termin bearbeiten":fixed?"Termin zum Projekt anlegen":"Neuer Termin",`<div class="form-grid">${fixed?`<div class="form-note full">Projekt: <b>${esc(project?.name||"")}</b></div>`:""}<label class="full">Titel<input id="fTitle" value="${esc(r.title||"")}"></label><label>Von<input id="fStartDate" type="date" value="${esc(eventStartDate(r)||todayStr())}"></label><label>Bis<input id="fEndDate" type="date" value="${esc(eventEndDate(r)||eventStartDate(r)||todayStr())}"></label><label class="checkline full"><input id="fAllDay" type="checkbox" ${allDay?"checked":""}> Ganztägig</label><label>Startzeit<input id="fStartTime" type="time" value="${esc(eventStartTime(r))}"></label><label>Endzeit<input id="fEndTime" type="time" value="${esc(eventEndTime(r))}"></label><label>Ort<input id="fLocation" value="${esc(r.location||"")}"></label><label>Gruppe<select id="fGroup">${groupOptions(r.groupId)}</select></label><label class="full">Projekt<select id="fEventProject" ${fixed?"disabled":""}>${projectOptions(r.projectId||presetProjectId)}</select></label><label>Wiederholung<select id="fRecurrence"><option value="none">Keine</option>${[["daily","Täglich"],["weekly","Wöchentlich"],["monthly","Monatlich"],["yearly","Jährlich"]].map(([v,l])=>`<option value="${v}" ${r.recurrence===v?"selected":""}>${l}</option>`).join("")}</select></label><label>Wiederholen bis<input id="fRecurrenceUntil" type="date" value="${esc(r.recurrenceUntil||"")}"></label><label class="full">Notizen<textarea id="fEventDescription" rows="4">${esc(r.description||"")}</textarea></label><div class="form-section full">Farbe</div><div class="event-color-tiles-simple full" role="group" aria-label="Terminfarbe">${colorPalette.map(c=>`<button type="button" class="event-color-tile-simple ${c.toLowerCase()===currentColor.toLowerCase()?"active":""}" data-event-color="${c}" style="--event-tile-color:${c}" aria-label="Farbe auswählen" aria-pressed="${c.toLowerCase()===currentColor.toLowerCase()?"true":"false"}"></button>`).join("")}</div><input id="fColor" type="hidden" value="${currentColor}"></div>`,()=>{
    const title=$("#fTitle").value.trim(),sd=$("#fStartDate").value,ed=$("#fEndDate").value||sd;if(!title||!sd)return false;if(ed<sd){alert("Das Bis-Datum darf nicht vor dem Von-Datum liegen.");return false}
    const all=$("#fAllDay").checked,st=all?"":$("#fStartTime").value,et=all?"":$("#fEndTime").value;if(!all&&st&&et&&sd===ed&&et<=st){alert("Die Endzeit muss nach der Startzeit liegen.");return false}
    const assigned=rec?vp209ProjectsForEvent(rec.id):[],outside=assigned.filter(p=>p.eventDate&&(p.eventDate<sd||p.eventDate>ed));
    if(outside.length&&!confirm(`${outside.length} zugeordnete${outside.length===1?"s Projekt liegt":" Projekte liegen"} außerhalb des neuen Terminzeitraums. ${outside.length===1?"Der Projekttag wird":"Die Projekttage werden"} auf den nächstmöglichen Tag verschoben. Fortfahren?`))return false;
    const target=rec||{id:uid(),createdAt:now()};Object.assign(target,{title,startDate:sd,endDate:ed,date:sd,startTime:st,endTime:et,time:st,location:$("#fLocation").value.trim(),groupId:$("#fGroup").value,projectId:fixed?presetProjectId:$("#fEventProject").value,description:$("#fEventDescription").value.trim(),color:$("#fColor").value,recurrence:$("#fRecurrence").value,recurrenceUntil:$("#fRecurrenceUntil").value});touch(target);if(!rec)db.events.push(target);
    outside.forEach(p=>{p.eventDate=p.eventDate<sd?sd:ed;touch(p)});saveLocal();return true;
  });
  const toggle=()=>{$("#fStartTime").disabled=$("#fAllDay").checked;$("#fEndTime").disabled=$("#fAllDay").checked};$("#fAllDay")?.addEventListener("change",toggle);toggle();
  $$("[data-event-color]").forEach(btn=>btn.addEventListener("click",()=>{
    const value=btn.dataset.eventColor;$("#fColor").value=value;
    $$("[data-event-color]").forEach(tile=>{const active=tile===btn;tile.classList.toggle("active",active);tile.setAttribute("aria-pressed",active?"true":"false")});
  }));
};

showEventDetails=function(e){
  const dlg=$("#detailModal"),project=e.projectId?recordById("projects",e.projectId):null,locked=!!project?.archivedAt,assigned=vp209ProjectsForEvent(e.id);
  $("#detailTitle").textContent=e.title||"Termin";
  $("#detailBody").innerHTML=`<div class="event-detail"><div class="event-detail-grid"><div class="detail-box"><b>Datum</b>${esc(eventDateRangeText(e))}</div><div class="detail-box"><b>Zeit</b>${esc(eventTimeRangeText(e)||"ganztägig")}</div><div class="detail-box"><b>Ort</b>${esc(e.location||"—")}</div><div class="detail-box"><b>Gruppe</b>${esc(groupName(e.groupId))}</div><div class="detail-box"><b>Projekt</b>${esc(project?`${project.name}${project.archivedAt?" · archiviert":""}`:"—")}</div><div class="detail-box"><b>Wiederholung</b>${esc(({daily:"Täglich",weekly:"Wöchentlich",monthly:"Monatlich",yearly:"Jährlich",none:"Keine"})[e.recurrence||"none"]||"Keine")}</div>${e.description?`<div class="detail-box full-detail"><b>Notizen</b>${esc(e.description)}</div>`:""}</div><section class="event-assigned-projects"><div class="event-assigned-projects-head"><div><b>Zugeordnete Projekte</b><span>${assigned.length}</span></div>${!locked?'<button class="btn tiny primary" id="eventAddAssignedProject" type="button">+ Projekt</button>':''}</div>${vp209AssignedProjectsHTML(e)}</section>${locked?'<div class="form-note">Dieser Termin gehört zu einem archivierten Projekt und ist hier schreibgeschützt.</div>':`<div class="event-detail-actions"><button class="btn primary" id="detailEditEvent" type="button">Bearbeiten</button><button class="btn danger" id="detailDeleteEvent" type="button">Termin löschen</button></div>`}</div>`;
  dlg.showModal();
  $$('[data-event-assigned-project]').forEach(b=>b.onclick=()=>{const p=recordById("projects",b.dataset.eventAssignedProject);if(p){dlg.close();showProjectDetails(p)}});
  $("#eventAddAssignedProject")?.addEventListener("click",()=>{dlg.close();openProjectModal(null,{parentEventId:e.id,eventDate:eventStartDate(e)})});
  if(!locked){$("#detailEditEvent").onclick=()=>{dlg.close();openEventModal(e)};$("#detailDeleteEvent").onclick=()=>{if(confirm(`Termin „${e.title}“ in den Papierkorb verschieben?\n\nZugeordnete Projekte bleiben erhalten und werden bei einer Wiederherstellung wieder diesem Termin zugeordnet.`)){markDeleted("events",e.id);dlg.close();saveLocal()}};}
};

const vp209CleanupBeforePermanentRemoval=cleanupBeforePermanentRemoval;
cleanupBeforePermanentRemoval=function(collection,r){
  vp209CleanupBeforePermanentRemoval(collection,r);
  if(collection==="events")allRows("projects").filter(p=>p.parentEventId===r.id).forEach(p=>{p.parentEventId="";p.eventDate="";p.eventStartTime="";p.eventEndTime="";touch(p)});
};


/* ---------- V-Planer 2.1.0: Schichtplaene in Projekten + PDF-Export ---------- */
function vp210ShiftAreas(project){
  if(!project)return [];
  if(!Array.isArray(project.shiftAreas))project.shiftAreas=[];
  return project.shiftAreas;
}
function vp210Shifts(project){
  if(!project)return [];
  if(!Array.isArray(project.shifts))project.shifts=[];
  return project.shifts;
}
function vp210ShiftArea(project,areaId){return vp210ShiftAreas(project).find(a=>a.id===areaId)||null}
function vp210ShiftAreaName(project,areaId){return vp210ShiftArea(project,areaId)?.name||"Ohne Bereich"}
function vp210ShiftMemberName(id){const m=recordById("members",id);return m?`${m.firstName||""} ${m.lastName||""}`.trim()||memberFullName(m):"Unbekannt"}
function vp210ShiftDate(project,shift){return shift?.date||project?.eventDate||projectStartDate(project)||""}
function vp210ShiftTimeText(shift){const s=shift?.startTime||"",e=shift?.endTime||"";if(s&&e)return `${s} - ${e} Uhr`;if(s)return `${s} Uhr`;return "ohne Uhrzeit"}
function vp210ShiftSort(project,rows){return rows.slice().sort((a,b)=>vp210ShiftDate(project,a).localeCompare(vp210ShiftDate(project,b))||String(a.startTime||"").localeCompare(String(b.startTime||""))||vp210ShiftAreaName(project,a.areaId).localeCompare(vp210ShiftAreaName(project,b.areaId),"de")||String(a.task||"").localeCompare(String(b.task||""),"de"))}
function vp210ShiftPlanStats(project){
  const shifts=vp210Shifts(project),unique=new Set();let required=0,assigned=0;
  shifts.forEach(s=>{required+=Math.max(0,Number(s.required)||0);assigned+=(s.memberIds||[]).length;(s.memberIds||[]).forEach(id=>unique.add(id))});
  return {shifts:shifts.length,required,assigned,helpers:unique.size};
}
function vp210TimeOverlap(aStart,aEnd,bStart,bEnd){return !!(aStart&&aEnd&&bStart&&bEnd&&aStart<bEnd&&bStart<aEnd)}
function vp210ShiftConflicts(project,candidate,memberId,excludeShiftId=""){
  const date=vp210ShiftDate(project,candidate);if(!date||!candidate.startTime||!candidate.endTime)return [];
  const out=[];
  activeRows("projects").forEach(p=>vp210Shifts(p).forEach(s=>{
    if(p.id===project.id&&s.id===excludeShiftId)return;
    if(!(s.memberIds||[]).includes(memberId))return;
    if(vp210ShiftDate(p,s)!==date)return;
    if(!vp210TimeOverlap(candidate.startTime,candidate.endTime,s.startTime,s.endTime))return;
    out.push({project:p,shift:s});
  }));
  return out;
}
function vp210ShiftMembersHTML(selectedIds=[]){
  const selected=new Set(selectedIds||[]),members=activeRows("members").filter(m=>!['exited','deceased'].includes(m.status)).slice().sort((a,b)=>memberFullName(a).localeCompare(memberFullName(b),"de"));
  if(!members.length)return '<div class="form-note full">Keine aktiven oder passiven Mitglieder vorhanden.</div>';
  return `<div class="shift-member-picker full">${members.map(m=>`<label class="shift-member-option"><input type="checkbox" data-shift-member="${m.id}" ${selected.has(m.id)?"checked":""}><span><b>${esc(`${m.firstName||""} ${m.lastName||""}`.trim())}</b><small>${esc(effectiveGroupIdsForMember(m).map(groupName).filter(x=>x!=="—").join(" · ")||"Gesamtverein")}</small></span></label>`).join("")}</div>`;
}
function vp210OpenAreaModal(project,area=null,onDone=()=>{}){
  showModal(area?"Bereich bearbeiten":"Bereich hinzufügen",`<div class="form-grid"><label class="full">Bereich<input id="shiftAreaName" value="${esc(area?.name||"")}" placeholder="z. B. Theke, Einlass, Aufbau"></label></div>`,()=>{
    const name=$("#shiftAreaName").value.trim();if(!name)return false;
    if(vp210ShiftAreas(project).some(a=>a.id!==area?.id&&a.name.toLowerCase()===name.toLowerCase())){alert("Dieser Bereich existiert bereits.");return false}
    if(area){area.name=name}else{vp210ShiftAreas(project).push({id:uid(),name})}
    touch(project);saveLocal();onDone();return true;
  });
}
function vp210DeleteArea(project,areaId,onDone=()=>{}){
  const area=vp210ShiftArea(project,areaId);if(!area)return;
  const used=vp210Shifts(project).filter(s=>s.areaId===areaId);
  if(used.length)return alert(`Der Bereich „${area.name}“ enthält noch ${used.length} Schicht${used.length===1?"":"en"}. Bitte diese zuerst verschieben oder löschen.`);
  if(!confirm(`Bereich „${area.name}“ entfernen?`))return;
  project.shiftAreas=vp210ShiftAreas(project).filter(a=>a.id!==areaId);touch(project);saveLocal();onDone();
}
function vp210OpenShiftModal(project,shift=null,presetAreaId="",onDone=()=>{}){
  const areas=vp210ShiftAreas(project);if(!areas.length){alert("Bitte zuerst mindestens einen Bereich anlegen.");return}
  const fixedDate=!!(project.parentEventId&&project.eventDate),defaultDate=project.eventDate||projectStartDate(project)||todayStr();
  const r=shift||{id:"",areaId:presetAreaId||areas[0].id,date:defaultDate,startTime:project.eventStartTime||"",endTime:project.eventEndTime||"",task:"",required:1,memberIds:[],note:""};
  showModal(shift?"Schicht bearbeiten":"Neue Schicht",`<div class="form-grid">
    <label>Bereich<select id="shiftArea">${areas.map(a=>`<option value="${a.id}" ${a.id===r.areaId?"selected":""}>${esc(a.name)}</option>`).join("")}</select></label>
    <label>Datum<input id="shiftDate" type="date" value="${esc(r.date||defaultDate)}" ${fixedDate?"disabled":""}></label>
    <label>Von<input id="shiftStart" type="time" value="${esc(r.startTime||"")}"></label>
    <label>Bis<input id="shiftEnd" type="time" value="${esc(r.endTime||"")}"></label>
    <label class="full">Aufgabe<input id="shiftTask" value="${esc(r.task||"")}" placeholder="z. B. Ausschank, Eintritt / Kasse"></label>
    <label>Benötigte Personen<input id="shiftRequired" type="number" min="1" max="99" value="${Math.max(1,Number(r.required)||1)}"></label>
    <div class="form-section full">Eingeteilte Mitglieder</div>
    ${vp210ShiftMembersHTML(r.memberIds||[])}
    <label class="full">Notiz<textarea id="shiftNote" rows="3" placeholder="Optionaler Hinweis zur Schicht">${esc(r.note||"")}</textarea></label>
  </div>`,()=>{
    const areaId=$("#shiftArea").value,date=fixedDate?project.eventDate:$("#shiftDate").value,startTime=$("#shiftStart").value,endTime=$("#shiftEnd").value,task=$("#shiftTask").value.trim(),required=Math.max(1,Number($("#shiftRequired").value)||1),memberIds=$$('[data-shift-member]:checked').map(x=>x.dataset.shiftMember),note=$("#shiftNote").value.trim();
    if(!areaId||!date||!task){alert("Bitte Bereich, Datum und Aufgabe ausfüllen.");return false}
    if(startTime&&endTime&&endTime<=startTime){alert("Die Bis-Uhrzeit muss nach der Von-Uhrzeit liegen.");return false}
    const candidate={date,startTime,endTime,memberIds};
    const conflicts=[];memberIds.forEach(id=>vp210ShiftConflicts(project,candidate,id,shift?.id||"").forEach(c=>conflicts.push({memberId:id,...c})));
    if(conflicts.length){
      const lines=[];conflicts.slice(0,8).forEach(c=>lines.push(`${vp210ShiftMemberName(c.memberId)}: ${c.project.name} · ${vp210ShiftAreaName(c.project,c.shift.areaId)} · ${vp210ShiftTimeText(c.shift)}`));
      if(!confirm(`Es gibt ${conflicts.length} mögliche Doppelbelegung${conflicts.length===1?"":"en"}:\n\n${lines.join("\n")}${conflicts.length>8?"\n…":""}\n\nTrotzdem speichern?`))return false;
    }
    const target=shift||{id:uid()};Object.assign(target,{areaId,date,startTime,endTime,task,required,memberIds,note});
    if(!shift)vp210Shifts(project).push(target);touch(project);saveLocal();onDone();return true;
  });
}
function vp210DeleteShift(project,shiftId,onDone=()=>{}){const s=vp210Shifts(project).find(x=>x.id===shiftId);if(!s)return;if(!confirm(`Schicht „${s.task||"Schicht"}“ löschen?`))return;project.shifts=vp210Shifts(project).filter(x=>x.id!==shiftId);touch(project);saveLocal();onDone()}
function vp210ShiftOccupancyHTML(shift){const assigned=(shift.memberIds||[]).length,needed=Math.max(1,Number(shift.required)||1),cls=assigned<needed?"open":assigned===needed?"complete":"over";return `<span class="shift-occupancy ${cls}">${assigned} / ${needed} besetzt</span>`}
function vp210ShiftRowHTML(project,shift,readonly=false,showArea=false){
  const names=(shift.memberIds||[]).map(vp210ShiftMemberName),meta=[showArea?vp210ShiftAreaName(project,shift.areaId):"",fmtDate(vp210ShiftDate(project,shift)),vp210ShiftTimeText(shift)].filter(Boolean).join(" · ");
  return `<div class="shift-row"><div class="shift-time-box"><b>${esc(shift.startTime||"--:--")}</b><span>${esc(shift.endTime||"")}</span></div><div class="shift-row-main"><b>${esc(shift.task||"Schicht")}</b><small>${esc(meta)}</small><div class="shift-persons">${names.length?names.map(n=>`<span>${esc(n)}</span>`).join(""):'<em>Noch niemand eingeteilt</em>'}</div>${shift.note?`<div class="shift-note">${esc(shift.note)}</div>`:""}</div><div class="shift-row-side">${vp210ShiftOccupancyHTML(shift)}${!readonly?`<div class="shift-row-actions"><button class="btn tiny secondary" data-shift-edit="${shift.id}" type="button">Bearbeiten</button><button class="btn tiny danger" data-shift-delete="${shift.id}" type="button">Löschen</button></div>`:""}</div></div>`;
}
function vp210ShiftByAreaHTML(project,readonly=false){
  const areas=vp210ShiftAreas(project),shifts=vp210ShiftSort(project,vp210Shifts(project));
  if(!areas.length)return '<div class="shift-empty"><b>Noch keine Bereiche angelegt.</b><span>Lege zuerst Bereiche wie Theke, Einlass, Aufbau oder Grill an.</span></div>';
  return areas.map(area=>{const rows=shifts.filter(s=>s.areaId===area.id);return `<section class="shift-area-card"><div class="shift-area-head"><div><b>${esc(area.name)}</b><span>${rows.length} Schicht${rows.length===1?"":"en"}</span></div>${!readonly?`<div class="shift-area-actions"><button class="btn tiny primary" data-shift-add-area="${area.id}" type="button">+ Schicht</button><button class="btn tiny secondary" data-shift-area-edit="${area.id}" type="button">Bearbeiten</button><button class="btn tiny danger" data-shift-area-delete="${area.id}" type="button">Entfernen</button></div>`:""}</div><div class="shift-area-body">${rows.length?rows.map(s=>vp210ShiftRowHTML(project,s,readonly,false)).join(""):'<div class="empty">Noch keine Schichten in diesem Bereich.</div>'}</div></section>`}).join("");
}
function vp210ShiftByPersonHTML(project,readonly=false){
  const shifts=vp210ShiftSort(project,vp210Shifts(project));if(!shifts.length)return '<div class="shift-empty"><b>Noch keine Schichten vorhanden.</b><span>Lege Schichten an und teile anschließend Mitglieder ein.</span></div>';
  const memberMap=new Map();shifts.forEach(s=>(s.memberIds||[]).forEach(id=>{if(!memberMap.has(id))memberMap.set(id,[]);memberMap.get(id).push(s)}));
  const cards=[...memberMap.entries()].sort((a,b)=>vp210ShiftMemberName(a[0]).localeCompare(vp210ShiftMemberName(b[0]),"de")).map(([id,rows])=>`<section class="shift-person-card"><div class="shift-person-head"><b>${esc(vp210ShiftMemberName(id))}</b><span>${rows.length} Schicht${rows.length===1?"":"en"}</span></div>${rows.map(s=>vp210ShiftRowHTML(project,s,readonly,true)).join("")}</section>`);
  const unassigned=shifts.filter(s=>!(s.memberIds||[]).length);if(unassigned.length)cards.push(`<section class="shift-person-card unassigned"><div class="shift-person-head"><b>Noch unbesetzt</b><span>${unassigned.length}</span></div>${unassigned.map(s=>vp210ShiftRowHTML(project,s,readonly,true)).join("")}</section>`);
  return cards.join("");
}
function vp210BindShiftPlanUI(project,readonly,rerender){
  $("#shiftAddArea")?.addEventListener("click",()=>vp210OpenAreaModal(project,null,rerender));
  $("#shiftAddShift")?.addEventListener("click",()=>vp210OpenShiftModal(project,null,"",rerender));
  $("#shiftPdfProject")?.addEventListener("click",()=>vp210ExportProjectShiftPdf(project));
  $$('[data-shift-view]').forEach(b=>b.onclick=()=>{vp210ShiftViewByProject[project.id]=b.dataset.shiftView;rerender()});
  $$('[data-shift-add-area]').forEach(b=>b.onclick=()=>vp210OpenShiftModal(project,null,b.dataset.shiftAddArea,rerender));
  $$('[data-shift-area-edit]').forEach(b=>b.onclick=()=>vp210OpenAreaModal(project,vp210ShiftArea(project,b.dataset.shiftAreaEdit),rerender));
  $$('[data-shift-area-delete]').forEach(b=>b.onclick=()=>vp210DeleteArea(project,b.dataset.shiftAreaDelete,rerender));
  $$('[data-shift-edit]').forEach(b=>b.onclick=()=>vp210OpenShiftModal(project,vp210Shifts(project).find(s=>s.id===b.dataset.shiftEdit),"",rerender));
  $$('[data-shift-delete]').forEach(b=>b.onclick=()=>vp210DeleteShift(project,b.dataset.shiftDelete,rerender));
}
const vp210ShiftViewByProject={};
function vp210ShiftPlanPanelHTML(project,readonly=false){
  const view=vp210ShiftViewByProject[project.id]||"area",stats=vp210ShiftPlanStats(project);
  return `<div class="shift-plan"><div class="shift-plan-toolbar"><div class="shift-plan-summary"><b>Schichtplan</b><span>${stats.shifts} Schichten · ${stats.helpers} Helfer · ${stats.assigned}/${stats.required||0} Besetzungen</span></div><div class="shift-plan-actions"><div class="shift-view-toggle"><button class="btn tiny ${view==="area"?"primary":"secondary"}" data-shift-view="area" type="button">Nach Bereich</button><button class="btn tiny ${view==="person"?"primary":"secondary"}" data-shift-view="person" type="button">Nach Person</button></div>${!readonly?'<button class="btn tiny secondary" id="shiftAddArea" type="button">+ Bereich</button><button class="btn tiny primary" id="shiftAddShift" type="button">+ Schicht</button>':''}<button class="btn tiny secondary" id="shiftPdfProject" type="button">PDF exportieren</button></div></div>${view==="person"?vp210ShiftByPersonHTML(project,readonly):vp210ShiftByAreaHTML(project,readonly)}</div>`;
}
function vp210EventShiftRows(event){
  const out=[];vp209ProjectsForEvent(event.id).forEach(project=>vp210ShiftSort(project,vp210Shifts(project)).forEach(shift=>out.push({project,shift,date:vp210ShiftDate(project,shift)})));
  return out.sort((a,b)=>String(a.date||"").localeCompare(String(b.date||""))||String(a.shift.startTime||"").localeCompare(String(b.shift.startTime||""))||a.project.name.localeCompare(b.project.name,"de"));
}
function vp210EventShiftOverviewHTML(event){
  const rows=vp210EventShiftRows(event);if(!rows.length)return "";
  const groups=[];rows.forEach(r=>{let g=groups.find(x=>x.date===r.date);if(!g){g={date:r.date,items:[]};groups.push(g)}g.items.push(r)});
  return `<section class="event-shift-overview"><div class="event-assigned-projects-head"><div><b>Schichtübersicht</b><span>${rows.length}</span></div><button class="btn tiny secondary" id="eventShiftPdf" type="button">PDF exportieren</button></div>${groups.map(g=>`<div class="event-shift-day"><div class="event-project-day-title">${esc(vp209ProjectEventDayLabel(g.date))}</div>${g.items.map(({project,shift})=>`<button class="event-shift-row" data-event-shift-project="${project.id}" type="button"><span class="event-shift-time">${esc(shift.startTime||"--:--")}${shift.endTime?`<small>bis ${esc(shift.endTime)}</small>`:""}</span><span class="event-shift-main"><b>${esc(project.name)} · ${esc(vp210ShiftAreaName(project,shift.areaId))}</b><small>${esc(shift.task)} · ${(shift.memberIds||[]).length?esc((shift.memberIds||[]).map(vp210ShiftMemberName).join(", ")):"noch unbesetzt"}</small></span>${vp210ShiftOccupancyHTML(shift)}<span class="event-project-assignment-chevron">›</span></button>`).join("")}</div>`).join("")}</section>`;
}

function vp210PdfEscape(text){
  const map={"ä":228,"ö":246,"ü":252,"Ä":196,"Ö":214,"Ü":220,"ß":223,"€":128,"é":233,"è":232,"á":225,"à":224,"ó":243,"ò":242,"í":237,"ì":236,"–":45,"—":45,"·":183,"…":46};
  let out="";for(const ch of String(text??"")){const code=ch.charCodeAt(0);if(ch==="\\")out+="\\\\";else if(ch==="(")out+="\\(";else if(ch===")")out+="\\)";else if(code>=32&&code<=126)out+=ch;else{const b=map[ch]??(code<=255?code:63);out+=`\\${b.toString(8).padStart(3,"0")}`}}return out;
}
function vp210PdfWrap(text,maxChars){
  const words=String(text||"").replace(/\s+/g," ").trim().split(" ").filter(Boolean),lines=[];let line="";
  words.forEach(w=>{if(!line)line=w;else if((line+" "+w).length<=maxChars)line+=" "+w;else{lines.push(line);line=w}});if(line)lines.push(line);return lines.length?lines:[""];
}
function vp210PdfDownload(filename,title,subtitle,columns,rows){
  const W=842,H=595,M=36,usable=W-M*2;let pages=[],ops=[],y=H-45,pageNo=0;
  const text=(x,yy,size,value,bold=false,color="0 0 0")=>ops.push(`BT ${color} rg /${bold?"F2":"F1"} ${size} Tf ${x.toFixed(1)} ${yy.toFixed(1)} Td (${vp210PdfEscape(value)}) Tj ET`);
  const line=(x1,yy1,x2,yy2,gray=.88)=>ops.push(`${gray} G ${x1} ${yy1} m ${x2} ${yy2} l S`);
  const rect=(x,yy,w,h,fill)=>ops.push(`${fill} rg ${x} ${yy} ${w} ${h} re f`);
  const header=()=>{pageNo++;text(M,H-38,17,title,true,"0.05 0.31 0.55");text(M,H-55,9,subtitle,false,"0.35 0.4 0.45");text(W-M,H-55,8,`Seite ${pageNo}`,false,"0.45 0.48 0.52");y=H-78;};
  const finish=()=>{pages.push(ops.join("\n"));ops=[]};
  const newPage=()=>{if(ops.length)finish();header()};header();
  const totalWidth=columns.reduce((s,c)=>s+c.width,0),scale=usable/totalWidth,cols=columns.map(c=>({...c,width:c.width*scale}));
  const tableHeader=()=>{const h=24;if(y-h<42)newPage();let x=M;rect(M,y-h,usable,h,"0.05 0.45 0.74");cols.forEach(c=>{text(x+5,y-16,8,c.label,true,"1 1 1");x+=c.width});y-=h;};
  tableHeader();
  rows.forEach((row,idx)=>{
    const wrapped=cols.map((c,i)=>vp210PdfWrap(row[i]??"",Math.max(6,Math.floor(c.width/4.8))));const lines=Math.max(...wrapped.map(a=>a.length)),rh=Math.max(25,lines*11+10);
    if(y-rh<42){newPage();tableHeader()}
    if(idx%2===1)rect(M,y-rh,usable,rh,"0.975 0.98 0.985");let x=M;
    cols.forEach((c,i)=>{wrapped[i].forEach((ln,j)=>text(x+5,y-15-j*11,8,ln,false,"0.12 0.15 0.18"));x+=c.width});line(M,y-rh,W-M,y-rh,.9);y-=rh;
  });
  finish();
  const objects=[];objects[1]="<< /Type /Catalog /Pages 2 0 R >>";const kids=[];pages.forEach((_,i)=>kids.push(`${5+i*2} 0 R`));objects[2]=`<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pages.length} >>`;objects[3]="<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";objects[4]="<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
  pages.forEach((content,i)=>{const pageId=5+i*2,contentId=pageId+1;objects[pageId]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`;objects[contentId]=`<< /Length ${content.length} >>\nstream\n${content}\nendstream`});
  let pdf="%PDF-1.4\n%VPlaner\n",offsets=[0];for(let i=1;i<objects.length;i++){offsets[i]=pdf.length;pdf+=`${i} 0 obj\n${objects[i]}\nendobj\n`}const xref=pdf.length;pdf+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;for(let i=1;i<objects.length;i++)pdf+=`${String(offsets[i]).padStart(10,"0")} 00000 n \n`;pdf+=`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const blob=new Blob([pdf],{type:"application/pdf"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);
}
function vp210SafeFileName(s){return String(s||"Schichtplan").replace(/[<>:"/\\|?*]+/g,"-").replace(/\s+/g,"_").replace(/_+/g,"_").slice(0,80)}
function vp210ExportProjectShiftPdf(project){
  const shifts=vp210ShiftSort(project,vp210Shifts(project));if(!shifts.length)return alert("Für dieses Projekt sind noch keine Schichten vorhanden.");
  const rows=shifts.map(s=>[`${fmtDate(vp210ShiftDate(project,s))}\n${vp210ShiftTimeText(s)}`,vp210ShiftAreaName(project,s.areaId),s.task||"Schicht",`${(s.memberIds||[]).length} / ${Math.max(1,Number(s.required)||1)}`,(s.memberIds||[]).map(vp210ShiftMemberName).join(", ")||"Noch unbesetzt"]);
  const parent=vp209ParentEventForProject(project),sub=[parent?.title||"",project.eventDate?fmtDate(project.eventDate):projectDateRangeText(project),`Erstellt: ${new Date().toLocaleString("de-DE")}`].filter(Boolean).join(" · ");
  vp210PdfDownload(`${vp210SafeFileName(`Schichtplan_${project.name}`)}.pdf`,`Schichtplan - ${project.name}`,sub,[{label:"Zeit",width:110},{label:"Bereich",width:120},{label:"Aufgabe",width:190},{label:"Besetzung",width:75},{label:"Eingeteilt",width:275}],rows);
}
function vp210ExportEventShiftPdf(event){
  const items=vp210EventShiftRows(event);if(!items.length)return alert("Für die zugeordneten Projekte sind noch keine Schichten vorhanden.");
  const rows=items.map(({project,shift})=>[`${fmtDate(vp210ShiftDate(project,shift))}\n${vp210ShiftTimeText(shift)}`,project.name||"Projekt",vp210ShiftAreaName(project,shift.areaId),shift.task||"Schicht",`${(shift.memberIds||[]).length}/${Math.max(1,Number(shift.required)||1)}`,(shift.memberIds||[]).map(vp210ShiftMemberName).join(", ")||"Noch unbesetzt"]);
  const sub=[eventDateRangeText(event),event.location,`Erstellt: ${new Date().toLocaleString("de-DE")}`].filter(Boolean).join(" · ");
  vp210PdfDownload(`${vp210SafeFileName(`Schichtplan_${event.title}`)}.pdf`,`Schichtplan - ${event.title}`,sub,[{label:"Zeit",width:105},{label:"Projekt",width:145},{label:"Bereich",width:105},{label:"Aufgabe",width:170},{label:"Bes.",width:55},{label:"Eingeteilt",width:190}],rows);
}

showProjectDetails=function(p){
  const current=recordById("projects",p?.id);if(!current)return;
  const dlg=$("#detailModal"),readonly=!!current.archivedAt||current.status==="closed",st=projectTaskStats(current.id),tasks=projectTasks(current.id),events=vp2ProjectEvents(current.id),next=vp2ProjectNextEvent(current.id),parentEvent=vp209ParentEventForProject(current);
  $("#detailTitle").textContent=current.name||"Projekt";
  $("#detailBody").innerHTML=`<div class="project-detail-v2"><div class="project-detail-top"><div>${statusBadge(current.status)} ${current.archivedAt?'<span class="badge gray">Archiviert</span>':''}<div class="mini-meta">${esc(projectDateRangeText(current))} · ${esc(groupName(current.groupId))}</div></div><div class="project-detail-actions"><button class="btn secondary" id="projectDetailEdit" type="button" ${current.archivedAt?"disabled":""}>Bearbeiten</button>${current.status!=="closed"&&!current.archivedAt?'<button class="btn primary" id="projectDetailClose" type="button">Projekt abschließen</button>':''}${current.status==="closed"&&!current.archivedAt?'<button class="btn primary" id="projectDetailArchive" type="button">Archivieren</button>':''}</div></div><div class="project-detail-tabs">${vp2ProjectTabButton("overview","Übersicht",true)}${vp2ProjectTabButton("tasks","Aufgaben")}${vp2ProjectTabButton("events","Termine")}${vp2ProjectTabButton("shifts","Schichtplan")}${vp2ProjectTabButton("notes","Notizen")}</div><div id="projectDetailPanel"></div></div>`;
  const renderTab=tab=>{
    $$('[data-project-detail-tab]').forEach(b=>b.classList.toggle("active",b.dataset.projectDetailTab===tab));const panel=$("#projectDetailPanel");
    if(tab==="overview")panel.innerHTML=`<div class="project-detail-grid"><div class="detail-box full-detail"><b>Beschreibung</b>${esc(current.description||"Keine Beschreibung hinterlegt.")}</div><div class="detail-box full-detail project-parent-event-box"><b>Termin</b>${parentEvent?`<button class="project-parent-event-open" id="projectParentEventOpen" type="button"><span><strong>${esc(parentEvent.title)}</strong><small>${esc([current.eventDate?fmtDate(current.eventDate):eventDateRangeText(parentEvent),vp209ProjectEventTimeText(current),parentEvent.location].filter(Boolean).join(" · "))}</small></span><span>›</span></button>`:"Kein Termin zugeordnet"}</div><div class="detail-box"><b>Fortschritt</b>${st.total?`${st.done} von ${st.total} Aufgaben · ${st.progress}%`:"Noch keine Aufgaben vorhanden"}</div><div class="detail-box"><b>Nächster Termin</b>${next?`${esc(next.title)} · ${esc(eventDateRangeText(next))}`:"Kein kommender Termin"}</div><div class="detail-box"><b>Offene Aufgaben</b>${st.open}</div><div class="detail-box"><b>Termine</b>${events.length}</div><div class="detail-box"><b>Schichtplan</b>${vp210ShiftPlanStats(current).shifts?`${vp210ShiftPlanStats(current).shifts} Schichten · ${vp210ShiftPlanStats(current).helpers} Helfer`:"Noch kein Schichtplan"}</div></div>`;
    if(tab==="tasks")panel.innerHTML=`<div class="project-detail-section-head"><b>Projektaufgaben</b>${!readonly?'<button class="btn tiny primary" id="projectDetailAddTask" type="button">+ Aufgabe</button>':''}</div><div>${tasks.length?tasks.map(t=>`<div class="project-detail-row">${current.archivedAt?`<div class="project-detail-row-main"><b>${esc(t.title)}</b><small>${esc(statusLabel(t.status))} · ${t.due?fmtDate(t.due):"ohne Fälligkeit"}</small></div>`:`<button class="project-detail-row-main" data-project-detail-task="${t.id}" type="button"><b>${esc(t.title)}</b><small>${esc(statusLabel(t.status))} · ${t.due?fmtDate(t.due):"ohne Fälligkeit"}</small></button>`}</div>`).join(""):'<div class="empty">Keine Aufgaben.</div>'}</div>`;
    if(tab==="events")panel.innerHTML=`<div class="project-detail-section-head"><b>Projekttermine</b>${!readonly?'<button class="btn tiny primary" id="projectDetailAddEvent" type="button">+ Termin</button>':''}</div><div>${events.length?events.map(e=>`<button class="project-detail-row project-detail-row-main" data-project-detail-event="${e.id}" type="button"><b>${esc(e.title)}</b><small>${esc(eventDateRangeText(e))}${eventTimeRangeText(e)?` · ${esc(eventTimeRangeText(e))}`:""}</small></button>`).join(""):'<div class="empty">Keine Termine.</div>'}</div>`;
    if(tab==="shifts")panel.innerHTML=vp210ShiftPlanPanelHTML(current,readonly);
    if(tab==="notes")panel.innerHTML=`<div class="detail-box full-detail"><b>Notizen</b><div class="project-notes-display">${esc(current.notes||"Keine Notizen hinterlegt.")}</div></div>`;
    $("#projectParentEventOpen")?.addEventListener("click",()=>{const e=vp209ParentEventForProject(current);if(e){dlg.close();showEventDetails(e)}});$("#projectDetailAddTask")?.addEventListener("click",()=>{dlg.close();openTaskModal(null,current.id)});$("#projectDetailAddEvent")?.addEventListener("click",()=>{dlg.close();openEventModal(null,current.id)});
    $$('[data-project-detail-task]').forEach(b=>b.onclick=()=>{const t=recordById("tasks",b.dataset.projectDetailTask);if(t){dlg.close();openTaskModal(t)}});$$('[data-project-detail-event]').forEach(b=>b.onclick=()=>{const e=recordById("events",b.dataset.projectDetailEvent);if(e)showEventDetails(e)});
    if(tab==="shifts")vp210BindShiftPlanUI(current,readonly,()=>renderTab("shifts"));
  };
  $$('[data-project-detail-tab]').forEach(b=>b.onclick=()=>renderTab(b.dataset.projectDetailTab));renderTab("overview");$("#projectDetailEdit")?.addEventListener("click",()=>{dlg.close();openProjectModal(current)});$("#projectDetailClose")?.addEventListener("click",()=>{dlg.close();vp2CloseProject(current)});$("#projectDetailArchive")?.addEventListener("click",()=>{dlg.close();archiveProject(current.id)});dlg.showModal();
};

showEventDetails=function(e){
  const dlg=$("#detailModal"),project=e.projectId?recordById("projects",e.projectId):null,locked=!!project?.archivedAt,assigned=vp209ProjectsForEvent(e.id),shiftOverview=vp210EventShiftOverviewHTML(e);
  $("#detailTitle").textContent=e.title||"Termin";
  $("#detailBody").innerHTML=`<div class="event-detail"><div class="event-detail-grid"><div class="detail-box"><b>Datum</b>${esc(eventDateRangeText(e))}</div><div class="detail-box"><b>Zeit</b>${esc(eventTimeRangeText(e)||"ganztägig")}</div><div class="detail-box"><b>Ort</b>${esc(e.location||"—")}</div><div class="detail-box"><b>Gruppe</b>${esc(groupName(e.groupId))}</div><div class="detail-box"><b>Projekt</b>${esc(project?`${project.name}${project.archivedAt?" · archiviert":""}`:"—")}</div><div class="detail-box"><b>Wiederholung</b>${esc(({daily:"Täglich",weekly:"Wöchentlich",monthly:"Monatlich",yearly:"Jährlich",none:"Keine"})[e.recurrence||"none"]||"Keine")}</div>${e.description?`<div class="detail-box full-detail"><b>Notizen</b>${esc(e.description)}</div>`:""}</div><section class="event-assigned-projects"><div class="event-assigned-projects-head"><div><b>Zugeordnete Projekte</b><span>${assigned.length}</span></div>${!locked?'<button class="btn tiny primary" id="eventAddAssignedProject" type="button">+ Projekt</button>':''}</div>${vp209AssignedProjectsHTML(e)}</section>${shiftOverview}${locked?'<div class="form-note">Dieser Termin gehört zu einem archivierten Projekt und ist hier schreibgeschützt.</div>':`<div class="event-detail-actions"><button class="btn primary" id="detailEditEvent" type="button">Bearbeiten</button><button class="btn danger" id="detailDeleteEvent" type="button">Termin löschen</button></div>`}</div>`;
  dlg.showModal();$$('[data-event-assigned-project]').forEach(b=>b.onclick=()=>{const p=recordById("projects",b.dataset.eventAssignedProject);if(p){dlg.close();showProjectDetails(p)}});$$('[data-event-shift-project]').forEach(b=>b.onclick=()=>{const p=recordById("projects",b.dataset.eventShiftProject);if(p){dlg.close();showProjectDetails(p)}});$("#eventAddAssignedProject")?.addEventListener("click",()=>{dlg.close();openProjectModal(null,{parentEventId:e.id,eventDate:eventStartDate(e)})});$("#eventShiftPdf")?.addEventListener("click",()=>vp210ExportEventShiftPdf(e));
  if(!locked){$("#detailEditEvent").onclick=()=>{dlg.close();openEventModal(e)};$("#detailDeleteEvent").onclick=()=>{if(confirm(`Termin „${e.title}“ in den Papierkorb verschieben?\n\nZugeordnete Projekte bleiben erhalten und werden bei einer Wiederherstellung wieder diesem Termin zugeordnet.`)){markDeleted("events",e.id);dlg.close();saveLocal()}};}
};




/* ---------- V-Planer 2.1.1: Schichtplan chronologisch nach Zeit ---------- */
function vp211ShiftLabel(project,shift){
  const direct=String(shift?.areaTask||"").trim();
  if(direct)return direct;
  const area=shift?.areaId?vp210ShiftAreaName(project,shift.areaId):"";
  const task=String(shift?.task||"").trim();
  const usableArea=area&&area!=="Ohne Bereich"?area:"";
  if(usableArea&&task&&usableArea.toLowerCase()!==task.toLowerCase())return `${usableArea} / ${task}`;
  return task||usableArea||"Schicht";
}
function vp211ShiftTimeMode(shift){
  if(["range","from","anytime"].includes(shift?.timeMode))return shift.timeMode;
  if(shift?.startTime&&shift?.endTime)return "range";
  if(shift?.startTime)return "from";
  return "anytime";
}
vp210ShiftTimeText=function(shift){
  const mode=vp211ShiftTimeMode(shift),s=shift?.startTime||"",e=shift?.endTime||"";
  if(mode==="anytime")return "jederzeit";
  if(mode==="from")return s?`ab ${s} Uhr`:"ab";
  if(s&&e)return `${s}–${e} Uhr`;
  return s?`${s} Uhr`:"ohne Uhrzeit";
};
function vp211ShiftSortKey(shift){
  const mode=vp211ShiftTimeMode(shift);
  if(mode==="anytime")return "99:99";
  return shift?.startTime||"98:98";
}
vp210ShiftSort=function(project,rows){
  return rows.slice().sort((a,b)=>
    String(vp210ShiftDate(project,a)||"").localeCompare(String(vp210ShiftDate(project,b)||""))||
    vp211ShiftSortKey(a).localeCompare(vp211ShiftSortKey(b))||
    vp211ShiftLabel(project,a).localeCompare(vp211ShiftLabel(project,b),"de")
  );
};
function vp211ShiftInterval(project,shift){
  const mode=vp211ShiftTimeMode(shift),date=vp210ShiftDate(project,shift),start=shift?.startTime||"";
  if(mode==="anytime"||!date||!start)return null;
  const base=Date.parse(`${date}T00:00:00`);if(!Number.isFinite(base))return null;
  const toMin=t=>{const [h,m]=String(t||"").split(":").map(Number);return Number.isFinite(h)&&Number.isFinite(m)?h*60+m:null};
  const sm=toMin(start);if(sm===null)return null;
  let em;
  if(mode==="from")em=24*60;
  else{em=toMin(shift?.endTime||"");if(em===null)return null;if(em<=sm)em+=24*60}
  const b=base/60000;
  return {start:b+sm,end:b+em};
}
vp210ShiftConflicts=function(project,candidate,memberId,excludeShiftId=""){
  const a=vp211ShiftInterval(project,candidate);if(!a)return [];
  const out=[];
  activeRows("projects").forEach(p=>vp210Shifts(p).forEach(s=>{
    if(p.id===project.id&&s.id===excludeShiftId)return;
    if(!(s.memberIds||[]).includes(memberId))return;
    const b=vp211ShiftInterval(p,s);if(!b)return;
    if(a.start<b.end&&b.start<a.end)out.push({project:p,shift:s});
  }));
  return out;
};
function vp211ShiftTimeBoxHTML(shift){
  const mode=vp211ShiftTimeMode(shift),s=shift?.startTime||"",e=shift?.endTime||"";
  if(mode==="anytime")return '<div class="shift-time-box anytime"><b>jederzeit</b></div>';
  if(mode==="from")return `<div class="shift-time-box"><b>ab ${esc(s||"--:--")}</b></div>`;
  return `<div class="shift-time-box"><b>${esc(s||"--:--")}</b>${e?`<span>bis ${esc(e)}</span>`:""}</div>`;
}
vp210OpenShiftModal=function(project,shift=null,presetAreaId="",onDone=()=>{}){
  const fixedDate=!!(project.parentEventId&&project.eventDate),defaultDate=project.eventDate||projectStartDate(project)||todayStr();
  const r=shift||{id:"",date:defaultDate,timeMode:"range",startTime:project.eventStartTime||"",endTime:project.eventEndTime||"",areaTask:"",required:1,memberIds:[],note:""};
  const currentMode=vp211ShiftTimeMode(r),currentLabel=vp211ShiftLabel(project,r)==="Schicht"?"":vp211ShiftLabel(project,r);
  showModal(shift?"Schicht bearbeiten":"Neue Schicht",`<div class="form-grid shift-form-v211">
    <label class="full">Bereich / Aufgabe<input id="shiftAreaTask" value="${esc(currentLabel)}" placeholder="z. B. Getränke / Kasse, Grill, Waffeln oder Springer"></label>
    <label>Datum<input id="shiftDate" type="date" value="${esc(r.date||defaultDate)}" ${fixedDate?"disabled":""}></label>
    <label>Zeitangabe<select id="shiftTimeMode"><option value="range" ${currentMode==="range"?"selected":""}>Von – Bis</option><option value="from" ${currentMode==="from"?"selected":""}>ab</option><option value="anytime" ${currentMode==="anytime"?"selected":""}>jederzeit</option></select></label>
    <label id="shiftStartWrap">Von<input id="shiftStart" type="time" value="${esc(r.startTime||"")}"></label>
    <label id="shiftEndWrap">Bis<input id="shiftEnd" type="time" value="${esc(r.endTime||"")}"></label>
    <label>Benötigte Personen<input id="shiftRequired" type="number" min="1" max="99" value="${Math.max(1,Number(r.required)||1)}"></label>
    <div class="form-section full">Eingeteilte Mitglieder</div>
    ${vp210ShiftMembersHTML(r.memberIds||[])}
    <label class="full">Notiz<textarea id="shiftNote" rows="3" placeholder="Optionaler Hinweis zur Schicht">${esc(r.note||"")}</textarea></label>
  </div>`,()=>{
    const areaTask=$("#shiftAreaTask").value.trim(),date=fixedDate?project.eventDate:$("#shiftDate").value,timeMode=$("#shiftTimeMode").value;
    let startTime=$("#shiftStart").value,endTime=$("#shiftEnd").value;
    const required=Math.max(1,Number($("#shiftRequired").value)||1),memberIds=$$('[data-shift-member]:checked').map(x=>x.dataset.shiftMember),note=$("#shiftNote").value.trim();
    if(!areaTask||!date){alert("Bitte Datum und Bereich / Aufgabe ausfüllen.");return false}
    if(timeMode==="range"&&(!startTime||!endTime)){alert("Bitte Von- und Bis-Uhrzeit ausfüllen.");return false}
    if(timeMode==="from"&&!startTime){alert("Bitte eine Startzeit für „ab“ angeben.");return false}
    if(timeMode==="anytime"){startTime="";endTime=""}
    if(timeMode==="from")endTime="";
    const candidate={date,timeMode,startTime,endTime,memberIds};
    const conflicts=[];memberIds.forEach(id=>vp210ShiftConflicts(project,candidate,id,shift?.id||"").forEach(c=>conflicts.push({memberId:id,...c})));
    if(conflicts.length){
      const lines=[];conflicts.slice(0,8).forEach(c=>lines.push(`${vp210ShiftMemberName(c.memberId)}: ${c.project.name} · ${vp211ShiftLabel(c.project,c.shift)} · ${vp210ShiftTimeText(c.shift)}`));
      if(!confirm(`Es gibt ${conflicts.length} mögliche Doppelbelegung${conflicts.length===1?"":"en"}:\n\n${lines.join("\n")}${conflicts.length>8?"\n…":""}\n\nTrotzdem speichern?`))return false;
    }
    const target=shift||{id:uid()};
    Object.assign(target,{areaTask,task:areaTask,areaId:"",date,timeMode,startTime,endTime,required,memberIds,note});
    if(!shift)vp210Shifts(project).push(target);touch(project);saveLocal();onDone();return true;
  });
  const syncTimeFields=()=>{
    const mode=$("#shiftTimeMode")?.value||"range",startWrap=$("#shiftStartWrap"),endWrap=$("#shiftEndWrap");
    if(startWrap)startWrap.style.display=mode==="anytime"?"none":"grid";
    if(endWrap)endWrap.style.display=mode==="range"?"grid":"none";
  };
  $("#shiftTimeMode")?.addEventListener("change",syncTimeFields);syncTimeFields();
};
vp210DeleteShift=function(project,shiftId,onDone=()=>{}){const s=vp210Shifts(project).find(x=>x.id===shiftId);if(!s)return;if(!confirm(`Schicht „${vp211ShiftLabel(project,s)}“ löschen?`))return;project.shifts=vp210Shifts(project).filter(x=>x.id!==shiftId);touch(project);saveLocal();onDone()};
vp210ShiftRowHTML=function(project,shift,readonly=false,context="time"){
  const names=(shift.memberIds||[]).map(vp210ShiftMemberName),showLabel=context!=="area",showDate=context==="area";
  return `<div class="shift-row shift-row-v211">${vp211ShiftTimeBoxHTML(shift)}<div class="shift-row-main">${showLabel?`<b>${esc(vp211ShiftLabel(project,shift))}</b>`:""}${showDate?`<small>${esc(fmtDate(vp210ShiftDate(project,shift)))}</small>`:""}<div class="shift-persons">${names.length?names.map(n=>`<span>${esc(n)}</span>`).join(""):'<em>Noch niemand eingeteilt</em>'}</div>${shift.note?`<div class="shift-note">${esc(shift.note)}</div>`:""}</div><div class="shift-row-side">${vp210ShiftOccupancyHTML(shift)}${!readonly?`<div class="shift-row-actions"><button class="btn tiny secondary" data-shift-edit="${shift.id}" type="button">Bearbeiten</button><button class="btn tiny danger" data-shift-delete="${shift.id}" type="button">Löschen</button></div>`:""}</div></div>`;
};
function vp211ShiftByTimeHTML(project,readonly=false){
  const shifts=vp210ShiftSort(project,vp210Shifts(project));
  if(!shifts.length)return '<div class="shift-empty"><b>Noch keine Schichten vorhanden.</b><span>Lege die erste Schicht an. Der Plan wird automatisch chronologisch sortiert.</span></div>';
  const groups=[];shifts.forEach(s=>{const date=vp210ShiftDate(project,s)||"";let g=groups.find(x=>x.date===date);if(!g){g={date,items:[]};groups.push(g)}g.items.push(s)});
  return groups.map(g=>`<section class="shift-day-card"><div class="shift-day-head"><div><b>${esc(g.date?vp209ProjectEventDayLabel(g.date):"Ohne Datum")}</b><span>${g.items.length} Schicht${g.items.length===1?"":"en"}</span></div></div><div class="shift-day-body">${g.items.map(s=>vp210ShiftRowHTML(project,s,readonly,"time")).join("")}</div></section>`).join("");
}
vp210ShiftByAreaHTML=function(project,readonly=false){
  const shifts=vp210ShiftSort(project,vp210Shifts(project));
  if(!shifts.length)return '<div class="shift-empty"><b>Noch keine Schichten vorhanden.</b><span>Lege zuerst eine Schicht an.</span></div>';
  const groups=new Map();shifts.forEach(s=>{const key=vp211ShiftLabel(project,s);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(s)});
  return [...groups.entries()].sort((a,b)=>a[0].localeCompare(b[0],"de")).map(([label,rows])=>`<section class="shift-area-card"><div class="shift-area-head"><div><b>${esc(label)}</b><span>${rows.length} Schicht${rows.length===1?"":"en"}</span></div></div><div class="shift-area-body">${rows.map(s=>vp210ShiftRowHTML(project,s,readonly,"area")).join("")}</div></section>`).join("");
};
vp210BindShiftPlanUI=function(project,readonly,rerender){
  $("#shiftAddShift")?.addEventListener("click",()=>vp210OpenShiftModal(project,null,"",rerender));
  $("#shiftPdfProject")?.addEventListener("click",()=>vp210ExportProjectShiftPdf(project));
  $$('[data-shift-view]').forEach(b=>b.onclick=()=>{vp210ShiftViewByProject[project.id]=b.dataset.shiftView;rerender()});
  $$('[data-shift-edit]').forEach(b=>b.onclick=()=>vp210OpenShiftModal(project,vp210Shifts(project).find(s=>s.id===b.dataset.shiftEdit),"",rerender));
  $$('[data-shift-delete]').forEach(b=>b.onclick=()=>vp210DeleteShift(project,b.dataset.shiftDelete,rerender));
};
vp210ShiftPlanPanelHTML=function(project,readonly=false){
  let view=vp210ShiftViewByProject[project.id]||"time";if(!["time","area"].includes(view))view="time";
  const stats=vp210ShiftPlanStats(project);
  return `<div class="shift-plan"><div class="shift-plan-toolbar"><div class="shift-plan-summary"><b>Schichtplan</b><span>${stats.shifts} Schichten · ${stats.helpers} Helfer · ${stats.assigned}/${stats.required||0} Besetzungen</span></div><div class="shift-plan-actions"><div class="shift-view-toggle"><button class="btn tiny ${view==="time"?"primary":"secondary"}" data-shift-view="time" type="button">Nach Zeit</button><button class="btn tiny ${view==="area"?"primary":"secondary"}" data-shift-view="area" type="button">Nach Bereich</button></div>${!readonly?'<button class="btn tiny primary" id="shiftAddShift" type="button">+ Schicht</button>':''}<button class="btn tiny secondary" id="shiftPdfProject" type="button">PDF exportieren</button></div></div>${view==="area"?vp210ShiftByAreaHTML(project,readonly):vp211ShiftByTimeHTML(project,readonly)}</div>`;
};
vp210EventShiftRows=function(event){
  const out=[];vp209ProjectsForEvent(event.id).forEach(project=>vp210Shifts(project).forEach(shift=>out.push({project,shift,date:vp210ShiftDate(project,shift)})));
  return out.sort((a,b)=>String(a.date||"").localeCompare(String(b.date||""))||vp211ShiftSortKey(a.shift).localeCompare(vp211ShiftSortKey(b.shift))||a.project.name.localeCompare(b.project.name,"de")||vp211ShiftLabel(a.project,a.shift).localeCompare(vp211ShiftLabel(b.project,b.shift),"de"));
};
vp210EventShiftOverviewHTML=function(event){
  const rows=vp210EventShiftRows(event);if(!rows.length)return "";
  const groups=[];rows.forEach(r=>{let g=groups.find(x=>x.date===r.date);if(!g){g={date:r.date,items:[]};groups.push(g)}g.items.push(r)});
  return `<section class="event-shift-overview"><div class="event-assigned-projects-head"><div><b>Schichtübersicht</b><span>${rows.length}</span></div><button class="btn tiny secondary" id="eventShiftPdf" type="button">PDF exportieren</button></div>${groups.map(g=>`<div class="event-shift-day"><div class="event-project-day-title">${esc(g.date?vp209ProjectEventDayLabel(g.date):"Ohne Datum")}</div>${g.items.map(({project,shift})=>`<button class="event-shift-row" data-event-shift-project="${project.id}" type="button"><span class="event-shift-time event-shift-time-v211">${esc(vp210ShiftTimeText(shift))}</span><span class="event-shift-main"><b>${esc(project.name)}</b><small>${esc(vp211ShiftLabel(project,shift))} · ${(shift.memberIds||[]).length?esc((shift.memberIds||[]).map(vp210ShiftMemberName).join(", ")):"noch unbesetzt"}</small></span>${vp210ShiftOccupancyHTML(shift)}<span class="event-project-assignment-chevron">›</span></button>`).join("")}</div>`).join("")}</section>`;
};
function vp211ShiftPersonsPdfText(shift){
  const names=(shift.memberIds||[]).map(vp210ShiftMemberName),needed=Math.max(1,Number(shift.required)||1),missing=Math.max(0,needed-names.length);
  if(!names.length)return missing>0?`Noch unbesetzt (${missing} offen)`:"Noch unbesetzt";
  return `${names.join(", ")}${missing?` · ${missing} offen`:""}`;
}
function vp211PdfStand(){return `Stand: ${new Intl.DateTimeFormat("de-DE",{dateStyle:"short",timeStyle:"short"}).format(new Date())} Uhr`}
vp210ExportProjectShiftPdf=function(project){
  const shifts=vp210ShiftSort(project,vp210Shifts(project));if(!shifts.length)return alert("Für dieses Projekt sind noch keine Schichten vorhanden.");
  const multiDate=new Set(shifts.map(s=>vp210ShiftDate(project,s))).size>1;
  const rows=shifts.map(s=>[`${multiDate?fmtDate(vp210ShiftDate(project,s))+" · ":""}${vp210ShiftTimeText(s)}`,vp211ShiftLabel(project,s),vp211ShiftPersonsPdfText(s)]);
  const parent=vp209ParentEventForProject(project),sub=[parent?.title||"",project.eventDate?fmtDate(project.eventDate):projectDateRangeText(project),vp211PdfStand()].filter(Boolean).join(" · ");
  vp210PdfDownload(`${vp210SafeFileName(`Schichtplan_${project.name}`)}.pdf`,`Schichtplan - ${project.name}`,sub,[{label:"Zeit",width:150},{label:"Bereich / Aufgabe",width:270},{label:"Eingeteilte Personen",width:350}],rows);
};
vp210ExportEventShiftPdf=function(event){
  const items=vp210EventShiftRows(event);if(!items.length)return alert("Für die zugeordneten Projekte sind noch keine Schichten vorhanden.");
  const multiDate=new Set(items.map(x=>x.date)).size>1;
  const rows=items.map(({project,shift})=>[`${multiDate?fmtDate(vp210ShiftDate(project,shift))+" · ":""}${vp210ShiftTimeText(shift)}`,project.name||"Projekt",vp211ShiftLabel(project,shift),vp211ShiftPersonsPdfText(shift)]);
  const sub=[eventDateRangeText(event),event.location,vp211PdfStand()].filter(Boolean).join(" · ");
  vp210PdfDownload(`${vp210SafeFileName(`Schichtplan_${event.title}`)}.pdf`,`Schichtplan - ${event.title}`,sub,[{label:"Zeit",width:125},{label:"Projekt",width:175},{label:"Bereich / Aufgabe",width:220},{label:"Eingeteilte Personen",width:250}],rows);
};

// Default views when entering the sections for the first time.
if(!localStorage.getItem(VP2_TASK_VIEW_KEY))localStorage.setItem(VP2_TASK_VIEW_KEY,db.settings.taskDefaultView||"list");
vp2ApplyAppearance();


applyUiScale();

if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
renderAll();
})();
