import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { assertConsumerPin } from '../shared/dust-wave-platform/packages/test-core/src/consumer-pin.js';

const root = fileURLToPath(new URL('../', import.meta.url));
test('uses the recorded immutable Platform commit and package versions', () => {
  assertConsumerPin({ root,
  "expectedCommit": "5c4bee9be2a734e3364e1d7fc1a929505c733bc2",
  "packages": {
    "document-core": "0.2.0",
    "media-core": "0.7.0",
    "worker-core": "0.19.0",
    "test-core": "0.4.0",
    "node-core": "0.1.0"
  },
  "lockfiles": [
    {
      "path": "package-lock.json",
      "packages": {
        "shared/dust-wave-platform/packages/document-core": "0.2.0",
        "shared/dust-wave-platform/packages/media-core": "0.7.0",
        "shared/dust-wave-platform/packages/worker-core": "0.19.0"
      }
    }
  ]

  });
});
