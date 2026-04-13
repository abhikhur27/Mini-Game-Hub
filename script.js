const stage = document.getElementById('stage');
const tabs = Array.from(document.querySelectorAll('.tab'));
const gameTitle = document.getElementById('game-title');
const gameNote = document.getElementById('game-note');

const bestReactionEl = document.getElementById('best-reaction');
const memoryWinsEl = document.getElementById('memory-wins');
const bestSequenceEl = document.getElementById('best-sequence');
const bestPatternEl = document.getElementById('best-pattern');
const totalRunsEl = document.getElementById('total-runs');
const currentStreakEl = document.getElementById('current-streak');
const bestStreakEl = document.getElementById('best-streak');
const achievementList = document.getElementById('achievement-list');
const trainingCoachEl = document.getElementById('training-coach');
const milestoneBoardEl = document.getElementById('milestone-board');
const dailyDrillEl = document.getElementById('daily-drill');
const coverageBoardEl = document.getElementById('coverage-board');
const progressRadarEl = document.getElementById('progress-radar');
const practiceMatrixEl = document.getElementById('practice-matrix');
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
    runCalendar: [],
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
      runCalendar: Array.isArray(raw.runCalendar) ? raw.runCalendar.slice(0, 90) : [],
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
        runCalendar: Array.isArray(imported.runCalendar) ? imported.runCalendar.slice(-90) : [],
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

function renderTrainingCoach() {
  if (!trainingCoachEl) return;

  const recentRuns = scores.runHistory.slice(0, 3).map((entry) => entry.game);
  let focus = 'Reaction Timer';
  let reason = 'You do not have a reaction benchmark yet. Establish a floor before optimizing harder games.';

  if (scores.bestReaction !== null && scores.bestReaction <= 220 && scores.memoryWins < 5) {
    focus = 'Memory Match';
    reason = 'Your reflex baseline is already strong. The cleanest unlock path now is building repeatable board clears.';
  } else if (scores.memoryWins >= 5 && scores.bestSequence < 8) {
    focus = 'Sequence Recall';
    reason = 'Memory fundamentals are in place. The next gap is sustaining a longer working-memory chain.';
  } else if (scores.bestSequence >= 8 && scores.bestPattern < 20) {
    focus = 'Pattern Sprint';
    reason = 'Your recall is solid. Shift into speed and cursor discipline to round out the arcade profile.';
  } else if (scores.totalRuns >= 8) {
    focus = 'Rotation Drill';
    reason = 'You have enough baseline data. Rotate games by weakness so you do not overtrain one mechanic.';
  }

  const trend = recentRuns.length
    ? `Recent focus: ${recentRuns.join(' -> ')}.`
    : 'No recent runs logged yet.';
  trainingCoachEl.innerHTML = `<strong>${focus}</strong><br>${reason}<br>${trend}<br>Difficulty profile: ${currentDifficulty}.`;
}

function renderMilestoneBoard() {
  if (!milestoneBoardEl) return;

  const targets = [];
  if (scores.bestReaction === null || scores.bestReaction > 220) {
    const gap = scores.bestReaction === null ? 'set your first benchmark' : `cut ${(scores.bestReaction - 220).toFixed(0)} ms`;
    targets.push(`Reaction Timer: ${gap} to unlock Lightning Reflex.`);
  }

  if (scores.memoryWins < 5) {
    targets.push(`Memory Match: ${5 - scores.memoryWins} more clean board${5 - scores.memoryWins === 1 ? '' : 's'} for Memory Master.`);
  }

  if (scores.bestSequence < 8) {
    targets.push(`Sequence Recall: push ${8 - scores.bestSequence} more round${8 - scores.bestSequence === 1 ? '' : 's'} for Sequence Savant.`);
  }

  if (scores.bestPattern < 20) {
    targets.push(`Pattern Sprint: add ${20 - scores.bestPattern} more point${20 - scores.bestPattern === 1 ? '' : 's'} for Pattern Sprinter.`);
  }

  milestoneBoardEl.innerHTML = targets.length
    ? targets.map((target) => `<p>${target}</p>`).join('')
    : '<strong>All milestone targets cleared.</strong><br>Rotate games at higher difficulty to keep the profile balanced.';
}

