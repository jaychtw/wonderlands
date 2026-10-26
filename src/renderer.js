import { neighbors, analyze, appearance } from "./core.js";
const N = 16,
  C = 50,
  W = 800;
const rand = (n, k = 0) => {
  const v = Math.sin(n * 127.1 + k * 311.7) * 43758.5453;
  return v - Math.floor(v);
};
// Trace the union of edited cells. Right-turn selection keeps diagonal islands separate.
export function contours(tiles) {
  const edges = [],
    has = (x, y) =>
      x >= 0 && x < 16 && y >= 0 && y < 16 && tiles[y * 16 + x] !== "ocean";
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++)
      if (has(x, y)) {
        if (!has(x, y - 1)) edges.push([[x, y], [x + 1, y], 0]);
        if (!has(x + 1, y)) edges.push([[x + 1, y], [x + 1, y + 1], 1]);
        if (!has(x, y + 1)) edges.push([[x + 1, y + 1], [x, y + 1], 2]);
        if (!has(x - 1, y)) edges.push([[x, y + 1], [x, y], 3]);
      }
  const by = new Map();
  edges.forEach((e, i) => {
    const k = e[0].join();
    if (!by.has(k)) by.set(k, []);
    by.get(k).push(i);
  });
  const used = new Set(),
    loops = [];
  for (let i = 0; i < edges.length; i++) {
    if (used.has(i)) continue;
    const points = [];
    let at = i;
    while (!used.has(at)) {
      used.add(at);
      const e = edges[at];
      points.push(e[0].map((v) => v * C));
      const opts = (by.get(e[1].join()) || []).filter((j) => !used.has(j));
      if (!opts.length) break;
      opts.sort(
        (a, b) =>
          [1, 0, 3, 2].indexOf((edges[a][2] - e[2] + 4) % 4) -
          [1, 0, 3, 2].indexOf((edges[b][2] - e[2] + 4) % 4),
      );
      at = opts[0];
    }
    if (points.length) loops.push(points);
  }
  return loops;
}
function coastPath(tiles) {
  const p = new Path2D();
  for (const raw of contours(tiles)) {
    const pts = [];
    for (let j = 0; j < raw.length; j++) {
      const a = raw[j],
        b = raw[(j + 1) % raw.length],
        dx = b[0] - a[0],
        dy = b[1] - a[1],
        len = Math.hypot(dx, dy),
        wobble = (rand(a[0] + b[0], a[1] + b[1]) - 0.25) * 5;
      pts.push(a, [
        (a[0] + b[0]) / 2 + (dy / len) * wobble,
        (a[1] + b[1]) / 2 - (dx / len) * wobble,
      ]);
    }
    const n = pts.length;
    const toward = (a, b, d) => {
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      return [
        a[0] + ((b[0] - a[0]) * d) / length,
        a[1] + ((b[1] - a[1]) * d) / length,
      ];
    };
    for (let i = 0; i < n; i++) {
      const v = pts[i],
        before = pts[(i + n - 1) % n],
        after = pts[(i + 1) % n],
        entry = toward(v, before, 12),
        exit = toward(v, after, 12);
      if (!i) p.moveTo(...entry);
      else p.lineTo(...entry);
      p.quadraticCurveTo(...v, ...exit);
    }
    p.closePath();
  }
  return p;
}
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    canvas.width = 1600;
    canvas.height = 1600;
    this.ctx = canvas.getContext("2d");
    this.ctx.scale(2, 2);
    this.atlas = new Image();
    this.atlas.src = "art/terrain-atlas.png";
    this.ground = new Image();
    this.ground.src = "art/ground-textures.png";
    this.ready = Promise.all([this.atlas.decode(), this.ground.decode()]);
    this.hover = null;
    this.selected = null;
  }
  sprite(kind, x, y, size, flip = false) {
    const c = this.ctx,
      im = this.atlas,
      sx = im.naturalWidth / 3,
      sy = im.naturalHeight / 2,
      index = {
        hill: 0,
        mountain: 1,
        forest: 2,
        village: 3,
        port: 4,
        fortress: 5,
      }[kind];
    if (index === undefined || !im.complete || !im.naturalWidth) return;
    c.save();
    c.translate(x, y);
    if (flip) c.scale(-1, 1);
    c.drawImage(
      im,
      (index % 3) * sx,
      Math.floor(index / 3) * sy,
      sx,
      sy,
      -size / 2,
      -size / 2,
      size,
      size,
    );
    c.restore();
  }
  draw(state) {
    // A draw must depend only on state, never on Canvas defaults or a previous frame.
    this.ctx.setTransform(2, 0, 0, 2, 0, 0);
    this.ctx.globalAlpha = 1;
    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.filter = "none";
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
    this.ctx.setLineDash([]);
    this.state = state;
    const c = this.ctx,
      t = state.regions[state.active].tiles,
      ochre = state.active === 1;
    c.clearRect(0, 0, W, W);
    const sea = c.createLinearGradient(0, 0, W, W);
    sea.addColorStop(0, ochre ? "#328e9a" : "#137c94");
    sea.addColorStop(0.5, ochre ? "#166d85" : "#075875");
    sea.addColorStop(1, "#073f62");
    c.fillStyle = sea;
    c.fillRect(0, 0, W, W);
    for (let k = 0; k < 1600; k++) {
      const x = rand(k, 1) * W,
        y = rand(k, 2) * W;
      c.beginPath();
      c.strokeStyle = k % 4 ? "#82dbdb13" : "#b8edf132";
      c.lineWidth = k % 3 ? 0.7 : 1.2;
      c.moveTo(x, y);
      c.quadraticCurveTo(x + 5, y - 2, x + 10 + rand(k, 8) * 9, y);
      c.stroke();
    }
    const path = coastPath(t);
    c.lineJoin = "round";
    c.lineCap = "round";
    for (const [width, color] of [
      [43, "#37d7d02b"],
      [29, "#52e1cf55"],
      [17, "#c3f4debb"],
      [12, "#ead4a2"],
    ]) {
      c.strokeStyle = color;
      c.lineWidth = width;
      c.stroke(path);
    }
    const grass = c.createLinearGradient(0, 0, W, W);
    grass.addColorStop(0, ochre ? "#b8a85b" : "#a1b950");
    grass.addColorStop(0.5, ochre ? "#ae8150" : "#6b9945");
    grass.addColorStop(1, ochre ? "#bc9e65" : "#90ad4d");
    c.fillStyle = grass;
    c.fill(path, "evenodd");
    c.save();
    c.setLineDash([1, 5, 3, 7]);
    c.lineWidth = 2.2;
    c.strokeStyle = "#fff4d4bb";
    c.stroke(path);
    c.restore();
    c.save();
    c.clip(path, "evenodd");
    c.globalAlpha = 0.86;
    c.drawImage(
      this.ground,
      ochre ? this.ground.naturalWidth / 2 : 0,
      0,
      this.ground.naturalWidth / 2,
      this.ground.naturalHeight,
      0,
      0,
      W,
      W,
    );
    c.globalAlpha = 1;
    for (let k = 0; k < 170; k++) {
      const x = rand(k, 25) * W,
        y = rand(k, 27) * W,
        r = 10 + rand(k, 28) * 43,
        g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(
        0,
        k % 2
          ? ochre
            ? "#ead68c35"
            : "#dce09138"
          : ochre
            ? "#68482f30"
            : "#174b3530",
      );
      g.addColorStop(1, "#81944800");
      c.fillStyle = g;
      c.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let k = 0; k < 4500; k++) {
      const x = rand(k, 3) * W,
        y = rand(k, 4) * W,
        i = Math.floor(y / C) * 16 + Math.floor(x / C);
      if (t[i] === "ocean") continue;
      c.fillStyle = (
        ochre
          ? ["#eac48138", "#79683e25", "#e7c57d33"]
          : ["#d7d47538", "#305e3833", "#e8de7b30"]
      )[k % 3];
      c.beginPath();
      c.ellipse(
        x,
        y,
        rand(k, 9) * 4 + 1,
        rand(k, 10) * 1.8 + 0.5,
        rand(k, 11) * 3,
        0,
        Math.PI * 2,
      );
      c.fill();
    }
    // Lower-relief connections underneath illustrated peaks.
    for (let i = 0; i < 256; i++)
      if (["hill", "mountain"].includes(t[i])) {
        const x = (i % 16) * C + 25,
          y = Math.floor(i / 16) * C + 25;
        for (const j of neighbors(i))
          if (j > i && ["hill", "mountain"].includes(t[j])) {
            const nx = (j % 16) * C + 25,
              ny = Math.floor(j / 16) * C + 25;
            c.beginPath();
            c.moveTo(x, y);
            c.lineTo(nx, ny);
            c.strokeStyle = ochre ? "#7d784d" : "#527c3e";
            c.lineWidth = 30;
            c.stroke();
            c.strokeStyle = "#d5c57a66";
            c.lineWidth = 8;
            c.stroke();
          }
      }
    // Cultivated textures are contextual and cosmetic, never a farming simulation.
    for (let i = 0; i < 256; i++)
      if (t[i] === "land" && neighbors(i).some((j) => t[j] === "village")) {
        const x = (i % 16) * C + 12,
          y = Math.floor(i / 16) * C + 9;
        c.save();
        c.translate(x, y);
        c.rotate(rand(i) * 0.7 - 0.35);
        c.fillStyle = ochre ? "#d3ab5d" : "#bfbd5d";
        c.fillRect(0, 0, 28, 30);
        c.strokeStyle = "#e0d081aa";
        c.lineWidth = 1.5;
        for (let r = 2; r < 30; r += 4) {
          c.beginPath();
          c.moveTo(0, r);
          c.lineTo(28, r);
          c.stroke();
        }
        c.restore();
      }
    c.restore();
    // Shared edge midpoints make connected runs, bends and junctions continuous.
    const riverPath = new Path2D(),
      riverVariants = { a: new Path2D(), b: new Path2D() };
    for (let i = 0; i < 256; i++)
      if (t[i] === "river") {
        const x = (i % 16) * C + 25,
          y = Math.floor(i / 16) * C + 25,
          n = neighbors(i),
          joins = n.filter((j) => t[j] === "river"),
          mouths = n.filter((j) => t[j] === "ocean");
        const p = new Path2D();
        const target = (j) => [
          ((j % 16) * C + 25 + x) / 2,
          (Math.floor(j / 16) * C + 25 + y) / 2,
        ];
        const links = [...joins, ...mouths];
        if (!links.length) {
          p.moveTo(x - 6, y - 4);
          p.quadraticCurveTo(x, y - 12, x + 6, y + 3);
        } else if (links.length === 2) {
          const a = target(links[0]),
            b = target(links[1]);
          p.moveTo(...a);
          p.quadraticCurveTo(x, y, ...b);
        } else
          for (const j of links) {
            p.moveTo(x, y);
            const b = target(j);
            p.quadraticCurveTo(
              x + (b[0] - x) * 0.25,
              y + (b[1] - y) * 0.75,
              ...b,
            );
          }
        riverPath.addPath(p);
        const variant = state.regions[state.active].variants[i];
        if (riverVariants[variant]) riverVariants[variant].addPath(p);
      }
    for (const [w, color] of [
      [19, "#dbd49a"],
      [13, "#368b91"],
      [8, "#58c9d1"],
    ]) {
      c.lineWidth = w;
      c.strokeStyle = color;
      c.stroke(riverPath);
    }
    c.lineWidth = 1;
    c.strokeStyle = "#c1f6ecaa";
    c.stroke(riverPath);
    for (const v of ["a", "b"]) {
      c.lineWidth = v === "b" ? 10 : 7;
      c.strokeStyle = v === "a" ? "#42b3c5" : "#7ad8d4";
      c.stroke(riverVariants[v]);
    }

    // Groves and hill masses compose independently on arbitrary edited layouts.
    for (let i = 0; i < 256; i++) {
      const type = t[i],
        x = (i % 16) * C + 25,
        y = Math.floor(i / 16) * C + 25;
      const variant = state.regions[state.active].variants[i],
        flip = variant === "b" || (!variant && rand(i, 2) > 0.5);
      if (type === "land") {
        if (ochre) {
          for (let k = 0; k < 3; k++)
            this.acacia(
              x - 16 + rand(i, k) * 28,
              y - 12 + rand(i, k + 4) * 25,
              6 + rand(i, k + 7) * 5,
            );
        } else if (rand(i, 3) > 0.25) {
          this.sprite(
            "forest",
            x + rand(i, 1) * 20 - 10,
            y + rand(i, 4) * 16 - 8,
            40 + rand(i, 5) * 17,
            flip,
          );
          if (rand(i, 9) > 0.48)
            this.sprite(
              "forest",
              x - 18 + rand(i, 7) * 28,
              y + 12,
              26 + rand(i, 8) * 15,
              !flip,
            );
        }
      }
      if (type === "hill") this.sprite(ochre ? "hill" : "hill", x, y, 67, flip);
    }
    for (let i = 0; i < 256; i++)
      if (t[i] === "mountain") {
        const x = (i % 16) * C + 25,
          y = Math.floor(i / 16) * C + 22;
        c.save();
        if (ochre) c.filter = "sepia(.55) saturate(.8)";
        this.sprite(
          "mountain",
          x,
          y,
          78,
          state.regions[state.active].variants[i] === "b",
        );
        c.restore();
      }
    const analysis = analyze(t),
      citySet = new Set();
    for (const b of analysis.cityBlocks)
      if (
        state.earned.includes("A14") &&
        b.every((i) => appearance(state, i) === "city")
      )
        b.forEach((i) => citySet.add(i));
    const cityGroups = [];
    const visited = new Set();
    for (const n of citySet) {
      if (visited.has(n)) continue;
      const g = [],
        q = [n];
      visited.add(n);
      while (q.length) {
        const i = q.pop();
        g.push(i);
        for (const j of neighbors(i))
          if (citySet.has(j) && !visited.has(j)) {
            visited.add(j);
            q.push(j);
          }
      }
      cityGroups.push(g);
    }
    for (let i = 0; i < 256; i++)
      if (t[i] === "village" && !citySet.has(i)) {
        const a = appearance(state, i),
          x = (i % 16) * C + 25,
          y = Math.floor(i / 16) * C + 25;
        c.strokeStyle = "#d8c38a";
        c.lineWidth = 4;
        for (const j of neighbors(i))
          if (t[j] === "village") {
            c.beginPath();
            c.moveTo(x, y);
            c.lineTo(
              (x + (j % 16) * C + 25) / 2,
              (y + Math.floor(j / 16) * C + 25) / 2,
            );
            c.stroke();
          }
        this.sprite(
          a === "port"
            ? "port"
            : a === "fortress" || a === "city"
              ? "fortress"
              : "village",
          x,
          y,
          a === "fortress" ? 66 : 60,
        );
        if (a === "port") {
          const o = neighbors(i).find((j) => t[j] === "ocean");
          if (o !== undefined) {
            c.strokeStyle = "#a87948";
            c.lineWidth = 4;
            c.beginPath();
            c.moveTo(x, y + 12);
            c.lineTo(
              (x + (o % 16) * C + 25) / 2,
              (y + Math.floor(o / 16) * C + 25) / 2,
            );
            c.stroke();
          }
        }
      }
    for (const g of cityGroups) {
      const cx = g.reduce((v, i) => v + (i % 16) * C + 25, 0) / g.length,
        cy = g.reduce((v, i) => v + Math.floor(i / 16) * C + 25, 0) / g.length;
      c.fillStyle = "#d1bb80bb";
      for (const i of g) {
        const x = (i % 16) * C + 25,
          y = Math.floor(i / 16) * C + 25;
        c.beginPath();
        c.roundRect(x - 22, y - 22, 44, 44, 9);
        c.fill();
        c.strokeStyle = "#efd9a6";
        c.lineWidth = 5;
        c.beginPath();
        c.moveTo(cx, cy);
        c.lineTo(x, y);
        c.stroke();
        this.sprite("village", x, y, 43);
      }
      this.sprite("fortress", cx, cy, 92);
    }
    if (state.settings.grid) {
      c.strokeStyle = "#d8f0d91c";
      c.lineWidth = 0.7;
      for (let j = 0; j <= 16; j++) {
        c.beginPath();
        c.moveTo(j * C, 0);
        c.lineTo(j * C, W);
        c.moveTo(0, j * C);
        c.lineTo(W, j * C);
        c.stroke();
      }
    }
    if (this.selected !== null) {
      const i = this.selected;
      c.strokeStyle = "#ffdf8b";
      c.lineWidth = 2;
      c.strokeRect((i % 16) * C + 2, Math.floor(i / 16) * C + 2, 46, 46);
    }
    if (this.hover !== null) {
      const i = this.hover;
      c.fillStyle = "#ffeb9d30";
      c.fillRect((i % 16) * C, Math.floor(i / 16) * C, C, C);
      c.strokeStyle = "#fff3bd";
      c.lineWidth = 1;
      c.strokeRect((i % 16) * C + 1, Math.floor(i / 16) * C + 1, 48, 48);
    }
  }
  acacia(x, y, r) {
    const c = this.ctx;
    c.strokeStyle = "#72533a";
    c.lineWidth = 1.8;
    c.beginPath();
    c.moveTo(x, y + 7);
    c.lineTo(x, y - 2);
    c.stroke();
    c.fillStyle = "#626c3b";
    c.beginPath();
    c.ellipse(x, y - 2, r, r * 0.4, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#9a9b4c";
    c.beginPath();
    c.ellipse(x - 2, y - 4, r * 0.8, r * 0.22, 0, 0, Math.PI * 2);
    c.fill();
  }
}
