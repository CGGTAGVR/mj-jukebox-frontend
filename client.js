// Change the URL below to match your live Render web service address once deployed
const backendURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:3000' 
    : 'https://mj-jukebox-backend.onrender.com'; 

const socket = io(backendURL); 

let instanceId = "local-room"; 
let currentTrackId = null;

const localDiscography = {
    "Off the Wall (1979)": [
        { id: "dont-stop", title: "Don't Stop 'Til You Get Enough", ytId: "yURRmW9oKP0" },
        { id: "rock-with-you", title: "Rock with You", ytId: "5X-Mrc2l1d0" },
        { id: "off-the-wall", title: "Off the Wall", ytId: "B3X_L1b9mME" },
        { id: "shes-out-of-my-life", title: "She's Out of My Life", ytId: "6JQm5aSjX6g" }
    ],
    "Thriller (1982)": [
        { id: "wanna-be-startin", title: "Wanna Be Startin' Somethin'", ytId: "4Uj3zitETs4" },
        { id: "thriller", title: "Thriller", ytId: "sOnqjkJTMaA" },
        { id: "beat-it", title: "Beat It", ytId: "oRdxUFDoQe0" },
        { id: "billie-jean", title: "Billie Jean", ytId: "Zi_XLOBOBDo_Y" },
        { id: "human-nature", title: "Human Nature", ytId: "Ym0l85Ut-8E" },
        { id: "pyt", title: "P.Y.T. (Pretty Young Thing)", ytId: "1XzY2ij_vL4" }
    ],
    "Bad (1987)": [
        { id: "bad", title: "Bad", ytId: "dsUXAEzaC3Q" },
        { id: "the-way-you-make-me-feel", title: "The Way You Make Me Feel", ytId: "HzZ_urpj4As" },
        { id: "man-in-the-mirror", title: "Man in the Mirror", ytId: "PivWY9wn5ps" },
        { id: "dirty-diana", title: "Dirty Diana", ytId: "yUi_S6YWjZw" },
        { id: "smooth-criminal", title: "Smooth Criminal", ytId: "h_D3VFfhvs4" },
        { id: "leave-me-alone", title: "Leave Me Alone", ytId: "crbFmpezO4A" }
    ],
    "Dangerous (1991)": [
        { id: "jam", title: "Jam", ytId: "JbHI1yI1Ndk" },
        { id: "remember-the-time", title: "Remember the Time", ytId: "LeiFF0gvqcc" },
        { id: "black-or-white", title: "Black or White", ytId: "F2AitTPI5U0" },
        { id: "heal-the-world", title: "Heal the World", ytId: "BWf-eARnf6U" },
        { id: "will-you-be-there", title: "Will You Be There", ytId: "jQY_BU_w29M" }
    ],
    "HIStory / Blood on the DB (1995-1997)": [
        { id: "scream", title: "Scream (feat. Janet Jackson)", ytId: "0P4A1K9uC-E" },
        { id: "they-dont-care", title: "They Don't Care About Us", ytId: "QNJL6nUbxG8" },
        { id: "earth-song", title: "Earth Song", ytId: "XAi3VTSdTxU" },
        { id: "blood-on-the-dance-floor", title: "Blood on the Dance Floor", ytId: "c3_NntYhzV4" },
        { id: "ghosts", title: "Ghosts", ytId: "XT_Z_fPZsc0" }
    ],
    "Invincible & Michael (2001-2010)": [
        { id: "you-rock-my-world", title: "You Rock My World", ytId: "g4tpuuAnA6w" },
        { id: "butterflies", title: "Butterflies", ytId: "Z96f_D1mB_s" },
        { id: "hold-my-hand", title: "Hold My Hand (feat. Akon)", ytId: "-oCCnxBos10" }
    ],
    "Xscape (2014)": [
        { id: "love-never-felt", title: "Love Never Felt So Good", ytId: "oG08ukJPtR8" },
        { id: "chicago", title: "Chicago", ytId: "gT_m8h8g5vY" },
        { id: "loving-you", title: "Loving You", ytId: "I_S_3wD9wE4" },
        { id: "a-place-with-no-name", title: "A Place With No Name", ytId: "bO0-F_m-m9Y" },
        { id: "slave-to-the-rhythm", title: "Slave to the Rhythm", ytId: "A366ZfWf-Xk" },
        { id: "do-you-know", title: "Do You Know Where Your Children Are", ytId: "H_Z95gXw1U8" },
        { id: "blue-gangsta", title: "Blue Gangsta", ytId: "Z9_gWb8U8Yw" },
        { id: "xscape-track", title: "Xscape", ytId: "6A39vGvV2Xk" }
    ]
};

const trackingMap = {};
for (const key in localDiscography) {
    localDiscography[key].forEach(song => { trackingMap[song.id] = song; });
}

function buildUI() {
    const shelf = document.getElementById("shelf");
    if (!shelf) return;
    shelf.innerHTML = ""; 

    for (const albumName in localDiscography) {
        const box = document.createElement("div");
        box.className = "album-box";
        
        const header = document.createElement("div");
        header.className = "album-header";
        header.innerText = albumName;
        box.appendChild(header);

        const list = document.createElement("ul");
        list.className = "track-list";
        
        localDiscography[albumName].forEach(song => {
            const item = document.createElement("li");
            item.className = "track-item";
            item.innerText = song.title;
            item.onclick = () => {
                socket.emit("play-track", { instanceId, songId: song.id });
            };
            list.appendChild(item);
        });

        box.appendChild(list);
        shelf.appendChild(box);
    }
}

// FIXED: Prevents script from running prematurely if Discord loads DOM slower than the browser environment
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildUI);
} else {
    buildUI();
}

socket.emit("join-room", instanceId);

socket.on("room-sync", (state) => {
    const status = document.getElementById("player-status");
    const frame = document.getElementById("video-frame");
    
    if (!state || !state.playing) {
        if (status) status.innerText = "Sync Status: Paused";
        return;
    }

    const trackInfo = trackingMap[state.songId];
    if (!trackInfo || !frame) return;

    const targetSeconds = Math.floor(state.progress / 1000);

    if (currentTrackId !== state.songId) {
        currentTrackId = state.songId;
        frame.src = `https://www.youtube.com/embed/${trackInfo.ytId}?autoplay=1&start=${targetSeconds}`;
    }

    if (status) status.innerText = `Now Playing: "${trackInfo.title}"`;
});
