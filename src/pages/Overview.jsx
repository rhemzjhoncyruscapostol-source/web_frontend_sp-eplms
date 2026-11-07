import { useAuth } from '../auth.jsx';
import { PageHeader } from '../components/ui.jsx';
import EmployeeHome from './EmployeeHome.jsx';
import HrHome from './HrHome.jsx';
import MisHome from './MisHome.jsx';
import AnalyticsDashboard from './AnalyticsDashboard.jsx';

const TITLES = {
  employee: 'My Dashboard',
  hr: 'HR Dashboard',
  mis: 'MIS Dashboard',
  accounting: 'Analytics Dashboard',
  admin: 'Overview',
};

export default function Overview() {
  const { user } = useAuth();
  return (
    <>
      <PageHeader title={TITLES[user.role]} />
      {user.role === 'employee' && <EmployeeHome />}
      {(user.role === 'hr' || user.role === 'admin') && <HrHome canReview={user.role === 'hr'} />}
      {user.role === 'mis' && <MisHome />}
      {user.role === 'accounting' && <AnalyticsDashboard />}
    </>
  );
}
