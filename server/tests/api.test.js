const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './.env' });

const app = require('../app');
const User = require('../models/User');
const Task = require('../models/Task');

// Connect to test database before running tests
test.before(async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/task_manager_db';
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }
  // Clear any existing test data
  await User.deleteMany({ email: { $in: ['usera@example.com', 'userb@example.com'] } });
  await Task.deleteMany({ title: { $regex: /^Test Task/ } });
});

// Clean up after all tests complete
test.after(async () => {
  await User.deleteMany({ email: { $in: ['usera@example.com', 'userb@example.com'] } });
  await Task.deleteMany({ title: { $regex: /^Test Task/ } });
  await mongoose.disconnect();
});

test('1. System Health Check', async () => {
  const res = await request(app).get('/api/health');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.status, 'online');
});

test('2. Authentication Suite', async (t) => {
  let userAToken = '';
  let userACookie = '';

  await t.test('2.1 Rejects signup with missing required fields', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      name: '',
      email: 'notanemail',
      password: '123',
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.errors.length > 0);
  });

  await t.test('2.2 Successfully registers User A', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      name: 'Alice Developer',
      email: 'usera@example.com',
      password: 'StrongPassword123',
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.user.email, 'usera@example.com');
    assert.strictEqual(res.body.user.password, undefined); // Ensure password hash is NOT exposed
    assert.ok(res.body.token);

    userAToken = res.body.token;
    // Extract token cookie
    const cookies = res.headers['set-cookie'];
    assert.ok(cookies);
    userACookie = cookies[0];
  });

  await t.test('2.3 Rejects duplicate email registration cleanly', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      name: 'Duplicate Alice',
      email: 'usera@example.com',
      password: 'StrongPassword123',
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /already exists/i);
  });

  await t.test('2.4 Rejects login with incorrect password (generic error)', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'usera@example.com',
      password: 'WrongPassword456',
    });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.message, 'Invalid email or password.');
  });

  await t.test('2.5 Successfully logs in User A with valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'usera@example.com',
      password: 'StrongPassword123',
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.token);
  });

  await t.test('2.6 Rejects protected /api/auth/me without token', async () => {
    const res = await request(app).get('/api/auth/me');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  await t.test('2.7 Rejects protected /api/auth/me with invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid_garbage_token_123');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  await t.test('2.8 Accesses /api/auth/me with valid Bearer token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${userAToken}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.user.email, 'usera@example.com');
  });

  await t.test('2.9 Accesses /api/auth/me with valid HttpOnly cookie', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', userACookie);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.user.email, 'usera@example.com');
  });
});

test('3. Task CRUD and Multi-User Isolation Suite', async (t) => {
  let tokenA = '';
  let tokenB = '';
  let taskAId = '';
  let taskBId = '';

  // Setup: Register User A and User B
  await t.test('Setup: Authenticate User A and User B', async () => {
    const resA = await request(app).post('/api/auth/login').send({
      email: 'usera@example.com',
      password: 'StrongPassword123',
    });
    tokenA = resA.body.token;

    const resB = await request(app).post('/api/auth/signup').send({
      name: 'Bob Intern',
      email: 'userb@example.com',
      password: 'SecretBobPassword999',
    });
    tokenB = resB.body.token;
  });

  await t.test('3.1 User A creates a task', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        title: 'Test Task for User A',
        description: 'Private task belonging exclusively to Alice',
        priority: 'high',
        dueDate: new Date(Date.now() + 86400000).toISOString(),
      });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.task.title, 'Test Task for User A');
    assert.strictEqual(res.body.task.status, 'pending');
    taskAId = res.body.task._id;
  });

  await t.test('3.2 User B creates a task', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        title: 'Test Task for User B',
        description: 'Private task belonging exclusively to Bob',
        priority: 'low',
      });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.task.title, 'Test Task for User B');
    taskBId = res.body.task._id;
  });

  await t.test('3.3 User A queries tasks and only sees their own tasks', async () => {
    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${tokenA}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.count, 1);
    assert.strictEqual(res.body.tasks[0]._id, taskAId);
    assert.strictEqual(res.body.tasks[0].title, 'Test Task for User A');
  });

  await t.test('3.4 User B queries tasks and only sees their own tasks', async () => {
    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${tokenB}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.count, 1);
    assert.strictEqual(res.body.tasks[0]._id, taskBId);
    assert.strictEqual(res.body.tasks[0].title, 'Test Task for User B');
  });

  await t.test('3.5 Security: User A CANNOT read User B task by ID (Returns 403)', async () => {
    const res = await request(app)
      .get(`/api/tasks/${taskBId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /forbidden/i);
  });

  await t.test('3.6 Security: User A CANNOT update User B task (Returns 403)', async () => {
    const res = await request(app)
      .put(`/api/tasks/${taskBId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: 'Hacked Title Attempt' });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);

    // Verify User B task was NOT modified
    const checkRes = await request(app)
      .get(`/api/tasks/${taskBId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    assert.strictEqual(checkRes.body.task.title, 'Test Task for User B');
  });

  await t.test('3.7 Security: User A CANNOT change status of User B task (Returns 403)', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${taskBId}/status`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ status: 'completed' });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
  });

  await t.test('3.8 Security: User A CANNOT delete User B task (Returns 403)', async () => {
    const res = await request(app)
      .delete(`/api/tasks/${taskBId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);

    // Verify task still exists for User B
    const checkRes = await request(app)
      .get(`/api/tasks/${taskBId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    assert.strictEqual(checkRes.status, 200);
  });

  await t.test('3.9 User A updates their own task successfully', async () => {
    const res = await request(app)
      .put(`/api/tasks/${taskAId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        title: 'Updated Task for User A',
        priority: 'medium',
      });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.task.title, 'Updated Task for User A');
    assert.strictEqual(res.body.task.priority, 'medium');
  });

  await t.test('3.10 User A marks their own task as completed', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${taskAId}/status`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ status: 'completed' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.task.status, 'completed');
  });

  await t.test('3.11 User A gets updated dashboard statistics', async () => {
    const res = await request(app)
      .get('/api/tasks/stats')
      .set('Authorization', `Bearer ${tokenA}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.stats.total, 1);
    assert.strictEqual(res.body.stats.completed, 1);
    assert.strictEqual(res.body.stats.pending, 0);
  });

  await t.test('3.12 User A deletes their own task successfully', async () => {
    const res = await request(app)
      .delete(`/api/tasks/${taskAId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);

    // Confirm deletion
    const getRes = await request(app)
      .get(`/api/tasks/${taskAId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    assert.strictEqual(getRes.status, 404);
  });

  await t.test('3.13 Rejects malformed task ID (Returns 400)', async () => {
    const res = await request(app)
      .get('/api/tasks/not-a-valid-object-id')
      .set('Authorization', `Bearer ${tokenA}`);
    assert.strictEqual(res.status, 400);
    assert.match(res.body.message, /invalid task identifier/i);
  });
});
