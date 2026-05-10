const FIXTURE_COUNT = 12;
const STORAGE_KEY = "football-career-save";
const PLAYER_PRIMARY_SCORER_OFFSET_CHANCE = 0.5;
const DEFENSIVE_CONFIDENCE_BOOST_CHANCE = 0.7;
const WAGE_INCREASE_PER_RENEWAL = 5000;

const youthFirstNames = ["Mason", "Aiden", "Leo", "Jude", "Rayan", "Noah"];
const youthLastNames = ["Parker", "Silva", "Mensah", "Bennett", "Costa", "Ilic"];

const opponents = [
  "Riverton FC",
  "Southcastle United",
  "Redbridge Athletic",
  "Northport City",
  "Kingsbury Rovers",
  "Westford Albion",
  "Lakeside Town",
  "Dockside FC",
  "Highland Wanderers",
  "Meadow Park",
  "Eagleford",
  "Oldham Borough",
];

const transferPool = [
  { name: "L. Costa", pos: "ST", age: 23, ovr: 82, fee: 45000000, wage: 90000 },
  { name: "I. Demir", pos: "CM", age: 21, ovr: 79, fee: 30000000, wage: 65000 },
  { name: "T. Boone", pos: "CB", age: 26, ovr: 81, fee: 38000000, wage: 80000 },
  { name: "J. Navarro", pos: "RW", age: 19, ovr: 76, fee: 22000000, wage: 45000 },
];

function makeInitialState() {
  return {
    season: 1,
    week: 1,
    tacticFocus: "Balanced",
    player: {
      name: "Alex Carter",
      position: "CAM",
      age: 18,
      overall: 72,
      potential: 88,
      contractYears: 3,
      wage: 18000,
      value: 8500000,
      morale: 70,
      fitness: 86,
      goals: 0,
      assists: 0,
      skill: {
        pace: 72,
        shooting: 70,
        passing: 74,
        defending: 58,
      },
    },
    club: {
      name: "Evergreen FC",
      budget: 90000000,
      wageBudget: 650000,
      points: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      cleanSheets: 0,
      boardConfidence: 65,
    },
    fixtures: Array.from({ length: FIXTURE_COUNT }, (_, i) => ({
      id: i + 1,
      opponent: opponents[i],
      difficulty: Math.floor(Math.random() * 20) + 65,
      played: false,
      result: "",
    })),
    objectives: [
      { text: "Score 8+ goals this season", done: false },
      { text: "Maintain board confidence above 70", done: false },
      { text: "Finish in top 4", done: false },
      { text: "Keep 4+ clean sheets", done: false },
    ],
    feed: ["Welcome to Career Mode. Build your legacy."],
    transferTargets: [...transferPool],
  };
}

let state = makeInitialState();

function money(n) {
  return `$${n.toLocaleString()}`;
}

function addFeed(message) {
  state.feed.unshift(`[Week ${state.week}] ${message}`);
  state.feed = state.feed.slice(0, 20);
}

function getCurrentFixture() {
  return state.fixtures.find((f) => !f.played);
}

function updateObjectives() {
  const gamesPlayed = state.club.wins + state.club.draws + state.club.losses;
  const ppg = gamesPlayed ? state.club.points / gamesPlayed : 0;
  const projectedPoints = Math.round(ppg * FIXTURE_COUNT);
  const projectedPositionTop4 = projectedPoints >= 22;

  state.objectives[0].done = state.player.goals >= 8;
  state.objectives[1].done = state.club.boardConfidence >= 70;
  state.objectives[2].done = projectedPositionTop4;
  state.objectives[3].done = state.club.cleanSheets >= 4;
}

function train(skill) {
  if (state.player.fitness < 12) {
    addFeed("Training skipped: player fitness too low.");
    return;
  }

  const gain = Math.floor(Math.random() * 2) + 1;
  state.player.skill[skill] = Math.min(99, state.player.skill[skill] + gain);
  state.player.fitness = Math.max(0, state.player.fitness - 10);
  state.player.morale = Math.min(100, state.player.morale + 2);

  const avg = Object.values(state.player.skill).reduce((a, b) => a + b, 0) / 4;
  state.player.overall = Math.min(state.player.potential, Math.round(avg));
  state.player.value = Math.round(state.player.value * 1.02);

  addFeed(`${skill[0].toUpperCase() + skill.slice(1)} training successful (+${gain}).`);
}

