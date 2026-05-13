/* ============================================================
   EPR QKD Simulator — script.js (CORREGIDO)
   ============================================================ */

let simDone      = false;
let eveOn        = false;
let simData      = null;
let allRows      = [];
let activeFilter = 'all';

let currentPairIndex = 0;
let measurementPairs = [];
let circuitPairIndex = 0;
let circuitAnimationFrame = null;
let circuitAnimationStart = 0;
let circuitFlashCooldown = false;

/* ──────────────────────────────────────────
   Eve toggle
────────────────────────────────────────── */
function toggleEve() {
  eveOn = !eveOn;
  const btn = document.getElementById('eveBtn');
  btn.innerHTML = `
    <svg viewBox="0 0 14 14" fill="none" width="14" height="14" style="flex-shrink:0">
      <circle cx="7" cy="5" r="2.5" stroke="currentColor" stroke-width="1.2"/>
      <path d="M2 11c0-2.2 2.2-4 5-4s5 1.8 5 4"
            stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
    </svg>
    ${eveOn ? '⚠ Eve activa' : 'Sin espía (Eve)'}`;
  btn.className = 'eve-toggle' + (eveOn ? ' active' : '');
}

/* ──────────────────────────────────────────
   Tab navigation
────────────────────────────────────────── */
function showTab(i) {
  if (!simDone && i > 0) return;
  document.querySelectorAll('.step-tab').forEach((t, j) => t.classList.toggle('active', j === i));
  document.querySelectorAll('.step-panel').forEach((p, j) => p.classList.toggle('active', j === i));
  // Si se abre el panel del circuito y hay datos, refrescar
  if (i === 4 && simData) {
    renderCircuit();
    startCircuitPhotonAnimation();
  } else {
    stopCircuitPhotonAnimation();
  }
}

/* ──────────────────────────────────────────
   Main simulation call
────────────────────────────────────────── */
async function runSim() {
  const btn = document.getElementById('simBtn');
  btn.disabled    = true;
  btn.textContent = '⏳ Simulando…';

  const total_pairs     = parseInt(document.getElementById('rN').value);
  const test_pairs      = parseInt(document.getElementById('rT').value);
  const eve_probability = eveOn ? 0.25 : 0.0;

  try {
    const res = await fetch('/simulate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ total_pairs, test_pairs, eve_probability, seed: null })
    });
    simData = await res.json();
  } catch (err) {
    alert('Error al contactar Flask. Asegúrate de que app.py está corriendo en http://127.0.0.1:5000');
    btn.disabled    = false;
    btn.textContent = '▶ Simular';
    return;
  }

  allRows      = simData.meas_rows;
  activeFilter = 'all';

  renderPairs();
  renderChannel();
  renderMeasurements();
  renderCorrelations();
  renderDecision();
  renderCircuit();   // ← NUEVO: actualiza el panel Circuito

  simDone = true;
  ['tab1', 'tab2', 'tab3', 'tab4'].forEach(id => {
    document.getElementById(id).disabled = false;
  });
  document.getElementById('nextToMeas').disabled = false;

  showTab(0);
  btn.disabled    = false;
  btn.textContent = '▶ Simular';
}

/* ──────────────────────────────────────────
   Pairs grid
────────────────────────────────────────── */
function pairColor(idx) {
  const isTest = idx < simData.test_pairs;
  if (isTest) return eveOn ? '#E24B4A' : '#378ADD';
  return simData.safe ? '#639922' : '#9c9a92';
}

function pairLabel(idx) {
  const isTest = idx < simData.test_pairs;
  if (isTest) return eveOn ? 'Prueba (Eve intercepta)' : 'Prueba de correlación';
  return simData.safe ? 'Reservado para clave' : 'Sin usar (protocolo abortado)';
}

function renderPairs() {
  const total = simData.test_pairs + simData.key_pairs;
  const grid  = document.getElementById('pairsGrid');
  grid.innerHTML = '';

  for (let i = 0; i < total; i++) {
    const col     = pairColor(i);
    const label   = pairLabel(i);
    const row     = simData.meas_rows[i];
    const measTip = row
      ? `Base A:${row.alice_base} B:${row.bob_base} · ${row.alice_res}/${row.bob_res}`
      : '';

    const div = document.createElement('div');
    div.className = 'pair-cell';
    div.innerHTML = `
      <svg viewBox="0 0 40 38" xmlns="http://www.w3.org/2000/svg">
        <circle cx="13" cy="19" r="10" fill="${col}" fill-opacity=".18"
                stroke="${col}" stroke-width="1.4"/>
        <circle cx="27" cy="19" r="10" fill="${col}" fill-opacity=".18"
                stroke="${col}" stroke-width="1.4"/>
        <line x1="19" y1="19" x2="21" y2="19" stroke="${col}"
              stroke-width="1.4" stroke-dasharray="2 1"/>
        <text x="13" y="23" text-anchor="middle" font-size="7.5" fill="${col}"
              font-family="JetBrains Mono,monospace" font-weight="700">A</text>
        <text x="27" y="23" text-anchor="middle" font-size="7.5" fill="${col}"
              font-family="JetBrains Mono,monospace" font-weight="700">B</text>
      </svg>
      <div class="pair-tooltip">#${i+1} · ${label}${measTip ? '<br>'+measTip : ''}</div>`;
    grid.appendChild(div);
  }
}

