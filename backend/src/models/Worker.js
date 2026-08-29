import mongoose from 'mongoose';

const workerSchema = new mongoose.Schema({
  mineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mine',
    required: true
  },
  tokenNo: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

workerSchema.index({ mineId: 1, tokenNo: 1 }, { unique: true });
workerSchema.index({ mineId: 1, name: 1 });
workerSchema.index({ mineId: 1, isActive: 1 });

export default mongoose.model('Worker', workerSchema);