const STORAGE_KEY = 'dodgeBlocksLeaderboard';
const MAX_SCORE_ROWS = 5;
const WORLD = { width: 420, height: 560 };

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreValue = document.getElementById('scoreValue');
const highScoreValue = document.getElementById('highScoreValue');
const levelValue = document.getElementById('levelValue');
const hullValue = document.getElementById('hullValue');
const readyOverlay = document.getElementById('readyOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const scoreStat = document.querySelector('.stat-block--score');
const highestStat = document.querySelector('.stat-block--highest');
const levelStat = document.querySelector('.stat-block--level');
const gameShell = document.querySelector('.game-shell');
const gameTitle = document.querySelector('.game-title');
const finalScoreValue = document.getElementById('finalScoreValue');
const highScoreMessage = document.getElementById('highScoreMessage');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startLeaderboard = document.getElementById('startLeaderboard');
const startLeaderboardPanel = document.getElementById('startLeaderboardPanel');
const toggleLeaderboardButton = document.getElementById('toggleLeaderboardButton');
const leaderboardBackButton = document.getElementById('leaderboardBackButton');
const gameOverLeaderboard = document.getElementById('gameOverLeaderboard');
const pauseModal = document.getElementById('pauseModal');
const continueButton = document.getElementById('continueButton');
const pauseRestartButton = document.getElementById('pauseRestartButton');
const pauseMainMenuButton = document.getElementById('pauseMainMenuButton');
const scoreModal = document.getElementById('scoreModal');
const playerNameInput = document.getElementById('playerNameInput');
const saveScoreButton = document.getElementById('saveScoreButton');
const skipScoreButton = document.getElementById('skipScoreButton');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const mainMenuButton = document.getElementById('mainMenuButton');
const leftControl = document.getElementById('leftControl');
const rightControl = document.getElementById('rightControl');

const state = {
  mode: 'start',
  player: null,
  obstacles: [],
  stars: [],
  powerUp: null,
  missileHazards: [],
  playerBullets: [],
  enemyBullets: [],
  effects: [],
  hull: 3,
  maxHull: 3,
  weaponLevel: 1,
  shield: false,
  goldenBulletRemaining: 0,
  readyRemaining: 0,
  invulnerabilityRemaining: 0,
  respawnRemaining: 0,
  respawnFlickerRemaining: 0,
  fireTimer: 0,
  enemySpawnTimer: 0,
  score: 0,
  elapsed: 0,
  spawnTimer: 0,
  difficulty: 1,
  nextPowerUpAt: 0,
  nextMissileAt: 0,
  immunityRemaining: 0,
  explosionElapsed: 0,
  explosionPosition: { x: 0, y: 0 },
  respawnAfterExplosion: false,
  lastFrame: 0,
  lastLevel: 1,
  levelGlowTimer: null,
  gameOverOverlayTimer: null,
  isNewRecord: false,
  animationId: null,
  keys: { left: false, right: false },
  leaderboard: [],
  waitingForName: null,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function getHighScore() {
  return state.leaderboard[0] ? state.leaderboard[0].score : 0;
}

function createPlayer() {
  return {
    x: WORLD.width / 2 - 24,
    y: WORLD.height - 76,
    w: 48,
    h: 26,
    speed: 360,
    vx: 0,
    trailLean: 0,
  };
}

function createStars() {
  const farStars = Array.from({ length: 58 }, () => ({
    x: randomBetween(0, WORLD.width), y: randomBetween(0, WORLD.height),
    size: randomBetween(0.5, 1.2), speed: randomBetween(18, 34),
    alpha: randomBetween(0.25, 0.65), phase: randomBetween(0, Math.PI * 2),
  }));
  const nearStars = Array.from({ length: 22 }, () => ({
    x: randomBetween(0, WORLD.width), y: randomBetween(0, WORLD.height),
    size: randomBetween(1.2, 2), speed: randomBetween(42, 68),
    alpha: randomBetween(0.4, 0.9), phase: randomBetween(0, Math.PI * 2),
  }));
  return [...farStars, ...nearStars];
}

function sanitizeName(value) {
  const trimmed = String(value || 'Player').trim();
  return trimmed.replace(/[<>]/g, '').replace(/\s+/g, ' ').slice(0, 18) || 'Player';
}

function loadLeaderboard() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry) => entry && Number.isFinite(Number(entry.score)))
      .map((entry) => ({ name: sanitizeName(entry.name), score: Math.max(0, Math.floor(Number(entry.score))) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_SCORE_ROWS);
  } catch (error) {
    return [];
  }
}

