-- Aura Hunt Database Schema for Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Teams table
CREATE TABLE IF NOT EXISTS public.teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    password TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    score INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Questions/Games table
CREATE TABLE IF NOT EXISTS public.questions (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    clue TEXT DEFAULT '',
    clue_position TEXT DEFAULT '',
    url TEXT DEFAULT '',
    qr_position TEXT DEFAULT '',
    answer TEXT DEFAULT '',
    status TEXT DEFAULT '',
    note TEXT DEFAULT '',
    score INTEGER NOT NULL DEFAULT 0,
    deduction INTEGER DEFAULT 0,
    attempts TEXT DEFAULT 'Infinity',
    type TEXT DEFAULT 'normal',
    proof BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team questions (attempts and status per team per question)
CREATE TABLE IF NOT EXISTS public.team_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id TEXT REFERENCES public.teams(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES public.questions(id) ON DELETE CASCADE,
    attempts TEXT[] DEFAULT '{}',
    checked INTEGER DEFAULT 0,
    solved INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, question_id)
);

-- Image submissions table
CREATE TABLE IF NOT EXISTS public.image_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id TEXT REFERENCES public.teams(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES public.questions(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    compressed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leaderboard view (materialized for performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.leaderboard AS
SELECT 
    t.id,
    t.name,
    t.score,
    COUNT(CASE WHEN tq.solved > 0 THEN 1 END) as questions_solved,
    COUNT(tq.id) as total_attempts,
    t.updated_at
FROM public.teams t
LEFT JOIN public.team_questions tq ON t.id = tq.team_id
GROUP BY t.id, t.name, t.score, t.updated_at
ORDER BY t.score DESC, t.updated_at ASC;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_teams_score ON public.teams(score DESC);
CREATE INDEX IF NOT EXISTS idx_team_questions_team_id ON public.team_questions(team_id);
CREATE INDEX IF NOT EXISTS idx_team_questions_question_id ON public.team_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_image_submissions_team_id ON public.image_submissions(team_id);
CREATE INDEX IF NOT EXISTS idx_image_submissions_question_id ON public.image_submissions(question_id);

-- Row Level Security (RLS) policies
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_submissions ENABLE ROW LEVEL SECURITY;

-- Teams policies
CREATE POLICY "Allow read access to teams" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Allow service role full access to teams" ON public.teams FOR ALL USING (auth.role() = 'service_role');

-- Questions policies  
CREATE POLICY "Allow read access to questions" ON public.questions FOR SELECT USING (true);
CREATE POLICY "Allow service role full access to questions" ON public.questions FOR ALL USING (auth.role() = 'service_role');

-- Team questions policies
CREATE POLICY "Allow read access to team_questions" ON public.team_questions FOR SELECT USING (true);
CREATE POLICY "Allow service role full access to team_questions" ON public.team_questions FOR ALL USING (auth.role() = 'service_role');

-- Image submissions policies
CREATE POLICY "Allow read access to image_submissions" ON public.image_submissions FOR SELECT USING (true);
CREATE POLICY "Allow service role full access to image_submissions" ON public.image_submissions FOR ALL USING (auth.role() = 'service_role');

-- Functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_questions_updated_at BEFORE UPDATE ON public.team_questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to refresh leaderboard materialized view
CREATE OR REPLACE FUNCTION refresh_leaderboard()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW public.leaderboard;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Triggers to auto-refresh leaderboard when scores change
CREATE TRIGGER refresh_leaderboard_on_team_update
    AFTER UPDATE OF score ON public.teams
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_leaderboard();

CREATE TRIGGER refresh_leaderboard_on_team_questions_update
    AFTER INSERT OR UPDATE OR DELETE ON public.team_questions
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_leaderboard();

-- Storage bucket setup (run this separately in Supabase dashboard)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('aura-hunt-images', 'aura-hunt-images', true);

-- Storage policies (run this in Supabase dashboard)
-- CREATE POLICY "Allow public read access" ON storage.objects FOR SELECT USING (bucket_id = 'aura-hunt-images');
-- CREATE POLICY "Allow service role full access" ON storage.objects FOR ALL USING (auth.role() = 'service_role');

-- Initial leaderboard refresh
REFRESH MATERIALIZED VIEW public.leaderboard;