const express = require('express');
const {
  getTasks,
  getTaskStats,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
} = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');
const {
  validateObjectId,
  validateCreateTask,
  validateUpdateTask,
  validateTaskStatus,
} = require('../middleware/validateRequest');

const router = express.Router();

// Enforce authentication on all task endpoints
router.use(protect);

// Task collection endpoints
router.get('/', getTasks);
router.get('/stats', getTaskStats);
router.post('/', validateCreateTask, createTask);

// Individual task resource endpoints
router.get('/:id', validateObjectId, getTaskById);
router.put('/:id', validateObjectId, validateUpdateTask, updateTask);
router.patch('/:id/status', validateObjectId, validateTaskStatus, updateTaskStatus);
router.delete('/:id', validateObjectId, deleteTask);

module.exports = router;
