import type { useSubmitScore } from '../../online/useSubmitScore';
import { AuthButton } from '../nav';

/** Online submission status under the results stats. Never blocks anything. */
export function SubmitPanel({
  submission,
}: {
  submission: ReturnType<typeof useSubmitScore>;
}) {
  const { status, result, error, submit } = submission;

  if (status === 'signedOut') {
    return (
      <div className="submit-panel">
        <span className="eyebrow">Sign in with osu! to submit scores</span>
        <AuthButton />
      </div>
    );
  }
  if (status === 'submitting') {
    return (
      <div className="submit-panel">
        <span className="eyebrow">Submitting…</span>
      </div>
    );
  }
  if (status === 'done' && result) {
    return (
      <div className="submit-panel">
        <span className="submit-panel__ok">
          Score submitted · +{Math.round(result.pp)}pp
          {result.isBest ? ' · Personal best!' : ''}
        </span>
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="submit-panel">
        <span className="submit-panel__error">{error ?? 'Submission failed'}</span>
        <button className="btn" onClick={submit}>
          Retry
        </button>
      </div>
    );
  }
  return null;
}
