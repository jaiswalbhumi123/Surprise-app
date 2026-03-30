/**
 * 🎨 DIGITAL SURPRISE CREATOR: ADVANCED ENGINE (CLOUD SYNC) V4
 */

// ☁️ FIREBASE CONFIGURATION (Realtime Database)
const firebaseConfig = {
  apiKey: "AIzaSyBVNwo8IRLBoQvIK7YjNYJZsNo40raNM-E",
  authDomain: "surpriceapp-18abee.firebaseapp.com",
  projectId: "surpriceapp-18abee",
  storageBucket: "surpriceapp-18abee.firebasestorage.app",
  messagingSenderId: "665247932043",
  appId: "1:665247932043:web:fc44855e8d02ebb1aa7e8e",
  measurementId: "G-09EWCNNP4C"
};

// Initialize Firebase (Compat Mode with Realtime DB)
let db;
try {
    const app = firebase.initializeApp(firebaseConfig);
    db = firebase.database();
} catch(e) { console.warn("Firebase not configured properly.", e); }

const CONFIG_KEY = 'surp_app_config_v3';

const APP_STATE = {
    mode: 'launch', 
    currentStep: 0,
    isAuthLogin: true,
    config: JSON.parse(localStorage.getItem(CONFIG_KEY)) || {
        targetDate: new Date(Date.now() + 65000).toISOString(),
        type: 'birthday',
        letter: { to: 'To My Love,', body: 'Every moment with you is magic... ✨' },
        voice: null,
        memories: [
            { img: null, note: '' },
            { img: null, note: '' },
            { img: null, note: '' },
            { img: null, note: '' },
            { img: null, note: '' }
        ],
        final: { images: [], title: 'Happy Anniversary!', to: 'My Love', from: 'Abhay' },
        musicUrl: 'https://cdn.pixabay.com/download/audio/2022/11/22/audio_7acb8bbab2.mp3'
    }
};

// ==========================================
// 🚀 INITIALIZATION
// ==========================================
function init() {
    setupGlobalEvents();
    generateParticles(); // Restore original particle generation
    
    const urlParams = new URLSearchParams(window.location.search);
    const cloudId = urlParams.get('id');
    
    if (cloudId) {
        loadFromCloud(cloudId);
    } else if (urlParams.has('view')) {
        startRecipientFlow();
    } else {
        navigateTo('launch');
    }
}

// Memory Limit Helper
function compressImage(dataUrl, callback) {
    const img = new Image();
    img.onload = () => {
        try {
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 600;
            let width = img.width;
            let height = img.height;
            if (width > height && width > MAX_SIZE) {
                height *= MAX_SIZE / width; width = MAX_SIZE;
            } else if (height > MAX_SIZE) {
                width *= MAX_SIZE / height; height = MAX_SIZE;
            }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            callback(canvas.toDataURL('image/jpeg', 0.5));
        } catch(e) {
            callback(dataUrl); // Fallback to original
        }
    };
    img.onerror = () => { callback(dataUrl); };
    img.src = dataUrl;
}

function compressThumbnail(dataUrl, callback) {
    const img = new Image();
    img.onload = () => {
        try {
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 350; // Extremely small for multi-upload
            let width = img.width;
            let height = img.height;
            if (width > height && width > MAX_SIZE) {
                height *= MAX_SIZE / width; width = MAX_SIZE;
            } else if (height > MAX_SIZE) {
                width *= MAX_SIZE / height; height = MAX_SIZE;
            }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            callback(canvas.toDataURL('image/jpeg', 0.4));
        } catch(e) {
            callback(dataUrl);
        }
    };
    img.onerror = () => { callback(dataUrl); };
    img.src = dataUrl;
}


// ==========================================
// 🗺️ NAVIGATION & UI FIXES
// ==========================================
function navigateTo(screenId) {
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active');
        s.classList.add('hidden');
    });
    const next = document.getElementById(`${screenId}-screen`);
    if (next) {
        next.classList.remove('hidden');
        setTimeout(() => next.classList.add('active'), 50);
        onScreenShow(screenId);
    }
}

// 🔐 AUTH UI TOGGLES (Fixed as requested)
document.getElementById('tab-login').onclick = () => {
    APP_STATE.isAuthLogin = true;
    document.getElementById('tab-login').classList.add('active');
    document.getElementById('tab-register').classList.remove('active');
    document.getElementById('register-inputs').classList.remove('active');
    document.getElementById('auth-title').innerText = "Welcome Back";
    document.getElementById('auth-btn').innerText = "Login 🔒";
};

