const stage = document.getElementById('stage');
const tabs = Array.from(document.querySelectorAll('.tab'));
const gameTitle = document.getElementById('game-title');
const gameNote = document.getElementById('game-note');

const bestReactionEl = document.getElementById('best-reaction');
const memoryWinsEl = document.getElementById('memory-wins');
const bestSequenceEl = document.getElementById('best-sequence');
const bestPatternEl = document.getElementById('best-pattern');
const totalRunsEl = document.getElementById('total-runs');
const achievementList = document.getElementById('achievement-list');
const gameTipsEl = document.getElementById('game-tips');
const runHistoryEl = document.getElementById('run-history');
const resetScoresBtn = document.getElementById('reset-scores');
const exportScoresBtn = document.getElementById('export-scores');
const importScoresBtn = document.getElementById('import-scores');
const importScoresFile = document.getElementById('import-scores-file');
const difficultySelect = document.getElementById('difficulty-select');

const gameMeta = {
  reaction: {
    title: 'Reaction Timer',
    note: 'Click as soon as the panel turns green. Early clicks are penalties.',
    tips: ['Wait for green before clicking.', 'Chain repeat trials to compare your floor.', 'Mouse or touch works best here.'],
  },
  memory: {
    title: 'Memory Match',
    note: 'Match all symbol pairs in as few errors as possible.',
    tips: ['Use early mismatches as free information.', 'Clear edges first to reduce uncertainty.', 'Clean wins build the Memory Master count.'],
  },
  sequence: {
    title: 'Sequence Recall',
    note: 'Repeat an increasingly long sequence of colored pads (use 1-4 or Q/W/A/S keys).',
    tips: ['Number keys 1-4 and Q/W/A/S both work.', 'Chunk the pattern into smaller beats.', 'Best score tracks your deepest round.'],
  },
  pattern: {
    title: 'Pattern Sprint',
    note: 'Hit highlighted tiles as fast as possible before the timer ends.',
    tips: ['Misses cost points.', 'Keep your cursor near center between targets.', 'Treat it like aim training, not random clicks.'],
  },
};

const scoreKey = 'mini_game_hub_scores_v3';
const scores = loadScores();
let currentCleanup = () => {};
let currentDifficulty = 'standard';

const difficultyProfiles = {
  casual: { reactionMin: 1200, reactionRange: 2400, memoryPairs: 5, sequenceDelay: 720, patternDuration: 28, patternSwitch: 720 },
  standard: { reactionMin: 900, reactionRange: 2200, memoryPairs: 6, sequenceDelay: 600, patternDuration: 25, patternSwitch: 620 },
  expert: { reactionMin: 650, reactionRange: 1700, memoryPairs: 8, sequenceDelay: 470, patternDuration: 22, patternSwitch: 480 },
};

function defaultScores() {
  return {
    bestReaction: null,
    memoryWins: 0,
    bestSequence: 0,
    bestPattern: 0,
    runHistory: [],
    totalRuns: 0,
  };
}

function loadScores() {
  const fallback = defaultScores();

  try {
    const raw = JSON.parse(localStorage.getItem(scoreKey));
    if (!raw) return fallback;
    return {
      bestReaction: Number.isFinite(raw.bestReaction) ? raw.bestReaction : null,
      memoryWins: Number.isFinite(raw.memoryWins) ? raw.memoryWins : 0,
      bestSequence: Number.isFinite(raw.bestSequence) ? raw.bestSequence : 0,
      bestPattern: Number.isFinite(raw.bestPattern) ? raw.bestPattern : 0,
      runHistory: Array.isArray(raw.runHistory) ? raw.runHistory.slice(0, 10) : [],
      totalRuns: Number.isFinite(raw.totalRuns) ? raw.totalRuns : 0,
    };
  } catch (error) {
    return fallback;
  }
}

function saveScores() {
  localStorage.setItem(scoreKey, JSON.stringify(scores));
}

