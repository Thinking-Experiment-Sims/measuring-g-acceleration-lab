/**
 * Interactive Lab Report Component
 * Matches the student lab handout 1:1 across 3 pages:
 * Page 1: Method I (Photogates) Graph & Fit
 * Page 2: Method II (Ticker Tape) Graph & Fit
 * Page 3: Analysis Table, % Difference Calculations, and 3-Point Error Reflection
 * Part of "The Thinking Experiment" PhysicsKit
 */

import { calculatePercentDifference } from '../physics/regression.js';

export class LabReportView {
  constructor(containerId) {
    this.container = document.getElementById(containerId);

    // State for report data
    this.reportData = {
      studentName: '',
      date: new Date().toLocaleDateString(),
      classPeriod: '',
      // Method I
      pgGraphImg: null,
      pgY0: '',
      pgV0: '',
      pgA: '',
      pgG: '',
      pgPercentDiff: '',
      // Method II
      tickerGraphImg: null,
      tickerY0: '',
      tickerV0: '',
      tickerA: '',
      tickerG: '',
      tickerPercentDiff: '',
      // Analysis reasons
      reason1: '',
      reason2: '',
      reason3: ''
    };

    this.showTeacherRubric = false;
    this.render();
  }

  updateFitData(method, fitResult, graphImgData) {
    if (!fitResult) return;

    if (method === 'photogates') {
      this.reportData.pgGraphImg = graphImgData;
      this.reportData.pgY0 = fitResult.C.toFixed(4);
      this.reportData.pgV0 = fitResult.B.toFixed(4);
      this.reportData.pgA = fitResult.acceleration.toFixed(4);
      this.reportData.pgG = Math.abs(fitResult.acceleration).toFixed(4);
      this.reportData.pgPercentDiff = calculatePercentDifference(Math.abs(fitResult.acceleration), 9.80).toFixed(2);
    } else if (method === 'ticker') {
      this.reportData.tickerGraphImg = graphImgData;
      this.reportData.tickerY0 = fitResult.C.toFixed(4);
      this.reportData.tickerV0 = fitResult.B.toFixed(4);
      this.reportData.tickerA = fitResult.acceleration.toFixed(4);
      this.reportData.tickerG = Math.abs(fitResult.acceleration).toFixed(4);
      this.reportData.tickerPercentDiff = calculatePercentDifference(Math.abs(fitResult.acceleration), 9.80).toFixed(2);
    }

    this.render();
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <!-- Top Toolbar (No-Print) -->
        <div class="card no-print" style="margin-bottom: 0;">
          <div class="card-header" style="margin-bottom: 0; padding-bottom: 0; border-bottom: none;">
            <div>
              <h2 class="card-title">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                Student Lab Report &amp; Handout
              </h2>
              <p class="card-subtitle">Complete your lab assignment matching the official classroom handout. Printable or exportable to PDF.</p>
            </div>

            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button class="btn btn-secondary" id="btnToggleRubric">
                ${this.showTeacherRubric ? 'Hide Teacher Rubric' : 'Show Teacher Rubric'}
              </button>
              <button class="btn btn-primary" id="btnPrintReport">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                Print / Save PDF
              </button>
            </div>
          </div>
        </div>

        <!-- Student Meta Header -->
        <div class="card" style="margin-bottom: 0; padding: 16px 24px;">
          <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 16px;">
            <div>
              <label style="font-size: 0.8rem; font-weight: 700; color: var(--primary-teal); text-transform: uppercase;">Student Name(s)</label>
              <input type="text" id="iptStudentName" value="${this.reportData.studentName}" placeholder="e.g. Jane Doe & Alex Smith" style="width: 100%; padding: 6px 10px; border: 1px solid var(--border-subtle); border-radius: 4px; font-family: var(--font-sans);" />
            </div>
            <div>
              <label style="font-size: 0.8rem; font-weight: 700; color: var(--primary-teal); text-transform: uppercase;">Date</label>
              <input type="text" id="iptDate" value="${this.reportData.date}" style="width: 100%; padding: 6px 10px; border: 1px solid var(--border-subtle); border-radius: 4px; font-family: var(--font-sans);" />
            </div>
            <div>
              <label style="font-size: 0.8rem; font-weight: 700; color: var(--primary-teal); text-transform: uppercase;">Class Period</label>
              <input type="text" id="iptPeriod" value="${this.reportData.classPeriod}" placeholder="e.g. Period 3" style="width: 100%; padding: 6px 10px; border: 1px solid var(--border-subtle); border-radius: 4px; font-family: var(--font-sans);" />
            </div>
          </div>
        </div>

        <!-- ==========================================
             PAGE 1: METHOD I: PHOTOGATES
             ========================================== -->
        <div class="report-page-card">
          <div class="report-header">
            <h2>Lab: Measuring the Acceleration Due to Gravity on Earth’s Surface “g”</h2>
            <div style="margin-top: 10px;">
              <h3 style="font-size: 1.1rem; color: var(--text-main); font-weight: 700;">Purpose</h3>
              <p style="color: var(--text-muted); font-size: 0.95rem; margin-top: 4px;">
                In this lab we are going to find out the value of the acceleration of gravity on Earth, “g”, by two methods.
              </p>
            </div>
          </div>

          <div style="margin-bottom: 14px;">
            <h3 style="font-family: var(--font-display); font-size: 1.15rem; color: var(--primary-teal);">
              Method I: Photogates
            </h3>
            <ol style="padding-left: 24px; margin-top: 6px; font-size: 0.92rem; display: flex; flex-direction: column; gap: 4px; color: var(--text-main);">
              <li>Using the photogates, create a Position vs. Time graph.</li>
              <li>Apply a quadratic fit for the parabola.</li>
              <li>Copy and paste the graph below</li>
            </ol>
          </div>

          <!-- Page 1 Graph Paste Area -->
          <div class="graph-paste-box ${this.reportData.pgGraphImg ? 'has-graph' : ''}">
            ${this.reportData.pgGraphImg ? `
              <img src="${this.reportData.pgGraphImg}" alt="Method I Photogates Graph" style="max-width: 100%; max-height: 480px; object-fit: contain; border-radius: 4px;" />
            ` : `
              <div class="graph-paste-placeholder">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 8px; color: var(--text-subtle);">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                <div style="font-weight: 600; color: var(--text-main); margin-bottom: 4px;">[Method I: Photogates Position vs. Time Graph]</div>
                <div style="font-size: 0.84rem;">Plot your photogates data in the "Analysis &amp; Graphs" tab to automatically embed your graph here.</div>
              </div>
            `}
          </div>
        </div>

        <!-- ==========================================
             PAGE 2: METHOD II: TICKER TAPE
             ========================================== -->
        <div class="report-page-card">
          <div class="report-header">
            <h3 style="font-family: var(--font-display); font-size: 1.25rem; color: var(--primary-teal);">
              Method II: Ticker Tape
            </h3>
            <ol style="padding-left: 24px; margin-top: 8px; font-size: 0.92rem; display: flex; flex-direction: column; gap: 4px; color: var(--text-main);">
              <li>Using the values of the points in the ticker tape, create a Position vs. Time graph.</li>
              <li>Apply a quadratic fit for the parabola.</li>
              <li>Copy and paste the graph below</li>
            </ol>
          </div>

          <!-- Page 2 Graph Paste Area -->
          <div class="graph-paste-box ${this.reportData.tickerGraphImg ? 'has-graph' : ''}">
            ${this.reportData.tickerGraphImg ? `
              <img src="${this.reportData.tickerGraphImg}" alt="Method II Ticker Tape Graph" style="max-width: 100%; max-height: 480px; object-fit: contain; border-radius: 4px;" />
            ` : `
              <div class="graph-paste-placeholder">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 8px; color: var(--text-subtle);">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                <div style="font-weight: 600; color: var(--text-main); margin-bottom: 4px;">[Method II: Ticker Tape Position vs. Time Graph]</div>
                <div style="font-size: 0.84rem;">Plot your ticker tape data in the "Analysis &amp; Graphs" tab to automatically embed your graph here.</div>
              </div>
            `}
          </div>
        </div>

        <!-- ==========================================
             PAGE 3: ANALYSIS OF THE DATA
             ========================================== -->
        <div class="report-page-card">
          <div class="report-header">
            <h2>Analysis of the Data</h2>
          </div>

          <!-- Question 1: Table of y0, v0y, a, g -->
          <div style="margin-bottom: 24px;">
            <p style="font-size: 0.95rem; font-weight: 600; color: var(--text-main); margin-bottom: 10px;">
              1. In the table below, write the initial position, initial velocity, and acceleration for each case according to the quadratic fit equation.
            </p>

            <table class="analysis-comparison-table">
              <thead>
                <tr>
                  <th style="width: 50%;">Photogates</th>
                  <th style="width: 50%;">Ticker Tape</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                      <strong style="width: 50px;">y₀ =</strong>
                      <input type="text" id="iptPgY0" value="${this.reportData.pgY0}" placeholder="Enter y₀ (m)" style="flex: 1; padding: 5px 8px; border: 1px solid var(--border-subtle); border-radius: 4px; font-family: var(--font-mono);" />
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                      <strong style="width: 50px;">v₀ᵧ =</strong>
                      <input type="text" id="iptPgV0" value="${this.reportData.pgV0}" placeholder="Enter v₀ᵧ (m/s)" style="flex: 1; padding: 5px 8px; border: 1px solid var(--border-subtle); border-radius: 4px; font-family: var(--font-mono);" />
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                      <strong style="width: 50px;">a =</strong>
                      <input type="text" id="iptPgA" value="${this.reportData.pgA}" placeholder="Enter a (m/s²)" style="flex: 1; padding: 5px 8px; border: 1px solid var(--border-subtle); border-radius: 4px; font-family: var(--font-mono);" />
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-top: 12px; padding-top: 8px; border-top: 1px dashed var(--border-subtle);">
                      <strong style="width: 50px; color: var(--primary-teal);">g =</strong>
                      <input type="text" id="iptPgG" value="${this.reportData.pgG}" placeholder="Enter g (m/s²)" style="flex: 1; padding: 6px 8px; border: 1.5px solid var(--primary-teal); border-radius: 4px; font-family: var(--font-mono); font-weight: 700; color: var(--primary-teal-dark);" />
                    </div>
                  </td>
                  <td>
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                      <strong style="width: 50px;">y₀ =</strong>
                      <input type="text" id="iptTickerY0" value="${this.reportData.tickerY0}" placeholder="Enter y₀ (m)" style="flex: 1; padding: 5px 8px; border: 1px solid var(--border-subtle); border-radius: 4px; font-family: var(--font-mono);" />
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                      <strong style="width: 50px;">v₀ᵧ =</strong>
                      <input type="text" id="iptTickerV0" value="${this.reportData.tickerV0}" placeholder="Enter v₀ᵧ (m/s)" style="flex: 1; padding: 5px 8px; border: 1px solid var(--border-subtle); border-radius: 4px; font-family: var(--font-mono);" />
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                      <strong style="width: 50px;">a =</strong>
                      <input type="text" id="iptTickerA" value="${this.reportData.tickerA}" placeholder="Enter a (m/s²)" style="flex: 1; padding: 5px 8px; border: 1px solid var(--border-subtle); border-radius: 4px; font-family: var(--font-mono);" />
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-top: 12px; padding-top: 8px; border-top: 1px dashed var(--border-subtle);">
                      <strong style="width: 50px; color: var(--accent-amber);">g =</strong>
                      <input type="text" id="iptTickerG" value="${this.reportData.tickerG}" placeholder="Enter g (m/s²)" style="flex: 1; padding: 6px 8px; border: 1.5px solid var(--accent-amber); border-radius: 4px; font-family: var(--font-mono); font-weight: 700; color: var(--accent-amber-dark);" />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Question 2: % Difference Calculation -->
          <div style="margin-bottom: 28px;">
            <p style="font-size: 0.95rem; font-weight: 600; color: var(--text-main); margin-bottom: 12px;">
              2. Calculate the % difference in each case by comparing with the reference value of g = 9.8 m/s².
            </p>

            <table class="analysis-comparison-table">
              <thead>
                <tr>
                  <th style="width: 50%;">Photogates</th>
                  <th style="width: 50%;">Ticker Tape</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div class="percent-diff-formula-card">
                      % difference = |(Experimental Value - Reference Value) / Reference Value| * 100%
                    </div>
                    <div style="font-family: var(--font-mono); font-size: 0.88rem; margin: 10px 0;">
                      % difference = (|${this.reportData.pgG || '____'} - 9.8| / 9.8) * 100%
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-top: 10px;">
                      <strong style="white-space: nowrap;">% difference =</strong>
                      <input type="text" id="iptPgPctDiff" value="${this.reportData.pgPercentDiff ? `${this.reportData.pgPercentDiff}%` : ''}" placeholder="e.g. 1.25%" style="flex: 1; padding: 6px 8px; border: 1px solid var(--border-subtle); border-radius: 4px; font-family: var(--font-mono); font-weight: 600;" />
                    </div>
                  </td>
                  <td>
                    <div class="percent-diff-formula-card">
                      % difference = |(Experimental Value - Reference Value) / Reference Value| * 100%
                    </div>
                    <div style="font-family: var(--font-mono); font-size: 0.88rem; margin: 10px 0;">
                      % difference = (|${this.reportData.tickerG || '____'} - 9.8| / 9.8) * 100%
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-top: 10px;">
                      <strong style="white-space: nowrap;">% difference =</strong>
                      <input type="text" id="iptTickerPctDiff" value="${this.reportData.tickerPercentDiff ? `${this.reportData.tickerPercentDiff}%` : ''}" placeholder="e.g. 2.45%" style="flex: 1; padding: 6px 8px; border: 1px solid var(--border-subtle); border-radius: 4px; font-family: var(--font-mono); font-weight: 600;" />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Question 3: 3 Valid Reasons for Error -->
          <div>
            <p style="font-size: 0.95rem; font-weight: 600; color: var(--text-main); margin-bottom: 12px;">
              3. Explain why your measured values might differ from the reference value. Mention only reasons that would actually affect the value in a significant way. Write at least 3 valid reasons.
            </p>

            <div style="display: flex; flex-direction: column; gap: 12px;">
              <div>
                <label style="font-size: 0.85rem; font-weight: 700; color: var(--primary-teal);">Reason 1:</label>
                <textarea id="iptReason1" rows="2" placeholder="e.g. Friction between the paper tape, ticker guide slots, and the oscillating striker clapper..." style="width: 100%; padding: 8px 10px; border: 1px solid var(--border-subtle); border-radius: 4px; font-family: var(--font-sans); font-size: 0.88rem; margin-top: 4px;">${this.reportData.reason1}</textarea>
              </div>

              <div>
                <label style="font-size: 0.85rem; font-weight: 700; color: var(--primary-teal);">Reason 2:</label>
                <textarea id="iptReason2" rows="2" placeholder="e.g. Initial downward or upward hand motion during release giving non-zero initial velocity..." style="width: 100%; padding: 8px 10px; border: 1px solid var(--border-subtle); border-radius: 4px; font-family: var(--font-sans); font-size: 0.88rem; margin-top: 4px;">${this.reportData.reason2}</textarea>
              </div>

              <div>
                <label style="font-size: 0.85rem; font-weight: 700; color: var(--primary-teal);">Reason 3:</label>
                <textarea id="iptReason3" rows="2" placeholder="e.g. Parallax error in measuring photogate height with the meter stick, or object tilting slightly through beams..." style="width: 100%; padding: 8px 10px; border: 1px solid var(--border-subtle); border-radius: 4px; font-family: var(--font-sans); font-size: 0.88rem; margin-top: 4px;">${this.reportData.reason3}</textarea>
              </div>
            </div>

            <!-- Teacher Rubric Guidance Box (Toggleable) -->
            ${this.showTeacherRubric ? `
              <div class="callout callout-amber" style="margin-top: 20px;">
                <strong>Teacher Grading Rubric &amp; Accepted Explanations</strong>
                <ul style="padding-left: 18px; margin-top: 6px; font-size: 0.86rem; display: flex; flex-direction: column; gap: 6px;">
                  <li><strong>Valid Reason 1 - Mechanical Friction (Ticker Tape):</strong> Physical contact between the vibrating clapper, the carbon paper disc, and the paper strip produces mechanical drag, systematically reducing the net downward acceleration ($a < g$).</li>
                  <li><strong>Valid Reason 2 - Human Release Variation (Photogates):</strong> If the object is released with a slight downward push or upward jerk, $v_{0y} \neq 0$, altering the initial terms of the trajectory. If the object drops with a tilt, the effective height where the beam is interrupted differs slightly.</li>
                  <li><strong>Valid Reason 3 - Parallax &amp; Measuring Scale Calibration:</strong> Reading photogate beam holes with a vertical meter stick can introduce parallax error of $\pm 1\text{--}2\text{ mm}$, impacting the quadratic fit curvature.</li>
                  <li><strong>Valid Reason 4 - Air Resistance:</strong> Aerodynamic drag acts opposite to velocity ($F_d \propto v^2$), though minor at these drop heights, it systematically lowers measured $g$.</li>
                  <li><strong>Invalid Student Responses (To Penalize):</strong> "Human reaction time" (invalid because photogates and ticker timers record automatically, independent of human reflexes), or "Gravity changes from day to day".</li>
                </ul>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  attachEvents() {
    const btnPrint = this.container.querySelector('#btnPrintReport');
    const btnRubric = this.container.querySelector('#btnToggleRubric');

    if (btnPrint) {
      btnPrint.addEventListener('click', () => {
        window.print();
      });
    }

    if (btnRubric) {
      btnRubric.addEventListener('click', () => {
        this.showTeacherRubric = !this.showTeacherRubric;
        this.render();
      });
    }

    // Save form inputs to state
    const bindInput = (id, field) => {
      const el = this.container.querySelector(id);
      if (el) {
        el.addEventListener('input', (e) => {
          this.reportData[field] = e.target.value;
        });
      }
    };

    bindInput('#iptStudentName', 'studentName');
    bindInput('#iptDate', 'date');
    bindInput('#iptPeriod', 'classPeriod');
    bindInput('#iptPgY0', 'pgY0');
    bindInput('#iptPgV0', 'pgV0');
    bindInput('#iptPgA', 'pgA');
    bindInput('#iptPgG', 'pgG');
    bindInput('#iptPgPctDiff', 'pgPercentDiff');
    bindInput('#iptTickerY0', 'tickerY0');
    bindInput('#iptTickerV0', 'tickerV0');
    bindInput('#iptTickerA', 'tickerA');
    bindInput('#iptTickerG', 'tickerG');
    bindInput('#iptTickerPctDiff', 'tickerPercentDiff');
    bindInput('#iptReason1', 'reason1');
    bindInput('#iptReason2', 'reason2');
    bindInput('#iptReason3', 'reason3');
  }
}
