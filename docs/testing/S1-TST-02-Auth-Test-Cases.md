# Authentication Test Cases

**Project:** Gerodias PT (Hope, Inc. ERP)  
**Task ID:** S1-TST-02  
**Sprint:** Sprint 1  
**Sprint Duration:** October 27 - November 7, 2026  
**Prepared by:** Hazel Espiso  
**Role:** Test Engineer (TST)  
**Status:** In Progress

---

## 1. Introduction

This document presents the authentication test cases for Sprint 1 of the Gerodias PT (Hope, Inc. ERP) project. It defines the test scenarios, preconditions, test procedures, expected results, and actual results for the system's authentication features.

The testing focuses on user registration, login, logout, password setup, and password reset functionality. It also covers the handling of invalid credentials, password validation, expired reset tokens, and reused reset tokens.

The purpose of these test cases is to verify that authentication features function according to the project requirements and that users can securely access their accounts.

## 2. Testing Objectives

The objectives of authentication testing are to:

- Verify that users can register using valid information.
- Check that duplicate email addresses and invalid registration details are handled appropriately.
- Verify that users can log in using valid credentials.
- Check that invalid login attempts are rejected.
- Verify that users can log out and their sessions are properly terminated.
- Verify that pending accounts can complete the password setup process according to the project requirements.
- Check that users can request a password reset.
- Verify that valid password reset links allow users to change their passwords.
- Ensure that expired and previously used reset tokens are rejected.
- Verify that password requirements and confirmation validation are enforced.
- Identify and document unexpected behavior and authentication-related defects.

## 3. Scope of Testing

The following authentication features are included in this task.

### 3.1 User Registration

- Registration using valid user information.
- Validation of required registration fields.
- Validation of email format.
- Handling of duplicate email addresses.
- Verification of the expected initial account status.

### 3.2 User Login

- Login using valid email and password.
- Login using an incorrect password.
- Login using an unregistered email address.
- Handling of pending or blocked accounts according to the project requirements.
- Verification of successful authentication.

### 3.3 User Logout

- Logout from an authenticated session.
- Verification that the user is redirected appropriately after logout.
- Verification that the previous session cannot be used to access protected pages.

### 3.4 Password Setup

- Setting a password for a newly registered account.
- Validation of the minimum password length.
- Handling of missing or invalid password information.
- Verification that the account can log in after successfully setting a password.

### 3.5 Forgot Password

- Submitting a password reset request using an email address.
- Handling of an email address that does not belong to an existing account.
- Verification that the system provides an appropriate response to password reset requests.
- Verification that a password reset token and link are generated.

### 3.6 Reset Password

- Opening a reset link with valid token and email parameters.
- Resetting a password using a valid token.
- Rejecting expired reset tokens.
- Rejecting previously used reset tokens.
- Validating password length and confirmation.
- Verifying that the reset token is cleared after a successful password reset.
- Verifying that the user can log in using the newly created password.

## 4. Testing Approach

The following testing methods will be used:

- **Functional Testing:** Verify that registration, login, logout, and password management features perform their intended functions.
- **Positive Testing:** Check whether the system accepts valid registration details, credentials, and password reset requests.
- **Negative Testing:** Check how the system handles invalid information, incorrect credentials, and invalid reset tokens.
- **Boundary Testing:** Verify password length requirements, particularly the minimum of eight characters.
- **Session Testing:** Verify that login and logout correctly establish and terminate authenticated sessions.
- **Token Validation Testing:** Verify that reset tokens are validated, expire according to the specified duration, and cannot be reused.
- **Regression Testing:** Recheck related authentication features after defects are fixed.

## 5. Test Environment and Tools

| Item | Description |
|---|---|
| Application | Gerodias PT (Hope, Inc. ERP) |
| Development Environment | Visual Studio Code |
| Application Environment | Local development server |
| Local Application URL | http://localhost:3000 |
| Browser | Google Chrome |
| Source Code Repository | GitHub |
| Test Execution | Manual testing |
| Test Documentation | Markdown |
| Defect Tracking | GitHub Issues |
| Collaboration | GitHub Pull Requests and Project Board |

## 6. Test Cases

The following test cases will be used to verify the authentication features.

### 6.1 User Registration

**TC-REG-01: Register Using Valid Information**

| Item | Description |
|---|---|
| Preconditions | The registration page is accessible. The email address is not yet registered. |
| Test Steps | 1. Open the registration page. 2. Enter valid first name, last name, and email address. 3. Submit the registration form. |
| Expected Result | The system accepts the registration information, creates the account, and assigns the expected pending status. |
| Actual Result | Not yet tested. |
| Status | Not Yet Tested |

**TC-REG-02: Register Using an Existing Email Address**

| Item | Description |
|---|---|
| Preconditions | An account with the specified email address already exists. |
| Test Steps | 1. Open the registration page. 2. Enter valid registration information using an existing email address. 3. Submit the form. |
| Expected Result | The system rejects the registration and displays an appropriate message indicating that the email address is already registered. |
| Actual Result | Not yet tested. |
| Status | Not Yet Tested |

