export const ROLE_LABEL = {
  admin: 'Administrator',
  hr: 'HR',
  employee: 'Employee',
  mis: 'MIS',
  viewer: 'Viewer (retired)',
  accounting: 'Accounting',
  attendance_operator: 'Attendance operator',
};

const notifications = { to: 'notifications', label: 'Notifications' };
const chart = { to: 'org-chart', label: 'Organization Chart' };

// What each role sees in the sidebar (the first item is their landing page).
export const NAV = {
  employee: [
    { to: 'overview', label: 'My Dashboard' },
    { to: 'my-profile', label: 'My Profile' },
    { to: 'file-leave', label: 'File Leave' },
    { to: 'my-leaves', label: 'My Leave Requests' },
    { to: 'my-attendance', label: 'My Attendance' },
    { to: 'my-salary', label: 'My Salary' },
    { to: 'my-loans', label: 'My Loans' },
    notifications,
  ],
  hr: [
    { to: 'overview', label: 'HR Dashboard' },
    { to: 'employees', label: 'Employee Profiles' },
    { to: 'leave-requests', label: 'Leave Approvals' },
    { to: 'attendance', label: 'Attendance' },
    { to: 'payroll', label: 'Payroll' },
    { to: 'loans', label: 'Employee Loans' },
    { to: 'payroll-settings', label: 'Payroll Settings' },
    { to: 'users', label: 'User Accounts and Roles' },
    { to: 'roles', label: 'Roles and Access' },
    chart,
    notifications,
  ],
  accounting: [
    { to: 'overview', label: 'Analytics Dashboard' },
    { to: 'expenses', label: 'Budget and Expenses' },
    { to: 'reports', label: 'Reports' },
    notifications,
  ],
  mis: [
    { to: 'overview', label: 'MIS Dashboard' },
    { to: 'users', label: 'User Accounts and Roles' },
    { to: 'roles', label: 'Roles and Access' },
    { to: 'settings', label: 'System Settings' },
    { to: 'audit', label: 'Audit Log' },
    { to: 'employees', label: 'Employee Profiles' },
    { to: 'leave-requests', label: 'Leave Approvals' },
    { to: 'attendance', label: 'Attendance' },
    chart,
    notifications,
  ],
  admin: [
    { to: 'overview', label: 'Overview' },
    { to: 'employees', label: 'Employee Profiles' },
    { to: 'leave-requests', label: 'Leave Approvals' },
    { to: 'attendance', label: 'Attendance' },
    { to: 'users', label: 'User Accounts and Roles' },
    { to: 'audit', label: 'Audit Log' },
    chart,
    notifications,
  ],
};

export const homeFor = (role) => (role === 'attendance_operator' ? '/attendance-panel' : NAV[role] ? `/app/${NAV[role][0].to}` : '/');

export const LEAVE_TYPES = [
  { value: 'vacation', label: 'Vacation Leave', credit: 'vacation' },
  { value: 'sick', label: 'Sick Leave', credit: 'sick' },
  { value: 'special', label: 'Special Privilege Leave', credit: 'special' },
  { value: 'maternity', label: 'Maternity Leave' },
  { value: 'paternity', label: 'Paternity Leave' },
  { value: 'unpaid', label: 'Unpaid Leave' },
];
export const leaveLabel = (v) => (v === 'travel' ? 'Travel' : (LEAVE_TYPES.find((t) => t.value === v) || { label: v }).label);

export const ATTENDANCE = [
  { value: 'present', label: 'Present' },
  { value: 'late', label: 'Late' },
  { value: 'absent', label: 'Absent' },
  { value: 'on_leave', label: 'On leave' },
  { value: 'travel', label: 'Travel' },
];
