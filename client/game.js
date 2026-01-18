// ========================================
// Multiplayer Game Server - COMPLETE CLIENT
// Handles ALL REST + WebSocket endpoints
// ========================================

// Global State
let token = null;
let userId = null;
let projectId = null;
let matchId = null;
let socket = null;
let gameState = { actors: {} };
let playerActorId = null;
let canvas, ctx;
let keys = {};
let projects = [];
let matches = [];

// DOM Elements
const $ = (id) => document.getElementById(id);
const status = $('status');
const loginScreen = $('loginScreen');
const gameScreen = $('gameScreen');
const projectList = $('projectList');
const matchesList = $('matchesList');
const projectName = $('projectName');
const createMatchBtn = $('createMatchBtn');
const joinQueueBtn = $('joinQueueBtn');
const spawnBtn = $('spawnBtn');
const loginStatus = $('loginStatus');
const playerCount = $('playerCount');
const matchIdDisplay = $('matchIdDisplay');
const projectDisplay = $('projectDisplay');

// Status Updates
function updateStatus(msg, type = 'info') {
  status.textContent = msg;
  console.log(`[${type.toUpperCase()}] ${msg}`);

  if (loginStatus) {
    loginStatus.textContent = msg;
    loginStatus.className = `status-${type}`;
  }
}

