Student Profile Structure
🧍 SECTION A: Personal Information
Label	Input Type	Notes
Student ID Number	Text	From registration or verified field
Last Name	Text	Required
First Name	Text	Required
Middle Name	Text	Optional
Permanent Address	Textarea	Full address, avoid abbreviations
Date of Birth	Date Picker	Format: dd/mm/yyyy
Place of Birth	Text	Full city/province
Sex	Dropdown	Male, Female, Prefer not to say
Civil Status	Dropdown	Single, Married, etc.
Religion	Text or dropdown	
Nationality	Dropdown	From predefined list
Contact Number	Text (masked input)	+639XXXXXXX or 09XXXXXXXXX
Email Address	Text (email)	Read-only if taken from login
🏫 SECTION B: Educational Background
1. Grade School
Grade Level	Fields
Grade 1–6	Name of School, Year Graduated
2. Junior High School
Year Level	Fields
1st–4th Year	Name of School, Year Graduated
3. Senior High School
Grade Level	Fields
Grade 11	Name of School, Year Graduated (or N/A, 0000)
Grade 12	Name of School, Year Graduated (or N/A, 0000)
4. College
Field	Type
Degree / Program	Text
Name of School	Text
Year Graduated	4-digit year or 0000 if not applicable
Transferee Note	Textarea - Optional info: name of school, semester, academic year of attendance
5. Graduate School
Level	Fields
Masteral	Name of School, Year Graduated (or N/A, 0000)
Doctoral	Name of School, Year Graduated (or N/A, 0000)
🔁 Form Behavior

All fields (except explicitly optional ones) are required

Email and student ID are auto-filled / system-locked where appropriate

Upon first login, student is redirected to this profile setup

Once saved, the profile:

Becomes the autofill source for future graduation applications

Can be edited from /profile page at any time