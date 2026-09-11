const socket = io();
let questions = [];

const form = document.getElementById("questionForm");
const editingId = document.getElementById("editingId");
const formTitle = document.getElementById("formTitle");
const saveBtn = document.getElementById("saveBtn");
const cancelEdit = document.getElementById("cancelEdit");
const msg = document.getElementById("message");

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
    list.innerHTML = `<div class="empty">아직 등록된 문제가 없어.</div>`;
    return;
  }

  list.innerHTML = questions.map((q, idx) => `
    <article class="qitem">
      <div class="order">${idx === 0 ? "연습" : String(idx).padStart(2, "0")}</div>
      <div class="thumb">
        ${q.poster ? `<img src="${q.poster}" alt="">` : `<div class="noimg">NO POSTER</div>`}
      </div>
      <div class="qinfo">
        <strong>${escapeHtml(q.title || "(제목 없음)")}</strong>
        <span>${escapeHtml(q.store || "")}</span>
        <small>${escapeHtml(q.genre || "")}${q.difficulty ? ` · ${escapeHtml(q.difficulty)}` : ""}${q.playtime ? ` · ${escapeHtml(q.playtime)}` : ""}</small>
      </div>
      <div class="qactions">
        <button onclick="moveItem(${idx}, -1)" ${idx === 0 ? "disabled" : ""}>↑</button>
        <button onclick="moveItem(${idx}, 1)" ${idx === questions.length - 1 ? "disabled" : ""}>↓</button>
        <button onclick="editItem('${q.id}')">수정</button>
        <button class="danger" onclick="deleteItem('${q.id}')">삭제</button>
      </div>
    </article>
  `).join("");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  })[c]);
}

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

  formTitle.textContent = "문제 수정";
  saveBtn.textContent = "수정 저장";
  cancelEdit.classList.remove("hidden");
  document.getElementById("videoRequired").style.display = "none";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetForm() {
  form.reset();
  editingId.value = "";
  formTitle.textContent = "새 문제 등록";
  saveBtn.textContent = "문제 등록";
  cancelEdit.classList.add("hidden");
  document.getElementById("videoRequired").style.display = "";
  msg.textContent = "";
}

cancelEdit.addEventListener("click", resetForm);

async function deleteItem(id) {
  if (!confirm("이 문제를 삭제할까?")) return;
  const res = await fetch(`/api/questions/${id}`, { method: "DELETE" });
  if (res.ok) await loadQuestions();
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.textContent = "저장 중...";

  const fd = new FormData();
  fd.append("title", document.getElementById("title").value.trim());
  fd.append("store", document.getElementById("store").value.trim());
  fd.append("genre", document.getElementById("genre").value.trim());
  fd.append("difficulty", document.getElementById("difficulty").value.trim());
  fd.append("playtime", document.getElementById("playtime").value.trim());

  const video = document.getElementById("video").files[0];
  const poster = document.getElementById("poster").files[0];
  if (video) fd.append("video", video);
  if (poster) fd.append("poster", poster);

  const id = editingId.value;
  const url = id ? `/api/questions/${id}` : "/api/questions";
  const method = id ? "PUT" : "POST";

  const res = await fetch(url, { method, body: fd });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    msg.textContent = data.message || "저장 실패";
    return;
  }

  msg.textContent = "저장 완료!";
  resetForm();
  await loadQuestions();
});

socket.on("questions:updated", loadQuestions);
loadQuestions();