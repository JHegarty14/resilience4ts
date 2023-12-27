export class OperationCancelledException extends Error {
    constructor(message) {
        super(message);
        this.name = 'OperationCancelledException';
    }
}