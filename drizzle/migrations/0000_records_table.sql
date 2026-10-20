CREATE TABLE public.records (
  collection text NOT NULL,
  id text NOT NULL,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collection, id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.records TO anon, authenticated;
GRANT ALL ON public.records TO service_role;
ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open read" ON public.records FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "open insert" ON public.records FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "open update" ON public.records FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "open delete" ON public.records FOR DELETE TO anon, authenticated USING (true);
ALTER TABLE public.records REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.records;