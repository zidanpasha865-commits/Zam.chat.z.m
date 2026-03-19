// ============================================================
// STATE
// ============================================================
let state = {
  securityPws: {p1:'Zam.chat@', p2:'Zam.chat@zidan.', p3:'Zam.chat@zidan.com'},
  adminPw: 'Admin.#zamChat',
  friendPw: 'ZamFriends@1',
  users: {}, // { username: { password, email, gender, age, bio, avatar, following:[], adminBadge:false } }
  currentUser: null,
  chats: {}, // { peerKey: [{id,from,to,text,type,time,saved,disappearAt}] }
  chatPeer: null,
  chatSaved: false,
  timerSelected: null,
  timerMs: null,
  isRecording: false,
  mediaRecorder: null,
  audioChunks: [],
  pendingDeleteUser: null,
};

// Persist to localStorage
function save() {
  try {
    localStorage.setItem('zamchat', JSON.stringify({
      securityPws: state.securityPws,
      adminPw: state.adminPw,
      friendPw: state.friendPw,
      users: state.users,
      chats: state.chats,
    }));
  } catch(e){}
}

function load() {
  try {
    const d = JSON.parse(localStorage.getItem('zamchat') || '{}');
    if(d.securityPws) state.securityPws = d.securityPws;
    if(d.adminPw) state.adminPw = d.adminPw;
    if(d.friendPw) state.friendPw = d.friendPw;
    if(d.users) state.users = d.users;
    if(d.chats) state.chats = d.chats;
  } catch(e){}
}

load();

// ============================================================
// UTILS
// ============================================================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if(el) el.classList.add('active');
}

function showToast(msg, type='') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  setTimeout(() => t.className = 'toast', 2600);
}

function closeOverlay(id) {
  document.getElementById(id).classList.remove('open');
}

function avatarColor(username) {
  const colors = ['av-blue','av-green','av-red','av-gold','av-purple'];
  let sum = 0;
  for(let c of (username||'Z')) sum += c.charCodeAt(0);
  return colors[sum % colors.length];
}

function avatarLetter(username) {
  return (username||'?')[0].toUpperCase();
}

function chatKey(a, b) {
  return [a,b].sort().join('__');
}

function timeStr(ts) {
  if(!ts) return '';
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2,'0');
  const m = d.getMinutes().toString().padStart(2,'0');
  return h+':'+m;
}

// SHOW/HIDE PASSWORD
function togglePw(inputId, btn) {
  const inp = document.getElementById(inputId);
  if(!inp) return;
  if(inp.type === 'password') { inp.type = 'text'; btn.textContent = '🙈'; }
  else { inp.type = 'password'; btn.textContent = '👁'; }
}

// ============================================================
// SCREEN 1 — SECURITY
// ============================================================
function checkSecurity() {
  const p1 = document.getElementById('sec-p1').value.trim();
  const p2 = document.getElementById('sec-p2').value.trim();
  const p3 = document.getElementById('sec-p3').value.trim();
  const err = document.getElementById('sec-err');

  // Update dots
  const d1 = document.getElementById('sd1');
  const d2 = document.getElementById('sd2');
  const d3 = document.getElementById('sd3');

  if(p1 === state.securityPws.p1) { d1.classList.add('done'); d1.classList.remove('active'); }
  if(p2 === state.securityPws.p2) { d2.classList.add('done'); d2.classList.remove('active'); }
  if(p3 === state.securityPws.p3) { d3.classList.add('done'); d3.classList.remove('active'); }

  if(p1 !== state.securityPws.p1 || p2 !== state.securityPws.p2 || p3 !== state.securityPws.p3) {
    err.textContent = 'Incorrect password(s). Try again.';
    ['sec-p1','sec-p2','sec-p3'].forEach(id => {
      const el = document.getElementById(id);
      el.classList.add('error');
      setTimeout(()=>el.classList.remove('error'), 500);
    });
    // reset dots
    d1.className = 'step-dot active'; d2.className = 'step-dot'; d3.className = 'step-dot';
    return;
  }
  err.textContent = '';
  showScreen('s-choose');
}

