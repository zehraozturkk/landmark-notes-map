const express = require('express')
const db = require("./config/db")

const app = express()
app.use(express.json())


app.post("/landmarks/adding", (req,res)=>{
    console.log("Gelen veri:", req.body);
    const lat = parseFloat(req.body.lat);
    const lng = parseFloat(req.body.lng);
    const userId = req.body.userId;

    const q = " INSERT INTO landmarks (`lat`,`lng`,`name`,  `category`) VALUES (?)"
    // const values = ["title1", "desc1", "cover1"]
    const values = [
        lat,
        lng,
        req.body.name,
        req.body.category
        
    ]

    db.query(q, [values], (err,data)=>{
        if(err) {
            console.error("Error adding landmark:", err);
            return res.status(500).json({ error: err.message });
        }
        const landmarkId = data.insertId;  // Yeni eklenen landmark'ın ID'si

        // Landmark ile ilişkili kullanıcıyı user_visits tablosuna ekle
        const visitQuery = `
            INSERT INTO user_landmarks (user_id, landmark_id, visited_date, visited)
            VALUES (?, ?, ?, ?)
        `;
        const visitValues = [userId, landmarkId, new Date(), false]; // Bugünün tarihini alıyoruz


        db.query(visitQuery, visitValues, (err, data) => {
            if (err) {
                console.error("user_landmarks insert hatası:", err);
                return res.status(500).json({ error: err.message });
            }
        
            return res.json({ message: "Landmark has been added and visit recorded." });
        });
        
    });
})

app.get("/landmarks", (req,res)=>{
    const q = "SELECT * FROM landmarks"
    db.query(q, (err, data)=>{
        if(err) return res.json("err")
        return res.json(data)
    })
})


app.get("/landmarks/:id", (req,res) => {
    const {id} = req.params;
    const q = "SELECT * FROM landmarks WHERE id = ?"

    db.query(q, [id],(err,data) =>{
        if(err) return res.json(err);
        if(data.length === 0) return res.status(404).json({message: "Landmark not found"});
        return res.json(data[0]);
    })

});

app.put("/landmarks/:id", (req,res)=>{
    const landmarkId = req.params.id;

    const q = "UPDATE landmarks SET `name` = ?, `note` = ?, `category`= ?  WHERE id = ?"

    const values = [
        req.body.name,
        req.body.note,
        req.body.category
    ]

    db.query(q, [...values, landmarkId], (err,data)=>{
        if(err) return res.json(err);
        return res.json("Landmarks has been updated successfully")

    })

});

app.delete("/landmarks/:id", (req,res)=>{
    const landmarkId = req.params.id;

    const q = "DELETE FROM landmarks WHERE id = ?"

    db.query(q, [landmarkId], (err,data)=>{
        if(err) return res.json(err);
        return res.json("Landmarks has been deleted successfully")

    })

});

// VISITED LANDMARKS   

// app.post("/visited_landmarks/notes", (req,res)=>{  
//     const {landmark_id, visited_date, visitor_name, note} = req.body;

//     if (!landmark_id || !visited_date || !visitor_name) {
//         return res.status(400).json({ error: "Missing required fields" });
//     }

//     const updateNoteQuery = `
//         UPDATE landmarks SET note = ? WHERE id = ?
//     `;

    
//     db.query(updateNoteQuery, [note, landmark_id], (err,data)=>{
//         if(err) return res.json({error: err.message})
            
//             const insert_visited_query = " INSERT INTO visited_landmarks (landmark_id, visited_date, visitor_name) VALUES (?,?,?)"
            
//             db.query(insert_visited_query, [landmark_id, visited_date, visitor_name], (err2, data2)=>{
//                 if(err2) return res.json({error: err2.message})
//                 return res.json({message:"landmark has been added"})
//         })
//     })
// })

app.post("/visited_landmarks/notes", (req,res)=>{  
    const {landmark_id, user_id, note} = req.body;
    const visited_date = new Date(); // Bugünün tarihini otomatik olarak al

    if (!landmark_id || !user_id) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    // Önce kullanıcı adını al
    const getUserQuery = "SELECT name, surname FROM users WHERE id = ?";
    
    db.query(getUserQuery, [user_id], (err, userData) => {
        if (err) return res.status(500).json({ error: err.message });
        if (userData.length === 0) return res.status(404).json({ error: "User not found" });
        
        const visitor_name = `${userData[0].name} ${userData[0].surname}`;
        
        // 1. Landmark tablosunda notu güncelle
        const updateNoteQuery = `
            UPDATE landmarks SET note = ? WHERE id = ?
        `;
        
        db.query(updateNoteQuery, [note, landmark_id], (err, data) => {
            if (err) return res.json({ error: err.message });
            
            // 2. Ziyaret kaydını ekle
            const insertVisitQuery = "INSERT INTO visited_landmarks (landmark_id, visited_date, visitor_name) VALUES (?, ?, ?)";
            
            db.query(insertVisitQuery, [landmark_id, visited_date, visitor_name], (err2, data2) => {
                if (err2) return res.json({ error: err2.message });
                
                // 3. user_landmarks tablosunda visited değerini true yap
                const updateUserLandmarkQuery = `
                    UPDATE user_landmarks 
                    SET visited = TRUE 
                    WHERE user_id = ? AND landmark_id = ?
                `;
                
                db.query(updateUserLandmarkQuery, [user_id, landmark_id], (err3, data3) => {
                    if (err3) return res.json({ error: err3.message });
                    
                    return res.json({ message: "Note added and landmark marked as visited" });
                });
            });
        });
    });
})

app.get("/visited_landmarks", (req,res)=>{
    const q = "SELECT lm.lat, lm.lng, lm.note ,vlm.landmark_id, vlm.visited_date, vlm.visitor_name FROM visited_landmarks as vlm JOIN landmarks as lm ON lm.id = vlm.landmark_id"
    db.query(q, (err, data)=>{
        if(err) return res.json({error: err.message})
        return res.json(data)
    })
})


app.get("/visited_landmarks/:id", (req,res) => {
    const {id} = req.params;

    const q = "SELECT lm.lat, lm.lng, lm.note ,vlm.landmark_id, vlm.visited_date, vlm.visitor_name FROM visited_landmarks as vlm JOIN landmarks as lm ON lm.id = vlm.landmark_id WHERE lm.id = ?"


    db.query(q, [id],(err,data) =>{
        if(err) return res.json(err);
        if(data.length === 0) return res.status(404).json({message: "Landmark not found"});
        return res.json({
            landmark_name: data[0].landmark_name,
            total_visits: data.length,
            visits: data
        });
    })

});


// visiting plan

app.post("/create_plan", (req,res)=>{
    const { plan_name, landmarks } = req.body;

    if (!plan_name || !Array.isArray(landmarks) || landmarks.length === 0) {
        return res.status(400).json({ error: "Invalid data." });
    }

    const insertPlan = "INSERT INTO visiting_plans (name) VALUES (?)";
    db.query(insertPlan, [plan_name], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });

        const planId = result.insertId;

        const insertLandmarks = `
            INSERT INTO landmarks_of_plan
            (visiting_plan_id, lat, lng, name, note, category)
            VALUES ?
        `;

        const landmarkValues = landmarks.map(lm => [
            planId,
            parseFloat(lm.latitude),
            parseFloat(lm.longitude),
            lm.name,
            lm.note,
            lm.category
        ]);

        db.query(insertLandmarks, [landmarkValues], (err, data) => {
            if (err) return res.status(500).json({ error: err.message });
            return res.json({ message: "Visiting plan saved successfully." });
        });
    });

})

module.exports = app;