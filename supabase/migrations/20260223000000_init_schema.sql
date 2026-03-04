-- 1. 코어 모듈 Enum 생성
CREATE TYPE verification_module AS ENUM ('OSINT', 'LOCATION', 'DEVICE');
CREATE TYPE audit_action AS ENUM ('INSERT', 'UPDATE', 'DELETE');

-- 2. 핵심 5개 테이블 생성 (민감정보 전면 배제)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    reputation_score INTEGER DEFAULT 100,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    module verification_module NOT NULL,
    is_granted BOOLEAN DEFAULT false,
    granted_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, module)
);

CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    signature_base64 TEXT NOT NULL,
    agreed_to_terms BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    decision TEXT NOT NULL,
    score INTEGER NOT NULL,
    flags JSONB DEFAULT '{}'::jsonb,
    summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action audit_action NOT NULL,
    old_data JSONB,
    new_data JSONB,
    changed_by UUID, -- auth.uid()
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Audit Log Trigger 함수 작성
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
    old_record JSONB := NULL;
    new_record JSONB := NULL;
    user_id UUID := auth.uid();
BEGIN
    IF (TG_OP = 'DELETE') THEN
        old_record := row_to_json(OLD)::JSONB;
        INSERT INTO audit_logs (table_name, record_id, action, old_data, changed_by)
        VALUES (TG_TABLE_NAME::TEXT, OLD.id, 'DELETE', old_record, user_id);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        old_record := row_to_json(OLD)::JSONB;
        new_record := row_to_json(NEW)::JSONB;
        INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, changed_by)
        VALUES (TG_TABLE_NAME::TEXT, NEW.id, 'UPDATE', old_record, new_record, user_id);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        new_record := row_to_json(NEW)::JSONB;
        INSERT INTO audit_logs (table_name, record_id, action, new_data, changed_by)
        VALUES (TG_TABLE_NAME::TEXT, NEW.id, 'INSERT', new_record, user_id);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 부착 (주요 4개 테이블)
CREATE TRIGGER audit_profiles_trigger
AFTER INSERT OR UPDATE OR DELETE ON profiles
FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_consents_trigger
AFTER INSERT OR UPDATE OR DELETE ON consents
FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_contracts_trigger
AFTER INSERT OR UPDATE OR DELETE ON contracts
FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_interviews_trigger
AFTER INSERT OR UPDATE OR DELETE ON interviews
FOR EACH ROW EXECUTE FUNCTION log_audit_event();


-- 4. RLS (Row Level Security) 설정 및 격리 정책
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- [profiles] 본인 행위만 SELECT / UPDATE
CREATE POLICY "Users can view own profile" ON profiles 
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles 
FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles 
FOR INSERT WITH CHECK (auth.uid() = id);

-- [consents] 본인 동의 내역만 통제
CREATE POLICY "Users can select own consents" ON consents 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consents" ON consents 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own consents" ON consents 
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own consents" ON consents 
FOR DELETE USING (auth.uid() = user_id);

-- [contracts] 본인 서명만 통제
CREATE POLICY "Users can select own contracts" ON contracts 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contracts" ON contracts 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contracts" ON contracts 
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- [interviews] 본인 인터뷰만 통제
CREATE POLICY "Users can select own interviews" ON interviews 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interviews" ON interviews 
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- [audit_logs] INSERT-ONLY 강제, 조회는 최고 관리자 또는 서비스 롤만 (유저 조회 불가)
CREATE POLICY "Audit logs are insert-only by trigger" ON audit_logs 
FOR INSERT WITH CHECK (true); -- 트리거(SECURITY DEFINER)에 의해 방어됨
-- SELECT, UPDATE, DELETE 정책은 생성하지 않아 기본적으로 거부(Deny All) 처리됨