function getDailyDrill() {
  const day = new Date().getDay();
  const drills = [
    {
      game: 'Reaction Timer',
      goal: 'Beat 260 ms once.',
      completed: scores.bestReaction !== null && scores.bestReaction <= 260,
      note: 'Use short resets between attempts so you do not game one hot reaction.',
    },
    {
      game: 'Memory Match',
      goal: 'Clear one board cleanly.',
      completed: scores.memoryWins >= 1,
      note: 'Scan corners first, then collapse uncertainty inward instead of chasing random flips.',
    },
    {
      game: 'Sequence Recall',
      goal: 'Reach round 6.',
      completed: scores.bestSequence >= 6,
      note: 'Speak the pattern rhythm in your head instead of memorizing single colors.',
    },
    {
      game: 'Pattern Sprint',
      goal: 'Score 14 or higher.',
      completed: scores.bestPattern >= 14,
      note: 'Keep your cursor centered and let the next target come to you.',
    },
  ];

  return drills[day % drills.length];
}

function renderDailyDrill() {
  if (!dailyDrillEl) return;

  const drill = getDailyDrill();
  dailyDrillEl.innerHTML = `
    <strong>${drill.game}</strong><br>
    Goal: ${drill.goal}<br>
    Status: ${drill.completed ? 'Already cleared on this profile.' : 'Still open.'}<br>
    ${drill.note}
  `;
}

function renderCoverageBoard() {
  if (!coverageBoardEl) return;

  const recentCounts = scores.runHistory.reduce((acc, entry) => {
    const normalized = String(entry.game || '').toLowerCase();
    if (normalized.includes('reaction')) acc.reaction += 1;
    if (normalized.includes('memory')) acc.memory += 1;
    if (normalized.includes('sequence')) acc.sequence += 1;
    if (normalized.includes('pattern')) acc.pattern += 1;
    return acc;
  }, { reaction: 0, memory: 0, sequence: 0, pattern: 0 });

  const rows = [
    { label: 'Reaction Timer', runs: recentCounts.reaction, status: scores.bestReaction !== null ? `${scores.bestReaction.toFixed(0)} ms best` : 'No benchmark yet' },
    { label: 'Memory Match', runs: recentCounts.memory, status: scores.memoryWins > 0 ? `${scores.memoryWins} win${scores.memoryWins === 1 ? '' : 's'}` : 'No clears yet' },
    { label: 'Sequence Recall', runs: recentCounts.sequence, status: scores.bestSequence > 0 ? `Round ${scores.bestSequence} best` : 'No sequence run yet' },
    { label: 'Pattern Sprint', runs: recentCounts.pattern, status: scores.bestPattern > 0 ? `${scores.bestPattern} point best` : 'No sprint run yet' },
  ];

  const coldest = [...rows].sort((a, b) => a.runs - b.runs)[0];
  coverageBoardEl.innerHTML = `
    ${rows.map((row) => `<p><strong>${row.label}:</strong> ${row.runs} recent run${row.runs === 1 ? '' : 's'} | ${row.status}</p>`).join('')}
    <p><strong>Coverage cue:</strong> ${coldest.runs === 0 ? `You have not touched ${coldest.label} recently.` : `${coldest.label} is your least-played recent lane.`}</p>
  `;
}

function renderProgressRadar() {
  if (!progressRadarEl) return;

  const rows = [
    {
      label: 'Reaction Timer',
      value: scores.bestReaction === null ? 0 : Math.max(0, Math.min(100, ((320 - scores.bestReaction) / 100) * 100)),
      detail: scores.bestReaction === null ? 'No benchmark yet' : `${scores.bestReaction.toFixed(0)} ms best`,
    },
    {
      label: 'Memory Match',
      value: Math.min(100, (scores.memoryWins / 5) * 100),
      detail: `${scores.memoryWins}/5 clean clears`,
    },
    {
      label: 'Sequence Recall',
      value: Math.min(100, (scores.bestSequence / 8) * 100),
      detail: `Round ${scores.bestSequence}/8 target`,
    },
    {
      label: 'Pattern Sprint',
      value: Math.min(100, (scores.bestPattern / 20) * 100),
      detail: `${scores.bestPattern}/20 target`,
    },
  ];

  const averageReadiness = rows.reduce((sum, row) => sum + row.value, 0) / rows.length;
  const coldest = [...rows].sort((a, b) => a.value - b.value)[0];

  progressRadarEl.innerHTML = `
    ${rows
      .map(
        (row) => `
          <div class="progress-row">
            <div class="progress-meta">
              <strong>${row.label}</strong>
              <span>${Math.round(row.value)}%</span>
            </div>
            <div class="progress-track"><div class="progress-fill" style="width: ${row.value}%;"></div></div>
            <div>${row.detail}</div>
          </div>
        `
      )
      .join('')}
    <p><strong>Profile balance:</strong> ${averageReadiness >= 85 ? 'Well-rounded arcade profile.' : averageReadiness >= 55 ? 'Solid base with one clear weakness.' : 'Still building baseline coverage.'}</p>
    <p><strong>Weakest lane:</strong> ${coldest.label} is furthest from its milestone target.</p>
  `;
}

