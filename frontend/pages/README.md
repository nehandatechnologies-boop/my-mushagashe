# Mushagashe Vocational Training Centre Portal

A comprehensive, production-ready Student Information Management System for Mushagashe Vocational Training Centre. This portal provides complete functionality for students and administrators including academic records, fee management, course management, results tracking, and announcements.

## Features

### For Students
- **Secure Authentication**: Separate login system using student number
- **Personal Dashboard**: Overview of academic progress, fees, and announcements
- **Academic Records**: View grades, GPA, and academic results
- **Fee Management**: Track payments, outstanding balances, and fee history
- **Course Information**: View enrolled course details
- **Profile Management**: Update personal information and change password
- **Announcements**: Stay updated with latest news and important notices

### For Administrators
- **Comprehensive Dashboard**: Statistics on students, courses, fees, and results
- **Student Management**: Full CRUD operations, suspend/activate, reset passwords, assign courses
- **Course Management**: Create and manage vocational courses with enrollment tracking
- **Fee Management**: Create fee records, record payments, generate receipts
- **Results Management**: Enter and manage academic results with grade calculation
- **Announcement System**: Create announcements with priority levels (urgent, important, normal, low)
- **Search & Filter**: Advanced search across all entities
- **Role-Based Access**: Secure admin-only operations

## Tech Stack

### Frontend
- **HTML5**: Semantic markup
- **CSS3**: Custom styling with CSS variables
- **Vanilla JavaScript**: No frameworks, pure JavaScript
- **Responsive Design**: Mobile-friendly interface

### Backend
- **Node.js**: JavaScript runtime
- **Express**: Web application framework
- **SQLite**: Lightweight database with proper foreign keys
- **JWT**: JSON Web Tokens for authentication
- **bcryptjs**: Password hashing
- **Helmet**: Security headers
- **Express Rate Limit**: Rate limiting for API protection
- **Morgan**: HTTP request logging
- **Express Validator**: Input validation
- **Multer**: File upload support (for profile pictures)
- **PDFKit**: PDF generation for reports

## Project Structure

```
vocational-portal/
├── backend/
│   ├── config/
│   │   └── database.js          # Database connection helpers
│   ├── controllers/
│   │   ├── authController.js    # Authentication logic
│   │   ├── studentController.js # Student management
│   │   ├── courseController.js  # Course management
│   │   ├── feeController.js     # Fee management
│   │   ├── resultController.js  # Results management
│   │   ├── announcementController.js
│   │   └── dashboardController.js
│   ├── middleware/
│   │   ├── auth.js              # JWT authentication
│   │   ├── security.js          # Helmet, rate limiting, CORS
│   │   └── errorHandler.js      # Global error handling
│   ├── models/
│   │   ├── User.js              # User model
│   │   ├── Course.js            # Course model
│   │   ├── Fee.js               # Fee model
│   │   ├── Result.js            # Result model
│   │   └── Announcement.js      # Announcement model
│   ├── routes/
│   │   ├── authRoutes.js        # Authentication routes
│   │   ├── studentRoutes.js     # Student routes
│   │   ├── courseRoutes.js      # Course routes
│   │   ├── feeRoutes.js         # Fee routes
│   │   ├── resultRoutes.js      # Result routes
│   │   ├── announcementRoutes.js
│   │   └── dashboardRoutes.js   # Dashboard statistics
│   ├── database/
│   │   └── init.js              # Database initialization
│   ├── uploads/                 # Profile picture uploads
│   ├── logs/                    # Application logs
│   ├── .env                     # Environment variables
│   ├── package.json
│   └── server.js                # Main Express server
├── frontend/
│   ├── pages/
│   │   ├── index.html           # Landing page
│   │   ├── student-login.html   # Student login
│   │   ├── admin-login.html     # Admin login
│   │   ├── student-dashboard.html
│   │   └── admin-dashboard.html
│   ├── assets/
│   │   ├── css/
│   │   │   └── styles.css       # Custom CSS with purple theme
│   │   └── js/
│   │       ├── student-login.js
│   │       ├── admin-login.js
│   │       ├── student-dashboard.js
│   │       └── admin-dashboard.js
│   └── server.cjs              # Simple HTTP server
└── README.md
```

