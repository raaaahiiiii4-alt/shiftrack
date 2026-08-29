import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'supervisor', 'viewer'],
    default: 'viewer'
  },
  mineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mine',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLoginAt: {
    type: Date
  },
  refreshToken: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ mineId: 1, role: 1 });

export default mongoose.model('User', userSchema);