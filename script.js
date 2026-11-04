
'use strict';

/* ============================================================
   PHOTO SETTINGS — edit this section to customise the gallery
   ============================================================ */

// Photos Ruben1.jpeg–Ruben47.jpeg are included in the initial library.
// Ruben48.jpeg and higher are detected automatically, in sequence.
const TOTAL_PHOTOS = 75;
const MAX_AUTO_PHOTO = 2000;

// Set custom names here; everything else becomes "Photo 002", etc.
// Use the image number (not a padded string) as the key.
const customNames = {
    1: 'Ruben Schornig',
    // 12: 'Example custom title',
    // 75: 'Another custom title',
};

// Optional overrides. Unlisted photos default to category "candid".
// Categories supported by the existing filters: portrait, outdoors, candid.
const customDetails = {
    // 6: { category: 'outdoors', description: 'A day outside.' },
};

// At least three digits, expanding as necessary: 001, 075, 999, 1000.
function pad(number) {
    return String(number).padStart(Math.max(3, String(number).length), '0');
}

function createPhoto(number) {
    const details = customDetails[number] || {};

    return {
        number,
        title: customNames[number] ?? `Photo ${pad(number)}`,
        category: details.category || 'candid',
        description: details.description || 'From the Ruben photo archive.',
        src: `images/Ruben${number}.jpeg`,
    };
}

const photos = Array.from(
    { length: TOTAL_PHOTOS },
    (_, index) => createPhoto(index + 1)
);

/* ============================================================
   GENERAL SETTINGS & STATE
   ============================================================ */

const $ = id => document.getElementById(id);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

let filter = 'all';
let sort = 'newest';
let query = '';
let listLayout = false;

let featureIndex = 1;
let viewerIndex = 0;
let toastTimer;

let saved = new Set();

try {
    saved = new Set(
        JSON.parse(localStorage.getItem('ruben-saved-photos') || '[]')
            .map(Number)
    );
} catch {}

try {
    if (localStorage.getItem('ruben-theme') === 'light') {
        document.body.classList.add('light');
    }
} catch {}

/* ============================================================
   UTILITY FUNCTIONS
   ============================================================ */

function announce(message) {
    const el = $('toast');

    el.textContent = message;
    el.classList.add('show');

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        el.classList.remove('show');
    }, 2200);
}

function updateTotals() {
    const n = pad(photos.length);

    $('hero-photo-count').textContent = n;
    $('collection-count').textContent = n;
    $('all-total').textContent = n;
    $('saved-total').textContent = saved.size;
}

function isSaved(photo) {
    return saved.has(photo.number);
}

function toggleSave(photo) {
    if (isSaved(photo)) {
        saved.delete(photo.number);
    } else {
        saved.add(photo.number);
    }

    try {
        localStorage.setItem(
            'ruben-saved-photos',
            JSON.stringify([...saved])
        );
    } catch {}

    updateTotals();
    renderGallery();

    if ($('lightbox').open) {
        updateLightbox();
    }

    announce(
        isSaved(photo)
            ? 'Added to saved photos'
            : 'Removed from saved photos'
    );
}

/* ============================================================
   PHOTO FILTERING & SORTING
   ============================================================ */

function setFilter(value) {
    filter = value;

    document.querySelectorAll('[data-filter]').forEach(button => {
        const active = button.dataset.filter === value;

        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
    });

    renderGallery();
}

let shuffleOrder = [];

function shuffle() {
    shuffleOrder = photos.map(photo => photo.number);

    for (let i = shuffleOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [shuffleOrder[i], shuffleOrder[j]] = [
            shuffleOrder[j],
            shuffleOrder[i]
        ];
    }
}

function visiblePhotos() {
    let matches = photos.filter(photo => {
        const categoryMatch =
            filter === 'all' ||
            (
                filter === 'saved'
                    ? isSaved(photo)
                    : photo.category === filter
            );

        const searchText = `
            ${photo.title}
            ${photo.category}
            Ruben${photo.number}
            ${pad(photo.number)}
        `.toLowerCase();

        return categoryMatch && searchText.includes(query);
    });

    if (sort === 'newest') {
        matches.sort((a, b) => b.number - a.number);
    } else if (sort === 'oldest') {
        matches.sort((a, b) => a.number - b.number);
    } else {
        matches.sort(
            (a, b) =>
                shuffleOrder.indexOf(a.number) -
                shuffleOrder.indexOf(b.number)
        );
    }

    return matches;
}

