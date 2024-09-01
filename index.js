import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";

let app = express();
let port = 3000;


app.use(bodyParser.urlencoded({ extended: true }))

app.use(express.static("public"));
// Connect Database
const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "library",
  password: "yousuf",
  port: 5434,
});
db.connect();

async function userTable() {
  let result = await db.query("Select * from users");
  let usersNames = [];
  let userId = [];
  result.rows.forEach((namesAndid)=> {
    userId.push(namesAndid.id);
    usersNames.push(namesAndid.name);
  })
  return [usersNames, userId];
}


async function mybooksfucntion(id) {
  let result = await db.query("select book from books where user_id = $1", [id]);
  let titles = [];
  result.rows.forEach((bk)=> {
    titles.push(bk.book);
  })
  return titles;
}


app.get("/", async (req, res) => {
  let [userName, userId] = await userTable();
  res.render("index.ejs", {users:userName, id:userId});
})


app.post("/addordeleteuser", async (req, res) => {
  let username = req.body["username"].toLowerCase();
  console.log(username);
  console.log(req.body.opt);
  switch(req.body.opt) {
    case "add":
      await db.query(`insert into users(name) values('${username}')`);
      console.log("Added User");
      break;
    case "del":
      await db.query(`delete from users where name='${username}'`);
      console.log("Deleted User");
      break;
  }
  res.redirect("/");
})


app.post("/mybooks", async(req, res) => {
  let id = req.body["userId"];
  let titles = await mybooksfucntion(id);
  let cover_Ids = [];
  try {
    for(let i=0; i<(await titles).length; i++) {
      let response = await axios(`https://openlibrary.org/search.json?q=${titles[i]}&limit=1`)
      let result = response.data;
      cover_Ids.push(JSON.parse(JSON.stringify(result.docs))[0].cover_i);
    }
    res.render("mybooks.ejs", {title:titles, cover_i: cover_Ids});
  }
  catch(err) {
    console.error("Error!!!", err.message);
    res.render("mybooks.ejs", {error:err.message});
  }
})


app.post("/openBook", async(req, res) => {
  let title = req.body["title"];
  console.log(title);
  try{
    let response = await axios(`https://openlibrary.org/search.json?q=${title}&limit=1`);
    let result = response.data;
    res.render("openingBook.ejs", {data:JSON.parse(JSON.stringify(result.docs))});
  }
  catch (err) {
    console.error("Error!!!", err.message);
    res.render("openingBook.ejs", {error:err.message});
  }
})


app.post("/search", async(req, res) => {
  try{
    let titles=[];
    let cover_Ids=[];
    let search = req.body["search"];
    let response = await axios(`https://openlibrary.org/search.json?q=${search}&limit=24`);
    let result = JSON.parse(JSON.stringify(response.data.docs));
    for(let i=0; i<result.length; i++) {
      titles.push(result[i].title);
      cover_Ids.push(result[i].cover_i);
    }
    res.render("mybooks.ejs", {title:titles, cover_i: cover_Ids});
  }
  catch (err) {
    console.error("Error!!!", err.message);
    res.render("mybooks.ejs", {error:err.message});
  }
})


app.post("/action", (req, res) => {
  let title = req.body["title"];
  try{
    res.render("add.ejs", {title: title});
  }
  catch (err) {
    console.error("Error!!!", err.message);
    res.render("add.ejs", {error:err.message});
  }
})


app.post("/addordelete", async(req, res) => {
  let title = req.body["title"];
  let user = req.body["user"].toLowerCase();
  let result = await db.query(`Select id from users where name='${user}'`);
  let id = result.rows[0].id;
  try{
    if(id=="undefined") {
      res.render("add.ejs", {title: title, msg: "Incorret User!!"});
    }
    switch(req.body.opt) {
      case "add":
        await db.query(`Insert into books values(${id}, '${title}')`);
        console.log("Added");
        break
      case "del":
        await db.query(`DELETE FROM books where book='${title}'`);
        console.log("Deleted");
        break
      default:
          break
    }
    res.redirect("/");
  }
  catch(err) {
    console.error("Error!!!", err.message);
    res.redirect("/");
  }
})

app.listen(port, (req, res) => {
  console.log(`Server Running on port ${3000}`);
})