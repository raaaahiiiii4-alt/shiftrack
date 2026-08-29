import User from '../models/User.js';
import Mine from '../models/Mine.js';
import bcrypt from 'bcryptjs';
import { AppError } from '../middleware/errorHandler.js';

export const getUsers = async (req, res, next) => {
  try {
    const { mineId, role, page = 1, limit = 20 } = req.query;
    const query = {};

    if (req.user.role !== 'admin') {
      query.mineId = req.user.mineId;
    } else if (mineId) {
      query.mineId = mineId;
    }

    if (role) query.role = role;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [users, total] = await Promise.all([
      User.find(query)
        .populate('mineId', 'name displayName')
        .select('-passwordHash -refreshToken')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('mineId', 'name displayName')
      .select('-passwordHash -refreshToken');
    
    if (!user) throw new AppError('User not found', 404);

    if (req.user.role !== 'admin' && req.user.mineId?.toString() !== user.mineId?.toString()) {
      throw new AppError('Access denied', 403);
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const { email, password, name, role, mineId } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) throw new AppError('Email already registered', 409);

    if (role === 'supervisor' && !mineId) {
      throw new AppError('Mine ID required for supervisor', 400);
    }

    if (req.user.role !== 'admin' && role === 'admin') {
      throw new AppError('Cannot create admin users', 403);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      email,
      passwordHash,
      name,
      role: role || 'viewer',
      mineId: role === 'supervisor' ? mineId : null
    });

    const userResponse = user.toObject();
    delete userResponse.passwordHash;
    delete userResponse.refreshToken;

    res.status(201).json({ user: userResponse });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { name, role, mineId, isActive } = req.body;
    const targetUser = await User.findById(req.params.id);

    if (!targetUser) throw new AppError('User not found', 404);

    if (req.user.role !== 'admin') {
      if (req.user.mineId?.toString() !== targetUser.mineId?.toString()) {
        throw new AppError('Access denied', 403);
      }
      if (role && role !== targetUser.role) {
        throw new AppError('Cannot change role', 403);
      }
    }

    if (role === 'supervisor' && !mineId) {
      throw new AppError('Mine ID required for supervisor', 400);
    }

    targetUser.name = name ?? targetUser.name;
    targetUser.role = role ?? targetUser.role;
    targetUser.mineId = role === 'supervisor' ? mineId : (role === 'admin' ? null : targetUser.mineId);
    targetUser.isActive = isActive !== undefined ? isActive : targetUser.isActive;

    await targetUser.save();

    const userResponse = targetUser.toObject();
    delete userResponse.passwordHash;
    delete userResponse.refreshToken;

    res.json({ user: userResponse });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.userId).select('+passwordHash');

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) throw new AppError('Current password is incorrect', 401);

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.refreshToken = null;
    await user.save();

    res.json({ message: 'Password changed successfully. Please login again.' });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) throw new AppError('User not found', 404);

    if (req.user.role !== 'admin' && req.user.mineId?.toString() !== targetUser.mineId?.toString()) {
      throw new AppError('Access denied', 403);
    }

    if (targetUser._id.toString() === req.userId) {
      throw new AppError('Cannot delete yourself', 400);
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogs = async (req, res, next) => {
  try {
    const { mineId, userId, action, resourceType, page = 1, limit = 50, startDate, endDate } = req.query;
    const query = {};

    if (req.user.role !== 'admin') {
      query.mineId = req.user.mineId;
    } else if (mineId) {
      query.mineId = mineId;
    }

    if (userId) query.userId = userId;
    if (action) query.action = action;
    if (resourceType) query.resourceType = resourceType;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [logs, total] = await Promise.all([
      req.app.get('AuditLog').find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      req.app.get('AuditLog').countDocuments(query)
    ]);

    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};