const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const QUESTIONS_PATH = path.join(ROOT, "questions.json");
const VIDEO_DIR = path.join(ROOT, "public", "videos");
const POSTER_DIR = path.join(ROOT, "public", "posters");

app.use(express.json({ limit: "5mb" }));
app.use(express.static(path.join(ROOT, "public")));

function loadSeedQuestions() {
  try {
    const parsed = JSON.parse(fs.readFileSync(QUESTIONS_PATH, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("questions.json 읽기 실패:", err);
    return [];
  }
}

// 무료 Render용: 문제/영상/포스터의 원본은 GitHub 저장소 안에 둔다.
// Admin에서 수정한 내용은 현재 서버 실행 중에만 반영된다.
let questions = loadSeedQuestions();

function listFiles(dir, urlPrefix, allowedExts) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter(entry => entry.isFile())
      .map(entry => entry.name)
      .filter(name => allowedExts.includes(path.extname(name).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, "ko", { numeric: true }))
      .map(name => ({ name, url: `${urlPrefix}/${encodeURIComponent(name)}` }));
  } catch {
    return [];
  }
}

function normalizeQuestion(input, existingId) {
  return {
    id: existingId || String(Date.now()) + Math.random().toString(36).slice(2, 7),
    title: String(input.title || "").trim(),
    store: String(input.store || "").trim(),
    genre: String(input.genre || "").trim(),
    difficulty: String(input.difficulty || "").trim(),
    playtime: String(input.playtime || "").trim(),
    video: String(input.video || "").trim(),
    poster: String(input.poster || "").trim()
  };
}

app.get("/", (req, res) => res.redirect("/screen"));
app.get("/admin", (req, res) => res.sendFile(path.join(ROOT, "public", "admin.html")));
app.get("/gm", (req, res) => res.sendFile(path.join(ROOT, "public", "gm.html")));
app.get("/screen", (req, res) => res.sendFile(path.join(ROOT, "public", "screen.html")));
app.get("/health", (req, res) => res.status(200).json({ ok: true }));

app.get("/api/questions", (req, res) => res.json(questions));

app.get("/api/assets", (req, res) => {
  res.json({
    videos: listFiles(VIDEO_DIR, "/videos", [".mp4", ".webm", ".mov", ".m4v"]),
    posters: listFiles(POSTER_DIR, "/posters", [".jpg", ".jpeg", ".png", ".webp", ".gif"])
  });
});

app.post("/api/questions", (req, res) => {
  const q = normalizeQuestion(req.body);
  if (!q.video) return res.status(400).json({ ok: false, message: "묘사 영상을 선택해줘." });
  questions.push(q);
  io.emit("questions:updated");
  res.json({ ok: true, question: q });
});

app.put("/api/questions/:id", (req, res) => {
  const idx = questions.findIndex(q => q.id === req.params.id);
  if (idx < 0) return res.status(404).json({ ok: false, message: "문제를 찾을 수 없어." });
  const next = normalizeQuestion({ ...questions[idx], ...req.body }, questions[idx].id);
  if (!next.video) return res.status(400).json({ ok: false, message: "묘사 영상을 선택해줘." });
  questions[idx] = next;
  io.emit("questions:updated");
  res.json({ ok: true, question: next });
});

app.delete("/api/questions/:id", (req, res) => {
  const idx = questions.findIndex(q => q.id === req.params.id);
  if (idx < 0) return res.status(404).json({ ok: false, message: "문제를 찾을 수 없어." });
  questions.splice(idx, 1);
  state.currentIndex = Math.min(state.currentIndex, Math.max(0, questions.length - 1));
  state.phase = "waiting";
  state.playToken += 1;
  io.emit("questions:updated");
  emitState();
  res.json({ ok: true });
});

app.post("/api/questions/reorder", (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
  const map = new Map(questions.map(q => [q.id, q]));
  const reordered = ids.map(id => map.get(id)).filter(Boolean);
  for (const q of questions) if (!ids.includes(q.id)) reordered.push(q);
  questions = reordered;
  state.currentIndex = Math.min(state.currentIndex, Math.max(0, questions.length - 1));
  state.phase = "waiting";
  state.playToken += 1;
  io.emit("questions:updated");
  emitState();
  res.json({ ok: true });
});

app.post("/api/questions/replace", (req, res) => {
  if (!Array.isArray(req.body.questions)) {
    return res.status(400).json({ ok: false, message: "문제 목록 형식이 올바르지 않아." });
  }
  questions = req.body.questions.map(q => normalizeQuestion(q, q.id));
  state.currentIndex = 0;
  state.phase = "waiting";
  state.playToken += 1;
  io.emit("questions:updated");
  emitState();
  res.json({ ok: true, count: questions.length });
});

app.post("/api/questions/reset", (req, res) => {
  questions = loadSeedQuestions();
  state.currentIndex = 0;
  state.phase = "waiting";
  state.playToken += 1;
  io.emit("questions:updated");
  emitState();
  res.json({ ok: true, count: questions.length });
});

let state = {
  currentIndex: 0,
  phase: "waiting", // waiting | playing | answer
  playToken: 0
};

function emitState() {
  io.emit("state", state);
}

io.on("connection", (socket) => {
  socket.emit("state", state);

  socket.on("gm:start", () => {
    if (!questions.length) return;
    state.phase = "playing";
    state.playToken += 1;
    emitState();
  });

  socket.on("gm:replay", () => {
    if (!questions.length) return;
    state.phase = "playing";
    state.playToken += 1;
    emitState();
  });

  socket.on("gm:answer", () => {
    if (!questions.length) return;
    state.phase = "answer";
    emitState();
  });

  socket.on("gm:next", () => {
    if (!questions.length) return;
    state.currentIndex = Math.min(state.currentIndex + 1, questions.length - 1);
    state.phase = "waiting";
    state.playToken += 1;
    emitState();
  });

  socket.on("screen:ended", () => io.emit("gm:videoEnded"));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("");
  console.log("AI 묘사 퀴즈 실행 중");
  console.log(`PORT   ${PORT}`);
  console.log(`QUESTIONS ${questions.length}`);
  console.log("");
});
