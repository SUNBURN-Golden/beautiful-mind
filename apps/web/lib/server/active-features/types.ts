export type MatchRow = {
    id: string;
    user1_id: string;
    user2_id: string;
    status: string;
    match_score?: number | null;
    updated_at: string | null;
    created_at: string | null;
};

export type ProfileRow = {
    id: string;
    display_name: string | null;
};

export type MessageRow = {
    id: string;
    match_id: string;
    sender_id: string;
    content: string;
    created_at: string;
};

export type ReviewSessionRow = {
    id: string;
    match_id: string;
    reviewer_id: string;
    target_id: string;
    stage: string;
    created_at: string;
};
