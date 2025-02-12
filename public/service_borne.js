async function obtenirStationRechargeProche(coords, typePrise, capaciteBatterie, rayon) {
    if (!Array.isArray(coords) || coords.length !== 2) {
        console.error("Les coordonnées doivent être un tableau [latitude, longitude] :", coords);
        return null;
    }
    
    const [latitude, longitude] = coords;
    let url = `https://odre.opendatasoft.com/api/records/1.0/search/?dataset=bornes-irve&geofilter.distance=${latitude},${longitude},${rayon}&rows=1&sort=dist`;

    console.log(url);

    
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
            console.log("Borne trouvée pour", coords, ":", enregistrement.fields);

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
            console.log("Aucune borne trouvée.");
            return null;
        }
    } catch (erreur) {
        console.error("Erreur lors de la récupération des bornes de recharge :", erreur);
        return null;
    }
}