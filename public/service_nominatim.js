function getCoordinates(city) {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`;

    return fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erreur HTTP : ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.length === 0) {
                throw new Error(`Aucune coordonnée trouvée pour la ville : ${city}`);
            }

            const latitude = parseFloat(data[0].lat);
            const longitude = parseFloat(data[0].lon);

            return [latitude, longitude];
        })
        .catch(error => {
            console.error(`Erreur lors de la récupération des coordonnées : ${error.message}`);
            return null;
        });
}
