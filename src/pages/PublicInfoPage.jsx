import { Link, useParams } from 'react-router-dom';

const PAGE_TITLES = {
  'the-province': 'The Province',
  history: 'History',
  'investments-opportunities': 'Investments & Opportunities',
  'cities-municipalities': 'Cities & Municipalities',
  governor: 'Governor',
  'sangguniang-panlalawigan': 'Sangguniang Panlalawigan',
  'department-heads': 'Department Heads',
  departments: 'Departments',
  'financial-report': 'Financial Report',
  'procurement-documents': 'Procurement Documents',
  'financial-assistance': 'Financial Assistance',
  'executive-orders': 'Executive Orders',
  'news-updates': 'News & Updates',
};

export default function PublicInfoPage() {
  const { slug } = useParams();
  const title = PAGE_TITLES[slug];

  if (!title) return <Link className="public-info-back" to="/">Return to home</Link>;

  return (
    <main className="public-info-page">
      <Link className="public-info-back" to="/">← Province of Oriental Mindoro</Link>
      <h1>{title}</h1>
    </main>
  );
}