// Allow enter key on security
document.querySelectorAll('#s-security input').forEach(inp => {
  inp.addEventListener('keydown', e => { if(e.key==='Enter') checkSecurity(); });
});

// ============================================================
// SCREEN 3 — SIGNUP
// ============================================================
function doSignup() {
  const username = document.getElementById('su-username').value.trim().toLowerCase();
  const password = document.getElementById('su-password').value;
  const email = document.getElementById('su-email').value.trim();
  const err = document.getElementById('su-err');

  if(!username || !password) { err.textContent = 'Username and password required.'; return; }
  if(username.length < 3) { err.textContent = 'Username must be at least 3 characters.'; return; }
  if(password.length < 4) { err.textContent = 'Password must be at least 4 characters.'; return; }
  if(state.users[username]) { err.textContent = 'Username already taken.'; return; }

  state.users[username] = { password, email, gender:'', age:'', bio:'', avatar:'', following:[], adminBadge:false };
  save();
  state.currentUser = username;
  err.textContent = '';
  showToast('Account created! Welcome 🎉', 'success');
  goHome();
}

// ============================================================
// SCREEN 4 — LOGIN
// ============================================================
function doLogin() {
  const username = document.getElementById('li-username').value.trim().toLowerCase();
  const password = document.getElementById('li-password').value;
  const err = document.getElementById('li-err');

  if(!username || !password) { err.textContent = 'Please fill all fields.'; return; }
  const user = state.users[username];
  if(!user || user.password !== password) { err.textContent = 'Invalid username or password.'; return; }
  state.currentUser = username;
  err.textContent = '';
  goHome();
}

// ============================================================
// SCREEN 5 — HOME
// ============================================================
function goHome() {
  showScreen('s-home');
  renderHome();
}

function renderHome() {
  const feed = document.getElementById('home-feed');
  const u = state.currentUser;
  if(!u) return;
  const user = state.users[u];
  const following = user.following || [];

  if(following.length === 0) {
    feed.innerHTML = `
      <div class="home-empty">
        <div class="home-empty-img">🐦</div>
        <div class="home-empty-title">No friends yet</div>
        <div class="home-empty-count">0 Friend</div>
        <div style="font-size:13px;color:var(--text2);text-align:center;max-width:220px;line-height:1.6">Search for users and follow them to start chatting</div>
        <button class="btn btn-accent" style="width:auto;padding:11px 28px;margin-top:8px" onclick="goSearch()">Find Friends 🔍</button>
      </div>`;
    return;
  }

  let html = '';
  for(const peer of following) {
    const peerUser = state.users[peer];
    if(!peerUser) continue;
    const key = chatKey(u, peer);
    const msgs = state.chats[key] || [];
    const lastMsg = msgs[msgs.length-1];
    const preview = lastMsg ? (lastMsg.type==='image'?'📷 Image':lastMsg.type==='voice'?'🎙️ Voice':lastMsg.text) : 'Tap to chat';
    const t = lastMsg ? timeStr(lastMsg.time) : '';
    const col = avatarColor(peer);
    const letter = avatarLetter(peer);
    const avatarHtml = peerUser.avatar
      ? `<div style="width:42px;height:42px;border-radius:50%;overflow:hidden;flex-shrink:0"><img src="${peerUser.avatar}" style="width:100%;height:100%;object-fit:cover"/></div>`
      : `<div class="msg-avatar ${col}" style="width:42px;height:42px;font-size:17px">${letter}</div>`;

    const adminBadge = peerUser.adminBadge ? ' <span class="admin-badge">★ ADMIN</span>' : '';

    html += `<div class="friend-row" onclick="openChat('${peer}')">
      ${avatarHtml}
      <div class="friend-row-info">
        <div class="friend-row-name">${peer}${adminBadge}</div>
        <div class="friend-row-preview">${preview}</div>
      </div>
      <div class="friend-row-time">${t}</div>
    </div>`;
  }
  feed.innerHTML = html;
}

