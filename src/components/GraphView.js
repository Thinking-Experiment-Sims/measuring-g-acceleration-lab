/**
 * Graphing Engine & Quadratic Curve Fitting View
 * Mimics Logger Pro / Graphical Analysis interface
 * Plots Position vs. Time, calculates quadratic fit y = At^2 + Bt + C,
 * extracts acceleration a = 2A and g, and exports graph image for the lab report.
 * Part of "The Thinking Experiment" PhysicsKit
 */

import { fitQuadratic } from '../physics/regression.js';

export class GraphView {
  constructor(containerId, onFitUpdated) {
    this.container = document.getElementById(containerId);
    this.onFitUpdated = onFitUpdated; // Callback when fit is calculated

    this.activeMethod = 'photogates'; // 'photogates' or 'ticker'

    this.datasets = {
      photogates: null,
      ticker: null
    };

    this.fitResults = {
      photogates: null,
      ticker: null
    };

    this.render();
    this.initCanvas();
  }

  setDataset(method, points) {
    if (!points || points.length < 3) return;
    this.datasets[method] = points;
    this.fitResults[method] = fitQuadratic(points);
    this.activeMethod = method;

    if (this.onFitUpdated) {
      this.onFitUpdated(method, this.fitResults[method], this.getCanvasImage(method));
    }

    this.render();
    this.initCanvas();
  }

