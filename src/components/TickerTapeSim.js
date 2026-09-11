/**
 * Ticker Tape Simulation & Measurement Workbench Component
 * Models a 60 Hz spark / ticker timer drop, paper strip dot generation,
 * draggable metric ruler, dot origin selection, and 12-dot data table.
 * Part of "The Thinking Experiment" PhysicsKit
 */

import { simulateTickerTape, extract12DotDataset, STANDARD_G } from '../physics/freefallPhysics.js';

export class TickerTapeSim {
  constructor(containerId, onDataReady) {
    this.container = document.getElementById(containerId);
    this.onDataReady = onDataReady;

    this.frequency = 60; // 60 Hz
    this.dt = 1 / 60;
    this.applyUncertainty = true; // includes striker friction
    this.isDropping = false;
    this.selectedOriginIndex = 1; // Default: Dot 1 chosen as origin (leaving initial smudge dot 0)

    // Simulation output
    this.simResult = null;
    this.rawDots = [];
    this.studentDataset = [];

    // Ruler interactive state
    this.rulerOffsetPx = 0; // horizontal offset of ruler
    this.isDraggingRuler = false;
    this.dragStartX = 0;
    this.initialRulerOffset = 0;
    this.zoomScale = 1.0; // 1.0x to 3.0x zoom

    // Initialize with a default run
    this.generateTapeData();
    this.render();
    this.initCanvases();
  }

  generateTapeData() {
    const jitter = (Math.random() - 0.5) * 2;
    this.simResult = simulateTickerTape({
      numDots: 18,
      frequency: this.frequency,
      g: STANDARD_G,
      frictionDecel: 0.16,
      applyUncertainty: this.applyUncertainty,
      jitter
    });
    this.rawDots = this.simResult.rawDots;
    this.updateStudentDataset();
  }

  updateStudentDataset() {
    this.studentDataset = extract12DotDataset(this.rawDots, this.selectedOriginIndex, 12);
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 24px;">
        <!-- TOP: Apparatus Drop Animation & Tape Generator -->
        <div class="card" style="margin-bottom: 0;">
          <div class="card-header">
            <div>
              <h2 class="card-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
                60 Hz Ticker Tape Drop Apparatus
              </h2>
              <p class="card-subtitle">Release the hanging mass through the 60 Hz ticker timer to stamp carbon dots on the falling tape.</p>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-primary" id="btnTickerDrop">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                Release Tape
              </button>
              <button class="btn btn-secondary" id="btnTickerNewTape">New Tape Strip</button>
            </div>
          </div>

          <div class="split-grid" style="align-items: center;">
            <div class="canvas-container" style="height: 220px; width: 100%;">
              <canvas id="tickerDropCanvas" width="550" height="220" style="width: 100%; height: 100%; display: block;"></canvas>
            </div>

            <div style="display: flex; flex-direction: column; gap: 12px;">
              <div class="callout callout-amber" style="margin-bottom: 0;">
                <strong>Ticker Frequency: 60 Hz (Δt = 1/60 s ≈ 0.01667 s)</strong>
                The electromagnetic clapper strikes 60 times each second. As the mass accelerates, the distance between successive dots expands quadratically.
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                <label class="uncertainty-pill" title="Models mechanical friction from the striker clapper and paper guide">
                  <input type="checkbox" id="chkTickerUncertainty" ${this.applyUncertainty ? 'checked' : ''} />
                  <span>Real Striker Friction (a ≈ 9.5-9.7 m/s²)</span>
                </label>
                <div style="font-family: var(--font-mono); font-size: 0.82rem; color: var(--text-muted);">
                  Total Stamped Dots: <strong>${this.rawDots.length}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- BOTTOM: Interactive Tape Inspection Workbench & Student Data Table -->
        <div class="split-grid">
          <!-- LEFT: Tape Strip Inspection & Draggable Metric Ruler -->
          <div class="card" style="margin-bottom: 0;">
            <div class="card-header">
              <div>
                <h3 class="card-title" style="font-size: 1.05rem;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <line x1="6" y1="8" x2="6" y2="16"></line>
                    <line x1="10" y1="10" x2="10" y2="14"></line>
                    <line x1="14" y1="8" x2="14" y2="16"></line>
                    <line x1="18" y1="10" x2="18" y2="14"></line>
                  </svg>
                  Tape Inspection &amp; Ruler Workbench
                </h3>
                <p class="card-subtitle">Click a dot to set Dot 0 (Origin). Drag the metric ruler to measure 12 points.</p>
              </div>
              <div style="display: flex; gap: 8px;">
                <button class="btn btn-secondary" id="btnSnapRuler" style="font-size: 0.78rem; padding: 5px 10px;">
                  Snap 0cm to Dot 0
                </button>
              </div>
            </div>

            <div class="tape-workbench">
              <!-- Instructions Banner -->
              <div style="background: var(--surface-alt); border: 1px solid var(--border-subtle); padding: 8px 12px; border-radius: 6px; font-size: 0.82rem; color: var(--text-muted); display: flex; justify-content: space-between; align-items: center;">
                <span>💡 <strong>Tip:</strong> Click any dot to set as <em>Dot 0</em>. Drag the yellow ruler horizontally to measure positions.</span>
                <span style="font-weight: 600; color: var(--accent-amber-dark);">Active Dot 0: Index #${this.selectedOriginIndex}</span>
              </div>

              <!-- Canvas Viewport for Tape & Ruler -->
              <div class="tape-viewport-wrap" id="tapeViewport">
                <canvas id="tapeCanvas" width="900" height="190" class="tape-strip-canvas" style="width: 100%; display: block;"></canvas>
              </div>

              <!-- Zoom & Pan Controls -->
              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; padding-top: 6px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 0.82rem; font-weight: 600; color: var(--text-muted);">Zoom Scale:</span>
                  <input type="range" id="sliderTapeZoom" min="0.8" max="2.2" step="0.1" value="${this.zoomScale}" style="width: 120px; accent-color: var(--accent-amber);" />
                  <span id="txtZoomVal" style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted);">${this.zoomScale.toFixed(1)}x</span>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">
                  Selected Range: <strong>12 Consecutive Dots</strong> (Δt = 0.0167 s each)
                </div>
              </div>
            </div>
          </div>