/* ──────────────────────────────────────────
   Channel diagram
────────────────────────────────────────── */
function renderChannel() {
  const svg = document.getElementById('channelSvg');
  const { test_pairs, key_pairs } = simData;

  svg.innerHTML = `
  <defs>
    <marker id="arr2" viewBox="0 0 10 10" refX="8" refY="5"
            markerWidth="5" markerHeight="5" orient="auto-start-reverse">
      <path d="M2 1L8 5L2 9" fill="none" stroke="#1D9E75"
            stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </marker>
  </defs>
  <rect x="10"  y="28" width="120" height="34" rx="7"
        fill="#f5f4f1" stroke="#c8c7bf" stroke-width="0.5"/>
  <text x="70"  y="49" text-anchor="middle" font-size="12" fill="#1a1a18"
        font-family="JetBrains Mono,monospace" font-weight="700">Alice</text>
  <rect x="255" y="14" width="130" height="62" rx="9"
        fill="#e1f5ee" stroke="#5DCAA5" stroke-width="1"/>
  <text x="320" y="40" text-anchor="middle" font-size="11" fill="#0F6E56"
        font-family="JetBrains Mono,monospace" font-weight="700">Fuente EPR</text>
  <text x="320" y="58" text-anchor="middle" font-size="11" fill="#1D9E75"
        font-family="JetBrains Mono,monospace">|Φ⁺⟩</text>
  <rect x="510" y="28" width="120" height="34" rx="7"
        fill="#f5f4f1" stroke="#c8c7bf" stroke-width="0.5"/>
  <text x="570" y="49" text-anchor="middle" font-size="12" fill="#1a1a18"
        font-family="JetBrains Mono,monospace" font-weight="700">Bob</text>
  <line x1="130" y1="45" x2="255" y2="45" stroke="#1D9E75"
        stroke-width="1.8" marker-end="url(#arr2)"/>
  <line x1="385" y1="45" x2="510" y2="45" stroke="#1D9E75"
        stroke-width="1.8" marker-end="url(#arr2)"/>
  <text x="193" y="32" text-anchor="middle" font-size="9.5" fill="#1D9E75"
        font-family="JetBrains Mono,monospace">${test_pairs} prueba + ${key_pairs} clave</text>
  ${eveOn ? `
  <ellipse cx="320" cy="83" rx="35" ry="13"
           fill="#fff0f0" stroke="#f09595" stroke-width="0.8"/>
  <text x="320" y="87" text-anchor="middle" font-size="10" fill="#a32d2d"
        font-family="JetBrains Mono,monospace" font-weight="700">Eve</text>
  <line x1="320" y1="76" x2="320" y2="70" stroke="#E24B4A"
        stroke-width="1" stroke-dasharray="2 2"/>` : ''}`;
}

/* ──────────────────────────────────────────
   Bloch sphere (solo flecha, sin etiqueta flotante)
────────────────────────────────────────── */
function getStateLabel(base, res) {
  if (base === 'Z') return res === 1 ? '|0⟩' : '|1⟩';
  return res === 1 ? '|+⟩' : '|−⟩';
}

