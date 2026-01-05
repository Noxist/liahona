import { BOM_DE } from './data/bom-de.js';
import { BOM_EN } from './data/bom-en.js';
import { OT_EN } from './data/ot-en.js';
import { NT_EN } from './data/nt-en.js';

const TRANSLATIONS = {
    de: {
        app_title: 'Liahona',
        status_focus: 'Fokussieren',
        status_receiving: 'Empfange...',
        status_hold: 'Länger fokussieren',
        btn_read: 'Lesen',
        btn_reset: 'Neue Stelle ziehen',
        settings_title: 'Einstellungen',
        section_ui: 'App Sprache',
        section_content: 'Inhalte wählen',
        section_languages: 'Inhaltssprache',
        btn_save: 'Speichern',
        language_de: 'Deutsch',
        language_en: 'Englisch',
        book_bom: 'Buch Mormon',
        book_ot: 'Altes Testament',
        book_nt: 'Neues Testament',
    },
    en: {
        app_title: 'Liahona',
        status_focus: 'Focus',
        status_receiving: 'Receiving...',
        status_hold: 'Hold longer',
        btn_read: 'Read',
        btn_reset: 'Pull new verse',
        settings_title: 'Settings',
        section_ui: 'App Language',
        section_content: 'Select Content',
        section_languages: 'Content Language',
        btn_save: 'Save',
        language_de: 'German',
        language_en: 'English',
        book_bom: 'Book of Mormon',
        book_ot: 'Old Testament',
        book_nt: 'New Testament',
    },
};

const DEFAULT_SETTINGS = {
    uiLanguage: 'de',
    content: {
        books: { bom: true, ot: true, nt: true },
        languages: { de: true, en: true },
    },
};

let userSettings = { ...DEFAULT_SETTINGS };
let DB = [];

const BOOK_LANG_MAP = new WeakMap();
[...BOM_DE].forEach((book) => BOOK_LANG_MAP.set(book, 'deu'));
[...BOM_EN, ...OT_EN, ...NT_EN].forEach((book) => BOOK_LANG_MAP.set(book, 'eng'));

const loadSettings = () => {
    try {
        const stored = localStorage.getItem('liahona_settings');
        if (!stored) return;
        const parsed = JSON.parse(stored);
        userSettings = {
            uiLanguage: parsed.uiLanguage || DEFAULT_SETTINGS.uiLanguage,
            content: {
                books: { ...DEFAULT_SETTINGS.content.books, ...(parsed.content?.books || {}) },
                languages: { ...DEFAULT_SETTINGS.content.languages, ...(parsed.content?.languages || {}) },
            },
        };
    } catch (error) {
        console.warn('Konnte Einstellungen nicht laden, verwende Standardwerte.', error);
    }
};

const saveSettings = () => {
    localStorage.setItem('liahona_settings', JSON.stringify(userSettings));
};

const rebuildDatabase = () => {
    const { books, languages } = userSettings.content;
    const newDb = [];

    if (books.bom && languages.de) newDb.push(...BOM_DE);
    if (books.bom && languages.en) newDb.push(...BOM_EN);
    if (books.ot && languages.en) newDb.push(...OT_EN);
    if (books.nt && languages.en) newDb.push(...NT_EN);

    if (newDb.length === 0) {
        newDb.push(...BOM_DE);
        userSettings = {
            ...userSettings,
            content: {
                ...userSettings.content,
                books: { ...userSettings.content.books, bom: true },
                languages: { ...userSettings.content.languages, de: true },
            },
        };
        saveSettings();
    }

    DB = newDb;
};

const getLanguage = (book) => BOOK_LANG_MAP.get(book) || 'deu';

const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');
let w = 0;
let h = 0;
let particles = [];
let moveIntensity = 0;

const orb = document.getElementById('orb');
const overlay = document.getElementById('result-overlay');
const settingsOverlay = document.getElementById('settings-overlay');
const status = document.getElementById('status-text');
const settingsButton = document.getElementById('settings-button');
const settingsClose = document.getElementById('settings-close');
const uiLanguageInputs = document.querySelectorAll('input[name=\"ui-language\"]');
const bookBomCheckbox = document.getElementById('book-bom');
const bookOtCheckbox = document.getElementById('book-ot');
const bookNtCheckbox = document.getElementById('book-nt');
const languageDeCheckbox = document.getElementById('language-de');
const languageEnCheckbox = document.getElementById('language-en');
const saveSettingsButton = document.getElementById('btn-save-settings');

