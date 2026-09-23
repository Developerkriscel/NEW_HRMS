import { ok } from 'assert';

async function testLeaveApis() {
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

  console.log("1. Fetching leave balance...");
  const balRes = await get('/api/leaves/balance');
  console.log("Balance status:", balRes.status);
  const balances = balRes.data?.data || [];
  console.log("Balances:", balances.length);
  
  if (balances.length === 0) {
    console.log("No leave balances to use!");
    return;
  }
  
  const leaveTypeId = balances[0].leaveType._id;
  console.log("Using LeaveType:", leaveTypeId);

  console.log("2. Submitting a new leave request...");
  const leaveReq = await post('/api/leaves', {
    leaveTypeId: leaveTypeId,
    startDate: new Date(Date.now() + 86400000).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    reason: "Family function",
    isHalfDay: false
  });
  console.log("Leave Request Status:", leaveReq.status, leaveReq.data?.message || leaveReq.data);

  console.log("3. Fetching my leaves...");
  const myLeaves = await get('/api/leaves/my');
  console.log("My leaves status:", myLeaves.status);
  console.log("Total Leaves returned:", myLeaves.data?.data?.content?.length);
}

testLeaveApis();
