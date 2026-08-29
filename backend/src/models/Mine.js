import mongoose from 'mongoose';

const mineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    enum: ['Balaria', 'Mochia', 'Baroi'],
    trim: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

mineSchema.index({ name: 1 }, { unique: true });

export default mongoose.model('Mine', mineSchema);