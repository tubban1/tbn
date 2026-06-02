const fs = require('fs');
const file = fs.readFileSync('pages/multimage.js', 'utf8');

const additionalCss = `
        .site-header { background-color: rgba(15, 23, 42, 0.8); backdrop-filter: blur(12px); border-bottom: 1px solid #334155; position: sticky; top: 0; z-index: 100; margin-bottom: 2rem;}
        .header-container { max-width: 1400px; margin: 0 auto; padding: 0.85rem 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
        .logo-title { font-size: 1.5rem; font-weight: 700; margin: 0; background: linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .user-section { display: flex; align-items: center; }
        .login-form { display: flex; gap: 0.5rem; }
        .login-input { background-color: rgba(15, 23, 42, 0.6); border: 1px solid #334155; border-radius: 8px; padding: 0.5rem 0.85rem; color: #fff; }
        .btn-login { background-color: #0d9488; color: white; border: none; border-radius: 8px; padding: 0.5rem 1rem; cursor: pointer; }
        .user-badge { display: flex; align-items: center; gap: 0.75rem; background: rgba(13, 148, 136, 0.08); border: 1px solid rgba(13, 148, 136, 0.3); border-radius: 8px; padding: 0.4rem 0.85rem; font-size: 0.85rem; }
        .user-email { font-weight: 500; color: #2dd4bf; }
        .user-credits { color: #f8fafc; border-left: 1px solid rgba(255, 255, 255, 0.15); padding-left: 0.75rem; }
        .btn-recharge { background-color: #f59e0b; color: #0b1120; border: none; border-radius: 6px; padding: 0.25rem 0.65rem; font-weight: 700; cursor: pointer; }
        .btn-logout { background: transparent; border: none; color: #94a3b8; cursor: pointer; }
        .gallery-section { margin-top: 3rem; }
        .gallery-header { margin-bottom: 2rem; }
        .gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; }
        .gallery-card { background: #1e293b; border-radius: 12px; overflow: hidden; border: 1px solid #334155; transition: transform 0.2s; }
        .gallery-card:hover { transform: translateY(-4px); }
        .gallery-img-container { width: 100%; aspect-ratio: 1; overflow: hidden; background: #0f172a; }
        .gallery-img { width: 100%; height: 100%; object-fit: cover; }
        .gallery-card-info { padding: 1rem; }
        .gallery-style-badge { background: rgba(45,212,191,0.1); color: #2dd4bf; padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; }
        .gallery-prompt-text { font-size: 0.85rem; color: #cbd5e1; margin: 0.75rem 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .gallery-card-actions { display: flex; gap: 0.5rem; margin-top: 1rem; }
        .gallery-action-link, .gallery-action-btn { flex: 1; text-align: center; background: rgba(255,255,255,0.05); color: #94a3b8; border: none; padding: 0.5rem; border-radius: 6px; font-size: 0.8rem; cursor: pointer; text-decoration: none; }
        .gallery-action-link:hover, .gallery-action-btn:hover { background: rgba(255,255,255,0.1); color: white; }
`;

let newFile = file.replace('</style>', additionalCss + '\n      </style>');
fs.writeFileSync('pages/multimage.js', newFile);
console.log('patched multimage.js CSS successfully');
