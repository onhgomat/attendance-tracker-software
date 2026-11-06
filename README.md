# Attendify – Face Recognition-Based Attendance Management System

Attendify is a full-stack attendance management system that combines facial recognition with administrative attendance management. It allows students to verify their identity through face recognition while administrators manage student records, review attendance requests, and monitor system activity.

**GitHub Repository:** https://github.com/onhgomat/attendance-tracker-software

## Features

- **Admin Authentication:** Secure admin registration and login using JWT authentication and password hashing.
- **Student Management:** Register and manage student records using unique enrollment numbers.
- **Face Registration:** Capture facial samples and generate face embeddings.
- **Face Verification:** Verify student identity using OpenCV YuNet and SFace.
- **Automatic Attendance:** Automatically record attendance when face verification meets the configured threshold.
- **Manual Attendance Review:** Allow administrators to approve or reject lower-confidence attendance requests.
- **Attendance Records:** View student-wise and overall attendance records.
- **Activity Monitoring:** Maintain administrative activity logs in MySQL.
- **Dual Database Architecture:** Use MongoDB for application data and MySQL for audit logging.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, Vite, Tailwind CSS |
| Backend | Node.js, Express.js |
| Authentication | JWT, bcrypt |
| Main Database | MongoDB, Mongoose |
| Audit Database | MySQL, Sequelize |
| Face Recognition | Python, OpenCV |
| Face Detection | YuNet |
| Face Recognition Model | SFace |
| API Communication | REST APIs |

## Project Structure

```text
attendance-tracker/
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   └── ...
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── server.js
│   └── package.json
│
├── face-service/
│   ├── models/
│   └── app.py
│
├── .gitignore
└── README.md
```

## Prerequisites

Install the following before starting:

- Git
- Node.js and npm
- Python 3.11 recommended
- MySQL Server 8.0
- MongoDB Atlas account or local MongoDB installation
- Webcam for face registration and verification

## 1. Clone the Repository

```bash
git clone https://github.com/onhgomat/attendance-tracker-software.git
cd attendance-tracker-software
```

## 2. MongoDB Configuration

You can use MongoDB Atlas or a local MongoDB server.

For MongoDB Atlas:

1. Create a MongoDB cluster.
2. Create a database user.
3. Configure Network Access to allow your development machine.
4. Copy the MongoDB connection URI.

The connection URI will be configured through the `MONGO_URI` environment variable.

## 3. MySQL Database Setup

Start MySQL Server and open MySQL Workbench or the MySQL command-line client.

Execute:

```sql
CREATE DATABASE attendify_db;

CREATE USER 'attendify_app'@'localhost'
IDENTIFIED BY 'YOUR_STRONG_PASSWORD';

GRANT ALL PRIVILEGES ON attendify_db.*
TO 'attendify_app'@'localhost';

FLUSH PRIVILEGES;
```

Replace `YOUR_STRONG_PASSWORD` with your own password.

The backend uses Sequelize to connect to MySQL. The `admin_activity_logs` table is synchronized when the backend starts.

### Database Responsibilities

- **MongoDB:** Admins, students, attendance requests and attendance records.
- **MySQL:** Administrative and attendance activity logs.

## 4. Backend Environment Configuration

Navigate to the backend folder:

```bash
cd backend
```

Create a `.env` file inside `backend/`.

Add:

```env
PORT=5000

MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_long_random_secret
JWT_EXPIRES_IN=7d

MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=attendify_db
MYSQL_USER=attendify_app
MYSQL_PASSWORD=your_mysql_password
```

Use your own credentials. Never upload `.env` to GitHub.

## 5. Install and Run the Backend

From the `backend/` directory:

```bash
npm install
npm run dev
```

Backend URL:

```text
http://localhost:5000
```

Test the backend:

```text
http://localhost:5000/
```

The backend should establish connections to both MongoDB and MySQL.

## 6. Install and Run the Frontend

Open a new terminal at the project root:

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

## 7. Python Face Recognition Service Setup

Open another terminal at the project root:

```powershell
cd face-service

py -3.11 -m venv .venv

.\.venv\Scripts\Activate.ps1

python -m pip install --upgrade pip

pip install Flask Flask-Cors opencv-contrib-python numpy requests
```

If PowerShell blocks virtual environment activation:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

Start the service:

```bash
python app.py
```

