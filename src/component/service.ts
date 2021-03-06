import _ from 'lodash';

import dateDiff from '../helpers/getDateDiff';
import { eventEntryReference } from '../helpers/references';
import { Throtthler, EventEntry } from '../helpers/runtypes';
import {
    ResultOfEventsVerifications,
    ResponseOfResultOfEventsVerification,
    GroupOfEventVerifications,
    ResultOfVerification,
} from '../helpers/interfaces';

let allow: boolean[] = [];
let validationResult: GroupOfEventVerifications = {
    allow: [],
    reason: [],
};

const resultOfEventsVerification: ResultOfEventsVerifications = {};

const Service = {
    getResultOfEventsVerification(): ResponseOfResultOfEventsVerification {
        const result = {
            result: resultOfEventsVerification,
            allow: allow.some(e => e === false) ? false : true,
        };

        allow = [];

        return result;
    },
    writeResultOfThrottler(result: ResultOfVerification): void {
        validationResult.allow.push(result.allow);
        if (result.reason !== '') validationResult.reason.push(result.reason);
    },
    writeResultOfEvent(eventName: string): void {
        let reasonR = '';

        if (validationResult.reason.length) {
            reasonR = validationResult.reason.join(', ');

            resultOfEventsVerification[eventName] = {
                allow: validationResult.allow,
                reason: reasonR,
            };

            allow.push(false);
        } else if (!validationResult.reason.length) {
            resultOfEventsVerification[eventName] = {
                allow: validationResult.allow,
            };

            allow.push(true);
        }

        validationResult = {
            allow: [],
            reason: [],
        };
    },
    addEvents(events: Throtthler, now: number, state: EventEntry): EventEntry {
        Object.keys(events).forEach(async eventName => {
            const eventEntry = {
                points: events[eventName].points,
                date: now,
            };

            if (!(eventName in state)) {
                state[eventName] = _.cloneDeep(eventEntryReference);
            }

            this.addEventAndRecalcuateResult(state, eventName, '7d', eventEntry);
            this.addEventAndRecalcuateResult(state, eventName, '1d', eventEntry);
            this.addEventAndRecalcuateResult(state, eventName, '12h', eventEntry);
            this.addEventAndRecalcuateResult(state, eventName, '2h', eventEntry);
            this.addEventAndRecalcuateResult(state, eventName, '1h', eventEntry);
            this.addEventAndRecalcuateResult(state, eventName, '30m', eventEntry);
            this.addEventAndRecalcuateResult(state, eventName, '5m', eventEntry);
            this.addEventAndRecalcuateResult(state, eventName, '1m', eventEntry);
        });

        return state;
    },
    addEventAndRecalcuateResult(
        state: EventEntry,
        eventName: string,
        time: '7d' | '1d' | '12h' | '2h' | '1h' | '30m' | '5m' | '1m',
        record: {
            date: number;
            points: number;
        }
    ): EventEntry {
        state[eventName][time].events.push(record);

        state[eventName][time].result.count = state[eventName][time].events.length;
        state[eventName][time].result.points = state[eventName][time].events
            .map(event => event.points)
            .reduce((prev, next) => prev + next);

        state[eventName][time].result.lastUpdate = Date.now();

        return state;
    },
    removeInactiveRecordsAndRecalcuateResult(
        state: EventEntry,
        time: '7d' | '1d' | '12h' | '2h' | '1h' | '30m' | '5m' | '1m'
    ): EventEntry {
        const timeOfExpire = dateDiff[time];

        for (const eventName in state) {
            const dbDate = Date.now() - state[eventName][time].result.lastUpdate;

            if (dbDate > timeOfExpire) {
                const activeRecords = state[eventName][time].events.filter(
                    (event: { date: number }) => Date.now() - event.date > timeOfExpire
                );

                state[eventName][time].events = activeRecords;

                state[eventName][time].result.count = activeRecords.length;
                state[eventName][time].result.points = activeRecords
                    .map(event => event.points)
                    .reduce((prev, next) => prev + next, 0);

                state[eventName][time].result.lastUpdate = Date.now();
            }
        }
        console.log(`checked events on ${time}`);
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
        time: '7d' | '1d' | '12h' | '2h' | '1h' | '30m' | '5m' | '1m',
        now: number,
        state: EventEntry
    ): Promise<ResultOfVerification> {
        let Allow = true;
        const timeOfExpire = dateDiff[time];

        if (eventName in state) {
            const dbDate = now - state[eventName][time].result.lastUpdate;

            if (dbDate > timeOfExpire) {
                this.removeInactiveRecordsAndRecalcuateResult(state, time);
            }

            const totalPoints = state[eventName][time].result.points;

            Allow = totalPoints < maxPoints;
        }

        return {
            allow: Allow,
            reason: Allow ? '' : `> ${maxPoints} points per ${time}`,
        };
    },

    async checkAmountOfAllEventsPerSomeTime(
        eventName: string,
        maxEvent: number,
        time: '7d' | '1d' | '12h' | '2h' | '1h' | '30m' | '5m' | '1m',
        now: number,
        state: EventEntry
    ): Promise<ResultOfVerification> {
        let Allow = true;
        const timeOfExpire = dateDiff[time];

        if (eventName in state) {
            const dbDate = now - state[eventName][time].result.lastUpdate;

            if (dbDate > timeOfExpire) {
                this.removeInactiveRecordsAndRecalcuateResult(state, time);
            }

            const totalPoints = state[eventName][time].result.count;
            Allow = totalPoints < maxEvent;
        }

        return {
            allow: Allow,
            reason: Allow ? '' : `> ${maxEvent} points per ${time}`,
        };
    },
};

export default Service;