function doLogout() {
  state.currentUser = null;
  showScreen('s-choose');
}

// ============================================================
// SCREEN 6 — SEARCH
// ============================================================
function goSearch() {
  showScreen('s-search');
  document.getElementById('search-input').value = '';
  document.getElementById('search-results').innerHTML = '<div style="padding:40px;text-align:center;color:var(--text2);font-size:14px;">Search for a user to connect 👆</div>';
}

function doSearch() {
  const q = document.getElementById('search-input').value.trim().toLowerCase();
  const res = document.getElementById('search-results');
  if(!q) { res.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text2);">Enter a username to search</div>'; return; }

  const cu = state.currentUser;
  const matches = Object.keys(state.users).filter(u => u !== cu && u.includes(q));

  if(!matches.length) { res.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text2);">No users found 😕</div>'; return; }

  const following = state.users[cu].following || [];
  let html = '';
  for(const u of matches) {
    const col = avatarColor(u);
    const letter = avatarLetter(u);
    const pu = state.users[u];
    const avatarHtml = pu.avatar
      ? `<div style="width:40px;height:40px;border-radius:50%;overflow:hidden;flex-shrink:0"><img src="${pu.avatar}" style="width:100%;height:100%;object-fit:cover"/></div>`
      : `<div class="msg-avatar ${col}" style="width:40px;height:40px;font-size:16px">${letter}</div>`;

    const isFollowing = following.includes(u);
    const adminBadge = pu.adminBadge ? '<span class="admin-badge" style="margin-left:4px">★</span>' : '';

    if(isFollowing) {
      html += `<div class="search-result-item">
        ${avatarHtml}
        <div class="s-info">
          <div class="s-name">${u}${adminBadge}</div>
          <div class="s-id" style="color:var(--accent3)">✅ Following</div>
        </div>
        <button class="btn btn-sm btn-accent" onclick="openChat('${u}')">💬 Chat</button>
        <button class="btn btn-sm btn-danger" onclick="unfollowUser('${u}')" style="margin-left:6px">✕</button>
      </div>`;
    } else {
      html += `<div class="search-result-item">
        ${avatarHtml}
        <div class="s-info">
          <div class="s-name">${u}${adminBadge}</div>
          <div class="s-id">@${u}</div>
        </div>
        <button class="btn btn-sm btn-accent" onclick="followUser('${u}')">Follow</button>
      </div>`;
    }
  }
  res.innerHTML = html;
}

function followUser(peer) {
  const cu = state.currentUser;
  if(!state.users[cu].following) state.users[cu].following = [];
  if(!state.users[cu].following.includes(peer)) state.users[cu].following.push(peer);
  save();
  showToast(`Following @${peer} ✅`, 'success');
  doSearch(); // refresh search results to show Chat button
}

function unfollowUser(peer) {
  const cu = state.currentUser;
  state.users[cu].following = (state.users[cu].following||[]).filter(u=>u!==peer);
  save();
  showToast(`Unfollowed @${peer}`, '');
  doSearch();
}

// ============================================================
// SCREEN 7 — CHAT
// ============================================================
function openChat(peer) {
  state.chatPeer = peer;
  state.chatSaved = false;
  state.timerSelected = null;
  state.timerMs = null;

  document.getElementById('chat-peer-name').textContent = peer;
  const col = avatarColor(peer);
  const pu = state.users[peer];
  const avEl = document.getElementById('chat-peer-avatar');
  if(pu && pu.avatar) {
    avEl.innerHTML = `<img src="${pu.avatar}" style="width:34px;height:34px;border-radius:50%;object-fit:cover"/>`;
    avEl.className = 'msg-avatar';
  } else {
    avEl.className = `msg-avatar ${col}`;
    avEl.textContent = avatarLetter(peer);
  }

  // reset UI
  document.getElementById('save-dot').classList.remove('saved');
  document.getElementById('save-dot-label').textContent = 'Tap to save chat';
  document.getElementById('timer-popup').classList.remove('open');
  document.getElementById('timer-indicator').style.display = 'none';
  document.querySelectorAll('.timer-option').forEach(o=>o.classList.remove('selected'));

  showScreen('s-chat');
  renderMessages();
  cleanExpiredMessages();
}

