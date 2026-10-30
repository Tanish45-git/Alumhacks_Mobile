const assert = require('node:assert/strict');
const http = require('node:http');
const { spawn } = require('node:child_process');
const net = require('node:net');
const test = require('node:test');
const path = require('node:path');

function port() {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const value = server.address().port;
      server.close(() => resolve(value));
    });
  });
}

function listen(handler) {
  return new Promise(resolve => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function stop(child) {
  return new Promise(resolve => { child.once('exit', resolve); child.kill(); });
}

test('separates Ginjer sessions by mobile user and clears them on logout', async () => {
  const upstreamTokens = [];
  const ginjer = await listen(async (req, res) => {
    let raw = ''; for await (const chunk of req) raw += chunk;
    const payload = JSON.parse(raw);
    if (payload.query.includes('SignIn')) {
      const email = payload.variables.auth.emailId;
      return res.end(JSON.stringify({ data: { signIn: { _id: email, firstName: email, token: `token-${email}`, defaultAccount: 'org-a' } } }));
    }
    upstreamTokens.push(req.headers.authorization);
    res.end(JSON.stringify({ data: { accounts: [] } }));
  });
  const ginjerPort = ginjer.address().port;
  const backendPort = await port();
  const backend = spawn(process.execPath, ['server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, ALUMHACKS_PORT: String(backendPort), GINJER_GRAPHQL_URL: `http://127.0.0.1:${ginjerPort}` },
    stdio: 'ignore'
  });
  const base = `http://127.0.0.1:${backendPort}`;
  try {
    await new Promise(resolve => setTimeout(resolve, 120));
    const login = async email => {
      const response = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'fictional-password' }) });
      assert.equal(response.status, 200);
      return response.json();
    };
    const userA = await login('alex-a@example.test');
    const userB = await login('alex-b@example.test');
    assert.notEqual(userA.sessionId, userB.sessionId);
    for (const user of [userA, userB]) {
      const response = await fetch(`${base}/api/graphql`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Alumhacks-Session': user.sessionId }, body: JSON.stringify({ query: 'query { accounts { name } }' }) });
      assert.equal(response.status, 200);
    }
    assert.deepEqual(upstreamTokens, ['token-alex-a@example.test', 'token-alex-b@example.test']);
    await fetch(`${base}/api/session`, { method: 'DELETE', headers: { 'X-Alumhacks-Session': userA.sessionId } });
    const rejected = await fetch(`${base}/api/graphql`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Alumhacks-Session': userA.sessionId }, body: JSON.stringify({ query: 'query { accounts { name } }' }) });
    assert.equal(rejected.status, 401);
    const remaining = await fetch(`${base}/api/session`, { headers: { 'X-Alumhacks-Session': userB.sessionId } });
    assert.deepEqual(await remaining.json(), { authenticated: true });
  } finally {
    await stop(backend);
    await new Promise(resolve => ginjer.close(resolve));
  }
});
