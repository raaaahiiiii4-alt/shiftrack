import ExcelJS from 'exceljs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import Mine from '../models/Mine.js';
import Worker from '../models/Worker.js';

dotenv.config();

const importBalaria = async (workbook) => {
  console.log('\n=== Importing Balaria Workers ===');
  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) {
    console.log('No worksheet found for Balaria');
    return { imported: 0, skipped: 0 };
  }

  const mine = await Mine.findOne({ name: 'Balaria' });
  if (!mine) {
    console.log('Balaria mine not found');
    return { imported: 0, skipped: 0 };
  }

  let imported = 0;
  let skipped = 0;

  for (let rowNum = 4; rowNum <= 681; rowNum++) {
    const tokenNo = worksheet.getCell(`C${rowNum}`).value;
    const name = worksheet.getCell(`D${rowNum}`).value;

    if (!tokenNo || !name) {
      skipped++;
      continue;
    }

    try {
      await Worker.findOneAndUpdate(
        { mineId: mine._id, tokenNo: String(tokenNo).trim() },
        {
          mineId: mine._id,
          tokenNo: String(tokenNo).trim(),
          name: String(name).trim(),
          isActive: true
        },
        { upsert: true, new: true }
      );
      imported++;
    } catch (err) {
      console.error(`Error importing row ${rowNum}:`, err.message);
      skipped++;
    }
  }

  console.log(`Balaria: Imported ${imported}, Skipped ${skipped}`);
  return { imported, skipped };
};

const importMochia = async (workbook) => {
  console.log('\n=== Importing Mochia Workers ===');
  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) {
    console.log('No worksheet found for Mochia');
    return { imported: 0, skipped: 0 };
  }

  const mine = await Mine.findOne({ name: 'Mochia' });
  if (!mine) {
    console.log('Mochia mine not found');
    return { imported: 0, skipped: 0 };
  }

  let imported = 0;
  let skipped = 0;

  for (let rowNum = 4; rowNum <= 821; rowNum++) {
    const tokenNo = worksheet.getCell(`B${rowNum}`).value;
    const name = worksheet.getCell(`D${rowNum}`).value;

    if (!tokenNo || !name) {
      skipped++;
      continue;
    }

    try {
      await Worker.findOneAndUpdate(
        { mineId: mine._id, tokenNo: String(tokenNo).trim() },
        {
          mineId: mine._id,
          tokenNo: String(tokenNo).trim(),
          name: String(name).trim(),
          isActive: true
        },
        { upsert: true, new: true }
      );
      imported++;
    } catch (err) {
      console.error(`Error importing row ${rowNum}:`, err.message);
      skipped++;
    }
  }

  console.log(`Mochia: Imported ${imported}, Skipped ${skipped}`);
  return { imported, skipped };
};

const main = async () => {
  try {
    await connectDB();

    await Mine.findOneAndUpdate(
      { name: 'Balaria' },
      { name: 'Balaria', displayName: 'Balaria Mine' },
      { upsert: true }
    );
    await Mine.findOneAndUpdate(
      { name: 'Mochia' },
      { name: 'Mochia', displayName: 'Mochia Mine' },
      { upsert: true }
    );
    await Mine.findOneAndUpdate(
      { name: 'Baroi' },
      { name: 'Baroi', displayName: 'Baroi Mine' },
      { upsert: true }
    );

    const balariaWorkbook = new ExcelJS.Workbook();
    await balariaWorkbook.xlsx.readFile('../Balaria Manpower List.xlsx');
    await importBalaria(balariaWorkbook);

    const mochiaWorkbook = new ExcelJS.Workbook();
    await mochiaWorkbook.xlsx.readFile('../Mochia Manpower List.xlsx');
    await importMochia(mochiaWorkbook);

    console.log('\n=== Import Complete ===');
    process.exit(0);
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
};

main();