'use strict';
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const assetURL = path => new URL(String(path).replace(/^\//,''),document.baseURI).href;
const roman = n => ['','I','II','III','IV','V','VI','VII','VIII','IX','X'][n] || String(n);
let store;
try { store = JSON.parse(localStorage.getItem('librarium.pages.v1') || '{}'); } catch { store = {}; }
if (!store || typeof store !== 'object' || Array.isArray(store)) store = {};
for (const key of ['positions','bookmarks','notes','prefs']) if (!store[key] || typeof store[key] !== 'object') store[key] = {};
let books=[], catalog=[], book=null, activeBook=null, page=0, selectedTerm='loken', currentTab='card', pageTerms=[], matcher, aliases=new Map(), bookRequest=0, wikiRequest=0, searchTimer, toastTimer, selectedText='';
const noteDrafts = new Map();
const loaded = new Map(), wikiMemory = new Map();
let mediaEntries={};
const galleryPositions=new Map();
function save() { try {localStorage.setItem('librarium.pages.v1',JSON.stringify(store));} catch {toast('Tarayıcı kayıt alanı dolu. Ayarlardan bir yedek alın.');} }
function toast(message) { $('toast').textContent=message; $('toast').classList.remove('hidden'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('toast').classList.add('hidden'),3200); }
async function api(url,options) { return window.LibrariumStorage.request(url,options); }
function showDialog(id) { $(id).showModal(); }
function closeDialog(id) { $(id).close(); }
function showIntel(){ document.body.classList.remove('info-hidden','focus-mode'); document.body.classList.add('show-intel'); }
function getEntry(id) { const entry=catalog.find(e=>e.id===id); return entry&&store.prefs.lang==='en'&&entry.en?{...entry,...entry.en}:entry; }
function uiLocale(){return store.prefs.lang==='en'?'en-GB':'tr';}
function changeLanguage(value){
 store.prefs.lang=value==='en'?'en':'tr';save();$('languageSelect').value=store.prefs.lang;
 window.LibrariumI18n.setLanguage(store.prefs.lang);
 const readingTop=$('readingScroll').scrollTop;
 renderBooks();
 if(book){renderTOC();renderPage();$('readingScroll').scrollTop=readingTop;}
 renderIntel();searchCodex();if(book&&$('bookSearch').value.trim().length>=2)searchBook();
 window.LibrariumI18n.refresh();
}
function setTab(tab) {currentTab=tab; for(const el of document.querySelectorAll('[data-tab]')) {el.classList.toggle('active',el.dataset.tab===tab);el.setAttribute('aria-selected',String(el.dataset.tab===tab));} renderIntel();}
function compileTerms(){ aliases.clear(); for(const e of catalog) for(const a of e.aliases) aliases.set(a.toLocaleLowerCase('en'),e.id); matcher=new RegExp('(?<![\\p{L}\\p{N}])('+[...aliases.keys()].sort((a,b)=>b.length-a.length).map(escapeRegex).join('|')+')(?![\\p{L}\\p{N}])','giu'); }
function termMatches(text) {return [...text.matchAll(matcher)].filter(m=>aliases.get(m[0].toLocaleLowerCase('en'))!=='murder'||m[0]==='Murder'||m[0]==='MURDER');}
function decorate(text) {
 let result='',end=0;
 for(const m of termMatches(text)){result+=esc(text.slice(end,m.index));const id=aliases.get(m[0].toLocaleLowerCase('en'));result+=store.prefs.highlight===false?esc(m[0]):`<button class="term ${id===selectedTerm?'selected':''}" data-term="${id}" title="${esc(getEntry(id)?.name)} · Bilgi kartı">${esc(m[0])}</button>`;end=m.index+m[0].length;}
 return result+esc(text.slice(end));
}
function paragraphs(text){
 // Keep explicit paragraphs. For fixed-width PDF text, join wrapped lines conservatively.
 const lines=text.replace(/\r/g,'').split('\n');
 const lengths=lines.map(l=>l.trim().length).filter(n=>n>25).sort((a,b)=>a-b);
 const width=lengths[Math.floor(lengths.length*.65)]||65;
 let blocks=[],current='';
 const flush=()=>{if(current.trim())blocks.push(current.trim());current='';};
 for(let i=0;i<lines.length;i++){
  const raw=lines[i],l=raw.trim();
  if(!l){flush();continue;}
  if(l.length<65 && /^[A-Z\s0-9~:—–.,'’!?-]+$/.test(l) && (i<7||!current)) {flush();blocks.push({heading:l});continue;}
  if(current && /^[“‘"']/.test(l) && /[.!?…’'"]$/.test(current) && (lines[i-1]||'').trim().length<width*.91)flush();
  if(current.endsWith('-') && /^[a-z]/.test(l)) current=current.slice(0,-1)+l;
  else current+=(current?' ':'')+l;
  if(/[.!?…’'"]$/.test(l)&&l.length<width*.76)flush();
 }
 flush();return blocks;
}
function renderBooks(){
 $('bookCount').textContent=`${books.length} KİTAP`;
 $('libraryStats').textContent=`${books.reduce((n,b)=>n+b.count,0).toLocaleString('tr')} sayfa · PDF arşivi`;
 $('bookList').innerHTML=books.map((b,i)=>{const pos=store.positions[b.id];const pct=pos!=null?Math.round((pos+1)/Math.max(b.count,1)*100):0;return `<button class="book-item ${b.id===activeBook?.id?'active':''}" data-book="${b.id}" aria-label="${esc(b.title)} kitabını aç" ${b.error?'disabled':''}>${b.cover?`<img class="cover" src="${esc(assetURL(b.cover))}" alt="${esc(b.title)} kapağı">`:`<span class="cover cover-fallback">${roman(i+1)}</span>`}<span class="book-info"><strong>${esc(b.title)}</strong><small>${esc(b.author||b.series)} · ${b.count} s.</small><span class="mini-progress"><span style="width:${pct}%"></span></span></span></button>`;}).join('')||'<p class="empty-state">Bu klasörde PDF bulunamadı. Kitaplık ayarlarından klasörünü seç.</p>';
}
async function loadLibrary(){const data=await api('/api/library');books=data.books;$('libraryPath').value=data.root;renderBooks();return data;}
async function openBook(id,target){
 const request=++bookRequest;const info=books.find(b=>b.id===id);if(!info)return;if(!info.imported){$('bookFiles').click();return;}
 activeBook=info;store.lastBook=id;save();renderBooks();
 $('pageText').innerHTML='<p class="loading">Kitap metni hazırlanıyor</p>';
 $('bookTitle').textContent=info.title;$('bookAuthor').textContent=info.author||info.series;
 $('seriesName').textContent=info.series.toLocaleUpperCase('tr');
 $('bookNumber').textContent=roman(books.indexOf(info)+1);$('volumeLabel').textContent=`${info.series.toLocaleUpperCase('tr')} · KİTAP ${roman(books.indexOf(info)+1)}`;
 $('toc').innerHTML='';$('pdfFrame').classList.add('hidden');$('pageText').classList.remove('hidden');
 $('nextPage').disabled=$('prevPage').disabled=true;
 try{
  const data=loaded.get(id)||await api('/api/book?id='+encodeURIComponent(id));if(request!==bookRequest)return;loaded.set(id,data);book=data;
  renderTOC();const saved=store.positions[id];goPage(target??(Number.isInteger(saved)?saved:data.start));
  document.body.classList.remove('show-library');
 }catch(e){if(request===bookRequest){book=null;$('pageText').innerHTML=`<p class="error">${esc(e.message)}</p>`;toast(e.message);}}
}
function renderTOC(){
 $('toc').innerHTML=book.toc.length?book.toc.map(c=>`<button class="depth-${c.depth}" data-page="${c.page}" title="PDF sayfası ${c.page+1}">${esc(c.title)}</button>`).join(''):'<p class="subtle">Bu PDF bölüm imi içermiyor. Sayfa numarasıyla veya aramayla gezinebilirsin.</p>';
}
function goPage(n){
 if(!book)return;const value=Number(n);if(!Number.isFinite(value))return;
 page=Math.max(0,Math.min(book.count-1,Math.trunc(value)));store.positions[book.id]=page;save();
 renderPage();renderBooks();$('readingScroll').scrollTop=0;
}
function renderPage(){
 if(!book)return;
 const text=book.pages[page]||'';const found=new Map();
 for(const m of termMatches(text)){const id=aliases.get(m[0].toLocaleLowerCase('en'));found.set(id,(found.get(id)||0)+1);}
 pageTerms=[...found].map(([id,count])=>({entry:getEntry(id),count})).sort((a,b)=>b.count-a.count);
 $('termCount').textContent=pageTerms.length;
 const chapter=[...book.toc].filter(c=>c.page<=page).sort((a,b)=>b.page-a.page)[0];
 $('chapterTitle').textContent=chapter?.title||'';
 if(text.trim()) $('pageText').innerHTML=paragraphs(text).filter((p,i)=>!(i===0&&typeof p==='object'&&p.heading.toLocaleLowerCase('en')===chapter?.title.toLocaleLowerCase('en'))).map(p=>typeof p==='object'?`<h3>${decorate(p.heading)}</h3>`:`<p>${decorate(p)}</p>`).join('');
 else $('pageText').innerHTML='<div class="empty-page"><h3>Görsel sayfası</h3><p>Bu sayfada seçilebilir metin yok. Özgün PDF görünümünden okuyabilirsin.</p><button class="outline" id="viewOriginal">Özgün sayfayı göster ↗</button></div>';
 const isPdf=!!store.prefs.pdf;$('pdfFrame').classList.toggle('hidden',!isPdf);$('pageText').classList.toggle('hidden',isPdf);
 if(isPdf)$('pdfFrame').src=window.LibrariumStorage.pdfURL(book.id)+`#page=${page+1}&view=FitH`;
 $('pageInput').value=page+1;$('pageInput').max=book.count;$('pageTotal').textContent='/ '+book.count;
 const pct=(page+1)/book.count*100;$('progressPercent').textContent=Math.round(pct)+'%';$('progressBar').style.width=pct+'%';
 $('prevPage').disabled=page===0;$('nextPage').disabled=page===book.count-1;
 const marked=(store.bookmarks[book.id]||[]).includes(page);$('bookmark').textContent=marked?'◆':'♧';$('bookmark').title=marked?'Yer imini kaldır':'Yer imi ekle';$('bookmark').setAttribute('aria-label',$('bookmark').title);
 for(const b of $('toc').querySelectorAll('[data-page]')) b.classList.toggle('current',Number(b.dataset.page)===chapter?.page);
 if(currentTab!=='card')renderIntel();
}
function selectTerm(id){selectedTerm=id;setTab('card');showIntel();if(book)for(const el of $('pageText').querySelectorAll('[data-term]'))el.classList.toggle('selected',el.dataset.term===id);}
function wikiLink(entry){return 'https://warhammer40k.fandom.com/wiki/'+encodeURIComponent((entry.wiki||entry.name).replaceAll(' ','_'));}

function cardImages(entry){
 const local=(mediaEntries[entry.id]?.images||[]).filter(i=>/^\/assets\/wiki\/[a-f0-9]{24}\.(jpg|png|webp|gif)$/.test(i.local));
 return local.length?local.map(i=>({...i,local:assetURL(i.local)})):entry.image?[{local:assetURL(entry.image),caption:entry.name,source:wikiLink(entry),width:400,height:520}]:[];
}
function renderMedia(entry){
 const images=cardImages(entry);
 if(!images.length)return `<div class="gallery-missing"><span>Bu kayıtta henüz yerel görsel yok.</span><a class="text-button" href="${wikiLink(entry)}" target="_blank" rel="noopener noreferrer">Wiki'de araştır ↗</a></div>`;
 const index=Math.min(galleryPositions.get(entry.id)||0,images.length-1),current=images[index];
 return `<div class="local-gallery"><button id="galleryOpen" class="portrait-wrap gallery-open" aria-label="Görseli büyüt"><img id="cardWikiImage" src="${esc(current.local)}" alt="${esc(current.caption||entry.name)}" class="${current.width>current.height*1.25?'wide-art':''}"><span class="portrait-label">YEREL GÖRSEL · ${images.length}</span><span class="enlarge-icon">⛶</span></button>${images.length>1?`<div class="gallery-thumbnails">${images.map((i,n)=>`<button data-gallery-index="${n}" aria-label="${esc(entry.name)} · ${n+1}. görsel" aria-pressed="${n===index}" class="${n===index?'active':''}"><img src="${esc(i.local)}" alt=""></button>`).join('')}</div>`:''}<div class="gallery-caption"><span id="galleryCounter">${index+1} / ${images.length}</span><a id="cardImageSource" href="${esc(current.source)}" target="_blank" rel="noopener noreferrer">Wiki görsel kaynağı ↗</a></div><p class="gallery-spoiler">Wiki çizimleri sonraki dönemlerdeki görünümleri içerebilir.</p></div>`;
}
function setGalleryImage(value){
 const entry=getEntry(selectedTerm);if(!entry)return;const images=cardImages(entry);if(!images.length)return;
 const index=((value%images.length)+images.length)%images.length;galleryPositions.set(entry.id,index);const current=images[index];
 const picture=$('cardWikiImage');if(picture){picture.src=current.local;picture.alt=current.caption||entry.name;picture.classList.toggle('wide-art',current.width>current.height*1.25);$('galleryCounter').textContent=`${index+1} / ${images.length}`;$('cardImageSource').href=current.source;}
 for(const b of document.querySelectorAll('[data-gallery-index]')){const active=Number(b.dataset.galleryIndex)===index;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));}
 if($('imageDialog').open)updateImageDialog();
}
function updateImageDialog(){
 const entry=getEntry(selectedTerm),images=cardImages(entry),index=galleryPositions.get(entry.id)||0,current=images[index];
 if(!current)return;$('largeWikiImage').src=current.local;$('largeWikiImage').alt=current.caption||entry.name;$('imageTitle').textContent=entry.name;$('imageCaption').textContent=current.caption||entry.name;$('imagePosition').textContent=`${index+1} / ${images.length}`;$('imageSource').href=current.source;$('imagePrev').disabled=$('imageNext').disabled=images.length<2;
}
function openGallery(){showDialog('imageDialog');updateImageDialog();}
async function fetchCardImages(){
 const entry=getEntry(selectedTerm);if(!entry)return;const button=$('fetchCardImages');button.disabled=true;button.textContent='Görseller indiriliyor…';
 try{const result=await api('/api/cache-media',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:entry.id})});mediaEntries[entry.id]=result;if(selectedTerm===entry.id&&currentTab==='card')renderIntel();toast(result.images?.length?'Görseller diske kaydedildi.':'Bu kayıt için indirilebilir wiki görseli bulunamadı.');}
 catch(e){toast(e.message);}
 finally{if($('fetchCardImages')){$('fetchCardImages').disabled=false;$('fetchCardImages').textContent='Wiki görsellerini indir ↓';}}
}
$('imagePrev').onclick=()=>setGalleryImage((galleryPositions.get(selectedTerm)||0)-1);
$('imageNext').onclick=()=>setGalleryImage((galleryPositions.get(selectedTerm)||0)+1);

function renderCard(){
 const entry=getEntry(selectedTerm);if(!entry)return '<p class="empty-state">Bir terime dokunarak bilgi kartını aç.</p>';
 return `<section class="card"><div class="card-kind"><span>◈ ${esc(entry.kind.toLocaleUpperCase(uiLocale()))}</span><span>ARŞİV / ${esc(entry.id.slice(0,4).toUpperCase())}</span></div>${renderMedia(entry)}<h2>${esc(entry.name)}</h2><p class="card-group">${esc(entry.group||'Wiki araştırması')}</p><p class="summary">${esc(entry.summary||'Bu terim hazır sözlükte yer almıyor. Wiki ayrıntılarını açarak eşleşen kaydı araştırabilirsin.')}</p><div class="card-rule"></div>${entry.related?.length?`<div class="card-section-label">BAĞLANTILI KAYITLAR</div><div class="related">${entry.related.map(id=>{const e=getEntry(id);return e?`<button data-term="${e.id}">${esc(e.name)}</button>`:'';}).join('')}</div>`:''}<div class="wiki-gate"><b>Wiki arşivine bağlan</b><p>İngilizce kaynak metni ve wiki görselleri. İlerideki kitapların olaylarını gösterebilir.</p><button id="wikiUnlock" class="outline">Wiki ayrıntılarını aç ↗</button></div><div id="wikiResult" class="wiki-result"></div><div class="source-links"><a href="${wikiLink(entry)}" target="_blank" rel="noopener noreferrer">40K Wiki ↗</a><a href="https://wh40k.lexicanum.com/wiki/${encodeURIComponent(entry.lex||entry.name.replaceAll(' ','_'))}" target="_blank" rel="noopener noreferrer">Lexicanum ↗</a></div><div class="card-rule"></div><p class="source-note">Türkçe kısa tanım · romanlardaki başlangıç rolleri ve evren bilgisi. Aynı isim farklı bağlamlarda kullanılabilir.${entry.image?' Portre: Warhammer 40,000 Wiki / ilgili hak sahipleri.':''}</p></section>`;
}
function renderPageTerms(){return `<div class="card-section-label">BU SAYFADA SAPTANAN ${pageTerms.length} KAYIT</div>${pageTerms.map(({entry:e,count})=>`<button class="page-term" data-term="${e.id}"><span><strong>${esc(e.name)}</strong><small>${esc(e.kind)} · ${esc(e.group)}</small></span><span>×${count}</span></button>`).join('')||'<p class="empty-state">Bu sayfada sözlükle eşleşen bir terim yok. Herhangi bir ifadeyi seçip wiki araması yapabilirsin.</p>'}`;}
function renderNotes(){
 if(!book)return '<p class="empty-state">Önce bir kitap seç.</p>';
 const notes=store.notes[book.id]||[];const bookmarks=store.bookmarks[book.id]||[];
 return `<h2 class="notes-title">Okuma defteri</h2><p class="subtle">${esc(book.title)} · Sayfa ${page+1}</p><textarea id="noteInput" class="notes-input" placeholder="Bu sayfa hakkında bir not…" aria-label="Sayfa notu">${esc(noteDrafts.get(book.id+':'+page)||'')}</textarea><div class="notes-actions"><span class="small-label">Yalnızca bu tarayıcıda</span><button id="saveNote" class="outline">Notu kaydet</button></div><div class="card-section-label">YER İMLERİ / ${bookmarks.length}</div>${bookmarks.slice().sort((a,b)=>a-b).map(p=>`<div class="bookmark-row"><button data-page="${p}">◆ Sayfa ${p+1}</button><button data-remove-bookmark="${p}" title="Yer imini kaldır" aria-label="Sayfa ${p+1} yer imini kaldır">×</button></div>`).join('')||'<p class="subtle">Üstteki yer imi düğmesiyle sayfaları sakla.</p>'}<div class="card-rule"></div><div class="card-section-label">NOTLAR / ${notes.length}</div>${notes.slice().reverse().map(n=>`<div class="saved-note"><div class="note-head"><button data-page="${n.page}">Sayfa ${n.page+1} ↗</button><button data-remove-note="${esc(n.id)}" title="Notu kaldır" aria-label="Notu kaldır">×</button></div><p>${esc(n.text)}</p></div>`).join('')||'<p class="subtle">Henüz bir not yok.</p>'}`;
}
function renderIntel(){++wikiRequest;$('intelContent').innerHTML=currentTab==='card'?renderCard():currentTab==='page'?renderPageTerms():renderNotes();$('intelContent').scrollTop=0;}
function safeRemoteImage(url){try{const u=new URL(url);return u.protocol==='https:'&&u.hostname==='static.wikia.nocookie.net'&&u.pathname.startsWith('/warhammer40k/');}catch{return false;}}
async function unlockWiki(termOverride){
 const entry=getEntry(selectedTerm);if(!entry)return;const term=termOverride||entry.wiki||entry.name;const token=++wikiRequest;
 const target=$('wikiResult');if(!target)return;target.innerHTML='<div class="loading">Wiki kaydı alınıyor</div>';
 const button=$('wikiUnlock');if(button){button.disabled=true;button.textContent='Araştırılıyor…';}
 try{
  const data=wikiMemory.get(term)||await api('/api/wiki?term='+encodeURIComponent(term));if(token!==wikiRequest||!$('wikiResult'))return;
  if(!data.error)wikiMemory.set(term,data);
  if(data.error){target.innerHTML=`<p class="error">${esc(data.error)}</p>${data.suggestions?.length?'<div class="related">'+data.suggestions.map(t=>`<button data-wiki-choice="${esc(t)}">${esc(t)}</button>`).join('')+'</div>':''}`;}
  else{target.innerHTML=`<div class="card-rule"></div><div class="card-section-label">WIKI KAYDI · ENGLISH</div><h3>${esc(data.title)}</h3>${safeRemoteImage(data.image)&&!cardImages(entry).length?`<img src="${esc(data.image)}" alt="${esc(data.caption||data.title)}" referrerpolicy="no-referrer">`:''}<p class="wiki-excerpt">${esc(data.excerpt||'Bu sayfadan kısa bir giriş metni alınamadı. Kaynak bağlantısından okuyabilirsiniz.')}</p><p class="wiki-meta">Kısa kaynak alıntısı · <a href="${esc(data.url)}" target="_blank" rel="noopener noreferrer">${esc(data.source)} ↗</a><br>Metin: CC BY-SA · Görseller: ilgili hak sahipleri<br>${data.cached?'Önbellekten · ':''}${new Date(data.fetched*1000).toLocaleDateString(uiLocale())}${data.stale?' · Bağlantı kurulamadı, son kayıt gösteriliyor.':''}</p>`;}
 }catch(e){if(token===wikiRequest)target.innerHTML=`<p class="error">${esc(e.message)}</p>`;}
 finally{if(token===wikiRequest&&$('wikiUnlock')){$('wikiUnlock').disabled=false;$('wikiUnlock').textContent='Kaydı yeniden aç ↗';}}
}
function research(text){
 text=text.replace(/\s+/g,' ').trim().slice(0,100);if(!text)return;
 const known=aliases.get(text.toLocaleLowerCase('en'));if(known){selectTerm(known);return;}
 const id='custom-'+text.toLocaleLowerCase('en');if(!getEntry(id))catalog.push({id,name:text,kind:'Araştırma',wiki:text,group:'Seçili metinden wiki araması',related:[]});selectTerm(id);
}
function toggleBookmark(n=page){if(!book)return;const list=store.bookmarks[book.id]||[];const exists=list.includes(n);store.bookmarks[book.id]=exists?list.filter(p=>p!==n):[...list,n];save();renderPage();toast(exists?'Yer imi kaldırıldı.':'Sayfa yer imlerine eklendi.');}
function applyPrefs(){const p=store.prefs;p.font=Math.min(30,Math.max(15,Number(p.font)||20));document.documentElement.style.setProperty('--text-size',p.font+'px');$('fontValue').textContent=p.font;$('highlightSetting').checked=p.highlight!==false;$('lightSetting').checked=!!p.light;$('pdfSetting').checked=!!p.pdf;document.body.classList.toggle('light-reading',!!p.light);}
function searchBook(){
 const q=$('bookSearch').value.trim();if(!book||q.length<2){$('searchResults').innerHTML='';$('searchSummary').textContent='Aramak için en az iki karakter yaz.';return;}
 const matches=[];const needle=q.toLocaleLowerCase('en');for(let p=0;p<book.count;p++){const text=book.pages[p];const index=text.toLocaleLowerCase('en').indexOf(needle);if(index>=0)matches.push({p,index,text});}
 $('searchSummary').textContent=`${matches.length} sayfada bulundu${matches.length>100?' · İlk 100 sonuç gösteriliyor':''}.`;
 $('searchResults').innerHTML=matches.slice(0,100).map(m=>{const start=Math.max(0,m.index-65),end=Math.min(m.text.length,m.index+q.length+105);return `<button class="search-result" data-search-page="${m.p}"><small>SAYFA ${m.p+1}</small>${start?'… ':''}${esc(m.text.slice(start,m.index))}<mark>${esc(m.text.slice(m.index,m.index+q.length))}</mark>${esc(m.text.slice(m.index+q.length,end))}${end<m.text.length?' …':''}</button>`;}).join('');
}
function searchCodex(){const q=$('codexSearch').value.trim().toLocaleLowerCase(uiLocale());const list=catalog.filter(e=>!e.id.startsWith('custom-')&&[e.name,e.kind,e.group,e.en?.kind,e.en?.group,...e.aliases||[]].join(' ').toLocaleLowerCase(uiLocale()).includes(q)).map(e=>getEntry(e.id));$('codexSummary').textContent=`${list.length} hazır kayıt · Bir kaydı aç veya farklı bir terimi wiki'de araştır.`;$('codexResults').innerHTML=list.map(e=>`<button class="page-term" data-codex-term="${e.id}"><span><strong>${esc(e.name)}</strong><small>${esc(e.kind)} · ${esc(e.group)}</small></span><span>↗</span></button>`).join('')||'<p class="empty-state">Hazır eşleşme yok. Yukarıdaki Wiki\'de araştır düğmesini kullan.</p>';}
document.addEventListener('click',event=>{
 const el=event.target.closest('button,a');if(!el)return;
 if(el.dataset.book)openBook(el.dataset.book);
 if(el.dataset.term)selectTerm(el.dataset.term);
 if(el.dataset.page)goPage(Number(el.dataset.page));
 if(el.dataset.close)closeDialog(el.dataset.close);
 if(el.dataset.codexTerm){closeDialog('codexDialog');selectTerm(el.dataset.codexTerm);}
 if(el.dataset.searchPage){goPage(Number(el.dataset.searchPage));closeDialog('searchDialog');}
 if(el.dataset.removeBookmark)toggleBookmark(Number(el.dataset.removeBookmark));
 if(el.dataset.removeNote&&book){store.notes[book.id]=(store.notes[book.id]||[]).filter(n=>n.id!==el.dataset.removeNote);save();renderIntel();toast('Not kaldırıldı.');}
 if(el.dataset.wikiChoice)unlockWiki(el.dataset.wikiChoice);
 if(el.id==='wikiUnlock')unlockWiki();
 if(el.dataset.galleryIndex!==undefined)setGalleryImage(Number(el.dataset.galleryIndex));
 if(el.id==='galleryOpen')openGallery();
 if(el.id==='fetchCardImages')fetchCardImages();
 if(el.id==='viewOriginal'){store.prefs.pdf=true;save();applyPrefs();renderPage();}
 if(el.id==='saveNote'){
  const text=$('noteInput').value.trim();if(!text||!book)return;const list=store.notes[book.id]||[];list.push({id:crypto.randomUUID(),page,text,created:Date.now()});store.notes[book.id]=list;noteDrafts.delete(book.id+':'+page);save();renderIntel();toast('Not kaydedildi.');
 }
});
$('prevPage').onclick=()=>goPage(page-1);$('nextPage').onclick=()=>goPage(page+1);
$('pageInput').addEventListener('change',()=>goPage(Number($('pageInput').value)-1));
$('bookmark').onclick=()=>toggleBookmark();
$('languageSelect').onchange=()=>changeLanguage($('languageSelect').value);
$('searchOpen').onclick=()=>{showDialog('searchDialog');$('bookSearch').focus();};
$('bookSearch').oninput=()=>{clearTimeout(searchTimer);searchTimer=setTimeout(searchBook,180);};
$('codexOpen').onclick=()=>{showDialog('codexDialog');searchCodex();$('codexSearch').focus();};
$('codexSearch').oninput=searchCodex;
$('codexForm').onsubmit=e=>{e.preventDefault();const q=$('codexSearch').value;closeDialog('codexDialog');research(q);};
$('helpOpen').onclick=()=>showDialog('helpDialog');$('settingsOpen').onclick=()=>showDialog('settingsDialog');
$('typeOpen').onclick=()=>$('typePopover').classList.toggle('hidden');
$('fontUp').onclick=()=>{store.prefs.font=Math.min(30,store.prefs.font+1);applyPrefs();save();};
$('fontDown').onclick=()=>{store.prefs.font=Math.max(15,store.prefs.font-1);applyPrefs();save();};
for(const [id,key] of [['highlightSetting','highlight'],['lightSetting','light'],['pdfSetting','pdf']])$(id).onchange=()=>{store.prefs[key]=$(id).checked;applyPrefs();save();renderPage();};
$('focusToggle').onclick=()=>document.body.classList.toggle('focus-mode');
$('infoToggle').onclick=()=>{if(innerWidth<=1000)document.body.classList.toggle('show-intel');else document.body.classList.toggle('info-hidden');};
$('libraryToggle').onclick=()=>document.body.classList.toggle('show-library');
$('intelClose').onclick=()=>document.body.classList.remove('show-intel');
for(const el of document.querySelectorAll('[data-tab]'))el.onclick=()=>setTab(el.dataset.tab);
document.addEventListener('input',e=>{if(e.target.id==='noteInput'&&book)noteDrafts.set(book.id+':'+page,e.target.value);});
document.addEventListener('pointerdown',e=>{if(!$('typePopover').contains(e.target)&&!$('typeOpen').contains(e.target))$('typePopover').classList.add('hidden');});
document.addEventListener('mouseup',e=>{
 if(e.target.closest('#selectionLookup'))return;
 const selection=window.getSelection();const anchor=selection?.anchorNode?.parentElement;
 if(anchor?.closest('#pageText') && selection.toString().trim().length>1 && selection.toString().trim().length<=100){selectedText=selection.toString();$('selectionLookup').classList.remove('hidden');}
 else $('selectionLookup').classList.add('hidden');
});
$('selectionLookup').onmousedown=e=>e.preventDefault();
$('selectionLookup').onclick=()=>{research(selectedText);$('selectionLookup').classList.add('hidden');window.getSelection()?.removeAllRanges();};
document.addEventListener('keydown',e=>{
 if($('imageDialog').open){if(e.key==='ArrowRight'){e.preventDefault();setGalleryImage((galleryPositions.get(selectedTerm)||0)+1);}if(e.key==='ArrowLeft'){e.preventDefault();setGalleryImage((galleryPositions.get(selectedTerm)||0)-1);}return;}
 if(e.target.matches('input,textarea,select')||document.querySelector('dialog[open]'))return;
 if(e.key==='ArrowRight'){e.preventDefault();goPage(page+1);}if(e.key==='ArrowLeft'){e.preventDefault();goPage(page-1);}
 if(e.key.toLowerCase()==='f')document.body.classList.toggle('focus-mode');
 if(e.key.toLowerCase()==='k')$('codexOpen').click();
 if(e.key==='Escape'){document.body.classList.remove('show-intel','show-library','focus-mode');$('typePopover').classList.add('hidden');}
});
$('rescan').onclick=()=>$('bookFiles').click();
$('addBooks').onclick=()=>$('bookFiles').click();
$('bookFiles').onchange=importBookFiles;
$('exportData').onclick=()=>{const blob=new Blob([JSON.stringify({format:'librarium.v1',...store},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`librarium-yedek-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('importData').onchange=async e=>{
 try{const file=e.target.files[0];if(!file)return;if(file.size>5_000_000)throw new Error('Yedek 5 MB sınırını aşıyor.');const data=JSON.parse(await file.text());if(!['librarium.v1','librarium.pages.v1'].includes(data.format))throw new Error('Geçerli bir Librarium yedeği seçin.');
  for(const [id,pos]of Object.entries(data.positions||{}))if(Number.isInteger(pos)&&pos>=0)store.positions[id]=pos;
  for(const [id,list]of Object.entries(data.bookmarks||{}))if(Array.isArray(list))store.bookmarks[id]=[...new Set([...(store.bookmarks[id]||[]),...list.filter(n=>Number.isInteger(n)&&n>=0)])];
  for(const [id,list]of Object.entries(data.notes||{}))if(Array.isArray(list)){const prior=store.notes[id]||[];store.notes[id]=[...prior,...list.filter(n=>n&&typeof n.id==='string'&&Number.isInteger(n.page)&&typeof n.text==='string'&&!prior.some(p=>p.id===n.id))];}
  save();renderBooks();if(book)goPage(store.positions[book.id]??page);toast('Yedek mevcut notlara ve yer imlerine eklendi.');
 }catch(err){toast(err.message);}finally{e.target.value='';}
};
async function init(){
 store.prefs.lang=store.prefs.lang==='en'?'en':'tr';$('languageSelect').value=store.prefs.lang;
 window.LibrariumI18n.start(store.prefs.lang);
 applyPrefs();
 try{const result=await Promise.all([api('/catalog.json'),loadLibrary(),api('/api/media').catch(()=>({entries:{}}))]);catalog=result[0];mediaEntries=result[2].entries||{};compileTerms();renderIntel();const available=books.filter(b=>b.imported);if(available.length)await openBook(available.some(b=>b.id===store.lastBook)?store.lastBook:available[0].id);else showImportWelcome();}
 catch(e){$('pageText').innerHTML=`<p class="error">${esc(e.message)} Sayfayı yenileyip tekrar deneyin.</p>`;}
}
init();

function showImportWelcome(){
 $('bookTitle').textContent='Librarium';$('bookAuthor').textContent='Horus Heresy';$('chapterTitle').textContent='';
 $('pageText').innerHTML='<div class="import-welcome"><h3>Kitabını yanında getir.</h3><p>PDF kitaplarını seç; metin, arama ve tıklanabilir bilgi kartları bu tarayıcıda hazırlansın.</p><button id="welcomeImport" class="primary">＋ PDF ekle</button><p class="subtle">Kitap dosyaları sunucuya yüklenmez. Hazır ansiklopedi ve wiki görsellerini kitap eklemeden de gezebilirsin.</p></div>';
 $('welcomeImport').onclick=()=>$('bookFiles').click();$('nextPage').disabled=$('prevPage').disabled=true;
}
async function importBookFiles(event){
 const files=[...event.target.files||[]].filter(f=>/\.pdf$/i.test(f.name));if(!files.length)return;
 const currentPage=page;let firstId=null;
 $('addBooks').disabled=true;
 try{
  for(let index=0;index<files.length;index++){
   const result=await window.LibrariumStorage.importPDF(files[index],(done,total)=>{
    $('addBooks').textContent=`${index+1}/${files.length} · ${done}/${total}`;
   });firstId??=result.id;
  }
  loaded.clear();await loadLibrary();closeDialog('settingsDialog');await openBook(firstId);toast('PDF kitapları bu tarayıcıya eklendi.');
 }catch(error){toast(error.message);await loadLibrary();if(!book)showImportWelcome();}
 finally{$('addBooks').disabled=false;$('addBooks').textContent='＋ PDF ekle';event.target.value='';}
}
