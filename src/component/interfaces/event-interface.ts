interface Event {
    [event: string]: {
        points: number;
        throttlers: Array<{
            max: number;
            kind: string;
            per?: string;
        }>;
    };
}

export default Event;
