-- Add columns to public.project_document
ALTER TABLE public.project_document ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;
ALTER TABLE public.project_document ADD COLUMN IF NOT EXISTS compressed_size_bytes BIGINT;
ALTER TABLE public.project_document ADD COLUMN IF NOT EXISTS upload_origin VARCHAR(50) DEFAULT 'web';
ALTER TABLE public.project_document ADD COLUMN IF NOT EXISTS upload_rejection_reason TEXT;
ALTER TABLE public.project_document ADD COLUMN IF NOT EXISTS compression_applied BOOLEAN DEFAULT FALSE;
ALTER TABLE public.project_document ADD COLUMN IF NOT EXISTS mime_type VARCHAR(255);
ALTER TABLE public.project_document ADD COLUMN IF NOT EXISTS upload_duration_ms INTEGER;

-- Create a telemetry table to log all upload attempts, particularly failures
CREATE TABLE IF NOT EXISTS public.upload_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    user_id UUID,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(255),
    upload_origin VARCHAR(50) DEFAULT 'web',
    status VARCHAR(50) NOT NULL, -- 'SUCCESS', 'REJECTED'
    rejection_reason TEXT,
    compression_applied BOOLEAN DEFAULT FALSE,
    compressed_size_bytes BIGINT,
    upload_duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on public.upload_attempts
ALTER TABLE public.upload_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read upload attempts for project members" ON public.upload_attempts;
CREATE POLICY "Allow read upload attempts for project members"
    ON public.upload_attempts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.project_users pu
            WHERE pu.project_id = upload_attempts.project_id
              AND pu.user_id = auth.uid()
        ) OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = auth.uid()
              AND p.global_role IN ('super_user', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Allow insert upload attempts for authenticated users" ON public.upload_attempts;
CREATE POLICY "Allow insert upload attempts for authenticated users"
    ON public.upload_attempts
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Indexing for telemetry, oversized attempts, failure telemetry, mime-type frequency
CREATE INDEX IF NOT EXISTS idx_upload_attempts_status ON public.upload_attempts(status);
CREATE INDEX IF NOT EXISTS idx_upload_attempts_file_size ON public.upload_attempts(file_size_bytes);
CREATE INDEX IF NOT EXISTS idx_upload_attempts_mime_type ON public.upload_attempts(mime_type);
CREATE INDEX IF NOT EXISTS idx_upload_attempts_created_at ON public.upload_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_project_document_file_size ON public.project_document(file_size_bytes);