function saveLeaderboard() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.leaderboard.slice(0, MAX_SCORE_ROWS)));
  } catch (error) {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

function renderLeaderboard(listElement, entries) {
  listElement.innerHTML = '';
  if (!entries.length) {
    const emptyItem = document.createElement('li');
    emptyItem.innerHTML = '<span class="rank">-</span><span class="name">No scores yet</span><span class="score">0</span>';
    listElement.appendChild(emptyItem);
    return;
  }
  entries.forEach((entry, index) => {
    const item = document.createElement('li');
    item.innerHTML = `<span class="rank">#${index + 1}</span><span class="name"></span><span class="score">${entry.score}</span>`;
    item.querySelector('.name').textContent = entry.name;
    listElement.appendChild(item);
  });
}

function updateLeaderboards() {
  renderLeaderboard(startLeaderboard, state.leaderboard);
  renderLeaderboard(gameOverLeaderboard, state.leaderboard);
}

function replayTitleAnimation() {
  gameTitle.classList.remove('title-replay');
  void gameTitle.offsetWidth;
  gameTitle.classList.add('title-replay');
}

function updateHud() {
  const currentScore = Math.floor(state.score);
  const allTimeHigh = getHighScore();
  state.isNewRecord = currentScore > allTimeHigh;
  scoreValue.textContent = String(currentScore);
  highScoreValue.textContent = String(state.isNewRecord ? currentScore : allTimeHigh);
  scoreStat.classList.toggle('record-glow', state.isNewRecord);
  highestStat.classList.toggle('record-glow', state.isNewRecord);
  gameShell.classList.toggle('record-glow', state.isNewRecord);

  const currentLevel = Math.max(1, Math.floor(state.difficulty));
  levelValue.textContent = String(currentLevel);
  hullValue.textContent = `${state.hull}/${state.maxHull}`;
  if (currentLevel > state.lastLevel) {
    levelStat.classList.remove('level-up');
    void levelStat.offsetWidth;
    levelStat.classList.add('level-up');
    clearTimeout(state.levelGlowTimer);
    state.levelGlowTimer = setTimeout(() => levelStat.classList.remove('level-up'), 1100);
    state.lastLevel = currentLevel;
  }
}

function closeScoreModal() {
  scoreModal.classList.add('hidden');
  playerNameInput.value = '';
  state.waitingForName = null;
}

function closePauseModal() {
  pauseModal.classList.add('hidden');
}

function clearRecordGlow() {
  state.isNewRecord = false;
  scoreStat.classList.remove('record-glow');
  highestStat.classList.remove('record-glow');
  gameShell.classList.remove('record-glow');
}

function showStartScreen() {
  startScreen.classList.remove('hidden', 'leaderboard-open');
  gameOverScreen.classList.add('hidden');
  gameOverOverlay.classList.add('hidden');
  startLeaderboardPanel.classList.add('hidden');
  toggleLeaderboardButton.setAttribute('aria-expanded', 'false');
  closePauseModal();
  closeScoreModal();
  replayTitleAnimation();
}

function hideScreens() {
  startScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  closeScoreModal();
}

function showGameOverScreen(score) {
  finalScoreValue.textContent = String(score);
  const best = getHighScore();
  highScoreMessage.textContent = score >= best ? 'NEW HIGH SCORE!' : score === 0 ? 'Try again!' : 'Great run!';
  gameOverScreen.classList.remove('hidden');
  updateLeaderboards();
}

function qualifiesForLeaderboard(score) {
  return state.leaderboard.length < MAX_SCORE_ROWS || score > state.leaderboard[MAX_SCORE_ROWS - 1].score;
}

function openScoreModal(score) {
  state.waitingForName = score;
  scoreModal.classList.remove('hidden');
  playerNameInput.focus();
  playerNameInput.select();
}

function saveEntryToLeaderboard() {
  if (state.waitingForName === null) return;
  state.leaderboard = [...state.leaderboard, { name: sanitizeName(playerNameInput.value), score: state.waitingForName }]
    .sort((a, b) => b.score - a.score).slice(0, MAX_SCORE_ROWS);
  saveLeaderboard();
  updateLeaderboards();
  closeScoreModal();
}

function randomPowerUpDelay() {
  return Math.min(60000, 15000 + Math.max(0, state.difficulty - 2) * 5000);
}

function getLevelForElapsed(elapsed) {
  let level = 1;
  let remaining = elapsed;
  let duration = 15000;
  while (remaining >= duration) {
    remaining -= duration;
    level += 1;
    duration = Math.min(60000, duration + 5000);
  }
  return level;
}

function resetGame() {
  state.player = createPlayer();
  state.obstacles = [];
  state.stars = createStars();
  state.powerUp = null;
  state.missileHazards = [];
  state.playerBullets = [];
  state.enemyBullets = [];
  state.effects = [];
  state.hull = state.maxHull;
  state.weaponLevel = 1;
  state.shield = false;
  state.goldenBulletRemaining = 0;
  state.readyRemaining = 3000;
  state.invulnerabilityRemaining = 0;
  state.respawnRemaining = 0;
  state.respawnFlickerRemaining = 0;
  state.fireTimer = 0;
  state.enemySpawnTimer = 0;
  state.score = 0;
  state.elapsed = 0;
  state.spawnTimer = 0;
  state.difficulty = 1;
  state.nextPowerUpAt = randomPowerUpDelay();
  state.nextMissileAt = 0;
  state.immunityRemaining = 0;
  state.explosionElapsed = 0;
  state.respawnAfterExplosion = false;
  clearTimeout(state.gameOverOverlayTimer);
  state.lastLevel = 1;
  state.lastFrame = 0;
  clearRecordGlow();
  readyOverlay.classList.remove('hidden');
  gameOverOverlay.classList.add('hidden');
  levelStat.classList.remove('level-up');
  updateHud();
}

function startGame() {
  if (state.animationId) cancelAnimationFrame(state.animationId);
  resetGame();
  state.mode = 'playing';
  hideScreens();
  closePauseModal();
  state.animationId = requestAnimationFrame(gameLoop);
}

function returnToMainMenu() {
  clearGameLoop();
  state.mode = 'start';
  state.keys.left = false;
  state.keys.right = false;
  clearRecordGlow();
  state.player = createPlayer();
  showStartScreen();
  drawScene();
}

function createObstacle() {
  const level = state.difficulty;
  const roll = Math.random();
  let type = 'scout';
  if (level >= 7 && roll < 0.06) type = 'heavy';
  else if (level >= 4 && level !== 4 && roll < 0.18) type = 'missile';
  else if (level >= 2 && level !== 4 && roll < (level >= 6 ? 0.4 : level >= 3 ? 0.28 : 0.14)) type = 'fighter';
  else if (level >= 4 && level === 4 && roll < 0.2) type = 'missile';
  const dimensions = { scout: [24, 28], fighter: [40, 30], missile: [18, 34], heavy: [60, 42] }[type];
  const baseSpeed = { scout: 30, fighter: 45, missile: 120, heavy: 20 }[type];
  const maxSpeed = { scout: 330, fighter: 345, missile: 420, heavy: 220 }[type];
  const width = dimensions[0];
  const height = dimensions[1];
  const introductionLevel = { scout: 1, fighter: 2, missile: 4, heavy: 7 }[type];
  const levelsAppeared = Math.max(0, level - introductionLevel);
  const hp = Math.min({ scout: 1, fighter: 4, missile: 2, heavy: 12 }[type] + levelsAppeared * { scout: 1, fighter: 1, missile: 1, heavy: 2 }[type], { scout: 5, fighter: 10, missile: 8, heavy: 24 }[type]);
  return {
    x: randomBetween(8, WORLD.width - width - 8), y: -height, w: width, h: height,
    type, hp, maxHp: hp, baseSpeed, maxSpeed, vy: Math.min(maxSpeed, baseSpeed + levelsAppeared * 30),
    fireTimer: randomBetween(1800, 3000), flash: 0,
  };
}

function spawnObstacles(dt) {
  state.enemySpawnTimer += dt;
  const interval = Math.max(700, 2200 - Math.floor(state.elapsed / 30000) * 300);
  if (state.enemySpawnTimer < interval || state.readyRemaining > 0 || state.respawnRemaining > 0) return;
  state.enemySpawnTimer = 0;
  const count = state.difficulty >= 8 && Math.random() < 0.25 ? 2 : 1;
  for (let index = 0; index < count; index += 1) {
    const obstacle = createObstacle();
    if (index > 0) {
      const previous = state.obstacles[state.obstacles.length - 1];
      obstacle.x = clamp(previous.x + (Math.random() > 0.5 ? randomBetween(40, 110) : -randomBetween(40, 110)), 8, WORLD.width - obstacle.w - 8);
    }
    state.obstacles.push(obstacle);
  }
}

function updatePlayer(dt) {
  const direction = Number(state.keys.right) - Number(state.keys.left);
  const targetVelocity = direction * state.player.speed;
  state.player.vx += (targetVelocity - state.player.vx) * Math.min(1, dt / 100);
  state.player.x = clamp(state.player.x + (state.player.vx * dt) / 1000, 0, WORLD.width - state.player.w);
  const targetLean = clamp(-state.player.vx / state.player.speed, -1, 1) * 11;
  state.player.trailLean += (targetLean - state.player.trailLean) * Math.min(1, dt / 140);
}

function updateObstacles(dt, timeScale = 1) {
  state.obstacles = state.obstacles.filter((obstacle) => {
    if (obstacle.flash > 0) obstacle.flash -= dt;
    obstacle.y += (obstacle.vy * dt * timeScale) / 1000;
    return !obstacle.dead && obstacle.y < WORLD.height + obstacle.h;
  });
}

function updateStars(dt, timeScale = 1) {
  state.stars.forEach((star) => {
    star.y += (star.speed * dt * timeScale) / 1000;
    star.phase += dt * 0.0017;
    if (star.y > WORLD.height + star.size) {
      star.y = -star.size;
      star.x = randomBetween(0, WORLD.width);
    }
  });
}

function intersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function spawnPowerUpIfReady() {
  if (state.powerUp || state.difficulty < 2 || state.elapsed < state.nextPowerUpAt) return;
  const available = ['multishot'];
  if (!state.shield) available.push('shield');
  if (state.immunityRemaining <= 0) available.push('immunity');
  if (state.goldenBulletRemaining <= 0) available.push('golden');
  if (state.weaponLevel >= 5) available.splice(available.indexOf('multishot'), 1);
  if (!available.length) {
    state.nextPowerUpAt = state.elapsed + 15000;
    return;
  }
  let candidate;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    candidate = { x: randomBetween(18, WORLD.width - 18), y: -18, radius: 10, w: 20, h: 20, vy: 120, type: available[Math.floor(Math.random() * available.length)] };
    if (!state.obstacles.some((obstacle) => intersects(candidate, obstacle))) break;
  }
  state.powerUp = candidate;
}

