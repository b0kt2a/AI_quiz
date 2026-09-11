const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

const ROOT = __dirname;
// Render에서는 DATA_DIR=/var/data/ai-quiz 로 지정한다.
// 로컬 실행 시에는 프로젝트 안의 .local-data 폴더를 사용한다.
const DATA_ROOT = process.env.DATA_DIR || path.join(ROOT, ".local-data");
const DATA_PATH = path.join(DATA_ROOT, "questions.json");
const VIDEO_DIR = path.join(DATA_ROOT, "uploads", "videos");
const POSTER_DIR = path.join(DATA_ROOT, "uploads", "posters");
const SEED_DATA_PATH = path.join(ROOT, "questions.json");

for (const dir of [DATA_ROOT, VIDEO_DIR, POSTER_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

// Persistent Disk가 비어 있는 첫 실행 때만 저장소에 포함된 초기 문제를 복사한다.
if (!fs.existsSync(DATA_PATH)) {
  if (fs.existsSync(SEED_DATA_PATH)) {
    fs.copyFileSync(SEED_DATA_PATH, DATA_PATH);
  } else {
    fs.writeFileSync(DATA_PATH, "[]\n", "utf8");
  }
}

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(ROOT, "public")));
app.use("/uploads/videos", express.static(VIDEO_DIR));
app.use("/uploads/posters", express.static(POSTER_DIR));

function readQuestions() {
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("questions.json 읽기 실패:", err);
    return [];
  }
}

function writeQuestions(data) {
  const tempPath = `${DATA_PATH}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tempPath, DATA_PATH);
}

function cleanName(name) {
  return name
    .normalize("NFC")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, "_");
}

function removeUploadedFile(urlPath) {
  if (!urlPath || !urlPath.startsWith("/uploads/")) return;
  const relative = urlPath.replace(/^\/uploads\//, "");
  const fullPath = path.resolve(DATA_ROOT, "uploads", relative);
  const allowedRoot = path.resolve(DATA_ROOT, "uploads") + path.sep;
  if (!fullPath.startsWith(allowedRoot)) return;
  try {
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  } catch (err) {
    console.warn("업로드 파일 삭제 실패:", err.message);
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, file.fieldname === "video" ? VIDEO_DIR : POSTER_DIR);
  },
  filename: (req, file, cb) => {
    const safe = cleanName(file.originalname);
    const stamp = Date.now();
    cb(null, `${stamp}_${safe}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 800 * 1024 * 1024 }
});

app.get("/", (req, res) => res.redirect("/screen"));
app.get("/admin", (req, res) => res.sendFile(path.join(ROOT, "public", "admin.html")));
app.get("/gm", (req, res) => res.sendFile(path.join(ROOT, "public", "gm.html")));
app.get("/screen", (req, res) => res.sendFile(path.join(ROOT, "public", "screen.html")));
app.get("/health", (req, res) => res.status(200).json({ ok: true }));

app.get("/api/questions", (req, res) => {
  res.json(readQuestions());
});

app.post("/api/questions", upload.fields([
  { name: "video", maxCount: 1 },
  { name: "poster", maxCount: 1 }
]), (req, res) => {
  const questions = readQuestions();
  const body = req.body;

  if (!req.files?.video?.[0]) {
    return res.status(400).json({ ok: false, message: "영상 파일이 필요해요." });
  }

  const id = Date.now().toString();
  const q = {
    id,
    title: body.title || "",
    store: body.store || "",
    genre: body.genre || "",
    difficulty: body.difficulty || "",
    playtime: body.playtime || "",
    video: "/uploads/videos/" + req.files.video[0].filename,
    poster: req.files?.poster?.[0] ? "/uploads/posters/" + req.files.poster[0].filename : ""
  };

  questions.push(q);
  writeQuestions(questions);
  io.emit("questions:updated");
  res.json({ ok: true, question: q });
});

app.put("/api/questions/:id", upload.fields([
  { name: "video", maxCount: 1 },
  { name: "poster", maxCount: 1 }
]), (req, res) => {
  const questions = readQuestions();
  const idx = questions.findIndex(q => q.id === req.params.id);
  if (idx < 0) return res.status(404).json({ ok: false, message: "문제를 찾을 수 없어요." });

  const q = questions[idx];
  q.title = req.body.title ?? q.title;
  q.store = req.body.store ?? q.store;
  q.genre = req.body.genre ?? q.genre;
  q.difficulty = req.body.difficulty ?? q.difficulty;
  q.playtime = req.body.playtime ?? q.playtime;

  if (req.files?.video?.[0]) {
    removeUploadedFile(q.video);
    q.video = "/uploads/videos/" + req.files.video[0].filename;
  }
  if (req.files?.poster?.[0]) {
    removeUploadedFile(q.poster);
    q.poster = "/uploads/posters/" + req.files.poster[0].filename;
  }

  questions[idx] = q;
  writeQuestions(questions);
  io.emit("questions:updated");
  res.json({ ok: true, question: q });
});

app.delete("/api/questions/:id", (req, res) => {
  let questions = readQuestions();
  const idx = questions.findIndex(q => q.id === req.params.id);
  if (idx < 0) return res.status(404).json({ ok: false, message: "문제를 찾을 수 없어요." });

  const [removed] = questions.splice(idx, 1);
  removeUploadedFile(removed.video);
  removeUploadedFile(removed.poster);
  writeQuestions(questions);

  if (state.currentIndex >= questions.length) {
    state.currentIndex = Math.max(0, questions.length - 1);
    state.phase = "waiting";
    state.playToken += 1;
  }

  io.emit("questions:updated");
  emitState();
  res.json({ ok: true });
});

app.post("/api/questions/reorder", (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
  const old = readQuestions();
  const map = new Map(old.map(q => [q.id, q]));
  const reordered = ids.map(id => map.get(id)).filter(Boolean);

  for (const q of old) {
    if (!ids.includes(q.id)) reordered.push(q);
  }

  writeQuestions(reordered);
  state.currentIndex = Math.min(state.currentIndex, Math.max(0, reordered.length - 1));
  state.phase = "waiting";
  state.playToken += 1;
  io.emit("questions:updated");
  emitState();
  res.json({ ok: true });
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
    if (!readQuestions().length) return;
    state.phase = "playing";
    state.playToken += 1;
    emitState();
  });

  socket.on("gm:replay", () => {
    if (!readQuestions().length) return;
    state.phase = "playing";
    state.playToken += 1;
    emitState();
  });

  socket.on("gm:answer", () => {
    if (!readQuestions().length) return;
    state.phase = "answer";
    emitState();
  });

  socket.on("gm:next", () => {
    const questions = readQuestions();
    if (!questions.length) return;
    state.currentIndex = Math.min(state.currentIndex + 1, questions.length - 1);
    state.phase = "waiting";
    state.playToken += 1;
    emitState();
  });

  socket.on("screen:ended", () => {
    io.emit("gm:videoEnded");
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("");
  console.log("AI 묘사 퀴즈 실행 중");
  console.log(`PORT   ${PORT}`);
  console.log(`DATA   ${DATA_ROOT}`);
  console.log("");
});
