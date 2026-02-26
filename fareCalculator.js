/* This is a script created by DimensionReset (Genesis). It appends locations with set values
   to select elements with the ids "location" and "destination". It uses Vector2
   (ordered pair, coordinate) values to get the distance between the two points
   after calculation.
*/

// --- LIBRARIES --- //
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.module.js";

// --- CONSTANTS --- //
const locations = { // (Latitude (x), Longitude (y))
	"Rizal Park": new THREE.Vector2(14.582919, 120.979683),   // Luneta Park proper center :contentReference[oaicite:0]{index=0}
	"Malacañang Palace": new THREE.Vector2(14.594322, 120.994177),   // Main palace complex :contentReference[oaicite:1]{index=1}
	"Intramuros (central)": new THREE.Vector2(14.584900, 120.977000),   // Rough center of walled city :contentReference[oaicite:2]{index=2}
	"Manila Cathedral": new THREE.Vector2(14.591500, 120.973600),   // Cathedral within Intramuros :contentReference[oaicite:3]{index=3}
	"Fort Santiago": new THREE.Vector2(14.587000, 120.973500),   // Main fort entrance (approx) :contentReference[oaicite:4]{index=4}
	"Plaza de Roma": new THREE.Vector2(14.590800, 120.974700),   // Central plaza in Intramuros :contentReference[oaicite:5]{index=5}
	"Plaza Moriones": new THREE.Vector2(14.593300, 120.971800),   // Plaza at Fort Santiago entrance (approx) :contentReference[oaicite:6]{index=6}
	"Plaza de Armas": new THREE.Vector2(14.587700, 120.974000),   // Inner plaza at Fort Santiago :contentReference[oaicite:7]{index=7}
	"Plaza Mexico (Pasig)": new THREE.Vector2(14.593800, 120.975500),   // Riverside square near Pasig River :contentReference[oaicite:8]{index=8}
	"Manila (city center)": new THREE.Vector2(14.599512, 120.984222),   // Official city coordinate :contentReference[oaicite:9]{index=9}
};
// This function adds locations to valid select elements
function addLocations(selectElement) {
	if (!selectElement || selectElement.dataset.loaded === "true") return;

	for (const name of Object.keys(locations)) {
		const option = document.createElement("option");

		option.value = name;       // store key
		option.textContent = name; // visible to user

		selectElement.appendChild(option);
	}

	selectElement.dataset.loaded = "true";
}

// Get direct distance between two selected locations (Vector magnitude)
window.getHaversineDistance = function getHaversineDistance(origin, dest) {
	// Haversine Formula - Finds distance between 2 points on Earth (Latitude and Longitude)
	// Learned from Google, translated into code by me (DimensionReset :D)

	const R = 6371; // James Andrew's approximation of earth's radius in km

	if (!origin || !dest) return null;

	// Convert to radians (THE ANCIENT BABYLONIAN TECHNIQUEEEEEEEEEEEE)

	/* A circle's interior angles measure 360 degrees due to the sexagesimal system of
	   Ancient Babylon. To convert it into radians that our decimal system can use, we divide
	   pi, which is essentially half of the circle since it's circumference over diameter,
	   by 180 degrees (which is half of a circle's summation of interior angles measures). */

	const lat1 = origin.x * Math.PI / 180;
	const lon1 = origin.y * Math.PI / 180;
	const lat2 = dest.x * Math.PI / 180;
	const lon2 = dest.y * Math.PI / 180;

	const dLat = lat2 - lat1; // latitude difference
	const dLon = lon2 - lon1; // longitude difference

	const a = Math.sin(dLat/2)**2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon/2)**2; // applied Haversine
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); // get angular distance (earth is a circle. duh)

	return R * c; // radius of the earth times the angular distance between the two points is the finished conversion
}

