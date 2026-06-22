// ===================================================================
//  Bangalore Home Price Prediction — Client-side JavaScript
// ===================================================================

// ---------- Configuration ----------
const API_BASE = "";

// ---------- DOM References ----------
const locationSelect    = document.getElementById("uiLocations");
const sqftInput         = document.getElementById("uiSqft");
const bhkGroup          = document.getElementById("uiBHK");
const bathGroup         = document.getElementById("uiBathrooms");
const predictionForm    = document.getElementById("prediction-form");
const estimateBtn       = document.getElementById("btn-estimate");
const resultCard        = document.getElementById("result-card");
const estimatedPriceEl  = document.getElementById("uiEstimatedPrice");
const resultDetailsEl   = document.getElementById("result-details");

// ---------- State ----------
let selectedBHK  = 3;
let selectedBath = 2;

// ===================================================================
//  1. Load Location Names from Server
// ===================================================================
async function loadLocations() {
    try {
        const response = await fetch(`${API_BASE}/get_location_names`);
        if (!response.ok) throw new Error("Failed to fetch locations");
        const data = await response.json();

        // Clear existing options except the placeholder
        locationSelect.innerHTML = '<option value="" disabled selected>Choose a location...</option>';

        // Sort locations alphabetically and populate the dropdown
        const locations = data.locations.sort();
        locations.forEach(loc => {
            const option = document.createElement("option");
            option.value = loc;
            // Capitalize the first letter of each word for display
            option.textContent = loc
                .split(" ")
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ");
            locationSelect.appendChild(option);
        });

        console.log(`✅ Loaded ${locations.length} locations`);
    } catch (err) {
        console.error("❌ Could not load locations:", err);
        // Fallback: populate with a message
        locationSelect.innerHTML = '<option value="" disabled selected>⚠️ Server offline — start Flask server</option>';
    }
}

// ===================================================================
//  2. Predict Home Price
// ===================================================================
async function predictPrice() {
    const sqft     = sqftInput.value;
    const location = locationSelect.value;
    const bhk      = selectedBHK;
    const bath     = selectedBath;

    // Basic validation
    if (!sqft || sqft <= 0) {
        shakeElement(sqftInput);
        return;
    }
    if (!location) {
        shakeElement(locationSelect.parentElement);
        return;
    }

    // Show loading state
    estimateBtn.classList.add("loading");

    try {
        const formData = new FormData();
        formData.append("total_sqft", sqft);
        formData.append("location", location);
        formData.append("bhk", bhk);
        formData.append("bath", bath);

        const response = await fetch(`${API_BASE}/predict_home_price`, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) throw new Error("Prediction request failed");

        const data = await response.json();
        const price = data.estimated_price;

        // Format and display
        displayResult(price, location, sqft, bhk, bath);
    } catch (err) {
        console.error("❌ Prediction error:", err);
        estimatedPriceEl.textContent = "Server Offline";
        resultDetailsEl.textContent = "Please ensure the Flask server is running on port 5000.";
        resultCard.classList.remove("hidden");
    } finally {
        estimateBtn.classList.remove("loading");
    }
}

// ===================================================================
//  3. Display the Result
// ===================================================================
function displayResult(price, location, sqft, bhk, bath) {
    let formattedPrice;
    if (price >= 100) {
        // Price is in Lakhs — convert to Crore if >= 100 Lakhs
        formattedPrice = `₹${(price / 100).toFixed(2)} Cr`;
    } else {
        formattedPrice = `₹${price.toFixed(2)} Lakh`;
    }

    estimatedPriceEl.textContent = formattedPrice;

    // Capitalize the location name for display
    const displayLoc = location
        .split(" ")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

    resultDetailsEl.textContent = `${bhk} BHK · ${bath} Bath · ${Number(sqft).toLocaleString()} sq.ft · ${displayLoc}`;

    // Show card with animation
    resultCard.classList.remove("hidden");

    // Re-trigger animation
    resultCard.style.animation = "none";
    resultCard.offsetHeight; // force reflow
    resultCard.style.animation = "";

    // Scroll result into view
    resultCard.scrollIntoView({ behavior: "smooth", block: "center" });
}

// ===================================================================
//  4. BHK & Bath Toggle Buttons
// ===================================================================
function setupToggleButtons(groupEl, callback) {
    const buttons = groupEl.querySelectorAll(".btn-option");
    buttons.forEach(btn => {
        btn.addEventListener("click", () => {
            // Remove active from all
            buttons.forEach(b => b.classList.remove("active"));
            // Set active on clicked
            btn.classList.add("active");
            // Invoke callback with the value
            callback(parseInt(btn.value, 10));
        });
    });
}

// ===================================================================
//  5. Utility — Shake Animation for Validation
// ===================================================================
function shakeElement(el) {
    el.style.animation = "shake 0.4s ease";
    el.addEventListener("animationend", () => {
        el.style.animation = "";
    }, { once: true });
}

// Add shake keyframes dynamically
const shakeStyle = document.createElement("style");
shakeStyle.textContent = `
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    20%      { transform: translateX(-6px); }
    40%      { transform: translateX(6px); }
    60%      { transform: translateX(-4px); }
    80%      { transform: translateX(4px); }
}`;
document.head.appendChild(shakeStyle);

// ===================================================================
//  6. Smooth Nav Active Link on Scroll
// ===================================================================
function setupScrollSpy() {
    const sections = document.querySelectorAll("section[id]");
    const navLinks = document.querySelectorAll(".nav-link");

    const observer = new IntersectionObserver(
        entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    navLinks.forEach(link => link.classList.remove("active"));
                    const activeLink = document.querySelector(`.nav-link[href="#${entry.target.id}"]`);
                    if (activeLink) activeLink.classList.add("active");
                }
            });
        },
        { rootMargin: "-40% 0px -50% 0px" }
    );

    sections.forEach(section => observer.observe(section));
}

// ===================================================================
//  7. Initialise Everything
// ===================================================================
document.addEventListener("DOMContentLoaded", () => {
    // Load location data from Flask server
    loadLocations();

    // Setup BHK toggle
    setupToggleButtons(bhkGroup, value => {
        selectedBHK = value;
    });

    // Setup Bath toggle
    setupToggleButtons(bathGroup, value => {
        selectedBath = value;
    });

    // Form submission
    predictionForm.addEventListener("submit", e => {
        e.preventDefault();
        predictPrice();
    });

    // Scroll spy for nav
    setupScrollSpy();

    console.log("🏡 Bangalore Home Price Predictor — Ready");
});
