# extension-settings

Shared utility module for persisting extension state in `settings.json` under the `extensionSettings` key.

Other extensions import `getExtSetting` / `setExtSetting` instead of reading/writing `settings.json` directly.

## API

```ts
import { getExtSetting, setExtSetting, loadExtSettings, saveExtSettings } from "../../utils/extension-settings.js";

// Get a single value (with default)
const level = getExtSetting<string>("caveman", "off");

// Set a single value (reads fresh, merges, writes atomically)
setExtSetting("caveman", "ultra");

// Load all extension settings at once
const ext = loadExtSettings(); // → ExtSettings

// Save all extension settings at once
saveExtSettings(ext);
```

## Resulting `settings.json` structure

```json
{
  "extensionSettings": {
    "safeGuard": false,
    "caveman": "ultra",
    "notifications": true
  }
}
```

No commands — this is a shared utility module, not an active extension. Registers a no-op factory function.