function exportScores() {
  const payload = {
    exportedAt: new Date().toISOString(),
    difficulty: currentDifficulty,
    scores,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'mini-game-hub-scores.json';
  anchor.click();
  URL.revokeObjectURL(url);
  gameNote.textContent = 'Exported scoreboard JSON.';
}

function importScores(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || '{}'));
      const imported = parsed.scores || parsed;
      Object.assign(scores, defaultScores(), {
        bestReaction: Number.isFinite(imported.bestReaction) ? imported.bestReaction : null,
        memoryWins: Number.isFinite(imported.memoryWins) ? imported.memoryWins : 0,
        bestSequence: Number.isFinite(imported.bestSequence) ? imported.bestSequence : 0,
        bestPattern: Number.isFinite(imported.bestPattern) ? imported.bestPattern : 0,
        runHistory: Array.isArray(imported.runHistory) ? imported.runHistory.slice(0, 10) : [],
        totalRuns: Number.isFinite(imported.totalRuns) ? imported.totalRuns : 0,
      });

      if (typeof parsed.difficulty === 'string' && difficultyProfiles[parsed.difficulty]) {
        currentDifficulty = parsed.difficulty;
        difficultySelect.value = parsed.difficulty;
      }

      saveScores();
      refreshScoreboard();
      setGame(document.querySelector('.tab.active')?.dataset.game || 'reaction');
      gameNote.textContent = 'Imported scoreboard JSON.';
    } catch (error) {
      gameNote.textContent = 'Could not import that score file.';
    } finally {
      event.target.value = '';
    }
  };

  reader.readAsText(file);
}

function achievementState() {
  const flags = {
    lightning: scores.bestReaction !== null && scores.bestReaction <= 220,
    memory: scores.memoryWins >= 5,
    sequence: scores.bestSequence >= 8,
    pattern: scores.bestPattern >= 20,
  };

  flags.arcade = flags.lightning && flags.memory && flags.sequence && flags.pattern;
  return flags;
}

function renderAchievements() {
  const unlocks = achievementState();
  const rows = [
    { id: 'lightning', label: 'Lightning Reflex', detail: 'Best reaction <= 220 ms' },
    { id: 'memory', label: 'Memory Master', detail: 'Win Memory Match 5 times' },
    { id: 'sequence', label: 'Sequence Savant', detail: 'Reach sequence round 8+' },
    { id: 'pattern', label: 'Pattern Sprinter', detail: 'Score 20+ in Pattern Sprint' },
    { id: 'arcade', label: 'Arcade All-Rounder', detail: 'Unlock all achievements' },
  ];

  achievementList.innerHTML = rows
    .map((row) => {
      const unlocked = Boolean(unlocks[row.id]);
      return `<li class="${unlocked ? 'unlocked' : ''}">${unlocked ? 'Unlocked' : 'Locked'} | ${row.label} - ${row.detail}</li>`;
    })
    .join('');
}

function renderRunHistory() {
  if (!scores.runHistory.length) {
    runHistoryEl.innerHTML = '<li>No runs yet. Start a game.</li>';
    return;
  }

  runHistoryEl.innerHTML = scores.runHistory
    .map((entry) => `<li>${entry.time} | ${entry.game}: ${entry.detail}</li>`)
    .join('');
}

function addRunEntry(game, detail) {
  scores.totalRuns += 1;
  scores.runHistory.unshift({
    time: new Date().toLocaleTimeString(),
    game,
    detail,
  });

  scores.runHistory = scores.runHistory.slice(0, 10);
  saveScores();
  renderRunHistory();
}

function refreshScoreboard() {
  bestReactionEl.textContent = scores.bestReaction === null ? '-' : `${scores.bestReaction.toFixed(0)} ms`;
  memoryWinsEl.textContent = String(scores.memoryWins);
  bestSequenceEl.textContent = String(scores.bestSequence);
  bestPatternEl.textContent = String(scores.bestPattern);
  totalRunsEl.textContent = String(scores.totalRuns);
  renderAchievements();
  renderRunHistory();
}

function activateTab(gameId) {
  tabs.forEach((button) => {
    button.classList.toggle('active', button.dataset.game === gameId);
  });
}

