const sqlite3 = require('sqlite3').verbose();
const salt = 15;
const ejs = require('ejs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const express = require("express");
const app = express();
require('dotenv').config();
const bodyParser = require('body-parser');
app.use(bodyParser.json());
const port = process.env.PORT || 3000;
const session = require('express-session');

const fs = require('fs');

const directoryPath = './.db';

// ディレクトリが存在しない場合、作成する
if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath);
    console.log(`'${directoryPath}'ディレクトリが作成されました。`);
} else {
    console.log(`'${directoryPath}'ディレクトリは既に存在します。`);
}



const SQLiteStore = require('connect-sqlite3')(session);


app.use(session({
  store: new SQLiteStore({
    db: 'sessions.db', // SQLite3データベースのファイル名
    dir: './.db/',         // データベースファイルの保存場所
    table: 'sessions', // データベース内のセッションテーブル名
    concurrentDB: true, // 複数のリクエストで同時にデータベースへのアクセスを許可
  }),
  secret: process.env.SESSION_SECRET, // セッションの秘密鍵
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }, // セッションの有効期限を設定(例: 7日間)
}));


const db = new sqlite3.Database('./.db/todos.db');

// CREATE TABLEのSQLクエリ
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS tasks (
    task_name TEXT NOT NULL,
    user_id TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    priority INTEGER DEFAULT 0,
    deadline DATE DEFAULT NULL,
    task_id TEXT NOT NULL PRIMARY KEY
  )
`;
console.log(new Date());
// テーブルを作成
db.serialize(() => {
  db.run(createTableQuery, (err) => {
    if (err) {
      console.error('テーブルの作成中にエラーが発生しました:', err.message);
    } else {
      console.log('テーブルが正常に作成されました');
    }
  });
});

const users_table_query = `
  CREATE TABLE IF NOT EXISTS users (
    user_name TEXT NOT NULL,
    user_password TEXT NOT NULL,
    user_id TEXT NOT NULL
  )
`;

db.serialize(() => {
  db.run(users_table_query, (err) => {
    if (err) {
      console.error('テーブルの作成中にエラーが発生しました:', err.message);
    } else {
      console.log('テーブルが正常に作成されました');
    }
  });
});



const get = require("./routes/get.js");

app.use("/", get);
// app.use("/default", get);
app.use("/signup", get);
app.use("/login", get);
app.use("/logout", get);
// app.use("/reset_password", get);









app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));





app.post("/signup", (req, res) => {
  const saltRounds = 15;
  const user_name = req.body.user_name;
  const user_password = req.body.password;
  console.log(user_name, user_password);

  const salt = bcrypt.genSaltSync(saltRounds);
  const hashed_password = bcrypt.hashSync(user_password, salt);
  const UUID = crypto.randomUUID();

  db.run(
    "INSERT INTO users (user_name, user_password, user_id) VALUES (?, ?, ?)",
    [user_name, hashed_password, UUID],
    (err) => {
      if (err) {
        console.error('ユーザー情報の保存中にエラーが発生しました:', err.message);
      } else {
        res.redirect("/");
      }
    }
  );
});

//タスクの追加
app.post('/add', (req, res) => {
  const task_name = req.body.taskName;
  const userId = req.session.user_id;
  const priority = req.body['selected-value'];
  const deadline = req.body["deadline"];
  const UUID = crypto.randomUUID();

  db.run(
    "INSERT INTO tasks (task_name, user_id, priority, deadline, task_id) VALUES (?, ?, ?, ?, ?)",
    [task_name, userId, priority, deadline, UUID],
  )
  res.redirect("/");
});


// タスク削除処理
app.post('/delete', (req, res) => {
  const taskId = req.body.taskId;
  if(!taskId){
    res.status(500).send("エラーが発生したと思います");
  }
  console.log(taskId);
  if (!req.session.user_id) {
    return res.redirect('/login');
  }
  db.run('DELETE FROM tasks WHERE task_id = ?', [taskId], (err, results) => {
    if (err) throw err;
    res.redirect('/');
  });
});


app.post('/login', (req, res) => {
  const user_name = req.body.username;
  const password = req.body.password;

  db.get('SELECT user_password, user_id FROM users WHERE user_name = ?', [user_name], (err, row) => {
    if (err) {
      console.log(err);
      res.status(500).send('Internal Server Error');
    } else {
      if (row) {
        const storedPassword = row.user_password;

        if (bcrypt.compareSync(password, storedPassword)) {
          // 認証成功
          req.session.user_id = row.user_id; // セッションにユーザーIDを保存
          res.redirect("/");
        } else {
          // 認証失敗
          res.status(401).send('Unauthorized');
        }
      } else {
        // ユーザーが見つからない場合
        res.status(404).send('User not found');
      }
    }
  });
});






app.listen(port, () => {
  console.log(`アプリケーションがポート${port}で実行中...`);
});