document.getElementById('tab-register').onclick = () => {
    APP_STATE.isAuthLogin = false;
    document.getElementById('tab-register').classList.add('active');
    document.getElementById('tab-login').classList.remove('active');
    document.getElementById('register-inputs').classList.add('active');
    document.getElementById('auth-title').innerText = "Create Account";
    document.getElementById('auth-btn').innerText = "Register 🚀";
};

document.getElementById('auth-form').onsubmit = (e) => {
    e.preventDefault();
    navigateTo('setup-time');
};

// Skip Auth Logic (Added for user convenience)
function skipAuth() {
    navigateTo('setup-time');
}

// ==========================================
// ☁️ BACKEND: CLOUD SYNC LOGIC
// ==========================================
async function saveToCloud() {
    const modal = document.getElementById('cloud-modal');
    const msg = document.getElementById('cloud-msg');
    modal.classList.remove('hidden');
    msg.innerText = "Syncing your memories to Cloud...";
    
    // Add a 5 second timeout to prevent hanging
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000));
    
    try {
        if (!db) throw new Error("Backend not initialized");
        
        // Use Realtime Database instead of Firestore
        const newRef = db.ref("surprises").push();
        const uploadTask = newRef.set(APP_STATE.config);
        
        // Race the cloud upload against a 5s timeout
        await Promise.race([uploadTask, timeout]);
        const uniqueId = newRef.key;
        msg.innerText = "Success! Surprise saved in cloud! 🎉";
        
        // When Done, show the definitive "Sharing Dashboard"
        setTimeout(() => {
            modal.classList.add('hidden');
            generateQR(uniqueId);
            navigateTo('sharing');
        }, 1500);
        
    } catch(e) {
        msg.innerHTML = "✨ Generating Magic Link...";
        
        setTimeout(() => {
            modal.classList.add('hidden');
            generateQR("local_shared");
            navigateTo('sharing');
        }, 1500);
    }
}

async function loadFromCloud(id) {
    if (id === "local" || id === "local_shared") {
        startRecipientFlow();
        return;
    }
    
    const modal = document.getElementById('cloud-modal');
    const msg = document.getElementById('cloud-msg');
    msg.innerText = "Fetching your surprise... 🎁";
    modal.classList.remove('hidden');

    try {
        if (!db) throw new Error("Offline");
        
        // Fetch from Realtime Database
        const snapshot = await db.ref("surprises/" + id).once('value');
        
        if (snapshot.exists()) {
            APP_STATE.config = snapshot.val();
            modal.classList.add('hidden');
            startRecipientFlow();
        } else {
            throw new Error("Not Found");
        }
    } catch(e) {
        msg.innerHTML = "<span style='color:#ff4757'>Offline Preview Mode.</span><br><small>Loading local data...</small>";
        setTimeout(() => {
            modal.classList.add('hidden');
            startRecipientFlow();
        }, 2000);
    }
}

function generateQR(id) {
    const shareUrl = window.location.origin + window.location.pathname + "?id=" + id;
    const qrDiv = document.getElementById('qrcode-container');
    qrDiv.innerHTML = '';
    
    // Clear previous QR
    new QRCode(qrDiv, { text: shareUrl, width: 156, height: 156 });
    
    document.getElementById('copy-link-btn').onclick = () => {
        navigator.clipboard.writeText(shareUrl);
        alert("Magical Link copied! 💓 Send this to your special someone!");
    };
    
    // Link "Preview" to explicitly start from the 1st stage (Countdown)
    document.getElementById('preview-final-btn').onclick = () => {
        startRecipientFlow();
    };
}

// ==========================================
// 🛠️ CREATOR FLOW & WIZARD (Rest of logic)
// ==========================================
document.getElementById('finish-creator-btn').onclick = () => {
    saveCurrentStepData();
    saveToCloud();
};

