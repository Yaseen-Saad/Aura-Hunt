<<<<<<< HEAD
const express = require("express");
const app = express();
app.get("/greet", (req, res) => {
    const { name } = req.query;
    res.send({ msg: `Welcome ${name}!` });
});
=======
const express = require("express");
const app = express();
app.get("/greet", (req, res) => {
    const { name } = req.query;
    res.send({ msg: `Welcome ${name}!` });
});
>>>>>>> e7b84ecc9f14aef516ea68d987acf57dcc4fc3f8
module.exports = app;