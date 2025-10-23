ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_status VARCHAR(100) DEFAULT 'В сети';

CREATE TABLE IF NOT EXISTS typing_status (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    chat_id INTEGER REFERENCES chats(id),
    is_typing BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, chat_id)
);

CREATE TABLE IF NOT EXISTS chat_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    chat_id INTEGER REFERENCES chats(id),
    wallpaper_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, chat_id)
);

CREATE INDEX IF NOT EXISTS idx_typing_status_chat ON typing_status(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_settings_user_chat ON chat_settings(user_id, chat_id);