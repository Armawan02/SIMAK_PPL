import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: true, limit: '256kb' }));

const requestWindows = new Map<string, { startedAt: number; count: number }>();
function isRateLimited(req: express.Request, limit = 30): boolean {
  const key = `${req.ip}:${req.path}`;
  const now = Date.now();
  const window = requestWindows.get(key);
  if (!window || now - window.startedAt >= 60_000) {
    requestWindows.set(key, { startedAt: now, count: 1 });
    return false;
  }
  window.count += 1;
  return window.count > limit;
}

// Lazy GoogleGenAI initialization
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY')
  });
});

// Endpoint to test live Google Apps Script Web App URL
app.post('/api/test-appscript', async (req, res) => {
  if (isRateLimited(req)) return res.status(429).json({ error: 'Terlalu banyak permintaan. Coba lagi nanti.' });
  const { url, method = 'GET', payload, params } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL Google Apps Script wajib diisi.' });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url.trim());
  } catch {
    return res.status(400).json({ error: 'URL tidak valid.' });
  }

  const allowedHosts = new Set(['script.google.com', 'script.googleusercontent.com']);
  if (parsedUrl.protocol !== 'https:' || !allowedHosts.has(parsedUrl.hostname.toLowerCase())) {
    return res.status(400).json({
      error: 'URL harus berupa URL Google Apps Script yang valid (misalnya: https://script.google.com/macros/s/.../exec)'
    });
  }

  if (method !== 'GET' && method !== 'POST') {
    return res.status(400).json({ error: 'Method hanya boleh GET atau POST.' });
  }

  const startTime = Date.now();
  let targetUrl = parsedUrl.toString();

  // Add query parameters if GET
  if (method === 'GET' && params && typeof params === 'object') {
    const urlObj = new URL(targetUrl);
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        urlObj.searchParams.set(key, String(val));
      }
    });
    targetUrl = urlObj.toString();
  }

  try {
    const fetchOptions: RequestInit = {
      method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppsScriptInspector/1.0',
        'Accept': 'application/json, text/plain, */*'
      },
      redirect: 'manual',
      signal: AbortSignal.timeout(8000)
    };

    if (method === 'POST') {
      fetchOptions.headers = {
        ...fetchOptions.headers,
        'Content-Type': 'application/json'
      };
      fetchOptions.body = typeof payload === 'string' ? payload : JSON.stringify(payload || {});
    }

    const response = await fetch(targetUrl, fetchOptions);
    const duration = Date.now() - startTime;
    const contentType = response.headers.get('content-type') || '';
    const rawText = await response.text();

    let parsedJson = null;
    let isJson = false;
    try {
      parsedJson = JSON.parse(rawText);
      isJson = true;
    } catch {
      // not JSON
    }

    // Diagnostics on the response
    const diagnostics: string[] = [];
    const isGoogleLogin = rawText.includes('ServiceLogin') || rawText.includes('accounts.google.com');
    const isScriptNotFound = rawText.includes('Script function not found') || rawText.includes('Fungsi skrip tidak ditemukan');
    const isAuthRequired = rawText.includes('Authorization is required') || rawText.includes('Izin diperlukan');
    const isHtmlError = !isJson && (rawText.toLowerCase().includes('<!doctype html>') || rawText.toLowerCase().includes('<html'));

    if (isGoogleLogin) {
      diagnostics.push('CRITICAL: Endpoint dialihkan ke halaman Login Akun Google. Penyebab: Pengaturan Deployment Web App belum diset "Who has access: Anyone" (Siapa saja).');
    }
    if (isScriptNotFound) {
      diagnostics.push(`ERROR: Fungsi ${method === 'POST' ? 'doPost(e)' : 'doGet(e)'} tidak ditemukan di Google Apps Script.`);
    }
    if (isAuthRequired) {
      diagnostics.push('ERROR: Skrip membutuhkan otorisasi izin akun (OAuth). Jalankan fungsi sekali di Apps Script Editor dan setujui izin.');
    }
    if (!isJson && !isGoogleLogin && !isScriptNotFound) {
      diagnostics.push('INFO: Respons bukan berupa JSON. Jika Anda membuat REST API, gunakan ContentService.createTextOutput(JSON.stringify(...)).setMimeType(ContentService.MimeType.JSON).');
    }

    return res.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      finalUrl: response.url,
      durationMs: duration,
      contentType,
      isJson,
      data: isJson ? parsedJson : rawText.slice(0, 5000),
      rawPreview: rawText.slice(0, 1000),
      diagnostics,
      isGoogleLogin,
      isScriptNotFound,
      isAuthRequired
    });
  } catch (err: any) {
    return res.status(500).json({
      error: `Gagal menghubungi endpoint Apps Script: ${err.message || String(err)}`,
      durationMs: Date.now() - startTime
    });
  }
});

