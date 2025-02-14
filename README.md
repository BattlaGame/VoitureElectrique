# Projet d'Itinéraires pour Voitures Électriques

## Description
Ce projet permet de calculer des itinéraires optimisés pour les véhicules électriques. Il prend en compte l'autonomie du véhicule et les bornes de recharge disponibles pour proposer un trajet adapté.

## Installation & Lancement

1. **Cloner le projet** :
   ```sh
   git clone https://github.com/ton-repo.git
   cd ton-repo
   ```

2. **Installer les dépendances** :
   ```sh
   npm install
   ```

3. **Créer un fichier `.env`** en se basant sur `.env_exemple`, puis renseigner les valeurs requises.

4. **Lancer le serveur en mode développement** :
   ```sh
   npm run dev
   ```

## Solutions envisagées

- **Rechercher une borne de recharge à partir de 80% d'autonomie** pour optimiser les arrêts et éviter les recharges inutiles.
- **Stocker localement les détails des véhicules après une première requête** pour éviter des appels API inutiles et améliorer les performances.
- **Rendre le site responsive** avec un bouton permettant d'afficher ou masquer les véhicules à la demande, pour une meilleure ergonomie.

## Technologies utilisées

- Node.js avec Express pour la gestion du serveur
- Openrouteservice pour le calcul des itinéraires de conduite
- Leaflet pour l'affichage interactif de la carte Leaflet
- Nominatim d'OpenStreetMap pour la géolocalisation et la recherche d'adresses
- SOAP pour le calcul du coût du trajet
- JavaScript (Frontend) pour l'interaction avec l'utilisateur
- Chargetrip avec GraphQL pour récupérer la liste des véhicules électriques

## Contact
Si vous avez des questions , n'hésitez pas à me contacter !


