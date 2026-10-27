const canvas = document.getElementById('gridCanvas');
const ctx    = canvas.getContext('2d');

const fileInput  = document.getElementById('fileInput');
const gridSizeEl = document.getElementById('gridSize');
const filterEl   = document.getElementById('filter');

const applyBtn    = document.getElementById('applyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const clearBtn    = document.getElementById('clearBtn');

let images = [];

console.log('app.js loaded ✅');

// ---------- Load images ----------
fileInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;

  console.log('Files selected:', files.length);

  let pending = files.length;
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        images.push(img);
        console.log('Image loaded:', img.width + 'x' + img.height, 'Total:', images.length);
        if (--pending === 0) drawGrid();
      };
      img.onerror = () => {
        console.error('Failed to load image');
        if (--pending === 0) drawGrid();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
});

// ---------- Draw the grid ----------
function drawGrid() {
  const n = parseInt(gridSizeEl.value, 10);
  const cellW = canvas.width  / n;
  const cellH = canvas.height / n;

  console.log('drawGrid called. images.length =', images.length, 'grid =', n + 'x' + n);

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const idx = row * n + col;
      const img = images[idx];
      const x = col * cellW;
      const y = row * cellH;

      if (img) {
        ctx.drawImage(img, x, y, cellW, cellH);
      } else {
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 2, y + 2, cellW - 4, cellH - 4);
        ctx.fillStyle = '#475569';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+', x + cellW / 2, y + cellH / 2);
      }
    }
  }
}

// ---------- Apply filter via Java backend ----------
async function applyFilter() {
  const filter = filterEl.value;
  if (filter === 'none' || images.length === 0) {
    drawGrid();
    return;
  }

  const n = parseInt(gridSizeEl.value, 10);
  const cellW = canvas.width  / n;
  const cellH = canvas.height / n;

  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const idx = row * n + col;
      const img = images[idx];
      if (!img) continue;

      const off = document.createElement('canvas');
      off.width  = cellW;
      off.height = cellH;
      const octx = off.getContext('2d');
      octx.drawImage(img, 0, 0, cellW, cellH);

      const dataUrl = off.toDataURL('image/png');
      const b64 = dataUrl.split(',')[1];

      try {
        const resp = await fetch('/api/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: filter + ',' + b64
        });

        if (!resp.ok) throw new Error('Server error ' + resp.status);
        const outB64 = await resp.text();

        const filteredImg = new Image();
        await new Promise(res => {
          filteredImg.onload = res;
          filteredImg.onerror = res;
          filteredImg.src = 'data:image/png;base64,' + outB64;
        });

        ctx.drawImage(filteredImg, col * cellW, row * cellH, cellW, cellH);
      } catch (err) {
        console.warn('Filter failed, drawing original:', err);
        ctx.drawImage(img, col * cellW, row * cellH, cellW, cellH);
      }
    }
  }
}

applyBtn.addEventListener('click', applyFilter);

downloadBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = 'photo-grid.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});

clearBtn.addEventListener('click', () => {
  images = [];
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  fileInput.value = '';
  drawGrid();
});

gridSizeEl.addEventListener('change', drawGrid);

// Initial draw
drawGrid();