function updatePowerUp(dt, timeScale = 1) {
  spawnPowerUpIfReady();
  if (!state.powerUp) return;
  state.powerUp.y += (state.powerUp.vy * dt * timeScale) / 1000;
  if (state.powerUp.y > WORLD.height + state.powerUp.radius) {
    state.powerUp = null;
    state.nextPowerUpAt = state.elapsed + randomPowerUpDelay();
    return;
  }
  const box = { x: state.powerUp.x - 10, y: state.powerUp.y - 10, w: 20, h: 20 };
  if (intersects(state.player, box)) {
    state.powerUp = null;
    const roll = Math.random();
    if (roll < 0.8 && state.weaponLevel < 5) state.weaponLevel += 1;
    else if (roll < 0.9 && !state.shield) state.shield = true;
    else if (roll < 0.95) state.immunityRemaining = 10000;
    else state.goldenBulletRemaining = 7000;
    state.nextPowerUpAt = state.elapsed + randomPowerUpDelay();
  }
}

function scheduleMissile() {
  state.nextMissileAt = state.elapsed + randomBetween(10000, 30000);
}

function updateMissiles(dt, timeScale = 1) {
  if (state.difficulty >= 4 && state.elapsed >= state.nextMissileAt && state.readyRemaining <= 0 && state.respawnRemaining <= 0) {
    const missileSpeed = Math.min(420, 120 + (state.difficulty - 4) * 30);
    state.missileHazards.push({ x: randomBetween(14, WORLD.width - 32), y: -30, w: 18, h: 30, vy: missileSpeed, vx: 0, hp: Math.min(8, 2 + (state.difficulty - 4)), maxHp: Math.min(8, 2 + (state.difficulty - 4)) });
    scheduleMissile();
  }
  state.missileHazards = state.missileHazards.filter((missile) => {
    const target = state.player.x + state.player.w / 2 - (missile.x + missile.w / 2);
    missile.vx += (clamp(target * 1.05, -150, 150) - missile.vx) * Math.min(1, dt / 500);
    missile.x = clamp(missile.x + (missile.vx * dt * timeScale) / 1000, 0, WORLD.width - missile.w);
    missile.y += (missile.vy * dt * timeScale) / 1000;
    return missile.y < WORLD.height + missile.h;
  });
}

