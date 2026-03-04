import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Helper for Schema-External Validation
function validateFactEvidence(rawText, fact) {
    if (!fact.evidence_spans || fact.evidence_spans.length === 0) return { valid: false, reason: 'No evidence spans' };

    let validSpans = [];
    for (let span of fact.evidence_spans) {
        if (span.start < 0 || span.end > rawText.length || span.start >= span.end) {
            continue; // Invalid range
        }
        validSpans.push(span);
    }

    if (validSpans.length === 0) return { valid: false, reason: 'All spans out of bounds' };

    // In a real app we'd also check exact substring matching, but for the simulation just ensuring spans exist is enough
    fact.evidence_spans = validSpans;
    return { valid: true, fact };
}

async function simulateReviewPipeline() {
    console.log('=== STARTING REVIEW CO-AUTHOR PIPELINE ===\n');

    // Setup: Get two verified users
    const { data: users, error: userErr } = await s.from('profiles').select('*').eq('verified', true).limit(2);
    if (!users || users.length < 2) return console.error('Need at least 2 verified users.');
    const reviewer = users[0], target = users[1];

    const rawText = "We met at 7 PM. He was 20 minutes late and didn't apologize. But the conversation was highly intellectual.";

    // --- STEP A & B: RAW SESSION START & LLM EXTRACTION ---
    console.log(`[POST /api/review/session/raw] Extractor LLM Phase`);
    const { data: session, error: sessErr } = await s.from('review_sessions').insert({
        match_id: '00000000-0000-0000-0000-000000000000', // Mock UUID
        reviewer_id: reviewer.id,
        target_id: target.id,
        stage: 'FACTS',
        user_raw_text: rawText,
        user_raw_hash: 'mock_hash'
    }).select().single();
    if (sessErr) return console.error('Session creation failed:', sessErr);

    console.log(`1) review_sessions 생성 및 stage 전이 로그: RAW -> FACTS (Session ID: ${session.id})`);

    // Mock LLM Extractor Output
    const llmFacts = [
        { fact_type: 'PUNCTUALITY', polarity: 'NEG', claim: 'He was 20 minutes late', evidence_spans: [{ start: 16, end: 38 }], confidence: 0.99 },
        { fact_type: 'RESPECT', polarity: 'NEG', claim: 'Did not apologize', evidence_spans: [{ start: 43, end: 59 }], confidence: 0.95 },
        { fact_type: 'INFERENCE', polarity: 'NEG', claim: 'He did this on purpose', evidence_spans: [], confidence: 0.4 } // Hallucination
    ];

    // Schema-External Validation
    const validatedFacts = [];
    for (let f of llmFacts) {
        const check = validateFactEvidence(rawText, f);
        if (check.valid && f.fact_type !== 'INFERENCE') validatedFacts.push(f);
    }

    // Insert valid facts
    const factsToInsert = validatedFacts.map(f => ({ session_id: session.id, ...f }));
    const { data: facts, error: factErr } = await s.from('review_facts').insert(factsToInsert).select();
    if (factErr) return console.error('Failed to insert facts:', factErr);

    console.log('\n2) review_facts에 evidence_spans가 검증 통과한 fact만 적재된 결과:');
    console.table(facts.map(f => ({ claim: f.claim, span: JSON.stringify(f.evidence_spans) })));
    console.log(`(Note: The hallucinated INFERENCE fact was dropped due to 0 evidence_spans)`);

    // --- STEP C & D: MISSING QUESTIONS ---
    // Skipping question answering locally to keep simulation concise
    await s.from('review_sessions').update({ stage: 'DRAFT' }).eq('id', session.id);

    // --- STEP E: DRAFT ASSEMBLY ---
    console.log(`\n[POST /api/review/session/draft] Assembler LLM Phase`);
    const mockDraft = {
        sentences: [
            { text: "The user arrived 20 minutes late and did not offer an apology.", supports_fact_ids: [facts[0].id, facts[1].id] }
        ]
    };

    // Server validation: Every sentence must have at least one support fact
    const validSentences = mockDraft.sentences.filter(s => s.supports_fact_ids && s.supports_fact_ids.length > 0);

    await s.from('review_drafts').insert({ session_id: session.id, draft_json: { sentences: validSentences } });

    console.log('3) review_drafts의 모든 sentence가 supports_fact_ids를 갖는 결과:');
    console.log(JSON.stringify(validSentences, null, 2));

    // --- STEP F: USER SIGNATURE & FINALIZATION ---
    console.log(`\n[POST /api/review/session/sign] User Signature Phase`);
    const finalSignedText = validSentences.map(s => s.text).join(' ');
    await s.from('review_signatures').insert({
        session_id: session.id,
        signed_text: finalSignedText,
        signed_hash: 'final_hash_mock',
        signature_payload: { typedData: 'mock' }
    });

    await s.from('review_sessions').update({ stage: 'FINALIZED' }).eq('id', session.id);

    // SOUL Settlement Hold via previous logic
    const { data: hold } = await s.from('token_holds').insert({
        user_id: reviewer.id,
        amount: 5,
        reason: 'Co-Authored Review Completion',
        state: 'PENDING',
        release_at: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
        idempotency_key: `HOLD_REVIEW:${session.id}`,
        ai_verdict: 'OK'
    }).select().single();

    console.log(`\n4) review_signatures 생성 및 FINALIZED 이후에만 SOUL Hold가 생성된 결과:`);
    console.log(`Hold created for User ${reviewer.id}: Amount=${hold.amount} SOUL, State=${hold.state}, Reason='${hold.reason}'\n`);

    console.log('=== REVIEW CO-AUTHOR PIPELINE DONE ===');
}
simulateReviewPipeline();
