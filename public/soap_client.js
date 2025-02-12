async function calculerTempsTrajet(tempsRechargeTotal) {
    try {
        const response = await fetch(`/calculerTrajet?tempsRechargeTotal=${tempsRechargeTotal}`);
        if (!response.ok) {
            throw new Error('Erreur lors de l\'appel au serveur SOAP');
        }

        const data = await response.json();

        setPrixTotal(data.coutTotal.toFixed(2));
    } catch (error) {
        console.error('Erreur lors de la récupération du coût du trajet :', error);
    }
}

