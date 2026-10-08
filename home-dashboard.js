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
const remindersPanel=panel('🔔 Ежедневные напоминания',false);
remindersPanel.append(make('p','home-muted','Галочки обновляются каждый день. Это чек-лист, а не push-уведомления.'));
const remindersList=make('div','home-list');remindersPanel.append(remindersList);
const remLine=make('div','home-add-line');
const remInput=make('input','home-field');remInput.placeholder='Добавить ежедневное дело';
const remAdd=make('button','chip','Добавить');remAdd.type='button';remLine.append(remInput,remAdd);remindersPanel.append(remLine);
const notesPanel=panel('📝 Заметки',false);
const draft=make('textarea','home-field');draft.rows=3;draft.placeholder='Записать мысль…';notesPanel.append(draft);
const addNote=make('button','chip home-action','Сохранить заметку +');addNote.type='button';notesPanel.append(addNote);
const notesList=make('div','home-list');notesPanel.append(notesList);
const urgent=panel('🛒 Срочно купить');
const urgentList=make('div','home-list');urgent.append(urgentList);go('shopping',urgent,'Все покупки →');
let wordIndex=0,revealed=false;
const today=new Date();const dayNumber=Math.floor(Date.UTC(today.getFullYear(),today.getMonth(),today.getDate())/86400000);
const difficult=czechWords.filter(w=>typeof wordReviewState==='function'&&(wordReviewState(w.cz).hard||0)>0);
const pool=difficult.length&&dayNumber%2===0?difficult:czechWords;
if(pool.length)wordIndex=czechWords.indexOf(pool[(dayNumber%pool.length+pool.length)%pool.length]);
function paintWord(){const w=czechWords[wordIndex];if(!w)return;front.textContent=w.cz;meaning.textContent=revealed?[w.ru,w.note].filter(Boolean).join(' · '):'';hint.textContent=revealed?'Нажми, чтобы скрыть перевод':'Нажми, чтобы увидеть перевод';card.setAttribute('aria-label',revealed?'Скрыть перевод':'Показать перевод')}
card.addEventListener('click',()=>{revealed=!revealed;paintWord()});
nextWord.addEventListener('click',()=>{wordIndex=(wordIndex+1)%czechWords.length;revealed=false;paintWord()});paintWord();
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
const remindersKey='myhub-home-reminders-v1';
let reminders=read(remindersKey);if(!Array.isArray(reminders))reminders=[];
function drawReminders(){
remindersList.replaceChildren();
if(!reminders.length)remindersList.append(make('div','home-empty','Добавь ежедневное дело ниже'));
reminders.forEach((reminder,i)=>{
const row=make('div','home-row');
const checked=make('input');checked.type='checkbox';checked.checked=reminder.lastDone===dayKey();
const txt=make('span','home-row-text',reminder.text);if(checked.checked)txt.classList.add('home-row-done');
checked.addEventListener('change',()=>{reminder.lastDone=checked.checked?dayKey():null;txt.classList.toggle('home-row-done',checked.checked);store(remindersKey,reminders)});
const del=make('button','home-remove','×');del.type='button';del.setAttribute('aria-label','Удалить дело');
del.addEventListener('click',()=>{reminders.splice(i,1);store(remindersKey,reminders);drawReminders()});
row.append(checked,txt,del);remindersList.append(row);
});
}
function addReminder(){const value=remInput.value.trim();if(!value)return;reminders.push({text:value,lastDone:null});store(remindersKey,reminders);remInput.value='';drawReminders()}
remAdd.addEventListener('click',addReminder);
remInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addReminder()}});
drawReminders();
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