function drawBlochSphere(svgEl, base, result) {
  const cx = 100, cy = 100, r = 72;

  const angleDeg = base === 'Z'
    ? (result === 1 ? -90 : 90)
    : (result === 1 ?   0 : 180);
  const rad = angleDeg * Math.PI / 180;
  const tx = cx + r * Math.cos(rad);
  const ty = cy + r * Math.sin(rad);
  const col = result === 1 ? '#2C7CB0' : '#D9534F';

  const zActive = base === 'Z';
  const xActive = base === 'X';
  const zCol0 = zActive ? '#2C7CB0' : '#b0bec5';
  const zCol1 = zActive ? '#D9534F' : '#b0bec5';
  const xColP = xActive ? '#2C7CB0' : '#b0bec5';
  const xColM = xActive ? '#D9534F' : '#b0bec5';

  svgEl.innerHTML = `
    <circle cx="${cx}" cy="${cy}" r="${r}"
            fill="#f8f9fa" stroke="#dee2e6" stroke-width="1.5"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * 0.28}"
             fill="none" stroke="#cfd8dc" stroke-width="1" stroke-dasharray="5 3"/>
    <line x1="${cx}" y1="${cy - r}" x2="${cx}" y2="${cy + r}"
          stroke="${zActive ? '#90a4ae' : '#cfd8dc'}" stroke-width="${zActive ? 1.4 : 0.9}"
          stroke-dasharray="4 3"/>
    <line x1="${cx - r}" y1="${cy}" x2="${cx + r}" y2="${cy}"
          stroke="${xActive ? '#90a4ae' : '#cfd8dc'}" stroke-width="${xActive ? 1.4 : 0.9}"
          stroke-dasharray="4 3"/>
    <text x="${cx}" y="${cy - r - 10}"
          text-anchor="middle" dominant-baseline="auto"
          font-size="12" font-family="JetBrains Mono,monospace"
          font-weight="${zActive ? '700' : '400'}" fill="${zCol0}">|0⟩</text>
    <text x="${cx}" y="${cy + r + 22}"
          text-anchor="middle" dominant-baseline="auto"
          font-size="12" font-family="JetBrains Mono,monospace"
          font-weight="${zActive ? '700' : '400'}" fill="${zCol1}">|1⟩</text>
    <text x="${cx + r + 10}" y="${cy}"
          text-anchor="start" dominant-baseline="middle"
          font-size="12" font-family="JetBrains Mono,monospace"
          font-weight="${xActive ? '700' : '400'}" fill="${xColP}">|+⟩</text>
    <text x="${cx - r - 10}" y="${cy}"
          text-anchor="end" dominant-baseline="middle"
          font-size="12" font-family="JetBrains Mono,monospace"
          font-weight="${xActive ? '700' : '400'}" fill="${xColM}">|−⟩</text>
    <line x1="${cx}" y1="${cy}" x2="${tx}" y2="${ty}"
          stroke="${col}" stroke-width="4" stroke-linecap="round"/>
    <circle cx="${tx}" cy="${ty}" r="7" fill="${col}"/>
    <circle cx="${cx}" cy="${cy}" r="3" fill="#546e7a" opacity="0.65"/>
  `;
}

/* ──────────────────────────────────────────
   Carousel (Bloch)
────────────────────────────────────────── */
function updateBlochCarousel() {
  const pair     = measurementPairs[currentPairIndex];
  const aliceSvg = document.getElementById('aliceBlochSvg');
  const bobSvg   = document.getElementById('bobBlochSvg');
  const noteDiv  = document.getElementById('entanglementNote');

  drawBlochSphere(aliceSvg, pair.alice_base, pair.alice_res);
  drawBlochSphere(bobSvg,   pair.bob_base,   pair.bob_res);

  let noteText, noteBorder;
  if (pair.same_base) {
    if (pair.eve_error) {
      noteText   = `⚠ Misma base (${pair.alice_base}) → resultados DISTINTOS por intervención de Eve.
                    En un par EPR perfecto esto no debería ocurrir.`;
      noteBorder = '#E24B4A';
    } else if (pair.same) {
      noteText   = `✓ Misma base (${pair.alice_base}) → resultados CORRELACIONADOS.
                    Alice y Bob obtienen el mismo bit: correlación cuántica perfecta.`;
      noteBorder = '#1D9E75';
    } else {
      noteText   = `✗ Misma base (${pair.alice_base}) → resultados DISTINTOS (variación estadística).`;
      noteBorder = '#BA7517';
    }
  } else {
    noteText   = `ℹ Bases distintas (Alice: ${pair.alice_base}, Bob: ${pair.bob_base}).
                  Los resultados son aleatorios e independientes (~50% de coincidencia).
                  Este par no se usa para la clave.`;
    noteBorder = '#888780';
  }
  noteDiv.style.borderLeftColor = noteBorder;
  noteDiv.innerHTML = noteText;

  document.getElementById('currentPairIdx').textContent = currentPairIndex + 1;
  document.getElementById('pairSlider').value           = currentPairIndex + 1;
}