/* ============================================================
   GALLERY RENDERING
   ============================================================ */

function renderGallery() {
    const matches = visiblePhotos();
    const grid = $('gallery-grid');

    grid.replaceChildren();
    grid.classList.toggle('list-layout', listLayout);

    const fragment = document.createDocumentFragment();

    for (const photo of matches) {
        const card = document.createElement('article');
        card.className = 'photo-card';

        const open = document.createElement('button');
        open.className = 'photo-open';
        open.setAttribute('aria-label', `View ${photo.title}`);

        const img = document.createElement('img');
        img.src = photo.src;
        img.alt = `Ruben photograph ${photo.number}: ${photo.title}`;
        img.loading = 'lazy';
        img.decoding = 'async';

        const overlay = document.createElement('span');
        overlay.className = 'photo-overlay';

        const label = document.createElement('span');

        const type = document.createElement('small');
        type.textContent =
            `FIG. ${pad(photo.number)} / ${photo.category.toUpperCase()}`;

        const title = document.createElement('strong');
        title.textContent = photo.title;

        label.append(type, title);

        const arrow = document.createElement('span');
        arrow.className = 'open-arrow';
        arrow.textContent = '↗';

        overlay.append(label, arrow);
        open.append(img, overlay);

        open.addEventListener('click', () => {
            openViewer(photos.indexOf(photo));
        });

        const save = document.createElement('button');

        save.className = `save-card${isSaved(photo) ? ' saved' : ''}`;
        save.textContent = isSaved(photo) ? '♥' : '♡';

        save.setAttribute(
            'aria-label',
            isSaved(photo)
                ? `Unsave photo ${photo.number}`
                : `Save photo ${photo.number}`
        );

        save.title = isSaved(photo)
            ? 'Remove saved photo'
            : 'Save photo';

        save.addEventListener('click', () => toggleSave(photo));

        card.append(open, save);
        fragment.append(card);
    }

    grid.append(fragment);

    $('empty-state').hidden = matches.length !== 0;

    $('visible-count').textContent =
        `Showing ${matches.length} of ${photos.length} photographs`;
}

/* ============================================================
   FEATURED PHOTO SPOTLIGHT
   ============================================================ */

function setFeature(index) {
    featureIndex = (index + photos.length) % photos.length;

    const photo = photos[featureIndex];

    $('feature-img').src = photo.src;
    $('feature-img').alt =
        `Ruben photo ${photo.number}: ${photo.title}`;

    $('feature-description').textContent = photo.description;

    $('feature-counter').textContent =
        `${pad(photo.number)} / ${pad(photos.length)}`;

    renderFeatureDots();
}

function renderFeatureDots() {
    const holder = $('feature-dots');

    holder.replaceChildren();

    const count = Math.min(7, photos.length);

    const start = Math.min(
        Math.max(0, featureIndex - Math.floor(count / 2)),
        photos.length - count
    );

    for (let i = start; i < start + count; i++) {
        const photo = photos[i];

        const button = document.createElement('button');
        button.type = 'button';

        button.classList.toggle('active', i === featureIndex);

        button.setAttribute(
            'aria-label',
            `Show photo ${photo.number}`
        );

        button.setAttribute(
            'aria-pressed',
            String(i === featureIndex)
        );

        button.addEventListener('click', () => setFeature(i));

        holder.append(button);
    }
}

function setupFeatureDots() {
    setFeature(featureIndex);
}

function nextFeature(delta) {
    setFeature(featureIndex + delta);
}

function randomIndex(except) {
    if (photos.length < 2) {
        return 0;
    }

    let i;

    do {
        i = Math.floor(Math.random() * photos.length);
    } while (i === except);

    return i;
}

/* ============================================================
   FULL-SCREEN PHOTO VIEWER
   ============================================================ */

