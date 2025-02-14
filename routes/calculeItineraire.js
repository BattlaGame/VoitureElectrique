const express = require('express');
const router = express.Router();
const turf = require('@turf/turf');

const apiKey = '5b3ce3597851110001cf624886af02b406684c71ad9acdc5e62acdd2';

router.get('/calculeItineraire', async (req, res) => {
    const { villeStart, villeEnd, autonomie, capaciteBatterie } = req.query;

    if (!villeStart || !villeEnd || !autonomie) {
        return res.status(400).json({ error: 'Les paramètres "villeStart", "villeEnd" et "autonomie" sont requis.' });
    }

    // Obtenir les coordonnées des villes
    const start = await getCoordonneesJSON(villeStart);  
    const end = await getCoordonneesJSON(villeEnd);

    if (start && end) {
        // Appeler la fonction qui calcule l'itinéraire et récupère les données
        const itineraireData = await rechercherItineraireAutonomieJSON(start, end, autonomie, capaciteBatterie);
        if (itineraireData) {
            // Créer le JSON final avec toutes les informations
            const data = {
                villeStart: {
                    nom: villeStart,
                    latitude: start[0],
                    longitude: start[1]
                },
                villeEnd: {
                    nom: villeEnd,
                    latitude: end[0],
                    longitude: end[1]
                },
                autonomie: autonomie,
                distance: itineraireData.distanceTotal,  // Distance calculée
                tempsTrajet: itineraireData.tempsTrajet,  // Temps de trajet total en heures
                sommeTempsRecharge: itineraireData.sommeTempsRecharge,  // Temps total de recharge
                nombreArrets: itineraireData.nombreArrets,  // Nombre de bornes de recharge
                stationsRecharge: itineraireData.stationsRecharge,  // Liste des stations de recharge
                trajetPoints: itineraireData.trajetPoints,  // Points du trajet
                timestamp: new Date().toISOString()  // Horodatage de la réponse
            };
            

            // Retourner les données sous forme de JSON
            res.json(data);
        } else {
            return res.status(500).json({ error: 'Erreur lors du calcul de l\'itinéraire.' });
        }
    } else {
        return res.status(400).json({ error: 'Les paramètres "villeStart" et "villeEnd" n\'ont pas été trouvés.' });
    }
});

module.exports = router;

async function getCoordonneesJSON(city) {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Erreur HTTP : ${response.status}`);
        }
        const data = await response.json();
        if (data.length === 0) {
            throw new Error(`Aucune coordonnée trouvée pour la ville : ${city}`);
        }

        const latitude = parseFloat(data[0].lat);
        const longitude = parseFloat(data[0].lon);
        return [latitude, longitude];
    } catch (error) {
        console.error(`Erreur lors de la récupération des coordonnées : ${error.message}`);
        return null;
    }
}

async function rechercherItineraireAutonomieJSON(start, end, autonomie, capaciteBatterie) {
    const apiUrl = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${start[1]},${start[0]}&end=${end[1]},${end[0]}`;

    let distanceTotal = 0;
    let tempsTrajet = 0;
    let sommeTempsRecharge = 0;
    let nombreArrets = 0;
    let stationsRecharge = [];

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        const coordinates = data.features[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
        let routeCoordonnees = [start];
        let dernierPoint = start;
        let distanceParcouru = 0;
        let rayonRecherche = 5000;

        for (let i = 1; i < coordinates.length; i++) {
            let pointAvant = coordinates[i - 1];
            let pointActuel = coordinates[i];
            // Remplacer le calcul de distance avec Turf
            let segmentDistance = turf.distance(
                turf.point([pointAvant[1], pointAvant[0]]), 
                turf.point([pointActuel[1], pointActuel[0]]),
                { units: 'kilometers' }  // Distance en kilomètres
            );
            distanceParcouru += segmentDistance;

            if (distanceParcouru >= autonomie) {
                let pointStop = pointActuel;
                let borne = null;

                while (!borne) {
                    borne = await obtenirStationRechargeProcheJSON(pointStop, '', capaciteBatterie, rayonRecherche);
                    if (!borne) {
                        console.log(`Aucune borne trouvée à ${pointStop}. Augmentation du rayon à ${rayonRecherche + 10000} m`);
                        rayonRecherche += 5000;
                    }
                }

                if (borne) {
                    stationsRecharge.push({
                        lat: borne.lat,
                        lon: borne.lon,
                        nom: borne.nom,
                        adresse: borne.adresse,
                        type: borne.type,
                        puissance: borne.puissance,
                        tempsRecharge: borne.tempsRecharge
                    });

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
                }
            }
        }

        const finalResponse = await fetch(`https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${dernierPoint[1]},${dernierPoint[0]}&end=${end[1]},${end[0]}`);
        const finalData = await finalResponse.json();
        const finalRoute = finalData.features[0].properties.segments[0];
        const finalCoordonnees = finalData.features[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);

        distanceTotal += finalRoute.distance / 1000;
        tempsTrajet += finalRoute.duration / 3600;
        routeCoordonnees.push(...finalCoordonnees);

        return {
            distanceTotal: distanceTotal,
            tempsTrajet: tempsTrajet,
            sommeTempsRecharge: sommeTempsRecharge,
            nombreArrets: nombreArrets,
            stationsRecharge: stationsRecharge,
            trajetPoints: routeCoordonnees  // Ajout des points du trajet
        };
    } catch (error) {
        console.error('Erreur lors de la récupération des données de l\'API:', error);
        return null;
    }
}

async function obtenirStationRechargeProcheJSON(coords, typePrise, capaciteBatterie, rayon) {
    if (!Array.isArray(coords) || coords.length !== 2) {
        console.error("Les coordonnées doivent être un tableau [latitude, longitude] :", coords);
        return null;
    }

    const [latitude, longitude] = coords;
    let url = `https://odre.opendatasoft.com/api/records/1.0/search/?dataset=bornes-irve&geofilter.distance=${latitude},${longitude},${rayon}&rows=1&sort=dist`;

    if (typePrise) {
        url += `&q=${encodeURIComponent(typePrise)}`;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Erreur HTTP ! Statut : ${response.status}`);
        }

        const donnees = await response.json();
        if (donnees.records && donnees.records.length > 0) {
            const enregistrement = donnees.records[0];

            const puissance = enregistrement.fields?.puiss_max ?? 0;
            const tempsRecharge = (puissance && capaciteBatterie) ? (capaciteBatterie / puissance).toFixed(2) : null;

            return {
                lat: enregistrement.fields?.ylatitude ?? null,
                lon: enregistrement.fields?.xlongitude ?? null,
                nom: enregistrement.fields?.n_station ?? 'Inconnu',
                adresse: enregistrement.fields?.ad_station ?? 'Adresse inconnue',
                type: enregistrement.fields?.type_prise ?? 'Non spécifié',
                puissance: puissance,
                tempsRecharge: tempsRecharge ? parseFloat(tempsRecharge) : 0
            };
        } else {
            return null;
        }
    } catch (erreur) {
        console.error("Erreur lors de la récupération des bornes de recharge :", erreur);
        return null;
    }
}
