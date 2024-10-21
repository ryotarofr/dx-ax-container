use std::sync::Arc;

use routes::productization_route::create_router;
use sqlx::{postgres::PgPoolOptions, Pool, Postgres};
mod error;
use axum::http::{
    header::{ACCEPT, AUTHORIZATION, CONTENT_TYPE},
    HeaderValue, Method,
};
use axum::{debug_handler, routing::get, Router};
use dotenvy::dotenv;
use tower_http::cors::CorsLayer;
use tracing::info;

use crate::utils::state::AppState;
mod handlers;
mod models;
mod persistence;
mod routes;
mod scheme;
mod utils;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();
    // ---------なんかenvファイル認識されないからとりあえず直打ち-------
    // let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    // println!("DATABASE_URL: {}", database_url); // 確認のために追加
    // ---------------------------------------------------------

    // db connection
    let database_url = "postgres://postgres:postgres@db/postgres";
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(database_url)
        .await
        .expect("couldn't connect to the database");

    // cors
    let cors = CorsLayer::new()
        .allow_origin("http://localhost:5173".parse::<HeaderValue>().unwrap())
        .allow_methods([Method::GET, Method::POST, Method::PATCH, Method::DELETE])
        .allow_credentials(true)
        .allow_headers([AUTHORIZATION, ACCEPT, CONTENT_TYPE]);

    // let app = Router::new().route("/", get(check_health));
    let app = create_router(Arc::new(AppState { db: pool.clone() })).layer(cors);
    // .nest_service("/", static_dir.clone())
    // .nest("/api", user_routes(users_state.clone()));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8083").await?;
    axum::serve(listener, app).await?;

    Ok(())
}

#[debug_handler]
async fn check_health() -> String {
    info!("Health check.");
    "Hello from axum.".to_string()
}
