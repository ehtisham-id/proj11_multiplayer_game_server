// ================= COOKIES =================
function setCookie(name, value, days = 7) {
  document.cookie = `${name}=${value}; max-age=${days * 86400}; path=/`;
}

function getCookie(name) {
  return document.cookie
    .split("; ")
    .find(row => row.startsWith(name + "="))
    ?.split("=")[1];
}

function deleteCookie(name) {
  document.cookie = `${name}=; max-age=0; path=/`;
}

// ================= LOGIN =================
function login() {
  const name = username.value.trim();
  if (!name) return alert("Enter username");

  setCookie("playerName", name);
  startGame(name);
}

function logout() {
  deleteCookie("playerName");
  location.reload();
}

// ================= GAME =================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const GRID = 20;
let snake, food, dir, score, running;

function startGame(name) {
  loginScreen.classList.remove("active");
  gameScreen.classList.add("active");

  playerName.textContent = name;
  init();
  loop();
}

function init() {
  snake = [{ x: 10, y: 10 }];
  food = spawnFood();
  dir = { x: 1, y: 0 };
  score = 0;
  running = true;
  scoreEl();
}

function spawnFood() {
  return {
    x: Math.floor(Math.random() * (canvas.width / GRID)),
    y: Math.floor(Math.random() * (canvas.height / GRID))
  };
}

function scoreEl() {
  document.getElementById("score").textContent = score;
}

// ================= INPUT =================
document.addEventListener("keydown", e => {
  if (e.key === "ArrowUp" && dir.y === 0) dir = { x: 0, y: -1 };
  if (e.key === "ArrowDown" && dir.y === 0) dir = { x: 0, y: 1 };
  if (e.key === "ArrowLeft" && dir.x === 0) dir = { x: -1, y: 0 };
  if (e.key === "ArrowRight" && dir.x === 0) dir = { x: 1, y: 0 };
});

// ================= LOOP =================
function loop() {
  if (!running) return;
  update();
  draw();
  setTimeout(loop, 120);
}

function update() {
  const head = {
    x: snake[0].x + dir.x,
    y: snake[0].y + dir.y
  };

  // Wall collision
  if (
    head.x < 0 || head.y < 0 ||
    head.x >= canvas.width / GRID ||
    head.y >= canvas.height / GRID
  ) return gameOver();

  // Self collision
  for (const s of snake) {
    if (s.x === head.x && s.y === head.y) {
      return gameOver();
    }
  }

  snake.unshift(head);

  // Eat food
  if (head.x === food.x && head.y === food.y) {
    score++;
    scoreEl();
    food = spawnFood();
  } else {
    snake.pop();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Food
  ctx.fillStyle = "red";
  ctx.fillRect(food.x * GRID, food.y * GRID, GRID, GRID);

  // Snake
  ctx.fillStyle = "#22c55e";
  for (const s of snake) {
    ctx.fillRect(s.x * GRID, s.y * GRID, GRID - 1, GRID - 1);
  }
}

function gameOver() {
  running = false;
  alert("Game Over! Score: " + score);
  init();
  loop();
}

// ================= AUTO LOGIN =================
document.addEventListener("DOMContentLoaded", () => {
  const name = getCookie("playerName");
  if (name) startGame(name);
});
