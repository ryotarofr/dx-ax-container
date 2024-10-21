use crate::models::user::Users;
use axum::{extract::State, response::Json};
use std::sync::Arc;
use tokio::sync::Mutex;

// Readを行う関数
// usersを取得、Json<Users> を返り値として指定
pub async fn get_users(State(users_state): State<Arc<Mutex<Users>>>) -> Json<Users> {
    // ロック(lock)を獲得
    let user_lock = users_state.lock().await;

    // usersを返す
    Json(user_lock.clone())
}
