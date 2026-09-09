-- ============================================================
-- ENABLE ROW LEVEL SECURITY ON ALL COMPETENCIA TABLES
-- ============================================================
-- This project uses NextAuth + Prisma (direct PostgreSQL connection).
-- Prisma connects as the postgres superuser → bypasses RLS automatically.
-- Enabling RLS (with no permissive policies) blocks any public REST API
-- access via the Supabase anon key, while keeping all server-side
-- API routes functional.
-- ============================================================

-- Auth / Users
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserModule" ENABLE ROW LEVEL SECURITY;

-- Contenu pédagogique
ALTER TABLE "Seance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Fiche" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatMessage" ENABLE ROW LEVEL SECURITY;

-- Référentiel OFPPT
ALTER TABLE "Filiere" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RefModule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Sequence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Competence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Objectif" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CriterePerformance" ENABLE ROW LEVEL SECURITY;

-- Suivi des compétences
ALTER TABLE "Groupe" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GroupeCompetence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Stagiaire" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProgressionCompetence" ENABLE ROW LEVEL SECURITY;

-- Bibliothèque collaborative
ALTER TABLE "SharedResource" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ResourceLike" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ResourceComment" ENABLE ROW LEVEL SECURITY;

-- Simulateur
ALTER TABLE "Simulation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VirtualCompany" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SimulationRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RunEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RunDecision" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SimulationReport" ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- VERIFY: list all tables with their RLS status
-- ============================================================
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
