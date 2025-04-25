// Initialize map
var map = L.map('map').setView([20, 0], 2); // Default global view
window.onload = () => {
    // Kullanıcı giriş kontrolü
    if (checkUserLogin()) {
        fetchSavedLandmarks();
        displayUserInfo();
    }
};

// Kullanıcı giriş kontrolü
function checkUserLogin() {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || !user.id) {
        // Kullanıcı giriş yapmamışsa login sayfasına yönlendir
        alert("Lütfen giriş yapın");
        window.location.href = "/"; // Login sayfasına yönlendir
        return false;
    }
    return true;
}

// Add OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let mapClickMode = null;
let landmarks = []; // Store landmarks
let savedLandmarks = []; // Store landmarks from the database
let selectedLandmark = null; 
let currentMarker = null;
let visitedMarkers = [];
let currentPlanLandmarks = [];
let allLandmarks = []; // Tüm landmark'ları saklamak için
let visitedLandmarkIds = [];

// Add landmark on map click
map.on('click', function(e) {
    if (mapClickMode === "addLandmark") {
        if (currentMarker) {
            map.removeLayer(currentMarker);
        }

        var lat = e.latlng.lat.toFixed(6);
        var lng = e.latlng.lng.toFixed(6);
        
        // Create marker
        currentMarker = L.marker([lat, lng]).addTo(map)
            .bindPopup(`Lat: ${lat}, Lng: ${lng}`)
            .openPopup();

        // Store landmark data
        selectedLandmark = { latitude: lat, longitude: lng };
        document.getElementById("landmarkForm").style.display = "block";
        mapClickMode = null;
    } else if (mapClickMode === "addToPlan") {
        var lat = e.latlng.lat.toFixed(6);
        var lng = e.latlng.lng.toFixed(6);
        
        // Create marker with a different color for plan landmarks
        let planMarker = L.marker([lat, lng], {
            icon: L.divIcon({
                className: 'plan-marker',
                html: '<div style="background-color: #4CAF50; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            })
        }).addTo(map);
        
        // Add temporary popup to enter name
        let popupContent = `
            <div>
                <input type="text" id="planPointName" placeholder="Point Name">
                <select id="planPointCategory">
                    <option value="Historical">Historical</option>
                    <option value="Natural">Natural</option>
                    <option value="Cultural">Cultural</option>
                </select>
                <textarea id="planPointNote" placeholder="Add notes (optional)"></textarea>
                <button onclick="savePlanPoint()">Add to Plan</button>
            </div>
        `;
        
        planMarker.bindPopup(popupContent).openPopup();
        
        // Store temporary data
        window.tempPlanMarker = planMarker;
        window.tempPlanPoint = { latitude: lat, longitude: lng };
    }
});

function savePlanPoint() {
    const name = document.getElementById("planPointName").value;
    const category = document.getElementById("planPointCategory").value;
    const note = document.getElementById("planPointNote").value;
    
    if (!name) {
        alert("Please enter a name for this point");
        return;
    }
    
    // Add to current plan landmarks
    currentPlanLandmarks.push({
        latitude: window.tempPlanPoint.latitude,
        longitude: window.tempPlanPoint.longitude,
        name: name,
        category: category,
        note: note || ""
    });
    
    // Update popup content to show the saved point
    window.tempPlanMarker.closePopup();
    window.tempPlanMarker.bindPopup(`<strong>${name}</strong><br>${note || "No notes"}`);
    
    // Clear temp references
    window.tempPlanPoint = null;
    
    // Display the plan form if it's not already visible
    document.getElementById("planForm").style.display = "block";
    
    // Show a count of selected landmarks
    alert(`Added to plan. Total points: ${currentPlanLandmarks.length}`);
}

function activateAddLandmark() {
    if (!checkUserLogin()) return;
    
    resetSelection();
    mapClickMode = "addLandmark";
    alert("Click on the map to select a location for your landmark.");
}

function activateCreatePlan() {
    if (!checkUserLogin()) return;
    
    resetSelection();
    mapClickMode = "addToPlan";
    currentPlanLandmarks = []; // Reset current plan
    document.getElementById("planForm").style.display = "block";
    alert("Click on the map to add points to your visiting plan. After adding all points, enter a plan name and save.");
}

function saveVisitingPlan() {
    if (!checkUserLogin()) return;
    
    const planName = document.getElementById("planName").value;
    
    if (!planName) {
        alert("Please enter a name for your visiting plan.");
        return;
    }
    
    if (currentPlanLandmarks.length === 0) {
        alert("Please add at least one landmark to your plan by clicking on the map.");
        return;
    }
    
    // Send to server
    fetch('http://localhost:3000/create_plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            plan_name: planName,
            landmarks: currentPlanLandmarks
        })
    })
    .then(res => res.json())
    .then(data => {
        alert("Visiting plan saved successfully!");
        
        // Reset the plan
        currentPlanLandmarks = [];
        document.getElementById("planName").value = "";
        document.getElementById("planForm").style.display = "none";
        
        // Clear plan markers (optional - you might want to keep them visible)
        map.eachLayer(function(layer) {
            if (layer instanceof L.Marker && layer._icon && layer._icon.innerHTML.includes('plan-marker')) {
                map.removeLayer(layer);
            }
        });
        
        mapClickMode = null;
    })
    .catch(err => {
        console.error("Error saving plan:", err);
        alert("Failed to save visiting plan. Please try again.");
    });
}

