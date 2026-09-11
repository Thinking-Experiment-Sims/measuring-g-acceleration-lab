/**
 * Apparatus & Setup Visualizer
 * Provides interactive 2D diagrams, teacher walkthrough, and student instructions
 * Part of "The Thinking Experiment" PhysicsKit
 */

export class ApparatusView {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.activeMethod = 'photogates';
    this.render();
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              Laboratory Setup &amp; Pedagogical Guide
            </h2>
            <p class="card-subtitle">Comprehensive guide for teachers and students on equipment mechanics, data acquisition, and experimental tolerances.</p>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn ${this.activeMethod === 'photogates' ? 'btn-primary' : 'btn-secondary'}" id="btnApparatusPg">
              Method I: Photogates Setup
            </button>
            <button class="btn ${this.activeMethod === 'ticker' ? 'btn-primary' : 'btn-secondary'}" id="btnApparatusTicker">
              Method II: Ticker Tape Setup
            </button>
          </div>
        </div>

        <div id="apparatusContent">
          ${this.activeMethod === 'photogates' ? this.renderPhotogatesGuide() : this.renderTickerTapeGuide()}
        </div>
      </div>
    `;

    this.attachEvents();
  }

  attachEvents() {
    const btnPg = this.container.querySelector('#btnApparatusPg');
    const btnTicker = this.container.querySelector('#btnApparatusTicker');

    if (btnPg) {
      btnPg.addEventListener('click', () => {
        this.activeMethod = 'photogates';
        this.render();
      });
    }

    if (btnTicker) {
      btnTicker.addEventListener('click', () => {
        this.activeMethod = 'ticker';
        this.render();
      });
    }
  }

  renderPhotogatesGuide() {
    return `
      <div class="split-grid" style="align-items: start;">
        <!-- Visual Diagram -->
        <div class="canvas-container" style="padding: 24px; min-height: 480px; justify-content: flex-start; text-align: left;">
          <svg viewBox="0 0 450 560" width="100%" height="480" style="max-width: 450px;">
            <!-- Stand Base & Vertical Rod -->
            <rect x="50" y="520" width="160" height="16" rx="4" fill="#718894" />
            <rect x="120" y="40" width="12" height="480" fill="#96bdcb" />
            <circle cx="126" cy="40" r="8" fill="#4b6570" />

            <!-- Metric Scale / Meter Stick alongside rod -->
            <rect x="140" y="60" width="22" height="460" fill="#fdfae8" stroke="#d67b19" stroke-width="1.5" />
            <!-- Centimeter graduation ticks -->
            ${Array.from({ length: 11 }, (_, i) => {
              const y = 80 + i * 42;
              const cmLabel = 100 - i * 10;
              return `
                <line x1="140" y1="${y}" x2="152" y2="${y}" stroke="#123140" stroke-width="1.2" />
                <text x="154" y="${y + 3}" font-family="Inter, sans-serif" font-size="8" fill="#123140" font-weight="600">${cmLabel}</text>
              `;
            }).join('')}