function initCarousel(meas_rows) {
  measurementPairs = meas_rows;
  const total      = meas_rows.length;
  document.getElementById('totalPairsCount').textContent = total;
  const slider = document.getElementById('pairSlider');
  slider.max   = total;
  slider.value = 1;
  currentPairIndex = 0;

  slider.oninput = e => {
    currentPairIndex = parseInt(e.target.value) - 1;
    updateBlochCarousel();
  };
  document.getElementById('prevPairBtn').onclick = () => {
    if (currentPairIndex > 0) {
      currentPairIndex--;
      updateBlochCarousel();
    }
  };
  document.getElementById('nextPairBtn').onclick = () => {
    if (currentPairIndex < total - 1) {
      currentPairIndex++;
      updateBlochCarousel();
    }
  };
  updateBlochCarousel();
}

/* ──────────────────────────────────────────
   Measurement table
────────────────────────────────────────── */
function setFilter(f, btn) {
  activeFilter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  applyFilter();
}

function applyFilter() {
  document.querySelectorAll('#measBody tr[data-idx]').forEach(tr => {
    const sameBase = tr.dataset.sameBase === 'true';
    const eveErr   = tr.dataset.eveError  === 'true';
    let show = true;
    if (activeFilter === 'same_base') show = sameBase;
    if (activeFilter === 'diff_base') show = !sameBase;
    if (activeFilter === 'eve_error') show = eveErr;
    tr.classList.toggle('hidden-row', !show);
  });
}

function renderMeasurements() {
  const { meas_rows, eve_errors, same_base_count } = simData;
  initCarousel(meas_rows);

  const eveAlert = document.getElementById('eveAlert');
  if (eveOn && eve_errors > 0) {
    eveAlert.style.display = 'block';
    eveAlert.innerHTML = `<strong>Eve detectada en las correlaciones</strong>
      De los ${same_base_count} pares donde Alice y Bob eligieron la misma base,
      <strong>${eve_errors} pares (${Math.round(eve_errors / same_base_count * 100)}%)
      dieron resultados distintos</strong> — algo imposible sin perturbación externa
      con pares EPR perfectos. Eve mide el qubit, colapsa el estado y lo reenvía,
      introduciendo este error detectable.`;
    document.getElementById('filterEve').style.display = '';
  } else {
    eveAlert.style.display = 'none';
    document.getElementById('filterEve').style.display = 'none';
  }

  document.getElementById('measCount').textContent =
    `(${meas_rows.length} mediciones · ${same_base_count} misma base · ${eve_errors} errores Eve)`;
  document.getElementById('measFilters').style.display = 'flex';

  const tbody = document.getElementById('measBody');
  tbody.innerHTML = '';
  meas_rows.forEach(r => {
    const noteClass = r.eve_error ? 'note-eve' : r.same_base ? 'note-same' : 'note-diff';
    const noteText  = r.eve_error ? '⚠ Error de Eve' : r.same_base ? 'Misma base' : 'Bases distintas';
    const tr = document.createElement('tr');
    tr.dataset.idx      = r.pair;
    tr.dataset.sameBase = r.same_base;
    tr.dataset.eveError = r.eve_error;
    if (r.eve_error) tr.classList.add('eve-error-row');
    tr.innerHTML = `
      <td style="color:#9c9a92;font-family:'JetBrains Mono',monospace;font-size:11px">${r.pair}</td>
      <td><span class="bpill bpill-${r.alice_base.toLowerCase()}">${r.alice_base}</span></td>
      <td><span class="bpill bpill-${r.bob_base.toLowerCase()}">${r.bob_base}</span></td>
      <td><span class="rpill rpill-${r.alice_res}">${r.alice_res === 1 ? '+1' : '−1'}</span></td>
      <td><span class="rpill rpill-${r.bob_res}">${r.bob_res === 1 ? '+1' : '−1'}</span></td>
      <td class="${r.same ? 'match-y' : 'match-n'}">${r.same ? '✓ sí' : '✗ no'}</td>
      <td><span class="note-tag ${noteClass}">${noteText}</span></td>`;
    tbody.appendChild(tr);
  });
}