function playMatch() {
  const fixture = getCurrentFixture();
  if (!fixture) {
    addFeed("No fixture left. End season to continue.");
    return;
  }

  const teamStrength =
    state.player.overall +
    state.player.morale * 0.2 +
    state.player.fitness * 0.15 +
    (state.tacticFocus === "Attacking" ? 3 : state.tacticFocus === "Defensive" ? 1 : 2);

  const aiStrength = fixture.difficulty + (Math.random() * 12 - 6);

  const goalsFor = Math.max(0, Math.round((teamStrength - 50 + Math.random() * 20) / 18));
  const goalsAgainst = Math.max(0, Math.round((aiStrength - 55 + Math.random() * 18) / 19));

  let result;
  if (goalsFor > goalsAgainst) {
    state.club.wins += 1;
    state.club.points += 3;
    state.club.boardConfidence = Math.min(100, state.club.boardConfidence + 4);
    state.player.morale = Math.min(100, state.player.morale + 5);
    result = "W";
  } else if (goalsFor === goalsAgainst) {
    state.club.draws += 1;
    state.club.points += 1;
    state.club.boardConfidence = Math.min(100, state.club.boardConfidence + 1);
    result = "D";
  } else {
    state.club.losses += 1;
    state.club.boardConfidence = Math.max(0, state.club.boardConfidence - 5);
    state.player.morale = Math.max(0, state.player.morale - 4);
    result = "L";
  }

  if (goalsAgainst === 0) {
    state.club.cleanSheets += 1;
  }

  state.club.goalsFor += goalsFor;
  state.club.goalsAgainst += goalsAgainst;
  state.player.goals += estimatePlayerGoals(goalsFor);
  state.player.assists += Math.max(0, goalsFor > 0 ? Math.floor(Math.random() * 2) : 0);
  state.player.fitness = Math.max(0, state.player.fitness - 18);

  fixture.played = true;
  fixture.result = `${goalsFor}-${goalsAgainst} (${result})`;
  addFeed(`Match vs ${fixture.opponent}: ${fixture.result}`);
  updateObjectives();
}

function advanceWeek() {
  state.week += 1;
  state.player.fitness = Math.min(100, state.player.fitness + 15);

  if (Math.random() > 0.68) {
    const offer = Math.round(state.player.value * (1 + Math.random() * 0.3));
    addFeed(`Transfer rumor: ${money(offer)} bid expected for ${state.player.name}.`);
  }

  if (state.tacticFocus === "Attacking") {
    state.player.morale = Math.min(100, state.player.morale + 2);
  } else if (state.tacticFocus === "Defensive") {
    if (Math.random() > DEFENSIVE_CONFIDENCE_BOOST_CHANCE) {
      state.club.boardConfidence = Math.min(100, state.club.boardConfidence + 1);
    }
  }

  updateObjectives();
}

function endSeason() {
  const left = state.fixtures.filter((f) => !f.played).length;
  if (left > 0) {
    addFeed(`Season cannot end yet. ${left} fixtures remaining.`);
    return;
  }

  const successCount = state.objectives.filter((o) => o.done).length;
  const bonus = successCount * 5000000;
  state.club.budget += 15000000 + bonus;
  state.season += 1;
  state.week = 1;
  state.player.age += 1;
  state.player.contractYears = Math.max(1, state.player.contractYears - 1);
  state.player.fitness = 92;
  state.club.points = 0;
  state.club.wins = 0;
  state.club.draws = 0;
  state.club.losses = 0;
  state.club.goalsFor = 0;
  state.club.goalsAgainst = 0;
  state.club.cleanSheets = 0;
  state.club.boardConfidence = Math.min(100, 55 + successCount * 10);
  state.fixtures = Array.from({ length: FIXTURE_COUNT }, (_, i) => ({
    id: i + 1,
    opponent: opponents[(i + state.season) % opponents.length],
    difficulty: Math.floor(Math.random() * 20) + 65,
    played: false,
    result: "",
  }));

  state.objectives.forEach((o) => {
    o.done = false;
  });

  addFeed(`New season started. Board added ${money(15000000 + bonus)} to budget.`);
}

