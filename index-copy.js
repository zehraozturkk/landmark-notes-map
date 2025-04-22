// import express from "express"  bunu kullanmak istersek package jsona type: module eklemeliyiz
const express = require('express')
const db = require("./db")
const cors = require("cors")

const app = express()
app.use(express.json())
app.use(cors());


app.get("/", (req, res) =>{
    res.send("hello world")
})

app.get("/books", (req,res)=>{
    const q = "SELECT * FROM books"
    db.query(q, (err, data)=>{
        if(err) return res.json("err")
        return res.json(data)
    })
})

app.post("/books", (req,res)=>{
    const q = " INSERT INTO books (`title`,`desc`,`cover`) VALUES (?)"
    // const values = ["title1", "desc1", "cover1"]
    const values = [
        req.body.title,
        req.body.desc,
        req.body.cover
    ]

    db.query(q, [values], (err,data)=>{
        if(err) return res.json("err")
        return res.json("book has been created")
    })
})


app.post("/books", (req,res)=>{
    const landmarks = req.body.landmarks;
    if(!landmarks || !Array.isArray(landmarks)){
        return res.status(400).json({error: "ınvalid data format"})
    }

    for (let point of landmarks) {
        const q = "INSERT INTO landmarks (latitude, longitude) VALUES (?, ?)";
        db.query(q, [point.latitude, point.longitude], (err, data) => {
            if (err) console.error("DB Error:", err);
        });
    }

    res.status(201).json({ message: "Landmarks saved!" });
})




app.listen(3000, ()=>{
    console.log("connected to backend")

})