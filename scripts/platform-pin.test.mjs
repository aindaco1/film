import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { assertConsumerPin } from '../shared/dust-wave-platform/packages/test-core/src/consumer-pin.js';

const root = fileURLToPath(new URL('../', import.meta.url));
test('uses the recorded immutable Platform commit and package versions', () => {
  assertConsumerPin({ root,
  "expectedCommit": "d90ab548158005acdab483a0e76034aeb1a61726",
  "packages": {
    "document-core": "0.1.0",
    "worker-core": "0.18.0",
    "test-core": "0.4.0",
    "node-core": "0.1.0"
  },
  "lockfiles": [
    {
      "path": "package-lock.json",
      "packages": {
        "shared/dust-wave-platform/packages/document-core": "0.1.0",
        "shared/dust-wave-platform/packages/worker-core": "0.18.0"
      }
    }
  ]

  });
});