function scoutYouth() {
  const talent = {
    name: `${youthFirstNames[Math.floor(Math.random() * youthFirstNames.length)]} ${
      youthLastNames[Math.floor(Math.random() * youthLastNames.length)]
    }`,
    pos: ["ST", "CM", "CB", "RW", "LB"][Math.floor(Math.random() * 5)],
    age: 16 + Math.floor(Math.random() * 3),
    ovr: 63 + Math.floor(Math.random() * 8),
    fee: 3500000 + Math.floor(Math.random() * 2500000),
    wage: 12000 + Math.floor(Math.random() * 12000),
  };

  state.transferTargets.push(talent);
  state.club.boardConfidence = Math.min(100, state.club.boardConfidence + 2);
  addFeed(`Scouting report: ${talent.name} (${talent.pos}) added to shortlist.`);
}

function estimatePlayerGoals(teamGoals) {
  // EA FC-style career mode approximation: the controlled player often contributes most,
  // but not all, of the team's goals.
  return Math.max(0, teamGoals - (Math.random() > PLAYER_PRIMARY_SCORER_OFFSET_CHANCE ? 1 : 0));
}

function adjustTactics() {
  const order = ["Balanced", "Attacking", "Defensive"];
  const index = order.indexOf(state.tacticFocus);
  state.tacticFocus = order[(index + 1) % order.length];
  addFeed(`Tactics switched to ${state.tacticFocus}.`);
}

function renewContract() {
  if (state.club.wageBudget < state.player.wage + WAGE_INCREASE_PER_RENEWAL) {
    addFeed("Contract renewal failed: wage budget is too low.");
    return;
  }

  state.player.contractYears += 2;
  state.player.wage += WAGE_INCREASE_PER_RENEWAL;
  state.club.wageBudget -= WAGE_INCREASE_PER_RENEWAL;
  state.player.morale = Math.min(100, state.player.morale + 6);
  addFeed("Contract renewed for two years.");
}

function signTarget(index) {
  const target = state.transferTargets[index];
  if (!target) {
    return;
  }

  if (state.club.budget < target.fee || state.club.wageBudget < target.wage) {
    addFeed(`Could not sign ${target.name}: financial limits reached.`);
    return;
  }

  state.club.budget -= target.fee;
  state.club.wageBudget -= target.wage;
  state.club.boardConfidence = Math.min(100, state.club.boardConfidence + 3);
  state.transferTargets.splice(index, 1);
  addFeed(`Signed ${target.name} (${target.pos}) for ${money(target.fee)}.`);
}

