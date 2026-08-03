# Mushagashe Vocational Training Centre Portal - Project Prompt

## Project Overview
Create a fully functional vocational training center portal for Mushagashe Vocational Training Centre. This is a production-ready system, not a demo. The portal serves both students and administrators with role-based access control, fee management, academic results tracking, and announcements.

## Tech Stack

### Frontend
- **Pure HTML/CSS/JavaScript** (No frameworks)
- Custom CSS with CSS variables for theming
- Simple HTTP server for serving static files
- Port: 3000

### Backend
- **Node.js + Express**
- **SQLite** database for data persistence
- **JWT** for authentication
- **bcryptjs** for password hashing
- **CORS** enabled for cross-origin requests
- Port: 5000

## Branding & Design Requirements

### Color Scheme
- **Primary Purple**: #6B21A8 (deep purple)
- **Secondary Purple**: #7C3AED (medium purple)
- **Light Purple**: #E9D5FF (light purple)
- **Primary Yellow**: #CA8A04 (golden yellow)
- **Secondary Yellow**: #EAB308 (bright yellow)
- **Light Yellow**: #FEF9C3 (light yellow)
- **White**: #FFFFFF (white)
- **Gray**: #6B7280 (neutral gray)

### Design Elements
- Professional gradients using purple and yellow
- Modern card-based layout with shadows
- Responsive design for mobile and desktop
- Smooth animations and transitions
- Clean typography with clear hierarchy
- Footer with automatic copyright year update

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE,
  student_number TEXT UNIQUE,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  phone TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### Updates/Announcements Table
```sql
CREATE TABLE updates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER
)
```

### Fees Table
```sql
CREATE TABLE fees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  amount REAL NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'unpaid',
  due_date DATETIME,
  paid_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### Results Table
```sql
CREATE TABLE results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  course_name TEXT NOT NULL,
  grade TEXT NOT NULL,
  score REAL,
  semester TEXT,
  year INTEGER,
  remarks TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

## API Endpoints

### Authentication
- `POST /api/auth/admin/login` - Admin login with email/password
- `POST /api/auth/student/login` - Student login with student_number/password

### Student Management (Admin Only)
- `GET /api/students` - Get all students
- `POST /api/students` - Create new student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student

### Updates/Announcements
- `GET /api/updates` - Get all updates (public)
- `POST /api/updates` - Create update (admin only)

### Fees
- `GET /api/fees` - Get fees (admin sees all, students see own)
- `POST /api/fees` - Create fee record (admin only)
- `PUT /api/fees/:id/pay` - Mark fee as paid (admin only)
- `DELETE /api/fees/:id` - Delete fee (admin only)

### Results
- `GET /api/results` - Get results (admin sees all, students see own)
- `POST /api/results` - Create result (admin only)
- `PUT /api/results/:id` - Update result (admin only)
- `DELETE /api/results/:id` - Delete result (admin only)

### Profile
- `GET /api/profile` - Get current user profile

## Frontend Features

### Student Portal
- Login with student number and password
- Dashboard showing:
  - Personal information
  - Fee status and payment history
  - Academic results
  - Latest announcements/updates
- Navigation to logout

### Admin Portal
- Login with email and password
- Dashboard showing:
  - Statistics (total students, pending fees, etc.)
  - Student management (CRUD operations)
  - Fee management (create, mark as paid, delete)
  - Results management (CRUD operations)
  - Announcements management (create and display)
- Modal dialogs for all CRUD operations
- Navigation to logout

### Automatic Features
- Copyright year automatically updates to current year
- Responsive design for all screen sizes
- Error handling for API failures
- Loading states during data fetching

## Default Credentials
- **Admin Email**: admin@mushagashe.edu
- **Admin Password**: admin123
- **Default admin account created automatically on first run**

## Installation Instructions

### Backend Setup
1. Navigate to backend directory
2. Run `npm install` to install dependencies
3. Run `npm start` to start the backend server on port 5000
4. SQLite database will be created automatically as `database.sqlite`

### Frontend Setup
1. Navigate to frontend directory
2. Ensure `index.html`, `styles.css`, and `app.js` are present
3. Run `node server.cjs` to start the frontend server on port 3000
4. Access the portal at http://localhost:3000

## Project Structure

### Backend
```
backend/
├── package.json
├── server.js
└── database.sqlite (auto-generated)
```

### Frontend
```
frontend/
├── index.html
├── styles.css
├── app.js
├── server.cjs
└── package.json
```

## Key Requirements

1. **No Frameworks**: Frontend must use pure HTML/CSS/JavaScript
2. **Role-Based Access**: Separate login flows for students and admins
3. **Professional Design**: Purple, yellow, and white color scheme throughout
4. **Automatic Copyright**: Year must update automatically
5. **Full CRUD**: Complete create, read, update, delete operations for all entities
6. **Error Handling**: Proper error messages and loading states
7. **Responsive**: Must work on mobile and desktop
8. **Production Ready**: This is a fully functional system, not a demo

## Security Considerations
- Passwords hashed with bcrypt
- JWT tokens for authentication
- Role-based access control on all protected routes
- CORS enabled for frontend-backend communication
- Input validation on all forms

## Additional Notes
- The portal is financed by Ecobank (mentioned in footer)
- Default admin account should be created if it doesn't exist
- Database initialization should handle existing tables gracefully
- Frontend should handle API errors gracefully with user-friendly messages
