'use strict';
// Only interface text is localised. Book text, quotations and user notes are excluded.
window.LibrariumI18n = (() => {
 let language='tr', scheduled=false, observer;
 const textSources=new WeakMap(), attributeSources=new WeakMap();
 const dictionary=new Map(Object.entries({
  '＋ PDF ekle':'＋ Add PDFs','TARAYICI KİTAPLIĞI':'BROWSER LIBRARY','Kitabını yanında getir.':'Bring your own book.',
  'PDF kitaplarını seç; metin, arama ve tıklanabilir bilgi kartları bu tarayıcıda hazırlansın.':'Choose your PDF books to prepare text, search and clickable information cards in this browser.',
  'Kitap dosyaları sunucuya yüklenmez. Hazır ansiklopedi ve wiki görsellerini kitap eklemeden de gezebilirsin.':'Book files are never uploaded. You can browse the encyclopaedia and wiki artwork without adding a book.',
  "PDF dosyaların yalnızca bu tarayıcıda açılır ve saklanır. Kitaplar GitHub'a veya başka bir sunucuya yüklenmez.":'Your PDFs are opened and stored only in this browser. Books are never uploaded to GitHub or any other server.',
  'Notlar, yer imleri ve ilerleme bu tarayıcıda saklanır. Başka bir cihaza geçmeden önce yedek al.':'Notes, bookmarks and progress stay in this browser. Export a backup before switching devices.',
  'PDF kitapları bu tarayıcıya eklendi.':'PDF books added to this browser.',
  'Bu kaydın ayrıntıları için aşağıdaki wiki kaynak bağlantısını açın.':'Open the wiki source link below for the full entry.',

  'KİŞİSEL İMPARATORLUK ARŞİVİ':'PERSONAL IMPERIAL ARCHIVE',
  'YEREL BAĞLANTI':'LOCAL CONNECTION','Ansiklopedi':'Encyclopaedia','Kullanım rehberi':'Reading guide',
  'Librarium ana ekran':'Librarium home','Kitaplığı aç':'Open library','Arayüz dili':'Interface language',
  'KOLEKSİYON':'COLLECTION','Bir çağın sonuna tanıklık et.':'Witness the end of an age.',
  'İÇİNDEKİLER':'CONTENTS','Kitaplık':'Library','Kitap bölümleri':'Book chapters',
  'Kitaplık yükleniyor…':'Loading library…','⚙ Kitaplık ayarları':'⚙ Library settings','Kitaplık ayarları':'Library settings',
  'Kitap içinde ara':'Search this book','Okuma ayarları':'Reading settings','Yer imi ekle':'Add bookmark','Yer imini kaldır':'Remove bookmark',
  'Odak modu':'Focus mode','Odak modu (F)':'Focus mode (F)','Bilgi panelini aç/kapat':'Toggle information panel',
  'Okuma görünümü':'Reading appearance','Yazı boyutu':'Text size','Terimleri vurgula':'Highlight terms',
  'Açık okuma zemini':'Light reading background','Özgün PDF görünümü':'Original PDF view',
  'PDF görünümünde bilgi kartları için sağdaki ansiklopediyi kullanın.':'Use the encyclopaedia on the right for information cards while viewing the PDF.',
  'Kişisel okuma arşivi':'Personal reading archive','Kitap metni':'Book text','Kitabınız hazırlanıyor…':'Preparing your book…',
  'Kitap metni hazırlanıyor':'Preparing book text','Özgün PDF sayfası':'Original PDF page','Önceki sayfa':'Previous page',
  'Sonraki sayfa':'Next page','Önceki':'Previous','Sonraki':'Next','SAYFA':'PAGE','Sayfa numarası':'Page number',
  'Altı çizili terimlere':'Click underlined terms','dokun, hikâyenin arkasını keşfet.':'to discover the world behind the story.',
  '← → sayfa değiştir':'← → turn pages','Bilgi paneli':'Information panel','COGITATOR / BİLGİ ARŞİVİ':'COGITATOR / KNOWLEDGE ARCHIVE',
  'Bilgi panelini kapat':'Close information panel','Bilgi kartı':'Info card','Bu sayfada':'On this page','Notlar':'Notes',
  'Kitaplar ve notlar bu bilgisayarda saklanır.':'Books and notes stay on this computer.',
  '◈ Seçili metni araştır':'◈ Look up selected text','METİN TARAMASI':'TEXT SEARCH','Aramayı kapat':'Close search',
  'Bir kelime, isim veya cümle…':'A word, name or phrase…','Kitapta aranacak metin':'Text to find in this book',
  'Açık kitabın bütün sayfalarında arayın.':'Search every page of the current book.',
  'Ansiklopediyi kapat':'Close encyclopaedia','Karakter, lejyon, dünya, gemi…':'Character, Legion, world, vessel…',
  'Ansiklopedide ara':'Search the encyclopaedia',"Wiki'de araştır ↗":'Search the wiki ↗',
  'YEREL ARŞİV':'LOCAL ARCHIVE','Ayarları kapat':'Close settings','Kitap klasörü':'Book folder',
  "Bu klasörün altındaki tüm PDF dosyaları taranır. Yeni kitap ekledikten sonra kitaplığı yenileyin. Metin içermeyen taranmış PDF'lerde özgün görünüm kullanılabilir; tıklanabilir metin için OCR gerekir.":'All PDFs in this folder and its subfolders are scanned. Refresh the library after adding a book. Image-only PDFs can be read in the original view; clickable text requires OCR.',
  'Kitaplığı yenile':'Refresh library','Okuma verilerin':'Your reading data',
  'Okuma konumu, notlar ve yer imleri bu tarayıcıda tutulur. Tarayıcı verilerini silmeden önce bir yedek alabilirsin.':'Your position, notes and bookmarks are stored in this browser. Export a backup before clearing browser data.',
  'Notları ve ilerlemeyi yedekle ↓':'Back up notes and progress ↓','Yedeği yükle ↑':'Import backup ↑',
  'Okuyucuyu kapat':'Shut down reader','Tekrar açmak için BASLAT.cmd dosyasını çalıştır.':'Run BASLAT.cmd to open the reader again.',
  'OKUYUCU REHBERİ':'READER GUIDE','Hikâyenin içine gir.':'Step inside the story.','Rehberi kapat':'Close guide',
  '01 / Oku':'01 / Read','02 / Keşfet':'02 / Explore','03 / Derinleş':'03 / Go deeper','04 / Sakla':'04 / Keep',
  'Soldan bir kitap seç. Bölüm listesi, sayfa numarası ve ok tuşlarıyla gezin. Konumun otomatik kaydedilir.':'Choose a book on the left. Navigate by chapter, page number or arrow keys. Your position is saved automatically.',
  'Altı çizili isimlere tıkla. Listede olmayan bir terimi metinden seçip “Seçili metni araştır” düğmesine bas.':'Click an underlined name. For an unlisted term, select it in the text and choose “Look up selected text”.',
  'Temel Türkçe kartlar kısa tanımlardır. Wiki ayrıntılarını isteyerek açarsın; İngilizce metin ve görseller ilerideki olayları gösterebilir.':'The basic cards contain short definitions in your selected interface language. Open wiki details when you choose; the original English text and images may reveal later events.',
  'Sayfalara yer imi ekle, Notlar sekmesinde düşüncelerini kaydet. Ayarlardan verilerini dışa aktar.':'Bookmark pages and record your thoughts in the Notes tab. Export your data from Settings.',
  "Bağımsız kişisel okuyucu; resmî bir Games Workshop ürünü değildir. Kitap metni özgün dilindedir. Türkçe kartlar kısa editoryal tanımlardır; canlı alıntıların kaynağı Warhammer 40,000 Wiki'dir. Görsellerin hakları ilgili sahiplerine aittir. Wiki metinleri ilgili kaynak lisansına tabidir.":'An independent personal reader, not an official Games Workshop product. Books remain in their original language. Cards are short editorial definitions; live excerpts come from Warhammer 40,000 Wiki. Images belong to their respective rights holders. Wiki text is subject to its source licence.',
  'Görsel sayfası':'Image page','Bu sayfada seçilebilir metin yok. Özgün PDF görünümünden okuyabilirsin.':'There is no selectable text on this page. Use the original PDF view to read it.',
  'Özgün sayfayı göster ↗':'Show original page ↗','Bir terime dokunarak bilgi kartını aç.':'Click a term to open its information card.',
  'Wiki araştırması':'Wiki research','BAĞLANTILI KAYITLAR':'RELATED RECORDS','Wiki arşivine bağlan':'Connect to the wiki archive',
  'İMPARATORLUK KAYDI':'IMPERIAL RECORD','İngilizce kaynak metni ve wiki görselleri. İlerideki kitapların olaylarını gösterebilir.':'Original English source text and wiki images. May reveal events from later books.',
  'Wiki ayrıntılarını aç ↗':'Open wiki details ↗','Kaydı yeniden aç ↗':'Reopen entry ↗',
  'Türkçe kısa tanım · romanlardaki başlangıç rolleri ve evren bilgisi. Aynı isim farklı bağlamlarda kullanılabilir.':'Brief editorial definition · introductory roles and setting information. The same name may have different meanings in context.',
  'Türkçe kısa tanım · romanlardaki başlangıç rolleri ve evren bilgisi. Aynı isim farklı bağlamlarda kullanılabilir. Portre: Warhammer 40,000 Wiki / ilgili hak sahipleri.':'Brief editorial definition · introductory roles and setting information. The same name may have different meanings in context. Portrait: Warhammer 40,000 Wiki / respective rights holders.',
  'Bu terim hazır sözlükte yer almıyor. Wiki ayrıntılarını açarak eşleşen kaydı araştırabilirsin.':'This term is not in the built-in glossary. Open wiki details to look for a matching entry.',
  'Bu sayfada sözlükle eşleşen bir terim yok. Herhangi bir ifadeyi seçip wiki araması yapabilirsin.':'No glossary terms were matched on this page. Select any phrase to look it up in the wiki.',
  'Önce bir kitap seç.':'Choose a book first.','Okuma defteri':'Reading journal','Bu sayfa hakkında bir not…':'A note about this page…',
  'Sayfa notu':'Page note','Yalnızca bu tarayıcıda':'Only in this browser','Notu kaydet':'Save note',
  'Üstteki yer imi düğmesiyle sayfaları sakla.':'Use the bookmark button above to save pages.','Henüz bir not yok.':'No notes yet.',
  'Notu kaldır':'Remove note','Wiki kaydı alınıyor':'Fetching wiki entry','Araştırılıyor…':'Looking up…',
  'WIKI KAYDI · ENGLISH':'WIKI RECORD · ORIGINAL ENGLISH','Kısa kaynak alıntısı ·':'Short source excerpt ·',
  'Metin: CC BY-SA · Görseller: ilgili hak sahipleri':'Text: CC BY-SA · Images: respective rights holders',
  'Önbellekten ·':'Cached ·','· Bağlantı kurulamadı, son kayıt gösteriliyor.':'· Offline: showing the last saved entry.',
  'Bu sayfadan kısa bir giriş metni alınamadı. Kaynak bağlantısından okuyabilirsiniz.':'No introductory excerpt was available. Read the entry at its source link.',
  'Seçili metinden wiki araması':'Wiki lookup from selected text','Araştırma':'Research','ARAŞTIRMA':'RESEARCH',
  'Yer imi kaldırıldı.':'Bookmark removed.','Sayfa yer imlerine eklendi.':'Page bookmarked.','Not kaldırıldı.':'Note removed.','Not kaydedildi.':'Note saved.',
  'Aramak için en az iki karakter yaz.':'Enter at least two characters to search.',
  "Hazır eşleşme yok. Yukarıdaki Wiki'de araştır düğmesini kullan.":'No built-in match. Use the Search the wiki button above.',
  'Taranıyor…':'Scanning…','Bu klasörde PDF bulunamadı.':'No PDFs were found in this folder.',
  'Bu klasörde PDF bulunamadı. Kitaplık ayarlarından klasörünü seç.':'No PDFs were found. Choose your folder in Library settings.',
  'Kitaplık boş':'Library is empty','Ayarlardan bir PDF klasörü seçin':'Choose a PDF folder in Settings',
  'Kitap bulunamadı. Kitaplık ayarlarını açarak klasör seç.':'No books were found. Choose a folder in Library settings.',
  'Yedek 5 MB sınırını aşıyor.':'The backup exceeds the 5 MB limit.','Geçerli bir Librarium yedeği seçin.':'Choose a valid Librarium backup.',
  'Yedek mevcut notlara ve yer imlerine eklendi.':'Backup merged with your existing notes and bookmarks.',
  'Okuyucu kapatıldı. Yeniden açmak için BASLAT.cmd dosyasını kullan.':'Reader shut down. Run BASLAT.cmd to open it again.',
  'Tarayıcı kayıt alanı dolu. Ayarlardan bir yedek alın.':'Browser storage is full. Export a backup from Settings.',
  'İstek tamamlanamadı.':'The request could not be completed.',
  'Wiki şu anda yanıt vermiyor. Temel kartı okuyabilir veya kaynak bağlantısını açabilirsiniz.':'The wiki is unavailable. Read the basic card or open its source link.',
  'Bu adla doğrudan bir wiki sayfası bulunamadı. Bir eşleşme seçin.':'No exact wiki page was found. Choose a suggested match.',
  'Geçerli bir klasör yolu girin.':'Enter a valid folder path.','Kitap bulunamadı.':'Book not found.',
  'İstek tamamlanamadı. Kitap dosyasını ve klasör yolunu kontrol edin.':'The request could not be completed. Check the book file and folder path.',
  'Kitap klasörü bulunamadı. Ayarlardan klasör yolunu düzeltin.':'Book folder not found. Correct its path in Settings.',
  'Bu PDF okunamadı; şifreli veya bozuk olabilir.':'This PDF could not be read; it may be encrypted or damaged.',
  'Orijinal kitap metni':'Original book text','Kitap metni orijinal İngilizcesiyle korunur.':'Book text is preserved in its original English.',
  'WIKI GÖRSEL ARŞİVİ · YEREL':'WIKI IMAGE ARCHIVE · LOCAL','Görseli kapat':'Close image',
  'Önceki görsel':'Previous image','Sonraki görsel':'Next image','Görseli büyüt':'Enlarge image',
  'Görselin wiki kaynağı ↗':'Image source on the wiki ↗','Wiki görsel kaynağı ↗':'Wiki image source ↗',
  'Görsel diskte saklanır. Haklar ilgili sahiplerine aittir; ayrıntılar kaynak sayfasındadır.':'This image is stored on disk. Rights belong to the respective owners; see the source page for details.',
  'Wiki çizimleri sonraki dönemlerdeki görünümleri içerebilir.':'Wiki artwork may show appearances from later eras.',
  'Bu kayıtta henüz yerel görsel yok.':'No local images for this entry yet.','Wiki görsellerini indir ↓':'Download wiki images ↓',
  'Görseller indiriliyor…':'Downloading images…','Görseller diske kaydedildi.':'Images saved to disk.',
  'Bu kayıt için indirilebilir wiki görseli bulunamadı.':'No downloadable wiki image was found for this entry.',
  'Bu kayıt hazır sözlükte bulunamadı.':'This entry was not found in the built-in glossary.',
 }));
 const protectedText='#bookTitle,#bookAuthor,#chapterTitle,#toc,.saved-note p,.wiki-excerpt,.wiki-result h3,.card h2,.book-item strong,.cover-fallback';
 function translate(value){
  if(language!=='en'||typeof value!=='string')return value;
  const core=value.trim();let result=dictionary.get(core);
  if(result===undefined){
   const rules=[
    [/^(\d+) KİTAP$/,(_,n)=>`${n} BOOKS`],
    [/^([\d.,]+) sayfa · PDF arşivi$/,(_,n)=>`${n.replaceAll('.',',')} pages · PDF archive`],
    [/^(.*) · (\d+) s\.$/,(_,a,n)=>`${a} · ${n} pp.`],
    [/^(.*) kitabını aç$/,(_,name)=>`Open ${name}`],
    [/^(.*) kapağı$/,(_,name)=>`${name} cover`],
    [/^PDF sayfası (\d+)$/,(_,n)=>`PDF page ${n}`],
    [/^Sayfa (\d+) yer imini kaldır$/,(_,n)=>`Remove bookmark on page ${n}`],
    [/^(.*) · Bilgi kartı$/,(_,name)=>`${name} · Info card`],
    [/^(.*) · Wiki portresi$/,(_,name)=>`${name} · Wiki portrait`],
    [/^ARŞİV \/ (.*)$/,(_,id)=>`ARCHIVE / ${id}`],
    [/^◈ ARAŞTIRMA$/,()=>'◈ RESEARCH'],
    [/^YEREL GÖRSEL · (\d+)$/,(_,n)=>`LOCAL IMAGE · ${n}`],
    [/^(.*) · (\d+)\. görsel$/,(_,name,n)=>`${name} · Image ${n}`],
    [/^(.*) · KİTAP (.*)$/,(_,series,n)=>`${series} · BOOK ${n}`],
    [/^BU SAYFADA SAPTANAN (\d+) KAYIT$/,(_,n)=>`${n} RECORDS MATCHED ON THIS PAGE`],
    [/^YER İMLERİ \/ (\d+)$/,(_,n)=>`BOOKMARKS / ${n}`],
    [/^NOTLAR \/ (\d+)$/,(_,n)=>`NOTES / ${n}`],
    [/^(.*) · Sayfa (\d+)$/,(_,title,n)=>`${title} · Page ${n}`],
    [/^(◆ )?Sayfa (\d+)( ↗)?$/,(_,icon,n,arrow)=>`${icon||''}Page ${n}${arrow||''}`],
    [/^SAYFA (\d+)$/,(_,n)=>`PAGE ${n}`],
    [/^(\d+) sayfada bulundu( · İlk 100 sonuç gösteriliyor)?\.$/,(_,n,limited)=>`Found on ${n} pages${limited?' · Showing the first 100 results':''}.`],
    [/^(\d+) hazır kayıt · Bir kaydı aç veya farklı bir terimi wiki'de araştır\.$/,(_,n)=>`${n} built-in entries · Open an entry or look up another term in the wiki.`],
    [/^(\d+) kitap bulundu\.$/,(_,n)=>`${n} books found.`],
   ];
   for(const [pattern,replacement] of rules)if(pattern.test(core)){result=core.replace(pattern,replacement);break;}
  }
  return result===undefined?value:value.slice(0,value.indexOf(core))+result+value.slice(value.indexOf(core)+core.length);
 }
 function skipText(node){
  const p=node.parentElement;
  if(p?.closest('#pageText')&&!p.closest('.loading,.error,.empty-page,.import-welcome'))return true;
  return !p||p.closest('script,style,textarea,option,'+protectedText)||p.closest('.search-result')&&!p.closest('small');
 }
 function apply(){
  scheduled=false;
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  while(walker.nextNode()){
   const node=walker.currentNode;if(skipText(node)||!node.nodeValue.trim())continue;
   const previous=textSources.get(node),current=node.nodeValue;
   const source=previous&&previous.rendered===current?previous.source:current;
   const rendered=translate(source);
   textSources.set(node,{source,rendered});
   if(current!==rendered)node.nodeValue=rendered;
  }
  for(const el of document.querySelectorAll('[title],[aria-label],[placeholder],[alt]')){
   const values=attributeSources.get(el)||{};
   for(const name of ['title','aria-label','placeholder','alt']){
    if(!el.hasAttribute(name))continue;
    const current=el.getAttribute(name),previous=values[name];
    const source=previous&&previous.rendered===current?previous.source:current;
    const rendered=translate(source);values[name]={source,rendered};
    if(current!==rendered)el.setAttribute(name,rendered);
   }
   attributeSources.set(el,values);
  }
 }
 function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(apply);}}
 function setLanguage(value){language=value==='en'?'en':'tr';document.documentElement.lang=language;apply();}
 function start(value){
  setLanguage(value);
  if(!observer){observer=new MutationObserver(schedule);observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['title','aria-label','placeholder','alt']});}
 }
 return {start,setLanguage,refresh:apply,translate};
})();
