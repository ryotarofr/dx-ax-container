use crate::utils::state::AppState;
use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use serde_json::json;
use std::sync::Arc;

pub async fn health_checker_handler() -> impl IntoResponse {
    const MESSAGE: &str = "Simple CRUD API with Rust, SQLX, Postgres,and Axum";
    let json_response = serde_json::json!({
        "status": "success",
        "message": MESSAGE
    });
    Json(json_response)
}

#[derive(sqlx::FromRow, serde::Serialize)]
struct MyRow {
    id: i32,
    email: String,
    user_name: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct Params {
    user_id: i32,
}

pub async fn test_handler(
    Query(params): Query<Params>,
    State(data): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    println!("Received params: {:?}", params);

    let query_result = sqlx::query_as::<_, MyRow>(
        r#"
        SELECT id, email, user_name 
        FROM mst_user
        WHERE id = $1
        "#,
    )
    .bind(params.user_id)
    .fetch_all(&data.db)
    .await;

    match query_result {
        Ok(test_rows) => {
            let json_response = json!({
                "status": "success",
                "results": test_rows,
            });
            Ok((StatusCode::OK, Json(json_response)))
        }
        Err(err) => {
            // エラーの詳細をログに記録
            eprintln!("Database query error: {:?}", err);

            let error_response = json!({
                "status": "fail",
                "message": "Something bad happened while fetching all note items",
            });
            Err((StatusCode::INTERNAL_SERVER_ERROR, Json(error_response)))
        }
    }
}