function renderPracticeMatrix() {
  if (!practiceMatrixEl) return;

  const today = new Date();
  const days = [];
  for (let offset = 13; offset >= 0; offset -= 1) {
    const day = new Date(today);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - offset);
    days.push(day.toISOString().slice(0, 10));
  }

  const counts = days.map((day) => scores.runCalendar.filter((entry) => entry === day).length);
  const hottest = Math.max(0, ...counts);
  const activeDays = counts.filter((count) => count > 0).length;
  const longestGap = counts.reduce(
    (state, count) => {
      if (count === 0) {
        return {
          current: state.current + 1,
          longest: Math.max(state.longest, state.current + 1),
        };
      }
      return { current: 0, longest: state.longest };
    },
    { current: 0, longest: 0 }
  ).longest;

  practiceMatrixEl.innerHTML = `
    <div class="matrix-row">
      ${days
        .map((day, index) => {
          const count = counts[index];
          const fill = hottest ? Math.round((count / hottest) * 100) : 0;
          return `<span class="matrix-cell" title="${day}: ${count} run${count === 1 ? '' : 's'}" style="--fill:${fill}%">${day.slice(5)}</span>`;
        })
        .join('')}
    </div>
    <p><strong>Active days:</strong> ${activeDays}/14.</p>
    <p><strong>Longest recent gap:</strong> ${longestGap} day${longestGap === 1 ? '' : 's'}.</p>
    <p><strong>Coach cue:</strong> ${
      activeDays >= 8
        ? 'Consistency is solid. Use drills to target the weakest lane.'
        : 'Your practice rhythm is patchy. Short daily reps will raise all-game scores faster than marathon sessions.'
    }</p>
  `;
}

function formatRunDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function computeStreaks() {
  const days = [...new Set(scores.runCalendar)].sort();
  if (!days.length) {
    return { current: 0, best: 0 };
  }

  let best = 1;
  let currentRun = 1;
  for (let index = 1; index < days.length; index += 1) {
    const prev = new Date(`${days[index - 1]}T00:00:00`);
    const current = new Date(`${days[index]}T00:00:00`);
    const deltaDays = Math.round((current - prev) / (1000 * 60 * 60 * 24));
    if (deltaDays === 1) {
      currentRun += 1;
      best = Math.max(best, currentRun);
    } else if (deltaDays > 1) {
      currentRun = 1;
    }
  }

  let current = 1;
  const today = formatRunDate();
  const yesterday = formatRunDate(new Date(Date.now() - 1000 * 60 * 60 * 24));
  const mostRecent = days[days.length - 1];
  if (mostRecent !== today && mostRecent !== yesterday) {
    current = 0;
  } else {
    for (let index = days.length - 1; index > 0; index -= 1) {
      const prev = new Date(`${days[index - 1]}T00:00:00`);
      const next = new Date(`${days[index]}T00:00:00`);
      const deltaDays = Math.round((next - prev) / (1000 * 60 * 60 * 24));
      if (deltaDays === 1) {
        current += 1;
      } else {
        break;
      }
    }
  }

  return { current, best };
}

function addRunEntry(game, detail) {
  scores.totalRuns += 1;
  const today = formatRunDate();
  if (!scores.runCalendar.includes(today)) {
    scores.runCalendar.push(today);
    scores.runCalendar = scores.runCalendar.slice(-90);
  }
  scores.runHistory.unshift({
    time: new Date().toLocaleTimeString(),
    date: today,
    game,
    detail,
  });

  scores.runHistory = scores.runHistory.slice(0, 10);
  saveScores();
  renderRunHistory();
}

function refreshScoreboard() {
  const streaks = computeStreaks();
  bestReactionEl.textContent = scores.bestReaction === null ? '-' : `${scores.bestReaction.toFixed(0)} ms`;
  memoryWinsEl.textContent = String(scores.memoryWins);
  bestSequenceEl.textContent = String(scores.bestSequence);
  bestPatternEl.textContent = String(scores.bestPattern);
  totalRunsEl.textContent = String(scores.totalRuns);
  currentStreakEl.textContent = `${streaks.current} day${streaks.current === 1 ? '' : 's'}`;
  bestStreakEl.textContent = `${streaks.best} day${streaks.best === 1 ? '' : 's'}`;
  renderAchievements();
  renderRunHistory();
  renderTrainingCoach();
  renderMilestoneBoard();
  renderDailyDrill();
  renderCoverageBoard();
  renderProgressRadar();
  renderPracticeMatrix();
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