function renderMessages() {
  const peer = state.chatPeer;
  const cu = state.currentUser;
  const key = chatKey(cu, peer);
  const msgs = state.chats[key] || [];
  const list = document.getElementById('messages-list');

  if(!msgs.length) {
    list.innerHTML = `<div style="text-align:center;color:var(--text2);font-size:13px;padding:30px">No messages yet. Say hi! 👋</div>`;
    return;
  }

  let html = '';
  const now = Date.now();
  for(const m of msgs) {
    if(m.disappearAt && m.disappearAt < now && !m.saved) continue;
    const isOut = m.from === cu;
    const col = avatarColor(m.from);
    const pu = state.users[m.from];
    let avHtml = '';
    if(!isOut) {
      avHtml = pu && pu.avatar
        ? `<div style="width:26px;height:26px;border-radius:50%;overflow:hidden;flex-shrink:0"><img src="${pu.avatar}" style="width:100%;height:100%;object-fit:cover"/></div>`
        : `<div class="msg-avatar ${col}">${avatarLetter(m.from)}</div>`;
    }

    let content = '';
    if(m.type === 'image') {
      content = `<img src="${m.data}" class="msg-image" />`;
    } else if(m.type === 'voice') {
      const waves = Array.from({length:12},(_,i)=>`<span style="height:${4+Math.sin(i)*8+8}px"></span>`).join('');
      content = `<div class="voice-msg">
        <button class="voice-play-btn" onclick="playAudio('${m.id}')">▶</button>
        <div class="voice-wave">${waves}</div>
        <span style="font-size:11px;color:var(--text2)">${m.duration||'0'}s</span>
        <audio id="audio-${m.id}" src="${m.data}" style="display:none"></audio>
      </div>`;
    } else {
      content = m.text;
    }

    const savedMark = m.saved ? '<span style="font-size:10px;color:var(--accent3);margin-left:4px">●</span>' : '';
    html += `<div class="msg-row ${isOut?'out':'in'}">
      ${avHtml}
      <div>
        <div class="msg-bubble">${content}${savedMark}</div>
        <div class="msg-time">${timeStr(m.time)}</div>
      </div>
    </div>`;
  }
  list.innerHTML = html || `<div style="text-align:center;color:var(--text2);font-size:13px;padding:30px">No messages yet. Say hi! 👋</div>`;
  list.scrollTop = list.scrollHeight;
}

function cleanExpiredMessages() {
  const peer = state.chatPeer;
  const cu = state.currentUser;
  const key = chatKey(cu, peer);
  if(!state.chats[key]) return;
  const now = Date.now();
  const before = state.chats[key].length;
  state.chats[key] = state.chats[key].filter(m => !m.disappearAt || m.disappearAt > now || m.saved);
  if(state.chats[key].length !== before) { save(); renderMessages(); }
}

function sendMessage() {
  const input = document.getElementById('msg-input');
  const text = input.value.trim();
  if(!text) return;

  const cu = state.currentUser;
  const peer = state.chatPeer;
  const key = chatKey(cu, peer);
  if(!state.chats[key]) state.chats[key] = [];

  const msg = {
    id: Date.now()+'_'+Math.random().toString(36).slice(2),
    from: cu, to: peer, text, type:'text',
    time: Date.now(), saved: state.chatSaved,
    disappearAt: state.timerMs ? Date.now() + state.timerMs * 1000 : null,
  };

  state.chats[key].push(msg);
  save();
  input.value = '';
  input.style.height = 'auto';
  renderMessages();
}

