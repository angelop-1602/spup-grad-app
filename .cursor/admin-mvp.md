# 🧑‍💼 ADMIN IMPLEMENTATION GUIDE

**Role**: Admin
**Platform**: Laravel 12 (API) + React 18 (SPA)

---

## 🧭 ADMIN RESPONSIBILITIES SUMMARY

The Admin is the **central authority** in the GRAD-APP system. Admins:

| Responsibility                       | Scope                                         |
| ------------------------------------ | --------------------------------------------- |
| 🔧 Define Application Windows        | Students can only submit within these         |
| 🧾 View All Applications             | Across departments and windows                |
| 📁 Export Applications               | Filter by window, department, format          |
| 🧑‍🏫 Manage Coordinators            | Create/assign roles                           |
| 🏛 Manage Departments/Courses/Majors | Add/edit academic structure                   |
| 👤 View Students                     | Access profiles, audit logs, filter by window |

---

## 🔐 ACCESS CONTROL

| Area                    | Access                                |
| ----------------------- | ------------------------------------- |
| All application windows | ✅ Full access (past, current, future) |
| All applications        | ✅ All windows, all departments        |
| Student info            | ✅ View-only                           |
| Coordinator access      | ✅ Manage                              |
| System config           | ✅ Departments, courses, majors        |

> ✅ Admin sees **everything**
> 🚫 Admin does **not submit applications**

---

## ⚙️ SYSTEM MODULES FOR ADMIN

---

### 📆 1. APPLICATION WINDOWS

Windows anchor the entire system — all student applications are bound to a window.

#### 🧾 Fields:

| Field        | Type                                  |
| ------------ | ------------------------------------- |
| `title`      | String (e.g. "Graduation Batch 2026") |
| `start_date` | Date                                  |
| `end_date`   | Date                                  |

#### 🛠 Features:

* Create, update, delete (soft delete optional)
* Only one can be “active” at a time
* Automatically determine active window via date

#### 🚨 Constraints:

* No student submissions allowed without active window
* Admin can view applications grouped by window
* Coordinators can only see apps in active window

#### 📤 API:

| Method   | Endpoint        |
| -------- | --------------- |
| `GET`    | `/windows`      |
| `GET`    | `/windows/all`  |
| `POST`   | `/windows`      |
| `PUT`    | `/windows/{id}` |
| `DELETE` | `/windows/{id}` |

---

### 🧾 2. APPLICATION MANAGEMENT

#### 🧾 What Admin Can Do:

* View all applications
* Filter by:

  * Application window
  * Department
  * Course
  * Status (submitted, approved, rejected)
* View application details
* Cannot edit student-submitted data

#### 📊 Application Statuses:

| Status       | Trigger                       |
| ------------ | ----------------------------- |
| Submitted    | Student submits               |
| Under Review | Default or Coordinator update |
| Approved     | Coordinator action            |
| Rejected     | Coordinator action            |

#### 📤 API:

| Method                                                   | Endpoint             |
| -------------------------------------------------------- | -------------------- |
| `GET`                                                    | `/applications`      |
| `GET`                                                    | `/applications/{id}` |
| Filters: `?window_id=1&department_id=2&status=submitted` |                      |

---

### 📤 3. EXPORT MODULE

Admin can export application data per:

* Application window
* Department
* Format: `.csv`, `.xlsx`, `.pdf`

#### 📋 Output Includes:

* Summary block:

  * Total applications
  * Count by status (approved, rejected, etc.)
  * Count by department
* Application list (student, course, status, submission date)

#### 📤 API:

| Method | Endpoint                                                       |
| ------ | -------------------------------------------------------------- |
| `GET`  | `/export/applications?window_id=1&department_id=2&format=xlsx` |

#### 📦 Backend:

* Use **Laravel Excel** (`maatwebsite/excel`)
* Use **DOMPDF / Snappy** for PDF

---

### 🏫 4. DEPARTMENT / COURSE / MAJOR MANAGEMENT

These are managed centrally by Admin.

#### 🎓 Hierarchical Structure:

* Department → Course → Major

#### Actions:

* Create, edit, delete:

  * Departments
  * Courses (must belong to department)
  * Majors (must belong to course)

#### 📤 API:

| Type   | Endpoint                                   |
| ------ | ------------------------------------------ |
| GET    | `/departments`                             |
| POST   | `/departments`                             |
| POST   | `/courses`                                 |
| POST   | `/majors`                                  |
| PUT    | `/departments/{id}`                        |
| DELETE | `/departments/{id}` (optional soft delete) |

---

### 👥 5. USER & COORDINATOR MANAGEMENT

Admins can:

* View all users
* Assign Coordinator role to users
* Assign a coordinator to a department

#### 📤 API:

| Type | Endpoint                                     |
| ---- | -------------------------------------------- |
| GET  | `/users`                                     |
| POST | `/users/assign-role`                         |
| GET  | `/coordinators`                              |
| POST | `/coordinators` (create + assign department) |

---

### 👤 6. STUDENT PROFILE VIEW

Admins can:

* View any student’s profile and educational background
* See submitted applications per student
* Cannot modify profile or application

#### 📤 API:

| Method | Endpoint                      |
| ------ | ----------------------------- |
| GET    | `/students`                   |
| GET    | `/students/{id}`              |
| GET    | `/students/{id}/applications` |

---

## 🧩 REACT ADMIN INTERFACE STRUCTURE

### 🗂️ Main Pages

| Page                  | Description                                                         |
| --------------------- | ------------------------------------------------------------------- |
| `/admin/dashboard`    | Summary widgets: # of applications, current window, pending reviews |
| `/admin/windows`      | Manage application windows                                          |
| `/admin/applications` | View/filter/export all applications                                 |
| `/admin/departments`  | Manage academic structure                                           |
| `/admin/coordinators` | Manage coordinator accounts                                         |
| `/admin/students`     | View student list and profiles                                      |

### 🧩 Suggested Components

```tsx
<WindowManager />
<ApplicationList />
<ExportPanel />
<DepartmentCourseManager />
<CoordinatorManager />
<StudentProfileViewer />
<DashboardWidgets />
```

---

## 🗃️ DATABASE MODELS USED BY ADMIN

| Model                   | Fields / Notes                             |
| ----------------------- | ------------------------------------------ |
| `ApplicationWindow`     | `title`, `start_date`, `end_date`          |
| `Application`           | `user_id`, `department_id`, `status`, etc. |
| `Department`            | Name, code                                 |
| `Course`                | `department_id`, name                      |
| `Major`                 | `course_id`, name                          |
| `User`                  | Name, email, role                          |
| `CoordinatorAssignment` | `user_id`, `department_id`                 |
| `StudentProfile`        | Personal and educational fields            |

---

## ✅ ADMIN ACTION FLOW

```text
1. Create Application Window
2. Review submissions under current window
3. Assign/reassign coordinators to departments
4. Manage departments, courses, majors
5. Export application data
6. View students and audit submissions
```

---

## 🔐 SECURITY

* Only users with role `admin` can access admin routes
* All routes protected via middleware:

  * `auth:sanctum`
  * `role:admin`

---

## ✅ FINAL NOTES

| Feature                          | Status     |
| -------------------------------- | ---------- |
| Application Window Lifecycle     | ✅ Included |
| Role-Based Access                | ✅ Included |
| Export with Summary              | ✅ Included |
| Student & Coordinator Management | ✅ Included |
| Department Hierarchy             | ✅ Included |
| Frontend Component Plan          | ✅ Included |

---
