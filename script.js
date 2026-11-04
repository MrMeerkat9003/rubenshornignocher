
'use strict';

/* ============================================================
   PHOTO SETTINGS — edit this section to customise the gallery
   ============================================================ */

// Photos Ruben1.jpeg–Ruben47.jpeg are included in the initial library.
// Ruben48.jpeg and higher are detected automatically, in sequence.
const TOTAL_PHOTOS = 47;
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

    ['home', 'story', 'collection', 'moments'].forEach(id => {
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
   PHOTO SUBMISSIONS — GITHUB PAGES + FORMSUBMIT
   ============================================================ */

// SETUP: Replace this with the inbox that should receive the photo attachments.
// FormSubmit sends an activation email the first time the form is used.
// Do not put secret credentials in public GitHub files.
const PHOTO_SUBMISSION_EMAIL = 'rubenofficialwebsite@gmail.com';
const PHOTO_UPLOAD_LIMIT = 30 * 1024 * 1024;

const photoForm = $('photo-submission-form');
const photoFileInput = $('submit-image');
const photoUploadError = $('submit-error');
const photoPreview = $('submit-preview');
const photoPreviewImage = $('submit-preview-image');
let photoPreviewUrl = null;
let verifiedUpload = false;

function submissionError(message) {
    photoUploadError.textContent = message;
    photoUploadError.hidden = !message;
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

// Browser-side file signature checks are useful for mistakes, NOT a virus scanner.
async function checkImageSignature(file) {
    const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const png = bytes.length >= 8 &&
        [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b);
    const jpeg = bytes.length >= 3 &&
        bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const webp = bytes.length >= 12 &&
        String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
        String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';

    const allowed = {
        'image/png': png,
        'image/jpeg': jpeg,
        'image/webp': webp
    };
    return allowed[file.type] === true;
}

async function validateSubmittedPhoto() {
    const file = photoFileInput.files?.[0];
    clearSubmissionPreview();
    submissionError('');

    if (!file) {
        submissionError('Please choose a photo before sending.');
        return false;
    }
    if (file.size === 0 || file.size > PHOTO_UPLOAD_LIMIT) {
        submissionError('Please choose an image smaller than 10 MB.');
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

photoFileInput.addEventListener('change', validateSubmittedPhoto);
$('submit-remove-image').addEventListener('click', () => {
    photoFileInput.value = '';
    clearSubmissionPreview();
    submissionError('');
});

// Basic drag and drop, using the same file input and validation.
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
        validateSubmittedPhoto();
    }
});

photoForm.addEventListener('submit', async event => {
    event.preventDefault();

    if (PHOTO_SUBMISSION_EMAIL === 'REPLACE_WITH_YOUR_EMAIL@example.com' ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(PHOTO_SUBMISSION_EMAIL)) {
        submissionError('The website owner must configure the receiving email address before submissions can be sent.');
        return;
    }
    if (!photoForm.reportValidity()) return;
    if (!verifiedUpload && !(await validateSubmittedPhoto())) return;
    // Re-check immediately before submission as well.
    if (!(await validateSubmittedPhoto())) return;

    photoForm.action = `https://formsubmit.co/${encodeURIComponent(PHOTO_SUBMISSION_EMAIL)}`;
    $('submit-send').disabled = true;
    $('submit-send').textContent = 'Opening secure submission…';

    // Native multipart POST is required for FormSubmit's email attachments.
    // The form provider will display the confirmation / CAPTCHA page.
    photoForm.submit();
});