function msgKeydown(e) {
  if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 100) + 'px';
}

function sendImage(e) {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    const cu = state.currentUser;
    const peer = state.chatPeer;
    const key = chatKey(cu, peer);
    if(!state.chats[key]) state.chats[key] = [];
    const msg = {
      id: Date.now()+'_img',
      from:cu, to:peer, type:'image', data:ev.target.result, text:'',
      time:Date.now(), saved:state.chatSaved,
      disappearAt: state.timerMs ? Date.now() + state.timerMs * 1000 : null,
    };
    state.chats[key].push(msg);
    save();
    renderMessages();
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function playAudio(id) {
  const a = document.getElementById('audio-'+id);
  if(a) a.paused ? a.play() : a.pause();
}

function toggleSaveChat() {
  state.chatSaved = !state.chatSaved;
  const dot = document.getElementById('save-dot');
  const label = document.getElementById('save-dot-label');
  if(state.chatSaved) {
    dot.classList.add('saved');
    label.textContent = 'Chat saved ●';
    label.style.color = 'var(--accent3)';
    showToast('Chat saved — messages won\'t disappear 💾', 'success');
  } else {
    dot.classList.remove('saved');
    label.textContent = 'Tap to save chat';
    label.style.color = 'var(--text2)';
  }
}

function toggleTimerPopup() {
  const popup = document.getElementById('timer-popup');
  popup.classList.toggle('open');
  const btn = document.getElementById('timer-toggle-btn');
  btn.classList.toggle('active', popup.classList.contains('open'));
}

function setTimer(label, seconds) {
  state.timerSelected = label;
  state.timerMs = seconds;
  document.querySelectorAll('.timer-option').forEach(o => {
    o.classList.toggle('selected', o.textContent === label);
  });
  const ind = document.getElementById('timer-indicator');
  ind.style.display = 'flex';
  document.getElementById('timer-label').textContent = label;
  document.getElementById('timer-popup').classList.remove('open');
  document.getElementById('timer-toggle-btn').classList.add('active');
  showToast(`Timer set: messages will vanish in ${label} ⏱`, '');
}

// Voice notes
async function toggleVoice() {
  const btn = document.getElementById('voice-btn');
  if(!state.isRecording) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      state.mediaRecorder = new MediaRecorder(stream);
      state.audioChunks = [];
      state.mediaRecorder.ondataavailable = e => state.audioChunks.push(e.data);
      state.mediaRecorder.onstop = finishVoice;
      state.mediaRecorder.start();
      state.isRecording = true;
      state.recordStart = Date.now();
      btn.classList.add('recording');
      btn.textContent = '⏹';
    } catch(e) {
      showToast('Microphone access denied', 'error-toast');
    }
  } else {
    state.mediaRecorder.stop();
    state.mediaRecorder.stream.getTracks().forEach(t=>t.stop());
    state.isRecording = false;
    btn.classList.remove('recording');
    btn.textContent = '🎙️';
  }
}

function finishVoice() {
  const blob = new Blob(state.audioChunks, {type:'audio/webm'});
  const reader = new FileReader();
  const duration = Math.round((Date.now() - state.recordStart) / 1000);
  reader.onload = ev => {
    const cu = state.currentUser;
    const peer = state.chatPeer;
    const key = chatKey(cu, peer);
    if(!state.chats[key]) state.chats[key] = [];
    const msg = {
      id: Date.now()+'_voice',
      from:cu, to:peer, type:'voice', data:ev.target.result, text:'',
      time:Date.now(), saved:state.chatSaved, duration,
      disappearAt: state.timerMs ? Date.now() + state.timerMs * 1000 : null,
    };
    state.chats[key].push(msg);
    save();
    renderMessages();
  };
  reader.readAsDataURL(blob);
}

