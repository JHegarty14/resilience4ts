const path = require('path');
const { workerData } = require('worker_threads');

require('ts-node').register();
const workerPath = path.resolve(__dirname, workerData.path);
require(workerPath);
