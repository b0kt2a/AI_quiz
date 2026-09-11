const socket = io();
let questions = [];
let state = { currentIndex: 0, phase: "waiting" };

const number = document.getElementById("number");
const title = document.getElementById("title");
const store = document.getElementById("store");
const phase = document.getElementById("phase");
const ended = document.getElementById("ended");
const connection = document.getElementById("connection");
const qLabel = document.getElementById("qLabel");

async function loadQuestions() {
  const res = await fetch("/api/questions");
  questions = await res.json();
  render();
}

function render() {
  const q = questions[state.currentIndex];
  if (!q) {
    number.textContent = "--";
    title.textContent = "등록된 문제가 없어";
    store.textContent = "";
    phase.textContent = "Admin에서 문제를 등록해줘.";
    return;
  }

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