function onScreenShow(screenId) {
    if (screenId === 'setup-music') {
        const cds = document.querySelectorAll('.music-card');
        cds.forEach(c => {
            if(c.dataset.url === APP_STATE.config.musicUrl) c.classList.add('active');
            else c.classList.remove('active');
        });
    }
    if (screenId === 'setup-game') renderMemorySetup();
    if (screenId === 'setup-final') renderFinalPhotosPreview();
    if (screenId === 'countdown') startRecipientTimer();
    if (screenId === 'game') setupRecipientGame();
    if (screenId === 'cake') setupCakeScene();
    if (screenId === 'gallery') setupGallery();
    if (screenId === 'final') fireCelebration();
}

function saveCurrentStepData() {
    try {
        const dateV = document.getElementById('setup-target-date').value;
        if (dateV && !isNaN(new Date(dateV).getTime())) {
            APP_STATE.config.targetDate = new Date(dateV).toISOString();
        }
    } catch(err) { console.warn(err); }

    try {
        APP_STATE.config.letter.to = document.getElementById('setup-letter-to').value;
        APP_STATE.config.letter.body = document.getElementById('setup-letter-body').value;
        const finalT = document.getElementById('setup-final-title').value;
        if (finalT) APP_STATE.config.final.title = finalT;
        const finalTo = document.getElementById('setup-final-to').value;
        if (finalTo) APP_STATE.config.final.to = finalTo;
        const finalFrom = document.getElementById('setup-final-from').value;
        if (finalFrom) APP_STATE.config.final.from = finalFrom;
    } catch(err) { console.warn(err); }
    
    try {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(APP_STATE.config));
    } catch(e) {
        console.warn("Storage Full - Photos too large for local caching.");
    }
}

// Memory Setup
function renderMemorySetup() {
    const list = document.getElementById('memory-setup-list');
    list.innerHTML = '';
    APP_STATE.config.memories.forEach((mem, idx) => {
        const slot = document.createElement('div');
        slot.className = 'memory-slot';
        slot.innerHTML = `
            <label class="slot-photo" for="mem-file-${idx}">
                <i class="fas fa-camera ${mem.img ? 'hidden' : ''}" id="icon-mem-${idx}"></i>
                <img id="prev-mem-${idx}" src="${mem.img || ''}" class="${mem.img ? '' : 'hidden'}">
                <span id="label-mem-${idx}" class="${mem.img ? 'hidden' : ''}">Add Photo</span>
            </label>
            <input type="file" id="mem-file-${idx}" accept="image/*" class="hidden-input">
            <div class="flex-column w-100">
                <span class="text-xs text-primary font-bold mb-1">Memory Note #${idx+1}</span>
                <input type="text" class="slot-note" value="${mem.note}" placeholder="e.g. Our First Date" id="note-mem-${idx}">
            </div>
        `;
        list.appendChild(slot);
        
        document.getElementById(`mem-file-${idx}`).onchange = (e) => {
            if (!e.target.files[0]) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                compressImage(ev.target.result, (compressedData) => {
                    APP_STATE.config.memories[idx].img = compressedData;
                    
                    const imgEl = document.getElementById(`prev-mem-${idx}`);
                    const iconEl = document.getElementById(`icon-mem-${idx}`);
                    const labelEl = document.getElementById(`label-mem-${idx}`);
                    
                    imgEl.src = compressedData;
                    imgEl.classList.remove('hidden');
                    iconEl.classList.add('hidden');
                    if(labelEl) labelEl.classList.add('hidden');
                    
                    saveCurrentStepData(); 
                });
            };
            reader.readAsDataURL(e.target.files[0]);
        };
        document.getElementById(`note-mem-${idx}`).oninput = (e) => {
            APP_STATE.config.memories[idx].note = e.target.value;
            saveCurrentStepData();
        };
    });
}

// Recipient Flow
let timerInt;
function startRecipientFlow() {
    APP_STATE.mode = 'recipient';
    navigateTo('countdown');
    document.getElementById('bg-music').src = APP_STATE.config.musicUrl;
}

function startRecipientTimer() {
    clearInterval(timerInt);
    updateTimer();
    timerInt = setInterval(updateTimer, 1000);
}

