import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { assertConsumerPin } from '../shared/dust-wave-platform/packages/test-core/src/consumer-pin.js';

const root = fileURLToPath(new URL('../', import.meta.url));
test('uses the recorded immutable Platform commit and package versions', () => {
  assertConsumerPin({ root,
  "expectedCommit": "0fa34d34b0a61f0a74a2d495cc4a5c2e62d99d68",
  "packages": {
    "document-core": "0.2.0",
    "media-core": "0.7.1",
    "worker-core": "0.19.0",
    "test-core": "0.4.0",
    "node-core": "0.1.0"
  },
  "lockfiles": [
    {
      "path": "package-lock.json",
      "packages": {
        "shared/dust-wave-platform/packages/document-core": "0.2.0",
        "shared/dust-wave-platform/packages/media-core": "0.7.1",
        "shared/dust-wave-platform/packages/worker-core": "0.19.0"
      }
    }
  ]

  });
});
