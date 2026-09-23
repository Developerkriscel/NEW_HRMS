import { ok } from 'assert';

async function testApis() {
  // Login as employee
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'employee@acme.com', password: 'Password@123' })
  });
  
  if (!loginRes.ok) {
    console.log("Login failed", loginRes.status, await loginRes.text());
    return;
  }
  
  const loginData = await loginRes.json();
  console.log("Login data:", loginData);
  const cookieHeader = loginRes.headers.get('set-cookie');

  if (!cookieHeader) {
    console.log("No cookie received");
    return;
  }
  console.log("Logged in successfully!");
  
  const headers = {
    'Cookie': cookieHeader
  };

  const get = async (url) => {
    try {
      const res = await fetch(`http://localhost:3000${url}`, { headers });
      const data = await res.json();
      return { status: res.status, data };
    } catch(e) {
      return { status: 500, error: e.message };
    }
  }

  console.log("1. Testing /api/attendance/today...");
  const t = await get('/api/attendance/today');
  console.log("Status:", t.status);
  
  console.log("\n2. Testing /api/leaves/balance...");
  const b = await get('/api/leaves/balance');
  console.log("Status:", b.status);

  console.log("\n3. Testing /api/team-requests?size=5...");
  const r = await get('/api/team-requests?size=5');
  console.log("Status:", r.status);

  console.log("\n4. Testing /api/holidays?month=9&year=2026...");
  const h = await get('/api/holidays?month=9&year=2026');
  console.log("Status:", h.status);

  console.log("\n5. Testing /api/announcements?size=3...");
  const a = await get('/api/announcements?size=3');
  console.log("Status:", a.status);
  
  console.log("\n6. Testing /api/payroll/payslip/dummy-id?month=9&year=2026...");
  const p = await get('/api/payroll/payslip/dummy-id?month=9&year=2026');
  console.log("Status:", p.status);
}

testApis();