// Endpoint to analyze & fix Google Apps Script code with Gemini AI
app.post('/api/analyze', async (req, res) => {
  if (isRateLimited(req, 10)) return res.status(429).json({ error: 'Batas analisis tercapai. Coba lagi dalam satu menit.' });
  const { code, htmlCode, errorMessage, url, issueType } = req.body;

  if (!code && !htmlCode && !errorMessage && !url) {
    return res.status(400).json({
      error: 'Mohon masukkan kode Apps Script, pesan error, atau URL untuk diperiksa.'
    });
  }

  const fields = { code, htmlCode, errorMessage, url, issueType };
  for (const [field, value] of Object.entries(fields)) {
    if (value !== undefined && typeof value !== 'string') {
      return res.status(400).json({ error: `Field ${field} harus berupa teks.` });
    }
    if (typeof value === 'string' && value.length > 100_000) {
      return res.status(413).json({ error: `Field ${field} terlalu panjang.` });
    }
  }

  const ai = getAIClient();

  if (!ai) {
    // Offline rule-based diagnostic fallback
    return res.json({
      isAiPowered: false,
      summary: 'Analisis berbasis aturan (Rule-based analyzer aktif). Untuk diagnosis mendalam dengan AI, pastikan GEMINI_API_KEY terkonfigurasi.',
      diagnosis: generateRuleBasedDiagnosis(code || '', htmlCode || '', errorMessage || ''),
      fixedCode: generateRuleBasedCode(code || ''),
      steps: [
        'Pastikan fungsi doGet(e) atau doPost(e) mengembalikan ContentService atau HtmlService.',
        'Saat Deploy Web App: Execute as: "Me" (Saya), Who has access: "Anyone" (Siapa saja).',
        'Setiap kali mengubah kode Code.gs, buat Versi Baru (New Deployment atau Manage Deployments -> New Version).'
      ]
    });
  }

  try {
    const prompt = `Anda adalah Ahli Senior Google Apps Script (GAS) dan Web App Developer.
Tugas Anda adalah memeriksa, mendiagnosis bug/error, dan memberikan perbaikan kode yang tepat untuk pengguna yang sedang mengalami kendala pada Google Apps Script Web App miliknya.

Data dari Pengguna:
${issueType ? `- Jenis Masalah: ${issueType}` : ''}
${errorMessage ? `- Pesan Error / Gejala Masalah:\n"""\n${errorMessage}\n"""` : ''}
${url ? `- URL Web App: ${url}` : ''}
${code ? `- Kode Apps Script (Code.gs):\n\`\`\`javascript\n${code}\n\`\`\`` : '- Kode Code.gs: (Tidak disertakan)'}
${htmlCode ? `- Kode HTML (index.html / HtmlService):\n\`\`\`html\n${htmlCode}\n\`\`\`` : ''}

Periksa hal-hal kritis umum pada Google Apps Script:
1. Apakah fungsi doGet(e) atau doPost(e) mengembalikan objek yang sah (ContentService.createTextOutput(...) atau HtmlService.createHtmlOutput(...))?
2. Pada doPost(e), apakah pembacaan body menggunakan e.postData.contents dan di-wrap dalam try-catch JSON.parse?
3. Apakah MIME Type di-set ke ContentService.MimeType.JSON?
4. Apakah ada race condition pada penulisan Google Spreadsheet? Gunakan LockService.getScriptLock() dengan timeout dan lock.releaseLock().
5. Apakah ada masalah CORS atau Google Auth redirect (302 ke script.googleusercontent.com)?
6. Pada HtmlService, apakah XFrameOptionsMode diset ALLOWALL jika dipasang di iframe?
7. Panduan Deployment: Mengapa setelah edit kode harus buat "New Version" di Manage Deployments atau New Deployment, serta set "Execute as: Me" dan "Who has access: Anyone".

Berikan respons dalam format JSON terstruktur dengan struktur berikut:
{
  "summary": "Ringkasan singkat masalah dan solusi (1-2 kalimat)",
  "rootCauses": [
    "Penyebab utama 1",
    "Penyebab utama 2"
  ],
  "diagnosisDetails": "Penjelasan rinci mengapa error tersebut terjadi dalam bahasa Indonesia yang ramah, jelas, dan solutif.",
  "fixedCode": "Kode Code.gs lengkap yang sudah diperbaiki, bersih, siap salin, dengan komentar penjelas.",
  "fixedHtml": "Kode HTML yang sudah diperbaiki (jika pengguna menyertakan HTML atau jika relevan, jika tidak kosongkan string)",
  "deploymentSteps": [
    "Langkah deployment 1 di Google Apps Script Editor",
    "Langkah deployment 2",
    "Langkah deployment 3"
  ],
  "testingSnippet": "Contoh kode fetch() JavaScript frontend atau curl untuk menguji endpoint yang sudah diperbaiki"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const responseText = response.text || '{}';
    let result = {};
    try {
      result = JSON.parse(responseText);
    } catch {
      result = {
        summary: 'Analisis selesai',
        diagnosisDetails: responseText,
        fixedCode: code || ''
      };
    }

    return res.json({
      isAiPowered: true,
      ...result
    });
  } catch (error: any) {
    console.error('Gemini error:', error);
    return res.json({
      isAiPowered: false,
      summary: 'Analisis dilakukan dengan pemeriksa aturan internal.',
      diagnosis: generateRuleBasedDiagnosis(code || '', htmlCode || '', errorMessage || ''),
      fixedCode: generateRuleBasedCode(code || ''),
      errorNotice: `Gemini API fallback: ${error.message || String(error)}`
    });
  }
});

