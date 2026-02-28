(function () {
  // ── Helpers ──────────────────────────────────────────────────────────────
  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  // Linear regression → { m, b }  (y = m*x + b)
  function linReg(pts) {
    var n = pts.length;
    if (n < 2) return null;
    var sx = 0,
      sy = 0,
      sxy = 0,
      sx2 = 0;
    for (var i = 0; i < n; i++) {
      sx += pts[i].cost;
      sy += pts[i].grad;
      sxy += pts[i].cost * pts[i].grad;
      sx2 += pts[i].cost * pts[i].cost;
    }
    var m = (n * sxy - sx * sy) / (n * sx2 - sx * sx);
    var b = (sy - m * sx) / n;
    return { m: m, b: b };
  }

  // ── Constants ─────────────────────────────────────────────────────────────
  var COST_MIN = 5000;
  var COST_MAX = 65000;
  var GRAD_MIN = 0;
  var GRAD_MAX = 1;

  var COL_PUBLIC = [46, 111, 173]; // blue
  var COL_PRIVATE = [219, 132, 55]; // amber
  var COL_TREND = [61, 189, 168]; // teal

  // Quartile thresholds (from data analysis: Q1≤$20k, Q2≤$30k, Q3≤$45k, Q4>$45k)
  var QUARTILES = [
    {
      lo: 5000,
      hi: 20000,
      label: "Q1\n≤$20k",
      avgGrad: "40.5%",
      col: [168, 200, 232, 30],
    },
    {
      lo: 20000,
      hi: 30000,
      label: "Q2\n$20–30k",
      avgGrad: "56.3%",
      col: [46, 111, 173, 25],
    },
    {
      lo: 30000,
      hi: 45000,
      label: "Q3\n$30–45k",
      avgGrad: "55.1%",
      col: [244, 162, 97, 25],
    },
    {
      lo: 45000,
      hi: 65000,
      label: "Q4\n>$45k",
      avgGrad: "73.1%",
      col: [232, 132, 58, 30],
    },
  ];

  // ── State shared across frames ───────────────────────────────────────────
  var _filterUI = null; // p5 DOM elements (created once)
  var _lastAI = -1; // track ai changes to reset animation
  var _animT = 0; // 0..1 fade-in progress
  var _showTrend = false;
  var _showBands = true;

  // ── Main module ──────────────────────────────────────────────────────────
  window.VizTuitionGrad = {
    draw: function (p, manager, ai, progress) {
      p.background(255);

      var pts = manager.tuitionPoints || []; // populated by sketch_renderer setData

      // ── Create filter UI once ─────────────────────────────────────────
      if (!_filterUI) {
        _filterUI = {};

        var panel = p.createDiv();
        panel.style("position", "absolute");
        panel.style("top", "12px");
        panel.style("right", "10px");
        panel.style("background", "transparent");
        panel.style("padding", "0");
        panel.style("border", "none");
        panel.style("font-size", "12px");
        panel.parent("vis");
        _filterUI.panel = panel;

        // ── Toggle: show / hide trend line ──────────────────────────────
        var trendBtn = p.createButton("Show Trend Line");
        trendBtn.style("display", "block");
        trendBtn.style("margin-bottom", "6px");
        trendBtn.style("padding", "5px 10px");
        trendBtn.style("font-size", "11px");
        trendBtn.style("font-family", "sans-serif");
        trendBtn.style("border", "1px solid #ccc");
        trendBtn.style("border-radius", "4px");
        trendBtn.style("background", "#fff");
        trendBtn.style("cursor", "pointer");
        trendBtn.parent(panel);
        trendBtn.mousePressed(function () {
          _showTrend = !_showTrend;
          trendBtn.html(_showTrend ? "Hide Trend Line" : "Show Trend Line");
          trendBtn.style("background", _showTrend ? "#3DBDA8" : "#fff");
          trendBtn.style("color", _showTrend ? "#fff" : "#333");
        });
        _filterUI.trendBtn = trendBtn;

        // ── Toggle: show / hide quartile bands ──────────────────────────
        var bandBtn = p.createButton("Hide Cost Bands");
        bandBtn.style("display", "block");
        bandBtn.style("margin-bottom", "6px");
        bandBtn.style("padding", "5px 10px");
        bandBtn.style("font-size", "11px");
        bandBtn.style("font-family", "sans-serif");
        bandBtn.style("border", "1px solid #ccc");
        bandBtn.style("border-radius", "4px");
        bandBtn.style("background", "#fff");
        bandBtn.style("cursor", "pointer");
        bandBtn.parent(panel);
        bandBtn.mousePressed(function () {
          _showBands = !_showBands;
          bandBtn.html(_showBands ? "Hide Cost Bands" : "Show Cost Bands");
        });
        _filterUI.bandBtn = bandBtn;

        // ── Filter: institution type (All / Public / Private) ────────────
        var typeLabel = p.createDiv("Institution Type");
        typeLabel.style("font-size", "11px");
        typeLabel.style("font-weight", "600");
        typeLabel.style("color", "#333");
        typeLabel.style("margin-top", "6px");
        typeLabel.style("margin-bottom", "3px");
        typeLabel.parent(panel);

        var typeSelect = p.createSelect();
        typeSelect.option("All");
        typeSelect.option("Public");
        typeSelect.option("Private");
        typeSelect.style("width", "130px");
        typeSelect.style("font-size", "11px");
        typeSelect.style("padding", "3px 6px");
        typeSelect.style("border", "1px solid #ccc");
        typeSelect.style("border-radius", "4px");
        typeSelect.parent(panel);
        _filterUI.typeSelect = typeSelect;

        // ── Slider: max tuition ──────────────────────────────────────────
        var costLabel = p.createDiv("Max Tuition");
        costLabel.style("font-size", "11px");
        costLabel.style("font-weight", "600");
        costLabel.style("color", "#333");
        costLabel.style("margin-top", "8px");
        costLabel.style("margin-bottom", "3px");
        costLabel.parent(panel);

        var costSlider = p.createSlider(COST_MIN, COST_MAX, COST_MAX, 1000);
        costSlider.style("width", "130px");
        costSlider.parent(panel);
        _filterUI.costSlider = costSlider;

        var costValLabel = p.createDiv("");
        costValLabel.style("font-size", "11px");
        costValLabel.style("color", "#555");
        costValLabel.style("margin-top", "2px");
        costValLabel.parent(panel);
        _filterUI.costValLabel = costValLabel;

        // ── Count label ──────────────────────────────────────────────────
        var countLabel = p.createDiv("");
        countLabel.style("font-size", "11px");
        countLabel.style("color", "#555");
        countLabel.style("margin-top", "8px");
        countLabel.parent(panel);
        _filterUI.countLabel = countLabel;
        // expose the panel on the shared manager object so external code
        // (e.g. sketch_renderer) can show/hide it when the sketch is not
        // being drawn.  We store the same object so the renderer can use
        // the same property name it uses for the faculty viz.
        if (manager) {
          manager.__tuitionFilterUI = _filterUI;
        }
      }

      // ── Show / hide panel with active index ───────────────────────────
      // the renderer also toggles visibility for us, but keep the guard
      // here in case this function is called directly.  we still return
      // early when we're not active so that none of the expensive layout
      // work below runs.
      if (ai === 3 || ai === 4) {
        if (_filterUI && _filterUI.panel) _filterUI.panel.show();
      } else {
        if (_filterUI && _filterUI.panel) _filterUI.panel.hide();
        return;
      }

      // ── Animate dots in when section first becomes active ────────────
      if (ai !== _lastAI) {
        _animT = 0;
        _lastAI = ai;
      }
      _animT = Math.min(1, _animT + 0.035); // ~28 frames to fully appear

      // ── Read filter controls ──────────────────────────────────────────
      var typeFilter = _filterUI.typeSelect
        ? _filterUI.typeSelect.value()
        : "All";
      var maxCost = _filterUI.costSlider
        ? _filterUI.costSlider.value()
        : COST_MAX;

      _filterUI.costValLabel.html("up to $" + Math.round(maxCost / 1000) + "k");

      var visible = pts.filter(function (d) {
        var ctrlOk = typeFilter === "All" || d.control === typeFilter;
        var costOk = d.cost <= maxCost;
        return ctrlOk && costOk;
      });

      _filterUI.countLabel.html("<b>" + visible.length + "</b> colleges shown");

      // ── Layout ────────────────────────────────────────────────────────
      var mLeft = (manager.margin && manager.margin.left) || 80;
      var mBottom = (manager.margin && manager.margin.bottom) || 40;
      var fullW = manager.width || 600;
      var fullH = manager.height || 520;

      var plotLeft = mLeft;
      var plotTop = 90;
      var plotRight = plotLeft + fullW - 150; // leave room for filter panel
      var plotBottom = plotTop + fullH - 160;
      var plotW = plotRight - plotLeft;
      var plotH = plotBottom - plotTop;

      // ── Scale helpers ─────────────────────────────────────────────────
      function sx(cost) {
        return p.map(cost, COST_MIN, COST_MAX, plotLeft, plotRight);
      }
      function sy(grad) {
        return p.map(grad, GRAD_MIN, GRAD_MAX, plotBottom, plotTop);
      }

      // ── Title ─────────────────────────────────────────────────────────
      p.noStroke();
      p.fill(0);
      p.textAlign(p.CENTER, p.BASELINE);
      p.textSize(22);
      p.text(
        "Average Cost vs. Graduation Rate",
        (plotLeft + plotRight) / 2,
        40,
      );

      // Subtitle changes by active index
      p.textSize(13);
      p.fill(100);
      if (ai === 3) {
        p.text(
          "Each dot is one college  ·  Blue = Public  ·  Orange = Private",
          (plotLeft + plotRight) / 2,
          62,
        );
      } else {
        p.text(
          "Higher tuition correlates with higher graduation rates  (r = 0.66)",
          (plotLeft + plotRight) / 2,
          62,
        );
      }
      p.textAlign(p.LEFT, p.BASELINE);

      // ── Quartile bands ────────────────────────────────────────────────
      if (_showBands) {
        p.noStroke();
        for (var qi = 0; qi < QUARTILES.length; qi++) {
          var q = QUARTILES[qi];
          var c = q.col;
          p.fill(c[0], c[1], c[2], c[3]);
          var bx = sx(q.lo);
          var bw = sx(q.hi) - sx(q.lo);
          p.rect(bx, plotTop, bw, plotH);
        }

        // Quartile labels (only on ai===4 — the explanation step)
        if (ai === 4) {
          p.textAlign(p.CENTER, p.TOP);
          p.textSize(10);
          for (var qi2 = 0; qi2 < QUARTILES.length; qi2++) {
            var q2 = QUARTILES[qi2];
            var midX = (sx(q2.lo) + sx(q2.hi)) / 2;
            p.fill(80);
            p.text(q2.label + "\navg " + q2.avgGrad, midX, plotTop + 6);
          }
          p.textAlign(p.LEFT, p.BASELINE);
        }
      }

      // ── Axes border ───────────────────────────────────────────────────
      p.noFill();
      p.stroke(0);
      p.strokeWeight(1.2);
      p.rect(plotLeft, plotTop, plotW, plotH);

      // ── Grid lines ────────────────────────────────────────────────────
      p.stroke(220);
      p.strokeWeight(0.8);
      // horizontal
      for (var g = 0; g <= 1.0001; g += 0.2) {
        p.line(plotLeft, sy(g), plotRight, sy(g));
      }
      // vertical
      for (var c2 = 10000; c2 <= 60000; c2 += 10000) {
        p.line(sx(c2), plotTop, sx(c2), plotBottom);
      }

      // ── Axis tick labels ──────────────────────────────────────────────
      p.noStroke();
      p.fill(80);
      p.textSize(11);

      // X ticks
      p.textAlign(p.CENTER, p.TOP);
      for (var ct = 10000; ct <= 60000; ct += 10000) {
        p.text("$" + ct / 1000 + "k", sx(ct), plotBottom + 6);
      }

      // Y ticks
      p.textAlign(p.RIGHT, p.CENTER);
      for (var gt = 0; gt <= 1.0001; gt += 0.2) {
        p.text(Math.round(gt * 100) + "%", plotLeft - 8, sy(gt));
      }

      // X axis label
      p.textAlign(p.CENTER, p.BASELINE);
      p.textSize(13);
      p.fill(0);
      p.text(
        "Average Annual Cost",
        (plotLeft + plotRight) / 2,
        plotBottom + 38,
      );

      // Y axis label (rotated)
      p.push();
      p.translate(plotLeft - 58, (plotTop + plotBottom) / 2);
      p.rotate(-Math.PI / 2);
      p.textAlign(p.CENTER, p.BASELINE);
      p.textSize(13);
      p.fill(0);
      p.text("Graduation Rate (150% time)", 0, 0);
      p.pop();

      // ── Trend line (optional, toggleable) ────────────────────────────
      if (_showTrend && visible.length > 2) {
        var reg = linReg(visible);
        if (reg) {
          var tx1 = COST_MIN,
            tx2 = maxCost;
          var ty1 = clamp(reg.m * tx1 + reg.b, GRAD_MIN, GRAD_MAX);
          var ty2 = clamp(reg.m * tx2 + reg.b, GRAD_MIN, GRAD_MAX);
          p.stroke(COL_TREND[0], COL_TREND[1], COL_TREND[2]);
          p.strokeWeight(2);
          p.drawingContext.setLineDash([7, 5]);
          p.line(sx(tx1), sy(ty1), sx(tx2), sy(ty2));
          p.drawingContext.setLineDash([]);

          // r label
          p.noStroke();
          p.fill(COL_TREND[0], COL_TREND[1], COL_TREND[2]);
          p.textSize(11);
          p.textAlign(p.LEFT, p.BASELINE);
          p.text("r = 0.66", sx(tx1) + 6, sy(ty1) - 8);
        }
      }

      // ── Dots ──────────────────────────────────────────────────────────
      var mx = p.mouseX,
        my = p.mouseY;
      var nearestIdx = -1;
      var nearestDist = 1e9;

      // find nearest point for hover
      for (var i = 0; i < visible.length; i++) {
        var d = visible[i];
        var px = sx(d.cost);
        var py = sy(d.grad);
        var dist = Math.hypot(mx - px, my - py);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = i;
        }
      }
      var hovering = nearestIdx !== -1 && nearestDist <= 10;

      // draw all dots with fade-in alpha
      for (var j = 0; j < visible.length; j++) {
        var d = visible[j];
        var col = d.control === "Public" ? COL_PUBLIC : COL_PRIVATE;
        var alpha = Math.round(180 * _animT);

        p.noStroke();
        p.fill(col[0], col[1], col[2], alpha);
        p.circle(sx(d.cost), sy(d.grad), 5);
      }

      // ── Legend ───────────────────────────────────────────────────────
      // position legend inside plot, top-left corner
      const legendWidth = 100;
      const legendX = plotLeft + 14;
      const legendY = plotTop + 20;
      p.textSize(12);
      p.textAlign(p.LEFT, p.CENTER);

      p.noStroke();
      p.fill(COL_PUBLIC[0], COL_PUBLIC[1], COL_PUBLIC[2]);
      p.circle(legendX + 5, legendY, 10);
      p.fill(40);
      p.text("Public", legendX + 14, legendY);

      p.fill(COL_PRIVATE[0], COL_PRIVATE[1], COL_PRIVATE[2]);
      p.circle(legendX + 5, legendY + 20, 10);
      p.fill(40);
      p.text("Private", legendX + 14, legendY + 20);

      // ── Hover crosshairs + tooltip ────────────────────────────────────
      if (hovering) {
        var hd = visible[nearestIdx];
        var hx = sx(hd.cost);
        var hy = sy(hd.grad);
        var hcol = hd.control === "Public" ? COL_PUBLIC : COL_PRIVATE;

        // crosshair
        p.stroke(180);
        p.strokeWeight(1);
        p.drawingContext.setLineDash([4, 4]);
        p.line(hx, plotTop, hx, plotBottom);
        p.line(plotLeft, hy, plotRight, hy);
        p.drawingContext.setLineDash([]);

        // highlighted dot
        p.noStroke();
        p.fill(hcol[0], hcol[1], hcol[2]);
        p.circle(hx, hy, 10);
        p.stroke(255);
        p.strokeWeight(1.5);
        p.noFill();
        p.circle(hx, hy, 14);

        // tooltip box
        var lines = [
          hd.name || "Unknown",
          "Type: " + (hd.control || "—"),
          "Cost: $" + Math.round(hd.cost).toLocaleString(),
          "Grad Rate: " + (hd.grad * 100).toFixed(1) + "%",
        ];

        p.textSize(12);
        var pad = 10;
        var lineH = 16;
        var boxW = 0;
        for (var li = 0; li < lines.length; li++) {
          var tw = p.textWidth(lines[li]);
          if (tw > boxW) boxW = tw;
        }
        boxW += pad * 2;
        var boxH = lines.length * lineH + pad * 2;

        var tx = clamp(mx + 14, plotLeft + 4, plotRight - boxW - 4);
        var ty = clamp(my - boxH - 14, plotTop + 4, plotBottom - boxH - 4);

        p.noStroke();
        p.fill(255);
        p.rect(tx, ty, boxW, boxH, 6);
        p.stroke(0);
        p.strokeWeight(0.8);
        p.noFill();
        p.rect(tx, ty, boxW, boxH, 6);

        p.noStroke();
        p.textAlign(p.LEFT, p.TOP);
        for (var li2 = 0; li2 < lines.length; li2++) {
          p.fill(li2 === 0 ? 0 : 60);
          if (li2 === 0) {
            p.textStyle(p.BOLD);
            p.textSize(12);
          } else {
            p.textStyle(p.NORMAL);
            p.textSize(11);
          }
          p.text(lines[li2], tx + pad, ty + pad + li2 * lineH);
        }
        p.textStyle(p.NORMAL);
        p.textAlign(p.LEFT, p.BASELINE);
      }
    }, // end draw()
  }; // end VizTuitionGrad
})();

