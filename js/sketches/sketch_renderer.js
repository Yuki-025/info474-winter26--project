// js/sketches/sketch_renderer.js
(function () {
  function parseCSV(text) {
    const rows = [];
    let row = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const next = text[i + 1];

      if (c === '"' && inQuotes && next === '"') {
        cur += '"';
        i++;
        continue;
      }
      if (c === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (c === "," && !inQuotes) {
        row.push(cur);
        cur = "";
        continue;
      }

      if ((c === "\n" || c === "\r") && !inQuotes) {
        if (c === "\r" && next === "\n") i++;
        row.push(cur);
        cur = "";
        if (row.length > 1 || row[0] !== "") rows.push(row);
        row = [];
        continue;
      }
      cur += c;
    }
    row.push(cur);
    if (row.length > 1 || row[0] !== "") rows.push(row);
    return rows;
  }

  window.Renderer = {
    setData: function (manager) {
      manager.offsetX = (manager.margin && manager.margin.left) || 20;
      manager.offsetY = (manager.margin && manager.margin.top) || 0;

      return fetch("data/colleges.csv")
        .then((r) => r.text())
        .then((text) => {
          const rows = parseCSV(text.trim());
          const header = rows[0];
          const dataRows = rows.slice(1);

          // Existing column indices (faculty viz — unchanged)
          const ixX = header.indexOf("% Full-time Faculty");
          const ixY = header.indexOf("Completion Rate 150% time");
          const ixName = header.indexOf("Name");
          const ixPop = header.indexOf("Undergrad Population");
          const ixControl = header.indexOf("Control");

          // NEW: tuition column
          const ixCost = header.indexOf("Average Cost");

          const pts = [];
          const tuitionPts = [];
          let maxPop = 0;

          for (const r of dataRows) {
            const x = parseFloat(r[ixX]);
            const y = parseFloat(r[ixY]);
            const pop = parseFloat(r[ixPop]);
            const control = ixControl >= 0 ? r[ixControl] || "" : "";
            const name = r[ixName] || "";

            if (
              Number.isFinite(x) &&
              Number.isFinite(y) &&
              Number.isFinite(pop)
            ) {
              if (pop > maxPop) maxPop = pop;
              pts.push({ x, y, pop, name, control });
            }

            // NEW: tuition points
            const cost = parseFloat(r[ixCost]);
            if (Number.isFinite(cost) && Number.isFinite(y)) {
              tuitionPts.push({ cost, grad: y, pop, name, control });
            }
          }

          manager.collegePoints = pts;
          manager.tuitionPoints = tuitionPts; // NEW — read by VizTuitionGrad
          manager.maxCollegePop = maxPop;

          console.log("Loaded faculty points:", pts.length);
          console.log(
            "Loaded tuition points:",
            tuitionPts.length,
            "sample:",
            tuitionPts[0],
          );
          return manager.collegePoints;
        });
    },

    draw: function (p, manager, ai, progress) {
      // Toggle faculty filter UI (only on ai 5 and 6)
      if (manager.__facultyFilterUI && manager.__facultyFilterUI.panel) {
        if (ai === 5 || ai === 6) {
          manager.__facultyFilterUI.panel.show();
        } else {
          manager.__facultyFilterUI.panel.hide();
        }
      }

      // Toggle tuition filter UI (only on ai 3 and 4)
      if (manager.__tuitionFilterUI && manager.__tuitionFilterUI.panel) {
        if (ai === 3 || ai === 4) {
          manager.__tuitionFilterUI.panel.show();
        } else {
          manager.__tuitionFilterUI.panel.hide();
        }
      }

      if (ai === 0 || ai === 1 || ai === 2) {
        window.VizTitle.draw(p, manager, ai, progress);
        return;
      }

      // CHANGED: was VizScatter, now VizTuitionGrad
      if (ai === 3 || ai === 4) {
        window.VizTuitionGrad.draw(p, manager, ai, progress);
        return;
      }

      if (ai === 5 || ai === 6) {
        window.VizFacultyGrad.draw(p, manager, ai, progress);
        return;
      }

      if (ai === 7) {
        window.VizBar.draw(p, manager, ai, progress);
        return;
      }
    },
  };
})();
