function renderTreeHtml(tree) {
  const treeName = tree.treeName || 'Planted Tree';
  const scientific = tree.scientificName ? `<i>${tree.scientificName}</i>` : '';
  const hindi = tree.hindiName ? ` • ${tree.hindiName}` : '';
  const volunteer = tree.plantedBy || 'Green Volunteer';
  const formattedDate = tree.plantedDate
    ? new Date(tree.plantedDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Recently Planted';
  
  const drive = tree.driveName || 'Community Plantation';
  const photo = tree.photoUrl || 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=800&q=80';
  const lat = tree.location?.coordinates?.[1];
  const lng = tree.location?.coordinates?.[0];
  const mapsUrl = (lat && lng) ? `https://www.google.com/maps?q=${lat},${lng}` : null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${treeName} - Planted by ${volunteer} | Vriksha Netra</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: radial-gradient(circle at 50% 0%, #0d2818 0%, #030a06 60%, #010503 100%);
      color: #e8f5e9;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px 16px 40px;
    }
    .container {
      width: 100%;
      max-width: 480px;
      margin: 0 auto;
    }
    .header-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      margin-bottom: 24px;
      padding-top: 10px;
    }
    .header-logo-icon {
      font-size: 26px;
      background: rgba(74, 222, 128, 0.15);
      border: 1px solid rgba(74, 222, 128, 0.4);
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 14px;
    }
    .header-logo-title {
      font-size: 20px;
      font-weight: 900;
      letter-spacing: -0.5px;
      color: #e8f5e9;
    }
    .header-logo-subtitle {
      font-size: 11px;
      color: #4ade80;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .card {
      background: rgba(13, 31, 20, 0.65);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(74, 222, 128, 0.25);
      border-radius: 28px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0,0,0,0.6), 0 0 40px rgba(74, 222, 128, 0.1);
    }
    .photo-wrap {
      position: relative;
      width: 100%;
      height: 250px;
      background: #06160b;
      overflow: hidden;
    }
    .photo-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .verified-badge {
      position: absolute;
      top: 16px;
      right: 16px;
      background: rgba(3, 10, 6, 0.85);
      border: 1px solid #4ade80;
      color: #4ade80;
      font-size: 11px;
      font-weight: 800;
      padding: 6px 12px;
      border-radius: 20px;
      backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .card-body {
      padding: 24px;
    }
    .tree-title-section {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .tree-name {
      font-size: 28px;
      font-weight: 900;
      color: #ffffff;
      letter-spacing: -0.5px;
      line-height: 1.2;
    }
    .tree-scientific {
      font-size: 15px;
      color: rgba(232, 245, 233, 0.65);
      margin-top: 6px;
      font-style: italic;
    }
    .planter-box {
      margin-top: 20px;
      background: rgba(74, 222, 128, 0.08);
      border: 1px solid rgba(74, 222, 128, 0.25);
      border-radius: 18px;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .planter-avatar {
      width: 52px;
      height: 52px;
      border-radius: 16px;
      background: linear-gradient(135deg, #22c55e, #15803d);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
    }
    .planter-info {
      flex: 1;
    }
    .planter-label {
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 800;
      color: #4ade80;
      letter-spacing: 1px;
    }
    .planter-name {
      font-size: 18px;
      font-weight: 800;
      color: #ffffff;
      margin-top: 2px;
    }
    .planter-sub {
      font-size: 12px;
      color: rgba(232, 245, 233, 0.6);
      margin-top: 2px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 20px;
    }
    .info-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 14px;
      padding: 14px;
    }
    .info-card.full-width {
      grid-column: span 2;
    }
    .info-card-label {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #4ade80;
      margin-bottom: 4px;
    }
    .info-card-value {
      font-size: 14px;
      font-weight: 600;
      color: #e8f5e9;
      line-height: 1.4;
    }
    .impact-strip {
      display: flex;
      justify-content: space-around;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 16px;
      padding: 14px 10px;
      margin-top: 20px;
      text-align: center;
    }
    .impact-item-val {
      font-size: 16px;
      font-weight: 900;
      color: #4ade80;
    }
    .impact-item-lbl {
      font-size: 10px;
      color: rgba(232, 245, 233, 0.5);
      margin-top: 2px;
      font-weight: 600;
    }
    .actions-section {
      margin-top: 24px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 15px;
      border-radius: 16px;
      font-size: 15px;
      font-weight: 800;
      text-decoration: none;
      cursor: pointer;
      transition: transform 0.2s, opacity 0.2s;
    }
    .btn:active {
      transform: scale(0.98);
    }
    .btn-primary {
      background: linear-gradient(135deg, #4ade80, #22c55e);
      color: #020906;
      box-shadow: 0 4px 16px rgba(74, 222, 128, 0.35);
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #e8f5e9;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      font-size: 12px;
      color: rgba(232, 245, 233, 0.4);
    }
    .footer strong {
      color: #4ade80;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-logo">
      <div class="header-logo-icon">🌿</div>
      <div>
        <div class="header-logo-title">Vriksha Netra</div>
        <div class="header-logo-subtitle">Official Tree Registry</div>
      </div>
    </div>

    <div class="card">
      <div class="photo-wrap">
        <img src="${photo}" alt="${treeName}">
        <div class="verified-badge">✓ Verified Tree Tag</div>
      </div>

      <div class="card-body">
        <div class="tree-title-section">
          <h1 class="tree-name">${treeName}</h1>
          <div class="tree-scientific">${scientific}${hindi}</div>
        </div>

        <div class="planter-box">
          <div class="planter-avatar">🌱</div>
          <div class="planter-info">
            <div class="planter-label">Planted With Love By</div>
            <div class="planter-name">${volunteer}</div>
            <div class="planter-sub">${formattedDate}</div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-card">
            <div class="info-card-label">Drive / Event</div>
            <div class="info-card-value">${drive}</div>
          </div>
          <div class="info-card">
            <div class="info-card-label">Tree Type</div>
            <div class="info-card-value">${tree.type || 'Native Tree'}</div>
          </div>
          ${tree.family ? `
          <div class="info-card">
            <div class="info-card-label">Family</div>
            <div class="info-card-value">${tree.family}</div>
          </div>` : ''}
          ${mapsUrl ? `
          <div class="info-card">
            <div class="info-card-label">GPS Location</div>
            <div class="info-card-value">
              <a href="${mapsUrl}" target="_blank" style="color: #4ade80; text-decoration: none;">📍 View on Map ↗</a>
            </div>
          </div>` : ''}
          ${tree.uses ? `
          <div class="info-card full-width">
            <div class="info-card-label">Ecological & Cultural Uses</div>
            <div class="info-card-value">${tree.uses}</div>
          </div>` : ''}
        </div>

        <div class="impact-strip">
          <div>
            <div class="impact-item-val">~22 kg/yr</div>
            <div class="impact-item-lbl">CO₂ Absorbed</div>
          </div>
          <div>
            <div class="impact-item-val">100+ L/day</div>
            <div class="impact-item-lbl">Oxygen Output</div>
          </div>
          <div>
            <div class="impact-item-val">50+ Yrs</div>
            <div class="impact-item-lbl">Lifespan</div>
          </div>
        </div>

        <div class="actions-section">
          <a href="vrikshanetra://tree/${tree._id}" class="btn btn-primary">
            📲 Open in Vriksha Netra App
          </a>
          <button onclick="shareTree()" class="btn btn-secondary">
            🔗 Share Tree Tag
          </button>
        </div>
      </div>
    </div>

    <div class="footer">
      Powered by <strong>Vriksha Netra AI</strong> & Akshar Bharati<br>
      Protecting trees with AI & Community Volunteers 🌏
    </div>
  </div>

  <script>
    function shareTree() {
      if (navigator.share) {
        navigator.share({
          title: '${treeName} planted by ${volunteer}',
          text: 'Check out this tree planted by ${volunteer} on Vriksha Netra!',
          url: window.location.href,
        }).catch(() => {});
      } else {
        navigator.clipboard.writeText(window.location.href);
        alert('Tree link copied to clipboard!');
      }
    }
  </script>
</body>
</html>`;
}

module.exports = { renderTreeHtml };
