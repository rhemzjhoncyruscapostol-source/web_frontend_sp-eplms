import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import { homeFor } from './roles.js';
import { Loading } from './components/ui.jsx';
import Shell from './components/Shell.jsx';
import PublicHome from './pages/PublicHome.jsx';
import ProvinceHome from './pages/ProvinceHome.jsx';
import Login from './pages/Login.jsx';
import Overview from './pages/Overview.jsx';
import MySalary from './pages/MySalary.jsx';
import MyAttendance from './pages/MyAttendance.jsx';
import Loans from './pages/Loans.jsx';
import PayrollSettings from './pages/PayrollSettings.jsx';
import MyLeave from './pages/MyLeave.jsx';
import Leaves from './pages/Leaves.jsx';
import Employees from './pages/Employees.jsx';
import Users from './pages/Users.jsx';
import Payroll from './pages/Payroll.jsx';
import ChartPage from './pages/ChartPage.jsx';
import MyProfile from './pages/MyProfile.jsx';
import Notifications from './pages/Notifications.jsx';
import Attendance from './pages/Attendance.jsx';
import BudgetExpenses from './pages/BudgetExpenses.jsx';
import Reports from './pages/Reports.jsx';
import RolesAccess from './pages/RolesAccess.jsx';
import SystemSettings from './pages/SystemSettings.jsx';
import AuditLog from './pages/AuditLog.jsx';
import PublicInfoPage from './pages/PublicInfoPage.jsx';
import AttendancePanel from './pages/AttendancePanel.jsx';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading label="Checking your session" />;
  // Logged-out visitors go to the public chart; the login page is never linked from there.
  if (!user) return <Navigate to="/" replace />;
  return children;
}

function RoleGate({ roles, children }) {
  const { user } = useAuth();
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return children;
}

function Landing() {
  const { user } = useAuth();
  return <Navigate to={homeFor(user.role)} replace />;
}

const gate = (roles, element) => <RoleGate roles={roles}>{element}</RoleGate>;

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicHome />} />
      <Route path="/province-home" element={<ProvinceHome />} />
      <Route path="/login" element={<Login />} />
      <Route path="/attendance-panel" element={<AttendancePanel />} />
      <Route path="/page/:slug" element={<PublicInfoPage />} />

      <Route
        path="/app"
        element={
          <RequireAuth>
            <RoleGate roles={['employee', 'hr', 'accounting', 'mis', 'admin']}>
              <Shell />
            </RoleGate>
          </RequireAuth>
        }
      >
        <Route index element={<Landing />} />
        <Route path="overview" element={gate(['employee', 'hr', 'accounting', 'mis', 'admin'], <Overview />)} />
        <Route path="my-profile" element={gate(['employee'], <MyProfile />)} />
        <Route path="file-leave" element={gate(['employee'], <MyLeave mode="file" />)} />
        <Route path="my-leaves" element={gate(['employee'], <MyLeave mode="list" />)} />
        <Route path="my-attendance" element={gate(['employee'], <MyAttendance />)} />
        <Route path="my-salary" element={gate(['employee'], <MySalary />)} />
        <Route path="my-loans" element={gate(['employee'], <Loans />)} />
        <Route path="notifications" element={gate(['employee', 'hr', 'accounting', 'mis', 'admin'], <Notifications />)} />
        <Route path="leave-requests" element={gate(['hr', 'mis', 'admin'], <Leaves />)} />
        <Route path="employees" element={gate(['hr', 'mis', 'admin'], <Employees />)} />
        <Route path="attendance" element={gate(['hr', 'mis', 'admin'], <Attendance />)} />
        <Route path="payroll" element={gate(['hr'], <Payroll />)} />
        <Route path="loans" element={gate(['hr'], <Loans />)} />
        <Route path="payroll-settings" element={gate(['hr'], <PayrollSettings />)} />
        <Route path="expenses" element={gate(['accounting'], <BudgetExpenses />)} />
        <Route path="reports" element={gate(['accounting'], <Reports />)} />
        <Route path="users" element={gate(['hr', 'mis', 'admin'], <Users />)} />
        <Route path="roles" element={gate(['hr', 'mis', 'admin'], <RolesAccess />)} />
        <Route path="settings" element={gate(['mis', 'admin'], <SystemSettings />)} />
        <Route path="audit" element={gate(['mis', 'admin'], <AuditLog />)} />
        <Route path="org-chart" element={gate(['hr', 'mis', 'admin'], <ChartPage />)} />
        <Route path="*" element={<Landing />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