## Installation

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables (edit `.env` file if needed):
```env
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-change-in-production
DB_PATH=./database/mushagashe.db
ADMIN_EMAIL=admin@mushagashe.edu
ADMIN_PASSWORD=admin123
```

4. Start the backend server:
```bash
npm start
```

The backend will run on `http://localhost:5000` and automatically create the SQLite database with all required tables and sample data.

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Start the frontend server:
```bash
node server.cjs
```

The frontend will run on `http://localhost:3000`.

## Default Credentials

### Admin Account
- **Email**: admin@mushagashe.edu
- **Password**: admin123

### Sample Student Account
- **Student Number**: STU2024001
- **Password**: student123

⚠️ **Important**: Change the default admin password in production by updating the `.env` file. Delete the sample student account after testing.

## Usage

### Student Login
1. Navigate to `http://localhost:3000`
2. Click "Student Login"
3. Enter student number and password
4. Access dashboard to view academic records, fees, and announcements

### Admin Login
1. Navigate to `http://localhost:3000`
2. Click "Admin Login"
3. Enter email and password
4. Access admin panel to manage students, courses, fees, results, and announcements

### Admin Operations
- **Students**: Create, edit, delete, suspend, activate students; assign courses; reset passwords
- **Courses**: Create and manage vocational courses with enrollment tracking
- **Fees**: Create fee records, record payments, generate receipts
- **Results**: Enter academic results with automatic grade calculation
- **Announcements**: Create announcements with priority levels

## API Endpoints

### Authentication
- `POST /api/auth/admin/login` - Admin login
- `POST /api/auth/student/login` - Student login
- `GET /api/profile` - Get current user profile
- `PUT /api/profile` - Update profile
- `PUT /api/change-password` - Change password

### Students (Admin Only)
- `GET /api/students` - Get all students with filters
- `POST /api/students` - Create new student
- `GET /api/students/:id` - Get student by ID
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student
- `PUT /api/students/:id/suspend` - Suspend student
- `PUT /api/students/:id/activate` - Activate student
- `PUT /api/students/:id/reset-password` - Reset password
- `PUT /api/students/:id/assign-course` - Assign course

### Courses
- `GET /api/courses` - Get all courses (authenticated)
- `GET /api/courses/with-count` - Get courses with student count (admin)
- `POST /api/courses` - Create course (admin)
- `GET /api/courses/:id` - Get course by ID
- `PUT /api/courses/:id` - Update course (admin)
- `DELETE /api/courses/:id` - Delete course (admin)

### Fees
- `GET /api/fees` - Get fees (admin sees all, students see own)
- `POST /api/fees` - Create fee (admin)
- `GET /api/fees/:id` - Get fee by ID
- `PUT /api/fees/:id` - Update fee (admin)
- `POST /api/fees/:id/payment` - Record payment (admin)
- `DELETE /api/fees/:id` - Delete fee (admin)
- `GET /api/fees/statistics` - Get fee statistics (admin)
- `GET /api/fees/outstanding` - Get outstanding balance (student)
- `GET /api/fees/generate-receipt` - Generate receipt number (admin)

### Results
- `GET /api/results` - Get results (admin sees all, students see own)
- `POST /api/results` - Create result (admin)
- `POST /api/results/import` - Bulk import results (admin)
- `GET /api/results/:id` - Get result by ID
- `PUT /api/results/:id` - Update result (admin)
- `DELETE /api/results/:id` - Delete result (admin)
- `GET /api/results/statistics` - Get result statistics (admin)
- `GET /api/results/gpa` - Get student GPA (student)

### Announcements
- `GET /api/announcements` - Get all announcements (authenticated)
- `GET /api/announcements/latest` - Get latest announcements (public)
- `GET /api/announcements/urgent` - Get urgent announcements (public)
- `POST /api/announcements` - Create announcement (admin)
- `GET /api/announcements/:id` - Get announcement by ID
- `PUT /api/announcements/:id` - Update announcement (admin)
- `DELETE /api/announcements/:id` - Delete announcement (admin)
- `GET /api/announcements/statistics` - Get announcement statistics (admin)

### Dashboard
- `GET /api/dashboard/statistics` - Get comprehensive statistics (admin)
- `GET /api/dashboard/student` - Get student dashboard data (student)
- `GET /api/dashboard/charts` - Get chart data for analytics (admin)

## Database Schema