function clearGameLoop() {
  if (state.animationId) {
    cancelAnimationFrame(state.animationId);
    state.animationId = null;
  }
}

function finishGame() {
  state.mode = 'gameover';
  const finalScore = Math.floor(state.score);
  showGameOverScreen(finalScore);
  readyOverlay.classList.add('hidden');
}

function queueScoreModal() {
  const finalScore = Math.floor(state.score);
  clearTimeout(state.gameOverOverlayTimer);
  state.gameOverOverlayTimer = setTimeout(() => {
    gameOverOverlay.classList.add('hidden');
    if (qualifiesForLeaderboard(finalScore)) openScoreModal(finalScore);
  }, 2300);
}

function startExplosion(respawnAfterExplosion = false) {
  if (state.mode !== 'playing' || state.immunityRemaining > 0) return;
  state.mode = 'exploding';
  state.explosionElapsed = 0;
  state.respawnAfterExplosion = respawnAfterExplosion;
  state.keys.left = false;
  state.keys.right = false;
  if (!respawnAfterExplosion) {
    gameOverOverlay.classList.remove('hidden');
    queueScoreModal();
  }
}

function firePlayerBullets(dt) {
  if (state.readyRemaining > 0 || state.respawnRemaining > 0 || state.mode !== 'playing') return;
  state.fireTimer += dt;
  if (state.fireTimer < 200) return;
  state.fireTimer = 0;
  const spreadByLevel = {
    1: [0],
    2: [-6, 6],
    3: [-10, 0, 10],
    4: [-12, -4, 4, 12],
    5: [-14, -7, 0, 7, 14],
  };
  const spreads = spreadByLevel[state.weaponLevel] || spreadByLevel[5];
  spreads.forEach((angle) => state.playerBullets.push({ x: state.player.x + state.player.w / 2, y: state.player.y, w: 3, h: 10, angle, golden: state.goldenBulletRemaining > 0 }));
}

function updatePlayerBullets(dt) {
  state.playerBullets = state.playerBullets.filter((bullet) => {
    const radians = (bullet.angle * Math.PI) / 180;
    bullet.x += Math.sin(radians) * 260 * dt / 1000;
    bullet.y -= Math.cos(radians) * 460 * dt / 1000;
    return bullet.y + bullet.h > 0;
  });
}

