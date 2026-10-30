'use strict';

const http = require('node:http');
const os = require('node:os');
<<<<<<< HEAD
const crypto = require('node:crypto');

const PORT = Number(process.env.ALUMHACKS_PORT || 8787);
const GINJER_URL = String(process.env.GINJER_GRAPHQL_URL || 'https://devapi.ginjer.io/graphql').replace(/\/+$/, '');
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const sessions = new Map();
const SIGN_IN_QUERY = `query SignIn($auth: SignInInput!) { signIn(auth: $auth) { _id firstName lastName emailId token defaultAccount organisationId } }`;
=======

const PORT = Number(process.env.ALUMHACKS_PORT || 8787);
const GINJER_URL = String(process.env.GINJER_GRAPHQL_URL || 'https://devapi.ginjer.io/graphql').replace(/\/+$/, '');
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000;

let ginjerToken = '';
let tokenExpiresAt = 0;
>>>>>>> b820b6d2874d66eec56b9bcd357ee62b370ebcdf

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(body);
}

<<<<<<< HEAD
function createSession(token) {
  const id = crypto.randomBytes(32).toString('base64url');
  sessions.set(id, { token, expiresAt: Date.now() + SESSION_TTL_MS });
  return id;
}

function getSession(req) {
  const id = typeof req.headers['x-alumhacks-session'] === 'string' ? req.headers['x-alumhacks-session'] : '';
  const session = sessions.get(id);
  if (!session || Date.now() >= session.expiresAt) {
    if (id) sessions.delete(id);
    return null;
  }
  session.expiresAt = Date.now() + SESSION_TTL_MS;
  return { id, ...session };
}

