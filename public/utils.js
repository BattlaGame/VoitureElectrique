function setDistance(distance) {
    const distanceElement = document.getElementById("distanceTotal");
    if (distanceElement) {
        distanceElement.textContent = `Distance du trajet: ${distance.toFixed(2)} km`;
    }
}

function setDuree(dureeHeure) {
    const dureeElement = document.getElementById("dureeTrajet");
    const { heures, minutes } = convertirTemps(dureeHeure);
    if (dureeElement) {
        dureeElement.textContent = `Temps du trajet : ${heures}h ${minutes}min`;
    }
}

function setTempsRecharge(tempsRecharge) {
    const tempsRechargeElement = document.getElementById("tempsRecharge");
    const { heures, minutes } = convertirTemps(tempsRecharge);
    if (tempsRechargeElement) {
        tempsRechargeElement.textContent = `Temps de recharge : ${heures}h ${minutes}min`;
    }
}

function setDureeTrajetRechargeTotal(dureeTrajetRechargeTotal) {
    const tempsElement = document.getElementById("dureeTrajetRechargeTotal");
    const { heures, minutes } = convertirTemps(dureeTrajetRechargeTotal);
    if (tempsElement) {
        tempsElement.textContent = `Temps du trajet avec recharge : ${heures}h ${minutes}min`;
    }
}

function convertirTemps(tempsHeures) {
    const heures = Math.floor(tempsHeures);
    const minutes = Math.round((tempsHeures - heures) * 60);
    return { heures, minutes };
}

function setPrixTotal(prixTotal){
    const prixTotalElement = document.getElementById("prixTotal");
    if(prixTotalElement){
        prixTotalElement.textContent = `Prix total du trajet : ${prixTotal} €`;
    }
}

function afficherChargement() {
    document.getElementById("loading-modal").style.display = "flex";
}

function masquerChargement() {
    document.getElementById("loading-modal").style.display = "none";
}