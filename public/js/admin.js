const socket = io();
let questions = [];
let assets = { videos: [], posters: [] };

const form = document.getElementById("questionForm");
const editingId = document.getElementById("editingId");
const formTitle = document.getElementById("formTitle");
const saveBtn = document.getElementById("saveBtn");
const cancelEdit = document.getElementById("cancelEdit");
const msg = document.getElementById("message");
const videoSelect = document.getElementById("video");
const posterSelect = document.getElementById("poster");

async function loadAssets() {
  const res = await fetch("/api/assets");
  assets = await res.json();
  fillAssetSelects();
}

function fillAssetSelects(selectedVideo = "", selectedPoster = "") {
  videoSelect.innerHTML = `<option value="">영상 선택</option>` + assets.videos.map(v =>
    `<option value="${escapeAttr(v.url)}" ${v.url === selectedVideo ? "selected" : ""}>${escapeHtml(v.name)}</option>`
  ).join("");

  posterSelect.innerHTML = `<option value="">포스터 없음</option>` + assets.posters.map(p =>
    `<option value="${escapeAttr(p.url)}" ${p.url === selectedPoster ? "selected" : ""}>${escapeHtml(p.name)}</option>`
  ).join("");
}

async function loadQuestions() {
  const res = await fetch("/api/questions");
  questions = await res.json();
  render();
}

function render() {
  const list = document.getElementById("questionList");
  const count = document.getElementById("count");
  count.textContent = questions.length ? `연습 1 + 본문제 ${Math.max(0, questions.length - 1)}` : "0문제";

  if (!questions.length) {
    list.innerHTML = `<div class="empty">등록된 문제가 없어.</div>`;
    return;
  }

  list.innerHTML = questions.map((q, idx) => `
    <article class="qitem">
      <div class="order">${idx === 0 ? "연습" : String(idx).padStart(2, "0")}</div>
      <div class="thumb">
        ${q.poster ? `<img src="${escapeAttr(q.poster)}" alt="">` : `<div class="noimg">NO POSTER</div>`}
      </div>
      <div class="qinfo">
        <strong>${escapeHtml(q.title || "(제목 없음)")}</strong>
        <span>${escapeHtml(q.store || "")}</span>
        <small>${escapeHtml(fileName(q.video))}${q.genre ? ` · ${escapeHtml(q.genre)}` : ""}${q.difficulty ? ` · ${escapeHtml(q.difficulty)}` : ""}${q.playtime ? ` · ${escapeHtml(q.playtime)}` : ""}</small>
      </div>
      <div class="qactions">
        <button onclick="moveItem(${idx}, -1)" ${idx === 0 ? "disabled" : ""}>↑</button>
        <button onclick="moveItem(${idx}, 1)" ${idx === questions.length - 1 ? "disabled" : ""}>↓</button>
        <button onclick="editItem('${escapeAttr(q.id)}')">수정</button>
        <button class="danger" onclick="deleteItem('${escapeAttr(q.id)}')">삭제</button>
      </div>
    </article>
  `).join("");
}

function fileName(url) {
  try { return decodeURIComponent(String(url || "").split("/").pop()); }
  catch { return String(url || ""); }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  })[c]);
}
function escapeAttr(s) { return escapeHtml(s); }

async function moveItem(idx, delta) {
  const next = idx + delta;
  if (next < 0 || next >= questions.length) return;
  [questions[idx], questions[next]] = [questions[next], questions[idx]];

  await fetch("/api/questions/reorder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids: questions.map(q => q.id) })
  });
  await loadQuestions();
}

function editItem(id) {
  const q = questions.find(x => x.id === id);
  if (!q) return;

  editingId.value = q.id;
  document.getElementById("title").value = q.title || "";
  document.getElementById("store").value = q.store || "";
  document.getElementById("genre").value = q.genre || "";
  document.getElementById("difficulty").value = q.difficulty || "";
  document.getElementById("playtime").value = q.playtime || "";
  fillAssetSelects(q.video || "", q.poster || "");

  formTitle.textContent = "문제 수정";
  saveBtn.textContent = "수정 저장";
  cancelEdit.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetForm() {
  form.reset();
  editingId.value = "";
  formTitle.textContent = "새 문제 등록";
  saveBtn.textContent = "문제 등록";
  cancelEdit.classList.add("hidden");
  fillAssetSelects();
  msg.textContent = "";
}

cancelEdit.addEventListener("click", resetForm);

async function deleteItem(id) {
  if (!confirm("이 문제를 삭제할까?")) return;
  const res = await fetch(`/api/questions/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (res.ok) await loadQuestions();
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.textContent = "저장 중...";

  const payload = {
    title: document.getElementById("title").value.trim(),
    store: document.getElementById("store").value.trim(),
    genre: document.getElementById("genre").value.trim(),
    difficulty: document.getElementById("difficulty").value.trim(),
    playtime: document.getElementById("playtime").value.trim(),
    video: videoSelect.value,
    poster: posterSelect.value
  };

  const id = editingId.value;
  const url = id ? `/api/questions/${encodeURIComponent(id)}` : "/api/questions";
  const method = id ? "PUT" : "POST";

  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    msg.textContent = data.message || "저장 실패";
    return;
  }

  resetForm();
  msg.textContent = "저장 완료!";
  await loadQuestions();
});

document.getElementById("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(questions, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "questions.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

document.getElementById("importFile").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    if (!Array.isArray(parsed)) throw new Error();
    const res = await fetch("/api/questions/replace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questions: parsed })
    });
    if (!res.ok) throw new Error();
    msg.textContent = "설정 불러오기 완료!";
    resetForm();
    await loadQuestions();
  } catch {
    alert("questions.json 형식이 아니야.");
  } finally {
    e.target.value = "";
  }
});

document.getElementById("resetBtn").addEventListener("click", async () => {
  if (!confirm("GitHub에 포함된 questions.json 기본값으로 되돌릴까?")) return;
  await fetch("/api/questions/reset", { method: "POST" });
  resetForm();
  await loadQuestions();
});

socket.on("questions:updated", loadQuestions);
Promise.all([loadAssets(), loadQuestions()]);