            <!-- 4 Photogate Brackets mounted to rod -->
            ${[
              { y: 130, num: 1, g1: '80.0 cm', g2: '78.0 cm' },
              { y: 220, num: 2, g1: '60.0 cm', g2: '58.0 cm' },
              { y: 310, num: 3, g1: '40.0 cm', g2: '38.0 cm' },
              { y: 400, num: 4, g1: '20.0 cm', g2: '18.0 cm' }
            ].map(pg => `
              <!-- Clamp to rod -->
              <rect x="110" y="${pg.y + 10}" width="32" height="18" rx="3" fill="#123140" />
              <circle cx="116" cy="${pg.y + 19}" r="4" fill="#0f7e9b" />

              <!-- U-bracket extending outward -->
              <path d="M 135 ${pg.y} L 60 ${pg.y} L 60 ${pg.y + 44} L 135 ${pg.y + 44}" fill="none" stroke="#0f7e9b" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
              
              <!-- Gate 1 (Top Sensor Eye & IR Beam) -->
              <circle cx="60" cy="${pg.y + 10}" r="3.5" fill="#d67b19" />
              <circle cx="100" cy="${pg.y + 10}" r="3.5" fill="#d67b19" />
              <line x1="60" y1="${pg.y + 10}" x2="100" y2="${pg.y + 10}" stroke="#d67b19" stroke-width="1.5" stroke-dasharray="3,3" />

              <!-- Gate 2 (Bottom Sensor Eye & IR Beam - 2 cm lower) -->
              <circle cx="60" cy="${pg.y + 30}" r="3.5" fill="#d67b19" />
              <circle cx="100" cy="${pg.y + 30}" r="3.5" fill="#d67b19" />
              <line x1="60" y1="${pg.y + 30}" x2="100" y2="${pg.y + 30}" stroke="#d67b19" stroke-width="1.5" stroke-dasharray="3,3" />

              <!-- Status LED -->
              <circle cx="70" cy="${pg.y - 2}" r="3" fill="#059669" />

              <!-- Labels -->
              <text x="175" y="${pg.y + 12}" font-family="Inter, sans-serif" font-size="10" font-weight="700" fill="#0f7e9b">Photogate ${pg.num}</text>
              <text x="175" y="${pg.y + 26}" font-family="JetBrains Mono, monospace" font-size="9" fill="#4b6570">Gate 1: ${pg.g1}</text>
              <text x="175" y="${pg.y + 38}" font-family="JetBrains Mono, monospace" font-size="9" fill="#4b6570">Gate 2: ${pg.g2} (Δ=2cm)</text>
            `).join('')}

            <!-- Dropping Object (Cylinder / Picket object) -->
            <rect x="74" y="65" width="12" height="42" rx="2" fill="#123140" stroke="#0f7e9b" stroke-width="1.5" />
            <path d="M 80 112 L 80 130 M 76 124 L 80 130 L 84 124" stroke="#d67b19" stroke-width="2" fill="none" />
            <text x="18" y="75" font-family="Inter, sans-serif" font-size="10" font-weight="600" fill="#123140">Falling Object</text>
            <path d="M 68 73 L 73 73" stroke="#123140" stroke-width="1.2" />

            <!-- Bottom cushion pad -->
            <rect x="50" y="512" width="60" height="8" rx="2" fill="#4b6570" />
            <text x="50" y="534" font-family="Inter, sans-serif" font-size="9" fill="#718894">Catch Pad</text>
          </svg>
        </div>

        <!-- Explanatory Guide Content -->
        <div>
          <div class="callout">
            <strong>Key Concept: Dual-Sensor Photogates</strong>
            Each modern photogate unit contains <strong>two distinct optical beams</strong> built into the single U-bracket (labeled <em>Gate 1</em> at the top and <em>Gate 2</em> at the bottom, spaced exactly 2.0 cm apart). Across 4 photogates, students collect <strong>8 distinct position and time data points</strong>!
          </div>

          <div style="margin-bottom: 20px;">
            <h3 style="font-family: var(--font-display); color: var(--primary-teal); font-size: 1.05rem; margin-bottom: 8px;">
              Step-by-Step Procedure
            </h3>
            <ol style="padding-left: 20px; font-size: 0.9rem; color: var(--text-main); display: flex; flex-direction: column; gap: 8px;">
              <li><strong>Measure Sensor Heights:</strong> Measure the vertical height of each photogate directly from the optical sensor hole (not the plastic edge). Measure <em>both</em> Gate 1 and Gate 2 for each photogate.</li>
              <li><strong>Configure Channels:</strong> Set the digital sensor interface to record Gate State (1 = blocked, 0 = unblocked) and unselect velocity.</li>
              <li><strong>Record Times:</strong> When the falling object cuts each beam, the sensor state transitions from <code>0</code> to <code>1</code>. Record this exact timestamp for each gate.</li>
              <li><strong>Caution - Sensor Order:</strong> In digital setups, wireless sensors may occasionally list channels out of physical vertical order. Always verify the physical gate ID corresponds to the correct height!</li>
            </ol>
          </div>

