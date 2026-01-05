import { APP_LANGUAGE_SET } from './app-config.js';
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
        content_books: 'Bücher',
        content_languages: 'Sprachen',
        content_bom: 'Buch Mormon',
        content_ot: 'Altes Testament',
        content_nt: 'Neues Testament',
        language_de: 'Deutsch',
        language_en: 'Englisch',
        btn_save: 'Speichern',
        settings_close: 'Schließen',
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
        content_books: 'Books',
        content_languages: 'Languages',
        content_bom: 'Book of Mormon',
        content_ot: 'Old Testament',
        content_nt: 'New Testament',
        language_de: 'German',
        language_en: 'English',
        btn_save: 'Save',
        settings_close: 'Close',
    },
};

const SETTINGS_KEY = 'liahona_settings';

const buildDefaultSettings = () => {
    const allowDe = APP_LANGUAGE_SET !== 'EN_ONLY';
    const allowEn = APP_LANGUAGE_SET !== 'DE_ONLY';

    return {
        uiLanguage: allowDe ? 'de' : 'en',
        content: {
            books: { bom: true, ot: true, nt: true },
            languages: { de: allowDe, en: allowEn },
        },
    };
};

const loadUserSettings = () => {
    const defaults = buildDefaultSettings();
    try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        if (!stored) return defaults;
        const parsed = JSON.parse(stored);
        return {
            uiLanguage: parsed.uiLanguage || defaults.uiLanguage,
            content: {
                books: {
                    ...defaults.content.books,
                    ...(parsed.content?.books || {}),
                },
                languages: {
                    ...defaults.content.languages,
                    ...(parsed.content?.languages || {}),
                },
            },
        };
    } catch (error) {
        console.warn('Konnte Einstellungen nicht laden, verwende Standardwerte.', error);
        return defaults;
    }
};

const persistSettings = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(userSettings));
};

let userSettings = loadUserSettings();
let DB = [];

const BOOK_SET_DE = new Set(BOM_DE);
const BOOK_SET_BOM_EN = new Set(BOM_EN);
const BOOK_SET_OT_EN = new Set(OT_EN);
const BOOK_SET_NT_EN = new Set(NT_EN);

const rebuildDatabase = () => {
    const sources = [];
    const { books, languages } = userSettings.content;

    if (books.bom) {
        if (languages.de) sources.push(...BOM_DE);
        if (languages.en) sources.push(...BOM_EN);
    }
    if (books.ot && languages.en) {
        sources.push(...OT_EN);
    }
    if (books.nt && languages.en) {
        sources.push(...NT_EN);
    }

    if (!sources.length) {
        if (BOOK_SET_DE.size) {
            sources.push(...BOM_DE);
            userSettings.content.languages.de = true;
        } else {
            sources.push(...BOM_EN);
            userSettings.content.languages.en = true;
        }
        persistSettings();
    }

    DB = sources;
};

const getLanguage = (book) => {
    if (BOOK_SET_DE.has(book)) return 'deu';
    if (BOOK_SET_BOM_EN.has(book) || BOOK_SET_OT_EN.has(book) || BOOK_SET_NT_EN.has(book)) return 'eng';
    return 'eng';
};

const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');
let w = 0;
let h = 0;
let particles = [];
let moveIntensity = 0;

const orb = document.getElementById('orb');
const overlay = document.getElementById('result-overlay');
const status = document.getElementById('status-text');
const settingsOverlay = document.getElementById('settings-overlay');
const settingsButton = document.getElementById('settings-button');
const settingsClose = document.getElementById('settings-close');
const saveButton = document.getElementById('btn-save');
const uiLanguageInputs = document.querySelectorAll('input[name="ui-language"]');
const bookBomInput = document.getElementById('content-bom');
const bookOtInput = document.getElementById('content-ot');
const bookNtInput = document.getElementById('content-nt');
const languageDeInput = document.getElementById('language-de');
const languageEnInput = document.getElementById('language-en');

