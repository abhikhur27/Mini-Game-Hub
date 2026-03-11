const stage = document.getElementById('stage');
const tabs = Array.from(document.querySelectorAll('.tab'));
const gameTitle = document.getElementById('game-title');
const gameNote = document.getElementById('game-note');

const bestReactionEl = document.getElementById('best-reaction');
const memoryWinsEl = document.getElementById('memory-wins');
const bestSequenceEl = document.getElementById('best-sequence');

const gameMeta = {
  reaction: {
    title: 'Reaction Timer',
    note: 'Click as soon as the panel turns green. Early clicks are penalties.',
  },
  memory: {
    title: 'Memory Match',
    note: 'Match all symbol pairs in as few errors as possible.',
  },
  sequence: {
    title: 'Sequence Recall',
    note: 'Repeat an increasingly long sequence of colored pads.',
  },
};

const scoreKey = 'mini_game_hub_scores_v2';
const scores = loadScores();
let currentCleanup = () => {};

function loadScores() {
  const fallback = {
    bestReaction: null,
    memoryWins: 0,
    bestSequence: 0,
  };

  try {
    const raw = JSON.parse(localStorage.getItem(scoreKey));
    if (!raw) return fallback;
    return {
      bestReaction: Number.isFinite(raw.bestReaction) ? raw.bestReaction : null,
      memoryWins: Number.isFinite(raw.memoryWins) ? raw.memoryWins : 0,
      bestSequence: Number.isFinite(raw.bestSequence) ? raw.bestSequence : 0,
    };
  } catch (error) {
    return fallback;
  }
}

function saveScores() {
  localStorage.setItem(scoreKey, JSON.stringify(scores));
}

function refreshScoreboard() {
  bestReactionEl.textContent = scores.bestReaction === null ? '-' : `${scores.bestReaction.toFixed(0)} ms`;
  memoryWinsEl.textContent = String(scores.memoryWins);
  bestSequenceEl.textContent = String(scores.bestSequence);
}

function activateTab(gameId) {
  tabs.forEach((button) => {
    button.classList.toggle('active', button.dataset.game === gameId);
  });
}

function setGame(gameId) {
  currentCleanup();
  currentCleanup = () => {};

  activateTab(gameId);
  gameTitle.textContent = gameMeta[gameId].title;
  gameNote.textContent = gameMeta[gameId].note;

  if (gameId === 'reaction') currentCleanup = mountReactionGame();
  if (gameId === 'memory') currentCleanup = mountMemoryGame();
  if (gameId === 'sequence') currentCleanup = mountSequenceGame();
}

function mountReactionGame() {
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

    const delay = 900 + Math.random() * 2200;
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
      return;
    }

    if (phase === 'ready') {
      const reactionTime = performance.now() - startTime;
      phase = 'idle';
      pad.classList.remove('ready');
      resetPadText('Nice. Start another trial.');
      result.textContent = `Reaction: ${reactionTime.toFixed(1)} ms`;

      if (scores.bestReaction === null || reactionTime < scores.bestReaction) {
        scores.bestReaction = reactionTime;
        saveScores();
        refreshScoreboard();
      }
    }
  });

  return () => clearTimer();
}

function mountMemoryGame() {
  stage.innerHTML = `
    <div class="row">
      <button id="memory-reset" type="button">Restart Board</button>
      <p id="memory-message" class="mono">Find all matching pairs.</p>
    </div>
    <div id="memory-grid" class="memory-grid"></div>
  `;

  const symbols = ['A', 'B', 'C', 'D', 'E', 'F'];
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
  stage.innerHTML = `
    <div class="row">
      <button id="sequence-start" class="primary" type="button">Start Game</button>
      <p id="sequence-round" class="mono">Round: 0</p>
    </div>
    <div id="sequence-grid" class="sequence-grid">
      <button class="pad pad-0" data-pad="0" type="button" aria-label="Red pad"></button>
      <button class="pad pad-1" data-pad="1" type="button" aria-label="Orange pad"></button>
      <button class="pad pad-2" data-pad="2" type="button" aria-label="Green pad"></button>
      <button class="pad pad-3" data-pad="3" type="button" aria-label="Blue pad"></button>
    </div>
    <p id="sequence-message" class="message">Press start to begin.</p>
  `;

  const startButton = document.getElementById('sequence-start');
  const roundEl = document.getElementById('sequence-round');
  const messageEl = document.getElementById('sequence-message');
  const pads = Array.from(document.querySelectorAll('.pad'));

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
      queueTimeout(() => flashPad(value), 600 * (index + 1));
    });

    queueTimeout(() => {
      acceptingInput = true;
      messageEl.textContent = 'Your turn.';
    }, 600 * (sequence.length + 1));
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

  return () => clearAllTimeouts();
}

tabs.forEach((button) => {
  button.addEventListener('click', () => setGame(button.dataset.game));
});

refreshScoreboard();
setGame('reaction');