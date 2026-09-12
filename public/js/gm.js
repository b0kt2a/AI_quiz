const socket = io();
let questions = [];
let state = {
  currentIndex: 0,
  phase: "waiting",
  teams: []
};

const number = document.getElementById("number");
const title = document.getElementById("title");
const store = document.getElementById("store");
const phase = document.getElementById("phase");
const ended = document.getElementById("ended");
const connection = document.getElementById("connection");
const qLabel = document.getElementById("qLabel");
const teamList = document.getElementById("teamList");

async function loadQuestions() {
  const res = await fetch("/api/questions");
  questions = await res.json();
  render();
}

function renderTeams() {
  const teams = Array.isArray(state.teams) ? state.teams : [];
  teamList.innerHTML = "";

  teams.forEach((team, index) => {
    const row = document.createElement("div");
    row.className = "team-row";

    const nameInput = document.createElement("input");
    nameInput.className = "team-name";
    nameInput.type = "text";
    nameInput.maxLength = 20;
    nameInput.value = team.name || `${index + 1}팀`;
    nameInput.setAttribute("aria-label", `${index + 1}팀 팀명`);
    nameInput.addEventListener("change", () => {
      socket.emit("team:updateName", { index, name: nameInput.value });
    });
    nameInput.addEventListener("blur", () => {
      socket.emit("team:updateName", { index, name: nameInput.value });
    });

    const scoreWrap = document.createElement("div");
    scoreWrap.className = "score-controls";

    const minusBtn = document.createElement("button");
    minusBtn.type = "button";
    minusBtn.className = "score-btn";
    minusBtn.textContent = "−1";
    minusBtn.onclick = () => socket.emit("team:delta", { index, delta: -1 });

    const scoreInput = document.createElement("input");
    scoreInput.className = "score-input";
    scoreInput.type = "number";
    scoreInput.step = "1";
    scoreInput.value = Number.isFinite(Number(team.score)) ? Number(team.score) : 0;
    scoreInput.setAttribute("aria-label", `${nameInput.value} 점수`);
    const submitScore = () => {
      const value = Number.parseInt(scoreInput.value, 10);
      socket.emit("team:setScore", { index, score: Number.isFinite(value) ? value : 0 });
    };
    scoreInput.addEventListener("change", submitScore);
    scoreInput.addEventListener("blur", submitScore);

    const plusBtn = document.createElement("button");
    plusBtn.type = "button";
    plusBtn.className = "score-btn plus";
    plusBtn.textContent = "+1";
    plusBtn.onclick = () => socket.emit("team:delta", { index, delta: 1 });

    scoreWrap.append(minusBtn, scoreInput, plusBtn);
    row.append(nameInput, scoreWrap);
    teamList.appendChild(row);
  });
}

function render() {
  const q = questions[state.currentIndex];
  if (!q) {
    number.textContent = "--";
    title.textContent = "등록된 문제가 없어";
    store.textContent = "";
    phase.textContent = "Admin에서 문제를 등록해줘.";
  } else {
    qLabel.textContent = state.currentIndex === 0 ? "연습문제" : "문제";
    number.textContent = state.currentIndex === 0 ? "" : String(state.currentIndex).padStart(2, "0");
    title.textContent = q.title || "(제목 없음)";
    store.textContent = q.store || "";

    const phaseMap = {
      waiting: "대기 중",
      playing: "영상 재생 중",
      answer: "정답 공개 중"
    };
    phase.textContent = phaseMap[state.phase] || state.phase;
  }

  renderTeams();
}

document.getElementById("startBtn").onclick = () => {
  ended.classList.add("hidden");
  socket.emit("gm:start");
};

document.getElementById("replayBtn").onclick = () => {
  ended.classList.add("hidden");
  socket.emit("gm:replay");
};

document.getElementById("answerBtn").onclick = () => {
  socket.emit("gm:answer");
};

document.getElementById("nextBtn").onclick = () => {
  ended.classList.add("hidden");
  socket.emit("gm:next");
};

document.getElementById("resetScoresBtn").onclick = () => {
  if (confirm("모든 팀 점수를 0점으로 초기화할까?")) {
    socket.emit("team:resetScores");
  }
};

socket.on("connect", () => connection.textContent = "● 연결됨");
socket.on("disconnect", () => connection.textContent = "○ 연결 끊김");

socket.on("state", s => {
  state = s;
  render();
});

socket.on("gm:videoEnded", () => {
  ended.classList.remove("hidden");
});

socket.on("questions:updated", loadQuestions);

loadQuestions();
