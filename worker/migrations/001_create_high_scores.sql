CREATE TABLE IF NOT EXISTS high_scores (
  id SERIAL PRIMARY KEY,
  initials VARCHAR(3) NOT NULL CHECK (initials ~ '^[A-Z]{3}$'),
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 999999),
  loop INTEGER NOT NULL CHECK (loop >= 1 AND loop <= 999),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_high_scores_score_desc ON high_scores (score DESC);