// ============================================================
// SCREEN 8 — ADMIN LOCK
// ============================================================
function goAdminLock() { showScreen('s-admin-lock'); document.getElementById('adm-p1').value=''; document.getElementById('adm-p2').value=''; document.getElementById('adm-err').textContent=''; }

function checkAdmin() {
  const p1 = document.getElementById('adm-p1').value;
  const p2 = document.getElementById('adm-p2').value;
  const err = document.getElementById('adm-err');
  if(p1 !== state.adminPw || p2 !== state.adminPw) {
    err.textContent = 'Incorrect admin password.';
    return;
  }
  err.textContent = '';
  showScreen('s-admin');
  renderAdminUsers();
}

// ============================================================
// SCREEN 9 — ADMIN PANEL
// ============================================================
function renderAdminUsers() {
  const list = document.getElementById('admin-user-list');
  const users = state.users;
  if(!Object.keys(users).length) {
    list.innerHTML = '<div style="padding:16px;color:var(--text2);font-size:13px;text-align:center">No users yet</div>';
    return;
  }
  let html = '';
  for(const [username, u] of Object.entries(users)) {
    const col = avatarColor(username);
    const letter = avatarLetter(username);
    const avatarHtml = u.avatar
      ? `<div style="width:34px;height:34px;border-radius:50%;overflow:hidden;flex-shrink:0"><img src="${u.avatar}" style="width:100%;height:100%;object-fit:cover"/></div>`
      : `<div class="msg-avatar ${col}" style="width:34px;height:34px;font-size:14px">${letter}</div>`;
    const adminMark = u.adminBadge ? '<span class="admin-badge">★ ADMIN</span>' : '';
    html += `<div class="active-user-row">
      ${avatarHtml}
      <div class="active-user-info">
        <div class="active-user-name">${username} ${adminMark}</div>
        <div class="active-user-email">${u.email||'No email'}</div>
      </div>
      <div class="admin-user-actions">
        <button class="set-admin-btn" onclick="toggleAdminBadge('${username}')" title="${u.adminBadge?'Remove Admin':'Set Admin'}">★</button>
        <button class="del-user-btn" onclick="askDeleteUser('${username}')" title="Delete Account">🗑</button>
      </div>
    </div>`;
  }
  list.innerHTML = html;
}

function toggleAdminBadge(username) {
  if(!state.users[username]) return;
  state.users[username].adminBadge = !state.users[username].adminBadge;
  save();
  renderAdminUsers();
  showToast(state.users[username].adminBadge ? `★ ${username} is now Admin` : `Admin badge removed from ${username}`, 'success');
}

function askDeleteUser(username) {
  state.pendingDeleteUser = username;
  document.getElementById('overlay-del-user').classList.add('open');
}

function confirmDeleteUser() {
  const u = state.pendingDeleteUser;
  if(u) {
    // Remove from all following lists
    for(const [k,v] of Object.entries(state.users)) {
      if(v.following) v.following = v.following.filter(f=>f!==u);
    }
    // Remove chat history for deleted user
    Object.keys(state.chats).filter(k => k.split('__').includes(u)).forEach(k => delete state.chats[k]);
    delete state.users[u];
    save();
    renderAdminUsers();
    showToast(`@${u} deleted + chat history cleared`, 'error-toast');
  }
  closeOverlay('overlay-del-user');
  state.pendingDeleteUser = null;
}

function changeSecurityPw() {
  const p1 = document.getElementById('new-sec-p1').value.trim();
  const p2 = document.getElementById('new-sec-p2').value.trim();
  const p3 = document.getElementById('new-sec-p3').value.trim();
  if(!p1||!p2||!p3) { showToast('Fill all 3 passwords', 'error-toast'); return; }
  state.securityPws = {p1,p2,p3};
  save();
  ['new-sec-p1','new-sec-p2','new-sec-p3'].forEach(id=>document.getElementById(id).value='');
  showToast('Security passwords updated ✅', 'success');
}

