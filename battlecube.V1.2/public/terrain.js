// Shared by server (Node) and client (browser): deterministic terrain from a seed.
(function (root) {
  const T = { SIZE: 1000, HMAX: 64, SEA: 8, SNOW: 36 };
  let seed = 0;
  T.setSeed = (s) => { seed = s | 0; };

  function hash(x, z) {
    let h = Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ seed;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function vnoise(x, z) {
    const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
    const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
    const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, z) {
    let s = 0, a = 0.5, f = 1;
    for (let o = 0; o < 4; o++) { s += a * vnoise(x * f + o * 17.3, z * f + o * 31.7); f *= 2; a *= 0.5; }
    return s;
  }

  // Column height: broad hills/mountains (n) plus small bumps (m).
  T.height = (x, z) => {
    const n = fbm(x / 120, z / 120), m = fbm(x / 40 + 100, z / 40 + 100);
    return Math.max(2, Math.min(T.HMAX - 6, Math.floor(5 + n * n * 50 + m * 4)));
  };
  // Block type at height y in a column of height h: 0 air, 1 grass, 2 dirt, 3 stone, 4 sand, 6 snow
  T.type = (y, h) => {
    if (y > h) return 0;
    const beach = h <= T.SEA + 1;
    if (y === h) return beach ? 4 : h >= T.SNOW ? 6 : 1;
    return y >= h - 3 ? (beach ? 4 : 2) : 3;
  };
  T.base = (x, y, z) => (y < 0 || y >= T.HMAX ? 0 : T.type(y, T.height(x, z)));

  if (typeof module !== 'undefined') module.exports = T; else root.Terrain = T;
})(this);
