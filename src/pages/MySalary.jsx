import { api } from '../api.js';
import { useSearchParams } from 'react-router-dom';
import { fmtMonth, money } from '../format.js';
import { Empty, ErrorBox, Loading, PageHeader, useLoad, useToast } from '../components/ui.jsx';
import { useAuth } from '../auth.jsx';
import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';

function payslipTable(rows, emphasizeLast = false) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([label, amount], index) => {
      const emphasized = emphasizeLast && index === rows.length - 1;
      return new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: label, bold: emphasized })] })],
          }),
          new TableCell({
            children: [new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: amount, bold: emphasized })],
            })],
          }),
        ],
      });
    }),
  });
}

export default function MySalary() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const toast = useToast();
  const { data, error, loading, reload } = useLoad(() => api.get('/me/salaries'));
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  const rows = data.salaries;
  const period = searchParams.get('period');
  const latest = (period && rows.find((row) => row.period === period)) || rows[0];

  const downloadPayslip = async () => {
    const employeeName = user.full_name || user.username;
    const earnings = [
      ['Basic pay', money(latest.basic)],
      ['Allowances', money(latest.allowances)],
      ['Taxable benefits', money(latest.taxable_benefits)],
      ['Non-taxable benefits', money(latest.non_taxable_benefits)],
    ];
    const deductions = [
      ['SSS', money(latest.sss)],
      ['PhilHealth', money(latest.philhealth)],
      ['Pag-IBIG', money(latest.pagibig)],
      ['Withholding tax', money(latest.withholding_tax)],
      [`Absence deduction (${latest.absence_days} day${latest.absence_days === 1 ? '' : 's'})`, money(latest.absence_deduction)],
      ['Other deductions', money(latest.deductions)],
      ...latest.loan_repayments.map((loan) => [loan.loan_name, money(loan.amount)]),
    ];
    const children = [
      new Paragraph({ text: 'Province of Oriental Mindoro', heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
      new Paragraph({ text: 'Employee Payslip', heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER }),
      new Paragraph({ text: employeeName, alignment: AlignmentType.CENTER }),
      ...(user.job_title ? [new Paragraph({ text: user.job_title, alignment: AlignmentType.CENTER })] : []),
      new Paragraph({ text: '' }),
      new Paragraph({ children: [new TextRun({ text: 'Pay period: ', bold: true }), new TextRun(fmtMonth(latest.period))] }),
      new Paragraph({ text: 'Earnings and benefits', heading: HeadingLevel.HEADING_3 }),
      payslipTable(earnings),
      new Paragraph({ text: 'Deductions', heading: HeadingLevel.HEADING_3 }),
      payslipTable(deductions),
      new Paragraph({ text: 'Net pay', heading: HeadingLevel.HEADING_3 }),
      payslipTable([['Net pay', money(latest.net)]], true),
    ];
    if (latest.remarks) {
      children.push(new Paragraph({ text: 'Remarks', heading: HeadingLevel.HEADING_3 }));
      children.push(new Paragraph({ text: latest.remarks }));
    }

    try {
      const blob = await Packer.toBlob(new Document({ sections: [{ children }] }));
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payslip-${latest.period}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      console.error('Unable to generate payslip DOCX', downloadError);
      toast('Could not generate the DOCX payslip. Please try again.', 'bad');
    }
  };

  return (
    <div className="salary-page">
      <PageHeader
        title="My salary"
        sub="Only you can see this page."
        actions={latest && (
          <>
            <button className="btn" onClick={() => window.print()}>Print payslip</button>
            <button className="btn primary" onClick={downloadPayslip}>Download DOCX</button>
          </>
        )}
      />
      {!latest ? (
        <Empty title="No salary records yet">HR posts your pay here each month.</Empty>
      ) : (
        <>
          <section className="payslip printable-payslip" aria-label={`Pay for ${fmtMonth(latest.period)}`}>
            <header className="payslip-heading">
              <p className="payslip-org">Province of Oriental Mindoro</p>
              <h2>Employee Payslip</h2>
              <p>{user.full_name || user.username}{user.job_title ? ` · ${user.job_title}` : ''}</p>
            </header>
            <div>
              <p className="muted">Net pay for {fmtMonth(latest.period)}</p>
              <p className="payslip-net">{money(latest.net)}</p>
            </div>
            <dl>
              <div><dt>Basic pay</dt><dd>{money(latest.basic)}</dd></div>
              <div><dt>Allowances</dt><dd>+ {money(latest.allowances)}</dd></div>
              <div><dt>Taxable benefits</dt><dd>+ {money(latest.taxable_benefits)}</dd></div>
              <div><dt>Non-taxable benefits</dt><dd>+ {money(latest.non_taxable_benefits)}</dd></div>
              <div><dt>SSS</dt><dd>- {money(latest.sss)}</dd></div>
              <div><dt>PhilHealth</dt><dd>- {money(latest.philhealth)}</dd></div>
              <div><dt>Pag-IBIG</dt><dd>- {money(latest.pagibig)}</dd></div>
              <div><dt>Withholding tax</dt><dd>- {money(latest.withholding_tax)}</dd></div>
              <div><dt>Absences ({latest.absence_days} day{latest.absence_days === 1 ? '' : 's'})</dt><dd>- {money(latest.absence_deduction)}</dd></div>
              <div><dt>Other deductions</dt><dd>- {money(latest.deductions)}</dd></div>
              {latest.loan_repayments.map((loan) => <div key={loan.loan_id}><dt>{loan.loan_name}</dt><dd>- {money(loan.amount)}</dd></div>)}
            </dl>
          </section>
          <section className="block">
            <div className="block-head"><h2>Pay history</h2></div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Month</th><th className="no-print">Payslip</th><th className="num">Basic</th><th className="num">Allowances</th><th className="num">Absences</th><th className="num">Absence deduction</th><th className="num">Taxable benefits</th><th className="num">Non-taxable benefits</th><th className="num">Other deductions</th><th className="num">SSS</th><th className="num">PhilHealth</th><th className="num">Pag-IBIG</th><th className="num">Withholding tax</th><th className="num">Loans</th><th className="num">Net pay</th><th>Remarks</th></tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className={period === r.period ? 'notification-focus' : undefined}>
                      <td>{fmtMonth(r.period)}</td>
                      <td><button className="btn small no-print" onClick={() => setSearchParams({ period: r.period })}>View payslip</button></td>
                      <td className="num">{money(r.basic)}</td>
                      <td className="num">{money(r.allowances)}</td>
                      <td className="num">{r.absence_days}</td>
                      <td className="num">{money(r.absence_deduction)}</td>
                      <td className="num">{money(r.taxable_benefits)}</td>
                      <td className="num">{money(r.non_taxable_benefits)}</td>
                      <td className="num">{money(r.deductions)}</td>
                      <td className="num">{money(r.sss)}</td>
                      <td className="num">{money(r.philhealth)}</td>
                      <td className="num">{money(r.pagibig)}</td>
                      <td className="num">{money(r.withholding_tax)}</td>
                      <td className="num">{money(r.loan_repayments.reduce((sum, loan) => sum + loan.amount, 0))}</td>
                      <td className="num strong">{money(r.net)}</td>
                      <td>{r.remarks || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
