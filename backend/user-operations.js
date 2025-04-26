// import express from "express"  bunu kullanmak istersek package jsona type: module eklemeliyiz
const express = require('express')
const db = require("./config/db")

const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');

const app = express()
app.use(express.json())


app.post("/register", (req,res)=>{

    const salt = bcrypt.genSaltSync(10);
    const passwordHash  = bcrypt.hashSync(req.body.password, salt);

    const q = "INSERT INTO users (`name`, `surname`, `email`, `password`) VALUES (?,?,?,?)"
    
    values = [
        req.body.name,
        req.body.surname,
        req.body.email,
        passwordHash
    ]


    db.query(q, values, (err,data)=>{
        if(err) return res.json({error: err.message})
        return res.json({message:"users has been register"})
    })
})

app.post("/login", (req,res)=>{

    const {email, password} = req.body

    const q = "SELECT * from users where email = ?"

    db.query(q, [email], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: "Kullanıcı bulunamadı" });

        const user = results[0];

        const isPasswordValid = bcrypt.compareSync(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ error: "Şifre yanlış" });
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email }, // Payload (kullanıcı bilgileri)
            'secret_key', // Secret key (gizli anahtar)
            { expiresIn: '1h' } // Token süresi (1 saat)
        );

        // Şifre doğruysa kullanıcı bilgilerini dön (veya token üretilebilir)
        return res.status(200).json({
            message: "Giriş başarılı",
            user: {
                id: user.id,
                name: user.name,
                surname: user.surname,
                email: user.email
            }
        });
    });
})

app.post("/logout", (req, res) => {
    // Since authentication is handled client-side with localStorage,
    // we just return a success message
    res.status(200).json({ message: "User has been logged out" });
});


app.get("/:id", (req, res) => {
    const userId = req.params.id;
    
    const q = "SELECT id, name, surname, email FROM users WHERE id = ?";
    
    db.query(q, [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: "User not found" });
        
        // Return user data without password
        return res.status(200).json(results[0]);
    });
});

module.exports = app;