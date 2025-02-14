

async function rechercherItineraireAutonomie(start, end, autonomie) {
    const response = await fetch("/config");
	const config = await response.json();
	const apiKey = config.apiKey_openserviceroute;

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

        const coordonees = data.features[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);

        const premiereRouteLine = L.polyline(coordonees, {
            color: 'blue',
            weight: 4,
            opacity: 0.7,
            smoothFactor: 1
        }).addTo(layerTrajet);

        map.fitBounds(premiereRouteLine.getBounds());

        let routeCoordonnees = [start];
        let dernierPoint = start;
        let distanceParcouru = 0;
        let rayonRecherche = 5000;

        for (let i = 1; i < coordonees.length; i++) {
            let pointAvant = coordonees[i - 1];
            let pointActuel = coordonees[i];
            let segmentDistance = L.latLng(pointAvant).distanceTo(L.latLng(pointActuel)) / 1000;
            distanceParcouru += segmentDistance;
        
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
                    
                    nombreArrets++;
                    sommeTempsRecharge += borne.tempsRecharge;
        
                    try {
                        let response = await fetch(`https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${dernierPoint[1]},${dernierPoint[0]}&end=${borne.lon},${borne.lat}`);
                        let data = await response.json();
        
                        if (!data.features || data.features.length === 0) {
                            throw new Error("Aucune donnée d'itinéraire trouvée");
                        }
        
                        const route = data.features[0].properties.segments[0];
                        const intermediaireCoordonnees = data.features[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        
                        distanceTotal += route.distance / 1000;
                        tempsTrajet += route.duration / 3600;
                        
                        routeCoordonnees.push(...intermediaireCoordonnees);
                        dernierPoint = [borne.lat, borne.lon];
        
                        distanceParcouru = 0;
                        rayonRecherche = 5000;
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
        const finalResponse = await fetch(`https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${dernierPoint[1]},${dernierPoint[0]}&end=${end[1]},${end[0]}`);
        const finalData = await finalResponse.json();
        const finalRoute = finalData.features[0].properties.segments[0];
        const finalCoordonnees = finalData.features[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);

        distanceTotal += finalRoute.distance / 1000;
        tempsTrajet += finalRoute.duration / 3600;
        routeCoordonnees.push(...finalCoordonnees);

        // Tracer l'itinéraire final
        masquerChargement();
        layerTrajet.clearLayers();

        const finalRouteLine = L.polyline(routeCoordonnees, {
            color: 'blue',
            weight: 4,
            opacity: 0.7,
            smoothFactor: 1
        }).addTo(layerTrajet);

        finalRouteLine.on('click', (e) => {
            const popupContent = `
                <div>
                    <h4>Itinéraire avec Bornes</h4>
                    <p><strong>Distance Trajet :</strong> ${distanceTotal.toFixed(2)} km</p>
                    <p><strong>Temps trajet :</strong> ${tempsTrajet.toFixed(2)} h</p>
                    <p><strong>Temps de recharge total :</strong> ${sommeTempsRecharge.toFixed(2)} h</p>
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