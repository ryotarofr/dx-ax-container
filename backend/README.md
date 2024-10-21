## backend
### SQLX関連
create table
```bash
sqlx migrate add todo
```

migrate command
```bash
sqlx migrate run
```

## memo
### docker立ち上げた時に以下のエラーになる場合
```bash
Error response from daemon: Ports are not available: exposing port TCP 0.0.0.0:5432 -> 0.0.0.0:0: listen tcp 0.0.0.0:5432: bind: address already in use
```
### 対策
ポートを使用しているか確認
```bash
sudo lsof -i :5432
```
```bash
# こんな感じで出る
postgres 310 postgres    7u  IPv6 0xc650e5ed8c9377d      0t0  TCP *:postgresql (LISTEN)
```
ポートを解放
```bash
sudo kill -9 310
```
再度dockerを立ち上げ直す