function fireEnemyBullets(enemy) {
  if (enemy.type !== 'fighter' && enemy.type !== 'heavy') return;
  if (enemy.fireTimer > 0) return;
  const count = enemy.type === 'heavy' ? 2 : 1;
  for (let index = 0; index < count; index += 1) {
    state.enemyBullets.push({ x: enemy.x + enemy.w / 2 + (index ? 12 : 0), y: enemy.y + enemy.h, w: 5, h: 12, vx: index ? 18 : 0, vy: Math.min(600, enemy.vy + 400), homing: enemy.type === 'heavy' });
  }
  enemy.fireTimer = 1000;
}

function updateEnemyBullets(dt, timeScale = 1) {
  state.obstacles.forEach((enemy) => {
    enemy.fireTimer -= dt;
    fireEnemyBullets(enemy);
  });
  state.enemyBullets = state.enemyBullets.filter((bullet) => {
    if (bullet.homing) {
      bullet.vx += (clamp((state.player.x - bullet.x) * 0.55, -120, 120) - bullet.vx) * Math.min(1, dt / 600);
    }
    bullet.x += bullet.vx * dt * timeScale / 1000;
    bullet.y += bullet.vy * dt * timeScale / 1000;
    return bullet.y < WORLD.height + bullet.h;
  });
}

function addImpact(x, y, color = '#67e8f9') {
  state.effects.push({ x, y, color, age: 0, life: 260 });
}

function addScorePopup(x, y, points) {
  state.effects.push({ x, y, color: '#fde047', age: 0, life: 850, text: `+${points}` });
}

function damageEnemy(enemy, amount, bullet) {
  if (bullet.golden) enemy.hp = 0;
  else enemy.hp -= amount;
  enemy.flash = 120;
  addImpact(bullet.x, bullet.y, bullet.golden ? '#fde047' : '#67e8f9');
  if (enemy.hp <= 0) {
    const points = { scout: 60, fighter: 75, missile: 100, heavy: 150 }[enemy.type];
    state.score += points;
    addScorePopup(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, points);
    enemy.dead = true;
    addImpact(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, '#ff9f43');
  }
}

function updateEffects(dt) {
  state.effects = state.effects.filter((effect) => {
    effect.age += dt;
    return effect.age < effect.life;
  });
}

function resolveCombatCollisions() {
  state.playerBullets = state.playerBullets.filter((bullet) => {
    const enemy = state.obstacles.find((candidate) => !candidate.dead && intersects(bullet, candidate));
    if (enemy) {
      damageEnemy(enemy, 1, bullet);
      return false;
    }
    const missile = state.missileHazards.find((candidate) => !candidate.dead && intersects(bullet, candidate));
    if (missile) {
      missile.dead = true;
      state.score += 100;
      addScorePopup(missile.x + missile.w / 2, missile.y + missile.h / 2, 100);
      addImpact(missile.x, missile.y, bullet.golden ? '#fde047' : '#67e8f9');
      return false;
    }
    const projectile = state.enemyBullets.find((candidate) => !candidate.dead && intersects(bullet, candidate));
    if (projectile) {
      projectile.dead = true;
      addImpact(projectile.x, projectile.y, '#f97316');
      return false;
    }
    return true;
  });
  state.enemyBullets = state.enemyBullets.filter((bullet) => !bullet.dead);
  state.missileHazards = state.missileHazards.filter((missile) => !missile.dead);
  state.obstacles = state.obstacles.filter((enemy) => !enemy.dead);
  if (state.immunityRemaining > 0) return;
  const bulletHit = state.enemyBullets.find((bullet) => intersects(state.player, bullet));
  const physicalHit = state.obstacles.find((enemy) => intersects(state.player, enemy));
  if (bulletHit) {
    bulletHit.dead = true;
    if (state.shield) state.shield = false;
    else takeDamage();
  } else if (physicalHit) {
    takeDamage();
  }
}

function takeDamage() {
  if (state.mode !== 'playing' || state.invulnerabilityRemaining > 0) return;
  state.hull -= 1;
  state.explosionPosition = {
    x: state.player.x + state.player.w / 2,
    y: state.player.y + state.player.h / 2,
  };
  state.invulnerabilityRemaining = 800;
  state.playerBullets = [];
  state.enemyBullets = [];
  state.obstacles = [];
  state.missileHazards = [];
  if (state.hull <= 0) startExplosion(false);
  else {
    state.respawnRemaining = 0;
    state.respawnFlickerRemaining = 3000;
    state.shield = true;
    state.player.x = WORLD.width / 2 - state.player.w / 2;
    startExplosion(true);
  }
}

function checkCollisions() {
  if (state.immunityRemaining > 0) return;
  const missile = state.missileHazards.find((candidate) => intersects(state.player, candidate));
  if (missile) {
    state.missileHazards = state.missileHazards.filter((candidate) => candidate !== missile);
    takeDamage();
  }
}

