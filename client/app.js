// ===================================================================
//  Bangalore Home Price Predictor — Client-side Modern JS
// ===================================================================

const API_BASE = ""; // Relative URL allows serving from Flask backend directly

// Global State
let allLocations = [];
let selectedBHK = 3;
let selectedBath = 2;
let chartInstance = null;
let isServerOnline = false;

// Locality Tier classification dictionary for rich market metrics
const LOCATION_TIERS = {
    premium: ["indiranagar", "koramangala", "sadashiva nagar", "malleshwaram", "jayanagar", "ub city", "lavelle road", "cunningham road"],
    tech: ["whitefield", "electronic city", "outer ring road", "marathahalli", "bellandur", "sarjapur road", "hsr layout"],
    emerging: ["yelahanka", "hebbal", "kanakapura road", "bannerghatta road", "thanisandra", "devanahalli", "kengeri"]
};

// Standard fallback locations list for standalone offline usage
const FALLBACK_LOCATIONS = [
    "electronic city phase 1", "chikka tirupathi", "uttarahalli", "lingadheeranahalli",
    "kothanur", "rajaji nagar", "marathahalli", "7th phase jp nagar", "gottigere",
    "sarjapur road", "mysore road", "bisuvanahalli", "raja rajeshwari nagar",
    "kengeri", "binny pet", "thanisandra", "bellandur", "electronic city",
    "ramagondanahalli", "yelahanka", "hebbal", "kasavanhalli", "vittasandra",
    "indiranagar", "koramangala", "hsr layout", "whitefield", "sadashiva nagar"
];

// ---------- DOM Elements ----------
const locationSearchInput = document.getElementById("location-search-input");
const clearLocationBtn   = document.getElementById("clear-location-btn");
const nativeSelect        = document.getElementById("uiLocations");
const suggestionsBox      = document.getElementById("location-suggestions-box");
const suggestionsList     = document.getElementById("suggestions-list");
const suggestionCountText = document.getElementById("suggestion-count-text");

const sqftInput           = document.getElementById("uiSqft");
const sqftSlider          = document.getElementById("uiSqftSlider");
const sqftDisplayVal      = document.getElementById("sqft-display-val");

const bhkGroup            = document.getElementById("uiBHK");
const bathGroup           = document.getElementById("uiBathrooms");
const predictionForm      = document.getElementById("prediction-form");
const estimateBtn         = document.getElementById("btn-estimate");

const resultPlaceholder   = document.getElementById("result-placeholder");
const resultContent       = document.getElementById("result-content");
const estimatedPriceEl    = document.getElementById("uiEstimatedPrice");
const priceRangeEl        = document.getElementById("uiPriceRange");
const summaryTagsEl       = document.getElementById("result-summary-tags");
const ratePerSqftEl       = document.getElementById("uiRatePerSqft");
const monthlyEMIEl        = document.getElementById("uiMonthlyEMI");
const locationTierEl      = document.getElementById("uiLocationTier");

const statusDot           = document.getElementById("status-dot");
const statusText          = document.getElementById("status-text");
const themeToggleBtn      = document.getElementById("theme-toggle-btn");