function openViewer(index) {
    viewerIndex = (index + photos.length) % photos.length;

    updateLightbox();

    const dialog = $('lightbox');

    if (!dialog.open) {
        dialog.showModal();
    }
}

function updateLightbox() {
    const photo = photos[viewerIndex];

    if (!photo) {
        return;
    }

    $('lightbox-img').src = photo.src;

    $('lightbox-img').alt =
        `Ruben photo ${photo.number}: ${photo.title}`;

    $('lightbox-counter').textContent =
        `${pad(photo.number)} / ${pad(photos.length)}`;

    $('lightbox-title').textContent = photo.title;

    $('lightbox-category').textContent =
        photo.category.toUpperCase();

    $('lightbox-save').textContent =
        isSaved(photo) ? '♥ Saved' : '♡ Save';

    $('lightbox-save').setAttribute(
        'aria-pressed',
        String(isSaved(photo))
    );

    $('lightbox-download').href = photo.src;

    $('lightbox-download').download =
        `Ruben${photo.number}.jpeg`;
}

function closeViewer() {
    $('lightbox').close();
}

function stepViewer(delta) {
    openViewer(viewerIndex + delta);
}

/* ============================================================
   EVENT LISTENERS
   ============================================================ */

$('year').textContent = new Date().getFullYear();

// Theme toggle
$('theme-toggle').addEventListener('click', () => {
    document.body.classList.toggle('light');

    const theme = document.body.classList.contains('light')
        ? 'light'
        : 'dark';

    try {
        localStorage.setItem('ruben-theme', theme);
    } catch {}

    $('theme-toggle').setAttribute(
        'aria-label',
        `Switch to ${theme === 'light' ? 'dark' : 'light'} theme`
    );
});

// Mobile navigation
$('menu-btn').addEventListener('click', () => {
    const expanded =
        $('menu-btn').getAttribute('aria-expanded') === 'true';

    $('menu-btn').setAttribute(
        'aria-expanded',
        String(!expanded)
    );

    $('mobile-nav').hidden = expanded;
});

document.querySelectorAll('.mobile-nav a').forEach(link => {
    link.addEventListener('click', () => {
        $('mobile-nav').hidden = true;
        $('menu-btn').setAttribute('aria-expanded', 'false');
    });
});

// Hero and about images
$('hero-photo').addEventListener('click', () => openViewer(5));

$('hero-surprise').addEventListener('click', () => {
    openViewer(randomIndex(-1));
});

$('about-photo').addEventListener('click', () => openViewer(3));

// Featured photo controls
$('feature-prev').addEventListener('click', () => nextFeature(-1));
$('feature-next').addEventListener('click', () => nextFeature(1));

$('feature-random').addEventListener('click', () => {
    setFeature(randomIndex(featureIndex));
});

$('feature-open').addEventListener('click', () => {
    openViewer(featureIndex);
});

// Gallery filters
document.querySelectorAll('[data-filter]').forEach(button => {
    button.addEventListener('click', () => {
        setFilter(button.dataset.filter);
    });
});

// Photo search
$('photo-search').addEventListener('input', event => {
    query = event.target.value.trim().toLowerCase();
    renderGallery();
});

// Photo sorting
$('photo-sort').addEventListener('change', event => {
    sort = event.target.value;

    if (sort === 'random') {
        shuffle();
    }

    renderGallery();
});

// Gallery layout toggle
$('view-toggle').addEventListener('click', () => {
    listLayout = !listLayout;

    $('view-toggle').textContent = listLayout ? '▤' : '▦';

    $('view-toggle').setAttribute(
        'aria-label',
        listLayout
            ? 'Switch to compact grid'
            : 'Switch to large grid'
    );

    renderGallery();
});

// Reset filters
$('clear-filters').addEventListener('click', () => {
    $('photo-search').value = '';
    query = '';
    setFilter('all');
});

// Random photo
$('random-photo').addEventListener('click', () => {
    openViewer(randomIndex(-1));
});

// Moment links
document.querySelectorAll('.moment-row').forEach(button => {
    button.addEventListener('click', () => {
        openViewer(Number(button.dataset.photo));
    });
});

// Lightbox controls
$('lightbox-close').addEventListener('click', closeViewer);

