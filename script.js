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
const pauseButton = document.getElementById('pauseButton');
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
const powerUpBanner = document.getElementById('powerUpBanner');

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
  shield: 0,
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
  powerUpSpawnCount: 0,
  nextMissileAt: 0,
  immunityRemaining: 0,
  explosionElapsed: 0,
  explosionPosition: { x: 0, y: 0 },
  respawnAfterExplosion: false,
  explosionCleanupDone: false,
  lastFrame: 0,
  lastLevel: 1,
  levelGlowTimer: null,
  gameOverOverlayTimer: null,
  isNewRecord: false,
  animationId: null,
  ambientAnimationId: null,
  lastAmbientFrame: 0,
  keys: { left: false, right: false },
  leaderboard: [],
  waitingForName: null,
  powerUpBannerTimer: null,
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
    twinkleSpeed: randomBetween(0.8, 2.1),
  }));
  const nearStars = Array.from({ length: 22 }, () => ({
    x: randomBetween(0, WORLD.width), y: randomBetween(0, WORLD.height),
    size: randomBetween(1.2, 2), speed: randomBetween(42, 68),
    alpha: randomBetween(0.4, 0.9), phase: randomBetween(0, Math.PI * 2),
    twinkleSpeed: randomBetween(1.4, 3.4),
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

function updatePauseButton() {
  const shouldShow = state.mode === 'playing' || state.mode === 'exploding';
  pauseButton.classList.toggle('hidden', !shouldShow);
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

function clearGameplayState() {
  state.player = createPlayer();
  state.stars = createStars();
  state.obstacles = [];
  state.powerUp = null;
  state.missileHazards = [];
  state.playerBullets = [];
  state.enemyBullets = [];
  state.effects = [];
  state.hull = state.maxHull;
  state.weaponLevel = 1;
  state.shield = 0;
  state.goldenBulletRemaining = 0;
  state.readyRemaining = 0;
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
  state.explosionPosition = { x: 0, y: 0 };
  state.respawnAfterExplosion = false;
  state.explosionCleanupDone = false;
  state.lastFrame = 0;
  state.lastLevel = 1;
  clearTimeout(state.gameOverOverlayTimer);
  readyOverlay.classList.add('hidden');
  gameOverOverlay.classList.add('hidden');
  pauseModal.classList.add('hidden');
  playerNameInput.value = '';
  state.waitingForName = null;
}

function showStartScreen() {
  state.mode = 'start';
  clearGameplayState();
  startScreen.classList.remove('hidden', 'leaderboard-open');
  gameOverScreen.classList.add('hidden');
  startLeaderboardPanel.classList.add('hidden');
  toggleLeaderboardButton.setAttribute('aria-expanded', 'false');
  closePauseModal();
  closeScoreModal();
  replayTitleAnimation();
  updatePauseButton();
  startAmbientLoop();
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
  state.shield = 0;
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
  state.powerUpSpawnCount = 0;
  state.nextPowerUpAt = randomPowerUpDelay();
  state.nextMissileAt = 0;
  state.immunityRemaining = 0;
  state.explosionElapsed = 0;
  state.respawnAfterExplosion = false;
  state.explosionCleanupDone = false;
  clearTimeout(state.gameOverOverlayTimer);
  state.lastLevel = 1;
  state.lastFrame = 0;
  clearRecordGlow();
  readyOverlay.classList.remove('hidden');
  gameOverOverlay.classList.add('hidden');
  levelStat.classList.remove('level-up');
  updateHud();
}

function clearAmbientLoop() {
  if (state.ambientAnimationId) {
    cancelAnimationFrame(state.ambientAnimationId);
    state.ambientAnimationId = null;
  }
  state.lastAmbientFrame = 0;
}

function animateAmbientBackground(timestamp) {
  if (state.mode !== 'start') return;
  if (!state.lastAmbientFrame) state.lastAmbientFrame = timestamp;
  const dt = Math.min(32, timestamp - state.lastAmbientFrame);
  state.lastAmbientFrame = timestamp;
  updateStars(dt);
  drawScene();
  state.ambientAnimationId = requestAnimationFrame(animateAmbientBackground);
}

function startAmbientLoop() {
  clearAmbientLoop();
  state.ambientAnimationId = requestAnimationFrame(animateAmbientBackground);
}

function startGame() {
  if (state.animationId) cancelAnimationFrame(state.animationId);
  clearAmbientLoop();
  resetGame();
  state.mode = 'playing';
  hideScreens();
  closePauseModal();
  updatePauseButton();
  state.animationId = requestAnimationFrame(gameLoop);
}

function returnToMainMenu() {
  clearGameLoop();
  clearAmbientLoop();
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
  else if (level >= 2 && roll < (level >= 6 ? 0.4 : level >= 3 ? 0.28 : 0.14)) type = 'fighter';
  const dimensions = { scout: [24, 28], fighter: [40, 30], heavy: [60, 42] }[type];
  const baseSpeed = { scout: 30, fighter: 45, heavy: 20 }[type];
  const maxSpeed = { scout: 330, fighter: 345, heavy: 220 }[type];
  const width = dimensions[0];
  const height = dimensions[1];
  const introductionLevel = { scout: 1, fighter: 2, heavy: 7 }[type];
  const levelsAppeared = Math.max(0, level - introductionLevel);
  const hp = Math.min({ scout: 1, fighter: 4, heavy: 12 }[type] + levelsAppeared * { scout: 1, fighter: 1, heavy: 2 }[type], { scout: 5, fighter: 10, heavy: 24 }[type]);
  return {
    x: randomBetween(8, WORLD.width - width - 8), y: -height, w: width, h: height,
    type, hp, maxHp: hp, baseSpeed, maxSpeed, vy: Math.min(maxSpeed, baseSpeed + levelsAppeared * 30),
    fireTimer: 500, flash: 0,
  };
}

function spawnObstacles(dt) {
  state.enemySpawnTimer += dt;
  const progressReduction = Math.floor(state.elapsed / 30000) * 100 + Math.floor(state.elapsed / 45000) * 100;
  const interval = Math.max(400, 2200 - progressReduction);
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
    star.phase += dt * (0.0017 + star.twinkleSpeed * 0.0011);
    if (star.y > WORLD.height + star.size) {
      star.y = -star.size;
      star.x = randomBetween(0, WORLD.width);
    }
  });
}

function intersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function randomPowerUpDelay() {
  return Math.min(60000, 5000 + state.powerUpSpawnCount * 2000);
}

function spawnPowerUpIfReady() {
  if (state.powerUp || state.difficulty < 2 || state.elapsed < state.nextPowerUpAt) return;

  const baseWeights = { multishot: 70, shield: 20, immunity: 5, golden: 5 };
  if (state.weaponLevel >= 5) delete baseWeights.multishot;
  if (state.shield >= 3) delete baseWeights.shield;
  if (state.immunityRemaining > 0) delete baseWeights.immunity;
  if (state.goldenBulletRemaining > 0) delete baseWeights.golden;

  const availableTypes = Object.entries(baseWeights);
  if (!availableTypes.length) {
    state.nextPowerUpAt = state.elapsed + randomPowerUpDelay();
    return;
  }

  const totalWeight = availableTypes.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * totalWeight;
  let chosenType = availableTypes[0][0];

  for (const [type, weight] of availableTypes) {
    if (roll <= weight) {
      chosenType = type;
      break;
    }
    roll -= weight;
  }

  let candidate;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    candidate = { x: randomBetween(18, WORLD.width - 18), y: -18, radius: 12, w: 24, h: 24, vy: 120, type: chosenType };
    if (!state.obstacles.some((obstacle) => intersects(candidate, obstacle))) break;
  }
  state.powerUp = candidate;
  state.powerUpSpawnCount += 1;
  state.nextPowerUpAt = state.elapsed + randomPowerUpDelay();
}

function showPowerUpBanner(type) {
  const messages = {
    green: 'SHIELD!',
    purple: 'MULTI-SHOT!',
    cyan: 'IMMUNITY!',
    gold: 'MEGA BULLET!',
  };
  const colors = {
    green: '#86efac',
    purple: '#d8b4fe',
    cyan: '#67e8f9',
    gold: '#facc15',
  };
  const glow = {
    green: '#22c55e',
    purple: '#a855f7',
    cyan: '#22d3ee',
    gold: '#f59e0b',
  };

  powerUpBanner.textContent = messages[type] || 'POWER UP!';
  powerUpBanner.style.setProperty('--banner-color', colors[type] || '#cffafe');
  powerUpBanner.style.setProperty('--banner-glow', glow[type] || '#22d3ee');
  powerUpBanner.classList.remove('hidden');
  powerUpBanner.style.animation = 'none';
  void powerUpBanner.offsetWidth;
  powerUpBanner.style.animation = 'powerupBannerIn 0.2s ease-out forwards, powerupBannerOut 0.5s ease-in 0.2s forwards';

  clearTimeout(state.powerUpBannerTimer);
  state.powerUpBannerTimer = setTimeout(() => {
    powerUpBanner.classList.add('hidden');
    powerUpBanner.style.animation = 'none';
  }, 700);
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
  const box = { x: state.powerUp.x - state.powerUp.radius, y: state.powerUp.y - state.powerUp.radius, w: state.powerUp.radius * 2, h: state.powerUp.radius * 2 };
  if (intersects(state.player, box)) {
    const pickupType = state.powerUp.type;
    state.powerUp = null;

    if (pickupType === 'multishot') {
      if (state.weaponLevel < 5) state.weaponLevel += 1;
      showPowerUpBanner('purple');
    } else if (pickupType === 'shield') {
      state.shield = Math.min(3, (state.shield || 0) + 1);
      showPowerUpBanner('green');
    } else if (pickupType === 'immunity') {
      state.immunityRemaining = 10000;
      showPowerUpBanner('cyan');
    } else if (pickupType === 'golden') {
      state.goldenBulletRemaining = 7000;
      showPowerUpBanner('gold');
    }

    state.nextPowerUpAt = state.elapsed + randomPowerUpDelay();
  }
}

function scheduleMissile() {
  state.nextMissileAt = state.elapsed + randomBetween(10000, 30000);
}

function updateMissiles(dt, timeScale = 1) {
  if (state.difficulty >= 4 && state.elapsed >= state.nextMissileAt && state.readyRemaining <= 0 && state.respawnRemaining <= 0) {
    const missileSpeed = Math.min(420, 120 + (state.difficulty - 4) * 30);
    const missileHp = Math.min(12, 3 + Math.max(0, state.difficulty - 4) * 2);
    state.missileHazards.push({ x: randomBetween(14, WORLD.width - 32), y: -30, w: 18, h: 30, vy: missileSpeed, vx: 0, hp: missileHp, maxHp: missileHp, type: 'tracking' });
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
  clearAmbientLoop();
  const finalScore = Math.floor(state.score);
  showGameOverScreen(finalScore);
  readyOverlay.classList.add('hidden');
  updatePauseButton();
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
  state.explosionCleanupDone = false;
  state.keys.left = false;
  state.keys.right = false;
  if (!respawnAfterExplosion) {
    gameOverOverlay.classList.remove('hidden');
    queueScoreModal();
  }
}

function damageTrackingMissile(missile, bullet) {
  missile.hp -= bullet.golden ? 2 : 1;
  addImpact(missile.x + missile.w / 2, missile.y + missile.h / 2, bullet.golden ? '#fde047' : '#fbbf24');
  if (missile.hp <= 0) {
    state.score += 70;
    addScorePopup(missile.x + missile.w / 2, missile.y + missile.h / 2, 70);
    state.effects.push({ x: missile.x + missile.w / 2, y: missile.y + missile.h / 2, color: '#fb923c', age: 0, life: 420, explosion: true, radius: Math.max(missile.w, missile.h) * 0.9 });
    missile.dead = true;
    return true;
  }
  return false;
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
  spreads.forEach((angle) => state.playerBullets.push({ x: state.player.x + state.player.w / 2 - 3, y: state.player.y, w: 6, h: 12, angle, golden: state.goldenBulletRemaining > 0 }));
}

function updatePlayerBullets(dt) {
  state.playerBullets = state.playerBullets.filter((bullet) => {
    const radians = (bullet.angle * Math.PI) / 180;
    bullet.x += Math.sin(radians) * 260 * dt / 1000;
    bullet.y -= Math.cos(radians) * 460 * dt / 1000;
    return bullet.y + bullet.h > 0;
  });
}

function getEnemyFireInterval() {
  const progressReduction = Math.max(0, (state.difficulty - 1) * 0.07);
  return Math.max(0.5, 2 - progressReduction);
}

function fireEnemyBullets(enemy) {
  if (enemy.type !== 'fighter' && enemy.type !== 'heavy') return;
  if (enemy.fireTimer > 0) return;
  const count = enemy.type === 'heavy' ? 2 : 1;
  for (let index = 0; index < count; index += 1) {
    state.enemyBullets.push({ x: enemy.x + enemy.w / 2 + (index ? 12 : 0) - 2, y: enemy.y + enemy.h, w: 4, h: 10, vx: index ? 18 : 0, vy: enemy.vy + 300, homing: enemy.type === 'heavy' });
  }
  enemy.fireTimer = getEnemyFireInterval() * 1000;
}

function updateEnemyBullets(dt, timeScale = 1) {
  if (state.mode !== 'exploding') {
    state.obstacles.forEach((enemy) => {
      enemy.fireTimer -= dt;
      fireEnemyBullets(enemy);
    });
  }
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

function addShieldLightning(x, y) {
  state.effects.push({ x, y, color: '#d9f99d', age: 0, life: 140, lightning: true, maxRadius: 54, arc: Math.random() * Math.PI * 2 });
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
    const points = { scout: 25, fighter: 50, heavy: 100 }[enemy.type] || 25;
    state.score += points;
    addScorePopup(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, points);
    state.effects.push({ x: enemy.x + enemy.w / 2, y: enemy.y + enemy.h / 2, color: '#ff9f43', age: 0, life: 360, explosion: true, radius: enemy.w * 0.92 });
    enemy.dead = true;
  }
}

function updateEffects(dt) {
  state.effects = state.effects.filter((effect) => {
    effect.age += dt;
    return effect.age < effect.life;
  });
}

function renderExplosionBurst(effect) {
  const progress = Math.min(1, effect.age / effect.life);
  const radius = Math.max(effect.radius || 8, 12) * (1 + progress * 0.4);
  const fade = Math.max(0, 1 - progress);
  ctx.save();
  ctx.translate(effect.x, effect.y);
  ctx.globalAlpha = fade * 0.92;
  ctx.shadowColor = effect.color || '#ff6b35';
  ctx.shadowBlur = 18;
  ctx.fillStyle = effect.color || '#ff9f43';
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#ffe0a3';
  ctx.lineWidth = 2;
  for (let index = 0; index < 8; index += 1) {
    const angle = (Math.PI * 2 * index) / 8;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * radius * 0.7, Math.sin(angle) * radius * 0.7);
    ctx.lineTo(Math.cos(angle) * radius * 1.25, Math.sin(angle) * radius * 1.25);
    ctx.stroke();
  }
  ctx.restore();
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
      const destroyed = damageTrackingMissile(missile, bullet);
      if (destroyed) {
        state.missileHazards = state.missileHazards.filter((candidate) => candidate !== missile);
      }
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
    if (state.shield > 0) {
      state.shield = Math.max(0, state.shield - 1);
      addShieldLightning(state.player.x + state.player.w / 2, state.player.y + state.player.h / 2);
      addImpact(state.player.x + state.player.w / 2, state.player.y + state.player.h / 2, '#86efac');
      return;
    }
    takeDamage();
  } else if (physicalHit) {
    if (state.shield > 0) {
      state.shield = Math.max(0, state.shield - 1);
      physicalHit.dead = true;
      addShieldLightning(state.player.x + state.player.w / 2, state.player.y + state.player.h / 2);
      addImpact(state.player.x + state.player.w / 2, state.player.y + state.player.h / 2, '#86efac');
      return;
    }
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
    state.shield = Math.max(1, state.shield || 1);
    state.player.x = WORLD.width / 2 - state.player.w / 2;
    startExplosion(true);
  }
}

