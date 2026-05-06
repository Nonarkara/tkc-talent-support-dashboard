-- ============================================================
-- Migration 015: Knowledge Management
-- The company's second brain — not just a report repository,
-- a living knowledge graph that compounds over time.
-- ============================================================

CREATE TABLE IF NOT EXISTS knowledge_entries (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id             UUID REFERENCES users(id) NOT NULL,
  entry_type            TEXT NOT NULL CHECK (entry_type IN (
    'share', 'interview_note', 'retrospective', 'observation',
    'idea', 'lesson', 'template', 'how_to', 'case_study'
  )),
  title_th              TEXT NOT NULL,
  title_en              TEXT,
  content               TEXT NOT NULL, -- markdown
  summary               TEXT, -- AI-generated summary
  tags                  TEXT[] DEFAULT '{}',
  related_project_id    UUID REFERENCES projects(id),
  related_department_id UUID REFERENCES departments(id),
  related_division_id   UUID REFERENCES divisions(id),
  visibility            TEXT CHECK (visibility IN ('public', 'team', 'private', 'consultant_only')) DEFAULT 'public',
  -- Engagement tracking
  view_count            INTEGER DEFAULT 0,
  helpful_count         INTEGER DEFAULT 0, -- "this was useful" clicks
  -- Points for knowledge sharing (the Knowledge Compounding system)
  points_awarded        INTEGER DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- Knowledge connections — how entries relate to each other
CREATE TABLE IF NOT EXISTS knowledge_links (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id     UUID REFERENCES knowledge_entries(id) ON DELETE CASCADE NOT NULL,
  target_id     UUID REFERENCES knowledge_entries(id) ON DELETE CASCADE NOT NULL,
  link_type     TEXT CHECK (link_type IN (
    'relates_to', 'builds_on', 'contradicts', 'supersedes', 'inspired_by'
  )) NOT NULL,
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_id, target_id, link_type)
);

-- Knowledge helpfulness — who found what useful
CREATE TABLE IF NOT EXISTS knowledge_reactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id      UUID REFERENCES knowledge_entries(id) ON DELETE CASCADE NOT NULL,
  user_id       UUID REFERENCES users(id) NOT NULL,
  reaction      TEXT CHECK (reaction IN ('helpful', 'bookmark', 'applied')) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entry_id, user_id, reaction)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_author ON knowledge_entries(author_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_type ON knowledge_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_tags ON knowledge_entries USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_knowledge_project ON knowledge_entries(related_project_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_created ON knowledge_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_links_source ON knowledge_links(source_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_links_target ON knowledge_links(target_id);

-- RLS
ALTER TABLE knowledge_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public entries visible to all" ON knowledge_entries
  FOR SELECT USING (visibility = 'public' AND auth.uid() IS NOT NULL);
CREATE POLICY "Private entries visible to author" ON knowledge_entries
  FOR SELECT USING (visibility = 'private' AND auth.uid() = author_id);
CREATE POLICY "Consultant entries visible to admins" ON knowledge_entries
  FOR SELECT USING (visibility = 'consultant_only' AND get_user_role() = 'admin');
CREATE POLICY "Authors can manage own entries" ON knowledge_entries
  FOR ALL USING (auth.uid() = author_id);
CREATE POLICY "Admins can manage all entries" ON knowledge_entries
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "Authenticated can view links" ON knowledge_links
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authors and admins can manage links" ON knowledge_links
  FOR ALL USING (auth.uid() = created_by OR get_user_role() = 'admin');

CREATE POLICY "Users can manage own reactions" ON knowledge_reactions
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "All can view reactions" ON knowledge_reactions
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Trigger: increment helpful_count
CREATE OR REPLACE FUNCTION fn_update_knowledge_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reaction = 'helpful' THEN
    UPDATE knowledge_entries SET helpful_count = helpful_count + 1 WHERE id = NEW.entry_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_knowledge_reaction_insert
  AFTER INSERT ON knowledge_reactions
  FOR EACH ROW EXECUTE FUNCTION fn_update_knowledge_helpful_count();