$('lightbox-prev').addEventListener('click', () => stepViewer(-1));
$('lightbox-next').addEventListener('click', () => stepViewer(1));

$('lightbox-save').addEventListener('click', () => {
    toggleSave(photos[viewerIndex]);
});

$('lightbox').addEventListener('click', event => {
    if (event.target === $('lightbox')) {
        closeViewer();
    }
});

// Keyboard controls
document.addEventListener('keydown', event => {
    if (
        event.key === 'Escape' &&
        !$('mobile-nav').hidden
    ) {
        $('mobile-nav').hidden = true;
        $('menu-btn').setAttribute('aria-expanded', 'false');
    }

    if (!$('lightbox').open) {
        return;
    }

    if (event.key === 'ArrowLeft') {
        event.preventDefault();
        stepViewer(-1);
    }

    if (event.key === 'ArrowRight') {
        event.preventDefault();
        stepViewer(1);
    }

    if (
        event.key.toLowerCase() === 's' &&
        !event.ctrlKey &&
        !event.metaKey
    ) {
        event.preventDefault();
        toggleSave(photos[viewerIndex]);
    }
});

// Mobile swipe navigation
let touchStart = 0;

$('lightbox-img').addEventListener(
    'touchstart',
    event => {
        touchStart = event.changedTouches[0].screenX;
    },
    { passive: true }
);

$('lightbox-img').addEventListener(
    'touchend',
    event => {
        const dx =
            event.changedTouches[0].screenX - touchStart;

        if (Math.abs(dx) > 60) {
            stepViewer(dx < 0 ? 1 : -1);
        }
    },
    { passive: true }
);

/* ============================================================
   SCROLL EFFECTS
   ============================================================ */

$('back-to-top').addEventListener('click', () => {
    scrollTo({
        top: 0,
        behavior: reducedMotion ? 'instant' : 'smooth'
    });
});

function onScroll() {
    const max =
        document.documentElement.scrollHeight - innerHeight;

    $('scroll-line').style.width =
        `${max > 0 ? (scrollY / max) * 100 : 0}%`;

    $('back-to-top').classList.toggle(
        'show',
        scrollY > 650
    );
}

addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Scroll reveal animations
if ('IntersectionObserver' in window && !reducedMotion) {
    const observer = new IntersectionObserver(
        entries => {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            }
        },
        { threshold: 0.08 }
    );

    document.querySelectorAll('.reveal').forEach(element => {
        observer.observe(element);
    });

    const navObserver = new IntersectionObserver(
        entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    document.querySelectorAll('[data-nav]').forEach(link => {
                        link.classList.toggle(
                            'active',
                            link.dataset.nav === entry.target.id
                        );
                    });
                }
            });
        },
        { rootMargin: '-28% 0px -65% 0px' }
    );

    ['home', 'story', 'collection', 'moments', 'videos', 'submit-photo'].forEach(id => {
        navObserver.observe($(id));
    });
} else {
    document.body.classList.add('no-motion');
}

/* ============================================================
   AUTOMATIC PHOTO DISCOVERY
   ============================================================ */

// Detect consecutive photos beginning after TOTAL_PHOTOS.
// Detection stops when the next numbered image does not exist.

async function discoverPhotos() {
    for (
        let number = TOTAL_PHOTOS + 1;
        number <= MAX_AUTO_PHOTO;
        number++
    ) {
        const exists = await new Promise(resolve => {
            const probe = new Image();

            probe.onload = () => resolve(true);
            probe.onerror = () => resolve(false);

            probe.src = `images/Ruben${number}.jpeg`;
        });

        if (!exists) {
            break;
        }

        photos.push(createPhoto(number));

        updateTotals();
        shuffle();
        renderGallery();
        setupFeatureDots();
    }
}

/* ============================================================
   MOBILE NAVIGATION CLOSE HANDLER
   ============================================================ */

document.addEventListener('pointerdown', event => {
    if (
        !$('mobile-nav').hidden &&
        !event.target.closest('#mobile-nav') &&
        !event.target.closest('#menu-btn')
    ) {
        $('mobile-nav').hidden = true;
        $('menu-btn').setAttribute('aria-expanded', 'false');
    }
});

