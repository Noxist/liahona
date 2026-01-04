const DB = [
    { n: "1. Nephi", s: "1-ne", v: [20, 24, 31, 38, 22, 6, 22, 38, 6, 22, 36, 23, 42, 30, 36, 39, 55, 25, 24, 22, 26, 31] },
    { n: "2. Nephi", s: "2-ne", v: [32, 30, 25, 35, 34, 18, 9, 25, 54, 25, 8, 18, 32, 12, 30, 9, 25, 20, 20, 30, 37, 29, 31, 15, 30, 33, 35, 32, 14, 18, 21, 9, 15] },
    { n: "Jakob", s: "jacob", v: [19, 35, 14, 18, 77, 13, 27] },
    { n: "Enos", s: "enos", v: [27] },
    { n: "Jarom", s: "jarom", v: [15] },
    { n: "Omni", s: "omni", v: [30] },
    { n: "Worte Mormons", s: "w-of-m", v: [18] },
    { n: "Mosia", s: "mosiah", v: [18, 41, 27, 30, 15, 7, 33, 21, 19, 22, 29, 37, 35, 12, 31, 15, 20, 35, 29, 26, 36, 16, 39, 25, 24, 39, 37, 20, 47] },
    { n: "Alma", s: "alma", v: [33, 38, 27, 20, 62, 8, 27, 32, 34, 32, 46, 37, 31, 29, 19, 21, 39, 43, 36, 30, 23, 35, 18, 30, 17, 37, 30, 14, 17, 60, 38, 43, 23, 41, 16, 30, 47, 15, 19, 26, 15, 31, 54, 24, 24, 41, 36, 25, 30, 40, 37, 40, 23, 58, 35, 57, 36, 41, 13, 36, 21, 52, 17] },
    { n: "Helaman", s: "hel", v: [34, 14, 37, 26, 52, 41, 29, 28, 41, 19, 38, 26, 39, 31, 17, 25] },
    { n: "3. Nephi", s: "3-ne", v: [30, 19, 26, 33, 26, 30, 26, 25, 22, 19, 41, 48, 34, 27, 24, 20, 25, 39, 36, 46, 29, 17, 14, 3, 6, 21, 33, 40, 9, 2] },
    { n: "4. Nephi", s: "4-ne", v: [49] },
    { n: "Mormon", s: "morm", v: [19, 29, 22, 23, 24, 22, 10, 41, 37] },
    { n: "Ether", s: "eth", v: [43, 25, 28, 19, 6, 30, 27, 26, 35, 34, 23, 41, 31, 31, 34] },
    { n: "Moroni", s: "moro", v: [4, 3, 4, 3, 2, 9, 48, 30, 26, 34] }
];

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
    const app = `gospellibrary://content/scriptures/bofm/${b.s}/${c}?verse=${v}#p${v}`;
    const web = `https://www.churchofjesuschrist.org/study/scriptures/bofm/${b.s}/${c}.${v}?lang=deu#p${v}`;

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