function updateGame(dt) {
  state.elapsed += dt;
  state.score += dt * 0.012;
  state.difficulty = getLevelForElapsed(state.elapsed);
  if (state.readyRemaining > 0) {
    state.readyRemaining = Math.max(0, state.readyRemaining - dt);
    readyOverlay.classList.toggle('hidden', state.readyRemaining <= 0);
  }
  if (state.respawnRemaining > 0) {
    state.respawnRemaining = Math.max(0, state.respawnRemaining - dt);
    readyOverlay.classList.toggle('hidden', state.respawnRemaining <= 0);
    if (state.respawnRemaining <= 0) state.invulnerabilityRemaining = 0;
  }
  state.respawnFlickerRemaining = Math.max(0, state.respawnFlickerRemaining - dt);
  updatePlayer(dt);
  spawnObstacles(dt);
  updateObstacles(dt);
  updateStars(dt);
  updatePowerUp(dt);
  updateMissiles(dt);
  firePlayerBullets(dt);
  updatePlayerBullets(dt);
  updateEnemyBullets(dt);
  updateEffects(dt);
  state.immunityRemaining = Math.max(0, state.immunityRemaining - dt);
  state.goldenBulletRemaining = Math.max(0, state.goldenBulletRemaining - dt);
  state.invulnerabilityRemaining = Math.max(0, state.invulnerabilityRemaining - dt);
  resolveCombatCollisions();
  if (state.respawnRemaining <= 0) checkCollisions();
  updateHud();
}

function updateExplosion(dt) {
  state.explosionElapsed += dt;
  const timeScale = Math.max(0, 1 - state.explosionElapsed / 2000);
  updateObstacles(dt, timeScale);
  updateStars(dt, timeScale);
  updatePowerUp(dt, timeScale);
  updateMissiles(dt, timeScale);
  updateEnemyBullets(dt, timeScale);
  updateEffects(dt);
  if (state.explosionElapsed >= 2500) {
    if (state.respawnAfterExplosion) {
      state.mode = 'playing';
      state.respawnAfterExplosion = false;
      state.readyRemaining = 3000;
      state.respawnFlickerRemaining = 3000;
      state.player = createPlayer();
      state.player.x = WORLD.width / 2 - state.player.w / 2;
      readyOverlay.classList.remove('hidden');
      state.lastFrame = 0;
    } else {
      clearGameLoop();
      finishGame();
    }
  }
}

function gameLoop(timestamp) {
  if (state.mode !== 'playing' && state.mode !== 'exploding') return;
  if (!state.lastFrame) state.lastFrame = timestamp;
  const dt = Math.min(32, timestamp - state.lastFrame);
  state.lastFrame = timestamp;
  if (state.mode === 'playing') updateGame(dt); else updateExplosion(dt);
  drawScene();
  if (state.mode === 'playing' || state.mode === 'exploding') state.animationId = requestAnimationFrame(gameLoop);
}

function drawRoundedRect(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + width - r, y); ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r); ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height); ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

function drawStars() {
  state.stars.forEach((star) => {
    const twinkle = 0.82 + Math.sin(star.phase) * 0.18;
    ctx.fillStyle = `rgba(190, 220, 255, ${star.alpha * twinkle})`;
    ctx.fillRect(star.x, star.y, star.size, star.size);
  });
}

function drawPlayer() {
  if (state.mode === 'exploding') {
    drawExplosion();
    return;
  }
  const immunityFlicker = state.immunityRemaining > 0 && state.immunityRemaining <= 3000 && Math.floor((10000 - state.immunityRemaining) / 250) % 2 === 0;
  const respawnFlicker = state.respawnFlickerRemaining > 0 && Math.floor((3000 - state.respawnFlickerRemaining) / 250) % 2 === 0;
  const flicker = immunityFlicker || respawnFlicker;
  if (flicker) return;
  const player = state.player;
  const immune = state.immunityRemaining > 0;
  const glow = immune ? '#22d3ee' : '#ff4d2e';
  ctx.save();
  ctx.shadowColor = glow; ctx.shadowBlur = immune ? 30 : 16;
  ctx.fillStyle = immune ? '#67e8f9' : '#ff5a36';
  ctx.beginPath();
  ctx.moveTo(player.x + player.w * 0.35, player.y + player.h - 1);
  ctx.lineTo(player.x + player.w * 0.65, player.y + player.h - 1);
  ctx.lineTo(player.x + player.w / 2 + player.trailLean, player.y + player.h + 22 + Math.random() * 7);
  ctx.closePath(); ctx.fill();
  ctx.shadowColor = glow; ctx.shadowBlur = immune ? 28 : 12;
  ctx.fillStyle = immune ? '#cbd5e1' : '#9ca3af';
  ctx.beginPath();
  ctx.moveTo(player.x + player.w / 2, player.y);
  ctx.lineTo(player.x + player.w * 0.86, player.y + player.h * 0.72);
  ctx.lineTo(player.x + player.w * 0.66, player.y + player.h);
  ctx.lineTo(player.x + player.w * 0.34, player.y + player.h);
  ctx.lineTo(player.x + player.w * 0.14, player.y + player.h * 0.72);
  ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0; ctx.lineWidth = immune ? 3 : 1.5; ctx.strokeStyle = immune ? '#cffafe' : '#e5e7eb'; ctx.stroke();
  ctx.fillStyle = '#374151'; ctx.fillRect(player.x + player.w * 0.42, player.y + player.h * 0.25, player.w * 0.16, player.h * 0.43);
  ctx.fillStyle = '#d1d5db'; ctx.fillRect(player.x + player.w * 0.22, player.y + player.h * 0.63, player.w * 0.56, 2);
  ctx.restore();
}

