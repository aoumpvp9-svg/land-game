/**
 * Land Rush Battle (땅따먹기 배틀)
 * Full Game Logic, Web Audio Sound Synthesizer, Confetti Particle System, AI Engine
 */

(function () {
  'use strict';

  // --- Game State ---
  let boardSize = 5; // Default 5x5
  let totalTiles = boardSize * boardSize;
  let boardState = []; // 0: Empty, 1: Player, 2: Computer
  let isPlayerTurn = true;
  let isGameOver = false;
  let isAiThinking = false;
  let soundEnabled = true;
  let difficulty = 'random'; // 'random' or 'smart'

  // Statistics (Stored in localStorage)
  let stats = {
    wins: 0,
    draws: 0,
    losses: 0
  };

  // --- DOM Elements ---
  const gameBoard = document.getElementById('gameBoard');
  const playerScoreEl = document.getElementById('playerScore');
  const computerScoreEl = document.getElementById('computerScore');
  const remainingCountEl = document.getElementById('remainingCount');
  const turnIndicator = document.getElementById('turnIndicator');
  const turnText = document.getElementById('turnText');
  const playerCard = document.getElementById('playerCard');
  const computerCard = document.getElementById('computerCard');
  const playerTerritoryBar = document.getElementById('playerTerritoryBar');
  const computerTerritoryBar = document.getElementById('computerTerritoryBar');
  const playerPercentageEl = document.getElementById('playerPercentage');
  const computerPercentageEl = document.getElementById('computerPercentage');
  const gameStatusNotice = document.getElementById('gameStatusNotice');

  // Toolbar & Settings
  const boardSizeSelect = document.getElementById('boardSizeSelect');
  const difficultySelect = document.getElementById('difficultySelect');
  const restartBtn = document.getElementById('restartBtn');
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const soundIcon = document.getElementById('soundIcon');
  const statsBtn = document.getElementById('statsBtn');

  // Result Modal
  const resultModal = document.getElementById('resultModal');
  const modalBanner = document.getElementById('modalBanner');
  const modalEmoji = document.getElementById('modalEmoji');
  const modalTitle = document.getElementById('modalTitle');
  const modalDesc = document.getElementById('modalDesc');
  const modalPlayerScore = document.getElementById('modalPlayerScore');
  const modalComputerScore = document.getElementById('modalComputerScore');
  const modalRestartBtn = document.getElementById('modalRestartBtn');

  // Stats Modal & Records
  const statsModal = document.getElementById('statsModal');
  const closeStatsBtn = document.getElementById('closeStatsBtn');
  const resetStatsBtn = document.getElementById('resetStatsBtn');
  const statsWinCount = document.getElementById('statsWinCount');
  const statsDrawCount = document.getElementById('statsDrawCount');
  const statsLossCount = document.getElementById('statsLossCount');
  const statsWinRate = document.getElementById('statsWinRate');
  const recordWins = document.getElementById('recordWins');
  const recordDraws = document.getElementById('recordDraws');
  const recordLosses = document.getElementById('recordLosses');

  // Canvas
  const confettiCanvas = document.getElementById('confettiCanvas');
  const ctx = confettiCanvas ? confettiCanvas.getContext('2d') : null;

  // --- Web Audio API Synthesizer (No external sound files required) ---
  let audioCtx = null;

  function initAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  // Play Player pop sound (bouncy high-pitch tone)
  function playPopSound() {
    if (!soundEnabled) return;
    initAudioContext();
    if (!audioCtx) return;

    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const now = audioCtx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(360, now);
      osc.frequency.exponentialRampToValueAtTime(740, now + 0.12);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch (e) {
      console.warn('Audio playback error', e);
    }
  }

  // Play Computer tone (quirky robot beep)
  function playAiSound() {
    if (!soundEnabled) return;
    initAudioContext();
    if (!audioCtx) return;

    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const now = audioCtx.currentTime;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(580, now);
      osc.frequency.setValueAtTime(420, now + 0.08);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch (e) {
      console.warn('Audio playback error', e);
    }
  }

  // Play Win Fanfare (ascending triumphant arpeggio)
  function playWinFanfare() {
    if (!soundEnabled) return;
    initAudioContext();
    if (!audioCtx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      const now = audioCtx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const startTime = now + idx * 0.12;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.25, startTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.35);
      });
    } catch (e) {
      console.warn('Audio playback error', e);
    }
  }

  // Play Loss Jingle (descending mournful chords)
  function playLossJingle() {
    if (!soundEnabled) return;
    initAudioContext();
    if (!audioCtx) return;

    try {
      const notes = [440, 392, 349.23, 293.66]; // A4, G4, F4, D4
      const now = audioCtx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const startTime = now + idx * 0.14;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.22, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.28);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.28);
      });
    } catch (e) {
      console.warn('Audio playback error', e);
    }
  }

  // Play subtle UI button click
  function playClickSound() {
    if (!soundEnabled) return;
    initAudioContext();
    if (!audioCtx) return;

    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const now = audioCtx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {}
  }

  // --- Confetti Celebration Particles ---
  let confettiParticles = [];
  let confettiAnimId = null;

  function resizeConfettiCanvas() {
    if (!confettiCanvas) return;
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeConfettiCanvas);
  resizeConfettiCanvas();

  function triggerConfetti() {
    if (!ctx) return;
    confettiParticles = [];
    const colors = ['#38bdf8', '#0284c7', '#fb7185', '#f43f5e', '#facc15', '#a855f7', '#34d399', '#f97316'];
    const particleCount = 140;

    for (let i = 0; i < particleCount; i++) {
      confettiParticles.push({
        x: window.innerWidth * (0.3 + Math.random() * 0.4),
        y: window.innerHeight * 0.45,
        w: Math.random() * 9 + 6,
        h: Math.random() * 6 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 16,
        vy: -Math.random() * 14 - 6,
        gravity: 0.35 + Math.random() * 0.1,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        opacity: 1
      });
    }

    if (confettiAnimId) cancelAnimationFrame(confettiAnimId);
    animateConfetti();
  }

  function animateConfetti() {
    if (!ctx) return;
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

    let activeParticles = 0;
    for (let p of confettiParticles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.rotation += p.rotationSpeed;
      p.vx *= 0.98;

      if (p.y > window.innerHeight * 0.7) {
        p.opacity -= 0.015;
      }

      if (p.opacity > 0 && p.y < window.innerHeight + 50) {
        activeParticles++;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
    }

    if (activeParticles > 0) {
      confettiAnimId = requestAnimationFrame(animateConfetti);
    } else {
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
  }

  // --- Statistics Persistence ---
  function loadStats() {
    try {
      const saved = localStorage.getItem('landRushBattleStats');
      if (saved) {
        stats = Object.assign(stats, JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Could not read from localStorage', e);
    }
    updateStatsDisplay();
  }

  function saveStats() {
    try {
      localStorage.setItem('landRushBattleStats', JSON.stringify(stats));
    } catch (e) {
      console.warn('Could not save to localStorage', e);
    }
    updateStatsDisplay();
  }

  function updateStatsDisplay() {
    recordWins.textContent = stats.wins;
    recordDraws.textContent = stats.draws;
    recordLosses.textContent = stats.losses;

    statsWinCount.textContent = stats.wins;
    statsDrawCount.textContent = stats.draws;
    statsLossCount.textContent = stats.losses;

    const totalMatches = stats.wins + stats.draws + stats.losses;
    const rate = totalMatches > 0 ? Math.round((stats.wins / totalMatches) * 100) : 0;
    statsWinRate.textContent = `${rate}%`;
  }

  // --- Game Core Logic ---

  /**
   * Initialize or Reset the Game
   */
  function initGame() {
    boardSize = parseInt(boardSizeSelect.value, 10) || 5;
    difficulty = difficultySelect.value || 'random';
    totalTiles = boardSize * boardSize;
    boardState = new Array(totalTiles).fill(0);
    isPlayerTurn = true;
    isGameOver = false;
    isAiThinking = false;

    // Reset UI Board
    gameBoard.className = `game-board grid-${boardSize}x${boardSize}`;
    gameBoard.innerHTML = '';
    gameBoard.classList.remove('locked');

    // Create Tile Cells
    for (let i = 0; i < totalTiles; i++) {
      const tile = document.createElement('button');
      tile.className = 'tile-cell';
      tile.dataset.index = i;
      tile.setAttribute('aria-label', `${i + 1}번 빈 칸`);
      
      // Click & Touch Handler
      tile.addEventListener('click', () => handleTileClick(i));
      gameBoard.appendChild(tile);
    }

    // Hide Modal & Stop Confetti
    resultModal.classList.add('hidden');
    if (ctx) ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

    // Update Turn Indicator & Scores
    updateScoresAndBoardUI();
    setTurn(true);
    setStatusNotice('✨ 비어 있는 네모 칸을 터치하거나 클릭하여 내 땅으로 만드세요!');
  }

  /**
   * Set Active Turn
   */
  function setTurn(playerTurn) {
    isPlayerTurn = playerTurn;
    if (isGameOver) return;

    if (playerTurn) {
      turnIndicator.className = 'turn-pill player-turn';
      turnText.textContent = '내 차례! 👑';
      playerCard.classList.add('active-turn');
      computerCard.classList.remove('active-turn');
      gameBoard.classList.remove('locked');
    } else {
      turnIndicator.className = 'turn-pill computer-turn';
      turnText.textContent = '컴퓨터 고민 중... 🤖';
      playerCard.classList.remove('active-turn');
      computerCard.classList.add('active-turn');
      gameBoard.classList.add('locked');
    }
  }

  /**
   * User clicks a tile
   */
  function handleTileClick(index) {
    initAudioContext();
    if (isGameOver || !isPlayerTurn || isAiThinking) return;
    if (boardState[index] !== 0) return; // Already claimed

    // Claim tile for Player
    claimTile(index, 1);
    playPopSound();

    const emptyCount = getEmptyTileIndices().length;
    if (emptyCount === 0) {
      endGame();
      return;
    }

    // Switch to Computer Turn
    setTurn(false);
    isAiThinking = true;
    setStatusNotice('🤖 컴퓨터가 전략을 세우며 다음 칸을 선택하고 있습니다...');

    // Computer Move with realistic delay (400ms ~ 550ms)
    const delay = Math.floor(Math.random() * 150) + 400;
    setTimeout(() => {
      if (isGameOver) return;
      makeComputerMove();
      isAiThinking = false;

      const remainingAfterAi = getEmptyTileIndices().length;
      if (remainingAfterAi === 0) {
        endGame();
      } else {
        setTurn(true);
        setStatusNotice('🎯 내 차례입니다! 다음 빈 칸을 차지하세요!');
      }
    }, delay);
  }

  /**
   * Computer makes a move
   */
  function makeComputerMove() {
    const emptyIndices = getEmptyTileIndices();
    if (emptyIndices.length === 0) return;

    let chosenIndex = null;

    if (difficulty === 'smart') {
      // Smart AI: Prefer empty tiles adjacent to existing computer tiles (territory cluster)
      // or block user's cluster with slight preference
      const aiAdjacents = getAdjacentEmptyTiles(2, emptyIndices);
      const playerAdjacents = getAdjacentEmptyTiles(1, emptyIndices);

      if (aiAdjacents.length > 0 && Math.random() < 0.65) {
        // Expand AI territory
        chosenIndex = aiAdjacents[Math.floor(Math.random() * aiAdjacents.length)];
      } else if (playerAdjacents.length > 0 && Math.random() < 0.5) {
        // Contest player border
        chosenIndex = playerAdjacents[Math.floor(Math.random() * playerAdjacents.length)];
      } else {
        // Fallback random
        chosenIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
      }
    } else {
      // Default Random Mode (as requested by user)
      chosenIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    }

    claimTile(chosenIndex, 2);
    playAiSound();
  }

  /**
   * Helper: Get adjacent empty tiles next to owner (1 or 2)
   */
  function getAdjacentEmptyTiles(owner, emptyIndices) {
    const adjacentSet = new Set();
    const emptySet = new Set(emptyIndices);

    for (let i = 0; i < totalTiles; i++) {
      if (boardState[i] === owner) {
        const row = Math.floor(i / boardSize);
        const col = i % boardSize;

        const neighbors = [
          { r: row - 1, c: col },
          { r: row + 1, c: col },
          { r: row, c: col - 1 },
          { r: row, c: col + 1 }
        ];

        neighbors.forEach(n => {
          if (n.r >= 0 && n.r < boardSize && n.c >= 0 && n.c < boardSize) {
            const neighborIdx = n.r * boardSize + n.c;
            if (emptySet.has(neighborIdx)) {
              adjacentSet.add(neighborIdx);
            }
          }
        });
      }
    }

    return Array.from(adjacentSet);
  }

  /**
   * Claim a tile on board
   */
  function claimTile(index, owner) {
    boardState[index] = owner;
    const tile = gameBoard.children[index];
    if (!tile) return;

    tile.classList.add('claimed');
    if (owner === 1) {
      tile.classList.add('claimed-player');
      tile.innerHTML = '<span class="tile-icon">👑</span>';
      tile.setAttribute('aria-label', `${index + 1}번 칸: 나의 땅`);
    } else {
      tile.classList.add('claimed-computer');
      tile.innerHTML = '<span class="tile-icon">🤖</span>';
      tile.setAttribute('aria-label', `${index + 1}번 칸: 컴퓨터 땅`);
    }

    updateScoresAndBoardUI();
  }

  /**
   * Get all remaining empty tile indices
   */
  function getEmptyTileIndices() {
    const empty = [];
    for (let i = 0; i < totalTiles; i++) {
      if (boardState[i] === 0) {
        empty.push(i);
      }
    }
    return empty;
  }

  /**
   * Update Scoreboard, Gauge Bars, and Percentages
   */
  function updateScoresAndBoardUI() {
    let playerScore = 0;
    let computerScore = 0;

    for (let val of boardState) {
      if (val === 1) playerScore++;
      else if (val === 2) computerScore++;
    }

    const remaining = totalTiles - (playerScore + computerScore);

    playerScoreEl.textContent = playerScore;
    computerScoreEl.textContent = computerScore;
    remainingCountEl.textContent = remaining;

    // Percentages
    const playerPct = Math.round((playerScore / totalTiles) * 100);
    const computerPct = Math.round((computerScore / totalTiles) * 100);

    playerPercentageEl.textContent = `나: ${playerPct}% (${playerScore}칸)`;
    computerPercentageEl.textContent = `컴퓨터: ${computerPct}% (${computerScore}칸)`;

    playerTerritoryBar.style.width = `${playerPct}%`;
    computerTerritoryBar.style.width = `${computerPct}%`;
  }

  /**
   * End Game and Announce Winner
   */
  function endGame() {
    isGameOver = true;
    gameBoard.classList.add('locked');
    playerCard.classList.remove('active-turn');
    computerCard.classList.remove('active-turn');

    let playerScore = 0;
    let computerScore = 0;
    for (let val of boardState) {
      if (val === 1) playerScore++;
      else if (val === 2) computerScore++;
    }

    modalPlayerScore.textContent = playerScore;
    modalComputerScore.textContent = computerScore;

    // Evaluate Result
    if (playerScore > computerScore) {
      // User Won
      stats.wins++;
      saveStats();

      modalBanner.className = 'modal-banner win-banner';
      modalEmoji.textContent = '🏆';
      modalTitle.textContent = '🎉 나의 승리!';
      modalDesc.textContent = `축하합니다! 총 ${playerScore}칸을 확보하여 컴퓨터(${computerScore}칸)를 제압했습니다!`;

      turnIndicator.className = 'turn-pill player-turn';
      turnText.textContent = '승리 완료! 🎉';
      setStatusNotice('🏆 승리를 축하합니다! 새로운 대결에 도전해보세요!');

      setTimeout(() => {
        playWinFanfare();
        triggerConfetti();
        resultModal.classList.remove('hidden');
      }, 350);

    } else if (playerScore < computerScore) {
      // Computer Won
      stats.losses++;
      saveStats();

      modalBanner.className = 'modal-banner loss-banner';
      modalEmoji.textContent = '😢';
      modalTitle.textContent = '아쉬운 패배!';
      modalDesc.textContent = `컴퓨터가 ${computerScore}칸을 차지했습니다. 다음 판에서 설욕해보세요!`;

      turnIndicator.className = 'turn-pill computer-turn';
      turnText.textContent = '게임 오버 😢';
      setStatusNotice('💪 아쉽네요! 다시 시작 버튼으로 설욕전에 도전하세요!');

      setTimeout(() => {
        playLossJingle();
        resultModal.classList.remove('hidden');
      }, 350);

    } else {
      // Draw
      stats.draws++;
      saveStats();

      modalBanner.className = 'modal-banner draw-banner';
      modalEmoji.textContent = '🤝';
      modalTitle.textContent = '팽팽한 무승부!';
      modalDesc.textContent = `양측 모두 똑같이 ${playerScore}칸씩 영토를 나누어 가졌습니다!`;

      turnIndicator.className = 'turn-pill';
      turnText.textContent = '무승부! 🤝';
      setStatusNotice('🤝 무승부입니다! 한 판 더 승부를 가려볼까요?');

      setTimeout(() => {
        resultModal.classList.remove('hidden');
      }, 350);
    }
  }

  function setStatusNotice(msg) {
    if (gameStatusNotice) {
      gameStatusNotice.textContent = msg;
    }
  }

  // --- Event Listeners ---

  // Restart Button
  restartBtn.addEventListener('click', () => {
    playClickSound();
    initGame();
  });

  modalRestartBtn.addEventListener('click', () => {
    playClickSound();
    initGame();
  });

  // Board Size Change
  boardSizeSelect.addEventListener('change', () => {
    playClickSound();
    initGame();
  });

  // Difficulty Change
  difficultySelect.addEventListener('change', () => {
    playClickSound();
    difficulty = difficultySelect.value;
    initGame();
  });

  // Sound Toggle
  soundToggleBtn.addEventListener('click', () => {
    initAudioContext();
    soundEnabled = !soundEnabled;
    soundIcon.textContent = soundEnabled ? '🔊' : '🔇';
    soundToggleBtn.setAttribute('aria-label', soundEnabled ? '사운드 끄기' : '사운드 켜기');
    if (soundEnabled) {
      playClickSound();
    }
  });

  // Stats Modal
  statsBtn.addEventListener('click', () => {
    playClickSound();
    updateStatsDisplay();
    statsModal.classList.remove('hidden');
  });

  closeStatsBtn.addEventListener('click', () => {
    playClickSound();
    statsModal.classList.add('hidden');
  });

  resetStatsBtn.addEventListener('click', () => {
    if (confirm('전적 기록을 모두 초기화하시겠습니까?')) {
      stats = { wins: 0, draws: 0, losses: 0 };
      saveStats();
    }
  });

  // Close modals on clicking overlay backdrop
  [resultModal, statsModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    });
  });

  // Keyboard shortcut: Space or 'R' to restart
  window.addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R') {
      if (resultModal.classList.contains('hidden') && statsModal.classList.contains('hidden')) {
        initGame();
      }
    }
  });

  // Initialize on Load
  loadStats();
  initGame();

})();