function changeAdminPw() {
  const pw = document.getElementById('new-adm-pw').value.trim();
  if(!pw) { showToast('Enter new password', 'error-toast'); return; }
  state.adminPw = pw;
  save();
  document.getElementById('new-adm-pw').value='';
  showToast('Admin password updated ✅', 'success');
}

function changeFriendPw() {
  const pw = document.getElementById('new-friend-pw').value.trim();
  if(!pw) { showToast('Enter new password', 'error-toast'); return; }
  state.friendPw = pw;
  save();
  document.getElementById('new-friend-pw').value='';
  showToast('Friend password updated ✅', 'success');
}

// ============================================================
// SCREEN 10 — PROFILE
// ============================================================
function goProfile() {
  showScreen('s-profile');
  refreshProfile();
}

function refreshProfile() {
  const cu = state.currentUser;
  const u = state.users[cu];
  if(!u) return;
  document.getElementById('profile-username-display').textContent = cu;
  document.getElementById('profile-friends-count').textContent = (u.following||[]).length;
  document.getElementById('profile-gender-display').textContent = u.gender || '—';
  document.getElementById('profile-age-display').textContent = u.age || '—';
  document.getElementById('profile-bio-display').textContent = u.bio || 'No bio yet.';
  const letter = avatarLetter(cu);
  const avEl = document.getElementById('profile-avatar-display');
  if(u.avatar) {
    avEl.innerHTML = `<img src="${u.avatar}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:50%"/>`;
  } else {
    avEl.innerHTML = `<span id="profile-avatar-letter">${letter}</span>`;
  }
}

// ============================================================
// SCREEN 11 — EDIT PROFILE
// ============================================================
function goEditProfile() {
  const cu = state.currentUser;
  const u = state.users[cu];
  document.getElementById('edit-username').value = cu;
  document.getElementById('edit-password').value = '';
  document.getElementById('edit-email').value = u.email || '';
  document.getElementById('edit-gender').value = u.gender || '';
  document.getElementById('edit-age').value = u.age || '';
  document.getElementById('edit-bio').value = u.bio || '';
  document.getElementById('edit-avatar-letter').textContent = avatarLetter(cu);
  const editImg = document.getElementById('edit-avatar-img');
  if(u.avatar) { editImg.src = u.avatar; editImg.style.display='block'; }
  else { editImg.style.display='none'; }
  showScreen('s-edit-profile');
}