function drawObstacles() {
  ctx.save();
  ctx.globalAlpha = state.immunityRemaining > 0 ? 0.5 : 1;
  state.obstacles.forEach((obstacle) => {
    const colors = { scout: '#a78bfa', fighter: '#fb923c', missile: '#ef4444', heavy: '#ef4444' };
    const accent = colors[obstacle.type];
    ctx.shadowColor = accent;
    ctx.shadowBlur = obstacle.type === 'heavy' ? 12 : 6;
    ctx.fillStyle = '#4b5563';
    drawRoundedRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h, obstacle.type === 'heavy' ? 8 : 4);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = obstacle.flash > 0 ? 3 : 1.5;
    ctx.strokeStyle = obstacle.flash > 0 ? '#ffffff' : '#1f2937';
    ctx.stroke();
    ctx.fillStyle = accent;
    if (obstacle.type === 'scout') {
      ctx.fillRect(obstacle.x - 4, obstacle.y + obstacle.h * 0.42, 8, 4);
      ctx.fillRect(obstacle.x + obstacle.w - 4, obstacle.y + obstacle.h * 0.42, 8, 4);
      ctx.fillRect(obstacle.x + obstacle.w * 0.35, obstacle.y + obstacle.h * 0.72, obstacle.w * 0.3, 3);
    } else if (obstacle.type === 'fighter') {
      ctx.fillRect(obstacle.x - 8, obstacle.y + obstacle.h * 0.58, 14, 4);
      ctx.fillRect(obstacle.x + obstacle.w - 6, obstacle.y + obstacle.h * 0.58, 14, 4);
      ctx.fillRect(obstacle.x + obstacle.w * 0.25, obstacle.y + obstacle.h * 0.25, obstacle.w * 0.5, 3);
    } else if (obstacle.type === 'missile') {
      ctx.fillRect(obstacle.x + obstacle.w * 0.35, obstacle.y + 4, obstacle.w * 0.3, 4);
      ctx.fillRect(obstacle.x + obstacle.w * 0.35, obstacle.y + obstacle.h - 7, obstacle.w * 0.3, 4);
    } else {
      ctx.fillRect(obstacle.x - 8, obstacle.y + 8, 18, 5);
      ctx.fillRect(obstacle.x + obstacle.w - 10, obstacle.y + 8, 18, 5);
      ctx.fillRect(obstacle.x + obstacle.w * 0.35, obstacle.y + obstacle.h * 0.58, obstacle.w * 0.3, 5);
    }
  });
  ctx.restore();
}

function drawPowerUp() {
  if (!state.powerUp) return;
  ctx.save(); ctx.translate(state.powerUp.x, state.powerUp.y); ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 18;
  ctx.fillStyle = '#67e8f9'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0; ctx.strokeStyle = state.powerUp.type === 'shield' ? '#a3e635' : state.powerUp.type === 'golden' ? '#fef08a' : '#0e7490'; ctx.lineWidth = 2; ctx.beginPath();
  if (state.powerUp.type === 'shield') { ctx.moveTo(-6, -5); ctx.lineTo(6, -5); ctx.lineTo(5, 3); ctx.quadraticCurveTo(0, 9, -5, 3); ctx.closePath(); }
  else if (state.powerUp.type === 'golden') { ctx.moveTo(1, -7); ctx.lineTo(-4, 1); ctx.lineTo(0, 1); ctx.lineTo(-2, 7); ctx.lineTo(5, -2); ctx.lineTo(1, -2); ctx.closePath(); }
  else { ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.moveTo(0, -6); ctx.lineTo(0, 6); }
  ctx.stroke(); ctx.restore();
}

function drawMissiles() {
  state.missileHazards.forEach((missile) => {
    ctx.save(); ctx.translate(missile.x + missile.w / 2, missile.y + missile.h / 2); ctx.shadowColor = '#fb451f'; ctx.shadowBlur = 8;
    ctx.fillStyle = '#3f2028'; drawRoundedRect(-9, -15, 18, 30, 5); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#ef4444'; ctx.fillRect(-3, -7, 6, 4); ctx.fillStyle = '#fb923c'; ctx.fillRect(-3, 8, 6, 6); ctx.restore();
  });
}

function drawProjectiles() {
  state.playerBullets.forEach((bullet) => { ctx.save(); ctx.shadowColor = bullet.golden ? '#fde047' : '#67e8f9'; ctx.shadowBlur = 10; ctx.fillStyle = bullet.golden ? '#fef08a' : '#cffafe'; ctx.fillRect(bullet.x - 1, bullet.y, 3, 10); ctx.restore(); });
  state.enemyBullets.forEach((bullet) => { ctx.save(); ctx.shadowColor = '#fb451f'; ctx.shadowBlur = 8; ctx.fillStyle = '#fb923c'; ctx.fillRect(bullet.x, bullet.y, bullet.w, bullet.h); ctx.restore(); });
}

