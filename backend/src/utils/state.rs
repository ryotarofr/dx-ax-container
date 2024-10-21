use sqlx::postgres::PgPool;

// AppState 構造体の定義
pub struct AppState {
    pub db: PgPool,
}