function updateTimer() {
    const target = new Date(APP_STATE.config.targetDate).getTime();
    const now = new Date().getTime();
    const diff = target - now;
    
    if (diff <= 0) {
        clearInterval(timerInt);
        // ✨ THE BIG REVEAL
        if(document.getElementById('timer-panel')) document.getElementById('timer-panel').classList.add('hidden');
        
        const unlock = document.getElementById('unlock-container');
        if(unlock) unlock.classList.remove('hidden');
        
        // Setup floating hearts background
        const bg = document.getElementById('floating-hearts-bg');
        if (bg && bg.children.length === 0) {
            for(let i=0; i<30; i++) {
                const h = document.createElement('i');
                h.className = 'fas fa-heart bg-heart';
                h.style.left = Math.random() * 100 + 'vw';
                h.style.top = Math.random() * 100 + 'vh';
                h.style.fontSize = (Math.random() * 1.5 + 0.8) + 'rem';
                h.style.animationDuration = (Math.random() * 6 + 4) + 's';
                bg.appendChild(h);
            }
        }
        
        // Show User's Custom Title
        const revealTitle = document.getElementById('view-reveal-title');
        if (revealTitle) revealTitle.innerText = APP_STATE.config.final.title || 'HAPPY BIRTHDAY!';
        
        // Final Confetti Burst
        confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
        return;
    }
    
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    
    document.getElementById('days').innerText = d.toString().padStart(2, '0');
    document.getElementById('hours').innerText = h.toString().padStart(2, '0');
    document.getElementById('mins').innerText = m.toString().padStart(2, '0');
    document.getElementById('secs').innerText = s.toString().padStart(2, '0');
}

// Buttons & Actions
document.getElementById('create-mode-btn').onclick = () => navigateTo('auth');
document.getElementById('view-mode-btn').onclick = () => startRecipientFlow();
document.getElementById('unlock-btn').onclick = () => {
    document.getElementById('bg-music').play().catch(() => {});
    navigateTo('letter');
    document.getElementById('view-letter-to').innerText = APP_STATE.config.letter.to + ',';
    
    // Typing Animation Style
    const textElement = document.getElementById('view-letter-body');
    textElement.style.fontFamily = "'Patrick Hand', cursive";
    textElement.style.fontSize = "1.5rem";
    textElement.style.lineHeight = "1.6";
    textElement.innerText = '';
    const bodyText = APP_STATE.config.letter.body;
    let charIndex = 0;
    
    function typeWriter() {
        if (charIndex < bodyText.length) {
            const isNewline = bodyText.charAt(charIndex) === '\n';
            textElement.innerHTML += isNewline ? '<br>' : bodyText.charAt(charIndex);
            charIndex++;
            setTimeout(typeWriter, 50);
        }
    }
    typeWriter();
    
    // Play Custom Voice Note
    if (APP_STATE.config.voice) {
        const voiceAudio = new Audio(APP_STATE.config.voice);
        voiceAudio.play().catch(() => {});
    }
};
document.getElementById('letter-next-btn').onclick = () => navigateTo('game');

// Game
let score = 0;
function setupRecipientGame() {
    const stage = document.getElementById('game-stage');
    score = 0;
    document.getElementById('score').innerText = `Hearts: 0/5`;
    document.getElementById('game-to-cake-btn').classList.add('hidden');
    document.getElementById('start-game-btn').classList.remove('hidden');
    
    document.getElementById('start-game-btn').onclick = () => {
        document.getElementById('start-game-btn').classList.add('hidden');
        const intervalId = setInterval(() => { 
            if (score >= 5) {
                clearInterval(intervalId);
                return;
            }
            
            // Pauses the spawning of new hearts while the user is reading the note!
            if (!document.getElementById('memory-modal').classList.contains('hidden')) {
                return;
            }
            
            spawnHeart(); 
        }, 800);
    };
}

function spawnHeart() {
    const stage = document.getElementById('game-stage');
    const h = document.createElement('div');
    h.className = 'heart-obj'; 
    h.innerText = '💖';
    
    // Keep it well within the borders
    h.style.left = (Math.random() * (stage.clientWidth - 60) + 10) + 'px';
    h.style.top = (Math.random() * (stage.clientHeight - 60) + 10) + 'px';
    
    h.onclick = () => {
        showMemoryPopup(APP_STATE.config.memories[score % 5]);
        score++; 
        document.getElementById('score').innerText = `Hearts: ${score}/5`;
        h.remove(); 
        
        if (score >= 5) {
            document.getElementById('game-to-cake-btn').classList.remove('hidden');
        }
    };
    stage.appendChild(h); 
    setTimeout(() => { if(h.parentNode) h.remove(); }, 2500);
}
function showMemoryPopup(mem) {
    document.getElementById('pop-img').src = mem.img || 'https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f';
    document.getElementById('pop-note').innerText = mem.note;
    document.getElementById('memory-modal').classList.remove('hidden');
}
document.getElementById('close-memory-btn').onclick = () => document.getElementById('memory-modal').classList.add('hidden');
document.getElementById('game-to-cake-btn').onclick = () => navigateTo('cake');

