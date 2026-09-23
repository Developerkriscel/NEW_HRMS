import { ok } from 'assert';

async function testAttendanceFlow() {
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

  const post = async (url, body) => {
    try {
      const res = await fetch(`http://localhost:3000${url}`, { method: 'POST', headers, body: JSON.stringify(body) });
      const data = await res.json();
      return { status: res.status, data };
    } catch(e) {
      return { status: 500, error: e.message };
    }
  }
  
  const get = async (url) => {
    try {
      const res = await fetch(`http://localhost:3000${url}`, { headers });
      const data = await res.json();
      return { status: res.status, data };
    } catch(e) {
      return { status: 500, error: e.message };
    }
  }

  console.log("1. Checking in...");
  const checkinRes = await post('/api/attendance/check-in', { photo: 'data:image/png;base64,mock', location: { lat: 10, lng: 10 }, source: 'WEB' });
  console.log("Checkin status:", checkinRes.status, checkinRes.data?.message || checkinRes.data);

  console.log("2. Starting break...");
  const breakStart = await post('/api/attendance/break', { action: 'start' });
  console.log("Break Start status:", breakStart.status, breakStart.data?.message || breakStart.data);
  
  // Wait a little
  await new Promise(r => setTimeout(r, 1000));
  
  console.log("3. Ending break...");
  const breakEnd = await post('/api/attendance/break', { action: 'end' });
  console.log("Break End status:", breakEnd.status, breakEnd.data?.message || breakEnd.data);
  
  console.log("4. Checking out...");
  const checkoutRes = await post('/api/attendance/check-out', { photo: 'data:image/png;base64,mock', location: { lat: 10, lng: 10 }, source: 'WEB' });
  console.log("Checkout status:", checkoutRes.status, checkoutRes.data?.message || checkoutRes.data);
  
  console.log("5. Fetching Today...");
  const today = await get('/api/attendance/today');
  console.log("Today status:", today.status);
  console.log("Today Data:", today.data?.data);
}

testAttendanceFlow();
