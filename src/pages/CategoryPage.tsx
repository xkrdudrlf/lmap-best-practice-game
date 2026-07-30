import { Link, useParams } from 'react-router-dom';
import { categories, rules } from '../data/rules';
import { getProblemsByCategory } from '../data/problems';
import { useProgress } from '../hooks/useProgress';

export function CategoryPage() {
  const { categoryId = '' } = useParams();
  const { progress } = useProgress();
  const category = categories.find((c) => c.id === categoryId);
  const problems = getProblemsByCategory(categoryId);

  if (!category) {
    return (
      <div className="page">
        <p>Category not found.</p>
        <Link to="/">Back home</Link>
      </div>
    );
  }

  return (
    <div className="page category-page">
      <nav className="breadcrumb">
        <Link to="/">All categories</Link>
        <span>/</span>
        <span>{category.name}</span>
      </nav>

      <header>
        <h1>{category.name}</h1>
        <p>{category.description}</p>
      </header>

      <ul className="problem-list">
        {problems.map((problem) => {
          const rule = rules[problem.ruleId];
          const done = progress.completed[problem.id];
          const attempts = progress.attempts[problem.id] ?? 0;

          return (
            <li key={problem.id}>
              <Link to={`/problem/${problem.id}`} className={`problem-row ${done ? 'done' : ''}`}>
                <div>
                  <h3>{problem.title}</h3>
                  <p className="rule-label">{rule?.title ?? problem.ruleId}</p>
                </div>
                <div className="problem-meta">
                  {done ? <span className="badge success">Passed</span> : null}
                  {attempts > 0 && !done ? (
                    <span className="badge muted">{attempts} attempt{attempts === 1 ? '' : 's'}</span>
                  ) : null}
                  <span className="lang-tag">{problem.language}</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