/* ──────────────────────────────────────────
   Correlations
────────────────────────────────────────── */
function renderCorrelations() {
  const { E, E_products, S } = simData;
  const combos = [
    { k:'ZZ', label:'Z | Z', col:'#185FA5',
      desc:'Misma base Z — sin Eve: 100% coincidencia esperada',
      expected: eveOn ? '~75%' : '~100%' },
    { k:'XX', label:'X | X', col:'#0F6E56',
      desc:'Misma base X — sin Eve: 100% coincidencia esperada',
      expected: eveOn ? '~75%' : '~100%' },
    { k:'ZX', label:'Z | X', col:'#5f5e5a',
      desc:'Bases distintas — siempre ~50% (aleatorio)',
      expected:'~50%' },
    { k:'XZ', label:'X | Z', col:'#5f5e5a',
      desc:'Bases distintas — siempre ~50% (aleatorio)',
      expected:'~50%' },
  ];
  const grid = document.getElementById('corrGrid');
  grid.innerHTML = '';
  combos.forEach(c => {
    const pct = Math.round(E[c.k] * 100);
    const ep  = E_products[c.k].toFixed(3);
    grid.innerHTML += `
      <div class="corr-card">
        <div class="corr-bases" style="color:${c.col}">${c.label}</div>
        <div class="corr-desc">${c.desc}</div>
        <div class="corr-pct" style="color:${c.col}">${pct}%</div>
        <div class="corr-bar-bg">
          <div class="corr-bar-fill" style="width:${pct}%;background:${c.col}"></div>
        </div>
        <div class="corr-sub">concordancia observada · esperado: ${c.expected}</div>
        <div class="corr-expected" style="color:${c.col}">E = ${ep}</div>
      </div>`;
  });
  const sEl = document.getElementById('sVal');
  sEl.textContent = S;
  sEl.style.color = simData.safe ? '#27500a' : '#791f1f';
  const pct = Math.min(100, Math.round((S / 2.828) * 100));
  const bar = document.getElementById('sGaugeBar');
  bar.style.width      = pct + '%';
  bar.style.background = simData.safe ? '#639922' : '#E24B4A';
}

