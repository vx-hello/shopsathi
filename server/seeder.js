const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Product = require('./models/Product');
const Customer = require('./models/Customer');

dotenv.config();

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[ShopSathi Seeder] MongoDB Connected...');

    // Clear existing users, products, customers to start fresh
    await User.deleteMany();
    await Product.deleteMany();
    await Customer.deleteMany();

    console.log('[ShopSathi Seeder] Cleared previous seed data...');

    // Hash common password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Password@123', salt);

    // Create Demo Owner
    const owner = await User.create({
      name: 'Ramesh Gupta',
      email: 'owner@shopsathi.com',
      password: hashedPassword,
      phone: '9876543210',
      role: 'owner',
      shopName: 'Gupta Kirana & General Store',
      shopAddress: 'Shop 14, Main Mandi Road, Indore (M.P.)',
      isActive: true,
    });

    // Create Demo Staff linked to owner
    await User.create({
      name: 'Suresh Kumar',
      email: 'staff@shopsathi.com',
      password: hashedPassword,
      phone: '9876501234',
      role: 'staff',
      shopName: 'Gupta Kirana & General Store',
      ownerId: owner._id,
      isActive: true,
    });

    console.log('----------------------------------------------------');
    console.log('✅ ShopSathi Demo Accounts Created Successfully:');
    console.log('----------------------------------------------------');
    console.log('👑 [SHOP OWNER]');
    console.log('   Email:    owner@shopsathi.com');
    console.log('   Password: Password@123');
    console.log('   Shop:     Gupta Kirana & General Store');
    console.log('----------------------------------------------------');
    console.log('👷 [STAFF MEMBER]');
    console.log('   Email:    staff@shopsathi.com');
    console.log('   Password: Password@123');
    console.log('----------------------------------------------------');

    process.exit(0);
  } catch (error) {
    console.error(`[ShopSathi Seeder Error] ${error.message}`);
    process.exit(1);
  }
};

seedData();
