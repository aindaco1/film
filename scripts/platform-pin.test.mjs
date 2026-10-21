import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { assertConsumerPin } from '../shared/dust-wave-platform/packages/test-core/src/consumer-pin.js';

const root = fileURLToPath(new URL('../', import.meta.url));
test('uses the recorded immutable Platform commit and package versions', () => {
  assertConsumerPin({ root,
  "expectedCommit": "57cc033e248f92835c4c5ee29c823cadbb5050a2",
  "packages": {
    "worker-core": "0.15.0",
    "test-core": "0.4.0",
    "node-core": "0.1.0"
  },
  "lockfiles": [
    {
      "path": "package-lock.json",
      "packages": {
        "shared/dust-wave-platform/packages/worker-core": "0.15.0"
      }
    }
  ]

  });
});
