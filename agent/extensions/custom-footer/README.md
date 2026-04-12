# custom-footer

Custom TUI footer with expanded stats:

- **Model/provider** — current model and provider
- **Tokens** — input/output token counts
- **Context %** — context window usage
- **Session elapsed** — time since session start
- **CWD** — short working directory path
- **Git branch** — current branch name
- **TPS** — tokens per second (tracked per agent turn)
- **Last query** — time of most recent agent query

No commands — activates automatically on session start.

## Notes

TPS and query time reset on new session (not carried over from previous sessions).