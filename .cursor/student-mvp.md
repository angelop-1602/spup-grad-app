Absolutely! Here's a **complete implementation guideline for the Student role** in your GRAD-APP system — scoped for both **backend (Laravel 12)** and **frontend (React 18)**, with clear instructions for:

* Auth
* Profile setup
* Graduation application flow
* Validation
* Data structure
* Access limits

This guide ensures the **student experience is seamless**, data integrity is maintained, and everything is scoped within the correct application window.

---

# 🎓 STUDENT IMPLEMENTATION GUIDE

**Platform:** Laravel 12 (API) + React 18 (SPA)

---

## 🔐 1. STUDENT AUTHENTICATION

### ✅ Register (React → Laravel API)

* Fields:

  * Student ID
  * Email
  * Password
  * Confirm Password
* Action:

  * `POST /register`
* Auto-assign role as `student`
* Redirect to `/profile` after registration

### ✅ Login

* `POST /login`
* On success:

  * Store token in HTTP-only cookie or localStorage
  * Redirect to dashboard

---

## 🧾 2. STUDENT PROFILE SETUP

Upon first login, student is required to complete their profile.
This data will autofill the application form for future use.

### 📄 Profile Fields (All Required Unless Noted)

#### Personal Info

| Field                                | Notes                                     |
| ------------------------------------ | ----------------------------------------- |
| Student ID Number                    | From registration                         |
| Last Name / First Name / Middle Name | Basic ID                                  |
| Date of Birth                        | Format: `dd/mm/yyyy`                      |
| Place of Birth                       | Text                                      |
| Sex                                  | Dropdown: Male, Female, Prefer not to say |
| Civil Status                         | Dropdown                                  |
| Religion                             | Text or dropdown                          |
| Nationality                          | Dropdown                                  |
| Permanent Address                    | Textarea                                  |
| Contact Number                       | Format `+639...` or `0916...`             |
| Email Address                        | Validated, read-only (from auth)          |

#### Educational Background

✅ Stored in student profile to **avoid retyping in each application**

* **Grade School**: Grades 1–6 (name, year graduated)
* **Junior High School**: 1st–4th Year
* **Senior High School**: Grade 11 & 12 (N/A accepted)
* **College**: Degree, school name, year graduated, note for transferees
* **Graduate School**: Masteral, Doctoral (can be N/A)

### 🔁 API Endpoints

| Method | URL            | Notes                                |
| ------ | -------------- | ------------------------------------ |
| `GET`  | `/profile`     | Fetch full profile                   |
| `PUT`  | `/profile`     | Update profile                       |
| `GET`  | `/departments` | For course/major selection dropdowns |

---

## 📝 3. GRADUATION APPLICATION SUBMISSION

Accessible only during the **active application window**.

### 💡 Key Rules

* One submission per student **per application window**
* Can **edit** submission **only within active window**
* Student can **view past submissions (read-only)**

### 📄 Application Form Fields

| Section           | Fields                                         |
| ----------------- | ---------------------------------------------- |
| Presence          | Graduation Presence (dropdown)                 |
| Degree/Title      | Auto-filled from profile                       |
| Major             | Dropdown                                       |
| Department        | Dropdown                                       |
| Course            | Dropdown (filtered by department)              |
| Subjects Enrolled | Repeating fields: Subject + Units (max 6 rows) |

### 💬 Form Behavior

* Autofill fields from profile
* Input validation with error messages
* Submission button disabled when:

  * No active window
  * Already submitted in the current window

### 📤 API Endpoints

| Method | URL                  | Access                                |
| ------ | -------------------- | ------------------------------------- |
| `GET`  | `/windows/current`   | Fetch active window (for timer)       |
| `POST` | `/applications`      | Submit application                    |
| `GET`  | `/applications`      | Get all student's submissions         |
| `GET`  | `/applications/{id}` | View details of an application        |
| `PUT`  | `/applications/{id}` | Update application (if within window) |

---

## 🕓 4. APPLICATION WINDOW + TIMER (Landing Page)

### Landing Page (`/`)

* Hero section only
* Countdown timer:

  * If `now < start`: “Applications open in: [time]”
  * If `within window`: “Submit before: [time remaining]”
  * If `past`: “Application period is closed”

### Logic:

* Use `GET /windows/current`
* If no active window, disable the application form or submission button

---

## 📊 5. STUDENT DASHBOARD (`/dashboard`)

### Sections:

#### 🟢 Current Application

* Show active window name
* Show if application submitted
* If yes:

  * Status: Submitted, Under Review, Approved, Rejected
  * View/edit button (if within window)

#### 🕘 Past Applications

* List of all previous application windows (read-only)
* Application details per window

---

## ✅ 6. VALIDATION RULES (Frontend + Backend)

| Field                  | Rule                                |
| ---------------------- | ----------------------------------- |
| Phone Number           | Regex for local or international    |
| Date of Birth          | Must be valid date                  |
| Email                  | Must be unique                      |
| Application Submission | Allow only 1 per window             |
| Subject Enrollments    | Max 6 entries, min 1 required       |
| Profile Completion     | All fields required before applying |

---

## 🧩 REACT COMPONENT SUGGESTIONS

```tsx
<LandingHero />
<CountdownTimer />
<RegisterForm />
<LoginForm />
<ProfileForm />
<EducationBackgroundForm />
<ApplicationForm />
<SubjectsForm />
<ApplicationList />
<EditApplicationModal />
```

---

## 🗃️ DATABASE TABLES (Student Side)

### `student_profiles`

| Column                                                                           | Type        |
| -------------------------------------------------------------------------------- | ----------- |
| id                                                                               | PK          |
| user_id                                                                          | FK          |
| dob, pob, sex, civil_status, religion, nationality, contact_number, address, ... | String/date |

### `applications`

| Column        | Type                                                       |
| ------------- | ---------------------------------------------------------- |
| id            | PK                                                         |
| user_id       | FK                                                         |
| window_id     | FK                                                         |
| department_id | FK                                                         |
| course_id     | FK                                                         |
| major         | String                                                     |
| degree_title  | String                                                     |
| presence      | Enum                                                       |
| status        | Enum (`submitted`, `under_review`, `approved`, `rejected`) |

### `subject_enrollments`

| Column         | Type   |
| -------------- | ------ |
| application_id | FK     |
| subject_name   | String |
| units          | Int    |

---

## 📤 EXPORT (Admin/Coordinator Only)

No need for student-side export. Students view submissions only.

---

## ✅ STUDENT FLOW SUMMARY

```text
Register/Login ➝ Complete Profile ➝ Wait for Active Window ➝
Fill Application ➝ Submit ➝ Track Status ➝ View History (Read-Only)
```

---

Would you like next:

* A wireframe mockup of the Student Dashboard?
* React component file structure?
* Laravel migration files for student-related tables?

Let me know how you'd like to proceed 👇
