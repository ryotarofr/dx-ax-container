-- Add migration script here
CREATE TABLE trn_refresh_tokens (
    token TEXT UNIQUE NOT NULL,
    user_id SERIAL PRIMARY KEY,
    expires_at TIMESTAMP NOT NULL
);
