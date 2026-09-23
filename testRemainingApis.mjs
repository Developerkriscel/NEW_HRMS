import { ok } from 'assert';

async function testRemainingApis() {
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'employee@acme.com', password: 'Password@123' })
  });
  
  const cookieHeader = loginRes.headers.get('set-cookie');
  if (!cookieHeader) return console.log("Login failed");
  
  const headers = {
    'Cookie': cookieHeader,
    'Content-Type': 'application/json'
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

  console.log("Phase 3: Helpdesk");
  const helpdesk = await get('/api/helpdesk');
  console.log("Helpdesk status:", helpdesk.status);
  
  console.log("Phase 3: Documents");
  const documents = await get('/api/documents');
  console.log("Documents status:", documents.status);

  console.log("Phase 4: Payslips");
  const payslips = await get('/api/payroll/payslip');
  console.log("Payslips status:", payslips.status);

  console.log("Phase 4: Profile");
  const profile = await get('/api/auth/me'); // Or whatever the profile endpoint is
  console.log("Profile status:", profile.status);

  console.log("Phase 4: Training");
  const training = await get('/api/training');
  console.log("Training status:", training.status);
}

testRemainingApis();