// Gets distance between two selected locations factoring map data
window.getRoutedDistance = async function getRoutedDistance(origin, dest) {
	if (!origin || !dest) return null;

	try {
		const res = await fetch("https://api.openrouteservice.org/v2/directions/driving-car/geojson", {
			method: "POST",
			headers: {
				"Authorization": "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjAyOTY4NGQwNWVkZTQ0YmE4MjRjYWNmOWVjYTc1ODM2IiwiaCI6Im11cm11cjY0In0=", // raw key from ORS dashboard
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				coordinates: [
					[origin.y, origin.x], // lon, lat
					[dest.y, dest.x]      // lon, lat
				]
			})
		});

		if (!res.ok) {
			console.error("ORS request failed:", res.status, res.statusText);
			return "Failed to load result. Timed out.";
		}

		const data = await res.json();

		if (!data.features || !data.features[0].properties.summary) {
			return "Failed to load result. No route found.";
		}

		const distMeters = data.features[0].properties.summary.distance;
		return distMeters / 1000; // convert meters to km (m / 1000 = km ||| khDbdcm)
	} catch (err) {
		console.error("Network/API error:", err);
		return "Failed to load result. Network or API error.";
	}
}

document.addEventListener("DOMContentLoaded", () => {
	// Location and Destination --- INPUT
	var locationSelect = document.getElementById("location");
	var destinationSelect = document.getElementById("destination");

	// Appends the options to each select on the user's click
	locationSelect.addEventListener("click", () => addLocations(locationSelect));
	destinationSelect.addEventListener("click", () => addLocations(destinationSelect));

	// Calculate button handling

	for (const calculateButton of document.getElementsByClassName("calculate")) { // loop through all calc buttons
		calculateButton.addEventListener("click", async () => { // if button is clicked

			const originalText = calculateButton.innerHTML; // store original button text

			// debounce button
			calculateButton.disabled = true;
			calculateButton.innerHTML = "Loading...";

			try {
				const locationValue = locationSelect.value;
				const destinationValue = destinationSelect.value;

				if (!locationValue || !destinationValue) { // error handling
					showResult(null);
					return;
				}

				let distance = null;
				const methodMatch = originalText.match(/\(([^)]+)\)/); // extract algorithm from parentheses

				if (methodMatch && methodMatch[1]) { // parentheses and method was found
					const methodName = methodMatch[1].trim(); // get method name
					const functionName = `get${methodName}Distance`; // get function from method name
					const func = window[functionName]; // find the function in the global scope

					if (typeof func === "function") { // function exists
						console.log("Using " + methodName + " algo");
						distance = func.constructor.name === "AsyncFunction"
							? await func(locations[locationValue], locations[destinationValue]) // handle async
							: func(locations[locationValue], locations[destinationValue]); // handle normal
					} else { // fallback to map algo if function is non-existent
						console.log("Using default algo");
						distance = await getRoutedDistance(locations[locationValue], locations[destinationValue]);
					}

					showResult(distance, methodName);

				} else { // no parentheses, fallback to map algo
					console.log("Using default algo");
					distance = await getRoutedDistance(locations[locationValue], locations[destinationValue]);
					showResult(distance, "Routed");
				}

			} finally {
				// restore button
				calculateButton.disabled = false;
				calculateButton.innerHTML = originalText;
			}
		});
	}

	// Show Output

	function showResult(distance, methodName) {
		const result = document.getElementById("result");
		const resultAppearance = " py-2 mb-4 rounded-2";
		const passengers = Number(document.getElementById("passengers").value)

		if (distance != null) {

			if (typeof(distance) == "string") {
				result.className = "bg-danger" + resultAppearance;
				result.innerHTML =
				'<span class="fw-bold fs-5 fst-italic pb-2 pt-1">Error</span><br>' + distance;

				return;
			}

			const baseFare = distance * 11;
			const passengerFee = baseFare * (passengers * 0.2);
			const totalFee = baseFare + passengerFee;

			result.className = "bg-success" + resultAppearance;
			result.innerHTML =
				'<span class="fw-bold fs-5 fst-italic pt-1">Success</span><br><br>' +
				'Estimated Travel Distance: ' + distance.toFixed(2) + ' km<br>' +
				'Estimated Total Fee: ₱' + totalFee.toFixed(2) +
				'<br><span class="small text-muted fst-italic">(Algorithm: ' + methodName + ')</span>';

		} else {
			result.className = "bg-danger" + resultAppearance;
			result.innerHTML =
				'<span class="fw-bold fs-5 fst-italic pb-2 pt-1">Error</span><br>Please select both pick-up and drop-off locations.';
		}
	}
});