// Cake
let audioContext, analyser, microphone, scriptProcessor;
let blownCount = 0;

async function setupCakeScene() {
    const area = document.getElementById('candles-area');
    area.innerHTML = ''; 
    blownCount = 0;
    
    // Add CSS Candles
    for(let i=0; i<5; i++) {
        const c = document.createElement('div');
        c.className = 'candle-interactive'; 
        c.innerHTML = '<div class="flame"></div><div class="smoke"></div>';
        c.onclick = () => blowCandle(c);
        area.appendChild(c);
    }
    
    // Start Mic detection
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);
        scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);
        
        analyser.smoothingTimeConstant = 0.8;
        analyser.fftSize = 1024;
        
        microphone.connect(analyser);
        analyser.connect(scriptProcessor);
        scriptProcessor.connect(audioContext.destination);
        
        scriptProcessor.onaudioprocess = () => {
            const array = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(array);
            let values = 0;
            const length = array.length;
            for (let i = 0; i < length; i++) { values += (array[i]); }
            const average = values / length;
            
            // If blowing sound is detected (high volume low frequency)
            if (average > 50) {
                blowAllCandles();
            }
        };
    } catch(err) {
        console.warn("Mic not available for blowing, use tap fallback.", err);
        document.getElementById('cake-instruction').innerText = "Tap all the candles to blow them out!";
    }
}

function blowCandle(c) {
    if (!c.classList.contains('blown')) {
        c.classList.add('blown');
        blownCount++;
        checkCakeDone();
    }
}

function blowAllCandles() {
    document.querySelectorAll('.candle-interactive').forEach((c, idx) => {
        setTimeout(() => blowCandle(c), idx * 300); // blow out sequentially
    });
}

function checkCakeDone() {
    if (blownCount >= 5) {
        if(audioContext) {
            scriptProcessor.disconnect();
            microphone.disconnect();
            audioContext.close();
        }
        document.getElementById('cake-loader').classList.remove('hidden');
        setTimeout(() => navigateTo('gallery'), 1500);
    }
}

function fireCelebration() {
    const images = APP_STATE.config.final.images || [];
    const topSlideshow = document.getElementById('final-top-slideshow');
    const img1 = document.getElementById('static-slide-img-1');
    const img2 = document.getElementById('static-slide-img-2');
    const img3 = document.getElementById('static-slide-img-3');
    const img4 = document.getElementById('static-slide-img-4');
    
    if (images.length > 0) {
        let idx1 = 0 % images.length;
        let idx2 = 1 % images.length;
        let idx3 = 2 % images.length;
        let idx4 = 3 % images.length;
        
        if(img1) img1.src = images[idx1];
        if(img2) img2.src = images[idx2];
        if(img3) img3.src = images[idx3];
        if(img4) img4.src = images[idx4];
        
        // Cycle left top box
        if (images.length > 1 && img1) {
            setInterval(() => {
                img1.style.opacity = 0;
                setTimeout(() => {
                    idx1 = (idx1 + 1) % images.length;
                    img1.src = images[idx1];
                    img1.style.opacity = 1;
                }, 1000);
            }, 3000);
        }
        // Cycle left bottom box
        if (images.length > 2 && img2) {
            setInterval(() => {
                img2.style.opacity = 0;
                setTimeout(() => {
                    idx2 = (idx2 + 1) % images.length;
                    img2.src = images[idx2];
                    img2.style.opacity = 1;
                }, 1000);
            }, 3800);
        }
        // Cycle right top box
        if (images.length > 3 && img3) {
            setInterval(() => {
                img3.style.opacity = 0;
                setTimeout(() => {
                    idx3 = (idx3 + 1) % images.length;
                    img3.src = images[idx3];
                    img3.style.opacity = 1;
                }, 1000);
            }, 4500);
        }
        // Cycle right bottom box
        if (images.length > 4 && img4) {
            setInterval(() => {
                img4.style.opacity = 0;
                setTimeout(() => {
                    idx4 = (idx4 + 1) % images.length;
                    img4.src = images[idx4];
                    img4.style.opacity = 1;
                }, 1000);
            }, 5000);
        }
    }
    
    document.getElementById('view-final-title').innerText = APP_STATE.config.final.title || 'A VERY HAPPY BIRTHDAY BABYY';
    document.getElementById('view-final-to').innerText = APP_STATE.config.final.to || 'My Love';
    document.getElementById('view-final-from').innerText = APP_STATE.config.final.from || 'Your Name';
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
}