  render() {
    if (!this.container) return;

    const currentData = this.datasets[this.activeMethod];
    const currentFit = this.fitResults[this.activeMethod];

    this.container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
              Position vs. Time Analysis &amp; Quadratic Fit
            </h2>
            <p class="card-subtitle">Parabolic modeling of free-fall motion: <span class="math-expr"><i>y</i>(<i>t</i>) = ½·<i>a</i>·<i>t</i>² + <i>v</i><sub>0<i>y</i></sub>·<i>t</i> + <i>y</i><sub>0</sub></span></p>
          </div>

          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <div style="display: flex; border: 1px solid var(--border-subtle); border-radius: 6px; overflow: hidden;">
              <button class="btn ${this.activeMethod === 'photogates' ? 'btn-primary' : 'btn-secondary'}" id="btnGraphTabPg" style="border-radius: 0; border: none;">
                Method I: Photogates
              </button>
              <button class="btn ${this.activeMethod === 'ticker' ? 'btn-primary' : 'btn-secondary'}" id="btnGraphTabTicker" style="border-radius: 0; border: none;">
                Method II: Ticker Tape
              </button>
            </div>

            <button class="btn btn-outline-amber" id="btnCopyGraph">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              Copy Graph Image
            </button>
            <button class="btn btn-secondary" id="btnDownloadGraph">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Save PNG
            </button>
          </div>
        </div>

        <div class="split-grid" style="grid-template-columns: 2fr 1fr; align-items: start;">
          <!-- Graph Canvas Container -->
          <div class="canvas-container" style="height: 480px; width: 100%; background: #ffffff;">
            <canvas id="analysisGraphCanvas" width="700" height="480" style="width: 100%; height: 100%; display: block;"></canvas>
          </div>

          <!-- Fit Results & Physics Parameter Extraction Card -->
          <div style="display: flex; flex-direction: column; gap: 16px;">
            <div class="card" style="margin-bottom: 0; background: var(--surface-alt);">
              <h3 style="font-family: var(--font-display); color: var(--primary-teal); font-size: 1.05rem; margin-bottom: 12px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 6px;">
                Quadratic Fit Parameters
              </h3>

              ${currentFit ? `
                <div style="font-family: var(--font-mono); font-size: 0.88rem; display: flex; flex-direction: column; gap: 10px;">
                  <div style="background: #ffffff; padding: 10px; border-radius: 6px; border: 1px solid var(--border-subtle);">
                    <div style="color: var(--text-subtle); font-size: 0.76rem; font-family: var(--font-sans); text-transform: uppercase;">Fit Equation</div>
                    <div style="font-weight: 700; color: var(--primary-teal-dark); margin-top: 2px;">
                      ${currentFit.equationString}
                    </div>
                  </div>

                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <div style="background: #ffffff; padding: 8px 10px; border-radius: 6px; border: 1px solid var(--border-subtle);">
                      <div style="color: var(--text-subtle); font-size: 0.72rem; font-family: var(--font-sans);">A (Leading Coeff)</div>
                      <div style="font-weight: 700; color: var(--text-main);">${currentFit.A.toFixed(4)}</div>
                    </div>
                    <div style="background: #ffffff; padding: 8px 10px; border-radius: 6px; border: 1px solid var(--border-subtle);">
                      <div style="color: var(--text-subtle); font-size: 0.72rem; font-family: var(--font-sans);">B (Initial Vel v₀ᵧ)</div>
                      <div style="font-weight: 700; color: var(--text-main);">${currentFit.B.toFixed(4)} m/s</div>
                    </div>
                    <div style="background: #ffffff; padding: 8px 10px; border-radius: 6px; border: 1px solid var(--border-subtle);">
                      <div style="color: var(--text-subtle); font-size: 0.72rem; font-family: var(--font-sans);">C (Initial Pos y₀)</div>
                      <div style="font-weight: 700; color: var(--text-main);">${currentFit.C.toFixed(4)} m</div>
                    </div>
                    <div style="background: #ffffff; padding: 8px 10px; border-radius: 6px; border: 1px solid var(--border-subtle);">
                      <div style="color: var(--text-subtle); font-size: 0.72rem; font-family: var(--font-sans);">R² Correlation</div>
                      <div style="font-weight: 700; color: var(--accent-amber-dark);">${currentFit.r2.toFixed(5)}</div>
                    </div>
                  </div>

                  <!-- Physics Extraction Box -->
                  <div style="background: var(--primary-teal-light); border: 1.5px solid var(--primary-teal-border); padding: 12px; border-radius: 6px; margin-top: 4px;">
                    <div style="font-size: 0.78rem; font-weight: 700; color: var(--primary-teal); text-transform: uppercase;">
                      Extracted Acceleration
                    </div>
                    <div style="font-size: 1.3rem; font-weight: 800; color: var(--primary-teal-dark); margin: 4px 0;">
                      a = ${(currentFit.acceleration).toFixed(3)} m/s²
                    </div>
                    <div style="font-size: 1.1rem; font-weight: 700; color: var(--accent-amber-dark);">
                      g = ${Math.abs(currentFit.acceleration).toFixed(3)} m/s²
                    </div>
                  </div>
                </div>
              ` : `
                <div style="text-align: center; color: var(--text-subtle); padding: 24px 8px; font-size: 0.88rem;">
                  No data loaded yet for <strong>${this.activeMethod === 'photogates' ? 'Method I (Photogates)' : 'Method II (Ticker Tape)'}</strong>.
                  <br><br>
                  Navigate to the simulation tab and click <em>"Plot Position vs. Time"</em> to generate the fit!
                </div>
              `}
            </div>

            <!-- Mathematical Correspondence Note -->
            <div class="callout" style="margin-bottom: 0;">
              <strong>Kinematic Matching</strong>
              Quadratic model: <span class="math-expr"><i>y</i> = <i>A</i>·<i>t</i>² + <i>B</i>·<i>t</i> + <i>C</i></span><br>
              Physics equation: <span class="math-expr"><i>y</i> = ½·<i>a</i>·<i>t</i>² + <i>v</i><sub>0<i>y</i></sub>·<i>t</i> + <i>y</i><sub>0</sub></span>
              <ul style="padding-left: 16px; margin-top: 6px; font-size: 0.84rem;">
                <li><strong>Acceleration:</strong> <span class="math-expr"><i>a</i> = 2·<i>A</i></span></li>
                <li><strong>Initial Velocity:</strong> <span class="math-expr"><i>v</i><sub>0<i>y</i></sub> = <i>B</i></span></li>
                <li><strong>Initial Position:</strong> <span class="math-expr"><i>y</i><sub>0</sub> = <i>C</i></span></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  initCanvas() {
    this.canvas = this.container.querySelector('#analysisGraphCanvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.drawGraph();
  }

  attachEvents() {
    const btnPg = this.container.querySelector('#btnGraphTabPg');
    const btnTicker = this.container.querySelector('#btnGraphTabTicker');
    const btnCopy = this.container.querySelector('#btnCopyGraph');
    const btnDownload = this.container.querySelector('#btnDownloadGraph');

    if (btnPg) {
      btnPg.addEventListener('click', () => {
        this.activeMethod = 'photogates';
        this.render();
        this.initCanvas();
      });
    }

    if (btnTicker) {
      btnTicker.addEventListener('click', () => {
        this.activeMethod = 'ticker';
        this.render();
        this.initCanvas();
      });
    }

    if (btnCopy) {
      btnCopy.addEventListener('click', () => this.copyGraphToClipboard());
    }

    if (btnDownload) {
      btnDownload.addEventListener('click', () => this.downloadGraphPNG());
    }
  }

  drawGraph() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Margins
    const padLeft = 65;
    const padRight = 30;
    const padTop = 40;
    const padBottom = 55;

    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    const data = this.datasets[this.activeMethod];
    const fit = this.fitResults[this.activeMethod];

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(padLeft, padTop, plotW, plotH);

    // If no data
    if (!data || data.length === 0) {
      ctx.strokeStyle = '#c8dbe3';
      ctx.lineWidth = 1;
      ctx.strokeRect(padLeft, padTop, plotW, plotH);

      ctx.fillStyle = '#718894';
      ctx.font = '14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Awaiting Data from Experiment...', padLeft + plotW / 2, padTop + plotH / 2);
      return;
    }

    // Determine scale ranges
    const maxT = Math.max(...data.map(d => d.t)) * 1.15;
    const maxY = Math.max(...data.map(d => d.y)) * 1.15;

    const tToPx = (t) => padLeft + (t / maxT) * plotW;
    const yToPx = (y) => (padTop + plotH) - (y / maxY) * plotH;

    // Draw Grid Lines
    ctx.strokeStyle = '#e9f4fb';
    ctx.lineWidth = 1;

    // Horizontal grid
    const numYDivs = 6;
    ctx.fillStyle = '#4b6570';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'right';

    for (let i = 0; i <= numYDivs; i++) {
      const yVal = (i / numYDivs) * maxY;
      const yPx = yToPx(yVal);
      ctx.beginPath();
      ctx.moveTo(padLeft, yPx);
      ctx.lineTo(padLeft + plotW, yPx);
      ctx.stroke();

      ctx.fillText(yVal.toFixed(2), padLeft - 8, yPx + 4);
    }

    // Vertical grid
    const numTDivs = 6;
    ctx.textAlign = 'center';

    for (let i = 0; i <= numTDivs; i++) {
      const tVal = (i / numTDivs) * maxT;
      const tPx = tToPx(tVal);
      ctx.beginPath();
      ctx.moveTo(tPx, padTop);
      ctx.lineTo(tPx, padTop + plotH);
      ctx.stroke();

      ctx.fillText(tVal.toFixed(3), tPx, padTop + plotH + 18);
    }

    // Axes lines
    ctx.strokeStyle = '#123140';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padLeft, padTop);
    ctx.lineTo(padLeft, padTop + plotH);
    ctx.lineTo(padLeft + plotW, padTop + plotH);
    ctx.stroke();