function renderTips(gameId) {
  const tips = gameMeta[gameId].tips || [];
  gameTipsEl.innerHTML = tips.map((tip) => `<li>${tip}</li>`).join('');
}

function setGame(gameId) {
  currentCleanup();
  currentCleanup = () => {};

  activateTab(gameId);
  gameTitle.textContent = gameMeta[gameId].title;
  gameNote.textContent = gameMeta[gameId].note;
  renderTips(gameId);

  if (gameId === 'reaction') currentCleanup = mountReactionGame();
  if (gameId === 'memory') currentCleanup = mountMemoryGame();
  if (gameId === 'sequence') currentCleanup = mountSequenceGame();
  if (gameId === 'pattern') currentCleanup = mountPatternGame();
}

function mountReactionGame() {
  const profile = difficultyProfiles[currentDifficulty];
  stage.innerHTML = `
    <div class="row">
      <button id="reaction-start" class="primary" type="button">Start Trial</button>
      <p id="reaction-result" class="mono">Press start to begin.</p>
    </div>
    <div id="reaction-pad" class="reaction-pad">Waiting for trial start.</div>
  `;

  const startButton = document.getElementById('reaction-start');
  const result = document.getElementById('reaction-result');
  const pad = document.getElementById('reaction-pad');

  let phase = 'idle';
  let timerId = null;
  let startTime = 0;

  function resetPadText(text) {
    pad.textContent = text;
  }

  function clearTimer() {
    if (timerId) {
      window.clearTimeout(timerId);
      timerId = null;
    }
  }

  startButton.addEventListener('click', () => {
    if (phase === 'waiting') return;

    clearTimer();
    phase = 'waiting';
    pad.classList.remove('ready');
    pad.classList.add('waiting');
    resetPadText('Wait for green...');
    result.textContent = 'Trial running...';

    const delay = profile.reactionMin + Math.random() * profile.reactionRange;
    timerId = window.setTimeout(() => {
      phase = 'ready';
      startTime = performance.now();
      pad.classList.remove('waiting');
      pad.classList.add('ready');
      resetPadText('Click now!');
    }, delay);
  });

  pad.addEventListener('click', () => {
    if (phase === 'waiting') {
      clearTimer();
      phase = 'idle';
      pad.classList.remove('waiting', 'ready');
      resetPadText('Too early. Start another trial.');
      result.textContent = 'Penalty: clicked before signal.';
      addRunEntry('Reaction', 'Early click penalty');
      return;
    }

    if (phase === 'ready') {
      const reactionTime = performance.now() - startTime;
      phase = 'idle';
      pad.classList.remove('ready');
      resetPadText('Nice. Start another trial.');
      result.textContent = `Reaction: ${reactionTime.toFixed(1)} ms`;
      addRunEntry('Reaction', `${reactionTime.toFixed(1)} ms`);

      if (scores.bestReaction === null || reactionTime < scores.bestReaction) {
        scores.bestReaction = reactionTime;
        saveScores();
        refreshScoreboard();
      }
    }
  });

  function handleReactionKey(event) {
    if (event.target.matches('input, textarea, select')) return;
    if (event.key !== ' ' && event.key !== 'Enter') return;
    event.preventDefault();

    if (phase === 'idle') {
      startButton.click();
      return;
    }

    pad.click();
  }

  window.addEventListener('keydown', handleReactionKey);

  return () => {
    clearTimer();
    window.removeEventListener('keydown', handleReactionKey);
  };
}

