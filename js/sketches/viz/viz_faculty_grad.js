// js/sketches/viz/viz_faculty_grad.js
(function () {
  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  window.VizFacultyGrad = {
    draw: function (p, manager, ai, progress) {
      p.background(255);

      const pts = manager.collegePoints || [];

      // --- Create filter UI once (top-right) ------------------------------
      if (!manager.__facultyFilterUI) {
        manager.__facultyFilterUI = {};

        const panel = p.createDiv();
        panel.style("position", "absolute");
        // between title and chart, right-aligned to the canvas area
        panel.style("top", "70px");
        panel.style("left", "auto");
        // add a bit of right padding so it doesn't hug the edge
        panel.style("right", "32px");
        panel.style("transform", "none");
        // frameless overlay (no card background/border)
        panel.style("background", "transparent");
        panel.style("padding", "0");
        panel.style("border", "none");
        panel.style("border-radius", "0");
        panel.style("min-width", "0");
        panel.style("max-width", "none");
        panel.style("font-size", "12px");
        panel.parent("vis");
        manager.__facultyFilterUI.panel = panel;

        // Count label (above slider)
        manager.__facultyFilterUI.countLabel = p.createDiv("").parent(panel);
        manager.__facultyFilterUI.countLabel.style("margin-bottom", "4px");
        manager.__facultyFilterUI.countLabel.style("font-size", "11px");
        manager.__facultyFilterUI.countLabel.style("color", "#555");

        // One-line slider + value (no box), under count
        const row = p.createDiv().parent(panel);
        row.style("display", "flex");
        row.style("align-items", "center");
        row.style("gap", "0px");

        const label = p.createSpan("Student size").parent(row);
        label.style("font-weight", "600");
        label.style("color", "#333");

        const maxPop = manager.maxCollegePop || 55000;
        const sliderMin = 2000;
        const sliderMax = Math.max(
          sliderMin + 1000,
          Math.round(maxPop / 500) * 500,
        );

        manager.__facultyFilterUI.sizeSlider = p
          .createSlider(sliderMin, sliderMax, Math.min(15000, sliderMax), 500)
          .parent(row);
        manager.__facultyFilterUI.sizeSlider.style("width", "130px");

        manager.__facultyFilterUI.sizeValueLabel = p.createSpan("").parent(row);
        manager.__facultyFilterUI.sizeValueLabel.style("min-width", "26px");
        manager.__facultyFilterUI.sizeValueLabel.style("text-align", "right");
        manager.__facultyFilterUI.sizeValueLabel.style("font-weight", "600");
        manager.__facultyFilterUI.sizeValueLabel.style("color", "#333");
      }

      // --- Layout ---------------------------------------------------------
      const m = manager.margin || { left: 80, right: 20, top: 100, bottom: 60 };
      const fullW = manager.width || 600;
      const h = manager.height || 520;

      // leave some horizontal space on the right for the filter panel
      const plotRightPadding = 120;
      const left = m.left;
      const top = 120;
      const right = left + fullW - plotRightPadding;
      const bottom = top + h - 170;

      // --- Title (centered over plot) -------------------------------------
      p.noStroke();
      p.fill(0);
      p.textSize(24);
      p.textAlign(p.CENTER, p.BASELINE);
      // center relative to plotting area
      p.text(
        "Faculty Ratio (proxy) vs Graduation Rate",
        (left + right) / 2,
        40,
      );
      p.textAlign(p.LEFT, p.BASELINE);

      // Axes box
      p.noFill();
      p.stroke(0);
      p.rect(left, top, right - left, bottom - top);

      if (!pts.length) {
        p.noStroke();
        p.fill(120);
        p.textSize(14);
        p.text("No data loaded yet…", left + 10, top + 24);
        return;
      }

      // --- Filter logic (student size threshold) ---------------------------
      const ui = manager.__facultyFilterUI;
      const maxSize = ui.sizeSlider
        ? ui.sizeSlider.value()
        : manager.maxCollegePop || 0;

      const filtered = pts.filter((d) => {
        return Number.isFinite(d.pop) && d.pop <= maxSize;
      });

      // Update UI labels
      ui.sizeValueLabel.html(`${Math.round(maxSize / 1000)}k`);
      ui.countLabel.html(`Showing <b>${filtered.length}</b> schools`);

      // --- Scales (0..1 proportions) -------------------------------------
      const xMin = 0,
        xMax = 1;
      const yMin = 0,
        yMax = 1;

      const sx = (x) => p.map(x, xMin, xMax, left, right);
      const sy = (y) => p.map(y, yMin, yMax, bottom, top);

      // --- Grid + ticks ---------------------------------------------------
      p.stroke(220);
      p.strokeWeight(1);
      for (let t = 0; t <= 1.0001; t += 0.25) {
        p.line(sx(t), top, sx(t), bottom);
        p.line(left, sy(t), right, sy(t));
      }

      p.noStroke();
      p.fill(0);
      p.textSize(12);
      for (let t = 0; t <= 1.0001; t += 0.25) {
        p.text(t.toFixed(2), sx(t) - 12, bottom + 18);
        p.text(t.toFixed(2), left - 45, sy(t) + 4);
      }

      // Axis labels
      p.textSize(13);
      p.fill(0);
      p.text("% Full-time Faculty", (left + right) / 2 - 55, bottom + 45);
      p.push();
      p.translate(left - 65, (top + bottom) / 2 + 60);
      p.rotate(-Math.PI / 2);
      p.text("Completion Rate (150% time)", 0, 0);
      p.pop();

      // --- Hover detection (on filtered points) ---------------------------
      const mx = p.mouseX,
        my = p.mouseY;
      let nearestIdx = -1;
      let nearestDist = 1e9;

      for (let i = 0; i < filtered.length; i++) {
        const px = sx(filtered[i].x);
        const py = sy(filtered[i].y);
        const d = Math.hypot(mx - px, my - py);
        if (d < nearestDist) {
          nearestDist = d;
          nearestIdx = i;
        }
      }

      const hoverRadius = 10;
      const hovering = nearestIdx !== -1 && nearestDist <= hoverRadius;

      // --- Draw points (color by Public / Private) ------------------------
      for (const d of filtered) {
        const isPublic = (d.control || "").toLowerCase() === "public";
        if (isPublic) {
          p.fill(66, 133, 244, 190); // blue
        } else {
          p.fill(219, 152, 55, 190); // orange/yellow
        }
        p.noStroke();
        p.circle(sx(d.x), sy(d.y), 5);
      }

      // Legend (top-left inside plot)
      const legendX = left + 14;
      const legendY = top + 20;
      p.textSize(12);
      p.textAlign(p.LEFT, p.CENTER);

      p.noStroke();
      p.fill(66, 133, 244);
      p.circle(legendX + 5, legendY, 10);
      p.fill(40);
      p.text("Public", legendX + 14, legendY);

      p.fill(219, 152, 55);
      p.circle(legendX + 5, legendY + 20, 10);
      p.fill(40);
      p.text("Private", legendX + 14, legendY + 20);

      // --- Highlight + tooltip -------------------------------------------
      if (hovering) {
        const d = filtered[nearestIdx];
        const px = sx(d.x);
        const py = sy(d.y);

        const isPublic = (d.control || "").toLowerCase() === "public";
        if (isPublic) {
          p.fill(66, 133, 244);
        } else {
          p.fill(219, 152, 55);
        }
        p.circle(px, py, 9);

        const name = (d.name || "Unknown school").slice(0, 45);
        const line1 = name;
        const line2 = `Undergrad pop: ${Math.round(d.pop).toLocaleString()}`;
        const line3 = `Type: ${d.control || "Unknown"}`;
        const line4 = `Full-time faculty: ${(d.x * 100).toFixed(1)}%`;
        const line5 = `Completion: ${(d.y * 100).toFixed(1)}%`;

        p.textSize(12);
        const pad = 10;
        const boxW =
          Math.max(
            p.textWidth(line1),
            p.textWidth(line2),
            p.textWidth(line3),
            p.textWidth(line4),
            p.textWidth(line5),
          ) +
          pad * 2;
        const boxH = 5 * 16 + pad * 2;

        let tx = clamp(mx + 12, left + 6, right - boxW - 6);
        let ty = clamp(my - boxH - 12, top + 6, bottom - boxH - 6);

        p.noStroke();
        p.fill(255);
        p.rect(tx, ty, boxW, boxH, 6);

        p.stroke(0);
        p.noFill();
        p.rect(tx, ty, boxW, boxH, 6);

        p.noStroke();
        p.fill(0);
        p.text(line1, tx + pad, ty + pad + 12);
        p.text(line2, tx + pad, ty + pad + 28);
        p.text(line3, tx + pad, ty + pad + 44);
        p.text(line4, tx + pad, ty + pad + 60);
        p.text(line5, tx + pad, ty + pad + 76);
      }
    },
  };
})();
