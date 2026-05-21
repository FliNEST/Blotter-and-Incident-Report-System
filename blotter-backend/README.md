# 🏛️ Barangay Blotter & Incident Report System — Backend

## Stack
- **Backend**: Node.js + Express
- **Database**: MySQL 8.0+
- **Auth**: JWT (JSON Web Tokens)
- **File Uploads**: Multer

---

## 4 Actor Roles

| Role | Email | Password | Access |
|------|-------|----------|--------|
| **Admin** | admin@gmail.com | Admin@123 | Full access, user management |
| **Captain** | captain@gmail.com | Captain@123 | All blotter + assign kagawad |
| **Kagawad** | kagawad@gmail.com | Kagawad@123 | Investigate, add notes, schedule |
| **Resident** | juandelacruz@gmail.com | Resident@123 | Submit & view own complaints |

---

## Setup Instructions

### 1. Install Node.js
Download from https://nodejs.org (v18+ recommended)

### 2. Install MySQL
Download from https://dev.mysql.com/downloads/

### 3. Clone / download your project
```bash
git clone https://github.com/FliNEST/Blotter-and-Incident-Report-System
cd Blotter-and-Incident-Report-System
```

### 4. Place the backend folder
Copy the `blotter-backend/` folder into your project root.

### 5. Install dependencies
```bash
cd blotter-backend
npm install
```

### 6. Set up environment variables
```bash
cp .env.example .env
```
Edit `.env` and fill in your MySQL password:
```
DB_PASSWORD=your_mysql_password
```

### 7. Create the database
Open MySQL and run:
```sql
source database.sql;
```
Or use MySQL Workbench / phpMyAdmin to import `database.sql`.

### 8. Seed default users
```bash
node seed.js
```

### 9. Start the server
```bash
npm run dev        # development (auto-restart)
npm start          # production
```
Server runs at: **http://localhost:3000**

### 10. Add api.js to your frontend
Copy `js/api.js` into your project's `js/` folder and add this to every HTML page:
```html
<script src="js/api.js"></script>
```

---

## API Endpoints

### Auth
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | /api/auth/login | Public | Login |
| POST | /api/auth/register | Public | Register new user |
| GET | /api/auth/me | All | Get own profile |
| PUT | /api/auth/change-password | All | Change password |

### Blotter Records
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | /api/blotter | All | Submit new complaint |
| GET | /api/blotter | All | List records (role-filtered) |
| GET | /api/blotter/:id | All | Get single record |
| PUT | /api/blotter/:id/status | Kagawad+ | Update status |
| PUT | /api/blotter/:id/assign | Captain+ | Assign to kagawad |
| POST | /api/blotter/:id/notes | Kagawad+ | Add investigation note |
| POST | /api/blotter/:id/attachments | All | Upload evidence |
| DELETE | /api/blotter/:id | Captain+ | Delete record |
| GET | /api/blotter/stats/dashboard | Kagawad+ | Dashboard stats |

### Schedules
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | /api/schedules | All | List schedules |
| POST | /api/schedules | Kagawad+ | Create schedule |
| PUT | /api/schedules/:id | Kagawad+ | Update schedule |
| DELETE | /api/schedules/:id | Kagawad+ | Delete schedule |

### Users (Admin only)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | /api/users | Captain+ | List all users |
| PUT | /api/users/:id/status | Admin | Toggle active/inactive |
| DELETE | /api/users/:id | Admin | Delete user |
| GET | /api/users/stats/summary | Admin | Dashboard stats |

---

## File Structure
```
blotter-backend/
├── server.js           ← Main entry point
├── seed.js             ← Seed default users
├── database.sql        ← MySQL schema
├── package.json
├── .env.example        ← Copy to .env
├── config/
│   └── db.js           ← MySQL connection pool
├── middleware/
│   └── auth.js         ← JWT verification + role guards
├── routes/
│   ├── auth.js         ← Login, register, profile
│   ├── blotter.js      ← Blotter CRUD
│   ├── schedules.js    ← Schedule CRUD
│   └── users.js        ← User management
├── js/
│   └── api.js          ← Frontend API helper (copy to project)
├── login.html          ← Login page (copy to project root)
└── uploads/            ← Uploaded files stored here
```

---

## How Frontend Connects

```javascript
// Login
const data = await api.auth.login('admin@gmail.com', 'Admin@123');
// data.user.role → 'admin' | 'captain' | 'kagawad' | 'resident'

// Submit complaint
const form = new FormData(document.getElementById('myForm'));
await api.blotter.submit(form);

// Get my complaints (resident sees only theirs)
const { data: records } = await api.blotter.list();

// Update status (kagawad)
await api.blotter.updateStatus(recordId, 'investigating');

// Get schedules
const schedList = await api.schedules.list();
// schedList[0].day_tag → 'today' | 'tomorrow' | 'upcoming'
```