**TC-REG-03: Submit Registration with Missing Required Fields**

| Item | Description |
|---|---|
| Preconditions | The registration page is accessible. |
| Test Steps | 1. Open the registration page. 2. Leave one or more required fields empty. 3. Submit the form. |
| Expected Result | The system prevents submission and indicates the required information that must be provided. |
| Actual Result | Not yet tested. |
| Status | Not Yet Tested |

### 6.2 User Login

**TC-LOG-01: Login Using Valid Credentials**

| Item | Description |
|---|---|
| Preconditions | A registered account has a valid password and is allowed to log in. |
| Test Steps | 1. Open the login page. 2. Enter the registered email address and correct password. 3. Submit the login form. |
| Expected Result | The system authenticates the user and redirects them to the appropriate page. |
| Actual Result | Successfully logged in using the newly created password after resetting it. |
| Status | Passed |

**TC-LOG-02: Login Using an Incorrect Password**

| Item | Description |
|---|---|
| Preconditions | A registered account with an existing password is available. |
| Test Steps | 1. Open the login page. 2. Enter a registered email address and an incorrect password. 3. Submit the form. |
| Expected Result | The system rejects the login attempt and displays an appropriate error message. |
| Actual Result | Not yet tested. |
| Status | Not Yet Tested |

**TC-LOG-03: Login Using an Unregistered Email Address**

| Item | Description |
|---|---|
| Preconditions | The email address is not registered in the system. |
| Test Steps | 1. Open the login page. 2. Enter an unregistered email address and a password. 3. Submit the form. |
| Expected Result | The system rejects the login attempt and does not create an authenticated session. |
| Actual Result | Not yet tested. |
| Status | Not Yet Tested |

### 6.3 User Logout

**TC-OUT-01: Logout from an Authenticated Session**

| Item | Description |
|---|---|
| Preconditions | The user is successfully logged in. |
| Test Steps | 1. Locate the logout option. 2. Select Logout. 3. Observe the page after the action. |
| Expected Result | The system terminates the authenticated session, clears the session cookie, and redirects the user appropriately. |
| Actual Result | Not yet tested. |
| Status | Not Yet Tested |

**TC-OUT-02: Access a Protected Page After Logout**

| Item | Description |
|---|---|
| Preconditions | The user has successfully logged out. |
| Test Steps | 1. Attempt to revisit a previously accessed protected page. 2. Observe the system response. |
| Expected Result | The system prevents access to protected content and requires the user to log in again. |
| Actual Result | Not yet tested. |
| Status | Not Yet Tested |

### 6.4 Password Setup

**TC-SET-01: Set a Password Using Valid Information**

| Item | Description |
|---|---|
| Preconditions | A newly registered account is eligible for password setup. |
| Test Steps | 1. Open the password setup page. 2. Enter the required account information and a valid password. 3. Submit the form. |
| Expected Result | The system securely saves the password and allows the user to proceed with account login. |
| Actual Result | Not yet tested. |
| Status | Not Yet Tested |

**TC-SET-02: Set a Password Below the Minimum Length**

| Item | Description |
|---|---|
| Preconditions | An account eligible for password setup is available. |
| Test Steps | 1. Open the password setup page. 2. Enter a password containing fewer than eight characters. 3. Submit the form. |
| Expected Result | The system rejects the password and displays a message indicating the minimum password length requirement. |
| Actual Result | Not yet tested. |
| Status | Not Yet Tested |

### 6.5 Forgot Password

**TC-FGT-01: Submit a Password Reset Request Using a Registered Email**

| Item | Description |
|---|---|
| Preconditions | A registered account is available. The forgot password page is accessible. |
| Test Steps | 1. Open the forgot password page. 2. Enter the registered email address. 3. Submit the request. 4. Check the application's response and development terminal output. |
| Expected Result | The system provides a generic confirmation message and generates a password reset link for the registered account. |
| Actual Result | The browser displayed the generic confirmation message: "If an account exists with that email, a password reset link has been sent." The reset link was generated and displayed in the development terminal. |
| Status | Passed |

**TC-FGT-02: Submit a Password Reset Request Using an Unregistered Email**

| Item | Description |
|---|---|
| Preconditions | The email address is not registered in the system. |
| Test Steps | 1. Open the forgot password page. 2. Enter an unregistered email address. 3. Submit the request. |
| Expected Result | The system displays the same generic confirmation message without revealing whether the email address is registered. |
| Actual Result | Not yet tested. |
| Status | Not Yet Tested |

### 6.6 Reset Password

**TC-RST-01: Reset Password Using a Valid Token**

