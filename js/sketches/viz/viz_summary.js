// js/sketches/viz/viz_summary.js
(function () {
  // draw a row of n dots using a light→dark gradient between two colors
  function dotRow(p, x, y, n, r, cStart, cEnd) {
    for (let i = 0; i < n; i++) {
      const t = n <= 1 ? 1 : i / (n - 1);
      const c = p.lerpColor(cStart, cEnd, t);
      p.noStroke();
      p.fill(c);
      p.circle(x + i * (r * 2 + 8), y, r * 2);
    }
  }

  window.VizSummary = {
    draw: function (p, manager, ai, progress) {
      p.background(255);

      const fullW = manager.width || 600;
      const fullH = manager.height || 520;
      const left = (manager.margin && manager.margin.left) || 80;
      const top = 90;
      const right = left + fullW - 40;
      const bottom = top + fullH - 130;

      // Title + subtitle
      p.noStroke();
      p.fill(0);
      p.textAlign(p.CENTER, p.BASELINE);
      p.textSize(22);
      p.text("Factors Related to Graduation Outcomes", (left + right) / 2, 36);

      p.textSize(13);
      p.fill(80);
      p.text(
        "No single factor fully explains why some colleges graduate far more students than others.",
        (left + right) / 2,
        58
      );
      p.text(
        "But several factors show meaningful relationships.",
        (left + right) / 2,
        76
      );
      p.textAlign(p.LEFT, p.BASELINE);

      // Layout for table
      const col1X = left + 10;
      const col2X = left + Math.min(340, (right - left) * 0.58);
      const headerY = top + 16;

      // Header
      p.textSize(15);
      p.fill(0);
      p.text("Factor", col1X, headerY);
      p.text("Relationship", col2X, headerY);

      // Divider line under header
      const tableTop = headerY + 8;
      p.stroke(230);
      p.strokeWeight(1);
      p.line(left, tableTop, right, tableTop);

      // Colors for gradients
      const blueLight = p.color(144, 180, 222);
      const blueDark = p.color(46, 111, 173);
      const tealLight = p.color(120, 200, 200);
      const tealDark = p.color(61, 189, 168);
      const greenLight = p.color(170, 200, 120);
      const greenDark = p.color(120, 160, 70);
      const orangeLight = p.color(244, 183, 120);
      const orangeDark = p.color(219, 132, 55);

      // Rows: labels + how many dots + gradient colors
      const rows = [
        { label: "Institution type", dots: 2, c0: blueLight, c1: blueDark },
        { label: "Tuition / Cost", dots: 3, c0: tealLight, c1: tealDark },
        { label: "Faculty resources", dots: 1, c0: blueLight, c1: blueDark },
        {
          label: "Admission selectivity",
          dots: 4,
          c0: orangeLight,
          c1: orangeDark,
        },
        { label: "Region", dots: 2, c0: greenLight, c1: greenDark },
      ];

      p.textSize(14);
      const rowStartY = tableTop + 32;
      const rowGap = 38;
      const dotX = col2X;
      const dotR = 8;

      for (let i = 0; i < rows.length; i++) {
        const y = rowStartY + i * rowGap;
        // row separator
        p.stroke(240);
        p.line(left, y + 10, right, y + 10);

        p.noStroke();
        p.fill(0);
        p.text(rows[i].label, col1X, y);
        dotRow(p, dotX, y - 4, rows[i].dots, dotR, rows[i].c0, rows[i].c1);
      }

      // Vertical divider line aligned with table rows (not full height)
      const tableBottom = rowStartY + rows.length * rowGap - rowGap / 2;
      p.stroke(230);
      p.strokeWeight(1);
      p.line(col2X - 26, tableTop, col2X - 26, tableBottom);

      // Strength legend (colored dots)
      const legendY = rowStartY + rows.length * rowGap + 10;
      p.textSize(12);
      p.noStroke();

      // weak (blue)
      p.fill(blueDark);
      p.circle(col1X + 12, legendY - 4, 10);
      p.fill(40);
      p.text("weak", col1X + 24, legendY);

      // moderate (teal)
      p.fill(tealDark);
      p.circle(col1X + 90, legendY - 4, 10);
      p.fill(40);
      p.text("moderate", col1X + 102, legendY);

      // strong (green)
      p.fill(greenDark);
      p.circle(col1X + 190, legendY - 4, 10);
      p.fill(40);
      p.text("strong", col1X + 202, legendY);

      // strongest (orange)
      p.fill(orangeDark);
      p.circle(col1X + 270, legendY - 4, 10);
      p.fill(40);
      p.text("strongest", col1X + 282, legendY);

      // Note (important) — place close to legend
      const noteY = Math.min(legendY + 32, fullH - 30);
      p.textSize(11);
      p.fill(70);
      p.text(
        "Note: Dot counts represent the relative strength of observed relationships in the data,",
        left + 10,
        noteY
      );
      p.text(
        "based on visual patterns in the analysis rather than causal inference.",
        left + 10,
        noteY + 16
      );
    },
  };
})();

