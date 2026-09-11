/**
 * Photogate Experiment Simulation Component
 * Handles drop animation, sensor trigger timings, meter stick inspection,
 * digital event log, and student data entry table.
 * Part of "The Thinking Experiment" PhysicsKit
 */

import { simulatePhotogateDrop, STANDARD_G } from '../physics/freefallPhysics.js';

export class PhotogateSim {
  constructor(containerId, onDataReady) {
    this.container = document.getElementById(containerId);
    this.onDataReady = onDataReady; // callback to send data to graphing/report

    // Initial configuration of the 4 photogate units (each with 2 gates spaced 2 cm apart)
    this.gates = [
      { id: 1, y1: 0.800, y2: 0.780 },
      { id: 2, y1: 0.600, y2: 0.580 },
      { id: 3, y1: 0.400, y2: 0.380 },
      { id: 4, y1: 0.200, y2: 0.180 }
    ];

    this.dropHeight = 0.950; // meters from ground
    this.objectLength = 0.120; // 12 cm cylinder
    this.isDropping = false;
    this.applyUncertainty = true;
    this.shuffleChannels = false;

    // Simulation run results
    this.lastRunResult = null;

    // Student entered / recorded data (8 rows)
    this.studentData = [
      { gateId: 1, channel: 'Gate 1', label: 'PG1 - Gate 1', y: 0.800, t: '' },
      { gateId: 1, channel: 'Gate 2', label: 'PG1 - Gate 2', y: 0.780, t: '' },
      { gateId: 2, channel: 'Gate 1', label: 'PG2 - Gate 1', y: 0.600, t: '' },
      { gateId: 2, channel: 'Gate 2', label: 'PG2 - Gate 2', y: 0.580, t: '' },
      { gateId: 3, channel: 'Gate 1', label: 'PG3 - Gate 1', y: 0.400, t: '' },
      { gateId: 3, channel: 'Gate 2', label: 'PG3 - Gate 2', y: 0.380, t: '' },
      { gateId: 4, channel: 'Gate 1', label: 'PG4 - Gate 1', y: 0.200, t: '' },
      { gateId: 4, channel: 'Gate 2', label: 'PG4 - Gate 2', y: 0.180, t: '' }
    ];

    // Animation state
    this.animY = this.dropHeight;
    this.activeBeams = new Set();
    this.magnifierPosM = 0.800; // Position of meter stick inspection cursor

    this.render();
    this.initCanvas();
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="split-grid">
        <!-- LEFT COLUMN: Canvas Drop Tower & Apparatus Controls -->
        <div class="card" style="margin-bottom: 0;">
          <div class="card-header">
            <div>
              <h2 class="card-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
                Photogate Drop Tower
              </h2>
              <p class="card-subtitle">Drop the test cylinder and inspect sensor beam heights with the precision meter stick.</p>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-primary" id="btnPgDrop">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                Drop Object
              </button>
              <button class="btn btn-secondary" id="btnPgReset">Reset</button>
            </div>
          </div>

          <div class="canvas-container" style="height: 520px; position: relative;">
            <canvas id="pgCanvas" width="460" height="520" style="width: 100%; height: 100%; display: block;"></canvas>
            
            <!-- Magnifier Readout Tooltip -->
            <div id="pgMagnifierBadge" style="position: absolute; right: 14px; top: 14px; background: rgba(18, 49, 64, 0.92); color: #ffffff; padding: 6px 12px; border-radius: 6px; font-family: var(--font-mono); font-size: 0.82rem; pointer-events: none; border: 1px solid var(--border-subtle); z-index: 10;">
              Height: <span id="pgMagnifierVal">0.800</span> m (<span id="pgMagnifierValCm">80.0</span> cm)
            </div>
          </div>

          <div class="canvas-controls-bar">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 0.84rem; font-weight: 600; color: var(--text-muted);">Inspection Cursor:</span>
              <input type="range" id="pgSliderRuler" min="0.10" max="0.95" step="0.005" value="0.80" style="width: 160px; accent-color: var(--accent-amber);" />
            </div>
            <label class="uncertainty-pill" title="Toggles realistic human release jitter (slight v0 variance) and microsecond timing noise">
              <input type="checkbox" id="chkPgUncertainty" ${this.applyUncertainty ? 'checked' : ''} />
              <span>Real Human Release Jitter</span>
            </label>
          </div>
        </div>

        <!-- RIGHT COLUMN: Digital Sensor Data & Student Recording Table -->
        <div style="display: flex; flex-direction: column; gap: 20px;">
          <!-- Digital Sensor Collection Log -->
          <div class="card" style="margin-bottom: 0;">
            <div class="card-header">
              <div>
                <h3 class="card-title" style="font-size: 1.05rem;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                    <line x1="8" y1="21" x2="16" y2="21"></line>
                    <line x1="12" y1="17" x2="12" y2="21"></line>
                  </svg>
                  Digital Sensor Interface
                </h3>
                <p class="card-subtitle">Event stream recording beam block times (State = 1) when the object passes.</p>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <label class="uncertainty-pill" style="font-size: 0.78rem; padding: 4px 8px;" title="Replicates the real-world occurrence where wireless sensor channels appear in random order">
                  <input type="checkbox" id="chkPgShuffle" ${this.shuffleChannels ? 'checked' : ''} />
                  <span>Shuffle Channel Order</span>
                </label>
              </div>
            </div>

            <div class="table-wrap" style="max-height: 170px;">
              <table class="data-table" id="tblPgSensorEvents">
                <thead>
                  <tr>
                    <th>Time (s)</th>
                    <th>Sensor Unit</th>
                    <th>Gate Channel</th>
                    <th>State</th>
                  </tr>
                </thead>
                <tbody id="pgEventTbody">
                  <tr>
                    <td colspan="4" style="text-align: center; color: var(--text-subtle); padding: 18px;">
                      Ready. Press "Drop Object" to capture photogate block timestamps.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Student Data Collection Table -->
          <div class="card" style="margin-bottom: 0; flex: 1;">
            <div class="card-header">
              <div>
                <h3 class="card-title" style="font-size: 1.05rem;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  Student Data Table (Method I)
                </h3>
                <p class="card-subtitle">Enter measured gate height (m) and the time (s) when State = 1.</p>
              </div>
              <div style="display: flex; gap: 8px;">
                <button class="btn btn-secondary" id="btnPgAutoFill" style="font-size: 0.78rem; padding: 6px 10px;">
                  Auto-Fill Readings
                </button>
                <button class="btn btn-accent" id="btnPgSendGraph" style="font-size: 0.78rem; padding: 6px 12px;">
                  Plot Position vs. Time
                </button>
              </div>
            </div>

            <div class="table-wrap" style="max-height: 250px;">
              <table class="data-table" id="tblPgStudent">
                <thead>
                  <tr>
                    <th style="width: 32%;">Photogate Sensor</th>
                    <th style="width: 34%;">Height y (m)</th>
                    <th style="width: 34%;">Time t (s) [State = 1]</th>
                  </tr>
                </thead>
                <tbody id="pgStudentTbody">
                  ${this.renderStudentRows()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  renderStudentRows() {
    return this.studentData.map((row, idx) => `
      <tr data-index="${idx}">
        <td style="font-weight: 600; color: var(--primary-teal-dark);">
          ${row.label}
        </td>
        <td>
          <input type="number" step="0.001" min="0" max="1.5" class="pg-height-input" data-idx="${idx}" value="${row.y.toFixed(3)}" placeholder="e.g. 0.800" />
        </td>
        <td>
          <input type="number" step="0.00001" min="0" max="5" class="pg-time-input" data-idx="${idx}" value="${row.t !== '' ? Number(row.t).toFixed(5) : ''}" placeholder="Enter time" />
        </td>
      </tr>
    `).join('');
  }

  initCanvas() {
    this.canvas = this.container.querySelector('#pgCanvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.drawApparatus();
  }

  attachEvents() {
    const btnDrop = this.container.querySelector('#btnPgDrop');
    const btnReset = this.container.querySelector('#btnPgReset');
    const btnAutoFill = this.container.querySelector('#btnPgAutoFill');
    const btnSendGraph = this.container.querySelector('#btnPgSendGraph');
    const chkUncertainty = this.container.querySelector('#chkPgUncertainty');
    const chkShuffle = this.container.querySelector('#chkPgShuffle');
    const sliderRuler = this.container.querySelector('#pgSliderRuler');

    if (btnDrop) btnDrop.addEventListener('click', () => this.startDrop());
    if (btnReset) btnReset.addEventListener('click', () => this.resetSimulation());
    if (btnAutoFill) btnAutoFill.addEventListener('click', () => this.autoFillData());
    if (btnSendGraph) btnSendGraph.addEventListener('click', () => this.sendDataToGraph());

    if (chkUncertainty) {
      chkUncertainty.addEventListener('change', (e) => {
        this.applyUncertainty = e.target.checked;
      });
    }

    if (chkShuffle) {
      chkShuffle.addEventListener('change', (e) => {
        this.shuffleChannels = e.target.checked;
        if (this.lastRunResult) this.updateSensorTable(this.lastRunResult.events);
      });
    }

    if (sliderRuler) {
      sliderRuler.addEventListener('input', (e) => {
        this.magnifierPosM = parseFloat(e.target.value);
        const badgeVal = this.container.querySelector('#pgMagnifierVal');
        const badgeValCm = this.container.querySelector('#pgMagnifierValCm');
        if (badgeVal) badgeVal.textContent = this.magnifierPosM.toFixed(3);
        if (badgeValCm) badgeValCm.textContent = (this.magnifierPosM * 100).toFixed(1);
        this.drawApparatus();
      });
    }

    // Input listeners for student rows
    const tbody = this.container.querySelector('#pgStudentTbody');
    if (tbody) {
      tbody.addEventListener('input', (e) => {
        const target = e.target;
        const idx = parseInt(target.dataset.idx, 10);
        if (isNaN(idx)) return;
        if (target.classList.contains('pg-height-input')) {
          this.studentData[idx].y = parseFloat(target.value) || 0;
        } else if (target.classList.contains('pg-time-input')) {
          this.studentData[idx].t = target.value;
        }
      });
    }
  }

  startDrop() {
    if (this.isDropping) return;

    // Run physics simulation
    const jitter = (Math.random() - 0.5) * 2; // -1 to +1
    this.lastRunResult = simulatePhotogateDrop({
      gates: this.gates,
      dropHeight: this.dropHeight,
      g: STANDARD_G,
      initialVelocity: 0,
      objectLength: this.objectLength,
      applyUncertainty: this.applyUncertainty,
      jitter
    });

    this.isDropping = true;
    const btnDrop = this.container.querySelector('#btnPgDrop');
    if (btnDrop) btnDrop.disabled = true;

    // Clear and populate sensor table as events occur
    this.updateSensorTable(this.lastRunResult.events);

    // Animate the drop on canvas
    const startTime = performance.now();
    const totalSimDuration = 0.55; // seconds
    const effDropY = this.lastRunResult.effDropHeight;
    const effV0 = this.lastRunResult.effV0;
    const effG = this.lastRunResult.effG;

    const animate = (now) => {
      const elapsed = (now - startTime) / 1000;
      if (elapsed >= totalSimDuration) {
        this.isDropping = false;
        this.animY = 0.05; // rested on catch pad
        this.activeBeams.clear();
        this.drawApparatus();
        if (btnDrop) btnDrop.disabled = false;
        return;
      }

      // Kinematics: y(t) = effDropY - (effV0 * t + 0.5 * effG * t^2)
      const currentY = Math.max(0.05, effDropY - (effV0 * elapsed + 0.5 * effG * elapsed * elapsed));
      this.animY = currentY;

      // Check which beams are currently blocked by the object (from currentY to currentY + objectLength)
      this.activeBeams.clear();
      const objBottom = currentY;
      const objTop = currentY + this.objectLength;

      this.gates.forEach(g => {
        if (g.y1 >= objBottom && g.y1 <= objTop) this.activeBeams.add(`pg${g.id}-g1`);
        if (g.y2 >= objBottom && g.y2 <= objTop) this.activeBeams.add(`pg${g.id}-g2`);
      });

      this.drawApparatus();
      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }

  resetSimulation() {
    this.isDropping = false;
    this.animY = this.dropHeight;
    this.activeBeams.clear();
    const btnDrop = this.container.querySelector('#btnPgDrop');
    if (btnDrop) btnDrop.disabled = false;
    this.drawApparatus();
  }

  updateSensorTable(events) {
    const tbody = this.container.querySelector('#pgEventTbody');
    if (!tbody) return;

    let displayEvents = [...events];
    if (this.shuffleChannels) {
      // Re-order by sensor ID or pseudo-random shuffle to mimic real-world wireless channel enumeration
      displayEvents.sort((a, b) => (a.gateId * 3 + (a.channel === 'Gate 1' ? 1 : 2)) % 5 - (b.gateId * 3 + (b.channel === 'Gate 1' ? 1 : 2)) % 5);
    }

    tbody.innerHTML = displayEvents.map(e => `
      <tr style="${e.state === 1 ? 'background: var(--accent-amber-light); font-weight: 600;' : ''}">
        <td style="font-family: var(--font-mono);">${e.time.toFixed(5)}</td>
        <td>Photogate ${e.gateId}</td>
        <td>${e.channel}</td>
        <td>
          <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: 700; ${e.state === 1 ? 'background: var(--accent-amber); color: #fff;' : 'background: #cbd5e1; color: #475569;'}">
            ${e.state}
          </span>
        </td>
      </tr>
    `).join('');
  }

  autoFillData() {
    if (!this.lastRunResult) {
      this.startDrop();
    }

    // Find block times (state = 1) for each gate
    const events = this.lastRunResult.events.filter(e => e.state === 1);

    this.studentData.forEach((row, idx) => {
      const match = events.find(e => e.gateId === row.gateId && e.channel === row.channel);
      if (match) {
        row.t = match.time.toFixed(5);
      }
    });

    const tbody = this.container.querySelector('#pgStudentTbody');
    if (tbody) tbody.innerHTML = this.renderStudentRows();
  }

  sendDataToGraph() {
    // Extract valid points (t, y)
    const validPoints = [];
    this.studentData.forEach(row => {
      const tVal = parseFloat(row.t);
      const yVal = parseFloat(row.y);
      if (!isNaN(tVal) && !isNaN(yVal) && tVal >= 0) {
        validPoints.push({ t: tVal, y: yVal, label: row.label });
      }
    });

    if (validPoints.length < 3) {
      alert('Please enter or auto-fill at least 3 data points with valid times and heights!');
      return;
    }

    // Sort by time ascending
    validPoints.sort((a, b) => a.t - b.t);

    if (this.onDataReady) {
      this.onDataReady({
        method: 'photogates',
        points: validPoints,
        uncertainty: this.applyUncertainty
      });
    }
  }

  drawApparatus() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, w, h);

    // Coordinate mapping: 0 meters is at bottom (y = 480), 1.0 meter is at top (y = 60)
    const yGround = 485;
    const yTop = 60;
    const mToPx = (yMeters) => yGround - (yMeters / 1.0) * (yGround - yTop);

    // Stand base & table
    ctx.fillStyle = '#96bdcb';
    ctx.fillRect(40, yGround + 10, 200, 16);
    ctx.fillStyle = '#4b6570';
    ctx.fillRect(100, yTop - 20, 12, yGround - yTop + 30); // Rod

    // Catch pad at bottom
    ctx.fillStyle = '#718894';
    ctx.fillRect(125, yGround - 2, 70, 12);
    ctx.fillStyle = '#ffffff';
    ctx.font = '9px Inter, sans-serif';
    ctx.fillText('Pad', 148, yGround + 7);

    // Meter Stick alongside rod
    const rulerX = 205;
    const rulerW = 26;
    ctx.fillStyle = '#fdfae8';
    ctx.strokeStyle = '#d67b19';
    ctx.lineWidth = 1.2;
    ctx.fillRect(rulerX, yTop, rulerW, yGround - yTop);
    ctx.strokeRect(rulerX, yTop, rulerW, yGround - yTop);

    // Draw cm graduations on ruler
    ctx.fillStyle = '#123140';
    ctx.font = '8px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    for (let cm = 0; cm <= 100; cm += 2) {
      const yPos = mToPx(cm / 100);
      const isMajor = cm % 10 === 0;
      const tickLen = isMajor ? 12 : 6;
      ctx.beginPath();
      ctx.moveTo(rulerX, yPos);
      ctx.lineTo(rulerX + tickLen, yPos);
      ctx.strokeStyle = '#123140';
      ctx.lineWidth = isMajor ? 1.2 : 0.8;
      ctx.stroke();

      if (isMajor && cm <= 90 && cm >= 10) {
        ctx.fillText(cm.toString(), rulerX + 13, yPos + 3);
      }
    }

    // Draw 4 Photogates
    this.gates.forEach(g => {
      const py1 = mToPx(g.y1);
      const py2 = mToPx(g.y2);
      const bracketTop = py1 - 8;
      const bracketHeight = (py2 - py1) + 16;

      // Mounting clamp on rod
      ctx.fillStyle = '#123140';
      ctx.fillRect(92, bracketTop + 4, 28, 16);
      ctx.fillStyle = '#0f7e9b';
      ctx.beginPath();
      ctx.arc(98, bracketTop + 12, 3, 0, Math.PI * 2);
      ctx.fill();

      // U-Bracket extending from rod to drop path (around x=140 to x=180)
      ctx.strokeStyle = '#0f7e9b';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(115, bracketTop + 2);
      ctx.lineTo(130, bracketTop + 2);
      ctx.lineTo(130, bracketTop + bracketHeight - 2);
      ctx.lineTo(185, bracketTop + bracketHeight - 2);
      ctx.stroke();

      // Bracket arm top
      ctx.beginPath();
      ctx.moveTo(130, bracketTop + 2);
      ctx.lineTo(185, bracketTop + 2);
      ctx.stroke();

      // Gate 1 beam
      const isG1Active = this.activeBeams.has(`pg${g.id}-g1`);
      ctx.strokeStyle = isG1Active ? '#d67b19' : 'rgba(214, 123, 25, 0.45)';
      ctx.lineWidth = isG1Active ? 2.5 : 1.2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(130, py1);
      ctx.lineTo(185, py1);
      ctx.stroke();
      ctx.setLineDash([]);

      // Gate 2 beam
      const isG2Active = this.activeBeams.has(`pg${g.id}-g2`);
      ctx.strokeStyle = isG2Active ? '#d67b19' : 'rgba(214, 123, 25, 0.45)';
      ctx.lineWidth = isG2Active ? 2.5 : 1.2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(130, py2);
      ctx.lineTo(185, py2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Optical eye indicators
      ctx.fillStyle = isG1Active ? '#d67b19' : '#0b5f77';
      ctx.beginPath();
      ctx.arc(132, py1, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = isG2Active ? '#d67b19' : '#0b5f77';
      ctx.beginPath();
      ctx.arc(132, py2, 3, 0, Math.PI * 2);
      ctx.fill();

      // Photogate Unit Label
      ctx.fillStyle = '#0f7e9b';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.fillText(`PG ${g.id}`, 55, bracketTop + 14);
    });

    // Draw Falling Object (clear cylinder with visible weight marks)
    const objYPx = mToPx(this.animY);
    const objTopPx = mToPx(this.animY + this.objectLength);
    const objHPx = objYPx - objTopPx;
    const objXPx = 152;
    const objWPx = 16;

    ctx.fillStyle = 'rgba(18, 49, 64, 0.9)';
    ctx.strokeStyle = '#0f7e9b';
    ctx.lineWidth = 1.5;
    ctx.fillRect(objXPx, objTopPx, objWPx, objHPx);
    ctx.strokeRect(objXPx, objTopPx, objWPx, objHPx);

    // Center stripe on object
    ctx.fillStyle = '#d67b19';
    ctx.fillRect(objXPx + 4, objTopPx + 4, objWPx - 8, objHPx - 8);

    // Draw Inspection Cursor & Magnifier
    const magYPx = mToPx(this.magnifierPosM);
    ctx.strokeStyle = '#d67b19';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 2]);
    ctx.beginPath();
    ctx.moveTo(120, magYPx);
    ctx.lineTo(rulerX + rulerW + 35, magYPx);
    ctx.stroke();
    ctx.setLineDash([]);

    // Magnifier pointer icon
    ctx.fillStyle = '#d67b19';
    ctx.beginPath();
    ctx.moveTo(rulerX + rulerW, magYPx);
    ctx.lineTo(rulerX + rulerW + 12, magYPx - 6);
    ctx.lineTo(rulerX + rulerW + 12, magYPx + 6);
    ctx.closePath();
    ctx.fill();
  }
}
