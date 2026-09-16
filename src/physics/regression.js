/**
 * Regression and Curve Fitting Module
 * Fits quadratic polynomials: y = A*t^2 + B*t + C
 * Part of "The Thinking Experiment" PhysicsKit
 * Zero DOM dependencies
 */

/**
 * Solves a 3x3 system of linear equations M * x = v using Gaussian elimination with partial pivoting.
 * 
 * @param {number[][]} M - 3x3 coefficient matrix
 * @param {number[]} v - 3-element vector
 * @returns {number[]|null} Solution [A, B, C] or null if singular
 */
function solve3x3(M, v) {
  // Augmented matrix [M | v]
  const A = [
    [M[0][0], M[0][1], M[0][2], v[0]],
    [M[1][0], M[1][1], M[1][2], v[1]],
    [M[2][0], M[2][1], M[2][2], v[2]]
  ];

  // Forward elimination
  for (let col = 0; col < 3; col++) {
    // Pivot
    let maxRow = col;
    for (let r = col + 1; r < 3; r++) {
      if (Math.abs(A[r][col]) > Math.abs(A[maxRow][col])) {
        maxRow = r;
      }
    }
    if (Math.abs(A[maxRow][col]) < 1e-12) return null; // Singular

    if (maxRow !== col) {
      const temp = A[col];
      A[col] = A[maxRow];
      A[maxRow] = temp;
    }

    // Eliminate below
    for (let r = col + 1; r < 3; r++) {
      const factor = A[r][col] / A[col][col];
      for (let c = col; c <= 3; c++) {
        A[r][c] -= factor * A[col][c];
      }
    }
  }

  // Back substitution
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

/**
 * Fits a quadratic polynomial y(t) = A*t^2 + B*t + C to a set of points (t_i, y_i).
 * 
 * In kinematics:
 * y(t) = (1/2)*a*t^2 + v0*t + y0
 * Therefore:
 * A = 0.5 * a  ==>  a = 2 * A
 * B = v0
 * C = y0
 * 
 * @param {Array<{t: number, y: number}>} points
 * @returns {Object|null} Fit parameters and statistics
 */
export function fitQuadratic(points) {
  if (!points || points.length < 3) return null;

  const N = points.length;
  let sumT = 0, sumT2 = 0, sumT3 = 0, sumT4 = 0;
  let sumY = 0, sumTY = 0, sumT2Y = 0;

  for (let i = 0; i < N; i++) {
    const t = points[i].t;
    const y = points[i].y;
    const t2 = t * t;
    const t3 = t2 * t;
    const t4 = t3 * t;

    sumT += t;
    sumT2 += t2;
    sumT3 += t3;
    sumT4 += t4;

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

  // Calculate R^2 and Root Mean Squared Error (RMSE)
  const meanY = sumY / N;
  let ssTot = 0;
  let ssRes = 0;

  const fittedPoints = points.map(pt => {
    const yPred = (A * pt.t * pt.t) + (B * pt.t) + C;
    const residual = pt.y - yPred;
    ssTot += Math.pow(pt.y - meanY, 2);
    ssRes += Math.pow(residual, 2);
    return {
      t: pt.t,
      yActual: pt.y,
      yFitted: yPred,
      residual
    };
  });

  const r2 = ssTot === 0 ? 1 : Math.max(0, 1 - (ssRes / ssTot));
  const rmse = Math.sqrt(ssRes / N);

  // Extracted physics parameters
  const acceleration = 2 * A;
  const gMeasured = Math.abs(acceleration);
  const v0 = B;
  const y0 = C;

  return {
    A,
    B,
    C,
    acceleration,
    gMeasured,
    v0,
    y0,
    r2,
    rmse,
    equationString: `y = ${A.toFixed(4)}·t² + ${B.toFixed(4)}·t + ${C.toFixed(4)}`,
    fittedPoints
  };
}

/**
 * Fits a linearized model y = M * (t^2) + K to a set of (t_i, y_i) data points.
 * 
 * In physics education, freefall position is often linearized by plotting
 * y vs. t^2 under the simplifying assumption that v0 = 0:
 * y(t) = (1/2)*a*t^2 + y0  ==>  y = M*(t^2) + K
 * where:
 * Slope M = 0.5 * a  ==>  a = 2 * M
 * Intercept K = y0
 * 
 * When the object already has an initial velocity (v0 != 0, such as when timing starts
 * at the first photogate after falling from release height), the true equation has an extra
 * v0*t term that does NOT scale with t^2. Fitting a straight line to y vs. t^2 reveals this
 * pedagogical contrast: the data points display subtle curvature and the line does not capture v0!
 * 
 * @param {Array<{t: number, y: number}>} points
 * @returns {Object|null} Linear fit parameters and statistics
 */
export function fitLinearizedT2(points) {
  if (!points || points.length < 2) return null;

  const N = points.length;
  let sumX = 0, sumY = 0, sumXX = 0, sumXY = 0;

  for (let i = 0; i < N; i++) {
    const x = points[i].t * points[i].t; // X = t^2
    const y = points[i].y;
    sumX += x;
    sumY += y;
    sumXX += x * x;
    sumXY += x * y;
  }

  const denom = (N * sumXX) - (sumX * sumX);
  if (Math.abs(denom) < 1e-12) return null;

  const M = ((N * sumXY) - (sumX * sumY)) / denom;
  const K = (sumY - (M * sumX)) / N;

  const meanY = sumY / N;
  let ssTot = 0, ssRes = 0;

  const fittedPoints = points.map(pt => {
    const x = pt.t * pt.t;
    const yPred = (M * x) + K;
    const residual = pt.y - yPred;
    ssTot += Math.pow(pt.y - meanY, 2);
    ssRes += Math.pow(residual, 2);
    return {
      t: pt.t,
      t2: x,
      yActual: pt.y,
      yFitted: yPred,
      residual
    };
  });

  const r2 = ssTot === 0 ? 1 : Math.max(0, 1 - (ssRes / ssTot));
  const rmse = Math.sqrt(ssRes / N);

  // Extracted acceleration from slope M = 0.5*a ==> a = 2*M
  const acceleration = 2 * M;
  const gMeasured = Math.abs(acceleration);

  return {
    slope: M,
    intercept: K,
    M,
    K,
    acceleration,
    gMeasured,
    r2,
    rmse,
    equationString: `y = ${M.toFixed(4)}·(t²) + ${K.toFixed(4)}`,
    fittedPoints
  };
}

/**
 * Calculates percentage difference against standard reference g = 9.80 m/s^2.
 * Formula: % diff = (|experimental - reference| / reference) * 100%
 * 
 * @param {number} experimental 
 * @param {number} [reference=9.80] 
 * @returns {number}
 */
export function calculatePercentDifference(experimental, reference = 9.80) {
  if (reference === 0) return 0;
  return Math.abs((experimental - reference) / reference) * 100;
}
