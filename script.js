'use strict';

/* PHOTO LIBRARY
   Photos Ruben1.jpeg through Ruben47.jpeg are configured below.
   Additional sequential photos (Ruben48.jpeg, Ruben49.jpeg, ...) are
   detected automatically when they are placed in the images folder.
   Edit the title and category below to customise captions and filters.
*/
const photos = [
  {number:1,title:'The opening shot',category:'portrait',description:'A close-up from the collection.'},
  {number:2,title:'A familiar face',category:'candid',description:'An everyday moment, captured.'},
  {number:3,title:'A different look',category:'portrait',description:'A portrait from the archive.'},
  {number:4,title:'Up close',category:'portrait',description:'A close-up portrait in glasses.'},
  {number:5,title:'Side profile',category:'candid',description:'A moment caught from the side.'},
  {number:6,title:'Out in the sun',category:'outdoors',description:'Bright skies and even brighter hair.'},
  {number:7,title:'Looking up',category:'outdoors',description:'A spontaneous outdoor photograph.'},
  {number:8,title:'Unexpected angle',category:'candid',description:'An unusual frame worth keeping.'},
  ...Array.from({length:39}, (_,i)=>({number:i+9,title:`Photo ${String(i+9).padStart(2,'0')}`,category:'candid',description:'From the growing Ruben photo archive.'}))
].map(p=>({...p,src:`images/Ruben${p.number}.jpeg`}));

const $ = id => document.getElementById(id);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let filter = 'all', sort = 'newest', query = '', listLayout = false;
let featureIndex = 1, viewerIndex = 0, toastTimer;
let saved = new Set();
try { saved = new Set(JSON.parse(localStorage.getItem('ruben-saved-photos') || '[]').map(Number)); } catch {}
try { if(localStorage.getItem('ruben-theme')==='light') document.body.classList.add('light'); } catch {}

function pad(n){return String(n).padStart(2,'0')}
function announce(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2200)}
function updateTotals(){const n=pad(photos.length);$('hero-photo-count').textContent=n;$('collection-count').textContent=n;$('all-total').textContent=n;$('saved-total').textContent=saved.size}
function isSaved(photo){return saved.has(photo.number)}
function toggleSave(photo){if(isSaved(photo))saved.delete(photo.number);else saved.add(photo.number);try{localStorage.setItem('ruben-saved-photos',JSON.stringify([...saved]))}catch{}updateTotals();renderGallery();if($('lightbox').open)updateLightbox();announce(isSaved(photo)?'Added to saved photos':'Removed from saved photos')}
function setFilter(value){filter=value;document.querySelectorAll('[data-filter]').forEach(b=>{const active=b.dataset.filter===value;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});renderGallery()}
function visiblePhotos(){let matches=photos.filter(p=>(filter==='all'||(filter==='saved'?isSaved(p):p.category===filter))&&(`${p.title} ${p.category} Ruben${p.number} ${pad(p.number)}`).toLowerCase().includes(query));if(sort==='newest')matches.sort((a,b)=>b.number-a.number);else if(sort==='oldest')matches.sort((a,b)=>a.number-b.number);else matches.sort((a,b)=>(shuffleOrder.indexOf(a.number)-shuffleOrder.indexOf(b.number)));return matches}
let shuffleOrder=[];
function shuffle(){shuffleOrder=photos.map(p=>p.number);for(let i=shuffleOrder.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[shuffleOrder[i],shuffleOrder[j]]=[shuffleOrder[j],shuffleOrder[i]]}}
function renderGallery(){const matches=visiblePhotos();const grid=$('gallery-grid');grid.replaceChildren();grid.classList.toggle('list-layout',listLayout);const fragment=document.createDocumentFragment();for(const p of matches){const card=document.createElement('article');card.className='photo-card';const open=document.createElement('button');open.className='photo-open';open.setAttribute('aria-label',`View ${p.title}`);const img=document.createElement('img');img.src=p.src;img.alt=`Ruben photograph ${p.number}: ${p.title}`;img.loading='lazy';img.decoding='async';const overlay=document.createElement('span');overlay.className='photo-overlay';const label=document.createElement('span');const type=document.createElement('small');type.textContent=`FIG. ${pad(p.number)} / ${p.category.toUpperCase()}`;const title=document.createElement('strong');title.textContent=p.title;label.append(type,title);const arrow=document.createElement('span');arrow.className='open-arrow';arrow.textContent='↗';overlay.append(label,arrow);open.append(img,overlay);open.addEventListener('click',()=>openViewer(p.number-1));const save=document.createElement('button');save.className=`save-card${isSaved(p)?' saved':''}`;save.textContent=isSaved(p)?'♥':'♡';save.setAttribute('aria-label',isSaved(p)?`Unsave photo ${p.number}`:`Save photo ${p.number}`);save.title=isSaved(p)?'Remove saved photo':'Save photo';save.addEventListener('click',()=>toggleSave(p));card.append(open,save);fragment.append(card)}grid.append(fragment);$('empty-state').hidden=matches.length!==0;$('visible-count').textContent=`Showing ${matches.length} of ${photos.length} photographs`}