| Item | Description |
|---|---|
| Preconditions | A valid and unused password reset link is available. |
| Test Steps | 1. Open the password reset link. 2. Enter a valid new password. 3. Confirm the new password. 4. Submit the form. |
| Expected Result | The system accepts the new password, updates the account credentials, invalidates the reset token, and displays a successful reset message. |
| Actual Result | The password reset was successful. The application redirected to the login page after submission. |
| Status | Passed |

**TC-RST-02: Reset Password Using an Expired Token**

| Item | Description |
|---|---|
| Preconditions | A password reset link is available, but its token has expired. |
| Test Steps | 1. Open the expired password reset link. 2. Enter a valid new password and confirmation. 3. Submit the form. |
| Expected Result | The system rejects the expired token and displays an appropriate invalid or expired link message. The account password remains unchanged. |
| Actual Result | Not yet tested. |
| Status | Not Yet Tested |

**TC-RST-03: Reuse a Previously Used Reset Token**

| Item | Description |
|---|---|
| Preconditions | A password reset token has already been used successfully. |
| Test Steps | 1. Open the same password reset link used in a previous successful password reset. 2. Attempt to submit another new password. |
| Expected Result | The system rejects the previously used token and displays an appropriate invalid or expired link message. |
| Actual Result | The previously used reset link was rejected. The application displayed an invalid or expired password reset link message. |
| Status | Passed |

**TC-RST-04: Submit a Password Reset Form with Mismatched Passwords**

| Item | Description |
|---|---|
| Preconditions | A valid password reset link is available. |
| Test Steps | 1. Open the password reset link. 2. Enter a new password. 3. Enter a different value in the confirmation field. 4. Submit the form. |
| Expected Result | The system prevents submission and displays a message indicating that the passwords do not match. |
| Actual Result | Not yet tested. |
| Status | Not Yet Tested |

**TC-RST-05: Submit a Password Below the Minimum Length**

| Item | Description |
|---|---|
| Preconditions | A valid password reset link is available. |
| Test Steps | 1. Open the password reset link. 2. Enter a password containing fewer than eight characters. 3. Confirm the password. 4. Submit the form. |
| Expected Result | The system rejects the password and displays a message indicating that it must contain at least eight characters. |
| Actual Result | Not yet tested. |
| Status | Not Yet Tested |

## 7. Test Execution Summary

The following table summarizes the current execution status of the authentication test cases.

| Test Category | Total Cases | Passed | Failed | Not Yet Tested |
|---|---:|---:|---:|---:|
| User Registration | 3 | 0 | 0 | 3 |
| User Login | 3 | 1 | 0 | 2 |
| User Logout | 2 | 0 | 0 | 2 |
| Password Setup | 2 | 0 | 0 | 2 |
| Forgot Password | 2 | 1 | 0 | 1 |
| Reset Password | 5 | 2 | 0 | 3 |
| **Total** | **17** | **4** | **0** | **13** |

**Note:** The summary reflects the tests actually performed and recorded at the time this document was prepared. Test cases marked Not Yet Tested must be executed before final testing completion.

## 8. Defect Reporting and Retesting

Any unexpected behavior identified during authentication testing will be documented and reported through GitHub Issues.

Defect reports should include:

- Issue title and description.
- Related test case ID.
- Steps to reproduce the problem.
- Expected result.
- Actual result.
- Screenshots or other supporting evidence when available.
- Severity and priority, when applicable.

After the development team provides a fix, the Test Engineer will repeat the affected test case and perform relevant regression testing.

## 9. Entry Criteria

Authentication testing may begin when:

- The authentication feature is available in the agreed test environment.
- The relevant registration, login, logout, and password management pages are accessible.
- Required test accounts and credentials are available.
- Expected system behavior and acceptance criteria have been provided.
- The local application is running properly.

## 10. Exit Criteria

Authentication testing may be considered complete when:

- All planned authentication test cases have been executed.
- Actual results and test statuses have been recorded.
- Identified defects have been reported through GitHub Issues.
- Critical defects have been addressed or acknowledged by the development team.
- Reported fixes have been verified through retesting.
- Relevant regression tests have been completed.
- Testing results have been communicated to the Scrum Master and relevant developers.

## 11. Roles and Responsibilities

| Role | Assigned Member | Responsibility |
|---|---|---|
| Scrum Master | Joey Gerodias | Sprint planning, task assignment, issue tracking, and sprint progress monitoring. |
| Developer | Steven Aborde | Implementation and maintenance of authentication features, including registration, login, logout, and password management. |
| Test Engineer | Hazel Espiso | Preparation and execution of authentication test cases, documentation of results, defect reporting, regression testing, and fix verification. |

## 12. Testing Deliverable and Review

This document serves as the testing deliverable for S1-TST-02: Authentication Test Cases.

The test cases are prepared based on the Sprint 1 requirements and the authentication features assigned for verification.

The document will be updated as additional test cases are executed and results become available.

Final testing completion is subject to the execution of the remaining test cases, documentation of results, and review by the Scrum Master and project team.