function handleAvatarChange(e) {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const img = document.getElementById('edit-avatar-img');
    img.src = ev.target.result;
    img.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function saveProfile() {
  const cu = state.currentUser;
  const newUsername = document.getElementById('edit-username').value.trim().toLowerCase();
  const newPw = document.getElementById('edit-password').value;
  const email = document.getElementById('edit-email').value.trim();
  const gender = document.getElementById('edit-gender').value.trim();
  const age = parseInt(document.getElementById('edit-age').value) || '';
  const bio = document.getElementById('edit-bio').value.trim();
  const avatarImg = document.getElementById('edit-avatar-img');

  if(!newUsername) { showToast('Username cannot be empty', 'error-toast'); return; }
  if(age && age < 18) { showToast('Age must be 18+', 'error-toast'); return; }

  const userData = { ...state.users[cu] };
  userData.email = email;
  userData.gender = gender;
  userData.age = age;
  userData.bio = bio;
  if(newPw) userData.password = newPw;
  if(avatarImg.style.display !== 'none' && avatarImg.src && avatarImg.src.startsWith('data:')) userData.avatar = avatarImg.src;

  if(newUsername !== cu) {
    if(state.users[newUsername]) { showToast('Username already taken', 'error-toast'); return; }
    // Update following lists
    for(const [k,v] of Object.entries(state.users)) {
      if(v.following) v.following = v.following.map(f=>f===cu?newUsername:f);
    }
    // Update chat keys (rename)
    const newChats = {};
    for(const [k,v] of Object.entries(state.chats)) {
      const newKey = k.split('__').map(p=>p===cu?newUsername:p).sort().join('__');
      const newMsgs = v.map(m=>({...m, from:m.from===cu?newUsername:m.from, to:m.to===cu?newUsername:m.to}));
      newChats[newKey] = newMsgs;
    }
    state.chats = newChats;
    delete state.users[cu];
    state.users[newUsername] = userData;
    state.currentUser = newUsername;
  } else {
    state.users[cu] = userData;
  }

  save();
  showToast('Profile saved ✅', 'success');
  showScreen('s-profile');
  refreshProfile();
}

// ============================================================
// SCREEN 12 — FRIENDS LOCK
// ============================================================
function goFriendsLock() {
  showScreen('s-friends-lock');
  document.getElementById('fl-p1').value='';
  document.getElementById('fl-p2').value='';
  document.getElementById('fl-err').textContent='';
}

function checkFriendPw() {
  const p1 = document.getElementById('fl-p1').value;
  const p2 = document.getElementById('fl-p2').value;
  const err = document.getElementById('fl-err');
  if(p1 !== state.friendPw || p2 !== state.friendPw) {
    err.textContent = 'Incorrect friend password.';
    return;
  }
  err.textContent='';
  showScreen('s-friends');
  renderFriends();
}

// ============================================================
// SCREEN 13 — FRIENDS LIST
// ============================================================
function renderFriends() {
  const cu = state.currentUser;
  const following = state.users[cu].following || [];
  const list = document.getElementById('friends-list');
  document.getElementById('friends-count-badge').textContent = following.length + ' friends';

  if(!following.length) {
    list.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text2)">No friends yet</div>';
    return;
  }

  let html = '';
  for(const peer of following) {
    const pu = state.users[peer];
    if(!pu) continue;
    const col = avatarColor(peer);
    const avatarHtml = pu.avatar
      ? `<div style="width:40px;height:40px;border-radius:50%;overflow:hidden;flex-shrink:0"><img src="${pu.avatar}" style="width:100%;height:100%;object-fit:cover"/></div>`
      : `<div class="msg-avatar ${col}" style="width:40px;height:40px;font-size:16px">${avatarLetter(peer)}</div>`;
    const adminBadge = pu.adminBadge ? '<span class="admin-badge" style="margin-left:6px">★ ADMIN</span>' : '';
    html += `<div class="friend-row">
      ${avatarHtml}
      <div class="friend-row-info">
        <div class="friend-row-name">${peer}${adminBadge}</div>
        <div class="friend-row-preview">${pu.email||'No email'}</div>
      </div>
      <button class="btn btn-sm btn-accent" onclick="openChat('${peer}')">Chat</button>
    </div>`;
  }
  list.innerHTML = html;
}

// ============================================================
// ENTER KEY SUPPORT
// ============================================================
// FIX BUG 8: Enter key on security inputs
['sec-p1','sec-p2','sec-p3'].forEach(id=>{
  document.getElementById(id)?.addEventListener('keydown',e=>{if(e.key==='Enter')checkSecurity();});
});

['su-username','su-password','su-email'].forEach(id=>{
  document.getElementById(id)?.addEventListener('keydown',e=>{if(e.key==='Enter')doSignup();});
});
['li-username','li-password'].forEach(id=>{
  document.getElementById(id)?.addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();});
});
['adm-p1','adm-p2'].forEach(id=>{
  document.getElementById(id)?.addEventListener('keydown',e=>{if(e.key==='Enter')checkAdmin();});
});
['fl-p1','fl-p2'].forEach(id=>{
  document.getElementById(id)?.addEventListener('keydown',e=>{if(e.key==='Enter')checkFriendPw();});
});

// Auto-clean expired messages every 30s
setInterval(()=>{ if(state.chatPeer) cleanExpiredMessages(); }, 30000);

// ============================================================
// INIT
// ============================================================
// If user was logged in, skip to home
if(state.currentUser && state.users[state.currentUser]) {
  // Still require security on fresh load
}