/* ──────────────────────────────────────────
   Decision + key
────────────────────────────────────────── */
function renderDecision() {
  const { S, threshold, safe, key_pairs_available, eve_errors, same_base_count } = simData;
  const checkSvg = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <polyline points="2,7 5.5,10.5 12,3.5" stroke="white" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const crossSvg = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <line x1="3" y1="3" x2="11" y2="11" stroke="white" stroke-width="2" stroke-linecap="round"/>
    <line x1="11" y1="3" x2="3" y2="11" stroke="white" stroke-width="2" stroke-linecap="round"/>
    </svg>`;
  const area = document.getElementById('verdictArea');
  const keyGenArea = document.getElementById('keyGenArea');

  if (safe) {
    area.innerHTML = `
      <div class="verdict-box safe">
        <div class="verdict-icon">${checkSvg}</div>
        <div>
          <div class="verdict-title">Canal seguro — protocolo completado</div>
          <div class="verdict-body">
            S = <strong>${S}</strong> supera el umbral Bell-CHSH de <strong>${threshold}</strong>.<br>
            Las correlaciones cuánticas son suficientemente fuertes para descartar espionaje relevante.<br>
            Quedan <strong>${key_pairs_available}</strong> pares EPR para generar la clave.
          </div>
        </div>
      </div>`;
    if (keyGenArea) {
      keyGenArea.style.display = 'block';
      window.keyPairsAvailable = key_pairs_available;
    }
  } else {
    area.innerHTML = `
      <div class="verdict-box unsafe">
        <div class="verdict-icon">${crossSvg}</div>
        <div>
          <div class="verdict-title">Protocolo abortado — correlaciones insuficientes</div>
          <div class="verdict-body">
            S = <strong>${S}</strong> no supera el umbral de <strong>${threshold}</strong>.
            ${eve_errors > 0 ? ` Eve introdujo <strong>${eve_errors}</strong> errores en ${same_base_count} pares de misma base.` : ''}
            No se puede generar clave.
          </div>
        </div>
      </div>`;
    if (keyGenArea) keyGenArea.style.display = 'none';
  }
}

/* ──────────────────────────────────────────
   Generación de clave dinámica
────────────────────────────────────────── */
let selectedBase = 'Z';

function setKeyBase(base) {
  selectedBase = base;
  document.getElementById('baseZBtn').classList.toggle('active', base === 'Z');
  document.getElementById('baseXBtn').classList.toggle('active', base === 'X');
}
async function generateKeyFromBase() {
  const btn = document.getElementById('genKeyBtn');
  const keyGenContainer = document.getElementById('dynamicKey'); // ← contenedor principal
  btn.disabled = true;
  btn.textContent = '⏳ Generando...';
  try {
    const res = await fetch('/generate_key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key_pairs: window.keyPairsAvailable,
        base: selectedBase,
        eve_probability: eveOn ? 0.25 : 0.0,
        seed: null
      })
    });
    const data = await res.json();
    const grid = document.getElementById('dynamicKeyGrid');
    const meta = document.getElementById('dynamicKeyMeta');
    const label = document.querySelector('#dynamicKey .section-label'); // el label dentro del contenedor
    grid.innerHTML = '';
    if (data.key_bits && data.key_bits.length) {
      simData.key_bits = data.key_bits;
      simData.key_length = data.key_length;
      keyGenContainer.style.display = 'block';
      label.style.display = '';      // mostrar el label "Clave generada"
      data.key_bits.forEach(b => {
        const d = document.createElement('div');
        d.className = `kb kb-${b}`;
        d.textContent = b;
        grid.appendChild(d);
      });
      meta.textContent = `${data.key_length} bits generados en base ${selectedBase}`;
      if (document.getElementById('panel4').classList.contains('active')) renderCircuit();
    } else {
      keyGenContainer.style.display = 'none';
    }
  } catch (err) {
    alert('Error al generar clave: ' + err);
  } finally {
    btn.disabled = false;
    btn.textContent = '▶ Generar clave';
  }
}

/* ──────────────────────────────────────────
   Circuito (nuevo módulo)
────────────────────────────────────────── */
function formatResult(res) {
  return res === 1 ? '+1' : '−1';
}

function circuitPairs() {
  return simData?.meas_rows || [];
}

function getCircuitPair(index = circuitPairIndex) {
  const pairs = circuitPairs();
  if (!pairs.length) return null;
  return pairs[Math.max(0, Math.min(index, pairs.length - 1))];
}

function animateMeasurementPulse(text) {
  const pulse = document.getElementById('measurementPulse');
  const pulseText = document.getElementById('measurementPulseText');
  if (!pulse || !pulseText) return;
  pulseText.textContent = text;
  pulse.classList.remove('active');
  void pulse.offsetHeight;
  pulse.classList.add('active');
}

function populateCircuitPairSelector() {
  const select = document.getElementById('circuitPairSelect');
  if (!select) return;
  const pairs = circuitPairs();
  select.innerHTML = '';

  if (!pairs.length) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'Sin pares disponibles';
    select.appendChild(opt);
    select.disabled = true;
    return;
  }

  select.disabled = false;
  pairs.forEach((pair, idx) => {
    const opt = document.createElement('option');
    const sameBaseTag = pair.same_base ? 'misma base' : 'bases distintas';
    opt.value = idx;
    opt.textContent = `Par ${pair.pair} · ${pair.alice_base}/${pair.bob_base} · ${sameBaseTag}`;
    select.appendChild(opt);
  });
  select.value = String(circuitPairIndex);
}

function updateCircuitPairDetails() {
  const pair = getCircuitPair();
  const prevBtn = document.getElementById('circuitPrevPair');
  const nextBtn = document.getElementById('circuitNextPair');
  const select = document.getElementById('circuitPairSelect');
  const pairs = circuitPairs();

  if (prevBtn) prevBtn.disabled = circuitPairIndex <= 0;
  if (nextBtn) nextBtn.disabled = circuitPairIndex >= pairs.length - 1 || pairs.length === 0;
  if (select && pairs.length) select.value = String(circuitPairIndex);

  if (!pair) {
    document.getElementById('aliceLastBase').innerHTML = 'Base: —';
    document.getElementById('aliceLastResult').innerHTML = 'Resultado: —';
    document.getElementById('bobLastBase').innerHTML = 'Base: —';
    document.getElementById('bobLastResult').innerHTML = 'Resultado: —';
    document.getElementById('pairTypePill').textContent = 'Par: —';
    document.getElementById('correlationPill').textContent = 'Correlación: —';
    animateMeasurementPulse('Listo para medir');
    return;
  }

  document.getElementById('aliceLastBase').innerHTML = `Base: <strong>${pair.alice_base}</strong>`;
  document.getElementById('aliceLastResult').innerHTML = `Resultado: <strong>${formatResult(pair.alice_res)}</strong>`;
  document.getElementById('bobLastBase').innerHTML = `Base: <strong>${pair.bob_base}</strong>`;
  document.getElementById('bobLastResult').innerHTML = `Resultado: <strong>${formatResult(pair.bob_res)}</strong>`;

  const pairTypePill = document.getElementById('pairTypePill');
  const correlationPill = document.getElementById('correlationPill');
  pairTypePill.textContent = pair.same_base
    ? `Par ${pair.pair} · misma base ${pair.alice_base}`
    : `Par ${pair.pair} · bases ${pair.alice_base}/${pair.bob_base}`;

  if (pair.same_base) {
    correlationPill.textContent = pair.same
      ? 'Correlación: ✓ coinciden'
      : 'Correlación: ✕ no coinciden';
    correlationPill.style.color = pair.same ? '#0F6E56' : '#9b302d';
    correlationPill.style.borderColor = pair.same ? '#cde9dd' : '#f0d0cf';
    correlationPill.style.background = pair.same ? '#e8f6f0' : '#fcebeb';
  } else {
    correlationPill.textContent = 'Correlación: ∼ bases distintas';
    correlationPill.style.color = '#55626d';
    correlationPill.style.borderColor = '#dde3e7';
    correlationPill.style.background = '#f7f9fa';
  }

  const pulseMsg = pair.same_base
    ? `Par ${pair.pair}: medición en ${pair.alice_base} con ${pair.same ? 'correlación observada' : 'desajuste detectado'}`
    : `Par ${pair.pair}: bases distintas, este par no entra a la clave`;
  animateMeasurementPulse(pulseMsg);
}

function updateCircuitKeyView() {
  const keyBitsDiv = document.getElementById('circuitKeyBits');
  const progressFill = document.getElementById('keyProgressFill');
  const progressMeta = document.getElementById('keyProgressMeta');
  const exportBtn = document.getElementById('exportKeyBtn');
  const keyBits = simData?.key_bits || [];
  const keyLength = simData?.key_length || 0;
  const available = simData?.key_pairs_available || simData?.key_pairs || 0;
  const visibleBits = keyBits.slice(0, 200).join('');

  if (!keyBits.length) {
    keyBitsDiv.textContent = 'Clave no generada';
    keyBitsDiv.dataset.copyValue = '';
    progressFill.style.width = '0%';
    progressMeta.textContent = available
      ? `0 de ${available} bits generados. Usa "Generar clave" en el panel anterior.`
      : '0 bits disponibles';
    exportBtn.disabled = true;
    return;
  }

  const pct = available ? Math.min(100, Math.round((keyLength / available) * 100)) : 100;
  keyBitsDiv.textContent = visibleBits + (keyBits.length > 200 ? '…' : '');
  keyBitsDiv.dataset.copyValue = visibleBits;
  progressFill.style.width = `${pct}%`;
  progressMeta.textContent = `${keyLength} bits generados${available ? ` de ${available}` : ''} · vista de hasta 200 bits`;
  exportBtn.disabled = false;
}

function updateCircuitSecurity() {
  const status = document.getElementById('channelStatus');
  const security = document.getElementById('circuitSecurity');
  const caption = document.getElementById('channelCaption');
  const eveIndicator = document.getElementById('eveIndicator');
  const eveAvatar = document.getElementById('eveAvatar');
  const channelNoise = document.getElementById('channelNoise');
  const eveDetected = eveOn && simData.eve_errors > 0;

  if (eveDetected) {
    status.textContent = 'Transmitiendo con interferencia';
    security.textContent = simData.safe ? 'Canal vigilado' : 'Canal inseguro';
    security.className = `security-pill ${simData.safe ? 'safe' : 'unsafe'}`;
    caption.textContent = 'La perturbación de Eve introduce ruido visible en el canal y puede degradar las correlaciones.';
    eveIndicator.style.display = 'block';
    eveAvatar.classList.add('active');
    channelNoise.classList.add('active');
  } else {
    status.textContent = simDone ? 'Transmitiendo en canal seguro' : 'Esperando simulación';
    security.textContent = simData.safe ? 'Canal seguro' : 'Canal inseguro';
    security.className = `security-pill ${simData.safe ? 'safe' : 'unsafe'}`;
    caption.textContent = simData.safe
      ? 'El fotón viaja sin señales de intervención detectables en el test de Bell.'
      : 'Las correlaciones observadas no alcanzan el umbral de seguridad del protocolo.';
    eveIndicator.style.display = 'none';
    eveAvatar.classList.remove('active');
    channelNoise.classList.remove('active');
  }
}

function updateCircuitBellGauge() {
  const ring = document.getElementById('circuitBellRing');
  const value = document.getElementById('circuitBellValue');
  const S = Number(simData?.S || 0);
  const pct = Math.max(0, Math.min(100, Math.round((S / 2.828) * 100)));
  const color = simData?.safe ? '#1D9E75' : '#D9534F';
  value.textContent = S.toFixed(3);
  ring.style.background = `conic-gradient(${color} ${pct * 3.6}deg, #dfe7eb 0deg)`;
}

function setCircuitPair(index) {
  const pairs = circuitPairs();
  if (!pairs.length) return;
  circuitPairIndex = Math.max(0, Math.min(index, pairs.length - 1));
  updateCircuitPairDetails();
}

function exportCircuitKey() {
  const bits = simData?.key_bits || [];
  if (!bits.length) return;
  const blob = new Blob([bits.join('')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'epr_key.txt';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function copyVisibleCircuitBits() {
  const keyBitsDiv = document.getElementById('circuitKeyBits');
  const text = keyBitsDiv?.dataset.copyValue || '';
  if (!text || !navigator.clipboard) return;
  navigator.clipboard.writeText(text).then(() => {
    keyBitsDiv.classList.add('copied');
    keyBitsDiv.title = 'Bits visibles copiados';
    setTimeout(() => {
      keyBitsDiv.classList.remove('copied');
      keyBitsDiv.title = 'Haz clic para copiar los bits visibles';
    }, 900);
  }).catch(() => {});
}

function startCircuitPhotonAnimation() {
  const panel = document.getElementById('panel4');
  const photon = document.getElementById('photon');
  const trail = document.getElementById('photonTrail');
  const visual = document.getElementById('channelVisual');
  if (!panel?.classList.contains('active') || !photon || !trail || !visual) return;
  stopCircuitPhotonAnimation();
  circuitAnimationStart = performance.now();

  const tick = (ts) => {
    if (!panel.classList.contains('active')) {
      stopCircuitPhotonAnimation();
      return;
    }
    const bounds = visual.getBoundingClientRect();
    const padding = 16;
    const usableWidth = Math.max(1, bounds.width - padding * 2);
    const cycle = 2400;
    const progress = ((ts - circuitAnimationStart) % cycle) / cycle;
    const x = padding + usableWidth * progress;
    photon.style.left = `${x}px`;
    trail.style.left = `${Math.max(padding, x - 24)}px`;
    trail.style.width = `${30 + progress * 18}px`;

    if (eveOn && simData?.eve_errors > 0 && progress > 0.46 && progress < 0.56 && !circuitFlashCooldown) {
      photon.classList.remove('flash');
      void photon.offsetHeight;
      photon.classList.add('flash');
      circuitFlashCooldown = true;
      setTimeout(() => {
        circuitFlashCooldown = false;
      }, 500);
    }
    circuitAnimationFrame = requestAnimationFrame(tick);
  };

  circuitAnimationFrame = requestAnimationFrame(tick);
}

function stopCircuitPhotonAnimation() {
  if (circuitAnimationFrame) {
    cancelAnimationFrame(circuitAnimationFrame);
    circuitAnimationFrame = null;
  }
}

function renderCircuit() {
  if (!simData) return;
  const { meas_rows, test_pairs, same_base_count, eve_errors, key_length } = simData;
  document.getElementById('statTestPairs').textContent = test_pairs;
  document.getElementById('statSameBase').textContent = same_base_count;
  document.getElementById('statEveErrors').textContent = eve_errors;
  document.getElementById('statKeyBits').textContent = key_length;
  circuitPairIndex = Math.min(circuitPairIndex, Math.max(0, meas_rows.length - 1));
  populateCircuitPairSelector();
  updateCircuitPairDetails();
  updateCircuitKeyView();
  updateCircuitSecurity();
  updateCircuitBellGauge();
  startCircuitPhotonAnimation();
}

document.addEventListener('DOMContentLoaded', () => {
  const baseZ = document.getElementById('baseZBtn');
  const baseX = document.getElementById('baseXBtn');
  const genBtn = document.getElementById('genKeyBtn');
  const pairSelect = document.getElementById('circuitPairSelect');
  const prevPair = document.getElementById('circuitPrevPair');
  const nextPair = document.getElementById('circuitNextPair');
  const exportBtn = document.getElementById('exportKeyBtn');
  const keyBitsDiv = document.getElementById('circuitKeyBits');
  if (baseZ && baseX && genBtn) {
    baseZ.addEventListener('click', () => setKeyBase('Z'));
    baseX.addEventListener('click', () => setKeyBase('X'));
    genBtn.addEventListener('click', generateKeyFromBase);
  }
  if (pairSelect) {
    pairSelect.addEventListener('change', (e) => setCircuitPair(parseInt(e.target.value, 10) || 0));
  }
  if (prevPair) {
    prevPair.addEventListener('click', () => setCircuitPair(circuitPairIndex - 1));
  }
  if (nextPair) {
    nextPair.addEventListener('click', () => setCircuitPair(circuitPairIndex + 1));
  }
  if (exportBtn) {
    exportBtn.addEventListener('click', exportCircuitKey);
  }
  if (keyBitsDiv) {
    keyBitsDiv.addEventListener('click', copyVisibleCircuitBits);
  }
});