// ===================================================================
//  1. Theme Management (Dark / Light Mode)
// ===================================================================
function initTheme() {
    const savedTheme = localStorage.getItem("bhp_theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);

    themeToggleBtn.addEventListener("click", () => {
        const currentTheme = document.documentElement.getAttribute("data-theme");
        const newTheme = currentTheme === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", newTheme);
        localStorage.setItem("bhp_theme", newTheme);
        showToast(`Switched to ${newTheme} theme`);
        
        // Refresh chart colors if active
        if (chartInstance) {
            updateChartColors();
        }
    });
}

// ===================================================================
//  2. Load Locations & Health Check
// ===================================================================
async function loadLocations() {
    try {
        const response = await fetch(`${API_BASE}/get_location_names`);
        if (!response.ok) throw new Error("API Offline");
        const data = await response.json();

        allLocations = data.locations.sort();
        isServerOnline = true;
        
        statusDot.className = "status-dot online";
        statusText.textContent = "Flask ML API Connected";
        
        populateNativeSelect(allLocations);
        console.log(`✅ Loaded ${allLocations.length} locations from Flask Server`);
    } catch (err) {
        console.warn("⚠️ Flask server offline or local file mode. Using client fallback locations.");
        allLocations = FALLBACK_LOCATIONS.sort();
        isServerOnline = false;
        
        statusDot.className = "status-dot offline";
        statusText.textContent = "Client Fallback Mode (Start server.py for ML API)";
        
        populateNativeSelect(allLocations);
    }
}

function populateNativeSelect(locations) {
    nativeSelect.innerHTML = '<option value="" disabled selected>Select location</option>';
    locations.forEach(loc => {
        const option = document.createElement("option");
        option.value = loc;
        option.textContent = formatLocationName(loc);
        nativeSelect.appendChild(option);
    });
}

function formatLocationName(locStr) {
    if (!locStr) return "";
    return locStr
        .split(" ")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
}

// ===================================================================
//  3. Searchable Autocomplete Location Picker
// ===================================================================
function setupAutocomplete() {
    locationSearchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase().trim();
        
        if (query.length > 0) {
            clearLocationBtn.classList.remove("hidden");
        } else {
            clearLocationBtn.classList.add("hidden");
        }

        renderSuggestions(query);
    });

    locationSearchInput.addEventListener("focus", () => {
        renderSuggestions(locationSearchInput.value.toLowerCase().trim());
    });

    clearLocationBtn.addEventListener("click", () => {
        locationSearchInput.value = "";
        nativeSelect.value = "";
        clearLocationBtn.classList.add("hidden");
        suggestionsBox.classList.add("hidden");
        locationSearchInput.focus();
    });

    // Hide dropdown when clicking outside
    document.addEventListener("click", (e) => {
        if (!e.target.closest("#autocomplete-wrapper")) {
            suggestionsBox.classList.add("hidden");
        }
    });

    // Quick popular pill buttons
    document.querySelectorAll(".loc-pill").forEach(pill => {
        pill.addEventListener("click", () => {
            const locVal = pill.getAttribute("data-loc");
            selectLocationValue(locVal);
        });
    });
}

function renderSuggestions(query) {
    const filtered = allLocations.filter(loc => loc.toLowerCase().includes(query));
    suggestionsList.innerHTML = "";

    if (filtered.length === 0) {
        suggestionCountText.textContent = "No locations found";
        const emptyLi = document.createElement("li");
        emptyLi.className = "suggestion-item";
        emptyLi.textContent = "No matching neighborhood found";
        suggestionsList.appendChild(emptyLi);
    } else {
        suggestionCountText.textContent = `${filtered.length} locations match`;
        filtered.slice(0, 30).forEach(loc => {
            const li = document.createElement("li");
            li.className = "suggestion-item";
            li.textContent = formatLocationName(loc);
            li.addEventListener("click", () => {
                selectLocationValue(loc);
            });
            suggestionsList.appendChild(li);
        });
    }

    suggestionsBox.classList.remove("hidden");
}

function selectLocationValue(locName) {
    const formatted = formatLocationName(locName);
    locationSearchInput.value = formatted;
    nativeSelect.value = locName.toLowerCase();
    clearLocationBtn.classList.remove("hidden");
    suggestionsBox.classList.add("hidden");
}

// ===================================================================
//  4. Area (Sqft) Dual Controls & Presets
// ===================================================================
function setupSqftControls() {
    // Sync Number Input -> Slider
    sqftInput.addEventListener("input", (e) => {
        const val = parseInt(e.target.value, 10) || 300;
        sqftSlider.value = Math.min(val, 5000);
        sqftDisplayVal.textContent = val.toLocaleString();
    });

    // Sync Slider -> Number Input
    sqftSlider.addEventListener("input", (e) => {
        const val = e.target.value;
        sqftInput.value = val;
        sqftDisplayVal.textContent = Number(val).toLocaleString();
    });

    // Quick Sqft Preset Buttons
    document.querySelectorAll(".sqft-preset-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".sqft-preset-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            
            const val = btn.getAttribute("data-val");
            sqftInput.value = val;
            sqftSlider.value = val;
            sqftDisplayVal.textContent = Number(val).toLocaleString();
        });
    });
}

