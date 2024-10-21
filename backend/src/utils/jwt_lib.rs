use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};

use crate::models::user::JwtUser;

#[derive(Serialize, Deserialize)]
struct Claims {
    user_id: i32,
    exp: i64,
}

pub fn get_jwt(user: &JwtUser) -> Result<String, String> {
    let token = encode(
        &Header::default(),
        &Claims {
            user_id: user.user_id,
            exp: (Utc::now() + Duration::minutes(1)).timestamp(),
        },
        &EncodingKey::from_secret("mykey".as_bytes()),
    )
    .map_err(|e| e.to_string());

    return token;
}

pub fn decode_jwt(token: &str) -> Result<JwtUser, String> {
    let token_data = decode::<JwtUser>(
        token,
        &DecodingKey::from_secret("mykey".as_bytes()),
        &Validation::default(),
    );

    match token_data {
        Ok(token_data) => Ok(token_data.claims),

        Err(e) => Err(e.to_string()),
    }
}
