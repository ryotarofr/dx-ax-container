use chrono::{DateTime, Local, TimeZone};
/// ---サービステーブル(trn_productization)
/// ID(service_id)
/// 商品カテゴリ(category_name)
/// 商品名(service_name)
/// 商品説明(service_desc)
/// ポストユーザ(insuser_id)
/// ポスト日(created_at)
/// 更新日(updated_at)
/// 更新ユーザ(upduser_id)
/// 購入フラグ(purchase_flg)
/// 指定リンク*x,インスタリンク等(purchased_user_url)
/// 増やしたい数(increase_cnt)
/// 現在の数(current_cnt)
/// 返金フラグ repayment_flg

/// ---サービステーブル作るために必要なテーブル
/// ユーザテーブル(mst_user)
/// 商品カテゴリテーブル(mst_category)

/// ---mst_userに紐づく権限情報のテーブル
/// ユーザ権限テーブル(mst_user_authority)
/// ユーザの購入情報(trn_purchase_info)

/// mst_user
/// email
/// password
/// user_id

/// ---ユーザ権限テーブル(mst_user_authority)
/// ユーザの商品ポスト権限について
/// ユーザid user_id
/// 権限ランク authority_rank -> enum型: 1: 全ての権限 ,2: 商品ポスト権限,3: 購入権限,4: any....
/// (権限値が小さいものは大きものを包含する)
/// 権限発行日: created_at
/// 権限更新日: updated_at

/// ---ユーザの購入情報(trn_purchase_info)
/// 商品id service_id
/// ユーザid user_id
/// 決済情報 payment_info -> enum型 1: 成功, 2: 失敗
/// 購入日 created_at
/// 返金フラグ repayment_flg
/// 返金日 repaymented_at
///
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, FromRow, Deserialize, Serialize)]
#[allow(non_snake_case)]
pub struct ProductizationModel {
    pub id: Uuid,
    pub title: String,
    pub content: String,
    pub category: Option<String>,
    pub published: Option<bool>,
    #[serde(rename = "createdAt")]
    pub created_at: Option<DateTime<Local>>,
    #[serde(rename = "updatedAt")]
    pub updated_at: Option<DateTime<Local>>,
}

impl ProductizationModel {
    pub fn new(title: String, content: String) -> Self {
        Self {
            id: Uuid::new_v4(),
            title,
            content,
            category: None,
            published: None,
            created_at: Some(Local::now()), // Local::now()で現在のローカル時間を取得
            updated_at: Some(Local::now()),
        }
    }
}
