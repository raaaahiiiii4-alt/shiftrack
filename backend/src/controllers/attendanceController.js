import Attendance from '../models/Attendance.js';
import Worker from '../models/Worker.js';
import Mine from '../models/Mine.js';
import { AppError } from '../middleware/errorHandler.js';
import { getDayOfWeek, getTimeString } from '../utils/dateUtils.js';

export const getAttendance = async (req, res, next) => {
  try {
    const { mineId, date, workerId, tokenNo, shift, page = 1, limit = 100 } = req.query;
    
    if (!mineId || !date) {
      throw new AppError('mineId and date are required', 400);
    }

    const query = { mineId, date };
    if (workerId) query.workerId = workerId;
    if (tokenNo) query.tokenNo = tokenNo;
    if (shift) query.shift = shift;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [records, total] = await Promise.all([
      Attendance.find(query)
        .populate('workerId', 'tokenNo name')
        .populate('markedBy', 'name email')
        .sort({ tokenNo: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Attendance.countDocuments(query)
    ]);

    const stats = await Attendance.aggregate([
      { $match: query },
      { $group: { _id: '$shift', count: { $sum: 1 } } }
    ]);

    const statsObj = { A: 0, B: 0, C: 0, OFF: 0 };
    stats.forEach(s => { statsObj[s._id] = s.count; });

    res.json({
      records,
      stats: statsObj,
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

export const createAttendance = async (req, res, next) => {
  try {
    const { tokenNo, date, shift } = req.body;
    const mineId = req.mineId || req.body.mineId;

    const mine = await Mine.findById(mineId);
    if (!mine) throw new AppError('Mine not found', 404);

    const worker = await Worker.findOne({ mineId, tokenNo, isActive: true });
    if (!worker) {
      throw new AppError(`Worker with token ${tokenNo} not found in ${mine.name}`, 404);
    }

    const existing = await Attendance.findOne({ mineId, workerId: worker._id, date });
    if (existing) {
      throw new AppError(`Attendance already exists for ${tokenNo} on ${date}`, 409);
    }

    const record = await Attendance.create({
      mineId,
      workerId: worker._id,
      tokenNo,
      date,
      shift,
      markedBy: req.userId,
      dayOfWeek: getDayOfWeek(date),
      timeOfDay: getTimeString()
    });

    res.status(201).json({ record });
  } catch (error) {
    next(error);
  }
};

export const bulkCreateAttendance = async (req, res, next) => {
  try {
    const { tokens, date, shift } = req.body;
    const mineId = req.mineId || req.body.mineId;

    const mine = await Mine.findById(mineId);
    if (!mine) throw new AppError('Mine not found', 404);

    const workers = await Worker.find({ 
      mineId, 
      tokenNo: { $in: tokens },
      isActive: true 
    });

    const foundTokens = new Set(workers.map(w => w.tokenNo));
    const notFound = tokens.filter(t => !foundTokens.has(t));
    
    if (notFound.length > 0) {
      console.warn(`Workers not found: ${notFound.join(', ')}`);
    }

    const existingRecords = await Attendance.find({
      mineId,
      workerId: { $in: workers.map(w => w._id) },
      date
    });
    const existingWorkerIds = new Set(existingRecords.map(r => r.workerId.toString()));

    const toCreate = workers
      .filter(w => !existingWorkerIds.has(w._id.toString()))
      .map(w => ({
        mineId,
        workerId: w._id,
        tokenNo: w.tokenNo,
        date,
        shift,
        markedBy: req.userId,
        dayOfWeek: getDayOfWeek(date),
        timeOfDay: getTimeString()
      }));

    let created = [];
    if (toCreate.length > 0) {
      created = await Attendance.insertMany(toCreate);
    }

    res.status(201).json({
      created: created.length,
      skipped: existingRecords.length,
      notFound: notFound.length,
      records: created
    });
  } catch (error) {
    next(error);
  }
};

export const updateAttendance = async (req, res, next) => {
  try {
    const { shift } = req.body;
    const record = await Attendance.findByIdAndUpdate(
      req.params.id,
      { shift, markedBy: req.userId, markedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('workerId', 'tokenNo name');

    if (!record) {
      throw new AppError('Attendance record not found', 404);
    }

    res.json({ record });
  } catch (error) {
    next(error);
  }
};

export const bulkUpdateAttendance = async (req, res, next) => {
  try {
    const { ids, shift } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new AppError('IDs array required', 400);
    }

    const result = await Attendance.updateMany(
      { _id: { $in: ids } },
      { shift, markedBy: req.userId, markedAt: new Date() }
    );

    res.json({ modifiedCount: result.modifiedCount });
  } catch (error) {
    next(error);
  }
};

export const deleteAttendance = async (req, res, next) => {
  try {
    const record = await Attendance.findByIdAndDelete(req.params.id);
    if (!record) {
      throw new AppError('Attendance record not found', 404);
    }
    res.json({ message: 'Attendance record deleted' });
  } catch (error) {
    next(error);
  }
};

export const bulkDeleteAttendance = async (req, res, next) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new AppError('IDs array required', 400);
    }

    const result = await Attendance.deleteMany({ _id: { $in: ids } });
    res.json({ deletedCount: result.deletedCount });
  } catch (error) {
    next(error);
  }
};

export const getMonthlyStats = async (req, res, next) => {
  try {
    const { mineId, month } = req.query;
    
    if (!mineId || !month) {
      throw new AppError('mineId and month (YYYY-MM) required', 400);
    }

    const year = parseInt(month.split('-')[0]);
    const monthNum = parseInt(month.split('-')[1]);
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const datePrefix = month;

    const records = await Attendance.find({
      mineId,
      date: { $regex: `^${datePrefix}` }
    }).select('tokenNo date shift');

    const workerShifts = {};
    records.forEach(r => {
      if (!workerShifts[r.tokenNo]) workerShifts[r.tokenNo] = {};
      workerShifts[r.tokenNo][r.date] = r.shift;
    });

    const uniqueTokens = Object.keys(workerShifts).sort();
    const matrix = uniqueTokens.map((tokenNo, index) => {
      const row = { 'Sl No': index + 1, 'Token Number': tokenNo };
      let countA = 0, countB = 0, countC = 0, countOff = 0, totalWorked = 0;
      
      for (let d = 1; d <= daysInMonth; d++) {
        const dayStr = String(d).padStart(2, '0');
        const dateKey = `${datePrefix}-${dayStr}`;
        const shift = workerShifts[tokenNo]?.[dateKey] || '-';
        row[dateKey] = shift;
        
        if (shift === 'A') countA++;
        else if (shift === 'B') countB++;
        else if (shift === 'C') countC++;
        else if (shift === 'OFF') countOff++;
        if (shift !== 'OFF' && shift !== '-') totalWorked++;
      }
      
      row['Total Shift A'] = countA;
      row['Total Shift B'] = countB;
      row['Total Shift C'] = countC;
      row['Total Off'] = countOff;
      row['Total Worked Days'] = totalWorked;
      
      return row;
    });

    res.json({ matrix, uniqueTokens: uniqueTokens.length, daysInMonth });
  } catch (error) {
    next(error);
  }
};

export const exportMonthlyExcel = async (req, res, next) => {
  try {
    const { mineId, month } = req.query;
    
    if (!mineId || !month) {
      throw new AppError('mineId and month (YYYY-MM) required', 400);
    }

    const mine = await Mine.findById(mineId);
    if (!mine) throw new AppError('Mine not found', 404);

    const year = parseInt(month.split('-')[0]);
    const monthNum = parseInt(month.split('-')[1]);
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const datePrefix = month;
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthLabel = monthNames[monthNum - 1];

    const records = await Attendance.find({
      mineId,
      date: { $regex: `^${datePrefix}` }
    }).select('tokenNo date shift');

    const workerShifts = {};
    records.forEach(r => {
      if (!workerShifts[r.tokenNo]) workerShifts[r.tokenNo] = {};
      workerShifts[r.tokenNo][r.date] = r.shift;
    });

    const uniqueTokens = Object.keys(workerShifts).sort();

    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`${mine.name}_${monthLabel}_Attendance`);

    const headers = ['Sl No', 'Token Number'];
    for (let d = 1; d <= daysInMonth; d++) {
      headers.push(`${String(d).padStart(2, '0')}-${monthLabel}`);
    }
    headers.push('Total Shift A', 'Total Shift B', 'Total Shift C', 'Total Off', 'Total Worked Days');

    worksheet.addRow(headers);
    
    uniqueTokens.forEach((tokenNo, index) => {
      const row = [index + 1, tokenNo];
      let countA = 0, countB = 0, countC = 0, countOff = 0, totalWorked = 0;
      
      for (let d = 1; d <= daysInMonth; d++) {
        const dateKey = `${datePrefix}-${String(d).padStart(2, '0')}`;
        const shift = workerShifts[tokenNo]?.[dateKey] || '-';
        row.push(shift);
        
        if (shift === 'A') countA++;
        else if (shift === 'B') countB++;
        else if (shift === 'C') countC++;
        else if (shift === 'OFF') countOff++;
        if (shift !== 'OFF' && shift !== '-') totalWorked++;
      }
      
      row.push(countA, countB, countC, countOff, totalWorked);
      worksheet.addRow(row);
    });

    worksheet.columns = [
      { width: 8 }, { width: 16 },
      ...Array(daysInMonth).fill({ width: 10 }),
      { width: 14 }, { width: 14 }, { width: 14 }, { width: 12 }, { width: 18 }
    ];

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${mine.name}_${monthLabel}_Attendance.xlsx"`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};

export const exportMonthlyCSV = async (req, res, next) => {
  try {
    const { mineId, month } = req.query;
    
    if (!mineId || !month) {
      throw new AppError('mineId and month (YYYY-MM) required', 400);
    }

    const mine = await Mine.findById(mineId);
    if (!mine) throw new AppError('Mine not found', 404);

    const year = parseInt(month.split('-')[0]);
    const monthNum = parseInt(month.split('-')[1]);
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const datePrefix = month;
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthLabel = monthNames[monthNum - 1];

    const records = await Attendance.find({
      mineId,
      date: { $regex: `^${datePrefix}` }
    }).select('tokenNo date shift');

    const workerShifts = {};
    records.forEach(r => {
      if (!workerShifts[r.tokenNo]) workerShifts[r.tokenNo] = {};
      workerShifts[r.tokenNo][r.date] = r.shift;
    });

    const uniqueTokens = Object.keys(workerShifts).sort();

    const headers = ['Sl No', 'Token Number'];
    for (let d = 1; d <= daysInMonth; d++) {
      headers.push(`"${String(d).padStart(2, '0')}-${monthLabel}"`);
    }
    headers.push('"Total Shift A"', '"Total Shift B"', '"Total Shift C"', '"Total Off"', '"Total Worked Days"');

    const rows = [headers.join(',')];
    
    uniqueTokens.forEach((tokenNo, index) => {
      const row = [index + 1, `"${tokenNo}"`];
      let countA = 0, countB = 0, countC = 0, countOff = 0, totalWorked = 0;
      
      for (let d = 1; d <= daysInMonth; d++) {
        const dateKey = `${datePrefix}-${String(d).padStart(2, '0')}`;
        const shift = workerShifts[tokenNo]?.[dateKey] || '-';
        row.push(`"${shift}"`);
        
        if (shift === 'A') countA++;
        else if (shift === 'B') countB++;
        else if (shift === 'C') countC++;
        else if (shift === 'OFF') countOff++;
        if (shift !== 'OFF' && shift !== '-') totalWorked++;
      }
      
      row.push(countA, countB, countC, countOff, totalWorked);
      rows.push(row.join(','));
    });

    const csvContent = '\uFEFF' + rows.join('\n');
    const fileName = `${mine.name}_${monthLabel}_Attendance.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
};