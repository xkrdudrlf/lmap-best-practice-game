import { Link } from 'react-router-dom';
import { categories } from '../data/rules';
import { allProblems } from '../data/problems';
import { useProgress } from '../hooks/useProgress';

export function HomePage() {
  const { progress, resetProgress } = useProgress();
  const completedCount = Object.values(progress.completed).filter(Boolean).length;
  const totalCount = allProblems.length;

  return (
    <div className="page home-page">
      <header className="hero">
        <p className="eyebrow">Best Practice Game</p>
        <h1>Learn coding standards by fixing real violations</h1>
        <p className="lead">
          Each puzzle targets one rule from the LMAP coding standards. Pass the checker, or get a
          detailed explanation and a similar retry.
        </p>
        <div className="stats-bar">
          <span>
            {completedCount} / {totalCount} completed
          </span>
          {completedCount > 0 && (
            <button type="button" className="link-button" onClick={resetProgress}>
              Reset progress
            </button>
          )}
        </div>
      </header>

      <section className="category-grid">
        {categories.map((category) => {
          const problems = allProblems.filter((p) => p.category === category.id);
          const done = problems.filter((p) => progress.completed[p.id]).length;

          return (
            <Link key={category.id} to={`/category/${category.id}`} className="category-card">
              <span className="category-icon">{category.icon}</span>
              <h2>{category.name}</h2>
              <p>{category.description}</p>
              <span className="category-progress">
                {done}/{problems.length} puzzles
              </span>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
