const socket = io();

let questions = [];
let lastPlayToken = null;
let currentState = { currentIndex: 0, phase: "waiting", playToken: 0 };

const waiting = document.getElementById("waiting");
const playing = document.getElementById("playing");
const answer = document.getElementById("answer");
const video = document.getElementById("video");

function labelParts(idx) {
  return idx === 0
    ? { label: "연습문제", number: "" }
    : { label: "문제", number: String(idx).padStart(2, "0") };
}

function setQuestionLabel(prefix, idx) {
  const parts = labelParts(idx);
  document.getElementById(`${prefix}Label`).textContent = parts.label;
  document.getElementById(`${prefix}Num`).textContent = parts.number;
}

function show(view) {
  [waiting, playing, answer].forEach(v => v.classList.remove("active"));
  view.classList.add("active");
}

async function loadQuestions() {
  const res = await fetch("/api/questions");
  questions = await res.json();
  applyState(currentState);
}

function applyAnswer(q, idx) {
  setQuestionLabel("answer", idx);
  document.getElementById("answerTitle").textContent = q.title || "";
  document.getElementById("answerStore").textContent = q.store || "";
  document.getElementById("answerGenre").textContent = q.genre || "";
  document.getElementById("answerDifficulty").textContent = q.difficulty ? `난이도 ${q.difficulty}` : "";
  document.getElementById("answerPlaytime").textContent = q.playtime || "";

  const poster = document.getElementById("poster");
  if (q.poster) {
    poster.src = q.poster;
    poster.style.display = "";
  } else {
    poster.removeAttribute("src");
    poster.style.display = "none";
  }
}

async function applyState(state) {
  currentState = state;
  const q = questions[state.currentIndex];

  if (!q) {
    document.getElementById("waitNum").textContent = "--";
    show(waiting);
    return;
  }

  setQuestionLabel("wait", state.currentIndex);
  setQuestionLabel("play", state.currentIndex);

  if (state.phase === "waiting") {
    video.pause();
    show(waiting);
    return;
  }

  if (state.phase === "answer") {
    video.pause();
    applyAnswer(q, state.currentIndex);
    show(answer);
    return;
  }

  if (state.phase === "playing") {
    show(playing);

    if (lastPlayToken !== state.playToken) {
      lastPlayToken = state.playToken;
      video.src = q.video;
      video.currentTime = 0;

      try {
        await video.play();
      } catch (err) {
        console.warn("브라우저 자동재생 제한:", err);
      }
    }
  }
}

video.addEventListener("ended", () => {
  socket.emit("screen:ended");
});

socket.on("state", applyState);
socket.on("questions:updated", loadQuestions);

loadQuestions();