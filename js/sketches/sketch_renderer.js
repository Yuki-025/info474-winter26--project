// js/sketches/sketch_renderer.js
(function () {
  function parseCSV(text) {
    const rows = [];
    let row = [], cur = '', inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i], next = text[i + 1];
      if (c === '"' && inQuotes && next === '"') { cur += '"'; i++; continue; }
      if (c === '"') { inQuotes = !inQuotes; continue; }
      if (c === ',' && !inQuotes) { row.push(cur); cur = ''; continue; }
      if ((c === '\n' || c === '\r') && !inQuotes) {
        if (c === '\r' && next === '\n') i++;
        row.push(cur); cur = '';
        if (row.length > 1 || row[0] !== '') rows.push(row);
        row = [];
        continue;
      }
      cur += c;
    }
    row.push(cur);
    if (row.length > 1 || row[0] !== '') rows.push(row);
    return rows;
  }

  window.Renderer = {
    setData: function (manager) {
      manager.offsetX = (manager.margin && manager.margin.left) || 20;
      manager.offsetY = (manager.margin && manager.margin.top)  || 0;

      return fetch('data/colleges.csv')
        .then(r => r.text())
        .then(text => {
          const rows     = parseCSV(text.trim());
          const header   = rows[0];
          const dataRows = rows.slice(1);

          const ix = col => header.indexOf(col);
          const ixFaculty = ix('% Full-time Faculty');
          const ixGrad    = ix('Completion Rate 150% time');
          const ixName    = ix('Name');
          const ixPop     = ix('Undergrad Population');
          const ixControl = ix('Control');
          const ixCost    = ix('Average Cost');
          const ixAdm     = ix('Admission Rate');
          const ixRegion  = ix('Region');

          const collegePts   = [];
          const tuitionPts   = [];
          const admissionPts = [];
          const regionMap    = {};
          let maxPop = 0;

          for (const r of dataRows) {
            const y       = parseFloat(r[ixGrad]);
            const x       = parseFloat(r[ixFaculty]);
            const pop     = parseFloat(r[ixPop]);
            const cost    = parseFloat(r[ixCost]);
            const adm     = parseFloat(r[ixAdm]);
            const control = ixControl >= 0 ? (r[ixControl] || '') : '';
            const name    = r[ixName]   || '';
            const region  = ixRegion  >= 0 ? (r[ixRegion]  || '') : '';

            if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(pop)) {
              if (pop > maxPop) maxPop = pop;
              collegePts.push({ x, y, pop, name, control });
            }

            if (Number.isFinite(cost) && Number.isFinite(y)) {
              tuitionPts.push({ cost, grad: y, pop, name, control, region });
              if (region) {
                if (!regionMap[region]) regionMap[region] = [];
                regionMap[region].push(y);
              }
            }

            if (Number.isFinite(adm) && Number.isFinite(y)) {
              admissionPts.push({ admission: adm, grad: y, name, control });
            }
          }

          const regionGradData = Object.keys(regionMap)
            .filter(reg => regionMap[reg].length >= 5)
            .map(reg => {
              const vals = regionMap[reg];
              return { region: reg, avg: vals.reduce((a, b) => a + b, 0) / vals.length, count: vals.length };
            });

          manager.collegePoints   = collegePts;
          manager.tuitionPoints   = tuitionPts;
          manager.admissionPoints = admissionPts;
          manager.regionGradData  = regionGradData;
          manager.maxCollegePop   = maxPop;
          manager.allRegions      = Object.keys(regionMap).filter(Boolean).sort();

          console.log('Loaded faculty pts:', collegePts.length);
          console.log('Loaded tuition pts:', tuitionPts.length);
          console.log('Loaded admission pts:', admissionPts.length);

          return manager.collegePoints;
        });
    },

    draw: function (p, manager, ai, progress) {
      if (manager.__publicPrivateUI && manager.__publicPrivateUI.panel) {
        if (ai === 1 || ai === 2) manager.__publicPrivateUI.panel.show();
        else                       manager.__publicPrivateUI.panel.hide();
      }
      if (manager.__tuitionFilterUI && manager.__tuitionFilterUI.panel) {
        if (ai === 3 || ai === 4) manager.__tuitionFilterUI.panel.show();
        else                       manager.__tuitionFilterUI.panel.hide();
      }
      if (manager.__facultyFilterUI && manager.__facultyFilterUI.panel) {
        if (ai === 5) manager.__facultyFilterUI.panel.show();
        else                       manager.__facultyFilterUI.panel.hide();
      }

      if (ai === 0)             { window.VizTitle.draw(p, manager, ai, progress);         return; }
      if (ai === 1 || ai === 2) { window.VizPublicPrivate.draw(p, manager, ai, progress); return; }
      if (ai === 3 || ai === 4) { window.VizTuitionGrad.draw(p, manager, ai, progress);   return; }
      if (ai === 5)             { window.VizFacultyGrad.draw(p, manager, ai, progress);   return; }
      if (ai === 6)             { window.VizAdmission.draw(p, manager, ai, progress);     return; }
      if (ai === 7)             { window.VizBar.draw(p, manager, ai, progress);           return; }
      if (ai === 8)             { window.VizSummary.draw(p, manager, ai, progress);       return; }
    }
  };
})();