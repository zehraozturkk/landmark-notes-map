// import express from "express"  bunu kullanmak istersek package jsona type: module eklemeliyiz
const express = require('express')
const db = require("./config/db")
const cors = require("cors")
const user_operations = require("./user-operations")
const landmarks_operations = require("./landmark-operations")

const app = express()
app.use(express.json())
app.use(cors({
    origin: 'https://landmark-notes-map-s5tu.vercel.app',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
  }));

app.use(express.static('client'));

app.get("/", (req, res) =>{
    res.send("hello world")
})

app.use("/user", user_operations)
app.use("/", landmarks_operations)


app.listen(3000, ()=>{
    console.log("connected to backend")

})