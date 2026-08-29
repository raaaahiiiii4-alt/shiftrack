import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  mineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mine',
    required: true
  },
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    required: true
  },
  tokenNo: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: String,
    required: true,
    match: /^\d{4}-\d{2}-\d{2}$/
  },
  shift: {
    type: String,
    required: true,
    enum: ['A', 'B', 'C', 'OFF']
  },
  markedAt: {
    type: Date,
    default: Date.now
  },
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dayOfWeek: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  },
  timeOfDay: {
    type: String,
    match: /^([01]\d|2[0-3]):([0-5]\d)$/
  }
}, {
  timestamps: true
});

attendanceSchema.index({ mineId: 1, workerId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ mineId: 1, date: 1 });
attendanceSchema.index({ mineId: 1, workerId: 1 });
attendanceSchema.index({ date: 1 });

export default mongoose.model('Attendance', attendanceSchema);