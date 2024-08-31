const express = require("express");
const app = express();
app.get("/greet", (req, res) => {
    const { name } = req.query;
    res.send({ msg: `Welcome ${name}!` });
});
module.exports = app;