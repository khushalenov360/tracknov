-- Create document_intelligence table for AI analysis results
CREATE TABLE IF NOT EXISTS document_intelligence (
  document_id UUID PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
  summary TEXT,
  relevance_score INT,
  risks TEXT[],
  next_steps TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE document_intelligence ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view intelligence for accessible documents" ON document_intelligence
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN project_members pm ON d.project_id = pm.project_id
      WHERE d.id = document_intelligence.document_id
      AND pm.user_id = auth.uid()
    )
  );
