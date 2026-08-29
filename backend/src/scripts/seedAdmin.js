import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import User from '../models/User.js';

dotenv.config();

const main = async () => {
  try {
    await connectDB();

    const email = process.env.ADMIN_EMAIL || 'farhankhansmg96@gmail.com';
    const password = process.env.ADMIN_PASSWORD || 'skkIPL@2210#119#1881#';
    const name = process.env.ADMIN_NAME || 'Farhan Khan';

    const existing = await User.findOne({ email });
    if (existing) {
      console.log('Admin user already exists');
      existing.passwordHash = await bcrypt.hash(password, 12);
      existing.role = 'admin';
      existing.mineId = null;
      existing.isActive = true;
      await existing.save();
      console.log('Admin password updated');
    } else {
      const passwordHash = await bcrypt.hash(password, 12);
      await User.create({
        email,
        passwordHash,
        name,
        role: 'admin',
        mineId: null,
        isActive: true
      });
      console.log('Admin user created successfully');
    }

    console.log('\nAdmin Credentials:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log('\nKeep these secure!');
    
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
};

main();