function setFeature(index) {
  featureIndex = (index + photos.length) % photos.length;
  const p = photos[featureIndex];
  $('feature-img').src = p.src;
  $('feature-img').alt = `Ruben photo ${p.number}: ${p.title}`;
  $('feature-description').textContent = p.description;
  $('feature-counter').textContent = `${pad(p.number)} / ${pad(photos.length)}`;
  renderFeatureDots();
}

// Show a short, usable window of navigation dots instead of 47 tiny buttons.
function renderFeatureDots() {
  const holder = $('feature-dots');
  holder.replaceChildren();
  const count = Math.min(7, photos.length);
  const start = Math.min(Math.max(0, featureIndex - Math.floor(count / 2)), photos.length - count);

  for (let i = start; i < start + count; i++) {
    const p = photos[i];
    const button = document.createElement('button');
    button.type = 'button';
    button.classList.toggle('active', i === featureIndex);
    button.setAttribute('aria-label', `Show photo ${p.number}`);
    button.setAttribute('aria-pressed', String(i === featureIndex));
    button.addEventListener('click', () => setFeature(i));
    holder.append(button);
  }
}

function setupFeatureDots() {
  setFeature(featureIndex);
}
function nextFeature(delta){setFeature(featureIndex+delta)}
function randomIndex(except){if(photos.length<2)return 0;let i;do{i=Math.floor(Math.random()*photos.length)}while(i===except);return i}

function openViewer(index){viewerIndex=(index+photos.length)%photos.length;updateLightbox();const dlg=$('lightbox');if(!dlg.open)dlg.showModal()}
function updateLightbox(){const p=photos[viewerIndex];if(!p)return;$('lightbox-img').src=p.src;$('lightbox-img').alt=`Ruben photo ${p.number}: ${p.title}`;$('lightbox-counter').textContent=`${pad(p.number)} / ${pad(photos.length)}`;$('lightbox-title').textContent=p.title;$('lightbox-category').textContent=p.category.toUpperCase();$('lightbox-save').textContent=isSaved(p)?'♥ Saved':'♡ Save';$('lightbox-save').setAttribute('aria-pressed',String(isSaved(p)));$('lightbox-download').href=p.src;$('lightbox-download').download=`Ruben${p.number}.jpeg`}
function closeViewer(){$('lightbox').close()}
function stepViewer(delta){openViewer(viewerIndex+delta)}