// ===================================================================
//  5. BHK & Bathroom Toggle Selectors
// ===================================================================
function setupToggleButtons(groupEl, callback) {
    const buttons = groupEl.querySelectorAll(".btn-option");
    buttons.forEach(btn => {
        btn.addEventListener("click", () => {
            buttons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            const val = parseInt(btn.getAttribute("data-value"), 10);
            callback(val);
        });
    });
}

// Preset Quick Chips
function setupPresetChips() {
    document.querySelectorAll(".preset-chip").forEach(chip => {
        chip.addEventListener("click", () => {
            const loc = chip.getAttribute("data-location");
            const sqft = chip.getAttribute("data-sqft");
            const bhk = parseInt(chip.getAttribute("data-bhk"), 10);
            const bath = parseInt(chip.getAttribute("data-bath"), 10);

            selectLocationValue(loc);

            sqftInput.value = sqft;
            sqftSlider.value = Math.min(sqft, 5000);
            sqftDisplayVal.textContent = Number(sqft).toLocaleString();

            selectedBHK = bhk;
            updateOptionGroupActive(bhkGroup, bhk);

            selectedBath = bath;
            updateOptionGroupActive(bathGroup, bath);

            showToast(`Loaded ${chip.textContent.trim()}`);
            predictPrice();
        });
    });
}

function updateOptionGroupActive(groupEl, value) {
    const buttons = groupEl.querySelectorAll(".btn-option");
    buttons.forEach(btn => {
        if (parseInt(btn.getAttribute("data-value"), 10) === value) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });
}