### Users
- `id` - Primary key
- `full_name` - Full name
- `email` - Unique email (for admin)
- `student_number` - Unique student number (for students)
- `password` - Hashed password
- `role` - 'admin' or 'student'
- `phone` - Phone number
- `gender` - Gender
- `national_id` - National ID
- `date_of_birth` - Date of birth
- `address` - Physical address
- `guardian_name` - Guardian name
- `guardian_phone` - Guardian phone
- `intake_year` - Year of enrollment
- `status` - 'active' or 'suspended'
- `profile_picture` - Profile picture path
- `course_id` - Foreign key to courses
- `created_at` - Timestamp

### Courses
- `id` - Primary key
- `course_code` - Unique course code
- `course_name` - Course name
- `department` - Department
- `duration` - Duration in years
- `description` - Course description
- `created_at` - Timestamp

### Fees
- `id` - Primary key
- `user_id` - Foreign key to users
- `fee_category` - Category (Registration, Tuition, Examination, etc.)
- `amount` - Total amount
- `amount_paid` - Amount paid
- `balance` - Outstanding balance
- `payment_reference` - Payment reference
- `payment_method` - Payment method
- `receipt_number` - Receipt number
- `payment_date` - Payment date
- `due_date` - Due date
- `status` - 'unpaid', 'partial', or 'paid'
- `created_at` - Timestamp

### Results
- `id` - Primary key
- `user_id` - Foreign key to users
- `course_id` - Foreign key to courses
- `semester` - Semester (1 or 2)
- `academic_year` - Academic year
- `assessment_mark` - Assessment mark
- `exam_mark` - Exam mark
- `final_mark` - Final mark
- `grade` - Grade (A, B, C, D, E, F)
- `credits` - Course credits
- `lecturer` - Lecturer name
- `remarks` - Remarks
- `created_at` - Timestamp

### Announcements
- `id` - Primary key
- `title` - Announcement title
- `message` - Announcement message
- `priority` - 'low', 'normal', 'important', or 'urgent'
- `created_by` - Foreign key to users (admin)
- `created_at` - Timestamp

### Audit Logs
- `id` - Primary key
- `user_id` - Foreign key to users
- `action` - Action performed
- `entity_type` - Type of entity
- `entity_id` - Entity ID
- `details` - Action details
- `ip_address` - IP address
- `created_at` - Timestamp

## Design & Branding

The portal uses a professional purple, yellow, and white color scheme:

- **Primary Purple**: #6B21A8
- **Secondary Purple**: #7C3AED
- **Light Purple**: #E9D5FF
- **Primary Yellow**: #CA8A04
- **Secondary Yellow**: #EAB308
- **Light Yellow**: #FEF9C3
- **White**: #FFFFFF
- **Gray**: #6B7280

All pages include the footer: "Powered by Mushagashe Vocational Training Centre • Financed by Ecobank"

## Security Features

- **Helmet**: Security headers for HTTP responses
- **Rate Limiting**: Protection against brute force attacks
- **CORS**: Configured cross-origin resource sharing
- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for secure password storage
- **Input Validation**: Express Validator for request validation
- **SQL Injection Prevention**: Prepared statements for all database queries
- **XSS Protection**: Content Security Policy headers
- **Request Logging**: Morgan for HTTP request logging

## Development

### Adding New Features
The project follows MVC architecture:
1. Add model in `models/` directory
2. Add controller logic in `controllers/` directory
3. Add routes in `routes/` directory
4. Update server.js to include new routes

### Customizing Styling
Edit `frontend/assets/css/styles.css` to modify the design. CSS variables are defined at the top for easy customization.

### Database Modifications
Edit `backend/database/init.js` to modify the database schema. Tables are created automatically on server start if they don't exist.

## Production Deployment

⚠️ **Important Security Steps**:

1. **Change JWT Secret**: Update `JWT_SECRET` in `.env` file
2. **Change Admin Password**: Update `ADMIN_PASSWORD` in `.env` file
3. **Use HTTPS**: Configure SSL/TLS for production
4. **Environment Variables**: Never commit `.env` file to version control
5. **Database Backup**: Implement regular database backups
6. **Firewall**: Configure firewall rules to restrict access
7. **Monitoring**: Set up application monitoring and error tracking

## License

This project is open source and available for educational purposes.

## Support

For issues or questions, please contact the development team.
