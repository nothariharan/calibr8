export interface Review {
  projectId: string;
  judgeId: string;
  value: number;
}

export interface CalibratedProject {
  id: string;
  rawAvg: number;
  rawRank: number;
  calibrated: number;
  calibratedRank: number;
  rankDelta: number;
  reviewCount: number;
}

export interface CalibratedJudge {
  id: string;
  bias: number;
  rawMean: number;
  reviewCount: number;
}

export interface Calibration {
  globalMean: number;
  projects: CalibratedProject[];
  judges: CalibratedJudge[];
}

function solveSymmetric(matrix: number[][], rhs: number[]): number[] {
  const n = rhs.length;
  const lower: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) sum += lower[i][k] * lower[j][k];
      if (i === j) {
        const value = matrix[i][i] - sum;
        lower[i][j] = value > 0 ? Math.sqrt(value) : 1e-12;
      } else {
        lower[i][j] = (matrix[i][j] - sum) / lower[j][j];
      }
    }
  }
  const y = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let k = 0; k < i; k++) sum += lower[i][k] * y[k];
    y[i] = (rhs[i] - sum) / lower[i][i];
  }
  const x = new Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = 0;
    for (let k = i + 1; k < n; k++) sum += lower[k][i] * x[k];
    x[i] = (y[i] - sum) / lower[i][i];
  }
  return x;
}

export function calibrate(
  projectIds: string[],
  judgeIds: string[],
  reviews: Review[],
  gammaProject = 0.5,
  gammaJudge = 1,
): Calibration {
  const projectIndex = new Map(projectIds.map((id, index) => [id, index]));
  const judgeIndex = new Map(judgeIds.map((id, index) => [id, index]));
  const n = projectIds.length;
  const m = judgeIds.length;
  const dim = n + m;
  const ata = Array.from({ length: dim }, () => new Array<number>(dim).fill(0));
  const rhs = new Array<number>(dim).fill(0);
  const raw = new Map<string, number[]>();
  const judgeRaw = new Map<string, number[]>();
  for (const id of projectIds) raw.set(id, []);
  for (const id of judgeIds) judgeRaw.set(id, []);

  let total = 0;
  for (const review of reviews) {
    const pi = projectIndex.get(review.projectId);
    const ji = judgeIndex.get(review.judgeId);
    if (pi === undefined || ji === undefined) continue;
    const column = n + ji;
    ata[pi][pi] += 1;
    ata[column][column] += 1;
    ata[pi][column] += 1;
    ata[column][pi] += 1;
    rhs[pi] += review.value;
    rhs[column] += review.value;
    raw.get(review.projectId)?.push(review.value);
    judgeRaw.get(review.judgeId)?.push(review.value);
    total += review.value;
  }

  const globalMean = reviews.length ? total / reviews.length : 0;
  for (let i = 0; i < n; i++) {
    ata[i][i] += gammaProject;
    rhs[i] += gammaProject * globalMean;
  }
  for (let j = 0; j < m; j++) ata[n + j][n + j] += gammaJudge;

  const solution = solveSymmetric(ata, rhs);
  const byRaw = [...projectIds].sort((a, b) => average(raw.get(b) ?? []) - average(raw.get(a) ?? []));
  const byCalibrated = [...projectIds].sort((a, b) => solution[projectIndex.get(b)!] - solution[projectIndex.get(a)!]);
  const rawRank = new Map(byRaw.map((id, index) => [id, index + 1]));
  const calibratedRank = new Map(byCalibrated.map((id, index) => [id, index + 1]));

  return {
    globalMean,
    projects: projectIds.map((id) => {
      const rawPosition = rawRank.get(id) ?? 0;
      const calibratedPosition = calibratedRank.get(id) ?? 0;
      const values = raw.get(id) ?? [];
      return {
        id,
        rawAvg: average(values.length ? values : [globalMean]),
        rawRank: rawPosition,
        calibrated: solution[projectIndex.get(id)!],
        calibratedRank: calibratedPosition,
        rankDelta: rawPosition - calibratedPosition,
        reviewCount: values.length,
      };
    }),
    judges: judgeIds.map((id) => {
      const values = judgeRaw.get(id) ?? [];
      return {
        id,
        bias: solution[n + judgeIndex.get(id)!],
        rawMean: average(values.length ? values : [globalMean]),
        reviewCount: values.length,
      };
    }),
  };
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
