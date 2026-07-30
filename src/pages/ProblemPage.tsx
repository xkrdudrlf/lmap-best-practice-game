import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { rules } from '../data/rules';
import {
  getProblemById,
  getVariantProblem,
  pickRetryVariant,
} from '../data/problems';
import { useProgress } from '../hooks/useProgress';

type Feedback = {
  passed: boolean;
  message: string;
  details?: string[];
  showExplanation: boolean;
};

export function ProblemPage() {
  const { problemId = '' } = useParams();
  const navigate = useNavigate();
  const problem = getProblemById(problemId);
  const { progress, markAttempt, markComplete, setLastVariant } = useProgress();

  const [variantId, setVariantId] = useState<string>('default');
  const [code, setCode] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [hintIndex, setHintIndex] = useState(-1);

  const active = useMemo(() => {
    if (!problem) return null;
    return getVariantProblem(problem, variantId);
  }, [problem, variantId]);

  useEffect(() => {
    if (!problem) return;
    const last = progress.lastVariant[problem.id];
    const initialVariant = last && problem.variants.some((v) => v.id === last) ? last : 'default';
    setVariantId(initialVariant);
  }, [problem, progress.lastVariant]);

  useEffect(() => {
    if (active) {
      setCode(active.starterCode);
      setFeedback(null);
      setHintIndex(-1);
    }
  }, [active?.starterCode, variantId]);

  if (!problem || !active) {
    return (
      <div className="page">
        <p>Problem not found.</p>
        <Link to="/">Back home</Link>
      </div>
    );
  }

  const currentProblem = problem;
  const currentActive = active;
  const rule = rules[currentProblem.ruleId];
  const completed = progress.completed[currentProblem.id];

  const languageMap: Record<string, string> = {
    javascript: 'javascript',
    php: 'php',
    sql: 'sql',
    css: 'css',
    markdown: 'markdown',
  };

  function handleSubmit() {
    markAttempt(currentProblem.id);
    const result = currentProblem.validate(code);
    if (result.passed) {
      markComplete(currentProblem.id);
      setFeedback({ ...result, showExplanation: false });
    } else {
      setFeedback({ ...result, showExplanation: true });
    }
  }

  function handleRetrySimilar() {
    const nextVariant = pickRetryVariant(currentProblem, variantId);
    setLastVariant(currentProblem.id, nextVariant);
    setVariantId(nextVariant);
    setFeedback(null);
  }

  function showNextHint() {
    setHintIndex((i) => Math.min(i + 1, currentActive.hints.length - 1));
  }

  return (
    <div className="page problem-page">
      <nav className="breadcrumb">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to={`/category/${currentProblem.category}`}>{currentProblem.category}</Link>
        <span>/</span>
        <span>{currentProblem.title}</span>
      </nav>

      <div className="problem-layout">
        <aside className="problem-sidebar">
          <section className="panel rule-panel">
            <h2>Rule</h2>
            <h3>{rule?.title}</h3>
            <p>{rule?.summary}</p>
            <dl>
              <dt>Why this matters</dt>
              <dd>{rule?.why}</dd>
              <dt>Why not violate it</dt>
              <dd>{rule?.whyNot}</dd>
            </dl>
          </section>

          <section className="panel">
            <h2>Task</h2>
            <h3>{currentActive.title}</h3>
            <p>{currentActive.description}</p>
            {variantId !== 'default' && (
              <p className="variant-note">Similar practice problem — same rule, new scenario.</p>
            )}
          </section>

          {currentActive.hints.length > 0 && (
            <section className="panel hints-panel">
              <div className="panel-header">
                <h2>Hints</h2>
                {hintIndex < currentActive.hints.length - 1 && (
                  <button type="button" className="secondary" onClick={showNextHint}>
                    Show hint
                  </button>
                )}
              </div>
              <ul>
                {currentActive.hints.slice(0, hintIndex + 1).map((hint) => (
                  <li key={hint}>{hint}</li>
                ))}
              </ul>
            </section>
          )}
        </aside>

        <main className="problem-main">
          <div className="editor-shell">
            <Editor
              height="420px"
              language={languageMap[currentProblem.language] ?? 'plaintext'}
              value={code}
              onChange={(value) => setCode(value ?? '')}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                scrollBeyondLastLine: false,
                wordWrap: 'on',
              }}
            />
          </div>

          <div className="action-row">
            <button type="button" className="primary" onClick={handleSubmit}>
              Check solution
            </button>
            {completed && (
              <button
                type="button"
                className="secondary"
                onClick={() => navigate(`/category/${currentProblem.category}`)}
              >
                Back to category
              </button>
            )}
          </div>

          {feedback && (
            <section className={`feedback ${feedback.passed ? 'success' : 'failure'}`}>
              <h2>{feedback.passed ? 'Correct!' : 'Not quite yet'}</h2>
              <p>{feedback.message}</p>
              {feedback.details && feedback.details.length > 0 && (
                <ul>
                  {feedback.details.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              )}

              {feedback.passed ? (
                <p className="success-note">
                  Your solution follows <strong>{rule?.title}</strong>. Nice work.
                </p>
              ) : (
                <div className="explanation">
                  <h3>What went wrong</h3>
                  <p>{feedback.message}</p>

                  <h3>Why the correct approach is correct</h3>
                  <p>{currentProblem.explanation.correctApproach}</p>
                  <p>{currentProblem.explanation.why}</p>

                  <h3>Why the violation is wrong</h3>
                  <p>{currentProblem.explanation.whyNot}</p>

                  <h3>Common mistakes</h3>
                  <ul>
                    {currentProblem.explanation.commonMistakes.map((m: string) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>

                  <button type="button" className="primary" onClick={handleRetrySimilar}>
                    Try a similar problem
                  </button>
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
