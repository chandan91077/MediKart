const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const Admin = require('./src/Models/Admin');

async function createAdmin() {
  await mongoose.connect(process.env.MONGO_URI);
  const username = 'Prabhat';
  const password = 'Prabhat@0099';
  const email = 'prabhat@example.com';

  // Remove any existing admin with this username
  await Admin.deleteMany({ Username: username });

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const admin = new Admin({
    Username: username,
    Password: hashedPassword,
    Email: email
  });
  await admin.save();
  console.log('Admin created successfully!');
  process.exit(0);
}

createAdmin().catch(err => { console.error(err); process.exit(1); });
