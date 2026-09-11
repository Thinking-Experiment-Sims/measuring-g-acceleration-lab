/**
 * Measuring "g" on Earth's Surface: Photogates & Ticker Tape Lab
 * Part of "The Thinking Experiment" PhysicsKit
 * Pure vanilla JavaScript - Standalone, Zero Build, Zero External Dependencies
 */

(function () {
  'use strict';

  const STANDARD_G = 9.80; // m/s^2

  // =========================================================================
  // Physics & Regression Engine
  // =========================================================================

  function solve3x3(M, v) {
    const A = [
      [M[0][0], M[0][1], M[0][2], v[0]],
      [M[1][0], M[1][1], M[1][2], v[1]],
      [M[2][0], M[2][1], M[2][2], v[2]]
    ];

    for (let col = 0; col < 3; col++) {
      let maxRow = col;
      for (let r = col + 1; r < 3; r++) {
        if (Math.abs(A[r][col]) > Math.abs(A[maxRow][col])) maxRow = r;
      }
      if (Math.abs(A[maxRow][col]) < 1e-12) return null;

      if (maxRow !== col) {
        const temp = A[col];
        A[col] = A[maxRow];
        A[maxRow] = temp;
      }

      for (let r = col + 1; r < 3; r++) {
        const factor = A[r][col] / A[col][col];
        for (let c = col; c <= 3; c++) {
          A[r][c] -= factor * A[col][c];
        }
      }
    }

    const x = [0, 0, 0];
    for (let r = 2; r >= 0; r--) {
      let sum = A[r][3];
      for (let c = r + 1; c < 3; c++) {
        sum -= A[r][c] * x[c];
      }
      x[r] = sum / A[r][r];
    }
    return x;
  }

  function fitQuadratic(points) {
    if (!points || points.length < 3) return null;
    const N = points.length;
    let sumT = 0, sumT2 = 0, sumT3 = 0, sumT4 = 0;
    let sumY = 0, sumTY = 0, sumT2Y = 0;

    for (let i = 0; i < N; i++) {
      const t = points[i].t;
      const y = points[i].y;
      const t2 = t * t;
      sumT += t;
      sumT2 += t2;
      sumT3 += t2 * t;
      sumT4 += t2 * t2;
      sumY += y;
      sumTY += t * y;
      sumT2Y += t2 * y;
    }

    const M = [
      [sumT4, sumT3, sumT2],
      [sumT3, sumT2, sumT],
      [sumT2, sumT, N]
    ];
    const v = [sumT2Y, sumTY, sumY];
    const solution = solve3x3(M, v);
    if (!solution) return null;

    const [A, B, C] = solution;
    const meanY = sumY / N;
    let ssTot = 0, ssRes = 0;

    points.forEach(pt => {
      const yPred = (A * pt.t * pt.t) + (B * pt.t) + C;
      const residual = pt.y - yPred;
      ssTot += Math.pow(pt.y - meanY, 2);
      ssRes += Math.pow(residual, 2);
    });

    const r2 = ssTot === 0 ? 1 : Math.max(0, 1 - (ssRes / ssTot));
    const rmse = Math.sqrt(ssRes / N);
    const acceleration = 2 * A;

    return {
      A,
      B,
      C,
      acceleration,
      gMeasured: Math.abs(acceleration),
      v0: B,
      y0: C,
      r2,
      rmse,
      equationString: `y = ${A.toFixed(4)}·t² + ${B.toFixed(4)}·t + ${C.toFixed(4)}`
    };
  }

  function calculatePercentDifference(experimental, reference = STANDARD_G) {
    if (reference === 0) return 0;
    return Math.abs((experimental - reference) / reference) * 100;
  }

  function simulatePhotogateDrop({
    gates = [],
    dropHeight = 0.815,
    g = STANDARD_G,
    initialVelocity = 0,
    objectLength = 0.120,
    applyUncertainty = true,
    jitter = 0
  }) {
    // Release right above the first photogate with realistic tiny release variation
    const effDropHeight = applyUncertainty ? dropHeight + (jitter * 0.002) : dropHeight;
    const effV0 = applyUncertainty ? initialVelocity + (jitter * 0.02) : initialVelocity;
    const effG = applyUncertainty ? g * (1 - Math.abs(jitter) * 0.003) : g;

    const events = [];
    const calculateFallTime = (d) => {
      if (d <= 0) return 0;
      const discriminant = (effV0 * effV0) + (2 * effG * d);
      if (discriminant < 0) return null;
      return (-effV0 + Math.sqrt(discriminant)) / effG;
    };

    gates.forEach((gate, index) => {
      const d1_block = effDropHeight - gate.y1;
      const t1_block = calculateFallTime(d1_block);
      const d1_unblock = effDropHeight - (gate.y1 - objectLength);
      const t1_unblock = calculateFallTime(d1_unblock);

      const d2_block = effDropHeight - gate.y2;
      const t2_block = calculateFallTime(d2_block);
      const d2_unblock = effDropHeight - (gate.y2 - objectLength);
      const t2_unblock = calculateFallTime(d2_unblock);

      const timeJitter = applyUncertainty ? (Math.sin(index * 7 + jitter) * 0.00003) : 0;

      const t1Blocked = t1_block !== null ? Math.max(0, t1_block + timeJitter) : null;
      const t1Unblocked = t1_unblock !== null ? Math.max(0, t1_unblock + timeJitter) : null;
      const t2Blocked = t2_block !== null ? Math.max(0, t2_block + timeJitter) : null;
      const t2Unblocked = t2_unblock !== null ? Math.max(0, t2_unblock + timeJitter) : null;

      if (t1Blocked !== null) {
        events.push({ time: t1Blocked, gateId: gate.id, channel: 'Gate 1', state: 1, height: gate.y1 });
        events.push({ time: t1Unblocked, gateId: gate.id, channel: 'Gate 1', state: 0, height: gate.y1 });
      }
      if (t2Blocked !== null) {
        events.push({ time: t2Blocked, gateId: gate.id, channel: 'Gate 2', state: 1, height: gate.y2 });
        events.push({ time: t2Unblocked, gateId: gate.id, channel: 'Gate 2', state: 0, height: gate.y2 });
      }
    });

    events.sort((a, b) => a.time - b.time);

    return {
      effDropHeight,
      effV0,
      effG,
      events
    };
  }

  function simulateTickerTape({
    numDots = 18,
    frequency = 60,
    g = STANDARD_G,
    applyUncertainty = true,
    trialSeed = Math.random()
  }) {
    const dt = 1 / frequency;
    // Visibly distinct, natural experimental variations between trials:
    // Different human release initial pull velocity (0.00 to 0.06 m/s)
    const initialV = applyUncertainty ? (trialSeed * 0.06) : 0;
    // Different natural friction in clapper pin & guide slots (net acceleration 9.25 to 9.70 m/s²)
    const dragDecel = applyUncertainty ? (0.10 + ((trialSeed * 37) % 1) * 0.45) : 0;
    const netA = Math.max(8.2, g - dragDecel);
    const rawDots = [];

    for (let n = 0; n < numDots; n++) {
      const t = n * dt;
      let pos = (initialV * t) + (0.5 * netA * t * t);
      if (applyUncertainty && n > 0) {
        // Micro-strike contact variation
        const microNoise = Math.sin(n * 5.1 + trialSeed * 10) * 0.0004;
        pos = Math.max(rawDots[n - 1].posMeters + 0.0005, pos + microNoise);
      }
      rawDots.push({
        dotIndex: n,
        timeSeconds: t,
        posMeters: pos,
        posCm: pos * 100
      });
    }

    return { frequency, dt, netAcceleration: netA, rawDots };
  }

  function extract12Dots(rawDots, originIndex = 1, count = 12) {
    if (!rawDots || originIndex === null || rawDots.length <= originIndex) return [];
    const baseDot = rawDots[originIndex];
    const dt = 1 / 60;
    const dataset = [];

    for (let i = 0; i < count; i++) {
      const currentIdx = originIndex + i;
      if (currentIdx >= rawDots.length) break;
      const currentDot = rawDots[currentIdx];
      const relTime = i * dt;
      const relPos = Math.max(0, currentDot.posMeters - baseDot.posMeters);
      dataset.push({
        n: i,
        dotNumber: currentIdx,
        time: relTime,
        position: relPos
      });
    }
    return dataset;
  }

  // =========================================================================
  // Application State
  // =========================================================================

  const state = {
    activeTab: 'apparatus',
    activeGraphMethod: 'photogates',
    mode: 'student', // 'student' (manual measuring & calculations) or 'explore' (auto-fill & teacher key)

    // Photogates state (Each gate has Gate 1 and Gate 2 separated by 0.020m / 2cm)
    pg: {
      gates: [
        { id: 1, y1: 0.800, y2: 0.780 },
        { id: 2, y1: 0.600, y2: 0.580 },
        { id: 3, y1: 0.400, y2: 0.380 },
        { id: 4, y1: 0.200, y2: 0.180 }
      ],
      objectLength: 0.120,
      applyUncertainty: true,
      shuffleChannels: false,
      isDropping: false,
      animY: 0.815, // Starts directly above Gate 1 of PG1!
      activeBeams: new Set(),
      magnifierM: 0.800,
      lastRun: null,
      draggedGateIdx: null,
      studentData: [
        { id: 1, ch: 'Gate 1', label: 'PG1 - Gate 1', y: '', t: '' },
        { id: 1, ch: 'Gate 2', label: 'PG1 - Gate 2', y: '', t: '' },
        { id: 2, ch: 'Gate 1', label: 'PG2 - Gate 1', y: '', t: '' },
        { id: 2, ch: 'Gate 2', label: 'PG2 - Gate 2', y: '', t: '' },
        { id: 3, ch: 'Gate 1', label: 'PG3 - Gate 1', y: '', t: '' },
        { id: 3, ch: 'Gate 2', label: 'PG3 - Gate 2', y: '', t: '' },
        { id: 4, ch: 'Gate 1', label: 'PG4 - Gate 1', y: '', t: '' },
        { id: 4, ch: 'Gate 2', label: 'PG4 - Gate 2', y: '', t: '' }
      ]
    },

    // Ticker Tape state
    ticker: {
      applyUncertainty: true,
      isDropping: false,
      hasDropped: false,
      visibleDotCount: 0,
      selectedOrigin: 1,
      zoom: 1.0,
      rulerOffsetPx: 0,
      isDraggingRuler: false,
      dragStartX: 0,
      initialRulerOffset: 0,
      mouseTapeX: null,
      mouseTapeY: null,
      rawDots: [],
      studentDataset: []
    },

    // Graph & Fit state
    graph: {
      pgPoints: [],
      pgFit: null,
      tickerPoints: [],
      tickerFit: null
    },

    report: {
      showRubric: false,
      pgGraphDataUrl: null,
      tickerGraphDataUrl: null
    }
  };

  const BANNER_MAP = {
    apparatus: {
      title: '1. Laboratory Setup & Pedagogical Guide',
      desc: 'Learn the principles of dual-sensor photogates and 60 Hz ticker timers, inspect equipment components, and follow classroom measurement protocols.'
    },
    photogates: {
      title: '2. Method I: Measuring “g” with Digital Photogates',
      desc: 'Position photogates along the stand. Use the metric ruler and sightline to measure gate heights manually, capture timestamps, and build your position-time data.'
    },
    ticker: {
      title: '3. Method II: Measuring “g” with a 60 Hz Ticker Tape Timer',
      desc: 'Release a 200g mass to pull paper tape under a 60 Hz vibrating clapper pin. Inspect the stamped carbon dots with the draggable metric ruler, set Dot 0 as origin, and record 12 consecutive positions.'
    },
    graphs: {
      title: '4. Position vs. Time Analysis & Quadratic Curve Fitting',
      desc: 'Plot your experimental position vs. time data. Apply a parabolic quadratic fit y = At² + Bt + C to obtain the parameters needed to calculate acceleration.'
    },
    report: {
      title: '5. Student Lab Report & Analysis Handout',
      desc: 'Review your embedded graphs, complete the analysis calculations (y₀, v₀ᵧ, a, g), calculate percentage differences, and answer discussion questions.'
    }
  };

  // Helper: gets drop starting height (just 1.5 cm above PG1 Gate 1)
  function getPgRestingDropY() {
    return state.pg.gates[0].y1 + 0.015;
  }

  // =========================================================================
  // Canvas Rendering
  // =========================================================================

  function drawPhotogateApparatus() {
    const canvas = document.getElementById('pgCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const yGround = 480;
    const yTop = 50;
    const mToPx = (m) => yGround - (m / 1.0) * (yGround - yTop);

    // Stand base & vertical rod
    ctx.fillStyle = '#96bdcb';
    ctx.fillRect(35, yGround + 8, 210, 16);
    ctx.fillStyle = '#4b6570';
    ctx.fillRect(95, yTop - 25, 12, yGround - yTop + 35);

    // Catch pad
    ctx.fillStyle = '#718894';
    ctx.fillRect(122, yGround - 2, 66, 12);
    ctx.fillStyle = '#ffffff';
    ctx.font = '9px Inter, sans-serif';
    ctx.fillText('Pad', 145, yGround + 7);

    // Precision Meter Stick alongside rod
    const rulerX = 200;
    const rulerW = 26;
    ctx.fillStyle = '#fdfae8';
    ctx.strokeStyle = '#d67b19';
    ctx.lineWidth = 1.2;
    ctx.fillRect(rulerX, yTop, rulerW, yGround - yTop);
    ctx.strokeRect(rulerX, yTop, rulerW, yGround - yTop);

    // Centimeter ticks
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

    // Draw 4 Moveable Photogates
    state.pg.gates.forEach((g, idx) => {
      const py1 = mToPx(g.y1);
      const py2 = mToPx(g.y2);
      const bracketTop = py1 - 8;
      const bracketHeight = (py2 - py1) + 16;

      // Clamp collar on rod (draggable handle)
      const isHovered = (state.pg.draggedGateIdx === idx);
      ctx.fillStyle = isHovered ? '#d67b19' : '#123140';
      ctx.fillRect(88, bracketTop + 4, 26, 16);

      // Thumbscrew / adjustment screw
      ctx.fillStyle = '#0f7e9b';
      ctx.beginPath();
      ctx.arc(92, bracketTop + 12, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Drag icon hint
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px Inter, sans-serif';
      ctx.fillText('↕', 98, bracketTop + 15);

      // U-Bracket extending from clamp around drop zone
      ctx.strokeStyle = '#0f7e9b';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(110, bracketTop + 2);
      ctx.lineTo(125, bracketTop + 2);
      ctx.lineTo(125, bracketTop + bracketHeight - 2);
      ctx.lineTo(180, bracketTop + bracketHeight - 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(125, bracketTop + 2);
      ctx.lineTo(180, bracketTop + 2);
      ctx.stroke();

      // Gate 1 beam
      const isG1Active = state.pg.activeBeams.has(`pg${g.id}-g1`);
      ctx.strokeStyle = isG1Active ? '#d67b19' : 'rgba(214, 123, 25, 0.45)';
      ctx.lineWidth = isG1Active ? 2.5 : 1.2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(125, py1);
      ctx.lineTo(180, py1);
      ctx.stroke();
      ctx.setLineDash([]);

      // Gate 2 beam
      const isG2Active = state.pg.activeBeams.has(`pg${g.id}-g2`);
      ctx.strokeStyle = isG2Active ? '#d67b19' : 'rgba(214, 123, 25, 0.45)';
      ctx.lineWidth = isG2Active ? 2.5 : 1.2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(125, py2);
      ctx.lineTo(180, py2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Optical eyes
      ctx.fillStyle = isG1Active ? '#d67b19' : '#0b5f77';
      ctx.beginPath();
      ctx.arc(127, py1, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = isG2Active ? '#d67b19' : '#0b5f77';
      ctx.beginPath();
      ctx.arc(127, py2, 3, 0, Math.PI * 2);
      ctx.fill();

      // Label & height indicator
      ctx.fillStyle = '#0f7e9b';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.fillText(`PG ${g.id}`, 48, bracketTop + 14);
    });

    // Draw Falling Cylinder Object
    // If not dropping, it rests JUST 1.5 cm above Gate 1 of PG1!
    const currentY = state.pg.isDropping ? state.pg.animY : getPgRestingDropY();
    const objYPx = mToPx(currentY);
    const objTopPx = mToPx(currentY + state.pg.objectLength);
    const objHPx = objYPx - objTopPx;
    const objXPx = 147;
    const objWPx = 16;

    ctx.fillStyle = 'rgba(18, 49, 64, 0.92)';
    ctx.strokeStyle = '#0f7e9b';
    ctx.lineWidth = 1.5;
    ctx.fillRect(objXPx, objTopPx, objWPx, objHPx);
    ctx.strokeRect(objXPx, objTopPx, objWPx, objHPx);

    ctx.fillStyle = '#d67b19';
    ctx.fillRect(objXPx + 4, objTopPx + 4, objWPx - 8, objHPx - 8);

    // If at rest, show release bracket/fingers indicator
    if (!state.pg.isDropping) {
      ctx.strokeStyle = '#d67b19';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(objXPx - 8, objTopPx + 6);
      ctx.lineTo(objXPx, objTopPx + 6);
      ctx.moveTo(objXPx + objWPx, objTopPx + 6);
      ctx.lineTo(objXPx + objWPx + 8, objTopPx + 6);
      ctx.stroke();

      ctx.fillStyle = '#d67b19';
      ctx.font = 'bold 9px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('Drop Release', objXPx - 12, objTopPx + 9);
      ctx.textAlign = 'left';
    }

    // Draw Inspection Cursor
    const magYPx = mToPx(state.pg.magnifierM);
    ctx.strokeStyle = '#d67b19';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 2]);
    ctx.beginPath();
    ctx.moveTo(115, magYPx);
    ctx.lineTo(rulerX + rulerW + 35, magYPx);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#d67b19';
    ctx.beginPath();
    ctx.moveTo(rulerX + rulerW, magYPx);
    ctx.lineTo(rulerX + rulerW + 12, magYPx - 6);
    ctx.lineTo(rulerX + rulerW + 12, magYPx + 6);
    ctx.closePath();
    ctx.fill();

    // Measurement readout badge on canvas
    ctx.fillStyle = 'rgba(214, 123, 25, 0.94)';
    ctx.fillRect(rulerX + rulerW + 14, magYPx - 9, 64, 18);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${state.pg.magnifierM.toFixed(3)} m`, rulerX + rulerW + 18, magYPx + 4);
  }

  // Realistic Ticker Drop: Paper feeds THROUGH the ticker, UNDER the carbon disc and clapper
  function drawTickerDrop(progress = 0) {
    const canvas = document.getElementById('tickerDropCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Bench mount / shelf
    ctx.fillStyle = '#96bdcb';
    ctx.fillRect(20, 20, 180, 14);

    // 1. BACKPLATE: Inside guide channel for tape
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(80, 34, 110, 60);

    // Guide channel slot at top
    ctx.fillStyle = '#334155';
    ctx.fillRect(128, 20, 16, 16);

    // 2. TAPE: Drawn BEHIND the front cover and carbon disc!
    const fallDist = state.ticker.hasDropped ? 100 : (progress * 100);
    ctx.fillStyle = '#fdfae8';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    // Tape strip feeds through from top to bottom
    ctx.fillRect(130, 20, 12, 90 + fallDist);
    ctx.strokeRect(130, 20, 12, 90 + fallDist);

    // 3. FRONT MECHANISM: Carbon Disc sitting OVER the paper tape!
    ctx.fillStyle = 'rgba(51, 65, 85, 0.96)';
    ctx.beginPath();
    ctx.arc(136, 64, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Central brass pin
    ctx.fillStyle = '#d67b19';
    ctx.beginPath();
    ctx.arc(136, 64, 3, 0, Math.PI * 2);
    ctx.fill();

    // Vibrating clapper striker arm (resting on top of carbon disc)
    const clapperAngle = state.ticker.isDropping ? (Math.sin(performance.now() * 0.3) * 0.25) : 0;
    ctx.save();
    ctx.translate(110, 56);
    ctx.rotate(clapperAngle);
    ctx.strokeStyle = '#d67b19';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(26, 8);
    ctx.stroke();

    // Striker head
    ctx.fillStyle = '#123140';
    ctx.beginPath();
    ctx.arc(26, 8, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Front casing / bracket frame
    ctx.strokeStyle = '#0f7e9b';
    ctx.lineWidth = 2;
    ctx.strokeRect(80, 34, 110, 60);

    // Lower guide bracket (retaining the tape)
    ctx.fillStyle = '#0f7e9b';
    ctx.fillRect(124, 88, 24, 6);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px Inter, sans-serif';
    ctx.fillText('60 Hz TIMER', 86, 48);

    // 4. HANGING WEIGHT: at bottom of tape
    const weightY = 110 + fallDist;
    ctx.fillStyle = '#0f7e9b';
    ctx.fillRect(124, weightY, 24, 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px Inter, sans-serif';
    ctx.fillText('200g', 127, weightY + 18);

    // Explanatory text
    ctx.fillStyle = '#123140';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('Paper tape feeds under carbon disc', 220, 48);
    ctx.fillStyle = '#4b6570';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillText('Striker frequency: 60 dots/sec', 220, 68);
    ctx.fillText('dt = 1/60 s = 0.01667 s', 220, 84);
  }

  function getDotPixelX(dotIdx) {
    if (!state.ticker.rawDots[dotIdx]) return 40;
    const pxPerMeter = 3600 * state.ticker.zoom;
    return 40 + (state.ticker.rawDots[dotIdx].posMeters * pxPerMeter);
  }

  // Tape & Ruler Workbench with vertical sightlines
  function drawTapeAndRuler() {
    const canvas = document.getElementById('tapeCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Tape Strip
    const tapeY = 18;
    const tapeH = 46;
    ctx.fillStyle = '#fdfae8';
    ctx.fillRect(0, tapeY, w, tapeH);
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(0, tapeY, w, tapeH);

    // Carbon Dots
    const dotCenterY = tapeY + tapeH / 2;
    const originIdx = state.ticker.selectedOrigin;

    if (!state.ticker.hasDropped && !state.ticker.isDropping) {
      ctx.fillStyle = '#64748b';
      ctx.font = '600 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚪ Fresh Blank Strip Loaded — Click "▶ Release Mass & Pull Tape" above to stamp 60 Hz dots', w / 2, dotCenterY + 4);
    } else {
      const count = state.ticker.isDropping ? (state.ticker.visibleDotCount || 0) : state.ticker.rawDots.length;
      for (let i = 0; i < count; i++) {
        const dot = state.ticker.rawDots[i];
        if (!dot) continue;
        const dotX = getDotPixelX(i);
        const isOrigin = (originIdx !== null && i === originIdx);
        const isIn12Set = (originIdx !== null && i >= originIdx && i < originIdx + 12);
        const dotRelNum = originIdx !== null ? (i - originIdx) : i;

        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(dotX, dotCenterY, isOrigin ? 4.5 : 2.8, 0, Math.PI * 2);
        ctx.fill();

        if (state.ticker.hasDropped && isIn12Set) {
          ctx.strokeStyle = isOrigin ? '#d67b19' : '#0f7e9b';
          ctx.lineWidth = isOrigin ? 2 : 1.2;
          ctx.beginPath();
          ctx.arc(dotX, dotCenterY, 6.5, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = isOrigin ? '#d67b19' : '#0f7e9b';
          ctx.font = isOrigin ? 'bold 9px JetBrains Mono, monospace' : '8px JetBrains Mono, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(dotRelNum.toString(), dotX, tapeY - 4);
        }
      }
    }

    // Draggable Metric Ruler
    const rulerY = 82;
    const rulerH = 96;
    const rulerStartX = state.ticker.rulerOffsetPx + 40;
    const rulerLenPx = 3200 * state.ticker.zoom;

    ctx.save();
    ctx.fillStyle = 'rgba(254, 252, 232, 0.94)';
    ctx.fillRect(rulerStartX, rulerY, rulerLenPx, rulerH);
    ctx.strokeStyle = '#d67b19';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rulerStartX, rulerY, rulerLenPx, rulerH);

    const pxPerCm = 36 * state.ticker.zoom;
    const maxCm = Math.floor(rulerLenPx / pxPerCm);

    ctx.fillStyle = '#123140';
    ctx.textAlign = 'center';

    for (let cm = 0; cm <= maxCm; cm++) {
      const cmX = rulerStartX + (cm * pxPerCm);
      if (cmX < -50 || cmX > w + 50) continue;

      ctx.strokeStyle = '#123140';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cmX, rulerY);
      ctx.lineTo(cmX, rulerY + 18);
      ctx.stroke();

      ctx.font = 'bold 9px JetBrains Mono, monospace';
      ctx.fillText(cm.toString(), cmX, rulerY + 30);

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

    // Ruler Branding
    ctx.fillStyle = '#0f7e9b';
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('METRIC RULER (cm & mm)', rulerStartX + 12, rulerY + 65);
    ctx.fillStyle = '#718894';
    ctx.font = '9px Inter, sans-serif';
    ctx.fillText('Drag left/right to align with Dot 0', rulerStartX + 12, rulerY + 80);

    // =======================================================================
    // VERTICAL SIGHTLINES / MEASUREMENT CURSOR (as requested by user!)
    // =======================================================================

    // 1. Vertical Hairline at the 0 cm mark of the ruler extending across the tape
    const zeroCmX = rulerStartX;
    ctx.strokeStyle = 'rgba(214, 123, 25, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(zeroCmX, tapeY);
    ctx.lineTo(zeroCmX, rulerY + 40);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#d67b19';
    ctx.font = 'bold 9px JetBrains Mono, monospace';
    ctx.fillText('0 cm', zeroCmX, rulerY + 48);

    // 2. Interactive vertical cursor sightline tracking mouse position
    if (state.ticker.mouseTapeX !== null) {
      const mx = state.ticker.mouseTapeX;
      ctx.strokeStyle = '#0f7e9b';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.moveTo(mx, tapeY - 2);
      ctx.lineTo(mx, rulerY + 85);
      ctx.stroke();
      ctx.setLineDash([]);

      // Calculate distance relative to 0 cm mark on ruler
      const distPx = mx - zeroCmX;
      const distCm = distPx / pxPerCm;
      const distM = distCm / 100;

      if (distCm >= 0) {
        ctx.fillStyle = 'rgba(15, 126, 155, 0.92)';
        ctx.fillRect(mx + 6, tapeY + 4, 98, 26);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px JetBrains Mono, monospace';
        ctx.fillText(`${distCm.toFixed(2)} cm`, mx + 12, tapeY + 16);
        ctx.font = '8px JetBrains Mono, monospace';
        ctx.fillText(`${distM.toFixed(4)} m`, mx + 12, tapeY + 26);
      }
    }

    ctx.restore();
  }

  function drawAnalysisGraph() {
    const canvas = document.getElementById('analysisGraphCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const padLeft = 65, padRight = 30, padTop = 40, padBottom = 55;
    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    const isPg = (state.activeGraphMethod === 'photogates');
    const data = isPg ? state.graph.pgPoints : state.graph.tickerPoints;
    const fit = isPg ? state.graph.pgFit : state.graph.tickerFit;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(padLeft, padTop, plotW, plotH);

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

    const maxT = Math.max(...data.map(d => d.t)) * 1.15;
    const maxY = Math.max(...data.map(d => d.y)) * 1.15;

    const tToPx = (t) => padLeft + (t / maxT) * plotW;
    const yToPx = (y) => (padTop + plotH) - (y / maxY) * plotH;

    // Grid lines
    ctx.strokeStyle = '#e9f4fb';
    ctx.lineWidth = 1;

    ctx.fillStyle = '#4b6570';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 6; i++) {
      const yVal = (i / 6) * maxY;
      const yPx = yToPx(yVal);
      ctx.beginPath();
      ctx.moveTo(padLeft, yPx);
      ctx.lineTo(padLeft + plotW, yPx);
      ctx.stroke();
      ctx.fillText(yVal.toFixed(2), padLeft - 8, yPx + 4);
    }

    ctx.textAlign = 'center';
    for (let i = 0; i <= 6; i++) {
      const tVal = (i / 6) * maxT;
      const tPx = tToPx(tVal);
      ctx.beginPath();
      ctx.moveTo(tPx, padTop);
      ctx.lineTo(tPx, padTop + plotH);
      ctx.stroke();
      ctx.fillText(tVal.toFixed(3), tPx, padTop + plotH + 18);
    }

    // Axes
    ctx.strokeStyle = '#123140';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padLeft, padTop);
    ctx.lineTo(padLeft, padTop + plotH);
    ctx.lineTo(padLeft + plotW, padTop + plotH);
    ctx.stroke();

    // Axis Labels
    ctx.fillStyle = '#123140';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Time t (seconds)', padLeft + plotW / 2, padTop + plotH + 42);

    ctx.save();
    ctx.translate(18, padTop + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Position y (meters)', 0, 0);
    ctx.restore();

    // Title
    ctx.fillStyle = '#0f7e9b';
    ctx.font = 'bold 13px IBM Plex Sans, Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${isPg ? 'Method I (Photogates)' : 'Method II (Ticker Tape)'}: Position vs. Time`, padLeft, padTop - 14);

    // Parabolic Fit Curve
    if (fit) {
      ctx.strokeStyle = '#0f7e9b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      const steps = 100;
      for (let s = 0; s <= steps; s++) {
        const tVal = (s / steps) * maxT;
        const yVal = (fit.A * tVal * tVal) + (fit.B * tVal) + fit.C;
        const xPx = tToPx(tVal);
        const yPx = yToPx(yVal);
        if (s === 0) ctx.moveTo(xPx, yPx);
        else ctx.lineTo(xPx, yPx);
      }
      ctx.stroke();
    }

    // Amber circular data points
    data.forEach(pt => {
      const px = tToPx(pt.t);
      const py = yToPx(pt.y);

      ctx.fillStyle = 'rgba(214, 123, 25, 0.25)';
      ctx.beginPath();
      ctx.arc(px, py, 6.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#d67b19';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(px, py, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // Floating Logger Pro Fit Box
    if (fit) {
      const boxW = 230;
      const boxH = 84;
      const boxX = padLeft + 18;
      const boxY = padTop + 16;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
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
      ctx.fillText(`B = ${fit.B.toFixed(4)}`, boxX + 10, boxY + 46);
      ctx.fillText(`C = ${fit.C.toFixed(4)}`, boxX + 10, boxY + 60);

      ctx.fillStyle = '#4b6570';
      ctx.fillText(`R² = ${fit.r2.toFixed(4)}`, boxX + 125, boxY + 32);
      ctx.fillText(`RMSE = ${fit.rmse.toFixed(4)}`, boxX + 125, boxY + 46);
    }
  }

  // =========================================================================
  // Control Logic & Event Handling
  // =========================================================================

  function switchTab(tabKey) {
    state.activeTab = tabKey;

    document.querySelectorAll('.scenario-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabKey);
    });

    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `panel${capitalize(tabKey)}`);
    });

    const bannerInfo = BANNER_MAP[tabKey];
    if (bannerInfo) {
      const bannerTitle = document.getElementById('bannerTitle');
      const bannerDesc = document.getElementById('bannerDesc');
      if (bannerTitle) bannerTitle.textContent = bannerInfo.title;
      if (bannerDesc) bannerDesc.textContent = bannerInfo.desc;
    }

    if (tabKey === 'photogates') {
      drawPhotogateApparatus();
    } else if (tabKey === 'ticker') {
      drawTickerDrop(state.ticker.hasDropped ? 1.0 : 0);
      drawTapeAndRuler();
    } else if (tabKey === 'graphs') {
      drawAnalysisGraph();
    }
  }

  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // --- Photogate Logic ---

  function updatePhotogateHeights(idx, newH) {
    newH = Math.max(0.10, Math.min(0.92, newH));
    state.pg.gates[idx].y1 = newH;
    state.pg.gates[idx].y2 = parseFloat((newH - 0.020).toFixed(3));

    // Only auto-sync student table heights if in Explore Mode
    if (state.mode === 'explore') {
      const rowIdx1 = idx * 2;
      const rowIdx2 = idx * 2 + 1;
      if (state.pg.studentData[rowIdx1]) state.pg.studentData[rowIdx1].y = state.pg.gates[idx].y1;
      if (state.pg.studentData[rowIdx2]) state.pg.studentData[rowIdx2].y = state.pg.gates[idx].y2;
      renderPgStudentRows();
    }

    // Sync numeric inputs
    const numInput = document.getElementById(`numPgHeight${idx + 1}`);
    if (numInput) numInput.value = newH.toFixed(2);

    drawPhotogateApparatus();
  }

  function runPhotogateDrop() {
    if (state.pg.isDropping) return;

    // Drop starts just 1.5 cm above PG1 Gate 1!
    const startingDropHeight = getPgRestingDropY();

    const jitter = (Math.random() - 0.5) * 2;
    state.pg.lastRun = simulatePhotogateDrop({
      gates: state.pg.gates,
      dropHeight: startingDropHeight,
      g: STANDARD_G,
      initialVelocity: 0,
      objectLength: state.pg.objectLength,
      applyUncertainty: state.pg.applyUncertainty,
      jitter
    });

    state.pg.isDropping = true;
    const btn = document.getElementById('btnPgDrop');
    if (btn) btn.disabled = true;

    updatePgEventTable(state.pg.lastRun.events);

    const startTime = performance.now();
    const duration = 0.50;
    const effDropY = state.pg.lastRun.effDropHeight;
    const effV0 = state.pg.lastRun.effV0;
    const effG = state.pg.lastRun.effG;

    function step(now) {
      const elapsed = (now - startTime) / 1000;
      if (elapsed >= duration) {
        state.pg.isDropping = false;
        state.pg.animY = 0.05;
        state.pg.activeBeams.clear();
        drawPhotogateApparatus();
        if (btn) btn.disabled = false;
        return;
      }

      const currentY = Math.max(0.05, effDropY - (effV0 * elapsed + 0.5 * effG * elapsed * elapsed));
      state.pg.animY = currentY;

      state.pg.activeBeams.clear();
      const objBottom = currentY;
      const objTop = currentY + state.pg.objectLength;

      state.pg.gates.forEach(g => {
        if (g.y1 >= objBottom && g.y1 <= objTop) state.pg.activeBeams.add(`pg${g.id}-g1`);
        if (g.y2 >= objBottom && g.y2 <= objTop) state.pg.activeBeams.add(`pg${g.id}-g2`);
      });

      drawPhotogateApparatus();
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function updatePgEventTable(events) {
    const tbody = document.getElementById('pgEventTbody');
    if (!tbody) return;

    let displayEvents = [...events];
    if (state.pg.shuffleChannels) {
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

  function autoFillPgData() {
    if (!state.pg.lastRun) {
      runPhotogateDrop();
    }
    const events = state.pg.lastRun ? state.pg.lastRun.events.filter(e => e.state === 1) : [];
    state.pg.studentData.forEach(row => {
      const gate = state.pg.gates.find(g => g.id === row.id);
      if (gate) {
        row.y = (row.ch === 'Gate 1') ? gate.y1 : gate.y2;
      }
      const match = events.find(e => e.gateId === row.id && e.channel === row.ch);
      if (match) {
        row.t = match.time.toFixed(5);
      }
    });
    renderPgStudentRows();
  }

  function renderPgStudentRows() {
    const tbody = document.getElementById('pgStudentTbody');
    if (!tbody) return;

    tbody.innerHTML = state.pg.studentData.map((row, idx) => {
      const hVal = (row.y !== '' && !isNaN(row.y)) ? Number(row.y).toFixed(3) : '';
      const tVal = (row.t !== '' && !isNaN(row.t)) ? Number(row.t).toFixed(5) : '';
      return `
        <tr>
          <td style="font-weight: 600; color: var(--primary-teal-dark);">${row.label}</td>
          <td>
            <input type="number" step="0.001" min="0" max="1.5" class="pg-h-in" data-idx="${idx}" value="${hVal}" placeholder="Measure from ruler (m)" />
          </td>
          <td>
            <input type="number" step="0.00001" min="0" max="5" class="pg-t-in" data-idx="${idx}" value="${tVal}" placeholder="Read from log (s)" />
          </td>
        </tr>
      `;
    }).join('');
  }

  function plotPgToGraph() {
    const points = [];
    state.pg.studentData.forEach(r => {
      const t = parseFloat(r.t);
      const y = parseFloat(r.y);
      if (!isNaN(t) && !isNaN(y) && t >= 0 && y >= 0) {
        points.push({ t, y });
      }
    });

    if (points.length < 3) {
      alert('Please measure and enter at least 3 valid height (y) and time (t) data points, or click "Auto-Fill Readings"!');
      return;
    }

    points.sort((a, b) => a.t - b.t);
    state.graph.pgPoints = points;
    state.graph.pgFit = fitQuadratic(points);
    state.activeGraphMethod = 'photogates';

    updateGraphStatsDisplay();
    drawAnalysisGraph();
    syncToReport('photogates');
    switchTab('graphs');
  }

  // --- Ticker Tape Logic ---

  function generateNewTickerData(clearTable = true) {
    state.ticker.hasDropped = false;
    state.ticker.isDropping = false;
    state.ticker.rawDots = [];
    state.ticker.visibleDotCount = 0;
    state.ticker.selectedOrigin = 1;

    // Reset student dataset to blank positions
    state.ticker.studentDataset = [];
    for (let i = 0; i < 12; i++) {
      state.ticker.studentDataset.push({
        n: i,
        dotNumber: 1 + i,
        time: i * (1 / 60),
        position: ''
      });
    }

    // Clear graph & report for ticker
    state.graph.tickerPoints = [];
    state.graph.tickerFit = null;
    clearReportGraph('ticker');

    ['iptTickerY0', 'iptTickerV0', 'iptTickerA', 'iptTickerG', 'iptTickerPctDiff'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const calcFormula = document.getElementById('tickerDiffFormulaVal');
    if (calcFormula) calcFormula.textContent = `(|____ - 9.8| / 9.8) * 100%`;

    const activeBadge = document.getElementById('activeDot0Badge');
    if (activeBadge) activeBadge.textContent = '—';

    const statusBadge = document.getElementById('tapeStatusBadge');
    if (statusBadge) {
      statusBadge.textContent = '⚪ Fresh Blank Strip Loaded';
      statusBadge.style.color = 'var(--primary-teal)';
    }

    renderTickerRows();
    drawTickerDrop(0);
    drawTapeAndRuler();
    updateGraphStatsDisplay();
  }

  function updateTickerStudentDataset() {
    if (!state.ticker.rawDots || state.ticker.rawDots.length === 0) return;
    state.ticker.studentDataset = extract12Dots(state.ticker.rawDots, state.ticker.selectedOrigin, 12);
  }

  function renderTickerRows() {
    const tbody = document.getElementById('tickerStudentTbody');
    if (!tbody) return;

    tbody.innerHTML = state.ticker.studentDataset.map(row => {
      const posVal = (row.position !== '' && !isNaN(row.position)) ? Number(row.position).toFixed(4) : '';
      return `
        <tr>
          <td style="font-weight: 700; color: var(--primary-teal-dark);">Dot ${row.n}</td>
          <td style="font-family: var(--font-mono); color: var(--muted);">${row.time.toFixed(5)} <span style="font-size: 0.72rem;">(${row.n}/60)</span></td>
          <td>
            <input type="number" step="0.0001" min="0" max="2.0" class="ticker-pos-in" data-n="${row.n}" value="${posVal}" placeholder="Enter distance (m)" />
          </td>
        </tr>
      `;
    }).join('');
  }

  function runTickerDrop() {
    if (state.ticker.isDropping) return;

    // Generate fresh physics trial with randomized friction and release pull
    const res = simulateTickerTape({
      numDots: 18,
      frequency: 60,
      g: STANDARD_G,
      applyUncertainty: state.ticker.applyUncertainty,
      trialSeed: Math.random()
    });
    state.ticker.rawDots = res.rawDots;
    state.ticker.isDropping = true;
    state.ticker.hasDropped = false;
    state.ticker.visibleDotCount = 0;
    state.ticker.selectedOrigin = 1;

    const activeBadge = document.getElementById('activeDot0Badge');
    if (activeBadge) activeBadge.textContent = '1';

    const statusBadge = document.getElementById('tapeStatusBadge');
    if (statusBadge) {
      statusBadge.textContent = '⏳ Dropping & Stamping (60 Hz)...';
      statusBadge.style.color = 'var(--accent-amber-dark)';
    }

    // In student mode, clear student table inputs so they measure the newly stamped dots
    if (state.mode === 'student') {
      state.ticker.studentDataset = [];
      for (let i = 0; i < 12; i++) {
        state.ticker.studentDataset.push({
          n: i,
          dotNumber: 1 + i,
          time: i * (1 / 60),
          position: ''
        });
      }
    } else {
      updateTickerStudentDataset();
    }
    renderTickerRows();

    const btn = document.getElementById('btnTickerDrop');
    if (btn) btn.disabled = true;

    const startTime = performance.now();
    const duration = 600;

    function step(now) {
      const elapsed = Math.min(1.0, (now - startTime) / duration);
      // Progressively stamp dots onto the tape as it passes under the striker
      state.ticker.visibleDotCount = Math.floor(elapsed * state.ticker.rawDots.length);

      drawTickerDrop(elapsed);
      drawTapeAndRuler();

      if (elapsed >= 1.0) {
        state.ticker.isDropping = false;
        state.ticker.hasDropped = true;
        state.ticker.visibleDotCount = state.ticker.rawDots.length;

        drawTickerDrop(1.0);
        drawTapeAndRuler();

        if (statusBadge) {
          statusBadge.textContent = '✓ 60 Hz Dots Stamped (Ready to Measure)';
          statusBadge.style.color = 'var(--primary-teal-dark)';
        }
        if (btn) btn.disabled = false;
        return;
      }
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function plotTickerToGraph() {
    const points = [];
    state.ticker.studentDataset.forEach(r => {
      const p = parseFloat(r.position);
      if (r.time !== undefined && !isNaN(p) && p >= 0) {
        points.push({ t: r.time, y: p });
      }
    });

    if (points.length < 3) {
      alert('Please enter or auto-fill at least 3 valid dot data points!');
      return;
    }

    points.sort((a, b) => a.t - b.t);
    state.graph.tickerPoints = points;
    state.graph.tickerFit = fitQuadratic(points);
    state.activeGraphMethod = 'ticker';

    updateGraphStatsDisplay();
    drawAnalysisGraph();
    syncToReport('ticker');
    switchTab('graphs');
  }

  // --- Graph Display Updates ---

  function updateGraphStatsDisplay() {
    const isPg = (state.activeGraphMethod === 'photogates');
    const fit = isPg ? state.graph.pgFit : state.graph.tickerFit;

    document.getElementById('btnGraphTabPg').classList.toggle('btn-primary', isPg);
    document.getElementById('btnGraphTabPg').classList.toggle('btn-ghost', !isPg);
    document.getElementById('btnGraphTabTicker').classList.toggle('btn-primary', !isPg);
    document.getElementById('btnGraphTabTicker').classList.toggle('btn-ghost', isPg);

    const statsContainer = document.getElementById('graphFitStatsBox');
    if (!statsContainer) return;

    if (fit) {
      statsContainer.innerHTML = `
        <div style="background: #ffffff; padding: 10px; border-radius: 6px; border: 1px solid var(--border);">
          <div style="color: var(--subtle); font-size: 0.76rem; text-transform: uppercase;">Fit Equation</div>
          <div style="font-weight: 700; color: var(--primary-teal-dark); font-family: var(--font-mono); margin-top: 2px;">
            ${fit.equationString}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-family: var(--font-mono); font-size: 0.86rem;">
          <div style="background: #ffffff; padding: 8px 10px; border-radius: 6px; border: 1px solid var(--border);">
            <div style="color: var(--subtle); font-size: 0.72rem; font-family: var(--font-sans);">A (Leading Coeff)</div>
            <div style="font-weight: 700;">${fit.A.toFixed(4)}</div>
          </div>
          <div style="background: #ffffff; padding: 8px 10px; border-radius: 6px; border: 1px solid var(--border);">
            <div style="color: var(--subtle); font-size: 0.72rem; font-family: var(--font-sans);">B (Linear Coeff)</div>
            <div style="font-weight: 700;">${fit.B.toFixed(4)}</div>
          </div>
          <div style="background: #ffffff; padding: 8px 10px; border-radius: 6px; border: 1px solid var(--border);">
            <div style="color: var(--subtle); font-size: 0.72rem; font-family: var(--font-sans);">C (Constant)</div>
            <div style="font-weight: 700;">${fit.C.toFixed(4)}</div>
          </div>
          <div style="background: #ffffff; padding: 8px 10px; border-radius: 6px; border: 1px solid var(--border);">
            <div style="color: var(--subtle); font-size: 0.72rem; font-family: var(--font-sans);">R² Correlation</div>
            <div style="font-weight: 700; color: var(--accent-amber-dark);">${fit.r2.toFixed(5)}</div>
          </div>
        </div>

        <div style="background: #f8fafc; border: 1px solid var(--border); padding: 10px; border-radius: 6px;">
          <div style="font-size: 0.76rem; font-weight: 700; color: var(--subtle); text-transform: uppercase;">
            Analysis Task
          </div>
          <p style="font-size: 0.84rem; color: #334155; margin: 4px 0 0 0; line-height: 1.45;">
            Record your quadratic fit parameters (<strong>A</strong>, <strong>B</strong>, <strong>C</strong>) in the <strong>Lab Report</strong> tab to complete your kinematic analysis.
          </p>
        </div>
      `;
    } else {
      statsContainer.innerHTML = `
        <div style="text-align: center; color: var(--subtle); padding: 24px 8px; font-size: 0.88rem;">
          No data plotted yet for <strong>${isPg ? 'Method I (Photogates)' : 'Method II (Ticker Tape)'}</strong>.
        </div>
      `;
    }
  }

  // =========================================================================
  // Report Sync, Graph Capture, Calculations & DOCX Export
  // =========================================================================

  function captureGraphToReport(method, notify = false) {
    const isPg = (method === 'photogates');
    const fit = isPg ? state.graph.pgFit : state.graph.tickerFit;
    if (!fit) {
      if (notify) {
        alert(`Please plot data for ${isPg ? 'Method I (Photogates)' : 'Method II (Ticker Tape)'} on the Graph tab first!`);
      }
      return false;
    }

    // Ensure analysis graph is drawn for this method
    const prevMethod = state.activeGraphMethod;
    state.activeGraphMethod = method;
    drawAnalysisGraph();

    const canvas = document.getElementById('analysisGraphCanvas');
    if (!canvas) return false;
    const dataUrl = canvas.toDataURL('image/png');

    // Restore active method and redraw if needed
    if (prevMethod !== method) {
      state.activeGraphMethod = prevMethod;
      drawAnalysisGraph();
    }

    if (isPg) {
      state.report.pgGraphDataUrl = dataUrl;
      const box = document.getElementById('reportPgGraphBox');
      const placeholder = document.getElementById('pgGraphPlaceholder');
      const container = document.getElementById('pgGraphContainer');
      const img = document.getElementById('imgPgReportGraph');

      if (box) box.classList.add('has-graph');
      if (placeholder) placeholder.style.display = 'none';
      if (container) container.style.display = 'block';
      if (img) img.src = dataUrl;
    } else {
      state.report.tickerGraphDataUrl = dataUrl;
      const box = document.getElementById('reportTickerGraphBox');
      const placeholder = document.getElementById('tickerGraphPlaceholder');
      const container = document.getElementById('tickerGraphContainer');
      const img = document.getElementById('imgTickerReportGraph');

      if (box) box.classList.add('has-graph');
      if (placeholder) placeholder.style.display = 'none';
      if (container) container.style.display = 'block';
      if (img) img.src = dataUrl;
    }

    if (notify) {
      alert(`✓ ${isPg ? 'Photogates' : 'Ticker Tape'} graph successfully captured and inserted into the Lab Report!`);
    }
    return true;
  }

  function clearReportGraph(method) {
    const isPg = (method === 'photogates');
    if (isPg) {
      state.report.pgGraphDataUrl = null;
      const box = document.getElementById('reportPgGraphBox');
      const placeholder = document.getElementById('pgGraphPlaceholder');
      const container = document.getElementById('pgGraphContainer');
      const img = document.getElementById('imgPgReportGraph');

      if (box) box.classList.remove('has-graph');
      if (placeholder) placeholder.style.display = 'block';
      if (container) container.style.display = 'none';
      if (img) img.src = '';
    } else {
      state.report.tickerGraphDataUrl = null;
      const box = document.getElementById('reportTickerGraphBox');
      const placeholder = document.getElementById('tickerGraphPlaceholder');
      const container = document.getElementById('tickerGraphContainer');
      const img = document.getElementById('imgTickerReportGraph');

      if (box) box.classList.remove('has-graph');
      if (placeholder) placeholder.style.display = 'block';
      if (container) container.style.display = 'none';
      if (img) img.src = '';
    }
  }

  function syncToReport(method) {
    // Capture graph image to report (Never auto-fill student calculation fields)
    captureGraphToReport(method, false);
  }

  function clearAllData() {
    // 1. Clear Photogates
    state.pg.lastRun = null;
    state.pg.isDropping = false;
    state.pg.activeBeams.clear();
    state.pg.gates = [
      { id: 1, y1: 0.800, y2: 0.780 },
      { id: 2, y1: 0.600, y2: 0.580 },
      { id: 3, y1: 0.400, y2: 0.380 },
      { id: 4, y1: 0.200, y2: 0.180 }
    ];
    state.pg.animY = getPgRestingDropY();
    state.pg.magnifierM = 0.800;
    state.pg.draggedGateIdx = null;
    state.pg.isDraggingSightline = false;
    state.pg.studentData = [
      { id: 1, ch: 'Gate 1', label: 'PG1 - Gate 1', y: '', t: '' },
      { id: 1, ch: 'Gate 2', label: 'PG1 - Gate 2', y: '', t: '' },
      { id: 2, ch: 'Gate 1', label: 'PG2 - Gate 1', y: '', t: '' },
      { id: 2, ch: 'Gate 2', label: 'PG2 - Gate 2', y: '', t: '' },
      { id: 3, ch: 'Gate 1', label: 'PG3 - Gate 1', y: '', t: '' },
      { id: 3, ch: 'Gate 2', label: 'PG3 - Gate 2', y: '', t: '' },
      { id: 4, ch: 'Gate 1', label: 'PG4 - Gate 1', y: '', t: '' },
      { id: 4, ch: 'Gate 2', label: 'PG4 - Gate 2', y: '', t: '' }
    ];

    [1, 2, 3, 4].forEach(id => {
      const numIn = document.getElementById(`numPgHeight${id}`);
      if (numIn) numIn.value = (0.80 - (id - 1) * 0.20).toFixed(2);
    });

    const pgEventTbody = document.getElementById('pgEventTbody');
    if (pgEventTbody) {
      pgEventTbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--subtle); padding: 16px;">Release object above to record optical sensor events.</td></tr>';
    }

    renderPgStudentRows();
    drawPhotogateApparatus();
    const btnPgDrop = document.getElementById('btnPgDrop');
    if (btnPgDrop) btnPgDrop.disabled = false;

    // 2. Clear Ticker Tape
    state.ticker.hasDropped = false;
    state.ticker.isDropping = false;
    state.ticker.rawDots = [];
    state.ticker.visibleDotCount = 0;
    state.ticker.selectedOrigin = 1;
    state.ticker.rulerOffsetPx = 0;
    state.ticker.zoom = 1.0;
    state.ticker.mouseTapeX = null;
    state.ticker.mouseTapeY = null;
    state.ticker.isDraggingRuler = false;

    state.ticker.studentDataset = [];
    for (let i = 0; i < 12; i++) {
      state.ticker.studentDataset.push({
        n: i,
        dotNumber: 1 + i,
        time: i * (1 / 60),
        position: ''
      });
    }

    renderTickerRows();
    drawTickerDrop(0);
    drawTapeAndRuler();

    const activeDotBadge = document.getElementById('activeDot0Badge');
    if (activeDotBadge) activeDotBadge.textContent = '—';
    const tapeStatusBadge = document.getElementById('tapeStatusBadge');
    if (tapeStatusBadge) {
      tapeStatusBadge.textContent = '⚪ Fresh Blank Strip Loaded';
      tapeStatusBadge.style.color = 'var(--primary-teal)';
    }
    const zoomSlider = document.getElementById('sliderTapeZoom');
    if (zoomSlider) zoomSlider.value = '1.0';
    const txtZoom = document.getElementById('txtZoomVal');
    if (txtZoom) txtZoom.textContent = '1.0x';
    const btnTickerDrop = document.getElementById('btnTickerDrop');
    if (btnTickerDrop) btnTickerDrop.disabled = false;

    // 3. Clear Graphs
    state.graph.pgPoints = [];
    state.graph.pgFit = null;
    state.graph.tickerPoints = [];
    state.graph.tickerFit = null;
    state.activeGraphMethod = 'photogates';
    drawAnalysisGraph();
    updateGraphStatsDisplay();

    // 4. Clear Lab Report Handout
    clearReportGraph('photogates');
    clearReportGraph('ticker');

    ['iptPgY0', 'iptPgV0', 'iptPgA', 'iptPgG', 'iptPgPctDiff',
     'iptTickerY0', 'iptTickerV0', 'iptTickerA', 'iptTickerG', 'iptTickerPctDiff',
     'iptReason1', 'iptReason2', 'iptReason3'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    const pgFormula = document.getElementById('pgDiffFormulaVal');
    if (pgFormula) pgFormula.textContent = '(|____ - 9.8| / 9.8) * 100%';
    const tickerFormula = document.getElementById('tickerDiffFormulaVal');
    if (tickerFormula) tickerFormula.textContent = '(|____ - 9.8| / 9.8) * 100%';

    const calcFeedback = document.getElementById('calcCheckFeedback');
    if (calcFeedback) {
      calcFeedback.textContent = '';
      calcFeedback.style.color = 'var(--muted)';
    }
  }

  function setAppMode(mode) {
    state.mode = mode;

    const btnStudent = document.getElementById('btnModeStudent');
    const btnExplore = document.getElementById('btnModeExplore');
    const teacherRubricBox = document.getElementById('teacherRubricBox');
    const btnToggleRubric = document.getElementById('btnToggleRubric');
    const boxKinematicCorrespondence = document.getElementById('boxKinematicCorrespondence');
    const btnPopulateDemo = document.getElementById('btnPopulateDemo');

    if (btnStudent) btnStudent.classList.toggle('active', mode === 'student');
    if (btnExplore) btnExplore.classList.toggle('active', mode === 'explore');

    // Switching between Student and Teacher Mode ALWAYS clears everything!
    clearAllData();

    if (mode === 'explore') {
      state.report.showRubric = true;
      if (teacherRubricBox) teacherRubricBox.style.display = 'block';
      if (btnToggleRubric) btnToggleRubric.textContent = 'Hide Teacher Rubric';
      if (boxKinematicCorrespondence) boxKinematicCorrespondence.style.display = 'block';
      if (btnPopulateDemo) btnPopulateDemo.style.display = 'inline-flex';
      // Landing for Teacher Demo is Tab 1: Setup & Guide
      switchTab('apparatus');
    } else {
      state.report.showRubric = false;
      if (teacherRubricBox) teacherRubricBox.style.display = 'none';
      if (btnToggleRubric) btnToggleRubric.textContent = 'Show Teacher Rubric';
      if (boxKinematicCorrespondence) boxKinematicCorrespondence.style.display = 'none';
      if (btnPopulateDemo) btnPopulateDemo.style.display = 'none';
      // Landing for Student Lab is Tab 2: Method I: Photogates
      switchTab('photogates');
    }

    updateGraphStatsDisplay();
    drawAnalysisGraph();
  }

  function populateTeacherDemo() {
    autoFillPgData();
    plotPgToGraph();

    const res = simulateTickerTape({
      numDots: 18,
      frequency: 60,
      g: STANDARD_G,
      applyUncertainty: state.ticker.applyUncertainty,
      trialSeed: Math.random()
    });
    state.ticker.rawDots = res.rawDots;
    state.ticker.hasDropped = true;
    state.ticker.visibleDotCount = res.rawDots.length;
    drawTickerDrop(1.0);
    drawTapeAndRuler();

    updateTickerStudentDataset();
    renderTickerRows();
    plotTickerToGraph();

    syncToReport('photogates');
    syncToReport('ticker');

    const statusBadge = document.getElementById('tapeStatusBadge');
    if (statusBadge) {
      statusBadge.textContent = '✓ 60 Hz Dots Stamped (Demo)';
      statusBadge.style.color = 'var(--primary-teal-dark)';
    }
  }

  function checkStudentCalculations() {
    const feedbackEl = document.getElementById('calcCheckFeedback');
    if (!feedbackEl) return;

    const hasPgFit = !!state.graph.pgFit;
    const hasTickerFit = !!state.graph.tickerFit;

    if (!hasPgFit && !hasTickerFit) {
      feedbackEl.style.color = 'var(--accent-amber-dark)';
      feedbackEl.textContent = '⚠️ Please plot data on the Graph tab first so your calculations can be verified against your experimental fit.';
      return;
    }

    const issues = [];
    let checkedFields = 0;

    // Verify Photogates
    if (hasPgFit) {
      const fit = state.graph.pgFit;
      const expectedA = fit.acceleration; // ~ -9.8
      const expectedG = Math.abs(expectedA); // ~ 9.8
      const expectedDiff = calculatePercentDifference(expectedG, STANDARD_G);

      const valA = document.getElementById('iptPgA')?.value.trim();
      const valG = document.getElementById('iptPgG')?.value.trim();
      const valDiff = document.getElementById('iptPgPctDiff')?.value.trim().replace('%', '');

      if (valA || valG || valDiff) {
        checkedFields++;
        const numA = parseFloat(valA);
        const numG = parseFloat(valG);
        const numDiff = parseFloat(valDiff);

        if (isNaN(numA)) {
          issues.push('Photogates: Acceleration "a" is missing or invalid.');
        } else if (Math.abs(Math.abs(numA) - expectedG) > 0.40) {
          issues.push('Photogates: Calculated acceleration "a" does not match your quadratic fit curve.');
        }

        if (isNaN(numG)) {
          issues.push('Photogates: Gravitational acceleration "g" is missing.');
        } else if (numG < 0) {
          issues.push('Photogates: Recall that g represents the magnitude of acceleration, so g > 0.');
        } else if (Math.abs(numG - expectedG) > 0.40) {
          issues.push('Photogates: Gravitational acceleration "g" does not match your calculated acceleration.');
        }

        if (isNaN(numDiff)) {
          issues.push('Photogates: % difference is missing.');
        } else if (Math.abs(numDiff - expectedDiff) > 0.60) {
          issues.push('Photogates: % difference calculation does not match standard g (9.80 m/s²).');
        }
      }
    }

    // Verify Ticker Tape
    if (hasTickerFit) {
      const fit = state.graph.tickerFit;
      const expectedA = fit.acceleration;
      const expectedG = Math.abs(expectedA);
      const expectedDiff = calculatePercentDifference(expectedG, STANDARD_G);

      const valA = document.getElementById('iptTickerA')?.value.trim();
      const valG = document.getElementById('iptTickerG')?.value.trim();
      const valDiff = document.getElementById('iptTickerPctDiff')?.value.trim().replace('%', '');

      if (valA || valG || valDiff) {
        checkedFields++;
        const numA = parseFloat(valA);
        const numG = parseFloat(valG);
        const numDiff = parseFloat(valDiff);

        if (isNaN(numA)) {
          issues.push('Ticker Tape: Acceleration "a" is missing or invalid.');
        } else if (Math.abs(Math.abs(numA) - expectedG) > 0.40) {
          issues.push('Ticker Tape: Calculated acceleration "a" does not match your quadratic fit curve.');
        }

        if (isNaN(numG)) {
          issues.push('Ticker Tape: Gravitational acceleration "g" is missing.');
        } else if (numG < 0) {
          issues.push('Ticker Tape: Recall that g represents the magnitude of acceleration, so g > 0.');
        } else if (Math.abs(numG - expectedG) > 0.40) {
          issues.push('Ticker Tape: Gravitational acceleration "g" does not match your calculated acceleration.');
        }

        if (isNaN(numDiff)) {
          issues.push('Ticker Tape: % difference is missing.');
        } else if (Math.abs(numDiff - expectedDiff) > 0.60) {
          issues.push('Ticker Tape: % difference calculation does not match standard g (9.80 m/s²).');
        }
      }
    }

    if (checkedFields === 0) {
      feedbackEl.style.color = 'var(--accent-amber-dark)';
      feedbackEl.textContent = '✏️ Enter your calculated values for acceleration (a), g, and % difference first, then click Check!';
      return;
    }

    if (issues.length === 0) {
      feedbackEl.style.color = '#15803d'; // Green
      feedbackEl.textContent = '🎉 Outstanding work! Your acceleration, g values, and percentage differences are accurately calculated.';
    } else {
      feedbackEl.style.color = '#c53030'; // Red/Warning
      feedbackEl.textContent = '⚠️ ' + issues[0];
    }
  }

  function exportReportToDocx() {
    const docxLib = window.docx || (typeof docx !== 'undefined' ? docx : null);
    if (!docxLib) {
      alert('DOCX generator library is loading or unavailable. You can also use "Print / Save PDF".');
      return;
    }

    const {
      Document,
      Paragraph,
      TextRun,
      Table,
      TableRow,
      TableCell,
      HeadingLevel,
      AlignmentType,
      WidthType,
      BorderStyle,
      ImageRun,
      Packer
    } = docxLib;

    // Ensure both graphs are rendered & captured
    if (!state.report.pgGraphDataUrl && state.graph.pgFit) {
      captureGraphToReport('photogates', false);
    }
    if (!state.report.tickerGraphDataUrl && state.graph.tickerFit) {
      captureGraphToReport('ticker', false);
    }

    // Read metadata
    const studentName = document.getElementById('iptStudentName')?.value.trim() || 'Student';
    const labDate = document.getElementById('iptDate')?.value.trim() || 'September 11, 2026';
    const period = document.getElementById('iptPeriod')?.value.trim() || 'Physics';

    // Read Question 3 answers
    const reason1 = document.getElementById('iptReason1')?.value.trim() || '[Student did not provide Reason 1]';
    const reason2 = document.getElementById('iptReason2')?.value.trim() || '[Student did not provide Reason 2]';
    const reason3 = document.getElementById('iptReason3')?.value.trim() || '[Student did not provide Reason 3]';

    // Helper for converting DataURL to Uint8Array
    function dataUrlToBytes(dataUrl) {
      if (!dataUrl) return null;
      const parts = dataUrl.split(',');
      if (parts.length < 2) return null;
      const binary = atob(parts[1]);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    }

    const pgImgBytes = dataUrlToBytes(state.report.pgGraphDataUrl);
    const tickerImgBytes = dataUrlToBytes(state.report.tickerGraphDataUrl);

    // Table borders styling
    const tableBorders = {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'd1d5db' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'd1d5db' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'd1d5db' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'd1d5db' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'e5e7eb' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'e5e7eb' },
    };

    const headerShading = { fill: 'eef8fa' };
    const altRowShading = { fill: 'f9fafb' };

    // 1. Build Photogates Table
    const pgTableRows = [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({ shading: headerShading, children: [new Paragraph({ children: [new TextRun({ text: 'Gate / Sensor', bold: true, color: '0f7e9b' })] })] }),
          new TableCell({ shading: headerShading, children: [new Paragraph({ children: [new TextRun({ text: 'Height y (m)', bold: true, color: '0f7e9b' })] })] }),
          new TableCell({ shading: headerShading, children: [new Paragraph({ children: [new TextRun({ text: 'Time t (s)', bold: true, color: '0f7e9b' })] })] })
        ]
      })
    ];

    state.pg.studentData.forEach((row, i) => {
      pgTableRows.push(new TableRow({
        children: [
          new TableCell({ shading: (i % 2 === 1) ? altRowShading : undefined, children: [new Paragraph(row.label)] }),
          new TableCell({ shading: (i % 2 === 1) ? altRowShading : undefined, children: [new Paragraph(Number(row.y).toFixed(3))] }),
          new TableCell({ shading: (i % 2 === 1) ? altRowShading : undefined, children: [new Paragraph(row.t !== '' ? Number(row.t).toFixed(5) : '—')] })
        ]
      }));
    });

    // 2. Build Ticker Table
    const tickerTableRows = [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({ shading: headerShading, children: [new Paragraph({ children: [new TextRun({ text: 'Dot Number (n)', bold: true, color: '0f7e9b' })] })] }),
          new TableCell({ shading: headerShading, children: [new Paragraph({ children: [new TextRun({ text: 'Time t (s) [n/60]', bold: true, color: '0f7e9b' })] })] }),
          new TableCell({ shading: headerShading, children: [new Paragraph({ children: [new TextRun({ text: 'Position y (m)', bold: true, color: '0f7e9b' })] })] })
        ]
      })
    ];

    state.ticker.studentDataset.forEach((row, i) => {
      tickerTableRows.push(new TableRow({
        children: [
          new TableCell({ shading: (i % 2 === 1) ? altRowShading : undefined, children: [new Paragraph(`Dot ${row.n}`)] }),
          new TableCell({ shading: (i % 2 === 1) ? altRowShading : undefined, children: [new Paragraph(row.time.toFixed(5))] }),
          new TableCell({ shading: (i % 2 === 1) ? altRowShading : undefined, children: [new Paragraph(row.position !== '' ? Number(row.position).toFixed(4) : '—')] })
        ]
      }));
    });

    // 3. Analysis comparison values (Only export student-entered values)
    const pgY0 = document.getElementById('iptPgY0')?.value.trim() || '—';
    const pgV0 = document.getElementById('iptPgV0')?.value.trim() || '—';
    const pgA = document.getElementById('iptPgA')?.value.trim() || '—';
    const pgG = document.getElementById('iptPgG')?.value.trim() || '—';
    const pgDiff = document.getElementById('iptPgPctDiff')?.value.trim() || '—';

    const tickerY0 = document.getElementById('iptTickerY0')?.value.trim() || '—';
    const tickerV0 = document.getElementById('iptTickerV0')?.value.trim() || '—';
    const tickerA = document.getElementById('iptTickerA')?.value.trim() || '—';
    const tickerG = document.getElementById('iptTickerG')?.value.trim() || '—';
    const tickerDiff = document.getElementById('iptTickerPctDiff')?.value.trim() || '—';

    const comparisonTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: tableBorders,
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            new TableCell({ shading: headerShading, children: [new Paragraph({ children: [new TextRun({ text: 'Parameter', bold: true, color: '0f7e9b' })] })] }),
            new TableCell({ shading: headerShading, children: [new Paragraph({ children: [new TextRun({ text: 'Photogates (Method I)', bold: true, color: '0f7e9b' })] })] }),
            new TableCell({ shading: headerShading, children: [new Paragraph({ children: [new TextRun({ text: 'Ticker Tape (Method II)', bold: true, color: '0f7e9b' })] })] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph('Initial Position y₀ (m)')] }),
            new TableCell({ children: [new Paragraph(pgY0)] }),
            new TableCell({ children: [new Paragraph(tickerY0)] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph('Initial Velocity v₀ᵧ (m/s)')] }),
            new TableCell({ children: [new Paragraph(pgV0)] }),
            new TableCell({ children: [new Paragraph(tickerV0)] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph('Acceleration a (m/s²)')] }),
            new TableCell({ children: [new Paragraph(pgA)] }),
            new TableCell({ children: [new Paragraph(tickerA)] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ shading: headerShading, children: [new Paragraph({ children: [new TextRun({ text: 'Experimental g (m/s²)', bold: true, color: 'd67b19' })] })] }),
            new TableCell({ shading: headerShading, children: [new Paragraph({ children: [new TextRun({ text: pgG, bold: true })] })] }),
            new TableCell({ shading: headerShading, children: [new Paragraph({ children: [new TextRun({ text: tickerG, bold: true })] })] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '% Difference vs. 9.80 m/s²', bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: pgDiff, bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: tickerDiff, bold: true })] })] })
          ]
        })
      ]
    });

    // Build 3-page Docx
    const doc = new Document({
      sections: [
        // Page 1: Method I (Photogates)
        {
          properties: {},
          children: [
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'LAB: MEASURING THE ACCELERATION DUE TO GRAVITY "g"', bold: true, color: '0f7e9b', size: 28 })
              ]
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'The Thinking Experiment — PhysicsKit', italics: true, color: 'd67b19', size: 20 })
              ]
            }),
            new Paragraph({ text: '' }),
            new Paragraph({
              children: [
                new TextRun({ text: `Student Name(s): `, bold: true }),
                new TextRun({ text: `${studentName}    |    ` }),
                new TextRun({ text: `Date: `, bold: true }),
                new TextRun({ text: `${labDate}    |    ` }),
                new TextRun({ text: `Period: `, bold: true }),
                new TextRun({ text: `${period}` })
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Reference Standard Value: ', bold: true }),
                new TextRun({ text: 'g = 9.80 m/s²', italics: true, color: '0f7e9b' })
              ]
            }),
            new Paragraph({ text: '' }),
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              children: [
                new TextRun({ text: 'Method I: Digital Dual-Sensor Photogates', bold: true, color: '0f7e9b' })
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Experimental Data Table (8 Measurements):', bold: true })
              ]
            }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: tableBorders,
              rows: pgTableRows
            }),
            new Paragraph({ text: '' }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Position vs. Time Graph & Quadratic Fit (y = At² + Bt + C):', bold: true })
              ]
            }),
            pgImgBytes ? new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new ImageRun({
                  data: pgImgBytes,
                  transformation: { width: 500, height: 300 },
                  type: 'png'
                })
              ]
            }) : new Paragraph({
              children: [new TextRun({ text: '[Graph not yet captured. Plot data and capture graph in simulation.]', italics: true, color: '9ca3af' })]
            }),
            state.graph.pgFit ? new Paragraph({
              children: [
                new TextRun({ text: 'Fitted Equation: ', bold: true }),
                new TextRun({ text: state.graph.pgFit.equationString, color: '0f7e9b', font: 'Consolas' }),
                new TextRun({ text: `  |  R² = ${state.graph.pgFit.r2.toFixed(5)}` })
              ]
            }) : new Paragraph({ text: '' }),
            new Paragraph({
              children: [
                new TextRun({ text: `Calculated Acceleration a = `, bold: true }),
                new TextRun({ text: `${pgA} m/s²    |    ` }),
                new TextRun({ text: `Experimental g = `, bold: true, color: 'd67b19' }),
                new TextRun({ text: `${pgG} m/s²`, bold: true, color: 'd67b19' })
              ]
            })
          ]
        },

        // Page 2: Method II (Ticker Tape)
        {
          properties: {},
          children: [
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              children: [
                new TextRun({ text: 'Method II: 60 Hz Mechanical Ticker Tape Timer', bold: true, color: '0f7e9b' })
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Frequency: 60 Hz (Δt = 1/60 s ≈ 0.01667 s per tick). 12 consecutive positions from Dot 0:', bold: true })
              ]
            }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: tableBorders,
              rows: tickerTableRows
            }),
            new Paragraph({ text: '' }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Position vs. Time Graph & Quadratic Fit (y = At² + Bt + C):', bold: true })
              ]
            }),
            tickerImgBytes ? new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new ImageRun({
                  data: tickerImgBytes,
                  transformation: { width: 500, height: 300 },
                  type: 'png'
                })
              ]
            }) : new Paragraph({
              children: [new TextRun({ text: '[Graph not yet captured. Plot data and capture graph in simulation.]', italics: true, color: '9ca3af' })]
            }),
            state.graph.tickerFit ? new Paragraph({
              children: [
                new TextRun({ text: 'Fitted Equation: ', bold: true }),
                new TextRun({ text: state.graph.tickerFit.equationString, color: '0f7e9b', font: 'Consolas' }),
                new TextRun({ text: `  |  R² = ${state.graph.tickerFit.r2.toFixed(5)}` })
              ]
            }) : new Paragraph({ text: '' }),
            new Paragraph({
              children: [
                new TextRun({ text: `Calculated Acceleration a = `, bold: true }),
                new TextRun({ text: `${tickerA} m/s²    |    ` }),
                new TextRun({ text: `Experimental g = `, bold: true, color: 'd67b19' }),
                new TextRun({ text: `${tickerG} m/s²`, bold: true, color: 'd67b19' })
              ]
            })
          ]
        },

        // Page 3: Comparison & Analysis Questions
        {
          properties: {},
          children: [
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              children: [
                new TextRun({ text: 'Section 3: Comparison, Error Analysis & Conclusions', bold: true, color: '0f7e9b' })
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({ text: '1. Comparative Kinematics Summary Table:', bold: true })
              ]
            }),
            comparisonTable,
            new Paragraph({ text: '' }),
            new Paragraph({
              children: [
                new TextRun({ text: '2. Percentage Difference Calculation:', bold: true })
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Formula: % Difference = |(Experimental g - 9.80) / 9.80| × 100%', italics: true, font: 'Consolas' })
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `• Photogates % Diff: `, bold: true }),
                new TextRun({ text: `${pgDiff}` })
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `• Ticker Tape % Diff: `, bold: true }),
                new TextRun({ text: `${tickerDiff}` })
              ]
            }),
            new Paragraph({ text: '' }),
            new Paragraph({
              children: [
                new TextRun({ text: '3. Sources of Experimental Difference (At least 3 valid physical reasons):', bold: true })
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Reason 1: ', bold: true, color: '0f7e9b' }),
                new TextRun({ text: reason1 })
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Reason 2: ', bold: true, color: '0f7e9b' }),
                new TextRun({ text: reason2 })
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Reason 3: ', bold: true, color: '0f7e9b' }),
                new TextRun({ text: reason3 })
              ]
            })
          ]
        }
      ]
    });

    Packer.toBlob(doc).then(blob => {
      const safeName = studentName.replace(/[^a-z0-9]/gi, '_');
      const filename = `Measuring_g_LabReport_${safeName}.docx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }).catch(err => {
      console.error('Failed to generate docx:', err);
      alert('An error occurred generating the Word document. Check console for details.');
    });
  }

  // =========================================================================
  // Initialization & Event Binding
  // =========================================================================

  function init() {
    // 1. Navigation Tabs
    document.querySelectorAll('.scenario-tab').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // 2. Setup Guide Sub-buttons
    const btnGuidePg = document.getElementById('btnGuidePg');
    const btnGuideTicker = document.getElementById('btnGuideTicker');
    const guideSectionPg = document.getElementById('guideSectionPg');
    const guideSectionTicker = document.getElementById('guideSectionTicker');

    if (btnGuidePg && btnGuideTicker && guideSectionPg && guideSectionTicker) {
      btnGuidePg.addEventListener('click', () => {
        btnGuidePg.classList.add('btn-primary');
        btnGuidePg.classList.remove('btn-ghost');
        btnGuideTicker.classList.add('btn-ghost');
        btnGuideTicker.classList.remove('btn-primary');
        guideSectionPg.style.display = 'block';
        guideSectionTicker.style.display = 'none';
      });

      btnGuideTicker.addEventListener('click', () => {
        btnGuideTicker.classList.add('btn-primary');
        btnGuideTicker.classList.remove('btn-ghost');
        btnGuidePg.classList.add('btn-ghost');
        btnGuidePg.classList.remove('btn-primary');
        guideSectionTicker.style.display = 'block';
        guideSectionPg.style.display = 'none';
      });
    }

    // 3. Moveable Photogates Canvas Dragging & Number Inputs
    const pgCanvas = document.getElementById('pgCanvas');
    if (pgCanvas) {
      const yGround = 480;
      const yTop = 50;
      const pxToM = (py) => (yGround - py) / (yGround - yTop);
      const mToPx = (m) => yGround - (m / 1.0) * (yGround - yTop);

      function syncPgSightlineControls() {
        const slider = document.getElementById('sliderPgRuler');
        const badgeM = document.getElementById('pgMagValM');
        const badgeCm = document.getElementById('pgMagValCm');
        if (slider) slider.value = state.pg.magnifierM.toFixed(3);
        if (badgeM) badgeM.textContent = state.pg.magnifierM.toFixed(3);
        if (badgeCm) badgeCm.textContent = (state.pg.magnifierM * 100).toFixed(1);
      }

      pgCanvas.addEventListener('mousedown', (e) => {
        const rect = pgCanvas.getBoundingClientRect();
        const clickX = (e.clientX - rect.left) * (pgCanvas.width / rect.width);
        const clickY = (e.clientY - rect.top) * (pgCanvas.height / rect.height);

        // Click or drag on ruler/sightline area to position measurement sightline
        if (clickX >= 180) {
          state.pg.isDraggingSightline = true;
          const newH = Math.max(0.05, Math.min(0.95, pxToM(clickY)));
          state.pg.magnifierM = parseFloat(newH.toFixed(3));
          syncPgSightlineControls();
          drawPhotogateApparatus();
          return;
        }

        // Check if clicked near collar/bracket of any photogate to move gate
        for (let i = 0; i < state.pg.gates.length; i++) {
          const py = mToPx(state.pg.gates[i].y1);
          if (clickX >= 40 && clickX < 180 && Math.abs(clickY - py) < 22) {
            state.pg.draggedGateIdx = i;
            pgCanvas.style.cursor = 'ns-resize';
            return;
          }
        }
      });

      window.addEventListener('mousemove', (e) => {
        if (!pgCanvas) return;
        const rect = pgCanvas.getBoundingClientRect();
        const clickX = (e.clientX - rect.left) * (pgCanvas.width / rect.width);
        const clickY = (e.clientY - rect.top) * (pgCanvas.height / rect.height);

        if (state.pg.isDraggingSightline) {
          const newH = Math.max(0.05, Math.min(0.95, pxToM(clickY)));
          state.pg.magnifierM = parseFloat(newH.toFixed(3));
          syncPgSightlineControls();
          drawPhotogateApparatus();
          return;
        }

        if (state.pg.draggedGateIdx !== null) {
          const newH = pxToM(clickY);
          updatePhotogateHeights(state.pg.draggedGateIdx, newH);
          return;
        }

        // Hover cursor styling
        if (clickX >= 180) {
          pgCanvas.style.cursor = 'row-resize';
          return;
        }
        let hoveringGate = false;
        for (let i = 0; i < state.pg.gates.length; i++) {
          const py = mToPx(state.pg.gates[i].y1);
          if (clickX >= 40 && clickX < 180 && Math.abs(clickY - py) < 22) {
            hoveringGate = true;
            break;
          }
        }
        pgCanvas.style.cursor = hoveringGate ? 'ns-resize' : 'default';
      });

      window.addEventListener('mouseup', () => {
        state.pg.isDraggingSightline = false;
        if (state.pg.draggedGateIdx !== null) {
          state.pg.draggedGateIdx = null;
          if (pgCanvas) pgCanvas.style.cursor = 'default';
          drawPhotogateApparatus();
        }
      });
    }

    // Number inputs for photogate heights
    [1, 2, 3, 4].forEach(id => {
      const numInput = document.getElementById(`numPgHeight${id}`);
      if (numInput) {
        numInput.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value);
          if (!isNaN(val)) updatePhotogateHeights(id - 1, val);
        });
      }
    });

    // 4. Method I: Photogate drop controls
    const btnPgDrop = document.getElementById('btnPgDrop');
    const btnPgReset = document.getElementById('btnPgReset');
    const btnPgAutoFill = document.getElementById('btnPgAutoFill');
    const btnPgSendGraph = document.getElementById('btnPgSendGraph');
    const sliderPgRuler = document.getElementById('sliderPgRuler');
    const chkPgUncertainty = document.getElementById('chkPgUncertainty');
    const chkPgShuffle = document.getElementById('chkPgShuffle');

    if (btnPgDrop) btnPgDrop.addEventListener('click', runPhotogateDrop);
    if (btnPgReset) btnPgReset.addEventListener('click', () => {
      state.pg.isDropping = false;
      state.pg.animY = getPgRestingDropY();
      state.pg.activeBeams.clear();
      drawPhotogateApparatus();
    });
    if (btnPgAutoFill) btnPgAutoFill.addEventListener('click', autoFillPgData);
    if (btnPgSendGraph) btnPgSendGraph.addEventListener('click', plotPgToGraph);

    if (sliderPgRuler) {
      sliderPgRuler.addEventListener('input', (e) => {
        state.pg.magnifierM = parseFloat(e.target.value);
        const badgeM = document.getElementById('pgMagValM');
        const badgeCm = document.getElementById('pgMagValCm');
        if (badgeM) badgeM.textContent = state.pg.magnifierM.toFixed(3);
        if (badgeCm) badgeCm.textContent = (state.pg.magnifierM * 100).toFixed(1);
        drawPhotogateApparatus();
      });
    }

    if (chkPgUncertainty) {
      chkPgUncertainty.addEventListener('change', (e) => {
        state.pg.applyUncertainty = e.target.checked;
      });
    }

    if (chkPgShuffle) {
      chkPgShuffle.addEventListener('change', (e) => {
        state.pg.shuffleChannels = e.target.checked;
        if (state.pg.lastRun) updatePgEventTable(state.pg.lastRun.events);
      });
    }

    const pgTbody = document.getElementById('pgStudentTbody');
    if (pgTbody) {
      pgTbody.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        if (isNaN(idx)) return;
        if (e.target.classList.contains('pg-h-in')) {
          state.pg.studentData[idx].y = parseFloat(e.target.value) || 0;
        } else if (e.target.classList.contains('pg-t-in')) {
          state.pg.studentData[idx].t = e.target.value;
        }
      });
    }

    // 5. Method II: Ticker events
    const btnTickerDrop = document.getElementById('btnTickerDrop');
    const btnTickerNewTape = document.getElementById('btnTickerNewTape');
    const btnTickerSnapRuler = document.getElementById('btnTickerSnapRuler');
    const btnTickerAutoFill = document.getElementById('btnTickerAutoFill');
    const btnTickerSendGraph = document.getElementById('btnTickerSendGraph');
    const chkTickerUncertainty = document.getElementById('chkTickerUncertainty');
    const sliderTapeZoom = document.getElementById('sliderTapeZoom');

    if (btnTickerDrop) btnTickerDrop.addEventListener('click', runTickerDrop);
    
    // NEW TAPE STRIP: CLEARS CURRENT TAPE & DATA!
    if (btnTickerNewTape) {
      btnTickerNewTape.addEventListener('click', () => {
        generateNewTickerData(true);
      });
    }

    if (btnTickerAutoFill) {
      btnTickerAutoFill.addEventListener('click', () => {
        updateTickerStudentDataset();
        renderTickerRows();
      });
    }
    if (btnTickerSendGraph) btnTickerSendGraph.addEventListener('click', plotTickerToGraph);

    if (btnTickerSnapRuler) {
      btnTickerSnapRuler.addEventListener('click', () => {
        const dot0Px = getDotPixelX(state.ticker.selectedOrigin);
        state.ticker.rulerOffsetPx = dot0Px - 40;
        drawTapeAndRuler();
      });
    }

    if (chkTickerUncertainty) {
      chkTickerUncertainty.addEventListener('change', (e) => {
        state.ticker.applyUncertainty = e.target.checked;
        generateNewTickerData(false);
      });
    }

    if (sliderTapeZoom) {
      sliderTapeZoom.addEventListener('input', (e) => {
        state.ticker.zoom = parseFloat(e.target.value);
        const txt = document.getElementById('txtZoomVal');
        if (txt) txt.textContent = `${state.ticker.zoom.toFixed(1)}x`;
        drawTapeAndRuler();
      });
    }

    // Tape & Ruler interaction: Dragging, cursor sightline tracking, and dot selection
    const tapeCanvas = document.getElementById('tapeCanvas');
    if (tapeCanvas) {
      tapeCanvas.addEventListener('mousedown', (e) => {
        const rect = tapeCanvas.getBoundingClientRect();
        const clickX = (e.clientX - rect.left) * (tapeCanvas.width / rect.width);
        const clickY = (e.clientY - rect.top) * (tapeCanvas.height / rect.height);

        // Click near a dot (y between 15 and 75) to select Dot 0
        if (clickY >= 15 && clickY <= 75) {
          for (let i = 0; i < state.ticker.rawDots.length - 11; i++) {
            const dotX = getDotPixelX(i);
            if (Math.abs(clickX - dotX) < 14) {
              state.ticker.selectedOrigin = i;
              const badge = document.getElementById('activeDot0Badge');
              if (badge) badge.textContent = i.toString();
              updateTickerStudentDataset();
              renderTickerRows();
              drawTapeAndRuler();
              return;
            }
          }
        }

        // Drag ruler (y >= 75)
        state.ticker.isDraggingRuler = true;
        state.ticker.dragStartX = clickX;
        state.ticker.initialRulerOffset = state.ticker.rulerOffsetPx;
      });

      tapeCanvas.addEventListener('mousemove', (e) => {
        const rect = tapeCanvas.getBoundingClientRect();
        const currentX = (e.clientX - rect.left) * (tapeCanvas.width / rect.width);
        const currentY = (e.clientY - rect.top) * (tapeCanvas.height / rect.height);

        state.ticker.mouseTapeX = currentX;
        state.ticker.mouseTapeY = currentY;

        if (state.ticker.isDraggingRuler) {
          const dx = currentX - state.ticker.dragStartX;
          state.ticker.rulerOffsetPx = state.ticker.initialRulerOffset + dx;
        }
        drawTapeAndRuler();
      });

      tapeCanvas.addEventListener('mouseleave', () => {
        state.ticker.mouseTapeX = null;
        state.ticker.mouseTapeY = null;
        state.ticker.isDraggingRuler = false;
        drawTapeAndRuler();
      });

      window.addEventListener('mouseup', () => {
        state.ticker.isDraggingRuler = false;
      });
    }

    const tickerTbody = document.getElementById('tickerStudentTbody');
    if (tickerTbody) {
      tickerTbody.addEventListener('input', (e) => {
        const n = parseInt(e.target.dataset.n, 10);
        if (!isNaN(n) && state.ticker.studentDataset[n]) {
          state.ticker.studentDataset[n].position = e.target.value;
        }
      });
    }

    // 0. Mode Switcher
    const btnModeStudent = document.getElementById('btnModeStudent');
    const btnModeExplore = document.getElementById('btnModeExplore');
    const btnPopulateDemo = document.getElementById('btnPopulateDemo');
    if (btnModeStudent) btnModeStudent.addEventListener('click', () => setAppMode('student'));
    if (btnModeExplore) btnModeExplore.addEventListener('click', () => setAppMode('explore'));
    if (btnPopulateDemo) btnPopulateDemo.addEventListener('click', populateTeacherDemo);

    // 6. Graph tab events
    const btnGraphTabPg = document.getElementById('btnGraphTabPg');
    const btnGraphTabTicker = document.getElementById('btnGraphTabTicker');
    const btnCopyGraph = document.getElementById('btnCopyGraph');
    const btnDownloadGraph = document.getElementById('btnDownloadGraph');
    const btnInsertGraphToReport = document.getElementById('btnInsertGraphToReport');

    if (btnGraphTabPg) {
      btnGraphTabPg.addEventListener('click', () => {
        state.activeGraphMethod = 'photogates';
        updateGraphStatsDisplay();
        drawAnalysisGraph();
      });
    }

    if (btnGraphTabTicker) {
      btnGraphTabTicker.addEventListener('click', () => {
        state.activeGraphMethod = 'ticker';
        updateGraphStatsDisplay();
        drawAnalysisGraph();
      });
    }

    if (btnInsertGraphToReport) {
      btnInsertGraphToReport.addEventListener('click', () => {
        captureGraphToReport(state.activeGraphMethod, true);
      });
    }

    if (btnCopyGraph) {
      btnCopyGraph.addEventListener('click', () => {
        const canvas = document.getElementById('analysisGraphCanvas');
        if (!canvas) return;
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          try {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            alert('Graph image copied to clipboard!');
          } catch (e) {
            alert('Clipboard restricted. Use "Save PNG" instead!');
          }
        });
      });
    }

    if (btnDownloadGraph) {
      btnDownloadGraph.addEventListener('click', () => {
        const canvas = document.getElementById('analysisGraphCanvas');
        if (!canvas) return;
        const a = document.createElement('a');
        a.download = `Graph_${state.activeGraphMethod}.png`;
        a.href = canvas.toDataURL('image/png');
        a.click();
      });
    }

    // 7. Lab Report events
    const btnPrintReport = document.getElementById('btnPrintReport');
    const btnToggleRubric = document.getElementById('btnToggleRubric');
    const teacherRubricBox = document.getElementById('teacherRubricBox');
    const btnCheckCalculations = document.getElementById('btnCheckCalculations');
    const btnExportDocx = document.getElementById('btnExportDocx');

    // Page 1 Photogate Graph buttons
    const btnCapturePgToReport = document.getElementById('btnCapturePgToReport');
    const btnUpdatePgGraph = document.getElementById('btnUpdatePgGraph');
    const btnClearPgGraph = document.getElementById('btnClearPgGraph');

    if (btnCapturePgToReport) btnCapturePgToReport.addEventListener('click', () => captureGraphToReport('photogates', true));
    if (btnUpdatePgGraph) btnUpdatePgGraph.addEventListener('click', () => captureGraphToReport('photogates', true));
    if (btnClearPgGraph) btnClearPgGraph.addEventListener('click', () => clearReportGraph('photogates'));

    // Page 2 Ticker Graph buttons
    const btnCaptureTickerToReport = document.getElementById('btnCaptureTickerToReport');
    const btnUpdateTickerGraph = document.getElementById('btnUpdateTickerGraph');
    const btnClearTickerGraph = document.getElementById('btnClearTickerGraph');

    if (btnCaptureTickerToReport) btnCaptureTickerToReport.addEventListener('click', () => captureGraphToReport('ticker', true));
    if (btnUpdateTickerGraph) btnUpdateTickerGraph.addEventListener('click', () => captureGraphToReport('ticker', true));
    if (btnClearTickerGraph) btnClearTickerGraph.addEventListener('click', () => clearReportGraph('ticker'));

    // Calculations check
    if (btnCheckCalculations) {
      btnCheckCalculations.addEventListener('click', checkStudentCalculations);
    }

    // Export to Word / Google Docs (.docx)
    if (btnExportDocx) {
      btnExportDocx.addEventListener('click', exportReportToDocx);
    }

    if (btnPrintReport) btnPrintReport.addEventListener('click', () => window.print());

    if (btnToggleRubric && teacherRubricBox) {
      btnToggleRubric.addEventListener('click', () => {
        state.report.showRubric = !state.report.showRubric;
        teacherRubricBox.style.display = state.report.showRubric ? 'block' : 'none';
        btnToggleRubric.textContent = state.report.showRubric ? 'Hide Teacher Rubric' : 'Show Teacher Rubric';
      });
    }

    // Initial setup (Starts in Student Lab Mode, landing on Method I: Photogates)
    renderPgStudentRows();
    generateNewTickerData(true);
    setAppMode('student');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