function checkCollisions() {
  if (state.immunityRemaining > 0) return;
  const missile = state.missileHazards.find((candidate) => intersects(state.player, candidate));
  if (missile) {
    if (state.shield > 0) {
      state.shield = Math.max(0, state.shield - 1);
      state.missileHazards = state.missileHazards.filter((candidate) => candidate !== missile);
      addShieldLightning(state.player.x + state.player.w / 2, state.player.y + state.player.h / 2);
      addImpact(state.player.x + state.player.w / 2, state.player.y + state.player.h / 2, '#86efac');
      return;
    }
    state.missileHazards = state.missileHazards.filter((candidate) => candidate !== missile);
    takeDamage();
  }
}

function updateGame(dt) {
  state.elapsed += dt;
  state.score += dt * 0.006;
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
  updateStars(dt, 1);
  updatePowerUp(dt, 1);
  updateMissiles(dt, 1);
  updateEnemyBullets(dt, 1);
  updateEffects(dt);

  if (!state.explosionCleanupDone && state.explosionElapsed >= 2000) {
    state.obstacles = [];
    state.enemyBullets = [];
    state.explosionCleanupDone = true;
  }

  if (state.explosionElapsed >= 2500) {
    if (state.respawnAfterExplosion) {
      state.mode = 'playing';
      state.respawnAfterExplosion = false;
      state.explosionCleanupDone = false;
      state.readyRemaining = 3000;
      state.respawnFlickerRemaining = 3000;
      state.player = createPlayer();
      state.player.x = WORLD.width / 2 - state.player.w / 2;
      state.shield = 1;
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
    const twinkle = 0.72 + Math.sin(star.phase * (0.9 + star.twinkleSpeed * 0.18)) * (0.18 + star.twinkleSpeed * 0.12);
    ctx.fillStyle = `rgba(190, 220, 255, ${Math.max(0.2, star.alpha * twinkle)})`;
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
  if (immune) {
    ctx.beginPath();
    const immunityGradient = ctx.createRadialGradient(player.x + player.w / 2, player.y + player.h / 2, 10, player.x + player.w / 2, player.y + player.h / 2, 64);
    immunityGradient.addColorStop(0, 'rgba(103, 232, 249, 0)');
    immunityGradient.addColorStop(0.2, 'rgba(103, 232, 249, 0.22)');
    immunityGradient.addColorStop(0.55, 'rgba(103, 232, 249, 0.42)');
    immunityGradient.addColorStop(0.82, 'rgba(103, 232, 249, 0.14)');
    immunityGradient.addColorStop(1, 'rgba(103, 232, 249, 0)');
    ctx.fillStyle = immunityGradient;
    ctx.shadowColor = '#67e8f9';
    ctx.shadowBlur = 42;
    ctx.arc(player.x + player.w / 2, player.y + player.h / 2, 64, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowColor = glow; ctx.shadowBlur = immune ? 42 : 16;
  ctx.fillStyle = immune ? '#67e8f9' : '#ff5a36';
  ctx.beginPath();
  ctx.moveTo(player.x + player.w * 0.35, player.y + player.h - 1);
  ctx.lineTo(player.x + player.w * 0.65, player.y + player.h - 1);
  ctx.lineTo(player.x + player.w / 2 + player.trailLean, player.y + player.h + 22 + Math.random() * 7);
  ctx.closePath(); ctx.fill();
  ctx.shadowColor = glow; ctx.shadowBlur = immune ? 36 : 12;
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
    const colors = { scout: '#a78bfa', fighter: '#fb923c', heavy: '#ef4444' };
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
  const type = state.powerUp.type;
  const radius = state.powerUp.radius || 12;
  const palette = {
    immunity: { core: '#67e8f9', glow: '#22d3ee', accent: '#dffcff', ring: '#cffafe' },
    multishot: { core: '#d8b4fe', glow: '#a855f7', accent: '#f3e8ff', ring: '#e9d5ff' },
    golden: { core: '#facc15', glow: '#f59e0b', accent: '#fff7d6', ring: '#fde68a' },
    shield: { core: '#86efac', glow: '#22c55e', accent: '#ecfdf5', ring: '#bbf7d0' },
  }[type] || { core: '#67e8f9', glow: '#22d3ee', accent: '#dffcff', ring: '#cffafe' };

  ctx.save();
  ctx.translate(state.powerUp.x, state.powerUp.y);
  ctx.shadowColor = palette.glow;
  ctx.shadowBlur = 26;
  ctx.fillStyle = palette.core;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = palette.ring;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, radius - 2, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = palette.accent;
  ctx.lineWidth = 2;
  ctx.strokeStyle = palette.ring;

  if (type === 'immunity') {
    ctx.beginPath();
    ctx.moveTo(-11, 0);
    ctx.lineTo(-6, -7);
    ctx.lineTo(-1, -2);
    ctx.lineTo(-1, -11);
    ctx.lineTo(0, -14);
    ctx.lineTo(1, -11);
    ctx.lineTo(1, -2);
    ctx.lineTo(6, -7);
    ctx.lineTo(11, 0);
    ctx.lineTo(6, 7);
    ctx.lineTo(1, 2);
    ctx.lineTo(1, 11);
    ctx.lineTo(0, 14);
    ctx.lineTo(-1, 11);
    ctx.lineTo(-1, 2);
    ctx.lineTo(-6, 7);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#e0f2fe';
    ctx.fill();
  } else if (type === 'multishot') {
    [{ x: -8, y: -7 }, { x: 8, y: -7 }, { x: 0, y: 8 }].forEach(({ x, y }) => {
      ctx.beginPath();
      ctx.arc(x, y, 4.4, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (type === 'golden') {
    ctx.beginPath();
    ctx.roundRect(-5, -10, 10, 20, 3);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-2, -12);
    ctx.lineTo(5, -4);
    ctx.lineTo(2, -4);
    ctx.lineTo(2, 10);
    ctx.lineTo(-2, 10);
    ctx.lineTo(-2, -4);
    ctx.lineTo(-5, -4);
    ctx.closePath();
    ctx.fill();
  } else if (type === 'shield') {
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(8, -6);
    ctx.lineTo(9, 2);
    ctx.quadraticCurveTo(0, 11, -9, 2);
    ctx.lineTo(-8, -6);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-4, -5);
    ctx.lineTo(0, -1);
    ctx.lineTo(4, -5);
    ctx.lineTo(4, 3);
    ctx.quadraticCurveTo(0, 8, -4, 3);
    ctx.closePath();
    ctx.stroke();
  }

  ctx.restore();
}

function drawMissiles() {
  state.missileHazards.forEach((missile) => {
    ctx.save(); ctx.translate(missile.x + missile.w / 2, missile.y + missile.h / 2); ctx.shadowColor = '#fb451f'; ctx.shadowBlur = 8;
    ctx.fillStyle = '#3f2028'; drawRoundedRect(-9, -15, 18, 30, 5); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#ef4444'; ctx.fillRect(-3, -7, 6, 4); ctx.fillStyle = '#fb923c'; ctx.fillRect(-3, 8, 6, 6); ctx.restore();
  });
}

function drawProjectileCapsule(x, y, width, height, angle, color, glow) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.shadowColor = glow;
  ctx.shadowBlur = 10;
  ctx.fillStyle = color;
  drawRoundedRect(-width / 2, -height / 2, width, height, Math.max(2, width / 2.2));
  ctx.fill();
  ctx.restore();
}

function drawProjectiles() {
  state.playerBullets.forEach((bullet) => {
    drawProjectileCapsule(bullet.x + bullet.w / 2, bullet.y + bullet.h / 2, bullet.w, bullet.h, 0, bullet.golden ? '#fef08a' : '#cffafe', bullet.golden ? '#fde047' : '#67e8f9');
  });
  state.enemyBullets.forEach((bullet) => {
    drawProjectileCapsule(bullet.x + bullet.w / 2, bullet.y + bullet.h / 2, bullet.w, bullet.h, 0, '#fb923c', '#fb451f');
  });
}

function drawShield() {
  if (!state.shield || !state.player || state.mode === 'exploding') return;
  const level = Math.min(3, Math.max(1, state.shield));
  const opacityMap = { 1: 0.15, 2: 0.35, 3: 0.6 };
  const cx = state.player.x + state.player.w / 2;
  const cy = state.player.y + state.player.h / 2;
  const radius = 34;

  ctx.save();
  const shieldGradient = ctx.createRadialGradient(cx, cy, 10, cx, cy, radius + 20);
  shieldGradient.addColorStop(0, 'rgba(134, 239, 172, 0)');
  shieldGradient.addColorStop(0.18, 'rgba(134, 239, 172, 0.18)');
  shieldGradient.addColorStop(0.52, `rgba(134, 239, 172, ${opacityMap[level]})`);
  shieldGradient.addColorStop(0.7, `rgba(134, 239, 172, ${Math.max(0.06, opacityMap[level] * 0.45)})`);
  shieldGradient.addColorStop(0.92, 'rgba(134, 239, 172, 0.06)');
  shieldGradient.addColorStop(1, 'rgba(134, 239, 172, 0)');

  ctx.beginPath();
  ctx.fillStyle = shieldGradient;
  ctx.arc(cx, cy, radius + 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawEffects() {
  state.effects.forEach((effect) => {
    if (effect.explosion) {
      renderExplosionBurst(effect);
      return;
    }
    const progress = effect.age / effect.life;
    ctx.save();
    ctx.globalAlpha = 1 - progress;
    if (effect.lightning) {
      const radius = effect.maxRadius * (1 - progress);
      const segments = 9;
      ctx.translate(effect.x, effect.y);
      ctx.strokeStyle = '#d9f99d';
      ctx.lineWidth = 2.2;
      ctx.shadowColor = '#86efac';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let index = 1; index <= segments; index += 1) {
        const t = index / segments;
        const angle = effect.arc + t * (Math.PI * 1.75) + (index % 2 === 0 ? 0.45 : -0.45);
        const distance = radius * t;
        const jitter = (index % 2 === 0 ? 1 : -1) * (8 + (1 - t) * 16);
        const px = Math.cos(angle) * distance + Math.sin(angle + 1.5) * jitter;
        const py = Math.sin(angle) * distance - Math.cos(angle + 1.5) * jitter;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
      return;
    }
    ctx.fillStyle = effect.color;
    ctx.shadowColor = effect.color;
    ctx.shadowBlur = effect.text ? 10 : 8;
    if (effect.text) {
      ctx.font = '700 26px Arial, sans-serif';
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
  const fade = Math.max(0, 1 - progress);
  ctx.save(); ctx.translate(state.explosionPosition.x, state.explosionPosition.y); ctx.globalAlpha = fade * 0.96;
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
  state.mode = 'paused';
  clearGameLoop();
  pauseModal.classList.remove('hidden');
  updatePauseButton();
}

function resumeGame() {
  if (state.mode !== 'paused') return;
  state.mode = 'playing';
  closePauseModal();
  state.lastFrame = 0;
  updatePauseButton();
  state.animationId = requestAnimationFrame(gameLoop);
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
  updateLeaderboards(); updateHud(); state.player = createPlayer(); showStartScreen(); bindInput(); drawScene(); startAmbientLoop();
  startButton.addEventListener('click', startGame);
  restartButton.addEventListener('click', startGame);
  mainMenuButton.addEventListener('click', returnToMainMenu);
  continueButton.addEventListener('click', resumeGame);
  pauseRestartButton.addEventListener('click', startGame);
  pauseMainMenuButton.addEventListener('click', returnToMainMenu);
  toggleLeaderboardButton.addEventListener('click', () => { startScreen.classList.add('leaderboard-open'); startLeaderboardPanel.classList.remove('hidden'); toggleLeaderboardButton.setAttribute('aria-expanded', 'true'); });
  leaderboardBackButton.addEventListener('click', showStartScreen);
  pauseButton.addEventListener('click', () => { openPauseModal(); });
  saveScoreButton.addEventListener('click', saveEntryToLeaderboard);
  skipScoreButton.addEventListener('click', closeScoreModal);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.mode === 'playing') openPauseModal();
  });
  playerNameInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); saveEntryToLeaderboard(); } });
}

init();