The application provides two modes:

- **Option 1:** Face registration workflow.
- **Option 2:** Start the face verification API.

For attendance verification, select Option 2.

The face service uses the following ONNX models:

- `face_detection_yunet_2023mar.onnx`
- `face_recognition_sface_2021dec.onnx`

Ensure the model files are available in `face-service/models/`.

## 8. Admin Registration

Start the backend and register the first administrator through the admin registration interface or API.

Example using PowerShell:

```powershell
$body = @{
    name = "Project Admin"
    email = "admin@example.com"
    password = "ChangeThisPassword123!"
} | ConvertTo-Json

Invoke-RestMethod `
    -Uri "http://localhost:5000/api/admin/register" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

Use your registered credentials to log in through the admin portal.

## 9. Student Registration

1. Log in as an administrator.
2. Navigate to the Students section.
3. Register a student using their name and unique enrollment number.
4. Verify that the student appears in the student list.

## 10. Face Registration and Attendance Workflow

The intended workflow is:

1. Register the student in the admin dashboard.
2. Start the Python face service and select Option 1.
3. Enter the student's enrollment number.
4. Capture the required face samples.
5. Start the face verification API using Option 2.
6. Open the attendance page.
7. Enter the student's enrollment number.
8. Complete face verification.
9. If the match satisfies the configured threshold, attendance can be recorded automatically.
10. Otherwise, the request is sent to the admin dashboard for manual review.

**Important integration note:** The current standalone Python face-registration helper needs to forward an admin JWT when calling the protected backend face-registration endpoint. Configure that authentication before relying on the standalone registration workflow in a fresh installation. Do not make the endpoint public to bypass authentication.

## 11. API Endpoints

Base URL: `http://localhost:5000`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/admin/register` | Register administrator |
| POST | `/api/admin/login` | Admin login |
| GET | `/api/admin/profile` | Get authenticated admin profile |
| GET | `/api/admin/activity-logs` | Retrieve activity logs |
| POST | `/api/students/register` | Register student |
| POST | `/api/students/register-face` | Register student face |
| POST | `/api/attendance/verify` | Verify student face |
| POST | `/api/attendance/request` | Create attendance request |
| GET | `/api/attendance/pending` | Retrieve pending requests |
| PATCH | `/api/attendance/:id/review` | Approve or reject request |
| POST | `/api/attendance/record` | Create attendance record |
| GET | `/api/attendance/student/:enrollmentNumber` | Get student attendance |
| GET | `/api/attendance/records` | Get all attendance records |

Protected routes require:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

## 12. Running the Complete Application

Keep three terminals running:

| Terminal | Directory | Command |
|---|---|---|
| Backend | `backend/` | `npm run dev` |
| Frontend | `frontend/` | `npm run dev` |
| Face Service | `face-service/` | `python app.py` and select Option 2 |

Ensure MongoDB and MySQL are also running and reachable.

## Troubleshooting

### MongoDB connection failure

- Verify `MONGO_URI`.
- Check the database username and password.
- Check MongoDB Atlas Network Access settings.

### MySQL connection failure

- Ensure MySQL Server is running.
- Verify all MySQL environment variables.
- Confirm the database user has the required privileges.

### Face models not loading

- Check that both ONNX model files exist.
- Install `opencv-contrib-python`.
- Use a compatible Python environment.

### Camera not working

- Allow camera permissions in Windows.
- Close other applications using the webcam.
- Check whether the camera is detected by the operating system.

### Admin API returns 401

- Log in again.
- Check that the JWT is valid.
- Send the token using the Bearer authorization header.

## Security and Privacy

- Never commit `.env` files or credentials.
- Never upload real student biometric data or personal information to a public repository.
- Use consented test images and test identities.
- Use strong database passwords.
- Configure HTTPS, access controls, rate limiting and appropriate biometric-data retention policies before production deployment.
- The current local development configuration is not a production deployment configuration.

## Future Improvements

- Attendance analytics and visual reports.
- CSV/PDF attendance exports.
- Improved face-registration authentication.
- Production deployment.
- Enhanced security and biometric privacy controls.

## Author

**Tamoghno Ghosh**

GitHub: https://github.com/onhgomat

Repository: https://github.com/onhgomat/attendance-tracker-software

---

*Attendify – Intelligent Attendance Management Through Face Recognition.*