// API Helper (ALL REST endpoints)
async function apiCall(endpoint, options = {}) {
  const res = await fetch(`http://localhost:3000${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    }
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || res.statusText);
  }
  return res.json();
}

// ========================================
// AUTH ENDPOINTS (Swagger: Auth section)
// ========================================
async function register() {
  try {
    updateStatus('Registering...', 'info');
    const { accessToken, user } = await apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: $('email').value,
        password: $('password').value
      })
    });
    token = accessToken;
    userId = user.id;
    updateStatus('✅ Registered! Starting game...', 'success');
    setTimeout(startGame, 500);
  } catch (e) {
    updateStatus('❌ Register failed: ' + e.message, 'error');
  }
}

async function login() {
  try {
    updateStatus('Logging in...', 'info');
    const { accessToken, user } = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: $('email').value,
        password: $('password').value
      })
    });
    token = accessToken;
    userId = user.id;
    updateStatus('✅ Logged in! Loading projects...', 'success');
    setTimeout(startGame, 500);
  } catch (e) {
    updateStatus('❌ Login failed: ' + e.message, 'error');
  }
}

function logout() {
  token = null;
  userId = null;
  projectId = null;
  matchId = null;
  gameScreen.classList.remove('active');
  loginScreen.classList.add('active');
  updateStatus('Logged out');
}

// ========================================
// PROJECTS ENDPOINTS (Swagger: Projects)
// ========================================
async function createProject() {
  try {
    updateStatus('Creating project...', 'info');
    const project = await apiCall('/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: projectName.value || `Game ${Date.now()}`,
        maxPlayersPerMatch: 4
      })
    });
    projects.push(project);
    projectId = project.id;
    loadProjects();
    createMatchBtn.disabled = false;
    updateStatus(`✅ Project created: ${project.name}`, 'success');
  } catch (e) {
    updateStatus('❌ Create failed: ' + e.message, 'error');
  }
}

async function loadProjects() {
  try {
    projects = await apiCall('/projects');
    projectList.innerHTML = projects.map(p => `
      <button onclick="selectProject('${p.id}')" 
              class="${p.id === projectId ? 'active' : ''}">
        ${p.name} (${p.maxPlayersPerMatch} players)
      </button>
    `).join('');
    updateStatus(`Loaded ${projects.length} projects`, 'info');
  } catch (e) {
    updateStatus('Failed to load projects', 'error');
  }
}

function selectProject(id) {
  projectId = id;
  loadProjects();
  projectDisplay.textContent = projects.find(p => p.id === id)?.name || '-';
  joinQueueBtn.disabled = false;
  updateStatus(`Selected: ${projects.find(p => p.id === id)?.name}`);
}

// ========================================
// MATCHES ENDPOINTS (Swagger: Matches)
// ========================================
async function createMatch() {
  if (!projectId) return updateStatus('Select project first', 'error');
  try {
    updateStatus('Creating match...', 'info');
    const match = await apiCall(`/projects/${projectId}/matches`, { method: 'POST' });
    matches.push(match);
    matchId = match.id;
    loadMatches();
    updateStatus(`✅ Match created: ${matchId.slice(0, 8)}`, 'success');
  } catch (e) {
    updateStatus('❌ Create match failed: ' + e.message, 'error');
  }
}

async function loadMatches() {
  if (!projectId) return;
  try {
    matches = await apiCall(`/projects/${projectId}/matches`);
    matchesList.innerHTML = matches.map(m => `
      <div class="match-item ${m.status}">
        <strong>${m.id.slice(0, 8)}</strong> | ${m.status}
        <span>${m.players?.length || 0} players</span>
        <button onclick="joinMatch('${m.id}')" class="btn-join">Join</button>
      </div>
    `).join('');
  } catch (e) {
    updateStatus('Failed to load matches', 'error');
  }
}

function joinMatch(matchIdParam) {
  matchId = matchIdParam;
  matchIdDisplay.textContent = matchId.slice(0, 8);
  spawnBtn.disabled = false;
  updateStatus(`✅ Joined match: ${matchId.slice(0, 8)}`, 'success');
}

// ========================================
// GAME INITIALIZATION
// ========================================
function startGame() {
  loginScreen.classList.remove('active');
  gameScreen.classList.add('active');

  canvas = $('gameCanvas');
  ctx = canvas.getContext('2d');

  loadProjects();
  initInput();
  initGameLoop();
  connectWebSocket();
}

function connectWebSocket() {
  if (!projectId || !token) return;

  socket = io('http://localhost:3000/game', {
    auth: { projectId, accessToken: token }
  });

  socket.on('connect', () => updateStatus('🔌 WebSocket connected', 'success'));
  socket.on('connected', (data) => {
    userId = data.userId;
    updateStatus('✅ Game server authenticated', 'success');
  });

  socket.on('match.found', (data) => {
    matchId = data.matchId;
    matchIdDisplay.textContent = matchId.slice(0, 8);
    spawnBtn.disabled = false;
    updateStatus('🎉 Match found!', 'success');
  });

  socket.on('actor.spawned', (actor) => {
    gameState.actors[actor.id] = actor.state;
    updatePlayerCount();
  });

  socket.on('actor.updated', (actor) => {
    if (gameState.actors[actor.id]) {
      gameState.actors[actor.id] = { ...gameState.actors[actor.id], ...actor.state };
    }
  });

  socket.on('state.synced', (state) => {
    gameState = state;
    updatePlayerCount();
  });

  socket.on('error', (err) => updateStatus('WebSocket error: ' + err.message, 'error'));
}

// ========================================
// GAME CONTROLS (WebSocket Events)
// ========================================
function joinQueue() {
  if (!projectId || !socket) return;
  updateStatus('⏳ Joining queue...', 'info');
  socket.emit('matchmaking.join', { projectId });
}

async function spawnPlayer() {
  if (!matchId || !socket) return;

  playerActorId = `player_${userId.slice(0, 8)}_${Date.now()}`;
  const x = 100 + Math.random() * 200;
  const y = 100 + Math.random() * 200;

  socket.emit('actor.spawn', {
    id: playerActorId,
    state: {
      x, y,
      data: {
        color: `hsl(${Math.random() * 360},70%,60%)`,
        size: 20,
        name: userId.slice(0, 8)
      }
    }
  });

  spawnBtn.disabled = true;
  updateStatus('👤 Player spawned! WASD + Mouse to move', 'success');
  socket.emit('state.sync');
}

function syncState() {
  if (socket) socket.emit('state.sync');
}

function endMatch() {
  if (socket) socket.emit('match.end');
}

// ========================================
// INPUT HANDLING
// ========================================
function initInput() {
  // Keyboard
  document.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
  document.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

  // Mouse movement
  canvas.addEventListener('mousemove', (e) => {
    if (playerActorId && gameState.actors[playerActorId]) {
      const rect = canvas.getBoundingClientRect();
      const targetX = ((e.clientX - rect.left) / rect.width) * 800;
      const targetY = ((e.clientY - rect.top) / rect.height) * 600;

      socket?.emit('actor.update', {
        id: playerActorId,
        state: { x: targetX, y: targetY }
      });
    }
  });
}

function updatePlayerCount() {
  playerCount.textContent = Object.keys(gameState.actors).length;
}

// ========================================
// GAME LOOP + RENDERING
// ========================================
function initGameLoop() {
  function loop() {
    updatePlayerMovement();
    render();
    requestAnimationFrame(loop);
  }
  loop();
}

function updatePlayerMovement() {
  if (playerActorId && gameState.actors[playerActorId]) {
    const actor = gameState.actors[playerActorId];
    const speed = 4;

    if (keys['w'] || keys['arrowup']) actor.state.y = Math.max(0, actor.state.y - speed);
    if (keys['s'] || keys['arrowdown']) actor.state.y = Math.min(600, actor.state.y + speed);
    if (keys['a'] || keys['arrowleft']) actor.state.x = Math.max(0, actor.state.x - speed);
    if (keys['d'] || keys['arrowright']) actor.state.x = Math.min(800, actor.state.x + speed);

    // Throttled updates
    if (Math.random() < 0.15) {
      socket?.emit('actor.update', { id: playerActorId, state: actor.state });
    }
  }
}

function render() {
  // Clear
  ctx.fillStyle = '#16213e';
  ctx.fillRect(0, 0, 800, 600);

  // Render actors
  Object.entries(gameState.actors).forEach(([id, actor]) => {
    const { x, y, data } = actor.state;
    const size = data?.size || 20;
    const color = data?.color || '#4ecdc4';

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.arc(x + 4, y + 4, size, 0, Math.PI * 2);
    ctx.fill();

    // Player
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label
    ctx.fillStyle = 'white';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(data?.name || id.slice(0, 6), x, y - size - 10);
  });

  // Instructions
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.font = '14px monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText('WASD + Mouse | Multiplayer Demo', 780, 20);
}

// ========================================
// AUTO-START
// ========================================
document.addEventListener('DOMContentLoaded', () => {
  updateStatus('Ready. Login to start multiplayer demo!');
});
