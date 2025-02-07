import { ICoronaDataPoint } from "@corona/api";
import fetch from "node-fetch";
import { PIPELINE_LOGGER } from "@corona/logger";
import { cleanCountyName } from "../../utils/cleanCountyName";
import { getCoronaDataScraperFipsCode } from "../../utils/getCoronaDataScraperFipsCode";
import { logCoronaScraperAnomalies } from "../../utils/logAnomalies";
import { getTotalBreakdowns, ICountiesKeyed, IStatesKeyed, ITotalBreakdown } from "../shared";

interface ICoronaDataScraperData {
    city?: string;
    county?: string;
    state?: string;
    country: string;
    cases: number;
    deaths?: number;
    recovered?: number;
    tested?: number;
    active?: number;
    population?: number;
    lat?: number;
    long?: number;
    url?: string;
    aggregate?: string;
}

export interface ICoronaDataScraperBreakdown {
    nation: ICoronaDataPoint;
    states: ITotalBreakdown;
}

function getCleanCountyName(county: string | undefined) {
    const cleanedCounty = cleanCountyName(county);

    if (cleanedCounty == null || cleanedCounty.includes("unassigned") || cleanedCounty === "") {
        return undefined;
    }

    return county;
}

function cleanRawCoronaDataScraperDatapoint(dataPoint: ICoronaDataScraperData): ICoronaDataPoint {
    const cleanedCountyName = getCleanCountyName(dataPoint.county);

    return {
        activeCases: dataPoint.active,
        county: cleanedCountyName,
        deaths: dataPoint.deaths,
        fipsCode: getCoronaDataScraperFipsCode(dataPoint.state, cleanedCountyName, dataPoint.city),
        lastUpdated: undefined,
        recovered: dataPoint.recovered,
        state: dataPoint.state,
        totalCases: dataPoint.cases,
    };
}

const BLACKLISTED_FIPS = ["36061"];

function separateIntoNationStatesAndCounties(data: ICoronaDataScraperData[]) {
    const nation: ICoronaDataPoint[] = [];
    const states: IStatesKeyed = {};
    const counties: ICountiesKeyed = {};

    data.forEach(dataPoint => {
        if (dataPoint.country !== "United States") {
            return;
        }

        const cleanedDataPoint = cleanRawCoronaDataScraperDatapoint(dataPoint);

        if (BLACKLISTED_FIPS.includes(cleanedDataPoint.fipsCode)) {
            return;
        }

        if (
            cleanedDataPoint.state !== undefined &&
            cleanedDataPoint.state !== "" &&
            cleanedDataPoint.county !== undefined
        ) {
            counties[cleanedDataPoint.state] = (counties[cleanedDataPoint.state] ?? []).concat(cleanedDataPoint);
        } else if (
            cleanedDataPoint.state !== undefined &&
            cleanedDataPoint.state !== "" &&
            dataPoint.city === undefined
        ) {
            // eslint-disable-next-line prefer-destructuring
            states[cleanedDataPoint.state] = cleanedDataPoint;
        } else if (cleanedDataPoint.fipsCode === "999") {
            nation.push(cleanedDataPoint);
        }
    });

    return { nation, states, counties };
}

export async function getCoronaDataCoronaScraper(): Promise<ICoronaDataScraperBreakdown> {
    try {
        const rawData = await fetch("https://coronadatascraper.com/data.json");
        const json = (await rawData.json()) as ICoronaDataScraperData[];

        const { nation, states, counties } = separateIntoNationStatesAndCounties(json);

        logCoronaScraperAnomalies(nation, states, counties);

        return {
            nation: nation[0],
            states: getTotalBreakdowns(states, counties),
        };
    } catch (e) {
        PIPELINE_LOGGER.log({
            level: "error",
            message: `Something went wrong when trying to get the corona data scraper information: ${JSON.stringify(
                e,
            )} `,
        });

        return {
            nation: {
                fipsCode: "999",
                totalCases: "N/A",
            },
            states: {},
        };
    }
}
