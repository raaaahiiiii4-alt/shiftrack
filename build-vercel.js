#!/usr/bin/env node
// build-vercel.js - Inject API base URL for Vercel deployment
const fs = require('fs');
const path = require('path');

const API_BASE = process.env.VERCEL_API_BASE || process.env.NEXT_PUBLIC_API_BASE || 'https://your-backend.onrender.com/api';

const indexPath = path.join(__dirname, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// Inject API base URL before closing head tag
const injectionScript = `<script>window.__SHIFTTRACK_API_BASE__ = "${API_BASE}";</script>`;

if (html.includes('window.__SHIFTTRACK_API_BASE__')) {
    html = html.replace(/window\.__SHIFTTRACK_API_BASE__\s*=\s*["'][^"']*["']/, `window.__SHIFTTRACK_API_BASE__ = "${API_BASE}"`);
} else {
    html = html.replace('</head>', `${injectionScript}\n</head>`);
}

fs.writeFileSync(indexPath, html);
console.log(`Injected API_BASE: ${API_BASE}`);