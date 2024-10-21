use axum::async_trait;
use axum::extract::rejection::JsonRejection;
use axum::extract::{FromRequest, Request};
use axum::{
    extract::State,
    response::{IntoResponse, Response},
    Json,
};
use chrono::{Duration, Utc};
use hyper::StatusCode;
use serde::Deserialize;
use sqlx::prelude::FromRow;
use std::sync::Arc;
use uuid::Uuid;

use crate::{
    models::user::JwtUser,
    utils::{jwt_lib, state::AppState},
};

#[derive(Debug, FromRow)]
pub struct RefreshToken {
    token: String,
    user_id: i32,
    expires_at: chrono::NaiveDateTime,
}

async fn generate_refresh_token(user: &JwtUser) -> String {
    Uuid::new_v4().to_string()
}

async fn store_refresh_token(
    State(data): State<Arc<AppState>>,
    token: &RefreshToken,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let query_result = sqlx::query_as::<_, RefreshToken>(
        r#"
        INSERT INTO trn_refresh_tokens 
        (token, user_id, expires_at) 
        VALUES ($1, $2, $3)"#,
    )
    .bind(token.token.clone())
    .bind(token.user_id)
    .bind(token.expires_at)
    .fetch_one(&data.db)
    .await;
    if query_result.is_err() {
        let error_response = serde_json::json!({
            "status": "fail",
            "message": "Something bad happened while fetching all note items",
        });
        return Err((StatusCode::INTERNAL_SERVER_ERROR, Json(error_response)));
    }

    match query_result {
        Ok(_) => {
            let json_response = serde_json::json!({
                "status": "success",
                "message": "Token stored successfully",
            });
            Ok(Json(json_response))
        }
        Err(_) => {
            let error_response = serde_json::json!({
                "status": "fail",
                "message": "Something bad happened while storing refresh token",
            });
            Err((StatusCode::INTERNAL_SERVER_ERROR, Json(error_response)))
        }
    }
}

async fn generate_and_store_refresh_token(
    State(data): State<Arc<AppState>>,
    user: &JwtUser,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let token = generate_refresh_token(user).await;
    let expiration = Utc::now() + Duration::days(30);
    let refresh_token = RefreshToken {
        token: token.clone(),
        user_id: user.user_id,
        expires_at: expiration.naive_utc(),
    };

    store_refresh_token(State(data), &refresh_token).await;
    Ok(token)
}

async fn verify_refresh_token(
    State(data): State<Arc<AppState>>,
    token: &str,
) -> Result<JwtUser, String> {
    let row = sqlx::query_as::<_, RefreshToken>(
        r#"SELECT token, user_id, expires_at FROM trn_refresh_tokens WHERE token = $1"#,
    )
    .bind(token)
    .fetch_optional(&data.db)
    .await
    .map_err(|_| "Database query error")?;

    if let Some(row) = row {
        if Utc::now().naive_utc() < row.expires_at {
            return Ok(JwtUser {
                user_id: row.user_id,
            });
        }
    }

    Err("Invalid or expired refresh token".into())
}

pub async fn refresh_token_handler(
    State(state): State<Arc<AppState>>,
    Json(refresh_request): Json<RefreshTokenRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    println!("Received refresh token request: {:?}", refresh_request);
    if let Some(refresh_token) = refresh_request.refresh_token {
        match verify_refresh_token(State(state.clone()), &refresh_token).await {
            Ok(user) => {
                let new_access_token = jwt_lib::get_jwt(&user);
                let new_refresh_token =
                    generate_and_store_refresh_token(State(state.clone()), &user).await;
                match (new_access_token, new_refresh_token) {
                    (Ok(token), Ok(_)) => {
                        let response_body = serde_json::json!({
                            "success": true,
                            "data": {
                                "token": token,
                                "refresh_token": refresh_token
                            }
                        });
                        Ok(Response::builder()
                            .status(StatusCode::OK)
                            .header("Content-Type", "application/json")
                            .body(response_body.to_string())
                            .unwrap())
                    }
                    (Err(token_error), _) => {
                        let response_body = serde_json::json!({
                            "success": false,
                            "data": {
                                "message": token_error.to_string()
                            }
                        });
                        Ok(Response::builder()
                            .status(StatusCode::BAD_REQUEST)
                            .header("Content-Type", "application/json")
                            .body(response_body.to_string())
                            .unwrap())
                    }
                    (_, Err(refresh_token_error)) => {
                        let response_body = serde_json::json!({
                            "success": false,
                            "data": {
                                "message": "refresh_token_error"
                            }
                        });
                        Ok(Response::builder()
                            .status(StatusCode::BAD_REQUEST)
                            .header("Content-Type", "application/json")
                            .body(response_body.to_string())
                            .unwrap())
                    }
                }
            }
            Err(error) => {
                let response_body = serde_json::json!({
                    "success": false,
                    "data": {
                        "message": error.to_string()
                    }
                });
                Ok(Response::builder()
                    .status(StatusCode::UNAUTHORIZED)
                    .header("Content-Type", "application/json")
                    .body(response_body.to_string())
                    .unwrap())
            }
        }
    } else {
        let response_body = serde_json::json!({
            "success": false,
            "data": {
                "message": "Invalid request"
            }
        });
        Ok(Response::builder()
            .status(StatusCode::BAD_REQUEST)
            .header("Content-Type", "application/json")
            .body(response_body.to_string())
            .unwrap())
    }
}

#[derive(Debug, Deserialize)]
pub struct RefreshTokenRequest {
    pub refresh_token: Option<String>,
}

#[async_trait]
impl FromRequest<AppState> for RefreshTokenRequest
where
    Json<RefreshTokenRequestPartial>: FromRequest<AppState, Rejection = JsonRejection>,
{
    type Rejection = Response;

    async fn from_request(request: Request, state: &AppState) -> Result<Self, Self::Rejection> {
        let Json(partial) = Json::<RefreshTokenRequestPartial>::from_request(request, state)
            .await
            .map_err(|error| {
                tracing::error!(
                    "Error extracting json body for refresh token request: {}",
                    error.body_text()
                );
                error.status().into_response()
            })?;

        Ok(Self {
            refresh_token: partial.refresh_token,
        })
    }
}

#[derive(Deserialize, Debug)]
pub struct RefreshTokenRequestPartial {
    pub refresh_token: Option<String>,
}
