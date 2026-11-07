import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Modal } from './ui.jsx';

/** Turn the flat list (id, reports_to) into a forest of nodes. Vice Governor roots come first. */
export function buildTree(list) {
  const nodes = new Map(list.map((e) => [e.id, { ...e, children: [] }]));
  const roots = [];
  for (const node of nodes.values()) {
    const parent = node.reports_to != null ? nodes.get(node.reports_to) : null;
    if (parent && parent !== node) parent.children.push(node);
    else roots.push(node);
  }
  const isTop = (n) => /vice\s*governor/i.test(n.job_title || '');
  roots.sort((a, b) => Number(isTop(b)) - Number(isTop(a)));
  return { roots, nodes };
}

function Node({ node, depth, closed, forceOpen, hits, toggle, onSelect }) {
  const hasKids = node.children.length > 0;
  const open = hasKids && (!closed.has(node.id) || forceOpen.has(node.id));
  const initials = node.full_name
    .split(/\s+/)
    .filter((part) => /^[\p{L}]/u.test(part))
    .slice(0, 2)
    .map((part) => part[0])
    .join('');
  return (
    <li>
      <div className={`node${depth === 0 ? ' top' : ''}${hits.has(node.id) ? ' hit' : ''}`}>
        <div className="node-photo" aria-hidden={!node.photo_url}>
          {node.photo_url ? <img src={node.photo_url} alt={node.full_name} /> : <span className="node-initials">{initials}</span>}
        </div>
        <div className="node-details">
          <button type="button" className="node-name node-name-button" onClick={() => onSelect(node)}>
            {node.full_name}
          </button>
          <span className="node-title">{node.job_title}</span>
          {node.department && <span className="node-dept">{node.department}</span>}
        </div>
        {hasKids && (
          <button
            className="node-toggle"
            onClick={() => toggle(node.id)}
            aria-expanded={open}
            aria-label={`${open ? 'Hide' : 'Show'} ${node.children.length} direct report${node.children.length === 1 ? '' : 's'} of ${node.full_name}`}
          >
            {open ? '\u2212' : node.children.length}
          </button>
        )}
      </div>
      {open && (
        <ul>
          {node.children.map((c) => (
            <Node key={c.id} node={c} depth={depth + 1} closed={closed} forceOpen={forceOpen} hits={hits} toggle={toggle} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function OrgChart({ employees, fit = false }) {
  const { roots, nodes } = useMemo(() => buildTree(employees), [employees]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const chartViewport = useRef(null);
  const treeElement = useRef(null);
  const [treeFit, setTreeFit] = useState({ scale: 1, height: 0 });

  // Big organisations start folded below the second level so the page stays readable.
  const [closed, setClosed] = useState(() => {
    if (employees.length <= 40) return new Set();
    const set = new Set();
    const walk = (n, depth) => {
      if (depth >= 2 && n.children.length) set.add(n.id);
      n.children.forEach((c) => walk(c, depth + 1));
    };
    roots.forEach((r) => walk(r, 0));
    return set;
  });

  const toggle = (id) =>
    setClosed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const q = query.trim().toLowerCase();
  const { hits, forceOpen } = useMemo(() => {
    const h = new Set();
    const open = new Set();
    if (q) {
      for (const n of nodes.values()) {
        const text = `${n.full_name} ${n.job_title} ${n.department || ''}`.toLowerCase();
        if (text.includes(q)) {
          h.add(n.id);
          let p = n.reports_to != null ? nodes.get(n.reports_to) : null;
          while (p && !open.has(p.id)) {
            open.add(p.id);
            p = p.reports_to != null ? nodes.get(p.reports_to) : null;
          }
        }
      }
    }
    return { hits: h, forceOpen: open };
  }, [q, nodes]);

  useLayoutEffect(() => {
    if (!fit) return undefined;

    const viewport = chartViewport.current;
    const tree = treeElement.current;
    if (!viewport || !tree) return undefined;

    const fitTree = () => {
      const width = tree.scrollWidth;
      const availableWidth = viewport.clientWidth;
      if (!width || !availableWidth) return;

      const scale = Math.min(1, availableWidth / width);
      const height = Math.ceil(tree.scrollHeight * scale);
      setTreeFit((current) => (
        Math.abs(current.scale - scale) < 0.001 && current.height === height
          ? current
          : { scale, height }
      ));
    };

    const observer = new ResizeObserver(fitTree);
    observer.observe(viewport);
    observer.observe(tree);
    fitTree();
    return () => observer.disconnect();
  }, [employees, closed, forceOpen, fit]);

  useLayoutEffect(() => {
    if (fit) return;
    const viewport = chartViewport.current;
    if (viewport) {
      viewport.scrollLeft = (viewport.scrollWidth - viewport.clientWidth) / 2;
      viewport.scrollTop = 0;
    }
  }, [employees, fit]);

  if (employees.length === 0) {
    return <p className="muted">No one has been added to the chart yet.</p>;
  }

  const collapseAll = () => setClosed(new Set([...nodes.values()].filter((n) => n.children.length && n.reports_to != null).map((n) => n.id)));

  return (
    <section className="chart" aria-label="Organization chart">
      <div className="chart-bar">
        <input
          className="input chart-search"
          type="search"
          placeholder="Find a person, position or office"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Find a person, position or office"
        />
        <span className="muted chart-count">
          {q ? `${hits.size} match${hits.size === 1 ? '' : 'es'}` : `${employees.length} people`}
        </span>
        <button className="btn small" onClick={() => setClosed(new Set())}>
          Show everyone
        </button>
        <button className="btn small" onClick={collapseAll}>
          Show top level
        </button>
      </div>
      <div
        className="chart-scroll"
        ref={chartViewport}
        style={fit && treeFit.height ? { height: `${treeFit.height}px` } : undefined}
      >
        <div
          className="tree"
          ref={treeElement}
          style={fit ? { transform: `translateX(-50%) scale(${treeFit.scale})` } : undefined}
        >
          <ul>
            {roots.map((r) => (
              <Node key={r.id} node={r} depth={0} closed={closed} forceOpen={forceOpen} hits={hits} toggle={toggle} onSelect={setSelected} />
            ))}
          </ul>
        </div>
      </div>
      {selected && (
        <Modal title={selected.full_name} onClose={() => setSelected(null)}>
          <dl className="public-employee-details">
            <div>
              <dt>Position</dt>
              <dd>{selected.job_title || 'Not listed'}</dd>
            </div>
            <div>
              <dt>Office</dt>
              <dd>{selected.department || 'Not listed'}</dd>
            </div>
            {selected.reports_to != null && nodes.has(selected.reports_to) && (
              <div>
                <dt>Reports to</dt>
                <dd>{nodes.get(selected.reports_to).full_name}</dd>
              </div>
            )}
            {selected.children.length > 0 && (
              <div>
                <dt>Direct reports</dt>
                <dd>
                  <ul>
                    {selected.children.map((employee) => (
                      <li key={employee.id}>
                        {employee.full_name}{employee.job_title ? ` — ${employee.job_title}` : ''}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}
          </dl>
        </Modal>
      )}
    </section>
  );
}
