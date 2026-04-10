## Word Template Placeholders for Graduation Application

Use these placeholders in `GraduationApplicationFormTemplate.docx` with **PhpWord / TemplateProcessor**.  
In the **DOCX file**, each placeholder must be written in the form **`${placeholder_name}`**  
for the system to replace it with the student's data.

### Personal Data

| Placeholder                 | What it is                                                      |
| --------------------------- | --------------------------------------------------------------- |
| `${student_full_name}`     | Full name in display format, e.g. `Angelo P. Peralta`          |
| `${student_last_name}`     | Last name                                                      |
| `${student_first_name}`    | First name                                                     |
| `${student_middle_name}`   | Middle name (may be blank)                                     |
| `${student_id}`            | Student ID number (e.g. `2018-01939`)                          |
| `${student_email}`         | Student email address (login email / official school email)    |
| `${date_of_birth}`         | Date of birth (formatted date)                                 |
| `${place_of_birth}`        | Place of birth (city / province, etc.)                         |
| `${sex}`                   | Sex                                                            |
| `${civil_status}`          | Civil status (Single, Married, etc.)                           |
| `${religion}`              | Religion (may be blank)                                        |
| `${nationality}`           | Nationality                                                    |
| `${permanent_address}`     | Permanent home address                                         |
| `${contact_number}`        | Contact number (mobile/phone)                                  |

### Program / Application Details

| Placeholder                          | What it is                                                                 |
| ------------------------------------ | -------------------------------------------------------------------------- |
| `${application_window_title}`       | Name/title of the application window                                       |
| `${application_window_start_date}`  | Start date of the application window                                       |
| `${application_window_end_date}`    | End date of the application window                                         |
| `${application_status}`             | Current status (Submitted, Under Review, Approved, Rejected, Incomplete)   |
| `${course_name}`                    | Course / program name                                                      |
| `${major_name}`                     | Major (blank if no major)                                                  |
| `${department_name}`                | Department offering the program                                            |
| `${graduation_appearance}`          | `Attending` or `Not Attending`                                             |
| `${application_created_at}`         | Date and time the application was first submitted                          |
| `${application_updated_at}`         | Date and time the application was last updated                             |

### Graduate Program (if applicable)

| Placeholder             | What it is                                              |
| ----------------------- | ------------------------------------------------------- |
| `${thesis_title}`      | Thesis / Dissertation title                             |
| `${thesis_adviser}`    | Thesis / Dissertation adviser                           |

For subjects (graduate level), prepare a table with pre-defined rows:

| Placeholder set                    | What it is                                             |
| ---------------------------------- | ------------------------------------------------------ |
| `${subject_1_code}` / `${subject_1_title}` / `${subject_1_units}` | 1st subject – code, title, and units |
| `${subject_2_code}` / `${subject_2_title}` / `${subject_2_units}` | 2nd subject                              |
| … up to `${subject_6_code}` / `${subject_6_title}` / `${subject_6_units}` | Additional subject rows as needed |

### Educational Background

#### Grade School (Grades 1–6)

| Placeholder               | What it is                                 |
| ------------------------- | ------------------------------------------ |
| `${grade_1_school}`     | Grade 1 school                             |
| `${grade_1_year}`       | Year completed Grade 1                     |
| `${grade_2_school}`     | Grade 2 school                             |
| `${grade_2_year}`       | Year completed Grade 2                     |
| `${grade_3_school}`     | Grade 3 school                             |
| `${grade_3_year}`       | Year completed Grade 3                     |
| `${grade_4_school}`     | Grade 4 school                             |
| `${grade_4_year}`       | Year completed Grade 4                     |
| `${grade_5_school}`     | Grade 5 school                             |
| `${grade_5_year}`       | Year completed Grade 5                     |
| `${grade_6_school}`     | Grade 6 school                             |
| `${grade_6_year}`       | Year completed Grade 6                     |

#### Junior High School (Grades 7–10)

| Placeholder               | What it is                                 |
| ------------------------- | ------------------------------------------ |
| `${jhs_1_school}`       | Grade 7 (JHS 1) school                     |
| `${jhs_1_year}`         | Year completed Grade 7                     |
| `${jhs_2_school}`       | Grade 8 (JHS 2) school                     |
| `${jhs_2_year}`         | Year completed Grade 8                     |
| `${jhs_3_school}`       | Grade 9 (JHS 3) school                     |
| `${jhs_3_year}`         | Year completed Grade 9                     |
| `${jhs_4_school}`       | Grade 10 (JHS 4) school                    |
| `${jhs_4_year}`         | Year completed Grade 10                    |

#### Senior High School (Grades 11–12)

| Placeholder               | What it is                                 |
| ------------------------- | ------------------------------------------ |
| `${shs_11_school}`      | Grade 11 (SHS 1) school                    |
| `${shs_11_year}`        | Year completed Grade 11                    |
| `${shs_12_school}`      | Grade 12 (SHS 2) school                    |
| `${shs_12_year}`        | Year completed Grade 12                    |

#### College and Graduate Studies

| Placeholder                   | What it is                                              |
| ----------------------------- | ------------------------------------------------------- |
| `${college_degree}`          | College degree / program (e.g. BSIT)                   |
| `${college_school_name}`     | College / university name                              |
| `${college_year_graduated}`  | Year of college graduation                             |
| `${masters_school}`          | Graduate (Masters) school name                         |
| `${masters_year}`            | Year of Masters completion                             |
| `${doctoral_school}`         | Doctoral school name                                   |
| `${doctoral_year}`           | Year of Doctoral completion                            |

### Requirements Checklist

Each requirement has a status field you can show individually.  
To keep placeholders short in the template, you can use **numeric placeholders**:

| Placeholder | What it is                                               |
| ----------- | -------------------------------------------------------- |
| `${1}`      | Status of “Entry Requirements (TOR/F137, PSA, etc.)”    |
| `${2}`      | Status of “Complete Grades”                              |
| `${3}`      | Status of “Hardbound Copies of Theses/Dissertation…”    |
| `${4}`      | Status of “2x2 ID Picture with white background…”       |
| `${5}`      | Status of “Reviewer's Certification …”                   |
| `${6}`      | Status of “Certificate of Journal Publication …”         |

> The longer placeholders (`${req_entry_requirements_status}`, etc.) are still supported by the backend,  
> but you only need to use either the short numeric ones **or** the long ones in the DOCX template.

> Typical values for a requirement status are: **Pending**, **Completed**, **Incomplete**, or **Rejected**.

You can also include a combined list of remaining requirements:

| Placeholder                    | What it is                                                |
| ------------------------------ | --------------------------------------------------------- |
| `${missing_requirements_list}`| Semicolon-separated list of requirements not yet completed |

### Coordinator Approval

Use these when you need to show who approved the application and when:

| Placeholder              | What it is                                            |
| ------------------------ | ----------------------------------------------------- |
| `${coordinator_name}`   | Full name of the coordinator in charge of approval   |
| `${coordinator_department}` | Department of the coordinator (optional)        |
| `${approval_date}`      | Date the application was approved (formatted date)   |
| `${approval_datetime}`  | Full date and time of approval (if you need time)    |


