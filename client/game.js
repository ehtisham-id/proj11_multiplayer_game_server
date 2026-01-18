// Global state
let token = null;
let userId = null;
let projectId = null;
let socket = null;
let matchId = null;
let gameState = { actors: {} };
let canvas, ctx, playerActorId = null;

// DOM elements
const $ = (id) => document.getElementById(id);
const emailInput = $('email');
const passwordInput = $('password');
const loginScreen = $('loginScreen');
const gameScreen = $('gameScreen');
const status = $('status');
const joinQueueBtn = $('joinQueueBtn');
const spawnBtn = $('spawnBtn');
const projectList = $('projectList');
const createProjectBtn = $('createProject');

let projects = [];

// Update status
function updateStatus(msg) {
  status.textContent = msg;
  console.log(msg);
}

// API calls
async function apiCall(endpoint, options = {}) {
  const res = await fetch(`http://localhost:3000${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    }
  });
  
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Auth
async function register() {
  try {
    const { accessToken, refreshToken, user } = await apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: emailInput.value,
        password: passwordInput.value
      })
    });
    token = accessToken;
    userId = user.id;
    startGame();
  } catch (e) {
    updateStatus('Register failed: ' + e.message);
  }
}

async function login() {
  try {
    const { accessToken, refreshToken, user } = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: emailInput.value,
        password: passwordInput.value
      })
    });
    token = accessToken;
    userId = user.id;
    startGame();
  } catch (e) {
    updateStatus('Login failed: ' + e.message);
  }
}

// Game initialization
function startGame() {
  loginScreen.style.display = 'none';
  gameScreen.style.display = 'flex';
  canvas = $('gameCanvas');
  ctx = canvas.getContext('2d');
  
  loadProjects();
  initGameLoop();
  connectWebSocket();
}

async function loadProjects() {
  try {
    projects = await apiCall('/projects');
    projectList.innerHTML = projects.map(p => 
      `<button onclick="selectProject('${p.id}')" ${p.id === projectId ? 'disabled' : ''}>
        ${p.name} (${p.maxPlayersPerMatch}p)
      </button>`
    ).join('');
  } catch (e) {
    updateStatus('Failed to load projects');
  }
}

function selectProject(id) {
  projectId = id;
  updateStatus(`Selected project: ${projects.find(p => p.id === id)?.name}`);
  loadProjects(); // Refresh to show selected
  joinQueueBtn.disabled = false;
}

async function createProject() {
  try {
    const project = await apiCall('/projects', {
      method: 'POST',
      body: JSON.stringify({ name: `Game ${Date.now()}` })
    });
    projectId = project.id;
    projects.push(project);
    loadProjects();
    updateStatus('Project created!');
  } catch (e) {
    updateStatus('Create failed: ' + e.message);
  }
}

function connectWebSocket() {
  socket = io('http://localhost:3000/game', {
    auth: { projectId, accessToken: token }
  });

  socket.on('connect', () => {
    updateStatus('WebSocket connected!');
  });

  socket.on('connected', (data) => {
    userId = data.userId;
    updateStatus('Authenticated!');
  });

  socket.on('match.found', (data) => {
    matchId = data.matchId;
    updateStatus('🎉 Match found! ID: ' + matchId);
    joinQueueBtn.disabled = true;
    spawnBtn.disabled = false;
    socket.emit('match.found', { matchId }); // Acknowledge
  });

  socket.on('actor.spawned', (actor) => {
    gameState.actors[actor.id] = actor.state;
    updateStatus(`Actor ${actor.id} spawned`);
  });

  socket.on('actor.updated', (actor) => {
    if (gameState.actors[actor.id]) {
      gameState.actors[actor.id] = { ...gameState.actors[actor.id], ...actor.state };
    }
  });

  socket.on('state.synced', (state) => {
    gameState = state;
    updateStatus('State synced');
  });

  socket.on('error', (err) => {
    updateStatus('Error: ' + err.message);
  });
}

async function joinQueue() {
  if (!projectId || !socket) return;
  
  updateStatus('🕐 Joining queue...');
  socket.emit('matchmaking.join', { projectId });
}

async function spawnPlayer() {
  if (!matchId) return;
  
  playerActorId = `player_${userId.slice(0,8)}`;
  const x = 100 + Math.random() * 200;
  const y = 100 + Math.random() * 200;
  
  socket.emit('actor.spawn', {
    id: playerActorId,
    state: { x, y, data: { color: `hsl(${Math.random()*360},70%,60%)`, size: 20 } }
  });
  
  spawnBtn.disabled = true;
  updateStatus('Player spawned! Use WASD or mouse to move');
  
  // Request full state
  socket.emit('state.sync');
}

// Input handling
const keys = {};
document.addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
});
document.addEventListener('keyup', (e) => {
  keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('mousemove', (e) => {
  if (playerActorId && gameState.actors[playerActorId]) {
    const rect = canvas.getBoundingClientRect();
    const targetX = (e.clientX - rect.left) / rect.width * 800;
    const targetY = (e.clientY - rect.top) / rect.height * 600;
    
    socket.emit('actor.update', {
      id: playerActorId,
      state: { x: targetX, y: targetY }
    });
  }
});

// Game loop
function initGameLoop() {
  function loop() {
    // Update player
    if (playerActorId && gameState.actors[playerActorId]) {
      const actor = gameState.actors[playerActorId];
      const speed = 3;
      
      if (keys['w'] || keys['arrowup']) actor.state.y = Math.max(0, actor.state.y - speed);
      if (keys['s'] || keys['arrowdown']) actor.state.y = Math.min(600, actor.state.y + speed);
      if (keys['a'] || keys['arrowleft']) actor.state.x = Math.max(0, actor.state.x - speed);
      if (keys['d'] || keys['arrowright']) actor.state.x = Math.min(800, actor.state.x + speed);
      
      // Send updates (throttled)
      if (Math.random() < 0.1) { // 10% chance per frame
        socket.emit('actor.update', {
          id: playerActorId,
          state: actor.state
        });
      }
    }
    
    // Render
    render();
    requestAnimationFrame(loop);
  }
  loop();
}

function render() {
  ctx.fillStyle = '#16213e';
  ctx.fillRect(0, 0, 800, 600);

  // Render all actors
  Object.entries(gameState.actors).forEach(([id, actor]) => {
    const { x, y, data } = actor.state;
    
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(x + 3, y + 3, data.size || 20, 0, Math.PI * 2);
    ctx.fill();
    
    // Actor
    ctx.fillStyle = data.color || '#4ecdc4';
    ctx.beginPath();
    ctx.arc(x, y, data.size || 20, 0, Math.PI * 2);
    ctx.fill();
    
    // Label
    ctx.fillStyle = 'white';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(id.slice(0,6), x, y + 35);
  });

  // Instructions
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '14px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('WASD or Mouse • Real-time multiplayer demo', 790, 30);
}
