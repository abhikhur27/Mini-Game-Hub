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
const achievementRouteBoardEl = document.getElementById('achievement-route-board');
const dailyDrillEl = document.getElementById('daily-drill');
const coverageBoardEl = document.getElementById('coverage-board');
const practiceWeekEl = document.getElementById('practice-week');
const progressRadarEl = document.getElementById('progress-radar');
const practiceMatrixEl = document.getElementById('practice-matrix');
const consistencyForecastEl = document.getElementById('consistency-forecast');
const recoveryDrillEl = document.getElementById('recovery-drill');
const skillBalanceEl = document.getElementById('skill-balance');
const trainingPlanEl = document.getElementById('training-plan');
const sessionChallengeEl = document.getElementById('session-challenge');
const gauntletPlannerEl = document.getElementById('gauntlet-planner');
const portfolioHandoffEl = document.getElementById('portfolio-handoff');
const momentumContractEl = document.getElementById('momentum-contract');
const crossTrainingPairEl = document.getElementById('cross-training-pair');
const plateauBreakerEl = document.getElementById('plateau-breaker');
const focusRiskBoardEl = document.getElementById('focus-risk-board');
const difficultyDebtBoardEl = document.getElementById('difficulty-debt-board');
const sessionHeatBoardEl = document.getElementById('session-heat-board');
const practiceDriftBoardEl = document.getElementById('practice-drift-board');
const nextBreakthroughBoardEl = document.getElementById('next-breakthrough-board');
const difficultyBriefEl = document.getElementById('difficulty-brief');
const difficultyLaneBoardEl = document.getElementById('difficulty-lane-board');
const breakthroughBoardEl = document.getElementById('breakthrough-board');
const gameTipsEl = document.getElementById('game-tips');
const runHistoryEl = document.getElementById('run-history');
const resetScoresBtn = document.getElementById('reset-scores');
const shareChallengeBtn = document.getElementById('share-challenge');
const copyTrainingBriefBtn = document.getElementById('copy-training-brief');
const copyRecoveryDrillBtn = document.getElementById('copy-recovery-drill');
const copyGauntletPlanBtn = document.getElementById('copy-gauntlet-plan');
const exportRunLogBtn = document.getElementById('export-run-log');
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
let initialGameId = 'reaction';

function syncUrlState(gameId = document.querySelector('.tab.active')?.dataset.game || initialGameId) {
  const params = new URLSearchParams(window.location.search);
  params.set('game', gameId);
  params.set('difficulty', currentDifficulty);
  const nextUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, '', nextUrl);
}

function hydrateFromUrlState() {
  const params = new URLSearchParams(window.location.search);
  const requestedDifficulty = params.get('difficulty');
  if (requestedDifficulty && difficultyProfiles[requestedDifficulty]) {
    currentDifficulty = requestedDifficulty;
    difficultySelect.value = requestedDifficulty;
  }

  const requestedGame = params.get('game');
  if (requestedGame && gameMeta[requestedGame]) {
    initialGameId = requestedGame;
  }
}

const difficultyProfiles = {
  casual: { reactionMin: 1200, reactionRange: 2400, memoryPairs: 5, sequenceDelay: 720, patternDuration: 28, patternSwitch: 720 },
  standard: { reactionMin: 900, reactionRange: 2200, memoryPairs: 6, sequenceDelay: 600, patternDuration: 25, patternSwitch: 620 },
  expert: { reactionMin: 650, reactionRange: 1700, memoryPairs: 8, sequenceDelay: 470, patternDuration: 22, patternSwitch: 480 },
};

function defaultDifficultyBests() {
  return {
    casual: { reaction: null, memory: 0, sequence: 0, pattern: 0 },
    standard: { reaction: null, memory: 0, sequence: 0, pattern: 0 },
    expert: { reaction: null, memory: 0, sequence: 0, pattern: 0 },
  };
}

function defaultScores() {
  return {
    bestReaction: null,
    memoryWins: 0,
    bestSequence: 0,
    bestPattern: 0,
    difficultyBests: defaultDifficultyBests(),
    runHistory: [],
    totalRuns: 0,
    runCalendar: [],
  };
}