let start = 0;
let distTotal = 0;
let last = { x: 0, y: 0 };
let selection = null;
let isHolding = false;
let vibrationTimer = null;
let statusFocusText = TRANSLATIONS.de.status_focus;
let statusReceivingText = TRANSLATIONS.de.status_receiving;
let statusHoldText = TRANSLATIONS.de.status_hold;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const applyI18n = () => {
    const lang = userSettings.uiLanguage in TRANSLATIONS ? userSettings.uiLanguage : 'de';
    const dict = TRANSLATIONS[lang];
    document.documentElement.lang = lang;

    document.querySelectorAll('[data-i18n]').forEach((el) => {
        const key = el.dataset.i18n;
        if (Object.prototype.hasOwnProperty.call(dict, key)) {
            el.innerText = dict[key];
        }
    });

    statusFocusText = dict.status_focus;
    statusReceivingText = dict.status_receiving;
    statusHoldText = dict.status_hold;

    const closeLabel = lang === 'de' ? 'Schließen' : 'Close';
    settingsClose.setAttribute('aria-label', closeLabel);
    settingsButton.setAttribute('aria-label', dict.settings_title || closeLabel);

    if (!isHolding && !overlay.classList.contains('show')) {
        status.innerText = statusFocusText;
    }
};

const initSettingsUI = () => {
    uiLanguageInputs.forEach((input) => {
        input.checked = input.value === userSettings.uiLanguage;
    });

    bookBomCheckbox.checked = userSettings.content.books.bom;
    bookOtCheckbox.checked = userSettings.content.books.ot;
    bookNtCheckbox.checked = userSettings.content.books.nt;
    languageDeCheckbox.checked = userSettings.content.languages.de;
    languageEnCheckbox.checked = userSettings.content.languages.en;
};

const showSettings = () => {
    initSettingsUI();
    settingsOverlay.classList.add('show');
    settingsOverlay.setAttribute('aria-hidden', 'false');
};

const hideSettings = () => {
    settingsOverlay.classList.remove('show');
    settingsOverlay.setAttribute('aria-hidden', 'true');
};

const updateSettingsFromUI = () => {
    const selectedLanguageInput = Array.from(uiLanguageInputs).find((input) => input.checked);
    const uiLanguage = selectedLanguageInput ? selectedLanguageInput.value : 'de';

    const books = {
        bom: bookBomCheckbox.checked,
        ot: bookOtCheckbox.checked,
        nt: bookNtCheckbox.checked,
    };

    const languages = {
        de: languageDeCheckbox.checked,
        en: languageEnCheckbox.checked,
    };

    if (!languages.de && !languages.en) {
        languages.de = true;
    }

    if (!books.bom && !books.ot && !books.nt) {
        books.bom = true;
    }

    userSettings = {
        uiLanguage,
        content: { books, languages },
    };
    saveSettings();
};

function initCanvas() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    particles = Array.from({ length: 200 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        s: Math.random() * 2.5 + 0.6,
        v: Math.random() * 0.4 + 0.12,
        alpha: Math.random() * 0.5 + 0.25,
    }));
}

