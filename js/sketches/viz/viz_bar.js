// js/sketches/viz/viz_bar.js
(function () {
  const PALETTE = [
    [ 46, 111, 173],
    [219, 132,  55],
    [ 61, 189, 168],
    [168, 100, 200],
    [220,  80,  80],
    [ 80, 180,  80],
    [200, 160,  40],
    [100, 140, 200],
    [180, 100,  60]
  ];

  window.VizBar = {
    draw: function (p, manager, ai, progress) {
      p.background(255);

      const data   = manager.regionGradData || [];
      const fullW  = manager.width  || 600;
      const fullH  = manager.height || 520;
      const left   = (manager.margin && manager.margin.left) || 80;
      const top    = 90;
      const right  = left + fullW - 40;
      const bottom = top  + fullH - 130;

      p.noStroke(); p.fill(0); p.textSize(22);
      p.textAlign(p.CENTER, p.BASELINE);
      p.text('Average Graduation Rate by Region', (left + right) / 2, 40);
      p.textSize(13); p.fill(100);
      p.text('How do outcomes compare across the United States?', (left + right) / 2, 62);
      p.textAlign(p.LEFT, p.BASELINE);

      if (!data.length) {
        p.noStroke(); p.fill(120); p.textSize(14);
        p.text('No data loaded yet…', left + 10, top + 30);
        return;
      }

      const sorted  = data.slice().sort((a, b) => b.avg - a.avg);
      const barMaxW = right - left - 120;
      const rowH    = (bottom - top) / sorted.length;

      p.noStroke(); p.textSize(12);

      for (let i = 0; i < sorted.length; i++) {
        const row = sorted[i];
        const y   = top + i * rowH + rowH / 2;
        const bw  = p.map(row.avg, 0, 1, 0, barMaxW);
        const bx  = left + 120;
        const col = PALETTE[i % PALETTE.length];

        p.fill(col[0], col[1], col[2], 200);
        p.rect(bx, y - rowH * 0.35, bw, rowH * 0.7, 3);

        // Region label
        p.fill(40); p.textAlign(p.RIGHT, p.CENTER);
        p.text(row.region, bx - 8, y);

        // Value + count label
        const label = (row.avg * 100).toFixed(1) + '%  (n=' + row.count + ')';
        if (bw > 50) {
          p.fill(255); p.textAlign(p.LEFT, p.CENTER);
          p.text(label, bx + 6, y);
        } else {
          p.fill(40); p.textAlign(p.LEFT, p.CENTER);
          p.text(label, bx + bw + 6, y);
        }
      }
    }
  };
})();