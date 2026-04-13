# extension-settings

Shared module for persisting extension state in `settings.json` under the `extensions` key.

All extensions that need persistent settings use `getExtSetting` / `setExtSetting` from this module instead of reading/writing `settings.json` directly.

## API

```ts
import { getExtSetting, setExtSetting, loadExtSettings, saveExtSettings } from "../extension-settings/index.js";

// Get a single value
const level = getExtSetting("caveman", "off"); // key, defaultValue

// Set a single value
setExtSetting("caveman", "ultra"); // key, value

// Load/save all extension settings at once
const ext = loadExtSettings();
saveExtSettings(ext);
```

## Settings structure

```json
{
  "extensionSettings": {
    "safeGuard": false,
    "caveman": "ultra"
  }
}
```

No commands — this is a shared utility module, not an active extension.