import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { ErrorBox, Loading, PageHeader, useLoad } from '../components/ui.jsx';
import OrgChart from '../components/OrgChart.jsx';

export default function ChartPage() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useLoad(() => api.get('/org-chart', { auth: false }));
  const canEdit = user.role === 'hr' || user.role === 'mis';
  return (
    <>
      <PageHeader
        title="Organization chart"
        sub={
          canEdit ? (
            <>
              To change who reports to whom, edit the person in <Link to="/app/employees">Employees</Link>.
            </>
          ) : (
            'Who reports to whom, starting from the Vice Governor.'
          )
        }
      />
      {loading && <Loading />}
      {error && <ErrorBox error={error} onRetry={reload} />}
      {data && <OrgChart employees={data.employees} />}
    </>
  );
}
