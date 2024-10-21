// response::Jsonを追加
use axum::{extract::State, response::Json, routing::get, Router};
// 以下を追加
use serde::{Deserialize, Serialize};

// JSONファイルのやりとりを可能にする
#[derive(Clone, Deserialize, Serialize)]
pub struct User {
    pub id: u32,
    pub name: String,
}

#[derive(Clone, Deserialize, Serialize)]
pub struct Users {
    pub users: Vec<User>,
}

#[derive(Serialize, Deserialize)]
pub struct JwtUser {
    pub user_id: i32,
}