// ─────────────────────────────────────────────────────────────────────────────
// SETUP INSTRUCTIONS
// ─────────────────────────────────────────────────────────────────────────────
//
// STEP 1 — Place this file at:
//   js/sketches/viz/viz_tuition_grad.js
//
// STEP 2 — In index.html, load it BEFORE sketch_renderer.js:
//   <script src="js/sketches/viz/viz_tuition_grad.js"></script>
//   <script src="js/sketches/sketch_renderer.js"></script>
//
// STEP 3 — In sketch_renderer.js setData(), add these lines inside the
//   .then(text => { ... }) block, AFTER the existing pts loop, to store
//   the tuition data that this viz reads:
//
//     const ixCost = header.indexOf("Average Cost");
//     const tuitionPts = [];
//     for (const r of dataRows) {
//       const cost = parseFloat(r[ixCost]);
//       const grad = parseFloat(r[ixY]);       // ixY already defined above
//       const pop  = parseFloat(r[ixPop]);     // ixPop already defined above
//       const control = ixControl >= 0 ? (r[ixControl] || "") : "";
//       if (Number.isFinite(cost) && Number.isFinite(grad)) {
//         tuitionPts.push({ cost, grad, pop, name: r[ixName] || "", control });
//       }
//     }
//     manager.tuitionPoints = tuitionPts;
//
// STEP 4 — In sketch_renderer.js draw(), replace the ai===3 and ai===4 block:
//   // BEFORE (remove this):
//   if (ai === 3 || ai === 4) {
//     window.VizScatter.draw(p, manager, ai, progress);
//     return;
//   }
//
//   // AFTER (add this):
//   if (ai === 3 || ai === 4) {
//     window.VizTuitionGrad.draw(p, manager, ai, progress);
//     return;
//   }
//
// STEP 5 — The two sections in index.html are already correct:
//   <section class="step" data-active-index="3">  ← scatter intro
//   <section class="step" data-active-index="4">  ← interpreting the pattern
//
// That's it. The filter panel (type selector + cost slider + trend line toggle)
// is created once and shown/hidden automatically based on activeIndex.
// ─────────────────────────────────────────────────────────────────────────────