          <div class="callout callout-amber">
            <strong>Real-World Uncertainties &amp; Error Sources</strong>
            <ul style="padding-left: 16px; margin-top: 6px; display: flex; flex-direction: column; gap: 4px;">
              <li><strong>Release Technique:</strong> Releasing by hand can introduce a tiny initial downward nudge ($v_{0y} \neq 0$) or slight tilt as the object cuts the beam.</li>
              <li><strong>Parallax in Ruler Reading:</strong> Misaligning eye level with the small photogate hole leads to $\pm 1\text{--}2\text{ mm}$ position uncertainty.</li>
              <li><strong>Quadratic Fit Analysis:</strong> Fitting $y(t) = A t^2 + B t + C$ allows students to determine kinematic quantities from fit coefficients.</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  renderTickerTapeGuide() {
    return `
      <div class="split-grid" style="align-items: start;">
        <!-- Visual Diagram -->
        <div class="canvas-container" style="padding: 24px; min-height: 480px; justify-content: flex-start; text-align: left;">
          <svg viewBox="0 0 450 560" width="100%" height="480" style="max-width: 450px;">
            <!-- Table Edge or Top Stand Mount -->
            <rect x="20" y="30" width="220" height="24" rx="4" fill="#718894" />
            <text x="28" y="46" font-family="Inter, sans-serif" font-size="10" font-weight="600" fill="#ffffff">Lab Bench Edge</text>

            <!-- Ticker Timer Housing -->
            <rect x="140" y="54" width="130" height="90" rx="8" fill="#123140" stroke="#0f7e9b" stroke-width="2" />
            <text x="152" y="76" font-family="Inter, sans-serif" font-size="11" font-weight="700" fill="#ffffff">Ticker Timer</text>
            <text x="152" y="90" font-family="JetBrains Mono, monospace" font-size="9" fill="#eaf4f7">60 Hz AC Solenoid</text>

            <!-- Carbon Paper Disc -->
            <circle cx="205" cy="112" r="22" fill="#334155" stroke="#94a3b8" stroke-width="1.5" />
            <circle cx="205" cy="112" r="4" fill="#f8fafc" />
            <text x="214" y="116" font-family="Inter, sans-serif" font-size="8" fill="#ffffff">Carbon Disc</text>

            <!-- Clapper / Striker Arm -->
            <line x1="165" y1="100" x2="205" y2="112" stroke="#d67b19" stroke-width="3" stroke-linecap="round" />
            <circle cx="205" cy="112" r="3" fill="#d67b19" />

            <!-- Tape Path (Threaded through slot under carbon disc) -->
            <!-- Top unspooled tape roll -->
            <rect x="195" y="10" width="20" height="44" rx="2" fill="#fefae0" stroke="#d67b19" stroke-width="1" />
            <!-- Vertical descending tape -->
            <rect x="195" y="54" width="20" height="430" fill="#fdfae8" stroke="#cbd5e1" stroke-width="1" />

            <!-- Dots on tape (spacing expanding quadratically!) -->
            ${[
              { y: 120, num: 0 },
              { y: 128, num: 1 },
              { y: 140, num: 2 },
              { y: 158, num: 3 },
              { y: 182, num: 4 },
              { y: 212, num: 5 },
              { y: 248, num: 6 },
              { y: 290, num: 7 },
              { y: 338, num: 8 },
              { y: 392, num: 9 },
              { y: 452, num: 10 }
            ].map(dot => `
              <circle cx="205" cy="${dot.y}" r="2.5" fill="#1e293b" />
              <line x1="216" y1="${dot.y}" x2="235" y2="${dot.y}" stroke="#94a3b8" stroke-width="1" />
              <text x="240" y="${dot.y + 3}" font-family="JetBrains Mono, monospace" font-size="8" fill="#4b6570">Dot ${dot.num}</text>
            `).join('')}

            <!-- Hanging Mass attached to bottom of tape -->
            <rect x="190" y="484" width="30" height="45" rx="4" fill="#0f7e9b" stroke="#0b5f77" stroke-width="1.5" />
            <circle cx="205" cy="484" r="3" fill="#ffffff" />
            <text x="195" y="510" font-family="Inter, sans-serif" font-size="9" font-weight="700" fill="#ffffff">200g</text>
            <text x="195" y="522" font-family="Inter, sans-serif" font-size="8" fill="#eaf4f7">Mass</text>

            <!-- Downward motion arrow -->
            <path d="M 230 490 L 230 525 M 225 518 L 230 525 L 235 518" stroke="#d67b19" stroke-width="2" fill="none" />
            <text x="242" y="512" font-family="Inter, sans-serif" font-size="10" font-weight="600" fill="#d67b19">Free Fall</text>
          </svg>
        </div>

        <!-- Explanatory Guide Content -->
        <div>
          <div class="callout">
            <strong>Key Concept: The 60 Hz Spark / Ticker Mechanism</strong>
            An AC electromagnetic striker vibrates up and down at <strong>60 cycles per second (60 Hz)</strong>. Every time the pin strikes the rotating carbon disc, it leaves a tiny ink mark on the paper strip. The time interval between every single dot is exactly:
            <div style="margin-top: 6px; font-weight: 600; font-family: var(--font-mono); color: var(--primary-teal-dark);">
              Δt = 1 / 60 s ≈ 0.01667 s
            </div>
          </div>

          <div style="margin-bottom: 20px;">
            <h3 style="font-family: var(--font-display); color: var(--primary-teal); font-size: 1.05rem; margin-bottom: 8px;">
              Measuring Protocol
            </h3>
            <ol style="padding-left: 20px; font-size: 0.9rem; color: var(--text-main); display: flex; flex-direction: column; gap: 8px;">
              <li><strong>Tape Threading:</strong> The paper tape must pass cleanly <em>underneath</em> the carbon paper disc so the striker punches the carbon against the white tape.</li>
              <li><strong>Choosing the Origin (Dot 0):</strong> The very first marks may overlap while the mass is held at rest. Find the <strong>first clearly distinct dot</strong> and label it <code>Dot 0</code> (defining $t = 0\text{ s}$ and $y = 0\text{ m}$).</li>
              <li><strong>Measure 12 Consecutive Dots:</strong> Using a metric ruler, measure the displacement of 12 consecutive points (Dot 0 to Dot 11) relative to Dot 0. <em>Do not skip dots!</em></li>
              <li><strong>Time Step Calculation:</strong> Each dot increases in time by $1/60\text{ s}$:
                <div style="font-family: var(--font-mono); font-size: 0.85rem; margin-top: 4px; color: var(--primary-teal);">
                  t_0 = 0 s, &nbsp; t_1 = 1/60 s, &nbsp; t_2 = 2/60 s, ..., &nbsp; t_{11} = 11/60 s (≈ 0.183 s)
                </div>
              </li>
            </ol>
          </div>

          <div class="callout callout-amber">
            <strong>Real-World Mechanical Friction</strong>
            Unlike photogates (which use contactless light beams), a ticker tape timer experiences:
            <ul style="padding-left: 16px; margin-top: 6px; display: flex; flex-direction: column; gap: 4px;">
              <li><strong>Striker Pin Resistance:</strong> The vibrating pin repeatedly impacts and drags on the paper strip.</li>
              <li><strong>Paper Guide Friction:</strong> The tape rubs against the entry/exit metal slots.</li>
              <li><strong>Resulting Value of g:</strong> Measured acceleration in a classroom ticker tape lab is almost always <strong>slightly lower than $9.8\text{ m/s}^2$</strong> (typically around $9.4\text{--}9.7\text{ m/s}^2$), providing a prime authentic discussion point for experimental error!</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }
}