          <!-- RIGHT: 12-Dot Student Data Table -->
          <div class="card" style="margin-bottom: 0;">
            <div class="card-header">
              <div>
                <h3 class="card-title" style="font-size: 1.05rem;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  Student Data Table (Method II)
                </h3>
                <p class="card-subtitle">12 consecutive points. Time increment = 1/60 s. Position relative to Dot 0.</p>
              </div>
              <div style="display: flex; gap: 8px;">
                <button class="btn btn-secondary" id="btnTickerAutoFill" style="font-size: 0.78rem; padding: 6px 10px;">
                  Auto-Fill from Tape
                </button>
                <button class="btn btn-accent" id="btnTickerSendGraph" style="font-size: 0.78rem; padding: 6px 12px;">
                  Plot Position vs. Time
                </button>
              </div>
            </div>

            <div class="table-wrap" style="max-height: 380px;">
              <table class="data-table" id="tblTickerStudent">
                <thead>
                  <tr>
                    <th style="width: 20%;">Dot #</th>
                    <th style="width: 40%;">Time t (s) [n/60]</th>
                    <th style="width: 40%;">Position y (m)</th>
                  </tr>
                </thead>
                <tbody id="tickerStudentTbody">
                  ${this.renderTableRows()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  renderTableRows() {
    return this.studentDataset.map(row => `
      <tr data-n="${row.n}">
        <td style="font-weight: 700; color: var(--primary-teal-dark);">
          Dot ${row.n}
        </td>
        <td style="font-family: var(--font-mono); color: var(--text-muted);">
          ${row.time.toFixed(5)} <span style="font-size: 0.75rem;">(${row.n}/60)</span>
        </td>
        <td>
          <input type="number" step="0.0001" min="0" max="2.0" class="ticker-pos-input" data-n="${row.n}" value="${row.position.toFixed(4)}" placeholder="e.g. ${(row.position).toFixed(4)}" />
        </td>
      </tr>
    `).join('');
  }

  initCanvases() {
    this.dropCanvas = this.container.querySelector('#tickerDropCanvas');
    this.tapeCanvas = this.container.querySelector('#tapeCanvas');
    if (this.dropCanvas) {
      this.dropCtx = this.dropCanvas.getContext('2d');
      this.drawDropApparatus(0);
    }
    if (this.tapeCanvas) {
      this.tapeCtx = this.tapeCanvas.getContext('2d');
      this.drawTapeAndRuler();
    }
  }

  attachEvents() {
    const btnDrop = this.container.querySelector('#btnTickerDrop');
    const btnNewTape = this.container.querySelector('#btnTickerNewTape');
    const btnAutoFill = this.container.querySelector('#btnTickerAutoFill');
    const btnSendGraph = this.container.querySelector('#btnTickerSendGraph');
    const btnSnapRuler = this.container.querySelector('#btnSnapRuler');
    const chkUncertainty = this.container.querySelector('#chkTickerUncertainty');
    const sliderZoom = this.container.querySelector('#sliderTapeZoom');

    if (btnDrop) btnDrop.addEventListener('click', () => this.animateDrop());
    if (btnNewTape) btnNewTape.addEventListener('click', () => {
      this.generateTapeData();
      this.render();
      this.initCanvases();
    });

    if (btnAutoFill) btnAutoFill.addEventListener('click', () => this.autoFillStudentData());
    if (btnSendGraph) btnSendGraph.addEventListener('click', () => this.sendDataToGraph());

    if (btnSnapRuler) {
      btnSnapRuler.addEventListener('click', () => {
        // Snap the 0 cm mark of the ruler exactly to the x position of Dot 0
        const dot0Px = this.getDotPixelX(this.selectedOriginIndex);
        // In drawTapeAndRuler, ruler 0 is at rulerOffsetPx + 40
        this.rulerOffsetPx = dot0Px - 40;
        this.drawTapeAndRuler();
      });
    }

    if (chkUncertainty) {
      chkUncertainty.addEventListener('change', (e) => {
        this.applyUncertainty = e.target.checked;
        this.generateTapeData();
        this.drawTapeAndRuler();
      });
    }

    if (sliderZoom) {
      sliderZoom.addEventListener('input', (e) => {
        this.zoomScale = parseFloat(e.target.value);
        const txtZoom = this.container.querySelector('#txtZoomVal');
        if (txtZoom) txtZoom.textContent = `${this.zoomScale.toFixed(1)}x`;
        this.drawTapeAndRuler();
      });
    }

    // Input listeners for student table rows
    const tbody = this.container.querySelector('#tickerStudentTbody');
    if (tbody) {
      tbody.addEventListener('input', (e) => {
        const target = e.target;
        const n = parseInt(target.dataset.n, 10);
        if (!isNaN(n) && this.studentDataset[n]) {
          this.studentDataset[n].position = parseFloat(target.value) || 0;
        }
      });
    }

    // Tape canvas mouse interaction: Click to select Dot 0, Drag to move ruler
    if (this.tapeCanvas) {
      this.tapeCanvas.addEventListener('mousedown', (e) => {
        const rect = this.tapeCanvas.getBoundingClientRect();
        const clickX = (e.clientX - rect.left) * (this.tapeCanvas.width / rect.width);
        const clickY = (e.clientY - rect.top) * (this.tapeCanvas.height / rect.height);

        // If clicked on top tape strip (y between 20 and 70), check if near a dot
        if (clickY >= 15 && clickY <= 75) {
          for (let i = 0; i < this.rawDots.length - 11; i++) {
            const dotX = this.getDotPixelX(i);
            if (Math.abs(clickX - dotX) < 14) {
              this.selectedOriginIndex = i;
              this.updateStudentDataset();
              const tbody = this.container.querySelector('#tickerStudentTbody');
              if (tbody) tbody.innerHTML = this.renderTableRows();
              this.drawTapeAndRuler();
              return;
            }
          }
        }

        // If clicked in ruler area (y > 75), initiate ruler dragging
        this.isDraggingRuler = true;
        this.dragStartX = clickX;
        this.initialRulerOffset = this.rulerOffsetPx;
      });

      window.addEventListener('mousemove', (e) => {
        if (!this.isDraggingRuler || !this.tapeCanvas) return;
        const rect = this.tapeCanvas.getBoundingClientRect();
        const currentX = (e.clientX - rect.left) * (this.tapeCanvas.width / rect.width);
        const dx = currentX - this.dragStartX;
        this.rulerOffsetPx = this.initialRulerOffset + dx;
        this.drawTapeAndRuler();
      });

      window.addEventListener('mouseup', () => {
        this.isDraggingRuler = false;
      });
    }
  }

  getDotPixelX(dotIdx) {
    if (!this.rawDots[dotIdx]) return 40;
    // Scale: 1 meter = 4000 pixels at 1.0x zoom
    const pxPerMeter = 3600 * this.zoomScale;
    const basePadding = 40;
    return basePadding + (this.rawDots[dotIdx].posMeters * pxPerMeter);
  }

  animateDrop() {
    if (this.isDropping) return;
    this.isDropping = true;
    const btnDrop = this.container.querySelector('#btnTickerDrop');
    if (btnDrop) btnDrop.disabled = true;

    const startTime = performance.now();
    const duration = 500; // 0.5s drop

    const animate = (now) => {
      const elapsed = (now - startTime) / duration;
      if (elapsed >= 1.0) {
        this.isDropping = false;
        this.drawDropApparatus(1.0);
        if (btnDrop) btnDrop.disabled = false;
        return;
      }

      this.drawDropApparatus(elapsed);
      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }

  drawDropApparatus(progress) {
    if (!this.dropCtx || !this.dropCanvas) return;
    const ctx = this.dropCtx;
    const w = this.dropCanvas.width;
    const h = this.dropCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // Bench mount
    ctx.fillStyle = '#96bdcb';
    ctx.fillRect(20, 20, 180, 14);

    // Ticker Box
    ctx.fillStyle = '#123140';
    ctx.strokeStyle = '#0f7e9b';
    ctx.lineWidth = 2;
    ctx.fillRect(80, 34, 110, 60);
    ctx.strokeRect(80, 34, 110, 60);

    // Carbon disc inside
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(135, 64, 18, 0, Math.PI * 2);
    ctx.fill();

    // Striker pin
    const clapperAngle = this.isDropping ? (Math.sin(performance.now() * 0.3) * 0.2) : 0;
    ctx.save();
    ctx.translate(110, 56);
    ctx.rotate(clapperAngle);
    ctx.strokeStyle = '#d67b19';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(25, 8);
    ctx.stroke();
    ctx.restore();

    // Text on ticker box
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px Inter, sans-serif';
    ctx.fillText('60 Hz TIMER', 112, 48);

    // Falling paper tape
    const fallDist = progress * 100; // px
    ctx.fillStyle = '#fdfae8';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.fillRect(130, 20, 12, 90 + fallDist);
    ctx.strokeRect(130, 20, 12, 90 + fallDist);

    // Hanging weight at bottom of tape
    const weightY = 110 + fallDist;
    ctx.fillStyle = '#0f7e9b';
    ctx.fillRect(124, weightY, 24, 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px Inter, sans-serif';
    ctx.fillText('200g', 127, weightY + 18);

    // Explanatory badge
    ctx.fillStyle = '#123140';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('Paper tape feeds under carbon disc', 220, 48);
    ctx.fillStyle = '#4b6570';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillText('Striker frequency: 60 dots/sec', 220, 68);
    ctx.fillText('dt = 1/60 s = 0.01667 s', 220, 84);
  }

  drawTapeAndRuler() {
    if (!this.tapeCtx || !this.tapeCanvas) return;
    const ctx = this.tapeCtx;
    const w = this.tapeCanvas.width;
    const h = this.tapeCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // 1. Draw Paper Tape Strip (y = 15 to 70)
    const tapeY = 18;
    const tapeH = 46;
    ctx.fillStyle = '#fdfae8';
    ctx.fillRect(0, tapeY, w, tapeH);
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(0, tapeY, w, tapeH);

    // 2. Draw Carbon Dots
    const dotCenterY = tapeY + tapeH / 2;
    for (let i = 0; i < this.rawDots.length; i++) {
      const dotX = this.getDotPixelX(i);
      const isOrigin = (i === this.selectedOriginIndex);
      const isIn12Set = (i >= this.selectedOriginIndex && i < this.selectedOriginIndex + 12);
      const dotRelNum = i - this.selectedOriginIndex;

      // Draw dot
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(dotX, dotCenterY, isOrigin ? 4 : 2.6, 0, Math.PI * 2);
      ctx.fill();

      // Highlight selected 12 points
      if (isIn12Set) {
        ctx.strokeStyle = isOrigin ? '#d67b19' : '#0f7e9b';
        ctx.lineWidth = isOrigin ? 2 : 1.2;
        ctx.beginPath();
        ctx.arc(dotX, dotCenterY, 6.5, 0, Math.PI * 2);
        ctx.stroke();

        // Dot label
        ctx.fillStyle = isOrigin ? '#d67b19' : '#0f7e9b';
        ctx.font = isOrigin ? 'bold 9px JetBrains Mono, monospace' : '8px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(dotRelNum.toString(), dotX, tapeY - 4);
      }
    }

    // 3. Draw Draggable Metric Ruler (y = 80 to 180)
    const rulerY = 82;
    const rulerH = 92;
    const rulerStartX = this.rulerOffsetPx + 40;
    const rulerLenPx = 3000 * this.zoomScale; // 75 cm long ruler

    ctx.save();
    // Semi-transparent yellow plastic ruler look
    ctx.fillStyle = 'rgba(254, 252, 232, 0.92)';
    ctx.fillRect(rulerStartX, rulerY, rulerLenPx, rulerH);
    ctx.strokeStyle = '#d67b19';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rulerStartX, rulerY, rulerLenPx, rulerH);

    // Ruler graduations (cm and mm)
    // 1 cm = 36px * zoomScale
    const pxPerCm = 36 * this.zoomScale;
    const maxCm = Math.floor(rulerLenPx / pxPerCm);

    ctx.fillStyle = '#123140';
    ctx.textAlign = 'center';

    for (let cm = 0; cm <= maxCm; cm++) {
      const cmX = rulerStartX + (cm * pxPerCm);
      if (cmX < -50 || cmX > w + 50) continue;

      // Major cm line
      ctx.strokeStyle = '#123140';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cmX, rulerY);
      ctx.lineTo(cmX, rulerY + 18);
      ctx.stroke();

      // Centimeter label
      ctx.font = 'bold 9px JetBrains Mono, monospace';
      ctx.fillText(cm.toString(), cmX, rulerY + 30);

      // Millimeter ticks (10 per cm)
      for (let mm = 1; mm < 10; mm++) {
        const mmX = cmX + (mm * (pxPerCm / 10));
        const isHalf = mm === 5;
        ctx.strokeStyle = '#4b6570';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(mmX, rulerY);
        ctx.lineTo(mmX, rulerY + (isHalf ? 12 : 7));
        ctx.stroke();
      }
    }

    // Ruler branding
    ctx.fillStyle = '#0f7e9b';
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('METRIC RULER (cm & mm)', rulerStartX + 12, rulerY + 65);
    ctx.fillStyle = '#718894';
    ctx.font = '9px Inter, sans-serif';
    ctx.fillText('Drag left/right to measure distance from Dot 0', rulerStartX + 12, rulerY + 80);

    ctx.restore();
  }

  autoFillStudentData() {
    this.updateStudentDataset();
    const tbody = this.container.querySelector('#tickerStudentTbody');
    if (tbody) tbody.innerHTML = this.renderTableRows();
  }

  sendDataToGraph() {
    const validPoints = [];
    this.studentDataset.forEach(row => {
      if (row.time !== undefined && !isNaN(row.position) && row.position >= 0) {
        validPoints.push({
          t: row.time,
          y: row.position,
          label: `Dot ${row.n}`
        });
      }
    });

    if (validPoints.length < 3) {
      alert('Please ensure at least 3 valid dot data points are entered!');
      return;
    }

    validPoints.sort((a, b) => a.t - b.t);

    if (this.onDataReady) {
      this.onDataReady({
        method: 'ticker',
        points: validPoints,
        uncertainty: this.applyUncertainty
      });
    }
  }
}