/* ============================================================
   INITIALISE WEBSITE
   ============================================================ */

updateTotals();
shuffle();
renderGallery();
setupFeatureDots();
discoverPhotos();


/* ============================================================
   PHOTO SUBMISSIONS — GITHUB PAGES + BASIN
   ============================================================ */

// 1. Create a free form at https://usebasin.com/
// 2. Copy the form's public endpoint URL from the Basin dashboard.
// 3. Replace YOUR-FORM-ID below (do not paste an API key).
// 4. Enable email notifications and test the published website.
//    Basin emails a LINK to each uploaded photo, rather than attaching it.
const PHOTO_SUBMISSION_ENDPOINT = 'https://usebasin.com/f/65d18a97d644';
const PHOTO_UPLOAD_LIMIT = 10 * 1024 * 1024;

const photoForm = $('photo-submission-form');
const photoFileInput = $('submit-image');
const photoUploadError = $('submit-error');
const photoStatus = $('submit-status');
const photoPreview = $('submit-preview');
const photoPreviewImage = $('submit-preview-image');
const photoSendButton = $('submit-send');
const photoSendButtonHtml = photoSendButton.innerHTML;

let photoPreviewUrl = null;
let verifiedUpload = false;
let photoSending = false;

function submissionError(message) {
    photoUploadError.textContent = message;
    photoUploadError.hidden = !message;
}

function setSubmissionStatus(message, type = 'info') {
    photoStatus.textContent = message;
    photoStatus.dataset.type = type;
    photoStatus.hidden = !message;
}

function clearSubmissionPreview() {
    if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
        photoPreviewUrl = null;
    }

    photoPreview.hidden = true;
    photoPreviewImage.removeAttribute('src');
    verifiedUpload = false;
}

// Browser validation catches mistakes, but is NOT a malware scanner.
// Basin scans files on its servers; still review any uploaded files carefully.
async function checkImageSignature(file) {
    const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const png = bytes.length >= 8 &&
        [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b);
    const jpeg = bytes.length >= 3 &&
        bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const webp = bytes.length >= 12 &&
        String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
        String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';

    return {
        'image/png': png,
        'image/jpeg': jpeg,
        'image/webp': webp,
    }[file.type] === true;
}

async function validateSubmittedPhoto() {
    const file = photoFileInput.files?.[0];
    clearSubmissionPreview();
    submissionError('');
    setSubmissionStatus('');

    if (!file) {
        submissionError('Please choose a photo before sending.');
        return false;
    }

    if (file.size === 0 || file.size > PHOTO_UPLOAD_LIMIT) {
        submissionError('Choose a photo larger than 0 bytes and no bigger than 10 MB.');
        return false;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
        !/\.(jpe?g|png|webp)$/i.test(file.name) ||
        !(await checkImageSignature(file))) {
        submissionError('Only valid PNG, JPEG or WebP image files are supported.');
        return false;
    }

    verifiedUpload = true;
    photoPreviewUrl = URL.createObjectURL(file);
    photoPreviewImage.src = photoPreviewUrl;
    $('submit-file-name').textContent = file.name;
    $('submit-file-size').textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;
    photoPreview.hidden = false;
    return true;
}

photoFileInput.addEventListener('change', () => {
    void validateSubmittedPhoto();
});

$('submit-remove-image').addEventListener('click', () => {
    photoFileInput.value = '';
    clearSubmissionPreview();
    submissionError('');
    setSubmissionStatus('');
});

// Drop photos from a desktop file manager onto the upload area.
const photoDropzone = $('submit-dropzone');
photoDropzone.addEventListener('dragover', event => {
    event.preventDefault();
    photoDropzone.classList.add('drag-over');
});

photoDropzone.addEventListener('dragleave', () => {
    photoDropzone.classList.remove('drag-over');
});

photoDropzone.addEventListener('drop', event => {
    event.preventDefault();
    photoDropzone.classList.remove('drag-over');

    if (event.dataTransfer?.files?.length) {
        photoFileInput.files = event.dataTransfer.files;
        void validateSubmittedPhoto();
    }
});

photoForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (photoSending) return;

    submissionError('');
    setSubmissionStatus('');

    if (!/^https:\/\/usebasin\.com\/f\/[a-zA-Z0-9_-]+$/.test(PHOTO_SUBMISSION_ENDPOINT) ||
        PHOTO_SUBMISSION_ENDPOINT.endsWith('/YOUR-FORM-ID')) {
        submissionError('The website owner needs to connect a Basin submission endpoint first.');
        return;
    }

    if (!photoForm.reportValidity()) return;
    if (!await validateSubmittedPhoto()) return;

    photoSending = true;
    photoSendButton.disabled = true;
    photoSendButton.textContent = 'Sending photograph…';
    setSubmissionStatus('Uploading your image securely. Please keep this page open.');

    try {
        // FormData is required to transmit the real image bytes.
        // Do not set a Content-Type header: the browser adds the multipart boundary.
        const response = await fetch(PHOTO_SUBMISSION_ENDPOINT, {
            method: 'POST',
            body: new FormData(photoForm),
            headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
            let detail = '';
            try {
                const data = await response.json();
                detail = typeof data.error === 'string' ? ` ${data.error}` : '';
            } catch {}
            throw new Error(`Submission service returned HTTP ${response.status}.${detail}`);
        }

        // Only report success when the server has accepted the request.
        setSubmissionStatus('Photo received. Thank you! It has been submitted for review.', 'success');
        photoForm.reset();
        clearSubmissionPreview();
    } catch (error) {
        console.error('Photo submission failed:', error);
        submissionError('Your photo could not be submitted. Please try again later. If it continues, contact the archive owner.');
        setSubmissionStatus('');
    } finally {
        photoSending = false;
        photoSendButton.disabled = false;
        photoSendButton.innerHTML = photoSendButtonHtml;
    }
});


/* ============================================================
   VIDEO ARCHIVE — GitHub Pages compatible
   ============================================================

   Place videos/Video1.mp4, videos/Video2.mp4, and so on into
   the repository. The site automatically checks for the next
   sequential video on each visit. Missing numbers stop detection.

   By default, each preview shows a frame from the video itself.
   Optionally, set a poster image for a specific video below.
   MP4 (H.264/AAC) is recommended for widest device support.
*/

const VIDEO_MAX_AUTO = 250;
const videoDetails = {
    // 1: { title: 'First clip', description: 'A moment on film.', poster: 'images/Ruben6.jpeg' },
    // 2: { title: 'Another clip', poster: 'images/Ruben12.jpeg' },
   1: {title: 'Really gotta hold on', description: 'Rubens "viral" tiktok.'}
};

const videos = [];
let currentVideoIndex = 0;
let videoSearchQuery = '';
let videoSort = 'newest';
const videoDialog = $('video-dialog');
const videoPlayer = $('video-player');

function videoLabel(number) {
    return String(number).padStart(Math.max(3, String(number).length), '0');
}

function buildVideo(number, extension) {
    const details = videoDetails[number] || {};
    return {
        number,
        title: details.title || `Video ${videoLabel(number)}`,
        description: details.description || 'From the Ruben video archive.',
        poster: details.poster || null,
        src: `videos/Video${number}.${extension}`,
    };
}

function visibleVideos() {
    return videos
        .filter(video => (`${video.title} ${video.description} video${video.number}`)
            .toLowerCase().includes(videoSearchQuery))
        .sort((a, b) => videoSort === 'newest' ? b.number - a.number : a.number - b.number);
}

