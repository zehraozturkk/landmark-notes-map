// import express from "express"  bunu kullanmak istersek package jsona type: module eklemeliyiz
const express = require('express')
const db = require("./config/db")

const app = express()
app.use(express.json())


app.post("/register", (req,res)=>{
    
})
