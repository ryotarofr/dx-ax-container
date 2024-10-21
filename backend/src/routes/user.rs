use crate::{handlers::user_handler::get_users, models::user::Users};
use axum::{routing::get, Router};
use std::sync::Arc;
use tokio::sync::Mutex;

pub fn user_routes(state: Arc<Mutex<Users>>) -> Router {
    Router::new()
        .route("/users", get(get_users))
        .with_state(state)
}
