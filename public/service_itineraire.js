const apiKey = '5b3ce3597851110001cf624886af02b406684c71ad9acdc5e62acdd2';

async function rechercherItineraireAutonomie(start, end, autonomie) {
    const apiUrl = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${start[1]},${start[0]}&end=${end[1]},${end[0]}`;

    layerBalise.clearLayers();
    layerTrajet.clearLayers();

    distanceTotal = 0;
    tempsTrajet = 0;
    sommeTempsRecharge = 0;
    nombreArrets = 0;

    L.marker(start, { icon: startMarker }).addTo(layerBalise).bindPopup('Départ');
    L.marker(end, { icon: endMarker }).addTo(layerBalise).bindPopup('Arrivée');

    afficherChargement();

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        const coordinates = data.features[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
        let newRouteCoordinates = [start]; // On commence par le départ
        let lastPoint = start;
        let distanceParcouru = 0;
        let chargingStations = [];

        for (let i = 1; i < coordinates.length; i++) {
            let pointAvant = coordinates[i - 1];
            let pointActuel = coordinates[i];
            let segmentDistance = L.latLng(pointAvant).distanceTo(L.latLng(pointActuel)) / 1000;
            distanceParcouru += segmentDistance;
        
            let rayonRecherche = 5000;
        
            if (distanceParcouru >= autonomie) {
                let pointStop = pointActuel;
                let borne = null;
        
                while (!borne) {
                    borne = await obtenirStationRechargeProche(pointStop, '', vehiculeSelectionne.battery.usable_kwh, rayonRecherche);
                    if (!borne) {
                        console.log(`Aucune borne trouvée à ${pointStop}. Augmentation du rayon à ${rayonRecherche + 10000} m`);
                        rayonRecherche += 5000;
                    }
                }
        
                if (borne) {
                    
                    
                    L.marker([borne.lat, borne.lon], { icon: yellowMarker }).addTo(layerBalise)
                        .bindPopup(`
                            <strong>${borne.nom}</strong>
                            <br>${borne.adresse}
                            <br>Type: ${borne.type} - ${borne.puissance} KW
                            <br>Temps de recharge estimé : ${borne.tempsRecharge} h`)
                        .openPopup();
                    
        
                    chargingStations.push([borne.lat, borne.lon]);
                    nombreArrets++;
                    sommeTempsRecharge += borne.tempsRecharge;
        
                    try {
                        let response = await fetch(`https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${lastPoint[1]},${lastPoint[0]}&end=${borne.lon},${borne.lat}`);
                        let data = await response.json();
        
                        if (!data.features || data.features.length === 0) {
                            throw new Error("Aucune donnée d'itinéraire trouvée");
                        }
        
                        const route = data.features[0].properties.segments[0];
                        const intermediateCoordinates = data.features[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        
                        distanceTotal += route.distance / 1000;
                        tempsTrajet += route.duration / 3600;
                        
                        newRouteCoordinates.push(...intermediateCoordinates);
                        lastPoint = [borne.lat, borne.lon];
        
                        distanceParcouru = 0;
                    } catch (error) {
                        console.error("Erreur lors de la récupération de l'itinéraire intermédiaire :", error);
                    }
                } else {
                    console.error("Aucune borne trouvée après plusieurs tentatives !");
                    break;
                }
            }
        }        

        // Ajout du dernier segment vers la destination
        const finalResponse = await fetch(`https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${lastPoint[1]},${lastPoint[0]}&end=${end[1]},${end[0]}`);
        const finalData = await finalResponse.json();
        const finalRoute = finalData.features[0].properties.segments[0];
        const finalCoordinates = finalData.features[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);

        distanceTotal += finalRoute.distance / 1000;
        tempsTrajet += finalRoute.duration / 3600;

        newRouteCoordinates.push(...finalCoordinates);

        // Tracer l'itinéraire final
        masquerChargement();
        layerTrajet.clearLayers();

        const finalRouteLine = L.polyline(newRouteCoordinates, {
            color: 'blue',
            weight: 4,
            opacity: 0.7,
            smoothFactor: 1
        }).addTo(layerTrajet);

        finalRouteLine.on('click', (e) => {
            const popupContent = `
                <div>
                    <h4>Itinéraire avec Bornes</h4>
                    <p><strong>Distance Totale :</strong> ${distanceTotal.toFixed(2)} km</p>
                    <p><strong>Temps total :</strong> ${tempsTrajet.toFixed(2)} h</p>
                    <p><strong>Temps de Recharge Total :</strong> ${sommeTempsRecharge} h</p>
                    <p><strong>Nombre d'arrêts :</strong> ${nombreArrets}</p>
                </div>
            `;
            L.popup()
                .setLatLng(e.latlng)
                .setContent(popupContent)
                .openOn(map);
        });

        map.fitBounds(finalRouteLine.getBounds());

        setDistance(distanceTotal);
        setDuree(tempsTrajet);
        setTempsRecharge(sommeTempsRecharge);
        setDureeTrajetRechargeTotal(tempsTrajet + sommeTempsRecharge);

        calculerTempsTrajet(sommeTempsRecharge);

    } catch (error) {
        console.error('Erreur lors de la récupération des données de l\'API:', error);
    }
}

async function rechercherItineraire(start, end) {
	// Point de départ et d'arrivée (latitude, longitude)
	const apiUrl = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${start[1]},${start[0]}&end=${end[1]},${end[0]}`;

	// Effacer les anciens éléments avant d'ajouter les nouveaux
	layerGroup.clearLayers();

	// Ajouter les marqueurs pour le départ et l'arrivée
	L.marker(start).addTo(layerGroup).bindPopup('Départ');
	L.marker(end).addTo(layerGroup).bindPopup('Arrivée');

	// Récupérer les coordonnées, la durée et la distance depuis l'API
	fetch(apiUrl)
		.then(response => response.json())
		.then(data => {
			// Extraire la distance et la durée
			const distanceMeters = data.features[0].properties.segments[0].distance;
			const durationSeconds = data.features[0].properties.segments[0].duration;

			// Convertir distance (m -> km) et durée (s -> h:min)
			const distanceKm = (distanceMeters / 1000).toFixed(2);
			const durationMinutes = Math.floor(durationSeconds / 60);
			const durationHours = Math.floor(durationMinutes / 60);
			const remainingMinutes = durationMinutes % 60;

			// Afficher les informations au-dessus de la carte
			setDistance(distanceKm);
            setDuree(durationHours, remainingMinutes)

			// Extraire les coordonnées de la route
			const coordinates = data.features[0].geometry.coordinates;

			// Convertir les coordonnées en format [latitude, longitude] pour Leaflet
			const routeCoordinates = coordinates.map(coord => [coord[1], coord[0]]);

			// Ajouter la ligne représentant la route sur la carte
			const routeLine = L.polyline(routeCoordinates, {
				color: 'blue',
				weight: 4,
				opacity: 0.7,
				smoothFactor: 1
			}).addTo(layerGroup);  // Ajouter à layerGroup

			// Ajouter un popup dynamique au clic sur la ligne de la route, basé sur la position de la souris
			routeLine.on('click', (e) => {
				const popupContent = `
					<div>
						<h4>Itinéraire</h4>
						<p><strong>Distance :</strong> ${distanceKm} km</p>
						<p><strong>Durée :</strong> ${durationHours}h ${remainingMinutes}min</p>
					</div>
				`;
				L.popup()
					.setLatLng(e.latlng) // Utilise les coordonnées du clic de la souris
					.setContent(popupContent)
					.openOn(map);
			});

			// Ajuster la vue de la carte pour inclure la route
			map.fitBounds(routeLine.getBounds());
		})
		.catch(error => {
			console.error('Erreur lors de la récupération des données de l\'API:', error);
		});
}
