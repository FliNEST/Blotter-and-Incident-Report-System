require('dotenv').config();
const bcrypt = require('bcryptjs');
const db     = require('./config/db');

const users = [
  { user_id: 'U001', full_name: 'System Admin',     email: 'admin@gmail.com',        password: 'Admin@123',    role: 'admin'    },
  { user_id: 'U002', full_name: 'Barangay Captain', email: 'captain@gmail.com',      password: 'Captain@123',  role: 'captain'  },
  { user_id: 'U003', full_name: 'Kagawad Juan',     email: 'kagawad@gmail.com',      password: 'Kagawad@123',  role: 'kagawad'  },
  { user_id: 'U004', full_name: 'Juan Dela Cruz',   email: 'juandelacruz@gmail.com', password: 'Resident@123', role: 'resident' },
];

(async () => {
  console.log('🌱 Seeding users...');
  for (const u of users) {
    const hashed = await bcrypt.hash(u.password, 10);
    await db.query(`
      INSERT INTO users (user_id, full_name, email, password, role, status)
      VALUES (?,?,?,?,'${u.role}','active')
      ON DUPLICATE KEY UPDATE password = VALUES(password)`,
      [u.user_id, u.full_name, u.email, hashed]
    );
    console.log(`  ✅ ${u.role.padEnd(10)} ${u.email}  →  password: ${u.password}`);
  }
  console.log('\n✅ Seeding complete!');
  process.exit(0);
})().catch(err => { console.error('❌', err); process.exit(1); });