//*************** */ notes **************
function activateAddNote() {
    if (!checkUserLogin()) return;
    
    resetSelection();
    fetchSavedLandmarks();
    
    // Visitor Name alanını kaldırıp doğrudan Note formunu göster
    // Visitor name artık kullanıcının bilgilerinden otomatik alınacak
    document.getElementById("noteForm").style.display = "block";
}

function resetSelection() {
    if (currentMarker) {
        map.removeLayer(currentMarker);
        currentMarker = null;
    }
    selectedLandmark = null;
    document.getElementById("landmarkForm").style.display = "none";
    document.getElementById("noteForm").style.display = "none";
    document.getElementById("planForm").style.display = "none";
    mapClickMode = null;
    updateLandmarkList();
}

// Update landmark list in UI
function updateLandmarkList() {
    let list = document.getElementById('landmarkList');
    list.innerHTML = "";
    
    // Show current plan landmarks if any
    if (currentPlanLandmarks.length > 0) {
        currentPlanLandmarks.forEach((point, index) => {
            let li = document.createElement('li');
            li.textContent = `Plan Point ${index + 1}: ${point.name} (${point.latitude}, ${point.longitude})`;
            list.appendChild(li);
        });
    } else {
        // Show regular landmarks
        landmarks.forEach((point, index) => {
            let li = document.createElement('li');
            li.textContent = `Landmark ${index + 1}: Lat ${point.latitude}, Lng ${point.longitude}`;
            list.appendChild(li);
        });
    }
}

// New functions for update and delete functionality
function showUpdateForm(landmark) {
    // Remove existing update form if any
    const existingForm = document.getElementById("updateForm");
    if (existingForm) {
        existingForm.remove();
    }
    
    // Create update form
    const updateForm = document.createElement("div");
    updateForm.id = "updateForm";
    updateForm.className = "landmark-update-form";
    updateForm.innerHTML = `
        <h3>Update Landmark</h3>
        <input type="text" id="updateName" value="${landmark.name}" placeholder="Landmark Name">
        <textarea id="updateNote" placeholder="Notes">${landmark.note || ''}</textarea>
        <select id="updateCategory">
            <option value="Historical" ${landmark.category === 'Historical' ? 'selected' : ''}>Historical</option>
            <option value="Natural" ${landmark.category === 'Natural' ? 'selected' : ''}>Natural</option>
            <option value="Cultural" ${landmark.category === 'Cultural' ? 'selected' : ''}>Cultural</option>
        </select>
        <div class="update-buttons">
            <button onclick="submitUpdate(${landmark.id})">Save Changes</button>
            <button onclick="document.getElementById('updateForm').remove()">Cancel</button>
        </div>
    `;
    
    // Add form to page
    document.body.appendChild(updateForm);
    
    // Center the form
    updateForm.style.position = "fixed";
    updateForm.style.top = "50%";
    updateForm.style.left = "50%";
    updateForm.style.transform = "translate(-50%, -50%)";
    updateForm.style.zIndex = "1000";
    updateForm.style.backgroundColor = "#fff";
    updateForm.style.padding = "20px";
    updateForm.style.borderRadius = "8px";
    updateForm.style.boxShadow = "0 0 10px rgba(0,0,0,0.3)";
}

