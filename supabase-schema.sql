-- ============================================
-- DEXORNIT TRADE JOURNAL — SUPABASE DATABASE SCHEMA
-- ============================================
-- Jalankan query SQL ini di Supabase Dashboard -> SQL Editor -> New query -> Run

-- 1. Buat Tabel TRADES (Menyimpan seluruh data transaksi & jurnal)
CREATE TABLE IF NOT EXISTS public.trades (
    id TEXT PRIMARY KEY,
    pair TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('Long', 'Short')),
    account TEXT NOT NULL,
    date_open TIMESTAMPTZ NOT NULL,
    date_close TIMESTAMPTZ NOT NULL,
    risk NUMERIC NOT NULL,
    pnl NUMERIC NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Win', 'Loss', 'Breakeven')),
    rr NUMERIC,
    trade_duration TEXT,
    framework TEXT,
    market_profile TEXT,
    narrative TEXT,
    key_level_htf TEXT,
    entry_model TEXT,
    confluences JSONB DEFAULT '[]'::jsonb,
    mistake TEXT DEFAULT 'None',
    screenshot_type TEXT DEFAULT 'link',
    screenshot_url TEXT,
    screenshots JSONB DEFAULT '[]'::jsonb,
    emotion_before TEXT,
    emotion_during TEXT,
    emotion_after TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Upgrade script jika tabel sudah pernah dibuat sebelumnya:
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS confluences JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.trades DROP CONSTRAINT IF EXISTS trades_status_check;
ALTER TABLE public.trades ADD CONSTRAINT trades_status_check CHECK (status IN ('Win', 'Loss', 'Breakeven'));

-- 2. Buat Tabel SETTINGS (Menyimpan dropdown tags & risk management rules)
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Aktifkan Row Level Security (RLS) & Berikan Akses Anon/Public (Untuk Personal Journal)
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Berikan izin akses tabel ke role anon dan authenticated
GRANT ALL ON public.trades TO anon, authenticated, service_role;
GRANT ALL ON public.settings TO anon, authenticated, service_role;

-- Buat Policy agar webapp bisa membaca, menambah, mengubah, dan menghapus data
DROP POLICY IF EXISTS "Allow all operations on trades for anon users" ON public.trades;
CREATE POLICY "Allow all operations on trades for anon users" 
ON public.trades 
FOR ALL 
TO public
USING (true) 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on settings for anon users" ON public.settings;
CREATE POLICY "Allow all operations on settings for anon users" 
ON public.settings 
FOR ALL 
TO public
USING (true) 
WITH CHECK (true);

-- 4. Masukkan Default Initial Settings (Dropdowns & Risk Rules)
INSERT INTO public.settings (id, key, value) VALUES
('setting-pairs', 'pairs', '["XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "US100", "US30", "BTCUSD"]'::jsonb),
('setting-accounts', 'accounts', '["ForTraders", "BrightFunded 1", "BrightFunded 2", "BlueGuardian", "Personal MT5"]'::jsonb),
('setting-frameworks', 'frameworks', '["GXT", "ICT", "SMC", "Price Action", "Break & Retest"]'::jsonb),
('setting-narratives', 'narratives', '["LIQ > IMB", "HTF Trend Alignment", "Daily Range Expansion", "Session Sweep Reversal"]'::jsonb),
('setting-key-levels', 'key_levels', '["PDH", "PDL", "PWH", "PWL", "Session High", "Session Low", "Order Block"]'::jsonb),
('setting-entry-models', 'entry_models', '["CISD", "FVG Tap", "SMT Divergence", "Breaker Block", "Liquidity Sweep + MSS"]'::jsonb),
('setting-mistakes', 'mistakes', '["None", "FOMO", "Overleveraged", "Early Exit", "Broke Rules", "Chasing Price", "Revenge Trading"]'::jsonb),
('setting-risk-rules', 'risk_rules', '{"maxDailyLoss": 2, "riskPerTrade": 0.5, "minimumRR": 2, "maxTradesPerDay": 3}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 5. Buat Storage Bucket untuk File Screenshot Charts (trade-screenshots)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('trade-screenshots', 'trade-screenshots', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policy untuk mengizinkan upload dan pembacaan screenshot secara public
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND policyname = 'Public Access trade-screenshots'
    ) THEN
        CREATE POLICY "Public Access trade-screenshots" 
        ON storage.objects FOR ALL 
        USING (bucket_id = 'trade-screenshots') 
        WITH CHECK (bucket_id = 'trade-screenshots');
    END IF;
END $$;