// ===================================================================
//  6. Predict Price & Calculate Metrics
// ===================================================================
async function predictPrice() {
    const sqft = parseFloat(sqftInput.value);
    const location = nativeSelect.value || locationSearchInput.value.toLowerCase().trim();
    const bhk = selectedBHK;
    const bath = selectedBath;

    // Form Validation
    if (!location) {
        showToast("⚠️ Please select a valid Bangalore location");
        shakeElement(locationSearchInput.parentElement);
        return;
    }
    if (!sqft || sqft <= 0) {
        showToast("⚠️ Please enter valid square feet area");
        shakeElement(sqftInput);
        return;
    }

    // Show Loading state
    estimateBtn.classList.add("loading");

    try {
        let estimatedPriceLakhs = 0;

        if (isServerOnline) {
            const formData = new FormData();
            formData.append("total_sqft", sqft);
            formData.append("location", location);
            formData.append("bhk", bhk);
            formData.append("bath", bath);

            const response = await fetch(`${API_BASE}/predict_home_price`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("API request failed");
            const data = await response.json();
            estimatedPriceLakhs = data.estimated_price;
        } else {
            // Client-side empirical fallback estimation formula for standalone viewing
            estimatedPriceLakhs = computeFallbackPrice(location, sqft, bhk, bath);
        }

        renderDashboardResults(estimatedPriceLakhs, location, sqft, bhk, bath);
    } catch (err) {
        console.error("Prediction error:", err);
        showToast("Error computing prediction. Using client fallback.");
        const fallbackPrice = computeFallbackPrice(location, sqft, bhk, bath);
        renderDashboardResults(fallbackPrice, location, sqft, bhk, bath);
    } finally {
        estimateBtn.classList.remove("loading");
    }
}

// Empirical client fallback formula when Flask server is not running
function computeFallbackPrice(loc, sqft, bhk, bath) {
    let baseRatePerSqft = 5500; // Average Bangalore base rate
    const locLower = loc.toLowerCase();

    if (LOCATION_TIERS.premium.some(t => locLower.includes(t))) {
        baseRatePerSqft = 11500;
    } else if (LOCATION_TIERS.tech.some(t => locLower.includes(t))) {
        baseRatePerSqft = 7200;
    } else if (LOCATION_TIERS.emerging.some(t => locLower.includes(t))) {
        baseRatePerSqft = 4800;
    }

    // Adjust for rooms & bathrooms
    let price = (sqft * baseRatePerSqft) / 100000; // in Lakhs
    price += (bhk * 2.5); // Add BHK bonus
    price += (bath * 1.5); // Add Bath bonus

    return Math.max(15, Math.round(price * 100) / 100);
}

// ===================================================================
//  7. Render Valuation Dashboard Results
// ===================================================================
function renderDashboardResults(priceLakhs, location, sqft, bhk, bath) {
    resultPlaceholder.classList.add("hidden");
    resultContent.classList.remove("hidden");

    // Primary Price display
    if (priceLakhs >= 100) {
        estimatedPriceEl.textContent = `₹${(priceLakhs / 100).toFixed(2)} Cr`;
    } else {
        estimatedPriceEl.textContent = `₹${priceLakhs.toFixed(2)} Lakh`;
    }

    // Price range (+/- 5%)
    const lowRange = priceLakhs * 0.95;
    const highRange = priceLakhs * 1.05;
    priceRangeEl.textContent = `Estimated Range: ₹${lowRange.toFixed(1)}L - ₹${highRange.toFixed(1)}L`;

    // Property specs summary tags
    const displayLoc = formatLocationName(location);
    summaryTagsEl.innerHTML = `
        <span class="tag-spec">📍 ${displayLoc}</span>
        <span class="tag-spec">🏠 ${bhk} BHK</span>
        <span class="tag-spec">🛁 ${bath} Bathrooms</span>
        <span class="tag-spec">📐 ${Number(sqft).toLocaleString()} sq.ft</span>
    `;

    // Rate per sqft (in ₹)
    const ratePerSqft = Math.round((priceLakhs * 100000) / sqft);
    ratePerSqftEl.textContent = `₹${ratePerSqft.toLocaleString()} / sq.ft`;

    // Monthly EMI calculation (assuming 8.5% p.a. for 20 years on 80% loan value)
    const loanAmount = (priceLakhs * 100000) * 0.8;
    const monthlyInterestRate = 8.5 / 12 / 100;
    const months = 240; // 20 yrs
    const emi = Math.round((loanAmount * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, months)) / (Math.pow(1 + monthlyInterestRate, months) - 1));
    
    if (emi >= 100000) {
        monthlyEMIEl.textContent = `₹${(emi / 100000).toFixed(2)} Lakh / mo`;
    } else {
        monthlyEMIEl.textContent = `₹${emi.toLocaleString()} / mo`;
    }

    // Locality Tier classification
    const locLower = location.toLowerCase();
    if (LOCATION_TIERS.premium.some(t => locLower.includes(t))) {
        locationTierEl.textContent = "Luxury / Prime Tier";
    } else if (LOCATION_TIERS.tech.some(t => locLower.includes(t))) {
        locationTierEl.textContent = "Major Tech Corridor";
    } else {
        locationTierEl.textContent = "High-Growth Neighborhood";
    }

    // Render interactive chart
    renderComparisonChart(ratePerSqft, displayLoc);

    // Scroll smoothly to result dashboard on mobile
    resultContent.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// ===================================================================
//  8. Chart.js Neighborhood Comparison
// ===================================================================
function renderComparisonChart(userRate, userLocName) {
    const ctx = document.getElementById("priceComparisonChart").getContext("2d");
    if (!ctx) return;

    if (chartInstance) {
        chartInstance.destroy();
    }

    const labels = [userLocName.slice(0, 12), "Bangalore Avg", "Electronic City", "Whitefield", "Indiranagar"];
    const rates = [userRate, 6200, 5200, 6800, 14200];
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const textColor = isDark ? "#94a3b8" : "#475569";

    chartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "₹ / sq.ft",
                data: rates,
                backgroundColor: [
                    "#6366f1",
                    "rgba(148, 163, 184, 0.4)",
                    "rgba(6, 182, 212, 0.4)",
                    "rgba(168, 85, 247, 0.4)",
                    "rgba(236, 72, 153, 0.4)"
                ],
                borderRadius: 6,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` Rate: ₹${context.raw.toLocaleString()} / sq.ft`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: textColor, font: { size: 10 } }
                },
                y: {
                    grid: { color: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" },
                    ticks: { color: textColor, font: { size: 10 } }
                }
            }
        }
    });
}

