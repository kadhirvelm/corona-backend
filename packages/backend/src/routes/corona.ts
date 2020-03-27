import { CoronaService } from "@corona/api";
import { Express } from "express";
import { isValidState } from "@corona/utils";
import { getStateCoronaData, getCountryCoronaData } from "../coronaData/getCoronaData";

export function setCoronaRoutes(app: Express) {
    app[CoronaService.getUnitedStatesData.method](CoronaService.getUnitedStatesData.endpoint, (_, response) => {
        CoronaService.getUnitedStatesData.backend({}, response, getCountryCoronaData);
    });

    app[CoronaService.getStateData.method](CoronaService.getStateData.endpoint, (request, response) => {
        const { state } = request.params;
        if (!isValidState(state)) {
            response.status(400).send({ error: `Invalid state: ${state}.` });
            return;
        }

        CoronaService.getStateData.backend(state, response, getStateCoronaData);
    });
}