function mountMemoryGame() {
  const profile = difficultyProfiles[currentDifficulty];
  stage.innerHTML = `
    <div class="row">
      <button id="memory-reset" type="button">Restart Board</button>
      <p id="memory-message" class="mono">Find all matching pairs.</p>
    </div>
    <div id="memory-grid" class="memory-grid"></div>
  `;

  const symbols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].slice(0, profile.memoryPairs);
  const resetButton = document.getElementById('memory-reset');
  const message = document.getElementById('memory-message');
  const grid = document.getElementById('memory-grid');

  let timeoutId = null;
  let cards = [];
  let firstIndex = null;
  let secondIndex = null;
  let lockBoard = false;

  function clearFlipTimeout() {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      timeoutId = null;
    }
  }

  function setupBoard() {
    clearFlipTimeout();
    cards = [...symbols, ...symbols]
      .map((symbol, index) => ({ id: index, symbol, revealed: false, matched: false }))
      .sort(() => Math.random() - 0.5);
    firstIndex = null;
    secondIndex = null;
    lockBoard = false;
    message.textContent = 'Find all matching pairs.';
    renderBoard();
  }

  function renderBoard() {
    grid.innerHTML = cards
      .map((card, index) => {
        const classes = ['memory-card'];
        if (card.revealed) classes.push('revealed');
        if (card.matched) classes.push('matched');

        return `<button class="${classes.join(' ')}" data-index="${index}" type="button">${
          card.revealed || card.matched ? card.symbol : '?'
        }</button>`;
      })
      .join('');

    Array.from(grid.querySelectorAll('.memory-card')).forEach((button) => {
      button.addEventListener('click', () => handleCardClick(Number(button.dataset.index)));
    });
  }

  function handleCardClick(index) {
    if (lockBoard) return;

    const card = cards[index];
    if (!card || card.revealed || card.matched) return;

    card.revealed = true;

    if (firstIndex === null) {
      firstIndex = index;
      renderBoard();
      return;
    }

    secondIndex = index;
    renderBoard();
    lockBoard = true;

    const firstCard = cards[firstIndex];
    const secondCard = cards[secondIndex];

    if (firstCard.symbol === secondCard.symbol) {
      firstCard.matched = true;
      secondCard.matched = true;
      firstIndex = null;
      secondIndex = null;
      lockBoard = false;
      message.textContent = 'Pair matched!';
      renderBoard();

      const allMatched = cards.every((entry) => entry.matched);
      if (allMatched) {
        scores.memoryWins += 1;
        saveScores();
        refreshScoreboard();
        message.textContent = 'Board completed. Nice memory run.';
        addRunEntry('Memory', 'Board completed');
      }
      return;
    }

    message.textContent = 'Not a match. Try again.';
    timeoutId = window.setTimeout(() => {
      cards[firstIndex].revealed = false;
      cards[secondIndex].revealed = false;
      firstIndex = null;
      secondIndex = null;
      lockBoard = false;
      renderBoard();
      message.textContent = 'Find all matching pairs.';
    }, 700);
  }

  resetButton.addEventListener('click', setupBoard);
  setupBoard();

  return () => clearFlipTimeout();
}

