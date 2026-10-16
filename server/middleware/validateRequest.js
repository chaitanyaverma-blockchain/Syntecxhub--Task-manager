const mongoose = require('mongoose');

// Helper to validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return typeof email === 'string' && emailRegex.test(email.trim());
};

// Validate user registration payload
const validateSignup = (req, res, next) => {
  const { name, email, password } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('Name is required and must be at least 2 characters long.');
  } else if (name.trim().length > 50) {
    errors.push('Name cannot exceed 50 characters.');
  }

  if (!email || !isValidEmail(email)) {
    errors.push('A valid email address is required.');
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    errors.push('Password is required and must be at least 6 characters long.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  // Normalize inputs
  req.body.name = name.trim();
  req.body.email = email.trim().toLowerCase();
  next();
};

// Validate user login payload
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email || !isValidEmail(email)) {
    errors.push('Please provide a valid email address.');
  }

  if (!password || typeof password !== 'string') {
    errors.push('Password is required.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  req.body.email = email.trim().toLowerCase();
  next();
};

// Validate MongoDB ObjectId in URL params
const validateObjectId = (req, res, next) => {
  const { id } = req.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid task identifier format.',
    });
  }
  next();
};

// Validate task creation payload
const validateCreateTask = (req, res, next) => {
  const { title, description, status, priority, dueDate } = req.body;
  const errors = [];

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    errors.push('Task title is required.');
  } else if (title.trim().length > 120) {
    errors.push('Task title cannot exceed 120 characters.');
  }

  if (description && typeof description === 'string' && description.length > 1000) {
    errors.push('Description cannot exceed 1000 characters.');
  }

  if (status && !['pending', 'completed'].includes(status)) {
    errors.push('Status must be either "pending" or "completed".');
  }

  if (priority && !['low', 'medium', 'high'].includes(priority)) {
    errors.push('Priority must be "low", "medium", or "high".');
  }

  if (dueDate) {
    const parsedDate = new Date(dueDate);
    if (isNaN(parsedDate.getTime())) {
      errors.push('Due date must be a valid date format.');
    }
  }

  // Disallow user from passing arbitrary 'user' field in body
  if (req.body.user) {
    delete req.body.user;
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  next();
};

// Validate task update payload (prevent mass assignment & disallow modifying user)
const validateUpdateTask = (req, res, next) => {
  const allowedFields = ['title', 'description', 'status', 'priority', 'dueDate'];
  const updateData = {};
  const errors = [];

  for (const field of Object.keys(req.body)) {
    if (allowedFields.includes(field)) {
      updateData[field] = req.body[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({
      success: false,
      message: 'At least one valid field must be provided for update.',
    });
  }

  if (updateData.title !== undefined) {
    if (typeof updateData.title !== 'string' || updateData.title.trim().length === 0) {
      errors.push('Task title cannot be empty.');
    } else if (updateData.title.trim().length > 120) {
      errors.push('Task title cannot exceed 120 characters.');
    } else {
      updateData.title = updateData.title.trim();
    }
  }

  if (updateData.description !== undefined) {
    if (typeof updateData.description === 'string' && updateData.description.length > 1000) {
      errors.push('Description cannot exceed 1000 characters.');
    }
  }

  if (updateData.status !== undefined && !['pending', 'completed'].includes(updateData.status)) {
    errors.push('Status must be either "pending" or "completed".');
  }

  if (updateData.priority !== undefined && !['low', 'medium', 'high'].includes(updateData.priority)) {
    errors.push('Priority must be "low", "medium", or "high".');
  }

  if (updateData.dueDate !== undefined && updateData.dueDate !== null && updateData.dueDate !== '') {
    const parsedDate = new Date(updateData.dueDate);
    if (isNaN(parsedDate.getTime())) {
      errors.push('Due date must be a valid date.');
    } else {
      updateData.dueDate = parsedDate;
    }
  } else if (updateData.dueDate === '') {
    updateData.dueDate = null;
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  req.sanitizedBody = updateData;
  next();
};

// Validate status change
const validateTaskStatus = (req, res, next) => {
  const { status } = req.body;
  if (!status || !['pending', 'completed'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'A valid status ("pending" or "completed") is required.',
    });
  }
  next();
};

module.exports = {
  validateSignup,
  validateLogin,
  validateObjectId,
  validateCreateTask,
  validateUpdateTask,
  validateTaskStatus,
};
