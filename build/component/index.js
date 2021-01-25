"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.throttler = void 0;
const service_1 = __importDefault(require("./service"));
const runtypes_1 = require("./interfaces/runtypes");
async function throttler(data, state, now) {
    const { events } = data;
    const result = {
        resultOfTotalPointsSize: { allow: false, reason: '' },
        resultOfPoints: { allow: false, reason: '' },
        resultOfSumEvents: { allow: false, reason: '' },
    };
    for (const event of Object.keys(events)) {
        for (const element in events[event].throttlers) {
            const { points } = events[event];
            const throttler = events[event].throttlers[element];
            if (throttler.kind === 'points') {
                if (runtypes_1.PerInEventRuntypeExist.guard(throttler)) {
                    result.resultOfTotalPointsSize = await service_1.default.checkAmountOfPointsOfAllEventsPerSomeTime(event, throttler.max, throttler.per, now, state);
                    service_1.default.writeResult(result.resultOfTotalPointsSize);
                }
                else if (runtypes_1.PerInEventRuntypeNotExist.guard(throttler)) {
                    result.resultOfPoints = await service_1.default.checkPointsSizeWithMaxPoints(points, throttler.max);
                    service_1.default.writeResult(result.resultOfPoints);
                }
            }
            if (throttler.kind === 'count') {
                if (runtypes_1.PerInEventRuntypeExist.guard(throttler)) {
                    result.resultOfSumEvents = await service_1.default.checkAmountOfAllEventsPerSomeTime(event, throttler.max, throttler.per, now, state);
                    service_1.default.writeResult(result.resultOfSumEvents);
                }
            }
        }
        service_1.default.writeResultOfEvent(event);
    }
    const resultOfVerificationEvents = service_1.default.getResultOfEventsVerification();
    if (resultOfVerificationEvents.allow) {
        return {
            allow: resultOfVerificationEvents.allow,
            data: resultOfVerificationEvents.result,
            newState: service_1.default.addEvents(events, now, state),
        };
    }
    return {
        allow: resultOfVerificationEvents.allow,
        data: resultOfVerificationEvents.result,
        newState: null,
    };
}
exports.throttler = throttler;
//# sourceMappingURL=index.js.map