function drawShield() {
  if (!state.shield || !state.player) return;
  ctx.save(); ctx.strokeStyle = 'rgba(190, 242, 100, 0.92)'; ctx.shadowColor = '#a3e635'; ctx.shadowBlur = 16; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(state.player.x + state.player.w / 2, state.player.y + state.player.h / 2, 29, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
}

function drawEffects() {
  state.effects.forEach((effect) => {
    const progress = effect.age / effect.life;
    ctx.save();
    ctx.globalAlpha = 1 - progress;
    ctx.fillStyle = effect.color;
    ctx.shadowColor = effect.color;
    ctx.shadowBlur = effect.text ? 10 : 8;
    if (effect.text) {
      ctx.font = '700 14px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(effect.text, effect.x, effect.y - progress * 24);
    } else {
      ctx.strokeStyle = effect.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, 3 + progress * 9, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  });
}

function drawExplosion() {
  const progress = Math.min(1, state.explosionElapsed / 2500);
  const radius = 10 + progress * 34;
  ctx.save(); ctx.translate(state.explosionPosition.x, state.explosionPosition.y); ctx.globalAlpha = 1 - progress * 0.7;
  ctx.shadowColor = '#ff6b35'; ctx.shadowBlur = 24; ctx.fillStyle = '#ff9f43'; ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; ctx.strokeStyle = '#ffe0a3'; ctx.lineWidth = 3;
  for (let index = 0; index < 8; index += 1) { const angle = (Math.PI * 2 * index) / 8; ctx.beginPath(); ctx.moveTo(Math.cos(angle) * radius * 0.7, Math.sin(angle) * radius * 0.7); ctx.lineTo(Math.cos(angle) * radius * 1.5, Math.sin(angle) * radius * 1.5); ctx.stroke(); }
  ctx.restore();
}

function drawScene() {
  ctx.fillStyle = '#02040a'; ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  drawStars(); drawObstacles(); drawMissiles(); drawProjectiles(); drawPowerUp(); drawEffects();
  if (state.player) drawPlayer();
  drawShield();
}

function setKeyState(keyName, isPressed) {
  state.keys[keyName] = isPressed;
}

function openPauseModal() {
  if (state.mode !== 'playing') return;
  state.mode = 'paused'; clearGameLoop(); pauseModal.classList.remove('hidden');
}

function resumeGame() {
  if (state.mode !== 'paused') return;
  state.mode = 'playing'; closePauseModal(); state.lastFrame = 0; state.animationId = requestAnimationFrame(gameLoop);
}

function bindInput() {
  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    const typing = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if (typing) return;
    if (event.code === 'Space' && state.mode === 'playing') { event.preventDefault(); openPauseModal(); return; }
    if (key === 'arrowleft' || key === 'arrowright') { event.preventDefault(); setKeyState(key === 'arrowleft' ? 'left' : 'right', true); }
  });
  window.addEventListener('keyup', (event) => {
    if (event.key === 'ArrowLeft') setKeyState('left', false);
    if (event.key === 'ArrowRight') setKeyState('right', false);
  });
  const setControlState = (button, pressed) => setKeyState(button === leftControl ? 'left' : 'right', pressed);
  [leftControl, rightControl].forEach((button) => {
    button.addEventListener('pointerdown', (event) => { event.preventDefault(); setControlState(button, true); });
    button.addEventListener('pointerup', (event) => { event.preventDefault(); setControlState(button, false); });
    button.addEventListener('pointerleave', () => setControlState(button, false));
    button.addEventListener('pointercancel', () => setControlState(button, false));
  });
  window.addEventListener('blur', () => { setKeyState('left', false); setKeyState('right', false); });
}

function init() {
  state.leaderboard = loadLeaderboard();
  state.stars = createStars();
  updateLeaderboards(); updateHud(); state.player = createPlayer(); showStartScreen(); bindInput(); drawScene();
  startButton.addEventListener('click', startGame);
  restartButton.addEventListener('click', startGame);
  mainMenuButton.addEventListener('click', returnToMainMenu);
  continueButton.addEventListener('click', resumeGame);
  pauseRestartButton.addEventListener('click', startGame);
  pauseMainMenuButton.addEventListener('click', returnToMainMenu);
  toggleLeaderboardButton.addEventListener('click', () => { startScreen.classList.add('leaderboard-open'); startLeaderboardPanel.classList.remove('hidden'); toggleLeaderboardButton.setAttribute('aria-expanded', 'true'); });
  leaderboardBackButton.addEventListener('click', showStartScreen);
  saveScoreButton.addEventListener('click', saveEntryToLeaderboard);
  skipScoreButton.addEventListener('click', closeScoreModal);
  playerNameInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); saveEntryToLeaderboard(); } });
}

init();