let start = 0;
let distTotal = 0;
let last = { x: 0, y: 0 };
let selection = null;
let isHolding = false;
let vibrationTimer = null;
let currentStatusKey = 'focus';
let statusStrings = {
    focus: TRANSLATIONS.de.status_focus,
    receiving: TRANSLATIONS.de.status_receiving,
    hold: TRANSLATIONS.de.status_hold,
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

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
    setStatus('receiving');
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
        setStatus('hold');
        setTimeout(() => {
            if (!isHolding) setStatus('focus');
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
    setStatus('focus');
    selection = null;
}

function applySettingsToControls() {
    const { uiLanguage, content } = userSettings;
    uiLanguageInputs.forEach((input) => {
        input.checked = input.value === uiLanguage;
    });

    bookBomInput.checked = content.books.bom;
    bookOtInput.checked = content.books.ot;
    bookNtInput.checked = content.books.nt;

    languageDeInput.checked = content.languages.de;
    languageEnInput.checked = content.languages.en;
}

function readSettingsFromControls() {
    const selectedLanguage = Array.from(uiLanguageInputs).find((input) => input.checked)?.value || 'de';
    userSettings.uiLanguage = selectedLanguage;
    userSettings.content.books = {
        bom: bookBomInput.checked,
        ot: bookOtInput.checked,
        nt: bookNtInput.checked,
    };
    userSettings.content.languages = {
        de: languageDeInput.checked,
        en: languageEnInput.checked,
    };
}

function openSettings() {
    applySettingsToControls();
    settingsOverlay.classList.add('show');
    settingsOverlay.setAttribute('aria-hidden', 'false');
}

function closeSettings() {
    settingsOverlay.classList.remove('show');
    settingsOverlay.setAttribute('aria-hidden', 'true');
}

function setStatus(key) {
    currentStatusKey = key;
    status.innerText = statusStrings[key] || '';
}

function updateUILanguage() {
    const lang = TRANSLATIONS[userSettings.uiLanguage] ? userSettings.uiLanguage : 'de';
    const strings = TRANSLATIONS[lang];
    statusStrings = {
        focus: strings.status_focus,
        receiving: strings.status_receiving,
        hold: strings.status_hold,
    };

    document.documentElement.lang = lang;
    settingsButton?.setAttribute('aria-label', strings.settings_title);
    settingsClose?.setAttribute('aria-label', strings.settings_close);

    document.querySelectorAll('[data-i18n]').forEach((el) => {
        const key = el.dataset.i18n;
        if (strings[key]) {
            el.innerText = strings[key];
        }
    });

    setStatus(currentStatusKey);
}

function handleSave() {
    readSettingsFromControls();
    persistSettings();
    rebuildDatabase();
    updateUILanguage();
    closeSettings();
}

function handleOverlayClick(event) {
    if (event.target === settingsOverlay) {
        closeSettings();
    }
}

function handleKeydown(event) {
    if (event.key === 'Escape' && settingsOverlay.classList.contains('show')) {
        closeSettings();
    }
}

rebuildDatabase();
updateUILanguage();

window.addEventListener('resize', initCanvas);
initCanvas();
requestAnimationFrame(drawParticles);

document.addEventListener('contextmenu', (e) => e.preventDefault());

document.getElementById('btn-reset').addEventListener('click', resetOverlay);
document.getElementById('btn-open').addEventListener('click', openSelection);
settingsButton.addEventListener('click', openSettings);
settingsClose.addEventListener('click', closeSettings);
settingsOverlay.addEventListener('click', handleOverlayClick);
saveButton.addEventListener('click', handleSave);
document.addEventListener('keydown', handleKeydown);

orb.addEventListener('pointerdown', onDown);
window.addEventListener('pointermove', onMove);
window.addEventListener('pointerup', onUp);
window.addEventListener('pointercancel', onUp);
