const express = require('express');
const router = express.Router();
const fs = require('fs');
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('/home/user/glitch_todo-app/.db/todos.db');


function language_check(req) {
  let language = req.headers['accept-language'];
  // リクエストヘッダーから言語を取得し、取得できない場合は英語をデフォルトとする
  let primaryLanguage = language ? language.split(',')[0].split(';')[0] : 'en';
  if (primaryLanguage === "ja-JP"){
    primaryLanguage = "ja";
  }
  let filePath = `./language/${primaryLanguage}.json`;

  let jsondata;
  if (fs.existsSync(filePath)) {
    let data = fs.readFileSync(filePath);
    jsondata = JSON.parse(data);
  } else {
    let data = fs.readFileSync('../language/en.json');
    jsondata = JSON.parse(data);
  }
  return jsondata;
}

router.get('/', (req, res) => {
  try {
    const user_id = req.session.user_id;
    if (!user_id) {
      return res.redirect("login");
    }

    const data = language_check(req);

    db.all("SELECT * FROM tasks WHERE user_id = ?", [user_id], (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).send('データベースエラー');
      }
      res.render('index', { tasks: rows, language: data });
    });
  } catch (err) {
    console.error(err);
    return res.redirect("/login");
  }
});


router.get('/signup', (req, res) => {
  // ToDoリストをデータベースから取得
  const data = language_check(req)
  res.render('signup', {language: data });
});

//ログインページ表示
router.get('/login', (req, res) => {
  let data = language_check(req);
	res.render('login', {language: data});
});

router.get('/logout', (req, res) => {
  // セッションを破棄
  req.session.destroy(err => {
    if (err) {
      console.error('Error destroying session:', err);
      res.sendStatus(500);
    } else {
      res.redirect("/");
    }
  });
});


module.exports = router;