function updateChartColors() {
    if (chartInstance) {
        const isDark = document.documentElement.getAttribute("data-theme") === "dark";
        const textColor = isDark ? "#94a3b8" : "#475569";
        chartInstance.options.scales.x.ticks.color = textColor;
        chartInstance.options.scales.y.ticks.color = textColor;
        chartInstance.options.scales.y.grid.color = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
        chartInstance.update();
    }
}

// ===================================================================
//  9. Action Handlers (Copy, Share, Print, Hotspot Click)
// ===================================================================
function setupActionHandlers() {
    // Copy result summary
    document.getElementById("copy-result-btn").addEventListener("click", () => {
        const price = estimatedPriceEl.textContent;
        const loc = locationSearchInput.value;
        const sqft = sqftInput.value;
        const textToCopy = `🏡 Bangalore Home Price Estimate:\nPrice: ${price}\nLocation: ${loc}\nSpecs: ${selectedBHK} BHK, ${selectedBath} Bath, ${sqft} sq.ft\nCalculated via Bangalore Home Price AI`;
        
        navigator.clipboard.writeText(textToCopy);
        showToast("📋 Valuation summary copied to clipboard!");
    });

    // Share on WhatsApp
    document.getElementById("share-whatsapp-btn").addEventListener("click", () => {
        const price = estimatedPriceEl.textContent;
        const loc = locationSearchInput.value;
        const shareMsg = encodeURIComponent(`Check out this property price estimate in ${loc}: ${price} (${selectedBHK} BHK, ${sqftInput.value} sq.ft)!`);
        window.open(`https://api.whatsapp.com/send?text=${shareMsg}`, "_blank");
    });

    // Print summary
    document.getElementById("print-summary-btn").addEventListener("click", () => {
        window.print();
    });

    // Hotspot card action buttons
    document.querySelectorAll(".hotspot-card").forEach(card => {
        card.addEventListener("click", () => {
            const targetLoc = card.getAttribute("data-location");
            selectLocationValue(targetLoc);
            document.getElementById("predictor").scrollIntoView({ behavior: "smooth" });
            showToast(`Selected ${formatLocationName(targetLoc)}`);
        });
    });
}

// ===================================================================
//  10. Utilities & Animations
// ===================================================================
function showToast(message) {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(20px)";
        toast.style.transition = "all 0.3s ease";
        setTimeout(() => toast.remove(), 300);
    }, 2800);
}

function shakeElement(el) {
    if (!el) return;
    el.style.animation = "shake 0.4s ease";
    el.addEventListener("animationend", () => {
        el.style.animation = "";
    }, { once: true });
}

// Dynamically add shake keyframe style
const shakeStyle = document.createElement("style");
shakeStyle.textContent = `
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-6px); }
    40% { transform: translateX(6px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
}`;
document.head.appendChild(shakeStyle);

// ===================================================================
//  11. Initialise Application
// ===================================================================
document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    loadLocations();
    setupAutocomplete();
    setupSqftControls();
    setupPresetChips();

    setupToggleButtons(bhkGroup, value => { selectedBHK = value; });
    setupToggleButtons(bathGroup, value => { selectedBath = value; });

    predictionForm.addEventListener("submit", e => {
        e.preventDefault();
        predictPrice();
    });

    setupActionHandlers();

    console.log("🚀 Bangalore Home Price Predictor UI Initialized");
});

