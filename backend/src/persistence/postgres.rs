use std::{env, sync::Arc};

use sqlx::{postgres::PgPoolOptions, PgPool, Pool, Postgres};

#[derive(Clone)]
pub struct Db(pub(crate) Arc<Pool<Postgres>>);

impl Db {
    pub async fn new() -> Db {
        dotenv::dotenv().expect("Failed to read .env file");
        // let database_url = "postgres://postgres:postgres@db/postgres";
        let pool = PgPoolOptions::new()
            .max_connections(8)
            // .connect(database_url)
            .connect(
                &env::var("DATABASE_URL").unwrap_or_else(|_| panic!("DATABASE_URL must be set!")),
            )
            .await
            .unwrap_or_else(|_| {
                panic!("Cannot connect to the database. Please check your configuration.")
            });

        Db(Arc::new(pool))
    }

    // データベース接続を取得するメソッド
    pub fn pool(&self) -> &PgPool {
        &self.0
    }
}
