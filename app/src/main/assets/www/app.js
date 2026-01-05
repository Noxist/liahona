import { APP_LANGUAGE_SET } from './app-config.js';
import { BOM_DE } from './data/bom-de.js';
import { BOM_EN } from './data/bom-en.js';
import { OT_EN } from './data/ot-en.js';
import { NT_EN } from './data/nt-en.js';

const getDatabase = () => {
    switch (APP_LANGUAGE_SET) {
        case 'DE_ONLY':
            return [...BOM_DE];
        case 'EN_ONLY':
            return [...BOM_EN, ...OT_EN, ...NT_EN];
        case 'ALL':
            return [...BOM_DE, ...BOM_EN, ...OT_EN, ...NT_EN];
        default:
            console.warn(`Unbekannter APP_LANGUAGE_SET: ${APP_LANGUAGE_SET}, verwende DE_ONLY als Fallback.`);
            return [...BOM_DE];
    }
};

const DB = getDatabase();

const getLanguage = (book) => {
    if (APP_LANGUAGE_SET === 'DE_ONLY') return 'deu';
    if (APP_LANGUAGE_SET === 'EN_ONLY') return 'eng';
    return BOM_DE.includes(book) ? 'deu' : 'eng';
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

let start = 0;
let distTotal = 0;
let last = { x: 0, y: 0 };
let selection = null;
let isHolding = false;
let vibrationTimer = null;

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
    if (overlay.classList.contains('show')) return;
    const point = event.touches ? event.touches[0] : event;
    isHolding = true;
    start = performance.now();
    distTotal = 0;
    last = { x: point.clientX, y: point.clientY };
    document.body.classList.add('active-state');
    status.innerText = 'Empfange...';
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
        status.innerText = 'Länger fokussieren';
        setTimeout(() => {
            if (!isHolding) status.innerText = 'Fokussieren';
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
    status.innerText = 'Fokussieren';
    selection = null;
}

window.addEventListener('resize', initCanvas);
initCanvas();
requestAnimationFrame(drawParticles);

document.addEventListener('contextmenu', (e) => e.preventDefault());

document.getElementById('btn-reset').addEventListener('click', resetOverlay);
document.getElementById('btn-open').addEventListener('click', openSelection);

orb.addEventListener('pointerdown', onDown);
window.addEventListener('pointermove', onMove);
window.addEventListener('pointerup', onUp);
window.addEventListener('pointercancel', onUp);
