import { ok } from 'assert';

async function testPhase2Apis() {
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

  console.log("1. Fetching my assets...");
  const myAssets = await get('/api/assets?myAssets=true');
  console.log("My Assets status:", myAssets.status, myAssets.data?.length !== undefined ? myAssets.data : (myAssets.data?.data ? myAssets.data.data : myAssets.data));

  console.log("2. Fetching my expenses...");
  const myExpenses = await get('/api/expenses?myExpenses=true');
  console.log("My Expenses status:", myExpenses.status, myExpenses.data?.content ? myExpenses.data.content : myExpenses.data);
}

testPhase2Apis();