$('year').textContent=new Date().getFullYear();
$('theme-toggle').addEventListener('click',()=>{document.body.classList.toggle('light');const theme=document.body.classList.contains('light')?'light':'dark';try{localStorage.setItem('ruben-theme',theme)}catch{}$('theme-toggle').setAttribute('aria-label',`Switch to ${theme==='light'?'dark':'light'} theme`)});
$('menu-btn').addEventListener('click',()=>{const expanded=$('menu-btn').getAttribute('aria-expanded')==='true';$('menu-btn').setAttribute('aria-expanded',String(!expanded));$('mobile-nav').hidden=expanded});
document.querySelectorAll('.mobile-nav a').forEach(a=>a.addEventListener('click',()=>{$('mobile-nav').hidden=true;$('menu-btn').setAttribute('aria-expanded','false')}));
$('hero-photo').addEventListener('click',()=>openViewer(5));$('hero-surprise').addEventListener('click',()=>openViewer(randomIndex(-1)));$('about-photo').addEventListener('click',()=>openViewer(3));
$('feature-prev').addEventListener('click',()=>nextFeature(-1));$('feature-next').addEventListener('click',()=>nextFeature(1));$('feature-random').addEventListener('click',()=>setFeature(randomIndex(featureIndex)));$('feature-open').addEventListener('click',()=>openViewer(featureIndex));
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>setFilter(b.dataset.filter)));
$('photo-search').addEventListener('input',e=>{query=e.target.value.trim().toLowerCase();renderGallery()});
$('photo-sort').addEventListener('change',e=>{sort=e.target.value;if(sort==='random')shuffle();renderGallery()});
$('view-toggle').addEventListener('click',()=>{listLayout=!listLayout;$('view-toggle').textContent=listLayout?'▤':'▦';$('view-toggle').setAttribute('aria-label',listLayout?'Switch to compact grid':'Switch to large grid');renderGallery()});
$('clear-filters').addEventListener('click',()=>{$('photo-search').value='';query='';setFilter('all')});
$('random-photo').addEventListener('click',()=>openViewer(randomIndex(-1)));
document.querySelectorAll('.moment-row').forEach(button=>button.addEventListener('click',()=>openViewer(Number(button.dataset.photo))));
$('lightbox-close').addEventListener('click',closeViewer);$('lightbox-prev').addEventListener('click',()=>stepViewer(-1));$('lightbox-next').addEventListener('click',()=>stepViewer(1));$('lightbox-save').addEventListener('click',()=>toggleSave(photos[viewerIndex]));
$('lightbox').addEventListener('click',e=>{if(e.target===$('lightbox'))closeViewer()});
document.addEventListener('keydown',e=>{if(e.key==='Escape' && !$('mobile-nav').hidden){$('mobile-nav').hidden=true;$('menu-btn').setAttribute('aria-expanded','false')}if(!$('lightbox').open)return;if(e.key==='ArrowLeft'){e.preventDefault();stepViewer(-1)}if(e.key==='ArrowRight'){e.preventDefault();stepViewer(1)}if(e.key.toLowerCase()==='s'&&!e.ctrlKey&&!e.metaKey){e.preventDefault();toggleSave(photos[viewerIndex])}});
let touchStart=0;$('lightbox-img').addEventListener('touchstart',e=>{touchStart=e.changedTouches[0].screenX},{passive:true});$('lightbox-img').addEventListener('touchend',e=>{const dx=e.changedTouches[0].screenX-touchStart;if(Math.abs(dx)>60)stepViewer(dx<0?1:-1)},{passive:true});
$('back-to-top').addEventListener('click',()=>scrollTo({top:0,behavior:reducedMotion?'instant':'smooth'}));
function onScroll(){const max=document.documentElement.scrollHeight-innerHeight;$('scroll-line').style.width=`${max>0?scrollY/max*100:0}%`;$('back-to-top').classList.toggle('show',scrollY>650)}addEventListener('scroll',onScroll,{passive:true});onScroll();
if('IntersectionObserver'in window&&!reducedMotion){const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}},{threshold:.08});document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));const navObserver=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){document.querySelectorAll('[data-nav]').forEach(a=>a.classList.toggle('active',a.dataset.nav===e.target.id))}})},{rootMargin:'-28% 0px -65% 0px'});['home','story','collection','moments'].forEach(id=>navObserver.observe($(id)))}else document.body.classList.add('no-motion');

updateTotals();shuffle();renderGallery();setupFeatureDots();

/* Auto-append sequential .jpeg files starting with Ruben48.jpeg.
   If the next file is absent, detection stops. Add Ruben48, Ruben49,
   Ruben50 etc. into images/ and refresh; no HTML edits are needed.
   On some local file:// browsers missing images may be reported differently,
   but the original eight images and all page features still work. */
async function discoverPhotos(){for(let n=48;n<=200;n++){const exists=await new Promise(resolve=>{const probe=new Image();probe.onload=()=>resolve(true);probe.onerror=()=>resolve(false);probe.src=`images/Ruben${n}.jpeg`});if(!exists)break;photos.push({number:n,title:`Photo ${pad(n)}`,category:'candid',description:'Another moment from the growing collection.',src:`images/Ruben${n}.jpeg`});updateTotals();shuffle();renderGallery();setupFeatureDots()}}
discoverPhotos();

// Close the mobile navigation if the user taps outside it.
document.addEventListener('pointerdown', e => {
  if (!$('mobile-nav').hidden && !e.target.closest('#mobile-nav') && !e.target.closest('#menu-btn')) {
    $('mobile-nav').hidden = true;
    $('menu-btn').setAttribute('aria-expanded', 'false');
  }
});
