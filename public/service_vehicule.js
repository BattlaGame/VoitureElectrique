let vehiculeSelectionne = null;

document.addEventListener("DOMContentLoaded", function() {
	const apiKey = "67ac69234802aaa070546f6a";
	const appId = "67ac69234802aaa070546f6c";
	const url = "https://api.chargetrip.io/graphql";
	
	fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-client-id": apiKey,
			"x-app-id": appId
		},
		body: JSON.stringify({ query: `
		query {
			vehicleList(size: 20) {
				id
				naming {
					make
					model
				}
				media {
					image {
						thumbnail_url
					}
				}
				battery {
					usable_kwh
				}
				range {
					chargetrip_range {
						best
					}
				}
			}
		}

	` })
	})
	.then(response => response.json())
	.then(data => {
		if (data.errors) {
			console.error("Erreur API :", data.errors);
			return;
		}
		
		const vehicles = data.data?.vehicleList;
		if (vehicles && vehicles.length > 0) {
			const list = document.getElementById("vehicle-list");
			const details = document.getElementById("vehicle-details");
			
			vehicles.forEach(vehicle => {
				const li = document.createElement("li");
				const img = document.createElement("img");
				img.src = vehicle.media?.image?.thumbnail_url;
				img.alt = `${vehicle.naming.make} ${vehicle.naming.model}`;
				
				const text = document.createElement("span");
				text.textContent = `${vehicle.naming.make} ${vehicle.naming.model} - Autonomie: ${vehicle.range.chargetrip_range.best} km, Batterie: ${vehicle.battery.usable_kwh} kWh`;
				
				li.appendChild(img);
				li.appendChild(text);
				
				li.addEventListener("click", () => {
					fetch(url, {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							"x-client-id": apiKey,
							"x-app-id": appId
						},
						body: JSON.stringify({ query: `
							query {
								vehicle(id: "${vehicle.id}") {
									id
									naming {
										make
										model
									}
									connectors {
										standard
										power
									}
									battery {
										usable_kwh
									}
									range {
										chargetrip_range {
											best
											worst
										}
									}
									media {
										image {
											thumbnail_url
										}
									}
								}
							}
						` })
					})
					.then(response => response.json())
					.then(detailData => {
						if (detailData.errors) {
							console.error("Erreur API :", detailData.errors);
							return;
						}
						
						vehiculeSelectionne = detailData.data.vehicle;
						
						// Masquer la liste des véhicules
						list.style.display = "none";
						
						// Afficher les détails du véhicule sélectionné
						details.style.display = "block";
						details.innerHTML = `
							<h2>Détails du véhicule</h2>
							<img src="${vehiculeSelectionne.media?.image?.thumbnail_url}" alt="${vehiculeSelectionne.naming.make} ${vehiculeSelectionne.naming.model}">
							<p><strong>Marque :</strong> ${vehiculeSelectionne.naming.make}</p>
							<p><strong>Modèle :</strong> ${vehiculeSelectionne.naming.model}</p>
							<p><strong>Meilleur autonomie :</strong> ${vehiculeSelectionne.range.chargetrip_range.best} km</p>
							<p><strong>Pire autonomie :</strong> ${vehiculeSelectionne.range.chargetrip_range.worst} km</p>
							<p><strong>Batterie :</strong> ${vehiculeSelectionne.battery.usable_kwh} kWh</p>
							<p><strong>Connecteurs :</strong></p>
							<ul>
								${vehiculeSelectionne.connectors.map(connector => `<li>${connector.standard} - ${connector.power} kW</li>`).join('')}
							</ul>
							<button id="back-to-list">Retour à la liste</button>
						`;

						// Ajouter un événement pour le bouton "Retour à la liste"
						document.getElementById("back-to-list").addEventListener("click", () => {
							// Masquer les détails
							details.style.display = "none";
							
							// Afficher la liste des véhicules
							list.style.display = "block";
							
							// Réinitialiser la variable de véhicule sélectionné
							vehiculeSelectionne = null;
						});
					})
					.catch(error => console.error("Erreur lors de la récupération des détails du véhicule :", error));
				});
				list.appendChild(li);
			});
		} else {
			console.log("Aucun véhicule trouvé");
		}
	})
	.catch(error => console.error("Erreur lors de la récupération des véhicules :", error));
});