function renderVideoGallery() {
    const grid = $('videos-grid');
    const visible = visibleVideos();
    const fragment = document.createDocumentFragment();

    $('videos-count').textContent = String(videos.length).padStart(2, '0');
    $('videos-empty').hidden = videos.length !== 0;
    $('videos-toolbar').hidden = videos.length === 0;
    $('videos-result').hidden = videos.length === 0 || visible.length !== 0;
    $('videos-result').textContent = visible.length ? '' : 'No videos match your search.';

    for (const video of visible) {
        const card = document.createElement('article');
        card.className = 'video-card';
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'video-card-open';
        button.setAttribute('aria-label', `Play ${video.title}`);
        const thumb = document.createElement('span');
        thumb.className = 'video-thumb';
        // Use an actual frame from the video, unless a custom poster is set.
        const poster = video.poster
            ? document.createElement('img')
            : document.createElement('video');

        if (video.poster) {
            poster.src = video.poster;
            poster.alt = '';
            poster.loading = 'lazy';
        } else {
            poster.className = 'video-frame-preview';
            poster.muted = true;
            poster.defaultMuted = true;
            poster.playsInline = true;
            poster.preload = 'metadata';
            poster.setAttribute('aria-hidden', 'true');
            poster.tabIndex = -1;
            poster.disablePictureInPicture = true;
            poster.src = video.src;

            // A short seek encourages browsers to paint an actual video frame.
            // This is not playback and never starts the audio.
            poster.addEventListener('loadedmetadata', () => {
                const duration = poster.duration;
                const frameTime = Number.isFinite(duration)
                    ? Math.min(0.15, Math.max(0, duration / 2))
                    : 0.15;
                try { poster.currentTime = frameTime; } catch {}
            }, { once: true });
        }
        const play = document.createElement('span');
        play.className = 'video-card-play';
        play.textContent = '▶';
        play.setAttribute('aria-hidden', 'true');
        const id = document.createElement('span');
        id.className = 'video-card-id';
        id.textContent = `CLIP / ${videoLabel(video.number)}`;
        thumb.append(poster, play, id);
        const details = document.createElement('span');
        details.className = 'video-card-details';
        const title = document.createElement('strong');
        title.textContent = video.title;
        const description = document.createElement('small');
        description.textContent = video.description;
        const arrow = document.createElement('span');
        arrow.textContent = '↗';
        arrow.setAttribute('aria-hidden', 'true');
        details.append(title, description, arrow);
        button.append(thumb, details);
        button.addEventListener('click', () => openVideo(videos.indexOf(video)));
        card.append(button);
        fragment.append(card);
    }

    grid.replaceChildren(fragment);
}

function openVideo(index) {
    if (!videos.length) return;
    currentVideoIndex = (index + videos.length) % videos.length;
    const video = videos[currentVideoIndex];
    videoPlayer.pause();
    videoPlayer.src = video.src;
    if (video.poster) videoPlayer.poster = video.poster;
    else videoPlayer.removeAttribute('poster');
    videoPlayer.load();
    $('video-dialog-title').textContent = video.title;
    $('video-dialog-number').textContent = `VIDEO / ${videoLabel(video.number)}`;
    if (!videoDialog.open) videoDialog.showModal();
    // Play is initiated by a visitor's click; browsers can still block it.
    videoPlayer.play().catch(() => {});
}

function closeVideo() {
    videoPlayer.pause();
    videoPlayer.removeAttribute('src');
    videoPlayer.load();
    if (videoDialog.open) videoDialog.close();
}

async function videoExists(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok && (response.headers.get('content-type') || '').toLowerCase().includes('video');
    } catch {
        return false;
    }
}

async function discoverVideos() {
    for (let number = 1; number <= VIDEO_MAX_AUTO; number++) {
        let extension = null;
        if (await videoExists(`videos/Video${number}.mp4`)) extension = 'mp4';
        else if (await videoExists(`videos/Video${number}.webm`)) extension = 'webm';
        if (!extension) break;
        videos.push(buildVideo(number, extension));
        renderVideoGallery();
    }
}

$('video-dialog-close').addEventListener('click', closeVideo);
$('video-prev').addEventListener('click', () => openVideo(currentVideoIndex - 1));
$('video-next').addEventListener('click', () => openVideo(currentVideoIndex + 1));
videoDialog.addEventListener('close', () => {
    videoPlayer.pause();
    videoPlayer.removeAttribute('src');
    videoPlayer.load();
});
videoDialog.addEventListener('click', event => {
    if (event.target === videoDialog) closeVideo();
});
$('video-search').addEventListener('input', event => {
    videoSearchQuery = event.target.value.trim().toLowerCase();
    renderVideoGallery();
});
$('video-sort').addEventListener('change', event => {
    videoSort = event.target.value;
    renderVideoGallery();
});

renderVideoGallery();
void discoverVideos();