    // Axis Titles
    ctx.fillStyle = '#123140';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Time t (seconds)', padLeft + plotW / 2, padTop + plotH + 42);

    ctx.save();
    ctx.translate(18, padTop + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Position y (meters)', 0, 0);
    ctx.restore();

    // Graph Title
    ctx.fillStyle = '#0f7e9b';
    ctx.font = 'bold 13px IBM Plex Sans, Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${this.activeMethod === 'photogates' ? 'Method I (Photogates)' : 'Method II (Ticker Tape)'}: Position vs. Time`, padLeft, padTop - 14);

    // Draw Quadratic Fit Curve
    if (fit) {
      ctx.strokeStyle = '#0f7e9b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();

      const numSteps = 100;
      for (let s = 0; s <= numSteps; s++) {
        const tVal = (s / numSteps) * maxT;
        const yVal = (fit.A * tVal * tVal) + (fit.B * tVal) + fit.C;
        const xPx = tToPx(tVal);
        const yPx = yToPx(yVal);

        if (s === 0) ctx.moveTo(xPx, yPx);
        else ctx.lineTo(xPx, yPx);
      }
      ctx.stroke();
    }

    // Draw Data Points (amber circles)
    data.forEach(pt => {
      const px = tToPx(pt.t);
      const py = yToPx(pt.y);

      // Point drop shadow
      ctx.fillStyle = 'rgba(214, 123, 25, 0.25)';
      ctx.beginPath();
      ctx.arc(px, py, 6.5, 0, Math.PI * 2);
      ctx.fill();

      // Core point
      ctx.fillStyle = '#d67b19';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(px, py, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // Draw Floating Curve Fit Box (Logger Pro Style)
    if (fit) {
      const boxW = 220;
      const boxH = 92;
      const boxX = padLeft + 18;
      const boxY = padTop + 16;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
      ctx.strokeStyle = '#c8dbe3';
      ctx.lineWidth = 1.2;
      ctx.fillRect(boxX, boxY, boxW, boxH);
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      ctx.fillStyle = '#0f7e9b';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('QUADRATIC FIT: y = At² + Bt + C', boxX + 10, boxY + 16);

      ctx.fillStyle = '#123140';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.fillText(`A = ${fit.A.toFixed(4)}`, boxX + 10, boxY + 32);
      ctx.fillText(`B = ${fit.B.toFixed(4)} (v₀ᵧ)`, boxX + 10, boxY + 46);
      ctx.fillText(`C = ${fit.C.toFixed(4)} (y₀)`, boxX + 10, boxY + 60);

      ctx.fillStyle = '#d67b19';
      ctx.font = 'bold 10px JetBrains Mono, monospace';
      ctx.fillText(`a = ${(fit.acceleration).toFixed(3)} m/s²`, boxX + 110, boxY + 32);
      ctx.fillText(`g = ${Math.abs(fit.acceleration).toFixed(3)} m/s²`, boxX + 110, boxY + 46);
      ctx.fillStyle = '#4b6570';
      ctx.fillText(`R² = ${fit.r2.toFixed(4)}`, boxX + 10, boxY + 78);
    }
  }

  getCanvasImage(method) {
    if (!this.canvas) return null;
    return this.canvas.toDataURL('image/png');
  }

  async copyGraphToClipboard() {
    if (!this.canvas) return;
    try {
      this.canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        alert('Graph image copied to clipboard! You can paste it into Word, Google Docs, or the Lab Report.');
      });
    } catch (err) {
      alert('Clipboard access restricted by browser. You can use the "Save PNG" button instead!');
    }
  }

  downloadGraphPNG() {
    if (!this.canvas) return;
    const link = document.createElement('a');
    link.download = `Graph_${this.activeMethod}_Position_vs_Time.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}
