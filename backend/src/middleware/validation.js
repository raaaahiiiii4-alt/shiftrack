export const validateAttendanceInput = (req, res, next) => {
  const { tokenNo, date, shift } = req.body;
  const errors = [];

  if (!tokenNo || typeof tokenNo !== 'string') {
    errors.push('Token number is required');
  }

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    errors.push('Valid date (YYYY-MM-DD) is required');
  }

  if (!shift || !['A', 'B', 'C', 'OFF'].includes(shift)) {
    errors.push('Valid shift (A, B, C, OFF) is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

export const validateBulkAttendanceInput = (req, res, next) => {
  const { tokens, date, shift } = req.body;
  const errors = [];

  if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
    errors.push('Tokens array is required');
  }

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    errors.push('Valid date (YYYY-MM-DD) is required');
  }

  if (!shift || !['A', 'B', 'C', 'OFF'].includes(shift)) {
    errors.push('Valid shift (A, B, C, OFF) is required');
  }

  if (tokens && tokens.length > 500) {
    errors.push('Maximum 500 tokens per bulk operation');
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

export const validateWorkerInput = (req, res, next) => {
  const { tokenNo, name, mineId } = req.body;
  const errors = [];

  if (!tokenNo || typeof tokenNo !== 'string') {
    errors.push('Token number is required');
  }

  if (!name || typeof name !== 'string') {
    errors.push('Worker name is required');
  }

  if (!mineId) {
    errors.push('Mine ID is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

export const validateUserInput = (req, res, next) => {
  const { email, password, name, role, mineId } = req.body;
  const errors = [];

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Valid email is required');
  }

  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  if (!name || typeof name !== 'string') {
    errors.push('Name is required');
  }

  if (role && !['admin', 'supervisor', 'viewer'].includes(role)) {
    errors.push('Invalid role');
  }

  if (role === 'supervisor' && !mineId) {
    errors.push('Mine ID is required for supervisor role');
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

export const validateDateQuery = (req, res, next) => {
  const { date, month } = req.query;
  
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
  }
  
  if (month && !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: 'Invalid month format. Use YYYY-MM' });
  }
  
  next();
};