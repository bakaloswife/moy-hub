// Run with: NODE_PATH=/path/to/node_modules CHROMIUM_PATH=/path/to/chromium node tests/audit.test.cjs
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const original=execFileSync('git',['show','b78c560:index.html'],{cwd:root,encoding:'utf8'});
const scripts=html=>[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
assert.throws(()=>new vm.Script(scripts(original)[0]),/Invalid regular expression/);
for(const script of scripts(fs.readFileSync(path.join(root,'index.html'),'utf8')))new vm.Script(script);
new vm.Script(fs.readFileSync(path.join(root,'home-dashboard.js'),'utf8'));
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/seed'){res.end('<html></html>');return}
  const file=path.join(root,url.pathname==='/'?'index.html':url.pathname.slice(1));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return}
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));
});
const encode=value=>Buffer.from(value).toString('base64').replace(/=/g,'');
const id=name=>encode(name.trim().toLocaleLowerCase('ru-RU'));
const legacy=(group,name)=>encode(group+'|'+name);
let browser,base,total=0;
async function scenario(name,seed,run,options={}){
  const context=await browser.newContext({viewport:{width:390,height:844},...options});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/seed');
  await page.evaluate(values=>{for(const [key,value] of Object.entries(values))localStorage.setItem(key,value)},seed);
  await page.goto(base);
  try{await run(page);assert.deepEqual(errors,[],name+' JS errors');console.log('PASS '+name);total++}finally{await context.close()}
}
const rows=page=>page.evaluate(()=>allShoppingRows());
const has=async(page,item,group)=> (await rows(page)).filter(x=>x.item===item&&(!group||x.group===group));
const home=async page=>{assert.equal(await page.locator('#todayCard .home-panel').count(),5);assert.ok((await page.locator('.home-czech-word').textContent()).length>0);await page.locator('.home-flashcard').click();assert.ok((await page.locator('.home-czech-meaning').textContent()).length>0);await page.locator('.home-flashcard').click()};
async function shop(page){await page.locator('.nav[data-section="shopping"]').click()}
const groupCard=(page,group)=>page.locator('#shoppingGroups > .card').filter({has:page.locator('.group-head h3',{hasText:group})});
async function addUI(page,group,item){await groupCard(page,group).locator('.add-item-btn').click();await page.locator('#newShopItem').fill(item);await page.locator('.sheet-submit').click()}
async function deleteUI(page,group,item){const card=groupCard(page,group);await card.locator('.delete-mode-btn').click();await card.locator('.collapse-btn').click();await card.locator('.item').filter({hasText:item}).locator('.delete-item-btn').click()}
async function checkUI(page,group,item){const card=groupCard(page,group);await card.locator('.collapse-btn').click();await card.locator('.item').filter({hasText:item}).locator('input').click()}
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
  for(const mobile of [false,true])await scenario(mobile?'Mobile UI lifecycle':'Desktop UI lifecycle',{},async page=>{
    await home(page);if(mobile)await page.screenshot({path:'/tmp/hub-mobile-home.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await shop(page);await addUI(page,'Одежда','Тестовый топ');await page.reload();await shop(page);
    assert.equal((await has(page,'Тестовый топ','Одежда')).length,1);
    await checkUI(page,'Одежда','Тестовый топ');assert.equal(await page.locator('#shoppingGroups .item').filter({hasText:'Тестовый топ'}).count(),0);
    await page.reload();await shop(page);await page.locator('[data-shopfilter="done"]').click();
    await page.locator('#shoppingGroups .item').filter({hasText:'Тестовый топ'}).locator('input').click();
    await page.reload();await shop(page);assert.equal((await has(page,'Тестовый топ','Одежда'))[0].checked,false);
    await page.evaluate(()=>moveShoppingItem('Одежда','Тестовый топ','Дом'));
    await page.reload();await shop(page);assert.equal((await has(page,'Тестовый топ','Дом')).length,1);
    await deleteUI(page,'Дом','Тестовый топ');await page.reload();assert.equal((await has(page,'Тестовый топ')).length,0);await home(page);
    await shop(page);await addUI(page,'Дом','Тестовый топ');await page.reload();assert.equal((await has(page,'Тестовый топ','Дом')).length,1);
  },mobile?{isMobile:true,hasTouch:true}:{viewport:{width:1280,height:900}});
  for(const [group,item] of [['Косметика и уход','Catrice Glam & Doll Volume Brown Waterproof (119 Kč, Notino)'],['Электроника','Holicí strojek (машинка для бритья)'],['Одежда','Noční košile'],['Ногти','Аккумуляторный аппарат для маникюра Activ Power JD308 — 1 шт.']])await scenario('Default deletion: '+group,{},async page=>{
    await shop(page);await deleteUI(page,group,item);await page.reload();assert.equal((await has(page,item)).length,0);
  });
  await scenario('Legacy tombstones and clothing rename',{'myhub-shopping-deleted-v1':JSON.stringify([legacy('Плановые покупки по надобности','Holicí strojek (машинка для бритья)'),legacy('Одежда','Noční košile (ночнушка)')])},async page=>{
    assert.equal((await has(page,'Holicí strojek (машинка для бритья)')).length,0);assert.equal((await has(page,'Noční košile')).length,0);await page.reload();await home(page);
  });
  const fork='Vidličky (вилки)';
  await scenario('Current false wins over legacy true',{'myhub-shopping-v1':JSON.stringify({[legacy('Дом',fork)]:true,[id(fork)]:false})},async page=>{
    assert.equal((await has(page,fork))[0].checked,false);await page.evaluate(item=>setShopState('Дом',item,true,false),fork);await page.evaluate(item=>setShopState('Дом',item,false,false),fork);await page.reload();assert.equal((await has(page,fork))[0].checked,false);
  });
  await scenario('Legacy-only purchased state after category move',{'myhub-shopping-v1':JSON.stringify({[legacy('Старая категория',fork)]:true})},async page=>{
    assert.equal((await has(page,fork))[0].checked,true);await page.evaluate(item=>setShopState('Дом',item,false,false),fork);await page.reload();assert.equal((await has(page,fork))[0].checked,false);
  });
  const seed={'myhub-shopping-custom-v1':JSON.stringify({'Одежда':['Мой топ'],'Ногти':['Моя фреза'],'Дом':[fork],'Продукты — рамен':['Мой суп'],'Сегодняшний план покупок':['Мой план покупок']}),'myhub-shopping-v1':'{}','myhub-shopping-deleted-v1':'[]','myhub-home-notes-v1':JSON.stringify([{text:'Моя заметка'}]),'myhub-day-plan-v1':JSON.stringify([{id:'p1',text:'Мой план',time:'18:00'}]),'myhub-czech-review-v1':JSON.stringify({'vztek':{level:2,known:1,next:1}})};
  await scenario('Initialization preserves all existing data',seed,async page=>{
    await home(page);assert.equal((await has(page,'Мой топ','Одежда')).length,1);assert.equal((await has(page,'Моя фреза','Ногти')).length,1);assert.equal((await has(page,'Мой суп','Продукты — обычные')).length,1);assert.equal((await has(page,'Мой план покупок','Дом')).length,1);
    for(const [key,raw] of Object.entries(seed))assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),raw);
    await page.reload();await home(page);
  });
  await scenario('Manual category beats keyword routing',{'myhub-shopping-custom-v1':JSON.stringify({'Дом':['USB-C nabíječka (блок зарядки USB-C)']})},async page=>{
    assert.equal((await has(page,'USB-C nabíječka (блок зарядки USB-C)','Дом')).length,1);assert.equal((await has(page,'USB-C nabíječka (блок зарядки USB-C)')).length,1);
  });
  await scenario('Purchased preset can return to active cosmetics',{},async page=>{
    const item='Akneroxid 5% gel — уже есть дома';assert.equal((await has(page,item))[0].checked,true);await page.evaluate(item=>setShopState('Косметика и уход',item,false,false),item);await page.reload();await shop(page);assert.equal((await has(page,item,'Косметика и уход'))[0].checked,false);assert.equal(await page.locator('#shoppingGroups .item').filter({hasText:item}).count(),1);
  });
  await scenario('Recipe explicit re-add after deletion',{},async page=>{
    await page.evaluate(()=>addCaesarMissingToShopping());await page.evaluate(()=>deleteShoppingItem('Продукты — обычные','Куриное филе'));await page.reload();assert.equal((await has(page,'Куриное филе')).length,0);
    await page.evaluate(()=>addCaesarMissingToShopping());await page.reload();assert.equal((await has(page,'Куриное филе')).length,1);
  });
  for(const value of ['null','[', '42','"string"'])await scenario('Corrupt storage preserved: '+value,{'myhub-shopping-custom-v1':value,'myhub-shopping-v1':value,'myhub-recipe-added-v1':value,'myhub-czech-review-v1':value,'myhub-home-notes-v1':value,'myhub-day-plan-v1':value},async page=>{
    await home(page);for(const key of ['myhub-shopping-custom-v1','myhub-shopping-v1','myhub-recipe-added-v1','myhub-czech-review-v1','myhub-home-notes-v1','myhub-day-plan-v1'])assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),value);
    await page.evaluate(()=>addShoppingItem('Дом','Не перезаписывать повреждения'));assert.equal(await page.evaluate(()=>localStorage.getItem('myhub-shopping-custom-v1')),value);assert.equal(await page.locator('#storageNotice').count(),1);
  });
  await scenario('Mixed damaged note and plan records',{'myhub-home-notes-v1':JSON.stringify([null,42,{text:'Сохранённая заметка'}]),'myhub-day-plan-v1':JSON.stringify([null,'bad',{id:'a',text:'Сохранённый план'}])},async page=>{await home(page);assert.equal(await page.locator('#todayCard').getByText('Сохранённый план',{exact:true}).count(),1)});
  await scenario('Storage access/write exceptions leave dashboard usable',{},async page=>{
    await page.addInitScript(()=>{Storage.prototype.getItem=function(){throw new DOMException('Denied','SecurityError')};Storage.prototype.setItem=function(){throw new DOMException('Full','QuotaExceededError')}});
    await page.reload();await home(page);await page.evaluate(()=>addShoppingItem('Дом','Ошибка записи'));assert.equal(await page.locator('#storageNotice').count(),1);
  });
  await scenario('Names render as text, not HTML',{},async page=>{
    await shop(page);await addUI(page,'Дом','<img src=x onerror="window.injected=true">');assert.equal(await page.locator('#shoppingGroups img').count(),0);assert.equal(await page.evaluate(()=>window.injected),undefined);await page.reload();assert.equal((await has(page,'<img src=x onerror="window.injected=true">')).length,1);
  });
  await scenario('Bought item retains state and destination after move',{},async page=>{
    await page.evaluate(()=>{setShopState('Дом','Vidličky (вилки)',true,false);moveShoppingItem('Дом','Vidličky (вилки)','Электроника')});await page.reload();assert.equal((await has(page,fork,'Электроника'))[0].checked,true);
    await page.evaluate(()=>setShopState('Электроника','Vidličky (вилки)',false,false));await page.reload();assert.equal((await has(page,fork,'Электроника'))[0].checked,false);
  });
  await scenario('Pipe character in current item ID is not a legacy separator',{},async page=>{
    await page.evaluate(()=>{addShoppingItem('Дом','чай | кофе');deleteShoppingItem('Дом','чай | кофе')});await page.reload();assert.equal((await has(page,'чай | кофе')).length,0);assert.equal((await has(page,'кофе')).length,0);
    await page.evaluate(()=>{addShoppingItem('Дом','чай | кофе');addShoppingItem('Дом','кофе');setShopState('Дом','чай | кофе',true,false)});await page.reload();assert.equal((await has(page,'чай | кофе'))[0].checked,true);assert.equal((await has(page,'кофе'))[0].checked,false);
  });
  const notesPanel=page=>page.locator('.home-panel').filter({has:page.locator('summary',{hasText:'Заметки'})});
  const planPanel=page=>page.locator('.home-panel').filter({has:page.locator('summary',{hasText:'Дневной план'})});
  await scenario('Existing draft survives failed note save',{'myhub-home-notes-v1':'[','myhub-home-note-draft-v1':'Важный существующий черновик'},async page=>{
    const panel=notesPanel(page);await panel.locator('summary').click();await panel.getByRole('button',{name:'Сохранить заметку +'}).click();
    assert.equal(await page.evaluate(()=>localStorage.getItem('myhub-home-note-draft-v1')),'Важный существующий черновик');assert.equal(await panel.locator('textarea').inputValue(),'Важный существующий черновик');assert.equal(await page.evaluate(()=>localStorage.getItem('myhub-home-notes-v1')),'[');
    await page.reload();await notesPanel(page).locator('summary').click();assert.equal(await notesPanel(page).locator('textarea').inputValue(),'Важный существующий черновик');
  });
  await scenario('Existing draft survives quota error',{'myhub-home-notes-v1':'[{"text":"Старая заметка"}]','myhub-home-note-draft-v1':'Черновик при переполнении'},async page=>{
    await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='myhub-home-notes-v1')throw new DOMException('Full','QuotaExceededError');return original.call(this,key,value)}});
    const panel=notesPanel(page);await panel.locator('summary').click();await panel.getByRole('button',{name:'Сохранить заметку +'}).click();assert.equal(await page.evaluate(()=>localStorage.getItem('myhub-home-note-draft-v1')),'Черновик при переполнении');assert.equal(await page.evaluate(()=>localStorage.getItem('myhub-home-notes-v1')),'[{"text":"Старая заметка"}]');assert.equal(await panel.locator('.home-row').count(),1);
  });
  await scenario('Note add edit delete preserves unrelated notes',{'myhub-home-notes-v1':'[{"text":"Существующая заметка"}]'},async page=>{
    let panel=notesPanel(page);await panel.locator('summary').click();await panel.locator('textarea').fill('Новая заметка');await panel.getByRole('button',{name:'Сохранить заметку +'}).click();await page.reload();panel=notesPanel(page);await panel.locator('summary').click();const text=panel.locator('[contenteditable]').filter({hasText:'Новая заметка'});await text.fill('Изменённая заметка');await page.reload();panel=notesPanel(page);await panel.locator('summary').click();await panel.locator('.home-row').filter({hasText:'Изменённая заметка'}).getByRole('button',{name:'Удалить заметку'}).click();await page.reload();assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('myhub-home-notes-v1'))),[{text:'Существующая заметка'}]);
  });
  await scenario('Daily plan add edit delete preserves unrelated plans',{'myhub-day-plan-v1':'[{"id":"old","text":"Существующий план","date":"2099-01-01"}]'},async page=>{
    let panel=planPanel(page);await panel.getByRole('button',{name:'+ Добавить план'}).click();await panel.getByLabel('Название плана').fill('Новый план');await panel.getByLabel('Время, необязательно').fill('18:30');await panel.getByRole('button',{name:'Сохранить',exact:true}).click();await page.reload();panel=planPanel(page);const title=panel.locator('[contenteditable]').filter({hasText:'Новый план'});await title.fill('Изменённый план');await page.keyboard.press('Tab');await page.reload();panel=planPanel(page);const row=panel.locator('.home-row').filter({hasText:'Изменённый план'});await row.getByRole('button',{name:'Изменить время или дату'}).click();await panel.getByLabel('Время, необязательно').fill('19:00');await panel.getByRole('button',{name:'Сохранить',exact:true}).click();await page.reload();assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('myhub-day-plan-v1')))).find(x=>x.text==='Изменённый план').time,'19:00');await planPanel(page).locator('.home-row').filter({hasText:'Изменённый план'}).getByRole('button',{name:'Удалить план'}).click();await page.reload();assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('myhub-day-plan-v1'))),[{id:'old',text:'Существующий план',date:'2099-01-01'}]);
  });
  await scenario('Navigation and all recipe buttons remain functional',{},async page=>{
    for(const section of ['shopping','workouts','care','czech','home']){await page.locator('.nav[data-section="'+section+'"]').click();assert.equal(await page.locator('#'+section).evaluate(el=>el.classList.contains('active')),true)}
    await page.getByRole('button',{name:'Все тренировки →'}).click();assert.equal(await page.locator('#workoutDays > .day').count(),7);
    await page.evaluate(()=>showSection('recipes'));for(const button of ['addCaesarToShopping','addChineseChickenToShopping','addFunchozaToShopping','addDonkatsuToShopping','addLazyLasagnaToShopping']){const card=page.locator('#'+button).locator('xpath=ancestor::div[contains(@class,"recipe-card")]');await card.locator('h3').click();await page.locator('#'+button).click()}
    assert.ok((await rows(page)).some(x=>x.item==='Пармезан'));await page.reload();assert.ok((await rows(page)).some(x=>x.item==='Пармезан'));
  });
  await scenario('Czech dictionary search cards and review remain functional',{'myhub-czech-review-v1':'{"неизвестное старое слово":{"known":7}}'},async page=>{
    await page.locator('.nav[data-section="czech"]').click();await page.locator('#czechSearch').fill('vztek');assert.equal(await page.locator('#czechWordsList .czech-word').count(),1);await page.locator('[data-czechtab="cards"]').click();assert.ok((await page.locator('#czechCardFront').textContent()).length>0);await page.locator('#czechFlashcard').click();assert.equal(await page.locator('#czechCardBack').isVisible(),true);await page.locator('#czechNext').click();await page.locator('#czechShuffle').click();await page.locator('[data-czechtab="review"]').click();await page.locator('#reviewFlashcard').click();await page.locator('#reviewGood').click();const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('myhub-czech-review-v1')));assert.deepEqual(saved['неизвестное старое слово'],{known:7});assert.ok(Object.keys(saved).length>1);await page.reload();assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('myhub-czech-review-v1'))['неизвестное старое слово']),{known:7});
  });
  await scenario('Default purchases preserved against repaired upstream baseline',{},async page=>{
    const current=await page.evaluate(()=>allShoppingRows().map(row=>itemId(row.group,row.item)));
    const matcher=fs.readFileSync(path.join(root,'index.html'),'utf8').split('\n').find(line=>line.startsWith('const isShaver='));
    const baseline=original.replace(/^const isShaver=.*$/m,()=>matcher).replace(/<script src="home-dashboard\.js[^>]*><\/script>/,'');
    await page.route(base+'/baseline',route=>route.fulfill({contentType:'text/html',body:baseline}));await page.goto(base+'/baseline');
    const previous=await page.evaluate(()=>allShoppingRows().map(row=>row.item));await page.goto(base);
    const previousIds=await page.evaluate(items=>items.map(item=>itemId('',item)),previous);
    assert.deepEqual([...new Set(current)].sort(),[...new Set(previousIds)].sort());
  });
  console.log(`${total} browser scenarios passed; baseline syntax failure reproduced.`);
})().catch(error=>{console.error(error);process.exitCode=1}).finally(async()=>{if(browser)await browser.close();server.close()});