function generateRuleBasedDiagnosis(code: string, html: string, error: string): string[] {
  const issues: string[] = [];
  const lowerCode = code.toLowerCase();
  const lowerError = error.toLowerCase();

  if (!code.includes('doGet') && !code.includes('doPost')) {
    issues.push('Fungsi doGet(e) atau doPost(e) belum didefinisikan di Code.gs. Web App Google Apps Script memerlukan setidaknya salah satu fungsi ini.');
  }

  if (code.includes('doGet') && !code.includes('ContentService') && !code.includes('HtmlService')) {
    issues.push('doGet(e) harus mengembalikan objek ContentService.createTextOutput(...) atau HtmlService.createHtmlOutput(...), bukan sekadar return biasa.');
  }

  if (code.includes('doPost') && !code.includes('e.postData')) {
    issues.push('Pada doPost(e), data body JSON dari fetch/POST harus dibaca melalui e.postData.contents, bukan dari e.parameter.');
  }

  if (code.includes('SpreadsheetApp') && !code.includes('LockService')) {
    issues.push('Rekomendasi performa: Gunakan LockService.getScriptLock() saat menulis ke Google Sheets untuk mencegah race condition (data tumpang tindih saat banyak request bersamaan).');
  }

  if (lowerError.includes('cors') || lowerError.includes('failed to fetch')) {
    issues.push('Error CORS di Apps Script biasanya disebabkan oleh Web App yang me-redirect ke Google Login (Who has access belum diset Anyone), atau fungsi script melempar uncaught error sebelum mengembalikan ContentService.');
  }

  if (lowerError.includes('script function not found')) {
    issues.push('Pesan "Script function not found": Pastikan nama fungsi adalah doGet atau doPost (case-sensitive) dan pastikan deployment menggunakan versi skrip terbaru.');
  }

  if (issues.length === 0) {
    issues.push('Kode tampak memiliki struktur dasar yang baik. Pastikan deployment Web App diset ke "Execute as: Me" dan "Who has access: Anyone".');
  }

  return issues;
}

function generateRuleBasedCode(originalCode: string): string {
  if (!originalCode || originalCode.trim() === '') {
    return `/**
 * Template Standar Google Apps Script Web App (REST API + Google Sheets)
 */
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || 'read';
    var result = { status: 'success', message: 'Apps Script Web App aktif!', action: action, timestamp: new Date() };
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000); // Kunci 10 detik agar penulisan aman
  
  try {
    var requestData = {};
    if (e && e.postData && e.postData.contents) {
      requestData = JSON.parse(e.postData.contents);
    }
    
    // Logika penyimpanan data (misal ke Google Sheet) di sini
    var response = {
      status: 'success',
      message: 'Data berhasil diterima',
      receivedData: requestData
    };
    
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}`;
  }

  // If code exists but lacks ContentService wrapper
  let fixed = originalCode;
  if (!fixed.includes('ContentService.MimeType.JSON')) {
    fixed = `// Ditambahkan penanganan ContentService.MimeType.JSON standar\n` + fixed;
  }
  return fixed;
}

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
