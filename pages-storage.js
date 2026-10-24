'use strict';
// All selected book bytes and extracted text stay in IndexedDB on this device.
window.LibrariumStorage=(()=>{
 let dbPromise,libraryMetadata,media,wiki,pdfjs;
 const urls=new Map();
 const base=path=>new URL(path,document.baseURI).href;
 const language=()=>document.documentElement.lang==='en';
 const message=(tr,en)=>language()?en:tr;
 async function json(path){const response=await fetch(base(path));if(!response.ok)throw new Error('Resource unavailable: '+path);return response.json();}
 function db(){
  return dbPromise??=new Promise((resolve,reject)=>{
   const request=indexedDB.open('warhammer-librarium-books-v1',1);
   request.onupgradeneeded=()=>request.result.createObjectStore('books',{keyPath:'id'});
   request.onsuccess=()=>resolve(request.result);
   request.onerror=()=>reject(new Error(message('Tarayıcı kitaplığı açılamadı. Tarayıcı depolamasına izin verin.','Browser library unavailable. Allow browser storage.')));
  });
 }
 async function read(id){const database=await db();return new Promise((resolve,reject)=>{const request=database.transaction('books').objectStore('books').get(id);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
 async function all(){const database=await db();return new Promise((resolve,reject)=>{const request=database.transaction('books').objectStore('books').getAll();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
 async function put(value){const database=await db();return new Promise((resolve,reject)=>{const transaction=database.transaction('books','readwrite');transaction.objectStore('books').put(value);transaction.oncomplete=()=>resolve(value);transaction.onerror=()=>reject(new Error(message('Kitap kaydedilemedi. Tarayıcıdaki boş alanı kontrol edin.','Could not save the book. Check available browser storage.')));transaction.onabort=()=>reject(transaction.error);});}
 async function metadata(){return libraryMetadata??=await json('library.json');}
 function info(book){return {id:book.id,title:book.title,author:book.author,series:book.series,count:book.count,cover:book.cover,size:book.size,imported:true};}
 async function library(){
  const [defaults,saved]=await Promise.all([metadata(),all()]);
  const byId=new Map(saved.map(book=>[book.id,info(book)]));
  return {books:[...defaults.map(book=>byId.get(book.id)||{...book}),...saved.filter(book=>!defaults.some(d=>d.id===book.id)).map(info)],root:''};
 }
 async function book(id){
  const saved=await read(id);
  if(!saved)throw new Error(message('Bu kitabı okumak için kendi PDF dosyanı seç.','Choose your own PDF file to read this book.'));
  if(!urls.has(id))urls.set(id,URL.createObjectURL(new Blob([saved.bytes],{type:'application/pdf'})));
  const {bytes,cover,...text}=saved;return text;
 }
 function normal(text){return text.toLocaleLowerCase('en').replace(/^\d+[.\s_-]*/,'').replace(/[^a-z0-9]/g,'');}
 function cleanPage(content,title,author){
  const items=content.items.filter(item=>typeof item.str==='string'&&item.str.trim());
  const rows=[];
  for(const item of items){
   const x=item.transform[4],y=item.transform[5],size=Math.max(5,Math.hypot(item.transform[2],item.transform[3])||item.height||12);
   let row=rows.find(row=>Math.abs(row.y-y)<Math.min(5,size*.4));
   if(!row){row={y,size,items:[]};rows.push(row);}row.items.push({...item,x});
  }
  rows.sort((a,b)=>b.y-a.y);
  const lines=rows.map(row=>{
   row.items.sort((a,b)=>a.x-b.x);let text='',right=null;
   for(const item of row.items){
    const gap=right===null?0:item.x-right;
    if(text&&!/\s$/.test(text)&&!/^\s/.test(item.str)&&gap>row.size*.12)text+=' ';
    text+=item.str;right=item.x+item.width;
   }
   return {text:text.replace(/\s+/g,' ').trim(),x:row.items[0].x,y:row.y,size:row.size};
  });
  const running=new Set([title,author,'The Horus Heresy'].map(t=>t.toLocaleLowerCase('en')));
  const filtered=lines.filter((line,i)=>!((i<3||i>=lines.length-2)&&(/^\d+$/.test(line.text)||running.has(line.text.toLocaleLowerCase('en')))));
  const left=Math.min(...filtered.filter(l=>l.text.length>35).map(l=>l.x),10000);
  let output='',prior=null;
  for(const line of filtered){
   const indent=line.x-left,centered=indent>27&&line.text.length<65;
   const paragraph=prior&&(centered||3<indent&&indent<27||prior.y-line.y>line.size*1.9);
   if(paragraph)output+='\n\n';else if(output)output+=' ';
   if(output.endsWith('- ')&&/^[a-z]/.test(line.text))output=output.slice(0,-2);
   output+=line.text;if(centered)output+='\n\n';prior=line;
  }
  return output.replace(/\n{3,}/g,'\n\n').trim();
 }
 async function outline(document){
  const result=[];
  async function walk(items,depth=0){
   for(const item of items||[]){
    try{
     const dest=typeof item.dest==='string'?await document.getDestination(item.dest):item.dest;
     if(dest?.length){const page=typeof dest[0]==='number'?dest[0]:await document.getPageIndex(dest[0]);result.push({title:item.title,page,depth:Math.min(2,depth)});}
    }catch{}
    await walk(item.items,depth+1);
   }
  }
  await walk(await document.getOutline());return result;
 }
 async function importPDF(file,progress){
  if(file.size>100*1024*1024)throw new Error(message('PDF 100 MB sınırını aşıyor.','PDF exceeds the 100 MB limit.'));
  pdfjs??=await import(base('vendor/pdfjs/pdf.mjs'));
  pdfjs.GlobalWorkerOptions.workerSrc=base('vendor/pdfjs/pdf.worker.mjs');
  const bytes=await file.arrayBuffer();
  const loadingTask=pdfjs.getDocument({data:new Uint8Array(bytes.slice(0)),cMapUrl:base('vendor/pdfjs/cmaps/'),cMapPacked:true,standardFontDataUrl:base('vendor/pdfjs/standard_fonts/'),wasmUrl:base('vendor/pdfjs/wasm/'),isEvalSupported:false});
  const document=await loadingTask.promise;
  try{
   const defaults=await metadata();
   const matched=defaults.find(book=>normal(book.title)===normal(file.name.replace(/\.pdf$/i,'')));
   const digest=await crypto.subtle.digest('SHA-256',bytes);
   const id=matched?.id||'pdf-'+Array.from(new Uint8Array(digest)).slice(0,12).map(n=>n.toString(16).padStart(2,'0')).join('');
   const title=matched?.title||file.name.replace(/\.pdf$/i,'').replace(/^\d+[.\s_-]*/,'');
   const author=matched?.author||'';
   const pages=[];let cover=matched?.cover||null;
   for(let n=1;n<=document.numPages;n++){
    const page=await document.getPage(n);
    pages.push(cleanPage(await page.getTextContent(),title,author));
    if(n===1&&!cover){
     try{const viewport=page.getViewport({scale:.7});const canvas=window.document.createElement('canvas');const ratio=Math.min(1,520/viewport.height);const view=page.getViewport({scale:.7*ratio});canvas.width=view.width;canvas.height=view.height;await page.render({canvasContext:canvas.getContext('2d'),viewport:view}).promise;cover=canvas.toDataURL('image/jpeg',.8);canvas.width=canvas.height=0;}catch{}
    }
    page.cleanup();progress?.(n,document.numPages);
    if(n%8===0)await new Promise(resolve=>setTimeout(resolve,0));
   }
   let toc=await outline(document);
   if(!toc.length){
    const heading=/^(?:(?:CHAPTER|PART|BOOK)\s+)?(?:ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN|ELEVEN|TWELVE|THIRTEEN|FOURTEEN|FIFTEEN|SIXTEEN|SEVENTEEN|EIGHTEEN|NINETEEN|TWENTY(?:[ -](?:ONE|TWO|THREE|FOUR|FIVE))?)$/i;
    pages.forEach((text,page)=>{const line=text.split('\n').slice(0,4).find(line=>heading.test(line.trim()));if(line)toc.push({title:line.trim(),page,depth:0});});
   }
   const start=toc.find(item=>/^(?:CHAPTER\s+)?ONE$/i.test(item.title.trim()))?.page??Math.max(0,pages.findIndex(text=>text.length>600));
   const value={id,title,author,series:matched?.series||'Personal library',count:document.numPages,pages,toc,start,cover,size:file.size,bytes,imported:true};
   await put(value);
   if(urls.has(id)){URL.revokeObjectURL(urls.get(id));urls.delete(id);}
   return info(value);
  }finally{await loadingTask.destroy();}
 }
 async function request(path,options){
  const url=new URL(path,'https://librarium.invalid');
  if(url.pathname==='/api/library')return library();
  if(url.pathname==='/api/book')return book(url.searchParams.get('id'));
  if(url.pathname==='/api/media')return media??=await json('media.json');
  if(url.pathname==='/api/wiki'){
   wiki??=await json('wiki.json');const term=url.searchParams.get('term')||'';
   return wiki[term.toLocaleLowerCase('en')]||{title:term,error:'Bu kaydın ayrıntıları için aşağıdaki wiki kaynak bağlantısını açın.',suggestions:[]};
  }
  if(url.pathname==='/api/cache-media'){
   media??=await json('media.json');const value=JSON.parse(options?.body||'{}');return media.entries[value.id]||{images:[]};
  }
  return json(url.pathname.replace(/^\//,''));
 }
 return {request,importPDF,pdfURL:id=>urls.get(id)||''};
})();
