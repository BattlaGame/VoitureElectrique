require("dotenv").config();
const express = require("express");
const path = require("path");
const soap = require('soap');

const app = express();
const port = process.env.PORT;
const hostname = process.env.WEBSITE_HOSTNAME;

// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const urlSoap = `http://${hostname}:${port}/trajetService?wsdl`;

const service = {
    TrajetService: {
        TrajetPort: {
            calculerCoutTrajet: function (args) {
                const tempsRechargeTotal = parseFloat(args.tempsRechargeTotal);
                const puissanceMoyenneBorne = 50;
                const prixMoyen = 0.30;

                if (isNaN(tempsRechargeTotal)) {
                    throw new Error("tempsRechargeTotal est invalide");
                }

                // Calcul de l'énergie totale rechargée
                const energieRecharge = tempsRechargeTotal * puissanceMoyenneBorne;

                // Calcul du coût total
                const coutTotal = energieRecharge * prixMoyen;

                return { coutTotal };
            }
        }
    }
};

// Définition du WSDL
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns:soap="http://schemas.xmlsoap.org/wsdl/" xmlns:tns="http://example.com/TrajetService">
    <message name="calculerCoutTrajetRequest">
        <part name="tempsRechargeTotal" type="xsd:float"/>
    </message>
    <message name="calculerCoutTrajetResponse">
        <part name="coutTotal" type="xsd:float"/>
    </message>
    <portType name="TrajetPortType">
        <operation name="calculerCoutTrajet">
            <input message="tns:calculerCoutTrajetRequest"/>
            <output message="tns:calculerCoutTrajetResponse"/>
        </operation>
    </portType>
    <binding name="TrajetBinding" type="tns:TrajetPortType">
        <soap:binding style="rpc" transport="http://schemas.xmlsoap.org/soap/http"/>
        <operation name="calculerCoutTrajet">
            <soap:operation soapAction="http://example.com/calculerCoutTrajet"/>
            <input>
                <soap:body use="literal"/>
            </input>
            <output>
                <soap:body use="literal"/>
            </output>
        </operation>
    </binding>
    <service name="TrajetService">
        <port name="TrajetPort" binding="tns:TrajetBinding">
            <soap:address location="http://${hostname}:${port}/trajetService"/>
        </port>
    </service>
</definitions>`;

// Service SOAP
soap.listen(app, '/trajetService', service, xml);

// Client SOAP
app.get('/calculerTrajet', (req, res) => {
    const { tempsRechargeTotal } = req.query;
    const argsSoap = { tempsRechargeTotal };

    soap.createClient(urlSoap, (err, client) => {
        if (err) {
            console.error('Erreur création client SOAP:', err);
            return res.status(500).json({ error: 'Erreur client SOAP' });
        }

        client.calculerCoutTrajet(argsSoap, (err, result) => {
            if (err) {
                console.error('Erreur appel SOAP:', err);
                return res.status(500).json({ error: 'Erreur appel SOAP' });
            }

            res.json(result);
        });
    });
});

const exportJsonRoute = require('./routes/calculeItineraire');
app.use(exportJsonRoute);

app.get("/config", (req, res) => {
    res.json({
        apiKey_chargetrip: process.env.CHARGETRIP_API_KEY,
        appId_chargetrip: process.env.CHARGETRIP_APP_ID,
        apiKey_openserviceroute: process.env.OPENROUTESERVICE_API_KEY
    });
});

// Démarrer le serveur
app.listen(port, () => {
    console.log(`Serveur démarré sur http://${hostname}:${port}`);
});