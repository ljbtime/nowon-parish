// ── State ──────────────────────────────────────────────
const state = {
  currentUnit: 0,
  difficulties: {},     // unitId → 'easy' | 'medium' | 'hard'
  problemIndex: {},     // unitId+difficulty → index
  solutionVisible: {},  // unitId → bool
  pendingDifficulty: null,
  pendingUnitId: null
};

// ── Init ───────────────────────────────────────────────
function init() {
  curriculum.forEach(unit => {
    state.difficulties[unit.id] = 'medium';
    state.problemIndex[unit.id] = {};
    state.problemIndex[unit.id]['easy'] = 0;
    state.problemIndex[unit.id]['medium'] = 0;
    state.problemIndex[unit.id]['hard'] = 0;
    state.solutionVisible[unit.id] = false;
  });
  buildNav();
  renderUnit(0);
}

// ── Navigation ─────────────────────────────────────────
function buildNav() {
  const nav = document.getElementById('unit-nav');
  nav.innerHTML = curriculum.map((unit, i) => `
    <button class="unit-btn ${i === 0 ? 'active' : ''}"
            onclick="switchUnit(${i})" id="nav-btn-${i}">
      <span>${unit.icon}</span>
      <span>${unit.title}</span>
    </button>
  `).join('');
}

function switchUnit(index) {
  state.currentUnit = index;
  document.querySelectorAll('.unit-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i === index);
  });
  renderUnit(index);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Render Unit ────────────────────────────────────────
function renderUnit(index) {
  const unit = curriculum[index];
  const diff = state.difficulties[unit.id];
  const main = document.getElementById('main-content');

  main.innerHTML = `
    ${renderProgressBar(index)}
    <div class="section-title">${unit.icon} ${unit.title}</div>
    ${renderConceptCard(unit)}
    ${renderProblemSection(unit, diff)}
  `;
}

function renderProgressBar(index) {
  const pct = ((index + 1) / curriculum.length) * 100;
  return `
    <div class="progress-bar">
      <div class="progress-fill" style="width:${pct}%"></div>
    </div>
  `;
}

// ── Concept ────────────────────────────────────────────
function renderConceptCard(unit) {
  const sections = unit.concept.sections.map(sec => `
    <div class="concept-section">
      <h3>${sec.subtitle}</h3>
      ${sec.content}
    </div>
  `).join('');

  const keyPoints = unit.concept.keyPoints.map(p => `<li>${p}</li>`).join('');

  return `
    <div class="concept-card">
      <div class="concept-card-header">
        <h2>📖 개념 정리 — ${unit.concept.title}</h2>
      </div>
      <div class="concept-body">
        ${sections}
        <div class="key-points">
          <h4>핵심 포인트</h4>
          <ul>${keyPoints}</ul>
        </div>
      </div>
    </div>
  `;
}

// ── Problem ────────────────────────────────────────────
function renderProblemSection(unit, diff) {
  const problem = getCurrentProblem(unit.id, diff);
  const visible = state.solutionVisible[unit.id];
  const badgeClass = { easy: 'badge-easy', medium: 'badge-medium', hard: 'badge-hard' }[diff];
  const diffLabel = { easy: '쉬움', medium: '보통', hard: '어려움' }[diff];

  return `
    <div class="problem-section-header">
      <h2 style="font-size:1.2rem;font-weight:700;">✏️ 예제 문제</h2>
      <span class="difficulty-badge ${badgeClass}">${diffLabel}</span>
    </div>

    <div class="problem-card">
      <div class="problem-card-header">
        <div class="problem-label">문제</div>
        <div class="problem-question">${problem.question}</div>
      </div>
      <div class="problem-card-body">
        <div class="action-row">
          <button class="btn btn-outline" onclick="toggleSolution('${unit.id}')">
            ${visible ? '🙈 풀이 숨기기' : '💡 풀이 보기'}
          </button>
          <button class="btn btn-refill" onclick="openRefillModal('${unit.id}')">
            🔄 문제 새로 받기
          </button>
        </div>

        ${visible ? renderSolution(problem) : ''}
      </div>
    </div>
  `;
}

function renderSolution(problem) {
  const steps = problem.steps.map((step, i) => `
    <div class="step-item">
      <div class="step-num">${i + 1}</div>
      <div class="step-text">${step}</div>
    </div>
  `).join('');

  return `
    <div class="solution-box">
      <div class="solution-header">📝 풀이 과정</div>
      <div class="solution-steps">${steps}</div>
      <div class="answer-box">
        <span class="answer-label">정답</span>
        <span class="answer-value">${problem.answer}</span>
      </div>
    </div>
  `;
}

// ── Solution Toggle ────────────────────────────────────
function toggleSolution(unitId) {
  state.solutionVisible[unitId] = !state.solutionVisible[unitId];
  const unit = curriculum[state.currentUnit];
  const diff = state.difficulties[unitId];
  const sectionEl = document.querySelector('.problem-card .problem-card-body');
  const problem = getCurrentProblem(unitId, diff);
  const visible = state.solutionVisible[unitId];

  sectionEl.innerHTML = `
    <div class="action-row">
      <button class="btn btn-outline" onclick="toggleSolution('${unitId}')">
        ${visible ? '🙈 풀이 숨기기' : '💡 풀이 보기'}
      </button>
      <button class="btn btn-refill" onclick="openRefillModal('${unitId}')">
        🔄 문제 새로 받기
      </button>
    </div>
    ${visible ? renderSolution(problem) : ''}
  `;
}

// ── Problem Selection ──────────────────────────────────
function getCurrentProblem(unitId, diff) {
  const unit = curriculum.find(u => u.id === unitId);
  const pool = unit.problems[diff];
  const idx = state.problemIndex[unitId][diff] % pool.length;
  return pool[idx];
}

function getNextProblem(unitId, diff) {
  const unit = curriculum.find(u => u.id === unitId);
  const pool = unit.problems[diff];
  const current = state.problemIndex[unitId][diff];
  // 다음 인덱스 (현재와 다른 문제)
  state.problemIndex[unitId][diff] = (current + 1) % pool.length;
}

// ── Refill Modal ───────────────────────────────────────
function openRefillModal(unitId) {
  state.pendingUnitId = unitId;
  const currentDiff = state.difficulties[unitId];
  state.pendingDifficulty = currentDiff;

  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.diff === currentDiff);
  });

  document.getElementById('modal-overlay').classList.add('show');
}

function selectDifficulty(diff) {
  state.pendingDifficulty = diff;
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.diff === diff);
  });
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('show');
  state.pendingUnitId = null;
  state.pendingDifficulty = null;
}

function confirmRefill() {
  const unitId = state.pendingUnitId;
  const newDiff = state.pendingDifficulty;

  if (!unitId || !newDiff) return;

  // 다음 문제 인덱스로 이동
  getNextProblem(unitId, newDiff);
  state.difficulties[unitId] = newDiff;
  state.solutionVisible[unitId] = false;

  closeModal();
  renderUnit(state.currentUnit);
}

// ── Close modal on overlay click ──────────────────────
document.getElementById('modal-overlay').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

// ── Start ──────────────────────────────────────────────
init();