function normalizeDifficultyBests(raw) {
  const fallback = defaultDifficultyBests();
  Object.keys(fallback).forEach((difficulty) => {
    const entry = raw?.[difficulty] || {};
    fallback[difficulty] = {
      reaction: Number.isFinite(entry.reaction) ? entry.reaction : null,
      memory: Number.isFinite(entry.memory) ? entry.memory : 0,
      sequence: Number.isFinite(entry.sequence) ? entry.sequence : 0,
      pattern: Number.isFinite(entry.pattern) ? entry.pattern : 0,
    };
  });
  return fallback;
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
      difficultyBests: normalizeDifficultyBests(raw.difficultyBests),
      runHistory: Array.isArray(raw.runHistory)
        ? raw.runHistory.slice(0, 10).map((entry) => ({
          ...entry,
          difficulty: typeof entry?.difficulty === 'string' && difficultyProfiles[entry.difficulty]
            ? entry.difficulty
            : 'standard',
        }))
        : [],
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

function csvEscape(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
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

function exportRunLog() {
  if (!scores.runHistory.length) {
    gameNote.textContent = 'Log a few runs before exporting the run history.';
    return;
  }

  const rows = ['date,time,game,difficulty,detail'];
  scores.runHistory.forEach((entry) => {
    rows.push([
      csvEscape(entry.date),
      csvEscape(entry.time),
      csvEscape(entry.game),
      csvEscape(entry.difficulty || 'standard'),
      csvEscape(entry.detail),
    ].join(','));
  });

  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `mini-game-hub-run-log-${currentDifficulty}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
  gameNote.textContent = 'Exported the current run log as CSV.';
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
        difficultyBests: normalizeDifficultyBests(imported.difficultyBests),
        runHistory: Array.isArray(imported.runHistory)
          ? imported.runHistory.slice(0, 10).map((entry) => ({
            ...entry,
            difficulty: typeof entry?.difficulty === 'string' && difficultyProfiles[entry.difficulty]
              ? entry.difficulty
              : 'standard',
          }))
          : [],
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
    .map((entry) => `<li>${entry.time} | ${entry.game} (${entry.difficulty || 'standard'}): ${entry.detail}</li>`)
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

function renderAchievementRouteBoard() {
  if (!achievementRouteBoardEl) return;

  const routes = [];
  if (scores.bestReaction === null || scores.bestReaction > 220) {
    const gap = scores.bestReaction === null ? 999 : scores.bestReaction - 220;
    routes.push({
      gap,
      title: 'Lightning Reflex',
      lane: 'Reaction Timer',
      move: scores.bestReaction === null ? 'Log one baseline run, then start chasing sub-220 ms.' : `Trim ${Math.ceil(scores.bestReaction - 220)} ms from the current best time.`,
      watch: 'Short attempts with full reset beat spam clicking here.',
    });
  }
  if (scores.memoryWins < 5) {
    routes.push({
      gap: 5 - scores.memoryWins,
      title: 'Memory Master',
      lane: 'Memory Match',
      move: `Clear ${5 - scores.memoryWins} more board${5 - scores.memoryWins === 1 ? '' : 's'} to lock the achievement.`,
      watch: 'Preserve corners and known pairs so each flip reduces uncertainty instead of restarting the search.',
    });
  }
  if (scores.bestSequence < 8) {
    routes.push({
      gap: 8 - scores.bestSequence,
      title: 'Sequence Savant',
      lane: 'Sequence Recall',
      move: `Push ${8 - scores.bestSequence} more round${8 - scores.bestSequence === 1 ? '' : 's'} from the current ceiling.`,
      watch: 'Chunk the rhythm, not the colors one-by-one.',
    });
  }
  if (scores.bestPattern < 20) {
    routes.push({
      gap: 20 - scores.bestPattern,
      title: 'Pattern Sprinter',
      lane: 'Pattern Sprint',
      move: `Find ${20 - scores.bestPattern} more point${20 - scores.bestPattern === 1 ? '' : 's'} on the best run.`,
      watch: 'Keep the cursor centered so travel distance stays low.',
    });
  }

  if (!routes.length) {
    achievementRouteBoardEl.innerHTML = '<strong>Full achievement sweep complete.</strong><br>Use expert difficulty and the gauntlet planner to keep the profile from narrowing into one comfort lane.';
    return;
  }

  routes.sort((a, b) => a.gap - b.gap);
  const bestRoute = routes[0];
  achievementRouteBoardEl.innerHTML = `
    <strong>${bestRoute.title}</strong><br>
    Fastest lane: ${bestRoute.lane}<br>
    Next move: ${bestRoute.move}<br>
    ${bestRoute.watch}
  `;
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

function renderPracticeWeek() {
  if (!practiceWeekEl) return;

  const today = new Date();
  const dayKeys = Array.from({ length: 7 }, (_, offset) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (6 - offset));
    return day.toISOString().slice(0, 10);
  });

  const dayCounts = dayKeys.map((key) => scores.runHistory.filter((entry) => entry.date === key).length);
  const maxCount = Math.max(1, ...dayCounts);
  const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const strongestIndex = dayCounts.indexOf(Math.max(...dayCounts));
  const activeDays = dayCounts.filter((count) => count > 0).length;

  practiceWeekEl.innerHTML = `
    <div class="week-strip">
      ${dayCounts
        .map((count, index) => {
          const intensity = count === 0 ? 0.12 : 0.28 + (count / maxCount) * 0.52;
          return `<span class="week-cell" title="${labels[index]}: ${count} run${count === 1 ? '' : 's'}" style="background: rgba(56, 189, 248, ${intensity.toFixed(2)});">${labels[index]}</span>`;
        })
        .join('')}
    </div>
    <p><strong>Coverage:</strong> ${activeDays}/7 active day${activeDays === 1 ? '' : 's'} in the last week.</p>
    <p><strong>Peak day:</strong> ${dayCounts[strongestIndex] ? labels[strongestIndex] : 'None yet'} with ${dayCounts[strongestIndex] || 0} run${dayCounts[strongestIndex] === 1 ? '' : 's'}.</p>
  `;
}

function renderDifficultyBrief() {
  if (!difficultyBriefEl) return;

  const profile = difficultyProfiles[currentDifficulty];
  const targets = {
    reaction: scores.bestReaction === null ? `open with a clean sub-${profile.reactionMin + Math.round(profile.reactionRange * 0.35)} ms run` : `best reaction is ${Math.round(scores.bestReaction)} ms`,
    memory: `memory boards expand to ${profile.memoryPairs} pair${profile.memoryPairs === 1 ? '' : 's'}`,
    sequence: `sequence playback drops to ${profile.sequenceDelay} ms between flashes`,
    pattern: `pattern sprint lasts ${profile.patternDuration}s with ${profile.patternSwitch} ms target shifts`,
  };

  difficultyBriefEl.innerHTML = [
    `<p><strong>${currentDifficulty[0].toUpperCase()}${currentDifficulty.slice(1)} profile:</strong> difficulty changes every game, not just score targets.</p>`,
    `<p><strong>Reaction:</strong> ${targets.reaction}.</p>`,
    `<p><strong>Memory / Sequence:</strong> ${targets.memory}; ${targets.sequence}.</p>`,
    `<p><strong>Pattern Sprint:</strong> ${targets.pattern}. Use this profile when sharing a challenge link so the run conditions are explicit.</p>`,
  ].join('');
}

function updateDifficultyBest(track, value) {
  const lane = scores.difficultyBests[currentDifficulty];
  if (!lane) return;

  if (track === 'reaction') {
    lane.reaction = lane.reaction === null ? value : Math.min(lane.reaction, value);
    return;
  }

  if (track === 'memory') {
    lane.memory += value;
    return;
  }

  lane[track] = Math.max(lane[track] || 0, value);
}

function renderDifficultyLaneBoard() {
  if (!difficultyLaneBoardEl) return;

  const lane = scores.difficultyBests[currentDifficulty] || defaultDifficultyBests()[currentDifficulty];
  const strongest = Object.entries(scores.difficultyBests)
    .map(([difficulty, values]) => ({
      difficulty,
      score:
        (values.reaction === null ? 0 : Math.max(0, 360 - values.reaction)) +
        values.memory * 18 +
        values.sequence * 16 +
        values.pattern * 10,
    }))
    .sort((a, b) => b.score - a.score)[0];

  difficultyLaneBoardEl.innerHTML = [
    `<p><strong>${currentDifficulty[0].toUpperCase()}${currentDifficulty.slice(1)} lane:</strong> shareable conditions now keep their own personal-best shelf.</p>`,
    `<p><strong>Reaction:</strong> ${lane.reaction === null ? 'No benchmark yet' : `${Math.round(lane.reaction)} ms best`} | <strong>Memory:</strong> ${lane.memory} clear${lane.memory === 1 ? '' : 's'}</p>`,
    `<p><strong>Sequence:</strong> Round ${lane.sequence} | <strong>Pattern Sprint:</strong> ${lane.pattern} point${lane.pattern === 1 ? '' : 's'}</p>`,
    `<p><strong>Cross-profile cue:</strong> ${strongest?.difficulty === currentDifficulty ? 'This is currently your strongest conditions profile.' : `Your strongest lane today is ${strongest?.difficulty || 'not set yet'}, so this profile still has room to grow.`}</p>`,
  ].join('');
}

function renderBreakthroughBoard() {
  if (!breakthroughBoardEl) return;

  const lane = scores.difficultyBests[currentDifficulty] || defaultDifficultyBests()[currentDifficulty];
  const options = [
    { label: 'Reaction Timer', gap: lane.reaction === null ? 35 : Math.max(12, Math.round((lane.reaction - 180) / 2)), cue: lane.reaction === null ? 'post your first clean timed run' : `trim about ${Math.max(12, Math.round((lane.reaction - 180) / 2))} ms from your current best` },
    { label: 'Memory Match', gap: Math.max(1, 5 - lane.memory), cue: `add ${Math.max(1, 5 - lane.memory)} more clean win${Math.max(1, 5 - lane.memory) === 1 ? '' : 's'} at this difficulty` },
    { label: 'Sequence Recall', gap: Math.max(1, 8 - lane.sequence), cue: `push ${Math.max(1, 8 - lane.sequence)} more round${Math.max(1, 8 - lane.sequence) === 1 ? '' : 's'} deeper` },
    { label: 'Pattern Sprint', gap: Math.max(1, 20 - lane.pattern), cue: `find ${Math.max(1, 20 - lane.pattern)} more point${Math.max(1, 20 - lane.pattern) === 1 ? '' : 's'} in one run` },
  ].sort((a, b) => a.gap - b.gap);

  const easiest = options[0];
  breakthroughBoardEl.innerHTML = `<strong>Fastest next breakthrough:</strong> ${easiest.label}. ${easiest.cue}.`;
}

function renderTrainingPlan() {
  if (!trainingPlanEl) return;

  const plan = [];
  if (scores.bestReaction === null) {
    plan.push('1. Set a reaction baseline with three back-to-back trials.');
  } else if (scores.bestReaction > 220) {
    plan.push(`1. Reaction Timer: trim ${(scores.bestReaction - 220).toFixed(0)} ms to reach the reflex unlock pace.`);
  } else {
    plan.push('1. Reaction Timer: keep the reflex lane warm with one calibration run.');
  }

  if (scores.memoryWins < 5) {
    plan.push(`2. Memory Match: bank ${5 - scores.memoryWins} more clean win${5 - scores.memoryWins === 1 ? '' : 's'} for consistency.`);
  } else if (scores.bestSequence < 8) {
    plan.push(`2. Sequence Recall: push ${8 - scores.bestSequence} more round${8 - scores.bestSequence === 1 ? '' : 's'} to widen working-memory range.`);
  } else {
    plan.push('2. Sequence Recall: keep rhythm sharp with one full-depth attempt.');
  }

  if (scores.bestPattern < 20) {
    plan.push(`3. Pattern Sprint: add ${20 - scores.bestPattern} more point${20 - scores.bestPattern === 1 ? '' : 's'} to round out the arcade profile.`);
  } else {
    plan.push('3. Pattern Sprint: close the session with one speed run to protect cursor accuracy.');
  }

  trainingPlanEl.innerHTML = plan.map((step) => `<p>${step}</p>`).join('');
}

function renderSessionChallenge() {
  if (!sessionChallengeEl) return;

  const lanes = [
    {
      label: 'Reaction Timer',
      score: scores.bestReaction === null ? 0 : Math.max(0, Math.min(100, ((320 - scores.bestReaction) / 100) * 100)),
      challenge:
        scores.bestReaction === null
          ? 'Run three trials and record your first benchmark.'
          : `Beat ${(Math.max(180, scores.bestReaction - 15)).toFixed(0)} ms once.`,
    },
    {
      label: 'Memory Match',
      score: Math.min(100, (scores.memoryWins / 5) * 100),
      challenge: `Clear ${Math.max(1, 5 - scores.memoryWins)} more clean board${Math.max(1, 5 - scores.memoryWins) === 1 ? '' : 's'}.`,
    },
    {
      label: 'Sequence Recall',
      score: Math.min(100, (scores.bestSequence / 8) * 100),
      challenge: `Reach round ${Math.max(4, scores.bestSequence + 1)} on ${currentDifficulty} difficulty.`,
    },
    {
      label: 'Pattern Sprint',
      score: Math.min(100, (scores.bestPattern / 20) * 100),
      challenge: `Post a ${Math.max(12, scores.bestPattern + 2)} point sprint without a long idle stretch.`,
    },
  ];

  const weakest = [...lanes].sort((a, b) => a.score - b.score)[0];
  const streaks = computeStreaks();
  sessionChallengeEl.innerHTML = `
    <p><strong>Focus lane:</strong> ${weakest.label}</p>
    <p><strong>Challenge:</strong> ${weakest.challenge}</p>
    <p><strong>Why now:</strong> It is your lowest-readiness lane on the current profile.</p>
    <p><strong>Cadence cue:</strong> ${streaks.current >= 3 ? 'You have momentum; use this session to close a weakness.' : 'Build a short streak first, then push score targets.'}</p>
  `;
}

function renderGauntletPlanner() {
  if (!gauntletPlannerEl) return;

  const sequenceTarget = Math.max(4, Math.min(10, (scores.bestSequence || 0) + 1));
  const patternTarget = Math.max(12, Math.min(24, (scores.bestPattern || 0) + 3));
  const reactionTarget = scores.bestReaction === null ? 'set a first benchmark' : `beat ${Math.max(180, scores.bestReaction - 12).toFixed(0)} ms`;
  const remainingMemoryWins = Math.max(0, 5 - scores.memoryWins);
  const memoryTarget = remainingMemoryWins === 0 ? 'clear one board cleanly' : `bank ${Math.min(2, remainingMemoryWins)} more clean win${Math.min(2, remainingMemoryWins) === 1 ? '' : 's'}`;
  const weakestLaneNote = (skillBalanceEl?.textContent || '').includes('weakest')
    ? 'Keep extra reps on the weakest lane called out above.'
    : 'Rotate through all four games once before replaying a favorite.';

  gauntletPlannerEl.innerHTML = [
    `1. Reaction Timer: ${reactionTarget}.`,
    `2. Memory Match: ${memoryTarget}.`,
    `3. Sequence Recall: reach round ${sequenceTarget}.`,
    `4. Pattern Sprint: finish at ${patternTarget}+ points.`,
    weakestLaneNote,
    `Difficulty lock: ${currentDifficulty}.`,
  ]
    .map((line) => `<p>${line}</p>`)
    .join('');
}

function renderPortfolioHandoff() {
  if (!portfolioHandoffEl) return;

  const readinessRows = [
    { label: 'Reaction Timer', value: scores.bestReaction === null ? 0 : Math.max(0, Math.min(100, ((320 - scores.bestReaction) / 100) * 100)) },
    { label: 'Memory Match', value: Math.min(100, (scores.memoryWins / 5) * 100) },
    { label: 'Sequence Recall', value: Math.min(100, (scores.bestSequence / 8) * 100) },
    { label: 'Pattern Sprint', value: Math.min(100, (scores.bestPattern / 20) * 100) },
  ];
  const strongest = [...readinessRows].sort((a, b) => b.value - a.value)[0];
  const weakest = [...readinessRows].sort((a, b) => a.value - b.value)[0];
  const recentGames = [...new Set(scores.runHistory.slice(0, 4).map((entry) => entry.game))]
    .map((game) => gameMeta[game]?.title || game)
    .filter(Boolean);

  portfolioHandoffEl.innerHTML = `
    <p><strong>Showcase lane:</strong> ${strongest.label} is currently the clearest thing to open first on ${currentDifficulty}.</p>
    <p><strong>Weak lane:</strong> ${weakest.label} still has the most visible headroom before this profile reads balanced.</p>
    <p><strong>Recent route:</strong> ${recentGames.length ? recentGames.join(' -> ') : 'No recent route yet. Start a game to seed one.'}</p>
    <p><strong>Handoff cue:</strong> ${scores.totalRuns >= 8 ? 'The profile is broad enough to share as a deliberate arcade snapshot.' : 'Add a few more cross-game reps before exporting this as a balanced portfolio artifact.'}</p>
  `;
}

function renderMomentumContract() {
  if (!momentumContractEl) return;

  const readinessRows = [
    { label: 'Reaction Timer', value: scores.bestReaction === null ? 0 : Math.max(0, Math.min(100, ((320 - scores.bestReaction) / 100) * 100)) },
    { label: 'Memory Match', value: Math.min(100, (scores.memoryWins / 5) * 100) },
    { label: 'Sequence Recall', value: Math.min(100, (scores.bestSequence / 8) * 100) },
    { label: 'Pattern Sprint', value: Math.min(100, (scores.bestPattern / 20) * 100) },
  ];
  const weakest = [...readinessRows].sort((a, b) => a.value - b.value)[0];
  const streaks = computeStreaks();
  const contract =
    streaks.current >= 4
      ? `Protect the streak with one ${weakest.label} rep before replaying your favorite game.`
      : streaks.current >= 2
        ? `Convert the mini-streak into a full practice week by opening with ${weakest.label}.`
        : `Start a new streak tonight with one low-friction ${weakest.label} run.`;

  momentumContractEl.innerHTML = `
    <p><strong>Momentum contract</strong></p>
    <p>${contract}</p>
    <p><strong>Current streak:</strong> ${streaks.current} day${streaks.current === 1 ? '' : 's'} | <strong>Best:</strong> ${streaks.best} day${streaks.best === 1 ? '' : 's'}.</p>
    <p><strong>Weak lane:</strong> ${weakest.label} still has the most room to move this profile.</p>
  `;
}

function renderCrossTrainingPair() {
  if (!crossTrainingPairEl) return;

  const lanes = [
    { key: 'reaction', label: 'Reaction Timer', value: scores.bestReaction === null ? 0 : Math.max(0, Math.min(100, ((320 - scores.bestReaction) / 100) * 100)) },
    { key: 'memory', label: 'Memory Match', value: Math.min(100, (scores.memoryWins / 5) * 100) },
    { key: 'sequence', label: 'Sequence Recall', value: Math.min(100, (scores.bestSequence / 8) * 100) },
    { key: 'pattern', label: 'Pattern Sprint', value: Math.min(100, (scores.bestPattern / 20) * 100) },
  ];
  const weakest = [...lanes].sort((a, b) => a.value - b.value)[0];
  const strongest = [...lanes].sort((a, b) => b.value - a.value)[0];
  const recent = scores.runHistory.slice(0, 6);
  const hotCounts = recent.reduce((acc, entry) => {
    acc[entry.game] = (acc[entry.game] || 0) + 1;
    return acc;
  }, {});
  const dominant = Object.entries(hotCounts).sort((a, b) => b[1] - a[1])[0];
  const dominantLabel = dominant ? gameMeta[dominant[0]]?.title || dominant[0] : 'No hot lane yet';

  crossTrainingPairEl.innerHTML = `
    <p><strong>Open with:</strong> ${weakest.label}</p>
    <p><strong>Follow with:</strong> ${strongest.label}</p>
    <p><strong>Why this pair:</strong> The first run raises the weakest readiness lane; the second lets you consolidate the session with your cleanest strength.</p>
    <p><strong>Heat check:</strong> ${dominant ? `${dominantLabel} is currently the hottest recent lane.` : 'Log a few runs first to give the pair a stronger recent-history context.'}</p>
  `;
}

function renderPlateauBreaker() {
  if (!plateauBreakerEl) return;

  const recent = scores.runHistory.slice(0, 5);
  const counts = recent.reduce((acc, entry) => {
    acc[entry.game] = (acc[entry.game] || 0) + 1;
    return acc;
  }, {});
  const repeated = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const readinessRows = [
    { key: 'reaction', label: 'Reaction Timer', value: scores.bestReaction === null ? 0 : Math.max(0, Math.min(100, ((320 - scores.bestReaction) / 100) * 100)), drill: 'run three back-to-back starts and only keep sub-260 ms reactions' },
    { key: 'memory', label: 'Memory Match', value: Math.max(0, Math.min(100, (scores.memoryWins / 5) * 100)), drill: 'clear one board with zero misses before rotating away' },
    { key: 'sequence', label: 'Sequence Recall', value: Math.max(0, Math.min(100, (scores.bestSequence / 8) * 100)), drill: 'push one round past your current ceiling, then stop' },
    { key: 'pattern', label: 'Pattern Sprint', value: Math.max(0, Math.min(100, (scores.bestPattern / 20) * 100)), drill: 'play two short sprints and only count runs with fewer than three misses' },
  ];
  const weakest = [...readinessRows].sort((a, b) => a.value - b.value)[0];
  const repeatedLabel = repeated ? gameMeta[repeated[0]]?.title || repeated[0] : 'none yet';
  const plateauCue =
    repeated && repeated[1] >= 3
      ? `You have spent ${repeated[1]} of the last ${recent.length} runs on ${repeatedLabel}, so the profile is starting to narrow.`
      : 'Recent reps are not overconcentrated yet, so the safest plateau breaker is still your weakest lane.';

  plateauBreakerEl.innerHTML = `
    <p><strong>Plateau breaker</strong></p>
    <p>${plateauCue}</p>
    <p><strong>Break move:</strong> switch to ${weakest.label} on ${currentDifficulty} and ${weakest.drill}.</p>
    <p><strong>Why this works:</strong> it interrupts repetition without abandoning the lane with the most headroom.</p>
  `;
}

function renderNextBreakthroughBoard() {
  if (!nextBreakthroughBoardEl) return;

  const profile = difficultyProfiles[currentDifficulty] || difficultyProfiles.standard;
  const candidates = [];

  candidates.push({
    label: 'Reaction Timer',
    gap: Math.max(0, 250 - scores.reactionBest),
    move: scores.reactionBest >= 250
      ? `Already inside the fast lane at ${scores.reactionBest} ms. Protect consistency on the ${profile.reactionLabel} setup.`
      : `Cut ${Math.max(1, 250 - scores.reactionBest)} ms off the current best to re-enter the fast lane.`,
  });
  candidates.push({
    label: 'Memory Match',
    gap: Math.max(0, 5 - scores.memoryWins),
    move: scores.memoryWins >= 5
      ? 'Memory Master is banked. Chase a cleaner board on the larger layout.'
      : `Clear ${Math.max(1, 5 - scores.memoryWins)} more clean board${Math.max(1, 5 - scores.memoryWins) === 1 ? '' : 's'} to close the achievement gap.`,
  });
  candidates.push({
    label: 'Sequence Recall',
    gap: Math.max(0, 10 - scores.sequenceBest),
    move: scores.sequenceBest >= 10
      ? `The round ceiling is already ${scores.sequenceBest}. Hold depth under the ${profile.sequenceLength}-step cadence.`
      : `Add ${Math.max(1, 10 - scores.sequenceBest)} more round${Math.max(1, 10 - scores.sequenceBest) === 1 ? '' : 's'} before rotating away.`,
  });
  candidates.push({
    label: 'Pattern Sprint',
    gap: Math.max(0, 20 - scores.patternBest),
    move: scores.patternBest >= 20
      ? `Pattern Sprint is already above the all-rounder floor. Push for a cleaner run on ${profile.patternTarget} targets.`
      : `Score ${Math.max(1, 20 - scores.patternBest)} more point${Math.max(1, 20 - scores.patternBest) === 1 ? '' : 's'} to turn this lane into a reliable contributor.`,
  });

  candidates.sort((left, right) => left.gap - right.gap);
  const queue = candidates.slice(0, 3);

  nextBreakthroughBoardEl.innerHTML = `
    <p><strong>Closest unlocks:</strong> ${queue.map((item) => item.label).join(' -> ')}</p>
    <ul class="achievement-list">
      ${queue
        .map(
          (item, index) =>
            `<li><strong>${index + 1}. ${item.label}</strong> ${item.move}</li>`
        )
        .join('')}
    </ul>
    <p><strong>Cadence note:</strong> Use this queue when you want the next three gains that are easiest to explain in a portfolio walkthrough, not the biggest long-shot score jumps.</p>
  `;
}

function renderFocusRiskBoard() {
  if (!focusRiskBoardEl) return;

  const recent = scores.runHistory.slice(0, 6);
  if (!recent.length) {
    focusRiskBoardEl.innerHTML = '<p><strong>Focus risk:</strong> no practice profile yet. Log a few runs before the app can tell whether you are diversifying or tunneling.</p>';
    return;
  }

  const laneCounts = recent.reduce((acc, entry) => {
    const key = String(entry.game || '').toLowerCase();
    if (key.includes('reaction')) acc.reaction += 1;
    else if (key.includes('memory')) acc.memory += 1;
    else if (key.includes('sequence')) acc.sequence += 1;
    else if (key.includes('pattern')) acc.pattern += 1;
    return acc;
  }, { reaction: 0, memory: 0, sequence: 0, pattern: 0 });

  const readinessRows = [
    { key: 'reaction', label: 'Reaction Timer', value: scores.bestReaction === null ? 0 : Math.max(0, Math.min(100, ((320 - scores.bestReaction) / 100) * 100)) },
    { key: 'memory', label: 'Memory Match', value: Math.min(100, (scores.memoryWins / 5) * 100) },
    { key: 'sequence', label: 'Sequence Recall', value: Math.min(100, (scores.bestSequence / 8) * 100) },
    { key: 'pattern', label: 'Pattern Sprint', value: Math.min(100, (scores.bestPattern / 20) * 100) },
  ];

  const mostRepeated = Object.entries(laneCounts).sort((a, b) => b[1] - a[1])[0];
  const weakest = [...readinessRows].sort((a, b) => a.value - b.value)[0];
  const overtrainedWeakLane = mostRepeated?.[0] === weakest?.key && mostRepeated[1] >= 3;
  const neglectedWeakLane = mostRepeated?.[0] !== weakest?.key && (laneCounts[weakest.key] || 0) === 0;

  let label = 'Balanced';
  let cue = 'Recent reps are spreading well enough that no one lane is quietly starving.';
  if (overtrainedWeakLane) {
    label = 'Focused';
    cue = `${weakest.label} is still the weakest lane, but you are already spending real reps there. Stay the course until a clean breakthrough lands.`;
  } else if (neglectedWeakLane) {
    label = 'Blind spot';
    cue = `${weakest.label} is the weakest lane and has no recent reps. Open there before replaying a stronger game.`;
  } else if ((mostRepeated?.[1] || 0) >= 4) {
    const repeatedLabel = gameMeta[mostRepeated[0]]?.title || mostRepeated[0];
    label = 'Tunnel risk';
    cue = `${repeatedLabel} owns ${mostRepeated[1]} of the last ${recent.length} runs. Rotate once into ${weakest.label} so the profile does not narrow.`;
  }

  focusRiskBoardEl.innerHTML = `
    <p><strong>Focus risk: ${label}</strong></p>
    <p><strong>Weakest lane:</strong> ${weakest.label} at ${Math.round(weakest.value)}% readiness.</p>
    <p><strong>Recent concentration:</strong> reaction ${laneCounts.reaction}, memory ${laneCounts.memory}, sequence ${laneCounts.sequence}, pattern ${laneCounts.pattern}.</p>
    <p><strong>Cue:</strong> ${cue}</p>
  `;
}

function renderDifficultyDebtBoard() {
  if (!difficultyDebtBoardEl) return;

  const currentLane = scores.difficultyBests[currentDifficulty] || defaultDifficultyBests()[currentDifficulty];
  const strongest = Object.entries(scores.difficultyBests)
    .map(([difficulty, values]) => ({
      difficulty,
      values,
      score:
        (values.reaction === null ? 0 : Math.max(0, 360 - values.reaction)) +
        values.memory * 18 +
        values.sequence * 16 +
        values.pattern * 10,
    }))
    .sort((a, b) => b.score - a.score)[0];

  const currentScore =
    (currentLane.reaction === null ? 0 : Math.max(0, 360 - currentLane.reaction)) +
    currentLane.memory * 18 +
    currentLane.sequence * 16 +
    currentLane.pattern * 10;
  const debt = Math.max(0, (strongest?.score || 0) - currentScore);

  if (!strongest || strongest.score === 0) {
    difficultyDebtBoardEl.innerHTML = '<p><strong>Difficulty debt:</strong> no cross-profile baseline yet. Log runs on at least one difficulty so the app can compare where this profile is lagging.</p>';
    return;
  }

  const sameProfile = strongest.difficulty === currentDifficulty;
  const cue = sameProfile
    ? 'This profile is currently your strongest conditions set, so the next job is preserving balance rather than catching up.'
    : `Your ${strongest.difficulty} profile is ahead by ${debt} readiness points, so this difficulty still needs intentional reps before it becomes portfolio-shareable.`;

  difficultyDebtBoardEl.innerHTML = `
    <p><strong>Difficulty debt</strong></p>
    <p><strong>Current profile:</strong> ${currentDifficulty} at ${currentScore} readiness points.</p>
    <p><strong>Strongest profile:</strong> ${strongest.difficulty} at ${strongest.score} points.</p>
    <p><strong>Debt cue:</strong> ${cue}</p>
  `;
}

function renderSessionHeatBoard() {
  if (!sessionHeatBoardEl) return;

  const recent = scores.runHistory.slice(0, 6);
  if (!recent.length) {
    sessionHeatBoardEl.innerHTML = '<p><strong>Session heat:</strong> no recent runs yet. Log a few attempts so the app can tell which lane is actually active.</p>';
    return;
  }

  const laneCounts = recent.reduce((acc, entry) => {
    const key = String(entry.game || '').toLowerCase();
    if (key.includes('reaction')) acc.reaction += 1;
    else if (key.includes('memory')) acc.memory += 1;
    else if (key.includes('sequence')) acc.sequence += 1;
    else if (key.includes('pattern')) acc.pattern += 1;
    return acc;
  }, { reaction: 0, memory: 0, sequence: 0, pattern: 0 });

  const hottest = Object.entries(laneCounts).sort((a, b) => b[1] - a[1])[0];
  const coldest = Object.entries(laneCounts).sort((a, b) => a[1] - b[1])[0];
  const hottestLabel = gameMeta[hottest[0]]?.title || hottest[0];
  const coldestLabel = gameMeta[coldest[0]]?.title || coldest[0];
  const spread = hottest[1] - coldest[1];
  const heatLabel = spread >= 3 ? 'Lopsided' : spread >= 2 ? 'Tilted' : 'Even';

  sessionHeatBoardEl.innerHTML = `
    <p><strong>Session heat: ${heatLabel}</strong></p>
    <p><strong>Hottest lane:</strong> ${hottestLabel} with ${hottest[1]} of the last ${recent.length} runs.</p>
    <p><strong>Coldest lane:</strong> ${coldestLabel} with ${coldest[1]} recent reps.</p>
    <p><strong>Cue:</strong> ${spread >= 3 ? `Open ${coldestLabel} next so the profile widens before the hot lane becomes a rut.` : 'Recent practice is fairly distributed, so the next run can stay goal-driven instead of balance-driven.'}</p>
  `;
}

function renderPracticeDriftBoard() {
  if (!practiceDriftBoardEl) return;

  const recent = scores.runHistory.slice(0, 6);
  if (!recent.length) {
    practiceDriftBoardEl.innerHTML = '<p><strong>Practice drift:</strong> no recent runs yet. Log a few attempts before the app can tell whether the session is sharpening or just looping.</p>';
    return;
  }

  const laneCounts = recent.reduce((acc, entry) => {
    const key = String(entry.game || '').toLowerCase();
    if (key.includes('reaction')) acc.reaction += 1;
    else if (key.includes('memory')) acc.memory += 1;
    else if (key.includes('sequence')) acc.sequence += 1;
    else if (key.includes('pattern')) acc.pattern += 1;
    return acc;
  }, { reaction: 0, memory: 0, sequence: 0, pattern: 0 });

  const readinessRows = [
    { key: 'reaction', label: 'Reaction Timer', value: scores.bestReaction === null ? 0 : Math.max(0, Math.min(100, ((320 - scores.bestReaction) / 100) * 100)) },
    { key: 'memory', label: 'Memory Match', value: Math.min(100, (scores.memoryWins / 5) * 100) },
    { key: 'sequence', label: 'Sequence Recall', value: Math.min(100, (scores.bestSequence / 8) * 100) },
    { key: 'pattern', label: 'Pattern Sprint', value: Math.min(100, (scores.bestPattern / 20) * 100) },
  ];

  const dominant = Object.entries(laneCounts).sort((a, b) => b[1] - a[1])[0];
  const weakest = [...readinessRows].sort((a, b) => a.value - b.value)[0];
  const driftShare = dominant[1] / recent.length;
  const weakestCoverage = laneCounts[weakest.key] || 0;
  const dominantLabel = gameMeta[dominant[0]]?.title || dominant[0];

  practiceDriftBoardEl.innerHTML = `
    <p><strong>Practice drift:</strong> ${dominantLabel} owns ${Math.round(driftShare * 100)}% of the last ${recent.length} run${recent.length === 1 ? '' : 's'}.</p>
    <p><strong>Weakest lane coverage:</strong> ${weakest.label} appears ${weakestCoverage} time${weakestCoverage === 1 ? '' : 's'} in that same window.</p>
    <p><strong>Cue:</strong> ${
      driftShare >= 0.67 && weakestCoverage === 0
        ? `You are drifting toward comfort reps. Force one ${weakest.label} run next before the session stops improving the weakest lane.`
        : driftShare >= 0.67
          ? `The session is still concentrated, but the weak lane is present. Add one different game before closing the loop.`
          : 'The recent mix is varied enough that practice breadth is still supporting the scoreboard.'
    }</p>
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

function renderConsistencyForecast() {
  if (!consistencyForecastEl) return;

  const streaks = computeStreaks();
  const activeDays = new Set(scores.runCalendar).size;
  const readinessRows = [
    { label: 'Reaction Timer', value: scores.bestReaction === null ? 0 : Math.max(0, Math.min(100, ((320 - scores.bestReaction) / 100) * 100)) },
    { label: 'Memory Match', value: Math.min(100, (scores.memoryWins / 5) * 100) },
    { label: 'Sequence Recall', value: Math.min(100, (scores.bestSequence / 8) * 100) },
    { label: 'Pattern Sprint', value: Math.min(100, (scores.bestPattern / 20) * 100) },
  ];
  const weakest = [...readinessRows].sort((a, b) => a.value - b.value)[0];
  const rhythm =
    streaks.current >= 4
      ? 'Locked in'
      : streaks.current >= 2
        ? 'Building'
        : 'Cold start';
  const nextStep =
    streaks.current >= 4
      ? `Protect the streak and spend the next session on ${weakest.label}.`
      : activeDays >= 6
        ? `Rhythm exists, but ${weakest.label} still needs focused reps.`
        : 'Practice cadence is the main bottleneck; short daily runs will move every lane faster.';

  consistencyForecastEl.innerHTML = `
    <p><strong>Practice rhythm:</strong> ${rhythm}</p>
    <p><strong>Current streak:</strong> ${streaks.current} day${streaks.current === 1 ? '' : 's'} | <strong>Best:</strong> ${streaks.best} day${streaks.best === 1 ? '' : 's'}</p>
    <p><strong>14-day footprint:</strong> ${activeDays} active day${activeDays === 1 ? '' : 's'} on this profile.</p>
    <p><strong>Next forecast:</strong> ${nextStep}</p>
  `;
}

function renderRecoveryDrill() {
  if (!recoveryDrillEl) return;

  const readinessRows = [
    { key: 'reaction', label: 'Reaction Timer', value: scores.bestReaction === null ? 0 : Math.max(0, Math.min(100, ((320 - scores.bestReaction) / 100) * 100)) },
    { key: 'memory', label: 'Memory Match', value: Math.min(100, (scores.memoryWins / 5) * 100) },
    { key: 'sequence', label: 'Sequence Recall', value: Math.min(100, (scores.bestSequence / 8) * 100) },
    { key: 'pattern', label: 'Pattern Sprint', value: Math.min(100, (scores.bestPattern / 20) * 100) },
  ];
  const weakest = [...readinessRows].sort((a, b) => a.value - b.value)[0];
  const lastRun = scores.runHistory[0] || null;
  const profile = difficultyProfiles[currentDifficulty];

  let drill = '';
  if (weakest.key === 'reaction') {
    drill = `Run three clean starts and try to break ${scores.bestReaction === null ? '300' : Math.max(180, Math.round(scores.bestReaction - 15))} ms under the ${currentDifficulty} profile (${profile.reactionMin}-${profile.reactionMin + profile.reactionRange} ms window).`;
  } else if (weakest.key === 'memory') {
    drill = `Clear one board without a miss on the ${profile.memoryPairs}-pair layout before switching games.`;
  } else if (weakest.key === 'sequence') {
    drill = `Survive one round past ${Math.max(3, scores.bestSequence)} with the faster ${profile.sequenceDelay} ms cue cadence.`;
  } else {
    drill = `Post a ${Math.max(12, scores.bestPattern + 2)}-point sprint before the ${profile.patternDuration}s timer expires.`;
  }

  const recoveryCue = !lastRun
    ? 'No recent run logged yet, so start with the weakest lane.'
    : lastRun.game === weakest.key
      ? `Your latest run was already on ${weakest.label}; repeat it once immediately so the adjustment sticks.`
      : `Your latest run was ${gameMeta[lastRun.game]?.title || lastRun.game}, but the bigger recovery opportunity is ${weakest.label}.`;

  recoveryDrillEl.innerHTML = `
    <p><strong>Recovery target:</strong> ${weakest.label}</p>
    <p><strong>Drill:</strong> ${drill}</p>
    <p><strong>Cue:</strong> ${recoveryCue}</p>
  `;
}

function renderSkillBalance() {
  if (!skillBalanceEl) return;

  const lanes = [
    { label: 'Reaction', value: scores.bestReaction === null ? 0 : Math.max(0, Math.min(100, ((340 - scores.bestReaction) / 140) * 100)) },
    { label: 'Memory', value: Math.min(100, (scores.memoryWins / 5) * 100) },
    { label: 'Sequence', value: Math.min(100, (scores.bestSequence / 8) * 100) },
    { label: 'Pattern', value: Math.min(100, (scores.bestPattern / 20) * 100) },
  ];
  const average = lanes.reduce((sum, lane) => sum + lane.value, 0) / lanes.length;
  const weakest = [...lanes].sort((a, b) => a.value - b.value)[0];
  const strongest = [...lanes].sort((a, b) => b.value - a.value)[0];
  const spread = strongest.value - weakest.value;
  const grade = average >= 85 && spread <= 25 ? 'Balanced' : spread >= 55 ? 'Lopsided' : 'Developing';

  skillBalanceEl.innerHTML = `
    <p><strong>${grade} profile</strong></p>
    <p>Readiness average: ${average.toFixed(0)}%. Strongest lane: ${strongest.label}. Weakest lane: ${weakest.label}.</p>
    <p>${spread >= 55 ? 'Practice should target the weakest lane before chasing new personal bests.' : 'The profile is close enough to rotate games without losing focus.'}</p>
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
    difficulty: currentDifficulty,
    detail,
  });

  scores.runHistory = scores.runHistory.slice(0, 10);
  saveScores();
  refreshScoreboard();
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
  renderAchievementRouteBoard();
  renderDailyDrill();
  renderCoverageBoard();
  renderPracticeWeek();
  renderDifficultyBrief();
  renderDifficultyLaneBoard();
  renderBreakthroughBoard();
  renderProgressRadar();
  renderPracticeMatrix();
  renderConsistencyForecast();
  renderRecoveryDrill();
  renderSkillBalance();
  renderTrainingPlan();
  renderSessionChallenge();
  renderGauntletPlanner();
  renderPortfolioHandoff();
  renderMomentumContract();
  renderCrossTrainingPair();
  renderPlateauBreaker();
  renderNextBreakthroughBoard();
  renderFocusRiskBoard();
  renderDifficultyDebtBoard();
  renderSessionHeatBoard();
  renderPracticeDriftBoard();
}

function buildTrainingBrief() {
  const activeGameId = document.querySelector('.tab.active')?.dataset.game || initialGameId;
  const streaks = computeStreaks();
  return [
    'Mini Game Hub Training Brief',
    '',
    `Active game: ${gameMeta[activeGameId]?.title || 'Reaction Timer'}`,
    `Difficulty: ${currentDifficulty}`,
    `Best reaction: ${bestReactionEl.textContent}`,
    `Memory wins: ${memoryWinsEl.textContent}`,
    `Best sequence: ${bestSequenceEl.textContent}`,
    `Best pattern sprint: ${bestPatternEl.textContent}`,
    `Current streak: ${streaks.current} day${streaks.current === 1 ? '' : 's'}`,
    '',
    `Coach: ${(trainingCoachEl?.textContent || '').replace(/\s+/g, ' ').trim()}`,
    `Recovery drill: ${(recoveryDrillEl?.textContent || '').replace(/\s+/g, ' ').trim()}`,
    `Milestones: ${(milestoneBoardEl?.textContent || '').replace(/\s+/g, ' ').trim()}`,
    `Training plan: ${(trainingPlanEl?.textContent || '').replace(/\s+/g, ' ').trim()}`,
    `Session challenge: ${(sessionChallengeEl?.textContent || '').replace(/\s+/g, ' ').trim()}`,
    `Gauntlet planner: ${(gauntletPlannerEl?.textContent || '').replace(/\s+/g, ' ').trim()}`,
    `Plateau breaker: ${(plateauBreakerEl?.textContent || '').replace(/\s+/g, ' ').trim()}`,
    `Share link: ${window.location.href}`,
  ].join('\n');
}

function buildRecoveryDrillBrief() {
  return [
    'Mini Game Hub Recovery Drill',
    '',
    `Difficulty: ${currentDifficulty}`,
    `Recovery drill: ${(recoveryDrillEl?.textContent || '').replace(/\s+/g, ' ').trim()}`,
    `Session challenge: ${(sessionChallengeEl?.textContent || '').replace(/\s+/g, ' ').trim()}`,
    `Momentum contract: ${(momentumContractEl?.textContent || '').replace(/\s+/g, ' ').trim()}`,
    `Current view: ${window.location.href}`,
  ].join('\n');
}

function buildGauntletPlanBrief() {
  const activeGameId = document.querySelector('.tab.active')?.dataset.game || initialGameId;
  return [
    'Mini Game Hub Gauntlet Plan',
    '',
    `Active game: ${gameMeta[activeGameId]?.title || 'Reaction Timer'}`,
    `Difficulty: ${currentDifficulty}`,
    `Gauntlet planner: ${(gauntletPlannerEl?.textContent || '').replace(/\s+/g, ' ').trim()}`,
    `Portfolio handoff: ${(portfolioHandoffEl?.textContent || '').replace(/\s+/g, ' ').trim()}`,
    `Cross-training pair: ${(crossTrainingPairEl?.textContent || '').replace(/\s+/g, ' ').trim()}`,
    `Session heat: ${(sessionHeatBoardEl?.textContent || '').replace(/\s+/g, ' ').trim()}`,
    `Current view: ${window.location.href}`,
  ].join('\n');
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
  initialGameId = gameId;
  syncUrlState(gameId);

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
      }
      updateDifficultyBest('reaction', reactionTime);
      saveScores();
      refreshScoreboard();
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
        updateDifficultyBest('memory', 1);
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
    }
    updateDifficultyBest('sequence', completedRounds);
    saveScores();
    refreshScoreboard();
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
    }
    updateDifficultyBest('pattern', score);
    saveScores();
    refreshScoreboard();

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
  syncUrlState();
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
exportRunLogBtn?.addEventListener('click', exportRunLog);
shareChallengeBtn?.addEventListener('click', async () => {
  syncUrlState();
  try {
    await navigator.clipboard.writeText(window.location.href);
    gameNote.textContent = `Challenge link copied for ${gameMeta[initialGameId].title} on ${currentDifficulty} difficulty.`;
  } catch (error) {
    gameNote.textContent = 'Clipboard copy failed in this environment.';
  }
});
copyTrainingBriefBtn?.addEventListener('click', async () => {
  syncUrlState();
  try {
    await navigator.clipboard.writeText(buildTrainingBrief());
    gameNote.textContent = 'Copied a training brief with coach cues, milestones, and the current challenge.';
  } catch (error) {
    gameNote.textContent = 'Clipboard copy failed in this environment.';
  }
});
copyRecoveryDrillBtn?.addEventListener('click', async () => {
  syncUrlState();
  try {
    await navigator.clipboard.writeText(buildRecoveryDrillBrief());
    gameNote.textContent = 'Copied the recovery drill and bounce-back plan.';
  } catch (error) {
    gameNote.textContent = 'Clipboard copy failed in this environment.';
  }
});
copyGauntletPlanBtn?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(buildGauntletPlanBrief());
    gameNote.textContent = 'Copied the gauntlet plan with the current training route and portfolio handoff.';
  } catch {
    gameNote.textContent = 'Clipboard copy failed in this environment.';
  }
});
importScoresBtn?.addEventListener('click', () => importScoresFile?.click());
importScoresFile?.addEventListener('change', importScores);

hydrateFromUrlState();
refreshScoreboard();
setGame(initialGameId);
