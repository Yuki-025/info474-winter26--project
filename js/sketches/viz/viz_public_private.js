// js/sketches/viz/viz_public_private.js
(function () {
  const COL_PUB  = [46, 111, 173];
  const COL_PRIV = [219, 132, 55];

  let _ui     = null;
  let _animT  = 0;
  let _lastAI = -1;
  let _region = 'All';

  const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  window.VizPublicPrivate = {
    draw: function (p, manager, ai, progress) {
      p.background(255);

      if (!_ui) {
        if (!manager.allRegions || !manager.allRegions.length) {
          p.noStroke(); p.fill(120); p.textSize(14);
          p.textAlign(p.CENTER, p.CENTER);
          p.text('Loading…', (manager.width || 600) / 2, (manager.height || 520) / 2);
          return;
        }

        _ui = {};
        const panel = p.createDiv();
        panel.style('position', 'absolute');
        panel.style('top', '12px');
        panel.style('right', '10px');
        panel.style('background', 'transparent');
        panel.style('border', 'none');
        panel.style('font-size', '12px');
        panel.parent('vis');
        _ui.panel = panel;

        const regionLabel = p.createDiv('Filter by Region');
        regionLabel.style('font-size', '11px');
        regionLabel.style('font-weight', '600');
        regionLabel.style('color', '#333');
        regionLabel.style('margin-bottom', '6px');
        regionLabel.parent(panel);

        _ui.btns = [];

        const makeBtn = label => {
          const btn = p.createButton(label);
          btn.style('display', 'block');
          btn.style('margin-bottom', '3px');
          btn.style('padding', '3px 8px');
          btn.style('font-size', '11px');
          btn.style('border', '1px solid #ccc');
          btn.style('border-radius', '4px');
          btn.style('background', label === 'All' ? '#444' : '#fff');
          btn.style('color',      label === 'All' ? '#fff' : '#333');
          btn.style('cursor', 'pointer');
          btn.style('width', '120px');
          btn.style('text-align', 'left');
          btn.parent(panel);
          btn._ppRegion = label;
          btn.mousePressed(() => {
            _region = label;
            _ui.btns.forEach(b => {
              const active = b._ppRegion === _region;
              b.style('background', active ? '#444' : '#fff');
              b.style('color',      active ? '#fff' : '#333');
            });
          });
          _ui.btns.push(btn);
        };

        ['All'].concat(manager.allRegions).forEach(makeBtn);
        if (manager) manager.__publicPrivateUI = _ui;
      }

      if (ai === 1 || ai === 2) {
        if (_ui && _ui.panel) _ui.panel.show();
      } else {
        if (_ui && _ui.panel) _ui.panel.hide();
        return;
      }

      if (ai !== _lastAI) { _animT = 0; _lastAI = ai; }
      _animT = Math.min(1, _animT + 0.04);

      const fullW = manager.width  || 600;
      const fullH = manager.height || 520;
      const plotLeft   = 100;
      const plotTop    = 90;
      const plotRight  = plotLeft + fullW - 160;
      const plotBottom = plotTop  + fullH - 140;

      p.noStroke(); p.fill(0); p.textSize(22);
      p.textAlign(p.CENTER, p.BASELINE);
      p.text('Public vs Private Graduation Rates', (plotLeft + plotRight) / 2, 40);
      p.textSize(13); p.fill(100);
      p.text(
        ai === 1
          ? 'Average completion rate (150% time) · colored by institution type'
          : 'Individual colleges shown · private schools tend to graduate more',
        (plotLeft + plotRight) / 2, 62
      );
      p.textAlign(p.LEFT, p.BASELINE);

      const all    = manager.tuitionPoints || [];
      const subset = _region === 'All' ? all : all.filter(d => d.region === _region);

      const pubVals = [], privVals = [];
      subset.forEach(d => {
        if (!Number.isFinite(d.grad)) return;
        ((d.control || '').toLowerCase() === 'public' ? pubVals : privVals).push(d.grad);
      });

      const avgPub  = avg(pubVals);
      const avgPriv = avg(privVals);

      const barW  = 90;
      const midX  = (plotLeft + plotRight) / 2;
      const pubX  = midX - barW - 20;
      const privX = midX + 20;

      const sy = v => p.map(v * _animT, 0, 1, plotBottom, plotTop);
      const gy = v => p.map(v, 0, 1, plotBottom, plotTop);

      // Grid
      p.stroke(220); p.strokeWeight(1);
      for (let g = 0; g <= 1.001; g += 0.2) {
        p.line(plotLeft, gy(g), plotRight, gy(g));
      }

      // Axes
      p.noFill(); p.stroke(0); p.strokeWeight(1.2);
      p.line(plotLeft, plotTop, plotLeft, plotBottom);
      p.line(plotLeft, plotBottom, plotRight, plotBottom);

      // Y ticks
      p.noStroke(); p.fill(80); p.textSize(11); p.textAlign(p.RIGHT, p.CENTER);
      for (let t = 0; t <= 1.001; t += 0.2) {
        p.text(Math.round(t * 100) + '%', plotLeft - 8, gy(t));
      }

      // Bars
      p.noStroke();
      p.fill(COL_PUB[0],  COL_PUB[1],  COL_PUB[2],  200);
      p.rect(pubX,  sy(avgPub),  barW, plotBottom - sy(avgPub),  4, 4, 0, 0);
      p.fill(COL_PRIV[0], COL_PRIV[1], COL_PRIV[2], 200);
      p.rect(privX, sy(avgPriv), barW, plotBottom - sy(avgPriv), 4, 4, 0, 0);

      // Value labels
      if (_animT > 0.6) {
        p.fill(255); p.textSize(14); p.textAlign(p.CENTER, p.CENTER);
        p.text((avgPub  * 100).toFixed(1) + '%', pubX  + barW / 2, sy(avgPub)  + 18);
        p.text((avgPriv * 100).toFixed(1) + '%', privX + barW / 2, sy(avgPriv) + 18);
      }

      // Type labels + counts
      p.noStroke(); p.textAlign(p.CENTER, p.TOP);
      p.fill(40);  p.textSize(13);
      p.text('Public',  pubX  + barW / 2, plotBottom + 8);
      p.text('Private', privX + barW / 2, plotBottom + 8);
      p.fill(120); p.textSize(11);
      p.text('n = ' + pubVals.length,  pubX  + barW / 2, plotBottom + 26);
      p.text('n = ' + privVals.length, privX + barW / 2, plotBottom + 26);

      // ai=2: dot overlay with deterministic jitter
      if (ai === 2) {
        p.noStroke();
        const drawJitter = (vals, col, bx) => {
          p.fill(col[0], col[1], col[2], 50);
          for (let i = 0; i < vals.length; i++) {
            p.circle(bx + ((i * 37 + 13) % barW), gy(vals[i]), 4);
          }
        };
        drawJitter(pubVals,  COL_PUB,  pubX);
        drawJitter(privVals, COL_PRIV, privX);
      }

      // Y axis label
      p.push();
      p.translate(plotLeft - 58, (plotTop + plotBottom) / 2);
      p.rotate(-Math.PI / 2);
      p.textAlign(p.CENTER, p.BASELINE);
      p.textSize(13); p.fill(0); p.noStroke();
      p.text('Avg Graduation Rate (150% time)', 0, 0);
      p.pop();
    }
  };
})();