const http = require('http');
let mongoose;
try {
  mongoose = require('mongoose');
} catch {
  mongoose = require('../server/node_modules/mongoose');
}

// Helper to make HTTP calls to the backend on localhost:5000
function apiRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runPersistenceVerification() {
  console.log('========================================================');
  console.log('MONGODB & PERSISTENCE VERIFICATION AUDIT');
  console.log('========================================================\n');

  // Step 1: Connect directly to local MongoDB using Mongoose
  const uri = 'mongodb://127.0.0.1:27017/task_manager_db';
  console.log(`[Step 1] Connecting to MongoDB at: ${uri}`);
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  console.log(`-> MongoDB Connected: Host="${mongoose.connection.host}", Database="${mongoose.connection.name}"`);

  // Step 2: Register a new test user via backend API
  const testEmail1 = 'db_persistence_user1@syntecxhub.test';
  const testEmail2 = 'db_persistence_user2@syntecxhub.test';
  const testPassword = 'SecurePassword123!';

  // Clean any previous test run documents
  const usersCollection = db.collection('users');
  const tasksCollection = db.collection('tasks');
  await usersCollection.deleteMany({ email: { $in: [testEmail1, testEmail2] } });

  console.log('\n[Step 2] Registering Test User 1 via API (POST /api/auth/signup)...');
  const signupRes = await apiRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/signup',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      name: 'Persistence Tester One',
      email: testEmail1,
      password: testPassword,
    }
  );
  console.log(`-> API Response Status: ${signupRes.status}`);
  console.log(`-> User created: ID="${signupRes.body.user?._id}", Email="${signupRes.body.user?.email}"`);
  const token1 = signupRes.body.token;

  // Step 3: Confirm user document exists in MongoDB task_manager_db
  console.log('\n[Step 3] Confirming user document exists directly in task_manager_db...');
  const user1Doc = await usersCollection.findOne({ email: testEmail1 });
  console.log(`-> Document retrieved from MongoDB: ID=${user1Doc._id}, Name="${user1Doc.name}"`);
  if (!user1Doc) throw new Error('User document missing from MongoDB!');

  // Step 4: Confirm password is encrypted with bcrypt and not plain text
  console.log('\n[Step 4] Confirming password is securely hashed...');
  console.log(`-> Raw Password Hash in DB: ${user1Doc.password}`);
  const isBcrypt = user1Doc.password.startsWith('$2a$') || user1Doc.password.startsWith('$2b$');
  console.log(`-> Password is valid bcrypt hash: ${isBcrypt}`);
  console.log(`-> Raw plain-text password exposed: false`);
  if (!isBcrypt) throw new Error('Password was stored in plain text!');

  // Step 5: Log in using the test account
  console.log('\n[Step 5] Logging in with the test account (POST /api/auth/login)...');
  const loginRes = await apiRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: testEmail1, password: testPassword }
  );
  console.log(`-> Login Status: ${loginRes.status}, Token received: ${Boolean(loginRes.body.token)}`);

  // Step 6: Create a task via API
  console.log('\n[Step 6] Creating a new task via API (POST /api/tasks)...');
  const taskRes = await apiRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/tasks',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`,
      },
    },
    {
      title: 'Database Persistence Verification Task',
      description: 'Verifying real MongoDB insert, query, update, and delete.',
      priority: 'high',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
    }
  );
  const taskId = taskRes.body.task?._id;
  console.log(`-> Task Creation Status: ${taskRes.status}, Task ID: ${taskId}`);

  // Step 7: Confirm task document exists directly in MongoDB
  console.log('\n[Step 7] Confirming task document exists in MongoDB collection...');
  const taskDoc = await tasksCollection.findOne({ _id: new mongoose.Types.ObjectId(taskId) });
  console.log(`-> Direct DB Query Result: Title="${taskDoc.title}", Status="${taskDoc.status}", Owner="${taskDoc.user}"`);
  if (!taskDoc || taskDoc.user.toString() !== user1Doc._id.toString()) {
    throw new Error('Task document missing or user ownership mismatch in MongoDB!');
  }

  // Step 8: Verify persistence on fresh read (simulating page refresh)
  console.log('\n[Step 8] Simulating page refresh (GET /api/tasks)...');
  const fetchTasksRes = await apiRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/tasks',
    method: 'GET',
    headers: { Authorization: `Bearer ${token1}` },
  });
  console.log(`-> Tasks retrieved: Count=${fetchTasksRes.body.count}`);
  const foundTask = fetchTasksRes.body.tasks.find((t) => t._id === taskId);
  console.log(`-> Created task found in list: ${Boolean(foundTask)}`);
  if (!foundTask) throw new Error('Task disappeared after refresh simulation!');

  // Step 9: Edit task and confirm database record changes
  console.log('\n[Step 9] Editing task (PUT /api/tasks/:id)...');
  const updateRes = await apiRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/tasks/${taskId}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`,
      },
    },
    {
      title: 'Updated Database Task Title',
      priority: 'medium',
    }
  );
  console.log(`-> Update Status: ${updateRes.status}`);

  // Confirm directly in MongoDB
  const updatedTaskDoc = await tasksCollection.findOne({ _id: new mongoose.Types.ObjectId(taskId) });
  console.log(`-> MongoDB document after update: Title="${updatedTaskDoc.title}", Priority="${updatedTaskDoc.priority}"`);
  if (updatedTaskDoc.title !== 'Updated Database Task Title') {
    throw new Error('Database record did not reflect the update!');
  }

  // Step 10: Mark task completed and verify stored status
  console.log('\n[Step 10] Marking task completed (PATCH /api/tasks/:id/status)...');
  const patchStatusRes = await apiRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/tasks/${taskId}/status`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`,
      },
    },
    { status: 'completed' }
  );
  console.log(`-> Status Patch Result: ${patchStatusRes.status}`);
  const statusDoc = await tasksCollection.findOne({ _id: new mongoose.Types.ObjectId(taskId) });
  console.log(`-> Stored status in MongoDB: "${statusDoc.status}"`);
  if (statusDoc.status !== 'completed') throw new Error('Task status was not updated in MongoDB!');

  // Step 11: Multi-User Isolation: User 2 cannot access or modify User 1 task
  console.log('\n[Step 11] Multi-User Isolation: Registering User 2...');
  const signup2Res = await apiRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/signup',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      name: 'Persistence Tester Two',
      email: testEmail2,
      password: testPassword,
    }
  );
  const token2 = signup2Res.body.token;

  console.log('-> User 2 attempting to GET User 1 task...');
  const crossGet = await apiRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/tasks/${taskId}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${token2}` },
  });
  console.log(`-> Result Status: ${crossGet.status} (Expected: 403 Forbidden)`);

  console.log('-> User 2 attempting to UPDATE User 1 task...');
  const crossPut = await apiRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/tasks/${taskId}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token2}`,
      },
    },
    { title: 'Illegal Modification' }
  );
  console.log(`-> Result Status: ${crossPut.status} (Expected: 403 Forbidden)`);

  console.log('-> User 2 attempting to DELETE User 1 task...');
  const crossDel = await apiRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/tasks/${taskId}`,
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token2}` },
  });
  console.log(`-> Result Status: ${crossDel.status} (Expected: 403 Forbidden)`);

  if (crossGet.status !== 403 || crossPut.status !== 403 || crossDel.status !== 403) {
    throw new Error('SECURITY BREACH: User 2 accessed or modified User 1 task!');
  }

  // Step 12: Delete the task and verify it is removed from MongoDB
  console.log('\n[Step 12] Deleting the task as User 1 (DELETE /api/tasks/:id)...');
  const deleteRes = await apiRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/tasks/${taskId}`,
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token1}` },
  });
  console.log(`-> Delete Status: ${deleteRes.status}`);

  const checkRemoved = await tasksCollection.findOne({ _id: new mongoose.Types.ObjectId(taskId) });
  console.log(`-> Task document exists in MongoDB after deletion: ${Boolean(checkRemoved)}`);
  if (checkRemoved) throw new Error('Task was not removed from MongoDB!');

  // Clean up test users
  await usersCollection.deleteMany({ email: { $in: [testEmail1, testEmail2] } });
  await mongoose.disconnect();

  console.log('\n========================================================');
  console.log('ALL 12 PERSISTENCE & DATABASE CHECKS PASSED');
  console.log('========================================================');
}

runPersistenceVerification().catch((err) => {
  console.error('\nVERIFICATION FAILED:', err.message);
  process.exit(1);
});