function submitUpdate(id) {
    if (!checkUserLogin()) return;
    
    const name = document.getElementById("updateName").value;
    const note = document.getElementById("updateNote").value;
    const category = document.getElementById("updateCategory").value;
    
    if (!name) {
        alert("Name cannot be empty");
        return;
    }
    
    fetch(`http://localhost:3000/landmarks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: name,
            note: note,
            category: category
        })
    })
    .then(res => res.json())
    .then(data => {
        alert("Landmark updated successfully!");
        document.getElementById("updateForm").remove();
        showVisitedLandmarks(); // Refresh the landmarks list
    })
    .catch(err => {
        console.error("Error updating landmark:", err);
        alert("Failed to update landmark.");
    });
}

function deleteLandmark(id) {
    if (!checkUserLogin()) return;
    
    if (!confirm("Are you sure you want to delete this landmark?")) {
        return;
    }
    
    fetch(`http://localhost:3000/landmarks/${id}`, {
        method: 'DELETE'
    })
    .then(res => res.json())
    .then(data => {
        alert("Landmark deleted successfully!");
        showVisitedLandmarks(); // Refresh the landmarks list
    })
    .catch(err => {
        console.error("Error deleting landmark:", err);
        alert("Failed to delete landmark.");
    });
}

function clearVisitedMarkers() {
    visitedMarkers.forEach(marker => map.removeLayer(marker));
    visitedMarkers = [];
}


function addLandmark() {
    if (!checkUserLogin()) return;
    
    if (!selectedLandmark) {
        alert("Please select a location first.");
        return;
    }

    const name = document.getElementById("landmarkName").value;
    const category = document.getElementById("landmarkCategory").value;

    if (!name) {
        alert("Please enter a name for the landmark.");
        return;
    }

    const user = JSON.parse(localStorage.getItem("user"));
    
    fetch('http://localhost:3000/landmarks/adding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            lat: selectedLandmark.latitude,
            lng: selectedLandmark.longitude,
            name: name,
            category: category,
            userId: user.id
        })
    })
    .then(res => res.json())
    .then(data => {
        alert("Landmark saved!");
        resetSelection();
        fetchSavedLandmarks();
    })
    .catch(err => {
        console.error("Error:", err);
        alert("Failed to save landmark.");
    });
}

function showVisitedLandmarks() {
    if (!checkUserLogin()) return;
    
    const visitedSection = document.getElementById("visitedSection");
    const user = JSON.parse(localStorage.getItem("user"));

    // Eğer zaten görünürse, kapat ve işaretçileri kaldır
    if (visitedSection.style.display === "block") {
        visitedSection.style.display = "none";
        clearVisitedMarkers();
        return;
    }

    // Fallback to the original method if the new endpoint fails
    // First, try to get all landmarks
    fetch('http://localhost:3000/landmarks')
        .then(res => res.json())
        .then(landmarksData => {
            console.log("All Landmarks:", landmarksData);
            allLandmarks = landmarksData;
            
            // Then try to get visited landmarks using the original endpoint
            return fetch('http://localhost:3000/visited_landmarks')
                .then(res => res.json())
                .then(visitedData => {
                    console.log("Visit Landmarks:", visitedData);
                    
                    // Ziyaret edilen landmark ID'lerini sakla
                    visitedLandmarkIds = visitedData.map(item => item.landmark_id);
                    console.log("Id of visited landmarks:", visitedLandmarkIds);
                    
                    // Görünürlüğü ayarla
                    visitedSection.style.display = "block";
                    
                    // Filtreleme yap
                    filterLandmarks();
                });
        })
        .catch(err => {
            console.error("Error while retrieving landmark data:", err);
            alert("Landmark data could not be retrieved: " + err.message);
        });
}