function mountSequenceGame() {
  const profile = difficultyProfiles[currentDifficulty];
  stage.innerHTML = `
    <div class="row">
      <button id="sequence-start" class="primary" type="button">Start Game</button>
      <p id="sequence-round" class="mono">Round: 0</p>
    </div>
    <div id="sequence-grid" class="sequence-grid">
      <button class="pad pad-0" data-pad="0" type="button" aria-label="Pad 1"></button>
      <button class="pad pad-1" data-pad="1" type="button" aria-label="Pad 2"></button>
      <button class="pad pad-2" data-pad="2" type="button" aria-label="Pad 3"></button>
      <button class="pad pad-3" data-pad="3" type="button" aria-label="Pad 4"></button>
    </div>
    <p id="sequence-message" class="message">Press start to begin.</p>
  `;

  const startButton = document.getElementById('sequence-start');
  const roundEl = document.getElementById('sequence-round');
  const messageEl = document.getElementById('sequence-message');
  const pads = Array.from(document.querySelectorAll('.pad'));
  const keyMap = {
    '1': 0,
    '2': 1,
    '3': 2,
    '4': 3,
    q: 0,
    w: 1,
    a: 2,
    s: 3,
  };

  let timeouts = [];
  let sequence = [];
  let userIndex = 0;
  let acceptingInput = false;
  let running = false;

  function queueTimeout(callback, delay) {
    const id = window.setTimeout(callback, delay);
    timeouts.push(id);
  }

  function clearAllTimeouts() {
    timeouts.forEach((id) => window.clearTimeout(id));
    timeouts = [];
  }

  function flashPad(index) {
    const pad = pads[index];
    if (!pad) return;

    pad.classList.add('active');
    queueTimeout(() => {
      pad.classList.remove('active');
    }, 260);
  }

  function updateRoundText() {
    roundEl.textContent = `Round: ${sequence.length}`;
  }

  function recordBest() {
    const completedRounds = Math.max(0, sequence.length - 1);
    if (completedRounds > scores.bestSequence) {
      scores.bestSequence = completedRounds;
      saveScores();
      refreshScoreboard();
    }
  }

  function playbackSequence() {
    acceptingInput = false;
    messageEl.textContent = 'Watch the pattern...';

    sequence.forEach((value, index) => {
      queueTimeout(() => flashPad(value), profile.sequenceDelay * (index + 1));
    });

    queueTimeout(() => {
      acceptingInput = true;
      messageEl.textContent = 'Your turn.';
    }, profile.sequenceDelay * (sequence.length + 1));
  }

  function nextRound() {
    if (!running) return;

    userIndex = 0;
    sequence.push(Math.floor(Math.random() * 4));
    updateRoundText();
    playbackSequence();
  }

  function handlePadInput(index) {
    if (!acceptingInput || !running) return;

    flashPad(index);

    if (sequence[userIndex] !== index) {
      messageEl.textContent = 'Incorrect sequence. Press start for a new game.';
      running = false;
      acceptingInput = false;
      startButton.disabled = false;
      addRunEntry('Sequence', `Failed on round ${sequence.length}`);
      recordBest();
      return;
    }

    userIndex += 1;
    if (userIndex === sequence.length) {
      acceptingInput = false;
      messageEl.textContent = 'Correct. Next round...';
      queueTimeout(nextRound, 700);
    }
  }

  pads.forEach((pad, index) => {
    pad.addEventListener('click', () => handlePadInput(index));
  });

  function handleKeyInput(event) {
    if (!running || !acceptingInput) return;
    const mapped = keyMap[event.key.toLowerCase()];
    if (mapped === undefined) return;
    event.preventDefault();
    handlePadInput(mapped);
  }

  window.addEventListener('keydown', handleKeyInput);

  startButton.addEventListener('click', () => {
    clearAllTimeouts();
    sequence = [];
    userIndex = 0;
    running = true;
    startButton.disabled = true;
    messageEl.textContent = 'Get ready...';
    updateRoundText();
    queueTimeout(nextRound, 400);
  });

  return () => {
    clearAllTimeouts();
    window.removeEventListener('keydown', handleKeyInput);
  };
}