function clearSession(req) {
  const id = typeof req.headers['x-alumhacks-session'] === 'string' ? req.headers['x-alumhacks-session'] : '';
  if (id) sessions.delete(id);
=======
function clearToken() {
  ginjerToken = '';
  tokenExpiresAt = 0;
}

function tokenIsValid() {
  if (ginjerToken && Date.now() >= tokenExpiresAt) clearToken();
  return Boolean(ginjerToken);
>>>>>>> b820b6d2874d66eec56b9bcd357ee62b370ebcdf
}

function readJson(req, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    let bytes = 0;
    req.setEncoding('utf8');
    req.on('data', chunk => {
      bytes += Buffer.byteLength(chunk);
      if (bytes > maxBytes) {
        reject(Object.assign(new Error('Request body is too large.'), { status: 413 }));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch { reject(Object.assign(new Error('Request body must be valid JSON.'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

function isPrivateIPv4(address) {
  const normalized = String(address || '').replace(/^::ffff:/i, '');
  const parts = normalized.split('.').map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  return parts[0] === 10 || parts[0] === 127 ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168);
}

function isLocalRequest(req, res) {
  const host = req.headers.host || '';
  let hostname;
  let port;
  try {
    const parsedHost = new URL('http://' + host);
    hostname = parsedHost.hostname;
    port = parsedHost.port || '80';
  } catch {
    json(res, 403, { error: 'Invalid Host header.' });
    return false;
  }
  const remoteAddress = String(req.socket.remoteAddress || '').replace(/^::ffff:/i, '');
  const isLoopback = ['127.0.0.1', 'localhost'].includes(hostname) &&
    (remoteAddress === '::1' || remoteAddress.startsWith('127.'));
  const isLanRequest = port === String(PORT) && isPrivateIPv4(hostname) && isPrivateIPv4(req.socket.remoteAddress);
  if (!(isLoopback && port === String(PORT)) && !isLanRequest) {
    json(res, 403, { error: 'This backend only accepts localhost or private Wi-Fi network requests.' });
    return false;
  }
  const origin = req.headers.origin;
  if (origin && origin !== 'http://' + host) {
    json(res, 403, { error: 'Cross-origin requests are not allowed.' });
    return false;
  }
  return true;
}

async function proxyGraphql(req, res) {
  let payload;
  try { payload = await readJson(req); }
  catch (err) { return json(res, err.status || 400, { error: err.message }); }
  if (typeof payload.query !== 'string' || !payload.query.trim()) {
    return json(res, 400, { error: 'A GraphQL query is required.' });
  }
<<<<<<< HEAD
  const session = getSession(req);
  if (!session) return json(res, 401, { error: 'Your session has expired. Please sign in again.', code: 'SESSION_EXPIRED' });
  const headers = { 'Content-Type': 'application/json', authorization: session.token };
=======
  const headers = { 'Content-Type': 'application/json' };
  if (req.headers['x-ginjer-authenticated'] === 'true') {
    if (!tokenIsValid()) return json(res, 401, { error: 'No Ginjer token is stored. Reconnect using your token.' });
    headers.authorization = ginjerToken;
  }
>>>>>>> b820b6d2874d66eec56b9bcd357ee62b370ebcdf
  try {
    const upstream = await fetch(GINJER_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: payload.query, variables: payload.variables || {} }),
      signal: AbortSignal.timeout(30000)
    });
    const raw = await upstream.text();
<<<<<<< HEAD
    if (upstream.status === 401 || upstream.status === 403) {
      sessions.delete(session.id);
      return json(res, 401, { error: 'Ginjer rejected this session. Please sign in again.', code: 'SESSION_EXPIRED' });
    }
=======
>>>>>>> b820b6d2874d66eec56b9bcd357ee62b370ebcdf
    res.writeHead(upstream.status, {
      'Content-Type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(raw);
  } catch (err) {
    json(res, 502, { error: 'Could not reach Ginjer: ' + (err.name === 'TimeoutError' ? 'request timed out.' : 'check your internet connection and try again.') });
  }
}

<<<<<<< HEAD
async function login(req, res) {
  let body;
  try { body = await readJson(req, 16 * 1024); }
  catch (err) { return json(res, err.status || 400, { error: err.message }); }
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email || !password || password.length > 4096) return json(res, 400, { error: 'Enter your Ginjer email address and password.' });
  try {
    const upstream = await fetch(GINJER_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: SIGN_IN_QUERY, variables: { auth: { emailId: email, password, application: 'Ginjer', forever: true } } }),
      signal: AbortSignal.timeout(30000)
    });
    const payload = await upstream.json().catch(() => null);
    const user = payload?.data?.signIn;
    if (!upstream.ok || payload?.errors?.length || !user?.token) {
      return json(res, upstream.status >= 500 ? 502 : 401, { error: payload?.errors?.map(item => item.message).join('; ') || 'Ginjer sign-in failed. Check your email address and password.' });
    }
    const sessionId = createSession(user.token);
    return json(res, 200, {
      sessionId,
      user: { _id: user._id, firstName: user.firstName, lastName: user.lastName, emailId: user.emailId, defaultAccount: user.defaultAccount, organisationId: user.organisationId },
      expiresInSeconds: Math.floor(SESSION_TTL_MS / 1000)
    });
  } catch (err) {
    return json(res, 502, { error: 'Could not reach Ginjer: ' + (err.name === 'TimeoutError' ? 'request timed out.' : 'check your internet connection and try again.') });
  }
}

=======
>>>>>>> b820b6d2874d66eec56b9bcd357ee62b370ebcdf
const server = http.createServer(async (req, res) => {
  if (!isLocalRequest(req, res)) return;
  const url = new URL(req.url, 'http://127.0.0.1:' + PORT);

  if (req.method === 'GET' && url.pathname === '/api/status') {
<<<<<<< HEAD
    return json(res, 200, { ok: true });
  }
  if (req.method === 'POST' && url.pathname === '/api/auth/login') return login(req, res);
  if (req.method === 'GET' && url.pathname === '/api/session') return json(res, 200, { authenticated: Boolean(getSession(req)) });
  if (req.method === 'DELETE' && url.pathname === '/api/session') { clearSession(req); return json(res, 200, { authenticated: false }); }
=======
    return json(res, 200, { ok: true, tokenConfigured: tokenIsValid() });
  }
  if (req.method === 'POST' && url.pathname === '/api/token') {
    let body;
    try { body = await readJson(req, 16 * 1024); }
    catch (err) { return json(res, err.status || 400, { error: err.message }); }
    const token = typeof body.token === 'string' ? body.token.trim().replace(/^Bearer\s+/i, '') : '';
    if (!token || token.length > 8192 || /[\r\n]/.test(token)) {
      return json(res, 400, { error: 'Enter a valid token value from Postman.' });
    }
    ginjerToken = token;
    tokenExpiresAt = Date.now() + TOKEN_TTL_MS;
    return json(res, 200, { tokenConfigured: true, expiresInHours: 8 });
  }
  if (req.method === 'DELETE' && url.pathname === '/api/token') {
    clearToken();
    return json(res, 200, { tokenConfigured: false });
  }
>>>>>>> b820b6d2874d66eec56b9bcd357ee62b370ebcdf
  if (req.method === 'POST' && url.pathname === '/api/graphql') return proxyGraphql(req, res);

  json(res, 404, { error: 'Not found.' });
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    process.stderr.write('Port ' + PORT + ' is already in use. Close the other server or set ALUMHACKS_PORT to another port.\n');
  } else {
    process.stderr.write('Backend error: ' + err.message + '\n');
  }
  process.exitCode = 1;
});

server.listen(PORT, '0.0.0.0', () => {
  process.stdout.write('Alumhacks backend ready at http://127.0.0.1:' + PORT + '\n');
  const addresses = Object.values(os.networkInterfaces()).flatMap(items =>
    (items || []).filter(item => item.family === 'IPv4' && !item.internal && isPrivateIPv4(item.address)).map(item => item.address));
  for (const address of [...new Set(addresses)]) {
    process.stdout.write('Phone on the same Wi-Fi: http://' + address + ':' + PORT + '\n');
  }
  process.stdout.write('LAN access is limited to private IPv4 networks. Use only on a trusted Wi-Fi network.\n');
<<<<<<< HEAD
  process.stdout.write('Per-user Ginjer sessions are memory-only and expire after 8 hours of inactivity. Press Ctrl+C to stop.\n');
=======
  process.stdout.write('Token storage is memory-only and expires after 8 hours. Press Ctrl+C to stop.\n');
>>>>>>> b820b6d2874d66eec56b9bcd357ee62b370ebcdf
});

