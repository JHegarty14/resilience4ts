type Eventable = {
  send?: (msg: any, cb: (err: Error | null) => void) => void;
  postMessage?: (msg: any) => void;
};

export const asyncSend = <T extends Eventable>(event: T, msg: any): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof event.send === 'function') {
      event.send(msg, (err: Error | null) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    } else if (typeof event.postMessage === 'function') {
      event.postMessage(msg);
      resolve();
    } else {
      resolve();
    }
  });
};

export const childSend = (proc: NodeJS.Process, msg: any): Promise<void> =>
  asyncSend<NodeJS.Process>(proc, msg);