function mountPatternGame() {
  const profile = difficultyProfiles[currentDifficulty];
  stage.innerHTML = `
    <div class="row">
      <button id="pattern-start" class="primary" type="button">Start Sprint</button>
      <p id="pattern-timer" class="mono">Time: ${profile.patternDuration.toFixed(1)}s</p>
      <p id="pattern-score" class="mono">Score: 0</p>
    </div>
    <div id="pattern-grid" class="pattern-grid"></div>
    <p id="pattern-message" class="message">Hit glowing tiles fast. Misses cost points. Keyboard grid: 7 8 9 / 4 5 6 / 1 2 3.</p>
  `;

  const startButton = document.getElementById('pattern-start');
  const timerEl = document.getElementById('pattern-timer');
  const scoreEl = document.getElementById('pattern-score');
  const gridEl = document.getElementById('pattern-grid');
  const messageEl = document.getElementById('pattern-message');

  let tiles = [];
  let running = false;
  let score = 0;
  let hotIndex = -1;
  let gameStart = 0;
  let hotSwitchId = null;
  let frameId = null;
  const keyToIndex = {
    '7': 0,
    '8': 1,
    '9': 2,
    '4': 3,
    '5': 4,
    '6': 5,
    '1': 6,
    '2': 7,
    '3': 8,
  };

  function handleTileHit(index) {
    if (!running) return;

    if (index === hotIndex) {
      score += 1;
      scoreEl.textContent = `Score: ${score}`;
      selectNextHot(index);
    } else {
      score = Math.max(0, score - 1);
      scoreEl.textContent = `Score: ${score}`;
    }
  }

  function buildGrid() {
    gridEl.innerHTML = Array.from({ length: 9 }, (_, index) => `<button class="pattern-tile" data-index="${index}" type="button"></button>`).join('');
    tiles = Array.from(gridEl.querySelectorAll('.pattern-tile'));

    tiles.forEach((tile, index) => {
      tile.addEventListener('click', () => handleTileHit(index));
    });
  }

  function selectNextHot(previous = -1) {
    if (!tiles.length) return;

    tiles.forEach((tile) => tile.classList.remove('hot'));

    let next = Math.floor(Math.random() * tiles.length);
    while (next === previous && tiles.length > 1) {
      next = Math.floor(Math.random() * tiles.length);
    }

    hotIndex = next;
    tiles[hotIndex].classList.add('hot');
  }

  function clearTimers() {
    if (hotSwitchId) {
      clearInterval(hotSwitchId);
      hotSwitchId = null;
    }
    if (frameId) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
  }

  function endGame() {
    running = false;
    clearTimers();
    tiles.forEach((tile) => tile.classList.remove('hot'));
    addRunEntry('Pattern Sprint', `Score ${score}`);

    if (score > scores.bestPattern) {
      scores.bestPattern = score;
      saveScores();
      refreshScoreboard();
    }

    startButton.disabled = false;
    messageEl.textContent = `Sprint complete. Final score: ${score}.`;
  }

  function tick() {
    if (!running) return;

    const elapsed = (performance.now() - gameStart) / 1000;
    const remaining = Math.max(0, profile.patternDuration - elapsed);
    timerEl.textContent = `Time: ${remaining.toFixed(1)}s`;

    if (remaining <= 0) {
      endGame();
      return;
    }

    frameId = requestAnimationFrame(tick);
  }

  startButton.addEventListener('click', () => {
    buildGrid();
    score = 0;
    scoreEl.textContent = 'Score: 0';
    timerEl.textContent = `Time: ${profile.patternDuration.toFixed(1)}s`;
    messageEl.textContent = 'Go! Hit glowing tiles quickly.';
    startButton.disabled = true;

    running = true;
    gameStart = performance.now();
    selectNextHot();

    hotSwitchId = setInterval(() => {
      if (!running) return;
      selectNextHot(hotIndex);
    }, profile.patternSwitch);

    frameId = requestAnimationFrame(tick);
  });

  function handlePatternKey(event) {
    if (event.target.matches('input, textarea, select')) return;

    if (!running) {
      if ((event.key === ' ' || event.key === 'Enter') && !startButton.disabled) {
        event.preventDefault();
        startButton.click();
      }
      return;
    }

    const mappedIndex = keyToIndex[event.key];
    if (mappedIndex === undefined) return;
    event.preventDefault();
    handleTileHit(mappedIndex);
  }

  window.addEventListener('keydown', handlePatternKey);

  buildGrid();

  return () => {
    running = false;
    clearTimers();
    window.removeEventListener('keydown', handlePatternKey);
  };
}

tabs.forEach((button) => {
  button.addEventListener('click', () => setGame(button.dataset.game));
});

difficultySelect.addEventListener('change', () => {
  currentDifficulty = difficultySelect.value;
  setGame(document.querySelector('.tab.active')?.dataset.game || 'reaction');
});

window.addEventListener('keydown', (event) => {
  if (event.target.matches('input, textarea, button')) return;
  const shortcutMap = { '1': 'reaction', '2': 'memory', '3': 'sequence', '4': 'pattern' };
  const gameId = shortcutMap[event.key];
  if (gameId) {
    setGame(gameId);
  }
});

resetScoresBtn.addEventListener('click', () => {
  Object.assign(scores, defaultScores());
  saveScores();
  refreshScoreboard();
  gameNote.textContent = 'Scores reset. Start a new run.';
});
exportScoresBtn?.addEventListener('click', exportScores);
importScoresBtn?.addEventListener('click', () => importScoresFile?.click());
importScoresFile?.addEventListener('change', importScores);

refreshScoreboard();
setGame('reaction');
