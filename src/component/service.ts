import dateDiff from '../helpers/getDateDiff';

import Event from './interfaces/event-interface';
import EventEntry from './interfaces/eventEntry-interface';
import ResultOfVerification from './interfaces/resultOfVerification-interface';
import ResultOfEventsVerifications from './interfaces/resultOfEventsVerifications-interface';
import GroupOfEventVerifications from './interfaces/groupOfEventVerifications-interface';
import ResponseOfResultOfEventsVerification from './interfaces/responseOfResultOfEventsVerification-interface';

let allow = true;
let validationResult: GroupOfEventVerifications = {
    allow: [],
    reason: [],
};

const resultOfEventsVerification: ResultOfEventsVerifications = {};

const Service = {
    getResultOfEventsVerification(): ResponseOfResultOfEventsVerification {
        return {
            result: resultOfEventsVerification,
            allow,
        };
    },
    writeResult(result: ResultOfVerification): void {
        validationResult.allow.push(result.allow);
        if (result.reason !== '') validationResult.reason.push(result.reason);
    },
    writeResultOfEvent(event: string): void {
        let reasonR = '';

        if (validationResult.reason.length) {
            reasonR = validationResult.reason.join(', ');

            resultOfEventsVerification[event] = {
                allow: validationResult.allow,
                reason: reasonR,
            };

            allow = false;
        } else if (!validationResult.reason.length) {
            resultOfEventsVerification[event] = {
                allow: validationResult.allow,
            };

            allow = true;
        }

        validationResult = {
            allow: [],
            reason: [],
        };
    },
    addEvents(data: Event, now: number, state: EventEntry[]): EventEntry[] {
        Object.keys(data).forEach(event => {
            state.push({
                event,
                points: now - data[event].points,
                date: now - 7 * 24 * 60 * 60 * 1000,
            });
        });
        return state;
    },
    async checkPointsSizeWithMaxPoints(points: number, maxPoints: number): Promise<ResultOfVerification> {
        const Allow = points < maxPoints;

        return {
            allow: Allow,
            reason: Allow ? '' : `> ${maxPoints} points`,
        };
    },
    async checkAmountOfPointsOfAllEventsPerSomeTime(
        eventName: string,
        maxPoints: number,
        time: string,
        now: number,
        state: EventEntry[]
    ): Promise<ResultOfVerification> {
        const date = now - dateDiff[time];

        const totalPoints = state
            .filter(e => e.event === eventName && e.date >= date)
            .reduce((total: number, e) => total + e.points, 0);

        const Allow = totalPoints === undefined || totalPoints < maxPoints;

        return {
            allow: Allow,
            reason: Allow ? '' : `> ${maxPoints} points per ${time}`,
        };
    },

    async checkAmountOfAllEventsPerSomeTime(
        eventName: string,
        maxEvent: number,
        time: string,
        now: number,
        state: EventEntry[]
    ): Promise<ResultOfVerification> {
        const date = now - dateDiff[time];

        const totalPoints = state.filter(e => e.event === eventName && e.date >= date);

        const Allow = totalPoints === undefined || totalPoints.length < maxEvent;

        return {
            allow: Allow,
            reason: Allow ? '' : `> ${maxEvent} points per ${time}`,
        };
    },
};

export default Service;
