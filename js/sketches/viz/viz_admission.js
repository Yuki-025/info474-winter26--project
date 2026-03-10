// js/sketches/viz/viz_admission.js
(function () {
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  const COL_PUB  = [46,  111, 173];
  const COL_PRIV = [219, 132,  55];

  window.VizAdmission = {
    draw: function (p, manager, ai, progress) {
      p.background(255);

      const pts = manager.admissionPoints || [];

      const m          = manager.margin || { left: 80 };
      const fullW      = manager.width  || 600;
      const fullH      = manager.height || 520;
      const plotLeft   = m.left;
      const plotTop    = 90;
      const plotRight  = plotLeft + fullW - 30;
      const plotBottom = plotTop  + fullH - 130;

      p.noStroke(); p.fill(0); p.textSize(22);
      p.textAlign(p.CENTER, p.BASELINE);
      p.text('Admission Rate vs Graduation Rate', (plotLeft + plotRight) / 2, 40);
      p.textSize(13); p.fill(100);
      p.text(
        'More selective schools (lower admission rate) tend to graduate more students',
        (plotLeft + plotRight) / 2, 62
      );
      p.textAlign(p.LEFT, p.BASELINE);

      const sx = x => p.map(x, 0, 1, plotLeft,  plotRight);
      const sy = y => p.map(y, 0, 1, plotBottom, plotTop);

      // Grid
      p.stroke(220); p.strokeWeight(1);
      for (let g = 0; g <= 1.001; g += 0.25) {
        p.line(sx(g), plotTop,   sx(g), plotBottom);
        p.line(plotLeft, sy(g),  plotRight, sy(g));
      }

      // Axes
      p.noFill(); p.stroke(0); p.strokeWeight(1.2);
      p.rect(plotLeft, plotTop, plotRight - plotLeft, plotBottom - plotTop);

      // Tick labels
      p.noStroke(); p.fill(80); p.textSize(11);
      p.textAlign(p.CENTER, p.TOP);
      for (let xt = 0; xt <= 1.001; xt += 0.25) {
        p.text(Math.round(xt * 100) + '%', sx(xt), plotBottom + 6);
      }
      p.textAlign(p.RIGHT, p.CENTER);
      for (let yt = 0; yt <= 1.001; yt += 0.25) {
        p.text(Math.round(yt * 100) + '%', plotLeft - 8, sy(yt));
      }

      // Axis labels
      p.textAlign(p.CENTER, p.BASELINE); p.textSize(13); p.fill(0);
      p.text('Admission Rate', (plotLeft + plotRight) / 2, plotBottom + 38);
      p.push();
      p.translate(plotLeft - 58, (plotTop + plotBottom) / 2);
      p.rotate(-Math.PI / 2);
      p.text('Graduation Rate (150% time)', 0, 0);
      p.pop();

      if (!pts.length) {
        p.noStroke(); p.fill(120); p.textSize(14);
        p.text('No data loaded yet…', plotLeft + 10, plotTop + 24);
        return;
      }

      // Hover detection
      const mx = p.mouseX, my = p.mouseY;
      let nearestIdx = -1, nearestDist = 1e9;
      for (let i = 0; i < pts.length; i++) {
        const d = Math.hypot(mx - sx(pts[i].admission), my - sy(pts[i].grad));
        if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
      }
      const hovering = nearestIdx !== -1 && nearestDist <= 10;

      // Draw dots
      for (const d of pts) {
        const isPublic = (d.control || '').toLowerCase() === 'public';
        const col = isPublic ? COL_PUB : COL_PRIV;
        p.noStroke();
        p.fill(col[0], col[1], col[2], 140); // alpha ~0.55
        p.circle(sx(d.admission), sy(d.grad), 5);
      }

      // Legend
      p.textSize(12); p.textAlign(p.LEFT, p.CENTER); p.noStroke();
      p.fill(COL_PUB[0], COL_PUB[1], COL_PUB[2]);
      p.circle(plotLeft + 19, plotTop + 20, 10);
      p.fill(40); p.text('Public', plotLeft + 28, plotTop + 20);
      p.fill(COL_PRIV[0], COL_PRIV[1], COL_PRIV[2]);
      p.circle(plotLeft + 19, plotTop + 40, 10);
      p.fill(40); p.text('Private', plotLeft + 28, plotTop + 40);

      // Hover tooltip
      if (hovering) {
        const hd       = pts[nearestIdx];
        const hx       = sx(hd.admission);
        const hy       = sy(hd.grad);
        const isPublic = (hd.control || '').toLowerCase() === 'public';
        const col      = isPublic ? COL_PUB : COL_PRIV;

        p.noStroke(); p.fill(col[0], col[1], col[2]); p.circle(hx, hy, 10);

        const lines = [
          (hd.name || 'Unknown').slice(0, 40),
          'Type: '      + (hd.control   || '—'),
          'Admission: ' + (hd.admission * 100).toFixed(1) + '%',
          'Grad Rate: ' + (hd.grad      * 100).toFixed(1) + '%'
        ];

        p.textSize(12);
        const pad = 10, lineH = 16;
        let boxW = 0;
        lines.forEach(l => { const tw = p.textWidth(l); if (tw > boxW) boxW = tw; });
        boxW += pad * 2;
        const boxH = lines.length * lineH + pad * 2;

        const tx = clamp(mx + 14, plotLeft + 4, plotRight  - boxW - 4);
        const ty = clamp(my - boxH - 14, plotTop + 4, plotBottom - boxH - 4);

        p.noStroke(); p.fill(255); p.rect(tx, ty, boxW, boxH, 6);
        p.stroke(0); p.strokeWeight(0.8); p.noFill(); p.rect(tx, ty, boxW, boxH, 6);

        p.noStroke(); p.textAlign(p.LEFT, p.TOP);
        lines.forEach((l, li) => {
          p.fill(li === 0 ? 0 : 60);
          p.textSize(li === 0 ? 12 : 11);
          p.text(l, tx + pad, ty + pad + li * lineH);
        });
        p.textAlign(p.LEFT, p.BASELINE);
      }
    }
  };
})();