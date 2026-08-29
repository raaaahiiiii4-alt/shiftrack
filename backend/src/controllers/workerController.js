import Worker from '../models/Worker.js';
import Mine from '../models/Mine.js';
import { AppError } from '../middleware/errorHandler.js';

export const getWorkers = async (req, res, next) => {
  try {
    const { mineId, search, page = 1, limit = 50, isActive } = req.query;
    const query = {};

    if (mineId) query.mineId = mineId;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { tokenNo: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [workers, total] = await Promise.all([
      Worker.find(query)
        .populate('mineId', 'name displayName')
        .sort({ tokenNo: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Worker.countDocuments(query)
    ]);

    res.json({
      workers,
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

export const getWorker = async (req, res, next) => {
  try {
    const worker = await Worker.findById(req.params.id).populate('mineId', 'name displayName');
    if (!worker) {
      throw new AppError('Worker not found', 404);
    }
    res.json({ worker });
  } catch (error) {
    next(error);
  }
};

export const createWorker = async (req, res, next) => {
  try {
    const { tokenNo, name, mineId, category, department } = req.body;

    const mine = await Mine.findById(mineId);
    if (!mine) {
      throw new AppError('Mine not found', 404);
    }

    const worker = await Worker.create({
      tokenNo,
      name,
      mineId,
      category,
      department
    });

    res.status(201).json({ worker });
  } catch (error) {
    if (error.code === 11000) {
      return next(new AppError('Worker with this token number already exists in this mine', 409));
    }
    next(error);
  }
};

export const updateWorker = async (req, res, next) => {
  try {
    const { name, category, department, isActive } = req.body;

    const worker = await Worker.findByIdAndUpdate(
      req.params.id,
      { name, category, department, isActive },
      { new: true, runValidators: true }
    ).populate('mineId', 'name displayName');

    if (!worker) {
      throw new AppError('Worker not found', 404);
    }

    res.json({ worker });
  } catch (error) {
    next(error);
  }
};

export const deleteWorker = async (req, res, next) => {
  try {
    const worker = await Worker.findByIdAndDelete(req.params.id);
    if (!worker) {
      throw new AppError('Worker not found', 404);
    }
    res.json({ message: 'Worker deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getWorkerStats = async (req, res, next) => {
  try {
    const { mineId } = req.query;
    const query = mineId ? { mineId } : {};

    const [total, active, byCategory] = await Promise.all([
      Worker.countDocuments(query),
      Worker.countDocuments({ ...query, isActive: true }),
      Worker.aggregate([
        { $match: query },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ])
    ]);

    res.json({ total, active, byCategory });
  } catch (error) {
    next(error);
  }
};