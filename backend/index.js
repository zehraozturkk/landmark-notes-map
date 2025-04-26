const express = require('express');
const cors = require("cors");
const user_operations = require("./user-operations");
const landmarks_operations = require("./landmark-operations");

const app = express();
app.use(express.json());
app.use(cors({
    origin: '*', // Tüm kaynaklara izin ver (daha güvenli olmak için sadece frontend URL'inizi kullanın)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

app.use(express.static('client'));

app.get("/", (req, res) => {
    res.send("hello world");
});

app.use("/user", user_operations);
app.use("/", landmarks_operations);

// Vercel için gerekli - local dev ortamında dinle, production'da export et
if (process.env.NODE_ENV !== 'production') {
    app.listen(3000, () => {
        console.log("connected to backend");
    });
}

// Vercel için gerekli - uygulamayı export et
module.exports = app;