function render() {
  const seasonSummary = document.getElementById("seasonSummary");
  const playerSummary = document.getElementById("playerSummary");
  const clubSummary = document.getElementById("clubSummary");
  const fixtures = document.getElementById("fixtures");
  const transferMarket = document.getElementById("transferMarket");
  const objectives = document.getElementById("objectives");
  const feed = document.getElementById("feed");

  const currentFixture = getCurrentFixture();

  seasonSummary.innerHTML = `
    <p><strong>Season:</strong> ${state.season} | <strong>Week:</strong> ${state.week}</p>
    <p><strong>Current Tactical Focus:</strong> ${state.tacticFocus}</p>
    <p class="small">Upcoming: ${currentFixture ? `${currentFixture.opponent} (Difficulty ${currentFixture.difficulty})` : "No remaining fixtures"}</p>
  `;

  playerSummary.innerHTML = `
    <p><strong>${state.player.name}</strong> (${state.player.position}, Age ${state.player.age})</p>
    <p><strong>OVR:</strong> ${state.player.overall} | <strong>Potential:</strong> ${state.player.potential}</p>
    <p><strong>Morale:</strong> ${state.player.morale} | <strong>Fitness:</strong> ${state.player.fitness}</p>
    <p><strong>Contract:</strong> ${state.player.contractYears}y @ ${money(state.player.wage)}/week</p>
    <p><strong>Stats:</strong> ${state.player.goals} goals, ${state.player.assists} assists</p>
    <div>
      <span class="tag">PAC ${state.player.skill.pace}</span>
      <span class="tag">SHO ${state.player.skill.shooting}</span>
      <span class="tag">PAS ${state.player.skill.passing}</span>
      <span class="tag">DEF ${state.player.skill.defending}</span>
    </div>
  `;

  clubSummary.innerHTML = `
    <p><strong>${state.club.name}</strong></p>
    <p><strong>Budget:</strong> ${money(state.club.budget)} | <strong>Wage Budget:</strong> ${money(state.club.wageBudget)}</p>
    <p><strong>Record:</strong> ${state.club.wins}-${state.club.draws}-${state.club.losses} (${state.club.points} pts)</p>
    <p><strong>Goals:</strong> ${state.club.goalsFor}:${state.club.goalsAgainst} | <strong>Clean Sheets:</strong> ${state.club.cleanSheets}</p>
    <p><strong>Board Confidence:</strong> ${state.club.boardConfidence}</p>
  `;

  fixtures.innerHTML = state.fixtures
    .map(
      (f) =>
        `<p>#${f.id} vs ${f.opponent} <span class="small">${f.played ? f.result : "Not played"}</span></p>`
    )
    .join("");

  transferMarket.innerHTML = state.transferTargets.length
    ? state.transferTargets
        .map(
          (t, i) => `
        <div>
          <p><strong>${t.name}</strong> (${t.pos}) - OVR ${t.ovr}, Age ${t.age}</p>
          <p class="small">Fee: ${money(t.fee)} | Wage: ${money(t.wage)}/week</p>
          <button data-transfer-index="${i}">Sign Player</button>
        </div>
      `
        )
        .join("")
    : "<p class='small'>No active targets.</p>";

  objectives.innerHTML = "<ul>" + state.objectives.map((o) => `<li>${o.done ? "✅" : "⬜"} ${o.text}</li>`).join("") + "</ul>";
  feed.innerHTML = state.feed.map((line) => `<li>${line}</li>`).join("");

  document.querySelectorAll(".training-btn").forEach((btn) => {
    btn.disabled = state.player.fitness < 12;
  });
  document.getElementById("playMatchBtn").disabled = !currentFixture;
}

function saveCareer() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  addFeed("Career saved locally.");
  render();
}

function loadCareer() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    addFeed("No save file found.");
  } else {
    state = JSON.parse(saved);
    addFeed("Career loaded.");
  }
  render();
}

function resetCareer() {
  state = makeInitialState();
  localStorage.removeItem(STORAGE_KEY);
  render();
}

document.getElementById("advanceWeekBtn").addEventListener("click", () => {
  advanceWeek();
  render();
});
document.getElementById("playMatchBtn").addEventListener("click", () => {
  playMatch();
  render();
});
document.getElementById("endSeasonBtn").addEventListener("click", () => {
  endSeason();
  render();
});
document.getElementById("scoutBtn").addEventListener("click", () => {
  scoutYouth();
  render();
});
document.getElementById("tacticsBtn").addEventListener("click", () => {
  adjustTactics();
  render();
});
document.getElementById("contractBtn").addEventListener("click", () => {
  renewContract();
  render();
});
document.body.addEventListener("click", (event) => {
  const trainingBtn = event.target.closest(".training-btn");
  if (!trainingBtn) {
    return;
  }

  train(trainingBtn.dataset.skill);
  render();
});
document.getElementById("saveBtn").addEventListener("click", saveCareer);
document.getElementById("loadBtn").addEventListener("click", loadCareer);
document.getElementById("resetBtn").addEventListener("click", resetCareer);

document.getElementById("transferMarket").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-transfer-index]");
  if (!button) {
    return;
  }

  signTarget(Number(button.dataset.transferIndex));
  render();
});

render();