document.getElementById('gallery-next-btn').onclick = () => {
    navigateTo('final');
};

function setupGallery() {
    const galleryRow = document.getElementById('view-hanging-gallery');
    galleryRow.innerHTML = '';
    
    APP_STATE.config.memories.forEach((mem, i) => {
        if (mem.img) {
            const p = document.createElement('div');
            p.className = 'polaroid';
            p.innerHTML = `
                <div class="p-clip"></div>
                <img src="${mem.img}">
                <div class="text-center mt-2 font-bold text-xs" style="color:#b7394c; font-family: 'Patrick Hand', cursive;">${mem.note || 'Memory'}</div>
            `;
            galleryRow.appendChild(p);
        }
    });
}

// Globals
function generateParticles() {
    const cont = document.getElementById('balloon-container');
    if (!cont) return;
    const emojis = ['✨', '💖', '🎈'];
    for(let i=0; i<12; i++){ const p = document.createElement('div'); p.className='particle'; p.innerText=emojis[Math.floor(Math.random()*emojis.length)]; p.style.left=Math.random()*100+'vw'; p.style.animationDuration=(Math.random()*10+10)+'s'; cont.appendChild(p); }
}

function setupGlobalEvents() {
    document.querySelectorAll('.next-setup-btn').forEach(b => b.onclick = () => navigateTo(b.dataset.next));
    document.querySelectorAll('.prev-setup-btn').forEach(b => b.onclick = () => navigateTo(b.dataset.prev));
    
        reader.readAsDataURL(e.target.files[0]);
    };
    
    // 🎵 BACKGROUND MUSIC: Library & Upload
    const musicCards = document.querySelectorAll('.music-card');
    const previewAudio = new Audio();
    
    musicCards.forEach(card => {
        card.onclick = () => {
            musicCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            
            const url = card.dataset.url;
            APP_STATE.config.musicUrl = url;
            
            // Preview it
            previewAudio.src = url;
            previewAudio.play().catch(() => {});
            document.getElementById('music-playing-indicator').classList.remove('hidden');
            setTimeout(() => {
                if(!previewAudio.paused) {
                    previewAudio.pause();
                    document.getElementById('music-playing-indicator').classList.add('hidden');
                }
            }, 5000); // 5 sec preview
            
            saveCurrentStepData();
        };
    });

    document.getElementById('upload-music').onchange = (e) => {
        if (!e.target.files[0]) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            APP_STATE.config.musicUrl = ev.target.result;
            musicCards.forEach(c => c.classList.remove('active')); // Deselect library
            
            previewAudio.src = ev.target.result;
            previewAudio.play().catch(() => {});
            document.getElementById('music-playing-indicator').classList.remove('hidden');
            document.getElementById('music-playing-indicator').innerHTML = '<i class="fas fa-check-circle text-success"></i> Custom Song Loaded!';
            
            saveCurrentStepData();
        };
        reader.readAsDataURL(e.target.files[0]);
    };

    // AUDIO: File Upload (Voice Note)
    document.getElementById('upload-voice').onchange = (e) => {

    // AUDIO: Live Recording
    let mediaRecorder;
    let audioChunks = [];
    document.getElementById('rec-btn').onclick = async () => {
        const btn = document.getElementById('rec-btn');
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            btn.innerHTML = '<i class="fas fa-microphone"></i> Start Recording';
            return;
        }
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = () => {
                    APP_STATE.config.voice = reader.result;
                    document.getElementById('voice-preview').classList.remove('hidden');
                    document.getElementById('voice-preview').innerHTML = '<i class="fas fa-check-circle text-success"></i> Voice Note Recorded!';
                    saveCurrentStepData();
                };
                audioChunks = [];
            };
            mediaRecorder.start();
            btn.innerHTML = '<i class="fas fa-stop-circle"></i> Stop Recording...';
        } catch (err) {
            alert('Microphone access denied. Please allow mic usage or upload a file.');
        }
    };

    // FINAL PHOTO: Compressed (Multiple 5 to 8 images)
    const finalPhotoInput = document.getElementById('setup-final-photo');
    finalPhotoInput.onchange = function(e) {
        if (!e.target.files || e.target.files.length === 0) return;
        
        if(!APP_STATE.config.final.images) APP_STATE.config.final.images = [];
        const boxList = document.getElementById('final-photo-preview-list');
        const spanText = document.getElementById('final-photo-span');

        const files = Array.from(e.target.files).slice(0, 8 - APP_STATE.config.final.images.length);
        if(files.length === 0) return;
        
        let currentIdx = 0;
        
        function processNextFile() {
            if (currentIdx >= files.length) {
                if(spanText) spanText.innerText = "Click to Add MORE Special Photos (max 8)";
                saveCurrentStepData();
                return;
            }
            
            if (APP_STATE.config.final.images.length >= 8) {
                if(spanText) spanText.innerText = "Maximum 8 photos reached!";
                saveCurrentStepData();
                return;
            }
            
            if(spanText) spanText.innerText = `Loading image ${currentIdx + 1} of ${files.length}... ⏳`;
            
            const file = files[currentIdx];
            const reader = new FileReader();
            
            reader.onload = (ev) => {
                compressThumbnail(ev.target.result, (compressedData) => {
                    APP_STATE.config.final.images.push(compressedData);
                    
                    
                    currentIdx++;
                    renderFinalPhotosPreview();
                    setTimeout(processNextFile, 100); // slight pause to allow Garbage Collection and DOM render
                });
            };
            
            reader.onerror = () => {
                console.error("FileReader failed for image", currentIdx);
                currentIdx++;
                setTimeout(processNextFile, 100);
            };
            
            reader.readAsDataURL(file);
        }
        
        processNextFile();
    };
    
    // Add setup event listeners again just to be safe if HTML was recreated
    document.querySelectorAll('.next-setup-btn').forEach(b => b.onclick = () => navigateTo(b.dataset.next));
    document.querySelectorAll('.prev-setup-btn').forEach(b => b.onclick = () => navigateTo(b.dataset.prev));
}

