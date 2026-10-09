/* Home dashboard. Uses the existing app data and local browser storage. */
(function(){
'use strict';
const root=document.getElementById('todayCard');
if(!root||typeof workouts==='undefined'||typeof careMe==='undefined'||typeof czechWords==='undefined')return;
const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el};
const store=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch(e){console.warn('Unable to store data',e)}};
const read=(key)=>{try{return JSON.parse(localStorage.getItem(key)||'null')}catch(e){return null}};
const playlists={
  stretching:{name:'Стретчинг',url:'https://youtube.com/playlist?list=PLKandqretRBY&si=A1HoLVZjWWn9Cl9d'},
  mobility:{name:'Мобилити',url:'https://youtube.com/playlist?list=PLVV4y7K6QDmM&si=blP4zf8WDnGvAM0f'},
  core:{name:'Кор',url:'https://youtube.com/playlist?list=PLP1yXZ0Auviw&si=bR5hWxYEidRO8mJg'},
  workout:{name:'Воркаут',url:'https://youtube.com/playlist?list=PLD9H_zziCmVenSg0enNjSvJnxQ9qTFPzf&si=_0WW1MqbGwxBwu7k'}
};
const playlistDays={0:'stretching',1:'workout',2:'core',3:'mobility',4:'stretching',5:'workout',6:'core'};
const dayKey=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
function panel(label,open=true){
const details=make('details','home-panel');details.open=open;
const summary=make('summary');summary.append(make('span','',label),make('span','home-chevron','⌄'));
const body=make('div','home-panel-content');details.append(summary,body);root.querySelector('.home-layout').append(details);
return body;
}
function go(name,container,label){
const button=make('button','chip home-action',label);button.type='button';
button.addEventListener('click',()=>{if(typeof showSection==='function')showSection(name)});
container.append(button);
}
root.replaceChildren();root.append(make('div','home-layout'));
const training=panel('🏋️ Тренировка сегодня');
const workoutTitle=make('div','home-title'),workoutSub=make('div','home-muted');
const video=make('a','video','Открыть плейлист ↗');video.target='_blank';video.rel='noopener noreferrer';
training.append(workoutTitle,workoutSub,video);
const playlistShortcuts=make('div','home-card-bottom home-playlist-grid');
playlistShortcuts.style.display='grid';
playlistShortcuts.style.gridTemplateColumns='repeat(2, minmax(0, 1fr))';
playlistShortcuts.style.gap='9px';
for(const key of ['stretching','mobility','core','workout']){
  const p=playlists[key];const link=make('a','chip',p.name);link.href=p.url;link.target='_blank';link.rel='noopener noreferrer';link.style.textDecoration='none';
  playlistShortcuts.append(link);
}
training.append(playlistShortcuts);
go('workouts',training,'Все тренировки →');
const care=panel('🌙 Вечернее умывание');
const careText=make('div','step');care.append(careText);go('care',care,'Весь уход →');
const cz=panel('🇨🇿 Чешская карточка');
const card=make('button','home-flashcard');card.type='button';
const front=make('span','home-czech-word'),meaning=make('span','home-czech-meaning');
const hint=make('span','small','Нажми, чтобы увидеть перевод');card.append(front,meaning,hint);cz.append(card);
const czBottom=make('div','home-card-bottom');czBottom.append(make('span','small','Из твоего словаря'));
const nextWord=make('button','chip','Другое слово ↻');nextWord.type='button';czBottom.append(nextWord);cz.append(czBottom);
const dayPlanPanel=panel('🗓️ Дневной план',true);
const dayPlanMorning=make('div','');const dayPlanEvening=make('div','');const dayPlanLoose=make('div','');
const planTimer=make('div','');
planTimer.style.cssText='background:var(--card2);border-radius:16px;padding:13px;margin:10px 0;display:grid;gap:10px';
const planAddButton=make('button','chip home-action','+ Добавить план');
planAddButton.type='button';
const planForm=make('div','');planForm.hidden=true;planForm.style.cssText='display:none;background:var(--card2);padding:12px;border-radius:14px;margin-top:10px';
const planName=make('input','home-field');planName.placeholder='Что запланировано?';planName.setAttribute('aria-label','Название плана');
const planTime=make('input','home-field');planTime.type='time';planTime.setAttribute('aria-label','Время, необязательно');
const planDate=make('input','home-field');planDate.type='date';planDate.setAttribute('aria-label','Дата, необязательно');
const planSave=make('button','chip','Сохранить');planSave.type='button';
const planCancel=make('button','chip','Отмена');planCancel.type='button';
const planInputs=make('div','home-add-line');planInputs.append(planTime,planDate);
const planButtons=make('div','home-add-line');planButtons.append(planSave,planCancel);
planForm.append(planName,planInputs,make('div','home-muted','Время и дата необязательны. Без времени дело появится в «Планах». Уведомления не отправляются.'),planButtons);
const workoutPlanRow=make('div','home-row');workoutPlanRow.append(make('span','','🏋️'),make('span','home-row-text','Тренировка (в перерыв)'));
dayPlanPanel.append(dayPlanMorning,planTimer,workoutPlanRow,dayPlanEvening,dayPlanLoose,planAddButton,planForm);
const notesPanel=panel('📝 Заметки',false);
const draft=make('textarea','home-field');draft.rows=3;draft.placeholder='Записать мысль…';notesPanel.append(draft);
const addNote=make('button','chip home-action','Сохранить заметку +');addNote.type='button';notesPanel.append(addNote);
const notesList=make('div','home-list');notesPanel.append(notesList);
const urgent=panel('🛒 Срочно купить');
const urgentList=make('div','home-list');urgent.append(urgentList);go('shopping',urgent,'Все покупки →');
let wordIndex=0,revealed=false;
const czechRotationKey='myhub-home-czech-rotation-v1';
const shuffleWords=items=>{
  const list=[...items];
  for(let i=list.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [list[i],list[j]]=[list[j],list[i]];
  }
  return list;
};
function nextCzechWord(){
  if(!czechWords.length)return;
  const keys=[...new Set(czechWords.map(w=>w.cz))];
  const saved=read(czechRotationKey);
  const previous=typeof saved?.last==='string'?saved.last:null;
  let remaining=Array.isArray(saved?.remaining)?saved.remaining.filter((key,i,arr)=>keys.includes(key)&&arr.indexOf(key)===i):[];
  const known=Array.isArray(saved?.known)?saved.known:keys;
  const added=keys.filter(key=>!known.includes(key));
  if(remaining.length){
    // Only genuinely new vocabulary joins an unfinished cycle.
    remaining=shuffleWords([...remaining,...added]);
  }else{
    remaining=shuffleWords(keys);
  }
  if(remaining.length>1&&remaining[remaining.length-1]===previous){
    const j=remaining.findIndex(key=>key!==previous);
    [remaining[j],remaining[remaining.length-1]]=[remaining[remaining.length-1],remaining[j]];
  }
  const chosen=remaining.pop();
  wordIndex=czechWords.findIndex(w=>w.cz===chosen);
  store(czechRotationKey,{remaining,last:chosen,known:keys});
  revealed=false;
  paintWord();
}
function paintWord(){const w=czechWords[wordIndex];if(!w)return;front.textContent=w.cz;meaning.textContent=revealed?[w.ru,w.note].filter(Boolean).join(' · '):'';hint.textContent=revealed?'Нажми, чтобы скрыть перевод':'Нажми, чтобы увидеть перевод';card.setAttribute('aria-label',revealed?'Скрыть перевод':'Показать перевод')}
card.addEventListener('click',()=>{revealed=!revealed;paintWord()});
nextWord.addEventListener('click',nextCzechWord);
nextCzechWord();
const notesKey='myhub-home-notes-v1',draftKey='myhub-home-note-draft-v1';
let notes=read(notesKey);if(!Array.isArray(notes))notes=[];
try{draft.value=localStorage.getItem(draftKey)||''}catch(e){}
draft.addEventListener('input',()=>{try{localStorage.setItem(draftKey,draft.value)}catch(e){}});
function drawNotes(){
notesList.replaceChildren();
if(!notes.length)notesList.append(make('div','home-empty','Пока нет заметок'));
notes.forEach((note,i)=>{
const row=make('div','home-row');
const txt=make('span','home-row-text',note.text);txt.contentEditable='true';txt.setAttribute('role','textbox');txt.setAttribute('aria-label','Редактировать заметку');txt.setAttribute('tabindex','0');
txt.addEventListener('input',()=>{note.text=txt.textContent;store(notesKey,notes)});
const del=make('button','home-remove','×');del.type='button';del.setAttribute('aria-label','Удалить заметку');
del.addEventListener('click',()=>{notes.splice(i,1);store(notesKey,notes);drawNotes()});
row.append(txt,del);notesList.append(row);
});
}
addNote.addEventListener('click',()=>{const value=draft.value.trim();if(!value)return;notes.unshift({text:value,date:new Date().toISOString()});store(notesKey,notes);draft.value='';try{localStorage.removeItem(draftKey)}catch(e){}drawNotes()});
drawNotes();
const planKey='myhub-day-plan-v1';
const routineMorning=[
  ['💧','Умыться'],['💊','Принять таблетки'],['⚖️','Взвеситься'],['🛏️','Застелить постель']
];
const routineEvening=[
  ['📚','Языки'],['🎮','Свободное время'],['💊','Принять таблетки'],['💧','Умыться']
];
let planItems=read(planKey);
if(!Array.isArray(planItems))planItems=[];
const safeTime=t=>typeof t==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(t)?t:'';
const minutes=t=>{const p=t.split(':').map(Number);return p[0]*60+p[1]};
const drawRoutine=(root,title,entries,items)=>{
  root.replaceChildren();
  const heading=make('div','home-title',title);heading.style.margin='13px 0 8px';root.append(heading);
  entries.forEach(entry=>{const row=make('div','home-row');row.append(make('span','',entry[0]),make('span','home-row-text',entry[1]));root.append(row)});
  items.forEach(item=>root.append(makePlanRow(item)));
};
function makePlanRow(item){
  const row=make('div','home-row');
  if(item.time){const tm=make('span','',item.time);tm.style.cssText='color:var(--muted);font-variant-numeric:tabular-nums;min-width:48px';row.append(tm)}
  const title=make('span','home-row-text',item.text);title.contentEditable='true';title.setAttribute('role','textbox');title.setAttribute('aria-label','Изменить план');
  title.addEventListener('blur',()=>{const next=title.textContent.trim();if(!next){title.textContent=item.text;return}item.text=next;store(planKey,planItems)});
  const edit=make('button','home-remove','✎');edit.type='button';edit.setAttribute('aria-label','Изменить время или дату');
  edit.addEventListener('click',()=>{planName.value=item.text;planTime.value=item.time||'';planDate.value=item.date||'';editingPlanId=item.id;openPlanForm()});
  const del=make('button','home-remove','×');del.type='button';del.setAttribute('aria-label','Удалить план');
  del.addEventListener('click',()=>{planItems=planItems.filter(p=>p.id!==item.id);store(planKey,planItems);renderDayPlan()});
  row.append(title,edit,del);return row;
}
function renderDayPlan(){
  const today=dayKey();
  const shown=planItems.filter(item=>!item.date||item.date===today);
  const byTime=shown.filter(item=>safeTime(item.time)).sort((a,b)=>a.time.localeCompare(b.time));
  drawRoutine(dayPlanMorning,'☀️ Утро · до 16:00',routineMorning,byTime.filter(item=>minutes(item.time)<16*60));
  drawRoutine(dayPlanEvening,'🌙 Вечер · после 16:00',routineEvening,byTime.filter(item=>minutes(item.time)>=16*60));
  dayPlanLoose.replaceChildren();
  const heading=make('div','home-title','📌 Планы');heading.style.margin='13px 0 8px';dayPlanLoose.append(heading);
  const loose=shown.filter(item=>!safeTime(item.time));
  if(!loose.length)dayPlanLoose.append(make('div','home-muted','Пока ничего не добавлено'));
  loose.forEach(item=>dayPlanLoose.append(makePlanRow(item)));
}
let editingPlanId=null;
function openPlanForm(){planForm.hidden=false;planForm.style.display='grid';planForm.style.gap='9px';planAddButton.hidden=true;planAddButton.style.display='none';planName.focus()}
function closePlanForm(){editingPlanId=null;planForm.hidden=true;planForm.style.display='none';planAddButton.hidden=false;planAddButton.style.display='';planName.value='';planTime.value='';planDate.value=''}
planAddButton.addEventListener('click',openPlanForm);
planCancel.addEventListener('click',closePlanForm);
planSave.addEventListener('click',()=>{
  const name=planName.value.trim();if(!name)return;
  const tm=planTime.value;const date=planDate.value;
  if(editingPlanId!==null){const item=planItems.find(p=>p.id===editingPlanId);if(item)Object.assign(item,{text:name,time:tm,date})}
  else planItems.push({id:String(Date.now())+'-'+Math.random().toString(36).slice(2),text:name,time:tm,date});
  store(planKey,planItems);closePlanForm();renderDayPlan();
});
planName.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();planSave.click()}});
renderDayPlan();
const workStages=[
  {start:420,end:705,name:'Работа',next:'Фокус'},
  {start:705,end:780,name:'Фокус',next:'Перерыв / тренировка'},
  {start:780,end:840,name:'Перерыв / тренировка',next:'Фокус'},
  {start:840,end:960,name:'Фокус',next:'Конец рабочего дня'}
];
function clock(min){return String(Math.floor(min/60)).padStart(2,'0')+':'+String(min%60).padStart(2,'0')}
function updateWorkTimer(){
  const now=new Date(),sec=now.getHours()*3600+now.getMinutes()*60+now.getSeconds(),current=sec/60;
  const active=workStages.find(stage=>current>=stage.start&&current<stage.end);
  const top=make('div','');top.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:10px';
  const title=make('strong','','💻 Рабочий день');const hours=make('span','home-muted','07:00–16:00');top.append(title,hours);
  const middle=make('div','');middle.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:12px';
  const left=make('div','');const right=make('div','');right.style.textAlign='right';
  const label=make('div','home-title',active?active.name:current<420?'До начала работы':'Рабочий день завершён');
  const time=make('div','home-muted',active?clock(active.start)+'–'+clock(active.end):current<420?'Начало в 07:00':'До завтра');
  left.append(label,time);
  const nextBoundary=active?active.end*60:current<420?420*60:(24+7)*3600;
  const secondsLeft=Math.max(0,Math.ceil(nextBoundary-sec));
  const digits=String(Math.floor(secondsLeft/3600)).padStart(2,'0')+':'+String(Math.floor(secondsLeft%3600/60)).padStart(2,'0')+':'+String(secondsLeft%60).padStart(2,'0');
  const countdown=make('strong','',digits);countdown.style.cssText='font-size:23px;font-variant-numeric:tabular-nums;letter-spacing:-.04em';
  right.append(countdown,make('div','home-muted',active?'До конца этапа':current<420?'До начала':'До следующего дня'));
  middle.append(left,right);
  const progress=active?Math.min(100,Math.max(0,Math.floor((current-active.start)/(active.end-active.start)*100))):current<420?0:100;
  const track=make('div','');track.style.cssText='height:6px;border-radius:20px;background:var(--line);overflow:hidden';
  const fill=make('div','');fill.style.cssText='height:100%;width:'+progress+'%;background:var(--accent);border-radius:20px';track.append(fill);
  const bottom=make('div','');bottom.style.cssText='display:flex;justify-content:space-between;gap:8px;font-size:12px;color:var(--muted)';
  bottom.append(make('span','',progress+'% выполнено'),make('span','',active?'Далее: '+active.next:current<420?'Далее: работа':'Далее: работа в 07:00'));
  planTimer.replaceChildren(top,middle,track,bottom);
}
updateWorkTimer();
setInterval(()=>{updateWorkTimer();if(dayKey()!==lastPlanDay){lastPlanDay=dayKey();renderDayPlan()}},1000);
let lastPlanDay=dayKey();
function refresh(){
const now=new Date(),d=now.getDay(),w=workouts[d],careDay=careMe[d];
workoutTitle.textContent=w.title;
const dayPlaylist=playlists[playlistDays[d]];
workoutSub.textContent=d===0?'Восстановление · стретчинг по желанию':(w.dur||'Выбери видео в плейлисте');
video.href=dayPlaylist.url;
video.textContent='▶ Открыть плейлист «'+dayPlaylist.name+'» ↗';
careText.textContent=careDay[1].replace(/^Вечер:\s*/,'');
urgentList.replaceChildren();
const group='Срочно купить',items=(shopping[group]||[]).filter(item=>!deletedItems.includes(itemId(group,item))&&!(saved[itemId(group,item)]??false));
if(!items.length)urgentList.append(make('div','home-empty','Всё срочное куплено ✓'));
items.forEach(item=>{
const row=make('label','home-row');
const check=make('input');check.type='checkbox';
const txt=make('span','home-row-text',item);row.append(check,txt);
check.addEventListener('change',()=>{setShopState(group,item,check.checked,false)});
urgentList.append(row);
});
}
function replaceWorkoutVideos(){
  const daysRoot=document.getElementById('workoutDays');
  if(!daysRoot)return;
  const dayOrder=[1,2,3,4,5,6,0];
  [...daysRoot.querySelectorAll(':scope > .day')].forEach((dayElement,index)=>{
    const d=dayOrder[index],playlist=playlists[playlistDays[d]];
    if(!playlist)return;
    const oldVideo=dayElement.querySelector('.video');
    const link=make('a','video');
    link.href=playlist.url;link.target='_blank';link.rel='noopener noreferrer';
    link.append(make('div','video-title','▶ '+playlist.name+' — плейлист YouTube'));
    link.append(make('div','video-link',d===0?'Открыть по желанию ↗':'Выбрать тренировку ↗'));
    if(oldVideo)oldVideo.replaceWith(link);
    else {
      const note=dayElement.querySelector('.note');
      if(note)dayElement.insertBefore(link,note);else dayElement.append(link);
    }
  });
}
replaceWorkoutVideos();
renderToday=refresh;
refresh();
})();