// Yeni filtreleme fonksiyonu
function filterLandmarks() {
    const filterValue = document.getElementById("landmarkFilter").value;
    const categoryFilter = document.getElementById("categoryFilter").value;
    
    console.log("Filtreleme: ", filterValue, categoryFilter);
    
    // Kalan işaretçileri temizle
    clearVisitedMarkers();
    
    // Liste referansı al
    const list = document.getElementById("visitedList");
    list.innerHTML = "";
    
    if (!allLandmarks || allLandmarks.length === 0) {
        const li = document.createElement("li");
        li.textContent = "Landmark bulunamadı.";
        list.appendChild(li);
        return;
    }
    
    // Filtreleme yap
    let filteredLandmarks = allLandmarks;
    
    if (filterValue === "visited") {
        filteredLandmarks = allLandmarks.filter(landmark => 
            visitedLandmarkIds.includes(landmark.id)
        );
    } else if (filterValue === "not-visited") {
        filteredLandmarks = allLandmarks.filter(landmark => 
            !visitedLandmarkIds.includes(landmark.id)
        );
    }
    
    // Kategori filtresi
    if (categoryFilter !== "all") {
        filteredLandmarks = filteredLandmarks.filter(landmark => 
            landmark.category === categoryFilter
        );
    }
    
    if (filteredLandmarks.length === 0) {
        const li = document.createElement("li");
        li.textContent = "Filtreye uygun landmark bulunamadı.";
        list.appendChild(li);
        return;
    }
    
    // Create bounds to fit all filtered landmarks
    const bounds = L.latLngBounds();
    
    // Filtrelenmiş landmark'ları göster
    filteredLandmarks.forEach((item) => {
        const isVisited = visitedLandmarkIds.includes(item.id);
        
        // Add to bounds
        bounds.extend([parseFloat(item.lat), parseFloat(item.lng)]);
        
        // Liste elemanı oluştur
        const li = document.createElement('li');
        li.className = isVisited ? "landmark-visited" : "landmark-not-visited";
        
        // Ana içerik div'i
        const contentDiv = document.createElement("div");
        contentDiv.className = "landmark-info";
        contentDiv.textContent = `${item.name} (${item.lat}, ${item.lng})`;
        
        // Not bilgisi
        if (item.note) {
            const noteDiv = document.createElement("div");
            noteDiv.className = "landmark-note";
            noteDiv.textContent = `Not: ${item.note}`;
            contentDiv.appendChild(noteDiv);
        }
        
        // Buton konteyneri
        const buttonDiv = document.createElement("div");
        buttonDiv.className = "landmark-buttons";
        
        // Güncelleme butonu
        const updateBtn = document.createElement("button");
        updateBtn.textContent = "Update";
        updateBtn.className = "update-btn";
        updateBtn.onclick = function() { showUpdateForm(item); };
        
        // Silme butonu
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.className = "delete-btn";
        deleteBtn.onclick = function() { deleteLandmark(item.id); };
        
        // Ziyaret geçmişi butonu
        const historyBtn = document.createElement("button");
        historyBtn.textContent = "Visit History";
        historyBtn.className = "history-btn";
        historyBtn.onclick = function() { viewVisitHistory(item.id); };
        
        // Butonları konteynere ekle
        buttonDiv.appendChild(updateBtn);
        buttonDiv.appendChild(deleteBtn);
        buttonDiv.appendChild(historyBtn);
        
        // İçerik ve butonları liste elemanına ekle
        li.appendChild(contentDiv);
        li.appendChild(buttonDiv);
        
        list.appendChild(li);

        // Haritaya işaretçi ekle
        const markerOptions = {
            icon: L.divIcon({
                className: 'custom-marker',
                html: `<div style="background-color: ${isVisited ? '#52c41a' : '#f5222d'}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            })
        };
        
        const marker = L.marker([parseFloat(item.lat), parseFloat(item.lng)], markerOptions)
            .addTo(map)
            .bindPopup(`
                <strong>${item.name}</strong><br>
                ${item.note ? 'Not: ' + item.note + '<br>' : ''}
                <button class="popup-btn" onclick="showUpdateForm(${JSON.stringify(item).replace(/"/g, '&quot;')})">Update</button>
                <button class="popup-btn popup-delete" onclick="deleteLandmark(${item.id})">Delete</button>
                <button class="popup-btn popup-history" onclick="viewVisitHistory(${item.id})">Visit History</button>
            `);
        
        visitedMarkers.push(marker);
    });
    
    // Fit map to show all filtered landmarks if there are any
    if (filteredLandmarks.length > 0) {
        map.fitBounds(bounds, {
            padding: [50, 50],
            maxZoom: 12
        });
    }
}

function addNotes() {
    if (!checkUserLogin()) return;
    
    const landmark_id = document.getElementById("landmarkSelect").value;
    const note = document.getElementById("noteText").value;
    
    // Kullanıcı ID'sini localStorage'dan al
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || !user.id) {
        alert("Kullanıcı bilgisi bulunamadı. Lütfen tekrar giriş yapın.");
        return;
    }
    
    if (!landmark_id) {
        alert("Please select a landmark.");
        return;
    }

    fetch('http://localhost:3000/visited_landmarks/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            landmark_id: landmark_id,
            user_id: user.id,
            note: note
        })
    })
    .then(res => res.json())
    .then(data => {
        alert("Note saved and landmark marked as visited!");
        resetSelection();
        fetchSavedLandmarks();
    })
    .catch(err => {
        console.error("Error:", err);
        alert("Failed to save note.");
    });
}

// Send landmarks to backend
function sendLandmarks() {
    if (landmarks.length === 0) {
        alert("No landmarks selected!");
        return;
    }

    fetch('http://localhost:3000/books', { // This endpoint doesn't match your backend
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ landmarks: landmarks })
    })
    .then(response => response.json())
    .then(data => alert("Data sent successfully: " + JSON.stringify(data)))
    .catch(error => console.error('Error:', error));
}

function fetchSavedLandmarks() {
    console.log("Fetching saved landmarks...");
    
    fetch('http://localhost:3000/landmarks')
        .then(res => res.json())
        .then(data => {
            savedLandmarks = data;
            updateLandmarkSelect();
        })
        .catch(err => {
            console.error("Error fetching landmarks:", err);
        });
}

function updateLandmarkSelect() {
    const select = document.getElementById("landmarkSelect");
    
    if (!select) return;
    
    select.innerHTML = "";
    
    // Add default option
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "-- Select a landmark --";
    select.appendChild(defaultOption);
    
    // Add options for each landmark
    savedLandmarks.forEach(landmark => {
        const option = document.createElement("option");
        option.value = landmark.id;
        option.textContent = `${landmark.name} (${landmark.lat}, ${landmark.lng})`;
        select.appendChild(option);
    });
}
// Add this function to handle landmark search by ID
function searchLandmarkById() {
    const landmarkId = document.getElementById("landmarkIdSearch").value;
    const searchResult = document.getElementById("searchResult");
    
    if (!landmarkId || landmarkId <= 0) {
        alert("Lütfen geçerli bir landmark ID girin");
        return;
    }
    
    // Önceki sonuçları temizle
    searchResult.innerHTML = "";
    searchResult.style.display = "none";
    
    // Önceki arama işaretçilerini temizle
    if (window.searchMarker) {
        map.removeLayer(window.searchMarker);
        window.searchMarker = null;
    }
    
    // Landmark'ı ID'ye göre getir
    fetch(`http://localhost:3000/landmarks/${landmarkId}`)
        .then(res => {
            if (!res.ok) {
                throw new Error("Landmark bulunamadı");
            }
            return res.json();
        })
        .then(data => {
            console.log("Bulunan landmark:", data);
            
            // Sonucu göster
            searchResult.style.display = "block";
            searchResult.innerHTML = `
                <div class="search-result-item">
                    <div class="search-result-header">
                        <h4>${data.name}</h4>
                        <button class="close-btn" onclick="closeSearchResult()">✕</button>
                    </div>
                    <p>ID: ${data.id}</p>
                    <p>Kategori: ${data.category}</p>
                    <p>Koordinatlar: (${data.lat}, ${data.lng})</p>
                    ${data.note ? `<p>Not: ${data.note}</p>` : ''}
                    <div class="landmark-buttons">
                        <button class="update-btn" onclick="showUpdateForm(${JSON.stringify(data).replace(/"/g, '&quot;')})">Update</button>
                        <button class="delete-btn" onclick="deleteLandmark(${data.id})">Delete</button>
                        <button class="goto-btn" onclick="focusOnLandmark(${data.lat}, ${data.lng})">Go to landmark</button>
                        <button class="history-btn" onclick="viewVisitHistory(${data.id})">visited History</button>
                    </div>
                </div>
            `;
            
            // Haritaya işaretçi ekle
            const markerOptions = {
                icon: L.divIcon({
                    className: 'search-result-marker',
                    html: '<div style="background-color: #1890ff; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>',
                    iconSize: [16, 16],
                    iconAnchor: [8, 8]
                })
            };
            
            window.searchMarker = L.marker([parseFloat(data.lat), parseFloat(data.lng)], markerOptions)
                .addTo(map)
                .bindPopup(`
                    <strong>${data.name}</strong><br>
                    ${data.note ? 'Not: ' + data.note + '<br>' : ''}
                    <button class="popup-btn" onclick="showUpdateForm(${JSON.stringify(data).replace(/"/g, '&quot;')})">Update</button>
                    <button class="popup-btn popup-delete" onclick="deleteLandmark(${data.id})">Delete</button>
                    <button class="popup-btn popup-history" onclick="viewVisitHistory(${data.id})">Visit History</button>
                `);
            
            // Landmark konumuna git
            map.flyTo([parseFloat(data.lat), parseFloat(data.lng)], 12);
            window.searchMarker.openPopup();
        })
        .catch(err => {
            console.error("Landmark aranırken hata:", err);
            searchResult.style.display = "block";
            searchResult.innerHTML = `
                <div class="search-error">
                    <div class="search-result-header">
                        <p>Hata</p>
                        <button class="close-btn" onclick="closeSearchResult()">✕</button>
                    </div>
                    <p>${err.message}</p>
                </div>
            `;
        });
}

// Function to focus on a landmark
function focusOnLandmark(lat, lng) {
    map.flyTo([parseFloat(lat), parseFloat(lng)], 12);
    if (window.searchMarker) {
        window.searchMarker.openPopup();
    }
}

// Function to close search result
function closeSearchResult() {
    const searchResult = document.getElementById("searchResult");
    searchResult.style.display = "none";
    searchResult.innerHTML = "";
    
    // Clear the search input
    document.getElementById("landmarkIdSearch").value = "";
    
    // Remove the search marker from the map
    if (window.searchMarker) {
        map.removeLayer(window.searchMarker);
        window.searchMarker = null;
    }
    
    // Zoom out to show a wider view
    map.setView([20, 0], 2); // Reset to default global view
    
    // If landmarks are visible, fit the map to show all of them
    if (visitedMarkers.length > 0) {
        const bounds = L.latLngBounds();
        visitedMarkers.forEach(marker => {
            bounds.extend(marker.getLatLng());
        });
        map.fitBounds(bounds, {
            padding: [50, 50],
            maxZoom: 12
        });
    }
}

// Ziyaret geçmişini görüntüleme fonksiyonu
function viewVisitHistory(landmarkId) {
    // Ziyaret geçmişi konteynerini temizle (eğer varsa)
    closeVisitHistory();
    
    // Yeni bir konteyner oluştur
    const historyContainer = document.createElement("div");
    historyContainer.id = "visitHistoryContainer";
    historyContainer.className = "visit-history-container";
    
    // Yükleniyor göstergesi ekle
    historyContainer.innerHTML = `
        <div class="visit-history-header">
            <h3>Visit History</h3>
            <button class="close-btn" onclick="closeVisitHistory()">✕</button>
        </div>
        <div class="loading-indicator">loading..</div>
    `;
    
    document.body.appendChild(historyContainer);
    
    // Ziyaret geçmişini sunucudan al
    fetch(`http://localhost:3000/visited_landmarks/${landmarkId}`)
        .then(res => {
            if (!res.ok) {
                throw new Error("there is no visit history");
            }
            return res.json();
        })
        .then(data => {
            console.log("Visit History:", data);
            
            // Geçmiş konteynerinin içeriğini oluştur
            let content = `
                <div class="visit-history-header">
                    <h3>Visit History: ${data.landmark_name || 'Landmark' + landmarkId}</h3>
                    <button class="close-btn" onclick="closeVisitHistory()">✕</button>
                </div>
            `;
            
            if (data.visits.length === 0) {
                content += `<p class="no-visits">No visit history found for this landmark.</p>`;
            } else {
                content += `
                    <p class="visit-count">Total visit: ${data.total_visits}</p>
                    <table class="visit-table">
                        <thead>
                            <tr>
                                <th>Visitor</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                `;
                
                // Her ziyareti tabloya ekle
                data.visits.forEach(visit => {
                    // Tarihi uygun formata çevir
                    const visitDate = new Date(visit.visited_date).toLocaleDateString('tr-TR');
                    
                    content += `
                        <tr>
                            <td>${visit.visitor_name}</td>
                            <td>${visitDate}</td>
                        </tr>
                    `;
                });
                
                content += `
                        </tbody>
                    </table>
                `;
            }
            
            historyContainer.innerHTML = content;
        })
        .catch(err => {
            console.error("Error while retrieving visit history:", err);
            historyContainer.innerHTML = `
                <div class="visit-history-header">
                    <h3>Visit History</h3>
                    <button class="close-btn" onclick="closeVisitHistory()">✕</button>
                </div>
                <p class="error-message">Error while retrieving visit history: ${err.message}</p>
            `;
        });
}

// Ziyaret geçmişi görünümünü kapatma fonksiyonu
function closeVisitHistory() {
    const historyContainer = document.getElementById("visitHistoryContainer");
    if (historyContainer) {
        historyContainer.remove();
    }
}