function renderFinalPhotosPreview() {
    const boxList = document.getElementById('final-photo-preview-list');
    const spanText = document.getElementById('final-photo-span');
    if (!boxList) return;
    
    boxList.innerHTML = '';
    
    if (!APP_STATE.config.final.images || APP_STATE.config.final.images.length === 0) {
        if(spanText) spanText.innerText = "Click to Choose 5 to 8 Special Photos";
        return;
    }
    
    if (APP_STATE.config.final.images.length < 8) {
        if(spanText) spanText.innerText = "Click to Add MORE Special Photos (max 8)";
    } else {
        if(spanText) spanText.innerText = "Maximum 8 photos reached!";
    }

    APP_STATE.config.final.images.forEach((imgData, idx) => {
        const imgContainer = document.createElement('div');
        imgContainer.style.position = 'relative';
        imgContainer.style.display = 'inline-block';
        imgContainer.style.margin = '5px';
        
        const img = document.createElement('img');
        img.src = imgData;
        img.style.width = '75px';
        img.style.height = '75px';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '8px';
        img.style.border = '2px solid white';
        img.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
        
        const removeBtn = document.createElement('div');
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.style.position = 'absolute';
        removeBtn.style.top = '-5px';
        removeBtn.style.right = '-5px';
        removeBtn.style.background = '#ff4d4d';
        removeBtn.style.color = 'white';
        removeBtn.style.borderRadius = '50%';
        removeBtn.style.width = '24px';
        removeBtn.style.height = '24px';
        removeBtn.style.fontSize = '12px';
        removeBtn.style.display = 'flex';
        removeBtn.style.alignItems = 'center';
        removeBtn.style.justifyContent = 'center';
        removeBtn.style.cursor = 'pointer';
        removeBtn.style.zIndex = '10';
        removeBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        
        removeBtn.onclick = (event) => {
            event.preventDefault();
            event.stopPropagation();
            APP_STATE.config.final.images.splice(idx, 1);
            saveCurrentStepData();
            renderFinalPhotosPreview();
        };
        
        imgContainer.appendChild(img);
        imgContainer.appendChild(removeBtn);
        boxList.appendChild(imgContainer);
    });
}


init();
