use crate::handlers::productization_handler::{health_checker_handler, test_handler};

use crate::handlers::refresh_token_handler::refresh_token_handler;
use crate::utils::state::AppState;
use axum::{
    routing::{get, post},
    Router,
};
use std::sync::Arc;

pub fn create_router(app_state: Arc<AppState>) -> Router {
    Router::new()
        .route("/api/test", get(health_checker_handler))
        .route("/api/test2", get(test_handler))
        .route("/api/refresh_token", post(refresh_token_handler))
        .with_state(app_state)
}
