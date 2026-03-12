// viz_title.js
// Draw title-style screens for early active indexes (0 and 1)
(function () {
    window.VizTitle = {
        draw: function (p, manager, ai, progress) {
            var cx = (manager.offsetX || 0) + (manager.width || 600) / 2;
            var cy = (manager.offsetY || 0) + (manager.height || 520) / 3;
            var leftOffset = ai === 0 ? 38 : 0;
            var cxAdj = cx - leftOffset;
            p.push();
            p.noStroke();
            p.fill(255);
            var w = 525;
            var h = 150;
            p.rect(cxAdj - w / 2, cy - h / 2, w, h, 8);

            p.fill(0);
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(40);
            var titleText = ai === 0 ? 'What Shapes College Graduation Outcomes?' : 'Final Project';
            p.text(titleText, cxAdj - w / 2, cy - h / 2, cxAdj + w / 2, cy + h / 2);
            p.pop();
        }
    };
})();