function drawParticles() {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    const particleColor = getComputedStyle(document.documentElement).getPropertyValue('--particle-color');

    particles.forEach((p) => {
        if (isHolding) {
            const dx = cx - p.x;
            const dy = cy - p.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const speed = (8 + moveIntensity * 0.1) * (420 / (distance + 120));
            const normX = dx / (distance || 1);
            const normY = dy / (distance || 1);
            p.x += normX * speed;
            p.y += normY * speed;

            if (distance < 16) {
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.max(w, h);
                p.x = cx + Math.cos(angle) * radius;
                p.y = cy + Math.sin(angle) * radius;
            }
        } else {
            p.y -= p.v;
            if (p.y < 0) p.y = h;
        }

        ctx.fillStyle = `rgba(${particleColor}, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
        ctx.fill();
    });

    moveIntensity *= 0.94;
    requestAnimationFrame(drawParticles);
}

function startVibrationLoop() {
    if (!navigator.vibrate) return;
    stopVibrationLoop();
    vibrationTimer = setInterval(() => navigator.vibrate([6, 10]), 110);
}

function stopVibrationLoop() {
    if (vibrationTimer) {
        clearInterval(vibrationTimer);
        vibrationTimer = null;
    }
}

function onDown(event) {
    if (overlay.classList.contains('show') || settingsOverlay.classList.contains('show')) return;
    const point = event.touches ? event.touches[0] : event;
    isHolding = true;
    start = performance.now();
    distTotal = 0;
    last = { x: point.clientX, y: point.clientY };
    document.body.classList.add('active-state');
    status.innerText = statusReceivingText;
    if (navigator.vibrate) navigator.vibrate(16);
    startVibrationLoop();
}

function onMove(event) {
    if (!isHolding) return;
    const point = event.touches ? event.touches[0] : event;
    const dx = point.clientX - last.x;
    const dy = point.clientY - last.y;
    const moveDist = Math.sqrt(dx * dx + dy * dy);
    distTotal += moveDist;
    moveIntensity = Math.min(moveDist * 2, 90);

    const f = 1;
    const maxOffset = Math.min(w, h) * 0.12;
    let oX = (point.clientX - w / 2) * f;
    let oY = (point.clientY - h / 2) * f;
    oX = clamp(oX, -maxOffset, maxOffset);
    oY = clamp(oY, -maxOffset, maxOffset);
    orb.style.transform = `translate(${oX}px, ${oY}px)`;
    last = { x: point.clientX, y: point.clientY };
}

function onUp() {
    if (!isHolding) return;
    stopVibrationLoop();
    const duration = performance.now() - start;
    isHolding = false;
    document.body.classList.remove('active-state');
    orb.style.transform = 'translate(0, 0)';

    if (duration < 600) {
        status.innerText = statusHoldText;
        setTimeout(() => {
            if (!isHolding) status.innerText = statusFocusText;
        }, 1800);
        return;
    }

    const seed = Math.floor(duration + distTotal + performance.now());
    const book = DB[seed % DB.length];
    const chapterIndex = (seed * 17) % book.v.length;
    const verseCount = book.v[chapterIndex];
    const verse = (Math.floor(seed / 7) % verseCount) + 1;
    selection = { b: book, c: chapterIndex + 1, v: verse };

    document.getElementById('r-book').innerText = book.n;
    document.getElementById('r-ref').innerText = `${selection.c}:${verse}`;

    setTimeout(() => {
        overlay.classList.add('show');
        if (navigator.vibrate) navigator.vibrate([20, 50, 20, 70]);
    }, 380);
}

function openSelection() {
    if (!selection) return;
    const { b, c, v } = selection;
    const collection = b.collection || 'bofm';
    const lang = getLanguage(b);
    const app = `gospellibrary://content/scriptures/${collection}/${b.s}/${c}?verse=${v}#p${v}`;
    const web = `https://www.churchofjesuschrist.org/study/scriptures/${collection}/${b.s}/${c}.${v}?lang=${lang}#p${v}`;

    const clearListeners = () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    };

    const fallback = setTimeout(() => {
        window.open(web, '_blank');
        clearListeners();
    }, 1400);

    const handleVisibilityChange = () => {
        if (document.hidden) {
            clearTimeout(fallback);
            clearListeners();
        }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange, { once: false });
    window.location.href = app;
}

function resetOverlay() {
    overlay.classList.remove('show');
    status.innerText = statusFocusText;
    selection = null;
}

const handleSaveSettings = () => {
    updateSettingsFromUI();
    rebuildDatabase();
    applyI18n();
    hideSettings();
};

const init = () => {
    loadSettings();
    rebuildDatabase();
    applyI18n();

    window.addEventListener('resize', initCanvas);
    initCanvas();
    requestAnimationFrame(drawParticles);

    document.addEventListener('contextmenu', (e) => e.preventDefault());

    document.getElementById('btn-reset').addEventListener('click', resetOverlay);
    document.getElementById('btn-open').addEventListener('click', openSelection);
    settingsButton.addEventListener('click', showSettings);
    settingsClose.addEventListener('click', hideSettings);
    saveSettingsButton.addEventListener('click', handleSaveSettings);
    settingsOverlay.addEventListener('click', (event) => {
        if (event.target === settingsOverlay) hideSettings();
    });

    orb.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
};

init();
